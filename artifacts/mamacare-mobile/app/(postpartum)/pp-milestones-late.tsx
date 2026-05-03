import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_milestones_late";
const BABY_DOB_KEY = "@saiviemom_pp_baby_dob";

const MONTHS = [
  {
    month: 7, label: "7 Months",
    milestones: [
      { id: "m7_1", text: "Sits steadily without support" },
      { id: "m7_2", text: "Begins to crawl or commando-crawl" },
      { id: "m7_3", text: "Picks up objects with whole hand" },
      { id: "m7_4", text: "Responds to simple words ('no', name)" },
      { id: "m7_5", text: "Enjoys playing peek-a-boo" },
    ],
  },
  {
    month: 8, label: "8 Months",
    milestones: [
      { id: "m8_1", text: "Crawling confidently" },
      { id: "m8_2", text: "Pulls to standing with support" },
      { id: "m8_3", text: "Uses pincer grasp (thumb & index finger)" },
      { id: "m8_4", text: "Imitates sounds and gestures" },
      { id: "m8_5", text: "Shows clear preferences for people" },
    ],
  },
  {
    month: 9, label: "9 Months",
    milestones: [
      { id: "m9_1", text: "Stands holding on to furniture" },
      { id: "m9_2", text: "Searches for hidden objects (object permanence)" },
      { id: "m9_3", text: "Understands 'no' and simple commands" },
      { id: "m9_4", text: "Waves bye-bye and claps hands" },
      { id: "m9_5", text: "Points at objects of interest" },
    ],
  },
  {
    month: 10, label: "10 Months",
    milestones: [
      { id: "m10_1", text: "Cruises along furniture (walks holding on)" },
      { id: "m10_2", text: "Says 'mama' or 'dada' intentionally" },
      { id: "m10_3", text: "Feeds self finger foods" },
      { id: "m10_4", text: "Imitates activities (stirring, clapping)" },
      { id: "m10_5", text: "Understands 10+ words" },
    ],
  },
  {
    month: 11, label: "11 Months",
    milestones: [
      { id: "m11_1", text: "Stands alone for a few seconds" },
      { id: "m11_2", text: "May take first steps" },
      { id: "m11_3", text: "Uses objects correctly (cup to drink)" },
      { id: "m11_4", text: "Follows simple 1-step instructions" },
      { id: "m11_5", text: "Shows affection (hugs, kisses)" },
    ],
  },
  {
    month: 12, label: "12 Months",
    milestones: [
      { id: "m12_1", text: "Walks with or without support" },
      { id: "m12_2", text: "Says 2–3 words besides mama/dada" },
      { id: "m12_3", text: "Points to pictures in a book" },
      { id: "m12_4", text: "Plays simple games with others" },
      { id: "m12_5", text: "Drinks from a sippy cup" },
      { id: "m12_6", text: "Understands 50+ words" },
    ],
  },
];

export default function PostpartumMilestonesLateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [babyMonthsOld, setBabyMonthsOld] = useState<number | null>(null);
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [storedChecked, dobStr] = await Promise.all([
          AsyncStorage.getItem(KEY),
          AsyncStorage.getItem(BABY_DOB_KEY),
        ]);
        if (storedChecked) setChecked(JSON.parse(storedChecked));
        if (dobStr) {
          const dob = new Date(dobStr);
          const now = new Date();
          const months = Math.floor(
            (now.getTime() - dob.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
          );
          setBabyMonthsOld(months);
          // Auto-expand the current month (7–12 range)
          if (months >= 6 && months <= 12) {
            setOpenMonth(Math.max(7, Math.min(12, months + 1)));
          } else {
            setOpenMonth(7);
          }
        } else {
          setOpenMonth(7);
        }
      })();
    }, [])
  );

  const toggle = async (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const allIds = MONTHS.flatMap(m => m.milestones.map(ms => ms.id));
  const done = allIds.filter(id => checked[id]).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText style={styles.headerName}>6–12 Month Milestones</ThemedText>
          {babyMonthsOld !== null && (
            <ThemedText style={styles.headerSub}>Baby is {babyMonthsOld} month{babyMonthsOld !== 1 ? "s" : ""} old</ThemedText>
          )}
        </View>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{done}/{allIds.length}</ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.noticeCard}>
          <Feather name="info" size={14} color="#A855F7" style={{ marginRight: 6 }} />
          <ThemedText style={styles.noticeText}>
            Milestones are ranges, not deadlines. Consult your paediatrician if your baby isn't meeting key milestones.
          </ThemedText>
        </View>

        {MONTHS.map((group) => {
          const groupDone = group.milestones.filter(m => checked[m.id]).length;
          const isCurrent = babyMonthsOld !== null &&
            group.month === Math.max(7, Math.min(12, babyMonthsOld + 1));
          const isOpen = openMonth === group.month;

          return (
            <View key={group.month} style={[styles.monthSection, isCurrent && styles.monthSectionCurrent]}>
              <Pressable
                style={styles.monthHeader}
                onPress={() => setOpenMonth(isOpen ? null : group.month)}
              >
                <View style={styles.monthHeaderLeft}>
                  <View style={[styles.monthBadge, isCurrent && styles.monthBadgeCurrent]}>
                    <ThemedText style={[styles.monthBadgeText, isCurrent && styles.monthBadgeTextCurrent]}>
                      {group.label}
                    </ThemedText>
                  </View>
                  {isCurrent && (
                    <View style={styles.currentTag}>
                      <ThemedText style={styles.currentTagText}>Baby is here</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.monthHeaderRight}>
                  <ThemedText style={styles.monthProgress}>{groupDone}/{group.milestones.length}</ThemedText>
                  <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                </View>
              </Pressable>

              {isOpen && group.milestones.map((ms) => (
                <Pressable key={ms.id} style={styles.milestoneRow} onPress={() => toggle(ms.id)}>
                  <View style={[styles.checkbox, checked[ms.id] && styles.checkboxDone]}>
                    {checked[ms.id] && <Feather name="check" size={13} color="#FFFFFF" />}
                  </View>
                  <ThemedText style={[styles.milestoneText, checked[ms.id] && styles.milestoneDone]}>
                    {ms.text}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFC" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm, marginLeft: -Spacing.sm },
  headerTitle: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: "600", color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  badge: {
    backgroundColor: "#FDF4FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#A855F7" },
  scroll: { flex: 1 },
  noticeCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FDF4FF", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  noticeText: { fontSize: 13, color: "#A855F7", flex: 1, lineHeight: 18 },
  monthSection: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: "#F3F4F6",
  },
  monthSectionCurrent: {
    borderColor: "#E9D5FF",
    shadowColor: "#A855F7", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  monthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  monthHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  monthHeaderRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  monthBadge: {
    backgroundColor: "#FDF4FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  monthBadgeCurrent: { backgroundColor: "#A855F7" },
  monthBadgeText: { fontSize: 13, fontWeight: "700", color: "#A855F7" },
  monthBadgeTextCurrent: { color: "#FFFFFF" },
  currentTag: {
    backgroundColor: "#ECFDF5", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  currentTagText: { fontSize: 11, fontWeight: "700", color: "#10B981" },
  monthProgress: { fontSize: 12, color: COLORS.textMuted },
  milestoneRow: {
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: "#F9FAFB",
    marginTop: Spacing.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  milestoneText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  milestoneDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
});
