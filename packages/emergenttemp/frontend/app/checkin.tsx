import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

const STEPS = [
  { key: "mood", label: "Overall mood", low: "Low", high: "Good", type: "slider" },
  { key: "anxiety", label: "Anxiety today", low: "None", high: "High", type: "slider", inverse: true },
  { key: "overwhelm", label: "Feeling overwhelmed", low: "Not at all", high: "A lot", type: "slider", inverse: true },
  { key: "enjoyment", label: "Enjoying moments", low: "Rarely", high: "Often", type: "slider" },
  { key: "pain", label: "Physical pain", low: "None", high: "Severe", type: "slider", inverse: true },
  { key: "bleeding", label: "Bleeding today", low: "None", high: "Heavy", type: "slider", inverse: true },
  { key: "energy", label: "Energy level", low: "Depleted", high: "Energetic", type: "slider" },
  { key: "sleep_hours", label: "Sleep last night", low: "0h", high: "10h", type: "sleep" },
  { key: "hydration", label: "Cups of water", low: "0", high: "8+", type: "hydration" },
  { key: "symptoms", label: "Any of these?", type: "symptoms" },
];

const SYMPTOM_OPTIONS = [
  { key: "fever", label: "Fever" },
  { key: "heavy_bleeding", label: "Heavy bleeding" },
  { key: "wound_pain", label: "Wound pain" },
  { key: "breast_pain", label: "Breast pain" },
  { key: "headache", label: "Bad headache" },
  { key: "intrusive_thoughts", label: "Intrusive thoughts" },
];

export default function CheckIn() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<any>({
    mood: 6, anxiety: 4, overwhelm: 4, enjoyment: 6, pain: 3, bleeding: 3, energy: 5,
    sleep_hours: 6, hydration: 5, symptoms: [], notes: "",
  });

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch("/checkins", { method: "POST", body: JSON.stringify(answers) });
      await apiFetch("/care-plan/complete", { method: "POST", body: JSON.stringify({ task_id: "checkin" }) });
      router.replace("/(tabs)/home");
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step === 0 ? router.back() : setStep(step - 1))} testID="checkin-back">
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.progressBar, i <= step && styles.progressBarActive]} />
            ))}
          </View>
          <Text style={styles.stepNum}>{step + 1}/{STEPS.length}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>DAILY CHECK-IN</Text>
          <Text style={styles.display}>{cur.label}</Text>

          {cur.type === "slider" && (
            <>
              <Slider11 value={answers[cur.key]} onChange={(v) => setAnswers({ ...answers, [cur.key]: v })} inverse={(cur as any).inverse} testID={`slider-${cur.key}`} />
              <View style={styles.scaleRow}>
                <Text style={styles.scaleText}>{cur.low}</Text>
                <Text style={styles.scaleText}>{cur.high}</Text>
              </View>
            </>
          )}

          {cur.type === "sleep" && (
            <View style={styles.centered}>
              <Text style={styles.bigNumber}>{answers.sleep_hours}h</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setAnswers({ ...answers, sleep_hours: Math.max(0, answers.sleep_hours - 0.5) })} style={styles.stepBtn} testID="sleep-minus">
                  <MaterialCommunityIcons name="minus" size={24} color={colors.onSurface} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAnswers({ ...answers, sleep_hours: Math.min(12, answers.sleep_hours + 0.5) })} style={styles.stepBtn} testID="sleep-plus">
                  <MaterialCommunityIcons name="plus" size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {cur.type === "hydration" && (
            <View style={styles.centered}>
              <Text style={styles.bigNumber}>{answers.hydration} cups</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setAnswers({ ...answers, hydration: Math.max(0, answers.hydration - 1) })} style={styles.stepBtn} testID="hyd-minus">
                  <MaterialCommunityIcons name="minus" size={24} color={colors.onSurface} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAnswers({ ...answers, hydration: Math.min(15, answers.hydration + 1) })} style={styles.stepBtn} testID="hyd-plus">
                  <MaterialCommunityIcons name="plus" size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {cur.type === "symptoms" && (
            <View style={styles.symptomsWrap}>
              {SYMPTOM_OPTIONS.map((s) => {
                const sel = answers.symptoms.includes(s.key);
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.symptomChip, sel && styles.symptomChipSelected]}
                    onPress={() => {
                      const next = sel ? answers.symptoms.filter((k: string) => k !== s.key) : [...answers.symptoms, s.key];
                      setAnswers({ ...answers, symptoms: next });
                    }}
                    testID={`symptom-${s.key}`}
                  >
                    <Text style={[styles.symptomText, sel && styles.symptomTextSel]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TextInput
                value={answers.notes}
                onChangeText={(v) => setAnswers({ ...answers, notes: v })}
                placeholder="Anything else you want to note? (optional)"
                placeholderTextColor={colors.muted}
                style={styles.notes}
                multiline
                testID="checkin-notes"
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => (isLast ? submit() : setStep(step + 1))}
            disabled={busy}
            testID="checkin-continue"
          >
            {busy ? <ActivityIndicator color={colors.onBrand} /> : (
              <>
                <Text style={styles.primaryText}>{isLast ? "Finish check-in" : "Continue"}</Text>
                <MaterialCommunityIcons name={isLast ? "check" : "arrow-right"} size={18} color={colors.onBrand} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Slider11({ value, onChange, inverse, testID }: { value: number; onChange: (v: number) => void; inverse?: boolean; testID?: string }) {
  return (
    <View style={styles.slider11} testID={testID}>
      {Array.from({ length: 10 }).map((_, i) => {
        const n = i + 1;
        const sel = n <= value;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={[styles.slider11Dot, sel && { backgroundColor: inverse ? colors.warning : colors.brand, borderColor: inverse ? colors.warning : colors.brand }]}
            testID={`${testID}-${n}`}
          >
            <Text style={[styles.slider11Num, sel && { color: colors.onBrand }]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  progressRow: { flex: 1, flexDirection: "row", gap: 3 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressBarActive: { backgroundColor: colors.brand },
  stepNum: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 32, color: colors.onSurface, marginTop: spacing.sm, letterSpacing: -0.5, marginBottom: spacing.xl2 },
  slider11: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  slider11Dot: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  slider11Num: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary },
  scaleRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  scaleText: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary },
  centered: { alignItems: "center", marginTop: spacing.xl },
  bigNumber: { fontFamily: fonts.display, fontSize: 56, color: colors.brand },
  stepper: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xl },
  stepBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  symptomsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  symptomChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  symptomChipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  symptomText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary },
  symptomTextSel: { color: colors.onBrand, fontWeight: "500" },
  notes: { width: "100%", minHeight: 80, marginTop: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontFamily: fonts.text, fontSize: 14, color: colors.onSurface },
  footer: { padding: spacing.xl, paddingTop: spacing.sm },
  primary: { backgroundColor: colors.brand, height: 52, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryText: { fontFamily: fonts.text, color: colors.onBrand, fontSize: 16, fontWeight: "500" },
});
