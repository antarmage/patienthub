import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { CareCard } from "@/components/CareCard";
import { getAppointments, getMedicines, getTodayMedicineStats, Appointment, Medicine } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function CareScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [stats, setStats] = useState({ total: 0, taken: 0, pending: 0 });

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const [appts, meds, s] = await Promise.all([getAppointments(), getMedicines(), getTodayMedicineStats()]);
    const upcoming = appts.filter(a => new Date(a.dateTime) > new Date()).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
    setNextAppt(upcoming || null);
    setMedicines(meds.slice(0, 3));
    setStats(s);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <ThemedText type="h2" style={styles.title}>Care Plan</ThemedText>
        <ThemedText type="small" style={styles.subtitle}>Your health, organised</ThemedText>

        {/* Next appointment */}
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Next Appointment</ThemedText>
          <Pressable onPress={() => router.push("/(trackers)/appointments")}>
            <Feather name="plus" size={20} color={COLORS.primary} />
          </Pressable>
        </View>

        {nextAppt ? (
          <Pressable style={[styles.apptCard, Shadows.card]} onPress={() => router.push("/(trackers)/appointments")}>
            <View style={[styles.apptDate, { backgroundColor: COLORS.lavender }]}>
              <ThemedText type="h3" style={{ color: COLORS.primary, fontWeight: "700" }}>{new Date(nextAppt.dateTime).getDate()}</ThemedText>
              <ThemedText type="small" style={{ color: COLORS.primary }}>{new Date(nextAppt.dateTime).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">{nextAppt.doctorName}</ThemedText>
              <ThemedText type="small" style={{ color: COLORS.textMuted }}>{nextAppt.clinicName} · {new Date(nextAppt.dateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</ThemedText>
            </View>
          </Pressable>
        ) : (
          <Pressable style={[styles.addCard, Shadows.card]} onPress={() => router.push("/(trackers)/appointments")}>
            <Feather name="plus-circle" size={20} color={COLORS.primary} />
            <ThemedText type="body" style={{ color: COLORS.primary }}>Add Appointment</ThemedText>
          </Pressable>
        )}

        {/* Medicines */}
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Medicines Today</ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>{stats.taken}/{stats.total} taken</ThemedText>
        </View>

        {medicines.length > 0 ? medicines.map(m => (
          <View key={m.id} style={[styles.medItem, Shadows.card]}>
            <View style={[styles.medIcon, { backgroundColor: COLORS.softPurple }]}>
              <Feather name="package" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">{m.name}</ThemedText>
              <ThemedText type="small" style={{ color: COLORS.textMuted }}>{m.dosage} · {m.frequency}</ThemedText>
            </View>
          </View>
        )) : (
          <Pressable style={[styles.addCard, Shadows.card]} onPress={() => router.push("/(trackers)/medicines")}>
            <Feather name="plus-circle" size={20} color={COLORS.primary} />
            <ThemedText type="body" style={{ color: COLORS.primary }}>Add Medicine</ThemedText>
          </Pressable>
        )}

        {/* Trackers */}
        <ThemedText type="h4" style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>Self-Trackers</ThemedText>
        <CareCard title="Medicines" subtitle="Track your daily medications" icon="package" iconBg={COLORS.softPurple} iconColor={COLORS.primary} badge={stats.pending > 0 ? String(stats.pending) : undefined} onPress={() => router.push("/(trackers)/medicines")} />
        <CareCard title="Water Intake" subtitle="Stay hydrated daily" icon="droplet" iconBg={COLORS.lightBlue} iconColor="#3B82F6" onPress={() => router.push("/(trackers)/water")} />
        <CareCard title="Weight" subtitle="Monitor your weight gain" icon="activity" iconBg={COLORS.softGreen} iconColor={COLORS.success} onPress={() => router.push("/(trackers)/weight")} />
        <CareCard title="Blood Pressure" subtitle="Track your BP readings" icon="heart" iconBg={COLORS.softPink} iconColor="#EC4899" onPress={() => router.push("/(trackers)/bp")} />
        <CareCard title="Appointments" subtitle="Manage your schedule" icon="calendar" iconBg={COLORS.softAmber} iconColor={COLORS.warning} onPress={() => router.push("/(trackers)/appointments")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  title: { marginBottom: 2 },
  subtitle: { color: COLORS.textMuted, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md, marginTop: Spacing.lg },
  apptCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  apptDate: { width: 56, height: 56, borderRadius: BorderRadius.md, alignItems: "center", justifyContent: "center" },
  addCard: { flexDirection: "row", gap: Spacing.sm, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.lavender, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  medItem: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm },
  medIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
