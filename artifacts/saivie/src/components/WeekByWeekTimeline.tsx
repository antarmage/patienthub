import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Baby, Utensils, ShieldCheck, Activity, ChevronLeft, ChevronRight, X
} from "lucide-react";

export const WEEK_DATA: Record<number, {
  fruit: string; emoji: string; length: string; weight: string;
  development: string[]; symptoms: string[]; dos: string[]; donts: string[]; nutrition: string;
}> = {
  1: { fruit: "Poppy seed (fertilisation)", emoji: "🌱", length: "<1 mm", weight: "<1 g", development: ["Egg and sperm unite — conception may occur this week", "Cell division begins rapidly", "Implantation journey starts"], symptoms: ["No physical symptoms yet", "Cycle day 1 of last menstrual period", "This is the reference start of pregnancy dating"], dos: ["Begin folic acid 5 mg/day if not already started", "Avoid alcohol, smoking, and recreational drugs", "Maintain a balanced, nutrient-dense diet"], donts: ["Take unnecessary medications without doctor advice", "Stress about confirming pregnancy this early"], nutrition: "Start folic acid now if you haven't — it prevents neural tube defects in the first weeks of development." },
  2: { fruit: "Poppy seed", emoji: "🌱", length: "<1 mm", weight: "<1 g", development: ["Ovulation occurs mid-week", "Fertilisation possible in the fallopian tube", "Zygote (fertilised egg) begins dividing"], symptoms: ["Possible mild ovulation pain (mittelschmerz)", "Cervical mucus changes (egg-white consistency)", "Heightened libido around ovulation"], dos: ["Track ovulation with LH strips if TTC", "Continue folic acid and prenatal vitamins", "Stay hydrated and eat iron-rich foods"], donts: ["Over-exercise or overheat during the implantation window", "Test for pregnancy yet — too early"], nutrition: "Zinc and selenium support egg quality: pumpkin seeds, Brazil nuts, eggs, whole grains." },
  3: { fruit: "Poppy seed (implanting)", emoji: "🫘", length: "~0.1 mm", weight: "<1 g", development: ["Blastocyst implants into uterine wall", "Placenta and amniotic sac begin forming", "hCG hormone starts being produced — pregnancy begins!"], symptoms: ["Implantation spotting (light pink/brown) possible", "Mild cramping possible", "Pregnancy tests may just begin to show positive by end of week"], dos: ["Continue folic acid", "Avoid NSAIDs (ibuprofen) which can interfere with implantation", "Rest well and reduce stress"], donts: ["Take a pregnancy test before day 10 post-ovulation", "Ignore persistent heavy bleeding (contact doctor)"], nutrition: "Vitamin B6 (bananas, potatoes, chickpeas) supports implantation and early hormone balance." },
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
  27: { fruit: "Head of lettuce", emoji: "🥬", length: "~36.6 cm", weight: "~875 g", development: ["Third trimester begins!", "Blinking eyes", "Brain tissue growing fast"], symptoms: ["Shortness of breath", "Backache worsening", "Feeling very full quickly"], dos: ["Small frequent meals", "Antenatal checkups every 2 weeks now", "Gentle yoga"], donts: ["Skip back exercises", "Overeat even if appetite is high"], nutrition: "DHA: fatty fish, algal oil supplement — brain and eye development." },
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

export function getWeekData(week: number) {
  const clamped = Math.max(1, Math.min(40, week));
  const keys = Object.keys(WEEK_DATA).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, curr) => Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev);
  return WEEK_DATA[closest];
}

interface Props { patient: any; compact?: boolean; }

export default function WeekByWeekTimeline({ patient, compact = false }: Props) {
  const currentWeek = patient?.lmp
    ? Math.min(40, Math.max(1, Math.floor((new Date().getTime() - new Date(patient.lmp).getTime()) / (7 * 24 * 60 * 60 * 1000))))
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
    <div className={compact ? "space-y-3" : "space-y-4 animate-in fade-in duration-500"}>
      {!compact && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-serif font-semibold text-slate-800">Week by Week Guide</h3>
          <Badge className="text-[10px] bg-pink-100 text-pink-700 border-pink-200">Week {currentWeek} now</Badge>
        </div>
      )}

      {/* Week Selector */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {Array.from({ length: 40 }, (_, i) => i + 1).map(week => (
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
            <CardContent className="relative p-5 z-10 space-y-4">
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
                <div className="ml-auto">
                  <Badge className={`text-[10px] ${selectedWeek < 13 ? "bg-violet-100 text-violet-700 border-violet-200" : selectedWeek < 28 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}>
                    {selectedWeek < 13 ? "T1" : selectedWeek < 28 ? "T2" : "T3"}
                  </Badge>
                </div>
              </div>

              {/* Development */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5 text-pink-500" />Baby's Development
                </p>
                <div className="space-y-1">
                  {data.development.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" />
                      <p className="text-sm text-slate-700">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />Common Symptoms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.symptoms.map((s, i) => (
                    <span key={i} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-0.5">{s}</span>
                  ))}
                </div>
              </div>

              {/* Dos and Don'ts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Do</p>
                  <div className="space-y-1">
                    {data.dos.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <p className="text-xs text-slate-600 leading-relaxed">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-600 mb-1.5 flex items-center gap-1"><X className="w-3.5 h-3.5" />Avoid</p>
                  <div className="space-y-1">
                    {data.donts.map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <p className="text-xs text-slate-600 leading-relaxed">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition tip */}
              <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-start gap-3">
                <Utensils className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-semibold">Nutrition: </span>{data.nutrition}
                </p>
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
