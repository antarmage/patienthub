import React from "react";
import Svg, { Polyline, Line, Circle } from "react-native-svg";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/src/theme";

type Props = {
  data: number[]; // 0-100 values
  color?: string;
  width?: number;
  height?: number;
  label?: string;
};

export default function TrendChart({ data, color = colors.brand, width = 320, height = 140, label }: Props) {
  const padding = 12;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const max = 100;
  const min = 0;
  const pts = data.length
    ? data.map((v, i) => {
        const x = padding + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
        const y = padding + h - ((v - min) / (max - min)) * h;
        return `${x},${y}`;
      })
    : [];

  return (
    <View style={{ width, height: height + (label ? 24 : 0) }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Svg width={width} height={height}>
        {[25, 50, 75].map((y) => {
          const yy = padding + h - (y / max) * h;
          return <Line key={y} x1={padding} y1={yy} x2={width - padding} y2={yy} stroke={colors.border} strokeWidth={1} />;
        })}
        {pts.length > 1 && (
          <Polyline
            points={pts.join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {pts.map((p, i) => {
          const [x, y] = p.split(",").map(Number);
          return <Circle key={i} cx={x} cy={y} r={3} fill={color} />;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
