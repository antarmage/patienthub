import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, type } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

type Diaper = { diaper_id: string; kind: "wet" | "dirty" | "both"; created_at: string };
type Stats = { count_today: number; wet_today: number; dirty_today: number; last_min_ago: number | null; hint: string };

export default function DiapersScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Diaper[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ items: Diaper[]; stats: Stats }>("/diapers/today");
      setItems(d.items);
      setStats(d.stats);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logDiaper = async (kind: "wet" | "dirty" | "both") => {
    setLogging(kind);
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      const d = await apiFetch<{ diaper: Diaper; stats: Stats }>("/diapers", { method: "POST", body: JSON.stringify({ kind }) });
      setItems((x) => [d.diaper, ...x]);
      setStats(d.stats);
    } finally { setLogging(null); }
  };

  const remove = async (id: string) => {
    setItems((x) => x.filter((d) => d.diaper_id !== id));
    try { await apiFetch(`/diapers/${id}`, { method: "DELETE" }); } catch {}
    load();
  };

  if (loading || !stats) {
    return <SafeAreaView style={styles.safe} edges={["top"]}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="diapers-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diapers</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        <Text style={styles.eyebrow}>TODAY</Text>
        <View style={styles.metricRow}>
          <Metric label="TOTAL" value={stats.count_today} />
          <Metric label="WET" value={stats.wet_today} accent={colors.info} />
          <Metric label="DIRTY" value={stats.dirty_today} accent={colors.warning} />
        </View>
        <Text style={styles.hint}>{stats.hint}</Text>

        <View style={styles.tapRow}>
          <TapBtn kind="wet" label="Wet" icon="water-outline" onPress={() => logDiaper("wet")} busy={logging === "wet"} />
          <TapBtn kind="dirty" label="Dirty" icon="emoticon-poop-outline" onPress={() => logDiaper("dirty")} busy={logging === "dirty"} />
          <TapBtn kind="both" label="Both" icon="dots-horizontal" onPress={() => logDiaper("both")} busy={logging === "both"} />
        </View>

        <Text style={[styles.eyebrow, { marginTop: spacing.xl }]}>LOGGED TODAY</Text>
        {items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>Tap a button above to log.</Text></View>
        ) : (
          items.map((d) => (
            <View key={d.diaper_id} style={styles.row} testID={`diaper-${d.diaper_id}`}>
              <View style={[styles.kindBadge, kindStyle(d.kind)]}>
                <Text style={styles.kindText}>{d.kind.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTime}>{formatTime(d.created_at)}</Text>
                <Text style={styles.rowRel}>{formatAgo(minutesAgo(d.created_at))}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(d.diaper_id)} testID={`del-${d.diaper_id}`}>
                <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.onSurfaceSecondary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, accent && { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TapBtn({ kind, label, icon, onPress, busy }: any) {
  return (
    <TouchableOpacity style={styles.tapBtn} onPress={onPress} disabled={busy} testID={`tap-${kind}`}>
      {busy ? <ActivityIndicator color={colors.brand} /> : (
        <>
          <MaterialCommunityIcons name={icon} size={26} color={colors.brand} />
          <Text style={styles.tapLabel}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function kindStyle(k: string) {
  if (k === "wet") return { backgroundColor: colors.surfaceTertiary };
  if (k === "dirty") return { backgroundColor: colors.warnBg };
  return { backgroundColor: colors.brandTertiary };
}
function minutesAgo(iso: string) { return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); }
function formatTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatAgo(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ${min % 60}m ago`;
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
  metricLabel: { ...type.micro, color: colors.onSurfaceSecondary, marginTop: 4 },
  hint: { ...type.small, color: colors.onSurfaceSecondary, marginTop: spacing.md },
  tapRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  tapBtn: { flex: 1, aspectRatio: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: 6 },
  tapLabel: { ...type.label, color: colors.onSurface },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { ...type.small, color: colors.onSurfaceSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  kindBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6 },
  kindText: { ...type.micro, color: colors.onSurface, letterSpacing: 1.2 },
  rowTime: { ...type.headline, color: colors.onSurface },
  rowRel: { ...type.small, color: colors.onSurfaceSecondary, marginTop: 2 },
});
