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
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  docType: string;
}

interface RecentDocument {
  id: string;
  title: string;
  date: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
}

const CATEGORY_DEFS: Omit<CategoryItem, "id">[] = [
  { title: "Lab Results",  icon: "edit-3",  iconBg: "#EFF6FF", iconColor: "#3B82F6", docType: "blood" },
  { title: "Ultrasounds",  icon: "image",   iconBg: "#F5F3FF", iconColor: "#8B5CF6", docType: "usg" },
  { title: "Vaccines",     icon: "edit-2",  iconBg: "#ECFDF5", iconColor: "#10B981", docType: "vaccine" },
  { title: "Insurance",    icon: "shield",  iconBg: "#F3F4F6", iconColor: "#6B7280", docType: "insurance" },
];

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [categories, setCategories] = useState<(CategoryItem & { count: number })[]>(
    CATEGORY_DEFS.map((c, i) => ({ ...c, id: String(i), count: 0 }))
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const diagnostics = await getDiagnostics();

      const countByType: Record<string, number> = {};
      for (const d of diagnostics) {
        countByType[d.type] = (countByType[d.type] ?? 0) + 1;
      }
      setCategories(
        CATEGORY_DEFS.map((c, i) => ({
          ...c,
          id: String(i),
          count: countByType[c.docType] ?? 0,
        }))
      );

      const docs: RecentDocument[] = diagnostics.slice(0, 5).map((d, i) => ({
        id: d.id,
        title:
          d.type === "blood"
            ? "Blood Test Results"
            : d.type === "usg"
              ? "Ultrasound Report"
              : d.type === "vaccine"
                ? "Vaccine Record"
                : "Medical Document",
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        icon: d.type === "usg" ? "image" : "file-text",
        iconBg: i % 2 === 0 ? "#FEF3C7" : "#F5F3FF",
        iconColor: i % 2 === 0 ? "#F59E0B" : "#8B5CF6",
      }));
      setRecentDocs(docs);
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
                {category.count > 0 ? `${category.count} file${category.count !== 1 ? "s" : ""}` : "No files"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recent Documents</ThemedText>

          {recentDocs.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="folder" size={32} color="#D1D5DB" />
              <ThemedText style={styles.emptyStateText}>No documents uploaded yet</ThemedText>
            </View>
          ) : null}
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
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
