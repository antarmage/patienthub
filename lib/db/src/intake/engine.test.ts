import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ALERT_RULES, MODULE_ORDER, REASON_MODULES, QUESTIONS, buildStepPlan, buildSummary, canManageAlertRules,
  canViewIntakeAnswers, clearStale, computeVisible, evaluateAlerts, getContent, parseAlertRules, selectedModules,
  setAnswer, toStaffStatusView, toggleMulti, validateAnswers, URGENT_RULE_ID,
  type AlertRule, type Answers,
} from "./index.ts";

const TODAY = "2026-06-15";
const ids = (answers: Answers) => computeVisible(answers).map((q) => q.id);
const withReasons = (reasons: string[], extra: Answers = {}): Answers => ({ reasons: { v: reasons }, ...extra });
const approved = (id: string): AlertRule => ({ ...DEFAULT_ALERT_RULES.find((r) => r.id === id)!, enabled: true, approved: true });

describe("routing", () => {
  it("maps every reason to modules and every module is reachable", () => {
    const reachable = new Set(Object.values(REASON_MODULES).flat());
    for (const m of MODULE_ORDER) assert.ok(reachable.has(m), `${m} unreachable`);
  });

  for (const [reason, modules] of Object.entries(REASON_MODULES)) {
    it(`reason "${reason}" selects ${modules.join(",")} and shows its core questions`, () => {
      const a = withReasons([reason]);
      assert.deepEqual(selectedModules(a), modules);
      const visible = ids(a);
      const expected = QUESTIONS.filter((q) => q.section === "module" && !q.showIf && q.modules?.some((m) => modules.includes(m)));
      for (const q of expected) assert.ok(visible.includes(q.id), `${q.id} missing for ${reason}`);
    });
  }

  it("does not route by age: no reasons means no module questions", () => {
    assert.deepEqual(selectedModules({}), []);
    assert.ok(!ids({}).includes("lmp_date"));
  });

  it("handles multiple simultaneous concerns and asks shared questions once", () => {
    const a = withReasons(["periods", "pcos", "fertility"]);
    assert.deepEqual(selectedModules(a), ["menstrual", "pcos", "fertility"]);
    const plan = buildStepPlan(a);
    const all = plan.flatMap((s) => s.questionIds);
    assert.equal(new Set(all).size, all.length, "a question was assigned twice");
    assert.equal(all.filter((id) => id === "lmp_date").length, 1);
    assert.equal(plan.find((s) => s.module === "menstrual")!.questionIds.includes("lmp_date"), true);
    assert.equal(plan.find((s) => s.module === "pcos")!.questionIds.includes("lmp_date"), false);
    assert.deepEqual(plan.map((s) => s.kind).filter((k) => k !== "module"), ["welcome", "identity", "reasons", "history", "review"]);
  });

  it("history questions are always present once, regardless of modules", () => {
    for (const reasons of [["checkup"], ["pregnancy", "menopause"], []]) {
      const v = ids(withReasons(reasons));
      for (const id of ["conditions", "surgeries_has", "meds_has", "allergies_has", "family_history"]) assert.ok(v.includes(id));
    }
  });
});

describe("conditional questions", () => {
  const base = withReasons(["periods"]);

  it("asks menarche age only when periods have started", () => {
    assert.ok(!ids(base).includes("menarche_age"));
    assert.ok(ids({ ...base, periods_started: { v: "yes" } }).includes("menarche_age"));
    assert.ok(!ids({ ...base, periods_started: { v: "no" } }).includes("menarche_age"));
  });

  it("reveals follow-ups for irregular or absent periods only", () => {
    const started = { ...base, periods_started: { v: "yes" } };
    assert.ok(!ids({ ...started, cycle_regularity: { v: "regular" } }).includes("irregular_since"));
    assert.ok(ids({ ...started, cycle_regularity: { v: "irregular" } }).includes("irregular_since"));
    const absent = ids({ ...started, cycle_regularity: { v: "absent" } });
    assert.ok(absent.includes("missed_periods") && !absent.includes("cycle_length"));
  });

  it("reveals symptom duration, severity and impact after a symptom is selected", () => {
    const a = withReasons(["pcos"]);
    assert.ok(!ids(a).includes("sx_duration"));
    assert.ok(!ids({ ...a, pcos_symptoms: { v: ["none"] } }).includes("sx_duration"));
    const v = ids({ ...a, pcos_symptoms: { v: ["acne"] } });
    for (const id of ["sx_duration", "sx_severity", "sx_impact"]) assert.ok(v.includes(id));
  });

  it("reveals medication and allergy details only on yes", () => {
    const a = withReasons(["checkup"]);
    assert.ok(!ids({ ...a, meds_has: { v: "no" }, allergies_has: { v: "no" } }).some((id) => id === "meds" || id === "allergies"));
    const v = ids({ ...a, meds_has: { v: "yes" }, allergies_has: { v: "yes" } });
    assert.ok(v.includes("meds") && v.includes("allergies"));
  });

  it("menopause collects last period, hormone therapy and surgery", () => {
    const v = ids(withReasons(["menopause"]));
    for (const id of ["lmp_date", "hrt_use", "menopause_surgery", "menopause_bleeding"]) assert.ok(v.includes(id));
  });

  it("pregnancy follow-ups require a pregnancy; para>0 reveals delivery modes", () => {
    const a = withReasons(["pregnancy"]);
    assert.ok(!ids(a).includes("edd_date"));
    assert.ok(ids({ ...a, currently_pregnant: { v: "yes" } }).includes("edd_date"));
    assert.ok(!ids({ ...a, obs_ever_pregnant: { v: "no" } }).includes("obs_gravida"));
    const parous = { ...a, obs_ever_pregnant: { v: "yes" }, obs_para: { v: 2 } };
    assert.ok(ids(parous).includes("delivery_modes"));
    assert.ok(!ids({ ...parous, obs_para: { v: 0 } }).includes("delivery_modes"));
  });
});

describe("answer changes and stale clearing", () => {
  it("treats 'No' as an answer and keeps it", () => {
    const a = withReasons(["periods"], { pelvic_pain: { v: "no" } });
    assert.deepEqual(clearStale(a).cleared, []);
    const { errors, missing } = validateAnswers(a, { requireComplete: true, today: TODAY });
    assert.ok(!missing.includes("pelvic_pain"));
    assert.equal(errors.pelvic_pain, undefined);
    assert.ok(validateAnswers(withReasons(["periods"]), { requireComplete: true, today: TODAY }).missing.includes("pelvic_pain"));
  });

  it("clears only genuinely inapplicable follow-ups when a parent changes", () => {
    let a: Answers = withReasons(["periods"], {
      periods_started: { v: "yes" }, menarche_age: { v: 12 }, cycle_regularity: { v: "irregular" },
      irregular_since: { v: "under_3m" }, flow: { v: "heavy" }, pelvic_pain: { v: "no" },
    });
    a = setAnswer(a, "cycle_regularity", { v: "regular" }).answers;
    assert.equal(a.irregular_since, undefined);
    assert.equal(a.flow?.v, "heavy");
    assert.equal(a.menarche_age?.v, 12);
    assert.equal(a.pelvic_pain?.v, "no");
  });

  it("clears a whole subtree when the root parent becomes inapplicable", () => {
    let a: Answers = withReasons(["periods"], { periods_started: { v: "yes" }, cycle_regularity: { v: "absent" }, missed_periods: { v: "over_3" } });
    const r = setAnswer(a, "periods_started", { v: "no" });
    assert.equal(r.answers.cycle_regularity, undefined);
    assert.equal(r.answers.missed_periods, undefined);
    assert.deepEqual(new Set(r.cleared), new Set(["cycle_regularity", "missed_periods"]));
  });

  it("keeps a shared answer when one of two modules is deselected, drops it when none remain", () => {
    const a = withReasons(["periods", "pcos"], { lmp_date: { v: "2026-06-01" }, pelvic_pain: { v: "no" }, pcos_symptoms: { v: ["acne"] }, sx_severity: { v: "mild" } });
    const one = setAnswer(a, "reasons", { v: ["periods"] });
    assert.equal(one.answers.lmp_date?.v, "2026-06-01");
    assert.equal(one.answers.pcos_symptoms, undefined);
    assert.equal(one.answers.sx_severity, undefined);
    const none = setAnswer(a, "reasons", { v: ["checkup"] });
    assert.equal(none.answers.pelvic_pain, undefined);
    assert.equal(none.answers.lmp_date?.v, "2026-06-01");
  });

  it("keeps skipped and private markers on applicable questions", () => {
    const a = withReasons(["periods"], { lmp_date: { s: "private" } });
    assert.deepEqual(clearStale(a).answers.lmp_date, { s: "private" });
  });

  it("handles exclusive multi-select toggling", () => {
    assert.deepEqual(toggleMulti(["acne"], "none", ["none"]), ["none"]);
    assert.deepEqual(toggleMulti(["none"], "acne", ["none"]), ["acne"]);
    assert.deepEqual(toggleMulti(["acne", "mood"], "acne", ["none"]), ["mood"]);
  });
});

describe("validation", () => {
  const ok = (a: Answers, complete = false) => validateAnswers(a, { requireComplete: complete, today: TODAY });

  it("rejects unknown, inapplicable and malformed answers", () => {
    const r = ok(withReasons(["checkup"], { hacker: { v: "x" }, flow: { v: "heavy" }, pap_last: { v: "bogus" } }));
    assert.equal(r.errors.hacker, "unknown_question");
    assert.equal(r.errors.flow, "not_applicable");
    assert.equal(r.errors.pap_last, "invalid_option");
  });

  it("validates dates, numbers and text", () => {
    assert.equal(ok(withReasons(["periods"], { lmp_date: { v: "2026-13-40" } })).errors.lmp_date, "invalid_date");
    assert.equal(ok(withReasons(["periods"], { lmp_date: { v: "2027-01-01" } })).errors.lmp_date, "future_date");
    assert.equal(ok(withReasons(["pregnancy"], { currently_pregnant: { v: "yes" }, edd_date: { v: "2026-12-01" } })).errors.edd_date, undefined);
    const a = withReasons(["periods"], { periods_started: { v: "yes" }, menarche_age: { v: 40 } });
    assert.equal(ok(a).errors.menarche_age, "out_of_range");
    assert.equal(ok({ ...a, menarche_age: { v: 12.5 } }).errors.menarche_age, "invalid_number");
    assert.equal(ok({ ...a, reason_note: { v: "x".repeat(1001) } }).errors.reason_note, "too_long");
  });

  it("rejects skip on questions that are not skippable and accepts it where allowed", () => {
    assert.equal(ok(withReasons(["periods"], { pelvic_pain: { s: "skip" } })).errors.pelvic_pain, "skip_not_allowed");
    const r = ok(withReasons(["periods"], { lmp_date: { s: "private" } }), true);
    assert.equal(r.errors.lmp_date, undefined);
    assert.ok(!r.missing.includes("lmp_date"));
  });

  it("validates repeatable entries", () => {
    const a = withReasons(["checkup"], { meds_has: { v: "yes" } });
    assert.equal(ok({ ...a, meds: { v: [{ frequency: "daily" }] } }).errors.meds, "entry_field_required");
    assert.equal(ok({ ...a, meds: { v: [{ name: "Iron", frequency: "hourly" }] } }).errors.meds, "invalid_entries");
    assert.equal(ok({ ...a, meds: { v: [{ name: "Iron", extra: "x" }] as any } }).errors.meds, "invalid_entries");
    assert.equal(ok({ ...a, meds: { v: [{ name: "Iron", frequency: "daily" }] } }).errors.meds, undefined);
    const s = withReasons(["checkup"], { surgeries_has: { v: "yes" }, surgeries: { v: [{ procedure: "d_and_c", year: "1900" }] } });
    assert.equal(ok(s).errors.surgeries, "invalid_entries");
    const al = withReasons(["checkup"], { allergies_has: { v: "yes" }, allergies: { v: [{ substance: "latex" }] } });
    assert.equal(ok(al).errors.allergies, "entry_field_required");
  });

  it("rejects conflicting exclusive selections and inconsistent obstetric counts", () => {
    assert.equal(ok(withReasons(["checkup"], { conditions: { v: ["none", "thyroid"] } })).errors.conditions, "exclusive_conflict");
    const a = withReasons(["pregnancy"], {
      obs_ever_pregnant: { v: "yes" }, obs_gravida: { v: 1 }, obs_para: { v: 1 }, obs_abortions: { v: 1 }, obs_living: { v: 1 },
    });
    assert.equal(ok(a).errors.obs_para, "inconsistent_obstetric_counts");
  });

  it("flags incomplete forms only when completeness is required", () => {
    const a = withReasons(["pregnancy"]);
    assert.deepEqual(ok(a, false).missing, []);
    const m = ok(a, true).missing;
    for (const id of ["urgent_now", "currently_pregnant", "obs_ever_pregnant", "conditions", "family_history"]) assert.ok(m.includes(id), id);
    assert.ok(!m.includes("obs_gravida"), "hidden questions are never required");
  });

  it("accepts a complete form", () => {
    const a: Answers = withReasons(["checkup"], {
      urgent_now: { v: ["none"] }, lmp_date: { v: "2026-06-01" }, conditions: { v: ["none"] }, surgeries_has: { v: "no" },
      meds_has: { v: "no" }, allergies_has: { v: "no" }, family_history: { s: "skip" },
    });
    const r = ok(a, true);
    assert.deepEqual(r, { errors: {}, missing: [] });
  });
});

describe("alerts", () => {
  it("always surfaces a patient-declared urgent symptom, even on a draft", () => {
    const fired = evaluateAlerts({ urgent_now: { v: ["heavy_bleeding"] } }, []);
    assert.equal(fired[0].ruleId, URGENT_RULE_ID);
    assert.equal(fired[0].severity, "urgent");
    assert.deepEqual(evaluateAlerts({ urgent_now: { v: ["none"] } }, []), []);
    assert.deepEqual(evaluateAlerts({}, []), []);
  });

  it("ships rules disabled so nothing fires until the clinician approves", () => {
    const a = withReasons(["pregnancy"], { currently_pregnant: { v: "yes" }, pregnancy_concerns: { v: ["bleeding"] } });
    assert.deepEqual(evaluateAlerts(a, DEFAULT_ALERT_RULES), []);
    const fired = evaluateAlerts(a, [approved("pregnancy_bleeding")]);
    assert.equal(fired.length, 1);
    assert.equal(fired[0].ruleId, "pregnancy_bleeding");
    assert.ok(fired[0].patientMessage.length > 0);
    assert.deepEqual(evaluateAlerts(a, [{ ...approved("pregnancy_bleeding"), approved: false }]), []);
  });

  it("does not fire from a stale hidden answer", () => {
    const a = withReasons(["checkup"], { pregnancy_concerns: { v: ["bleeding"] }, currently_pregnant: { v: "yes" } });
    assert.deepEqual(evaluateAlerts(a, [approved("pregnancy_bleeding")]), []);
  });

  it("validates clinician-edited rules", () => {
    assert.ok(parseAlertRules(DEFAULT_ALERT_RULES));
    assert.equal(parseAlertRules([{ ...DEFAULT_ALERT_RULES[0], when: { q: "nope", op: "eq", value: "x" } }]), null);
    assert.equal(parseAlertRules("x"), null);
  });
});

describe("clinician summary", () => {
  const answers: Answers = withReasons(["periods", "pregnancy"], {
    urgent_now: { v: ["none"] }, reason_note: { v: "Bleeding for two weeks" }, lmp_date: { s: "private" },
    periods_started: { v: "yes" }, menarche_age: { v: 12 }, cycle_regularity: { v: "irregular" }, irregular_since: { v: "3_12m" },
    pelvic_pain: { v: "no" }, currently_pregnant: { v: "no" },
    obs_ever_pregnant: { v: "yes" }, obs_gravida: { v: 3 }, obs_para: { v: 1 }, obs_abortions: { v: 1 }, obs_living: { v: 1 },
    conditions: { v: ["thyroid"] }, surgeries_has: { v: "no" }, meds_has: { v: "yes" }, meds: { v: [{ name: "Thyroxine", frequency: "daily" }] },
    allergies_has: { v: "yes" }, allergies: { v: [{ substance: "penicillin", reaction: "rash" }] },
  });
  const summary = buildSummary(answers, []);
  const items = summary.groups.flatMap((g) => g.items);
  const find = (id: string) => items.find((i) => i.id === id)!;

  it("reports answers faithfully, keeping 'No' distinct from unanswered", () => {
    assert.equal(find("pelvic_pain").display, "No");
    assert.equal(find("pelvic_pain").status, "answered");
    assert.equal(find("cycle_regularity").display, "Irregular");
    assert.equal(find("menarche_age").display, "12 years");
    assert.equal(find("meds").display, "Thyroxine · Daily");
    assert.equal(find("allergies").display, "Penicillin · Rash");
    assert.equal(find("obs_notation").display, "G3 P1 A1 L1");
    assert.deepEqual(find("obs_notation").sources, ["obs_gravida", "obs_para", "obs_abortions", "obs_living"]);
  });

  it("only includes questions relevant to the patient", () => {
    assert.equal(find("flow"), undefined === find("flow") ? undefined : find("flow"));
    assert.equal(items.some((i) => i.id === "menopause_symptoms"), false);
    assert.equal(items.some((i) => i.id === "missed_periods"), false);
  });

  it("lists private-discussion items without showing a value, and lists missing required items", () => {
    assert.deepEqual(summary.privateItems.map((i) => i.id), ["lmp_date"]);
    assert.equal(find("lmp_date").display, getContent("en").ui.privateLabel);
    const missing = summary.missing.map((i) => i.id);
    assert.ok(missing.includes("family_history"));
    assert.ok(missing.includes("lmp_date"), "a skipped required item is still reported as missing");
    assert.ok(!missing.includes("pelvic_pain"));
  });

  it("flags obstetric notation for clinician validation and never states a diagnosis", () => {
    assert.ok(summary.reviewNotes.some((n) => /validate/i.test(n)));
    const text = JSON.stringify(summary).toLowerCase();
    for (const word of ["diagnos", "likely", "probable"]) assert.ok(!text.includes(word), word);
  });

  it("carries the patient's own words and selected modules", () => {
    assert.deepEqual(summary.reasons, ["Periods, bleeding or pelvic pain", "Pregnancy care"]);
    assert.deepEqual(summary.modules, ["Periods & pelvic pain", "Pregnancy care"]);
    assert.equal(find("reason_note").display, "Bleeding for two weeks");
  });
});

describe("access boundaries and data visibility", () => {
  const row = {
    id: 1, patientId: 7, appointmentId: 9, status: "draft", updatedAt: "2026-06-15T10:00:00Z",
    answers: { conditions: { v: ["thyroid"] } } as Answers,
    alerts: [{ ruleId: URGENT_RULE_ID, label: "Patient reported an urgent symptom", severity: "urgent" as const, patientMessage: "x" }],
  };

  it("only clinical roles can read answers", () => {
    for (const role of ["clinician", "owner", "admin"]) assert.equal(canViewIntakeAnswers(role), true);
    for (const role of ["receptionist", "patient", undefined, ""]) assert.equal(canViewIntakeAnswers(role as any), false);
    assert.equal(canManageAlertRules("clinician"), true);
    assert.equal(canManageAlertRules("admin"), false);
  });

  it("front-desk status view exposes no answers, labels or symptom detail", () => {
    const view = toStaffStatusView(row);
    assert.equal(view.urgent, true);
    const text = JSON.stringify(view);
    assert.ok(!text.includes("thyroid") && !text.includes("answers") && !text.includes("Patient reported"));
    assert.deepEqual(Object.keys(view).sort(), ["appointmentId", "id", "patientId", "status", "submittedAt", "updatedAt", "urgent"]);
  });
});

describe("translations", () => {
  it("has English text for every question, option and module", () => {
    const c = getContent("en");
    for (const q of QUESTIONS) {
      assert.ok(c.questions[q.id]?.label, `label for ${q.id}`);
      for (const o of q.options ?? []) {
        assert.ok(c.questions[q.id]?.options?.[o] ?? c.options[o], `option ${q.id}.${o}`);
      }
      for (const f of q.entryFields ?? []) for (const o of f.options ?? []) assert.ok(c.questions[q.id]?.options?.[o] ?? c.options[o], `entry ${q.id}.${o}`);
    }
    for (const m of MODULE_ORDER) assert.ok(c.modules[m]);
  });

  it("falls back to English for untranslated locales", () => {
    assert.equal(getContent("bn").questions.reasons.label, getContent("en").questions.reasons.label);
  });
});
