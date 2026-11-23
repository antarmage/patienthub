import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createPatientProgramsStore, ensurePatientProgramsSchema, registerPatientPrograms } from "./patient-programs";
import type { Program, ProgramInput } from "../../../lib/db/src/patient-programs";

const input: ProgramInput = {
  title: "Gentle movement", description: "A reviewed program", category: "exercise", tier: "free", price: null,
  sessions: [{ title: "First session", content: "Session instructions" }],
};

test("program routes require staff and restrict publishing to reviewers", async () => {
  let actions: string[] = [];
  const draft: Program = { ...input, id: 1, status: "draft", version: 1 };
  const store: ReturnType<typeof createPatientProgramsStore> = {
    listStaff: async () => [draft],
    listPatient: async () => [],
    create: async (value) => { actions.push("create"); return { ...draft, ...value }; },
    change: async (_id, _version, _actor, action) => { actions.push(action); return draft; },
  };
  const app = express(); app.use(express.json());
  registerPatientPrograms(app, store, async (req) => req.headers.authorization === "patient" ? { patientId: 1 }
    : req.headers.authorization ? { userId: "test", role: String(req.headers.authorization) } : null);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    assert.equal((await request("/api/program-management")).status, 401);
    assert.equal((await request("/api/program-management", "patient")).status, 403);
    assert.equal((await request("/api/patient-programs", "staff")).status, 403);
    assert.deepEqual(await (await request("/api/patient-programs", "patient")).json(), []);
    assert.equal((await request("/api/program-management", "staff", "POST", { ...input, status: "published" })).status, 400);
    const created = await request("/api/program-management", "staff", "POST", { ...input, category: "mind", price: 1250 });
    assert.equal(created.status, 201);
    const createdBody: unknown = await created.json();
    assert.ok(createdBody && typeof createdBody === "object" && "price" in createdBody);
    assert.equal(createdBody.price, 1250);
    assert.equal((await request("/api/program-management/1/publish", "staff", "POST", { expectedVersion: 1, reviewed: true })).status, 403);
    assert.equal((await request("/api/program-management/1/unpublish", "staff", "POST", { expectedVersion: 1 })).status, 403);
    assert.equal((await request("/api/program-management/1/publish", "clinician", "POST", { expectedVersion: 1 })).status, 400);
    assert.equal((await request("/api/program-management/1/publish", "owner", "POST", { expectedVersion: 1, reviewed: true })).status, 200);
    assert.deepEqual(actions, ["create", "publish"]);
    assert.equal((await request("/api/program-management", "clinician")).headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await (await request("/api/program-management", "staff")).json(), { programs: [draft], canPublish: false });
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("program storage exposes published tiers, persists prices, and locks published content",
  { skip: !process.env.TEST_PROGRAMS_DATABASE_URL }, async () => {
    const schema = `program_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({ connectionString: process.env.TEST_PROGRAMS_DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({ connectionString: process.env.TEST_PROGRAMS_DATABASE_URL, options: `-c search_path=${schema}` });
    try {
      await ensurePatientProgramsSchema(pool); await ensurePatientProgramsSchema(pool);
      const store = createPatientProgramsStore(pool);
      const free = await store.create(input, "staff");
      const plus = await store.create({ ...input, title: "Plus", category: "mind", tier: "plus", price: 1800 }, "staff");
      assert.deepEqual(await store.listPatient(), []);
      const published = await store.change(free.id, free.version, "doctor", "publish");
      await store.change(plus.id, plus.version, "doctor", "publish");
      assert.deepEqual((await store.listPatient()).map((program) => program.id), [free.id, plus.id]);
      assert.equal((await store.listPatient()).find((program) => program.id === plus.id)?.price, 1800);
      await assert.rejects(store.change(free.id, published.version, "staff", "edit", input), { status: 409 });
      await assert.rejects(store.change(free.id, free.version, "doctor", "unpublish"), { status: 409 });
      const unpublished = await store.change(free.id, published.version, "doctor", "unpublish");
      assert.deepEqual((await store.listPatient()).map((program) => program.id), [plus.id]);
      const updated = await store.change(free.id, unpublished.version, "staff", "edit", { ...input, title: "Changed" });
      await assert.rejects(store.change(free.id, updated.version - 1, "doctor", "publish"), { status: 409 });
      const empty = await store.create({ ...input, sessions: [] }, "staff");
      await assert.rejects(store.change(empty.id, empty.version, "doctor", "publish"), { status: 400 });
      const competing = await Promise.allSettled([
        store.change(free.id, updated.version, "doctor", "publish"),
        store.change(free.id, updated.version, "owner", "publish"),
      ]);
      assert.equal(competing.filter((result) => result.status === "fulfilled").length, 1);
      const reviewed = (await store.listPatient())[0];
      const backToDraft = await store.change(free.id, reviewed.version, "doctor", "unpublish");
      const changedTier = await store.change(free.id, backToDraft.version, "staff", "edit", { ...input, tier: "plus" });
      await store.change(free.id, changedTier.version, "doctor", "publish");
      assert.deepEqual((await store.listPatient()).map((program) => program.id), [free.id, plus.id]);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM patient_program_audit")).rows[0].count, 11);
    } finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
  });
