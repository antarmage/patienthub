import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getWeightLogs, saveWeightLog, WeightLog } from "@/utils/careStorage";
import { useApp } from "@/context/AppContext";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function WeightTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedWeek } = useApp();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadLogs(); }, []));

  const loadLogs = async () => { setLogs(await getWeightLogs()); };

  const handleSave = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) { Alert.alert("Invalid", "Enter a valid weight"); return; }
    setSaving(true);
    await saveWeightLog(w, unit, selectedWeek);
    setWeight(""); setShowModal(false); setSaving(false);
    await loadLogs();
  };

  const current = logs[0];
  const change = logs.length >= 2 ? logs[0].weight - logs[1].weight : null;
  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          </Pressable>
          <ThemedText type="h3">Weight Tracker</ThemedText>
          <Pressable onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: COLORS.primary }]}>
            <Feather name="plus" size={18} color="#FFF" />
          </Pressable>
        </View>

        {current ? (
          <View style={[styles.currentCard, Shadows.cardElevated, { backgroundColor: COLORS.primary }]}>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>Current Weight</ThemedText>
            <View style={styles.weightRow}>
              <ThemedText type="h1" style={{ color: "#FFF", fontSize: 48 }}>{current.weight}</ThemedText>
              <ThemedText type="h3" style={{ color: "rgba(255,255,255,0.8)", marginTop: 12 }}> {current.unit}</ThemedText>
            </View>
            {change !== null ? (
              <View style={[styles.changeBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name={change >= 0 ? "trending-up" : "trending-down"} size={14} color="#FFF" />
                <ThemedText type="small" style={{ color: "#FFF" }}>{change >= 0 ? "+" : ""}{change.toFixed(1)} {current.unit} from last</ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable style={[styles.emptyCard, Shadows.card]} onPress={() => setShowModal(true)}>
            <Feather name="activity" size={32} color={COLORS.primary} />
            <ThemedText type="body" style={{ color: COLORS.textSecondary, marginTop: Spacing.md }}>Log your first weight</ThemedText>
          </Pressable>
        )}

        {logs.length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>History</ThemedText>
            {logs.map((log, i) => (
              <View key={log.id} style={[styles.logItem, Shadows.card]}>
                <View style={[styles.logIcon, { backgroundColor: i === 0 ? COLORS.lavender : "#F0F0F3" }]}>
                  <Feather name="activity" size={16} color={i === 0 ? COLORS.primary : COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body">{log.weight} {log.unit}</ThemedText>
                  <ThemedText type="small" style={{ color: COLORS.textMuted }}>Week {log.week} · {new Date(log.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</ThemedText>
                </View>
                {i === 0 ? <View style={[styles.latest, { backgroundColor: COLORS.lavender }]}><ThemedText type="small" style={{ color: COLORS.primary, fontSize: 11 }}>Latest</ThemedText></View> : null}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.xl }}>Log Weight</ThemedText>
            <View style={styles.unitRow}>
              {(["kg", "lb"] as const).map(u => (
                <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitBtn, unit === u && { backgroundColor: COLORS.primary }]}>
                  <ThemedText type="small" style={{ color: unit === u ? "#FFF" : COLORS.textPrimary, fontWeight: "600" }}>{u}</ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={`Weight in ${unit}`} placeholderTextColor={COLORS.textMuted} />
            <Button onPress={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            <Pressable onPress={() => setShowModal(false)} style={styles.cancelBtn}>
              <ThemedText type="small" style={{ color: COLORS.textMuted }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xl },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0F0F3", alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  currentCard: { borderRadius: BorderRadius["2xl"], padding: Spacing["2xl"], marginBottom: Spacing.xl, alignItems: "center" },
  weightRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: Spacing.sm },
  changeBadge: { flexDirection: "row", gap: Spacing.xs, alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  emptyCard: { backgroundColor: "#FFF", borderRadius: BorderRadius["2xl"], padding: Spacing["3xl"], alignItems: "center", marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  logItem: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm },
  logIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  latest: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFF", borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"], padding: Spacing.xl, paddingBottom: 40 },
  unitRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  unitBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: "center", backgroundColor: "#F0F0F3" },
  input: { borderWidth: 1, borderColor: "#E5E5E7", borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 28, textAlign: "center", marginBottom: Spacing.xl },
  cancelBtn: { alignItems: "center", marginTop: Spacing.md, padding: Spacing.sm },
});
