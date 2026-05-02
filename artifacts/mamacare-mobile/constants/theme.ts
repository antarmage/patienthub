import { Platform } from "react-native";

export const COLORS = {
  primary: "#6C63FF",
  secondary: "#F4A7C1",
  background: "#FAFAFC",
  card: "#FFFFFF",
  textPrimary: "#1C1C1E",
  textSecondary: "rgba(28, 28, 30, 0.7)",
  textMuted: "rgba(28, 28, 30, 0.5)",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#DC2626",
  white: "#FFFFFF",
  border: "rgba(255, 255, 255, 0.35)",
  lavender: "#E8E4FF",
  lightBlue: "#E0F2FE",
  softGreen: "#DCFCE7",
  softAmber: "#FEF3C7",
  softPink: "#FCE7F3",
  softPurple: "#F3E8FF",
  glassBackground: "rgba(255, 255, 255, 0.45)",
  glassBorder: "rgba(255, 255, 255, 0.35)",
  gradientStart: "#eaf2ff",
  gradientMid: "#f7f9fc",
  gradientEnd: "#eef1f7",
  blueTint: "rgba(59, 130, 246, 0.08)",
};

export const Colors = {
  light: {
    text: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    textMuted: COLORS.textMuted,
    buttonText: COLORS.white,
    tabIconDefault: COLORS.textMuted,
    tabIconSelected: COLORS.primary,
    link: COLORS.primary,
    backgroundRoot: COLORS.background,
    backgroundDefault: COLORS.background,
    backgroundSecondary: COLORS.card,
    backgroundTertiary: "#EFF0F3",
    primary: COLORS.primary,
    primaryLight: "#EDE9FF",
    secondary: COLORS.secondary,
    secondaryLight: "#FDF2F6",
    accent: COLORS.secondary,
    success: COLORS.success,
    warning: COLORS.warning,
    danger: COLORS.error,
    border: COLORS.border,
    cardShadow: "rgba(0, 0, 0, 0.06)",
  },
  dark: {
    text: "#F9FAFB",
    textSecondary: "#D1D5DB",
    textMuted: "#9CA3AF",
    buttonText: COLORS.white,
    tabIconDefault: "#6B7280",
    tabIconSelected: "#A78BFA",
    link: "#A78BFA",
    backgroundRoot: "#111827",
    backgroundDefault: "#1F2937",
    backgroundSecondary: "#374151",
    backgroundTertiary: "#4B5563",
    primary: "#A78BFA",
    primaryLight: "#2D2A4A",
    secondary: "#F4A7C1",
    secondaryLight: "#3D2A35",
    accent: "#F4A7C1",
    success: COLORS.success,
    warning: "#FBBF24",
    danger: "#EF4444",
    border: "#374151",
    cardShadow: "rgba(0, 0, 0, 0.4)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 24,
  "2xl": 28,
  "3xl": 50,
  full: 9999,
};

export const GlassStyles = {
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
  },
  blueTint: { backgroundColor: "rgba(59, 130, 246, 0.08)" },
  greenTint: { backgroundColor: "rgba(34, 197, 94, 0.08)" },
  pinkTint: { backgroundColor: "rgba(236, 72, 153, 0.08)" },
  purpleTint: { backgroundColor: "rgba(139, 92, 246, 0.08)" },
  amberTint: { backgroundColor: "rgba(245, 158, 11, 0.08)" },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "600" as const },
  h3: { fontSize: 18, fontWeight: "500" as const },
  h4: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  small: { fontSize: 13, fontWeight: "400" as const },
  link: { fontSize: 15, fontWeight: "400" as const },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
