import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { getBabyStats, getWeekData } from "@/data/pregnancyData";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

type ViewMode = "Weeks" | "Months" | "Trimesters";

function getDaysUntilDue(eddDate: string | null | undefined): number | null {
  if (!eddDate) return null;
  const edd = new Date(eddDate);
  const today = new Date();
  const diffTime = edd.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function WeeklyScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { selectedWeek, updateSelectedWeek, userProfile } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>("Weeks");

  const babyStats = getBabyStats(selectedWeek);
  const weekData = getWeekData(selectedWeek);

  const remainingWeeks = 40 - selectedWeek;
  const completedWeeks = selectedWeek;
  const daysUntilDue = getDaysUntilDue(userProfile?.eddDate);
  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;

  const getSliderConfig = () => {
    switch (viewMode) {
      case "Weeks":
        return {
          min: 1,
          max: 40,
          step: 1,
          labels: ["1W", "10W", "20W", "30W", "40W"],
          value: selectedWeek,
          displayValue: `Week ${selectedWeek}`,
          onChange: (val: number) => updateSelectedWeek(Math.round(val)),
        };
      case "Months":
        const currentMonthPreg = Math.ceil(selectedWeek / 4.43);
        return {
          min: 1,
          max: 9,
          step: 1,
          labels: ["M1", "M3", "M5", "M7", "M9"],
          value: Math.min(9, currentMonthPreg),
          displayValue: `Month ${Math.min(9, currentMonthPreg)}`,
          onChange: (val: number) => {
            const weekFromMonth = Math.round((val - 1) * 4.43) + 1;
            updateSelectedWeek(Math.min(40, Math.max(1, weekFromMonth)));
          },
        };
      case "Trimesters":
        return {
          min: 1,
          max: 3,
          step: 1,
          labels: ["T1", "T2", "T3"],
          value: trimester,
          displayValue: `Trimester ${trimester}`,
          onChange: (val: number) => {
            const weekFromTrimester = val === 1 ? 7 : val === 2 ? 20 : 34;
            updateSelectedWeek(weekFromTrimester);
          },
        };
    }
  };

  const sliderConfig = getSliderConfig();

  const getSymptomStatus = (symptom: string) => {
    if (trimester === 1) {
      if (symptom === "Fatigue") return "Moderate";
      if (symptom === "Back Pain") return "Normal";
    } else if (trimester === 2) {
      return "Normal";
    } else {
      if (symptom === "Back Pain") return "Moderate";
      if (symptom === "Fatigue") return "Mild";
    }
    return "Normal";
  };

  const getSymptomColor = (status: string) => {
    if (status === "Moderate") return "#FEF3C7";
    if (status === "Mild") return "#E9D5FF";
    return "#FFFFFF";
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "#FFFFFF" }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <ThemedText type="h2" style={{ color: COLORS.textPrimary }}>
            Pregnancy
          </ThemedText>
          <ThemedText type="h2" style={{ color: COLORS.textPrimary }}>
            Journey
          </ThemedText>
        </View>
        <ThemedText type="h3" style={{ color: theme.primary }}>
          {sliderConfig.displayValue}
        </ThemedText>
      </View>

      <View style={styles.viewModeContainer}>
        {(["Weeks", "Months", "Trimesters"] as ViewMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.viewModeButton,
              viewMode === mode && { backgroundColor: theme.primary },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <ThemedText
              type="small"
              style={{ color: viewMode === mode ? "#FFFFFF" : COLORS.textMuted }}
            >
              {mode}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Card style={styles.sliderCard}>
        <Slider
          style={styles.slider}
          minimumValue={sliderConfig.min}
          maximumValue={sliderConfig.max}
          step={sliderConfig.step}
          value={sliderConfig.value}
          onValueChange={sliderConfig.onChange}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={theme.primary}
        />
        <View style={styles.sliderLabels}>
          {sliderConfig.labels.map((label, index) => (
            <ThemedText key={index} type="small" style={{ color: COLORS.textMuted }}>
              {label}
            </ThemedText>
          ))}
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statBox}>
          <ThemedText type="h3" style={{ color: COLORS.textPrimary }}>
            {babyStats.weight}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Weight
          </ThemedText>
        </Card>
        <Card style={styles.statBox}>
          <ThemedText type="h3" style={{ color: COLORS.textPrimary }}>
            {babyStats.length}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Length
          </ThemedText>
        </Card>
        <Card style={styles.statBox}>
          <ThemedText type="h3" style={{ color: COLORS.textPrimary }}>
            {selectedWeek}th
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Current Week
          </ThemedText>
        </Card>
      </View>

      <View style={styles.babyImageContainer}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.babyImage}
          contentFit="contain"
        />
      </View>

      <View style={styles.weeksRow}>
        <Card style={styles.weekCard}>
          <View style={[styles.weekIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="clock" size={20} color={COLORS.textMuted} />
          </View>
          <ThemedText type="h1" style={{ color: COLORS.textPrimary }}>
            {remainingWeeks.toString().padStart(2, "0")}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Remaining Weeks
          </ThemedText>
        </Card>
        <Card style={styles.weekCard}>
          <View style={[styles.weekIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="calendar" size={20} color={COLORS.textMuted} />
          </View>
          <ThemedText type="h1" style={{ color: COLORS.textPrimary }}>
            {completedWeeks.toString().padStart(2, "0")}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            Completed Weeks
          </ThemedText>
        </Card>
      </View>

      <View style={styles.symptomsRow}>
        <Card style={[styles.symptomCard, { backgroundColor: getSymptomColor(getSymptomStatus("Back Pain")) }]}>
          <View style={[styles.symptomIcon, { backgroundColor: "#FFFFFF" }]}>
            <Feather name="x-circle" size={18} color={theme.primary} />
          </View>
          <ThemedText type="body" style={{ color: COLORS.textPrimary, fontWeight: "600" }}>
            {getSymptomStatus("Back Pain")}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
            Back Pain
          </ThemedText>
        </Card>
        <Card style={[styles.symptomCard, { backgroundColor: getSymptomColor(getSymptomStatus("Fatigue")) }]}>
          <View style={[styles.symptomIcon, { backgroundColor: theme.primaryLight }]}>
            <Feather name="zap" size={18} color={theme.primary} />
          </View>
          <ThemedText type="body" style={{ color: COLORS.textPrimary, fontWeight: "600" }}>
            {getSymptomStatus("Fatigue")}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
            Fatigue
          </ThemedText>
        </Card>
      </View>

      <Card style={styles.tipsCard}>
        <ThemedText type="h4" style={{ color: COLORS.textPrimary, marginBottom: Spacing.md }}>
          Week {selectedWeek} Highlights
        </ThemedText>
        <View style={styles.tipItem}>
          <View style={[styles.tipDot, { backgroundColor: theme.primary }]} />
          <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
            Baby is now the size of {weekData?.babySize || "growing"}
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <View style={[styles.tipDot, { backgroundColor: theme.secondary }]} />
          <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
            Weight: {babyStats.weight}, Length: {babyStats.length}
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <View style={[styles.tipDot, { backgroundColor: "#16A34A" }]} />
          <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
            {daysUntilDue !== null
              ? `${daysUntilDue} days until your due date`
              : `${remainingWeeks} weeks until your due date`}
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <View style={[styles.tipDot, { backgroundColor: "#6366F1" }]} />
          <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
            Trimester {trimester} - {trimester === 1 ? "Foundation phase" : trimester === 2 ? "Growth phase" : "Final stretch"}
          </ThemedText>
        </View>
      </Card>

      {weekData?.babyDevelopment && weekData.babyDevelopment.length > 0 ? (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="star" size={18} color="#2563EB" />
            </View>
            <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
              Baby Development
            </ThemedText>
          </View>
          {weekData.babyDevelopment.slice(0, 4).map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={[styles.bulletPoint, { backgroundColor: "#2563EB" }]} />
              <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
                {item}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.dosRow}>
        {weekData?.dos && weekData.dos.length > 0 ? (
          <Card style={[styles.dosCard, { backgroundColor: "#DCFCE7" }]}>
            <View style={styles.dosHeader}>
              <Feather name="check-circle" size={20} color="#16A34A" />
              <ThemedText type="body" style={{ color: "#16A34A", fontWeight: "600", marginLeft: Spacing.sm }}>
                Do's
              </ThemedText>
            </View>
            {weekData.dos.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.dosItem}>
                <View style={[styles.smallDot, { backgroundColor: "#16A34A" }]} />
                <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
                  {item}
                </ThemedText>
              </View>
            ))}
          </Card>
        ) : null}

        {weekData?.donts && weekData.donts.length > 0 ? (
          <Card style={[styles.dosCard, { backgroundColor: "#FEE2E2" }]}>
            <View style={styles.dosHeader}>
              <Feather name="x-circle" size={20} color="#DC2626" />
              <ThemedText type="body" style={{ color: "#DC2626", fontWeight: "600", marginLeft: Spacing.sm }}>
                Don'ts
              </ThemedText>
            </View>
            {weekData.donts.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.dosItem}>
                <View style={[styles.smallDot, { backgroundColor: "#DC2626" }]} />
                <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
                  {item}
                </ThemedText>
              </View>
            ))}
          </Card>
        ) : null}
      </View>

      {weekData?.motherSymptoms && weekData.motherSymptoms.length > 0 ? (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: "#F3E8FF" }]}>
              <Feather name="heart" size={18} color={theme.primary} />
            </View>
            <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
              Common Symptoms This Week
            </ThemedText>
          </View>
          {weekData.motherSymptoms.slice(0, 4).map((symptom, index) => (
            <View key={index} style={styles.listItem}>
              <View style={[styles.bulletPoint, { backgroundColor: theme.primary }]} />
              <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>
                {symptom}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  viewModeContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  sliderCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    alignItems: "flex-start",
  },
  babyImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    marginBottom: Spacing.xl,
  },
  babyImage: {
    width: 180,
    height: 180,
  },
  weeksRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  weekCard: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: "flex-start",
  },
  weekIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  symptomsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  symptomCard: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: "flex-start",
  },
  symptomIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  tipsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  sectionCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
    marginTop: 6,
  },
  dosRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dosCard: {
    flex: 1,
    padding: Spacing.md,
  },
  dosHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  dosItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  smallDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: Spacing.sm,
    marginTop: 5,
  },
});
