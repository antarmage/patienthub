import assert from "node:assert/strict";
import test from "node:test";
import { checkDeliverableEmail } from "./email-check";

const err = (code: string) => Object.assign(new Error(code), { code });
const resolver = (mx: () => Promise<unknown[]>, a: () => Promise<unknown[]> = () => Promise.reject(err("ENOTFOUND"))) => ({ mx, a });

test("flags common provider typos without a DNS lookup", async () => {
  let looked = false;
  const result = await checkDeliverableEmail("a@GMIAL.com", resolver(async () => { looked = true; return []; }));
  assert.deepEqual(result, { ok: false, error: '"gmial.com" looks like a typo. Did you mean @gmail.com?' });
  assert.equal(looked, false);
});

test("accepts domains with a mail server or an A-record fallback", async () => {
  assert.deepEqual(await checkDeliverableEmail("a@example.org", resolver(async () => [{ exchange: "mx.example.org", priority: 10 }])), { ok: true });
  assert.deepEqual(await checkDeliverableEmail("a@example.org", resolver(() => Promise.reject(err("ENODATA")), async () => ["192.0.2.1"])), { ok: true });
});

test("rejects domains that do not exist or have no mail route", async () => {
  const result = await checkDeliverableEmail("a@no-mail.invalid", resolver(() => Promise.reject(err("ENOTFOUND"))));
  assert.equal(result.ok, false);
  assert.match((result as { error: string }).error, /cannot receive email/);
});

test("does not block sending when DNS itself is unavailable", async () => {
  assert.deepEqual(await checkDeliverableEmail("a@example.org", resolver(() => Promise.reject(err("ETIMEOUT")))), { ok: true });
});

test("checks real DNS for a known-good and a known-dead domain", { skip: !process.env.EMAIL_CHECK_LIVE }, async () => {
  assert.deepEqual(await checkDeliverableEmail("a@gmail.com"), { ok: true });
  assert.equal((await checkDeliverableEmail("a@no-such-domain-saivie-test.invalid")).ok, false);
});
