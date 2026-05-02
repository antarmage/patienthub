import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Diagnostic, getDiagnostics, saveDiagnostic, deleteDiagnostic } from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius, Shadows } from "@/constants/theme";

type ReportType = "blood" | "usg" | "other";
const typeLabels: Record<ReportType, string> = { blood: "Blood Test", usg: "USG / Ultrasound", other: "Other Report" };
const typeIcons: Record<ReportType, keyof typeof Feather.glyphMap> = { blood: "droplet", usg: "image", other: "file-text" };
const typeColors: Record<ReportType, string> = { blood: "#3B82F6", usg: "#8B5CF6", other: "#10B981" };
const typeBgs: Record<ReportType, string> = { blood: "#EFF6FF", usg: "#F5F3FF", other: "#ECFDF5" };

export default function DiagnosticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [diags, setDiags] = useState<Diagnostic[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<ReportType>("blood");
  const [dateStr, setDateStr] = useState("");
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => { setDiags(await getDiagnostics()); };

  const pickImage = async () => {
    if (Platform.OS === "web") { Alert.alert("Not available", "File picking not supported on web preview"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setFile({ uri: res.assets[0].uri, name: res.assets[0].fileName || "image.jpg" });
    }
  };

  const pickDocument = async () => {
    if (Platform.OS === "web") { setFile({ uri: "web-placeholder", name: "document.pdf" }); return; }
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!res.canceled && res.assets[0]) {
      setFile({ uri: res.assets[0].uri, name: res.assets[0].name });
    }
  };

  const handleSave = async () => {
    if (!file) { Alert.alert("Required", "Please select a file"); return; }
    setSaving(true);
    await saveDiagnostic({ type, date: dateStr || new Date().toISOString().split("T")[0], fileUri: file.uri, fileName: file.name });
    setFile(null); setDateStr(""); setShowModal(false); setSaving(false);
    loadData();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + Spacing.lg;

  return (
    <View style={styles.root}>
      <FlatList
        data={diags}
        keyExtractor={d => d.id}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100, paddingHorizontal: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
              </Pressable>
              <ThemedText type="h3">Documents</ThemedText>
              <Pressable onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: COLORS.primary }]}>
                <Feather name="upload" size={18} color="#FFF" />
              </Pressable>
            </View>
            {diags.length === 0 ? <EmptyState icon="folder" title="No documents yet" description="Upload your lab results, scans, and medical reports" /> : null}
          </View>
        )}
        renderItem={({ item: d }) => (
          <View style={[styles.docCard, Shadows.card]}>
            <View style={[styles.docIcon, { backgroundColor: typeBgs[d.type as ReportType] || "#F0F0F3" }]}>
              <Feather name={typeIcons[d.type as ReportType] || "file"} size={18} color={typeColors[d.type as ReportType] || COLORS.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">{d.fileName}</ThemedText>
              <ThemedText type="small" style={{ color: COLORS.textMuted }}>{typeLabels[d.type as ReportType]} · {new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</ThemedText>
            </View>
            <Pressable onPress={() => Alert.alert("Delete", "Remove this document?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await deleteDiagnostic(d.id); loadData(); } }])}>
              <Feather name="trash-2" size={16} color={COLORS.textMuted} />
            </Pressable>
          </View>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.xl }}>Upload Document</ThemedText>
            <View style={styles.typeRow}>
              {(["blood", "usg", "other"] as ReportType[]).map(t => (
                <Pressable key={t} onPress={() => setType(t)} style={[styles.typeBtn, type === t && { backgroundColor: COLORS.primary }]}>
                  <ThemedText type="small" style={{ color: type === t ? "#FFF" : COLORS.textPrimary, fontWeight: "600" }}>{typeLabels[t]}</ThemedText>
                </Pressable>
              ))}
            </View>
            {file ? (
              <View style={[styles.filePreview, Shadows.card]}>
                <Feather name="check-circle" size={20} color={COLORS.success} />
                <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>{file.name}</ThemedText>
                <Pressable onPress={() => setFile(null)}>
                  <Feather name="x" size={16} color={COLORS.textMuted} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                <Pressable style={[styles.uploadBtn, { backgroundColor: COLORS.lavender }]} onPress={pickImage}>
                  <Feather name="image" size={20} color={COLORS.primary} />
                  <ThemedText type="small" style={{ color: COLORS.primary }}>Image</ThemedText>
                </Pressable>
                <Pressable style={[styles.uploadBtn, { backgroundColor: COLORS.softAmber }]} onPress={pickDocument}>
                  <Feather name="file-text" size={20} color={COLORS.warning} />
                  <ThemedText type="small" style={{ color: COLORS.warning }}>Document</ThemedText>
                </Pressable>
              </View>
            )}
            <Button onPress={handleSave} disabled={!file || saving} style={{ marginTop: Spacing.lg }}>{saving ? "Uploading..." : "Save Document"}</Button>
            <Pressable onPress={() => setShowModal(false)} style={styles.cancelBtn}>
              <ThemedText type="small" style={{ color: COLORS.textMuted }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xl },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0F0F3", alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  docCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm },
  docIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFF", borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"], padding: Spacing.xl, paddingBottom: 40 },
  typeRow: { flexDirection: "row", gap: Spacing.xs, marginBottom: Spacing.xl, flexWrap: "wrap" },
  typeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: "#F0F0F3" },
  uploadRow: { flexDirection: "row", gap: Spacing.lg },
  uploadBtn: { flex: 1, paddingVertical: Spacing.xl, borderRadius: BorderRadius.xl, alignItems: "center", gap: Spacing.sm },
  filePreview: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: "#FFF", borderRadius: BorderRadius.xl, padding: Spacing.lg },
  cancelBtn: { alignItems: "center", marginTop: Spacing.md, padding: Spacing.sm },
});
