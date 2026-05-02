import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import {
  getTodayMedicineStats,
  getWaterIntakeToday,
  getWaterGoal,
  getLatestWeight,
  getLatestBP,
  getAppointments,
  WeightLog,
  BPLog,
  Appointment,
} from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { selectedWeek } = useApp();

  const [medicineStats, setMedicineStats] = useState({ total: 0, taken: 0, pending: 0 });
  const [waterProgress, setWaterProgress] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoalState] = useState(2500);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [latestBP, setLatestBP] = useState<BPLog | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);

  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;
  const trimesterText = trimester === 1 ? "First Trimester" : trimester === 2 ? "Second Trimester" : "Third Trimester";

  useFocusEffect(
    useCallback(() => {
      loadAllStats();
    }, [])
  );

  const loadAllStats = async () => {
    try {
      const [stats, water, goal, weight, bp, appointments] = await Promise.all([
        getTodayMedicineStats(),
        getWaterIntakeToday(),
        getWaterGoal(),
        getLatestWeight(),
        getLatestBP(),
        getAppointments(),
      ]);
      setMedicineStats(stats);
      setWaterIntake(water.totalMl);
      setWaterGoalState(goal);
      setWaterProgress(Math.round((water.totalMl / goal) * 100));
      setLatestWeight(weight);
      setLatestBP(bp);

      const upcoming = appointments
        .filter(a => new Date(a.dateTime) > new Date())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
      setNextAppointment(upcoming || null);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const getBabyMessage = () => {
    if (selectedWeek <= 12) return "Your little one is developing vital organs.";
    if (selectedWeek <= 20) return "Baby is growing stronger every day.";
    if (selectedWeek <= 30) return "Your baby can now hear your voice.";
    return "Baby is gaining weight rapidly. Your next milestone is coming soon.";
  };

  const getHydrationStatus = () => {
    if (waterProgress >= 70) return { text: "On Track", color: "#22C55E" };
    if (waterProgress >= 40) return { text: "Slightly Low", color: "#3B82F6" };
    return { text: "Low", color: "#F59E0B" };
  };

  const getWeightStatus = () => {
    if (!latestWeight) return { text: "Not tracked", color: "#6B7280" };
    return { text: "On Track", color: "#A855F7" };
  };

  const getBPStatus = () => {
    if (!latestBP) return { text: "Not tracked", color: "#6B7280" };
    const systolic = latestBP.systolic;
    if (systolic < 90) return { text: "Low", color: "#F59E0B" };
    if (systolic <= 120) return { text: "Stable", color: "#F472B6" };
    if (systolic <= 140) return { text: "Elevated", color: "#F59E0B" };
    return { text: "High", color: "#EF4444" };
  };

  const hydrationStatus = getHydrationStatus();
  const weightStatus = getWeightStatus();
  const bpStatus = getBPStatus();

  const quickActions = [
    {
      id: "doctor",
      label: "Doctor",
      icon: "calendar" as const,
      bgColor: "#F5F3FF",
      iconColor: "#6C63FF",
      onPress: () => router.push("/(trackers)/appointments"),
    },
    {
      id: "medicine",
      label: "Medicine",
      icon: "heart" as const,
      bgColor: "#FFFBEB",
      iconColor: "#F59E0B",
      onPress: () => router.push("/(trackers)/medicines"),
    },
    {
      id: "nutrition",
      label: "Nutrition",
      icon: "coffee" as const,
      bgColor: "#ECFDF5",
      iconColor: "#10B981",
      onPress: () => router.push("/(trackers)/diagnostics"),
    },
    {
      id: "records",
      label: "Records",
      icon: "folder" as const,
      bgColor: "#EFF6FF",
      iconColor: "#3B82F6",
      onPress: () => router.push("/(trackers)/diagnostics"),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["2xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.weekSubtitle}>
            Week {selectedWeek} · {trimesterText}
          </ThemedText>
          <ThemedText style={styles.todayTitle}>Today</ThemedText>
          <ThemedText style={styles.babyMessage}>{getBabyMessage()}</ThemedText>
        </View>

        <View style={styles.section}>
          <LinearGradient
            colors={["#EEF0FF", "#E9F2FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bloodTestCard}
          >
            <View style={styles.cardGlow} />
            <View style={styles.bloodTestContent}>
              <View style={styles.bloodTestIconWrap}>
                <Feather name="droplet" size={18} color="#6C63FF" />
              </View>
              <View style={styles.bloodTestTextWrap}>
                <ThemedText style={styles.bloodTestTitle}>Blood tests due in 5 days</ThemedText>
                <ThemedText style={styles.bloodTestSubtitle}>Best window: Morning, empty stomach</ThemedText>
              </View>
            </View>
            <View style={styles.bloodTestCtaWrap}>
              <Pressable
                style={styles.bloodTestCta}
                onPress={() => router.push("/(trackers)/diagnostics")}
              >
                <Feather name="calendar" size={14} color="#FFFFFF" />
                <ThemedText style={styles.bloodTestCtaText}>Book / Remind Me</ThemedText>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed }) => [
                  styles.quickActionCard,
                  pressed && styles.quickActionPressed,
                ]}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                  <Feather name={action.icon} size={20} color={action.iconColor} />
                </View>
                <ThemedText style={styles.quickActionLabel}>{action.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Your Health Signals</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.healthSignalsScroll}
          >
            <Pressable
              style={styles.healthSignalCard}
              onPress={() => router.push("/(trackers)/water")}
            >
              <View style={styles.healthSignalHeader}>
                <Feather name="droplet" size={16} color="#60A5FA" />
                <ThemedText style={styles.healthSignalLabel}>Hydration</ThemedText>
              </View>
              <ThemedText style={[styles.healthSignalStatus, { color: hydrationStatus.color }]}>
                {hydrationStatus.text}
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.healthSignalCard}
              onPress={() => router.push("/(trackers)/weight")}
            >
              <View style={styles.healthSignalHeader}>
                <Feather name="trending-up" size={16} color="#A78BFA" />
                <ThemedText style={styles.healthSignalLabel}>Weight</ThemedText>
              </View>
              <ThemedText style={[styles.healthSignalStatus, { color: weightStatus.color }]}>
                {weightStatus.text}
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.healthSignalCard}
              onPress={() => router.push("/(trackers)/bp")}
            >
              <View style={styles.healthSignalHeader}>
                <Feather name="heart" size={16} color="#FB7185" />
                <ThemedText style={styles.healthSignalLabel}>BP</ThemedText>
              </View>
              <ThemedText style={[styles.healthSignalStatus, { color: bpStatus.color }]}>
                {bpStatus.text}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Body & Energy</ThemedText>
          <View style={styles.bodyEnergyCard}>
            {selectedWeek >= 20 && (
              <ThemedText style={styles.bodyEnergyText}>Back Pain · Normal</ThemedText>
            )}
            <ThemedText style={styles.bodyEnergyText}>
              Energy · {trimester === 1 || trimester === 3 ? "Low Today" : "Normal"}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.milestoneText}>
          Next milestone: Week {Math.min(selectedWeek + 1, 40)} checkup
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  weekSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 4,
    opacity: 0.8,
  },
  todayTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.xs,
  },
  babyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    maxWidth: "90%",
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  bloodTestCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.1)",
    position: "relative",
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    right: -16,
    top: -16,
    width: 96,
    height: 96,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 48,
  },
  bloodTestContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    zIndex: 10,
  },
  bloodTestIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bloodTestTextWrap: {
    flex: 1,
  },
  bloodTestTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  bloodTestSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bloodTestCtaWrap: {
    alignItems: "flex-end",
    zIndex: 10,
  },
  bloodTestCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C63FF",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bloodTestCtaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  quickActionCard: {
    width: "47%",
    height: 90,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  quickActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  quickActionIcon: {
    padding: Spacing.sm,
    borderRadius: 12,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  healthSignalsScroll: {
    paddingRight: Spacing.xl,
    gap: Spacing.md,
  },
  healthSignalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    minWidth: 140,
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  healthSignalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  healthSignalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  healthSignalStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  bodyEnergyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  bodyEnergyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  milestoneText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
});
