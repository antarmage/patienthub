import assert from "node:assert/strict";
import test from "node:test";
import { doctorQueueState, visitDurationSummary, type DoctorDashboardPatient } from "./doctorDashboard.ts";

const patient: DoctorDashboardPatient = { id: 1, name: "Test Patient", appointmentId: 10, appointmentDate: "2026-10-31", appointmentTime: "09:00" };

test("queue states preserve closed, completed, in-consultation and waiting precedence", () => {
    assert.equal(doctorQueueState(patient), "scheduled");
    assert.equal(doctorQueueState({ ...patient, appointmentStatus: "Checked In" }), "waiting");
    assert.equal(doctorQueueState({ ...patient, appointmentStatus: "with-doctor" }), "in-consultation");
    assert.equal(doctorQueueState({ ...patient, appointmentStatus: "checked-in", appointmentSeenAt: "2026-10-31T09:00:00Z" }), "in-consultation");
    assert.equal(doctorQueueState({ ...patient, appointmentStatus: "completed" }), "completed");
    assert.equal(doctorQueueState({ ...patient, appointmentStatus: "cancelled", appointmentCompletedAt: "2026-10-31T09:00:00Z" }), "closed");
    assert.equal(doctorQueueState({ ...patient, appointmentStatus: "no_show" }), "closed");
});

test("duration chart uses only real start/completion times, not estimated or fabricated visits", () => {
    const summary = visitDurationSummary([
        patient,
        { ...patient, appointmentId: 11, appointmentSeenAt: "2026-10-31T09:00:00Z", appointmentCompletedAt: "2026-10-31T09:20:00Z" },
        { ...patient, appointmentId: 12, appointmentSeenAt: "2026-10-31T10:00:00Z", appointmentCompletedAt: "2026-10-31T10:40:00Z" },
        { ...patient, appointmentSeenAt: "invalid", appointmentCompletedAt: "invalid" },
        { ...patient, appointmentSeenAt: "2026-10-31T11:00:00Z", appointmentCompletedAt: "2026-10-31T10:00:00Z" },
    ]);
    assert.equal(summary.visits.length, 2);
    assert.equal(summary.average, 30);
    assert.equal(summary.minimum, 20);
    assert.equal(summary.maximum, 40);
    assert.equal(visitDurationSummary([]).average, null);
});
