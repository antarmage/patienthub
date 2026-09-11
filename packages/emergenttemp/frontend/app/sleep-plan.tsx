import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

type Step = { key: string; title: string; minutes: number; detail: string; icon: string };
type Plan = {
  generated_at: string;
  postpartum_day: number;
  summary: string;
  reason: string;
  steps: Step[];
  protected_rest_minutes: number;
  sleep_score: number;
  last_sleep_hours: number;
  adjustment?: "tightened" | "loosened" | "steady";
  feeding_context?: { count_today: number; avg_gap_min: number | null; recommendation: "tighten" | "loosen" | "steady"; pattern: string };
};

export default function SleepPlanScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiFetch<Plan>("/sleep/tonight")
      .then(setPlan)
      .finally(() => setLoading(false));
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startStep = (idx: number) => {
    if (!plan) return;
    clearTimer();
    setActiveIdx(idx);
    setRemaining(plan.steps[idx].minutes * 60);
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTimer();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const finishStep = useCallback(async () => {
    if (activeIdx === null || !plan) return;
    clearTimer();
    const step = plan.steps[activeIdx];
    setCompleted((c) => new Set(c).add(step.key));
    setActiveIdx(null);
    setRemaining(0);
    // If all done, log
    const total = plan.steps.length;
    if (completed.size + 1 >= total) {
      try { await apiFetch("/sleep/complete", { method: "POST", body: JSON.stringify({ steps_completed: total, total_steps: total }) }); } catch {}
    }
  }, [activeIdx, plan, completed]);

  useEffect(() => () => clearTimer(), []);

  if (loading || !plan) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  const doneCount = completed.size;
  const allDone = doneCount === plan.steps.length;
  const activeStep = activeIdx !== null ? plan.steps[activeIdx] : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="sleep-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tonight's plan</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient colors={["#1F0A0A", colors.surfaceSecondary]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroTopRow}>
            <MaterialCommunityIcons name="moon-waning-crescent" size={28} color={colors.brand} />
            {plan.adjustment && plan.adjustment !== "steady" && (
              <View style={[styles.adjustChip, { borderColor: plan.adjustment === "tightened" ? colors.warning : colors.success }]}>
                <Text style={[styles.adjustChipText, { color: plan.adjustment === "tightened" ? colors.warning : colors.success }]}>
                  {plan.adjustment === "tightened" ? "TIGHTENED FOR CLUSTER" : "LOOSENED — SPACED FEEDS"}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.heroSummary}>{plan.summary}</Text>
          <Text style={styles.heroReason}>{plan.reason}</Text>
          <View style={styles.heroStats}>
            <StatChip label="Last night" value={`${plan.last_sleep_hours}h`} />
            <StatChip label="Sleep score" value={`${plan.sleep_score}`} />
            <StatChip label="Rest window" value={`${plan.protected_rest_minutes}m`} />
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{doneCount}/{plan.steps.length} steps</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(doneCount / plan.steps.length) * 100}%` }]} />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md, gap: spacing.sm }}>
          {plan.steps.map((s, idx) => {
            const done = completed.has(s.key);
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.stepCard, done && styles.stepCardDone]}
                onPress={() => (!done ? startStep(idx) : null)}
                disabled={done}
                testID={`step-${s.key}`}
              >
                <View style={[styles.stepIcon, done && { backgroundColor: colors.success }]}>
                  {done ? (
                    <MaterialCommunityIcons name="check" size={18} color={colors.onSuccess} />
                  ) : (
                    <MaterialCommunityIcons name={s.icon as any} size={18} color={colors.brand} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{s.title}</Text>
                  <Text style={styles.stepDetail} numberOfLines={2}>{s.detail}</Text>
                </View>
                <View style={styles.stepMeta}>
                  <Text style={styles.stepMinutes}>{s.minutes}m</Text>
                  {!done && <MaterialCommunityIcons name="play" size={16} color={colors.onSurfaceTertiary} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {allDone && (
          <View style={styles.doneCard} testID="sleep-done-card">
            <MaterialCommunityIcons name="check-circle-outline" size={28} color={colors.success} />
            <Text style={styles.doneTitle}>Well done, mama.</Text>
            <Text style={styles.doneSub}>Now claim your rest window. Set your phone down.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={activeIdx !== null} animationType="fade" transparent onRequestClose={finishStep}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            {activeStep && (
              <>
                <View style={styles.modalIcon}>
                  <MaterialCommunityIcons name={activeStep.icon as any} size={28} color={colors.brand} />
                </View>
                <Text style={styles.modalTitle}>{activeStep.title}</Text>
                <Text style={styles.modalDetail}>{activeStep.detail}</Text>
                <Text style={styles.modalTimer} testID="step-timer">
                  {formatMMSS(remaining)}
                </Text>
                {remaining === 0 ? (
                  <TouchableOpacity style={styles.modalPrimary} onPress={finishStep} testID="step-complete">
                    <MaterialCommunityIcons name="check" size={18} color={colors.onBrand} />
                    <Text style={styles.modalPrimaryText}>Mark complete</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.modalGhost} onPress={finishStep} testID="step-skip">
                    <Text style={styles.modalGhostText}>I'm done — skip timer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.modalClose} onPress={() => { clearTimer(); setActiveIdx(null); }} testID="step-close">
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatMMSS(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  scroll: { paddingBottom: spacing.xl2 },

  hero: { marginHorizontal: spacing.xl, borderRadius: radius.lg, padding: spacing.xl, overflow: "hidden" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  adjustChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4, borderWidth: 1.5 },
  adjustChipText: { fontFamily: fonts.text, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  heroSummary: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurfaceInverse, marginTop: spacing.md, letterSpacing: -0.3 },
  heroReason: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },
  heroStats: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  statChip: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: "flex-start" },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurfaceInverse },
  statLabel: { fontFamily: fonts.text, fontSize: 10, color: colors.onSurfaceSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 2 },

  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  progressLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 1.5, textTransform: "uppercase" },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 2 },

  stepCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  stepCardDone: { backgroundColor: colors.surfaceTertiary, opacity: 0.85 },
  stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  stepTitleDone: { color: colors.onSurfaceTertiary, textDecorationLine: "line-through" },
  stepDetail: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2, lineHeight: 17 },
  stepMeta: { alignItems: "flex-end", gap: 4 },
  stepMinutes: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, fontWeight: "500" },

  doneCard: { marginHorizontal: spacing.xl, marginTop: spacing.xl, padding: spacing.xl, backgroundColor: colors.successBg, borderRadius: radius.lg, alignItems: "center", borderWidth: 1, borderColor: colors.successBorder },
  doneTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface, marginTop: spacing.sm },
  doneSub: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 4, textAlign: "center" },

  modalWrap: { flex: 1, backgroundColor: "rgba(28,27,27,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginTop: spacing.md, textAlign: "center", letterSpacing: -0.3 },
  modalDetail: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.md, textAlign: "center", lineHeight: 22 },
  modalTimer: { fontFamily: fonts.display, fontSize: 56, color: colors.brand, marginTop: spacing.lg, letterSpacing: -1 },
  modalPrimary: { marginTop: spacing.lg, backgroundColor: colors.brand, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl, height: 48, borderRadius: radius.pill },
  modalPrimaryText: { fontFamily: fonts.text, color: colors.onBrand, fontSize: 15, fontWeight: "500" },
  modalGhost: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  modalGhostText: { fontFamily: fonts.text, color: colors.onSurfaceSecondary, fontSize: 13 },
  modalClose: { marginTop: spacing.sm, padding: spacing.sm },
  modalCloseText: { fontFamily: fonts.text, color: colors.onSurfaceTertiary, fontSize: 13 },
});
