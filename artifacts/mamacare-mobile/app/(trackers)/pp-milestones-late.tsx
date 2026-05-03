import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_milestones_late";

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

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY).then((v) => { if (v) setChecked(JSON.parse(v)); });
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
          return (
            <View key={group.month} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <View style={styles.monthBadge}>
                  <ThemedText style={styles.monthBadgeText}>{group.label}</ThemedText>
                </View>
                <ThemedText style={styles.monthProgress}>{groupDone}/{group.milestones.length} done</ThemedText>
              </View>
              {group.milestones.map((ms) => (
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
  monthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  monthBadge: {
    backgroundColor: "#FDF4FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  monthBadgeText: { fontSize: 13, fontWeight: "700", color: "#A855F7" },
  monthProgress: { fontSize: 12, color: COLORS.textMuted },
  milestoneRow: {
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#A855F7", borderColor: "#A855F7" },
  milestoneText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  milestoneDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
});
