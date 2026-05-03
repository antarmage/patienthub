import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const KEY = "@saiviemom_pp_mental_health";

const QUESTIONS = [
  { id: "mood", label: "How has your overall mood been?", low: "Very low", high: "Very good" },
  { id: "anxiety", label: "How much have you felt anxious or overwhelmed?", low: "Not at all", high: "Constantly" },
  { id: "cope", label: "How well have you felt able to cope?", low: "Not at all", high: "Very well" },
];

const RESOURCES = [
  { icon: "phone" as const, title: "iCall Helpline", desc: "Free mental health support", link: "9152987821" },
  { icon: "message-circle" as const, title: "Vandrevala Foundation", desc: "24/7 counseling helpline", link: "1860-2662-345" },
  { icon: "heart" as const, title: "Talk to your clinician", desc: "Reach out through Saivie for a referral" },
];

function concerningScore(answers: Record<string, number>): boolean {
  const mood = answers["mood"] ?? 3;
  const anxiety = answers["anxiety"] ?? 3;
  const cope = answers["cope"] ?? 3;
  return mood <= 2 || anxiety >= 4 || cope <= 2;
}

export default function PostpartumMentalHealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedDate, setSavedDate] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY).then((v) => {
        if (v) {
          const data = JSON.parse(v);
          setAnswers(data.answers ?? {});
          setSavedDate(data.date ?? null);
          setSubmitted(true);
        }
      });
    }, [])
  );

  const setScore = (qId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: score }));
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < QUESTIONS.length) return;
    const today = new Date().toISOString().split("T")[0];
    await AsyncStorage.setItem(KEY, JSON.stringify({ answers, date: today }));
    setSavedDate(today);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const concerning = submitted && concerningScore(answers);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerName}>Mental Health Check-in</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing["4xl"] }}
        showsVerticalScrollIndicator={false}
      >
        {submitted && savedDate && (
          <View style={styles.savedBadge}>
            <Feather name="check-circle" size={14} color="#6C63FF" />
            <ThemedText style={styles.savedText}>Last check-in: {savedDate}</ThemedText>
            <Pressable onPress={handleReset}><ThemedText style={styles.resetText}>Redo</ThemedText></Pressable>
          </View>
        )}

        {concerning && (
          <View style={styles.warningCard}>
            <Feather name="alert-triangle" size={20} color="#DC2626" style={{ marginRight: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.warningTitle}>Please reach out for support</ThemedText>
              <ThemedText style={styles.warningText}>
                Your responses suggest you may be experiencing postnatal distress. You are not alone — please talk to your clinician or a helpline today.
              </ThemedText>
            </View>
          </View>
        )}

        {!submitted && (
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoText}>
              Answer honestly — your responses are private and only stored on your device.
            </ThemedText>
          </View>
        )}

        {QUESTIONS.map((q) => (
          <View key={q.id} style={styles.questionCard}>
            <ThemedText style={styles.questionLabel}>{q.label}</ThemedText>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable
                  key={score}
                  style={[styles.scoreBtn, answers[q.id] === score && styles.scoreBtnActive]}
                  onPress={() => setScore(q.id, score)}
                  disabled={submitted}
                >
                  <ThemedText style={[styles.scoreBtnText, answers[q.id] === score && styles.scoreBtnTextActive]}>
                    {score}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.scaleLabelRow}>
              <ThemedText style={styles.scaleLabel}>{q.low}</ThemedText>
              <ThemedText style={styles.scaleLabel}>{q.high}</ThemedText>
            </View>
          </View>
        ))}

        {!submitted && (
          <Pressable
            style={[styles.submitBtn, Object.keys(answers).length < QUESTIONS.length && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={Object.keys(answers).length < QUESTIONS.length}
          >
            <ThemedText style={styles.submitBtnText}>Submit Check-in</ThemedText>
          </Pressable>
        )}

        {submitted && !concerning && (
          <View style={styles.okCard}>
            <Feather name="smile" size={22} color="#6C63FF" />
            <ThemedText style={styles.okText}>You're doing well. Keep taking care of yourself!</ThemedText>
          </View>
        )}

        <ThemedText style={styles.resourcesTitle}>Mental Health Resources</ThemedText>
        {RESOURCES.map((r, i) => (
          <View key={i} style={styles.resourceCard}>
            <View style={styles.resourceIcon}>
              <Feather name={r.icon} size={18} color="#A855F7" />
            </View>
            <View style={styles.resourceText}>
              <ThemedText style={styles.resourceTitle}>{r.title}</ThemedText>
              <ThemedText style={styles.resourceDesc}>{r.desc}</ThemedText>
              {r.link && <ThemedText style={styles.resourceLink}>{r.link}</ThemedText>}
            </View>
          </View>
        ))}
      </ScrollView>
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
  headerName: { flex: 1, fontSize: 17, fontWeight: "600", color: COLORS.textPrimary },
  scroll: { flex: 1 },
  savedBadge: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    backgroundColor: "#F5F3FF", borderRadius: 10, padding: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  savedText: { flex: 1, fontSize: 13, color: "#6C63FF" },
  resetText: { fontSize: 13, color: "#6C63FF", fontWeight: "600" },
  warningCard: {
    flexDirection: "row", backgroundColor: "#FEF2F2", borderRadius: 14,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: "#FEE2E2",
  },
  warningTitle: { fontSize: 14, fontWeight: "700", color: "#DC2626", marginBottom: 4 },
  warningText: { fontSize: 13, color: "#B91C1C", lineHeight: 19 },
  infoCard: {
    backgroundColor: "#F5F3FF", borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: { fontSize: 13, color: "#6C63FF", lineHeight: 18 },
  questionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: "#F3F4F6",
  },
  questionLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: Spacing.md, lineHeight: 20 },
  scaleRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xs },
  scoreBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#E5E7EB",
    alignItems: "center", backgroundColor: "#F9FAFB",
  },
  scoreBtnActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  scoreBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.textMuted },
  scoreBtnTextActive: { color: "#FFFFFF" },
  scaleLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabel: { fontSize: 10, color: COLORS.textMuted },
  submitBtn: {
    backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: Spacing.xl,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: "#C4C1F4", shadowOpacity: 0, elevation: 0 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  okCard: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    backgroundColor: "#F5F3FF", borderRadius: 14, padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  okText: { fontSize: 14, color: "#6C63FF", flex: 1, lineHeight: 20 },
  resourcesTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: Spacing.md },
  resourceCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: Spacing.md,
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: "#F3F4F6",
  },
  resourceIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#FDF4FF",
    alignItems: "center", justifyContent: "center",
  },
  resourceText: { flex: 1 },
  resourceTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  resourceDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  resourceLink: { fontSize: 13, color: "#A855F7", fontWeight: "600", marginTop: 2 },
});
