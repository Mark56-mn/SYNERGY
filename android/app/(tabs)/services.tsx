import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@synergy/design-tokens";

/**
 * Services foundation placeholder. The marketplace/provider-profile feature
 * arrives with its own tasks; nothing resembling fake businesses is shown.
 */
export default function ServicesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Services</Text>
      <Text style={styles.body}>
        Service and product listings from individual and business providers will
        be discovered here, with provider acceptance controls built into the
        booking flow.
      </Text>
      <Text style={styles.note}>
        Not shipping yet — foundation placeholder.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  title: {
    color: colors.text,
    fontSize: typography.headings.h2.size,
    fontWeight: "700",
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
  },
  note: {
    color: colors.textMuted,
    fontSize: typography.small.size,
    marginTop: "auto",
  },
});
