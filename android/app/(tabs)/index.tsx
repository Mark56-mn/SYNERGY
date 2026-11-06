import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@synergy/design-tokens";

/**
 * Home foundation screen. Honest placeholder: no fake feed data, no fake
 * accounts. The real social feed arrives with the content/feed tasks.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SYNERGY</Text>
      <Text style={styles.body}>
        A Nigeria-first social and commerce ecosystem. This Android foundation
        shares the same backend, identity authority and domain contracts as the
        website — the web experience stays the first implementation priority.
      </Text>
      <Text style={styles.note}>
        Foundation phase · feature screens arrive with their own tasks.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    gap: 12,
  },
  title: {
    color: colors.primary,
    fontSize: typography.headings.h1.size,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
  },
  note: {
    color: colors.textMuted,
    fontSize: typography.small.size,
    marginTop: "auto",
  },
});
