import assert from "node:assert/strict";
import test from "node:test";
import { loadPatientConsultation, validMeetUrl } from "./onlineConsultation";

test("patient link token is sent only in a header, without login cookies; malformed and expired links fail explicitly", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/api/online/patient");
      assert.equal(new Headers(init?.headers).get("X-Consultation-Token"), "a".repeat(43));
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.cache, "no-store");
      return Response.json({ error: "Link expired" }, { status: 410 });
    };
    await assert.rejects(loadPatientConsultation("a".repeat(43)), /Link expired/);
    await assert.rejects(loadPatientConsultation("short"), /incomplete/);
    globalThis.fetch = async () => Response.json({ appointment: {}, doctor: {}, prescriptions: [], reports: [], expiresAt: "2099-01-01" });
    await assert.rejects(loadPatientConsultation("a".repeat(43)), /invalid meeting/);
  } finally { globalThis.fetch = original; }
});

test("only real Google Meet links can be joined", () => {
  assert.equal(validMeetUrl("https://meet.google.com/abc-defg-hij"), true);
  assert.equal(validMeetUrl("https://meet.google.com.evil.invalid/abc-defg-hij"), false);
  assert.equal(validMeetUrl("javascript:alert(1)"), false);
  assert.equal(validMeetUrl("https://meet.jit.si/demo"), false);
});
