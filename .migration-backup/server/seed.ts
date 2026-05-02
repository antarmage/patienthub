import { db } from "./db";
import {
  patients, providers, services, appointments, labTasks,
  nutritionPlans, workouts, hormoneReadings, pregnancyMetrics,
  follicleData, usgData, users
} from "@shared/schema";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    console.log("Seeding users...");
    await db.insert(users).values([
      { username: "dr.sai", password: "123", role: "clinician" },
      { username: "dr.priya", password: "1234", role: "clinician" },
      { username: "dr.ramesh", password: "5678", role: "clinician" },
      { username: "staff.reception", password: "0000", role: "staff" },
      { username: "staff.nurse", password: "1111", role: "staff" },
      { username: "owner", password: "9999", role: "staff" },
    ]);
  }

  const existingPatients = await db.select().from(patients);
  if (existingPatients.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  const [p1, p2, p3, p4, p5] = await db.insert(patients).values([
    {
      name: "Ananya S.",
      age: 29,
      status: "High Risk",
      focus: "Natural Conception",
      lastVisit: "2 days ago",
      cycleDay: 14,
      avatar: "AS",
      mode: "natural_conception",
      referredBy: "Dr. Sharma (GP)",
      referredTo: "Nutritionist",
      vaccination: "Up to Date",
      insurance: "Private (Gold)",
      contraception: "None (TTC)",
      history: {
        medical: ["PCOS (diagnosed 2018)", "Hypothyroidism", "Mild Asthma"],
        surgical: ["Appendectomy (2015)"],
        drug: ["Metformin 500mg", "Levothyroxine 50mcg", "Multivitamin"],
        allergies: ["Penicillin", "Peanuts"]
      },
      type: "Fertility",
      mood: "Anxious",
      weight: 68,
      hb: 11.2,
      genomics: {
        mthfr: { status: "Heterozygous", risk: "Medium" },
        caffeine: { status: "Slow Metabolizer", risk: "High" },
        gluten: { status: "HLA-DQ2 Positive", risk: "High" },
        comt: { status: "Met/Met (Worrier)", risk: "Medium" }
      },
      functional: {
        gut: { status: "Dysbiosis", score: 45 },
        inflammation: { marker: "hs-CRP", value: "3.2", status: "Elevated" },
        nutrient: { deficiency: "Vitamin D, Magnesium", status: "Critical" },
        hormone: { focus: "Estrogen Dominance", status: "Imbalanced" }
      },
      intervention: {
        protocol: "Supplement Protocol (Active)",
        dietPhase: "Elimination Diet (Week 2)"
      },
      plan: "Anti-inflammatory, Gluten-Free",
      nextReview: "2 days",
      clinicianNote: "Referral: Dr. Reynolds. Patient struggles with insulin resistance. Focus on fiber intake and low glycemic load.",
      condition: "PCOS (Insulin Resistant)",
    },
    {
      name: "Meera D.",
      age: 34,
      status: "Monitor",
      focus: "Pregnancy Wk 24",
      lastVisit: "1 week ago",
      cycleDay: null,
      avatar: "MD",
      mode: "pregnancy",
      referredBy: "Self",
      referredTo: "Fetal Medicine",
      vaccination: "Flu Shot Due",
      insurance: "Corporate",
      contraception: "N/A",
      history: {
        medical: ["GDM (Gestational Diabetes)", "Anemia"],
        surgical: ["C-Section (Previous Birth 2020)"],
        drug: ["Insulin", "Iron Supplements", "Calcium"],
        allergies: ["None"]
      },
      type: "Pregnant",
      mood: "Stable",
      weight: 72,
      hb: 10.5,
      genomics: {
        mthfr: { status: "Homozygous", risk: "High" },
        caffeine: { status: "Slow Metabolizer", risk: "High" },
        carbs: { status: "TCF7L2 Variant", risk: "High" },
        comt: { status: "Val/Val (Warrior)", risk: "Low" }
      },
      functional: {
        gut: { status: "Stable", score: 85 },
        inflammation: { marker: "Insulin", value: "18", status: "High" },
        nutrient: { deficiency: "Chromium", status: "Moderate" },
        hormone: { focus: "Insulin Sensitivity", status: "Resistant" }
      },
      intervention: {
        protocol: "Metabolic Reset (Day 5)",
        dietPhase: "Low GI Strict"
      },
      plan: "Low Glycemic Index, Methylated Folate",
      nextReview: "Tomorrow",
      clinicianNote: "Referral: Dr. Reynolds. GDM risk high. Strict sugar control needed. Monitor post-prandial spikes.",
      condition: "Gestational Diabetes Risk",
    },
    {
      name: "Sarah J.",
      age: 31,
      status: "Stable",
      focus: "Postpartum Wk 6",
      lastVisit: "3 weeks ago",
      cycleDay: null,
      avatar: "SJ",
      mode: "postpartum",
      referredBy: "Dr. Khan (OBGYN)",
      referredTo: "Psychologist",
      vaccination: "Completed",
      insurance: "Self-Pay",
      contraception: "Discussing (IUD)",
      history: {
        medical: ["Postpartum Depression (Mild)", "Hypertension (Resolved)"],
        surgical: ["Episiotomy (2025)"],
        drug: ["Sertraline 50mg", "Vitamin D"],
        allergies: ["Latex"]
      },
      type: "Postpartum",
      mood: "Depressed",
      weight: 65,
      hb: 12.0,
      genomics: null,
      functional: null,
      intervention: null,
      plan: null,
      nextReview: null,
      clinicianNote: null,
      condition: null,
    },
    {
      name: "Elena R.",
      age: 36,
      status: "Active Cycle",
      focus: "IUI Cycle #2",
      lastVisit: "Yesterday",
      cycleDay: 11,
      avatar: "ER",
      mode: "iui",
      referredBy: "Dr. Patel (Endo)",
      referredTo: "-",
      vaccination: "Up to Date",
      insurance: "Private",
      contraception: "None (TTC)",
      history: null,
      type: "Fertility",
      mood: "Stressed",
      weight: 62,
      hb: 12.5,
      genomics: null,
      functional: null,
      intervention: null,
      plan: null,
      nextReview: null,
      clinicianNote: null,
      condition: null,
    },
    {
      name: "Priya K.",
      age: 28,
      status: "Assessment",
      focus: "PCOS Mgmt",
      lastVisit: "Today",
      cycleDay: 21,
      avatar: "PK",
      mode: "hormone_care",
      referredBy: "Dr. Lee (Derm)",
      referredTo: "Dietitian",
      vaccination: "HPV Due",
      insurance: "Corporate",
      contraception: "Oral Pill",
      history: null,
      type: "PCOS",
      mood: "Stable",
      weight: 78,
      hb: 11.8,
      genomics: {
        mthfr: { status: "Normal", risk: "Low" },
        caffeine: { status: "Fast Metabolizer", risk: "Low" },
        gluten: { status: "Negative", risk: "Low" },
        estrogen: { status: "CYP1A1 Slow", risk: "High" }
      },
      functional: {
        gut: { status: "Leaky Gut", score: 60 },
        inflammation: { marker: "Homocysteine", value: "12", status: "Borderline" },
        nutrient: { deficiency: "Omega-3", status: "Moderate" },
        hormone: { focus: "Progesterone Support", status: "Low" }
      },
      intervention: {
        protocol: "Gut Healing Protocol (Week 4)",
        dietPhase: "Reintroduction Phase"
      },
      plan: "Low Histamine, High Omega-3",
      nextReview: "1 week",
      clinicianNote: "Referral: Dr. Reynolds. Confirmed Endo Stage II. Avoid inflammatory foods. Prioritize omega-3s for pain management.",
      condition: "Endometriosis Stage II",
    },
  ]).returning();

  const [zara] = await db.insert(patients).values([
    {
      name: "Zara M.",
      age: 31,
      status: "Stable",
      focus: "Pregnancy Wk 20",
      lastVisit: "2 weeks ago",
      cycleDay: null,
      avatar: "ZM",
      mode: "pregnancy",
      referredBy: "Self",
      referredTo: "-",
      vaccination: "Up to Date",
      insurance: "Corporate",
      contraception: "N/A",
      history: null,
      type: "Pregnant",
      mood: "Stable",
      weight: 64,
      hb: 11.5,
      genomics: {
        mthfr: { status: "Heterozygous", risk: "Medium" },
        caffeine: { status: "Fast Metabolizer", risk: "Low" },
        gluten: { status: "Negative", risk: "Low" },
        comt: { status: "Val/Met (Balanced)", risk: "Low" }
      },
      functional: {
        gut: { status: "Good", score: 90 },
        inflammation: { marker: "hs-CRP", value: "0.8", status: "Optimal" },
        nutrient: { deficiency: "Iron", status: "Mild" },
        hormone: { focus: "Thyroid Support", status: "Stable" }
      },
      intervention: {
        protocol: "Prenatal Support",
        dietPhase: "Maintenance (T2)"
      },
      plan: "Prenatal Wellness, Iron-Rich",
      nextReview: "2 weeks",
      clinicianNote: "Routine prenatal care (Week 20). Focus on iron-rich foods and adequate protein for fetal growth. Monitor energy levels.",
      condition: "Pregnancy (Trimester 2)",
    }
  ]).returning();

  const [prov1, prov2, prov3] = await db.insert(providers).values([
    { name: "Dr. Sai Dibyadarshini Bhuyan", role: "Reproductive Specialist", availability: "High" },
    { name: "Dr. Priya", role: "Nutritionist", availability: "Medium" },
    { name: "Dr. Ramesh", role: "Endocrinologist", availability: "Low" },
  ]).returning();

  const [svc1, svc2, svc3, svc4] = await db.insert(services).values([
    { serviceId: "consult", name: "Initial Consultation", duration: "60 min", price: "$200" },
    { serviceId: "followup", name: "Follow-up Review", duration: "30 min", price: "$100" },
    { serviceId: "scan", name: "Ultrasound Scan", duration: "45 min", price: "$150" },
    { serviceId: "lab", name: "Blood Work", duration: "15 min", price: "$50" },
  ]).returning();

  const today = new Date().toISOString().split('T')[0];
  await db.insert(appointments).values([
    { patientId: p1.id, providerId: prov1.id, serviceId: svc3.id, date: today, time: "09:00", type: "Fertility Scan", status: "On Time" },
    { patientId: p2.id, providerId: prov1.id, serviceId: svc2.id, date: today, time: "09:30", type: "Antenatal Check", status: "Late" },
    { patientId: p3.id, providerId: prov1.id, serviceId: svc2.id, date: today, time: "10:00", type: "Postpartum Review", status: "On Time" },
    { patientId: p5.id, providerId: prov2.id, serviceId: svc1.id, date: today, time: "11:00", type: "Diet Consult", status: "On Time" },
  ]);

  await db.insert(labTasks).values([
    { patientId: p1.id, test: "Serum Progesterone", due: "Today", status: "Pending" },
    { patientId: p2.id, test: "OGTT (75g)", due: "Tomorrow", status: "Scheduled" },
    { patientId: p5.id, test: "Hormone Panel", due: "Overdue", status: "Delayed" },
  ]);

  await db.insert(nutritionPlans).values([
    { name: "Ovulation Support", tags: ["High Protein", "Low GI"], assignedTo: 12 },
    { name: "GDM Management", tags: ["Sugar Control", "Balanced"], assignedTo: 5 },
    { name: "Postpartum Healing", tags: ["Galactogogues", "Iron Rich"], assignedTo: 8 },
  ]);

  await db.insert(workouts).values([
    { name: "Follicular Yoga", phase: "Follicular", intensity: "Low" },
    { name: "Luteal Strength", phase: "Luteal", intensity: "Medium" },
    { name: "Trimester 2 Flow", phase: "Pregnancy", intensity: "Low" },
  ]);

  await db.insert(hormoneReadings).values([
    { patientId: p1.id, day: 1, estrogen: 20, progesterone: 5, lh: 5, fsh: 10, symptoms: 2 },
    { patientId: p1.id, day: 5, estrogen: 30, progesterone: 5, lh: 6, fsh: 8, symptoms: 1 },
    { patientId: p1.id, day: 10, estrogen: 60, progesterone: 6, lh: 8, fsh: 6, symptoms: 3 },
    { patientId: p1.id, day: 14, estrogen: 90, progesterone: 8, lh: 40, fsh: 15, symptoms: 2 },
    { patientId: p1.id, day: 16, estrogen: 50, progesterone: 20, lh: 10, fsh: 6, symptoms: 5 },
    { patientId: p1.id, day: 20, estrogen: 40, progesterone: 60, lh: 5, fsh: 4, symptoms: 7 },
    { patientId: p1.id, day: 25, estrogen: 30, progesterone: 40, lh: 4, fsh: 4, symptoms: 8 },
    { patientId: p1.id, day: 28, estrogen: 25, progesterone: 10, lh: 4, fsh: 8, symptoms: 4 },
  ]);

  await db.insert(pregnancyMetrics).values([
    { patientId: p2.id, week: 12, weight: 60, expected: 61, systolic: 110, diastolic: 70 },
    { patientId: p2.id, week: 16, weight: 62, expected: 63, systolic: 112, diastolic: 72 },
    { patientId: p2.id, week: 20, weight: 65, expected: 65, systolic: 115, diastolic: 74 },
    { patientId: p2.id, week: 24, weight: 68, expected: 68, systolic: 122, diastolic: 82 },
    { patientId: p2.id, week: 28, weight: 71, expected: 71, systolic: 120, diastolic: 80 },
    { patientId: p2.id, week: 32, weight: 74, expected: 74, systolic: 122, diastolic: 81 },
  ]);

  await db.insert(follicleData).values([
    { patientId: p4.id, day: 3, left: 5, right: 4, endometrium: 4 },
    { patientId: p4.id, day: 7, left: 8, right: 6, endometrium: 5.5 },
    { patientId: p4.id, day: 10, left: 14, right: 9, endometrium: 7.2 },
    { patientId: p4.id, day: 12, left: 18, right: 11, endometrium: 9.1 },
  ]);

  await db.insert(usgData).values([
    { patientId: p2.id, week: 12, hc: 60, ac: 55, fl: 8 },
    { patientId: p2.id, week: 16, hc: 110, ac: 100, fl: 20 },
    { patientId: p2.id, week: 20, hc: 180, ac: 160, fl: 32 },
    { patientId: p2.id, week: 24, hc: 220, ac: 200, fl: 43 },
    { patientId: p2.id, week: 28, hc: 260, ac: 240, fl: 52 },
  ]);

  console.log("Database seeded successfully!");
}
