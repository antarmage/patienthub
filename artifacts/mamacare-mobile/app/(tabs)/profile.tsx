import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp } from "@/context/AppContext";
import { calculateEDD, formatDate } from "@/data/pregnancyData";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

interface SettingsItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userProfile, updateProfile, logout, selectedWeek } = useApp();

  const [name, setName] = useState(userProfile?.name || "");
  const [lmpDay, setLmpDay] = useState("");
  const [lmpMonth, setLmpMonth] = useState("");
  const [lmpYear, setLmpYear] = useState("");
  const [eddDisplay, setEddDisplay] = useState("");
  const [saved, setSaved] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;

  useEffect(() => {
    if (userProfile?.lmpDate) {
      const lmp = new Date(userProfile.lmpDate);
      setLmpDay(lmp.getDate().toString());
      setLmpMonth((lmp.getMonth() + 1).toString());
      setLmpYear(lmp.getFullYear().toString());
      const edd = calculateEDD(lmp);
      setEddDisplay(formatDate(edd));
    }
    if (userProfile?.name) {
      setName(userProfile.name);
    }
  }, [userProfile]);

  useEffect(() => {
    if (lmpDay && lmpMonth && lmpYear) {
      const day = parseInt(lmpDay, 10);
      const month = parseInt(lmpMonth, 10) - 1;
      const year = parseInt(lmpYear, 10);
      if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2024) {
        const lmpDate = new Date(year, month, day);
        if (!isNaN(lmpDate.getTime())) {
          const edd = calculateEDD(lmpDate);
          setEddDisplay(formatDate(edd));
        }
      }
    }
  }, [lmpDay, lmpMonth, lmpYear]);

  const handleSave = async () => {
    let lmpDate: string | null = null;
    let eddDate: string | null = null;

    if (lmpDay && lmpMonth && lmpYear) {
      const day = parseInt(lmpDay, 10);
      const month = parseInt(lmpMonth, 10) - 1;
      const year = parseInt(lmpYear, 10);
      const lmp = new Date(year, month, day);
      if (!isNaN(lmp.getTime())) {
        lmpDate = lmp.toISOString();
        const edd = calculateEDD(lmp);
        eddDate = edd.toISOString();
      }
    }

    await updateProfile({
      name,
      phone: userProfile?.phone || "",
      lmpDate,
      eddDate,
    });

    setSaved(true);
    setShowEditProfile(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
  };

  const accountItems: SettingsItem[] = [
    {
      id: "notifications",
      icon: "bell",
      iconBg: "#EFF6FF",
      iconColor: "#3B82F6",
      title: "Notifications",
      subtitle: "Manage alerts",
    },
    {
      id: "preferences",
      icon: "settings",
      iconBg: "#F5F3FF",
      iconColor: "#6C63FF",
      title: "Preferences",
      subtitle: "App settings",
    },
  ];

  const healthItems: SettingsItem[] = [
    {
      id: "devices",
      icon: "watch",
      iconBg: "#ECFDF5",
      iconColor: "#10B981",
      title: "Health & Devices",
      subtitle: "Connected",
    },
    {
      id: "emergency",
      icon: "phone",
      iconBg: "#FEF3C7",
      iconColor: "#F59E0B",
      title: "Emergency Contact",
      subtitle: userProfile?.name ? `Family` : "Not set",
    },
  ];

  const displayName = userProfile?.name || "Mummy";

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["2xl"],
      }}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color="#6C63FF" />
          </View>
          <Pressable
            style={styles.editAvatarButton}
            onPress={() => setShowEditProfile(!showEditProfile)}
          >
            <Feather name="edit-2" size={12} color="#FFFFFF" />
          </Pressable>
        </View>
        <ThemedText style={styles.userName}>{displayName}</ThemedText>
        <ThemedText style={styles.userSubtitle}>
          {eddDisplay ? `Due ${eddDisplay}` : `Week ${selectedWeek}`} · {trimester === 1 ? "First" : trimester === 2 ? "Second" : "Third"} Baby
        </ThemedText>
      </View>

      {showEditProfile && (
        <View style={styles.editSection}>
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Edit Profile</ThemedText>

            <ThemedText style={styles.inputLabel}>Your Name</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />

            <ThemedText style={styles.inputLabel}>Last Menstrual Period</ThemedText>
            <View style={styles.dateInputRow}>
              <TextInput
                style={styles.dateInput}
                placeholder="DD"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={lmpDay}
                onChangeText={setLmpDay}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="MM"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={lmpMonth}
                onChangeText={setLmpMonth}
              />
              <TextInput
                style={[styles.dateInput, { flex: 1.5 }]}
                placeholder="YYYY"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                value={lmpYear}
                onChangeText={setLmpYear}
              />
            </View>

            {eddDisplay ? (
              <View style={styles.eddBanner}>
                <Feather name="calendar" size={18} color="#6C63FF" />
                <View style={styles.eddTextWrap}>
                  <ThemedText style={styles.eddLabel}>Expected Due Date</ThemedText>
                  <ThemedText style={styles.eddValue}>{eddDisplay}</ThemedText>
                </View>
              </View>
            ) : null}

            <Button onPress={handleSave} style={styles.saveButton}>
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>
        <View style={styles.card}>
          {accountItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.settingsItem,
                index < accountItems.length - 1 && styles.settingsItemBorder,
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.settingsIcon, { backgroundColor: item.iconBg }]}>
                <Feather name={item.icon} size={18} color={item.iconColor} />
              </View>
              <View style={styles.settingsText}>
                <ThemedText style={styles.settingsTitle}>{item.title}</ThemedText>
                {item.subtitle && (
                  <ThemedText style={styles.settingsSubtitle}>{item.subtitle}</ThemedText>
                )}
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Health & Devices</ThemedText>
        <View style={styles.card}>
          {healthItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.settingsItem,
                index < healthItems.length - 1 && styles.settingsItemBorder,
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.settingsIcon, { backgroundColor: item.iconBg }]}>
                <Feather name={item.icon} size={18} color={item.iconColor} />
              </View>
              <View style={styles.settingsText}>
                <ThemedText style={styles.settingsTitle}>{item.title}</ThemedText>
                {item.subtitle && (
                  <ThemedText style={styles.settingsSubtitle}>{item.subtitle}</ThemedText>
                )}
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.logoutCard} onPress={handleLogout}>
          <View style={styles.logoutIcon}>
            <Feather name="log-out" size={18} color="#EF4444" />
          </View>
          <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.versionText}>MummyCare v1.0.0</ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: Spacing.sm,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
  },
  editSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 6,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  dateInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  eddBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  eddTextWrap: {
    marginLeft: Spacing.sm,
  },
  eddLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eddValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  saveButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#EF4444",
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
