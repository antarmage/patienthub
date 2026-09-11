import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/src/theme";

type Ring = { value: number; color: string; label: string };

type Props = {
  size?: number;
  strokeWidth?: number;
  rings: Ring[]; // outermost -> innermost
};

export default function WellbeingRings({ size = 200, strokeWidth = 14, rings }: Props) {
  const gap = 4;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {rings.map((r, idx) => {
          const radius = size / 2 - strokeWidth / 2 - idx * (strokeWidth + gap);
          const circumference = 2 * Math.PI * radius;
          const pct = Math.max(0, Math.min(100, r.value)) / 100;
          const dash = circumference * pct;
          const gapLen = circumference - dash;
          return (
            <React.Fragment key={r.label}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.surfaceTertiary}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={0.9}
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={r.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${dash} ${gapLen}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export const ringStyles = StyleSheet.create({});
