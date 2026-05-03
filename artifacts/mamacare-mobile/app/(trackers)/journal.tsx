import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useApp } from "@/context/AppContext";
import {
  getMoodJournal,
  addJournalEntry,
  getTodayJournalEntry,
  JournalEntry,
} from "@/utils/careStorage";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

const SYMPTOMS = [
  "Nausea",
  "Headache",
  "Swelling",
  "Cramps",
  "Heartburn",
  "Back Pain",
  "Fatigue",
  "Dizziness",
  "Shortness of Breath",
  "Breast Tenderness",
  "Frequent Urination",
  "Insomnia",
  "Constipation",
  "Mood Swings",
  "Food Cravings",
];

const MOODS: { label: string; emoji: string; color: string; value: number }[] = [
  { label: "Great", emoji: "😄", color: "#22C55E", value: 5 },
  { label: "Good", emoji: "🙂", color: "#84CC16", value: 4 },
  { label: "Okay", emoji: "😐", color: "#F59E0B", value: 3 },
  { label: "Tired", emoji: "😔", color: "#F97316", value: 2 },
  { label: "Anxious", emoji: "😟", color: "#EF4444", value: 1 },
];

function getMoodByValue(value: number) {
  return MOODS.find((m) => m.value === value) || MOODS[2];
}

function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  const today = todayDateStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Tab = "checkin" | "history";

type DayGroup = { date: string; label: string; entries: JournalEntry[] };

function groupByDay(entries: JournalEntry[]): DayGroup[] {
  const map = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const group = map.get(entry.date) ?? [];
    group.push(entry);
    map.set(entry.date, group);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayEntries]) => ({
      date,
      label: formatDateLabel(date),
      entries: dayEntries,
    }));
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedWeek } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>("checkin");
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [te, all] = await Promise.all([getTodayJournalEntry(), getMoodJournal()]);
    setTodayEntry(te);
    setDayGroups(groupByDay(all));
    if (te) {
      setSelectedMood(te.mood);
      setSelectedSymptoms(te.symptoms);
      setNotes(te.notes ?? "");
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    if (selectedMood === null) {
      Alert.alert("Pick a mood", "Please select how you are feeling today.");
      return;
    }
    setIsSaving(true);
    try {
      await addJournalEntry({
        mood: selectedMood,
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
        week: selectedWeek,
      });
      const [te, all] = await Promise.all([getTodayJournalEntry(), getMoodJournal()]);
      setTodayEntry(te);
      setDayGroups(groupByDay(all));
      setActiveTab("history");
    } catch {
      Alert.alert("Error", "Failed to save your check-in.");
    } finally {
      setIsSaving(false);
    }
  };

  const alreadyLoggedToday = todayEntry !== null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Daily Journal</ThemedText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "checkin" && styles.tabActive]}
          onPress={() => setActiveTab("checkin")}
        >
          <ThemedText style={[styles.tabText, activeTab === "checkin" && styles.tabTextActive]}>
            Check-in
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <ThemedText style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
            History
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === "checkin" ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {alreadyLoggedToday && (
            <View style={styles.alreadyLoggedBanner}>
              <ThemedText style={styles.alreadyLoggedEmoji}>
                {getMoodByValue(todayEntry!.mood).emoji}
              </ThemedText>
              <View style={styles.alreadyLoggedText}>
                <ThemedText style={styles.alreadyLoggedTitle}>Today's entry loaded</ThemedText>
                <ThemedText style={styles.alreadyLoggedSub}>
                  Edit below to update or add a new entry for today
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>How are you feeling today?</ThemedText>
            <View style={styles.moodRow}>
              {MOODS.map((mood) => (
                <Pressable
                  key={mood.value}
                  style={[
                    styles.moodCard,
                    selectedMood === mood.value && { borderColor: mood.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedMood(mood.value)}
                >
                  <ThemedText style={styles.moodEmoji}>{mood.emoji}</ThemedText>
                  <ThemedText
                    style={[
                      styles.moodLabel,
                      selectedMood === mood.value && { color: mood.color, fontWeight: "600" },
                    ]}
                  >
                    {mood.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Any symptoms? (optional)</ThemedText>
            <View style={styles.chipGrid}>
              {SYMPTOMS.map((symptom) => {
                const selected = selectedSymptoms.includes(symptom);
                return (
                  <Pressable
                    key={symptom}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleSymptom(symptom)}
                  >
                    <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {symptom}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notes (optional)</ThemedText>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How was your day? Anything you'd like to remember..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.bottomButton, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              style={[styles.saveButton, (selectedMood === null || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={selectedMood === null || isSaving}
            >
              <Feather name="check" size={18} color="#FFFFFF" />
              <ThemedText style={styles.saveButtonText}>
                {isSaving ? "Saving..." : "Save Check-in"}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {dayGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyEmoji}>📓</ThemedText>
              <ThemedText style={styles.emptyTitle}>No entries yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Switch to Check-in to log your first entry.
              </ThemedText>
            </View>
          ) : (
            dayGroups.map((group) => (
              <View key={group.date}>
                <ThemedText style={styles.dayHeader}>{group.label}</ThemedText>
                {group.entries.map((entry) => {
                  const mood = getMoodByValue(entry.mood);
                  return (
                    <View key={entry.id} style={styles.historyCard}>
                      <View style={styles.historyCardLeft}>
                        <ThemedText style={styles.historyEmoji}>{mood.emoji}</ThemedText>
                      </View>
                      <View style={styles.historyCardRight}>
                        <View style={styles.historyCardHeader}>
                          <ThemedText style={styles.historyTime}>
                            {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </ThemedText>
                          <View style={[styles.moodBadge, { backgroundColor: mood.color + "22" }]}>
                            <ThemedText style={[styles.moodBadgeText, { color: mood.color }]}>
                              {mood.label}
                            </ThemedText>
                          </View>
                        </View>
                        {entry.symptoms.length > 0 && (
                          <View style={styles.historyChips}>
                            {entry.symptoms.slice(0, 3).map((s) => (
                              <View key={s} style={styles.historyChip}>
                                <ThemedText style={styles.historyChipText}>{s}</ThemedText>
                              </View>
                            ))}
                            {entry.symptoms.length > 3 && (
                              <View style={styles.historyChip}>
                                <ThemedText style={styles.historyChipText}>
                                  +{entry.symptoms.length - 3}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        )}
                        {entry.notes ? (
                          <ThemedText style={styles.historyNote} numberOfLines={2}>
                            {entry.notes}
                          </ThemedText>
                        ) : null}
                        <ThemedText style={styles.historyWeek}>Week {entry.week}</ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#6C63FF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  alreadyLoggedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: Spacing.md,
  },
  alreadyLoggedEmoji: {
    fontSize: 28,
  },
  alreadyLoggedText: {
    flex: 1,
  },
  alreadyLoggedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803D",
  },
  alreadyLoggedSub: {
    fontSize: 12,
    color: "#166534",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  moodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  moodCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    gap: 4,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: "#EDE9FE",
    borderColor: "#6C63FF",
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: Spacing.lg,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 100,
  },
  bottomButton: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C63FF",
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    gap: Spacing.sm,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#C4C0F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  historyCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  historyCardLeft: {
    width: 48,
    alignItems: "center",
    paddingTop: 2,
  },
  historyEmoji: {
    fontSize: 28,
  },
  historyCardRight: {
    flex: 1,
  },
  historyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  historyTime: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  moodBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: Spacing.xs,
  },
  historyChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  historyNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  historyWeek: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
