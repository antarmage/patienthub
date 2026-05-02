import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { getBabyStats, getWeekData } from "@/data/pregnancyData";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedWeek, updateSelectedWeek, userProfile } = useApp();

  const babyStats = getBabyStats(selectedWeek);
  const weekData = getWeekData(selectedWeek);
  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;
  const daysLeft = userProfile?.eddDate ? Math.max(0, Math.ceil((new Date(userProfile.eddDate).getTime() - Date.now()) / 86400000)) : (40 - selectedWeek) * 7;

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.backgroundRoot }]} contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>

      <ThemedText type="h2" style={styles.pageTitle}>Pregnancy Timeline</ThemedText>

      {/* Week selector */}
      <View style={[styles.weekSelector, Shadows.card]}>
        <Pressable onPress={() => updateSelectedWeek(Math.max(1, selectedWeek - 1))} style={styles.weekBtn}>
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
        </Pressable>
        <View style={styles.weekCenter}>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>Currently tracking</ThemedText>
          <ThemedText type="h2" style={{ color: COLORS.primary }}>Week {selectedWeek}</ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textMuted }}>
            T{trimester} · {daysLeft} days remaining
          </ThemedText>
        </View>
        <Pressable onPress={() => updateSelectedWeek(Math.min(40, selectedWeek + 1))} style={styles.weekBtn}>
          <Feather name="chevron-right" size={22} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(selectedWeek / 40) * 100}%` as any, backgroundColor: COLORS.primary }]} />
      </View>
      <View style={styles.progressLabels}>
        <ThemedText type="small" style={{ color: COLORS.textMuted }}>Week 1</ThemedText>
        <ThemedText type="small" style={{ color: COLORS.textMuted }}>Week 40</ThemedText>
      </View>

      {/* Baby stats */}
      <Card style={styles.statsCard}>
        <ThemedText type="h4" style={styles.statsTitle}>Baby is the size of a {babyStats.size}</ThemedText>
        <View style={styles.statsRow}>
          <Stat label="Weight" value={babyStats.weight} icon="activity" />
          <Stat label="Length" value={babyStats.length} icon="maximize-2" />
        </View>
      </Card>

      {/* Development */}
      {weekData && (
        <>
          <Section title="Baby's Development" items={weekData.babyDevelopment} color={COLORS.primary} icon="heart" />
          <Section title="What You May Feel" items={weekData.motherSymptoms} color="#EC4899" icon="user" />
          <Section title="Nutrition Tips" items={weekData.nutritionTips} color={COLORS.success} icon="coffee" />
          <Section title="This Week: Do" items={weekData.dos} color="#3B82F6" icon="check-circle" />
          <Section title="This Week: Avoid" items={weekData.donts} color={COLORS.error} icon="x-circle" />
        </>
      )}

      {/* Week grid */}
      <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>All Weeks</ThemedText>
      <View style={styles.weekGrid}>
        {Array.from({ length: 40 }, (_, i) => i + 1).map(w => (
          <Pressable key={w} onPress={() => updateSelectedWeek(w)} style={[styles.weekDot, { backgroundColor: w === selectedWeek ? COLORS.primary : w < selectedWeek ? COLORS.lavender : "#F0F0F3" }]}>
            <ThemedText type="small" style={{ color: w === selectedWeek ? "#FFF" : w < selectedWeek ? COLORS.primary : COLORS.textMuted, fontSize: 11, fontWeight: "600" }}>{w}</ThemedText>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={statStyles.wrap}>
      <Feather name={icon} size={16} color={COLORS.primary} />
      <ThemedText type="small" style={{ color: COLORS.textMuted }}>{label}</ThemedText>
      <ThemedText type="h4">{value}</ThemedText>
    </View>
  );
}
const statStyles = StyleSheet.create({ wrap: { flex: 1, alignItems: "center", gap: 2 } });

function Section({ title, items, color, icon }: { title: string; items: string[]; color: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <Card style={sectionStyles.card}>
      <View style={sectionStyles.header}>
        <View style={[sectionStyles.iconWrap, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <ThemedText type="h4">{title}</ThemedText>
      </View>
      {items.map((item, i) => (
        <View key={i} style={sectionStyles.item}>
          <View style={[sectionStyles.dot, { backgroundColor: color }]} />
          <ThemedText type="small" style={{ color: COLORS.textSecondary, flex: 1 }}>{item}</ThemedText>
        </View>
      ))}
    </Card>
  );
}
const sectionStyles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { marginBottom: Spacing.xl },
  weekSelector: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: BorderRadius["2xl"], marginBottom: Spacing.lg },
  weekBtn: { padding: Spacing.xl },
  weekCenter: { flex: 1, alignItems: "center" },
  progressBar: { height: 8, backgroundColor: "#F0F0F3", borderRadius: 4, marginBottom: Spacing.xs, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl },
  statsCard: { marginBottom: Spacing.md },
  statsTitle: { marginBottom: Spacing.md, textAlign: "center", color: COLORS.textSecondary },
  statsRow: { flexDirection: "row" },
  sectionTitle: { marginBottom: Spacing.md },
  weekGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs, marginBottom: Spacing.xl },
  weekDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
