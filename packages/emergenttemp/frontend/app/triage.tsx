import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

type Symptom = "bleeding" | "mood" | "pain";
type StageStep = { q: string; key: string; type: "choice" | "yesno" | "count" | "severity"; options?: { key: string; label: string }[] };

const FLOWS: Record<Symptom, StageStep[]> = {
  bleeding: [
    { q: "How heavy is your bleeding today?", key: "heaviness", type: "choice", options: [
      { key: "light", label: "Light — spotting" },
      { key: "moderate", label: "Moderate — regular pads" },
      { key: "soaking", label: "Soaking a pad in under an hour" },
    ] },
    { q: "Any large clots (bigger than a walnut)?", key: "large_clots", type: "yesno" },
    { q: "Do you have a fever?", key: "fever", type: "yesno" },
    { q: "Do you feel dizzy or lightheaded?", key: "dizzy", type: "yesno" },
  ],
  mood: [
    { q: "How many days have you felt overwhelmed?", key: "overwhelmed_days", type: "count" },
    { q: "Any intrusive or distressing thoughts?", key: "intrusive_thoughts", type: "yesno" },
  ],
  pain: [
    { q: "How severe is the pain, on 1-10?", key: "severity", type: "severity" },
  ],
};

export default function Triage() {
  const router = useRouter();
  const [symptom, setSymptom] = useState<Symptom | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const startFlow = (s: Symptom) => {
    setSymptom(s);
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  const submit = async (finalAnswers: Record<string, any>) => {
    if (!symptom) return;
    setBusy(true);
    try {
      const r = await apiFetch("/symptoms/triage", { method: "POST", body: JSON.stringify({ symptom, answers: finalAnswers }) });
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  const answer = (val: any) => {
    if (!symptom) return;
    const flow = FLOWS[symptom];
    const cur = flow[step];
    const next = { ...answers, [cur.key]: val };
    setAnswers(next);
    if (step === flow.length - 1) submit(next);
    else setStep(step + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="triage-back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Is this normal?</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!symptom && (
          <View>
            <Text style={styles.eyebrow}>GUIDED TRIAGE</Text>
            <Text style={styles.display}>What's on your mind?</Text>
            <Text style={styles.sub}>A few gentle questions — we won't diagnose, but we'll help you decide what to do next.</Text>

            <TouchableOpacity style={styles.optionCard} onPress={() => startFlow("bleeding")} testID="opt-bleeding">
              <MaterialCommunityIcons name="water" size={22} color={colors.brand} />
              <Text style={styles.optionText}>My bleeding feels different</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceTertiary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionCard} onPress={() => startFlow("mood")} testID="opt-mood">
              <MaterialCommunityIcons name="cloud-outline" size={22} color={colors.brand} />
              <Text style={styles.optionText}>My mood or thoughts feel off</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceTertiary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionCard} onPress={() => startFlow("pain")} testID="opt-pain">
              <MaterialCommunityIcons name="lightning-bolt-outline" size={22} color={colors.brand} />
              <Text style={styles.optionText}>I have pain</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceTertiary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          </View>
        )}

        {symptom && !result && !busy && (
          <View>
            <Text style={styles.qNumber}>Q{step + 1} of {FLOWS[symptom].length}</Text>
            <Text style={styles.qText}>{FLOWS[symptom][step].q}</Text>
            {renderQuestion(FLOWS[symptom][step], answer)}
          </View>
        )}

        {busy && (
          <View style={{ marginTop: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        )}

        {result && (
          <View style={[styles.resultCard, resultStyle(result.level)]}>
            <MaterialCommunityIcons
              name={result.level === "urgent" ? "alert-octagon" : result.level === "contact" ? "phone-outline" : "check-circle-outline"}
              size={36}
              color={resultIconColor(result.level)}
            />
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultMsg}>{result.message}</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} testID="triage-done">
              <Text style={styles.doneText}>{result.level === "urgent" ? "Call my care team" : "Okay"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderQuestion(step: StageStep, answer: (v: any) => void) {
  if (step.type === "choice") {
    return (
      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        {step.options!.map((o) => (
          <TouchableOpacity key={o.key} style={styles.optionBtn} onPress={() => answer(o.key)} testID={`ans-${o.key}`}>
            <Text style={styles.optionBtnText}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  if (step.type === "yesno") {
    return (
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xl }}>
        <TouchableOpacity style={[styles.optionBtn, { flex: 1 }]} onPress={() => answer(false)} testID="ans-no">
          <Text style={styles.optionBtnText}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionBtn, { flex: 1 }]} onPress={() => answer(true)} testID="ans-yes">
          <Text style={styles.optionBtnText}>Yes</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (step.type === "count") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.xl }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <TouchableOpacity key={n} style={styles.numChip} onPress={() => answer(n)} testID={`ans-num-${n}`}>
            <Text style={styles.numText}>{n === 7 ? "7+" : n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  if (step.type === "severity") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.xl }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <TouchableOpacity key={n} style={styles.numChip} onPress={() => answer(n)} testID={`ans-sev-${n}`}>
            <Text style={styles.numText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  return null;
}

function resultStyle(level: string) {
  if (level === "urgent") return { backgroundColor: colors.alertBg, borderColor: colors.alertBorder };
  if (level === "contact") return { backgroundColor: colors.warnBg, borderColor: colors.warnBorder };
  return { backgroundColor: colors.successBg, borderColor: colors.successBorder };
}
function resultIconColor(level: string) {
  if (level === "urgent") return colors.error;
  if (level === "contact") return colors.warning;
  return colors.success;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 32, color: colors.onSurface, marginTop: 2, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary, marginTop: spacing.md, lineHeight: 22, marginBottom: spacing.xl },
  optionCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  optionText: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface },
  qNumber: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  qText: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginTop: spacing.sm, lineHeight: 32 },
  optionBtn: { padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  optionBtnText: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, textAlign: "center" },
  numChip: { width: 56, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface },
  resultCard: { marginTop: spacing.xl, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, alignItems: "center" },
  resultTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface, marginTop: spacing.md, textAlign: "center" },
  resultMsg: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.md, textAlign: "center", lineHeight: 22 },
  doneBtn: { marginTop: spacing.lg, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  doneText: { fontFamily: fonts.text, color: colors.onBrand, fontSize: 15, fontWeight: "500" },
});
