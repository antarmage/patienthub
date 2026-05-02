import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
}

export function Button({ onPress, disabled, style, children, variant = "primary" }: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const getBg = () => {
    if (variant === "secondary") return COLORS.secondary;
    if (variant === "outline") return "transparent";
    return COLORS.primary;
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => { if (!disabled) scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      disabled={disabled}
      style={[styles.button, { backgroundColor: getBg(), opacity: disabled ? 0.5 : 1 }, style, animatedStyle]}
    >
      <ThemedText type="body" style={[styles.text, { color: variant === "outline" ? COLORS.primary : COLORS.white }]}>
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: { height: Spacing.buttonHeight, borderRadius: BorderRadius.full, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing["2xl"] },
  text: { fontWeight: "600" },
});
