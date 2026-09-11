import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";

const MODULES = [
  {
    key: "recovery",
    title: "Recovery",
    subtitle: "Gentle exercises for your body",
    icon: "yoga",
    color: colors.success,
    image: "https://images.pexels.com/photos/28536695/pexels-photo-28536695.jpeg?auto=compress&cs=tinysrgb&w=800",
    items: ["Deep breathing · 3 min", "Pelvic floor · 3 min", "Gentle mobility · 3 min", "Posture reset · 2 min"],
  },
  {
    key: "breastfeeding",
    title: "Breastfeeding",
    subtitle: "Latch, positions, and comfort",
    icon: "mother-nurse",
    color: colors.brand,
    image: "https://images.unsplash.com/photo-1714595747121-7067706bc557?crop=entropy&cs=srgb&fm=jpg&w=800",
    items: ["Deep-latch tutorial", "Cradle vs football holds", "Engorgement care", "Milk storage basics"],
  },
  {
    key: "nutrition",
    title: "Nutrition",
    subtitle: "Culturally-aware daily plans",
    icon: "food-apple-outline",
    color: colors.warning,
    image: "https://images.pexels.com/photos/6065181/pexels-photo-6065181.jpeg?auto=compress&cs=tinysrgb&w=800",
    items: ["Protein-rich breakfast", "Iron + vitamin C lunch", "Hydration goal 8 cups", "Lactation-supporting snacks"],
  },
  {
    key: "sleep",
    title: "Sleep",
    subtitle: "Tiny changes, real recovery",
    icon: "moon-waning-crescent",
    color: colors.info,
    image: "https://images.pexels.com/photos/28536695/pexels-photo-28536695.jpeg?auto=compress&cs=tinysrgb&w=800",
    items: ["Protected rest window", "3-min sleep relaxation", "Partner support plan"],
  },
];

export default function CareScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.eyebrow}>YOUR CARE MODULES</Text>
          <Text style={styles.display}>Small, gentle steps.</Text>
          <Text style={styles.sub}>Guided programs personalized to your delivery, feeding, and today's state.</Text>
        </View>

        {MODULES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={styles.card}
            testID={`care-module-${m.key}`}
            activeOpacity={0.9}
            onPress={() => m.key === "sleep" ? router.push("/sleep-plan") : null}
          >
            <Image source={{ uri: m.image }} style={styles.cardImg} />
            <View style={styles.cardBody}>
              <View style={styles.rowTop}>
                <View style={[styles.iconChip, { backgroundColor: m.color }]}>
                  <MaterialCommunityIcons name={m.icon as any} size={16} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>{m.title}</Text>
              </View>
              <Text style={styles.cardSub}>{m.subtitle}</Text>
              <View style={styles.items}>
                {m.items.map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemText}>{it}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  head: { marginBottom: spacing.xl },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 32, color: colors.onSurface, marginTop: spacing.xs, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary, marginTop: spacing.sm, lineHeight: 22 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: "hidden" },
  cardImg: { width: "100%", height: 140 },
  cardBody: { padding: spacing.md },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconChip: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface, letterSpacing: -0.3 },
  cardSub: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 4 },
  items: { marginTop: spacing.md, gap: spacing.sm },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  itemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand },
  itemText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary },
});
