import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PregnancyOverview } from "./PregnancyOverview";
import { indiaToday } from "@/lib/pregnancyOverview";
import type { PregnancyEpisode } from "../../../../lib/db/src/pregnancy-episodes";
import type { PregnancyFollowUp } from "../../../../lib/db/src/pregnancy-follow-up";

const current: PregnancyEpisode = {
  id: 2,
  patientId: 1,
  version: 1,
  updatedAt: "2020-01-01T00:00:00Z",
  details: {
    number: 2,
    status: "current",
    lmp: null,
    startDate: null,
    endDate: null,
    dueDate: null,
    datingBasis: "Not recorded",
    outcome: "Not recorded",
    deliveryMode: "Not recorded",
    conceptionMethod: "",
    notes: "Current synthetic pregnancy",
  },
  records: [
    { kind: "appointment", id: 2 },
    { kind: "lab", id: 2 },
  ],
};
const past: PregnancyEpisode = {
  ...current,
  id: 1,
  details: {
    ...current.details,
    number: 1,
    status: "past",
    lmp: "2020-01-01",
    endDate: "2020-09-23",
    datingBasis: "LMP",
    outcome: "Live birth",
    notes: "Past synthetic pregnancy",
  },
  records: [
    { kind: "appointment", id: 1 },
    { kind: "lab", id: 1 },
  ],
};
const patient = {
  id: 1,
  name: "Synthetic summary",
  dob: "1990-01-01",
  age: 0,
  history: {
    medical: "No",
    allergies: "None",
    obstetric: { bloodGroup: "O+" },
    onboarding: { pregnancies: { total: 2 } },
  },
};
const records = {
  appointments: [
    {
      id: 1,
      date: "2020-02-01",
      status: "Completed",
      vitals: { weight: "91" },
    },
    {
      id: 2,
      date: indiaToday(),
      status: "checked-in",
      vitals: {
        weight: "55",
        bp: "120/80",
        pulse: "75",
        spo2: "98",
        fetalHeartRate: "145",
        fundalHeight: "24",
      },
    },
  ],
  visits: [],
  labs: [
    { id: 1, date: "2020-02-01", testName: "Hb", value: 7, unit: "g/dL" },
    { id: 2, date: indiaToday(), testName: "Hb", value: 11.6, unit: "g/dL" },
  ],
};
function render(
  episodes: PregnancyEpisode[],
  canEdit = true,
  ready = true,
  fixturePatient: Record<string, unknown> & { id: number } = patient,
  followUp?: PregnancyFollowUp,
  fixtureRecords = records,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["/api/patients", 1, "pregnancy-episodes"], episodes);
  if (followUp)
    client.setQueryData(["pregnancy-follow-ups", canEdit, "1"], {
      1: followUp,
    });
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <PregnancyOverview
          patient={fixturePatient}
          {...fixtureRecords}
          canEdit={canEdit}
          recordsReady={ready}
        />
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}
test("missing allergy and vitals artwork waits for ready sources and respects recorded values", () => {
  const missingPatient = { ...patient, history: {} };
  const emptyRecords = { appointments: [], visits: [], labs: [] };
  const incomplete = render([current], true, false, missingPatient, undefined, emptyRecords);
  assert.doesNotMatch(incomplete, /data-records-scenario="allergies"|data-records-scenario="vitals"/);
  const empty = render([current], true, true, missingPatient, undefined, emptyRecords);
  assert.match(empty, /data-records-scenario="allergies"/);
  assert.match(empty, /data-records-scenario="vitals"/);
  const recorded = render([current]);
  assert.doesNotMatch(recorded, /data-records-scenario="allergies"|data-records-scenario="vitals"/);
});
test("saved tabs default to current, don't leak older pregnancy values, and show explicit information gaps", () => {
  const html = render([past, current]);
  assert.ok(html.includes("Pregnancy 1"));
  assert.ok(html.includes("Pregnancy 2"));
  assert.ok(html.includes("Current synthetic pregnancy"));
  assert.ok(!html.includes("Past synthetic pregnancy"));
  assert.ok(html.includes("11.6"));
  assert.ok(!html.includes(">91"));
  assert.ok(!html.includes("2020-02-01"));
  assert.ok(html.includes("Dating not available"));
  assert.ok(html.includes("not a clinical diagnosis"));
  assert.ok(!html.includes("0 years"));
});
test("saved pregnancy follow-up has a source/date and is never presented as a booked visit", () => {
  const followUp: PregnancyFollowUp = {
    episodeId: current.id,
    datingKey: "synthetic",
    date: "2020-01-01",
    source: "milestone",
    reason: "Timing prompt only",
    sourceRecord: "milestone:36",
  };
  const html = render([current], true, true, patient, followUp);
  assert.ok(html.includes("Milestone follow-up · not booked"));
  assert.ok(html.includes("2020-01-01"));
  assert.ok(html.includes("Overdue"));
  assert.ok(
    !render([past], true, true, patient, followUp).includes(
      'aria-label="Saved pregnancy follow-up"',
    ),
  );
});
test("reception sees episodes but not authoring controls; incomplete sources disable editing", () => {
  const html = render([past, current], false);
  assert.ok(html.includes("clinician-authored and read-only"));
  assert.ok(!html.includes("+ Add pregnancy"));
  assert.ok(!html.includes("Edit pregnancy"));
  assert.ok(render([current], true, false).includes("disabled"));
});
test("past-only summary uses gestation at the recorded end and hides today's check-in", () => {
  const html = render([past]);
  assert.ok(html.includes("38w 0d"));
  assert.ok(html.includes("2020-09-23"));
  assert.ok(html.includes("Live birth"));
  assert.ok(!html.includes("Today&#x27;s check-in"));
  assert.ok(!html.includes("11.6"));
});
test("empty API response awaits authenticated detection rather than inventing unsaved episode tabs", () => {
  const html = render([]);
  assert.ok(html.includes("No saved pregnancy episode"));
  assert.ok(!html.includes("Pregnancy 1 ·"));
  assert.ok(html.includes("2 pregnancies"));
  assert.ok(html.includes("0 episode records saved"));
  assert.ok(html.includes("Overall patient history"));
});
test("all earlier graph types remain available for explicitly linked pregnancy records", () => {
  const html = render([past, current]);
  for (const label of [
    "Blood pressure",
    "Weight",
    "Hemoglobin",
    "Pulse",
    "Fetal heart rate",
    "Fundal height",
    "Blood sugar",
  ]) {
    assert.ok(html.includes(label), label);
  }
  assert.ok(html.includes("145"));
  assert.ok(html.includes("24"));
  assert.ok(html.includes("75"));
  assert.ok(html.includes("No recorded readings."));
  assert.ok(html.includes('data-testid="episode-measurements"'));
  assert.ok(!html.includes('data-testid="overall-measurements"'));
});
test("saved intake age avoids a false missing-age attention item", () => {
  const html = render([current], true, true, {
    ...patient,
    dob: null,
    age: 0,
    history: {
      ...patient.history,
      onboarding: { age: "30", pregnancies: { total: 2 } },
    },
  });
  assert.ok(html.includes("Age: 30"));
  assert.ok(!html.includes("Patient date of birth / age"));
  assert.ok(html.includes("retained until corrected"));
});
test("pregnancy graph references disclose sources and missing baseline without guessing current weight", () => {
  const dated = {
    ...current,
    details: {
      ...current.details,
      lmp: "2026-01-01",
      datingBasis: "LMP" as const,
    },
  };
  const html = render([dated]);
  assert.ok(html.includes("Pregnancy hypertension thresholds"));
  assert.ok(html.includes("Pregnancy anemia screening cutoff"));
  assert.ok(html.includes("confirmed pre-pregnancy weight"));
  assert.ok(html.includes("NICE NG133"));
  assert.ok(html.includes("IOM/NRC 2009"));
  assert.ok(html.includes("labour CTG baseline ranges are not applied"));
  const baseline = render([
    {
      ...dated,
      details: {
        ...dated.details,
        maternalHeightCm: 160,
        prePregnancyWeightKg: 60,
        fetusCount: 1,
      },
    },
  ]);
  assert.ok(baseline.includes("Illustrative pregnancy weight-gain band"));
  assert.ok(baseline.includes("BMI 23.4"));
});
test("patient risk is kept distinct from missing information and is not silently reclassified", () => {
  const html = render([current], true, true, {
    ...patient,
    riskScore: {
      level: "High",
      factors: [
        { factor: "Existing assessment", detail: "Requires clinician review" },
      ],
    },
  });
  assert.ok(html.includes("Previously recorded risk assessment: High"));
  assert.ok(html.includes("not linked to a saved pregnancy episode"));
});
test("selected-pregnancy graph uses its linked first-trimester weight as an estimated baseline", () => {
  const html = render([{ ...past, details: { ...past.details, maternalHeightCm: 160, fetusCount: 1 } }]);
  assert.ok(html.includes("estimated baseline 91 kg from 2020-02-01 (4w 3d, Appointment)"));
  assert.ok(html.includes("Estimated pre-pregnancy BMI"));
  assert.ok(html.includes("Saved pre-pregnancy weight is unchanged"));
  assert.ok(!html.includes("estimated baseline 55 kg"));
});
test("missing-age-only legacy risk is explicitly marked for review without deleting original evidence", () => {
  const html = render([current], true, true, {
    ...patient,
    age: 0,
    dob: "1996-01-01",
    riskScore: {
      level: "Critical",
      score: 95,
      factors: [
        "Invalid/Missing Patient Age",
        "Absence of Vital Signs and Baseline Data",
        "Undetermined Gestational Age",
        "Complete Lack of Clinical History",
      ].map((factor) => ({ factor })),
    },
  });
  assert.ok(
    html.includes("Previously recorded risk assessment: Review required"),
  );
  assert.ok(!html.includes("Previously recorded risk assessment: Critical"));
  assert.ok(html.includes("Invalid/Missing Patient Age"));
  assert.ok(html.includes("Age: 30"));
});
