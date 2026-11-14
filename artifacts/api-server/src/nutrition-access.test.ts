import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import { createNutritionAccessStore, isNutritionAccount, nutritionService, registerNutritionAccess } from "./nutrition-access";

test("persisted external/provider referrals grant and revoke nutrition access", {
  skip: !process.env.NUTRITION_ACCESS_TEST_DATABASE_URL,
}, async () => {
  const pool = new Pool({ connectionString: process.env.NUTRITION_ACCESS_TEST_DATABASE_URL, max: 1 });
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    assert.equal(tables.rowCount, 0, "Nutrition access integration test requires an empty disposable database");
    await pool.query(`CREATE TEMP TABLE providers(id integer PRIMARY KEY,role text,specialty text);
      CREATE TEMP TABLE referrals(id integer PRIMARY KEY,patient_id integer,referred_to_provider_id integer,referred_to_external text,status text);
      CREATE TEMP TABLE appointments(id integer PRIMARY KEY,patient_id integer);
      INSERT INTO providers VALUES(1,'nutritionist',NULL),(2,'clinician','Dietitian'),(3,'clinician','Skin');
      INSERT INTO referrals VALUES
        (1,7,NULL,'Nutrition','pending'),(2,8,1,NULL,'active'),(3,9,2,NULL,'accepted'),
        (4,10,NULL,'Nutrition','cancelled'),(5,11,NULL,'Nutrition','completed'),
        (6,12,3,NULL,'pending'),(7,13,NULL,'Not nutrition','pending'),
        (8,7,NULL,'Nutritionist','referred'),(9,14,NULL,'Nutrition',NULL);
      INSERT INTO appointments VALUES(4,7),(5,10);`);
    const store = createNutritionAccessStore(pool);
    assert.deepEqual([...await store.patients()].sort((a, b) => a - b), [7, 8, 9, 14]);
    assert.equal(await store.nutritionReferral(2), true);
    assert.equal(await store.nutritionReferral(6), false);
    assert.equal(await store.recordPatient("appointments", 4), 7);
    assert.equal(await store.recordPatient("appointments", 999), null);
    await pool.query("UPDATE referrals SET status='cancelled' WHERE patient_id=7");
    assert.equal((await store.patients()).has(7), false);
  } finally { await pool.end(); }
});

test("nutrition identities and destinations use server-owned account details and exact service names", () => {
  assert.equal(isNutritionAccount({ userId: "1", role: "staff", username: "nutritionist" }), true);
  assert.equal(isNutritionAccount({ userId: "1", role: "nutritionist" }), true);
  assert.equal(isNutritionAccount({ userId: "1", role: "staff", username: "reception" }), false);
  assert.equal(isNutritionAccount({ patientId: 1 }), false);
  for (const name of ["Nutrition", " Nutritionist ", "Dietitian"]) assert.equal(nutritionService(name), true);
  for (const name of ["Skin", "Not nutrition", "Nutrition referral elsewhere"]) assert.equal(nutritionService(name), false);
});

test("nutrition referrals scope collections, direct records, private notes and referral management", async () => {
  let assigned = new Set([7]);
  let handled = 0;
  const actors: Record<string, AccessActor> = {
    nutrition: { userId: "n", role: "staff", username: "nutritionist" },
    dedicated: { userId: "n", role: "nutritionist" },
    doctor: { userId: "d", role: "clinician" },
    reception: { userId: "r", role: "staff", username: "reception" },
  };
  const authenticate = async (req: express.Request) => actors[String(req.headers.authorization)] ?? null;
  const app = express();
  app.use(express.json());
  registerNutritionAccess(app, authenticate, {
    patients: async () => assigned,
    recordPatient: async (_collection, id) => id === 4 ? 7 : 8,
    nutritionReferral: async (id) => id === 1,
  });
  registerClinicalAccess(app, { authenticate, appointmentPatientId: async () => 7 });
  app.use((req, res) => {
    handled++;
    if (req.path === "/api/patients") res.json([{ id: 7, name: "Assigned", hb: 10 }, { id: 8, name: "Other" }]);
    else if (req.path.endsWith("/clinical-notes")) res.json([{ id: 1, patientId: 7, isPrivate: 0 }, { id: 2, patientId: 7, isPrivate: 1 }]);
    else if (["/api/appointments", "/api/lab-tasks", "/api/patient-protocols", "/api/documents"].includes(req.path)) res.json([{ id: 4, patientId: 7 }, { id: 5, patientId: 8 }]);
    else res.json({ id: 7, patientId: 7 });
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, actor = "nutrition", method = "GET", body?: unknown) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { Authorization: actor, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    for (const actor of ["nutrition", "dedicated"]) {
      assert.deepEqual(await (await request("/api/patients", actor)).json(), [{ id: 7, name: "Assigned", hb: 10 }]);
      for (const path of ["/api/appointments", "/api/lab-tasks", "/api/patient-protocols", "/api/documents"])
        assert.deepEqual(await (await request(path, actor)).json(), [{ id: 4, patientId: 7 }]);
      assert.equal((await request("/api/patients/7", actor)).status, 200);
      assert.equal((await request("/api/appointments/4", actor)).status, 200);
      assert.deepEqual(await (await request("/api/patients/7/clinical-notes", actor)).json(), [{ id: 1, patientId: 7, isPrivate: 0 }]);
      for (const path of ["/api/patients/8", "/api/patients/8/visit-history", "/api/appointments/5", "/api/patient-protocols?patientId=8",
        "/api/desk/patients", "/api/prime-members", "/api/postop/patients", "/api/analytics/postpartum", "/api/diagnostic-referrals"]) {
        const before = handled;
        assert.equal((await request(path, actor)).status, 403, path);
        assert.equal(handled, before);
      }
      assert.equal((await request("/api/patients/7/referrals", actor, "POST", { referredToExternal: "Nutrition" })).status, 403);
    }
    assert.equal((await request("/api/patients", "doctor")).status, 200);
    assert.equal((await request("/api/patient-protocols", "nutrition", "POST", { patientId: 7 })).status, 200);
    assert.equal((await request("/api/patient-protocols", "nutrition", "POST", { patientId: 8 })).status, 403);
    assert.equal((await request("/api/patient-protocols", "nutrition", "POST", { patientId: "7" })).status, 400);
    assert.equal((await request("/api/patients/7/referrals", "reception", "POST", { referredToExternal: "Nutrition", date: "2026-11-15" })).status, 200);
    assert.equal((await request("/api/referrals/1", "reception", "PATCH", { status: "cancelled" })).status, 200);
    assert.equal((await request("/api/referrals/2", "reception", "DELETE")).status, 403);
    assert.equal((await request("/api/referrals/1", "reception", "PATCH", { patientId: 8 })).status, 403);
    assigned = new Set();
    assert.deepEqual(await (await request("/api/patients")).json(), []);
    assert.equal((await request("/api/patients/7")).status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
