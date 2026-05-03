import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import {
  WaterIntake,
  getWaterIntakeToday,
  addWaterIntake,
  getWaterGoal,
} from "@/utils/careStorage";
import {
  requestNotificationPermissions,
  scheduleWaterNudge,
  cancelTodayWaterNudge,
  cancelAllWaterNudges,
} from "@/utils/notifications";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const WATER_REMINDERS_ENABLED_KEY = "@saiviemom_water_reminders_enabled";

const QUICK_ADD_OPTIONS = [
  { ml: 250, label: "Glass", icon: "droplet" as const },
  { ml: 500, label: "Bottle", icon: "droplet" as const },
  { ml: 750, label: "Large", icon: "droplet" as const },
];

export default function WaterTrackerScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [intake, setIntake] = useState<WaterIntake>({ date: "", totalMl: 0, entries: [] });
  const [goal, setGoal] = useState(2500);
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  const progress = useSharedValue(0);
  const ringScale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    const targetProgress = Math.min(intake.totalMl / goal, 1);
    progress.value = withTiming(targetProgress, { duration: 500 });
  }, [intake.totalMl, goal]);

  const loadData = async () => {
    const [todayIntake, waterGoal, enabledStr] = await Promise.all([
      getWaterIntakeToday(),
      getWaterGoal(),
      AsyncStorage.getItem(WATER_REMINDERS_ENABLED_KEY),
    ]);
    setIntake(todayIntake);
    setGoal(waterGoal);
    const enabled = enabledStr === "true";
    setRemindersEnabled(enabled);
    if (enabled && Platform.OS !== "web") {
      if (todayIntake.totalMl >= waterGoal) {
        await cancelTodayWaterNudge();
      } else {
        await scheduleWaterNudge();
      }
    }
  };

  const handleAddWater = async (ml: number) => {
    ringScale.value = withSpring(1.05, { damping: 10 }, () => {
      ringScale.value = withSpring(1);
    });
    const updated = await addWaterIntake(ml);
    setIntake(updated);
    if (remindersEnabled && Platform.OS !== "web" && updated.totalMl >= goal) {
      await cancelTodayWaterNudge();
    }
  };

  const handleEnableReminders = async () => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;
    await AsyncStorage.setItem(WATER_REMINDERS_ENABLED_KEY, "true");
    setRemindersEnabled(true);
    if (intake.totalMl < goal) {
      await scheduleWaterNudge();
    }
  };

  const progressPercent = Math.round((intake.totalMl / goal) * 100);
  const remaining = Math.max(goal - intake.totalMl, 0);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "#FFFFFF" }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressRing, animatedRingStyle]}>
          <View style={[styles.progressRingBg, { borderColor: theme.primaryLight }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: theme.primary },
                animatedProgressStyle,
              ]}
            />
          </View>
          <View style={styles.progressContent}>
            <Feather name="droplet" size={32} color={theme.primary} />
            <ThemedText type="h1" style={[styles.progressPercent, { color: COLORS.textPrimary }]}>
              {progressPercent}%
            </ThemedText>
            <ThemedText type="body" style={{ color: COLORS.textSecondary }}>
              {intake.totalMl} / {goal} ml
            </ThemedText>
          </View>
        </Animated.View>
      </View>

      {remaining > 0 ? (
        <ThemedText type="body" style={[styles.encouragement, { color: COLORS.textSecondary }]}>
          {remaining >= 1000
            ? `${(remaining / 1000).toFixed(1)}L more to reach your goal!`
            : `${remaining}ml more to reach your goal!`}
        </ThemedText>
      ) : (
        <ThemedText type="body" style={[styles.encouragement, { color: theme.success }]}>
          Great job! You've reached your daily goal!
        </ThemedText>
      )}

      <Card style={styles.quickAddCard}>
        <ThemedText type="h4" style={{ color: COLORS.textPrimary, marginBottom: Spacing.lg }}>
          Quick Add
        </ThemedText>
        <View style={styles.quickAddButtons}>
          {QUICK_ADD_OPTIONS.map((option) => (
            <Pressable
              key={option.ml}
              style={[styles.quickAddButton, { backgroundColor: theme.primaryLight }]}
              onPress={() => handleAddWater(option.ml)}
            >
              <Feather name={option.icon} size={24} color={theme.primary} />
              <ThemedText type="h4" style={{ color: theme.primary }}>
                +{option.ml}ml
              </ThemedText>
              <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      {Platform.OS !== "web" && !remindersEnabled ? (
        <Card style={styles.reminderCard}>
          <View style={styles.reminderContent}>
            <View style={[styles.reminderIcon, { backgroundColor: theme.primaryLight }]}>
              <Feather name="bell" size={24} color={theme.primary} />
            </View>
            <View style={styles.reminderText}>
              <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
                Stay on Track
              </ThemedText>
              <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
                Get a nudge at 3 PM if you haven't hit your goal
              </ThemedText>
            </View>
          </View>
          <Pressable
            style={[styles.enableButton, { backgroundColor: theme.primary }]}
            onPress={handleEnableReminders}
          >
            <ThemedText type="small" style={{ color: COLORS.white, fontWeight: "600" }}>
              Enable
            </ThemedText>
          </Pressable>
        </Card>
      ) : null}

      {intake.entries.length > 0 ? (
        <View style={styles.historySection}>
          <ThemedText type="h4" style={{ color: COLORS.textPrimary, marginBottom: Spacing.md }}>
            Today's Log
          </ThemedText>
          {intake.entries
            .slice()
            .reverse()
            .slice(0, 10)
            .map((entry, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Feather name="droplet" size={16} color={theme.primary} />
                  <ThemedText type="body" style={{ color: COLORS.textPrimary, marginLeft: Spacing.sm }}>
                    {entry.amountMl}ml
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: COLORS.textMuted }}>
                  {formatTime(entry.time)}
                </ThemedText>
              </View>
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  progressRing: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingBg: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 12,
    overflow: "hidden",
  },
  progressFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 100,
  },
  progressContent: {
    alignItems: "center",
  },
  progressPercent: {
    marginTop: Spacing.sm,
  },
  encouragement: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  quickAddCard: {
    marginBottom: Spacing.lg,
  },
  quickAddButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  quickAddButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  reminderCard: {
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  enableButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  historySection: {
    marginTop: Spacing.md,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
});
