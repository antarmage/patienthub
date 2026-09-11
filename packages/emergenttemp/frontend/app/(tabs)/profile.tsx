import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { apiFetch } from "@/src/api/client";

export default function ProfileScreen() {
  const { user, signOut, role, setRole } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    apiFetch<any>("/mothers/me").then(setMe).catch(() => {});
  }, []);

  const enterClinician = () => {
    setRole("clinician");
    router.push("/clinician/dashboard");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.initial}>{(user?.name || "M")[0]}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name || "Mother"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {me?.profile && (
            <View style={styles.badgeRow}>
              <View style={styles.badge}><Text style={styles.badgeText}>Day {me.postpartum_day}</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>{me.profile.delivery_type?.replace("_", " ")}</Text></View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care team</Text>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
              <MaterialCommunityIcons name="doctor" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Dr Sai (Gynecologist)</Text>
              <Text style={styles.rowSub}>Available today · Next review day 21</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support at home</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push("/partner")} testID="partner-support-btn">
            <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
              <MaterialCommunityIcons name="account-heart-outline" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Partner support</Text>
              <Text style={styles.rowSub}>Share tonight's asks — no clinical data</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For care providers</Text>
          <TouchableOpacity style={styles.row} onPress={enterClinician} testID="clinician-toggle">
            <View style={[styles.rowIcon, { backgroundColor: colors.surfaceTertiary }]}>
              <MaterialCommunityIcons name="hospital-building" size={20} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Open clinician view</Text>
              <Text style={styles.rowSub}>Risk queue, patient list, timeline</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & consent</Text>
          {[
            "Share with doctor",
            "Share with nurse",
            "Share with psychologist",
            "AI personalization",
          ].map((label) => (
            <View key={label} style={styles.consentRow}>
              <Text style={styles.consentLabel}>{label}</Text>
              <View style={styles.consentOn}>
                <Text style={styles.consentOnText}>ON</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.signOut} onPress={signOut} testID="sign-out">
          <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  header: { alignItems: "center", marginBottom: spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.display, fontSize: 36, color: colors.brand },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginTop: spacing.md },
  email: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2, marginBottom: spacing.md, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  rowSub: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  consentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  consentLabel: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurface },
  consentOn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.success },
  consentOnText: { fontFamily: fonts.text, fontSize: 10, color: colors.onSuccess, fontWeight: "700", letterSpacing: 1 },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl2, paddingVertical: spacing.md },
  signOutText: { fontFamily: fonts.text, fontSize: 14, color: colors.error, fontWeight: "500" },
});
