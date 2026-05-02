import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { initMobileApi } from "@/utils/careStorage";

const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: "@saiviemom_onboarding_complete",
  AUTH_COMPLETE: "@saiviemom_auth_complete",
  PATIENT_ID: "@saiviemom_patient_id",
  USER_PROFILE: "@saiviemom_user_profile",
  SELECTED_WEEK: "@saiviemom_selected_week",
};

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  lmpDate: string | null;
  eddDate: string | null;
  mode: string | null;
}

interface AppContextType {
  isLoading: boolean;
  onboardingComplete: boolean;
  authComplete: boolean;
  userProfile: UserProfile | null;
  selectedWeek: number;
  completeOnboarding: () => Promise<void>;
  completeAuth: (phone: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateSelectedWeek: (week: number) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [authComplete, setAuthComplete] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const [ob, auth, profile, week, patientIdStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_COMPLETE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SELECTED_WEEK),
        AsyncStorage.getItem(STORAGE_KEYS.PATIENT_ID),
      ]);
      const parsedWeek = week ? parseInt(week, 10) : 1;
      setOnboardingComplete(ob === "true");
      setAuthComplete(auth === "true");
      setUserProfile(profile ? JSON.parse(profile) : null);
      setSelectedWeek(parsedWeek);
      if (patientIdStr) {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || "";
        initMobileApi(parseInt(patientIdStr, 10), baseUrl, parsedWeek);
      }
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Failed to load app state. Starting fresh.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, "true");
    setOnboardingComplete(true);
  }, []);

  const completeAuth = useCallback(async (phone: string): Promise<void> => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "";
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch {
      throw new Error("Unable to reach the server. Please check your connection and try again.");
    }

    if (!res.ok) {
      let message = "Login failed. Please try again.";
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {}
      throw new Error(message);
    }

    const data = await res.json();
    const patient = data.patient;
    const lmpDate = patient.lmpDate ?? patient.lmp_date ?? patient.lmp ?? null;
    const eddDate = patient.eddDate ?? patient.edd_date ?? null;

    let week = 1;
    if (lmpDate) {
      const lmp = new Date(lmpDate);
      const diffDays = Math.floor((Date.now() - lmp.getTime()) / (1000 * 60 * 60 * 24));
      week = Math.min(40, Math.max(1, Math.floor(diffDays / 7)));
    }

    const profile: UserProfile = {
      id: String(patient.id),
      name: patient.name || "",
      phone: patient.phone || phone,
      lmpDate,
      eddDate,
      mode: patient.mode || "pregnancy",
    };

    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WEEK, String(week));
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_COMPLETE, "true");
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_ID, String(patient.id));
    initMobileApi(patient.id, baseUrl, week);
    setUserProfile(profile);
    setSelectedWeek(week);
    setAuthComplete(true);
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const updated = { ...userProfile, ...data } as UserProfile;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    setUserProfile(updated);

    if (updated.id && updated.id !== "offline") {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || "";
        await fetch(`${baseUrl}/api/patients/${updated.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updated.name,
            lmpDate: updated.lmpDate,
            eddDate: updated.eddDate,
          }),
        });
      } catch (e) {
        console.warn("Failed to sync profile:", e);
      }
    }
  }, [userProfile]);

  const updateSelectedWeek = useCallback(async (week: number) => {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WEEK, String(week));
    setSelectedWeek(week);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    setOnboardingComplete(false);
    setAuthComplete(false);
    setUserProfile(null);
    setSelectedWeek(1);
  }, []);

  return (
    <AppContext.Provider value={{
      isLoading,
      onboardingComplete,
      authComplete,
      userProfile,
      selectedWeek,
      completeOnboarding,
      completeAuth,
      updateProfile,
      updateSelectedWeek,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
