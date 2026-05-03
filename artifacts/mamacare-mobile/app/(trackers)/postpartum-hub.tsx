import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const BABY_DOB_KEY = "@saiviemom_pp_baby_dob";

interface HubCard {
  id: string;
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  bg: string;
  iconColor: string;
  route: string;
}

const RECOVERY_CARDS: HubCard[] = [
  { id: "vaccines", label: "Vaccines", desc: "Postpartum vaccine checklist", icon: "shield", bg: "#ECFDF5", iconColor: "#10B981", route: "/(trackers)/pp-vaccines" },
  { id: "lactation", label: "Lactation", desc: "Breastfeeding tips & support", icon: "droplet", bg: "#EFF6FF", iconColor: "#3B82F6", route: "/(trackers)/pp-lactation" },
  { id: "mental", label: "Mental Health", desc: "Mood check-in & resources", icon: "smile", bg: "#FDF4FF", iconColor: "#A855F7", route: "/(trackers)/pp-mental-health" },
  { id: "fitness", label: "Fitness", desc: "Week-by-week recovery plan", icon: "activity", bg: "#FFF7ED", iconColor: "#F97316", route: "/(trackers)/pp-fitness" },
  { id: "massage", label: "Massage", desc: "Guide & timing recommendations", icon: "heart", bg: "#FFF1F2", iconColor: "#F43F5E", route: "/(trackers)/pp-massage" },
  { id: "weight", label: "Weight Program", desc: "Safe gradual weight loss", icon: "trending-down", bg: "#F0FDF4", iconColor: "#22C55E", route: "/(trackers)/pp-weight-loss" },
];

const BABY_CARDS: HubCard[] = [
  { id: "m06", label: "0–6 Month Milestones", desc: "Development checkpoints", icon: "star", bg: "#F5F3FF", iconColor: "#6C63FF", route: "/(trackers)/pp-milestones-early" },
  { id: "m612", label: "6–12 Month Milestones", desc: "Growth & learning stages", icon: "star", bg: "#FDF4FF", iconColor: "#A855F7", route: "/(trackers)/pp-milestones-late" },
  { id: "bvax", label: "Baby Vaccines", desc: "Schedule & reminders", icon: "shield", bg: "#FFFBEB", iconColor: "#F59E0B", route: "/(trackers)/pp-baby-vaccines" },
];

function recoveryWeekFromDOB(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export default function PostpartumHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [babyDob, setBabyDob] = useState<string | null>(null);
  const [showDobModal, setShowDobModal] = useState(false);
  const [dobInput, setDobInput] = useState("");

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(BABY_DOB_KEY).then((val) => {
        if (val) {
          setBabyDob(val);
        } else {
          setShowDobModal(true);
        }
      });
    }, [])
  );

  const handleSaveDob = async () => {
    const d = new Date(dobInput);
    if (isNaN(d.getTime()) || d > new Date()) {
      Alert.alert("Invalid date", "Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
    await AsyncStorage.setItem(BABY_DOB_KEY, dobInput);
    setBabyDob(dobInput);
    setShowDobModal(false);
  };

  const recoveryWeek = babyDob ? recoveryWeekFromDOB(babyDob) : null;

  const renderCard = (card: HubCard) => (
    <Pressable
      key={card.id}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
      onPress={() => router.push(card.route as any)}
    >
      <View style={[styles.cardIcon, { backgroundColor: card.bg }]}>
        <Feather name={card.icon} size={22} color={card.iconColor} />
      </View>
      <View style={styles.cardText}>
        <ThemedText style={styles.cardLabel}>{card.label}</ThemedText>
        <ThemedText style={styles.cardDesc}>{card.desc}</ThemedText>
      </View>
      <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText style={styles.headerName}>Postpartum Care Hub</ThemedText>
          {recoveryWeek && (
            <ThemedText style={styles.headerSub}>Recovery Week {recoveryWeek}</ThemedText>
          )}
        </View>
        <Pressable onPress={() => setShowDobModal(true)}>
          <Feather name="edit-2" size={18} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bannerCard}>
          <View style={styles.bannerLeft}>
            <ThemedText style={styles.bannerEmoji}>🌸</ThemedText>
            <View>
              <ThemedText style={styles.bannerTitle}>Welcome back, Mama</ThemedText>
              <ThemedText style={styles.bannerSub}>
                {recoveryWeek
                  ? `Week ${recoveryWeek} of recovery — you're doing great!`
                  : "Your postpartum journey starts here"}
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText style={styles.sectionLabel}>YOUR RECOVERY</ThemedText>
        <View style={styles.cardList}>
          {RECOVERY_CARDS.map(renderCard)}
        </View>

        <ThemedText style={styles.sectionLabel}>YOUR BABY</ThemedText>
        <View style={styles.cardList}>
          {BABY_CARDS.map(renderCard)}
        </View>
      </ScrollView>

      <Modal visible={showDobModal} transparent animationType="slide" onRequestClose={() => { if (babyDob) setShowDobModal(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Baby's Date of Birth</ThemedText>
            <ThemedText style={styles.modalSub}>
              Enter your baby's birth date to personalise milestones and vaccine schedules.
            </ThemedText>
            <TextInput
              style={styles.dobInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={dobInput}
              onChangeText={setDobInput}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveDob}>
              <ThemedText style={styles.saveBtnText}>Save</ThemedText>
            </Pressable>
            {babyDob && (
              <Pressable onPress={() => setShowDobModal(false)} style={{ marginTop: Spacing.md, alignItems: "center" }}>
                <ThemedText style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancel</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFC" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm, marginLeft: -Spacing.sm },
  headerTitle: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: "600", color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  scroll: { flex: 1 },
  bannerCard: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.xl, marginBottom: Spacing.lg,
    backgroundColor: "#FFF0F6", borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, borderColor: "#FFD6E7",
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  bannerEmoji: { fontSize: 32 },
  bannerTitle: { fontSize: 15, fontWeight: "700", color: "#DB2777" },
  bannerSub: { fontSize: 13, color: "#BE185D", marginTop: 2, maxWidth: "85%" },
  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: COLORS.textMuted,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
    letterSpacing: 0.8,
  },
  cardList: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xl, gap: Spacing.sm },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    padding: Spacing.md, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginRight: Spacing.md,
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
  cardDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing["2xl"],
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary, marginBottom: Spacing.sm },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: Spacing.xl },
  dobInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    fontSize: 18, color: COLORS.textPrimary, textAlign: "center",
    letterSpacing: 2, marginBottom: Spacing.lg,
  },
  saveBtn: {
    backgroundColor: "#6C63FF", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
