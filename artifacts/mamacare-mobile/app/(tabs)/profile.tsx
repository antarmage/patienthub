import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useApp } from "@/context/AppContext";
import { calculateEDD, formatDate } from "@/data/pregnancyData";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile, updateProfile, logout, selectedWeek } = useApp();

  const [name, setName] = useState(userProfile?.name || "");
  const [lmpDay, setLmpDay] = useState("");
  const [lmpMonth, setLmpMonth] = useState("");
  const [lmpYear, setLmpYear] = useState("");
  const [eddDisplay, setEddDisplay] = useState("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;

  useEffect(() => {
    if (userProfile?.lmpDate) {
      const lmp = new Date(userProfile.lmpDate);
      setLmpDay(String(lmp.getDate()));
      setLmpMonth(String(lmp.getMonth() + 1));
      setLmpYear(String(lmp.getFullYear()));
      setEddDisplay(formatDate(calculateEDD(lmp)));
    }
    if (userProfile?.name) setName(userProfile.name);
  }, [userProfile]);

  useEffect(() => {
    if (lmpDay && lmpMonth && lmpYear) {
      const d = parseInt(lmpDay, 10), m = parseInt(lmpMonth, 10) - 1, y = parseInt(lmpYear, 10);
      if (d > 0 && d <= 31 && m >= 0 && m <= 11 && y >= 2020) {
        const lmp = new Date(y, m, d);
        if (!isNaN(lmp.getTime())) setEddDisplay(formatDate(calculateEDD(lmp)));
      }
    }
  }, [lmpDay, lmpMonth, lmpYear]);

  const handleSave = async () => {
    let lmpDate: string | null = null, eddDate: string | null = null;
    if (lmpDay && lmpMonth && lmpYear) {
      const d = parseInt(lmpDay, 10), m = parseInt(lmpMonth, 10) - 1, y = parseInt(lmpYear, 10);
      const lmp = new Date(y, m, d);
      if (!isNaN(lmp.getTime())) { lmpDate = lmp.toISOString(); eddDate = calculateEDD(lmp).toISOString(); }
    }
    await updateProfile({ name, lmpDate, eddDate });
    setSaved(true); setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    if (Platform.OS === "web") { logout(); return; }
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: topPad, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 100, paddingHorizontal: Spacing.lg }} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: COLORS.lavender }]}>
          <ThemedText type="h1" style={{ color: COLORS.primary }}>{(userProfile?.name || "M").charAt(0).toUpperCase()}</ThemedText>
        </View>
        <ThemedText type="h2" style={{ marginTop: Spacing.md }}>{userProfile?.name || "Mama"}</ThemedText>
        <View style={[styles.badge, { backgroundColor: COLORS.lavender }]}>
          <ThemedText type="small" style={{ color: COLORS.primary, fontWeight: "600" }}>Week {selectedWeek} · Trimester {trimester}</ThemedText>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Week" value={String(selectedWeek)} />
        <StatBox label="Trimester" value={`T${trimester}`} />
        <StatBox label="Due In" value={userProfile?.eddDate ? `${Math.max(0, Math.ceil((new Date(userProfile.eddDate).getTime() - Date.now()) / 86400000))}d` : "—"} />
      </View>

      {/* Profile form */}
      <View style={[styles.section, Shadows.card]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Pregnancy Details</ThemedText>
          <Pressable onPress={() => setEditing(!editing)}>
            <Feather name={editing ? "x" : "edit-2"} size={18} color={COLORS.primary} />
          </Pressable>
        </View>

        {editing ? (
          <>
            <Field label="Name">
              <TextInput value={name} onChangeText={setName} style={[styles.input, { color: COLORS.textPrimary }]} placeholder="Your name" placeholderTextColor={COLORS.textMuted} />
            </Field>
            <ThemedText type="small" style={styles.fieldLabel}>Last Menstrual Period (LMP)</ThemedText>
            <View style={styles.dateRow}>
              <TextInput style={[styles.dateInput, styles.input, { color: COLORS.textPrimary }]} value={lmpDay} onChangeText={setLmpDay} keyboardType="numeric" maxLength={2} placeholder="DD" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.dateInput, styles.input, { color: COLORS.textPrimary }]} value={lmpMonth} onChangeText={setLmpMonth} keyboardType="numeric" maxLength={2} placeholder="MM" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.dateInputYear, styles.input, { color: COLORS.textPrimary }]} value={lmpYear} onChangeText={setLmpYear} keyboardType="numeric" maxLength={4} placeholder="YYYY" placeholderTextColor={COLORS.textMuted} />
            </View>
            {eddDisplay ? <ThemedText type="small" style={styles.eddText}>EDD: {eddDisplay}</ThemedText> : null}
            <Button onPress={handleSave} style={{ marginTop: Spacing.lg }}>
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </>
        ) : (
          <>
            <InfoRow icon="user" label="Name" value={userProfile?.name || "Not set"} />
            <InfoRow icon="calendar" label="LMP Date" value={userProfile?.lmpDate ? new Date(userProfile.lmpDate).toLocaleDateString("en-IN") : "Not set"} />
            <InfoRow icon="gift" label="Due Date (EDD)" value={eddDisplay || "Not set"} />
            <InfoRow icon="phone" label="Phone" value={userProfile?.phone || "Not set"} />
          </>
        )}
      </View>

      {/* Logout */}
      <Pressable style={[styles.logoutBtn, Shadows.card]} onPress={handleLogout}>
        <Feather name="log-out" size={18} color={COLORS.error} />
        <ThemedText type="body" style={{ color: COLORS.error }}>Log Out</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={[sbStyles.box, Shadows.card]}>
      <ThemedText type="h3" style={{ color: COLORS.primary }}>{value}</ThemedText>
      <ThemedText type="small" style={{ color: COLORS.textMuted }}>{label}</ThemedText>
    </View>
  );
}
const sbStyles = StyleSheet.create({ box: { flex: 1, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: "center", gap: 2 } });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ marginBottom: Spacing.md }}><ThemedText type="small" style={styles.fieldLabel}>{label}</ThemedText>{children}</View>;
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: COLORS.lavender }]}>
        <Feather name={icon} size={16} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={{ color: COLORS.textMuted }}>{label}</ThemedText>
        <ThemedText type="body">{value}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  avatarSection: { alignItems: "center", marginBottom: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  badge: { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statsRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl },
  section: { backgroundColor: "#FFF", borderRadius: BorderRadius["2xl"], padding: Spacing.xl, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  fieldLabel: { color: COLORS.textMuted, marginBottom: Spacing.xs, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#E5E5E7", borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 15 },
  dateRow: { flexDirection: "row", gap: Spacing.sm },
  dateInput: { flex: 1 },
  dateInputYear: { flex: 2 },
  eddText: { color: COLORS.primary, fontWeight: "600", marginTop: Spacing.sm },
  infoRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  infoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl },
});
