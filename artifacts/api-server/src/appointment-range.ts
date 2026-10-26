export function readAppointmentRange(from: unknown, to: unknown): { from?: string; to?: string } | null {
  const valid = (value: unknown): value is string => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  };
  if (from !== undefined && !valid(from) || to !== undefined && !valid(to)) return null;
  if (typeof from === "string" && typeof to === "string" && from > to) return null;
  return { ...(typeof from === "string" ? { from } : {}), ...(typeof to === "string" ? { to } : {}) };
}
