import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";
import {
  getAppointments,
  getMedicines,
  getTodayMedicineStats,
  getApiBase,
  Appointment,
  Medicine,
} from "@/utils/careStorage";

const PROVIDER_COLORS = ["#F5F3FF", "#FCE7F3", "#ECFDF5", "#EFF6FF", "#FEF3C7"];
const PROVIDER_TEXT_COLORS = ["#6C63FF", "#EC4899", "#10B981", "#3B82F6", "#F59E0B"];

interface Provider {
  id: number;
  name: string;
  role: string;
}

export default function CareScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineStats, setMedicineStats] = useState({ total: 0, taken: 0, pending: 0 });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [appointments, meds, stats] = await Promise.all([
        getAppointments(),
        getMedicines(),
        getTodayMedicineStats(),
      ]);

      const upcoming = appointments
        .filter(a => new Date(a.dateTime) > new Date())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
      setNextAppointment(upcoming || null);
      setMedicines(meds.slice(0, 3));
      setMedicineStats(stats);
    } catch (error) {
      console.error("Failed to load care data:", error);
    }

    try {
      const res = await fetch(`${getApiBase()}/api/mobile/providers`);
      if (res.ok) {
        const data: Provider[] = await res.json();
        setProviders(data);
      }
    } catch {
    } finally {
      setLoadingProviders(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const formatAppointmentDate = (dateTime: string) => {
    const date = new Date(dateTime);
    const endTime = new Date(date.getTime() + 30 * 60000);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      startTime: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      endTime: endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["2xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Care Plan</ThemedText>
          <ThemedText style={styles.subtitle}>Manage appointments & team</ThemedText>
        </View>

        <Pressable
          style={styles.postpartumCard}
          onPress={() => router.push("/(postpartum)")}
        >
          <View style={styles.postpartumLeft}>
            <View style={styles.postpartumIconWrap}>
              <ThemedText style={styles.postpartumEmoji}>🌸</ThemedText>
            </View>
            <View style={styles.postpartumText}>
              <ThemedText style={styles.postpartumTitle}>Postpartum Care Hub</ThemedText>
              <ThemedText style={styles.postpartumSub}>Recovery, milestones & baby vaccines</ThemedText>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#DB2777" />
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Next Appointment</ThemedText>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push("/(trackers)/appointments")}
            >
              <Feather name="plus" size={14} color="#6C63FF" />
              <ThemedText style={styles.addButtonText}>New</ThemedText>
            </Pressable>
          </View>

          {nextAppointment ? (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentTop}>
                <View style={styles.appointmentDateBadge}>
                  <ThemedText style={styles.appointmentDay}>
                    {formatAppointmentDate(nextAppointment.dateTime).day}
                  </ThemedText>
                  <ThemedText style={styles.appointmentMonth}>
                    {formatAppointmentDate(nextAppointment.dateTime).month}
                  </ThemedText>
                </View>
                <View style={styles.appointmentDetails}>
                  <ThemedText style={styles.appointmentTitle}>
                    Routine Checkup
                  </ThemedText>
                  <ThemedText style={styles.appointmentDoctor}>
                    {nextAppointment.doctorName} · OBGYN
                  </ThemedText>
                  <View style={styles.appointmentTimeRow}>
                    <Feather name="clock" size={12} color={COLORS.textMuted} />
                    <ThemedText style={styles.appointmentTime}>
                      {formatAppointmentDate(nextAppointment.dateTime).startTime} - {formatAppointmentDate(nextAppointment.dateTime).endTime}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <View style={styles.appointmentButtons}>
                <Pressable style={styles.rescheduleButton}>
                  <ThemedText style={styles.rescheduleButtonText}>Reschedule</ThemedText>
                </Pressable>
                <Pressable style={styles.detailsButton}>
                  <ThemedText style={styles.detailsButtonText}>Details</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Feather name="calendar" size={24} color={COLORS.textMuted} />
              <ThemedText style={styles.emptyText}>No upcoming appointments</ThemedText>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/(trackers)/appointments")}
              >
                <ThemedText style={styles.emptyButtonText}>Add Appointment</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>My Care Team</ThemedText>
          {loadingProviders ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: Spacing.md }} />
          ) : providers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="users" size={24} color={COLORS.textMuted} />
              <ThemedText style={styles.emptyText}>No providers assigned yet</ThemedText>
            </View>
          ) : (
            <View style={styles.careTeamRow}>
              {providers.slice(0, 4).map((provider, idx) => (
                <View key={provider.id} style={styles.careTeamMember}>
                  <View style={[styles.careTeamAvatar, { backgroundColor: PROVIDER_COLORS[idx % PROVIDER_COLORS.length] }]}>
                    <ThemedText style={[styles.careTeamInitials, { color: PROVIDER_TEXT_COLORS[idx % PROVIDER_TEXT_COLORS.length] }]}>
                      {getInitials(provider.name)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.careTeamName} numberOfLines={1}>
                    {provider.name.split(" ").slice(-1)[0]}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Daily Intake</ThemedText>
            <Pressable onPress={() => router.push("/(trackers)/medicines")}>
              <ThemedText style={styles.viewAllText}>View All</ThemedText>
            </Pressable>
          </View>

          {medicines.length > 0 ? (
            medicines.map((medicine, index) => (
              <View key={medicine.id} style={styles.medicineCard}>
                <View style={styles.medicineIcon}>
                  <Feather name="circle" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.medicineDetails}>
                  <ThemedText style={styles.medicineName}>{medicine.name}</ThemedText>
                  <ThemedText style={styles.medicineDosage}>
                    {medicine.dosage} · {medicine.frequency}
                  </ThemedText>
                </View>
                <View style={[
                  styles.medicineStatus,
                  { backgroundColor: index === 1 ? "#DCFCE7" : "#F3F4F6" }
                ]}>
                  <ThemedText style={[
                    styles.medicineStatusText,
                    { color: index === 1 ? "#16A34A" : "#6B7280" }
                  ]}>
                    {index === 1 ? "Taken" : "Pending"}
                  </ThemedText>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Feather name="heart" size={24} color={COLORS.textMuted} />
              <ThemedText style={styles.emptyText}>No medicines added</ThemedText>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/(trackers)/medicines")}
              >
                <ThemedText style={styles.emptyButtonText}>Add Medicine</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: "#F5F3FF",
    borderRadius: BorderRadius.full,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6C63FF",
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  appointmentTop: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  appointmentDateBadge: {
    width: 56,
    height: 56,
    backgroundColor: "#F5F3FF",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  appointmentDay: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6C63FF",
    lineHeight: 22,
  },
  appointmentMonth: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6C63FF",
    letterSpacing: 0.5,
  },
  appointmentDetails: {
    flex: 1,
    justifyContent: "center",
  },
  appointmentTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  appointmentDoctor: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  appointmentTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  appointmentButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rescheduleButton: {
    flex: 1,
    backgroundColor: "#6C63FF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailsButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "#F5F3FF",
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },
  careTeamRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.xl,
  },
  careTeamMember: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  careTeamAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addTeamMember: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  careTeamInitials: {
    fontSize: 16,
    fontWeight: "700",
  },
  careTeamName: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textPrimary,
    maxWidth: 64,
    textAlign: "center",
  },
  medicineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  medicineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  medicineDetails: {
    flex: 1,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  medicineDosage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  medicineStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  medicineStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  postpartumCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF0F6",
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#FFD6E7",
  },
  postpartumLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  postpartumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(219,39,119,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  postpartumEmoji: {
    fontSize: 22,
  },
  postpartumText: {
    flex: 1,
  },
  postpartumTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DB2777",
  },
  postpartumSub: {
    fontSize: 12,
    color: "#BE185D",
    marginTop: 2,
  },
});
