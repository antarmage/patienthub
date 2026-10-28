export { exactLabNumber } from "@workspace/api-zod/lab-reading";

export function recordedLabValue(lab: {
  value?: number | null;
  unit?: string | null;
  results?: unknown;
}): string | null {
  const raw =
    lab.results && typeof lab.results === "object" && "rawValue" in lab.results
      ? lab.results.rawValue
      : undefined;
  const value = typeof raw === "string" && raw.trim() ? raw : lab.value;
  return value == null ? null : `${value}${lab.unit ? ` ${lab.unit}` : ""}`;
}
