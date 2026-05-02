import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { getBPLogs, saveBPLog, BPLog } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

function getBPStatus(systolic: number, diastolic: number): { label: string; color: string } {
  if (systolic < 90 || diastolic < 60) {
    return { label: "Low", color: "#2563EB" };
  } else if (systolic < 120 && diastolic < 80) {
    return { label: "Normal", color: COLORS.success };
  } else if (systolic < 130 && diastolic < 85) {
    return { label: "Elevated", color: "#F59E0B" };
  } else if (systolic < 140 || diastolic < 90) {
    return { label: "High (Stage 1)", color: "#F97316" };
  } else {
    return { label: "High (Stage 2)", color: "#DC2626" };
  }
}

export default function BPTrackerScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [logs, setLogs] = useState<BPLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    try {
      const data = await getBPLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load BP logs:", error);
    }
  };

  const handleSave = async () => {
    const sysNum = parseInt(systolic);
    const diaNum = parseInt(diastolic);
    const pulseNum = pulse ? parseInt(pulse) : undefined;

    if (isNaN(sysNum) || sysNum <= 0 || isNaN(diaNum) || diaNum <= 0) {
      Alert.alert("Invalid Input", "Please enter valid blood pressure values.");
      return;
    }

    setIsLoading(true);
    try {
      await saveBPLog(sysNum, diaNum, pulseNum);
      setSystolic("");
      setDiastolic("");
      setPulse("");
      await loadLogs();
    } catch (error) {
      Alert.alert("Error", "Failed to save blood pressure.");
    } finally {
      setIsLoading(false);
    }
  };

  const latestBP = logs.length > 0 ? logs[0] : null;
  const bpStatus = latestBP ? getBPStatus(latestBP.systolic, latestBP.diastolic) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "#FFFFFF" }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.inputCard}>
        <ThemedText type="h4" style={{ color: COLORS.textPrimary, marginBottom: Spacing.lg }}>
          Log Blood Pressure
        </ThemedText>

        <View style={styles.bpInputRow}>
          <View style={styles.bpInputGroup}>
            <ThemedText type="small" style={{ color: COLORS.textMuted, marginBottom: Spacing.xs }}>
              Systolic (top)
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
              value={systolic}
              onChangeText={setSystolic}
              placeholder="120"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
          </View>
          <ThemedText type="h2" style={{ color: COLORS.textMuted, marginHorizontal: Spacing.sm }}>
            /
          </ThemedText>
          <View style={styles.bpInputGroup}>
            <ThemedText type="small" style={{ color: COLORS.textMuted, marginBottom: Spacing.xs }}>
              Diastolic (bottom)
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
              value={diastolic}
              onChangeText={setDiastolic}
              placeholder="80"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.pulseRow}>
          <ThemedText type="small" style={{ color: COLORS.textMuted, marginBottom: Spacing.xs }}>
            Pulse (optional)
          </ThemedText>
          <TextInput
            style={[styles.input, styles.pulseInput, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
            value={pulse}
            onChangeText={setPulse}
            placeholder="72 bpm"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
          />
        </View>

        <Button
          onPress={handleSave}
          disabled={isLoading || !systolic || !diastolic}
        >
          {isLoading ? "Saving..." : "Save Reading"}
        </Button>
      </Card>

      {latestBP ? (
        <Card style={[styles.summaryCard, { backgroundColor: "#FEE2E2" }]}>
          <View style={styles.summaryContent}>
            <View style={styles.bpDisplay}>
              <Feather name="heart" size={28} color="#DC2626" />
              <ThemedText type="h1" style={{ color: COLORS.textPrimary, marginLeft: Spacing.md }}>
                {latestBP.systolic}/{latestBP.diastolic}
              </ThemedText>
              <ThemedText type="body" style={{ color: COLORS.textMuted, marginLeft: Spacing.sm }}>
                mmHg
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: bpStatus?.color }]}>
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {bpStatus?.label}
              </ThemedText>
            </View>
            {latestBP.pulse ? (
              <ThemedText type="body" style={{ color: COLORS.textSecondary, marginTop: Spacing.sm }}>
                Pulse: {latestBP.pulse} bpm
              </ThemedText>
            ) : null}
          </View>
        </Card>
      ) : null}

      <ThemedText type="h4" style={{ color: COLORS.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        BP History
      </ThemedText>

      {logs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Feather name="heart" size={40} color={COLORS.textMuted} />
          <ThemedText type="body" style={{ color: COLORS.textMuted, marginTop: Spacing.md }}>
            No BP readings yet
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Add your first reading above
          </ThemedText>
        </Card>
      ) : (
        logs.map((log) => {
          const status = getBPStatus(log.systolic, log.diastolic);
          return (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logContent}>
                <View style={[styles.logIcon, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="heart" size={20} color="#DC2626" />
                </View>
                <View style={styles.logText}>
                  <ThemedText type="body" style={{ color: COLORS.textPrimary, fontWeight: "600" }}>
                    {log.systolic}/{log.diastolic} mmHg
                  </ThemedText>
                  <ThemedText type="small" style={{ color: COLORS.textMuted }}>
                    {new Date(log.date).toLocaleDateString()} - {status.label}
                  </ThemedText>
                </View>
                {log.pulse ? (
                  <ThemedText type="small" style={{ color: COLORS.textMuted }}>
                    {log.pulse} bpm
                  </ThemedText>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  bpInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Spacing.lg,
  },
  bpInputGroup: {
    flex: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    textAlign: "center",
  },
  pulseRow: {
    marginBottom: Spacing.lg,
  },
  pulseInput: {
    width: "50%",
  },
  summaryCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  summaryContent: {
    alignItems: "center",
  },
  bpDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  emptyCard: {
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  logCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  logContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  logText: {
    flex: 1,
  },
});
