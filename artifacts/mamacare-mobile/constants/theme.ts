import { Platform } from "react-native";

// Native mirror of lib/brand/tokens.css (`--saivie-*`, camelCased) so the app
// needs no CSS dependency. Keep in sync; `pnpm run check:brand` verifies values
// and contrast. Gold is decorative only — never use it for text on light surfaces.
const ivory = "#FFFFFC";
const plum = "#3E3440";
const teal = "#2F6B60";

export const BRAND = {
  ivory,
  sage: "#CFE2DC",
  blush: "#E5C4DB",
  plum,
  teal,
  rose: "#8D5B7B",
  gold: "#B38B56",
  page: ivory,
  surfaceMuted: "#F4F8F5",
  surfaceBlush: "#F8EEF5",
  text: plum,
  primaryAction: teal,
  primaryActionText: "#FFFFFF",
  border: "#D8E2DD",
} as const;

export const COLORS = {
  ...BRAND,
  primary: BRAND.primaryAction,
  primaryLight: BRAND.sage,
  primaryDisabled: "rgba(47, 107, 96, 0.45)",
  primaryTint: "rgba(47, 107, 96, 0.12)",
  secondary: BRAND.rose,
  secondaryLight: BRAND.surfaceBlush,
  roseTint: "rgba(141, 91, 123, 0.12)",
  background: BRAND.page,
  card: "#FFFFFF",
  textPrimary: BRAND.text,
  textSecondary: "rgba(62, 52, 64, 0.82)",
  textMuted: "rgba(62, 52, 64, 0.76)",
  // Clinical status / data colours keep their established meaning; not brand-tinted.
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#DC2626",
  white: BRAND.primaryActionText,
  // Legacy alias: primary-tinted surface (now sage).
  lavender: BRAND.sage,
  lightBlue: "#E0F2FE",
  softGreen: "#DCFCE7",
  softAmber: "#FEF3C7",
  softPink: BRAND.surfaceBlush,
  softPurple: BRAND.surfaceBlush,
  glassBackground: "rgba(255, 255, 252, 0.6)",
  glassBorder: "rgba(216, 226, 221, 0.7)",
  gradientStart: BRAND.surfaceMuted,
  gradientMid: BRAND.page,
  gradientEnd: BRAND.surfaceBlush,
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
    backgroundTertiary: BRAND.surfaceMuted,
    primary: COLORS.primary,
    primaryLight: COLORS.primaryLight,
    secondary: COLORS.secondary,
    secondaryLight: COLORS.secondaryLight,
    accent: BRAND.blush,
    success: COLORS.success,
    warning: COLORS.warning,
    danger: COLORS.error,
    border: COLORS.border,
    cardShadow: "rgba(62, 52, 64, 0.08)",
  },
  // Dark mode: plum-derived surfaces; sage/blush carry the brand on dark.
  // buttonText is plum so foregrounds on primary (sage) fills stay legible.
  dark: {
    text: BRAND.ivory,
    textSecondary: BRAND.border,
    textMuted: "rgba(216, 226, 221, 0.72)",
    buttonText: BRAND.plum,
    tabIconDefault: "rgba(216, 226, 221, 0.6)",
    tabIconSelected: BRAND.sage,
    link: BRAND.sage,
    backgroundRoot: "#1E1920",
    backgroundDefault: "#2A2330",
    backgroundSecondary: BRAND.plum,
    backgroundTertiary: "#4A3F4D",
    primary: BRAND.sage,
    primaryLight: "rgba(207, 226, 220, 0.16)",
    secondary: BRAND.blush,
    secondaryLight: "rgba(229, 196, 219, 0.16)",
    accent: BRAND.blush,
    success: COLORS.success,
    warning: "#FBBF24",
    danger: "#EF4444",
    border: "#4A3F4D",
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
    backgroundColor: COLORS.glassBackground,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  cardShadow: {
    shadowColor: BRAND.plum,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
  },
  blueTint: { backgroundColor: "rgba(59, 130, 246, 0.08)" },
  greenTint: { backgroundColor: "rgba(34, 197, 94, 0.08)" },
  pinkTint: { backgroundColor: COLORS.roseTint },
  purpleTint: { backgroundColor: COLORS.primaryTint },
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
