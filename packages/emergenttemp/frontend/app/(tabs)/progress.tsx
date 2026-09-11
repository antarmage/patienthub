import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";
import TrendChart from "@/src/components/TrendChart";
import ScoreBar from "@/src/components/ScoreBar";

type Trend = { days: { day: number; mental: number; physical: number; sleep: number; mood: number }[] };

export default function Progress() {
  const [trend, setTrend] = useState<Trend | null>(null);
  const [today, setToday] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, tw] = await Promise.all([
        apiFetch<Trend>("/wellbeing/trends?days=14"),
        apiFetch<any>("/wellbeing/today"),
      ]);
      setTrend(t);
      setToday(tw);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !today) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const mental = trend?.days.map((d) => d.mental) || [];
  const physical = trend?.days.map((d) => d.physical) || [];
  const sleep = trend?.days.map((d) => d.sleep) || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.eyebrow}>YOUR RECOVERY</Text>
          <Text style={styles.display}>Look how far you've come.</Text>
        </View>

        <View style={styles.chartCard} testID="chart-mental">
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Mental wellbeing</Text>
            <Text style={styles.chartValue}>{today.scores.mental}</Text>
          </View>
          <TrendChart data={mental} color={colors.brand} width={320} height={140} />
        </View>

        <View style={styles.chartCard} testID="chart-physical">
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Physical recovery</Text>
            <Text style={styles.chartValue}>{today.scores.physical}</Text>
          </View>
          <TrendChart data={physical} color={colors.success} width={320} height={140} />
        </View>

        <View style={styles.chartCard} testID="chart-sleep">
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Sleep</Text>
            <Text style={styles.chartValue}>{today.scores.sleep}</Text>
          </View>
          <TrendChart data={sleep} color={colors.warning} width={320} height={140} />
        </View>

        <View style={styles.otherCard}>
          <Text style={styles.chartTitle}>Other dimensions</Text>
          <View style={styles.otherRow}>
            <Text style={styles.otherLabel}>Nutrition</Text>
            <View style={{ flex: 1 }}>
              <ScoreBar value={today.scores.nutrition} color={colors.warning} />
            </View>
            <Text style={styles.otherValue}>{today.scores.nutrition}</Text>
          </View>
          <View style={styles.otherRow}>
            <Text style={styles.otherLabel}>Recovery</Text>
            <View style={{ flex: 1 }}>
              <ScoreBar value={today.scores.recovery} color={colors.success} />
            </View>
            <Text style={styles.otherValue}>{today.scores.recovery}</Text>
          </View>
          <View style={styles.otherRow}>
            <Text style={styles.otherLabel}>Support</Text>
            <View style={{ flex: 1 }}>
              <ScoreBar value={today.scores.support} color={colors.info} />
            </View>
            <Text style={styles.otherValue}>{today.scores.support}</Text>
          </View>
        </View>

        {trend && trend.days.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Complete your first daily check-in to start seeing trends here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  head: { marginBottom: spacing.lg },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 30, color: colors.onSurface, marginTop: 2, letterSpacing: -0.5 },
  chartCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  chartHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: spacing.sm },
  chartTitle: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1 },
  chartValue: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  otherCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm, gap: spacing.md },
  otherRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  otherLabel: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, width: 70 },
  otherValue: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurface, fontWeight: "500", width: 30, textAlign: "right" },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary, textAlign: "center" },
});
