import React from "react";
import type { PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";
import { PregnancyJourneyCard } from "./PregnancyJourneyCard";

export function OnboardingPregnancyJourney({ context }: { context: PregnancyVisitContext | null }) {
  if (!context?.pregnancy) return null;
  return <PregnancyJourneyCard context={context} />;
}
