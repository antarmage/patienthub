import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { useAuth } from "@/src/context/AuthContext";
import { colors, spacing, radius, type } from "@/src/theme";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try { await signInWithGoogle(); } finally { setBusy(false); }
  };

  return (
    <View style={styles.bg}>
      {/* Radial-ish glow layered */}
      <LinearGradient
        colors={["#1A0A0A", colors.surface]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.glow} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>SAIVIE · MAMA</Text>
          </View>

          <View style={styles.headline}>
            <Text style={styles.h1}>Postpartum,</Text>
            <Text style={styles.h1Accent}>rebuilt.</Text>
          </View>

          <Text style={styles.subtitle}>
            A command center for your recovery. Daily check-ins, one-tap logs, and a care team that sees the pattern.
          </Text>

          <View style={styles.featureRow}>
            <FeatureChip icon="pulse" label="DAILY VITALS" />
            <FeatureChip icon="flash" label="ONE-TAP LOGS" />
            <FeatureChip icon="shield-check-outline" label="CARE TEAM" />
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleSignIn}
            disabled={busy}
            testID="google-signin-button"
          >
            {busy ? <ActivityIndicator color={colors.onBrand} /> : (
              <>
                <MaterialCommunityIcons name="google" size={20} color={colors.onBrand} />
                <Text style={styles.googleText}>Continue with Google</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.onBrand} />
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.legal}>
            Saivie supports you — it does not diagnose.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons name={icon as any} size={12} color={colors.brand} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.surface },
  glow: {
    position: "absolute", top: -100, alignSelf: "center", width: 500, height: 500, borderRadius: 250,
    backgroundColor: colors.brand, opacity: 0.15,
  },
  safe: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: "space-between" },
  top: { marginTop: spacing.xl2 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, alignSelf: "flex-start",
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  badgeText: { ...type.micro, color: colors.onSurface },
  headline: { marginTop: spacing.xl2 },
  h1: { ...type.displayLarge, fontSize: 56, lineHeight: 60, color: colors.onSurface },
  h1Accent: { ...type.displayLarge, fontSize: 56, lineHeight: 60, color: colors.brand },
  subtitle: { ...type.body, color: colors.onSurfaceSecondary, marginTop: spacing.lg, lineHeight: 24 },
  featureRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl, flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  chipText: { ...type.micro, color: colors.onSurfaceSecondary, letterSpacing: 1.5 },
  bottom: { marginBottom: spacing.lg },
  googleBtn: {
    backgroundColor: colors.brand, height: 56, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md,
  },
  googleText: { ...type.headline, color: colors.onBrand, fontSize: 16 },
  legal: { ...type.small, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: spacing.md },
});
