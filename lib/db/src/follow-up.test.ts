import assert from "node:assert/strict";
import { it } from "node:test";
import { buildFollowUpTasks, prescriptionDueDate, type FollowUpSources } from "./follow-up.ts";

it("calculates the doctor's days or weeks from the prescription date", () => {
  for (const [instructions, date] of [
    ["after 5 days", "2026-10-31"], ["after a week", "2026-11-02"],
    ["after week", "2026-11-02"], ["week", "2026-11-02"],
    ["Review after 2 weeks with reports", "2026-11-09"], ["2 weeks", "2026-11-09"],
    ["in two weeks", "2026-11-09"], ["Follow-up in 1 day", "2026-10-27"],
  ]) assert.equal(prescriptionDueDate(instructions, "2026-10-26"), date, instructions);
});

it("preserves explicit dates and month-end rules without guessing unclear timing", () => {
  assert.equal(prescriptionDueDate("Review on 09/11/2026", "2026-10-26"), "2026-11-09");
  assert.equal(prescriptionDueDate("Review on 2026-11-09", "2026-10-26"), "2026-11-09");
  assert.equal(prescriptionDueDate("after 1 month", "2026-01-31"), "2026-02-28");
  for (const instruction of ["", "Review with reports", "after weeks", "after 0 days", "after -2 weeks", "after 1.5 weeks", "after 2-3 weeks", "after 99999999999999999 days", "after 99999999999 weeks", "after 99999999999 months"]) {
    assert.equal(prescriptionDueDate(instruction, "2026-10-26"), null, instruction);
  }
  assert.equal(prescriptionDueDate("after 5 days", ""), null);
});

function sources(followUpPlan: string | null, followUpDate: string | null): FollowUpSources {
  return {
    patients: [{ id: 1, name: "Test patient", phone: "", type: "General", lmp: null, pregnancyStatus: null, nextReview: null }],
    appointments: [],
    visits: [{ id: 1, patientId: 1, appointmentId: 2, date: "2026-10-26", followUpPlan, vitals: { followUpDate }, labsOrdered: [] }],
    labTasks: [], labResults: [],
  };
}

it("uses the confirmed date for receptionist reminders one day before it is due", () => {
  const data = sources("after 2 weeks", "2026-11-10");
  assert.equal(buildFollowUpTasks(data, "2026-11-08").length, 0);
  const calls = buildFollowUpTasks(data, "2026-11-09");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].triggerType, "prescription");
  assert.equal(calls[0].dueDate, "2026-11-10");
  assert.equal(calls[0].plannedDate, "2026-11-09");
  assert.equal(calls[0].sourceKey, "prescription:appointment:2:2026-11-10");
});

it("supports date-only and legacy text-only plans and flags unclear instructions", () => {
  assert.equal(buildFollowUpTasks(sources(null, "2026-11-10"), "2026-11-09")[0].dueDate, "2026-11-10");
  assert.equal(buildFollowUpTasks(sources("after 5 days", null), "2026-10-30")[0].dueDate, "2026-10-31");
  assert.match(buildFollowUpTasks(sources("Review reports", null), "2026-10-26")[0].triggerReason!, /Confirm follow-up timing/);
});

it("deduplicates the saved appointment and visit follow-up", () => {
  const data = sources("after 2 weeks", "2026-11-09");
  data.appointments.push({ id: 2, patientId: 1, date: "2026-10-26", status: "completed", followUpDate: "2026-11-09", followUpNotes: "after 2 weeks" });
  const calls = buildFollowUpTasks(data, "2026-11-08").filter((call) => call.triggerType === "prescription");
  assert.equal(calls.length, 1);
});
