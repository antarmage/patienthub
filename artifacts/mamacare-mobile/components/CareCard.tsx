import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface CareCardProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  badge?: string;
  onPress?: () => void;
}

export function CareCard({ title, subtitle, icon, iconBg, iconColor, badge, onPress }: CareCardProps) {
  return (
    <Pressable onPress={onPress} style={[styles.card, Shadows.card]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.text}>
        <ThemedText type="h4">{title}</ThemedText>
        {subtitle ? <ThemedText type="small" style={{ color: COLORS.textMuted }}>{subtitle}</ThemedText> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
          <ThemedText type="small" style={styles.badgeText}>{badge}</ThemedText>
        </View>
      ) : null}
      <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { color: "#FFF", fontWeight: "600", fontSize: 11 },
});
