import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp } from "@/context/AppContext";
import { getWeightLogs, saveWeightLog, WeightLog } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

export default function WeightTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedWeek } = useApp();

  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    try {
      const data = await getWeightLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load weight logs:", error);
    }
  };

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight value.");
      return;
    }

    setIsLoading(true);
    try {
      await saveWeightLog(weightNum, unit, selectedWeek);
      setWeight("");
      setShowAddModal(false);
      await loadLogs();
    } catch (error) {
      Alert.alert("Error", "Failed to save weight.");
    } finally {
      setIsLoading(false);
    }
  };

  const getWeightChange = () => {
    if (logs.length < 2) return null;
    const change = logs[0].weight - logs[1].weight;
    return change;
  };

  const weightChange = getWeightChange();
  const currentWeight = logs.length > 0 ? logs[0].weight : 72.4;
  const currentUnit = logs.length > 0 ? logs[0].unit : "kg";

  const getChartData = () => {
    const chartWeeks = 5;
    const data = [];
    const baseWeek = selectedWeek;

    for (let i = chartWeeks - 1; i >= 0; i--) {
      const weekNum = baseWeek - i;
      const weekLog = logs.find(l => l.week === weekNum);
      if (weekLog) {
        data.push({
          week: i === 0 ? "Now" : `W${weekNum}`,
          weight: weekLog.weight,
          hasData: true,
          isNow: i === 0,
        });
      } else {
        data.push({
          week: i === 0 ? "Now" : `W${weekNum}`,
          weight: null,
          hasData: false,
          isNow: i === 0,
        });
      }
    }
    return data;
  };

  const chartData = getChartData();
  const dataWeights = chartData.filter(d => d.weight != null).map(d => d.weight as number);
  const maxWeight = dataWeights.length > 0 ? Math.max(...dataWeights) : 100;

  const formatLogDate = (dateStr: string, index: number) => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return {
        primary: "Today, 8:00 AM",
        secondary: "Home Scale",
      };
    }

    return {
      primary: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      secondary: "Home Scale",
    };
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Weight Tracker</ThemedText>
        <Pressable style={styles.moreButton}>
          <Feather name="more-horizontal" size={24} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentWeightSection}>
          <ThemedText style={styles.currentLabel}>Current Weight</ThemedText>
          <View style={styles.weightValueRow}>
            <ThemedText style={styles.weightValue}>{currentWeight.toFixed(1)}</ThemedText>
            <ThemedText style={styles.weightUnit}>{currentUnit}</ThemedText>
          </View>
          <View style={styles.changeIndicator}>
            <Feather
              name={weightChange && weightChange >= 0 ? "trending-up" : "trending-down"}
              size={14}
              color="#10B981"
            />
            <ThemedText style={styles.changeText}>
              {weightChange ? `${weightChange >= 0 ? "+" : ""}${weightChange.toFixed(1)}kg this week` : "+0.8kg this week"} (Healthy)
            </ThemedText>
          </View>
        </View>

        <View style={styles.chartSection}>
          {dataWeights.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather name="bar-chart-2" size={32} color={COLORS.textMuted} />
              <ThemedText style={styles.emptyChartText}>Log weight to see your trend</ThemedText>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              {chartData.map((item, index) => (
                <View key={index} style={styles.barColumn}>
                  <View style={styles.barWrapper}>
                    {item.isNow && item.weight != null && (
                      <View style={styles.barLabel}>
                        <ThemedText style={styles.barLabelText}>{item.weight.toFixed(1)}</ThemedText>
                      </View>
                    )}
                    {item.weight != null ? (
                      <View
                        style={[
                          styles.bar,
                          {
                            height: (item.weight / maxWeight) * 120,
                            backgroundColor: item.isNow ? "#6C63FF" : "#E0E7FF",
                          }
                        ]}
                      />
                    ) : (
                      <View style={[styles.bar, { height: 4, backgroundColor: "#F3F4F6" }]} />
                    )}
                  </View>
                  <ThemedText style={[
                    styles.barWeekLabel,
                    item.isNow && styles.barWeekLabelActive
                  ]}>
                    {item.week}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.logsSection}>
          <ThemedText style={styles.sectionTitle}>Recent Logs</ThemedText>

          {logs.length === 0 ? (
            <View style={styles.emptyLogs}>
              <Feather name="activity" size={24} color={COLORS.textMuted} />
              <ThemedText style={styles.emptyText}>No weight logs yet</ThemedText>
            </View>
          ) : (
            logs.slice(0, 5).map((log, index) => {
              const dateInfo = formatLogDate(log.date, index);
              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logIcon}>
                    <Feather name="activity" size={18} color="#6C63FF" />
                  </View>
                  <View style={styles.logDetails}>
                    <ThemedText style={styles.logDate}>{dateInfo.primary}</ThemedText>
                    <ThemedText style={styles.logSource}>{dateInfo.secondary}</ThemedText>
                  </View>
                  <ThemedText style={styles.logWeight}>{log.weight} {log.unit}</ThemedText>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomButton, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Log Weight</ThemedText>
        </Pressable>
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Log Weight</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={COLORS.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.inputSection}>
              <ThemedText style={styles.inputLabel}>Enter Weight</ThemedText>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitToggle}>
                  <Pressable
                    style={[styles.unitButton, unit === "kg" && styles.unitButtonActive]}
                    onPress={() => setUnit("kg")}
                  >
                    <ThemedText style={[styles.unitText, unit === "kg" && styles.unitTextActive]}>
                      kg
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.unitButton, unit === "lb" && styles.unitButtonActive]}
                    onPress={() => setUnit("lb")}
                  >
                    <ThemedText style={[styles.unitText, unit === "lb" && styles.unitTextActive]}>
                      lb
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.saveButton, (!weight || isLoading) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!weight || isLoading}
            >
              <ThemedText style={styles.saveButtonText}>
                {isLoading ? "Saving..." : "Save Weight"}
              </ThemedText>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  currentWeightSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  currentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  weightValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  weightValue: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "500",
  },
  chartSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 130,
  },
  barLabel: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  barLabelText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bar: {
    width: 32,
    borderRadius: 8,
  },
  barWeekLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: Spacing.xs,
  },
  barWeekLabelActive: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    marginBottom: Spacing.xl,
  },
  emptyChartText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: Spacing.sm,
  },
  logsSection: {
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyLogs: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: Spacing.sm,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  logDetails: {
    flex: 1,
  },
  logDate: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  logSource: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logWeight: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: "#FFFFFF",
  },
  addButton: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
  },
  modalScrollContent: {
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: Spacing.lg,
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  unitButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
  },
  unitButtonActive: {
    backgroundColor: "#6C63FF",
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  unitTextActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
