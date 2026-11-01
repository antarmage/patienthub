import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import {
  episodeInputSchema,
  registerPregnancyEpisodes,
  type PregnancyEpisodeStore,
  type EpisodeInput,
} from "./pregnancy-episodes";
import {
  createPregnancyEpisodeStore,
  ensurePregnancyEpisodeSchema,
} from "./pregnancy-episode-store";

const input: EpisodeInput = {
  details: {
    number: 2,
    status: "current",
    lmp: "2020-01-01",
    dueDate: null,
    startDate: null,
    endDate: null,
    datingBasis: "LMP",
    outcome: "Not recorded",
    deliveryMode: "Not recorded",
    conceptionMethod: "",
    notes: "Synthetic pregnancy",
  },
  records: [
    { kind: "appointment", id: 1 },
    { kind: "lab", id: 1 },
  ],
};
test("episode validation requires real dates, consistent outcomes and explicit unique int32 links", () => {
  assert.ok(episodeInputSchema.safeParse(input).success);
  for (const details of [
    { lmp: "2020-02-30" },
    { lmp: "1/1/2020" },
    { lmp: "2999-01-01" },
    { lmp: null },
    { endDate: "2020-02-01" },
    { outcome: "Live birth" },
    { deliveryMode: "Vaginal" },
    { datingBasis: "Ultrasound" },
    { dueDate: "2020-01-01" },
    { dueDate: "2020-11-01" },
    { status: "past", startDate: "2019-01-01", endDate: "2019-12-31" },
    { number: 0 },
  ])
    assert.equal(
      episodeInputSchema.safeParse({
        ...input,
        details: { ...input.details, ...details },
      }).success,
      false,
      JSON.stringify(details),
    );
  for (const records of [
    [{ kind: "appointment", id: 2147483648 }],
    [input.records[0], input.records[0]],
    [{ kind: "document", id: 1 }],
  ]) {
    assert.equal(
      episodeInputSchema.safeParse({ ...input, records }).success,
      false,
    );
  }
  assert.equal(
    episodeInputSchema.safeParse({ ...input, patientId: 2 }).success,
    false,
  );
});

test("pregnancy routes gate staff writes, toggle reception reads and preserve own-patient boundaries", async () => {
  const app = express();
  app.use(express.json());
  let visible = false,
    calls = 0;
  const authenticate = async (
    req: express.Request,
  ): Promise<AccessActor | null> =>
    req.headers.authorization === "patient"
      ? { patientId: 1 }
      : req.headers.authorization
        ? {
            userId: "synthetic-doctor",
            role: String(req.headers.authorization),
          }
        : null;
  registerClinicalAccess(app, {
    authenticate,
    appointmentPatientId: async () => null,
    clinicalDetailsVisible: async () => visible,
  });
  const store: PregnancyEpisodeStore = {
    list: async () => {
      calls++;
      return [];
    },
    save: async (patientId, episodeId, data) => {
      calls++;
      return {
        id: episodeId || 1,
        patientId,
        ...data,
        version: (data.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
    },
  };
  registerPregnancyEpisodes(app, store, authenticate);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (
    path: string,
    role?: string,
    method = "GET",
    body?: unknown,
  ) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(role ? { Authorization: role } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    const path = "/api/patients/1/pregnancy-episodes";
    assert.equal((await request(path)).status, 401);
    for (const role of ["receptionist", "staff", "admin", "unknown"])
      assert.equal((await request(path, role)).status, 403);
    assert.equal(calls, 0);
    assert.equal((await request(path, "patient")).status, 200);
    assert.equal(
      (await request("/api/patients/2/pregnancy-episodes", "patient")).status,
      403,
    );
    visible = true;
    assert.equal((await request(path, "admin")).status, 403);
    for (const role of ["receptionist", "staff"]) {
      assert.equal((await request(path, role)).status, 200);
      assert.equal((await request(path, role, "POST", input)).status, 403);
      assert.equal(
        (await request(`${path}/1`, role, "PUT", { ...input, version: 1 }))
          .status,
        403,
      );
    }
    for (const role of ["clinician", "owner"]) {
      const saved = await request(path, role, "POST", input);
      assert.equal(saved.status, 201);
      assert.equal(saved.headers.get("cache-control"), "private, no-store");
      assert.equal(
        (await request(path, role, "POST", { ...input, version: 1 })).status,
        400,
      );
      assert.equal(
        (await request(`${path}/1`, role, "PUT", input)).status,
        400,
      );
      assert.equal(
        (await request(`${path}/1`, role, "PUT", { ...input, version: 1 }))
          .status,
        200,
      );
    }
    assert.equal(
      (
        await request(
          "/api/patients/2147483648/pregnancy-episodes",
          "clinician",
        )
      ).status,
      400,
    );
    visible = false;
    assert.equal((await request(path, "receptionist")).status, 403);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test(
  "Postgres episodes persist and isolate pregnancies, reject stale/cross-patient/conflicting records atomically",
  {
    skip: !process.env.TEST_PREGNANCY_DATABASE_URL,
  },
  async () => {
    const url = process.env.TEST_PREGNANCY_DATABASE_URL;
    const schema = `pregnancy_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({
      connectionString: url,
      options: `-c search_path=${schema}`,
    });
    try {
      await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY);
      CREATE TABLE patients(id integer PRIMARY KEY,lmp text);
      CREATE TABLE appointments(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),date text);
      CREATE TABLE visit_history(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),appointment_id integer REFERENCES appointments(id));
      CREATE TABLE lab_results(id integer PRIMARY KEY,patient_id integer REFERENCES patients(id),date text);
      INSERT INTO users VALUES ('doctor');
      INSERT INTO patients VALUES (1,'2020-01-01'),(2,null);
      INSERT INTO appointments VALUES (1,1,'2020-02-01'),(2,1,'2020-02-01'),(3,2,'2020-02-01');
      INSERT INTO visit_history VALUES (1,1,1),(2,1,2),(3,2,3);
      INSERT INTO lab_results VALUES (1,1,'2020-02-01'),(2,1,'2020-02-01'),(3,2,'2020-02-01');`);
      await ensurePregnancyEpisodeSchema(pool);
      await ensurePregnancyEpisodeSchema(pool);
      const store = createPregnancyEpisodeStore(pool);
      const current = await store.save(1, null, input, "doctor");
      const pastInput: EpisodeInput = {
        details: {
          ...input.details,
          number: 1,
          status: "past",
          lmp: "2018-01-01",
          endDate: "2018-10-01",
          outcome: "Live birth",
        },
        records: [
          { kind: "visit", id: 2 },
          { kind: "lab", id: 2 },
        ],
      };
      const past = await store.save(1, null, pastInput, "doctor");
      assert.deepEqual(await store.list(1), [current, past]);
      assert.deepEqual(await store.list(2), []);
      assert.equal(
        (await pool.query("SELECT lmp FROM patients WHERE id=1")).rows[0].lmp,
        "2020-01-01",
      );
      await assert.rejects(
        store.save(
          1,
          null,
          { ...input, details: { ...input.details, number: 3 } },
          "doctor",
        ),
        /already a current/,
      );
      await assert.rejects(
        store.save(1, null, pastInput, "doctor"),
        /number already exists/,
      );
      for (const kind of ["appointment", "visit", "lab"] as const) {
        await assert.rejects(
          store.save(
            1,
            current.id,
            { ...input, version: 1, records: [{ kind, id: 3 }] },
            "doctor",
          ),
          /does not belong/,
        );
      }
      await assert.rejects(
        store.save(
          1,
          current.id,
          { ...input, version: 1, records: [{ kind: "appointment", id: 2 }] },
          "doctor",
        ),
        /cannot belong to different/,
      );
      await assert.rejects(
        store.save(
          1,
          past.id,
          { ...pastInput, version: 1, records: [{ kind: "visit", id: 1 }] },
          "doctor",
        ),
        /cannot belong to different/,
      );
      await assert.rejects(
        store.save(
          1,
          past.id,
          { ...pastInput, version: 1, records: [{ kind: "lab", id: 1 }] },
          "doctor",
        ),
        /another pregnancy/,
      );
      assert.deepEqual(await store.list(1), [current, past]);
      const updated = await store.save(
        1,
        current.id,
        {
          ...input,
          details: { ...input.details, notes: "Updated synthetic" },
          version: 1,
        },
        "doctor",
      );
      assert.equal(updated.version, 2);
      await assert.rejects(
        store.save(1, current.id, { ...input, version: 1 }, "doctor"),
        /updated elsewhere/,
      );
      await assert.rejects(
        store.save(2, current.id, { ...input, version: 2 }, "doctor"),
        /not found for this patient/,
      );
      const edits = await Promise.allSettled(
        [1, 2].map(() =>
          store.save(1, current.id, { ...input, version: 2 }, "doctor"),
        ),
      );
      assert.equal(
        edits.filter((edit) => edit.status === "fulfilled").length,
        1,
      );
      const before = await store.list(1);
      await pool.query(`CREATE FUNCTION reject_test_link() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.lab_result_id=2 THEN RAISE EXCEPTION 'synthetic insert failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_link BEFORE INSERT ON pregnancy_episode_records FOR EACH ROW EXECUTE FUNCTION reject_test_link();`);
      await assert.rejects(
        store.save(
          1,
          past.id,
          {
            ...pastInput,
            version: 1,
            details: { ...pastInput.details, notes: "Must rollback" },
          },
          "doctor",
        ),
        /synthetic insert failure/,
      );
      assert.deepEqual(await store.list(1), before);
      await assert.rejects(
        pool.query(
          `INSERT INTO pregnancy_episode_records(episode_id,patient_id,lab_result_id) VALUES($1,2,3)`,
          [current.id],
        ),
        /foreign key/,
      );
      await assert.rejects(
        pool.query(
          `INSERT INTO pregnancy_episode_records(episode_id,patient_id) VALUES($1,1)`,
          [current.id],
        ),
        /check constraint/,
      );
      await assert.rejects(store.list(999), /Patient not found/);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
