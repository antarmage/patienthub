import assert from "node:assert/strict";
import test from "node:test";
import { onboardingFetch } from "./onboardingSession";
import { ApiResponseError, readApiResponse } from "./authenticatedFetch";

test("onboarding capability stays in a header with no login credentials on reads and submissions", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { hash: `#${"a".repeat(43)}` } } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window"); });
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input).includes("a".repeat(43)), false);
    assert.equal(new Headers(init?.headers).get("X-Onboarding-Token"), "a".repeat(43));
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.cache, "no-store");
    return Response.json({ error: "Private link expired" }, { status: 410 });
  });
  for (const init of [{}, { method: "POST", body: "{}" }]) {
    await assert.rejects(readApiResponse(await onboardingFetch("/api/onboarding", init)), (error: unknown) => error instanceof ApiResponseError && error.status === 410);
  }
});
