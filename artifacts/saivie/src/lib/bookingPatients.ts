export const bookingPatientFilters = ["All", "Recent", "Pregnant", "Fertility", "PCOS", "Gynae"] as const;
export type BookingPatientFilter = typeof bookingPatientFilters[number];

export interface BookingPatient {
    id: number;
    name: string;
    phone?: string | null;
    type?: string | null;
    mode?: string | null;
    pregnancyStatus?: string | null;
    lastVisit?: string | null;
}

export function bookingPatientCategory(patient: BookingPatient): string {
    const careMode = clinicalCareMode(patient);
    if (careMode === "pregnancy") return "Pregnant";
    if (["natural_conception", "induction", "iui", "ivf"].includes(careMode)) return "Fertility";
    if (/pcos|pcod/i.test(patient.type || "")) return "PCOS";
    if (/gynae|gyne|gyn$/i.test(patient.type || "")) return "Gynae";
    return patient.type || "General";
}

function visitTime(patient: BookingPatient): number {
    const time = Date.parse(patient.lastVisit || "");
    return Number.isFinite(time) ? time : 0;
}

export function filterBookingPatients<T extends BookingPatient>(patients: T[], query: string, filter: BookingPatientFilter): T[] {
    const search = query.trim().toLowerCase();
    const phone = search.replace(/\D/g, "");
    return patients.filter((patient) => {
        const matchesSearch = !search || patient.name.toLowerCase().includes(search)
            || String(patient.id) === search.replace(/^#/, "")
            || (phone.length > 0 && /^[+\d\s().-]+$/.test(search) && (patient.phone || "").replace(/\D/g, "").includes(phone));
        return matchesSearch && (filter === "All" || (filter === "Recent" ? visitTime(patient) > 0 : bookingPatientCategory(patient) === filter));
    }).sort((a, b) => visitTime(b) - visitTime(a) || a.name.localeCompare(b.name) || a.id - b.id);
}
import { clinicalCareMode } from "./clinicalCareMode";
