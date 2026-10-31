import assert from "node:assert/strict";
import test from "node:test";
import { pendingReceptionTasks, type ReceptionLabTask } from "./receptionTasks.ts";

const task: ReceptionLabTask = {
    id: 10, test: "Blood test", due: "Today", status: "Pending", patient: "Test patient",
};

test("only unbooked pending and delayed tasks count as reception work", () => {
    const statuses = ["Pending", "Delayed", "Scheduled", "Completed", "Cancelled", null];
    const tasks = statuses.map((status, id) => ({ ...task, id, status }));
    assert.deepEqual(pendingReceptionTasks(tasks).map((item) => item.status), ["Pending", "Delayed"]);
    assert.equal(pendingReceptionTasks([]).length, 0);
});

test("confirmed bookings leave the pending list without deleting the lab order", () => {
    const tasks = [task];
    assert.equal(pendingReceptionTasks(tasks).length, 1);
    const booked = tasks.map((item) => ({ ...item, status: "Scheduled", due: "2026-11-01" }));
    assert.equal(pendingReceptionTasks(booked).length, 0);
    assert.equal(booked[0].id, task.id);
    assert.equal(booked[0].due, "2026-11-01");
});

test("review uses the actual investigation and urgency", () => {
    const [pending, delayed, scan] = pendingReceptionTasks([
        task,
        { ...task, id: 11, test: "Hormone Panel", status: "Delayed", due: "Overdue" },
        { ...task, id: 12, test: "USG Pelvic", due: "Tomorrow" },
    ]);
    assert.equal(pending.test, "Blood test");
    assert.equal(pending.title, "Book Blood test");
    assert.equal(pending.urgency, "High");
    assert.equal(delayed.title, "Urgent: Hormone Panel");
    assert.equal(delayed.urgency, "High");
    assert.equal(scan.type, "usg");
    assert.equal(scan.urgency, "Medium");
});
