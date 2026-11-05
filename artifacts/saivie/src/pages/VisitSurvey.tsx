import { useParams } from "wouter";
import PatientOnboarding from "@/pages/PatientOnboarding";
import LabSurvey from "@/pages/LabSurvey";
import { useOnboardingSession } from "@/lib/onboardingSession";
import { OnboardingLink } from "@/components/OnboardingLink";
import { Button } from "@/components/ui/button";

// Same survey link for every booking; lab-only visits get the short pre-collection survey.
export default function VisitSurvey() {
    const { id } = useParams();
    const session = useOnboardingSession(id);
    const data = session.data;
    if (session.isPending) {
        return <div className="flex min-h-screen items-center justify-center bg-saivie-ivory text-sm text-saivie-teal">Preparing your care journey…</div>;
    }
    if (session.isError) return <main className="flex min-h-screen items-center justify-center bg-saivie-ivory p-6"><section role="alert" className="w-full max-w-lg space-y-4 rounded-2xl border bg-white p-6"><h1 className="font-serif text-xl">Onboarding could not load</h1><p className="text-sm">{session.error.message}</p><p className="text-sm">Keep the full private link shared by your clinic. This error does not necessarily mean your link is invalid.</p><Button variant="outline" onClick={() => void session.refetch()}>Retry</Button>{sessionStorage.getItem("billing_staff_token") && Number.isSafeInteger(Number(id)) && Number(id) > 0 && <OnboardingLink appointmentId={Number(id)} />}</section></main>;
    return <>{sessionStorage.getItem("billing_staff_token") && !window.location.hash && Number.isSafeInteger(Number(id)) && Number(id) > 0 && <div className="bg-saivie-ivory p-6"><OnboardingLink appointmentId={Number(id)} /></div>}{data?.appointment?.surveyKind === "lab" ? <LabSurvey appointmentId={String(id)} onboardingData={data} /> : <PatientOnboarding />}</>;
}
