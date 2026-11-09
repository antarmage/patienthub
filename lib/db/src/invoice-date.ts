import { clinicDate } from "./follow-up";

export function invoiceDateBounds(now = new Date()) {
  const today = clinicDate(now);
  const year = Number(today.slice(0, 4));
  const startYear = Number(today.slice(5, 7)) < 4 ? year - 1 : year;
  return { today, earliest: `${startYear}-04-01` };
}

export function invoiceDateError(value: unknown, now = new Date()): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter a valid bill date as YYYY-MM-DD.";
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Enter a valid bill date.";
  const { today, earliest } = invoiceDateBounds(now);
  if (value > today) return "Bill date cannot be in the future.";
  if (value < earliest) return `Bill date must be in the current financial year, on or after ${earliest}.`;
  return null;
}

export function canBackdateInvoice(role: string) {
  return ["staff", "receptionist", "owner"].includes(role);
}

export function resolveInvoiceDate(value: unknown, role: string, now = new Date()): { date: string } | { error: string; status: 400 | 403 } {
  const { today } = invoiceDateBounds(now);
  const date = value === undefined ? today : value;
  const error = invoiceDateError(date, now);
  if (error || typeof date !== "string") return { error: error || "Enter a valid bill date.", status: 400 };
  if (date !== today && !canBackdateInvoice(role)) {
    return { error: "Only receptionists and owners can create backdated bills.", status: 403 };
  }
  return { date };
}
