import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { registerClinicalAccess, type AccessActor } from "./clinical-access";
import {
  registerPrescriptionTranscriptionRoutes, TRANSCRIPTION_SOURCE,
  type MedicationRow, type PatientDocumentRow, type VisitRow,
} from "./prescription-transcriptions";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
const original = (bytes = png, mimeType = "image/png", name = "rx.png") => ({ name, mimeType, fileData: bytes.toString("base64") });
const sha = (bytes: Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");

type State = {
  visits: VisitRow[];
  medications: MedicationRow[];
  documents: PatientDocumentRow[];
  appointments: { id: number; patientId: number; date: string; status: string }[];
  patients: { id: number; lmp: string | null; history: unknown }[];
};

function seed(): State {
  return {
    patients: [{ id: 7, lmp: null, history: { diagnosis: "clinician" } }, { id: 8, lmp: null, history: null }],
    appointments: [{ id: 4, patientId: 7, date: "2026-10-30", status: "scheduled" }, { id: 5, patientId: 8, date: "2026-10-30", status: "scheduled" }],
    documents: [{ id: 900, patientId: 8, fileName: "other.png", fileData: png.toString("base64"), s3Key: null, mimeType: "image/png", docType: "prescription", label: null, uploadedAt: "2026-10-01T00:00:00Z" }],
    medications: [{ id: 50, patientId: 7, name: "Clinician med", status: "active", notes: null }],
    visits: [
      { id: 100, patientId: 7, appointmentId: 4, date: "2026-10-30", diagnosis: "Clinician-confirmed diagnosis", prescriptions: { source: "paper-transcribed", medicines: [{ name: "Clinician med" }] } },
      { id: 101, patientId: 8, appointmentId: null, date: "2026-10-01", prescriptions: { source: TRANSCRIPTION_SOURCE, doctorIssuedPaper: true, medicines: [], medicationIds: [], originalPrescription: { patientDocumentId: 900, name: "other.png", mimeType: "image/png", sizeBytes: png.length, sha256: sha(png) } } },
      { id: 102, patientId: 7, appointmentId: null, date: "2026-10-02", prescriptions: { source: TRANSCRIPTION_SOURCE, medicines: [] } },
    ],
  };
}

async function harness(run: (ctx: {
  request: (path: string, actor?: string, method?: string, body?: unknown) => Promise<Response>;
  state: () => State;
  failNextMedicationCreate: () => void;
  discarded: () => number;
  setState: (mutate: (state: State) => void) => void;
}) => Promise<void>) {
  const actors = new Map<string, AccessActor>([
    ["doctor", { userId: "doctor", role: "clinician" }],
    ["owner", { userId: "owner", role: "owner" }],
    ["reception", { userId: "reception", role: "staff" }],
    ["desk", { userId: "desk", role: "receptionist" }],
    ["admin", { userId: "admin", role: "admin" }],
    ["patient", { patientId: 7 }],
    ["other-patient", { patientId: 8 }],
    ["unknown-role", { userId: "unknown", role: "unknown" }],
  ]);
  let state = seed();
  let nextId = 1000;
  let failMedicationCreate = false;
  let discarded = 0;
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  const authenticate = async (req: express.Request) => actors.get(String(req.headers.authorization || "").replace(/^Bearer /, "")) ?? null;
  registerClinicalAccess(app, { authenticate, appointmentPatientId: async (id) => state.appointments.find((item) => item.id === id)?.patientId ?? null });
  registerPrescriptionTranscriptionRoutes(app, {
    authenticate,
    patientExists: async (id) => state.patients.some((patient) => patient.id === id),
    getAppointment: async (id) => state.appointments.find((item) => item.id === id),
    listVisits: async (patientId) => structuredClone(state.visits.filter((visit) => visit.patientId === patientId)),
    getPatientDocument: async (id) => structuredClone(state.documents.find((doc) => doc.id === id)),
    readStoredFile: async (doc) => doc.fileData ? Buffer.from(doc.fileData, "base64") : null,
    putOriginalFile: async (_patientId, bytes) => ({ fileData: bytes.toString("base64"), s3Key: null }),
    discardOriginalFile: async () => { discarded++; },
    parseCallDate: (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value) ? value : null,
    prescriptionDueDate: (instructions, date) => /after 7 days/i.test(instructions) ? new Date(Date.parse(`${date}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10) : null,
    now: () => new Date("2026-11-01T06:00:00Z"),
    async transaction(work) {
      // Mirrors database rollback semantics: all writes in the callback commit together or not at all.
      const draft = structuredClone(state);
      const result = await work({
        lockVisit: async (id) => structuredClone(draft.visits.find((visit) => visit.id === id)),
        createVisit: async (data) => { const row = { ...data, id: nextId++ } as VisitRow; draft.visits.push(row); return structuredClone(row); },
        updateVisit: async (id, data) => {
          const row = draft.visits.find((visit) => visit.id === id);
          if (!row) return undefined;
          Object.assign(row, data);
          return structuredClone(row);
        },
        getMedications: async (patientId, ids) => structuredClone(draft.medications.filter((med) => med.patientId === patientId && ids.includes(med.id))),
        createMedication: async (data) => {
          if (failMedicationCreate && draft.medications.length > state.medications.length) throw new Error("simulated database failure");
          const row = { ...data, id: nextId++ } as MedicationRow;
          draft.medications.push(row);
          return structuredClone(row);
        },
        updateMedication: async (id, data) => {
          const row = draft.medications.find((med) => med.id === id);
          if (!row) return undefined;
          Object.assign(row, data);
          return structuredClone(row);
        },
        deleteMedication: async (id) => {
          const before = draft.medications.length;
          draft.medications = draft.medications.filter((med) => med.id !== id);
          return draft.medications.length < before;
        },
        createPatientDocument: async (data) => { const row = { ...data, id: nextId++ }; draft.documents.push(row); return structuredClone(row); },
      });
      state = draft;
      return result;
    },
  });
  let clinicalWrites = 0;
  app.use((req, res) => { clinicalWrites++; res.status(201).json({}); });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, actor?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers: { ...(actor ? { Authorization: `Bearer ${actor}` } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    await run({
      request,
      state: () => state,
      failNextMedicationCreate: () => { failMedicationCreate = true; },
      discarded: () => discarded,
      setState: (mutate) => mutate(state),
    });
    assert.equal(clinicalWrites, 0, "no request may fall through to generic clinical handlers");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const path = "/api/patients/7/prescription-transcriptions";
const validBody = (overrides: Record<string, unknown> = {}) => ({
  appointmentId: null,
  prescriptionDate: "2026-10-31",
  chiefComplaint: "Pain abdomen",
  examination: "P/A soft",
  lmp: "", height: "160", weight: "60", age: "28", patientType: "General",
  vitals: { pulse: "80", bp: "110/70", spo2: null, rr: null },
  datingEstimate: null,
  eod: "", pog: "", gravida: "", surgicalHistory: "",
  antenatal: null,
  diagnosis: "Dysmenorrhoea (as written on paper)",
  advice: "Warm compress",
  followUp: "Review after 7 days",
  medicines: [
    { name: "Tab Mefenamic acid", dose: "500 mg", frequency: "SOS", duration: "3 days", instructions: "After food", route: "Oral" },
    { name: "Tab Pantoprazole", dose: "40 mg", frequency: "OD", duration: "3 days", instructions: "Before breakfast", route: "" },
    { name: " ", dose: "", frequency: "", duration: "", instructions: "" },
  ],
  tests: [{ name: "CBC", type: "lab" }],
  scanned: false,
  scanReviewed: true,
  originalPrescription: original(),
  sourceReviewed: true,
  ...overrides,
});

test("transcription endpoints require staff/clinician/owner authentication and never relax clinician-only routes", async () => {
  await harness(async ({ request, state }) => {
    for (const method of ["GET", "POST"]) {
      const body = method === "POST" ? validBody() : undefined;
      assert.equal((await request(path, undefined, method, body)).status, 401);
      assert.equal((await request(path, "forged-token", method, body)).status, 401);
      for (const actor of ["patient", "other-patient", "admin", "unknown-role"]) {
        assert.equal((await request(path, actor, method, body)).status, 403, `${actor} ${method}`);
      }
    }
    assert.equal(state().visits.length, 3);
    assert.equal(state().medications.length, 1);
    for (const actor of ["reception", "desk"]) {
      for (const [clinicalPath, method] of [["/api/patients/7/manual-prescription", "POST"], ["/api/patients/7/visit-history", "GET"], ["/api/patients/7/medications", "POST"], ["/api/visit-history/100", "PATCH"], ["/api/patients/7/documents", "POST"], ["/api/ocr/prescription", "POST"]]) {
        assert.equal((await request(clinicalPath, actor, method, method === "GET" ? undefined : validBody())).status, 403, `${actor} ${clinicalPath}`);
      }
    }
    for (const bad of ["/api/patients/7abc/prescription-transcriptions", "/api/patients/0/prescription-transcriptions", "/api/patients/-7/prescription-transcriptions"]) {
      assert.equal((await request(bad, "reception")).status, 400, bad);
    }
    assert.equal((await request("/api/patients/99/prescription-transcriptions", "reception")).status, 404);
    for (const actor of ["reception", "desk", "doctor", "owner"]) assert.equal((await request(path, actor)).status, 200, actor);
  });
});

test("GET returns only this patient's doctor-issued paper transcriptions with retained original evidence", async () => {
  await harness(async ({ request }) => {
    assert.deepEqual(await (await request(path, "reception")).json(), []);
    const created = await request(path, "reception", "POST", validBody());
    assert.equal(created.status, 201);
    const list = await (await request(path, "reception")).json() as any[];
    assert.equal(list.length, 1, "clinician encounters, forged sources and other patients' records are excluded");
    const [record] = list;
    assert.equal(record.patientId, 7);
    assert.equal(record.appointmentId, null);
    assert.equal(record.date, "2026-10-31");
    assert.equal(record.chiefComplaint, "Pain abdomen");
    assert.deepEqual(record.examination, { findings: "P/A soft" });
    assert.equal(record.objective, "P/A soft");
    assert.equal(record.vitals.bp, "110/70");
    assert.equal(record.vitals.followUpDate, "2026-11-07");
    assert.equal(record.diagnosis, "Dysmenorrhoea (as written on paper)");
    assert.equal(record.planNotes, "Warm compress");
    assert.equal(record.followUpPlan, "Review after 7 days");
    assert.deepEqual(record.labsOrdered, [{ name: "CBC", type: "lab" }]);
    assert.equal(record.prescriptions.source, TRANSCRIPTION_SOURCE);
    assert.equal(record.prescriptions.doctorIssuedPaper, true);
    assert.equal(record.prescriptions.medicines.length, 2);
    assert.deepEqual(record.prescriptions.originalPrescription.fileData, png.toString("base64"));
    assert.equal(record.prescriptions.originalPrescription.mimeType, "image/png");
    assert.equal(record.prescriptions.originalPrescription.sha256, sha(png));
    assert.equal(record.prescriptions.originalAvailable, true);
    assert.equal(record.prescriptions.revisionCount, 0);
    assert.equal("revisions" in record.prescriptions, false);
    assert.equal("medicationIds" in record.prescriptions, false);
    const other = await (await request("/api/patients/8/prescription-transcriptions", "reception")).json() as any[];
    assert.deepEqual(other.map((item) => item.id), [101]);
  });
});

test("POST saves an immediately active doctor-issued transcription atomically without touching clinician data", async () => {
  await harness(async ({ request, state }) => {
    const before = structuredClone(state());
    const response = await request(path, "reception", "POST", validBody({ appointmentId: 4 }));
    assert.equal(response.status, 201);
    const body = await response.json() as any;
    assert.equal(body.created, true);
    assert.equal(body.visit.appointmentId, 4);
    assert.equal(body.visit.prescriptions.originalPrescription.fileData, png.toString("base64"));
    const visit = state().visits.find((item) => item.id === body.visit.id)!;
    assert.equal(visit.appointmentId, null, "never attaches to the appointment row used by clinician manual-prescription matching");
    const rx = visit.prescriptions as any;
    assert.equal(rx.source, TRANSCRIPTION_SOURCE);
    assert.equal(rx.doctorIssuedPaper, true);
    assert.equal(rx.sourceReviewed, true);
    assert.equal(rx.transcriptionId, visit.id);
    assert.equal(rx.linkedAppointmentId, 4);
    assert.deepEqual(rx.enteredBy, { userId: "reception", role: "staff" });
    assert.deepEqual(rx.updatedBy, { userId: "reception", role: "staff" });
    assert.equal(rx.enteredAt, "2026-11-01T06:00:00.000Z");
    const doc = state().documents.find((item) => item.id === rx.originalPrescription.patientDocumentId)!;
    assert.equal(doc.patientId, 7);
    assert.equal(doc.fileData, png.toString("base64"));
    assert.equal(rx.originalPrescription.sha256, sha(png));
    assert.deepEqual(rx.originalPrescription.uploadedBy, { userId: "reception", role: "staff" });
    const meds = state().medications.filter((med) => rx.medicationIds.includes(med.id));
    assert.deepEqual(meds.map((med) => [med.name, med.status, med.startDate, med.patientId]), [
      ["Tab Mefenamic acid", "active", "2026-10-31", 7], ["Tab Pantoprazole", "active", "2026-10-31", 7],
    ]);
    assert.match(String(meds[0].notes), new RegExp(`transcription #${visit.id}`));
    assert.deepEqual(body.medications.map((med: MedicationRow) => med.id), rx.medicationIds);
    assert.deepEqual(state().visits.find((item) => item.id === 100), before.visits.find((item) => item.id === 100));
    assert.deepEqual(state().medications.find((item) => item.id === 50), before.medications[0]);
    assert.deepEqual(state().appointments, before.appointments);
    assert.deepEqual(state().patients, before.patients);
    for (const actor of ["desk", "doctor", "owner"]) assert.equal((await request(path, actor, "POST", validBody())).status, 201, actor);
  });
});

test("POST rejects missing, unreviewed, mislabeled, referenced or malformed sources and fields", async () => {
  await harness(async ({ request, state }) => {
    const cases: [Record<string, unknown>, number][] = [
      [{ originalPrescription: undefined }, 422],
      [{ originalPrescription: null }, 422],
      [{ sourceReviewed: false }, 422],
      [{ sourceReviewed: "true" }, 422],
      [{ originalPrescription: original(Buffer.from("not really a pdf"), "application/pdf", "rx.pdf") }, 400],
      [{ originalPrescription: original(png, "image/jpeg", "rx.jpg") }, 400],
      [{ originalPrescription: original(png, "image/svg+xml", "rx.svg") }, 400],
      [{ originalPrescription: original(png, "text/html", "rx.html") }, 400],
      [{ originalPrescription: { name: "rx.png", mimeType: "image/png", fileData: "https://example.invalid/rx.png" } }, 400],
      [{ originalPrescription: { ...original(), url: "https://example.invalid/rx.png" } }, 400],
      [{ originalPrescription: { ...original(), patientDocumentId: 900 } }, 400],
      [{ originalPrescription: { name: "rx.png", mimeType: "image/png", fileData: "" } }, 400],
      [{ originalPrescription: { name: "rx.png", mimeType: "image/png", fileData: "%%%%" } }, 400],
      [{ originalPrescription: original(Buffer.concat([pdf, Buffer.alloc(8 * 1024 * 1024)]), "application/pdf", "big.pdf") }, 400],
      [{ originalPrescription: "rx.png" }, 400],
      [{ patientId: 8 }, 400],
      [{ source: "clinician" }, 400],
      [{ medicines: "Tab X" }, 400],
      [{ medicines: [{ name: { text: "x" } }] }, 400],
      [{ medicines: Array.from({ length: 51 }, () => ({ name: "Tab" })) }, 400],
      [{ tests: [{ name: "CBC", type: "xray" }] }, 400],
      [{ vitals: { pulse: "80", temperature: "99" } }, 400],
      [{ vitals: "80" }, 400],
      [{ diagnosis: ["ICD"] }, 400],
      [{ prescriptionDate: "2026-11-02" }, 400],
      [{ prescriptionDate: "31/10/2026" }, 400],
      [{ prescriptionDate: "2026-02-30" }, 400],
      [{ prescriptionDate: undefined }, 400],
      [{ followUpDate: "2026-10-01" }, 400],
      [{ weight: "heavy" }, 400],
      [{ antenatal: { bp: { value: "1" } } }, 400],
      [{ datingEstimate: "x" }, 400],
      [{ scanned: "yes" }, 400],
      [{ transcriptionId: "abc" }, 400],
      [{ transcriptionId: -1 }, 400],
      [{ appointmentId: 5 }, 404],
      [{ appointmentId: 999 }, 404],
    ];
    for (const [overrides, status] of cases) {
      const response = await request(path, "reception", "POST", validBody(overrides));
      assert.equal(response.status, status, JSON.stringify(overrides).slice(0, 120));
    }
    assert.equal(state().visits.length, 3);
    assert.equal(state().medications.length, 1);
    assert.equal(state().documents.length, 1);
    for (const [bytes, mimeType] of [[jpeg, "image/jpeg"], [pdf, "application/pdf"], [Buffer.from("RIFF\x10\x00\x00\x00WEBPVP8 ", "latin1"), "image/webp"]] as const) {
      assert.equal((await request(path, "reception", "POST", validBody({ originalPrescription: original(bytes, mimeType, "rx") }))).status, 201, mimeType);
    }
    assert.equal((await request(path, "reception", "POST", validBody({ appointmentId: null, prescriptionDate: undefined, originalPrescription: { ...original(), fileData: `data:image/png;base64,${png.toString("base64")}` } }))).status, 400);
    assert.equal((await request(path, "reception", "POST", validBody({ appointmentId: 4, prescriptionDate: undefined }))).status, 201, "appointment date fallback");
  });
});

test("edits correct the same transcription, synchronize only linked medications and preserve prior evidence", async () => {
  await harness(async ({ request, state }) => {
    const created = await (await request(path, "reception", "POST", validBody())).json() as any;
    const id = created.visit.id;
    const firstRx = state().visits.find((visit) => visit.id === id)!.prescriptions as any;
    const [mefenamicId, pantoprazoleId] = firstRx.medicationIds;
    const firstDocId = firstRx.originalPrescription.patientDocumentId;

    // Retained original: the editor may resend the original returned by GET or send null.
    const retained = await request(path, "desk", "POST", validBody({
      transcriptionId: id, originalPrescription: created.visit.prescriptions.originalPrescription,
      diagnosis: "Corrected diagnosis text", chiefComplaint: "Corrected complaint",
      medicines: [{ name: "Tab Mefenamic acid", dose: "250 mg", frequency: "BD", duration: "5 days", instructions: "After food", route: "Oral" }, { name: "Tab Drotaverine", dose: "40 mg", frequency: "SOS", duration: "", instructions: "", route: "" }],
    }));
    assert.equal(retained.status, 200);
    const retainedBody = await retained.json() as any;
    assert.equal(retainedBody.created, false);
    assert.equal(retainedBody.visit.id, id);
    let rx = state().visits.find((visit) => visit.id === id)!.prescriptions as any;
    assert.equal(rx.originalPrescription.patientDocumentId, firstDocId, "identical original is retained, not duplicated");
    assert.equal(state().documents.filter((doc) => doc.patientId === 7).length, 1);
    assert.equal(rx.medicationIds[0], mefenamicId, "edited medicine is updated in place");
    assert.notEqual(rx.medicationIds[1], pantoprazoleId);
    assert.equal(state().medications.some((med) => med.id === pantoprazoleId), false, "obsolete transcription medicine is removed");
    assert.deepEqual(state().medications.filter((med) => med.patientId === 7).map((med) => med.name).sort(), ["Clinician med", "Tab Drotaverine", "Tab Mefenamic acid"]);
    assert.equal(state().medications.find((med) => med.id === mefenamicId)!.dose, "250 mg");
    assert.deepEqual(rx.enteredBy, { userId: "reception", role: "staff" });
    assert.deepEqual(rx.updatedBy, { userId: "desk", role: "receptionist" });
    assert.equal(rx.revisions.length, 1);
    assert.equal(rx.revisions[0].previous.diagnosis, "Dysmenorrhoea (as written on paper)");
    assert.equal(rx.revisions[0].previous.prescriptions.medicines[1].name, "Tab Pantoprazole");
    assert.equal(rx.revisions[0].previous.prescriptions.originalPrescription.patientDocumentId, firstDocId);
    assert.deepEqual(rx.revisions[0].revisedBy, { userId: "desk", role: "receptionist" });

    // Null original keeps the validated retained source; a different original replaces it but keeps the prior file.
    assert.equal((await request(path, "reception", "POST", validBody({ transcriptionId: id, originalPrescription: null, medicines: [] }))).status, 200);
    rx = state().visits.find((visit) => visit.id === id)!.prescriptions as any;
    assert.deepEqual(rx.medicationIds, []);
    assert.deepEqual(state().medications.filter((med) => med.patientId === 7).map((med) => med.name), ["Clinician med"]);
    const replaced = await request(path, "reception", "POST", validBody({ transcriptionId: id, originalPrescription: original(pdf, "application/pdf", "rescan.pdf") }));
    assert.equal(replaced.status, 200);
    rx = state().visits.find((visit) => visit.id === id)!.prescriptions as any;
    assert.notEqual(rx.originalPrescription.patientDocumentId, firstDocId);
    assert.ok(state().documents.some((doc) => doc.id === firstDocId), "previous original evidence is never deleted");
    assert.equal(rx.revisions.length, 3);
    assert.equal(rx.revisions[2].previous.prescriptions.originalPrescription.patientDocumentId, firstDocId);
    assert.equal(rx.medicationIds.length, 2);
    const list = await (await request(path, "reception")).json() as any[];
    assert.equal(list.length, 1, "edits never create duplicate records");
    assert.equal(list[0].prescriptions.originalPrescription.mimeType, "application/pdf");
    assert.equal(list[0].prescriptions.revisionCount, 3);
  });
});

test("edits enforce patient/source ownership and require valid retained evidence", async () => {
  await harness(async ({ request, state, setState }) => {
    for (const transcriptionId of [100, 101, 102, 9999]) {
      assert.equal((await request(path, "reception", "POST", validBody({ transcriptionId, originalPrescription: null }))).status, 404, String(transcriptionId));
      assert.equal((await request(path, "reception", "POST", validBody({ transcriptionId }))).status, 404, String(transcriptionId));
    }
    assert.equal((await request("/api/patients/8/prescription-transcriptions", "reception", "POST", validBody({ transcriptionId: 101, originalPrescription: null }))).status, 200);
    assert.equal(state().visits.find((visit) => visit.id === 100)!.diagnosis, "Clinician-confirmed diagnosis");

    const created = await (await request(path, "reception", "POST", validBody())).json() as any;
    const rx = state().visits.find((visit) => visit.id === created.visit.id)!.prescriptions as any;
    setState((current) => { current.documents.find((doc) => doc.id === rx.originalPrescription.patientDocumentId)!.fileData = pdf.toString("base64"); });
    assert.equal((await request(path, "reception", "POST", validBody({ transcriptionId: created.visit.id, originalPrescription: null }))).status, 409, "tampered original fails integrity check");
    const listed = await (await request(path, "reception")).json() as any[];
    assert.equal(listed[0].prescriptions.originalPrescription, null);
    assert.equal(listed[0].prescriptions.originalAvailable, false);
    assert.equal((await request(path, "reception", "POST", validBody({ transcriptionId: created.visit.id, originalPrescription: original() }))).status, 200, "reattaching the original repairs evidence");
    // A medication ID that was reassigned to another patient is never modified through the transcription link.
    const repaired = state().visits.find((visit) => visit.id === created.visit.id)!.prescriptions as any;
    setState((current) => { current.medications.find((med) => med.id === repaired.medicationIds[0])!.patientId = 8; });
    assert.equal((await request(path, "reception", "POST", validBody({ transcriptionId: created.visit.id, originalPrescription: null, medicines: [] }))).status, 200);
    assert.ok(state().medications.some((med) => med.id === repaired.medicationIds[0] && med.patientId === 8));
  });
});

test("failed saves roll back the visit, medications and source document together", async () => {
  await harness(async ({ request, state, failNextMedicationCreate, discarded }) => {
    const before = structuredClone(state());
    failNextMedicationCreate();
    const response = await request(path, "reception", "POST", validBody());
    assert.equal(response.status, 500);
    assert.match((await response.json() as { error: string }).error, /No changes were saved/);
    assert.deepEqual(state(), before);
    assert.equal(discarded(), 1, "staged original upload is discarded");
  });
});

test("exact PrescriptionEntryDialog pregnant payload is accepted, normalized by the shared antenatal normalizer and editable", async () => {
  await harness(async ({ request, state }) => {
    const antenatal = {
      bloodGroup: "B+", hb: "11.2", hbDate: "2026-10-20", urineRe: "NAD", urineReDate: null,
      usg: [
        { scanDate: "2026-10-15", finding: "Single live intrauterine fetus", weeks: "20w 3d", placenta: "Posterior", liquor: "Adequate", efw: "350 g", anomaly: null },
        { scanDate: null, finding: null, weeks: null, placenta: null, liquor: null, efw: null, anomaly: null },
      ],
      slf: null, pulse: "84", bp: "110/70", spo2: "98", rr: null, perAbdomen: "Soft", uterusSize: "22 weeks",
      uterusSizeDate: "2026-10-31", fetalMovements: "Present", fetalHeartSound: "142", fetalHeartDoppler: null, scarTenderness: null,
    };
    const datingEstimate = { estimatedLmp: "2026-05-27", dueDate: "2027-03-03", pog: "22w 3d", source: "scan", sourceDate: "2026-10-15" };
    const payload = {
      appointmentId: null, prescriptionDate: "2026-10-31", chiefComplaint: "ANC visit", examination: "",
      lmp: "", height: "158", weight: "62.5", age: "29", patientType: "Pregnant",
      vitals: { pulse: "84", bp: "110/70", spo2: "98", rr: null }, datingEstimate,
      eod: "2027-03-03", pog: "22w 3d", gravida: "G2P1L1", surgicalHistory: "", antenatal,
      diagnosis: "", advice: "", followUp: "", followUpDate: "",
      medicines: [{ name: "Tab Iron", dose: "100 mg", frequency: "OD", duration: "30 days", instructions: "", route: "" }],
      tests: [], scanned: false, scanReviewed: true, transcriptionId: undefined,
      originalPrescription: { ...original(jpeg, "image/jpeg", "paper.jpg"), provider: "manual-transcription", sourcePages: [] },
      sourceReviewed: true,
    };
    const created = await request(path, "reception", "POST", payload);
    assert.equal(created.status, 201, await created.clone().text());
    const { visit } = await created.json() as any;
    assert.equal(visit.vitals.patientType, "Pregnant");
    assert.equal(visit.vitals.eod, "2027-03-03");
    assert.equal(visit.vitals.pog, "22w 3d");
    assert.equal(visit.vitals.gravida, "G2P1L1");
    assert.equal(visit.vitals.surgicalHistory, null);
    assert.equal(visit.vitals.lmp, null);
    assert.equal(visit.vitals.weight, 62.5);
    assert.equal(visit.vitals.followUpDate, null);
    assert.deepEqual(visit.vitals.datingEstimate, datingEstimate);
    assert.deepEqual(visit.vitals.antenatal.usg, [antenatal.usg[0]], "empty scan rows dropped by the shared normalizer");
    assert.equal(visit.vitals.antenatal.fetalHeartSound, "142");
    assert.equal(visit.examination, null);
    assert.equal(visit.diagnosis, null);

    // Editor reloads via GET and resends the server's full original metadata object unchanged.
    const [listed] = await (await request(path, "desk")).json() as any[];
    assert.equal(listed.prescriptions.originalPrescription.fileData, jpeg.toString("base64"));
    const edited = await request(path, "desk", "POST", {
      ...payload, transcriptionId: listed.id, originalPrescription: listed.prescriptions.originalPrescription,
      antenatal: { ...antenatal, usg: [{ ...antenatal.usg[0], weeks: "20w 4d" }] },
    });
    assert.equal(edited.status, 200, await edited.clone().text());
    const rx = state().visits.find((item) => item.id === listed.id)!.prescriptions as any;
    assert.equal(state().documents.filter((doc) => doc.patientId === 7).length, 1, "resent original is retained, not duplicated");
    assert.equal(rx.revisions.length, 1);
    assert.equal(rx.revisions[0].previous.vitals.antenatal.usg[0].weeks, "20w 3d");
    assert.equal((state().visits.find((item) => item.id === listed.id)!.vitals as any).antenatal.usg[0].weeks, "20w 4d");
    assert.equal(rx.medicationIds.length, 1);
    assert.equal(state().medications.filter((med) => med.patientId === 7 && med.name === "Tab Iron").length, 1);
  });
});
