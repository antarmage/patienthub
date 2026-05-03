import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import {
  Medicine,
  MedicineLog,
  getMedicines,
  saveMedicine,
  deleteMedicine,
  updateMedicineNotifications,
  getMedicineLogs,
  logMedicineTaken,
} from "@/utils/careStorage";
import {
  requestNotificationPermissions,
  scheduleMedicineReminders,
  cancelNotifications,
} from "@/utils/notifications";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const MEDICINE_DEFAULT_TIME_KEY = "@saiviemom_medicine_default_time";

type FrequencyOption = "once" | "twice" | "thrice";

const frequencyLabels: Record<FrequencyOption, string> = {
  once: "Once daily",
  twice: "Twice daily",
  thrice: "Three times daily",
};

function computeTimesFromBase(frequency: FrequencyOption, baseDate: Date): string[] {
  const h = baseDate.getHours();
  const m = baseDate.getMinutes();
  const fmt = (hour: number, min: number) =>
    `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  switch (frequency) {
    case "once":
      return [fmt(h, m)];
    case "twice":
      return [fmt(h, m), fmt((h + 12) % 24, m)];
    case "thrice":
      return [fmt(h, m), fmt(Math.min(h + 5, 23), m), fmt(Math.min(h + 10, 23), m)];
  }
}

function defaultReminderDate(hhMm: string): Date {
  const [hStr, mStr] = hhMm.split(":");
  const d = new Date();
  d.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return d;
}

export default function MedicinesScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicineLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<FrequencyOption>("once");
  const [durationDays, setDurationDays] = useState("7");
  const [reminderTime, setReminderTime] = useState<Date>(() => defaultReminderDate("09:00"));
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === "ios");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const [meds, savedTime] = await Promise.all([
      getMedicines(),
      AsyncStorage.getItem(MEDICINE_DEFAULT_TIME_KEY),
    ]);
    setMedicines(meds);
    if (savedTime) setReminderTime(defaultReminderDate(savedTime));

    const today = new Date().toISOString().split("T")[0];
    const logs = await getMedicineLogs(today);
    setTodayLogs(logs);
  };

  const isActiveMedicine = (medicine: Medicine) => {
    const now = new Date();
    const startDate = new Date(medicine.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + medicine.durationDays);
    return now >= startDate && now <= endDate;
  };

  const isTaken = (medicineId: string, time: string) => {
    return todayLogs.some(
      (log) => log.medicineId === medicineId && log.scheduledTime === time,
    );
  };

  const handleMarkTaken = async (medicineId: string, time: string) => {
    if (isTaken(medicineId, time)) return;
    await logMedicineTaken(medicineId, time);
    loadData();
  };

  const handleAddMedicine = async () => {
    if (!medicineName.trim() || !dosage.trim()) {
      Alert.alert("Missing Information", "Please fill in medicine name and dosage");
      return;
    }

    const days = parseInt(durationDays, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert("Invalid Duration", "Please enter a valid number of days");
      return;
    }

    setLoading(true);
    try {
      const times = computeTimesFromBase(frequency, reminderTime);

      const hh = String(reminderTime.getHours()).padStart(2, "0");
      const mm = String(reminderTime.getMinutes()).padStart(2, "0");
      await AsyncStorage.setItem(MEDICINE_DEFAULT_TIME_KEY, `${hh}:${mm}`);

      const newMedicine = await saveMedicine({
        name: medicineName.trim(),
        dosage: dosage.trim(),
        frequency,
        times,
        durationDays: days,
        startDate: new Date().toISOString(),
      });

      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        const notificationIds = await scheduleMedicineReminders(
          newMedicine.id,
          newMedicine.name,
          newMedicine.dosage,
          times,
          days,
        );
        await updateMedicineNotifications(newMedicine.id, notificationIds);
      }

      setMedicineName("");
      setDosage("");
      setFrequency("once");
      setDurationDays("7");
      setShowModal(false);
      loadData();
    } catch {
      Alert.alert("Error", "Failed to save medicine");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedicine = async (medicine: Medicine) => {
    Alert.alert("Delete Medicine", `Remove ${medicine.name} from your list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelNotifications(medicine.notificationIds);
          await deleteMedicine(medicine.id);
          loadData();
        },
      },
    ]);
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (date) setReminderTime(date);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatReminderTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const renderMedicine = ({ item }: { item: Medicine }) => {
    const isActive = isActiveMedicine(item);
    const endDate = new Date(item.startDate);
    endDate.setDate(endDate.getDate() + item.durationDays);

    return (
      <Card
        style={[styles.medicineCard, !isActive && { opacity: 0.6 }]}
        onPress={() => handleDeleteMedicine(item)}
      >
        <View style={styles.medicineHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.primaryLight },
            ]}
          >
            <Feather name="heart" size={20} color={theme.primary} />
          </View>
          <View style={styles.medicineInfo}>
            <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
              {item.dosage} - {frequencyLabels[item.frequency]}
            </ThemedText>
          </View>
        </View>

        {isActive ? (
          <View style={styles.timesContainer}>
            {item.times.map((time) => {
              const taken = isTaken(item.id, time);
              return (
                <Pressable
                  key={time}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: taken
                        ? theme.success
                        : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => handleMarkTaken(item.id, time)}
                >
                  <Feather
                    name={taken ? "check-circle" : "circle"}
                    size={16}
                    color={taken ? COLORS.white : COLORS.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      color: taken ? COLORS.white : COLORS.textSecondary,
                      marginLeft: Spacing.xs,
                    }}
                  >
                    {formatTime(time)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Completed on {endDate.toLocaleDateString("en-IN")}
          </ThemedText>
        )}
      </Card>
    );
  };

  const FrequencySelector = () => (
    <View style={styles.frequencyContainer}>
      {(["once", "twice", "thrice"] as FrequencyOption[]).map((option) => (
        <Pressable
          key={option}
          style={[
            styles.frequencyOption,
            {
              backgroundColor:
                frequency === option
                  ? theme.primary
                  : theme.backgroundSecondary,
              borderColor: frequency === option ? theme.primary : COLORS.border,
            },
          ]}
          onPress={() => setFrequency(option)}
        >
          <ThemedText
            type="small"
            style={{
              color: frequency === option ? COLORS.white : COLORS.textSecondary,
              fontWeight: "600",
            }}
          >
            {frequencyLabels[option]}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {medicines.length === 0 ? (
        <View style={{ paddingTop: headerHeight }}>
          <EmptyState
            icon="heart"
            title="No Medicines Added"
            message="Add your medicines to get timely reminders and track your doses"
            actionLabel="Add Medicine"
            onAction={() => setShowModal(true)}
          />
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          renderItem={renderMedicine}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl + 80,
            paddingHorizontal: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowModal(true)}
      >
        <Feather name="plus" size={24} color={COLORS.white} />
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalScrollContent}
          >
            <ThemedView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText type="h2" style={{ color: COLORS.textPrimary }}>
                  Add Medicine
                </ThemedText>
                <Pressable onPress={() => setShowModal(false)}>
                  <Feather name="x" size={24} color={COLORS.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.form}>
                <ThemedText type="h4" style={styles.label}>
                  Medicine Name
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { borderColor: COLORS.border, color: COLORS.textPrimary },
                  ]}
                  placeholder="Folic Acid"
                  placeholderTextColor={COLORS.textMuted}
                  value={medicineName}
                  onChangeText={setMedicineName}
                />

                <ThemedText type="h4" style={styles.label}>
                  Dosage
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { borderColor: COLORS.border, color: COLORS.textPrimary },
                  ]}
                  placeholder="400 mcg"
                  placeholderTextColor={COLORS.textMuted}
                  value={dosage}
                  onChangeText={setDosage}
                />

                <ThemedText type="h4" style={styles.label}>
                  How often?
                </ThemedText>
                <FrequencySelector />

                <ThemedText type="h4" style={styles.label}>
                  First reminder time
                </ThemedText>
                {Platform.OS === "android" ? (
                  <Pressable
                    style={[styles.timeButton, { borderColor: COLORS.border }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Feather name="clock" size={20} color={theme.primary} />
                    <ThemedText type="body" style={{ color: COLORS.textPrimary }}>
                      {formatReminderTime(reminderTime)}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {showTimePicker ? (
                  <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onTimeChange}
                    accentColor={theme.primary}
                  />
                ) : null}
                {frequency !== "once" ? (
                  <ThemedText type="small" style={styles.timeHint}>
                    {frequency === "twice"
                      ? `Also at ${formatReminderTime(new Date(reminderTime.getTime() + 12 * 3600000))}`
                      : `Also at ${formatReminderTime(new Date(Math.min(reminderTime.getTime() + 5 * 3600000, new Date().setHours(23, 0, 0, 0))))} and ${formatReminderTime(new Date(Math.min(reminderTime.getTime() + 10 * 3600000, new Date().setHours(23, 0, 0, 0))))}`}
                  </ThemedText>
                ) : null}

                <ThemedText type="h4" style={styles.label}>
                  Duration (days)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { borderColor: COLORS.border, color: COLORS.textPrimary },
                  ]}
                  placeholder="7"
                  placeholderTextColor={COLORS.textMuted}
                  value={durationDays}
                  onChangeText={setDurationDays}
                  keyboardType="number-pad"
                />

                <Button
                  onPress={handleAddMedicine}
                  disabled={loading}
                  style={styles.submitButton}
                >
                  {loading ? "Saving..." : "Save Medicine"}
                </Button>
              </View>
            </ThemedView>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  medicineCard: {
    marginBottom: Spacing.md,
  },
  medicineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  timesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.sm,
  },
  label: {
    color: COLORS.textPrimary,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  timeHint: {
    color: COLORS.textMuted,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  frequencyContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  frequencyOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  submitButton: {
    marginTop: Spacing.xl,
  },
});
