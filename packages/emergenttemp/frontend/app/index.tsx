import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!user.onboarded) router.replace("/onboarding");
    else router.replace("/(tabs)/home");
  }, [user, loading, router]);

  return (
    <View style={styles.container} testID="index-loading">
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
