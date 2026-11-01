const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const validDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value &&
  !value.startsWith("0000-");

export function patientAge(
  patient: Record<string, unknown>,
  asOf: string,
  records: Record<string, unknown>[] = [],
): number | null {
  const onboarding = record(record(patient.history).onboarding);
  for (const dob of [patient.dob, onboarding.dob]) {
    if (!validDate(dob) || !validDate(asOf) || dob > asOf) continue;
    const age =
      Number(asOf.slice(0, 4)) -
      Number(dob.slice(0, 4)) -
      (asOf.slice(5) < dob.slice(5) ? 1 : 0);
    if (age >= 0 && age <= 130) return age;
  }
  const recordedAge = (value: unknown) => {
    const age =
      typeof value === "number"
        ? value
        : typeof value === "string" && /^\d+$/.test(value.trim())
          ? Number(value.trim())
          : null;
    return age !== null && Number.isInteger(age) && age > 0 && age <= 130
      ? age
      : null;
  };
  for (const value of [patient.age, onboarding.age]) {
    const age = recordedAge(value);
    if (age !== null) return age;
  }
  const dated = records
    .filter((row) => validDate(row.date) && row.date <= asOf)
    .sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        Number(b.id) - Number(a.id),
    );
  for (const row of dated) {
    const age = recordedAge(record(row.vitals).age);
    if (age !== null) return age;
  }
  return null;
}
