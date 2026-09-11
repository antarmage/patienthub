import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, riskColor, riskLabel, type } from "@/src/theme";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import WellbeingRings from "@/src/components/WellbeingRings";

type Today = {
  postpartum_day: number;
  scores: { mental: number; physical: number; sleep: number; nutrition: number; recovery: number; support: number };
  risk: string;
  composite: number;
};
type Task = { task_id: string; title: string; category: string; minutes: number };
type FeedingPattern = { count_today: number; last_feed_min_ago: number | null; recommendation: "tighten" | "loosen" | "steady"; avg_gap_min: number | null };
type DiaperStats = { count_today: number; last_min_ago: number | null };
type BabySleepStats = { total_min_today: number; is_sleeping_now: boolean };

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [today, setToday] = useState<Today | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [feeding, setFeeding] = useState<FeedingPattern | null>(null);
  const [diapers, setDiapers] = useState<DiaperStats | null>(null);
  const [babySleep, setBabySleep] = useState<BabySleepStats | null>(null);
  const [logBusy, setLogBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, plan, al, fd, dp, bs] = await Promise.all([
        apiFetch<Today>("/wellbeing/today"),
        apiFetch<{ tasks: Task[]; completed: string[] }>("/care-plan/today"),
        apiFetch<{ items: any[] }>("/alerts"),
        apiFetch<{ pattern: FeedingPattern }>("/feeds/today"),
        apiFetch<{ stats: DiaperStats }>("/diapers/today"),
        apiFetch<{ stats: BabySleepStats }>("/baby-sleep/today"),
      ]);
      setToday(t); setTasks(plan.tasks); setCompleted(plan.completed); setAlerts(al.items);
      setFeeding(fd.pattern); setDiapers(dp.stats); setBabySleep(bs.stats);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const quickLog = async (kind: "feed" | "diaper" | "sleep") => {
    setLogBusy(kind);
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      if (kind === "feed") {
        const d = await apiFetch<{ pattern: FeedingPattern }>("/feeds", { method: "POST", body: JSON.stringify({}) });
        setFeeding(d.pattern);
      } else if (kind === "diaper") {
        const d = await apiFetch<{ stats: DiaperStats }>("/diapers", { method: "POST", body: JSON.stringify({ kind: "wet" }) });
        setDiapers(d.stats);
      } else if (kind === "sleep") {
        const d = await apiFetch<{ stats: BabySleepStats }>("/baby-sleep/toggle", { method: "POST" });
        setBabySleep(d.stats);
      }
    } finally { setLogBusy(null); }
  };

  const toggle = async (id: string) => {
    if (id === "checkin") { router.push("/checkin"); return; }
    if (completed.includes(id)) return;
    setCompleted((c) => [...c, id]);
    try { await apiFetch("/care-plan/complete", { method: "POST", body: JSON.stringify({ task_id: id }) }); } catch {}
  };

  if (loading || !today) {
    return <SafeAreaView style={styles.safe} edges={["top"]}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  const firstName = (user?.name || "there").split(" ")[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>{greeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.dayPill} testID="home-day-pill">
            <View style={[styles.dot, { backgroundColor: riskColor(today.risk) }]} />
            <Text style={styles.dayText}>DAY {today.postpartum_day}</Text>
            <Text style={styles.riskText}>· {riskLabel(today.risk).toUpperCase()}</Text>
          </View>
        </View>

        {/* Rings + composite */}
        <View style={styles.ringsCard} testID="rings-card">
          <View style={styles.ringsInner}>
            <WellbeingRings
              size={180}
              rings={[
                { value: today.scores.mental, color: colors.brand, label: "Mental" },
                { value: today.scores.physical, color: colors.success, label: "Physical" },
                { value: today.scores.sleep, color: colors.warning, label: "Sleep" },
              ]}
            />
            <View style={styles.ringLegend}>
              <LegendRow color={colors.brand} label="MENTAL" value={today.scores.mental} />
              <LegendRow color={colors.success} label="PHYSICAL" value={today.scores.physical} />
              <LegendRow color={colors.warning} label="SLEEP" value={today.scores.sleep} />
            </View>
          </View>
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={styles.alertCard} testID="home-alert-card">
            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{alerts[0].reason}</Text>
              <Text style={styles.alertSub}>Your care team has been notified.</Text>
            </View>
          </View>
        )}

        {/* One-tap logs row */}
        <View style={styles.tapRow}>
          <QuickTap
            label="FEED"
            metric={feeding ? String(feeding.count_today) : "0"}
            sub={feeding?.last_feed_min_ago !== null && feeding?.last_feed_min_ago !== undefined ? `${feeding.last_feed_min_ago}m ago` : "no log"}
            icon="water-outline"
            accent={feeding?.recommendation === "tighten" ? colors.warning : feeding?.recommendation === "loosen" ? colors.success : colors.brand}
            onPress={() => quickLog("feed")}
            onLongPress={() => router.push("/feeds")}
            busy={logBusy === "feed"}
            testID="quick-feed"
          />
          <QuickTap
            label="DIAPER"
            metric={diapers ? String(diapers.count_today) : "0"}
            sub={diapers?.last_min_ago !== null && diapers?.last_min_ago !== undefined ? `${diapers.last_min_ago}m ago` : "no log"}
            icon="diaper-outline"
            accent={colors.brand}
            onPress={() => quickLog("diaper")}
            onLongPress={() => router.push("/diapers")}
            busy={logBusy === "diaper"}
            testID="quick-diaper"
          />
          <QuickTap
            label="NAP"
            metric={babySleep ? `${Math.floor(babySleep.total_min_today / 60)}:${String(babySleep.total_min_today % 60).padStart(2, "0")}` : "0:00"}
            sub={babySleep?.is_sleeping_now ? "sleeping" : "tap to start"}
            icon="moon-waning-crescent"
            accent={babySleep?.is_sleeping_now ? colors.success : colors.brand}
            active={babySleep?.is_sleeping_now}
            onPress={() => quickLog("sleep")}
            onLongPress={() => router.push("/baby-sleep")}
            busy={logBusy === "sleep"}
            testID="quick-baby-sleep"
          />
        </View>

        {/* Today's care */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.eyebrow}>TODAY'S CARE</Text>
            <Text style={styles.meta}>{completed.length}/{tasks.length}</Text>
          </View>
          {tasks.map((t) => {
            const done = completed.includes(t.task_id);
            return (
              <TouchableOpacity
                key={t.task_id}
                style={[styles.task, done && styles.taskDone]}
                onPress={() => toggle(t.task_id)}
                testID={`task-${t.task_id}`}
              >
                <View style={[styles.taskCheck, done && styles.taskCheckDone]}>
                  {done && <MaterialCommunityIcons name="check" size={12} color={colors.onSuccess} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{t.title}</Text>
                  <Text style={styles.taskMeta}>{t.minutes} MIN · {t.category.replace("_", " ").toUpperCase()}</Text>
                </View>
                {t.task_id === "checkin" && <MaterialCommunityIcons name="chevron-right" size={18} color={colors.onSurfaceSecondary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>IF SOMETHING FEELS OFF</Text>
          <ActionCard icon="stethoscope" title="Is this normal?" sub="Guided symptom triage" onPress={() => router.push("/triage")} testID="quick-triage" />
          <ActionCard icon="chat-processing-outline" title="Ask Saivie" sub="AI companion with your context" onPress={() => router.push("/(tabs)/ask")} testID="quick-ask" />
          <ActionCard icon="moon-waning-crescent" title="Tonight's sleep plan" sub="Adapts every night" onPress={() => router.push("/sleep-plan")} testID="quick-sleep" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickTap({ label, metric, sub, icon, accent, active, onPress, onLongPress, busy, testID }: any) {
  return (
    <TouchableOpacity
      style={[styles.quickTap, active && { borderColor: accent, borderWidth: 1.5 }]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={busy}
      testID={testID}
      activeOpacity={0.7}
    >
      <View style={styles.quickTapHead}>
        <MaterialCommunityIcons name={icon} size={14} color={accent} />
        <Text style={[styles.quickTapLabel, { color: accent }]}>{label}</Text>
      </View>
      <View style={styles.quickTapBody}>
        {busy ? <ActivityIndicator color={accent} /> : <Text style={styles.quickTapMetric}>{metric}</Text>}
        <Text style={styles.quickTapSub}>{sub}</Text>
      </View>
      <View style={[styles.quickTapPlus, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={active ? "stop" : "plus"} size={14} color={colors.onBrand} />
      </View>
    </TouchableOpacity>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function ActionCard({ icon, title, sub, onPress, testID }: any) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} testID={testID}>
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.onSurfaceSecondary} />
    </TouchableOpacity>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "MORNING";
  if (h < 18) return "AFTERNOON";
  return "EVENING";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  eyebrow: { ...type.micro, color: colors.onSurfaceSecondary },
  name: { ...type.display, color: colors.onSurface, marginTop: 2 },
  dayPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dayText: { ...type.micro, color: colors.onSurface, letterSpacing: 1.5 },
  riskText: { ...type.micro, color: colors.onSurfaceSecondary, letterSpacing: 1.5 },

  ringsCard: { marginHorizontal: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  ringsInner: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ringLegend: { gap: spacing.md, flex: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...type.micro, color: colors.onSurfaceSecondary, flex: 1, letterSpacing: 1.2 },
  legendValue: { ...type.metric, color: colors.onSurface, fontSize: 22 },

  alertCard: { marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: colors.alertBg, borderColor: colors.alertBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  alertTitle: { ...type.headline, color: colors.onSurface },
  alertSub: { ...type.small, color: colors.onSurfaceSecondary, marginTop: 2 },

  tapRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.md },
  quickTap: { flex: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 6, position: "relative" },
  quickTapHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  quickTapLabel: { ...type.micro, letterSpacing: 1.5 },
  quickTapBody: { marginTop: 4 },
  quickTapMetric: { ...type.metric, fontSize: 26, color: colors.onSurface },
  quickTapSub: { ...type.small, fontSize: 11, color: colors.onSurfaceSecondary, marginTop: 2 },
  quickTapPlus: { position: "absolute", top: spacing.sm, right: spacing.sm, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },

  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  meta: { ...type.micro, color: colors.onSurfaceSecondary, letterSpacing: 1.5 },
  task: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  taskDone: { opacity: 0.55 },
  taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  taskCheckDone: { backgroundColor: colors.success, borderColor: colors.success },
  taskTitle: { ...type.headline, color: colors.onSurface },
  taskTitleDone: { textDecorationLine: "line-through", color: colors.onSurfaceSecondary },
  taskMeta: { ...type.micro, color: colors.onSurfaceSecondary, marginTop: 3 },

  action: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, marginTop: spacing.sm },
  actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  actionTitle: { ...type.headline, color: colors.onSurface },
  actionSub: { ...type.small, color: colors.onSurfaceSecondary, marginTop: 2 },
});
