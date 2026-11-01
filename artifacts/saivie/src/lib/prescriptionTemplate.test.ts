import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import { generatePrescriptionHTML, type PrescriptionData } from "./prescriptionTemplate";

const browserGlobals = ["document", "getComputedStyle"] as const;
const descriptors = browserGlobals.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
before(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: {} } });
  Object.defineProperty(globalThis, "getComputedStyle", { configurable: true, value: () => ({ getPropertyValue: () => "#ffffff" }) });
});
after(() => {
  browserGlobals.forEach((name, index) => {
    const descriptor = descriptors[index];
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  });
});

const prescription: PrescriptionData = {
  providerName: "Doctor", providerSpecialty: "",
  patient: { name: "Patient", age: 30, phone: "", address: "" },
  vitals: {}, pregnancyInfo: "", chiefComplaint: "", clinicalFindings: "",
  observation: "", assessment: "", diagnosis: "", investigations: [],
  advice: "", nextFollowUp: "", nextVaccinationDate: "",
  medications: [{ name: "Example", dose: "5 mg", frequency: "Daily", duration: "7 days", instructions: "After food", route: "Oral", notes: "" }],
};

it("prints saved medicine duration and administration details in the correct columns", () => {
  const html = generatePrescriptionHTML(prescription);
  assert.ok(html.includes('class="med-dosage">5 mg / Daily</td>'));
  assert.ok(html.includes('class="med-duration">7 days</td>'));
  assert.ok(html.includes("After food"));
  assert.ok(html.includes("Oral"));
});

it("escapes medicine details instead of treating them as print markup", () => {
  const html = generatePrescriptionHTML({
    ...prescription,
    medications: [{ name: "<script>example</script>", dose: "5 mg", frequency: "Daily", instructions: "<b>After food</b>", notes: "" }],
  });
  assert.ok(html.includes("&lt;script&gt;example&lt;/script&gt;"));
  assert.ok(html.includes("&lt;b&gt;After food&lt;/b&gt;"));
  assert.ok(!html.includes("<script>example</script>"));
});
it("includes escaped guided history and default branding without requiring an uploaded logo", () => {
  const html = generatePrescriptionHTML({ ...prescription, history: "When did symptoms begin? Today <review>" });
  assert.ok(html.includes("<h2>History</h2>"));
  assert.ok(html.includes("Today &lt;review&gt;"));
  assert.ok(html.includes('class="logo-name">SAIVIE'));
});
  it("prints full A4 letterhead with the selected visit date and escaped clinical data", () => {
    const html = generatePrescriptionHTML({
      ...prescription, providerQualification: "MBBS, DNB", providerRegistration: "123 / Council",
      clinicName: "Clinic", clinicPhone: "0000000000", date: "2026-08-12",
      chiefComplaint: "<script>complaint</script>", clinicalFindings: "<b>finding</b>",
      advice: "Review <tomorrow>", investigations: ["USG <scan>"],
      patient: { ...prescription.patient, name: "<Patient>" },
    });
    assert.ok(html.includes("size:A4 portrait"));
    assert.ok(html.includes("12 Aug 2026"));
    assert.ok(html.includes("MBBS, DNB") && html.includes("123 / Council"));
    assert.ok(html.includes("For appointments: 0000000000"));
    for (const text of ["&lt;Patient&gt;", "&lt;script&gt;complaint&lt;/script&gt;", "&lt;b&gt;finding&lt;/b&gt;", "USG &lt;scan&gt;"]) assert.ok(html.includes(text));
    assert.ok(!html.includes("letterhead-spacer"));
    assert.ok(html.includes('class="left"') && html.includes('class="right"'));
  });

  it("marks unsaved drafts and preserves long notes without clipping rules", () => {
    const notes = "Detailed finding\n".repeat(150);
    const html = generatePrescriptionHTML({ ...prescription, draft: true, clinicalFindings: notes });
    assert.ok(html.includes("DRAFT") && html.includes(notes));
    assert.ok(!html.includes("overflow:hidden"));
    assert.ok(!html.includes('onclick="window.print()"'));
    assert.ok(!generatePrescriptionHTML(prescription, { printButton: false }).includes('onclick="window.print()"'));
  });
