import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import pg from "pg";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import {
  assertSurgeryTransition, recoveryObservationSchema, registerSurgeryWorkflow, surgeryDetailsSchema,
  surgeryStatuses, type SurgeryWorkflowStore, type SurgeryDetails, type SurgeryPlanRecord,
} from "./surgery-workflow";
import { createSurgeryStore, ensureSurgerySchema } from "./surgery-store";
import {
  careNetworkDetailsSchema, careNetworkMemberSchema, careNetworkUpdateSchema,
  emptySurgeryAssignments, surgeryAssignmentsSchema, surgeryCareRoles, surgeryTeamSchema,
  type CareNetworkDetails, type CareNetworkMember,
} from "../../../lib/db/src/surgery-care-network";

const details = { procedureName: "Test procedure", plannedDate: "2026-11-01", surgeonId: 1, notes: "Synthetic notes" };
const observation = { patientId: 1, surgeryPlanId: 1, observedAt: new Date().toISOString(), painScore: 0,
  systolic: "120", diastolic: "80", pulse: "72", nausea: false, mobility: null, woundCondition: null, notes: null };
const contact: CareNetworkDetails = {
  role: "nursing_home", name: "Synthetic facility", affiliation: "Synthetic clinic", phone: "+91 00000 00000", email: "facility@example.test",
};

test("care-network contracts validate role, contact fields and optional surgery assignments", () => {
  assert.ok(careNetworkDetailsSchema.safeParse(contact).success);
  for (const invalid of [{ ...contact, role: "surgeon" }, { ...contact, name: " " },
    { ...contact, email: "not-an-email" }, { ...contact, phone: "call me" },
    { ...contact, createdBy: "someone-else" }, { ...contact, active: true }]) {
    assert.equal(careNetworkDetailsSchema.safeParse(invalid).success, false);
  }
  assert.ok(careNetworkUpdateSchema.safeParse({ ...contact, active: false }).success);
  assert.ok(surgeryAssignmentsSchema.safeParse(emptySurgeryAssignments).success);
  assert.ok(surgeryDetailsSchema.safeParse({ ...details, assignments: { ...emptySurgeryAssignments, nursing_home: 1 } }).success);
  for (const invalid of [{ ...emptySurgeryAssignments, anesthetist: "1" },
    { ...emptySurgeryAssignments, pediatrician: -1 }, { ...emptySurgeryAssignments, ot_assistant: 2147483648 },
    { nursing_home: 1 }, { ...emptySurgeryAssignments, theatre: 1 }]) {
    assert.equal(surgeryAssignmentsSchema.safeParse(invalid).success, false);
  }
});

test("surgery lifecycle permits only plan-to-completion/cancellation and recovery-to-discharge", () => {
  for (const current of surgeryStatuses) for (const next of ["completed", "cancelled", "discharged"] as const) {
    const valid = current === "planned" && ["completed", "cancelled"].includes(next) || current === "completed" && next === "discharged";
    if (valid) assert.doesNotThrow(() => assertSurgeryTransition(current, next));
    else assert.throws(() => assertSurgeryTransition(current, next), /cannot make that status change/);
  }
  assert.ok(surgeryDetailsSchema.safeParse(details).success);
  for (const body of [{ ...details, procedureName: "" }, { ...details, plannedDate: "2026-02-30" },
    { ...details, surgeonId: -1 }, { ...details, status: "completed" }, { ...details, createdBy: "other" }]) {
    assert.equal(surgeryDetailsSchema.safeParse(body).success, false);
  }
  const parsed = recoveryObservationSchema.parse(observation);
  assert.equal(parsed.painScore, 0);
  assert.equal(parsed.systolic, 120);
  for (const body of [{ ...observation, surgeryPlanId: undefined }, { ...observation, painScore: 11 },
    { ...observation, systolic: "80", diastolic: "120" }, { ...observation, recordedBy: "other" }]) {
    assert.equal(recoveryObservationSchema.safeParse(body).success, false);
  }
});

test("only doctors/owners can plan surgery; recovery staff receive a narrow projection and must supply an episode", async () => {
  const app = express(); app.use(express.json());
  const authenticate = async (req: express.Request): Promise<AccessActor | null> =>
    req.headers.authorization === "patient" ? { patientId: 1 } :
      req.headers.authorization ? { userId: "synthetic", role: String(req.headers.authorization) } : null;
  registerClinicalAccess(app, { authenticate, appointmentPatientId: async () => null });
  let calls = 0;
  let savedDetails: SurgeryDetails | undefined;
  const member: CareNetworkMember = { ...contact, id: 1, active: true };
  const savedPlan: SurgeryPlanRecord = { ...details, id: 1, patientId: 1, surgeonName: "Synthetic surgeon", status: "planned",
    completedAt: null, closedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    team: { nursing_home: member, anesthetist: null, pediatrician: null, ot_assistant: null } };
  const store: SurgeryWorkflowStore = {
    listCareNetwork: async () => { calls++; return [member]; },
    createCareNetworkMember: async (input) => { calls++; return { ...input, id: 1, active: true }; },
    updateCareNetworkMember: async (id, input) => { calls++; return { ...input, id }; },
    list: async () => { calls++; return []; },
    create: async (_patientId, input) => { calls++; savedDetails = input; return savedPlan; },
    edit: async () => { calls++; throw new Error("Not invoked in this test"); },
    transition: async () => { calls++; throw new Error("Not invoked in this test"); },
    recoveryPatients: async () => [{ id: 1, name: "Synthetic patient", age: null, phone: null,
      surgery: { id: 1, procedureName: "Test procedure", plannedDate: "2026-11-01", completedAt: new Date().toISOString(), surgeonName: "Synthetic doctor" } }],
    observations: async () => { calls++; return []; },
    recordObservation: async () => { calls++; return {}; },
  };
  registerSurgeryWorkflow(app, store, authenticate);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: role } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    for (const [path, method, body] of [
      ["/api/patients/1/surgeries", "GET", undefined],
      ["/api/patients/1/surgeries", "POST", details],
      ["/api/patients/1/surgeries/1", "PATCH", { status: "completed", completedDate: "2026-11-01" }],
      ["/api/surgery-care-network", "GET", undefined],
      ["/api/surgery-care-network", "POST", contact],
      ["/api/surgery-care-network/1", "PATCH", { ...contact, active: false }],
    ] as const) {
      assert.equal((await request(path, undefined, method, body)).status, 401);
      for (const role of ["staff", "receptionist", "admin", "patient", "unknown"]) assert.equal((await request(path, role, method, body)).status, 403);
    }
    assert.equal(calls, 0);
    for (const role of ["clinician", "owner"]) assert.equal((await request("/api/patients/1/surgeries", role)).status, 200);
    for (const role of ["clinician", "owner"]) {
      const directory = await request("/api/surgery-care-network", role);
      assert.equal(directory.status, 200);
      assert.match(directory.headers.get("cache-control") || "", /no-store/);
      assert.deepEqual(await directory.json(), [member]);
      assert.equal((await request("/api/surgery-care-network", role, "POST", contact)).status, 201);
      const archived = await request("/api/surgery-care-network/1", role, "PATCH", { ...contact, active: false });
      assert.equal(archived.status, 200);
      assert.equal(careNetworkMemberSchema.parse(await archived.json()).active, false);
    }
    const callsBeforeInvalid = calls;
    for (const invalid of [{ ...contact, name: "" }, { ...contact, role: "other" }, { ...contact, updatedBy: "other" }]) {
      assert.equal((await request("/api/surgery-care-network", "clinician", "POST", invalid)).status, 400);
    }
    assert.equal((await request("/api/surgery-care-network/invalid", "owner", "PATCH", { ...contact, active: true })).status, 400);
    assert.equal((await request("/api/surgery-care-network/1", "owner", "PATCH", contact)).status, 400);
    assert.equal((await request("/api/patients/1/surgeries", "clinician", "POST", { ...details, assignments: { nursing_home: "1" } })).status, 400);
    assert.equal(calls, callsBeforeInvalid);
    const assignedDetails = { ...details, assignments: { ...emptySurgeryAssignments, nursing_home: 1 } };
    const created = await request("/api/patients/1/surgeries", "clinician", "POST", assignedDetails);
    assert.equal(created.status, 201);
    assert.deepEqual(savedDetails, assignedDetails);
    const createdBody = await created.json();
    assert.ok(createdBody && typeof createdBody === "object" && "team" in createdBody);
    assert.deepEqual(surgeryTeamSchema.parse(createdBody.team).nursing_home, member);
    for (const role of ["staff", "receptionist", "admin", "clinician", "owner"]) {
      const response = await request("/api/postop/patients", role);
      assert.equal(response.status, 200);
      const rows = await response.json();
      assert.ok(Array.isArray(rows));
      assert.deepEqual(Object.keys(rows[0]).sort(), ["age", "id", "name", "phone", "surgery"]);
      assert.deepEqual(Object.keys(rows[0].surgery).sort(), ["completedAt", "id", "plannedDate", "procedureName", "surgeonName"]);
    }
    assert.equal((await request("/api/postop/patients", "patient")).status, 403);
    assert.equal((await request("/api/postop/observations", "staff")).status, 400);
    assert.equal((await request("/api/postop/observations", "staff", "GET", undefined, { "X-Patient-Id": "1" })).status, 400);
    assert.equal((await request("/api/postop/observations", "staff", "GET", undefined, { "X-Patient-Id": "1", "X-Surgery-Plan-Id": "1" })).status, 200);
    assert.equal((await request("/api/postop/observations", "staff", "POST", { ...observation, surgeryPlanId: undefined })).status, 400);
    assert.equal((await request("/api/patients/1/surgeries/1", "clinician", "PATCH", { status: "completed", completedDate: "2999-01-01" })).status, 400);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test("Postgres surgery enrollment, repeat surgery isolation, cancellation/discharge gates and concurrent plans", {
  skip: !process.env.TEST_SURGERY_DATABASE_URL,
}, async () => {
  const pool = new pg.Pool({ connectionString: process.env.TEST_SURGERY_DATABASE_URL });
  const schema = `surgery_test_${process.pid}`;
  try {
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.end();
    const isolated = new pg.Pool({ connectionString: process.env.TEST_SURGERY_DATABASE_URL, options: `-c search_path=${schema}` });
    try {
      await isolated.query(`CREATE TABLE users(id varchar PRIMARY KEY, username text);
        CREATE TABLE patients(id integer PRIMARY KEY, name text, phone text, age integer);
        CREATE TABLE providers(id integer PRIMARY KEY, name text);
        CREATE TABLE postop_observations(id serial PRIMARY KEY,patient_id integer,observed_at text,pain_score integer,
          systolic integer,diastolic integer,pulse integer,nausea boolean,mobility text,wound_condition text,notes text,recorded_by text);
        INSERT INTO users VALUES ('doctor','Synthetic doctor');
        INSERT INTO patients VALUES (1,'Synthetic patient','000',30),(2,'Other patient',null,null),(3,'Legacy patient',null,null);
        INSERT INTO providers VALUES (1,'Synthetic surgeon');
        INSERT INTO postop_observations(patient_id,observed_at,notes) VALUES (1,'2020-01-01T00:00:00Z','Legacy record');
        CREATE TABLE surgery_plans (
          id serial PRIMARY KEY, patient_id integer NOT NULL REFERENCES patients(id), procedure_name text NOT NULL,
          planned_date text NOT NULL, surgeon_id integer NOT NULL REFERENCES providers(id), notes text NOT NULL DEFAULT '',
          status text NOT NULL DEFAULT 'planned', completed_at text, closed_at text, created_at text NOT NULL,
          updated_at text NOT NULL, created_by varchar NOT NULL REFERENCES users(id), updated_by varchar NOT NULL REFERENCES users(id)
        );
        INSERT INTO surgery_plans(patient_id,procedure_name,planned_date,surgeon_id,status,created_at,updated_at,created_by,updated_by)
          VALUES (3,'Legacy surgery','2020-01-01',1,'cancelled','2020-01-01','2020-01-01','doctor','doctor');`);
      await ensureSurgerySchema(isolated);
      await ensureSurgerySchema(isolated);
      const store = createSurgeryStore(isolated);
      assert.deepEqual((await store.list(3))[0].team, emptySurgeryAssignments);
      const members: CareNetworkMember[] = [];
      for (const role of surgeryCareRoles) {
        members.push(await store.createCareNetworkMember({ ...contact, role, name: `Synthetic ${role}` }, "doctor"));
      }
      assert.equal((await store.listCareNetwork()).length, 4);
      for (const member of members) assert.ok(careNetworkMemberSchema.safeParse(member).success);
      const assignments = {
        nursing_home: members[0].id, anesthetist: members[1].id,
        pediatrician: members[2].id, ot_assistant: members[3].id,
      };
      const first = await store.create(1, { ...details, assignments }, "doctor");
      assert.equal(first.status, "planned");
      for (const role of surgeryCareRoles) assert.equal(first.team[role]?.id, assignments[role]);
      assert.equal((await createSurgeryStore(isolated).list(1))[0].team.nursing_home?.id, members[0].id);
      await assert.rejects(store.create(2, { ...details, assignments: { ...assignments, anesthetist: members[0].id } }, "doctor"), /correct role/);
      await assert.rejects(store.create(2, { ...details, assignments: { ...assignments, ot_assistant: 9999 } }, "doctor"), /correct role/);
      const archived = await store.updateCareNetworkMember(members[0].id, { ...contact, name: "Updated facility", active: false }, "doctor");
      assert.equal(archived.active, false);
      assert.equal((await store.list(1))[0].team.nursing_home?.name, "Updated facility");
      assert.equal((await store.list(1))[0].team.nursing_home?.active, false);
      await assert.rejects(store.create(2, { ...details, assignments }, "doctor"), /archived/);
      await assert.rejects(store.updateCareNetworkMember(members[0].id, { ...contact, role: "pediatrician", active: true }, "doctor"), /role cannot change/);
      await assert.rejects(store.updateCareNetworkMember(9999, { ...contact, active: true }, "doctor"), /not found/);
      const retained = await store.edit(1, first.id, { ...details, notes: "Legacy client edit" }, "doctor");
      assert.equal(retained.team.nursing_home?.id, members[0].id);
      await store.edit(1, first.id, { ...details, assignments: emptySurgeryAssignments }, "doctor");
      assert.deepEqual((await store.list(1))[0].team, emptySurgeryAssignments);
      await assert.rejects(store.edit(1, first.id, { ...details, assignments }, "doctor"), /archived/);
      await store.updateCareNetworkMember(members[0].id, { ...contact, active: true }, "doctor");
      const restored = await store.edit(1, first.id, { ...details, assignments }, "doctor");
      assert.equal(restored.team.nursing_home?.active, true);
      assert.deepEqual(await store.recoveryPatients(""), []);
      await assert.rejects(store.observations(1, first.id), /not in active surgical recovery/);
      await assert.rejects(store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id }), "doctor"), /not in active surgical recovery/);
      await assert.rejects(store.create(1, details, "doctor"), /already has an open/);
      await store.edit(1, first.id, { ...details, notes: "Updated" }, "doctor");
      const complete = await store.transition(1, first.id, { status: "completed", completedDate: "2026-11-01" }, "doctor");
      assert.equal(complete.status, "completed");
      assert.equal((await store.recoveryPatients("synthetic"))[0].surgery.id, first.id);
      assert.deepEqual(await store.recoveryPatients("unmatched"), []);
      assert.deepEqual(await store.observations(1, first.id), []);
      await assert.rejects(store.observations(2, first.id), /not found for this patient/);
      const saved = await store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id }), "doctor");
      assert.ok(saved);
      assert.equal((await store.observations(1, first.id)).length, 1);
      await assert.rejects(store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id, observedAt: "2020-01-01T00:00:00Z" }), "doctor"), /after surgery completion/);
      await store.transition(1, first.id, { status: "discharged" }, "doctor");
      assert.deepEqual(await store.recoveryPatients(""), []);
      await assert.rejects(store.recordObservation(recoveryObservationSchema.parse({ ...observation, surgeryPlanId: first.id }), "doctor"), /not in active surgical recovery/);
      await assert.rejects(store.transition(1, first.id, { status: "completed", completedDate: "2026-11-01" }, "doctor"), /cannot make that status change/);
      const second = await store.create(1, details, "doctor");
      await store.transition(1, second.id, { status: "completed", completedDate: "2026-11-01" }, "doctor");
      assert.deepEqual(await store.observations(1, second.id), []);
      await store.transition(1, second.id, { status: "discharged" }, "doctor");
      const concurrent = await Promise.allSettled([store.create(1, details, "doctor"), store.create(1, details, "doctor")]);
      assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(concurrent.filter((result) => result.status === "rejected").length, 1);
      const open = (await store.list(1)).find((plan) => plan.status === "planned");
      assert.ok(open);
      await store.transition(1, open.id, { status: "cancelled" }, "doctor");
      assert.deepEqual(await store.recoveryPatients(""), []);
      await assert.rejects(store.observations(1, open.id), /not in active surgical recovery/);
      assert.equal((await isolated.query("SELECT * FROM postop_observations")).rowCount, 2);
      await assert.rejects(store.create(99, details, "doctor"), /Patient not found/);
      await assert.rejects(store.create(2, { ...details, surgeonId: 99 }, "doctor"), /existing surgeon/);
      assert.equal((await store.list(2)).length, 0);
    } finally { await isolated.end(); }
  } finally {
    const cleanup = new pg.Pool({ connectionString: process.env.TEST_SURGERY_DATABASE_URL });
    await cleanup.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await cleanup.end();
  }
});
