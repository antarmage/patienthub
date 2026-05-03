import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_mom_vaccines";

const VACCINES = [
  { id: "tdap", name: "Tdap", desc: "Tetanus, diphtheria & whooping cough — especially important to protect newborn before they can be vaccinated.", timing: "Immediately postpartum (if not in last 10 yrs)" },
  { id: "flu", name: "Flu (Influenza)", desc: "Annual influenza vaccine protects you and reduces transmission to your newborn.", timing: "Annually (any time of year)" },
  { id: "mmr", name: "MMR", desc: "Measles, mumps & rubella — recommended if not immune. Safe while breastfeeding.", timing: "Postpartum, if non-immune" },
  { id: "covid", name: "COVID-19 Booster", desc: "Stay up-to-date with COVID-19 boosters to protect yourself and your baby.", timing: "As per current guidelines" },
  { id: "hpv", name: "HPV", desc: "Recommended if under 26 and not previously vaccinated, or 27–45 if advised by your doctor.", timing: "Postpartum if eligible" },
  { id: "hepb", name: "Hepatitis B", desc: "Complete any incomplete Hepatitis B series. Safe while breastfeeding.", timing: "Postpartum if series incomplete" },
];

export default function PostpartumVaccinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY).then((v) => {
        if (v) setChecked(JSON.parse(v));
      });
    }, [])
  );

  const toggle = async (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const done = Object.values(checked).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Postpartum Vaccines</ThemedText>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{done}/{VACCINES.length}</ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#10B981" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={styles.infoText}>
            Talk to your clinician before getting vaccinated. Most vaccines are safe while breastfeeding.
          </ThemedText>
        </View>

        {VACCINES.map((v) => (
          <Pressable key={v.id} style={styles.vaccineCard} onPress={() => toggle(v.id)}>
            <View style={[styles.checkbox, checked[v.id] && styles.checkboxDone]}>
              {checked[v.id] && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <View style={styles.vaccineText}>
              <View style={styles.vaccineRow}>
                <ThemedText style={[styles.vaccineName, checked[v.id] && styles.vaccineNameDone]}>
                  {v.name}
                </ThemedText>
              </View>
              <ThemedText style={styles.vaccineDesc}>{v.desc}</ThemedText>
              <View style={styles.timingRow}>
                <Feather name="clock" size={11} color="#10B981" />
                <ThemedText style={styles.timingText}>{v.timing}</ThemedText>
              </View>
            </View>
          </Pressable>
        ))}
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
  headerName: { flex: 1, fontSize: 17, fontWeight: "600", color: COLORS.textPrimary },
  badge: {
    backgroundColor: "#ECFDF5", borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#10B981" },
  scroll: { flex: 1 },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: "#D1FAE5",
  },
  infoText: { fontSize: 13, color: "#065F46", flex: 1, lineHeight: 19 },
  vaccineCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: Spacing.md,
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
  },
  checkboxDone: { backgroundColor: "#10B981", borderColor: "#10B981" },
  vaccineText: { flex: 1 },
  vaccineRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  vaccineName: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
  vaccineNameDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
  vaccineDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 6 },
  timingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timingText: { fontSize: 11, color: "#10B981", fontWeight: "500" },
});
