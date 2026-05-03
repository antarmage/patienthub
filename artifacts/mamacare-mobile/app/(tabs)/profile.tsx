import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp } from "@/context/AppContext";
import { calculateEDD, formatDate } from "@/data/pregnancyData";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";
import {
  requestNotificationPermissions,
  scheduleMedicineReminders,
  cancelMedicineReminders,
  scheduleAppointmentReminders,
  cancelAppointmentReminders,
  scheduleWaterReminders,
  cancelAllWaterReminders,
} from "@/utils/notifications";
import {
  getMedicines,
  getAppointments,
  getWaterIntakeToday,
  getWaterGoal,
} from "@/utils/careStorage";

const NOTIF_KEYS = {
  MEDICINE: "@saiviemom_notif_medicine",
  APPOINTMENT: "@saiviemom_notif_appointment",
  WATER: "@saiviemom_water_reminders_enabled",
  MEDICINE_DEFAULT_TIME: "@saiviemom_medicine_default_time",
};

function defaultReminderDate(hhMm: string): Date {
  const [hStr, mStr] = hhMm.split(":");
  const d = new Date();
  d.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return d;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userProfile, updateProfile, logout, selectedWeek } = useApp();

  const [name, setName] = useState(userProfile?.name || "");
  const [lmpDay, setLmpDay] = useState("");
  const [lmpMonth, setLmpMonth] = useState("");
  const [lmpYear, setLmpYear] = useState("");
  const [eddDisplay, setEddDisplay] = useState("");
  const [saved, setSaved] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [medicineNotifs, setMedicineNotifs] = useState(false);
  const [appointmentNotifs, setAppointmentNotifs] = useState(false);
  const [waterNotifs, setWaterNotifs] = useState(false);
  const [togglingMedicine, setTogglingMedicine] = useState(false);
  const [togglingAppointment, setTogglingAppointment] = useState(false);
  const [togglingWater, setTogglingWater] = useState(false);

  const [medicineDefaultTime, setMedicineDefaultTime] = useState<Date>(() =>
    defaultReminderDate("09:00")
  );
  const [showMedicineTimePicker, setShowMedicineTimePicker] = useState(false);

  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;

  useEffect(() => {
    if (userProfile?.lmpDate) {
      const lmp = new Date(userProfile.lmpDate);
      setLmpDay(lmp.getDate().toString());
      setLmpMonth((lmp.getMonth() + 1).toString());
      setLmpYear(lmp.getFullYear().toString());
      const edd = calculateEDD(lmp);
      setEddDisplay(formatDate(edd));
    }
    if (userProfile?.name) setName(userProfile.name);
  }, [userProfile]);

  useEffect(() => {
    if (lmpDay && lmpMonth && lmpYear) {
      const day = parseInt(lmpDay, 10);
      const month = parseInt(lmpMonth, 10) - 1;
      const year = parseInt(lmpYear, 10);
      if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2024) {
        const lmpDate = new Date(year, month, day);
        if (!isNaN(lmpDate.getTime())) {
          const edd = calculateEDD(lmpDate);
          setEddDisplay(formatDate(edd));
        }
      }
    }
  }, [lmpDay, lmpMonth, lmpYear]);

  useEffect(() => {
    loadNotifPrefs();
  }, []);

  const loadNotifPrefs = async () => {
    const [med, appt, water, medTime] = await Promise.all([
      AsyncStorage.getItem(NOTIF_KEYS.MEDICINE),
      AsyncStorage.getItem(NOTIF_KEYS.APPOINTMENT),
      AsyncStorage.getItem(NOTIF_KEYS.WATER),
      AsyncStorage.getItem(NOTIF_KEYS.MEDICINE_DEFAULT_TIME),
    ]);
    setMedicineNotifs(med === "true");
    setAppointmentNotifs(appt === "true");
    setWaterNotifs(water === "true");
    if (medTime) setMedicineDefaultTime(defaultReminderDate(medTime));
  };

  const handleSave = async () => {
    let lmpDate: string | null = null;
    let eddDate: string | null = null;

    if (lmpDay && lmpMonth && lmpYear) {
      const day = parseInt(lmpDay, 10);
      const month = parseInt(lmpMonth, 10) - 1;
      const year = parseInt(lmpYear, 10);
      const lmp = new Date(year, month, day);
      if (!isNaN(lmp.getTime())) {
        lmpDate = lmp.toISOString();
        const edd = calculateEDD(lmp);
        eddDate = edd.toISOString();
      }
    }

    await updateProfile({
      name,
      phone: userProfile?.phone || "",
      lmpDate,
      eddDate,
    });

    setSaved(true);
    setShowEditProfile(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
  };

  const onMedicineTimeChange = async (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowMedicineTimePicker(false);
    if (!date) return;
    setMedicineDefaultTime(date);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    await AsyncStorage.setItem(NOTIF_KEYS.MEDICINE_DEFAULT_TIME, `${hh}:${mm}`);
    if (medicineNotifs) {
      await rescheduleMedicinesWithTime(date);
    }
  };

  const rescheduleMedicinesWithTime = async (baseTime: Date) => {
    const medicines = await getMedicines();
    const now = new Date();
    const h = baseTime.getHours();
    const m = baseTime.getMinutes();
    const fmt = (hour: number, min: number) =>
      `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    for (const med of medicines) {
      const start = new Date(med.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + med.durationDays);
      if (now > end) continue;
      await cancelMedicineReminders(med.id);
      let times: string[];
      switch (med.frequency) {
        case "twice": times = [fmt(h, m), fmt((h + 12) % 24, m)]; break;
        case "thrice": times = [fmt(h, m), fmt(Math.min(h + 5, 23), m), fmt(Math.min(h + 10, 23), m)]; break;
        default: times = [fmt(h, m)];
      }
      await scheduleMedicineReminders(med.id, med.name, med.dosage, times);
    }
  };

  const handleToggleMedicineNotifs = async (value: boolean) => {
    if (Platform.OS === "web") return;
    setTogglingMedicine(true);
    try {
      if (value) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;
        await rescheduleMedicinesWithTime(medicineDefaultTime);
      } else {
        const medicines = await getMedicines();
        for (const med of medicines) {
          await cancelMedicineReminders(med.id);
        }
      }
      await AsyncStorage.setItem(NOTIF_KEYS.MEDICINE, value ? "true" : "false");
      setMedicineNotifs(value);
    } finally {
      setTogglingMedicine(false);
    }
  };

  const handleToggleAppointmentNotifs = async (value: boolean) => {
    if (Platform.OS === "web") return;
    setTogglingAppointment(true);
    try {
      if (value) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;
        const appointments = await getAppointments();
        const now = new Date();
        for (const appt of appointments) {
          const dateTime = new Date(appt.dateTime);
          if (dateTime <= now) continue;
          await scheduleAppointmentReminders(appt.id, appt.doctorName, appt.clinicName, dateTime);
        }
      } else {
        const appointments = await getAppointments();
        for (const appt of appointments) {
          await cancelAppointmentReminders(appt.id);
        }
      }
      await AsyncStorage.setItem(NOTIF_KEYS.APPOINTMENT, value ? "true" : "false");
      setAppointmentNotifs(value);
    } finally {
      setTogglingAppointment(false);
    }
  };

  const handleToggleWaterNotifs = async (value: boolean) => {
    if (Platform.OS === "web") return;
    setTogglingWater(true);
    try {
      if (value) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;
        const [intake, goalMl] = await Promise.all([getWaterIntakeToday(), getWaterGoal()]);
        if (intake.totalMl < goalMl) {
          await scheduleWaterReminders();
        }
      } else {
        await cancelAllWaterReminders();
      }
      await AsyncStorage.setItem(NOTIF_KEYS.WATER, value ? "true" : "false");
      setWaterNotifs(value);
    } finally {
      setTogglingWater(false);
    }
  };

  const formatPickerTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const displayName = userProfile?.name || "Mummy";

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["2xl"],
      }}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color="#6C63FF" />
          </View>
          <Pressable
            style={styles.editAvatarButton}
            onPress={() => setShowEditProfile(!showEditProfile)}
          >
            <Feather name="edit-2" size={12} color="#FFFFFF" />
          </Pressable>
        </View>
        <ThemedText style={styles.userName}>{displayName}</ThemedText>
        <ThemedText style={styles.userSubtitle}>
          {eddDisplay ? `Due ${eddDisplay}` : `Week ${selectedWeek}`} · {trimester === 1 ? "First" : trimester === 2 ? "Second" : "Third"} Baby
        </ThemedText>
      </View>

      {showEditProfile && (
        <View style={styles.editSection}>
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Edit Profile</ThemedText>

            <ThemedText style={styles.inputLabel}>Your Name</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />

            <ThemedText style={styles.inputLabel}>Last Menstrual Period</ThemedText>
            <View style={styles.dateInputRow}>
              <TextInput
                style={styles.dateInput}
                placeholder="DD"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={lmpDay}
                onChangeText={setLmpDay}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="MM"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={lmpMonth}
                onChangeText={setLmpMonth}
              />
              <TextInput
                style={[styles.dateInput, { flex: 1.5 }]}
                placeholder="YYYY"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                value={lmpYear}
                onChangeText={setLmpYear}
              />
            </View>

            {eddDisplay ? (
              <View style={styles.eddBanner}>
                <Feather name="calendar" size={18} color="#6C63FF" />
                <View style={styles.eddTextWrap}>
                  <ThemedText style={styles.eddLabel}>Expected Due Date</ThemedText>
                  <ThemedText style={styles.eddValue}>{eddDisplay}</ThemedText>
                </View>
              </View>
            ) : null}

            <Button onPress={handleSave} style={styles.saveButton}>
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>
        <View style={styles.card}>
          <Pressable
            style={[styles.settingsItem, styles.settingsItemBorder]}
            onPress={() => setShowNotifications(!showNotifications)}
          >
            <View style={[styles.settingsIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="bell" size={18} color="#3B82F6" />
            </View>
            <View style={styles.settingsText}>
              <ThemedText style={styles.settingsTitle}>Notifications</ThemedText>
              <ThemedText style={styles.settingsSubtitle}>Manage alerts</ThemedText>
            </View>
            <Feather
              name={showNotifications ? "chevron-down" : "chevron-right"}
              size={20}
              color={COLORS.textMuted}
            />
          </Pressable>

          {showNotifications && Platform.OS !== "web" && (
            <View style={styles.notifPanel}>
              <View style={styles.notifRow}>
                <View style={styles.notifRowLeft}>
                  <View style={[styles.notifIcon, { backgroundColor: "#EDE9FF" }]}>
                    <Feather name="heart" size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.notifTextBlock}>
                    <ThemedText style={styles.notifTitle}>Medicine Reminders</ThemedText>
                    <ThemedText style={styles.notifSubtitle}>Daily dose alerts</ThemedText>
                  </View>
                </View>
                <Switch
                  value={medicineNotifs}
                  onValueChange={handleToggleMedicineNotifs}
                  disabled={togglingMedicine}
                  trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
                  thumbColor={medicineNotifs ? "#6C63FF" : "#9CA3AF"}
                />
              </View>

              {medicineNotifs && (
                <View style={styles.subRow}>
                  <ThemedText style={styles.subRowLabel}>First reminder at</ThemedText>
                  {Platform.OS === "android" ? (
                    <Pressable
                      style={styles.timeChip}
                      onPress={() => setShowMedicineTimePicker(true)}
                    >
                      <Feather name="clock" size={14} color="#6C63FF" />
                      <ThemedText style={styles.timeChipText}>{formatPickerTime(medicineDefaultTime)}</ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.timeChip}
                      onPress={() => setShowMedicineTimePicker(!showMedicineTimePicker)}
                    >
                      <Feather name="clock" size={14} color="#6C63FF" />
                      <ThemedText style={styles.timeChipText}>{formatPickerTime(medicineDefaultTime)}</ThemedText>
                    </Pressable>
                  )}
                </View>
              )}

              {showMedicineTimePicker && medicineNotifs && (
                <DateTimePicker
                  value={medicineDefaultTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onMedicineTimeChange}
                />
              )}

              <View style={[styles.notifRow, styles.notifRowBorder]}>
                <View style={styles.notifRowLeft}>
                  <View style={[styles.notifIcon, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="calendar" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.notifTextBlock}>
                    <ThemedText style={styles.notifTitle}>Appointment Reminders</ThemedText>
                    <ThemedText style={styles.notifSubtitle}>24h & 1h before</ThemedText>
                  </View>
                </View>
                <Switch
                  value={appointmentNotifs}
                  onValueChange={handleToggleAppointmentNotifs}
                  disabled={togglingAppointment}
                  trackColor={{ false: "#E5E7EB", true: "#BFDBFE" }}
                  thumbColor={appointmentNotifs ? "#3B82F6" : "#9CA3AF"}
                />
              </View>

              <View style={styles.notifRow}>
                <View style={styles.notifRowLeft}>
                  <View style={[styles.notifIcon, { backgroundColor: "#EFF9FF" }]}>
                    <Feather name="droplet" size={16} color="#06B6D4" />
                  </View>
                  <View style={styles.notifTextBlock}>
                    <ThemedText style={styles.notifTitle}>Water Reminders</ThemedText>
                    <ThemedText style={styles.notifSubtitle}>Nudge at 3 PM if goal unmet</ThemedText>
                  </View>
                </View>
                <Switch
                  value={waterNotifs}
                  onValueChange={handleToggleWaterNotifs}
                  disabled={togglingWater}
                  trackColor={{ false: "#E5E7EB", true: "#A5F3FC" }}
                  thumbColor={waterNotifs ? "#06B6D4" : "#9CA3AF"}
                />
              </View>
            </View>
          )}

          {showNotifications && Platform.OS === "web" && (
            <View style={styles.notifPanel}>
              <View style={styles.webNotifNote}>
                <Feather name="info" size={16} color={COLORS.textMuted} />
                <ThemedText style={styles.webNotifNoteText}>
                  Push notifications are available on the mobile app.
                </ThemedText>
              </View>
            </View>
          )}

          <Pressable style={styles.settingsItem}>
            <View style={[styles.settingsIcon, { backgroundColor: "#F5F3FF" }]}>
              <Feather name="settings" size={18} color="#6C63FF" />
            </View>
            <View style={styles.settingsText}>
              <ThemedText style={styles.settingsTitle}>Preferences</ThemedText>
              <ThemedText style={styles.settingsSubtitle}>App settings</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Health & Devices</ThemedText>
        <View style={styles.card}>
          <Pressable style={[styles.settingsItem, styles.settingsItemBorder]}>
            <View style={[styles.settingsIcon, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="watch" size={18} color="#10B981" />
            </View>
            <View style={styles.settingsText}>
              <ThemedText style={styles.settingsTitle}>Health & Devices</ThemedText>
              <ThemedText style={styles.settingsSubtitle}>Connected</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
          </Pressable>

          <Pressable style={styles.settingsItem}>
            <View style={[styles.settingsIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="phone" size={18} color="#F59E0B" />
            </View>
            <View style={styles.settingsText}>
              <ThemedText style={styles.settingsTitle}>Emergency Contact</ThemedText>
              <ThemedText style={styles.settingsSubtitle}>
                {userProfile?.name ? "Family" : "Not set"}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.logoutCard} onPress={handleLogout}>
          <View style={styles.logoutIcon}>
            <Feather name="log-out" size={18} color="#EF4444" />
          </View>
          <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.versionText}>MummyCare v1.0.0</ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: Spacing.sm,
  },
  editSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 6,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  dateInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  eddBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  eddTextWrap: {
    marginLeft: Spacing.sm,
  },
  eddLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eddValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  saveButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notifPanel: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FAFAFC",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  notifRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notifRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTextBlock: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  notifSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  subRowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EDE9FF",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C63FF",
  },
  webNotifNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  webNotifNoteText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  logoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#EF4444",
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
