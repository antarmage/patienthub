import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import { assembleCycleBodyFeed, cycleBodyContext, cycleBodyVersion, cycleEditionDate, registerCycleBodyContent } from "./cycle-body-content";
import { cycleBodyCatalogueSchema, cycleBodyFeedSchema } from "../../../lib/db/src/cycle-body-content";

const now = new Date("2026-11-27T12:00:00");
const input = { lmp: null, periodDate: "2026-11-14", pregnant: false, history: { onboarding: { cycle: { cycleLength: 28, regularity: "Regular" } } } };

test("cycle engine resolves period prompt and changes phase with the recorded day and length", () => {
  assert.deepEqual(cycleBodyContext(input, now), { cycleDay: 14, cycleLength: 28, phase: "ovulation" });
  assert.deepEqual(cycleBodyContext({ ...input, periodDate: "2026-11-06" }, now), { cycleDay: 22, cycleLength: 28, phase: "luteal" });
  assert.deepEqual(cycleBodyContext({ ...input, history: { onboarding: { cycle: { cycleLength: 32, regularity: "Regular" } } } }, now),
    { cycleDay: 14, cycleLength: 32, phase: "follicular" });
});

test("cycle engine withholds education for ineligible or incomplete cycle data", () => {
  assert.equal(cycleBodyContext({ ...input, pregnant: true }, now), null);
  assert.equal(cycleBodyContext({ ...input, periodDate: "2026-10-01" }, now), null);
  assert.equal(cycleBodyContext({ ...input, periodDate: "2026-11-28" }, now), null);
  assert.equal(cycleBodyContext({ ...input, history: {} }, now), null);
  assert.equal(cycleBodyContext({ ...input, history: { onboarding: { cycle: { cycleLength: 28, regularity: "Irregular" } } } }, now), null);
});

test("cycle feed selects validated engine copy and retains generation provenance", () => {
  const signal = { title: "Generic signal", body: "Generic education" };
  const copy = {
    title: "Generic title", introduction: "Generic introduction", todayRead: "Generic daily education",
    hormoneTitle: "Hormones", hormoneDescription: "Illustrative only",
    temperatureTitle: "Temperature", temperatureBody: "General education",
    signalsTitle: "Signals", signals: { focus: signal, temperature: signal, metabolism: signal, hormones: signal },
    patternsTitle: "Reported information", patternsIntroduction: "Reported cycle information",
  };
  const catalogue = cycleBodyCatalogueSchema.parse({
    menstrual: copy, follicular: copy, ovulation: { ...copy, todayRead: "Ovulation education" }, luteal: copy,
  });
  const feed = assembleCycleBodyFeed(cycleBodyContext(input, now), catalogue);
  assert.equal(feed.status, "available");
  if (feed.status === "available") {
    assert.equal(feed.content.todayRead, "Ovulation education");
    assert.equal(feed.reviewStatus, "not_clinically_reviewed");
  }
  assert.equal(cycleBodyCatalogueSchema.safeParse({ menstrual: copy }).success, false);
});

test("daily endpoint reads only today's matching edition, reports pending or failure and enforces ownership", async t => {
  const app = express();
  const pool = new Pool();
  const date = cycleEditionDate();
  const currentPatient = { ...input, id: 1, periodDate: date };
  const signal = { title: "Signal", body: "Generic education" };
  const copy = {
    title: "Daily title", introduction: "Daily introduction", todayRead: "Today's saved education",
    hormoneTitle: "Hormones", hormoneDescription: "Illustrative only",
    temperatureTitle: "Temperature", temperatureBody: "General education",
    signalsTitle: "Signals", signals: { focus: signal, temperature: signal, metabolism: signal, hormones: signal },
    patternsTitle: "Reported information", patternsIntroduction: "Reported cycle information",
  };
  const catalogue = { menstrual: copy, follicular: copy, ovulation: copy, luteal: copy };
  let edition: { content: unknown; attempts: number; state: string } | undefined;
  let queries = 0;
  t.mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    queries++;
    assert.match(sql, /^SELECT /);
    if (sql.includes("FROM patients p")) return { rows: [currentPatient] };
    assert.match(sql, /edition_date=\$2/);
    assert.match(sql, /cycle_day=\$4 AND cycle_length=\$5 AND phase=\$6/);
    assert.deepEqual(values, [1, date, cycleBodyVersion, 1, 28, "menstrual"]);
    return { rows: edition ? [edition] : [] };
  });
  registerCycleBodyContent(app, pool, async req =>
    req.headers.authorization === "patient" ? { patientId: 1 } : { patientId: 2 });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (role = "patient") => fetch(`http://127.0.0.1:${address.port}/api/patients/1/cycle-body-content`, {
    headers: { Authorization: role },
  });
  try {
    assert.equal((await request("other")).status, 403);
    assert.equal(queries, 0);
    for (const pending of [undefined, { content: null, attempts: 1, state: "generating" }]) {
      edition = pending;
      const response = await request();
      assert.equal(response.status, 202);
      assert.equal(cycleBodyFeedSchema.parse(await response.json()).status, "pending");
    }
    edition = { content: null, attempts: 3, state: "failed" };
    assert.equal((await request()).status, 503);
    edition = { content: catalogue, attempts: 1, state: "ready" };
    const response = await request();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    const feed = cycleBodyFeedSchema.parse(await response.json());
    assert.equal(feed.status, "available");
    if (feed.status === "available") {
      assert.equal(feed.editionDate, date);
      assert.equal(feed.content.todayRead, copy.todayRead);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
  }
});
