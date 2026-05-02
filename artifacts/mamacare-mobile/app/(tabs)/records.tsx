import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { CareCard } from "@/components/CareCard";
import { getDiagnostics, Diagnostic } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

const categories = [
  { id: "lab", title: "Lab Results", icon: "edit-3" as const, bg: "#EFF6FF", color: "#3B82F6" },
  { id: "ultrasound", title: "Ultrasounds", icon: "image" as const, bg: "#F5F3FF", color: "#8B5CF6" },
  { id: "vaccines", title: "Vaccines", icon: "shield" as const, bg: "#ECFDF5", color: "#10B981" },
  { id: "insurance", title: "Insurance", icon: "file-text" as const, bg: "#F3F4F6", color: "#6B7280" },
];

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [recentDocs, setRecentDocs] = useState<Diagnostic[]>([]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const diags = await getDiagnostics();
    setRecentDocs(diags.slice(0, 5));
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>
      <ThemedText type="h2" style={styles.title}>Medical Records</ThemedText>

      {/* Categories */}
      <View style={styles.catGrid}>
        {categories.map(c => (
          <Pressable key={c.id} style={[styles.catCard, Shadows.card]} onPress={() => router.push("/(trackers)/diagnostics")}>
            <View style={[styles.catIcon, { backgroundColor: c.bg }]}>
              <Feather name={c.icon} size={22} color={c.color} />
            </View>
            <ThemedText type="small" style={styles.catLabel}>{c.title}</ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Recent */}
      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Recent Documents</ThemedText>
        <Pressable onPress={() => router.push("/(trackers)/diagnostics")}>
          <ThemedText type="small" style={{ color: COLORS.primary }}>View All</ThemedText>
        </Pressable>
      </View>

      {recentDocs.length > 0 ? recentDocs.map(d => (
        <View key={d.id} style={[styles.docItem, Shadows.card]}>
          <View style={[styles.docIcon, { backgroundColor: d.type === "blood" ? "#EFF6FF" : d.type === "usg" ? "#F5F3FF" : "#ECFDF5" }]}>
            <Feather name={d.type === "blood" ? "droplet" : d.type === "usg" ? "image" : "file-text"} size={18} color={d.type === "blood" ? "#3B82F6" : d.type === "usg" ? "#8B5CF6" : "#10B981"} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="h4">{d.fileName}</ThemedText>
            <ThemedText type="small" style={{ color: COLORS.textMuted }}>{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</ThemedText>
          </View>
        </View>
      )) : (
        <View style={[styles.emptyCard, Shadows.card]}>
          <Feather name="folder" size={32} color={COLORS.textMuted} />
          <ThemedText type="body" style={{ color: COLORS.textMuted, marginTop: Spacing.md }}>No documents yet</ThemedText>
          <Pressable style={styles.addBtn} onPress={() => router.push("/(trackers)/diagnostics")}>
            <ThemedText type="small" style={{ color: COLORS.primary, fontWeight: "600" }}>Upload a document</ThemedText>
          </Pressable>
        </View>
      )}

      <CareCard title="Upload Report" subtitle="Add your latest test results" icon="upload" iconBg={COLORS.lavender} iconColor={COLORS.primary} onPress={() => router.push("/(trackers)/diagnostics")} />
      <CareCard title="Prescriptions" subtitle="Your medication prescriptions" icon="file-text" iconBg={COLORS.softAmber} iconColor={COLORS.warning} onPress={() => router.push("/(trackers)/diagnostics")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  title: { marginBottom: Spacing.xl },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing.xl },
  catCard: { width: "47%", backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: "center", gap: Spacing.sm },
  catIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  catLabel: { color: COLORS.textPrimary, fontWeight: "600", textAlign: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  docItem: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm },
  docIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyCard: { backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing["3xl"], alignItems: "center", marginBottom: Spacing.md },
  addBtn: { marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, backgroundColor: COLORS.lavender, borderRadius: BorderRadius.full },
});
