import { Tabs } from "expo-router";
import { Text } from "react-native";

import { colors } from "@synergy/design-tokens";

/**
 * Primary navigation foundation for Android, matching the web's candidate IA
 * (Home, Services, Create, Market, Profile). Labels/IA remain a RECOMMENDED
 * pattern pending product-design validation (DESIGN_SYSTEM.md). Glyph-free
 * text labels are used because brand iconography must not be invented here.
 *
 * No feature screens are implemented behind these tabs yet: each screen is an
 * honest foundation placeholder, clearly labelled.
 */
const TABS = [
  { name: "index", label: "Home" },
  { name: "services", label: "Services" },
  { name: "create", label: "Create" },
  { name: "market", label: "Market" },
  { name: "profile", label: "Profile" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            // No invented icons: text-only tab labels until real brand assets exist.
            tabBarIcon: () => <Text style={{ color: colors.primary }}>•</Text>,
          }}
        />
      ))}
    </Tabs>
  );
}
