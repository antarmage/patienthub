import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const TIMING = [
  { week: "Weeks 1–2", icon: "x-circle" as const, iconColor: "#EF4444", bg: "#FEF2F2", label: "Avoid massage", desc: "Your body is in early healing. Avoid massage until wounds are closed and bleeding has significantly reduced." },
  { week: "Weeks 3–4", icon: "clock" as const, iconColor: "#F59E0B", bg: "#FFFBEB", label: "Light touch only", desc: "Gentle foot and leg massage is safe. Avoid the abdomen, C-section scar, and perineum area." },
  { week: "Weeks 5–6", icon: "check-circle" as const, iconColor: "#10B981", bg: "#ECFDF5", label: "Gentle body massage", desc: "Shoulders, upper back, and neck massage is beneficial. Get clearance from your doctor before abdominal massage." },
  { week: "6+ Weeks", icon: "star" as const, iconColor: "#6C63FF", bg: "#F5F3FF", label: "Full body massage", desc: "Full postpartum massage is generally safe. Include abdominal scar massage for C-section moms (once healed)." },
];

const TIPS = [
  { icon: "droplet" as const, title: "Use postpartum-safe oils", desc: "Coconut oil, sesame oil, or almond oil are traditional choices. Avoid strong essential oils around a breastfeeding baby." },
  { icon: "thermometer" as const, title: "Warm is better", desc: "Warm the oil slightly before use. A warm massage relaxes tense postpartum muscles more effectively." },
  { icon: "user" as const, title: "Ask for help", desc: "Ask your partner, mother, or a trained postpartum masseuse. Self-massage of the feet and legs is also effective." },
  { icon: "heart" as const, title: "C-section scar massage", desc: "After 6–8 weeks, gently massage around (not on) the scar in small circles to reduce adhesions and sensitivity." },
  { icon: "wind" as const, title: "Abdominal binding", desc: "Traditional belly binding (like bengkung) alongside massage helps with diastasis recti recovery. Start from week 1." },
  { icon: "smile" as const, title: "Benefits for mental health", desc: "Massage reduces cortisol and increases serotonin — especially helpful for postpartum mood regulation." },
];

export default function PostpartumMassageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(postpartum)")}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Postpartum Massage Guide</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.sectionTitle}>When to Start</ThemedText>
        {TIMING.map((t) => (
          <View key={t.week} style={[styles.timingCard, { backgroundColor: t.bg }]}>
            <View style={styles.timingLeft}>
              <Feather name={t.icon} size={20} color={t.iconColor} />
            </View>
            <View style={styles.timingText}>
              <ThemedText style={[styles.timingWeek, { color: t.iconColor }]}>{t.week}</ThemedText>
              <ThemedText style={styles.timingLabel}>{t.label}</ThemedText>
              <ThemedText style={styles.timingDesc}>{t.desc}</ThemedText>
            </View>
          </View>
        ))}

        <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Tips & Techniques</ThemedText>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Feather name={tip.icon} size={18} color="#F43F5E" />
            </View>
            <View style={styles.tipText}>
              <ThemedText style={styles.tipTitle}>{tip.title}</ThemedText>
              <ThemedText style={styles.tipDesc}>{tip.desc}</ThemedText>
            </View>
          </View>
        ))}

        <View style={styles.noteCard}>
          <Feather name="alert-circle" size={15} color="#F43F5E" style={{ marginRight: 6 }} />
          <ThemedText style={styles.noteText}>
            Always consult your doctor before massage after a C-section, or if you had complications during delivery.
          </ThemedText>
        </View>
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
  scroll: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: Spacing.md },
  timingCard: {
    flexDirection: "row", borderRadius: 14, padding: Spacing.md,
    marginBottom: Spacing.sm, gap: Spacing.md, alignItems: "flex-start",
  },
  timingLeft: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  timingText: { flex: 1 },
  timingWeek: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  timingLabel: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 3 },
  timingDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  tipCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: Spacing.md,
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: "#F3F4F6",
  },
  tipIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF1F2",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  tipText: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 3 },
  tipDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  noteCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FFF1F2", borderRadius: 12, padding: Spacing.md,
    marginTop: Spacing.xl, borderWidth: 1, borderColor: "#FFE4E6",
  },
  noteText: { fontSize: 13, color: "#BE123C", flex: 1, lineHeight: 18 },
});
