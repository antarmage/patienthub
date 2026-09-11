import { Platform } from "react-native";

// Dark-First Utility palette — obsidian + vivid coral accent.
export const colors = {
  surface: "#0C0C0E",
  onSurface: "#F4F4F5",
  surfaceSecondary: "#18181B",
  onSurfaceSecondary: "#A1A1AA",
  surfaceTertiary: "#27272A",
  onSurfaceTertiary: "#E4E4E7",
  surfaceInverse: "#FAFAFA",
  onSurfaceInverse: "#09090B",

  brand: "#FF6B6B",
  brandPrimary: "#FF6B6B",
  onBrand: "#FFFFFF",
  brandSecondary: "#E05353",
  brandTertiary: "#3B1A1A",
  onBrandTertiary: "#FFB3B3",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#1C1917",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#71717A",
  onInfo: "#FFFFFF",

  border: "#27272A",
  borderStrong: "#3F3F46",
  divider: "#27272A",

  muted: "#71717A",

  // Subtle accents for status washes
  alertBg: "#3B1A1A",
  alertBorder: "#5A2A2A",
  warnBg: "#3B2A0F",
  warnBorder: "#5A4218",
  successBg: "#0F3A2A",
  successBorder: "#1A5A44",
};

// Athletic geometric sans for display, high-legibility sans for text.
// System fallback is bundled and reliable — no external font loading required.
export const fonts = {
  display: Platform.select({
    ios: "System",
    android: "sans-serif-medium",
    default: "system-ui, -apple-system, sans-serif",
  }) as string,
  text: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "system-ui, -apple-system, sans-serif",
  }) as string,
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "ui-monospace, SFMono-Regular, Menlo, monospace",
  }) as string,
};

// Display uses tight negative tracking + heavy weight. Text is regular/medium.
export const type = {
  displayHuge: { fontFamily: fonts.display, fontSize: 56, fontWeight: "800" as const, letterSpacing: -1.5 },
  displayLarge: { fontFamily: fonts.display, fontSize: 40, fontWeight: "700" as const, letterSpacing: -1 },
  display: { fontFamily: fonts.display, fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.6 },
  displaySmall: { fontFamily: fonts.display, fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  metric: { fontFamily: fonts.display, fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  headline: { fontFamily: fonts.text, fontSize: 16, fontWeight: "600" as const, letterSpacing: -0.1 },
  body: { fontFamily: fonts.text, fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  small: { fontFamily: fonts.text, fontSize: 13, fontWeight: "400" as const, lineHeight: 19 },
  micro: { fontFamily: fonts.text, fontSize: 11, fontWeight: "600" as const, letterSpacing: 2 },
  label: { fontFamily: fonts.text, fontSize: 12, fontWeight: "500" as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xl2: 32,
  xl3: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const riskColor = (risk?: string) => {
  switch (risk) {
    case "red":
    case "urgent":
      return colors.error;
    case "orange":
    case "review":
      return colors.brand;
    case "yellow":
    case "watch":
      return colors.warning;
    case "green":
    case "stable":
    default:
      return colors.success;
  }
};

export const riskLabel = (risk?: string) => {
  switch (risk) {
    case "red":
      return "Urgent";
    case "orange":
      return "Review";
    case "yellow":
      return "Watch";
    default:
      return "Stable";
  }
};
