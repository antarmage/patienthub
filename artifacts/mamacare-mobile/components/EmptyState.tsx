import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const subtitle = message || description;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={32} color={COLORS.textMuted} />
      </View>
      <ThemedText type="h4" style={styles.title}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="small" style={styles.desc}>{subtitle}</ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <ThemedText type="small" style={styles.actionText}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing["2xl"],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: COLORS.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  desc: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  actionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: "#F5F3FF",
    borderRadius: BorderRadius.full,
  },
  actionText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
