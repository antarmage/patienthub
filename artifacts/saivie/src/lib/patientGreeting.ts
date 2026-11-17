export function patientGreetingName(name: string | null | undefined): string {
  if (!name) return "";
  const titles = new Set(["mr", "mrs", "ms", "miss", "mx", "dr", "smt", "shri", "master", "baby"]);
  const parts = name.trim().split(/\s+/);
  const first = parts.find((part) => !titles.has(part.replace(/\./g, "").toLowerCase()));
  return first || parts[0] || "";
}
