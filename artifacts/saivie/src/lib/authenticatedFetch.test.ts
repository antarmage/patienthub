import assert from "node:assert/strict";
import test from "node:test";
import { ApiResponseError, authenticatedFetch, readApiResponse, receptionRequest } from "./authenticatedFetch.ts";

test("staff token is only attached to same-origin API calls, preserving headers and multipart bodies", async (t) => {
  t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify({
    authorization: new Headers(init?.headers).get("Authorization"),
    contentType: new Headers(init?.headers).get("Content-Type"),
    custom: new Headers(init?.headers).get("X-Test"),
  }), { headers: { "Content-Type": "application/json" } }));
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { href: "https://saivie.test/staff", origin: "https://saivie.test" } } });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => "synthetic-token" } });
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window");
    if (previousStorage) Object.defineProperty(globalThis, "sessionStorage", previousStorage); else Reflect.deleteProperty(globalThis, "sessionStorage");
  });

  await t.test("API responses reject HTML fallbacks, including successful SPA responses", async () => {
    for (const status of [200, 404, 502]) {
      await assert.rejects(readApiResponse(new Response("<!DOCTYPE html><html></html>", {
        status, headers: { "Content-Type": "text/html" },
      })), /Check that \/api requests reach the API server and that the updated API is deployed/);
    }
  });

  await t.test("API responses preserve JSON authorization errors and reject malformed JSON", async () => {
    await assert.rejects(readApiResponse(new Response('{"error":"Authentication required"}', {
      status: 401, headers: { "Content-Type": "application/json" },
    })), /Authentication required/);
    await assert.rejects(readApiResponse(new Response("<!DOCTYPE html>", {
      headers: { "Content-Type": "application/json" },
    })), /API returned invalid JSON/);
    assert.deepEqual(await readApiResponse(new Response("[]", {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })), []);
    await assert.rejects(readApiResponse(Response.json({ error: "Consultation page is unavailable." }, { status: 410 })), (error: unknown) => error instanceof ApiResponseError && error.status === 410 && error.message === "Consultation page is unavailable.");
  });

  await t.test("reception requests surface unavailable transcription APIs rather than empty records", async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("<!DOCTYPE html>", {
      headers: { "Content-Type": "text/html" },
    }));
    await assert.rejects(receptionRequest("/api/patients/1/prescription-transcriptions"), /updated API is deployed/);
  });
  assert.deepEqual(await (await authenticatedFetch("/api/patients", { headers: { "X-Test": "preserved" }, body: new FormData(), method: "POST" })).json(), {
    authorization: "Bearer synthetic-token", contentType: null, custom: "preserved",
  });
  assert.equal((await (await authenticatedFetch("https://external.test/api/patients")).json()).authorization, null);
  assert.equal((await (await authenticatedFetch("/assets/logo.png")).json()).authorization, null);
  assert.equal((await (await authenticatedFetch("/api/patients", { headers: { Authorization: "Bearer explicit-token" } })).json()).authorization, "Bearer explicit-token");
});
