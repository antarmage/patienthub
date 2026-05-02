import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, Pressable } from "react-native";
import { GlassStyles, Shadows, BorderRadius, Spacing } from "@/constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}

export function Card({ children, style, onPress, padding = Spacing.lg }: CardProps) {
  const content = (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    ...Shadows.card,
  },
});
