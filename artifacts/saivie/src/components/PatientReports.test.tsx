import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientReportsList, reportFileLink, reportKind } from "./PatientReports";

test("reportKind recognises lab and USG documents only", () => {
  assert.equal(reportKind({ type: "Lab Report", category: "blood" }), "Lab");
  assert.equal(reportKind({ type: "lab_report", category: "Lab Report" }), "Lab");
  assert.equal(reportKind({ type: "USG Report", category: "usg" }), "USG");
  assert.equal(reportKind({ type: "Prescription", category: "prescription" }), null);
});

test("reportFileLink prefers the stored file, then a Drive link", () => {
  assert.deepEqual(reportFileLink(7, { id: 3, metadata: { patientDocumentId: 9 } }), { url: "/api/patients/7/documents/3/file", external: false });
  assert.deepEqual(reportFileLink(7, { id: 4, metadata: { driveViewUrl: "https://drive.google.com/file/d/x/view" } }), { url: "https://drive.google.com/file/d/x/view", external: true });
  assert.equal(reportFileLink(7, { id: 5, metadata: { driveViewUrl: "javascript:alert(1)" } }), null);
  assert.equal(reportFileLink(7, { id: 6, metadata: {} }), null);
});

test("PatientReportsList shows lab/USG reports newest first and skips prescriptions", () => {
  const html = renderToStaticMarkup(
    <PatientReportsList
      patientId={7}
      documents={[
        { id: 1, name: "CBC", type: "Lab Report", category: "blood", date: "2025-01-02", metadata: { patientDocumentId: 11 } },
        { id: 2, name: "Rx", type: "Prescription", category: "prescription", date: "2025-03-01" },
        { id: 3, name: "Anomaly scan", type: "USG Report", category: "usg", date: "2025-02-10", metadata: {} },
      ]}
    />,
  );
  assert.ok(html.indexOf("Anomaly scan") < html.indexOf("CBC"));
  assert.ok(!html.includes(">Rx<"));
  assert.ok(html.includes("button-view-report-1"));
  assert.ok(html.includes("No file"));
});

test("PatientReportsList empty state", () => {
  assert.ok(renderToStaticMarkup(<PatientReportsList patientId={7} documents={[]} />).includes("No lab or USG reports uploaded."));
});
