import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

type Feed = { feed_id: string; created_at: string; side?: string; duration_min?: number };
type Pattern = {
  pattern: "cluster" | "spaced" | "normal" | "insufficient";
  avg_gap_min: number | null;
  count_today: number;
  last_feed_min_ago: number | null;
  recommendation: "tighten" | "loosen" | "steady";
  summary: string;
};

export default function FeedsScreen() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ feeds: Feed[]; pattern: Pattern }>("/feeds/today");
      setFeeds(d.feeds);
      setPattern(d.pattern);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logFeed = async () => {
    setLogging(true);
    try {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      const d = await apiFetch<{ feed: Feed; pattern: Pattern }>("/feeds", { method: "POST", body: JSON.stringify({}) });
      setFeeds((f) => [d.feed, ...f]);
      setPattern(d.pattern);
    } finally {
      setLogging(false);
    }
  };

  const removeFeed = async (id: string) => {
    setFeeds((f) => f.filter((x) => x.feed_id !== id));
    try { await apiFetch(`/feeds/${id}`, { method: "DELETE" }); } catch {}
    load();
  };

  if (loading || !pattern) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  const patternColor = pattern.recommendation === "tighten" ? colors.warning : pattern.recommendation === "loosen" ? colors.success : colors.info;
  const patternLabel = pattern.recommendation === "tighten" ? "TIGHTEN" : pattern.recommendation === "loosen" ? "LOOSEN" : "STEADY";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="feeds-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feeding log</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
      >
        <View style={styles.hero}>
          <LinearGradient colors={[colors.brandTertiary, colors.surface]} style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.count}>{pattern.count_today}<Text style={styles.countUnit}> feeds</Text></Text>
          <Text style={styles.lastFeed}>
            {pattern.last_feed_min_ago !== null
              ? `Last feed ${formatAgo(pattern.last_feed_min_ago)}`
              : "No feeds logged yet today."}
          </Text>

          <View style={[styles.patternChip, { borderColor: patternColor }]}>
            <View style={[styles.dot, { backgroundColor: patternColor }]} />
            <Text style={[styles.patternLabel, { color: patternColor }]}>{patternLabel}</Text>
            {pattern.avg_gap_min !== null && (
              <Text style={styles.patternMeta}>· avg gap {pattern.avg_gap_min}m</Text>
            )}
          </View>
          <Text style={styles.patternSummary}>{pattern.summary}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bigTapBtn, logging && { opacity: 0.6 }]}
          onPress={logFeed}
          disabled={logging}
          testID="log-feed-btn"
        >
          <View style={styles.bigTapIcon}>
            {logging ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <MaterialCommunityIcons name="plus" size={32} color={colors.onBrand} />
            )}
          </View>
          <View>
            <Text style={styles.bigTapText}>Log a feed</Text>
            <Text style={styles.bigTapSub}>One tap — time is now</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>TODAY'S FEEDS</Text>
        {feeds.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="baby-bottle-outline" size={28} color={colors.onSurfaceTertiary} />
            <Text style={styles.emptyText}>No feeds logged yet today. Tap the big button above.</Text>
          </View>
        ) : (
          feeds.map((f) => (
            <View key={f.feed_id} style={styles.feedRow} testID={`feed-${f.feed_id}`}>
              <View style={styles.feedIcon}>
                <MaterialCommunityIcons name="water-outline" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedTime}>{formatTime(f.created_at)}</Text>
                <Text style={styles.feedRel}>{formatAgo(minutesAgo(f.created_at))}</Text>
              </View>
              <TouchableOpacity onPress={() => removeFeed(f.feed_id)} testID={`del-${f.feed_id}`}>
                <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.onSurfaceTertiary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function minutesAgo(iso: string) {
  const d = new Date(iso).getTime();
  return Math.max(0, Math.floor((Date.now() - d) / 60000));
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatAgo(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  if (rem === 0) return `${h} h ago`;
  return `${h}h ${rem}m ago`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  scroll: { paddingBottom: spacing.xl2 },

  hero: { marginHorizontal: spacing.xl, borderRadius: radius.lg, padding: spacing.xl, overflow: "hidden" },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  count: { fontFamily: fonts.display, fontSize: 48, color: colors.onSurface, marginTop: spacing.xs, letterSpacing: -1 },
  countUnit: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurfaceTertiary },
  lastFeed: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  patternChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  patternLabel: { fontFamily: fonts.text, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  patternMeta: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary },
  patternSummary: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 19 },

  bigTapBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.brand, marginHorizontal: spacing.xl, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg },
  bigTapIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  bigTapText: { fontFamily: fonts.display, fontSize: 22, color: colors.onBrand, letterSpacing: -0.3 },
  bigTapSub: { fontFamily: fonts.text, fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  sectionLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2, marginHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.sm },
  emptyCard: { marginHorizontal: spacing.xl, padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: spacing.sm },
  emptyText: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, textAlign: "center" },
  feedRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  feedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  feedTime: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  feedRel: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
});
