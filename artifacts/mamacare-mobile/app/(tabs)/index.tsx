import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useApp } from "@/context/AppContext";
import { getTodayMedicineStats, getWaterIntakeToday, getWaterGoal, getLatestWeight, getLatestBP, getAppointments, WeightLog, BPLog, Appointment } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedWeek, userProfile } = useApp();

  const [medicineStats, setMedicineStats] = useState({ total: 0, taken: 0, pending: 0 });
  const [waterProgress, setWaterProgress] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [latestBP, setLatestBP] = useState<BPLog | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);

  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;
  const trimesterText = trimester === 1 ? "First Trimester" : trimester === 2 ? "Second Trimester" : "Third Trimester";

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  const loadStats = async () => {
    try {
      const [stats, water, goal, weight, bp, appts] = await Promise.all([
        getTodayMedicineStats(), getWaterIntakeToday(), getWaterGoal(),
        getLatestWeight(), getLatestBP(), getAppointments(),
      ]);
      setMedicineStats(stats);
      setWaterIntake(water.totalMl);
      setWaterGoal(goal);
      setWaterProgress(Math.round((water.totalMl / goal) * 100));
      setLatestWeight(weight);
      setLatestBP(bp);
      const upcoming = appts.filter(a => new Date(a.dateTime) > new Date()).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
      setNextAppointment(upcoming || null);
    } catch (e) { /* ignore */ }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <LinearGradient colors={["#eaf2ff", "#f7f9fc", "#eef1f7"]} style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: Platform.OS === "web" ? 100 : 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="small" style={{ color: COLORS.textMuted }}>Week {selectedWeek} · {trimesterText}</ThemedText>
            <ThemedText type="h2" style={{ color: COLORS.textPrimary }}>
              Hi, {userProfile?.name?.split(" ")[0] || "Mama"} 👋
            </ThemedText>
          </View>
          <View style={[styles.weekBadge, { backgroundColor: COLORS.lavender }]}>
            <ThemedText type="small" style={{ color: COLORS.primary, fontWeight: "700" }}>{40 - selectedWeek}w left</ThemedText>
          </View>
        </View>

        {/* Baby card */}
        <View style={[styles.babyCard, { backgroundColor: COLORS.primary }]}>
          <View>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>Your baby this week</ThemedText>
            <ThemedText type="h3" style={{ color: "#FFF", marginTop: 2 }}>
              {selectedWeek <= 12 ? "Growing vital organs" : selectedWeek <= 20 ? "Growing stronger every day" : selectedWeek <= 30 ? "Can hear your voice now" : "Almost ready to meet you!"}
            </ThemedText>
          </View>
          <View style={styles.babyIconWrap}>
            <Feather name="heart" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        {/* Health signals */}
        <ThemedText type="h4" style={styles.sectionTitle}>Today's Health</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signalsRow}>
          <HealthChip label="Water" value={`${waterIntake}ml`} status={waterProgress >= 70 ? "On Track" : waterProgress >= 40 ? "Low" : "Low"} color={waterProgress >= 70 ? COLORS.success : COLORS.warning} icon="droplet" onPress={() => router.push("/(trackers)/water")} />
          <HealthChip label="Medicines" value={`${medicineStats.taken}/${medicineStats.total}`} status={medicineStats.pending === 0 ? "Done" : `${medicineStats.pending} left`} color={medicineStats.pending === 0 ? COLORS.success : COLORS.warning} icon="package" onPress={() => router.push("/(trackers)/medicines")} />
          {latestWeight ? <HealthChip label="Weight" value={`${latestWeight.weight}kg`} status="On Track" color="#A855F7" icon="activity" onPress={() => router.push("/(trackers)/weight")} /> : null}
          {latestBP ? <HealthChip label="Blood Pressure" value={`${latestBP.systolic}/${latestBP.diastolic}`} status={latestBP.systolic <= 120 ? "Normal" : "Elevated"} color={latestBP.systolic <= 120 ? COLORS.success : COLORS.warning} icon="heart" onPress={() => router.push("/(trackers)/bp")} /> : null}
        </ScrollView>

        {/* Quick actions */}
        <ThemedText type="h4" style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.quickGrid}>
          <QuickAction icon="droplet" label="Log Water" color="#3B82F6" bg="#EFF6FF" onPress={() => router.push("/(trackers)/water")} />
          <QuickAction icon="package" label="Medicines" color="#8B5CF6" bg="#F5F3FF" onPress={() => router.push("/(trackers)/medicines")} />
          <QuickAction icon="calendar" label="Appointments" color="#EC4899" bg="#FCE7F3" onPress={() => router.push("/(trackers)/appointments")} />
          <QuickAction icon="activity" label="Weight" color="#10B981" bg="#ECFDF5" onPress={() => router.push("/(trackers)/weight")} />
        </View>

        {/* Next appointment */}
        {nextAppointment ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>Next Appointment</ThemedText>
            <Pressable style={[styles.apptCard, Shadows.card]} onPress={() => router.push("/(trackers)/appointments")}>
              <View style={[styles.apptDate, { backgroundColor: COLORS.lavender }]}>
                <ThemedText type="h3" style={{ color: COLORS.primary, fontWeight: "700" }}>
                  {new Date(nextAppointment.dateTime).getDate()}
                </ThemedText>
                <ThemedText type="small" style={{ color: COLORS.primary }}>
                  {new Date(nextAppointment.dateTime).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4">{nextAppointment.doctorName}</ThemedText>
                <ThemedText type="small" style={{ color: COLORS.textMuted }}>
                  {new Date(nextAppointment.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </Pressable>
          </>
        ) : null}

      </ScrollView>
    </LinearGradient>
  );
}

function HealthChip({ label, value, status, color, icon, onPress }: { label: string; value: string; status: string; color: string; icon: keyof typeof Feather.glyphMap; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, Shadows.card]}>
      <Feather name={icon} size={16} color={color} />
      <ThemedText type="small" style={styles.chipLabel}>{label}</ThemedText>
      <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>{value}</ThemedText>
      <View style={[styles.chipStatus, { backgroundColor: color + "20" }]}>
        <ThemedText type="small" style={{ color, fontWeight: "600", fontSize: 11 }}>{status}</ThemedText>
      </View>
    </Pressable>
  );
}

function QuickAction({ icon, label, color, bg, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; bg: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.quickItem, Shadows.card]}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText type="small" style={styles.quickLabel}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl },
  weekBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  babyCard: { borderRadius: BorderRadius["2xl"], padding: Spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing["2xl"] },
  babyIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  sectionTitle: { marginBottom: Spacing.md, color: COLORS.textPrimary },
  signalsRow: { marginBottom: Spacing["2xl"] },
  chip: { backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.md, marginRight: Spacing.md, minWidth: 130, alignItems: "flex-start", gap: Spacing.xs },
  chipLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  chipStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: "flex-start" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing["2xl"] },
  quickItem: { width: "47%", backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: "center", gap: Spacing.sm },
  quickIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  quickLabel: { color: COLORS.textPrimary, fontWeight: "600", textAlign: "center" },
  apptCard: { backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: "row", alignItems: "center", gap: Spacing.md },
  apptDate: { width: 56, height: 56, borderRadius: BorderRadius.md, alignItems: "center", justifyContent: "center" },
});
