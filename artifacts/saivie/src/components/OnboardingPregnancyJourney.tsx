import React from "react";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";
import type { IntakeForm } from "@/lib/onboardingFlow";
import { PregnancyJourneyCard } from "./PregnancyJourneyCard";
import { calendarDate, calendarDateValue } from "@/lib/calendarDates";

export function OnboardingPregnancyJourney({ context, form }: { context: PregnancyVisitContext | null; form: IntakeForm }) {
  if (context?.pregnancy) return <PregnancyJourneyCard context={context} />;
  if (form.pregnancies.currentStatus !== "Yes") return null;
  const lmp = calendarDate(form.cycle.lastPeriod) ? form.cycle.lastPeriod : null;
  const displayContext: PregnancyVisitContext = {
    pregnancy: true, repeat: false, episodeId: null, label: "Patient-reported pregnancy",
    asOf: context?.asOf || calendarDateValue(new Date()),
    previousAppointmentCount: 0, answers: null, trends: { bp: [], weight: [], hb: [], sugar: [] },
    weightReference: lmp ? { lmp, dueDate: null, endDate: null, datingBasis: "LMP", maternalHeightCm: null,
      prePregnancyWeightKg: null, fetusCount: null, datingSource: "Saved survey LMP (patient-reported; care team to confirm)" } : null,
  };
  return <PregnancyJourneyCard context={displayContext} />;
}
