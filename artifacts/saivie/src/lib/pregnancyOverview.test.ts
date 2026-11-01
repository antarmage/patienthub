import assert from "node:assert/strict";
import test from "node:test";
import {
  episodeRecords,
  patientAge,
  pregnancyBaseline,
  pregnancyGestation,
  readPregnancyEpisodes,
  suggestedEpisode,
  readMeasurementLogs,
} from "./pregnancyOverview";

test("overall measurement logs validate patient ownership, numeric readings and calendar dates", () => {
  const data = {
    bp: [{ patientId: 1, date: "2020-02-01", systolic: 120, diastolic: 80 }],
    weight: [{ patientId: 1, date: "2020-02-01", weight: 130, unit: "lb" }],
  };
  assert.deepEqual(readMeasurementLogs(data, 1), {
    bp: [{ date: "2020-02-01", systolic: 120, diastolic: 80 }],
    weight: [{ date: "2020-02-01", weight: 130, unit: "lb" }],
  });
  assert.throws(() => readMeasurementLogs(data, 2), /mismatched/);
  assert.throws(
    () => readMeasurementLogs({ ...data, bp: {} }, 1),
    /invalid log list/,
  );
  for (const change of [
    { date: "2020-02-30" },
    { systolic: "120" },
    { systolic: 0 },
    { systolic: NaN },
  ]) {
    assert.throws(
      () =>
        readMeasurementLogs({ ...data, bp: [{ ...data.bp[0], ...change }] }, 1),
      /invalid/,
    );
  }
});
import type { PregnancyEpisode } from "../../../../lib/db/src/pregnancy-episodes";

export const episode: PregnancyEpisode = {
  id: 1,
  patientId: 1,
  version: 1,
  updatedAt: "2020-01-01T00:00:00Z",
  details: {
    number: 2,
    status: "current",
    lmp: "2020-01-01",
    startDate: null,
    endDate: null,
    dueDate: null,
    datingBasis: "LMP",
    outcome: "Not recorded",
    deliveryMode: "Not recorded",
    conceptionMethod: "Natural",
    notes: "",
  },
  records: [
    { kind: "appointment", id: 1 },
    { kind: "lab", id: 1 },
  ],
};
test("age derives from DOB at the birthday and zero does not become an age", () => {
  assert.equal(patientAge({ dob: "1990-05-15", age: 0 }, "2026-05-14"), 35);
  assert.equal(patientAge({ dob: "1990-05-15", age: 0 }, "2026-05-15"), 36);
  assert.equal(patientAge({ age: 0 }, "2026-05-15"), null);
  assert.equal(patientAge({ age: 30 }, "2026-05-15"), 30);
});
test("gestation uses saved dating and past end date, never projects an earlier pregnancy to today", () => {
  assert.deepEqual(pregnancyGestation(episode.details, "2020-04-08"), {
    weeks: 14,
    days: 0,
    trimester: 2,
    dueDate: "2020-10-07",
    asOf: "2020-04-08",
    basis: "LMP",
  });
  assert.equal(
    pregnancyGestation({ ...episode.details, status: "past" }, "2026-01-01"),
    null,
  );
  assert.equal(
    pregnancyGestation(
      { ...episode.details, status: "past", endDate: "2020-09-23" },
      "2026-01-01",
    )?.weeks,
    38,
  );
  assert.equal(
    pregnancyGestation(
      { ...episode.details, datingBasis: "Not recorded" },
      "2020-04-08",
    ),
    null,
  );
  assert.equal(
    pregnancyGestation(
      { ...episode.details, datingBasis: "Ultrasound", dueDate: "2020-10-14" },
      "2020-04-08",
    )?.weeks,
    13,
  );
  assert.equal(pregnancyGestation(episode.details, "2019-12-31"), null);
  assert.equal(pregnancyGestation(episode.details, "2026-01-01"), null);
});
test("same-day records and labs stay separate unless explicitly linked", () => {
  const appointments = [
    { id: 1, date: "2020-02-01" },
    { id: 2, date: "2020-02-01" },
  ];
  const visits = [
    { id: 1, appointmentId: 1 },
    { id: 2, appointmentId: 2 },
    { id: 3, appointmentId: null },
  ];
  const labs = [
    { id: 1, date: "2020-02-01" },
    { id: 2, date: "2020-02-01" },
  ];
  assert.deepEqual(episodeRecords(episode, appointments, visits, labs), {
    appointments: [appointments[0]],
    visits: [visits[0]],
    labs: [labs[0]],
  });
  assert.deepEqual(
    episodeRecords(
      { ...episode, records: [{ kind: "visit", id: 2 }] },
      appointments,
      visits,
      labs,
    ),
    { appointments: [appointments[1]], visits: [visits[1]], labs: [] },
  );
});
test("episode suggestions do not auto-assign records or parse ambiguous legacy LMP", () => {
  const patient = {
    lmp: "8/10/2026",
    history: { onboarding: { pregnancies: { total: 2 } } },
  };
  assert.equal(suggestedEpisode(patient, []).number, 2);
  assert.equal(suggestedEpisode(patient, []).lmp, null);
  assert.equal(suggestedEpisode(patient, [episode]).status, "past");
  assert.equal(suggestedEpisode(patient, [episode]).outcome, "Not recorded");
});
test("response validates patient ownership and invalid dates; explicit no counts as recorded history", () => {
  assert.deepEqual(readPregnancyEpisodes([episode], 1), [episode]);
  assert.throws(() => readPregnancyEpisodes([episode], 2), /mismatched/);
  assert.throws(
    () =>
      readPregnancyEpisodes(
        [{ ...episode, details: { ...episode.details, lmp: "2020-02-30" } }],
        1,
      ),
    /invalid/,
  );
  assert.throws(
    () => readPregnancyEpisodes({ data: [episode] }, 1),
    /invalid episode list/,
  );
  assert.equal(
    pregnancyBaseline({ age: 0, history: { medical: "No", allergies: "None" } })
      .medicalRecorded,
    true,
  );
  assert.equal(
    pregnancyBaseline({ age: 0, history: {} }).medicalRecorded,
    false,
  );
});
