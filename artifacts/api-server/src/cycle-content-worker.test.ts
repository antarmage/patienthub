import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { Pool } from "pg";
import { generateDailyCycleEditions, startDailyCycleContentWorker } from "./cycle-content-worker";
import { cycleEditionDate, type CyclePatient } from "./cycle-body-content";
import type { CycleBodyCatalogue } from "../../../lib/db/src/cycle-body-content";

const signal = { title: "Generic signal", body: "General cycle education" };
const copy = {
  title: "General education", introduction: "General education", todayRead: "General education",
  hormoneTitle: "Hormones", hormoneDescription: "Illustrative reference only",
  temperatureTitle: "Temperature", temperatureBody: "General education", signalsTitle: "Signals",
  signals: { focus: signal, temperature: signal, metabolism: signal, hormones: signal },
  patternsTitle: "Patterns", patternsIntroduction: "Reported information",
};
const catalogue: CycleBodyCatalogue = { menstrual: copy, follicular: copy, ovulation: copy, luteal: copy };
const now = new Date("2026-11-27T18:30:00Z");
const patient: CyclePatient = { id: 1, lmp: null, periodDate: "2026-11-14", pregnant: false,
  history: { onboarding: { cycle: { cycleLength: 28, regularity: "Regular" } } } };

function memoryStore(patients: CyclePatient[]) {
  type Store = Parameters<typeof generateDailyCycleEditions>[0];
  type Edition = NonNullable<Awaited<ReturnType<Store["edition"]>>> & { state: string };
  const editions = new Map<string, Edition>();
  const key = (job: Parameters<Store["claim"]>[0]) => `${job.patientId}:${job.date}`;
  const store: Store = {
    patients: async () => patients,
    edition: async job => editions.get(key(job)),
    claim: async job => {
      const previous = editions.get(key(job));
      const matches = previous?.cycleDay === job.context.cycleDay && previous.cycleLength === job.context.cycleLength &&
        previous.phase === job.context.phase;
      editions.set(key(job), { ...job.context, content: null, attempts: matches ? previous.attempts + 1 : 1, state: "generating" });
    },
    save: async (job, content) => {
      const edition = editions.get(key(job)); assert.ok(edition);
      edition.content = content; edition.state = "ready";
    },
    fail: async job => {
      const edition = editions.get(key(job)); assert.ok(edition);
      edition.state = "failed";
    },
  };
  return { store, editions };
}

test("daily editions roll over at midnight IST rather than server midnight", () => {
  assert.equal(cycleEditionDate(new Date("2026-11-27T18:29:59Z")), "2026-11-27");
  assert.equal(cycleEditionDate(now), "2026-11-28");
});

test("each eligible patient gets a separate edition once per IST day, with restart catch-up", async () => {
  const { store, editions } = memoryStore([patient, { ...patient, id: 2 }, { ...patient, id: 3, pregnant: true }]);
  let calls = 0;
  const generate = async () => {
    calls++;
    return { ...catalogue, luteal: { ...copy, title: `Edition ${calls}` } };
  };
  assert.deepEqual(await generateDailyCycleEditions(store, generate, now), { generated: 2, failed: 0, skipped: 1 });
  assert.equal(calls, 2);
  assert.equal(editions.size, 2);
  assert.notDeepEqual(editions.get("1:2026-11-28")?.content, editions.get("2:2026-11-28")?.content);
  assert.deepEqual(await generateDailyCycleEditions(store, generate, now), { generated: 0, failed: 0, skipped: 3 });
  assert.equal(calls, 2);
  await generateDailyCycleEditions(store, generate, new Date("2026-11-28T18:30:00Z"));
  assert.equal(calls, 4);
});

test("generation failure is isolated to one patient and retried at most three times per edition", async () => {
  const { store } = memoryStore([patient, { ...patient, id: 2 }]);
  let calls = 0;
  const generate = async () => { calls++; if (calls === 1) throw new Error("Simulated provider failure"); return catalogue; };
  assert.deepEqual(await generateDailyCycleEditions(store, generate, now), { generated: 1, failed: 1, skipped: 0 });
  assert.deepEqual(await generateDailyCycleEditions(store, generate, now), { generated: 1, failed: 0, skipped: 1 });
  const failed = memoryStore([patient]);
  let failures = 0;
  const reject = async (): Promise<CycleBodyCatalogue> => { failures++; throw new Error("Simulated provider failure"); };
  for (let attempt = 0; attempt < 4; attempt++) await generateDailyCycleEditions(failed.store, reject, now);
  assert.equal(failures, 3);
});

test("changed period records regenerate today's edition and stopping avoids further generation", async () => {
  const patients = [{ ...patient }];
  const { store } = memoryStore(patients);
  let calls = 0;
  const generate = async () => { calls++; return catalogue; };
  await generateDailyCycleEditions(store, generate, now);
  patients[0].periodDate = "2026-11-20";
  await generateDailyCycleEditions(store, generate, now);
  assert.equal(calls, 2);
  await generateDailyCycleEditions(store, generate, now, () => true);
  assert.equal(calls, 2);
});

test("restart after a crashed third attempt marks failure instead of leaving the edition pending", async () => {
  const patients = [{ ...patient }];
  const { store, editions } = memoryStore(patients);
  const edition = { cycleDay: 15, cycleLength: 28, phase: "luteal", content: null, attempts: 3, state: "generating" };
  editions.set("1:2026-11-28", edition);
  let calls = 0;
  const generate = async () => { calls++; return catalogue; };
  assert.deepEqual(await generateDailyCycleEditions(store, generate, now), { generated: 0, failed: 0, skipped: 1 });
  assert.equal(calls, 0);
  assert.equal(edition.state, "failed");
  patients[0].periodDate = "2026-11-20";
  await generateDailyCycleEditions(store, generate, now);
  assert.equal(calls, 1);
  assert.equal(editions.get("1:2026-11-28")?.attempts, 1);
  assert.equal(editions.get("1:2026-11-28")?.state, "ready");
});

test("stopping during generation finishes that edition without starting the next patient", async () => {
  const { store, editions } = memoryStore([patient, { ...patient, id: 2 }]);
  let stopped = false;
  const result = await generateDailyCycleEditions(store, async () => {
    stopped = true;
    return catalogue;
  }, now, () => stopped);
  assert.deepEqual(result, { generated: 1, failed: 0, skipped: 0 });
  assert.equal(editions.size, 1);
});

test("worker uses the lock connection and discards it if unlocking fails", async t => {
  for (const failUnlock of [false, true]) {
    const pool = new Pool();
    const statements: string[] = [];
    let discarded: boolean | undefined;
    let released!: () => void;
    const releaseCompleted = new Promise<void>(resolve => { released = resolve; });
    const client = Object.assign(new EventEmitter(), {
      query: async (sql: string) => {
        statements.push(sql);
        if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
        if (sql.includes("pg_advisory_unlock") && failUnlock) throw new Error("Simulated unlock failure");
        return { rows: [] };
      },
      release: (discard: boolean) => { discarded = discard; released(); },
    });
    t.mock.method(pool, "connect", async () => client);
    t.mock.method(pool, "query", () => { throw new Error("Worker must use its lock connection"); });
    const stop = startDailyCycleContentWorker(pool);
    try {
      await releaseCompleted;
      assert.equal(discarded, failUnlock);
      assert.ok(statements.some(sql => sql.includes("FROM patients p")));
      assert.ok(statements.some(sql => sql.includes("pg_advisory_unlock")));
      assert.equal(client.listenerCount("error"), 0);
    } finally {
      stop();
      await pool.end();
    }
  }
});
