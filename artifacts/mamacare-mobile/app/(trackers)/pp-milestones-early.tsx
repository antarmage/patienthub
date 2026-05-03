import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_milestones_early";

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
          <ThemedText style={styles.headerName}>0–6 Month Milestones</ThemedText>
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
  monthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  monthBadge: {
    backgroundColor: "#F5F3FF", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  monthBadgeText: { fontSize: 13, fontWeight: "700", color: "#6C63FF" },
  monthProgress: { fontSize: 12, color: COLORS.textMuted },
  milestoneRow: {
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  milestoneText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  milestoneDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
});
