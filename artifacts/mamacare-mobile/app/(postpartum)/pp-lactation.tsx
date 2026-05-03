import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const TIPS = [
  { icon: "droplet" as const, title: "Feed on demand", desc: "Newborns typically feed 8–12 times per day. Look for hunger cues — rooting, sucking motions, and fussing." },
  { icon: "heart" as const, title: "Ensure a good latch", desc: "A deep latch prevents nipple pain and ensures your baby gets enough milk. Seek help if breastfeeding is painful." },
  { icon: "sun" as const, title: "Stay hydrated & nourished", desc: "Drink water whenever you feed. Eat extra 450–500 calories daily to support milk production." },
  { icon: "moon" as const, title: "Rest matters", desc: "Sleep deprivation reduces milk supply. Rest when baby rests — ask for help from family." },
  { icon: "shield" as const, title: "Breast care", desc: "Lanolin cream soothes cracked nipples. Air-dry after feeds. Treat mastitis early — see your doctor." },
  { icon: "clock" as const, title: "Expressing milk", desc: "Start pumping after 3–4 weeks if needed. Store milk safely: room temp 4 hrs, fridge 4 days, freezer 6 months." },
];

const FAQ = [
  { q: "How do I know my baby is getting enough milk?", a: "Signs of adequate intake: 6+ wet nappies daily, steady weight gain after day 5, baby is alert and content after feeds." },
  { q: "Is it safe to breastfeed if I'm unwell?", a: "Usually yes — your milk provides protective antibodies to your baby. Continue unless advised otherwise by your doctor." },
  { q: "What foods to avoid while breastfeeding?", a: "Limit caffeine (<200mg/day), avoid alcohol or wait 2+ hours after drinking. Most foods are fine; watch for reactions in baby." },
  { q: "How long should I breastfeed?", a: "WHO recommends exclusive breastfeeding for 6 months, then continued with solids for up to 2 years or beyond." },
  { q: "What if my milk supply is low?", a: "Feed more frequently, ensure good latch, stay hydrated, rest well. Consult a lactation consultant if concerned." },
];

export default function PostpartumLactationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Lactation Counseling</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.sectionTitle}>Top Breastfeeding Tips</ThemedText>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Feather name={tip.icon} size={18} color="#3B82F6" />
            </View>
            <View style={styles.tipText}>
              <ThemedText style={styles.tipTitle}>{tip.title}</ThemedText>
              <ThemedText style={styles.tipDesc}>{tip.desc}</ThemedText>
            </View>
          </View>
        ))}

        <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Frequently Asked Questions</ThemedText>
        {FAQ.map((item, i) => (
          <Pressable key={i} style={styles.faqCard} onPress={() => setOpenFaq(openFaq === i ? null : i)}>
            <View style={styles.faqRow}>
              <ThemedText style={styles.faqQ}>{item.q}</ThemedText>
              <Feather name={openFaq === i ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textMuted} />
            </View>
            {openFaq === i && (
              <ThemedText style={styles.faqA}>{item.a}</ThemedText>
            )}
          </Pressable>
        ))}

        <View style={styles.supportCard}>
          <View style={styles.supportLeft}>
            <ThemedText style={styles.supportTitle}>Need personal support?</ThemedText>
            <ThemedText style={styles.supportSub}>
              Ask your Saivie care team to connect you with a certified lactation consultant.
            </ThemedText>
          </View>
          <Feather name="message-circle" size={28} color="#3B82F6" />
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
  tipCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: Spacing.md,
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: "#F3F4F6",
  },
  tipIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  tipText: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 3 },
  tipDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  faqCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: "#F3F4F6",
  },
  faqRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm },
  faqQ: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  faqA: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: Spacing.sm },
  supportCard: {
    backgroundColor: "#EFF6FF", borderRadius: 16, padding: Spacing.lg,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: Spacing.xl, borderWidth: 1, borderColor: "#DBEAFE",
  },
  supportLeft: { flex: 1, marginRight: Spacing.md },
  supportTitle: { fontSize: 15, fontWeight: "700", color: "#1E40AF", marginBottom: 4 },
  supportSub: { fontSize: 13, color: "#1D4ED8", lineHeight: 18 },
});
