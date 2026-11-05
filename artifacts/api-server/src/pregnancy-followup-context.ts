import type { Express, Request, Response } from "express";
import type { Pool } from "pg";
import type { AccessActor } from "./clinical-access";
import type { PregnancyEpisode } from "../../../lib/db/src/pregnancy-episodes";
import { summaryRecord as object, summaryTrends, type SummaryLab } from "../../../lib/db/src/patient-summary";
import { pregnancyFollowUpSchema, followUpRows, type PregnancyVisitContext } from "../../../lib/db/src/pregnancy-followup";
import { createPregnancyEpisodeStore } from "./pregnancy-episode-store";

type Row = Record<string, unknown>;
const date = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : null;
};
const cancelled = (row: Row) => /^(cancelled|canceled|no[-_ ]?show)$/i.test(String(row.status || ""));
const prenatal = (row: Row) => /\b(pregnant|pregnancy|antenatal|anc|obstetric)\b/i.test(`${row.type || ""} ${row.visitType || ""}`)
  && !/\b(postpartum|postnatal|non[- ]?pregnant|not pregnant|mtp|termination|miscarriage)\b/i.test(`${row.type || ""} ${row.visitType || ""}`);
const linked = (episode: PregnancyEpisode, kind: string, id: unknown) =>
  id != null && episode.records.some((link) => link.kind === kind && String(link.id) === String(id));
const timeOf = (value: unknown) => {
  const parts = typeof value === "string" ? value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/) : null;
  return parts && Number(parts[1]) < 24 && Number(parts[2]) < 60 && Number(parts[3] || 0) < 60
    ? Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3] || 0) : null;
};

export function pregnancyVisitContext(patient: Row, appointment: Row, appointments: Row[], visits: Row[], labs: Row[],
  episodes: PregnancyEpisode[], bpLogs: Row[] = [], weightLogs: Row[] = []): PregnancyVisitContext {
  const asOf = String(appointment.date);
  const history = object(patient.history);
  const own = (row: Row) => row.patientId === patient.id;
  appointments = appointments.filter(own); visits = visits.filter(own); labs = labs.filter(own);
  const explicit = episodes.find((episode) => linked(episode, "appointment", appointment.id)
    || visits.some((visit) => visit.appointmentId === appointment.id && linked(episode, "visit", visit.id)));
  const current = episodes.find((episode) => episode.details.status === "current");
  const intake = object(history.onboarding);
  const profilePregnant = !/^(completed|aborted|not_continuing)$/i.test(String(patient.pregnancyStatus || ""))
    && object(intake.pregnancies).currentStatus !== "No"
    && (prenatal(patient) || /^(pregnant|active)$/i.test(String(patient.pregnancyStatus || "")) || object(intake.pregnancies).currentStatus === "Yes");
  const appointmentLmp = date(object(appointment.vitals).lmp);
  const episode = explicit || (profilePregnant && current && (!appointmentLmp || !current.details.lmp || appointmentLmp === current.details.lmp) ? current : undefined);
  const dueDateStart = episode?.details.dueDate ? new Date(Date.parse(episode.details.dueDate) - 280 * 86400000).toISOString().slice(0, 10) : null;
  const start = episode?.details.lmp || episode?.details.startDate || dueDateStart || (!episodes.length && profilePregnant
    ? date(patient.lmp) || date(object(intake.cycle).lastPeriod) || date(object(history.pregnancyDatingEstimate).estimatedLmp) : null);
  const end = episode?.details.endDate || (start ? new Date(Date.parse(start) + 308 * 86400000).toISOString().slice(0, 10) : null);
  const inWindow = (row: Row) => !!date(row.date) && String(row.date) <= asOf && (!start || String(row.date) >= start) && (!end || String(row.date) <= end);
  const claimedElsewhere = (kind: string, id: unknown) => episodes.some((other) => other.id !== episode?.id && linked(other, kind, id));
  const overlapping = (row: Row) => episodes.some((other) => other.id !== episode?.id
    && (other.details.lmp || other.details.startDate) && other.details.endDate
    && String(row.date) >= String(other.details.lmp || other.details.startDate) && String(row.date) <= other.details.endDate!);
  const appointmentTime = timeOf(appointment.time);
  const notLater = (row: Row) => String(row.date) < asOf || row.id === appointment.id
    || row.date === asOf && timeOf(row.time) !== null && appointmentTime !== null && timeOf(row.time)! <= appointmentTime;
  const conflictingLmp = (row: Row) => !!start && !!date(object(row.vitals).lmp) && date(object(row.vitals).lmp) !== start;
  const matches = (row: Row, kind: "appointment" | "visit") => {
    if (!inWindow(row) || claimedElsewhere(kind, row.id)) return false;
    if (episode && linked(episode, kind, row.id)) return true;
    if (kind === "visit" && episode && linked(episode, "appointment", row.appointmentId)) return true;
    if (kind === "appointment" && visits.some((visit) => visit.appointmentId === row.id && conflictingLmp(visit))) return false;
    return !!start && !overlapping(row) && !conflictingLmp(row);
  };
  const pregnancy = !!explicit || !!start && matches(appointment, "appointment") && (profilePregnant || prenatal(appointment));
  const selectedAppointments = pregnancy ? appointments.filter((row) => !cancelled(row) && notLater(row) && (matches(row, "appointment") || row.id === appointment.id)) : [];
  const selectedIds = new Set(selectedAppointments.map((row) => row.id));
  const selectedVisits = pregnancy ? visits.filter((row) => inWindow(row) && !claimedElsewhere("visit", row.id)
    && !claimedElsewhere("appointment", row.appointmentId ?? object(row.prescriptions).linkedAppointmentId)
    && (!row.appointmentId || selectedIds.has(row.appointmentId))
    && (matches(row, "visit") || !conflictingLmp(row) && (selectedIds.has(row.appointmentId)
      || selectedIds.has(object(row.prescriptions).linkedAppointmentId)))) : [];
  const points = [
    ...selectedAppointments.map((row) => ({ id: Number(row.id), date: String(row.date), vitals: row.vitals, source: "Appointment" })),
    ...selectedVisits.map((row) => ({ id: Number(row.id), date: String(row.date), vitals: row.vitals, source: "Consultation" })),
  ];
  const selectedLabs: SummaryLab[] = pregnancy ? labs.filter((row) => inWindow(row) && !claimedElsewhere("lab", row.id)
    && (episode && linked(episode, "lab", row.id) || start && !overlapping(row))).map((row) => ({
    testName: String(row.testName), date: String(row.date), value: typeof row.value === "number" ? row.value : null,
    unit: typeof row.unit === "string" ? row.unit : null,
  })) : [];
  // Standalone patient logs have no episode IDs; include only dates within established dating.
  const logs = (rows: Row[]) => pregnancy && start ? rows.filter((row) => own(row) && inWindow(row) && !overlapping(row)) : [];
  const trends = summaryTrends(points,
    logs(bpLogs).map((row) => ({ date: String(row.date), systolic: Number(row.systolic), diastolic: Number(row.diastolic) })),
    logs(weightLogs).map((row) => ({ date: String(row.date), weight: Number(row.weight), unit: String(row.unit || "kg") })), selectedLabs);
  trends.hb = trends.hb.filter((point) => inWindow(point));
  const previousAppointmentCount = selectedAppointments.filter((row) => row.id !== appointment.id &&
    (String(row.date) < asOf || row.date === asOf && timeOf(row.time) !== null && appointmentTime !== null
      && timeOf(row.time)! < appointmentTime)).length;
  const savedEntry = object(object(history.pregnancyFollowUps)[String(appointment.id)]);
  const saved = pregnancyFollowUpSchema.safeParse(savedEntry.answers);
  if (Object.keys(savedEntry).length && !saved.success) throw new Error("The saved pregnancy follow-up is invalid. Ask the clinic to review this record.");
  return { pregnancy, repeat: pregnancy && previousAppointmentCount > 0 && !cancelled(appointment), episodeId: episode?.id || null,
    label: episode ? `Pregnancy ${episode.details.number}` : pregnancy ? "Current pregnancy · recorded dating" : "No pregnancy context established",
    asOf, previousAppointmentCount, trends: { bp: trends.bp, weight: trends.weight, hb: trends.hb, sugar: trends.sugar },
    answers: saved.success ? saved.data : null };
}

export function createPregnancyFollowUpStore(pool: Pool) {
  return {
    async surveyStatuses(appointmentIds: number[]) {
      return (await pool.query<{ id: number; completed: boolean }>(
        `SELECT a.id, coalesce(p.history->>'onboardingAppointmentId' = a.id::text, false)
          OR coalesce(jsonb_typeof(p.history->'pregnancyFollowUps'->a.id::text->'answers') = 'object',false) AS completed
         FROM appointments a LEFT JOIN patients p ON p.id=a.patient_id WHERE a.id=ANY($1::int[])`,
        [appointmentIds])).rows;
    },
    async context(patient: Row, appointment: Row) {
      const patientId = Number(patient.id);
      const [appointments, visits, labs, episodes, bp, weight] = await Promise.all([
        pool.query<Row>('SELECT id,patient_id AS "patientId",date::text,time,type,visit_type AS "visitType",status,vitals FROM appointments WHERE patient_id=$1', [patientId]),
        pool.query<Row>('SELECT id,patient_id AS "patientId",appointment_id AS "appointmentId",date::text,visit_type AS "visitType",vitals,prescriptions FROM visit_history WHERE patient_id=$1', [patientId]),
        pool.query<Row>('SELECT id,patient_id AS "patientId",test_name AS "testName",date::text,value,unit FROM lab_results WHERE patient_id=$1', [patientId]),
        createPregnancyEpisodeStore(pool).list(patientId),
        pool.query<Row>('SELECT patient_id AS "patientId",date::text,systolic,diastolic FROM bp_logs WHERE patient_id=$1', [patientId]),
        pool.query<Row>('SELECT patient_id AS "patientId",date::text,weight,unit FROM weight_logs WHERE patient_id=$1', [patientId]),
      ]);
      return pregnancyVisitContext(patient, appointment, appointments.rows, visits.rows, labs.rows, episodes, bp.rows, weight.rows);
    },
    async save(patientId: number, appointmentId: number, answers: unknown, context: PregnancyVisitContext) {
      const parsed = pregnancyFollowUpSchema.parse(answers);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`UPDATE patients SET history=jsonb_set(coalesce(history,'{}'::jsonb),'{pregnancyFollowUps}',
        coalesce(history->'pregnancyFollowUps','{}'::jsonb) || jsonb_build_object($2::text,$3::jsonb)) WHERE id=$1`,
        [patientId, String(appointmentId), JSON.stringify({ answers: parsed, episodeId: context.episodeId, pregnancyLabel: context.label, asOf: context.asOf, submittedAt: new Date().toISOString() })]);
        const updated = await client.query(`UPDATE appointments SET chief_complaint=$2 WHERE id=$1 AND patient_id=$3 RETURNING id`,
        [appointmentId, followUpRows(parsed).map(([label, value]) => `${label}: ${value}`).join("\n"), patientId]);
        if (updated.rowCount !== 1) throw new Error("The appointment's patient changed. Reload your private link.");
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    },
  };
}

export function registerPregnancyFollowUpContext(app: Express, deps: {
  store: Pick<ReturnType<typeof createPregnancyFollowUpStore>, "context">;
  authenticate: (req: Request, res: Response) => Promise<AccessActor | null>;
  clinicalVisible: () => Promise<boolean>;
  patient: (id: number) => Promise<Row | undefined>;
  appointment: (id: number) => Promise<Row | undefined>;
}) {
  app.get("/api/patients/:id/pregnancy-follow-up/:appointmentId", async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      const actor = await deps.authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
      if (!("role" in actor) || !(["clinician", "owner"].includes(actor.role)
        || ["staff", "receptionist"].includes(actor.role) && await deps.clinicalVisible())) {
        res.status(403).json({ error: "Clinical viewing permission required" }); return;
      }
      const id = Number(req.params.id), appointmentId = Number(req.params.appointmentId);
      if (![id, appointmentId].every((value) => Number.isSafeInteger(value) && value > 0 && value <= 2147483647)) {
        res.status(400).json({ error: "Invalid patient or appointment ID" }); return;
      }
      const [patient, appointment] = await Promise.all([deps.patient(id), deps.appointment(appointmentId)]);
      if (!patient || !appointment || appointment.patientId !== id) { res.status(404).json({ error: "Patient appointment not found" }); return; }
      res.json(await deps.store.context(patient, appointment));
    } catch (error) { next(error); }
  });
}
