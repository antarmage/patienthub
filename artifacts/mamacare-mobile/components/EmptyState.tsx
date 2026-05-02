import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing } from "@/constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
}

export function EmptyState({ icon = "inbox", title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={32} color={COLORS.textMuted} />
      </View>
      <ThemedText type="h4" style={styles.title}>{title}</ThemedText>
      {description ? <ThemedText type="small" style={styles.desc}>{description}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: Spacing["3xl"], paddingHorizontal: Spacing["2xl"] },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F5F5F7", alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg },
  title: { color: COLORS.textPrimary, marginBottom: Spacing.xs, textAlign: "center" },
  desc: { color: COLORS.textMuted, textAlign: "center" },
});
