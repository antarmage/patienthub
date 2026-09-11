import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;
const HERO_BG = "https://images.unsplash.com/photo-1671716784499-a3d26826d844?crop=entropy&cs=srgb&fm=jpg&w=940";

type Ask = { key: string; title: string; detail: string; icon: string; priority: "high" | "medium" | "low" };
type Plan = { mother_first_name: string; tone: string; asks: Ask[] };

export default function PartnerViewPublic() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // NOTE: public endpoint — no auth header.
    fetch(`${BACKEND_URL}/api/partner/view/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.detail || "This link is no longer active.");
        }
        return r.json();
      })
      .then(setPlan)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.errorWrap}>
          <MaterialCommunityIcons name="link-off" size={40} color={colors.onSurfaceTertiary} />
          <Text style={styles.errorTitle}>Link no longer active</Text>
          <Text style={styles.errorSub}>{error || "Ask her to send you a fresh link from her Saivie app."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ImageBackground source={{ uri: HERO_BG }} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient
          colors={["rgba(253,251,247,0.4)", "rgba(253,251,247,0.9)", colors.surface]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroInner}>
            <View style={styles.badge}>
              <View style={styles.dot} />
              <Text style={styles.badgeText}>SAIVIE</Text>
            </View>
            <Text style={styles.display}>How to show up{"\n"}for {plan.mother_first_name || "her"} tonight.</Text>
            <Text style={styles.tone}>{plan.tone}</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.privacy} testID="public-privacy">
          <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.success} />
          <Text style={styles.privacyText}>
            She chose exactly what to share with you. No scores or medical details are on this page.
          </Text>
        </View>

        {plan.asks.map((a, i) => (
          <View
            key={a.key}
            style={[styles.askCard, a.priority === "high" && styles.askCardHigh]}
            testID={`public-ask-${a.key}`}
          >
            <View style={styles.askLeft}>
              <View style={[styles.askIcon, a.priority === "high" && styles.askIconHigh]}>
                <MaterialCommunityIcons name={a.icon as any} size={20} color={a.priority === "high" ? colors.onBrand : colors.brand} />
              </View>
              <Text style={styles.askIndex}>{String(i + 1).padStart(2, "0")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.askTopRow}>
                <Text style={styles.askTitle}>{a.title}</Text>
                {a.priority === "high" && (
                  <View style={styles.priorityChip}>
                    <Text style={styles.priorityText}>MOST IMPORTANT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.askDetail}>{a.detail}</Text>
            </View>
          </View>
        ))}

        <View style={styles.closingCard}>
          <MaterialCommunityIcons name="heart-outline" size={22} color={colors.brand} />
          <Text style={styles.closingText}>
            Thank you for showing up. Small, steady acts are exactly what recovery needs.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 320, backgroundColor: colors.surface },
  heroImage: { resizeMode: "cover" },
  heroInner: { padding: spacing.xl, paddingTop: spacing.xl },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand },
  badgeText: { fontFamily: fonts.text, fontSize: 10, letterSpacing: 2, color: colors.onSurface, fontWeight: "500" },
  display: { fontFamily: fonts.display, fontSize: 34, color: colors.onSurface, marginTop: spacing.lg, letterSpacing: -0.5, lineHeight: 40 },
  tone: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },

  scroll: { padding: spacing.xl, paddingTop: 0, paddingBottom: spacing.xl2 },
  privacy: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  privacyText: { flex: 1, fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, lineHeight: 17 },

  askCard: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  askCardHigh: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  askLeft: { alignItems: "center", gap: 6 },
  askIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  askIconHigh: { backgroundColor: colors.brand },
  askIndex: { fontFamily: fonts.text, fontSize: 10, color: colors.onSurfaceTertiary, letterSpacing: 1, fontWeight: "500" },
  askTopRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  askTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface, letterSpacing: -0.2, flexShrink: 1 },
  priorityChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.onSurface },
  priorityText: { fontFamily: fonts.text, fontSize: 9, color: colors.onSurfaceInverse, fontWeight: "700", letterSpacing: 1 },
  askDetail: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 4, lineHeight: 20 },

  closingCard: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: colors.brandTertiary, borderRadius: radius.lg, alignItems: "center", gap: spacing.sm },
  closingText: { fontFamily: fonts.text, fontSize: 14, color: colors.onBrandTertiary, textAlign: "center", lineHeight: 20 },

  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  errorTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface, marginTop: spacing.md },
  errorSub: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary, textAlign: "center", lineHeight: 20 },
});
