import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "@/src/theme";

export default function ScoreBar({ value, color = colors.brand }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
