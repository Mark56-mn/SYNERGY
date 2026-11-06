import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@synergy/design-tokens";

/**
 * Android foundation root layout.
 *
 * Visual direction comes from the SAME shared design tokens the web app uses
 * (@synergy/design-tokens) — dark navy surfaces, mint accents — so the two
 * clients never drift into separate visual identities. Brand imagery is
 * pending (icons/splash are NOT invented here).
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}
