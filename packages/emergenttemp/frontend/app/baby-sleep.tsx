import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, type } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

type Nap = { nap_id: string; started_at: string; ended_at: string | null };
type Stats = { naps_today: number; total_min_today: number; is_sleeping_now: boolean; active_started_at: string | null };

export default function BabySleepScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Nap[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ items: Nap[]; stats: Stats }>("/baby-sleep/today");
      setItems(d.items);
      setStats(d.stats);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!stats?.is_sleeping_now) return;
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, [stats?.is_sleeping_now]);

  const toggle = async () => {
    setBusy(true);
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      const d = await apiFetch<{ action: string; stats: Stats }>("/baby-sleep/toggle", { method: "POST" });
      setStats(d.stats);
      load();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setItems((x) => x.filter((n) => n.nap_id !== id));
    try { await apiFetch(`/baby-sleep/${id}`, { method: "DELETE" }); } catch {}
    load();
  };

  if (loading || !stats) {
    return <SafeAreaView style={styles.safe} edges={["top"]}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  const activeMin = stats.active_started_at
    ? Math.max(0, Math.floor((Date.now() + tick * 0 - new Date(stats.active_started_at).getTime()) / 60000))
    : 0;
  const totalH = Math.floor(stats.total_min_today / 60);
  const totalM = stats.total_min_today % 60;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="baby-sleep-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Baby sleep</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        <Text style={styles.eyebrow}>TODAY</Text>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{totalH}<Text style={styles.metricUnit}>h </Text>{totalM}<Text style={styles.metricUnit}>m</Text></Text>
            <Text style={styles.metricLabel}>TOTAL SLEEP</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{stats.naps_today}</Text>
            <Text style={styles.metricLabel}>NAPS</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.bigBtn, stats.is_sleeping_now ? styles.bigBtnStop : styles.bigBtnStart]}
          onPress={toggle}
          disabled={busy}
          testID="baby-sleep-toggle"
        >
          {busy ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : stats.is_sleeping_now ? (
            <>
              <View style={styles.pulseDot} />
              <View>
                <Text style={styles.bigBtnLabel}>SLEEPING · {activeMin}m</Text>
                <Text style={styles.bigBtnSub}>Tap to end nap</Text>
              </View>
              <MaterialCommunityIcons name="stop-circle-outline" size={28} color={colors.onBrand} />
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="moon-waning-crescent" size={28} color={colors.onBrand} />
              <View>
                <Text style={styles.bigBtnLabel}>START NAP</Text>
                <Text style={styles.bigBtnSub}>Tap when baby's asleep</Text>
              </View>
              <MaterialCommunityIcons name="play-circle-outline" size={28} color={colors.onBrand} />
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.eyebrow, { marginTop: spacing.xl }]}>NAPS TODAY</Text>
        {items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No naps logged yet today.</Text></View>
        ) : (
          items.map((n) => {
            const started = new Date(n.started_at);
            const ended = n.ended_at ? new Date(n.ended_at) : null;
            const duration = ended ? Math.floor((ended.getTime() - started.getTime()) / 60000) : null;
            return (
              <View key={n.nap_id} style={styles.row} testID={`nap-${n.nap_id}`}>
                <MaterialCommunityIcons name={ended ? "check-circle-outline" : "circle-outline"} size={20} color={ended ? colors.success : colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTime}>
                    {started.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {ended ? ` → ${ended.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : " → ongoing"}
                  </Text>
                  <Text style={styles.rowMeta}>{duration !== null ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "active nap"}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(n.nap_id)}>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.onSurfaceSecondary} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerTitle: { ...type.headline, color: colors.onSurface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  eyebrow: { ...type.micro, color: colors.onSurfaceSecondary },
  metricRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  metric: { flex: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  metricValue: { ...type.metric, color: colors.onSurface },
  metricUnit: { ...type.metric, color: colors.onSurfaceSecondary, fontSize: 18 },
  metricLabel: { ...type.micro, color: colors.onSurfaceSecondary, marginTop: 4 },
  bigBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg },
  bigBtnStart: { backgroundColor: colors.brand },
  bigBtnStop: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.brand },
  bigBtnLabel: { ...type.displaySmall, color: colors.onBrand, letterSpacing: 0.5 },
  bigBtnSub: { ...type.small, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { ...type.small, color: colors.onSurfaceSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  rowTime: { ...type.headline, color: colors.onSurface },
  rowMeta: { ...type.small, color: colors.onSurfaceSecondary, marginTop: 2 },
});
