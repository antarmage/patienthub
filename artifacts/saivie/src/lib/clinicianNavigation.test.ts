import assert from "node:assert/strict";
import test from "node:test";
import { clinicianNavigationSearch, readClinicianNavigation } from "./clinicianNavigation.ts";

test("refresh restores the consultation examination and appointment URL", () => {
  const search = clinicianNavigationSearch("", {
    view: "patient_detail", patientId: 991, appointmentId: 882, tab: "consultation", step: "examine",
  });
  assert.deepEqual(readClinicianNavigation(search), { view: "patient_detail", tab: "consultation", step: "examine" });
  assert.equal(new URLSearchParams(search).get("appointmentId"), "882");
});

test("patient links default to summary and invalid sections are not restored", () => {
  assert.deepEqual(readClinicianNavigation("patientId=991&tab=invalid&step=invalid"), {
    view: "patient_detail", tab: "summary", step: "reason",
  });
});

test("pregnancy vaccine tab survives refresh in the patient URL", () => {
  const search = clinicianNavigationSearch("", {
    view: "patient_detail", patientId: 991, tab: "vaccines", step: "reason",
  });
  assert.deepEqual(readClinicianNavigation(search), {
    view: "patient_detail", tab: "vaccines", step: "reason",
  });
});

test("leaving patient details removes stale patient navigation without dropping unrelated parameters", () => {
  const search = clinicianNavigationSearch("patientId=991&appointmentId=882&tab=consultation&step=examine&filter=today", {
    view: "patient_list", tab: "summary", step: "reason",
  });
  assert.equal(search, "filter=today&view=patient_list");
  assert.equal(readClinicianNavigation(search).view, "patient_list");
});

test("switching patients and tabs does not retain a previous examination step", () => {
  const search = clinicianNavigationSearch("patientId=991&appointmentId=882&tab=consultation&step=examine", {
    view: "patient_detail", patientId: 992, tab: "summary", step: "reason",
  });
  assert.equal(search, "patientId=992&tab=summary");
});

test("Google Meet connection return still opens settings", () => {
  assert.equal(readClinicianNavigation("googleMeet=connected").view, "settings");
});
