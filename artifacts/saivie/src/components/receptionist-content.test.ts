import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const palette = readFileSync(new URL("./receptionist-content.css", import.meta.url), "utf8");
const portal = readFileSync(new URL("../pages/StaffPortal.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8");

test("receptionist palette is attached to the main panel for every view, not the sidebar", () => {
  assert.match(portal, /<main className=\{`[^`]*\$\{receptionist \? "receptionist-content" : ""\}/);
  assert.equal(portal.match(/receptionist-content/g)?.length, 1);
  assert.match(portal, /flex-1 overflow-y-auto p-4 md:p-6 \$\{receptionist \? "bg-saivie-page" : ""\}/);
  assert.ok(styles.includes('@import "./components/receptionist-content.css";'));
});

test("warm page and cream surfaces are scoped without overriding actions or semantic statuses", () => {
  const selectors = [...palette.matchAll(/(?:^|})\s*([^{}]+)\{/g)].map((match) => match[1].trim());
  assert.ok(selectors.length > 0);
  assert.ok(selectors.every((selector) => selector.split(",").every((part) =>
    part.trim().startsWith(".receptionist-content") || part.trim() === ".doctor-dashboard-content")));
  assert.match(palette, /--saivie-page: #faf5e6;/);
  assert.match(palette, /--saivie-ivory: #fffaf0;/);
  assert.doesNotMatch(palette, /--saivie-primary-action|--destructive|attendance-status|attendance-hero/);
});

test("doctor dashboard tabs share warm tokens but patient detail and its navigation keep their palette", () => {
  const doctor = readFileSync(new URL("../pages/ClinicianPortal.tsx", import.meta.url), "utf8");
  assert.ok(doctor.includes('${activeView !== \'patient_detail\' ? "doctor-dashboard-content" : ""}'));
  assert.ok(doctor.includes('highlight={activeView === \'patient_detail\' ? "default" : "receptionist"}'));
  assert.equal((doctor.match(/flex-1 overflow-y-auto (?:bg-saivie-page p-4 md:p-6|bg-saivie-page p-6 flex flex-col h-full|p-6 bg-saivie-page)/g) || []).length, 6);
});
