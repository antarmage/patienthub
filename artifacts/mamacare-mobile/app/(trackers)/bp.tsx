import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getBPLogs, saveBPLog, BPLog } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

function getBPStatus(sys: number) {
  if (sys < 90) return { text: "Low", color: COLORS.warning };
  if (sys <= 120) return { text: "Normal", color: COLORS.success };
  if (sys <= 140) return { text: "Elevated", color: COLORS.warning };
  return { text: "High", color: COLORS.error };
}

export default function BPTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [logs, setLogs] = useState<BPLog[]>([]);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadLogs(); }, []));

  const loadLogs = async () => { setLogs(await getBPLogs()); };

  const handleSave = async () => {
    const s = parseInt(sys, 10), d = parseInt(dia, 10);
    if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) { Alert.alert("Invalid", "Enter valid readings"); return; }
    setSaving(true);
    await saveBPLog(s, d, pulse ? parseInt(pulse, 10) : undefined);
    setSys(""); setDia(""); setPulse(""); setShowModal(false); setSaving(false);
    await loadLogs();
  };

  const current = logs[0];
  const status = current ? getBPStatus(current.systolic) : null;
  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          </Pressable>
          <ThemedText type="h3">BP Tracker</ThemedText>
          <Pressable onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: "#EC4899" }]}>
            <Feather name="plus" size={18} color="#FFF" />
          </Pressable>
        </View>

        {current && status ? (
          <View style={[styles.currentCard, Shadows.cardElevated, { backgroundColor: "#EC4899" }]}>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>Latest Reading</ThemedText>
            <View style={styles.bpDisplay}>
              <ThemedText style={{ color: "#FFF", fontSize: 52, fontWeight: "700" }}>{current.systolic}</ThemedText>
              <ThemedText style={{ color: "rgba(255,255,255,0.7)", fontSize: 32, fontWeight: "300", marginHorizontal: 4 }}>/</ThemedText>
              <ThemedText style={{ color: "#FFF", fontSize: 52, fontWeight: "700" }}>{current.diastolic}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>mmHg</ThemedText>
            {current.pulse ? <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Pulse: {current.pulse} bpm</ThemedText> : null}
            <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <ThemedText type="small" style={{ color: "#FFF", fontWeight: "700" }}>{status.text}</ThemedText>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.emptyCard, Shadows.card]} onPress={() => setShowModal(true)}>
            <Feather name="heart" size={32} color="#EC4899" />
            <ThemedText type="body" style={{ color: COLORS.textSecondary, marginTop: Spacing.md }}>Log your first BP reading</ThemedText>
          </Pressable>
        )}

        {logs.length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>History</ThemedText>
            {logs.map((log, i) => {
              const s = getBPStatus(log.systolic);
              return (
                <View key={log.id} style={[styles.logItem, Shadows.card]}>
                  <View style={[styles.logIcon, { backgroundColor: s.color + "20" }]}>
                    <Feather name="heart" size={16} color={s.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body">{log.systolic}/{log.diastolic} mmHg</ThemedText>
                    <ThemedText type="small" style={{ color: COLORS.textMuted }}>{new Date(log.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} {log.pulse ? `· ${log.pulse} bpm` : ""}</ThemedText>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: s.color + "20" }]}>
                    <ThemedText type="small" style={{ color: s.color, fontSize: 11, fontWeight: "600" }}>{s.text}</ThemedText>
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.xl }}>Log Blood Pressure</ThemedText>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={styles.inputLabel}>Systolic (upper)</ThemedText>
                <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={sys} onChangeText={setSys} keyboardType="numeric" placeholder="120" placeholderTextColor={COLORS.textMuted} />
              </View>
              <ThemedText type="h2" style={{ paddingTop: 28 }}>/</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={styles.inputLabel}>Diastolic (lower)</ThemedText>
                <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={dia} onChangeText={setDia} keyboardType="numeric" placeholder="80" placeholderTextColor={COLORS.textMuted} />
              </View>
            </View>
            <ThemedText type="small" style={styles.inputLabel}>Pulse (optional)</ThemedText>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={pulse} onChangeText={setPulse} keyboardType="numeric" placeholder="bpm" placeholderTextColor={COLORS.textMuted} />
            <Button onPress={handleSave} disabled={saving} style={{ marginTop: Spacing.lg }}>{saving ? "Saving..." : "Save Reading"}</Button>
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
  currentCard: { borderRadius: BorderRadius["2xl"], padding: Spacing["2xl"], marginBottom: Spacing.xl, alignItems: "center", gap: 4 },
  bpDisplay: { flexDirection: "row", alignItems: "flex-end" },
  statusBadge: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginTop: Spacing.sm },
  emptyCard: { backgroundColor: "#FFF", borderRadius: BorderRadius["2xl"], padding: Spacing["3xl"], alignItems: "center", marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  logItem: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm },
  logIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statusTag: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFF", borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"], padding: Spacing.xl, paddingBottom: 40 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.lg },
  inputLabel: { color: COLORS.textMuted, marginBottom: Spacing.xs, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#E5E5E7", borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 18, textAlign: "center", marginBottom: Spacing.sm },
  cancelBtn: { alignItems: "center", marginTop: Spacing.md, padding: Spacing.sm },
});
