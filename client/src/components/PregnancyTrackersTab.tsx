import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Droplets, Scale, Activity, Pill, ChevronDown, ChevronUp,
  Plus, CheckCircle2, Circle, Trash2, Upload, FileText,
  Image, X, ChevronRight, ChevronLeft, Baby, Utensils,
  ShieldCheck, AlertTriangle, Info
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell
} from "recharts";

// ── 40-week static content ────────────────────────────────────────────────────
const WEEK_DATA: Record<number, {
  fruit: string; emoji: string; length: string; weight: string;
  development: string[]; symptoms: string[]; dos: string[]; donts: string[]; nutrition: string;
}> = {
  4: { fruit: "Poppy seed", emoji: "🫘", length: "~1 mm", weight: "<1 g", development: ["Embryo is implanting", "Amniotic sac forming", "Placenta beginning to develop"], symptoms: ["Missed period", "Slight cramping", "Breast tenderness"], dos: ["Start folic acid 5 mg/day", "Book first prenatal visit", "Stop alcohol & smoking"], donts: ["Avoid raw fish & unpasteurised dairy", "Avoid X-rays"], nutrition: "Folic acid is critical now — leafy greens, lentils, fortified cereals." },
  5: { fruit: "Apple seed", emoji: "🌱", length: "~3 mm", weight: "<1 g", development: ["Heart begins to beat", "Neural tube closing", "Arm & leg buds forming"], symptoms: ["Nausea beginning", "Fatigue", "Frequent urination"], dos: ["Small frequent meals for nausea", "Rest when tired", "Stay hydrated"], donts: ["Skip prenatal vitamins", "High-impact exercise without guidance"], nutrition: "Ginger tea helps nausea. B6-rich foods: bananas, potatoes, avocado." },
  6: { fruit: "Lentil", emoji: "🫘", length: "~6 mm", weight: "<1 g", development: ["Heartbeat detectable on scan", "Eyes & ears forming", "Hands & feet forming"], symptoms: ["Morning sickness peaking", "Smell sensitivity", "Bloating"], dos: ["Try cold/bland foods if nauseated", "Elevate head when sleeping", "Sip water slowly"], donts: ["Skip meals (worsens nausea)", "Strong smells/cooking odours"], nutrition: "Cold foods often easier to tolerate. Try yoghurt, cold toast, crackers." },
  7: { fruit: "Blueberry", emoji: "🫐", length: "~1.3 cm", weight: "<1 g", development: ["Brain growing rapidly", "Intestines forming", "Eyelids developing"], symptoms: ["Fatigue", "Mood swings", "Breast enlargement"], dos: ["Rest without guilt", "Share feelings with partner", "Light walks if tolerated"], donts: ["Vigorous exercise", "Cat litter (toxoplasmosis risk)"], nutrition: "Omega-3 supports brain development: walnuts, flaxseed, fatty fish (cooked)." },
  8: { fruit: "Raspberry", emoji: "🫐", length: "~1.6 cm", weight: "~1 g", development: ["Fingers & toes distinct", "All major organs forming", "Moving inside womb (can't feel yet)"], symptoms: ["Nausea", "Heightened emotions", "Food aversions"], dos: ["Attend 8-week booking appointment", "Start pregnancy yoga", "Talk to baby"], donts: ["Sauna & hot tubs (overheating)", "Deli meats (listeria risk)"], nutrition: "Iron-rich foods: spinach, lentils, jaggery. Pair with Vitamin C to absorb better." },
  9: { fruit: "Grape", emoji: "🍇", length: "~2.3 cm", weight: "~2 g", development: ["Embryo officially a foetus", "Tiny muscles moving", "External genitalia forming"], symptoms: ["Constipation starting", "Heartburn", "Ligament pain"], dos: ["High-fibre diet", "Sit upright after eating", "Pelvic floor exercises"], donts: ["Lie flat after eating", "Skip water intake"], nutrition: "Fibre & probiotics: oats, bananas, curd, psyllium husk for digestion." },
  10: { fruit: "Strawberry", emoji: "🍓", length: "~3.1 cm", weight: "~4 g", development: ["Fingernails forming", "Vital organs functioning", "Swallowing amniotic fluid"], symptoms: ["Round ligament pain", "Increased vaginal discharge", "Frequent urination"], dos: ["Wear comfortable loose clothing", "Gentle stretching", "Kegel exercises daily"], donts: ["Tight waistbands", "Ignore sharp pain (consult doctor)"], nutrition: "Calcium: milk, ragi, paneer, sesame seeds for baby's bones." },
  11: { fruit: "Fig", emoji: "🍒", length: "~4.1 cm", weight: "~7 g", development: ["Tooth buds forming", "Head still large but proportions improving", "Baby can kick and stretch"], symptoms: ["Nausea improving slightly", "Fatigue continuing", "Skin changes"], dos: ["First trimester screen (NT scan) around now", "Gentle exercise", "Moisturise skin"], donts: ["Over-exercise", "Worry about small appetite"], nutrition: "Vitamin D: sunlight 15 min/day, fortified milk, eggs for calcium absorption." },
  12: { fruit: "Lime", emoji: "🍋", length: "~5.4 cm", weight: "~14 g", development: ["Reflexes developing", "Face formed", "Intestines moving into abdomen"], symptoms: ["Nausea often easing", "Energy returning", "Uterus rising above pubic bone"], dos: ["Share pregnancy news if comfortable", "Dating scan / NT scan", "Plan exercise routine"], donts: ["Heavy lifting", "Lying on back for long periods"], nutrition: "Continue folic acid, iron. Add iodine: seafood, iodised salt, dairy." },
  13: { fruit: "Peach", emoji: "🍑", length: "~7.4 cm", weight: "~23 g", development: ["Fingerprints forming", "Vocal cords developing", "Unique heartbeat ~150 bpm"], symptoms: ["Second trimester begins", "Appetite improving", "Waistline expanding"], dos: ["Start maternity clothes shopping", "Book anomaly scan (18-20w)", "Celebrate milestone!"], donts: ["Avoid fish high in mercury (shark, swordfish)", "Start new intense fitness"], nutrition: "Protein: eggs, dal, chicken, paneer for muscle and tissue building." },
  14: { fruit: "Lemon", emoji: "🍋", length: "~8.7 cm", weight: "~43 g", development: ["Baby can squint, frown, grimace", "Sucking reflex developing", "Kidneys producing urine"], symptoms: ["Energy boost", "Glowing skin for some", "Nasal congestion"], dos: ["Nasal saline spray for congestion", "Regular blood pressure checks", "Enjoy the energy surge"], donts: ["Decongestant medications without doctor advice", "Skip antenatal appointments"], nutrition: "Iron: red meat, spinach, dates, jaggery. Iron supplement as prescribed." },
  15: { fruit: "Apple", emoji: "🍎", length: "~10.1 cm", weight: "~70 g", development: ["Eyes sensitive to light", "Bones hardening", "Scalp hair pattern developing"], symptoms: ["Heartburn", "Backache beginning", "Possible nosebleeds"], dos: ["Sleep on left side", "Invest in maternity pillow", "Pregnancy massage if available"], donts: ["Sleep on back (limits blood flow)", "Wear high heels (balance off)"], nutrition: "Calcium & Vitamin D: dairy, ragi, broccoli, eggs for bone mineralisation." },
  16: { fruit: "Avocado", emoji: "🥑", length: "~11.6 cm", weight: "~100 g", development: ["Coordinated movements", "Bones forming faster", "Genitals visible on scan"], symptoms: ["Round ligament pain", "Possible first kick feeling (flutters)"], dos: ["Quad screen / maternal blood test if recommended", "Note any flutters", "Continue Kegels"], donts: ["Ignore pelvic pain (check with doctor)", "High-sodium processed foods"], nutrition: "Avocado, nuts, olive oil — healthy fats for baby's brain development." },
  17: { fruit: "Pear", emoji: "🍐", length: "~13 cm", weight: "~140 g", development: ["Sweat glands forming", "Baby stores fat", "Skeleton is mostly cartilage"], symptoms: ["Increased appetite", "Back pain", "Swollen hands/feet possible"], dos: ["Elevate feet when resting", "Supportive shoes", "Swim or water aerobics for back"], donts: ["Stand for long periods without breaks", "Ignore sudden swelling"], nutrition: "Potassium: banana, coconut water, sweet potato — reduces leg cramps." },
  18: { fruit: "Bell pepper", emoji: "🫑", length: "~14.2 cm", weight: "~190 g", development: ["Baby can yawn & hiccup", "Ears developed — can hear you!", "Vernix (waxy coating) forming"], symptoms: ["Definite kicks for many", "Sciatic nerve pain", "Vivid dreams"], dos: ["Talk & sing to baby", "Anomaly scan (18-20 weeks)", "Prenatal classes"], donts: ["Avoid sitting cross-legged (sciatic)", "Late nights"], nutrition: "Zinc & magnesium: pumpkin seeds, spinach, almonds for nerve function." },
  19: { fruit: "Mango", emoji: "🥭", length: "~15.3 cm", weight: "~240 g", development: ["Senses developing (taste, hearing, touch)", "Brain designating sensory areas", "Baby's legs now in proportion"], symptoms: ["Braxton Hicks starting", "Lower back ache", "Darkening areolae"], dos: ["Practice prenatal breathing", "Massage lower back", "Stay warm"], donts: ["Ignore BH if regular or painful", "Skip hydration"], nutrition: "Choline: eggs, meat, lentils — vital for baby's brain and spinal cord." },
  20: { fruit: "Banana", emoji: "🍌", length: "~25.6 cm", weight: "~300 g", development: ["Halfway point!", "Swallowing reflex", "Baby sleeps in cycles"], symptoms: ["Feeling baby move regularly", "Swollen ankles", "Indigestion"], dos: ["Anomaly scan this week", "Celebrate halfway!", "Drink coconut water for electrolytes"], donts: ["Sedentary days (walk daily)", "Tight clothes around belly"], nutrition: "Iron is crucial now — hemoglobin supports increasing blood volume." },
  21: { fruit: "Pomegranate", emoji: "🍎", length: "~26.7 cm", weight: "~360 g", development: ["Eyebrows forming", "Taste buds working", "Bone marrow making blood cells"], symptoms: ["Varicose veins possible", "Stretch marks appearing", "Shortness of breath on exertion"], dos: ["Compression stockings if veins are issue", "Moisturise belly", "Short walks over long sitting"], donts: ["Scratch stretch marks (can scar)", "Ignore breathlessness on rest"], nutrition: "Vitamin C: amla, guava, citrus — boosts iron absorption and immunity." },
  22: { fruit: "Papaya (raw avoided)", emoji: "🌿", length: "~27.8 cm", weight: "~430 g", development: ["Lips formed", "Eyelids & eyebrows complete", "Baby can sense light through uterus"], symptoms: ["Belly button popping", "Increased Braxton Hicks", "Pelvic pressure"], dos: ["Pelvic girdle exercises", "Rest with feet elevated", "Stay active but don't overdo"], donts: ["Raw papaya (causes contractions)", "Ignore pelvic pressure that's constant"], nutrition: "Omega-3: akhrot (walnuts), flaxseed, sardines for brain development." },
  23: { fruit: "Grapefruit", emoji: "🍊", length: "~28.9 cm", weight: "~501 g", development: ["Fat deposits forming under skin", "Ears fully formed", "Lung development accelerating"], symptoms: ["Linea nigra (dark belly line)", "Carpal tunnel possible", "Increased appetite"], dos: ["Splints for carpal tunnel at night", "High-protein snacks", "Childbirth education classes"], donts: ["Ignore numbness/tingling in hands", "Excessive weight gain without guidance"], nutrition: "Protein: 75-100g/day — pulses, paneer, eggs, chicken, Greek yoghurt." },
  24: { fruit: "Corn", emoji: "🌽", length: "~30 cm", weight: "~600 g", development: ["Brain growing rapidly", "Survival outside womb possible (viability milestone)", "Taste developing from amniotic fluid"], symptoms: ["Glucose tolerance test time", "Leg cramps at night", "Snoring possible"], dos: ["Gestational diabetes screen (OGTT) at 24-28w", "Stretching before bed for cramps", "Side-sleeping pillow"], donts: ["Skip OGTT (critical test)", "Lie on back now"], nutrition: "Magnesium: bananas, dark chocolate, nuts — reduces leg cramps." },
  25: { fruit: "Cauliflower", emoji: "🥦", length: "~34.6 cm", weight: "~660 g", development: ["Capillaries forming under skin", "Nostrils opening", "Baby gaining weight steadily"], symptoms: ["Symphysis pubis pain", "Haemorrhoids possible", "Fatigue returning"], dos: ["Pelvic support belt if SPD", "Warm sitz bath for haemorrhoids", "Keep bowels soft (high fibre)"], donts: ["Straddle movements with SPD", "Straining at toilet"], nutrition: "Fibre: oats, psyllium, figs, prunes to prevent constipation and haemorrhoids." },
  26: { fruit: "Cucumber", emoji: "🥒", length: "~35.6 cm", weight: "~760 g", development: ["Eyes begin to open", "Inhaling & exhaling amniotic fluid (lung practice)", "Responding to touch"], symptoms: ["Braxton Hicks more frequent", "Ribs aching", "Nesting instinct beginning"], dos: ["Deep breathing exercises", "Prepare hospital bag checklist", "Gentle ribcage stretches"], donts: ["Heavy lifting now", "Ignore regular tightening (could be preterm)"], nutrition: "Vitamin K: broccoli, spinach, cabbage — supports blood clotting for delivery." },
  27: { fruit: "Head of lettuce", emoji: "🥬", length: "~36.6 cm", weight: "~875 g", development: ["Third trimester begins!", "Blinking eyes", "Brain tissue growing fast"], symptoms: ["Shortness of breath", "Backache worsening", "Feeling very full quickly"], symptoms_extra: ["Third trimester begins"], dos: ["Small frequent meals", "Antenatal checkups every 2 weeks now", "Gentle yoga"], donts: ["Skip back exercises", "Overeat even if appetite is high"], nutrition: "DHA: fatty fish, algal oil supplement — brain and eye development." },
  28: { fruit: "Eggplant", emoji: "🍆", length: "~37.6 cm", weight: "~1 kg", development: ["Dreaming possible (REM sleep)", "Immune antibodies transferring to baby", "Muscle tone improving"], symptoms: ["Frequent urination returning", "Insomnia", "Itchy skin as belly stretches"], dos: ["Count kick counts (10 kicks in 2 hours)", "Anti-stretch oil/cream", "Third trimester blood tests"], donts: ["Ignore reduced fetal movement", "Sleep on right side exclusively"], nutrition: "Iron supplement important: anemia risk high in third trimester." },
  29: { fruit: "Butternut squash", emoji: "🎃", length: "~38.6 cm", weight: "~1.15 kg", development: ["Muscles and lungs maturing", "Head growing rapidly (brain expansion)", "Beginning to settle head-down"], symptoms: ["Heartburn intense", "Round ligament pain", "Skin very itchy"], dos: ["Smaller meals, sit upright 30 min post-eating", "Discuss birth plan with OB", "Prepare for maternity leave"], donts: ["Spicy/fatty foods (heartburn)", "Stress"], nutrition: "Dates from week 36 — start now: shown to reduce need for induction." },
  30: { fruit: "Cabbage", emoji: "🥬", length: "~39.9 cm", weight: "~1.3 kg", development: ["Lanugo (downy hair) shedding", "Toenails complete", "Brain growing wrinkled (more capacity)"], symptoms: ["Braxton Hicks regular", "Colostrum leaking possible", "Feeling very heavy"], dos: ["Wear breast pads for leaking", "Practice relaxation breathing", "Antenatal classes if not already"], donts: ["Strenuous activity", "Travel long distances without clearance"], nutrition: "Colostrum is forming — continue nutrition, breastfeeding prep." },
  31: { fruit: "Coconut", emoji: "🥥", length: "~41.1 cm", weight: "~1.5 kg", development: ["Rapidly gaining weight (250g/week)", "Processing information, light and sound", "Immune system developing"], symptoms: ["Frequent Braxton Hicks", "Shortness of breath", "Ankles very swollen by evening"], dos: ["Elevate feet at end of day", "Maternity support belt", "Count fetal movements daily"], donts: ["Sodium-heavy foods (increases swelling)", "Flying without medical clearance"], nutrition: "Hydration key: 10-12 glasses water to reduce swelling and prevent UTIs." },
  32: { fruit: "Jicama", emoji: "🥥", length: "~42.4 cm", weight: "~1.7 kg", development: ["Practicing breathing movements", "Skin becoming less wrinkled", "Eyes focus and respond to light"], symptoms: ["Pelvic pressure", "Back & hip pain", "Lightening crotch sensations"], dos: ["Prenatal massage", "Pack hospital bag", "Iron & calcium checked"], donts: ["Ignore sudden swelling of face (preeclampsia sign)", "Skip antenatal visits"], nutrition: "Continue iron — hemoglobin needs to be 11+ for safe delivery." },
  33: { fruit: "Pineapple", emoji: "🍍", length: "~43.7 cm", weight: "~1.9 kg", development: ["Skull bones still soft (for birth)", "Antibodies being stockpiled", "Immune system maturing"], symptoms: ["Insomnia", "Shortness of breath", "Back labour pains possible"], dos: ["Side-lying positions for relief", "Hospital birth plan finalised", "Tdap vaccine if not given"], donts: ["Ignore persistent headache (eclampsia)", "Sit for extended periods"], nutrition: "Light meals, avoid gas-causing foods: rajma, raw onion, carbonated drinks." },
  34: { fruit: "Cantaloupe", emoji: "🍈", length: "~45 cm", weight: "~2.1 kg", development: ["Central nervous system maturing", "Fat stores building", "Most organs ready (lungs last)"], symptoms: ["Lightning crotch", "Loose stools (progesterone)", "Pelvic floor pressure"], dos: ["Kegel exercises daily", "Perineal massage starting", "Childbirth breathing practice"], donts: ["Skip prenatal checkups", "Ignore abnormal discharge or bleeding"], nutrition: "Vitamin C: amla, guava — supports collagen for perineal elasticity." },
  35: { fruit: "Honeydew", emoji: "🍈", length: "~46.2 cm", weight: "~2.4 kg", development: ["Kidneys fully mature", "Liver stores iron for first 6 months", "Hearing fully mature"], symptoms: ["Very frequent urination", "Difficulty sleeping", "Pressure in pelvis"], dos: ["Group B Strep (GBS) swab this week", "Review birth preferences with team", "Meditation or hypnobirthing"], donts: ["Long car journeys", "Strenuous exercise without guidance"], nutrition: "Dates 6/day: evidence for shorter labour & less intervention." },
  36: { fruit: "Head of romaine", emoji: "🥬", length: "~47.4 cm", weight: "~2.6 kg", development: ["Baby considered full term (37w)", "Liver & kidneys ready", "Shedding vernix"], symptoms: ["Engagement / baby dropping", "Easier breathing once baby drops", "Pelvic floor pressure intense"], dos: ["Weekly checkups now", "Finalise birth plan", "Freeze meals for postpartum"], donts: ["Travel far from hospital", "Ignore any leaking fluid (membranes)"], nutrition: "Red raspberry leaf tea (after 36w): traditional uterine tonic — discuss with OB." },
  37: { fruit: "Swiss chard bundle", emoji: "🌿", length: "~48.6 cm", weight: "~2.85 kg", development: ["Full term!", "Grip reflex strong", "Lungs mature"], symptoms: ["Loss of mucus plug possible", "Irregular contractions", "Nesting intensifying"], dos: ["Know signs of labour", "Rest and sleep as much as possible", "Eat well — labour needs energy"], donts: ["Ignore regular painful contractions (call OB)", "Tire yourself nesting"], nutrition: "Energy foods: oats, bananas, nuts — keep stamina up for labour." },
  38: { fruit: "Leek", emoji: "🌿", length: "~49.8 cm", weight: "~3.1 kg", development: ["Brain & nervous system developing right up to birth", "Grasping reflex present", "Eye colour present (may change)"], symptoms: ["Cervix softening", "Loose stools", "Emotional & anxious feelings normal"], dos: ["Trust your body", "Stay near home base", "Light walks to encourage descent"], donts: ["Panic about irregular BH", "Skip hospital bag"], nutrition: "Bone broth, dates, warm meals — nourish and prepare for labour." },
  39: { fruit: "Watermelon (mini)", emoji: "🍉", length: "~50.7 cm", weight: "~3.3 kg", development: ["Brain still developing", "Built strong immune system", "Ready to breathe air"], symptoms: ["Dilation beginning", "Possible bloody show", "Extreme pressure"], dos: ["Stay calm — you're almost there!", "Walk, rock, yoga ball", "Call OB with any signs of labour"], donts: ["Ignore regular contractions 5 min apart", "Stay home if waters break"], nutrition: "Light easily digestible meals — avoid large meals in case of labour starting." },
  40: { fruit: "Watermelon", emoji: "🍉", length: "~51.2 cm", weight: "~3.4 kg", development: ["Fully developed!", "Skin smooth, fat stores complete", "Antibodies from you protect baby for months"], symptoms: ["Due date week", "Contractions may start any time", "Feeling VERY ready!"], dos: ["Trust the process", "Know your hospital route", "Have your bag packed", "Call OB if no movement for 2 hours"], donts: ["Stress — your baby will come when ready", "Ignore strong regular contractions"], nutrition: "Stay hydrated and nourished. You've done it — now rest and prepare to meet your baby!" },
};

function getWeekData(week: number) {
  const clamped = Math.max(4, Math.min(40, week));
  const keys = Object.keys(WEEK_DATA).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
  return WEEK_DATA[closest];
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  patient: any;
  medications: any[];
  patientId: number;
  activeSection?: "trackers" | "timeline" | "records";
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PregnancyTrackersTab({ patient, medications, patientId, activeSection = "trackers" }: Props) {
  const [section, setSection] = useState<"trackers" | "timeline" | "records">(activeSection);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      {/* Section Switcher */}
      <div className="flex gap-2 bg-white/30 backdrop-blur-sm rounded-2xl p-1.5">
        {(["trackers", "timeline", "records"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-all ${section === s ? "bg-white shadow text-pink-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            {s === "trackers" ? "My Trackers" : s === "timeline" ? "Week by Week" : "My Records"}
          </button>
        ))}
      </div>

      {section === "trackers" && <TrackersSection patient={patient} medications={medications} patientId={patientId} />}
      {section === "timeline" && <WeekByWeekSection patient={patient} />}
      {section === "records" && <RecordsSection patientId={patientId} patient={patient} />}
    </div>
  );
}

// ── Trackers Section ──────────────────────────────────────────────────────────
function TrackersSection({ patient, medications, patientId }: { patient: any; medications: any[]; patientId: number }) {
  return (
    <div className="space-y-4">
      <WaterTracker patientId={patientId} />
      <WeightTracker patientId={patientId} />
      <BPTracker patientId={patientId} patient={patient} />
      <MedicineTracker patientId={patientId} medications={medications} />
    </div>
  );
}

// ── Water Tracker ─────────────────────────────────────────────────────────────
function WaterTracker({ patientId }: { patientId: number }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [goal, setGoal] = useState(2500);

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: [`/api/water-logs?patientId=${patientId}&date=${today}`],
    queryFn: async () => { const r = await fetch(`/api/water-logs?patientId=${patientId}&date=${today}`); return r.json(); },
  });

  const totalMl = logs.reduce((s: number, l: any) => s + (l.amountMl || 0), 0);
  const pct = Math.min(100, Math.round((totalMl / goal) * 100));

  const addLog = useMutation({
    mutationFn: async (amountMl: number) => {
      const r = await fetch("/api/water-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, date: today, amountMl, loggedAt: new Date().toISOString() }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/water-logs?patientId=${patientId}&date=${today}`] }),
  });

  const delLog = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/water-logs/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/water-logs?patientId=${patientId}&date=${today}`] }),
  });

  const statusColor = pct >= 100 ? "text-emerald-600" : pct >= 60 ? "text-blue-600" : "text-amber-600";

  return (
    <Card className="glass-panel border-blue-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-sky-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-xl"><Droplets className="w-4 h-4 text-blue-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Water Intake</h3>
              <p className="text-[10px] text-muted-foreground">Goal: {goal} ml/day</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${statusColor}`}>{totalMl}</span>
            <span className="text-xs text-slate-400 ml-1">/ {goal} ml</span>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#dbeafe" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={pct >= 100 ? "#10b981" : pct >= 60 ? "#3b82f6" : "#f59e0b"} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700">{pct}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-slate-500">{pct >= 100 ? "🎉 Daily goal reached!" : `${goal - totalMl} ml more to reach your goal`}</p>
            <div className="flex flex-wrap gap-2">
              {[250, 500, 750].map(ml => (
                <button key={ml} onClick={() => addLog.mutate(ml)} disabled={addLog.isPending}
                  className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" />{ml} ml
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Log History */}
        {logs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Today's Log</p>
            {[...logs].reverse().slice(0, 5).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-slate-700">{l.amountMl} ml</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{l.loggedAt ? new Date(l.loggedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  <button onClick={() => delLog.mutate(l.id)} className="text-slate-300 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Weight Tracker ─────────────────────────────────────────────────────────────
function WeightTracker({ patientId }: { patientId: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");

  const { data: metrics = [] } = useQuery<any[]>({
    queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`],
    queryFn: async () => { const r = await fetch(`/api/pregnancy-metrics?patientId=${patientId}`); return r.json(); },
  });

  const sorted = [...metrics].filter((m: any) => m.weight).sort((a: any, b: any) => a.week - b.week);
  const latest = sorted[sorted.length - 1];
  const chartData = sorted.slice(-8).map((m: any) => ({ week: `W${m.week}`, weight: m.weight }));

  const addWeight = useMutation({
    mutationFn: async () => {
      const currentWeek = (() => {
        if (!patientId) return 20;
        return 20; // will be overridden by patient lmp below
      })();
      const r = await fetch("/api/pregnancy-metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, week: currentWeek, weight: parseFloat(weight), enteredBy: "patient" }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`] }); setShowForm(false); setWeight(""); },
  });

  return (
    <Card className="glass-panel border-amber-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-xl"><Scale className="w-4 h-4 text-amber-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Weight</h3>
              <p className="text-[10px] text-muted-foreground">Track your pregnancy weight gain</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-amber-100 hover:bg-amber-200 rounded-full transition-colors">
            <Plus className="w-4 h-4 text-amber-700" />
          </button>
        </div>

        {latest && (
          <div className="flex items-center gap-4 bg-white/50 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Latest</p>
              <p className="text-2xl font-bold text-amber-700">{latest.weight} <span className="text-sm font-normal text-slate-500">kg</span></p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Week</p>
              <p className="text-lg font-semibold text-slate-700">W{latest.week}</p>
            </div>
          </div>
        )}

        {showForm && (
          <div className="flex gap-2 items-center">
            <input type="number" step="0.1" placeholder="Weight in kg" value={weight} onChange={e => setWeight(e.target.value)}
              className="flex-1 border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white/70" />
            <button onClick={() => addWeight.mutate()} disabled={!weight || addWeight.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", fontSize: "11px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="weight" radius={[4, 4, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length === 0 && !showForm && (
          <p className="text-xs text-slate-400 text-center py-2">No weight logs yet. Tap + to add your first reading.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── BP Tracker ─────────────────────────────────────────────────────────────────
function BPTracker({ patientId, patient }: { patientId: number; patient: any }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");

  const { data: metrics = [] } = useQuery<any[]>({
    queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`],
    queryFn: async () => { const r = await fetch(`/api/pregnancy-metrics?patientId=${patientId}`); return r.json(); },
  });

  const bpLogs = [...metrics].filter((m: any) => m.systolic && m.diastolic).sort((a: any, b: any) => b.week - a.week);
  const latest = bpLogs[0];

  const getBPStatus = (sys: number, dia: number) => {
    if (sys >= 160 || dia >= 110) return { label: "Severe — Call Doctor", color: "text-red-700 bg-red-100 border-red-200", icon: <AlertTriangle className="w-3 h-3" /> };
    if (sys >= 140 || dia >= 90) return { label: "High — Monitor Closely", color: "text-rose-700 bg-rose-100 border-rose-200", icon: <AlertTriangle className="w-3 h-3" /> };
    if (sys >= 120 || dia >= 80) return { label: "Elevated", color: "text-amber-700 bg-amber-100 border-amber-200", icon: <Info className="w-3 h-3" /> };
    return { label: "Normal", color: "text-emerald-700 bg-emerald-100 border-emerald-200", icon: <ShieldCheck className="w-3 h-3" /> };
  };

  const status = latest ? getBPStatus(latest.systolic, latest.diastolic) : null;

  const addBP = useMutation({
    mutationFn: async () => {
      const week = patient?.lmp ? Math.floor((new Date().getTime() - new Date(patient.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000)) : 20;
      const r = await fetch("/api/pregnancy-metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, week, systolic: parseInt(systolic), diastolic: parseInt(diastolic), enteredBy: "patient" }) });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/pregnancy-metrics?patientId=${patientId}`] }); setShowForm(false); setSystolic(""); setDiastolic(""); },
  });

  return (
    <Card className="glass-panel border-rose-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-pink-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 rounded-xl"><Activity className="w-4 h-4 text-rose-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Blood Pressure</h3>
              <p className="text-[10px] text-muted-foreground">Systolic / Diastolic</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="p-1.5 bg-rose-100 hover:bg-rose-200 rounded-full transition-colors">
            <Plus className="w-4 h-4 text-rose-700" />
          </button>
        </div>

        {latest && status && (
          <div className="flex items-center gap-4 bg-white/50 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Latest Reading</p>
              <p className="text-2xl font-bold text-rose-700">{latest.systolic}<span className="text-base text-slate-400 font-normal">/{latest.diastolic}</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">mmHg • Week {latest.week}</p>
            </div>
            <Badge className={`text-[10px] flex items-center gap-1 border ${status.color}`}>{status.icon}{status.label}</Badge>
          </div>
        )}

        {showForm && (
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="Systolic" value={systolic} onChange={e => setSystolic(e.target.value)}
              className="w-1/3 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white/70 text-center" />
            <span className="text-slate-400 font-bold">/</span>
            <input type="number" placeholder="Diastolic" value={diastolic} onChange={e => setDiastolic(e.target.value)}
              className="w-1/3 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white/70 text-center" />
            <button onClick={() => addBP.mutate()} disabled={!systolic || !diastolic || addBP.isPending}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">Save</button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {bpLogs.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recent Readings</p>
            {bpLogs.slice(0, 4).map((m: any, i: number) => {
              const s = getBPStatus(m.systolic, m.diastolic);
              return (
                <div key={m.id || i} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-slate-700 font-medium">{m.systolic}/{m.diastolic} <span className="text-[10px] font-normal text-slate-400">mmHg</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Week {m.week}</span>
                    <Badge className={`text-[10px] border ${s.color}`}>{s.label.split(" —")[0]}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {bpLogs.length === 0 && !showForm && (
          <p className="text-xs text-slate-400 text-center py-2">No BP readings yet. Tap + to log your first reading.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Medicine Tracker ──────────────────────────────────────────────────────────
function MedicineTracker({ patientId, medications }: { patientId: number; medications: any[] }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const activeMeds = medications.filter((m: any) => !m.status || (m.status || "").toLowerCase() === "active");

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: [`/api/medication-logs?patientId=${patientId}&date=${today}`],
    queryFn: async () => { const r = await fetch(`/api/medication-logs?patientId=${patientId}&date=${today}`); return r.json(); },
  });

  const takenIds = new Set(logs.map((l: any) => l.medicationId));
  const takenCount = takenIds.size;

  const markTaken = useMutation({
    mutationFn: async (medicationId: number) => {
      const r = await fetch("/api/medication-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, medicationId, takenDate: today, takenAt: new Date().toISOString() }) });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/medication-logs?patientId=${patientId}&date=${today}`] }),
  });

  const unmarkTaken = useMutation({
    mutationFn: async (medicationId: number) => {
      await fetch(`/api/medication-logs/unmark`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, medicationId, takenDate: today }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/medication-logs?patientId=${patientId}&date=${today}`] }),
  });

  return (
    <Card className="glass-panel border-violet-200/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-white/40" />
      <CardContent className="relative p-5 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 rounded-xl"><Pill className="w-4 h-4 text-violet-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Today's Medicines</h3>
              <p className="text-[10px] text-muted-foreground">{takenCount} of {activeMeds.length} taken today</p>
            </div>
          </div>
          <div className={`text-sm font-bold ${takenCount === activeMeds.length && activeMeds.length > 0 ? "text-emerald-600" : "text-violet-600"}`}>
            {takenCount}/{activeMeds.length}
          </div>
        </div>

        {/* Progress bar */}
        {activeMeds.length > 0 && (
          <div className="w-full bg-violet-100 rounded-full h-1.5">
            <div className="bg-gradient-to-r from-violet-400 to-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(takenCount / activeMeds.length) * 100}%` }} />
          </div>
        )}

        {activeMeds.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No active medications prescribed.</p>
        ) : (
          <div className="space-y-2">
            {activeMeds.map((med: any) => {
              const taken = takenIds.has(med.id);
              return (
                <button key={med.id} onClick={() => taken ? unmarkTaken.mutate(med.id) : markTaken.mutate(med.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all text-left ${taken ? "bg-emerald-50 border-emerald-200" : "bg-white/60 border-white/60 hover:border-violet-200"}`}>
                  <div className={`shrink-0 ${taken ? "text-emerald-500" : "text-slate-300"}`}>
                    {taken ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${taken ? "text-emerald-800 line-through opacity-70" : "text-slate-800"}`}>{med.name}</p>
                    <p className="text-[10px] text-slate-400">{[med.dose, med.frequency].filter(Boolean).join(" — ")}</p>
                  </div>
                  {taken && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">Taken</Badge>}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Week by Week Timeline ─────────────────────────────────────────────────────
function WeekByWeekSection({ patient }: { patient: any }) {
  const currentWeek = patient?.lmp
    ? Math.min(40, Math.max(4, Math.floor((new Date().getTime() - new Date(patient.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000))))
    : 20;
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const scrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      const btn = scrollRef.current.querySelector(`[data-week="${currentWeek}"]`);
      btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentWeek]);

  const data = getWeekData(selectedWeek);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-serif font-semibold text-slate-800">Pregnancy Timeline</h3>
        <Badge className="text-[10px] bg-pink-100 text-pink-700 border-pink-200">Week {currentWeek} now</Badge>
      </div>

      {/* Week Selector */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {Array.from({ length: 37 }, (_, i) => i + 4).map(week => (
          <button key={week} data-week={week} onClick={() => setSelectedWeek(week)}
            className={`shrink-0 w-10 h-10 rounded-full text-xs font-bold transition-all border ${week === selectedWeek ? "bg-pink-500 text-white border-pink-500 shadow" : week === currentWeek ? "bg-pink-100 text-pink-700 border-pink-300" : "bg-white/60 text-slate-500 border-white/60 hover:border-pink-200"}`}>
            {week}
          </button>
        ))}
      </div>

      {/* Week Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div key={selectedWeek} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          <Card className="border-pink-200/40 overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50/70 via-rose-50/30 to-white/60" />
            <CardContent className="relative p-5 z-10 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="text-5xl">{data.emoji}</div>
                <div>
                  <p className="text-[10px] text-pink-400 uppercase tracking-wider font-semibold">Week {selectedWeek}</p>
                  <p className="text-lg font-serif text-pink-800 font-semibold">{data.fruit}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-slate-500">📏 {data.length}</span>
                    <span className="text-xs text-slate-500">⚖️ {data.weight}</span>
                  </div>
                </div>
              </div>

              {/* Trimester badge */}
              <Badge className={`text-[10px] ${selectedWeek < 13 ? "bg-violet-100 text-violet-700 border-violet-200" : selectedWeek < 28 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}>
                {selectedWeek < 13 ? "1st Trimester" : selectedWeek < 28 ? "2nd Trimester" : "3rd Trimester"}
              </Badge>

              {/* Development */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Baby className="w-3.5 h-3.5 text-pink-500" />Baby's Development</p>
                <div className="space-y-1.5">
                  {data.development.map((d, i) => (
                    <div key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" /><p className="text-sm text-slate-700">{d}</p></div>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-500" />Common Symptoms</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.symptoms.map((s, i) => (
                    <span key={i} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-0.5">{s}</span>
                  ))}
                </div>
              </div>

              {/* Dos and Don'ts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Do</p>
                  <div className="space-y-1">
                    {data.dos.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /><p className="text-xs text-slate-600 leading-relaxed">{d}</p></div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-600 mb-2 flex items-center gap-1"><X className="w-3.5 h-3.5" />Avoid</p>
                  <div className="space-y-1">
                    {data.donts.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /><p className="text-xs text-slate-600 leading-relaxed">{d}</p></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition tip */}
              <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-start gap-3">
                <Utensils className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800 leading-relaxed"><span className="font-semibold">Nutrition: </span>{data.nutrition}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Week nav buttons */}
      <div className="flex justify-between items-center">
        <button onClick={() => setSelectedWeek(w => Math.max(4, w - 1))} disabled={selectedWeek <= 4}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-pink-600 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Prev week
        </button>
        <button onClick={() => setSelectedWeek(currentWeek)} className="text-xs text-pink-500 hover:text-pink-700 font-medium transition-colors">
          Jump to Week {currentWeek}
        </button>
        <button onClick={() => setSelectedWeek(w => Math.min(40, w + 1))} disabled={selectedWeek >= 40}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-pink-600 disabled:opacity-30 transition-colors">
          Next week <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Records Section ───────────────────────────────────────────────────────────
function RecordsSection({ patientId, patient }: { patientId: number; patient: any }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<"Diagnostic" | "Prescription">("Diagnostic");
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: docs = [] } = useQuery<any[]>({
    queryKey: [`/api/patient-documents?patientId=${patientId}`],
    queryFn: async () => { const r = await fetch(`/api/patient-documents?patientId=${patientId}`); return r.json(); },
  });

  const currentTrimester = patient?.lmp
    ? (Math.floor((new Date().getTime() - new Date(patient.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000)) < 13 ? 1 : Math.floor((new Date().getTime() - new Date(patient.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000)) < 27 ? 2 : 3)
    : undefined;

  const uploadDoc = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = (e.target?.result as string).split(",")[1];
        const r = await fetch("/api/patient-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, fileName: file.name, fileData, mimeType: file.type, docType, trimester: currentTrimester, label: label || file.name, uploadedAt: new Date().toISOString() }),
        });
        if (r.ok) { qc.invalidateQueries({ queryKey: [`/api/patient-documents?patientId=${patientId}`] }); setLabel(""); }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  const deleteDoc = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/patient-documents/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/patient-documents?patientId=${patientId}`] }),
  });

  const diagnostics = docs.filter((d: any) => d.docType === "Diagnostic");
  const prescriptions = docs.filter((d: any) => d.docType === "Prescription");

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Upload Section */}
      <Card className="glass-panel border-indigo-200/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-blue-50/30 to-white/40" />
        <CardContent className="relative p-5 z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-xl"><Upload className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Upload Report</h3>
              <p className="text-[10px] text-muted-foreground">Image or PDF · Max 5 MB</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(["Diagnostic", "Prescription"] as const).map(t => (
              <button key={t} onClick={() => setDocType(t)}
                className={`flex-1 text-xs font-semibold py-2 rounded-xl border transition-all ${docType === t ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white/60 text-slate-500 border-white/60 hover:border-indigo-100"}`}>
                {t === "Diagnostic" ? "🔬 Diagnostic" : "📋 Prescription"}
              </button>
            ))}
          </div>

          <input placeholder="Label (e.g. Anomaly Scan W20)" value={label} onChange={e => setLabel(e.target.value)}
            className="w-full border border-indigo-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white/70" />

          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ""; }} />

          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl py-4 flex flex-col items-center gap-2 transition-colors group disabled:opacity-50">
            {uploading ? <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />}
            <p className="text-xs text-slate-500">{uploading ? "Uploading…" : "Tap to choose file"}</p>
          </button>
        </CardContent>
      </Card>

      {/* Diagnostic Reports */}
      <DocList title="Diagnostic Reports" icon={<FileText className="w-4 h-4 text-purple-600" />} docs={diagnostics} onDelete={id => deleteDoc.mutate(id)} />
      {/* Prescriptions */}
      <DocList title="Prescriptions" icon={<Image className="w-4 h-4 text-blue-600" />} docs={prescriptions} onDelete={id => deleteDoc.mutate(id)} />
    </div>
  );
}

function DocList({ title, icon, docs, onDelete }: { title: string; icon: React.ReactNode; docs: any[]; onDelete: (id: number) => void }) {
  if (docs.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <Badge variant="outline" className="text-[10px] ml-auto">{docs.length}</Badge>
      </div>
      <div className="space-y-2">
        {docs.map((doc: any) => (
          <Card key={doc.id} className="glass-panel border-white/60">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                {doc.mimeType?.includes("image") ? <Image className="w-4 h-4 text-slate-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.label || doc.fileName}</p>
                <p className="text-[10px] text-slate-400">
                  {doc.trimester ? `Trimester ${doc.trimester}` : ""}{doc.trimester && doc.uploadedAt ? " · " : ""}
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </p>
              </div>
              <button onClick={() => onDelete(doc.id)} className="text-slate-300 hover:text-rose-400 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
