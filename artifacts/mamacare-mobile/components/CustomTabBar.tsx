import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { COLORS } from "@/constants/theme";

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "sun",
  timeline: "clock",
  care: "heart",
  records: "folder",
  profile: "user",
};

const TAB_LABELS: Record<string, string> = {
  index: "Today",
  timeline: "Timeline",
  care: "Care",
  records: "Records",
  profile: "Profile",
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const activeColor = isDark ? "#A78BFA" : COLORS.primary;
  const inactiveColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(28,28,30,0.4)";
  const pillBg = isDark ? "rgba(30,27,50,0.82)" : "rgba(255,255,255,0.72)";
  const pillBorder = isDark ? "rgba(167,139,250,0.18)" : "rgba(108,99,255,0.12)";
  const activePillBg = isDark ? "rgba(167,139,250,0.2)" : "rgba(108,99,255,0.1)";

  const bottomPad = isWeb ? 20 : Math.max(insets.bottom, 8) + 4;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomPad }]}
    >
      <View style={styles.shadowWrap}>
        {isIOS ? (
          <BlurView
            intensity={70}
            tint={isDark ? "dark" : "light"}
            style={[styles.pill, { borderColor: pillBorder }]}
          >
            <TabItems
              state={state}
              descriptors={descriptors}
              navigation={navigation}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              activePillBg={activePillBg}
            />
          </BlurView>
        ) : (
          <View style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
            <TabItems
              state={state}
              descriptors={descriptors}
              navigation={navigation}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              activePillBg={activePillBg}
            />
          </View>
        )}
      </View>
    </View>
  );
}

type TabItemsProps = Pick<BottomTabBarProps, "state" | "descriptors" | "navigation"> & {
  activeColor: string;
  inactiveColor: string;
  activePillBg: string;
};

function TabItems({ state, descriptors, navigation, activeColor, inactiveColor, activePillBg }: TabItemsProps) {
  return (
    <>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = TAB_ICONS[route.name] ?? "circle";
        const label = TAB_LABELS[route.name] ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <View style={[styles.tabInner, isFocused && { backgroundColor: activePillBg }]}>
              <Feather name={iconName} size={21} color={isFocused ? activeColor : inactiveColor} />
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? activeColor : inactiveColor },
                  isFocused && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  shadowWrap: {
    width: "100%",
    borderRadius: 50,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  pill: {
    flexDirection: "row",
    borderRadius: 50,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 40,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: "700",
  },
});
