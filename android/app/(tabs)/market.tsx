import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@synergy/design-tokens";

/**
 * Market foundation placeholder. Discovery and listings arrive with the
 * marketplace tasks; no payments, commissions or escrow behaviour exists.
 */
export default function MarketScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market</Text>
      <Text style={styles.body}>
        Product and service discovery will live here. Payment flows stay out of
        the initial MVP scope entirely.
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
