import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const PHASES = [
  {
    id: "rest",
    label: "Weeks 1–2",
    title: "Rest & Gentle Recovery",
    color: "#FFF7ED",
    textColor: "#EA580C",
    icon: "moon" as const,
    note: "Your body is healing — rest is your most important exercise.",
    exercises: [
      { name: "Deep belly breathing", duration: "5 min, 3×/day", desc: "Lie on your back, inhale deeply expanding your belly, exhale slowly." },
      { name: "Pelvic floor contractions", duration: "10 reps, 3×/day", desc: "Gently squeeze and hold pelvic floor muscles for 5 seconds, release." },
      { name: "Ankle circles", duration: "10 circles each side", desc: "Improves circulation and reduces swelling." },
      { name: "Short slow walks", duration: "5–10 min", desc: "Start with brief walks around the house or garden." },
    ],
  },
  {
    id: "gentle",
    label: "Weeks 3–6",
    title: "Gentle Movement",
    color: "#ECFDF5",
    textColor: "#16A34A",
    icon: "wind" as const,
    note: "Listen to your body. Stop if you feel pain or pressure.",
    exercises: [
      { name: "Pelvic tilts", duration: "10 reps, 3×/day", desc: "Lie on back, gently tilt pelvis to flatten lower back against the floor." },
      { name: "Glute bridges", duration: "10 reps, 2 sets", desc: "Lie on back with knees bent. Slowly lift hips, hold 2 seconds, lower." },
      { name: "Cat-cow stretches", duration: "10 reps", desc: "On hands and knees, alternate arching and rounding your back gently." },
      { name: "Walking", duration: "15–20 min", desc: "Gradually increase walking time each week as energy allows." },
      { name: "Postnatal yoga", duration: "20 min", desc: "Gentle postnatal yoga stretches for the hips, back, and shoulders." },
    ],
  },
  {
    id: "progressive",
    label: "6+ Weeks",
    title: "Progressive Exercises",
    color: "#EFF6FF",
    textColor: "#2563EB",
    icon: "trending-up" as const,
    note: "Get clearance from your doctor before starting higher-intensity exercise.",
    exercises: [
      { name: "Modified plank", duration: "3 × 20 sec holds", desc: "Start with a kneeling plank to rebuild core strength safely." },
      { name: "Squats", duration: "3 × 12 reps", desc: "Bodyweight squats to strengthen legs and glutes." },
      { name: "Side-lying leg raises", duration: "3 × 12 each side", desc: "Targets outer hips and core stability." },
      { name: "Swimming or cycling", duration: "20–30 min", desc: "Low-impact cardio when you feel ready." },
      { name: "Postnatal pilates", duration: "30 min class", desc: "Focuses on core, pelvic floor, and postural alignment." },
      { name: "Light strength training", duration: "30 min", desc: "Start with light weights; prioritise form over load." },
    ],
  },
];

export default function PostpartumFitnessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openPhase, setOpenPhase] = useState<string>("rest");

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(postpartum)")}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Postpartum Fitness</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningCard}>
          <Feather name="alert-circle" size={15} color="#F59E0B" style={{ marginRight: 6 }} />
          <ThemedText style={styles.warningText}>
            Always consult your doctor before resuming exercise, especially after a C-section.
          </ThemedText>
        </View>

        {PHASES.map((phase) => (
          <View key={phase.id} style={styles.phaseCard}>
            <Pressable
              style={[styles.phaseHeader, { backgroundColor: phase.color }]}
              onPress={() => setOpenPhase(openPhase === phase.id ? "" : phase.id)}
            >
              <View style={styles.phaseHeaderLeft}>
                <View style={[styles.phaseIcon, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                  <Feather name={phase.icon} size={18} color={phase.textColor} />
                </View>
                <View>
                  <ThemedText style={[styles.phaseLabel, { color: phase.textColor }]}>{phase.label}</ThemedText>
                  <ThemedText style={[styles.phaseTitle, { color: phase.textColor }]}>{phase.title}</ThemedText>
                </View>
              </View>
              <Feather
                name={openPhase === phase.id ? "chevron-up" : "chevron-down"}
                size={18} color={phase.textColor}
              />
            </Pressable>

            {openPhase === phase.id && (
              <View style={styles.phaseBody}>
                <View style={styles.noteRow}>
                  <Feather name="info" size={13} color={COLORS.textMuted} style={{ marginRight: 5 }} />
                  <ThemedText style={styles.noteText}>{phase.note}</ThemedText>
                </View>
                {phase.exercises.map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <View style={styles.exerciseDot} />
                    <View style={styles.exerciseText}>
                      <View style={styles.exerciseTop}>
                        <ThemedText style={styles.exerciseName}>{ex.name}</ThemedText>
                        <View style={styles.durationBadge}>
                          <ThemedText style={styles.durationText}>{ex.duration}</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.exerciseDesc}>{ex.desc}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFC" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm, marginLeft: -Spacing.sm },
  headerName: { flex: 1, fontSize: 17, fontWeight: "600", color: COLORS.textPrimary },
  scroll: { flex: 1 },
  warningCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FFFBEB", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: "#FEF3C7",
  },
  warningText: { fontSize: 13, color: "#92400E", flex: 1, lineHeight: 18 },
  phaseCard: {
    borderRadius: 16, overflow: "hidden", marginBottom: Spacing.md,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  phaseHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: Spacing.md,
  },
  phaseHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  phaseIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  phaseLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  phaseTitle: { fontSize: 15, fontWeight: "700" },
  phaseBody: { backgroundColor: "#FFFFFF", padding: Spacing.lg },
  noteRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.md },
  noteText: { fontSize: 13, color: COLORS.textMuted, flex: 1, lineHeight: 18, fontStyle: "italic" },
  exerciseRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.md },
  exerciseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#6C63FF", marginTop: 6, marginRight: Spacing.md, flexShrink: 0,
  },
  exerciseText: { flex: 1 },
  exerciseTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: 3, flexWrap: "wrap" },
  exerciseName: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  durationBadge: {
    backgroundColor: "#F5F3FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  durationText: { fontSize: 11, color: "#6C63FF", fontWeight: "600" },
  exerciseDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
