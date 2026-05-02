import React, { useState, useRef } from "react";
import { View, StyleSheet, Dimensions, FlatList, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useApp } from "@/context/AppContext";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const { width } = Dimensions.get("window");

const slides = [
  { id: "1", icon: "alert-circle" as const, iconBg: "#FEE2E2", iconColor: "#F87171", title: "Overwhelmed by medical jargon?", description: "Pregnancy shouldn't feel like project management. You deserve clarity, not clutter.", btn: "Find Clarity" },
  { id: "2", icon: "check-circle" as const, iconBg: "#DCFCE7", iconColor: "#22C55E", title: "A timeline that thinks for you", description: "SaivieMom transforms chaos into a calm, predictive timeline — right when it matters.", btn: "See How It Works" },
  { id: "3", icon: "droplet" as const, iconBg: "#EDE9FF", iconColor: COLORS.primary, title: "Track every milestone", description: "Log water, medicines, weight and BP. Your Saivie care team sees it all in real-time.", btn: "Let's Do This" },
  { id: "4", icon: "heart" as const, iconBg: "#EDE9FF", iconColor: COLORS.primary, title: "You're all set!", description: "Your personalised roadmap is ready and synced with Saivie.", btn: "Start My Journey" },
];

export default function OnboardingScreen() {
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();

  const next = () => {
    if (idx < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: idx + 1 });
      setIdx(idx + 1);
    } else {
      completeOnboarding();
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <LinearGradient colors={["#eaf2ff", "#f7f9fc", "#eef1f7"]} style={styles.root}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={s => s.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, paddingTop: topPad + Spacing["3xl"] }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <Feather name={item.icon} size={40} color={item.iconColor} />
            </View>
            <ThemedText type="h1" style={styles.title}>{item.title}</ThemedText>
            <ThemedText type="body" style={styles.desc}>{item.description}</ThemedText>
          </View>
        )}
      />
      <View style={[styles.footer, { paddingBottom: botPad + Spacing.xl }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === idx ? COLORS.primary : "#E0E0E0", width: i === idx ? 20 : 8 }]} />
          ))}
        </View>
        <Pressable style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={next}>
          <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700" }}>{slides[idx].btn}</ThemedText>
        </Pressable>
        {idx < slides.length - 1 ? (
          <Pressable onPress={completeOnboarding} style={styles.skip}>
            <ThemedText type="small" style={{ color: COLORS.textMuted }}>Skip</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slide: { flex: 1, alignItems: "center", paddingHorizontal: Spacing["2xl"] },
  iconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: Spacing["2xl"] },
  title: { textAlign: "center", marginBottom: Spacing.lg, color: COLORS.textPrimary },
  desc: { textAlign: "center", color: COLORS.textSecondary, lineHeight: 24 },
  footer: { paddingHorizontal: Spacing["2xl"] },
  dots: { flexDirection: "row", justifyContent: "center", gap: Spacing.xs, marginBottom: Spacing.xl },
  dot: { height: 8, borderRadius: 4 },
  btn: { height: 52, borderRadius: BorderRadius.full, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  skip: { alignItems: "center", padding: Spacing.sm },
});
