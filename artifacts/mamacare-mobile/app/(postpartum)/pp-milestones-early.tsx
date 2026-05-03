import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_milestones_early";
const BABY_DOB_KEY = "@saiviemom_pp_baby_dob";

const MONTHS = [
  {
    month: 1, label: "1 Month",
    milestones: [
      { id: "m1_1", text: "Lifts head briefly when on tummy" },
      { id: "m1_2", text: "Focuses on faces within 20–30 cm" },
      { id: "m1_3", text: "Responds to sound by startling or blinking" },
      { id: "m1_4", text: "Makes small throaty sounds" },
      { id: "m1_5", text: "Brings hands to face" },
    ],
  },
  {
    month: 2, label: "2 Months",
    milestones: [
      { id: "m2_1", text: "Holds head up for short periods" },
      { id: "m2_2", text: "Begins to smile socially" },
      { id: "m2_3", text: "Follows objects with eyes" },
      { id: "m2_4", text: "Coos and makes vowel sounds" },
      { id: "m2_5", text: "Can self-soothe briefly (e.g. sucking hand)" },
    ],
  },
  {
    month: 3, label: "3 Months",
    milestones: [
      { id: "m3_1", text: "Holds head steady when supported upright" },
      { id: "m3_2", text: "Laughs and squeals with delight" },
      { id: "m3_3", text: "Recognises familiar faces and voices" },
      { id: "m3_4", text: "Bats at dangling objects" },
      { id: "m3_5", text: "Pushes down on legs when feet on firm surface" },
    ],
  },
  {
    month: 4, label: "4 Months",
    milestones: [
      { id: "m4_1", text: "Holds head steady without support" },
      { id: "m4_2", text: "Rolls from tummy to back" },
      { id: "m4_3", text: "Reaches for objects with both hands" },
      { id: "m4_4", text: "Babbles with expression" },
      { id: "m4_5", text: "Sits with support" },
    ],
  },
  {
    month: 5, label: "5 Months",
    milestones: [
      { id: "m5_1", text: "Rolls both ways (tummy to back and back to tummy)" },
      { id: "m5_2", text: "Transfers objects between hands" },
      { id: "m5_3", text: "Puts objects in mouth" },
      { id: "m5_4", text: "Recognises own name" },
      { id: "m5_5", text: "Blows bubbles and raspberries" },
    ],
  },
  {
    month: 6, label: "6 Months",
    milestones: [
      { id: "m6_1", text: "Sits independently (briefly)" },
      { id: "m6_2", text: "Ready for first solid foods" },
      { id: "m6_3", text: "Passes objects between hands smoothly" },
      { id: "m6_4", text: "Responds to own name consistently" },
      { id: "m6_5", text: "Babbles consonant sounds (ma, ba, da)" },
      { id: "m6_6", text: "Stranger anxiety may begin" },
    ],
  },
];

export default function PostpartumMilestonesEarlyScreen() {
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
          // Auto-expand the current month (1-indexed, clamped to 1–6)
          const current = Math.max(1, Math.min(6, months + 1));
          setOpenMonth(current);
        } else {
          setOpenMonth(1);
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
          <ThemedText style={styles.headerName}>0–6 Month Milestones</ThemedText>
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
          <Feather name="info" size={14} color="#6C63FF" style={{ marginRight: 6 }} />
          <ThemedText style={styles.noticeText}>
            All babies develop at their own pace. These are general guidelines. Talk to your doctor if you have concerns.
          </ThemedText>
        </View>

        {MONTHS.map((group) => {
          const groupDone = group.milestones.filter(m => checked[m.id]).length;
          const isCurrent = babyMonthsOld !== null &&
            (group.month === Math.max(1, Math.min(6, babyMonthsOld + 1)));
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
    backgroundColor: "#F5F3FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#6C63FF" },
  scroll: { flex: 1 },
  noticeCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#F5F3FF", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  noticeText: { fontSize: 13, color: "#6C63FF", flex: 1, lineHeight: 18 },
  monthSection: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: "#F3F4F6",
  },
  monthSectionCurrent: {
    borderColor: "#C4B5FD",
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  monthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  monthHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  monthHeaderRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  monthBadge: {
    backgroundColor: "#F5F3FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  monthBadgeCurrent: { backgroundColor: "#6C63FF" },
  monthBadgeText: { fontSize: 13, fontWeight: "700", color: "#6C63FF" },
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
  checkboxDone: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  milestoneText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  milestoneDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
});
