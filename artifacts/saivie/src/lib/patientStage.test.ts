import assert from "node:assert/strict";
import test from "node:test";
import {
  getSavedPatientMode,
  patientStageForMode,
  patientStageStorageKey,
  savePatientMode,
} from "./patientStage.ts";

test("patient modes map to the matching selectable stage", () => {
  assert.equal(patientStageForMode("general"), "periods");
  assert.equal(patientStageForMode("ttc"), "periods");
  assert.equal(patientStageForMode("ivf"), "periods");
  assert.equal(patientStageForMode("pregnancy"), "pregnancy");
  assert.equal(patientStageForMode("postpartum"), "postpartum");
  assert.equal(patientStageForMode("menopause"), "menopause");
});

test("patient stage preference is stored and rejects unknown saved modes", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  savePatientMode(storage, 42, "postpartum");
  assert.equal(patientStageStorageKey(42), "saiviePatientStage:42");
  assert.equal(getSavedPatientMode(storage, 42), "postpartum");

  values.set(patientStageStorageKey(42), "not-a-stage");
  assert.equal(getSavedPatientMode(storage, 42), null);
});
