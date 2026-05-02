import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Alert,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
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
  updateAppointmentNotifications,
} from "@/utils/careStorage";
import {
  requestNotificationPermissions,
  scheduleAppointmentReminders,
  cancelNotifications,
} from "@/utils/notifications";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialty: string;
  photo: string;
  clinicName: string;
}

const DOCTORS: Doctor[] = [
  {
    id: "1",
    name: "Dr. Priya Sharma",
    qualification: "MBBS, MD (OB-GYN)",
    specialty: "Obstetrician",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
    clinicName: "Apollo Hospital",
  },
  {
    id: "2",
    name: "Dr. Anjali Mehta",
    qualification: "MBBS, DNB (OB-GYN)",
    specialty: "Gynecologist",
    photo: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop&crop=face",
    clinicName: "Fortis Clinic",
  },
  {
    id: "3",
    name: "Dr. Sneha Reddy",
    qualification: "MBBS, MS (OB-GYN)",
    specialty: "High-Risk Pregnancy",
    photo: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=200&h=200&fit=crop&crop=face",
    clinicName: "Max Healthcare",
  },
  {
    id: "4",
    name: "Dr. Kavita Patel",
    qualification: "MBBS, DGO",
    specialty: "Maternal Care",
    photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
    clinicName: "Cloudnine Hospital",
  },
  {
    id: "5",
    name: "Dr. Rashmi Gupta",
    qualification: "MBBS, MD, FRCOG",
    specialty: "Fetal Medicine",
    photo: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=200&h=200&fit=crop&crop=face",
    clinicName: "Motherhood Hospital",
  },
  {
    id: "6",
    name: "Dr. Deepa Nair",
    qualification: "MBBS, DNB, FICOG",
    specialty: "Prenatal Care",
    photo: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=200&h=200&fit=crop&crop=face",
    clinicName: "Rainbow Hospital",
  },
];

export default function AppointmentsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"select" | "schedule">("select");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
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

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setModalStep("schedule");
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddAppointment = async () => {
    if (!selectedDoctor) {
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
        doctorName: selectedDoctor.name,
        clinicName: selectedDoctor.clinicName,
        dateTime: dateTime.toISOString(),
      });

      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        const notificationIds = await scheduleAppointmentReminders(
          newAppointment.id,
          newAppointment.doctorName,
          newAppointment.clinicName,
          dateTime
        );
        await updateAppointmentNotifications(newAppointment.id, notificationIds);
      }

      setSelectedDoctor(null);
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setModalStep("select");
      setShowModal(false);
      loadAppointments();
    } catch (error) {
      Alert.alert("Error", "Failed to save appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalStep("select");
    setSelectedDoctor(null);
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
            await cancelNotifications(appointment.notificationIds);
            await deleteAppointment(appointment.id);
            loadAppointments();
          },
        },
      ]
    );
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return {
      date: date.toLocaleDateString("en-IN", dateOptions),
      time: date.toLocaleTimeString("en-IN", timeOptions),
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
            <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
              {item.doctorName}
            </ThemedText>
            <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
              {item.clinicName}
            </ThemedText>
          </View>
        </View>
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <Feather name="calendar" size={16} color={COLORS.textMuted} />
            <ThemedText type="small" style={{ color: COLORS.textSecondary, marginLeft: Spacing.xs }}>
              {date}
            </ThemedText>
          </View>
          <View style={styles.dateTimeItem}>
            <Feather name="clock" size={16} color={COLORS.textMuted} />
            <ThemedText type="small" style={{ color: COLORS.textSecondary, marginLeft: Spacing.xs }}>
              {time}
            </ThemedText>
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
            onAction={() => setShowModal(true)}
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
        onPress={() => setShowModal(true)}
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
                {DOCTORS.map((doctor) => (
                  <Pressable
                    key={doctor.id}
                    style={styles.doctorCard}
                    onPress={() => handleSelectDoctor(doctor)}
                  >
                    <Image
                      source={{ uri: doctor.photo }}
                      style={styles.doctorPhoto}
                    />
                    <ThemedText type="body" style={styles.doctorName} numberOfLines={2}>
                      {doctor.name}
                    </ThemedText>
                    <ThemedText type="small" style={styles.doctorQualification} numberOfLines={1}>
                      {doctor.qualification}
                    </ThemedText>
                    <View style={[styles.specialtyTag, { backgroundColor: theme.primaryLight }]}>
                      <ThemedText type="small" style={{ color: theme.primary, fontSize: 10 }}>
                        {doctor.specialty}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <KeyboardAwareScrollViewCompat
                style={{ flex: 1 }}
                contentContainerStyle={styles.scheduleForm}
              >
                {selectedDoctor ? (
                  <View style={styles.selectedDoctorCard}>
                    <Image
                      source={{ uri: selectedDoctor.photo }}
                      style={styles.selectedDoctorPhoto}
                    />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
                        {selectedDoctor.name}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
                        {selectedDoctor.clinicName}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}

                <ThemedText type="h4" style={styles.label}>
                  Date
                </ThemedText>
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

                <ThemedText type="h4" style={styles.label}>
                  Time
                </ThemedText>
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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  appointmentHeader: {
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
  appointmentInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
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
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: "85%",
    minHeight: "70%",
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  doctorScrollView: {
    flex: 1,
  },
  doctorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: Spacing.xl,
  },
  doctorCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  doctorPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.sm,
    backgroundColor: COLORS.border,
  },
  doctorName: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  doctorQualification: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 11,
    marginBottom: Spacing.sm,
  },
  specialtyTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  scheduleForm: {
    paddingBottom: Spacing.xl,
  },
  selectedDoctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  selectedDoctorPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.border,
  },
  label: {
    color: COLORS.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.card,
  },
  submitButton: {
    marginTop: Spacing.xl,
  },
});
