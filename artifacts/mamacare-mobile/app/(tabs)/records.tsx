import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { COLORS, Spacing, BorderRadius } from "@/constants/theme";
import { getDiagnostics, Diagnostic } from "@/utils/careStorage";

interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
}

const categories: CategoryItem[] = [
  {
    id: "lab",
    title: "Lab Results",
    subtitle: "4 New Files",
    icon: "edit-3",
    iconBg: "#EFF6FF",
    iconColor: "#3B82F6",
  },
  {
    id: "ultrasound",
    title: "Ultrasounds",
    subtitle: "8 Images",
    icon: "image",
    iconBg: "#F5F3FF",
    iconColor: "#8B5CF6",
  },
  {
    id: "vaccines",
    title: "Vaccines",
    subtitle: "Up to date",
    icon: "edit-2",
    iconBg: "#ECFDF5",
    iconColor: "#10B981",
  },
  {
    id: "insurance",
    title: "Insurance",
    subtitle: "Active ID",
    icon: "shield",
    iconBg: "#F3F4F6",
    iconColor: "#6B7280",
  },
];

interface RecentDocument {
  id: string;
  title: string;
  date: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
}

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const diagnostics = await getDiagnostics();
      const docs: RecentDocument[] = diagnostics.slice(0, 5).map((d, i) => ({
        id: d.id,
        title:
          d.type === "blood"
            ? "Blood Test Results (CBC)"
            : d.type === "usg"
              ? "Growth Scan Report"
              : "Medical Report",
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        icon: i % 2 === 0 ? "file-text" : "image",
        iconBg: i % 2 === 0 ? "#FEF3C7" : "#F5F3FF",
        iconColor: i % 2 === 0 ? "#F59E0B" : "#8B5CF6",
      }));

      if (docs.length === 0) {
        setRecentDocs([
          {
            id: "1",
            title: "Blood Test Results (CBC)",
            date: "Oct 10, 2030",
            icon: "file-text",
            iconBg: "#FEF3C7",
            iconColor: "#F59E0B",
          },
          {
            id: "2",
            title: "Growth Scan Report",
            date: "Oct 03, 2030",
            icon: "image",
            iconBg: "#F5F3FF",
            iconColor: "#8B5CF6",
          },
        ]);
      } else {
        setRecentDocs(docs);
      }
    } catch (error) {
      console.error("Failed to load records:", error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["2xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Medical Records</ThemedText>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search labs, scans, reports..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <Pressable
              key={category.id}
              style={[
                styles.categoryCard,
                index % 2 === 0
                  ? styles.categoryCardLeft
                  : styles.categoryCardRight,
              ]}
              onPress={() => router.push("/(trackers)/diagnostics")}
            >
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: category.iconBg },
                ]}
              >
                <Feather
                  name={category.icon}
                  size={18}
                  color={category.iconColor}
                />
              </View>
              <ThemedText style={styles.categoryTitle}>
                {category.title}
              </ThemedText>
              <ThemedText style={styles.categorySubtitle}>
                {category.subtitle}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recent Documents</ThemedText>

          {recentDocs.map((doc) => (
            <Pressable key={doc.id} style={styles.documentCard}>
              <View
                style={[styles.documentIcon, { backgroundColor: doc.iconBg }]}
              >
                <Feather name={doc.icon} size={18} color={doc.iconColor} />
              </View>
              <View style={styles.documentDetails}>
                <ThemedText style={styles.documentTitle}>
                  {doc.title}
                </ThemedText>
                <ThemedText style={styles.documentDate}>{doc.date}</ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={COLORS.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  categoryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  categoryCardLeft: {
    marginRight: "4%",
  },
  categoryCardRight: {
    marginRight: 0,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  documentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  documentDetails: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
