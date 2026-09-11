import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { apiFetch } from "@/src/api/client";

type Msg = { role: "user" | "assistant"; text: string; created_at?: string };

const PROMPTS = [
  "I feel like I'm failing.",
  "My baby cries after every feed.",
  "How do I know if this is baby blues?",
  "I have back pain when nursing.",
];

export default function AskSaivie() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await apiFetch<{ items: Msg[] }>("/ai/history");
        setMessages(h.items || []);
      } catch {}
    })();
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: Msg = { role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const data = await apiFetch<{ session_id: string; reply: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: "I'm having trouble reaching you right now. Please try again in a moment." }]);
    } finally {
      setSending(false);
    }
  }, [sending, sessionId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ASK SAIVIE</Text>
        <Text style={styles.display}>Here whenever you need me.</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyWrap}>
              <View style={styles.avatarBubble}>
                <MaterialCommunityIcons name="flower-outline" size={22} color={colors.brand} />
              </View>
              <Text style={styles.emptyText}>
                Tell me how you're feeling — no question is too small. I remember our conversations, and I'll flag things to your care team when it matters.
              </Text>
              <View style={styles.promptsRow}>
                {PROMPTS.map((p) => (
                  <TouchableOpacity key={p} style={styles.promptChip} onPress={() => send(p)} testID={`prompt-${p.slice(0, 10)}`}>
                    <Text style={styles.promptText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubbleWrap, m.role === "user" ? styles.userWrap : styles.assistantWrap]}
            >
              {m.role === "assistant" && (
                <View style={styles.avatarSm}><MaterialCommunityIcons name="flower-outline" size={14} color={colors.brand} /></View>
              )}
              <View style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.bubbleText, m.role === "user" ? styles.userText : styles.assistantText]}>{m.text}</Text>
              </View>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubbleWrap, styles.assistantWrap]}>
              <View style={styles.avatarSm}><MaterialCommunityIcons name="flower-outline" size={14} color={colors.brand} /></View>
              <View style={[styles.bubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Share what's on your mind…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            testID="ask-input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            testID="ask-send-button"
          >
            <MaterialCommunityIcons name="arrow-up" size={22} color={colors.onBrand} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  eyebrow: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, letterSpacing: 2 },
  display: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginTop: 2, letterSpacing: -0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  emptyWrap: { alignItems: "flex-start", gap: spacing.md, marginTop: spacing.xl },
  avatarBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurfaceSecondary, lineHeight: 22 },
  promptsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  promptChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  promptText: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary },
  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, maxWidth: "100%" },
  userWrap: { justifyContent: "flex-end" },
  assistantWrap: { justifyContent: "flex-start" },
  avatarSm: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, maxWidth: "80%" },
  userBubble: { backgroundColor: colors.brandTertiary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: fonts.text, fontSize: 15, lineHeight: 22 },
  userText: { color: colors.onBrandTertiary },
  assistantText: { color: colors.onSurface },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120, fontFamily: fonts.text, fontSize: 15, color: colors.onSurface, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
});
