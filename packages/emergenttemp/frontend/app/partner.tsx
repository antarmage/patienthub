import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;

type Ask = { key: string; title: string; detail: string; icon: string; priority: "high" | "medium" | "low" };
type Plan = { mother_first_name: string; tone: string; asks: Ask[]; postpartum_day?: number };

export default function PartnerScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await apiFetch<Plan>("/partner/tonight");
      setPlan(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shareNow = async () => {
    setCreating(true);
    try {
      const r = await apiFetch<{ token: string }>("/partner/share", { method: "POST" });
      const url = `${BACKEND_URL}/partner-view/${r.token}`;
      setShareUrl(url);
      const message = `Tonight, here's how you can show up for me 🤍\n\n${url}\n\n(This link expires in 24 hours and shows only what I chose to share.)`;
      if (Platform.OS === "web") {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: "Tonight's support plan", text: message });
        } else if ((navigator as any).clipboard) {
          await (navigator as any).clipboard.writeText(url);
        }
      } else {
        await Share.share({ message, url });
      }
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    try {
      await apiFetch("/partner/revoke", { method: "POST" });
      setShareUrl(null);
    } catch {}
  };

  if (loading || !plan) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="partner-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner support</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient colors={[colors.brandTertiary, colors.surface]} style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>TONIGHT'S ASKS</Text>
          <Text style={styles.display}>Small acts, not grand ones.</Text>
          <Text style={styles.tone}>{plan.tone}</Text>
        </View>

        <View style={styles.privacyCard} testID="privacy-card">
          <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.success} />
          <Text style={styles.privacyText}>
            No scores, symptoms, or clinical details are shared. Only these gentle asks.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What you'll share</Text>
        {plan.asks.map((a) => (
          <View key={a.key} style={styles.askCard} testID={`ask-${a.key}`}>
            <View style={[styles.askIcon, a.priority === "high" && styles.askIconHigh]}>
              <MaterialCommunityIcons name={a.icon as any} size={18} color={a.priority === "high" ? colors.onBrand : colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.askTopRow}>
                <Text style={styles.askTitle}>{a.title}</Text>
                {a.priority === "high" && (
                  <View style={styles.priorityChip}>
                    <Text style={styles.priorityText}>KEY</Text>
                  </View>
                )}
              </View>
              <Text style={styles.askDetail}>{a.detail}</Text>
            </View>
          </View>
        ))}

        {shareUrl && (
          <View style={styles.linkCard} testID="active-link-card">
            <MaterialCommunityIcons name="link-variant" size={18} color={colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkLabel}>Active link · expires in 24h</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{shareUrl}</Text>
            </View>
            <TouchableOpacity onPress={revoke} testID="revoke-link">
              <Text style={styles.revokeText}>Revoke</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={shareNow}
          disabled={creating}
          testID="share-btn"
        >
          {creating ? <ActivityIndicator color={colors.onBrand} /> : (
            <>
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.onBrand} />
              <Text style={styles.primaryText}>{shareUrl ? "Share again" : "Share with my partner"}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  scroll: { paddingBottom: spacing.xl2 },

  hero: { marginHorizontal: spacing.xl, borderRadius: radius.lg, padding: spacing.xl, overflow: "hidden" },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 30, color: colors.onSurface, marginTop: spacing.xs, letterSpacing: -0.5 },
  tone: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 22 },

  privacyCard: { marginHorizontal: spacing.xl, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  privacyText: { flex: 1, fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, lineHeight: 17 },

  sectionLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2, marginHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.sm, textTransform: "uppercase" },
  askCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  askIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  askIconHigh: { backgroundColor: colors.brand },
  askTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  askTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500", flexShrink: 1 },
  priorityChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.onSurface },
  priorityText: { fontFamily: fonts.text, fontSize: 9, color: colors.onSurfaceInverse, fontWeight: "700", letterSpacing: 1 },
  askDetail: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 19 },

  linkCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  linkLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary, letterSpacing: 1, textTransform: "uppercase" },
  linkUrl: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  revokeText: { fontFamily: fonts.text, fontSize: 13, color: colors.error, fontWeight: "500" },

  footer: { padding: spacing.xl, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  primaryBtn: { backgroundColor: colors.brand, height: 52, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryText: { fontFamily: fonts.text, color: colors.onBrand, fontSize: 16, fontWeight: "500" },
});
