import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_weight_program";

interface WeightLog { date: string; weight: number; }
interface ProgramData { targetWeight: number; startWeight: number; logs: WeightLog[]; }

function today() { return new Date().toISOString().split("T")[0]; }

export default function PostpartumWeightLossScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<ProgramData | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [inputStart, setInputStart] = useState("");
  const [inputTarget, setInputTarget] = useState("");
  const [logWeight, setLogWeight] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY).then((v) => {
        if (v) { setData(JSON.parse(v)); setSetupMode(false); }
        else setSetupMode(true);
      });
    }, [])
  );

  const handleSetup = async () => {
    const start = parseFloat(inputStart);
    const target = parseFloat(inputTarget);
    if (isNaN(start) || isNaN(target) || start <= 0 || target <= 0) {
      Alert.alert("Invalid", "Please enter valid weights in kg.");
      return;
    }
    if (target >= start) {
      Alert.alert("Check values", "Target weight should be less than starting weight.");
      return;
    }
    const prog: ProgramData = { startWeight: start, targetWeight: target, logs: [{ date: today(), weight: start }] };
    await AsyncStorage.setItem(KEY, JSON.stringify(prog));
    setData(prog);
    setSetupMode(false);
  };

  const handleLogWeight = async () => {
    const w = parseFloat(logWeight);
    if (isNaN(w) || w <= 0) { Alert.alert("Invalid", "Enter a valid weight."); return; }
    if (!data) return;
    const newLog: WeightLog = { date: today(), weight: w };
    const updatedLogs = [...data.logs.filter(l => l.date !== today()), newLog];
    const updated = { ...data, logs: updatedLogs };
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    setData(updated);
    setLogWeight("");
    setShowLog(false);
  };

  const handleReset = async () => {
    Alert.alert("Reset Program", "This will clear all your weight data. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem(KEY);
          setData(null);
          setSetupMode(true);
          setInputStart("");
          setInputTarget("");
        }
      },
    ]);
  };

  const currentWeight = data?.logs.length ? data.logs[data.logs.length - 1].weight : data?.startWeight ?? 0;
  const totalToLose = data ? data.startWeight - data.targetWeight : 0;
  const lost = data ? Math.max(0, data.startWeight - currentWeight) : 0;
  const progress = totalToLose > 0 ? Math.min(1, lost / totalToLose) : 0;
  const remaining = data ? Math.max(0, currentWeight - data.targetWeight) : 0;
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(postpartum)")}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Weight Loss Program</ThemedText>
        {data && (
          <Pressable onPress={handleReset} style={{ padding: Spacing.sm }}>
            <Feather name="rotate-ccw" size={18} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.guideCard}>
          <Feather name="heart" size={14} color="#22C55E" style={{ marginRight: 6 }} />
          <ThemedText style={styles.guideText}>
            Safe postpartum weight loss is 0.5–1 kg per week. Avoid crash diets while breastfeeding.
          </ThemedText>
        </View>

        {setupMode ? (
          <View style={styles.setupCard}>
            <ThemedText style={styles.setupTitle}>Set up your program</ThemedText>
            <ThemedText style={styles.setupLabel}>Current weight (kg)</ThemedText>
            <TextInput
              style={styles.setupInput}
              placeholder="e.g. 75"
              placeholderTextColor={COLORS.textMuted}
              value={inputStart}
              onChangeText={setInputStart}
              keyboardType="decimal-pad"
            />
            <ThemedText style={styles.setupLabel}>Target weight (kg)</ThemedText>
            <TextInput
              style={styles.setupInput}
              placeholder="e.g. 62"
              placeholderTextColor={COLORS.textMuted}
              value={inputTarget}
              onChangeText={setInputTarget}
              keyboardType="decimal-pad"
            />
            <Pressable style={styles.setupBtn} onPress={handleSetup}>
              <ThemedText style={styles.setupBtnText}>Start Program</ThemedText>
            </Pressable>
          </View>
        ) : data ? (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <ThemedText style={styles.progressLabel}>Progress</ThemedText>
                <ThemedText style={styles.progressPct}>{pct}%</ThemedText>
              </View>
              <View
                style={styles.progressTrack}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              >
                <View style={[styles.progressFill, { width: barWidth * progress }]} />
              </View>
              <View style={styles.progressFooter}>
                <ThemedText style={styles.progressFooterText}>{data.startWeight} kg</ThemedText>
                <ThemedText style={styles.progressFooterText}>{data.targetWeight} kg</ThemedText>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>{currentWeight} kg</ThemedText>
                <ThemedText style={styles.statLabel}>Current</ThemedText>
              </View>
              <View style={[styles.statCard, { borderColor: "#D1FAE5" }]}>
                <ThemedText style={[styles.statValue, { color: "#22C55E" }]}>{lost.toFixed(1)} kg</ThemedText>
                <ThemedText style={styles.statLabel}>Lost so far</ThemedText>
              </View>
              <View style={[styles.statCard, { borderColor: "#EDE9FE" }]}>
                <ThemedText style={[styles.statValue, { color: "#6C63FF" }]}>{remaining.toFixed(1)} kg</ThemedText>
                <ThemedText style={styles.statLabel}>To go</ThemedText>
              </View>
            </View>

            {showLog ? (
              <View style={styles.logCard}>
                <ThemedText style={styles.logTitle}>Log today's weight</ThemedText>
                <View style={styles.logRow}>
                  <TextInput
                    style={styles.logInput}
                    placeholder="kg"
                    placeholderTextColor={COLORS.textMuted}
                    value={logWeight}
                    onChangeText={setLogWeight}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <Pressable style={styles.logBtn} onPress={handleLogWeight}>
                    <ThemedText style={styles.logBtnText}>Save</ThemedText>
                  </Pressable>
                  <Pressable style={styles.logCancelBtn} onPress={() => setShowLog(false)}>
                    <Feather name="x" size={18} color={COLORS.textMuted} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.addLogBtn} onPress={() => setShowLog(true)}>
                <Feather name="plus" size={18} color="#FFFFFF" />
                <ThemedText style={styles.addLogText}>Log Today's Weight</ThemedText>
              </Pressable>
            )}

            <ThemedText style={styles.historyTitle}>Weight History</ThemedText>
            {[...data.logs].reverse().slice(0, 10).map((log, i) => (
              <View key={i} style={styles.historyRow}>
                <ThemedText style={styles.historyDate}>{log.date}</ThemedText>
                <ThemedText style={styles.historyWeight}>{log.weight} kg</ThemedText>
              </View>
            ))}
          </>
        ) : null}
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
  guideCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: "#D1FAE5",
  },
  guideText: { fontSize: 13, color: "#065F46", flex: 1, lineHeight: 18 },
  setupCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: Spacing.xl,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  setupTitle: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: Spacing.lg },
  setupLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: Spacing.sm },
  setupInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    fontSize: 18, color: COLORS.textPrimary, marginBottom: Spacing.lg,
  },
  setupBtn: {
    backgroundColor: "#22C55E", borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: Spacing.sm,
  },
  setupBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  progressCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: "#F3F4F6",
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  progressLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  progressPct: { fontSize: 24, fontWeight: "700", color: "#22C55E" },
  progressTrack: {
    height: 12, backgroundColor: "#F3F4F6", borderRadius: 6,
    overflow: "hidden", marginBottom: Spacing.sm,
  },
  progressFill: { height: 12, backgroundColor: "#22C55E", borderRadius: 6 },
  progressFooter: { flexDirection: "row", justifyContent: "space-between" },
  progressFooterText: { fontSize: 11, color: COLORS.textMuted },
  statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: Spacing.md,
    alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6",
  },
  statValue: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  addLogBtn: {
    backgroundColor: "#22C55E", borderRadius: 14, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, marginBottom: Spacing.xl,
    shadowColor: "#22C55E", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  addLogText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  logCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: Spacing.md,
    borderWidth: 1, borderColor: "#F3F4F6", marginBottom: Spacing.xl,
  },
  logTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: Spacing.sm },
  logRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  logInput: {
    flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: 17, color: COLORS.textPrimary,
  },
  logBtn: {
    backgroundColor: "#22C55E", borderRadius: 10,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
  },
  logBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  logCancelBtn: { padding: Spacing.sm },
  historyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: Spacing.sm },
  historyRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  historyDate: { fontSize: 13, color: COLORS.textSecondary },
  historyWeight: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary },
});
