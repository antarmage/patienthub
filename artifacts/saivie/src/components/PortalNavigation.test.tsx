import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutDashboard, Users } from "lucide-react";
import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalNavigation, navigationPreferenceKey } from "./PortalNavigation";

const items = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, active: true, onSelect() {}, testId: "nav-dashboard" },
  { id: "patients", label: "Patients", icon: Users, active: false, onSelect() {}, badge: <span>3</span> },
];
test("shared navigation preserves named destinations, active state, badges, footer and labelled mobile trigger", () => {
  const client = new QueryClient();
  client.setQueryData(["/api/invoice-template"], { logoUrl: null });
  const html = renderToStaticMarkup(<QueryClientProvider client={client}><PortalNavigation label="Staff navigation" items={items} footer={(expanded) => <span>{expanded ? "Account" : "A"}</span>} /></QueryClientProvider>);
  assert.ok(html.includes('aria-label="Staff navigation"'));
  assert.ok(html.includes('aria-label="Dashboard" aria-current="page"'));
  assert.ok(html.includes('aria-label="Patients"'));
  assert.ok(html.includes('data-testid="nav-dashboard"'));
  assert.ok(html.includes(">3</span>"));
  assert.ok(html.includes(">Account</span>"));
  assert.ok(html.includes('aria-label="Collapse navigation"'));
  assert.ok(html.includes('aria-label="Open staff navigation"'));
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.equal(navigationPreferenceKey, "saivie.navigation.expanded");
  client.clear();
});

test("focused clinical view can hide primary navigation", () => {
  assert.equal(renderToStaticMarkup(<PortalNavigation label="Clinician navigation" items={items} footer={() => null} hidden />), "");
});

test("collapsed navigation uses the fixed favicon SVG while expanded navigation keeps the clinic logo", () => {
  const source = readFileSync(new URL("./PortalNavigation.tsx", import.meta.url), "utf8");
  assert.match(source, /open \? <BrandLogo fallback="S" className="h-14 w-32" \/> :\s*<img src="\/favicon\.svg" alt="Saivie" className="h-10 w-10 object-contain" \/>/);
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.ok(html.includes('href="/favicon.svg"'));
});

test("receptionist highlight is opt-in and reaches the desktop connector and mobile drawer", () => {
  const client = new QueryClient();
  client.setQueryData(["/api/invoice-template"], { logoUrl: null });
  const render = (highlight?: "receptionist") => renderToStaticMarkup(
    <QueryClientProvider client={client}><PortalNavigation label="Staff navigation" items={items}
      footer={() => null} highlight={highlight} /></QueryClientProvider>);
  assert.ok(render("receptionist").includes('data-highlight="receptionist"'));
  assert.ok(render().includes('data-highlight="default"'));
  const css = readFileSync(new URL("./portal-navigation.css", import.meta.url), "utf8");
  assert.match(css, /\.portal-navigation-drawer\[data-highlight="receptionist"\]/);
  assert.match(css, /--portal-navigation-highlight: #faf5e6/);
  assert.equal((css.match(/background: var\(--portal-navigation-highlight, var\(--saivie-sage\)\)/g) || []).length, 2);
  const source = readFileSync(new URL("./PortalNavigation.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/data-highlight=\{highlight\}/g) || []).length, 2);
  client.clear();
});

test("all primary portal shells use the shared sidebar without removing role gates or clinical focus mode", () => {
  for (const portal of ["Owner", "Staff", "Clinician"]) {
    const source = readFileSync(new URL(`../pages/${portal}Portal.tsx`, import.meta.url), "utf8");
    assert.ok(source.includes("<PortalNavigation"), portal);
    assert.ok(source.includes('className="portal-shell'), portal);
    assert.match(source, /className=(?:"portal-panel|\{`portal-panel)/, portal);
    assert.ok(!source.includes("setSidebarOpen") && !source.includes("setSidebarPinned"), portal);
  }
  const staff = readFileSync(new URL("../pages/StaffPortal.tsx", import.meta.url), "utf8");
  for (const testId of ["nav-my-attendance", "tab-paper-prescriptions", "btn-prime-members", "btn-billing", "btn-sync-import"]) assert.ok(staff.includes(testId));
  assert.ok(staff.includes("...(receptionist ?"));
  assert.ok(staff.includes('highlight={receptionist ? "receptionist" : "default"}'));
  const clinician = readFileSync(new URL("../pages/ClinicianPortal.tsx", import.meta.url), "utf8");
  assert.ok(clinician.includes("hidden={activeView === 'patient_detail' && isPatientOverview}"));
});
