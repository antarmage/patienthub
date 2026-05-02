import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Medicine, MedicineLog, getMedicines, saveMedicine, deleteMedicine, getMedicineLogs, logMedicineTaken } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

type Freq = "once" | "twice" | "thrice";
const freqLabels: Record<Freq, string> = { once: "Once daily", twice: "Twice daily", thrice: "Three times daily" };
const freqTimes: Record<Freq, string[]> = { once: ["09:00"], twice: ["09:00", "21:00"], thrice: ["09:00", "14:00", "21:00"] };

export default function MedicinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<MedicineLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [freq, setFreq] = useState<Freq>("once");
  const [duration, setDuration] = useState("7");
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const [m, l] = await Promise.all([getMedicines(), getMedicineLogs(new Date().toISOString().split("T")[0])]);
    setMeds(m); setLogs(l);
  };

  const isActive = (m: Medicine) => {
    const now = new Date(), start = new Date(m.startDate);
    const end = new Date(start); end.setDate(end.getDate() + m.durationDays);
    return now >= start && now <= end;
  };

  const isTaken = (medId: string, time: string) => logs.some(l => l.medicineId === medId && l.scheduledTime === time);

  const handleMark = async (medId: string, time: string) => {
    if (isTaken(medId, time)) return;
    await logMedicineTaken(medId, time);
    loadData();
  };

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert("Required", "Enter medicine name"); return; }
    setSaving(true);
    await saveMedicine({ name: name.trim(), dosage, frequency: freq, times: freqTimes[freq], durationDays: parseInt(duration, 10) || 7, startDate: new Date().toISOString() });
    setName(""); setDosage(""); setFreq("once"); setDuration("7"); setShowModal(false); setSaving(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Remove this medicine?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteMedicine(id); loadData(); } },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <View style={styles.root}>
      <FlatList
        data={meds}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
              </Pressable>
              <ThemedText type="h3">Medicines</ThemedText>
              <Pressable onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: COLORS.primary }]}>
                <Feather name="plus" size={18} color="#FFF" />
              </Pressable>
            </View>
            {meds.length === 0 ? <EmptyState icon="package" title="No medicines yet" description="Add your prescribed medications to track them daily" /> : null}
          </View>
        )}
        renderItem={({ item: med }) => (
          <View style={[styles.medCard, Shadows.card, !isActive(med) && styles.inactive]}>
            <View style={styles.medRow}>
              <View style={[styles.medIcon, { backgroundColor: COLORS.softPurple }]}>
                <Feather name="package" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4">{med.name}</ThemedText>
                <ThemedText type="small" style={{ color: COLORS.textMuted }}>{med.dosage ? `${med.dosage} · ` : ""}{freqLabels[med.frequency]} · {med.durationDays}d</ThemedText>
                {!isActive(med) ? <ThemedText type="small" style={{ color: COLORS.textMuted }}>Completed</ThemedText> : null}
              </View>
              <Pressable onPress={() => handleDelete(med.id)}>
                <Feather name="trash-2" size={16} color={COLORS.textMuted} />
              </Pressable>
            </View>
            {isActive(med) ? (
              <View style={styles.timesRow}>
                {med.times.map(t => (
                  <Pressable key={t} onPress={() => handleMark(med.id, t)} style={[styles.timeChip, isTaken(med.id, t) ? { backgroundColor: COLORS.success + "20", borderColor: COLORS.success } : { backgroundColor: "#F0F0F3", borderColor: "#E5E5E7" }]}>
                    <Feather name={isTaken(med.id, t) ? "check-circle" : "circle"} size={14} color={isTaken(med.id, t) ? COLORS.success : COLORS.textMuted} />
                    <ThemedText type="small" style={{ color: isTaken(med.id, t) ? COLORS.success : COLORS.textMuted }}>{t}</ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.xl }}>Add Medicine</ThemedText>
            <ThemedText type="small" style={styles.label}>Medicine Name</ThemedText>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={name} onChangeText={setName} placeholder="e.g. Folic Acid" placeholderTextColor={COLORS.textMuted} />
            <ThemedText type="small" style={styles.label}>Dosage (optional)</ThemedText>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={dosage} onChangeText={setDosage} placeholder="e.g. 5mg" placeholderTextColor={COLORS.textMuted} />
            <ThemedText type="small" style={styles.label}>Frequency</ThemedText>
            <View style={styles.freqRow}>
              {(["once", "twice", "thrice"] as Freq[]).map(f => (
                <Pressable key={f} onPress={() => setFreq(f)} style={[styles.freqBtn, freq === f && { backgroundColor: COLORS.primary }]}>
                  <ThemedText type="small" style={{ color: freq === f ? "#FFF" : COLORS.textPrimary, fontWeight: "600" }}>{f}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText type="small" style={styles.label}>Duration (days)</ThemedText>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="7" placeholderTextColor={COLORS.textMuted} />
            <Button onPress={handleAdd} disabled={saving} style={{ marginTop: Spacing.lg }}>{saving ? "Adding..." : "Add Medicine"}</Button>
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
  medCard: { backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  medRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.sm },
  medIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  inactive: { opacity: 0.6 },
  timesRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  timeChip: { flexDirection: "row", gap: Spacing.xs, alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFF", borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"], padding: Spacing.xl, paddingBottom: 40 },
  label: { color: COLORS.textMuted, fontWeight: "600", marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: "#E5E5E7", borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 15, marginBottom: Spacing.lg },
  freqRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  freqBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: "center", backgroundColor: "#F0F0F3" },
  cancelBtn: { alignItems: "center", marginTop: Spacing.md, padding: Spacing.sm },
});
