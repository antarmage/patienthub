import assert from "node:assert/strict";
import test from "node:test";
import { startStaffSessionRenewal, SESSION_RENEWAL_INTERVAL_MS } from "./staffSessionRenewal";

test("browser renews background sessions during clinic hours and visible sessions outside, with cleanup and explicit errors", async (t) => {
  const previous = ["window", "document", "sessionStorage"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const document = Object.assign(new EventTarget(), { visibilityState: "hidden" });
  let interval: (() => void) | undefined;
  let cleared = false;
  const browser = Object.assign(new EventTarget(), {
    location: { href: "https://saivie.test/staff", origin: "https://saivie.test" },
    setInterval(callback: () => void, milliseconds: number) { assert.equal(milliseconds, SESSION_RENEWAL_INTERVAL_MS); interval = callback; return 1; },
    clearInterval() { cleared = true; },
  });
  const tokens = new Map([["billing_staff_token", "synthetic-renewal-test"], ["desk_token", "synthetic-owner-test"]]);
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key: string) => tokens.get(key) ?? null } });
  t.after(() => {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });
  let now = Date.parse("2026-11-14T12:00:00+05:30");
  t.mock.method(Date, "now", () => now);
  const requests: { visible: boolean; token: string | null }[] = [];
  let networkFailure = false;
  let invalidResponse = false;
  let status = 200;
  t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (networkFailure) throw new TypeError("Synthetic offline failure");
    requests.push({ visible: JSON.parse(String(init?.body)).visible, token: new Headers(init?.headers).get("Authorization") });
    return Response.json(invalidResponse ? {} : { expiresAt: "2026-11-14T16:00:00Z" }, { status });
  });
  const errors: string[] = [];
  t.mock.method(console, "warn", () => {});
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  const stop = startStaffSessionRenewal((error) => errors.push(error));
  t.after(stop);
  await flush();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map((request) => request.visible), [false, false]);
  assert.deepEqual(requests.map((request) => request.token), ["Bearer synthetic-renewal-test", "Bearer synthetic-owner-test"]);
  assert.equal(errors.at(-1), "");
  now = Date.parse("2026-11-14T22:00:00+05:30");
  interval!();
  await flush();
  assert.equal(requests.length, 2);
  document.visibilityState = "visible";
  document.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(requests.length, 4);
  assert.ok(requests.slice(2).every((request) => request.visible));
  tokens.set("desk_token", "synthetic-renewal-test");
  browser.dispatchEvent(new Event("focus"));
  await flush();
  assert.equal(requests.length, 5, "deduplicates the same session in both keys");
  await t.test("overlapping timers are guarded and an old rejection cannot affect a new login", async (t) => {
    let complete: ((response: Response) => void) | undefined;
    let calls = 0;
    t.mock.method(globalThis, "fetch", () => {
      calls++;
      return new Promise<Response>((resolve) => { complete = resolve; });
    });
    interval!();
    await flush();
    browser.dispatchEvent(new Event("focus"));
    interval!();
    assert.equal(calls, 1);
    tokens.set("billing_staff_token", "synthetic-new-renewal-test");
    tokens.delete("desk_token");
    complete!(Response.json({ error: "Old session expired" }, { status: 401 }));
    await flush();
    assert.equal(errors.at(-1), "");
    tokens.set("billing_staff_token", "synthetic-renewal-test");
    tokens.set("desk_token", "synthetic-renewal-test");
  });
  networkFailure = true;
  interval!(); await flush();
  assert.match(errors.at(-1)!, /Session renewal failed: Synthetic offline failure/);
  networkFailure = false;
  invalidResponse = true;
  interval!(); await flush();
  assert.match(errors.at(-1)!, /Session renewal failed: Session renewal returned an invalid expiry/);
  invalidResponse = false;
  interval!(); await flush();
  assert.equal(errors.at(-1), "");
  status = 401;
  interval!(); await flush();
  assert.match(errors.at(-1)!, /expired/);
  const count = requests.length;
  interval!(); await flush();
  assert.equal(requests.length, count, "invalid credentials cannot renew again");
  stop();
  assert.ok(cleared);
  browser.dispatchEvent(new Event("focus"));
  document.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(requests.length, count);
});
