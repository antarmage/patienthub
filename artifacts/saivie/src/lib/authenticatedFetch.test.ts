import assert from "node:assert/strict";
import test from "node:test";
import { authenticatedFetch } from "./authenticatedFetch.ts";

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
  assert.deepEqual(await (await authenticatedFetch("/api/patients", { headers: { "X-Test": "preserved" }, body: new FormData(), method: "POST" })).json(), {
    authorization: "Bearer synthetic-token", contentType: null, custom: "preserved",
  });
  assert.equal((await (await authenticatedFetch("https://external.test/api/patients")).json()).authorization, null);
  assert.equal((await (await authenticatedFetch("/assets/logo.png")).json()).authorization, null);
  assert.equal((await (await authenticatedFetch("/api/patients", { headers: { Authorization: "Bearer explicit-token" } })).json()).authorization, "Bearer explicit-token");
});
