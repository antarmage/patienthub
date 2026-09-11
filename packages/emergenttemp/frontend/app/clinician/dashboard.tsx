import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { colors, fonts, spacing, radius, riskColor, riskLabel } from "@/src/theme";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

type Dash = { total_mothers: number; counts: { stable: number; watch: number; review: number; urgent: number }; active_alerts: number };
type Mother = { user_id: string; name: string; picture?: string; postpartum_day: number; delivery_type: string; risk: string; mental: number; last_reason?: string };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "red", label: "Urgent" },
  { key: "orange", label: "Review" },
  { key: "yellow", label: "Watch" },
  { key: "green", label: "Stable" },
];

export default function ClinicianDashboard() {
  const router = useRouter();
  const { setRole } = useAuth();
  const [dash, setDash] = useState<Dash | null>(null);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([
        apiFetch<Dash>("/clinician/dashboard"),
        apiFetch<{ items: Mother[] }>("/clinician/mothers"),
      ]);
      setDash(d);
      setMothers(m.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === "all" ? mothers : mothers.filter((x) => x.risk === filter);

  const backToMother = () => {
    setRole("mother");
    router.replace("/(tabs)/home");
  };

  if (loading || !dash) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={backToMother} testID="exit-clinician">
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Care Team</Text>
        <MaterialCommunityIcons name="bell-outline" size={22} color={colors.onSurface} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        <View style={styles.summary}>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.display}>{dash.total_mothers} mothers under care</Text>
          <Text style={styles.subtext}>{dash.active_alerts} unresolved alerts</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Stable" count={dash.counts.stable} color={colors.success} />
          <StatBox label="Watch" count={dash.counts.watch} color={colors.warning} />
          <StatBox label="Review" count={dash.counts.review} color={colors.brand} />
          <StatBox label="Urgent" count={dash.counts.urgent} color={colors.error} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          style={styles.chipsRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`filter-${f.key}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No patients in this bucket.</Text>
            </View>
          )}
          {filtered.map((m) => (
            <TouchableOpacity
              key={m.user_id}
              style={styles.patientRow}
              onPress={() => router.push(`/clinician/patient/${m.user_id}`)}
              testID={`patient-${m.user_id}`}
            >
              <View style={[styles.avatarSm, { backgroundColor: colors.brandTertiary }]}>
                <Text style={styles.avatarInit}>{m.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.patientTop}>
                  <Text style={styles.patientName}>{m.name}</Text>
                  <View style={[styles.riskChip, { backgroundColor: riskColor(m.risk) }]}>
                    <Text style={styles.riskChipText}>{riskLabel(m.risk).toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.patientMeta}>Day {m.postpartum_day} · {m.delivery_type.replace("_", " ")}</Text>
                {m.last_reason ? (
                  <Text style={styles.patientReason}>{m.last_reason}</Text>
                ) : (
                  <Text style={styles.patientReason}>Mental {m.mental}/100</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  summary: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 30, color: colors.onSurface, marginTop: 2, letterSpacing: -0.5 },
  subtext: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: "flex-start" },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  statCount: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  statLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary, textTransform: "uppercase", letterSpacing: 1 },
  chipsRow: { marginTop: spacing.lg, height: 56 },
  chipsContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: "center" },
  chip: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.onSurface, borderColor: colors.onSurface },
  chipText: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary },
  chipTextActive: { color: colors.onSurfaceInverse, fontWeight: "500" },
  list: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginTop: spacing.sm },
  patientRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  avatarSm: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarInit: { fontFamily: fonts.display, fontSize: 20, color: colors.brand },
  patientTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  patientName: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  riskChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  riskChipText: { fontFamily: fonts.text, fontSize: 9, color: "#fff", fontWeight: "700", letterSpacing: 1 },
  patientMeta: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  patientReason: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary },
});
