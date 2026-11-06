import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createBookingCatalogStore, registerBookingCatalog, ensureBookingCatalogSchema } from "./booking-catalog";
import { bookingCatalogSchema } from "../../../lib/db/src/booking-catalog";
import { groupBookingServices } from "../../../lib/db/src/booking-services";

test("booking configuration reads require staff and category/assignment writes require owner", async () => {
  let writes = 0;
  const app = express(); app.use(express.json());
  registerBookingCatalog(app, { read: async () => ({ categories: [], assignments: [] }), create: async () => { writes++; },
    update: async () => { writes++; }, assign: async () => { writes++; } },
  async (req) => req.headers.authorization === "patient" ? { patientId: 1 }
    : req.headers.authorization ? { userId: "synthetic", role: String(req.headers.authorization) } : null);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (url: string, role?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}${url}`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const input = { name: "New care", sortOrder: 100, isActive: true, careArea: "", description: "" };
  try {
    assert.equal((await request("/api/booking-catalog")).status, 401);
    for (const role of ["clinician", "receptionist", "staff", "admin"]) {
      assert.equal((await request("/api/booking-catalog", role)).status, 200);
      assert.equal((await request("/api/owner/booking-catalog", role)).status, 403);
      assert.equal((await request("/api/owner/booking-catalog/categories", role, "POST", input)).status, 403);
      assert.equal((await request("/api/owner/booking-catalog/services/1", role, "PUT", { categoryIds: [], expectedVersion: 0 })).status, 403);
    }
    assert.equal((await request("/api/booking-catalog", "patient")).status, 403);
    assert.equal(writes, 0);
    assert.equal((await request("/api/owner/booking-catalog/categories", "owner", "POST", input)).status, 201);
    for (const name of ["", "All", "Suggested", "Unassigned"])
      assert.equal((await request("/api/owner/booking-catalog/categories", "owner", "POST", { ...input, name })).status, 400);
    assert.equal((await request("/api/owner/booking-catalog/services/1", "owner", "PUT", { categoryIds: [1, 1], expectedVersion: 0 })).status, 400);
    assert.equal(writes, 1);
    const read = await request("/api/booking-catalog", "owner");
    assert.equal(read.headers.get("cache-control"), "private, no-store");
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("Postgres migration preserves services, seeds once and persists owner-managed category changes and assignments",
  { skip: !process.env.TEST_BOOKING_DATABASE_URL }, async () => {
    const schema = `booking_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({ connectionString: process.env.TEST_BOOKING_DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({ connectionString: process.env.TEST_BOOKING_DATABASE_URL, options: `-c search_path=${schema}` });
    try {
      await pool.query(`CREATE TABLE billing_catalog(id integer PRIMARY KEY,name text,category text,price real,is_active boolean);
        INSERT INTO billing_catalog VALUES (1,'Consultation','Consultation',750,true),(2,'Postpartum review','Consultation',800,true),
        (3,'Pelvic ultrasound','Scan',1000,true),(4,'Gynaecologist consultation Dr. Example','Consultation',750,true);`);
      const before = (await pool.query("SELECT * FROM billing_catalog ORDER BY id")).rows;
      await ensureBookingCatalogSchema(pool); await ensureBookingCatalogSchema(pool);
      const store = createBookingCatalogStore(pool);
      let state = bookingCatalogSchema.parse(await store.read());
      assert.equal(state.categories.length, 8);
      const menopause = state.categories.find((category) => category.name === "Menopause")!;
      const pregnancy = state.categories.find((category) => category.name === "Pregnancy")!;
      const services = before.map((service) => ({ ...service, id: String(service.id),
        bookingCategoryIds: state.assignments.find((item) => item.serviceId === service.id)?.categoryIds }));
      assert.deepEqual(groupBookingServices(services, String(menopause.id), null, state.categories)[0].services.map((service) => service.id), ["1", "4"]);
      assert.deepEqual(groupBookingServices(services, String(pregnancy.id), null, state.categories)[0].services.map((service) => service.id), ["1", "2"]);
      await store.update(menopause.id, { name: "Midlife care", sortOrder: 0, isActive: false, careArea: "Menopause", description: "Owner guidance", expectedVersion: 1 }, "owner");
      await assert.rejects(store.update(menopause.id, { name: "Conflict", sortOrder: 0, isActive: true, careArea: "", description: "", expectedVersion: 1 }, "owner"), { status: 409 });
      await assert.rejects(store.assign(3, { categoryIds: [menopause.id], expectedVersion: 1 }, "owner"), { status: 400 });
      await store.assign(1, { categoryIds: [], expectedVersion: 1 }, "owner");
      await assert.rejects(store.assign(1, { categoryIds: [pregnancy.id], expectedVersion: 1 }, "owner"), { status: 409 });
      await ensureBookingCatalogSchema(pool);
      state = await store.read();
      assert.equal(state.categories.find((category) => category.id === menopause.id)?.name, "Midlife care");
      assert.deepEqual(state.assignments.find((item) => item.serviceId === 1)?.categoryIds, []);
      await store.create({ name: "New dynamic category", sortOrder: 5, isActive: true, careArea: "", description: "" }, "owner");
      await assert.rejects(store.create({ name: "new dynamic category", sortOrder: 5, isActive: true, careArea: "", description: "" }, "owner"), { status: 409 });
      const category = (await store.read()).categories.find((item) => item.name === "New dynamic category")!;
      await pool.query("INSERT INTO billing_catalog VALUES (5,'Unmatched name','Custom',400,true)");
      await store.assign(5, { categoryIds: [category.id], expectedVersion: 0 }, "owner");
      const concurrent = await Promise.allSettled([store.assign(5, { categoryIds: [], expectedVersion: 1 }, "owner"), store.assign(5, { categoryIds: [pregnancy.id], expectedVersion: 1 }, "owner")]);
      assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
      assert.deepEqual((await pool.query("SELECT * FROM billing_catalog WHERE id<5 ORDER BY id")).rows, before);
      assert.ok((await pool.query("SELECT count(*)::int AS n FROM booking_catalog_audit")).rows[0].n >= 4);
    } finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
  });
