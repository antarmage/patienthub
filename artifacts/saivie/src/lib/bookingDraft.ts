export type NewPatientDraft = {
    firstName: string;
    lastName: string;
    age: string;
    phone: string;
    email: string;
};

export const emptyNewPatientDraft: NewPatientDraft = { firstName: "", lastName: "", age: "", phone: "", email: "" };

export function newPatientPayload(draft: NewPatientDraft) {
    const name = [draft.firstName, draft.lastName].map((part) => part.trim()).filter(Boolean).join(" ");
    const age = Number(draft.age);
    if (!name || draft.age.trim() === "" || !Number.isInteger(age) || age < 0 || age > 120) return null;
    return {
        name,
        age,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        type: "General",
    };
}

export function bookingDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatAppointmentTime(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    return `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function missingBookingFields(input: { hasPatient: boolean; date?: Date; time: string }) {
    const missing: string[] = [];
    if (!input.hasPatient) missing.push("patient");
    if (!input.date) missing.push("date");
    if (!/^\d{2}:\d{2}$/.test(input.time)) missing.push("time");
    return missing;
}
