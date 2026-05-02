import { View, type ViewProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export type ThemedViewProps = ViewProps & { lightColor?: string; darkColor?: string };

export function ThemedView({ style, lightColor, darkColor, ...rest }: ThemedViewProps) {
  const { theme, isDark } = useTheme();
  const bg = isDark && darkColor ? darkColor : !isDark && lightColor ? lightColor : theme.backgroundRoot;
  return <View style={[{ backgroundColor: bg }, style]} {...rest} />;
}
