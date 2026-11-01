import assert from "node:assert/strict";
import test from "node:test";
import type { PregnancyEpisode } from "./pregnancy-episodes";
import { addCallDays } from "./follow-up";
import {
  planPregnancyFollowUp,
  type FollowUpAppointment,
  type FollowUpVisit,
  type PregnancyFollowUp,
} from "./pregnancy-follow-up";

const episode: PregnancyEpisode = {
  id: 1,
  patientId: 1,
  version: 1,
  updatedAt: "2026-01-01",
  details: {
    number: 2,
    status: "current",
    lmp: "2026-01-01",
    dueDate: null,
    startDate: null,
    endDate: null,
    datingBasis: "LMP",
    outcome: "Not recorded",
    deliveryMode: "Not recorded",
    conceptionMethod: "",
    notes: "",
  },
  records: [
    { kind: "appointment", id: 1 },
    { kind: "visit", id: 1 },
  ],
};
const atWeek = (week: number) => addCallDays("2026-01-01", week * 7);
function plan(
  today = atWeek(37),
  change: Partial<Parameters<typeof planPregnancyFollowUp>[0]> = {},
) {
  return planPregnancyFollowUp({
    episode,
    appointments: [],
    visits: [],
    nextReview: null,
    previous: null,
    today,
    ...change,
  });
}
const appointment: FollowUpAppointment = {
  id: 1,
  date: atWeek(35),
  status: "completed",
  followUpDate: atWeek(36),
  followUpNotes: "Review in one week",
};
const visit: FollowUpVisit = {
  id: 1,
  appointmentId: 1,
  date: atWeek(35),
  followUpPlan: "Review after 2 weeks",
  vitals: { followUpDate: atWeek(37) },
};
test("prescription date overrides milestone, including overdue dates and date-only instructions", () => {
  assert.equal(
    plan(atWeek(37), { appointments: [appointment] })?.date,
    atWeek(36),
  );
  assert.equal(
    plan(atWeek(37), { appointments: [appointment] })?.source,
    "prescription",
  );
  assert.equal(
    plan(atWeek(37), { appointments: [appointment], visits: [visit] })?.date,
    atWeek(37),
  );
  assert.equal(
    plan(atWeek(37), {
      visits: [{ ...visit, vitals: {}, followUpPlan: "Review after 2 weeks" }],
    })?.date,
    atWeek(37),
  );
});
test("ambiguous doctor instructions and invalid existing review do not silently become a milestone date", () => {
  const result = plan(atWeek(37), {
    visits: [{ ...visit, vitals: {}, followUpPlan: "Review as advised" }],
  });
  assert.equal(result?.date, null);
  assert.equal(result?.source, "review-required");
  assert.equal(
    plan(atWeek(37), { nextReview: "Tomorrow" })?.source,
    "review-required",
  );
  assert.equal(plan(atWeek(37), { nextReview: atWeek(36) })?.date, atWeek(36));
});
test("milestone windows set a timely follow-up and save-overdue plans never drift forward", () => {
  const result = plan();
  assert.equal(result?.date, atWeek(37));
  assert.equal(result?.source, "milestone");
  assert.equal(result?.sourceRecord, "milestone:36");
  assert.ok(result?.reason.includes("not ordered"));
  assert.deepEqual(plan(atWeek(38), { previous: result }), result);
  assert.equal(plan(atWeek(15))?.date, atWeek(18));
  assert.equal(plan(atWeek(38))?.date, atWeek(38));
  assert.equal(plan(atWeek(39))?.sourceRecord, "milestone:39");
  assert.equal(plan(atWeek(40))?.sourceRecord, "milestone:40");
});
test("completed planned contact advances timing without claiming any scan or vaccine was completed", () => {
  const previous = plan();
  const completed = {
    ...appointment,
    date: atWeek(37),
    followUpDate: null,
    followUpNotes: null,
  };
  const next = plan(atWeek(37), { previous, appointments: [completed] });
  assert.equal(next?.date, atWeek(38));
  assert.equal(next?.sourceRecord, "milestone:38");
  const week38 = { ...completed, date: atWeek(38) };
  assert.equal(
    plan(atWeek(38), { previous: next, appointments: [week38] })?.date,
    atWeek(39),
  );
});
test("pregnancy isolation excludes old/unassigned prescriptions and respects clinical EDD rather than old LMP", () => {
  assert.equal(
    plan(atWeek(37), {
      appointments: [{ ...appointment, id: 9 }],
      visits: [{ ...visit, id: 9, appointmentId: 9 }],
    })?.source,
    "milestone",
  );
  const adjusted = {
    ...episode,
    details: {
      ...episode.details,
      datingBasis: "Ultrasound" as const,
      lmp: "2020-01-01",
      dueDate: atWeek(40),
    },
  };
  assert.equal(plan(atWeek(37), { episode: adjusted })?.date, atWeek(37));
  assert.equal(
    plan(atWeek(37), {
      episode: { ...episode, details: { ...episode.details, status: "past" } },
    }),
    null,
  );
  assert.equal(
    plan(atWeek(37), {
      episode: { ...episode, details: { ...episode.details, lmp: null } },
    })?.source,
    "review-required",
  );
  assert.equal(plan("2025-12-01")?.source, "review-required");
  assert.equal(plan(atWeek(41))?.date, null);
});
test("bookings prevent creating a redundant initial milestone plan, while prescribed timing remains visible", () => {
  const booked = {
    ...appointment,
    id: 2,
    date: atWeek(38),
    status: "scheduled",
    followUpDate: null,
  };
  assert.equal(plan(atWeek(37), { appointments: [booked] }), null);
  assert.equal(
    plan(atWeek(37), { appointments: [appointment, booked] })?.source,
    "prescription",
  );
  const cancelled = { ...booked, status: "cancelled" };
  assert.equal(
    plan(atWeek(37), { appointments: [cancelled] })?.source,
    "milestone",
  );
});
test("a changed episode or dating does not reuse another pregnancy's pending plan", () => {
  const previous = plan() as PregnancyFollowUp;
  const other = {
    ...episode,
    id: 2,
    details: { ...episode.details, lmp: "2026-02-01" },
  };
  assert.notEqual(
    plan(atWeek(38), { previous, episode: other })?.datingKey,
    previous.datingKey,
  );
});
