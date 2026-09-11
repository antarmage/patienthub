import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { apiFetch, SESSION_TOKEN_KEY } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

WebBrowser.maybeCompleteAuthSession();

export type SaivieUser = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  role: "mother" | "clinician";
  onboarded: boolean;
};

type AuthCtx = {
  user: SaivieUser | null;
  loading: boolean;
  role: "mother" | "clinician";
  setRole: (r: "mother" | "clinician") => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  markOnboarded: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const processedSessionIds = new Set<string>();

function extractSessionId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SaivieUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<"mother" | "clinician">("mother");

  const exchangeSessionId = useCallback(async (sessionId: string) => {
    if (processedSessionIds.has(sessionId)) return;
    processedSessionIds.add(sessionId);
    try {
      const data = await apiFetch<{ session_token: string; user: SaivieUser }>("/auth/session", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      await storage.secureSet(SESSION_TOKEN_KEY, data.session_token);
      setUser(data.user);
    } catch (e) {
      console.warn("Session exchange failed", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: SaivieUser }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      await storage.secureRemove(SESSION_TOKEN_KEY);
    }
  }, []);

  const markOnboarded = useCallback(() => {
    setUser((u) => (u ? { ...u, onboarded: true } : u));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const combined = window.location.hash + "&" + window.location.search;
          const sid = extractSessionId(combined);
          if (sid) {
            await exchangeSessionId(sid);
            try {
              const url = new URL(window.location.href);
              url.hash = "";
              url.searchParams.delete("session_id");
              window.history.replaceState(window.history.state, "", url.toString());
            } catch {}
          }
        } else {
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) await exchangeSessionId(sid);
        }

        const token = await storage.secureGet<string>(SESSION_TOKEN_KEY, "");
        if (token) await refresh();
      } finally {
        setLoading(false);
      }
    })();

    let latestUrl: string | null = null;
    const sub = Linking.addEventListener("url", ({ url }) => {
      latestUrl = url;
      const sid = extractSessionId(url);
      if (sid) exchangeSessionId(sid);
    });
    return () => sub.remove();
  }, [exchangeSessionId, refresh]);

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin + "/"
        : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }

    // Listen for deep-link during auth session as fallback for Android
    let deepLinkUrl: string | null = null;
    const sub = Linking.addEventListener("url", ({ url }) => {
      deepLinkUrl = url;
    });

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    sub.remove();

    let redirectedUrl: string | null = null;
    if (result.type === "success" && "url" in result) {
      redirectedUrl = result.url ?? null;
    }
    redirectedUrl = redirectedUrl ?? deepLinkUrl ?? (await Linking.getInitialURL());
    const sid = extractSessionId(redirectedUrl);
    if (sid) await exchangeSessionId(sid);
  }, [exchangeSessionId]);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    await storage.secureRemove(SESSION_TOKEN_KEY);
    setUser(null);
    setRoleState("mother");
  }, []);

  const setRole = useCallback((r: "mother" | "clinician") => setRoleState(r), []);

  const value = useMemo(
    () => ({ user, loading, role, setRole, signInWithGoogle, signOut, refresh, markOnboarded }),
    [user, loading, role, setRole, signInWithGoogle, signOut, refresh, markOnboarded],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
