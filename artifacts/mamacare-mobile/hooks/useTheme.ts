import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme ?? "light"];
  return { theme, isDark };
}
