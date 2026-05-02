export interface WeekData {
  week: number;
  babySize: string;
  babySizeIcon: string;
  babyDevelopment: string[];
  motherSymptoms: string[];
  nutritionTips: string[];
  dos: string[];
  donts: string[];
}

const WEEK_DATA: WeekData[] = [
  { week: 4, babySize: "poppy seed", babySizeIcon: "circle", babyDevelopment: ["Neural tube forming", "Heart cells beginning to develop", "Placenta starting to form"], motherSymptoms: ["Missed period", "Tender breasts", "Mild cramping"], nutritionTips: ["Start folic acid 400mcg/day", "Avoid alcohol completely", "Stay hydrated"], dos: ["Start prenatal vitamins", "Schedule OB appointment"], donts: ["Avoid raw fish", "Avoid alcohol"] },
  { week: 5, babySize: "sesame seed", babySizeIcon: "circle", babyDevelopment: ["Heart beating for the first time", "Brain and spinal cord forming", "Arm and leg buds appearing"], motherSymptoms: ["Morning sickness may begin", "Fatigue", "Frequent urination"], nutritionTips: ["Eat small frequent meals", "Ginger tea for nausea", "Increase water intake"], dos: ["Rest when tired", "Eat small meals frequently"], donts: ["Skip meals", "Overexert yourself"] },
  { week: 8, babySize: "raspberry", babySizeIcon: "circle", babyDevelopment: ["All major organs forming", "Fingers and toes visible", "Heartbeat detectable by ultrasound"], motherSymptoms: ["Nausea peak", "Breast changes", "Mood swings"], nutritionTips: ["Iron-rich foods", "Vitamin B6 for nausea", "Calcium from dairy or alternatives"], dos: ["First prenatal visit", "Blood tests as advised"], donts: ["Lift heavy objects", "Take unprescribed medications"] },
  { week: 12, babySize: "plum", babySizeIcon: "circle", babyDevelopment: ["Reflexes developing", "Kidneys producing urine", "Vocal cords forming"], motherSymptoms: ["Nausea may ease", "Visible bump beginning", "Energy returning"], nutritionTips: ["Continue prenatal vitamins", "Protein at every meal", "Omega-3 fatty acids"], dos: ["First trimester screening", "Share news if ready"], donts: ["Skip prenatal appointments", "Eat high-mercury fish"] },
  { week: 16, babySize: "avocado", babySizeIcon: "circle", babyDevelopment: ["Can make facial expressions", "Practicing swallowing", "Hearing sounds"], motherSymptoms: ["Baby bump more visible", "Less fatigue", "Round ligament pain"], nutritionTips: ["Increase caloric intake by 300 cal", "Iron-rich leafy greens", "Calcium for bone development"], dos: ["Quad screen if recommended", "Start sleeping on side"], donts: ["Sleep on back for extended periods", "Wear tight clothing"] },
  { week: 20, babySize: "banana", babySizeIcon: "minus", babyDevelopment: ["Anatomy scan week", "Baby can hear your voice", "Vernix coating forming"], motherSymptoms: ["Feeling baby move (quickening)", "Back pain begins", "Swollen feet possible"], nutritionTips: ["Vitamin D important", "Fiber to prevent constipation", "Stay hydrated"], dos: ["Anatomy scan ultrasound", "Start Kegel exercises"], donts: ["Stand for long periods", "Ignore swelling in face"] },
  { week: 24, babySize: "corn", babySizeIcon: "minus", babyDevelopment: ["Lungs developing rapidly", "Brain growing quickly", "Regular sleep cycles"], motherSymptoms: ["Braxton Hicks contractions", "Heartburn common", "Backache"], nutritionTips: ["Magnesium for leg cramps", "Small frequent meals for heartburn", "Protein 75g/day"], dos: ["Glucose screening test", "Take childbirth classes"], donts: ["Eat large meals before bed", "Skip prenatal visits"] },
  { week: 28, babySize: "eggplant", babySizeIcon: "minus", babyDevelopment: ["Eyes can open and close", "Baby practices breathing", "Gaining weight rapidly"], motherSymptoms: ["Shortness of breath", "Increased swelling", "Sleep difficulties"], nutritionTips: ["Iron supplements if anemic", "Protein and DHA essential", "Avoid processed foods"], dos: ["Rh factor test if needed", "Start birth plan"], donts: ["Travel long distances without approval", "Ignore persistent headaches"] },
  { week: 32, babySize: "squash", babySizeIcon: "minus", babyDevelopment: ["Lanugo disappearing", "Immune system developing", "Practicing breathing movements"], motherSymptoms: ["Braxton Hicks more frequent", "Pelvic pressure", "Fatigue returns"], nutritionTips: ["Focus on iron and vitamin C", "Limit caffeine", "Healthy fats important"], dos: ["Group B strep test soon", "Tour birth facility"], donts: ["Lift heavy items", "Skip kick counts"] },
  { week: 36, babySize: "honeydew", babySizeIcon: "circle", babyDevelopment: ["Head dropping into pelvis", "All systems nearly ready", "Fat deposits completing"], motherSymptoms: ["Lightning crotch sensation", "Increased urination", "Nesting instinct"], nutritionTips: ["Light easily digestible meals", "Stay hydrated", "Dates may help labor"], dos: ["Weekly OB visits now", "Pack hospital bag"], donts: ["Ignore signs of labor", "Travel far from hospital"] },
  { week: 40, babySize: "watermelon", babySizeIcon: "circle", babyDevelopment: ["Fully developed", "Ready for birth", "Lungs mature"], motherSymptoms: ["Strong Braxton Hicks", "Mucus plug may pass", "Nesting urge strong"], nutritionTips: ["Light meals", "Stay hydrated", "Rest as much as possible"], dos: ["Know labor signs", "Stay calm and rested"], donts: ["Panic", "Ignore signs of labor"] },
];

export function getWeekData(week: number): WeekData | undefined {
  const sorted = [...WEEK_DATA].sort((a, b) => a.week - b.week);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (week >= sorted[i].week) return sorted[i];
  }
  return sorted[0];
}

export interface BabyStats {
  weight: string;
  length: string;
  size: string;
  icon: string;
}

export function getBabyStats(week: number): BabyStats {
  if (week <= 8) return { weight: "< 1g", length: "1.6 cm", size: "raspberry", icon: "circle" };
  if (week <= 12) return { weight: "14g", length: "5.4 cm", size: "plum", icon: "circle" };
  if (week <= 16) return { weight: "100g", length: "11.6 cm", size: "avocado", icon: "circle" };
  if (week <= 20) return { weight: "300g", length: "16.4 cm", size: "banana", icon: "minus" };
  if (week <= 24) return { weight: "600g", length: "30 cm", size: "corn cob", icon: "minus" };
  if (week <= 28) return { weight: "1 kg", length: "37.6 cm", size: "eggplant", icon: "minus" };
  if (week <= 32) return { weight: "1.7 kg", length: "42.4 cm", size: "squash", icon: "minus" };
  if (week <= 36) return { weight: "2.6 kg", length: "47.4 cm", size: "honeydew", icon: "circle" };
  return { weight: "3.4 kg", length: "51.2 cm", size: "watermelon", icon: "circle" };
}

export function calculateEDD(lmpDate: Date): Date {
  const edd = new Date(lmpDate);
  edd.setDate(edd.getDate() + 280);
  return edd;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function getCurrentWeek(lmpDate: string | null): number {
  if (!lmpDate) return 1;
  const lmp = new Date(lmpDate);
  const diff = Math.floor((Date.now() - lmp.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(40, Math.max(1, Math.floor(diff / 7)));
}
