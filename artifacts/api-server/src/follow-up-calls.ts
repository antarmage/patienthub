import { and, eq, sql } from "drizzle-orm";
import {
  appointments, patients, visitHistory, labTasks, labResults, followUpCalls,
  buildFollowUpTasks, clinicDate,
} from "@workspace/db";
import { db } from "./db";

export async function synchronizeFollowUpCalls(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(684219037)`);
    const [patientRows, appointmentRows, visits, tasks, results, existing] = await Promise.all([
      tx.select().from(patients),
      tx.select().from(appointments),
      tx.select().from(visitHistory),
      tx.select().from(labTasks),
      tx.select().from(labResults),
      tx.select().from(followUpCalls),
    ]);
    const candidates = buildFollowUpTasks({
      patients: patientRows, appointments: appointmentRows, visits, labTasks: tasks, labResults: results,
    }, clinicDate());
    const activeKeys = new Set(candidates.map((call) => call.sourceKey));
    const byKey = new Map(existing.filter((call) => call.sourceKey).map((call) => [call.sourceKey, call]));
    for (const candidate of candidates) {
      const previous = byKey.get(candidate.sourceKey);
      if (previous) {
        if (previous.status === "pending" || previous.status === "cancelled") {
          await tx.update(followUpCalls).set({
            patientName: candidate.patientName, phone: candidate.phone, triggerReason: candidate.triggerReason,
            status: "pending",
          }).where(eq(followUpCalls.id, previous.id));
        }
        continue;
      }
      // Preserve manually scheduled calls rather than creating a second task for the same follow-up.
      const manuallyScheduled = candidate.triggerType === "prescription" && existing.some((call) =>
        !call.sourceKey && call.patientId === candidate.patientId &&
        (call.plannedDate === candidate.plannedDate || call.plannedDate === candidate.dueDate));
      if (!manuallyScheduled) await tx.insert(followUpCalls).values(candidate).onConflictDoNothing({ target: followUpCalls.sourceKey });
    }
    for (const call of existing) {
      if (call.sourceKey && call.status === "pending" && !activeKeys.has(call.sourceKey)) {
        await tx.update(followUpCalls).set({ status: "cancelled" })
          .where(and(eq(followUpCalls.id, call.id), eq(followUpCalls.status, "pending")));
      }
    }
  });
}
