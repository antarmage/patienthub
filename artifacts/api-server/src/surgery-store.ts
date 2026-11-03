import type { Pool, PoolClient } from "pg";
import {
  emptySurgeryAssignments, surgeryCareRoles, surgeryCareRoleLabels,
  type CareNetworkMember, type SurgeryAssignments, type SurgeryTeam,
} from "../../../lib/db/src/surgery-care-network";
import {
  assertSurgeryTransition, workflowError, type SurgeryWorkflowStore,
  type SurgeryPlanRecord, type RecoveryPatient,
} from "./surgery-workflow";

const teamJoins = surgeryCareRoles.map((role) => `LEFT JOIN surgery_care_network ${role} ON ${role}.id = s.${role}_id`).join("\n");
const teamJson = surgeryCareRoles.map((role) =>
  `'${role}', CASE WHEN ${role}.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', ${role}.id, 'role', ${role}.role, 'name', ${role}.name, 'affiliation', ${role}.affiliation,
    'phone', ${role}.phone, 'email', ${role}.email, 'active', ${role}.active) END`).join(", ");
const planSelect = `SELECT s.id, s.patient_id AS "patientId", s.procedure_name AS "procedureName",
  s.planned_date AS "plannedDate", s.surgeon_id AS "surgeonId", p.name AS "surgeonName",
  s.notes, s.status, s.completed_at AS "completedAt", s.closed_at AS "closedAt",
  s.created_at AS "createdAt", s.updated_at AS "updatedAt", jsonb_build_object(${teamJson}) AS team
  FROM surgery_plans s JOIN providers p ON p.id = s.surgeon_id ${teamJoins}`;
const memberSelect = "SELECT id, role, name, affiliation, phone, email, active FROM surgery_care_network";
const observationSelect = `SELECT id, patient_id AS "patientId", surgery_plan_id AS "surgeryPlanId",
  observed_at AS "observedAt", pain_score AS "painScore", systolic, diastolic, pulse, nausea,
  mobility, wound_condition AS "woundCondition", notes, recorded_by AS "recordedBy" FROM postop_observations`;

async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
async function lockPatient(client: PoolClient, patientId: number) {
  if (!(await client.query("SELECT id FROM patients WHERE id = $1 FOR UPDATE", [patientId])).rowCount) throw workflowError(404, "Patient not found");
}
async function plan(client: PoolClient, patientId: number, id: number): Promise<SurgeryPlanRecord> {
  const result = await client.query<SurgeryPlanRecord>(`${planSelect} WHERE s.id = $1 AND s.patient_id = $2 FOR UPDATE OF s`, [id, patientId]);
  if (!result.rows[0]) throw workflowError(404, "Surgery plan not found for this patient");
  return result.rows[0];
}
async function activePlan(client: PoolClient, patientId: number, id: number) {
  const surgery = await plan(client, patientId, id);
  if (surgery.status !== "completed" || !surgery.completedAt) throw workflowError(409, "This patient is not in active surgical recovery. Refresh the recovery list.");
  return surgery;
}
async function checkSurgeon(client: PoolClient, surgeonId: number) {
  if (!(await client.query("SELECT id FROM providers WHERE id = $1", [surgeonId])).rowCount) throw workflowError(400, "Select an existing surgeon");
}
async function checkAssignments(client: PoolClient, assignments: SurgeryAssignments, current?: SurgeryTeam) {
  const ids = surgeryCareRoles.map((role) => assignments[role]).filter((id) => id !== null);
  const members = await client.query<CareNetworkMember>(`${memberSelect} WHERE id = ANY($1::integer[]) ORDER BY id FOR SHARE`, [ids]);
  for (const role of surgeryCareRoles) {
    const memberId = assignments[role];
    if (memberId === null) continue;
    const member = members.rows.find((row) => row.id === memberId);
    if (!member || member.role !== role) throw workflowError(400, `Select an existing ${surgeryCareRoleLabels[role]} with the correct role`);
    if (!member.active && current?.[role]?.id !== memberId) throw workflowError(400, `${surgeryCareRoleLabels[role]} is archived. Select an active entry.`);
  }
}

export function createSurgeryStore(pool: Pool): SurgeryWorkflowStore {
  return {
  async listCareNetwork() {
    return (await pool.query<CareNetworkMember>(`${memberSelect} ORDER BY active DESC, role, lower(name), id`)).rows;
  },
  async createCareNetworkMember(details, userId) {
    return (await pool.query<CareNetworkMember>(`INSERT INTO surgery_care_network
      (role, name, affiliation, phone, email, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id, role, name, affiliation, phone, email, active`,
    [details.role, details.name, details.affiliation, details.phone, details.email, userId])).rows[0];
  },
  updateCareNetworkMember: (id, details, userId) => transaction(pool, async (client) => {
    const current = (await client.query<CareNetworkMember>(`${memberSelect} WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!current) throw workflowError(404, "Care-network entry not found");
    if (details.role !== current.role) throw workflowError(409, "An entry's role cannot change. Archive it and add a new entry for the correct role.");
    return (await client.query<CareNetworkMember>(`UPDATE surgery_care_network
      SET name=$2, affiliation=$3, phone=$4, email=$5, active=$6, updated_at=now(), updated_by=$7
      WHERE id=$1 RETURNING id, role, name, affiliation, phone, email, active`,
    [id, details.name, details.affiliation, details.phone, details.email, details.active, userId])).rows[0];
  }),
  async list(patientId) {
    if (!(await pool.query("SELECT id FROM patients WHERE id = $1", [patientId])).rowCount) throw workflowError(404, "Patient not found");
    return (await pool.query<SurgeryPlanRecord>(`${planSelect} WHERE s.patient_id = $1 ORDER BY s.created_at DESC, s.id DESC`, [patientId])).rows;
  },
  create: (patientId, details, userId) => transaction(pool, async (client) => {
    await lockPatient(client, patientId);
    await checkSurgeon(client, details.surgeonId);
    const assignments = details.assignments ?? emptySurgeryAssignments;
    await checkAssignments(client, assignments);
    if ((await client.query("SELECT id FROM surgery_plans WHERE patient_id = $1 AND status IN ('planned','completed')", [patientId])).rowCount) {
      throw workflowError(409, "This patient already has an open surgery plan. Cancel it or discharge recovery before planning another.");
    }
    const now = new Date().toISOString();
    const result = await client.query<{ id: number }>(`INSERT INTO surgery_plans
      (patient_id, procedure_name, planned_date, surgeon_id, notes, created_at, updated_at, created_by, updated_by,
       nursing_home_id, anesthetist_id, pediatrician_id, ot_assistant_id)
      VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$7,$8,$9,$10,$11) RETURNING id`,
    [patientId, details.procedureName, details.plannedDate, details.surgeonId, details.notes, now, userId,
      assignments.nursing_home, assignments.anesthetist, assignments.pediatrician, assignments.ot_assistant]);
    return plan(client, patientId, result.rows[0].id);
  }),
  edit: (patientId, id, details, userId) => transaction(pool, async (client) => {
    await lockPatient(client, patientId);
    const current = await plan(client, patientId, id);
    if (current.status !== "planned") throw workflowError(409, "Only a planned surgery can be edited");
    await checkSurgeon(client, details.surgeonId);
    const assignments = details.assignments ?? {
      nursing_home: current.team.nursing_home?.id ?? null,
      anesthetist: current.team.anesthetist?.id ?? null,
      pediatrician: current.team.pediatrician?.id ?? null,
      ot_assistant: current.team.ot_assistant?.id ?? null,
    };
    await checkAssignments(client, assignments, current.team);
    await client.query(`UPDATE surgery_plans SET procedure_name=$2, planned_date=$3, surgeon_id=$4,
      notes=$5, updated_at=$6, updated_by=$7,
      nursing_home_id=$8, anesthetist_id=$9, pediatrician_id=$10, ot_assistant_id=$11 WHERE id=$1`,
    [id, details.procedureName, details.plannedDate, details.surgeonId, details.notes, new Date().toISOString(), userId,
      assignments.nursing_home, assignments.anesthetist, assignments.pediatrician, assignments.ot_assistant]);
    return plan(client, patientId, id);
  }),
  transition: (patientId, id, input, userId) => transaction(pool, async (client) => {
    await lockPatient(client, patientId);
    const current = await plan(client, patientId, id);
    assertSurgeryTransition(current.status, input.status);
    const now = new Date().toISOString();
    const completedAt = input.status === "completed" ? `${input.completedDate}T00:00:00+05:30` : current.completedAt;
    await client.query(`UPDATE surgery_plans SET status=$2, completed_at=$3, closed_at=$4, updated_at=$5, updated_by=$6 WHERE id=$1`,
      [id, input.status, completedAt, ["cancelled", "discharged"].includes(input.status) ? now : null, now, userId]);
    return plan(client, patientId, id);
  }),
  async recoveryPatients(search) {
    return (await pool.query<RecoveryPatient>(`SELECT p.id, p.name, p.phone, p.age,
      jsonb_build_object('id',s.id,'procedureName',s.procedure_name,'plannedDate',s.planned_date,
        'completedAt',s.completed_at,'surgeonName',surgeon.name) AS surgery
      FROM surgery_plans s JOIN patients p ON p.id=s.patient_id JOIN providers surgeon ON surgeon.id=s.surgeon_id
      WHERE s.status='completed' AND s.completed_at IS NOT NULL
        AND ($1='' OR position(lower($1) in lower(p.name))>0 OR position($1 in coalesce(p.phone,''))>0)
      ORDER BY s.completed_at DESC, s.id DESC LIMIT 20`, [search])).rows;
  },
  observations: (patientId, id) => transaction(pool, async (client) => {
    await activePlan(client, patientId, id);
    return (await client.query(`${observationSelect} WHERE patient_id=$1 AND surgery_plan_id=$2 ORDER BY observed_at DESC, id DESC`, [patientId, id])).rows;
  }),
  recordObservation: (input, userId) => transaction(pool, async (client) => {
    const surgery = await activePlan(client, input.patientId, input.surgeryPlanId);
    if (Date.parse(input.observedAt) < Date.parse(surgery.completedAt!) || Date.parse(input.observedAt) > Date.now() + 60_000) {
      throw workflowError(400, "Observation time must be after surgery completion and not in the future");
    }
    const user = await client.query<{ username: string }>("SELECT username FROM users WHERE id=$1", [userId]);
    if (!user.rows[0]) throw workflowError(404, "Staff account not found");
    const result = await client.query<{ id: number }>(`INSERT INTO postop_observations
      (patient_id,surgery_plan_id,observed_at,pain_score,systolic,diastolic,pulse,nausea,mobility,wound_condition,notes,recorded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [input.patientId, input.surgeryPlanId, input.observedAt, input.painScore, input.systolic, input.diastolic, input.pulse,
      input.nausea, input.mobility, input.woundCondition, input.notes, user.rows[0].username]);
    return (await client.query(`${observationSelect} WHERE id=$1`, [result.rows[0].id])).rows[0];
  }),
  };
}

export async function ensureSurgerySchema(client: Pick<PoolClient, "query">): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS surgery_care_network (
      id serial PRIMARY KEY,
      role text NOT NULL CHECK (role IN ('nursing_home', 'anesthetist', 'pediatrician', 'ot_assistant')),
      name text NOT NULL,
      affiliation text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      email text NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by varchar NOT NULL REFERENCES users(id),
      updated_by varchar NOT NULL REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS surgery_plans (
      id serial PRIMARY KEY,
      patient_id integer NOT NULL REFERENCES patients(id),
      procedure_name text NOT NULL,
      planned_date text NOT NULL,
      surgeon_id integer NOT NULL REFERENCES providers(id),
      notes text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled', 'discharged')),
      completed_at text,
      closed_at text,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      created_by varchar NOT NULL REFERENCES users(id),
      updated_by varchar NOT NULL REFERENCES users(id)
    );
    ALTER TABLE surgery_plans ADD COLUMN IF NOT EXISTS nursing_home_id integer REFERENCES surgery_care_network(id);
    ALTER TABLE surgery_plans ADD COLUMN IF NOT EXISTS anesthetist_id integer REFERENCES surgery_care_network(id);
    ALTER TABLE surgery_plans ADD COLUMN IF NOT EXISTS pediatrician_id integer REFERENCES surgery_care_network(id);
    ALTER TABLE surgery_plans ADD COLUMN IF NOT EXISTS ot_assistant_id integer REFERENCES surgery_care_network(id);
    CREATE UNIQUE INDEX IF NOT EXISTS surgery_plans_open_patient_idx
      ON surgery_plans(patient_id) WHERE status IN ('planned', 'completed');
    ALTER TABLE postop_observations ADD COLUMN IF NOT EXISTS surgery_plan_id integer REFERENCES surgery_plans(id);
    CREATE INDEX IF NOT EXISTS postop_observations_surgery_idx ON postop_observations(surgery_plan_id);
  `);
}
