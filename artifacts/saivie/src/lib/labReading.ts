export function exactLabNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}
