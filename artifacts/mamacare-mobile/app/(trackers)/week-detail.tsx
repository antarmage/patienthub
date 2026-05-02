import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { getWeekData } from "@/data/pregnancyData";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function WeekDetailScreen() {
  const { week: weekParam } = useLocalSearchParams<{ week: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const week = parseInt(weekParam || "1", 10);
  const weekData = getWeekData(week);

  if (!weekData) {
    return (
      <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
        <ThemedText type="body">Week data not available</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "#FFFFFF" }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: theme.primaryLight },
          Shadows.card,
        ]}
      >
        <View style={[styles.heroIcon, { backgroundColor: "rgba(107,78,255,0.15)" }]}>
          <Feather
            name={weekData.babySizeIcon as keyof typeof Feather.glyphMap}
            size={48}
            color={theme.primary}
          />
        </View>
        <ThemedText type="h2" style={[styles.heroTitle, { color: COLORS.textPrimary }]}>
          Week {week}
        </ThemedText>
        <ThemedText type="h4" style={{ color: theme.primary }}>
          Baby is size of a {weekData.babySize}
        </ThemedText>
      </View>

      <Card style={[styles.sectionCard, Shadows.card]}>
        <View style={styles.sectionHeader}>
          <Feather name="heart" size={20} color={theme.secondary} />
          <ThemedText type="h4" style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>
            Your Baby This Week
          </ThemedText>
        </View>
        {weekData.babyDevelopment.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.bullet, { backgroundColor: theme.secondary }]} />
            <ThemedText type="body" style={[styles.listText, { color: COLORS.textPrimary }]}>
              {item}
            </ThemedText>
          </View>
        ))}
      </Card>

      <Card style={[styles.sectionCard, Shadows.card]}>
        <View style={styles.sectionHeader}>
          <Feather name="user" size={20} color={theme.primary} />
          <ThemedText type="h4" style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>
            Your Body
          </ThemedText>
        </View>
        {weekData.motherSymptoms.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
            <ThemedText type="body" style={[styles.listText, { color: COLORS.textPrimary }]}>
              {item}
            </ThemedText>
          </View>
        ))}
      </Card>

      <Card style={[styles.sectionCard, Shadows.card]}>
        <View style={styles.sectionHeader}>
          <Feather name="coffee" size={20} color={COLORS.success} />
          <ThemedText type="h4" style={[styles.sectionTitle, { color: COLORS.textPrimary }]}>
            Nutrition Tips
          </ThemedText>
        </View>
        {weekData.nutritionTips.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.bullet, { backgroundColor: COLORS.success }]} />
            <ThemedText type="body" style={[styles.listText, { color: COLORS.textPrimary }]}>
              {item}
            </ThemedText>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    marginBottom: Spacing.xs,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginLeft: Spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: Spacing.sm,
  },
  listText: {
    flex: 1,
    lineHeight: 24,
  },
});
