import React, { useState, useRef } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useApp } from "@/context/AppContext";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function AuthScreen() {
  const [phone, setPhone] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const insets = useSafeAreaInsets();
  const { completeAuth } = useApp();
  const router = useRouter();

  const handleSendOtp = () => {
    if (phone.length >= 10) {
      setLoading(true);
      setTimeout(() => { setLoading(false); setShowOtp(true); }, 800);
    }
  };

  const handleOtpChange = (val: string, i: number) => {
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      await completeAuth(phone);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Login Failed", err?.message || "Please check your phone number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every(d => d !== "");
  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing["3xl"];
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + Spacing.lg;

  return (
    <LinearGradient colors={["#eaf2ff", "#f7f9fc", "#eef1f7"]} style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>

      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={[styles.logoIcon, { backgroundColor: COLORS.lavender }]}>
          <Feather name="heart" size={36} color={COLORS.primary} />
        </View>
        <ThemedText type="h1" style={styles.appName}>SaivieMom</ThemedText>
        <ThemedText type="body" style={styles.tagline}>Your pregnancy companion</ThemedText>
      </View>

      {/* Form */}
      <View style={[styles.card, Shadows.cardElevated]}>
        {!showOtp ? (
          <>
            <ThemedText type="h3" style={styles.formTitle}>Enter your mobile number</ThemedText>
            <View style={styles.phoneRow}>
              <View style={[styles.countryCode, { backgroundColor: COLORS.lavender }]}>
                <ThemedText type="body" style={{ color: COLORS.primary }}>+91</ThemedText>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: COLORS.textPrimary }]}
                placeholder="Mobile number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <Button onPress={handleSendOtp} disabled={phone.length < 10 || loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : "Get OTP"}
            </Button>
          </>
        ) : (
          <>
            <ThemedText type="h3" style={styles.formTitle}>Verify your number</ThemedText>
            <ThemedText type="small" style={styles.otpSub}>OTP sent to +91 {phone}</ThemedText>
            <View style={styles.otpRow}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={r => { otpRefs.current[i] = r; }}
                  style={[styles.otpBox, { borderColor: d ? COLORS.primary : "#E5E5E7", color: COLORS.textPrimary }]}
                  maxLength={1}
                  keyboardType="numeric"
                  value={d}
                  onChangeText={v => handleOtpChange(v, i)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !d && i > 0) otpRefs.current[i - 1]?.focus();
                  }}
                />
              ))}
            </View>
            <Button onPress={handleVerify} disabled={!isOtpComplete || loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : "Verify & Continue"}
            </Button>
            <Pressable onPress={() => setShowOtp(false)} style={styles.changeNum}>
              <Feather name="arrow-left" size={14} color={COLORS.primary} />
              <ThemedText type="small" style={{ color: COLORS.primary }}>Change number</ThemedText>
            </Pressable>
          </>
        )}
      </View>

      <ThemedText type="small" style={styles.disclaimer}>
        By continuing, you agree to Saivie's Terms of Service
      </ThemedText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: Spacing.xl },
  logoSection: { alignItems: "center", marginBottom: Spacing["3xl"] },
  logoIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg },
  appName: { color: COLORS.textPrimary, marginBottom: Spacing.xs },
  tagline: { color: COLORS.textMuted },
  card: { backgroundColor: "#FFF", borderRadius: BorderRadius["2xl"], padding: Spacing.xl },
  formTitle: { marginBottom: Spacing.lg, color: COLORS.textPrimary },
  phoneRow: { flexDirection: "row", borderWidth: 1, borderColor: "#E5E5E7", borderRadius: BorderRadius.sm, overflow: "hidden", marginBottom: Spacing.xl },
  countryCode: { paddingHorizontal: Spacing.lg, justifyContent: "center" },
  phoneInput: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 16 },
  otpSub: { color: COLORS.textMuted, marginBottom: Spacing.xl },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.xl },
  otpBox: { width: 46, height: 54, borderWidth: 1.5, borderRadius: BorderRadius.xs, textAlign: "center", fontSize: 20, fontWeight: "600" },
  changeNum: { flexDirection: "row", gap: Spacing.xs, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg },
  disclaimer: { color: COLORS.textMuted, textAlign: "center", marginTop: Spacing.xl },
});
