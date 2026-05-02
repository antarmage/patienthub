import { Text, type TextProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "link";
};

export function ThemedText({ style, lightColor, darkColor, type = "body", ...rest }: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const color = isDark && darkColor ? darkColor : !isDark && lightColor ? lightColor : type === "link" ? theme.link : theme.text;
  const typeStyle = Typography[type] ?? Typography.body;
  return <Text style={[{ color }, typeStyle, style]} {...rest} />;
}
