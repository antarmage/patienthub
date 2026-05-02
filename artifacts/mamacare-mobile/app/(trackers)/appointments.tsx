import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Appointment, getAppointments, saveAppointment, deleteAppointment } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [doctor, setDoctor] = useState("");
  const [clinic, setClinic] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => { setAppts(await getAppointments()); };

  const handleAdd = async () => {
    if (!doctor.trim() || !dateStr.trim()) { Alert.alert("Required", "Doctor name and date are required"); return; }
    const dateTime = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T10:00:00`;
    if (isNaN(new Date(dateTime).getTime())) { Alert.alert("Invalid", "Enter a valid date (YYYY-MM-DD)"); return; }
    setSaving(true);
    await saveAppointment({ doctorName: doctor.trim(), clinicName: clinic.trim() || "Saivie Clinic", dateTime });
    setDoctor(""); setClinic(""); setDateStr(""); setTimeStr(""); setShowModal(false); setSaving(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Cancel Appointment", "Remove this appointment?", [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await deleteAppointment(id); loadData(); } },
    ]);
  };

  const upcoming = appts.filter(a => new Date(a.dateTime) > new Date());
  const past = appts.filter(a => new Date(a.dateTime) <= new Date());
  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <View style={styles.root}>
      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={a => a.id}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
              </Pressable>
              <ThemedText type="h3">Appointments</ThemedText>
              <Pressable onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: COLORS.primary }]}>
                <Feather name="plus" size={18} color="#FFF" />
              </Pressable>
            </View>
            {appts.length === 0 ? <EmptyState icon="calendar" title="No appointments" description="Book your prenatal check-ups and keep them here" /> : null}
          </View>
        )}
        renderItem={({ item: appt }) => {
          const dt = new Date(appt.dateTime);
          const isPast = dt <= new Date();
          return (
            <View style={[styles.apptCard, Shadows.card, isPast && styles.past]}>
              <View style={[styles.dateBox, { backgroundColor: isPast ? "#F0F0F3" : COLORS.lavender }]}>
                <ThemedText type="h3" style={{ color: isPast ? COLORS.textMuted : COLORS.primary, fontWeight: "700" }}>{dt.getDate()}</ThemedText>
                <ThemedText type="small" style={{ color: isPast ? COLORS.textMuted : COLORS.primary }}>{dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4">{appt.doctorName}</ThemedText>
                <ThemedText type="small" style={{ color: COLORS.textMuted }}>{appt.clinicName} · {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</ThemedText>
                {isPast ? <ThemedText type="small" style={{ color: COLORS.textMuted }}>Past</ThemedText> : null}
              </View>
              <Pressable onPress={() => handleDelete(appt.id)}>
                <Feather name="trash-2" size={16} color={COLORS.textMuted} />
              </Pressable>
            </View>
          );
        }}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.xl }}>New Appointment</ThemedText>
            <ThemedText type="small" style={styles.label}>Doctor Name</ThemedText>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={doctor} onChangeText={setDoctor} placeholder="e.g. Dr. Sharma" placeholderTextColor={COLORS.textMuted} />
            <ThemedText type="small" style={styles.label}>Clinic / Hospital</ThemedText>
            <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={clinic} onChangeText={setClinic} placeholder="Saivie Clinic" placeholderTextColor={COLORS.textMuted} />
            <View style={styles.dateRow}>
              <View style={{ flex: 2 }}>
                <ThemedText type="small" style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
                <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={dateStr} onChangeText={setDateStr} placeholder="2025-12-01" placeholderTextColor={COLORS.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={styles.label}>Time (HH:MM)</ThemedText>
                <TextInput style={[styles.input, { color: COLORS.textPrimary }]} value={timeStr} onChangeText={setTimeStr} placeholder="10:00" placeholderTextColor={COLORS.textMuted} />
              </View>
            </View>
            <Button onPress={handleAdd} disabled={saving}>{saving ? "Adding..." : "Add Appointment"}</Button>
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
  apptCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm },
  dateBox: { width: 56, height: 56, borderRadius: BorderRadius.md, alignItems: "center", justifyContent: "center" },
  past: { opacity: 0.6 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFF", borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"], padding: Spacing.xl, paddingBottom: 40 },
  label: { color: COLORS.textMuted, fontWeight: "600", marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: "#E5E5E7", borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 15, marginBottom: Spacing.lg },
  dateRow: { flexDirection: "row", gap: Spacing.sm },
  cancelBtn: { alignItems: "center", marginTop: Spacing.md, padding: Spacing.sm },
});
