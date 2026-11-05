import assert from "node:assert/strict";
import test from "node:test";
import { detectPregnancies } from "./pregnancy-detection";

const patient = {
  lmp: "2026-08-10",
  pregnancyStatus: "pregnant",
  history: {
    onboardingAppointmentId: 3,
    onboarding: { pregnancies: { total: 2, currentStatus: "Yes" } },
  },
};
const appointments = [
  { id: 1, date: "2024-08-01", type: "Pregnant", status: "Completed" },
  { id: 2, date: "2025-01-01", type: "Antenatal", status: "Completed" },
  { id: 3, date: "2026-10-01", type: "Consultation", status: "Completed" },
  { id: 4, date: "2026-11-01", type: "Pregnancy", status: "scheduled" },
  { id: 5, date: "2026-11-01", type: "Consultation", status: "scheduled" },
  { id: 6, date: "2026-11-01", type: "Pregnancy", status: "cancelled" },
  {
    id: 7,
    date: "2026-11-01",
    type: "Pregnancy",
    status: "scheduled",
    vitals: { lmp: "2026-06-01" },
  },
  { id: 8, date: "2027-12-01", type: "Pregnant", status: "scheduled" },
  { id: 9, date: "2026-11-01", type: "USG", status: "scheduled" },
];
test("recorded two pregnancies establish current and past, leaving outcome and old dates unknown", () => {
  const result = detectPregnancies(patient, appointments, [], "2026-11-02");
  assert.equal(result.drafts.length, 2);
  assert.equal(result.drafts[0].details.status, "past");
  assert.equal(result.drafts[0].details.lmp, null);
  assert.equal(result.drafts[0].details.endDate, null);
  assert.equal(result.drafts[0].details.outcome, "Not recorded");
  assert.equal(result.drafts[1].details.status, "current");
  assert.equal(result.drafts[1].details.lmp, "2026-08-10");
  assert.deepEqual(result.drafts[0].records, [
    { kind: "appointment", id: 1 },
    { kind: "appointment", id: 2 },
  ]);
  assert.deepEqual(result.drafts[1].records, [
    { kind: "appointment", id: 3 },
    { kind: "appointment", id: 4 },
  ]);
  assert.match(result.drafts[1].details.notes, /Automatically established/);
});
test("unknown counts/status, contradictory intake, and future LMP require review", () => {
  for (const value of [
    { ...patient, history: {} },
    {
      ...patient,
      history: { onboarding: { pregnancies: { total: "2 pregnancies" } } },
    },
    { ...patient, pregnancyStatus: "completed" },
    { ...patient, lmp: "2027-01-01" },
    { history: { onboarding: { pregnancies: { total: 2 } } } },
    {
      ...patient,
      history: {
        onboarding: { pregnancies: { total: 2, currentStatus: "No" } },
      },
    },
  ])
    assert.equal(
      detectPregnancies(value, [], [], "2026-11-02").drafts.length,
      0,
    );
});
test("ambiguous legacy LMP is not parsed; multiple earlier episodes are not grouped by dates", () => {
  const ambiguous = detectPregnancies(
    { ...patient, lmp: "8/10/2026" },
    appointments,
    [],
    "2026-11-02",
  );
  assert.equal(ambiguous.drafts.length, 2);
  assert.equal(ambiguous.drafts[1].details.lmp, null);
  assert.equal(ambiguous.drafts.flatMap((draft) => draft.records).length, 0);
  const three = detectPregnancies(
    {
      ...patient,
      history: {
        onboarding: { pregnancies: { total: 3, currentStatus: "Yes" } },
      },
    },
    appointments,
    [],
    "2026-11-02",
  );
  assert.equal(three.drafts.length, 3);
  assert.equal(
    three.drafts[0].records.length + three.drafts[1].records.length,
    0,
  );
});
test("invalid legacy profile dates do not mask a valid survey LMP", () => {
  for (const lmp of ["4/16/2026", "", "2026-02-30", null]) {
    const result = detectPregnancies({
      lmp,
      type: "Pregnant",
      history: {
        onboardingAppointmentId: 955,
        onboarding: {
          cycle: { lastPeriod: "2026-04-16" },
          pregnancies: { total: "3", currentStatus: "Yes" },
        },
      },
    }, [
      { id: 747, date: "2026-06-03", visitType: "Others", type: "Consultation", status: "Completed" },
      { id: 783, date: "2026-07-10", visitType: "Pregnant", status: "Completed" },
      { id: 826, date: "2026-08-20", visitType: "Pregnant", status: "Completed" },
      { id: 853, date: "2026-09-17", visitType: "Pregnant", status: "Completed" },
      { id: 955, date: "2026-11-05", visitType: "Prenatal Check-up", status: "completed" },
    ], [], "2026-11-05");
    const current = result.drafts.find((draft) => draft.details.status === "current")!;
    assert.equal(current.details.lmp, "2026-04-16");
    assert.equal(current.details.datingBasis, "LMP");
    assert.deepEqual(current.records, [783, 826, 853, 955].map((id) => ({ kind: "appointment", id })));
    assert.ok(result.drafts.filter((draft) => draft.details.status === "past").every((draft) => !draft.records.length));
  }
});
test("valid profile dating keeps precedence and future survey dates still require review", () => {
  const withSurvey = {
    ...patient,
    history: { ...patient.history, onboarding: { ...patient.history.onboarding, cycle: { lastPeriod: "2026-07-01" } } },
  };
  assert.equal(detectPregnancies(withSurvey, [], [], "2026-11-05").drafts[1].details.lmp, patient.lmp);
  assert.equal(detectPregnancies({
    ...withSurvey, lmp: "",
    history: { ...withSurvey.history, onboarding: { ...withSurvey.history.onboarding, cycle: { lastPeriod: "2027-01-01" } } },
  }, [], [], "2026-11-05").drafts.length, 0);
});
test("multiple older clusters, conflicting dating, and newer prior pregnancies remain unassigned", () => {
  const old = [
    ...appointments,
    { id: 10, date: "2020-01-01", type: "Pregnant", status: "Completed" },
  ];
  assert.equal(
    detectPregnancies(patient, old, [], "2026-11-02").drafts[0].records.length,
    0,
  );
  assert.equal(
    detectPregnancies(
      patient,
      [{ ...appointments[0], vitals: { lmp: "2024-09-01" } }],
      [],
      "2026-11-02",
    ).drafts[0].records.length,
    0,
  );
  assert.equal(
    detectPregnancies(
      patient,
      [{ ...appointments[0], date: "2026-06-01" }],
      [],
      "2026-11-02",
    ).drafts[0].records.length,
    0,
  );
});
test("appointment-related consultation conflict blocks linking; standalone visits need matching LMP", () => {
  const visits = [
    {
      id: 1,
      appointmentId: 4,
      date: "2026-11-01",
      vitals: { lmp: "2026-07-01" },
    },
    {
      id: 2,
      appointmentId: null,
      date: "2026-10-01",
      vitals: { lmp: "2026-08-10" },
    },
    { id: 3, appointmentId: null, date: "2026-10-01", vitals: {} },
  ];
  const result = detectPregnancies(patient, appointments, visits, "2026-11-02");
  assert.deepEqual(result.drafts[1].records, [
    { kind: "appointment", id: 3 },
    { kind: "visit", id: 2 },
  ]);
});
test("reported past-only pregnancies are established without guessing which historical dates belong to them", () => {
  const result = detectPregnancies(
    {
      ...patient,
      pregnancyStatus: "completed",
      history: {
        onboarding: { pregnancies: { total: "2", currentStatus: "No" } },
      },
    },
    appointments,
    [],
    "2026-11-02",
  );
  assert.equal(result.drafts.length, 2);
  assert.ok(
    result.drafts.every(
      (draft) =>
        draft.details.status === "past" &&
        !draft.details.lmp &&
        !draft.records.length,
    ),
  );
});
test("negative pregnancy labels do not qualify, and duplicate bookings are preserved as separate links", () => {
  const rows = [
    "Non-pregnant",
    "Not pregnant",
    "Rule out pregnancy",
    "Pregnancy",
    "Pregnancy",
  ].map((type, index) => ({
    id: index + 20,
    date: "2026-10-01",
    type,
    status: "Completed",
  }));
  assert.deepEqual(
    detectPregnancies(patient, rows, [], "2026-11-02").drafts[1].records,
    [
      { kind: "appointment", id: 23 },
      { kind: "appointment", id: 24 },
    ],
  );
});
