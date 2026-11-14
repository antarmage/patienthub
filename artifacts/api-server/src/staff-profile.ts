import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { z } from "zod/v4";
import type { AccessActor } from "./clinical-access";

const staffRoles = ["staff", "receptionist", "nurse", "clinician", "owner", "admin"];
const maxPhotoBytes = 512 * 1024;
const photoSchema = z.object({
  photo: z.string().max(Math.ceil(maxPhotoBytes / 3) * 4 + 30).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
  consentConfirmed: z.literal(true),
}).strict();

export interface StaffProfile { name: string; photo: string | null }
export interface StaffProfileStore {
  get(employeeId: string): Promise<StaffProfile | null>;
  save(employeeId: string, photo: string, ownerId: string): Promise<boolean>;
  remove(employeeId: string): Promise<boolean>;
}

export async function ensureStaffProfileSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff_profile_photos (
      employee_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      photo text NOT NULL,
      updated_by varchar NOT NULL REFERENCES users(id),
      updated_at timestamptz NOT NULL DEFAULT now(),
      consent_confirmed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export function createStaffProfileStore(pool: Pool): StaffProfileStore {
  return {
    async get(employeeId) {
      return (await pool.query<StaffProfile>(`
        SELECT coalesce(nullif(u.display_name,''),u.username) AS name,p.photo
        FROM users u LEFT JOIN staff_profile_photos p ON p.employee_id=u.id
        WHERE u.id=$1 AND u.role=ANY($2::text[])
      `, [employeeId, staffRoles])).rows[0] || null;
    },
    async save(employeeId, photo, ownerId) {
      return !!(await pool.query(`
        INSERT INTO staff_profile_photos(employee_id,photo,updated_by)
        SELECT id,$2,$3 FROM users WHERE id=$1 AND role=ANY($4::text[])
        ON CONFLICT(employee_id) DO UPDATE SET photo=EXCLUDED.photo,
          updated_by=EXCLUDED.updated_by,updated_at=now(),consent_confirmed_at=now()
        RETURNING employee_id
      `, [employeeId, photo, ownerId, staffRoles])).rowCount;
    },
    async remove(employeeId) {
      const found = await this.get(employeeId);
      if (!found) return false;
      await pool.query("DELETE FROM staff_profile_photos WHERE employee_id=$1", [employeeId]);
      return true;
    },
  };
}

export function registerStaffProfileRoutes(
  app: Express,
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  store: StaffProfileStore,
) {
  for (const [base, owner] of [["/api/staff/profile", false], ["/api/owner/staff-accounts/:id/photo", true]] as const) {
    app.use(base, async (req, res, next) => {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Staff sign-in required." }); return; }
      if (!("userId" in actor) || (owner ? actor.role !== "owner" : !staffRoles.includes(actor.role))) {
        res.status(403).json({ error: owner ? "Owner access required." : "Staff access required." }); return;
      }
      res.locals.profileActor = actor;
      res.set("Cache-Control", "private, no-store");
      next();
    });
    app.get(base, async (req: Request, res: Response) => {
      const employeeId = owner ? String(req.params.id) : res.locals.profileActor.userId;
      const profile = await store.get(employeeId);
      if (!profile) { res.status(404).json({ error: "Staff account not found." }); return; }
      res.json(profile);
    });
  }
  app.put("/api/owner/staff-accounts/:id/photo", async (req, res) => {
    const parsed = photoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose a JPEG profile photo up to 512 KB and confirm permission to display it." }); return;
    }
    const encoded = parsed.data.photo.split(",")[1];
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length > maxPhotoBytes || bytes.toString("base64") !== encoded ||
        !bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
        !bytes.subarray(-2).equals(Buffer.from([255, 217]))) {
      res.status(400).json({ error: "Profile photo must contain a valid JPEG file up to 512 KB." }); return;
    }
    if (!await store.save(String(req.params.id), parsed.data.photo, res.locals.profileActor.userId)) {
      res.status(404).json({ error: "Staff account not found." }); return;
    }
    res.json({ saved: true });
  });
  app.delete("/api/owner/staff-accounts/:id/photo", async (req, res) => {
    if (!await store.remove(String(req.params.id))) { res.status(404).json({ error: "Staff account not found." }); return; }
    res.json({ removed: true });
  });
}
