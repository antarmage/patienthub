import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useApp } from "@/context/AppContext";
import { getApiBase } from "@/utils/careStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

const QUICK_STARTERS = [
  "Is this symptom normal?",
  "What should I eat this week?",
  "Warning signs to watch for",
  "How is my baby developing?",
  "Tips for better sleep",
  "Safe exercises for pregnancy",
];

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 200);
    const a3 = pulse(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.aiBubble}>
      <View style={styles.avatarWrap}>
        <ThemedText style={styles.avatarEmoji}>✨</ThemedText>
      </View>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function AiChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedWeek } = useApp();
  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 26 ? 2 : 3;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const apiBase = getApiBase();
      const token = await AsyncStorage.getItem("@saiviemom_mobile_token");
      const res = await fetch(`${apiBase}/api/mobile/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed, weekNumber: selectedWeek, trimester }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { reply: string };
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", text: data.reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to reach the AI assistant. Please check your connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loading, selectedWeek, trimester]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading]);

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.role === "user") {
      return (
        <View style={styles.userBubbleRow}>
          <View style={styles.userBubble}>
            <ThemedText style={styles.userBubbleText}>{item.text}</ThemedText>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.aiBubble}>
        <View style={styles.avatarWrap}>
          <ThemedText style={styles.avatarEmoji}>✨</ThemedText>
        </View>
        <View style={styles.aiBubbleContent}>
          <ThemedText style={styles.aiBubbleText}>{item.text}</ThemedText>
        </View>
      </View>
    );
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText style={styles.headerName}>Maya</ThemedText>
          <ThemedText style={styles.headerSub}>AI Pregnancy Assistant · Week {selectedWeek}</ThemedText>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.disclaimer}>
        <Feather name="info" size={13} color="#6C63FF" style={{ marginRight: 6 }} />
        <ThemedText style={styles.disclaimerText}>
          Maya provides general information only — always consult your clinician for medical advice.
        </ThemedText>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.mayaAvatar}>
            <ThemedText style={styles.mayaAvatarEmoji}>✨</ThemedText>
          </View>
          <ThemedText style={styles.emptyGreeting}>Hi! I'm Maya.</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Ask me anything about week {selectedWeek} of your pregnancy — symptoms, nutrition, baby development, and more.
          </ThemedText>
          <ThemedText style={styles.chipSectionLabel}>Quick questions</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {QUICK_STARTERS.map((q) => (
              <Pressable key={q} style={styles.chip} onPress={() => sendMessage(q)}>
                <ThemedText style={styles.chipText}>{q}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: Spacing["2xl"] },
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loading ? <TypingIndicator /> : null}
        />
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Feather name="wifi-off" size={14} color="#EF4444" style={{ marginRight: 6 }} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      {!isEmpty && !loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollBottom}
          style={styles.chipsScrollRow}
        >
          {QUICK_STARTERS.map((q) => (
            <Pressable key={q} style={styles.chipSmall} onPress={() => sendMessage(q)}>
              <ThemedText style={styles.chipSmallText}>{q}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask Maya anything…"
          placeholderTextColor={COLORS.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!loading}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          blurOnSubmit
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="send" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  headerTitle: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginLeft: Spacing.sm,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0EEFF",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E4FF",
  },
  disclaimerText: {
    fontSize: 11,
    color: "#6C63FF",
    flex: 1,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"],
  },
  mayaAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EDE9FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  mayaAvatarEmoji: {
    fontSize: 32,
  },
  emptyGreeting: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing["2xl"],
  },
  chipSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  chipsScroll: {
    paddingRight: Spacing.xl,
    gap: Spacing.sm,
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E4FF",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    color: "#6C63FF",
    fontWeight: "500",
  },
  messageList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  userBubbleRow: {
    alignItems: "flex-end",
    marginBottom: Spacing.md,
  },
  userBubble: {
    backgroundColor: "#6C63FF",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    maxWidth: "80%",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  userBubbleText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  aiBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDE9FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  aiBubbleContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  aiBubbleText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 5,
    alignItems: "center",
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#6C63FF",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    flex: 1,
  },
  chipsScrollRow: {
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  chipsScrollBottom: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  chipSmall: {
    backgroundColor: "#F5F3FF",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipSmallText: {
    fontSize: 12,
    color: "#6C63FF",
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: "#C4C1F4",
    shadowOpacity: 0,
    elevation: 0,
  },
});
