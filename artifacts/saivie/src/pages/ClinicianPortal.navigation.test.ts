import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./ClinicianPortal.tsx", import.meta.url), "utf8");
const file = ts.createSourceFile("ClinicianPortal.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes: ts.Node[] = [];
const collect = (node: ts.Node) => { nodes.push(node); ts.forEachChild(node, collect); };
collect(file);

test("patient navigation cannot open the retired detail screen", () => {
  const destinations = nodes.filter(ts.isCallExpression)
    .filter((node) => node.expression.getText(file) === "setPatientDetailTab")
    .flatMap((node) => node.arguments.filter(ts.isStringLiteral).map((argument) => argument.text));
  assert.ok(destinations.includes("medicine"));
  assert.ok(destinations.includes("investigations"));
  assert.ok(destinations.every((destination) => ["summary", "consultation", "record", "medicine", "investigations", "postop", "genome"].includes(destination)));
  assert.doesNotMatch(source, /openRecordSection|ConsultationOrderDialogs/);
});

test("quick actions open the dedicated tabs and each original layout has one rendering source", () => {
  const openings = nodes.filter((node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
    ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node));
  const findByAttribute = (name: string, value: string) => openings.filter((node) =>
    node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) &&
      attribute.name.getText(file) === name && attribute.initializer &&
      ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === value));
  const testsAction = findByAttribute("data-testid", "quick-action-tests")[0];
  const medicineAction = findByAttribute("data-testid", "quick-action-medication")[0];
  assert.ok(testsAction);
  assert.ok(medicineAction);
  assert.match(testsAction.getText(file), /setPatientDetailTab\('investigations'\)/);
  assert.match(medicineAction.getText(file), /onClick=\{openMedicine\}/);
  assert.equal(findByAttribute("id", "patient-medications").length, 1);
  assert.equal(findByAttribute("id", "patient-investigations").length, 1);
  assert.equal(findByAttribute("data-testid", "patient-medicine-tab").length, 1);
  assert.equal(findByAttribute("data-testid", "patient-investigations-tab").length, 1);
});
