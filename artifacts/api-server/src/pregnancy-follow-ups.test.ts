import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { clinicDate, addCallDays } from "../../../lib/db/src/follow-up";
import {
  ensurePregnancyFollowUpSchema,
  createPregnancyFollowUpStore,
  registerPregnancyFollowUps,
} from "./pregnancy-follow-ups";
import { ensurePregnancyEpisodeSchema } from "./pregnancy-episode-store";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";

test("only clinician/owner can auto-save plans; reads retain clinical/own-patient permissions and validate IDs", async () => {
  const app = express();
  app.use(express.json());
  const authenticate = async (
    req: express.Request,
  ): Promise<AccessActor | null> =>
    req.headers.authorization === "patient"
      ? { patientId: 1 }
      : req.headers.authorization
        ? { userId: "synthetic-user", role: String(req.headers.authorization) }
        : null;
  let visible = false,
    writes = 0;
  registerClinicalAccess(app, {
    authenticate,
    appointmentPatientId: async () => null,
    clinicalDetailsVisible: async () => visible,
  });
  registerPregnancyFollowUps(
    app,
    {
      read: async () => null,
      sync: async (ids) => {
        writes++;
        return Object.fromEntries(ids.map((id) => [id, null]));
      },
    },
    authenticate,
  );
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  const request = (path: string, role?: string, body?: unknown) =>
    fetch(`http://127.0.0.1:${addr.port}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(role ? { Authorization: role } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try {
    const sync = "/api/pregnancy-follow-ups/sync";
    assert.equal(
      (await request(sync, undefined, { patientIds: [1] })).status,
      401,
    );
    for (const role of ["patient", "staff", "receptionist", "admin"])
      assert.equal(
        (await request(sync, role, { patientIds: [1] })).status,
        403,
      );
    for (const patientIds of [[1, 1], [0], ["1"], [2147483648]])
      assert.equal(
        (await request(sync, "clinician", { patientIds })).status,
        400,
      );
    const response = await request(sync, "clinician", { patientIds: [1] });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(writes, 1);
    const read = "/api/patients/1/pregnancy-episodes/follow-up";
    assert.equal((await request(read, "patient")).status, 200);
    assert.equal(
      (await request("/api/patients/2/pregnancy-episodes/follow-up", "patient"))
        .status,
      403,
    );
    assert.equal((await request(read, "receptionist")).status, 403);
    visible = true;
    assert.equal((await request(read, "receptionist")).status, 200);
    assert.equal(writes, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test(
  "Postgres persists/audits plans idempotently, prioritizes new prescriptions and serializes concurrent saves",
  { skip: !process.env.TEST_PREGNANCY_DATABASE_URL },
  async () => {
    const schema = `pregnancy_plan_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({
      connectionString: process.env.TEST_PREGNANCY_DATABASE_URL,
    });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({
      connectionString: process.env.TEST_PREGNANCY_DATABASE_URL,
      options: `-c search_path=${schema}`,
    });
    try {
      await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY);
        CREATE TABLE patients(id integer PRIMARY KEY,next_review text);
        CREATE TABLE appointments(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),date date,status text,follow_up_date date,follow_up_notes text);
        CREATE TABLE visit_history(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),appointment_id integer REFERENCES appointments(id),date date,follow_up_plan text,vitals jsonb);
        CREATE TABLE lab_results(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id));
        INSERT INTO users VALUES ('doctor'); INSERT INTO patients VALUES (1,null),(2,null);`);
      await ensurePregnancyEpisodeSchema(pool);
      await ensurePregnancyFollowUpSchema(pool);
      await ensurePregnancyFollowUpSchema(pool);
      const today = clinicDate();
      const details = {
        number: 1,
        status: "current",
        lmp: addCallDays(today, -37 * 7),
        endDate: null,
        datingBasis: "LMP",
      };
      await pool.query(
        `INSERT INTO pregnancy_episodes(patient_id,details,version,created_by,updated_by,updated_at)
        VALUES(1,$1,1,'doctor','doctor',$2)`,
        [JSON.stringify(details), today],
      );
      const store = createPregnancyFollowUpStore(pool);
      const results = await Promise.all([
        store.sync([1, 2], "doctor"),
        store.sync([1], "doctor"),
      ]);
      assert.equal(results[0]["1"]?.date, today);
      assert.equal(results[0]["1"]?.source, "milestone");
      assert.equal(results[0]["2"], null);
      assert.deepEqual(await store.read(1), results[0]["1"]);
      assert.equal(
        (
          await pool.query(
            "SELECT jsonb_array_length(audit) AS count FROM pregnancy_follow_up_plans WHERE patient_id=1",
          )
        ).rows[0].count,
        1,
      );
      const due = addCallDays(today, 3);
      await pool.query(
        "INSERT INTO appointments VALUES(1,1,$1,'completed',$2,'Review in 3 days')",
        [today, due],
      );
      const episode = (
        await pool.query("SELECT id FROM pregnancy_episodes WHERE patient_id=1")
      ).rows[0].id;
      await pool.query(
        "INSERT INTO pregnancy_episode_records(episode_id,patient_id,appointment_id) VALUES($1,1,1)",
        [episode],
      );
      const updated = await store.sync([1], "doctor");
      assert.equal(updated["1"]?.date, due);
      assert.equal(updated["1"]?.source, "prescription");
      assert.equal(
        (await pool.query("SELECT next_review FROM patients WHERE id=1"))
          .rows[0].next_review,
        null,
      );
      assert.equal(
        (await pool.query("SELECT count(*)::int AS count FROM appointments"))
          .rows[0].count,
        1,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT jsonb_array_length(audit) AS count FROM pregnancy_follow_up_plans WHERE patient_id=1",
          )
        ).rows[0].count,
        2,
      );
      await store.sync([1], "doctor");
      assert.equal(
        (
          await pool.query(
            "SELECT jsonb_array_length(audit) AS count FROM pregnancy_follow_up_plans WHERE patient_id=1",
          )
        ).rows[0].count,
        2,
      );
      await assert.rejects(store.sync([1, 999], "doctor"), /Patient not found/);
      await pool.query(
        "UPDATE pregnancy_episodes SET details=jsonb_set(details,'{status}','\"past\"') WHERE patient_id=1",
      );
      assert.equal(await store.read(1), null);
      assert.equal((await store.sync([1], "doctor"))["1"], null);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
