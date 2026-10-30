import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import PatientOnboarding from "@/pages/PatientOnboarding";
import LabSurvey from "@/pages/LabSurvey";

// Same survey link for every booking; lab-only visits get the short pre-collection survey.
export default function VisitSurvey() {
    const { id } = useParams();
    const { data, isLoading } = useQuery({
        queryKey: ["/api/onboarding", id],
        queryFn: async () => {
            const response = await fetch("/api/onboarding", { headers: { "X-Appointment-Id": String(id) } });
            if (!response.ok) throw new Error("Failed to load onboarding session");
            return response.json();
        },
    });
    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center bg-saivie-ivory text-sm text-saivie-teal">Preparing your care journey…</div>;
    }
    if (data?.appointment?.surveyKind === "lab") return <LabSurvey appointmentId={String(id)} onboardingData={data} />;
    return <PatientOnboarding />;
}
