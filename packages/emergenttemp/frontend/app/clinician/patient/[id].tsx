import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { colors, fonts, spacing, radius, riskColor, riskLabel } from "@/src/theme";
import { apiFetch } from "@/src/api/client";
import TrendChart from "@/src/components/TrendChart";

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"overview" | "timeline" | "notes">("overview");

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<any>(`/clinician/mothers/${id}`);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/clinician/mothers/${id}/notes`, { method: "POST", body: JSON.stringify({ text: note }) });
      setNote("");
      await load();
    } finally { setSaving(false); }
  };

  const ackAlert = async (alertId: string) => {
    await apiFetch(`/clinician/alerts/${alertId}/acknowledge`, { method: "POST" });
    load();
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></SafeAreaView>
    );
  }

  const last = data.last_checkin;
  const mental = data.trend.map((t: any) => t.mental);
  const physical = data.trend.map((t: any) => t.physical);
  const sleep = data.trend.map((t: any) => t.sleep);
  const riskVal = last?.risk || "green";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={20}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} testID="patient-back">
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl2 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.rowTop}>
              <View style={styles.avatar}><Text style={styles.avatarInit}>{data.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{data.name}</Text>
                <Text style={styles.patientMeta}>Day {data.postpartum_day} · {data.profile.delivery_type.replace("_", " ")}</Text>
              </View>
              <View style={[styles.riskChip, { backgroundColor: riskColor(riskVal) }]}>
                <Text style={styles.riskChipText}>{riskLabel(riskVal).toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {data.alerts.filter((a: any) => !a.resolved).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active alerts</Text>
              {data.alerts.filter((a: any) => !a.resolved).map((a: any) => (
                <View key={a.alert_id} style={styles.alertCard}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.alertText}>{a.reason}</Text>
                  <TouchableOpacity style={styles.ackBtn} onPress={() => ackAlert(a.alert_id)} testID={`ack-${a.alert_id}`}>
                    <Text style={styles.ackText}>Acknowledge</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.tabs}>
            {(["overview", "timeline", "notes"] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} testID={`tab-${t}`}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === "overview" && (
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
              <View style={styles.chartCard}>
                <View style={styles.chartHead}><Text style={styles.chartTitle}>Mental</Text><Text style={styles.chartVal}>{last?.scores.mental ?? "-"}</Text></View>
                <TrendChart data={mental} color={colors.brand} width={320} height={110} />
              </View>
              <View style={styles.chartCard}>
                <View style={styles.chartHead}><Text style={styles.chartTitle}>Physical</Text><Text style={styles.chartVal}>{last?.scores.physical ?? "-"}</Text></View>
                <TrendChart data={physical} color={colors.success} width={320} height={110} />
              </View>
              <View style={styles.chartCard}>
                <View style={styles.chartHead}><Text style={styles.chartTitle}>Sleep</Text><Text style={styles.chartVal}>{last?.scores.sleep ?? "-"}</Text></View>
                <TrendChart data={sleep} color={colors.warning} width={320} height={110} />
              </View>
            </View>
          )}

          {tab === "timeline" && (
            <View style={styles.timeline}>
              {data.timeline.map((t: any, i: number) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineDay}>{t.day !== null && t.day !== undefined ? `Day ${t.day}` : "Alert"}</Text>
                    <Text style={styles.timelineText}>{t.text}</Text>
                  </View>
                </View>
              ))}
              {data.timeline.length === 0 && (
                <Text style={{ fontFamily: fonts.text, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xl }}>No events yet.</Text>
              )}
            </View>
          )}

          {tab === "notes" && (
            <View style={styles.notesWrap}>
              <View style={styles.noteInputCard}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a clinical note…"
                  placeholderTextColor={colors.muted}
                  style={styles.noteInput}
                  multiline
                  testID="note-input"
                />
                <TouchableOpacity style={styles.saveBtn} onPress={saveNote} disabled={saving || !note.trim()} testID="save-note">
                  {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.saveText}>Save note</Text>}
                </TouchableOpacity>
              </View>
              {data.notes.map((n: any) => (
                <View key={n.note_id} style={styles.noteCard}>
                  <Text style={styles.noteMeta}>{n.clinician_name}</Text>
                  <Text style={styles.noteText}>{n.text}</Text>
                </View>
              ))}
              {data.notes.length === 0 && (
                <Text style={{ fontFamily: fonts.text, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xl }}>No notes yet.</Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarInit: { fontFamily: fonts.display, fontSize: 24, color: colors.brand },
  patientName: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, letterSpacing: -0.3 },
  patientMeta: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  riskChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  riskChipText: { fontFamily: fonts.text, fontSize: 9, color: "#fff", fontWeight: "700", letterSpacing: 1 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.md },
  sectionTitle: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2, marginBottom: spacing.sm, textTransform: "uppercase" },
  alertCard: { backgroundColor: colors.alertBg, borderColor: colors.alertBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  alertText: { flex: 1, fontFamily: fonts.text, fontSize: 13, color: colors.onSurface },
  ackBtn: { backgroundColor: colors.onSurface, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 6 },
  ackText: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceInverse, fontWeight: "500" },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.xl, marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { paddingVertical: spacing.md, marginRight: spacing.lg },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.brand },
  tabText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurfaceTertiary },
  tabTextActive: { color: colors.onSurface, fontWeight: "500" },
  chartCard: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.sm },
  chartTitle: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 1.5, textTransform: "uppercase" },
  chartVal: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  timeline: { paddingHorizontal: spacing.xl, marginTop: spacing.md, gap: spacing.md },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
  timelineDay: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary, letterSpacing: 1.5, textTransform: "uppercase" },
  timelineText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurface, marginTop: 2 },
  notesWrap: { paddingHorizontal: spacing.xl, marginTop: spacing.md, gap: spacing.md },
  noteInputCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  noteInput: { minHeight: 80, fontFamily: fonts.text, fontSize: 14, color: colors.onSurface },
  saveBtn: { backgroundColor: colors.brand, alignSelf: "flex-end", paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, marginTop: spacing.sm },
  saveText: { fontFamily: fonts.text, fontSize: 13, color: colors.onBrand, fontWeight: "500" },
  noteCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  noteMeta: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceTertiary, letterSpacing: 1.5, textTransform: "uppercase" },
  noteText: { fontFamily: fonts.text, fontSize: 14, color: colors.onSurface, marginTop: 4, lineHeight: 20 },
});
