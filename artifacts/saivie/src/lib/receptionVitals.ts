export function receptionVitals(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { recordedAt, recordedBy, recordedByName, ...measurements } = value as Record<string, unknown>;
  const details: Record<string, unknown> = { ...measurements };
  if (recordedAt) {
    const date = typeof recordedAt === "string" ? new Date(recordedAt) : null;
    details["Recorded at"] = date && Number.isFinite(date.getTime())
      ? date.toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
        hour12: true, timeZone: "Asia/Kolkata", timeZoneName: "short",
      })
      : "Invalid recorded time";
  }
  if (recordedBy || recordedByName) {
    details["Recorded by"] = typeof recordedByName === "string" && recordedByName.trim()
      ? recordedByName.trim() : "Staff member unavailable";
  }
  return details;
}
