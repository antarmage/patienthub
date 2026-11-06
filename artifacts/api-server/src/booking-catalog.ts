import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import type { AccessActor } from "./clinical-access";
import { bookingCategoryInput, bookingCategoryUpdate, bookingAssignmentInput, type BookingCatalog, type BookingCategory } from "../../../lib/db/src/booking-catalog";
import { bookingServiceCategories, groupBookingServices } from "../../../lib/db/src/booking-services";

export async function ensureBookingCatalogSchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS booking_categories (
    id serial PRIMARY KEY,name text NOT NULL,sort_order integer NOT NULL,is_active boolean NOT NULL,
    care_area text NOT NULL DEFAULT '',description text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1
  );
  CREATE UNIQUE INDEX IF NOT EXISTS booking_categories_name_idx ON booking_categories(lower(name));
  CREATE TABLE IF NOT EXISTS booking_service_assignments (
    service_id integer PRIMARY KEY REFERENCES billing_catalog(id) ON DELETE CASCADE,
    category_ids jsonb NOT NULL DEFAULT '[]',version integer NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS booking_catalog_migrations (name text PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS booking_catalog_audit (
    id serial PRIMARY KEY,actor_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),change jsonb NOT NULL
  );`);
  await client.query("BEGIN");
  try {
    await client.query("LOCK TABLE booking_catalog_migrations IN EXCLUSIVE MODE");
    const done = await client.query("SELECT name FROM booking_catalog_migrations WHERE name='initial-categories-v1'");
    if (!done.rowCount) {
      const ids = new Map<string, number>();
      for (const [order, name] of bookingServiceCategories.entries()) {
        const area = name === "PCOS & hormonal" ? "PCOS" : ["Pregnancy", "Fertility", "Gynae", "Menopause"].includes(name) ? name : "";
        const description = name === "Menopause" ? "Booking does not diagnose menopause or enable the care pathway; your doctor decides that separately."
          : name === "Pregnancy" ? "For an antenatal check-up, choose a consultation or follow-up. Postpartum review is for after delivery." : "";
        const row = await client.query<{ id: number }>(`INSERT INTO booking_categories(name,sort_order,is_active,care_area,description)
          VALUES($1,$2,true,$3,$4) RETURNING id`, [name, order * 10, area, description]);
        ids.set(name, row.rows[0].id);
      }
      const services = (await client.query<{ id: number; name: string; category: string; price: number }>("SELECT id,name,category,price FROM billing_catalog")).rows;
      const catalog = services.map((service) => ({ ...service, id: String(service.id) }));
      const memberships = new Map<number, number[]>();
      for (const name of bookingServiceCategories) {
        for (const group of groupBookingServices(catalog, name, null)) {
          for (const service of group.services) memberships.set(Number(service.id), [...memberships.get(Number(service.id)) || [], ids.get(name)!]);
        }
      }
      for (const service of services) await client.query("INSERT INTO booking_service_assignments(service_id,category_ids) VALUES($1,$2::jsonb)", [service.id, JSON.stringify(memberships.get(service.id) || [])]);
      await client.query("INSERT INTO booking_catalog_migrations VALUES ('initial-categories-v1')");
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

function fail(status: number, message: string): never { throw Object.assign(new Error(message), { status }); }
export function createBookingCatalogStore(pool: Pool) {
  async function write<T>(actorId: string, change: unknown, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize category status changes and assignments so an archived category cannot be newly assigned.
      await client.query("LOCK TABLE booking_categories IN SHARE ROW EXCLUSIVE MODE");
      const result = await work(client);
      await client.query("INSERT INTO booking_catalog_audit(actor_id,change) VALUES($1,$2::jsonb)", [actorId, JSON.stringify(change)]);
      await client.query("COMMIT"); return result;
    } catch (error) {
      await client.query("ROLLBACK");
      if (error && typeof error === "object" && "code" in error && error.code === "23505") fail(409, "A booking category with this name already exists.");
      throw error;
    } finally { client.release(); }
  }
  return {
    async read(): Promise<BookingCatalog> {
      const result = await pool.query<{ categories: BookingCategory[]; assignments: BookingCatalog["assignments"] }>(`
        SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'sortOrder',sort_order,
          'isActive',is_active,'careArea',care_area,'description',description,'version',version) ORDER BY sort_order,id)
          FROM booking_categories),'[]') AS categories,
        coalesce((SELECT jsonb_agg(jsonb_build_object('serviceId',c.id,'categoryIds',coalesce(a.category_ids,'[]'),
          'version',coalesce(a.version,0))) FROM billing_catalog c LEFT JOIN booking_service_assignments a ON a.service_id=c.id),'[]') AS assignments`);
      return result.rows[0];
    },
    async create(input: ReturnType<typeof bookingCategoryInput.parse>, actorId: string) {
      return write(actorId, { action: "create-category", input }, async (client) => {
        await client.query("INSERT INTO booking_categories(name,sort_order,is_active,care_area,description) VALUES($1,$2,$3,$4,$5)",
          [input.name, input.sortOrder, input.isActive, input.careArea, input.description]);
      });
    },
    async update(id: number, input: ReturnType<typeof bookingCategoryUpdate.parse>, actorId: string) {
      return write(actorId, { action: "update-category", id, input }, async (client) => {
        const row = (await client.query<{ version: number }>("SELECT version FROM booking_categories WHERE id=$1", [id])).rows[0];
        if (!row) fail(404, "Booking category not found");
        if (row.version !== input.expectedVersion) fail(409, "This category changed. Reload before editing.");
        await client.query("UPDATE booking_categories SET name=$2,sort_order=$3,is_active=$4,care_area=$5,description=$6,version=version+1 WHERE id=$1",
          [id, input.name, input.sortOrder, input.isActive, input.careArea, input.description]);
      });
    },
    async assign(id: number, input: ReturnType<typeof bookingAssignmentInput.parse>, actorId: string) {
      return write(actorId, { action: "assign-service", id, input }, async (client) => {
        if (!(await client.query("SELECT id FROM billing_catalog WHERE id=$1", [id])).rowCount) fail(404, "Service not found");
        const row = (await client.query<{ version: number; categoryIds: number[] }>("SELECT version,category_ids AS \"categoryIds\" FROM booking_service_assignments WHERE service_id=$1", [id])).rows[0];
        if ((row?.version || 0) !== input.expectedVersion) fail(409, "This service assignment changed. Reload before editing.");
        const categories = (await client.query<{ id: number; isActive: boolean }>("SELECT id,is_active AS \"isActive\" FROM booking_categories WHERE id=ANY($1::int[])", [input.categoryIds])).rows;
        if (categories.length !== input.categoryIds.length || categories.some((category) => !category.isActive && !row?.categoryIds.includes(category.id)))
          fail(400, "Select existing active categories. Existing archived assignments may be retained or removed.");
        await client.query(`INSERT INTO booking_service_assignments(service_id,category_ids) VALUES($1,$2::jsonb)
          ON CONFLICT(service_id) DO UPDATE SET category_ids=excluded.category_ids,version=booking_service_assignments.version+1`, [id, JSON.stringify(input.categoryIds)]);
      });
    },
  };
}
export function registerBookingCatalog(app: Express, store: ReturnType<typeof createBookingCatalogStore>,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  app.use(["/api/booking-catalog", "/api/owner/booking-catalog"], async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    const actor = await authenticate(req, res);
    if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
    const ownerRoute = req.baseUrl === "/api/owner/booking-catalog";
    if (ownerRoute ? !("role" in actor && actor.role === "owner")
      : !("role" in actor && ["owner", "clinician", "staff", "receptionist", "admin"].includes(actor.role)))
      return res.status(403).json({ error: ownerRoute ? "Owner access required" : "Staff booking access required" });
    res.locals.bookingActor = actor; next();
  });
  for (const url of ["/api/booking-catalog", "/api/owner/booking-catalog"]) app.get(url, async (_req, res, next) => {
    try {
      const state = await store.read();
      res.json(url.startsWith("/api/owner") ? state : { ...state, categories: state.categories.filter((category) => category.isActive) });
    } catch (error) { next(error); }
  });
  app.post("/api/owner/booking-catalog/categories", async (req, res, next) => {
    const input = bookingCategoryInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") });
    try { await store.create(input.data, res.locals.bookingActor.userId); res.status(201).json({ saved: true }); } catch (error) { next(error); }
  });
  for (const kind of ["categories", "services"] as const) app.put(`/api/owner/booking-catalog/${kind}/:id`, async (req, res, next) => {
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(String(req.params.id)) || id > 2147483647) return res.status(400).json({ error: "Invalid catalogue ID" });
    try {
      if (kind === "categories") {
        const input = bookingCategoryUpdate.safeParse(req.body);
        if (!input.success) return res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") });
        await store.update(id, input.data, res.locals.bookingActor.userId);
      } else {
        const input = bookingAssignmentInput.safeParse(req.body);
        if (!input.success) return res.status(400).json({ error: input.error.issues.map((issue) => issue.message).join("; ") });
        await store.assign(id, input.data, res.locals.bookingActor.userId);
      }
      res.json({ saved: true });
    } catch (error) { next(error); }
  });
}
