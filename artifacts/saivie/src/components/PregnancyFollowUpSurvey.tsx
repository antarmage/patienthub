import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { onboardingFetch } from "@/lib/onboardingSession";
import { readApiResponse } from "@/lib/authenticatedFetch";
import { getPrintBrandStyles } from "@/lib/brand";
import { pregnancyPrintHtml } from "./PregnancyPrintTrends";
import { PregnancyJourneyCard } from "./PregnancyJourneyCard";
import { followUpLabels, pregnancyFollowUpSchema, type PregnancyFollowUp, type PregnancyVisitContext } from "../../../../lib/db/src/pregnancy-followup";

const choices: Partial<Record<keyof PregnancyFollowUp, readonly string[]>> = {
  visitReason: ["Routine check-up", "Current concern", "Routine check-up and a concern"],
  vomitingChange: ["No vomiting", "Less than before", "Same as before", "Increased", "Not sure"],
  eatingDrinking: ["Able to eat and drink", "Eating or drinking less", "Unable to keep food or fluids down", "Not sure"],
  investigations: ["All completed", "Some completed", "Not done yet", "None advised", "Not sure"],
  reports: ["Available to show the doctor", "Done, awaiting reports", "Not available", "Not applicable"],
};
export type PregnancyFollowUpDraft = Record<keyof PregnancyFollowUp, string>;
type Draft = PregnancyFollowUpDraft;
const empty: Draft = { visitReason: "", concern: "", foodHabits: "", vomitingChange: "", eatingDrinking: "", investigations: "", reports: "", investigationDetails: "", changes: "" };

export function PregnancyFollowUpSurvey({ appointmentId, name, context, onEditHistory, initialDraft }: {
  appointmentId: string; name: string; context: PregnancyVisitContext;
  onEditHistory?: (draft: Draft) => void; initialDraft?: Draft | null;
}) {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState<Draft>(initialDraft || context.answers || empty);
  const [saved, setSaved] = useState<PregnancyFollowUp | null>(null);
  const [printError, setPrintError] = useState(false);
  const submission = useMutation({
    mutationFn: async () => {
      const parsed = pregnancyFollowUpSchema.safeParse(draft);
      if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
      await readApiResponse(await onboardingFetch(`/api/onboarding/${appointmentId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregnancyFollowUp: parsed.data }),
      }));
      return parsed.data;
    },
    onSuccess: setSaved,
  });
  const print = () => {
    const win = window.open("", "_blank", "width=850,height=1000");
    if (!win) { setPrintError(true); return; }
    const heading = document.createElement("h1"); heading.textContent = `${name} · Pregnancy follow-up`;
    win.document.open();
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pregnancy follow-up</title><style>${getPrintBrandStyles()}body{font:13px/1.5 Arial,sans-serif;padding:24px;color:#243b35}th,td{text-align:left;padding:6px;border-bottom:1px solid #cfe0d8}h2,h3{break-after:avoid}@page{margin:18mm}</style></head><body>${heading.outerHTML}${pregnancyPrintHtml({ ...context, answers: saved })}<script>window.onload=function(){window.focus();window.print();}</script></body></html>`);
    win.document.close(); setPrintError(false);
  };
  return <main className="min-h-screen bg-saivie-ivory px-4 py-8 text-saivie-plum"><section className="mx-auto max-w-2xl rounded-2xl border border-saivie-border bg-white p-5 sm:p-8">
    <p className="text-xs font-semibold uppercase text-saivie-teal">{context.label} · Follow-up visit</p>
    <h1 className="mt-2 text-2xl font-semibold">{saved ? "Your follow-up has been shared" : `Welcome back, ${name}`}</h1>
    <PregnancyJourneyCard context={context} />
    {onEditHistory && <div className="mt-4 rounded-lg border border-saivie-border p-3 text-sm">
      <p>Your previously submitted survey is saved. Review or correct its selected answers without filling it from scratch.</p>
      <Button type="button" variant="outline" className="mt-2" onClick={() => onEditHistory(draft)}>Review / correct saved survey</Button>
    </div>}
    {saved ? <><p className="my-4">Your original history is preserved. These updates are saved for this appointment.</p><Button onClick={print}>Print onboarding survey</Button><Button variant="outline" className="ml-2" onClick={() => navigate("/")}>Done</Button>{printError && <p role="alert">Please allow pop-ups to print your survey.</p>}</> :
      <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); submission.mutate(); }}>
        <p className="text-sm">Tell your doctor what has changed since your last pregnancy visit. Your previous medical and pregnancy history will not be replaced.</p>
        {(Object.keys(followUpLabels) as (keyof PregnancyFollowUp)[]).map((key) => <label key={key} className="block text-sm font-medium">
          {key === "foodHabits" ? "How are your food habits, appetite and meals recently?" : followUpLabels[key]}
          {choices[key] ? <select required value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="mt-2 w-full rounded-lg border border-saivie-border bg-white p-3"><option value="">Choose an answer</option>{choices[key]!.map((choice) => <option key={choice}>{choice}</option>)}</select> :
            <textarea maxLength={2000} required={key === "concern" && !!draft.visitReason && draft.visitReason !== "Routine check-up"} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="mt-2 min-h-20 w-full rounded-lg border border-saivie-border p-3" placeholder={key === "changes" ? "Any changes in medicines, allergies or health? Otherwise leave blank." : "A few words are enough; optional unless describing a concern."} />}
        </label>)}
        <p className="rounded-lg border border-saivie-border p-3 text-sm">If you cannot keep fluids down, or have bleeding, severe pain, severe headache, vision changes or reduced baby movements, contact your care team promptly. Do not wait for this survey to be reviewed.</p>
        {submission.isError && <p role="alert" className="text-sm text-red-700">{submission.error.message}</p>}
        <Button type="submit" disabled={submission.isPending}>{submission.isPending ? "Sharing..." : "Share with my care team"}</Button>
      </form>}
  </section></main>;
}
