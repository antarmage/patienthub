export interface DoctorDashboardPatient {
    id: number;
    name: string;
    age?: number;
    type?: string | null;
    appointmentId: number;
    appointmentDate: string;
    appointmentTime?: string | null;
    appointmentType?: string | null;
    appointmentStatus?: string | null;
    appointmentVisitMode?: string | null;
    appointmentTelemedicineLink?: string | null;
    appointmentSeenAt?: string | null;
    appointmentCompletedAt?: string | null;
    appointmentChiefComplaint?: string | null;
    appointmentNotes?: string | null;
    appointmentVitals?: { bp?: string | number; pulse?: string | number; weight?: string | number } | null;
    riskScore?: { level?: string; score?: number } | null;
}

export type DoctorQueueFilter = "all" | "waiting" | "in-consultation" | "scheduled" | "completed";

export function doctorQueueState(patient: DoctorDashboardPatient): DoctorQueueFilter | "closed" {
    const status = (patient.appointmentStatus || "").toLowerCase().replace(/[\s_]/g, "-");
    if (status.includes("cancel") || status === "no-show") return "closed";
    if (patient.appointmentCompletedAt || status === "completed") return "completed";
    if (patient.appointmentSeenAt || status === "in-consultation" || status === "with-doctor") return "in-consultation";
    if (status === "checked-in") return "waiting";
    return "scheduled";
}

export function visitDurationSummary(patients: DoctorDashboardPatient[]) {
    const visits = patients.flatMap((patient) => {
        if (!patient.appointmentSeenAt || !patient.appointmentCompletedAt) return [];
        const minutes = (Date.parse(patient.appointmentCompletedAt) - Date.parse(patient.appointmentSeenAt)) / 60_000;
        if (!Number.isFinite(minutes) || minutes < 0) return [];
        return [{ id: patient.appointmentId, time: patient.appointmentTime || "Visit", minutes: Math.round(minutes * 10) / 10 }];
    });
    return {
        visits,
        average: visits.length ? Math.round(visits.reduce((sum, visit) => sum + visit.minutes, 0) / visits.length) : null,
        minimum: visits.length ? Math.min(...visits.map((visit) => visit.minutes)) : null,
        maximum: visits.length ? Math.max(...visits.map((visit) => visit.minutes)) : null,
    };
}
