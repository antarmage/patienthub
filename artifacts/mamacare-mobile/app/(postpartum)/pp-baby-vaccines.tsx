import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";
import { requestNotificationPermissions } from "@/utils/notifications";

const BABY_DOB_KEY = "@saiviemom_pp_baby_dob";
const NOTIF_KEY_PREFIX = "@saiviemom_pp_bvax_notif_";

interface VaccineEntry {
  id: string;
  name: string;
  diseases: string;
  ageWeeks: number | null;
  ageMonths: number | null;
  ageLabel: string;
}

const SCHEDULE: VaccineEntry[] = [
  { id: "birth_hepb", name: "Hepatitis B (1st dose)", diseases: "Hepatitis B", ageWeeks: null, ageMonths: null, ageLabel: "At birth" },
  { id: "6wk", name: "DTP + Hib + PCV + IPV + Rotavirus", diseases: "Diphtheria, Tetanus, Pertussis, Hib disease, Pneumococcal, Polio, Rotavirus", ageWeeks: 6, ageMonths: null, ageLabel: "6 weeks" },
  { id: "10wk", name: "DTP + Hib + PCV + IPV + Rotavirus (2nd)", diseases: "Same as 6-week doses", ageWeeks: 10, ageMonths: null, ageLabel: "10 weeks" },
  { id: "14wk", name: "DTP + Hib + PCV + IPV + Rotavirus (3rd)", diseases: "Same as 6-week doses (booster)", ageWeeks: 14, ageMonths: null, ageLabel: "14 weeks" },
  { id: "6mo", name: "Hepatitis B (3rd) + Influenza", diseases: "Hepatitis B, Influenza", ageWeeks: null, ageMonths: 6, ageLabel: "6 months" },
  { id: "9mo", name: "MMR + Varicella", diseases: "Measles, Mumps, Rubella, Chickenpox", ageWeeks: null, ageMonths: 9, ageLabel: "9 months" },
  { id: "12mo", name: "MMR (2nd) + Hepatitis A", diseases: "Measles, Mumps, Rubella (booster), Hepatitis A", ageWeeks: null, ageMonths: 12, ageLabel: "12 months" },
];

function computeDueDate(dob: Date, entry: VaccineEntry): Date {
  const d = new Date(dob);
  if (entry.ageLabel === "At birth") return dob;
  if (entry.ageWeeks !== null) {
    d.setDate(d.getDate() + entry.ageWeeks * 7);
  } else if (entry.ageMonths !== null) {
    d.setMonth(d.getMonth() + entry.ageMonths);
  }
  return d;
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function scheduleVaxNotif(vaccine: VaccineEntry, dueDate: Date): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const granted = await requestNotificationPermissions();
  if (!granted) return null;
  const Notifications = await import("expo-notifications");
  const notifDate = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (notifDate <= new Date()) return null;
  const id = `bvax_${vaccine.id}`;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: "Baby Vaccine Due Next Week",
        body: `${vaccine.name} is due on ${formatDate(dueDate)}. Book with your paediatrician.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifDate,
      },
    });
    return id;
  } catch {
    return null;
  }
}

async function cancelVaxNotif(vaccineId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.cancelScheduledNotificationAsync(`bvax_${vaccineId}`);
  } catch {}
}

export default function PostpartumBabyVaccinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dob, setDob] = useState<Date | null>(null);
  const [notifsEnabled, setNotifsEnabled] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const dobStr = await AsyncStorage.getItem(BABY_DOB_KEY);
        if (dobStr) setDob(new Date(dobStr));

        const keys = SCHEDULE.map((v) => `${NOTIF_KEY_PREFIX}${v.id}`);
        const results = await AsyncStorage.multiGet(keys);
        const state: Record<string, boolean> = {};
        results.forEach(([key, val]) => {
          const id = key.replace(NOTIF_KEY_PREFIX, "");
          state[id] = val === "true";
        });
        setNotifsEnabled(state);
      })();
    }, [])
  );

  const toggleNotif = async (vaccine: VaccineEntry, dueDate: Date, current: boolean) => {
    const key = `${NOTIF_KEY_PREFIX}${vaccine.id}`;
    if (!current) {
      // Trying to enable — only persist if scheduling actually succeeds
      const id = await scheduleVaxNotif(vaccine, dueDate);
      if (id) {
        await AsyncStorage.setItem(key, "true");
        setNotifsEnabled((prev) => ({ ...prev, [vaccine.id]: true }));
      } else {
        Alert.alert(
          "Reminder not set",
          "Could not schedule a reminder. The vaccine may be due in less than a week, or notification permissions may be disabled."
        );
      }
    } else {
      // Turning off
      await cancelVaxNotif(vaccine.id);
      await AsyncStorage.setItem(key, "false");
      setNotifsEnabled((prev) => ({ ...prev, [vaccine.id]: false }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(postpartum)")}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Baby Vaccine Schedule</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        {!dob && (
          <View style={styles.noDobCard}>
            <Feather name="alert-circle" size={20} color="#F59E0B" style={{ marginRight: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.noDobTitle}>Baby DOB not set</ThemedText>
              <ThemedText style={styles.noDobText}>
                Go back to the Postpartum Hub to enter your baby's date of birth — it's needed to calculate vaccine due dates.
              </ThemedText>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
          <ThemedText style={styles.infoText}>
            Schedule is based on WHO/Indian national guidelines. Confirm with your paediatrician.
          </ThemedText>
        </View>

        {SCHEDULE.map((vaccine) => {
          const dueDate = dob ? computeDueDate(dob, vaccine) : null;
          const days = dueDate ? daysUntil(dueDate) : null;
          const isPast = days !== null && days < 0;
          const isToday = days === 0;
          const isSoon = days !== null && days >= 0 && days <= 14;
          const notifOn = notifsEnabled[vaccine.id] ?? false;

          return (
            <View key={vaccine.id} style={[styles.vaccineCard, isPast && styles.vaccineCardPast]}>
              <View style={styles.vaccineTop}>
                <View style={styles.ageBadge}>
                  <ThemedText style={styles.ageText}>{vaccine.ageLabel}</ThemedText>
                </View>
                {dueDate && (
                  <View style={[
                    styles.statusBadge,
                    isPast ? styles.badgeDone :
                    isToday ? styles.badgeToday :
                    isSoon ? styles.badgeSoon :
                    styles.badgeUpcoming,
                  ]}>
                    <ThemedText style={[
                      styles.statusText,
                      isPast ? { color: "#6B7280" } :
                      isToday ? { color: "#DC2626" } :
                      isSoon ? { color: "#D97706" } :
                      { color: "#6C63FF" },
                    ]}>
                      {isPast ? "Past due" : isToday ? "Today!" : `${days}d`}
                    </ThemedText>
                  </View>
                )}
              </View>

              <ThemedText style={styles.vaccineName}>{vaccine.name}</ThemedText>
              <ThemedText style={styles.vaccineDiseases}>{vaccine.diseases}</ThemedText>

              {dueDate && (
                <View style={styles.vaccineBottom}>
                  <View style={styles.dueDateRow}>
                    <Feather name="calendar" size={12} color={COLORS.textMuted} />
                    <ThemedText style={styles.dueDateText}>{formatDate(dueDate)}</ThemedText>
                  </View>
                  {!isPast && (
                    <View style={styles.notifRow}>
                      <Feather name="bell" size={13} color={notifOn ? "#F59E0B" : COLORS.textMuted} />
                      <ThemedText style={styles.notifLabel}>Remind 1 week before</ThemedText>
                      <Switch
                        value={notifOn}
                        onValueChange={() => toggleNotif(vaccine, dueDate, notifOn)}
                        trackColor={{ false: "#E5E7EB", true: "#FEF9C3" }}
                        thumbColor={notifOn ? "#F59E0B" : "#9CA3AF"}
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
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
  noDobCard: {
    flexDirection: "row", backgroundColor: "#FFFBEB", borderRadius: 12,
    padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: "#FEF3C7",
    alignItems: "flex-start",
  },
  noDobTitle: { fontSize: 14, fontWeight: "700", color: "#92400E", marginBottom: 3 },
  noDobText: { fontSize: 13, color: "#78350F", lineHeight: 18 },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FFFBEB", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: "#FEF3C7",
  },
  infoText: { fontSize: 13, color: "#92400E", flex: 1, lineHeight: 18 },
  vaccineCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  vaccineCardPast: { opacity: 0.65 },
  vaccineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  ageBadge: {
    backgroundColor: "#FFFBEB", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  ageText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeDone: { backgroundColor: "#F3F4F6" },
  badgeToday: { backgroundColor: "#FEE2E2" },
  badgeSoon: { backgroundColor: "#FEF3C7" },
  badgeUpcoming: { backgroundColor: "#F5F3FF" },
  statusText: { fontSize: 12, fontWeight: "700" },
  vaccineName: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 3 },
  vaccineDiseases: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: Spacing.sm },
  vaccineBottom: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: Spacing.sm, gap: Spacing.sm },
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dueDateText: { fontSize: 13, color: COLORS.textMuted },
  notifRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  notifLabel: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
});
