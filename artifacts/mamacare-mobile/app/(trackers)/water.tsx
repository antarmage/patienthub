import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { WaterIntake, getWaterIntakeToday, addWaterIntake, getWaterGoal } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

const QUICK_ADD = [
  { ml: 150, label: "Sip", icon: "droplet" as const },
  { ml: 250, label: "Glass", icon: "droplet" as const },
  { ml: 500, label: "Bottle", icon: "droplet" as const },
  { ml: 750, label: "Large", icon: "droplet" as const },
];

export default function WaterTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [intake, setIntake] = useState<WaterIntake>({ date: "", totalMl: 0, entries: [] });
  const [goal, setGoal] = useState(2500);
  const progress = useSharedValue(0);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  useEffect(() => {
    progress.value = withTiming(Math.min(intake.totalMl / goal, 1), { duration: 600 });
  }, [intake.totalMl, goal]);

  const loadData = async () => {
    const [w, g] = await Promise.all([getWaterIntakeToday(), getWaterGoal()]);
    setIntake(w);
    setGoal(g);
  };

  const handleAdd = async (ml: number) => {
    const updated = await addWaterIntake(ml);
    setIntake(updated);
  };

  const pct = Math.round((intake.totalMl / goal) * 100);
  const remaining = Math.max(goal - intake.totalMl, 0);
  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText type="h3">Water Tracker</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Ring */}
      <View style={[styles.ringCard, Shadows.cardElevated]}>
        <View style={[styles.ring, { borderColor: COLORS.lavender }]}>
          <Feather name="droplet" size={36} color={COLORS.primary} />
          <ThemedText type="h1" style={{ color: COLORS.primary }}>{pct}%</ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>{intake.totalMl} / {goal} ml</ThemedText>
        </View>
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { backgroundColor: pct >= 80 ? COLORS.success : pct >= 40 ? COLORS.primary : COLORS.warning }, barStyle]} />
          </View>
          <ThemedText type="small" style={{ color: COLORS.textMuted, marginTop: Spacing.xs }}>{remaining} ml remaining</ThemedText>
        </View>
      </View>

      {/* Quick add */}
      <ThemedText type="h4" style={styles.sectionTitle}>Quick Add</ThemedText>
      <View style={styles.quickRow}>
        {QUICK_ADD.map(q => (
          <Pressable key={q.ml} onPress={() => handleAdd(q.ml)} style={[styles.quickBtn, Shadows.card]}>
            <Feather name={q.icon} size={20} color={COLORS.primary} />
            <ThemedText type="small" style={{ color: COLORS.primary, fontWeight: "700" }}>{q.ml}ml</ThemedText>
            <ThemedText type="small" style={{ color: COLORS.textMuted }}>{q.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      {/* History */}
      {intake.entries.length > 0 ? (
        <>
          <ThemedText type="h4" style={styles.sectionTitle}>Today's Log</ThemedText>
          {[...intake.entries].reverse().map((e, i) => (
            <View key={i} style={[styles.logItem, Shadows.card]}>
              <View style={[styles.logIcon, { backgroundColor: COLORS.lavender }]}>
                <Feather name="droplet" size={16} color={COLORS.primary} />
              </View>
              <ThemedText type="body" style={{ flex: 1 }}>{e.amountMl} ml</ThemedText>
              <ThemedText type="small" style={{ color: COLORS.textMuted }}>
                {new Date(e.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </ThemedText>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xl },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0F0F3", alignItems: "center", justifyContent: "center" },
  ringCard: { backgroundColor: "#FFF", borderRadius: BorderRadius["2xl"], padding: Spacing.xl, alignItems: "center", marginBottom: Spacing.xl },
  ring: { width: 140, height: 140, borderRadius: 70, borderWidth: 8, alignItems: "center", justifyContent: "center", marginBottom: Spacing.xl, gap: 2 },
  progressBarWrap: { width: "100%", alignItems: "center" },
  progressBg: { height: 10, backgroundColor: "#F0F0F3", borderRadius: 5, width: "100%", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  sectionTitle: { marginBottom: Spacing.md },
  quickRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  quickBtn: { flex: 1, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, paddingVertical: Spacing.lg, alignItems: "center", gap: Spacing.xs },
  logItem: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm },
  logIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
