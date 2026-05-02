import React from "react";
import { StyleSheet, Pressable, StyleProp, ViewStyle, Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius, GlassStyles } from "@/constants/theme";

interface GlassCardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tint?: "default" | "blue" | "green" | "pink" | "purple" | "amber";
  borderRadius?: number;
  padding?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getTintStyle = (tint: string): ViewStyle => {
  switch (tint) {
    case "blue": return GlassStyles.blueTint;
    case "green": return GlassStyles.greenTint;
    case "pink": return GlassStyles.pinkTint;
    case "purple": return GlassStyles.purpleTint;
    case "amber": return GlassStyles.amberTint;
    default: return {};
  }
};

export function GlassCard({ title, description, children, onPress, style, tint = "default", borderRadius = BorderRadius.xl, padding = Spacing.xl }: GlassCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const inner = (
    <>
      {title ? <ThemedText type="h4" style={styles.title}>{title}</ThemedText> : null}
      {description ? <ThemedText type="small" style={styles.desc}>{description}</ThemedText> : null}
      {children}
    </>
  );

  if (Platform.OS === "ios") {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPress ? () => { scale.value = withSpring(0.96); } : undefined}
        onPressOut={onPress ? () => { scale.value = withSpring(1); } : undefined}
        disabled={!onPress}
        style={[animatedStyle, style]}
      >
        <BlurView intensity={20} tint="light" style={[styles.blur, { borderRadius }, GlassStyles.cardShadow, getTintStyle(tint)]}>
          <View style={{ padding }}>{inner}</View>
        </BlurView>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPress ? () => { scale.value = withSpring(0.96); } : undefined}
      onPressOut={onPress ? () => { scale.value = withSpring(1); } : undefined}
      disabled={!onPress}
      style={[styles.fallback, { borderRadius, padding }, GlassStyles.cardShadow, getTintStyle(tint), animatedStyle, style]}
    >
      {inner}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  blur: { overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  fallback: { backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  title: { marginBottom: Spacing.xs },
  desc: { color: COLORS.textSecondary },
});
