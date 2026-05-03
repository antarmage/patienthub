import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
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
  Appointment,
  getAppointments,
  saveAppointment,
  deleteAppointment,
  getApiBase,
} from "@/utils/careStorage";
import {
  requestNotificationPermissions,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
} from "@/utils/notifications";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

interface ApiProvider {
  id: number;
  name: string;
  role: string | null;
  specialty: string | null;
  qualification: string | null;
  clinicName: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#6C63FF", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6"];

function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function AppointmentsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"select" | "schedule">("select");
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === "ios");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  const loadAppointments = async () => {
    const data = await getAppointments();
    const sorted = data.sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
    setAppointments(sorted);
  };

  const loadProviders = async () => {
    setProvidersLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/mobile/providers`);
      if (res.ok) {
        const data: ApiProvider[] = await res.json();
        setProviders(data);
      }
    } catch {
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    loadProviders();
  };

  const handleSelectProvider = (provider: ApiProvider) => {
    setSelectedProvider(provider);
    setModalStep("schedule");
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (date) setSelectedTime(date);
  };

  const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDisplayTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const handleAddAppointment = async () => {
    if (!selectedProvider) {
      Alert.alert("Missing Information", "Please select a doctor");
      return;
    }

    const dateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );

    if (dateTime < new Date()) {
      Alert.alert("Invalid Date", "Appointment date must be in the future");
      return;
    }

    setLoading(true);
    try {
      const newAppointment = await saveAppointment({
        doctorName: selectedProvider.name,
        clinicName: selectedProvider.clinicName || "",
        dateTime: dateTime.toISOString(),
      });

      const [hasPermission, apptNotifsEnabled] = await Promise.all([
        requestNotificationPermissions(),
        AsyncStorage.getItem("@saiviemom_notif_appointment"),
      ]);
      if (hasPermission && apptNotifsEnabled === "true") {
        await scheduleAppointmentReminder(
          newAppointment.id,
          newAppointment.doctorName,
          newAppointment.clinicName,
          dateTime,
        );
      }

      setSelectedProvider(null);
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setModalStep("select");
      setShowModal(false);
      loadAppointments();
    } catch {
      Alert.alert("Error", "Failed to save appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalStep("select");
    setSelectedProvider(null);
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    Alert.alert(
      "Delete Appointment",
      `Remove appointment with ${appointment.doctorName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await cancelAppointmentReminder(appointment.id);
            await deleteAppointment(appointment.id);
            loadAppointments();
          },
        },
      ]
    );
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const { date, time } = formatDateTime(item.dateTime);
    const isPast = new Date(item.dateTime) < new Date();

    return (
      <Card
        style={[styles.appointmentCard, isPast && { opacity: 0.6 }]}
        onPress={() => handleDeleteAppointment(item)}
      >
        <View style={styles.appointmentHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
            <Feather name="user" size={20} color={theme.primary} />
          </View>
          <View style={styles.appointmentInfo}>
            <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>{item.doctorName}</ThemedText>
            {item.clinicName ? (
              <ThemedText type="small" style={{ color: COLORS.textSecondary }}>{item.clinicName}</ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <Feather name="calendar" size={16} color={COLORS.textMuted} />
            <ThemedText type="small" style={{ color: COLORS.textSecondary, marginLeft: Spacing.xs }}>{date}</ThemedText>
          </View>
          <View style={styles.dateTimeItem}>
            <Feather name="clock" size={16} color={COLORS.textMuted} />
            <ThemedText type="small" style={{ color: COLORS.textSecondary, marginLeft: Spacing.xs }}>{time}</ThemedText>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {appointments.length === 0 ? (
        <View style={{ paddingTop: headerHeight }}>
          <EmptyState
            icon="calendar"
            title="No Appointments Yet"
            message="Add your doctor appointments to get reminders before each visit"
            actionLabel="Add Appointment"
            onAction={handleOpenModal}
          />
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
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
        onPress={handleOpenModal}
      >
        <Feather name="plus" size={24} color={COLORS.white} />
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {modalStep === "schedule" ? (
                <Pressable onPress={() => setModalStep("select")} style={styles.backButton}>
                  <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
                </Pressable>
              ) : null}
              <ThemedText type="h2" style={{ color: COLORS.textPrimary, flex: 1 }}>
                {modalStep === "select" ? "Select Doctor" : "Schedule Appointment"}
              </ThemedText>
              <Pressable onPress={handleCloseModal}>
                <Feather name="x" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            {modalStep === "select" ? (
              <ScrollView
                style={styles.doctorScrollView}
                contentContainerStyle={styles.doctorGrid}
                showsVerticalScrollIndicator={false}
              >
                {providersLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText type="small" style={{ color: COLORS.textSecondary, marginTop: Spacing.sm }}>
                      Loading providers…
                    </ThemedText>
                  </View>
                ) : providers.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <Feather name="users" size={32} color={COLORS.textMuted} />
                    <ThemedText type="small" style={{ color: COLORS.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                      No providers found. Please contact the clinic.
                    </ThemedText>
                  </View>
                ) : (
                  providers.map((provider) => (
                    <Pressable
                      key={provider.id}
                      style={styles.doctorCard}
                      onPress={() => handleSelectProvider(provider)}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: avatarColor(provider.id) }]}>
                        <ThemedText style={styles.avatarText}>{getInitials(provider.name)}</ThemedText>
                      </View>
                      <ThemedText type="body" style={styles.doctorName} numberOfLines={2}>
                        {provider.name}
                      </ThemedText>
                      {provider.qualification ? (
                        <ThemedText type="small" style={styles.doctorQualification} numberOfLines={1}>
                          {provider.qualification}
                        </ThemedText>
                      ) : null}
                      {provider.specialty ? (
                        <View style={[styles.specialtyTag, { backgroundColor: theme.primaryLight }]}>
                          <ThemedText type="small" style={{ color: theme.primary, fontSize: 10 }}>
                            {provider.specialty}
                          </ThemedText>
                        </View>
                      ) : null}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : (
              <KeyboardAwareScrollViewCompat
                style={{ flex: 1 }}
                contentContainerStyle={styles.scheduleForm}
              >
                {selectedProvider ? (
                  <View style={styles.selectedDoctorCard}>
                    <View style={[styles.selectedAvatarCircle, { backgroundColor: avatarColor(selectedProvider.id) }]}>
                      <ThemedText style={styles.selectedAvatarText}>{getInitials(selectedProvider.name)}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>{selectedProvider.name}</ThemedText>
                      {selectedProvider.clinicName ? (
                        <ThemedText type="small" style={{ color: COLORS.textSecondary }}>{selectedProvider.clinicName}</ThemedText>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <ThemedText type="h4" style={styles.label}>Date</ThemedText>
                {Platform.OS === "android" ? (
                  <Pressable
                    style={[styles.dateButton, { borderColor: COLORS.border }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Feather name="calendar" size={20} color={theme.primary} />
                    <ThemedText type="body" style={{ color: COLORS.textPrimary, flex: 1 }}>
                      {formatDisplayDate(selectedDate)}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {showDatePicker ? (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                    accentColor={theme.primary}
                  />
                ) : null}

                <ThemedText type="h4" style={styles.label}>Time</ThemedText>
                {Platform.OS === "android" ? (
                  <Pressable
                    style={[styles.dateButton, { borderColor: COLORS.border }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Feather name="clock" size={20} color={theme.primary} />
                    <ThemedText type="body" style={{ color: COLORS.textPrimary, flex: 1 }}>
                      {formatDisplayTime(selectedTime)}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {showTimePicker ? (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onTimeChange}
                    accentColor={theme.primary}
                  />
                ) : null}

                <Button onPress={handleAddAppointment} disabled={loading} style={styles.submitButton}>
                  {loading ? "Saving..." : "Book Appointment"}
                </Button>
              </KeyboardAwareScrollViewCompat>
            )}
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  appointmentCard: { marginBottom: Spacing.md },
  appointmentHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  appointmentInfo: { marginLeft: Spacing.md, flex: 1 },
  dateTimeRow: { flexDirection: "row", gap: Spacing.xl },
  dateTimeItem: { flexDirection: "row", alignItems: "center" },
  fab: {
    position: "absolute", bottom: 100, right: Spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl, maxHeight: "85%", minHeight: "70%", backgroundColor: "#FFFFFF",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  backButton: { marginRight: Spacing.md },
  doctorScrollView: { flex: 1 },
  doctorGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingBottom: Spacing.xl },
  loadingContainer: { width: "100%", alignItems: "center", paddingVertical: Spacing.xl },
  doctorCard: {
    width: "48%", backgroundColor: COLORS.card, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md, alignItems: "center",
  },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#FFFFFF" },
  doctorName: { color: COLORS.textPrimary, fontWeight: "600", textAlign: "center", marginBottom: Spacing.xs },
  doctorQualification: { color: COLORS.textSecondary, textAlign: "center", fontSize: 11, marginBottom: Spacing.sm },
  specialtyTag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  scheduleForm: { paddingBottom: Spacing.xl },
  selectedDoctorCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.md,
  },
  selectedAvatarCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  selectedAvatarText: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  label: { color: COLORS.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  dateButton: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: COLORS.card,
  },
  submitButton: { marginTop: Spacing.xl },
});
