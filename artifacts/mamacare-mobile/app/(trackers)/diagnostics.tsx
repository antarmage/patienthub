import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import {
  Diagnostic,
  getDiagnostics,
  saveDiagnostic,
  deleteDiagnostic,
} from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

type ReportType = "blood" | "usg" | "other";

const reportTypeLabels: Record<ReportType, string> = {
  blood: "Blood Test",
  usg: "USG / Ultrasound",
  other: "Other Report",
};

const reportTypeIcons: Record<ReportType, keyof typeof Feather.glyphMap> = {
  blood: "droplet",
  usg: "image",
  other: "file-text",
};

export default function DiagnosticsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("blood");
  const [dateStr, setDateStr] = useState("");
  const [trimester, setTrimester] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDiagnostics();
    }, [])
  );

  const loadDiagnostics = async () => {
    const data = await getDiagnostics();
    setDiagnostics(data);
  };

  const handlePickImage = async (useCamera: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Camera is not available on web. Please use gallery.");
      if (useCamera) return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        `Please allow access to ${useCamera ? "camera" : "photo library"} to upload reports`
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.8,
        });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const fileName = uri.split("/").pop() || "report.jpg";
      setSelectedFile({ uri, name: fileName });
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleSaveDiagnostic = async () => {
    if (!selectedFile) {
      Alert.alert("No File Selected", "Please select an image or PDF to upload");
      return;
    }

    if (!dateStr.trim()) {
      Alert.alert("Missing Date", "Please enter the report date");
      return;
    }

    setLoading(true);
    try {
      await saveDiagnostic({
        type: reportType,
        date: dateStr.trim(),
        trimester: trimester.trim() || undefined,
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
      });

      setReportType("blood");
      setDateStr("");
      setTrimester("");
      setSelectedFile(null);
      setShowModal(false);
      loadDiagnostics();
    } catch (error) {
      Alert.alert("Error", "Failed to save diagnostic");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiagnostic = async (diagnostic: Diagnostic) => {
    Alert.alert(
      "Delete Report",
      `Remove this ${reportTypeLabels[diagnostic.type]}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDiagnostic(diagnostic.id);
            loadDiagnostics();
          },
        },
      ]
    );
  };

  const handleViewFile = (uri: string) => {
    if (Platform.OS === "web") {
      (window as any).open(uri, "_blank");
    } else {
      Linking.openURL(uri);
    }
  };

  const renderDiagnostic = ({ item }: { item: Diagnostic }) => (
    <Card style={styles.diagnosticCard} onPress={() => handleViewFile(item.fileUri)}>
      <View style={styles.diagnosticHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
          <Feather name={reportTypeIcons[item.type]} size={20} color={theme.primary} />
        </View>
        <View style={styles.diagnosticInfo}>
          <ThemedText type="h4" style={{ color: COLORS.textPrimary }}>
            {reportTypeLabels[item.type]}
          </ThemedText>
          <ThemedText type="small" style={{ color: COLORS.textSecondary }}>
            {item.date}
            {item.trimester ? ` - ${item.trimester}` : ""}
          </ThemedText>
        </View>
        <Pressable onPress={() => handleDeleteDiagnostic(item)}>
          <Feather name="trash-2" size={20} color={COLORS.error} />
        </Pressable>
      </View>
      <View style={styles.fileInfo}>
        <Feather name="file" size={16} color={COLORS.textMuted} />
        <ThemedText
          type="small"
          style={{ color: COLORS.textMuted, marginLeft: Spacing.xs, flex: 1 }}
          numberOfLines={1}
        >
          {item.fileName}
        </ThemedText>
        <Feather name="external-link" size={16} color={theme.primary} />
      </View>
    </Card>
  );

  const ReportTypeSelector = () => (
    <View style={styles.typeContainer}>
      {(["blood", "usg", "other"] as ReportType[]).map((type) => (
        <Pressable
          key={type}
          style={[
            styles.typeOption,
            {
              backgroundColor: reportType === type ? theme.primary : theme.backgroundSecondary,
              borderColor: reportType === type ? theme.primary : COLORS.border,
            },
          ]}
          onPress={() => setReportType(type)}
        >
          <Feather
            name={reportTypeIcons[type]}
            size={16}
            color={reportType === type ? COLORS.white : COLORS.textSecondary}
          />
          <ThemedText
            type="small"
            style={{
              color: reportType === type ? COLORS.white : COLORS.textSecondary,
              marginLeft: Spacing.xs,
            }}
          >
            {reportTypeLabels[type]}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {diagnostics.length === 0 ? (
        <View style={{ paddingTop: headerHeight }}>
          <EmptyState
            icon="file-text"
            title="No Reports Yet"
            message="Upload your blood tests, ultrasounds, and other diagnostic reports to keep them organized"
            actionLabel="Upload Report"
            onAction={() => setShowModal(true)}
          />
        </View>
      ) : (
        <FlatList
          data={diagnostics}
          keyExtractor={(item) => item.id}
          renderItem={renderDiagnostic}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl + 80,
            paddingHorizontal: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowModal(true)}
      >
        <Feather name="plus" size={24} color={COLORS.white} />
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalScrollContent}
          >
            <ThemedView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText type="h2" style={{ color: COLORS.textPrimary }}>
                  Upload Report
                </ThemedText>
                <Pressable onPress={() => setShowModal(false)}>
                  <Feather name="x" size={24} color={COLORS.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.form}>
                <ThemedText type="h4" style={styles.label}>
                  Report Type
                </ThemedText>
                <ReportTypeSelector />

                <ThemedText type="h4" style={styles.label}>
                  Date (YYYY-MM-DD)
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                  placeholder="2025-01-15"
                  placeholderTextColor={COLORS.textMuted}
                  value={dateStr}
                  onChangeText={setDateStr}
                  keyboardType="numbers-and-punctuation"
                />

                <ThemedText type="h4" style={styles.label}>
                  Trimester (optional)
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                  placeholder="First / Second / Third"
                  placeholderTextColor={COLORS.textMuted}
                  value={trimester}
                  onChangeText={setTrimester}
                />

                <ThemedText type="h4" style={styles.label}>
                  Upload File
                </ThemedText>
                <View style={styles.uploadButtons}>
                  {Platform.OS !== "web" ? (
                    <Pressable
                      style={[styles.uploadButton, { borderColor: theme.primary }]}
                      onPress={() => handlePickImage(true)}
                    >
                      <Feather name="camera" size={20} color={theme.primary} />
                      <ThemedText type="small" style={{ color: theme.primary }}>
                        Camera
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.uploadButton, { borderColor: theme.primary }]}
                    onPress={() => handlePickImage(false)}
                  >
                    <Feather name="image" size={20} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      Gallery
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.uploadButton, { borderColor: theme.primary }]}
                    onPress={handlePickDocument}
                  >
                    <Feather name="file-text" size={20} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      PDF
                    </ThemedText>
                  </Pressable>
                </View>

                {selectedFile ? (
                  <View style={[styles.selectedFile, { backgroundColor: theme.primaryLight }]}>
                    <Feather name="check-circle" size={20} color={theme.success} />
                    <ThemedText
                      type="small"
                      style={{ color: COLORS.textPrimary, flex: 1, marginLeft: Spacing.sm }}
                      numberOfLines={1}
                    >
                      {selectedFile.name}
                    </ThemedText>
                    <Pressable onPress={() => setSelectedFile(null)}>
                      <Feather name="x" size={20} color={COLORS.textMuted} />
                    </Pressable>
                  </View>
                ) : null}

                <Button onPress={handleSaveDiagnostic} disabled={loading} style={styles.submitButton}>
                  {loading ? "Saving..." : "Save Report"}
                </Button>
              </View>
            </ThemedView>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  diagnosticCard: {
    marginBottom: Spacing.md,
  },
  diagnosticHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  diagnosticInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.sm,
  },
  label: {
    color: COLORS.textPrimary,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  typeContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  uploadButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: Spacing.xs,
  },
  selectedFile: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.xl,
  },
});
