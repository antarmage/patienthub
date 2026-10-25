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
