import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProvider, useApp } from "@/context/AppContext";
import { KeyboardWrapper } from "@/components/KeyboardWrapper";
import { requestNotificationPermissions } from "@/utils/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading, authComplete } = useApp();
  const router = useRouter();
  const segments = useSegments();
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthScreen = segments[0] === "auth";
    if (!authComplete && !inAuthScreen) {
      router.replace("/auth");
    } else if (authComplete && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [isLoading, authComplete, segments]);

  useEffect(() => {
    if (authComplete && !permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermissions();
    }
  }, [authComplete]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(trackers)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardWrapper>
            <AppProvider>
              <RootLayoutNav />
            </AppProvider>
          </KeyboardWrapper>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
