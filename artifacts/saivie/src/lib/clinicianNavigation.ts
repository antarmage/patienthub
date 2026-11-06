const detailTabs = ["summary", "consultation", "record", "medicine", "vaccines", "investigations", "surgery", "postop", "genome", "menopause"] as const;
const consultationSteps = ["reason", "explore", "examine", "evidence", "plan"] as const;
const views = ["dashboard", "patient_list", "schedule", "analytics", "revenue", "settings", "patient_detail"] as const;

export type PatientDetailTab = typeof detailTabs[number];
export type ConsultationStep = typeof consultationSteps[number];

export function readClinicianNavigation(search: string) {
  const params = new URLSearchParams(search);
  const tab = detailTabs.find((value) => value === params.get("tab")) ?? "summary";
  const step = consultationSteps.find((value) => value === params.get("step")) ?? "reason";
  const view = params.get("googleMeet") === "connected" ? "settings"
    : params.get("patientId") ? "patient_detail"
    : views.find((value) => value !== "patient_detail" && value === params.get("view")) ?? "dashboard";
  return { tab, step, view };
}

export function clinicianNavigationSearch(search: string, state: {
  view: string; patientId?: number; appointmentId?: number;
  tab: PatientDetailTab; step: ConsultationStep;
}) {
  const params = new URLSearchParams(search);
  for (const key of ["view", "patientId", "appointmentId", "tab", "step"]) params.delete(key);
  if (state.view === "patient_detail" && state.patientId) {
    params.set("patientId", String(state.patientId));
    if (state.appointmentId) params.set("appointmentId", String(state.appointmentId));
    params.set("tab", state.tab);
    if (state.tab === "consultation") params.set("step", state.step);
  } else if (state.view !== "dashboard") {
    params.set("view", state.view);
  }
  return params.toString();
}
