// Known diagnostic-centre scan rate cards (patient price, ₹). Loaded once per matching centre.
export interface RateCardRow { name: string; price: number }

export const SP_DIAGNOSTIC_USG_RATES: RateCardRow[] = [
  { name: "USG Whole Abdomen", price: 1600 },
  { name: "FPP Advanced Stage", price: 1500 },
  { name: "FPP with NT Scan", price: 2000 },
  { name: "L/A Pelvis", price: 1050 },
  { name: "Pregnancy with TVS", price: 1900 },
  { name: "Early Pregnancy", price: 1200 },
  { name: "Anomaly Scan", price: 2600 },
  { name: "Folliculometry", price: 600 },
  { name: "Fetal Echo", price: 3500 },
  { name: "Both Breast", price: 2000 },
  { name: "Growth Scan", price: 1500 },
];

export function knownRateCard(partnerName: string): RateCardRow[] | null {
  return /^\s*s\.?\s*p\.?\s*diagnos/i.test(partnerName) ? SP_DIAGNOSTIC_USG_RATES : null;
}

// Accepts pasted lines such as "Anomaly Scan 2600", "Anomaly Scan - ₹2,600" or tab-separated cells.
export function parseRateCardText(text: string): RateCardRow[] {
  const rows = new Map<string, RateCardRow>();
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/^\s*\d+\s*[.)]\s*/, "").trim();
    const match = line.match(/^(.*?)[\s\t:=\-–₹]*(?:rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)\s*(?:\/-)?\s*\.?$/i);
    if (!match) continue;
    const name = match[1].replace(/[\s\t:=\-–₹]+$/, "").replace(/\s+/g, " ").trim();
    const price = Number(match[2].replace(/,/g, ""));
    if (!name || !Number.isFinite(price) || price < 0) continue;
    rows.set(name.toLowerCase(), { name, price });
  }
  return Array.from(rows.values());
}
