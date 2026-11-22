export type PatientAppointmentType = "doctor" | "nutritionist" | "blood_test";

interface Provider {
  id: number;
  role?: string | null;
  specialty?: string | null;
}

export function patientAppointmentRequest(input: {
  patientId: number;
  type: PatientAppointmentType;
  date: string;
  time: string;
  note: string;
  providers: Provider[];
}) {
  const provider = input.type === "nutritionist"
    ? input.providers.find((item) => [item.role, item.specialty].some((value) => typeof value === "string" && /nutrition|dietitian|dietician/i.test(value)))
    : input.providers[0];
  const typeMap: Record<PatientAppointmentType, string> = {
    doctor: "Consultation",
    nutritionist: "Nutrition Consultation",
    blood_test: "Blood Test / Lab Work",
  };
  return {
    patientId: input.patientId,
    providerId: provider?.id ?? null,
    date: input.date,
    time: input.time,
    type: typeMap[input.type],
    status: "Pending",
    notes: input.note || undefined,
    suppressNotification: true,
  };
}
