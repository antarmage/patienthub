export interface AdvisedTest {
  name: string;
  type: "lab" | "usg";
}

const lab = (name: string): AdvisedTest => ({ name, type: "lab" });
const usg = (name: string): AdvisedTest => ({ name, type: "usg" });

export function pregnancyWeeks(pog: string, lmp: string, prescriptionDate: string): number | null {
  if (pog.trim()) {
    const match = pog.trim().match(/^(\d{1,2})(?:\s*(?:w(?:eeks?|ks?)?)(?:\s*(\d)\s*(?:d(?:ays?)?)?)?)?$/i);
    if (!match) return null;
    const weeks = Number(match[1]);
    const days = Number(match[2] || 0);
    return weeks <= 42 && days <= 6 ? weeks + days / 7 : null;
  }
  const parseDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
  };
  const weeks = (parseDate(prescriptionDate) - parseDate(lmp)) / (7 * 86400000);
  return Number.isFinite(weeks) && weeks >= 0 && weeks < 43 ? weeks : null;
}

export function prescriptionTestOptions(patientType: string, weeks: number | null): { context: string; tests: AdvisedTest[] } {
  const cbc = lab("CBC (Complete Blood Count)");
  const urine = lab("Urine Routine & Microscopy");
  const tsh = lab("TSH (Thyroid Stimulating Hormone)");
  const pelvic = usg("USG - Pelvic Ultrasound");
  if (/pregnant/i.test(patientType)) {
    if (weeks === null) return { context: "Pregnant: enter POG or LMP and the prescription date for stage-specific options", tests: [cbc, urine, tsh, lab("Blood Group & Rh Typing")] };
    const context = `${Math.floor(weeks)} weeks at this prescription · ${weeks < 14 ? "First" : weeks < 28 ? "Second" : "Third"} trimester`;
    const tests: AdvisedTest[] = weeks < 11
      ? [cbc, lab("Blood Group & Rh Typing"), tsh, urine, lab("HIV, HBsAg, VDRL"), usg("USG - Dating Scan")]
      : weeks < 14
        ? [usg("NT Scan (Nuchal Translucency)"), lab("Dual Marker"), lab("Urine Culture")]
        : weeks < 24
          ? [cbc, urine, usg("USG - Anomaly Scan (TIFFA, usually 18-22 weeks)")]
          : weeks < 28
            ? [lab("OGTT (75g Glucose Tolerance Test)"), cbc, urine]
            : [cbc, urine, usg("USG - Growth Scan"), usg("USG - Doppler Study (if indicated)")];
    if (weeks >= 36 && weeks < 38) tests.push(lab("GBS Screening (per local protocol)"));
    if (weeks >= 37) tests.push(usg("USG - AFI / Biophysical Profile (if indicated)"));
    return { context, tests };
  }
  if (/pcos/i.test(patientType)) return { context: "PCOS", tests: [tsh, lab("Prolactin"), lab("HbA1c"), lab("Lipid Profile"), lab("Testosterone"), pelvic] };
  if (/fertility/i.test(patientType)) return { context: "Fertility", tests: [lab("Day 2/3 Hormonal Panel"), lab("AMH"), tsh, lab("Prolactin"), lab("Day 21 Progesterone"), pelvic, usg("USG - Follicular Monitoring")] };
  if (/postpartum/i.test(patientType)) return { context: "Postpartum", tests: [cbc, tsh, lab("OGTT (if prior gestational diabetes)"), pelvic] };
  if (/gynecology/i.test(patientType)) return { context: "Gynecology", tests: [cbc, tsh, urine, lab("Cervical Screening (if due)"), pelvic] };
  return { context: "General", tests: [cbc, urine, tsh, lab("HbA1c"), lab("Lipid Profile"), pelvic] };
}
