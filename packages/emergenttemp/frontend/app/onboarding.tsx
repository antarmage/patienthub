import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const DELIVERY_TYPES = [
  { key: "vaginal", label: "Vaginal" },
  { key: "c_section", label: "C-section" },
  { key: "assisted", label: "Assisted" },
];
const FEEDING = [
  { key: "breastfeeding", label: "Breastfeeding" },
  { key: "mixed", label: "Mixed feeding" },
  { key: "formula", label: "Formula" },
];
const SUPPORT = [
  { key: "high", label: "Strong" },
  { key: "moderate", label: "Some" },
  { key: "low", label: "Limited" },
];

export default function Onboarding() {
  const router = useRouter();
  const { markOnboarded } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({
    age: "",
    location: "",
    daysAgo: "",
    delivery_type: "vaginal",
    baby_name: "",
    feeding_method: "breastfeeding",
    support_system: "moderate",
    mood: 6,
    pain: 4,
  });

  const totalSteps = 4;
  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setBusy(true);
    try {
      const daysAgo = parseInt(state.daysAgo || "0", 10);
      const delivery_date = new Date(Date.now() - daysAgo * 86400000).toISOString();
      await apiFetch("/mothers/onboarding", {
        method: "POST",
        body: JSON.stringify({
          age: state.age ? parseInt(state.age, 10) : null,
          location: state.location,
          delivery_date,
          delivery_type: state.delivery_type,
          baby_name: state.baby_name,
          feeding_method: state.feeding_method,
          support_system: state.support_system,
          baseline: { mood: state.mood, pain: state.pain },
        }),
      });
      markOnboarded();
      router.replace("/(tabs)/home");
    } catch (e: any) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressBar, i <= step && styles.progressBarActive]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel}>Step {step + 1} of {totalSteps}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View>
              <Text style={styles.display}>Let's get to know you.</Text>
              <Text style={styles.sub}>A few basics so we can personalize your care.</Text>
              <Field label="Your name (baby's mother)" testID="onboarding-name-hint">
                <TextInput
                  value={state.location}
                  onChangeText={(v) => setState({ ...state, location: v })}
                  placeholder="e.g. Mumbai, India"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="onboarding-location-input"
                />
              </Field>
              <Field label="Your age (optional)">
                <TextInput
                  value={state.age}
                  onChangeText={(v) => setState({ ...state, age: v.replace(/[^0-9]/g, "") })}
                  placeholder="e.g. 30"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={styles.input}
                  testID="onboarding-age-input"
                />
              </Field>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.display}>Your delivery.</Text>
              <Text style={styles.sub}>This helps us design a recovery plan for your body.</Text>
              <Field label="Delivery type">
                <ChipRow
                  options={DELIVERY_TYPES}
                  value={state.delivery_type}
                  onChange={(v) => setState({ ...state, delivery_type: v })}
                  testIDPrefix="delivery"
                />
              </Field>
              <Field label="How many days ago?">
                <TextInput
                  value={state.daysAgo}
                  onChangeText={(v) => setState({ ...state, daysAgo: v.replace(/[^0-9]/g, "") })}
                  placeholder="e.g. 12"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={styles.input}
                  testID="onboarding-days-input"
                />
              </Field>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.display}>Baby & feeding.</Text>
              <Text style={styles.sub}>We center the mother — but a little context helps.</Text>
              <Field label="Baby's name (optional)">
                <TextInput
                  value={state.baby_name}
                  onChangeText={(v) => setState({ ...state, baby_name: v })}
                  placeholder="e.g. Aarav"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="onboarding-baby-name-input"
                />
              </Field>
              <Field label="Feeding method">
                <ChipRow
                  options={FEEDING}
                  value={state.feeding_method}
                  onChange={(v) => setState({ ...state, feeding_method: v })}
                  testIDPrefix="feeding"
                />
              </Field>
              <Field label="Support at home">
                <ChipRow
                  options={SUPPORT}
                  value={state.support_system}
                  onChange={(v) => setState({ ...state, support_system: v })}
                  testIDPrefix="support"
                />
              </Field>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.display}>How you're feeling today.</Text>
              <Text style={styles.sub}>A quick baseline — this will change as you recover.</Text>
              <Field label={`Overall mood: ${state.mood}/10`}>
                <Slider10 value={state.mood} onChange={(v) => setState({ ...state, mood: v })} testID="mood-slider" />
              </Field>
              <Field label={`Physical pain: ${state.pain}/10`}>
                <Slider10 value={state.pain} onChange={(v) => setState({ ...state, pain: v })} testID="pain-slider" />
              </Field>
              <View style={styles.reassure}>
                <MaterialCommunityIcons name="heart-outline" size={18} color={colors.brand} />
                <Text style={styles.reassureText}>Whatever you shared, we'll hold it gently.</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <TouchableOpacity onPress={back} style={styles.backBtn} testID="onboarding-back-btn">
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}
          {step < totalSteps - 1 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={next} testID="onboarding-next-btn">
              <Text style={styles.primaryText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onBrand} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy} testID="onboarding-finish-btn">
              {busy ? <ActivityIndicator color={colors.onBrand} /> : <>
                <Text style={styles.primaryText}>Begin my care plan</Text>
                <MaterialCommunityIcons name="check" size={18} color={colors.onBrand} />
              </>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, testID }: { label: string; children: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.field} testID={testID}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange, testIDPrefix }: {
  options: { key: string; label: string }[]; value: string; onChange: (v: string) => void; testIDPrefix?: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {options.map((o) => {
        const sel = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.chip, sel && styles.chipActive]}
            testID={`${testIDPrefix}-chip-${o.key}`}
          >
            <Text style={[styles.chipText, sel && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function Slider10({ value, onChange, testID }: { value: number; onChange: (v: number) => void; testID?: string }) {
  return (
    <View style={styles.sliderRow} testID={testID}>
      {Array.from({ length: 10 }).map((_, i) => {
        const n = i + 1;
        const sel = n <= value;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={[styles.sliderDot, sel && { backgroundColor: colors.brand, borderColor: colors.brand }]}
            testID={`${testID}-${n}`}
          >
            <Text style={[styles.sliderNum, sel && { color: colors.onBrand }]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  progressRow: { flexDirection: "row", gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressBarActive: { backgroundColor: colors.brand },
  stepLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: spacing.sm, letterSpacing: 1.5, textTransform: "uppercase" },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xl2 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.onSurface, marginTop: spacing.md, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurfaceTertiary, marginTop: spacing.sm, lineHeight: 22, marginBottom: spacing.xl },
  field: { marginBottom: spacing.xl },
  fieldLabel: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, marginBottom: spacing.sm, fontWeight: "500" },
  input: { fontFamily: fonts.text, fontSize: 16, color: colors.onSurface, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, height: 52 },
  chip: { height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceSecondary },
  chipTextActive: { color: colors.onBrand, fontWeight: "500" },
  sliderRow: { flexDirection: "row", gap: 6, justifyContent: "space-between" },
  sliderDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  sliderNum: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary },
  reassure: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.md },
  reassureText: { fontFamily: fonts.text, fontSize: 13, color: colors.onBrandTertiary },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  backBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  backText: { fontFamily: fonts.text, color: colors.onSurfaceTertiary, fontSize: 15 },
  primaryBtn: { flex: 1, backgroundColor: colors.brand, height: 52, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryText: { color: colors.onBrand, fontFamily: fonts.text, fontSize: 16, fontWeight: "500" },
});
