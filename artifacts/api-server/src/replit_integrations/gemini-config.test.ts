import assert from "node:assert/strict";
import test from "node:test";
import { GoogleGenAI } from "@google/genai";
import { geminiConfig } from "./gemini-config";

async function requestUrl(config: NonNullable<ReturnType<typeof geminiConfig>>) {
  const originalFetch = globalThis.fetch;
  let url = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    url = String(input instanceof Request ? input.url : input);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), {
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await new GoogleGenAI(config).models.generateContent({ model: "gemini-2.5-flash", contents: "hi" });
  } finally {
    globalThis.fetch = originalFetch;
  }
  return url;
}

test("is unavailable without either key", () => {
  assert.equal(geminiConfig({}), null);
  assert.equal(geminiConfig({ GEMINI_API_KEY: "  " }), null);
});

test("uses a direct GEMINI_API_KEY against Google's versioned endpoint", async () => {
  const config = geminiConfig({ GEMINI_API_KEY: "direct-test-key" }, 5000);
  assert.ok(config);
  assert.equal(config.apiKey, "direct-test-key");
  assert.equal(config.httpOptions.timeout, 5000);
  const url = await requestUrl(config);
  assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent/);
});

test("prefers the Replit proxy key with its unversioned base URL", async () => {
  const config = geminiConfig({
    AI_INTEGRATIONS_GEMINI_API_KEY: "proxy-test-key",
    AI_INTEGRATIONS_GEMINI_BASE_URL: "https://proxy.test",
    GEMINI_API_KEY: "direct-test-key",
  });
  assert.ok(config);
  assert.equal(config.apiKey, "proxy-test-key");
  assert.match(await requestUrl(config), /^https:\/\/proxy\.test\/models\/gemini-2\.5-flash:generateContent/);
});
