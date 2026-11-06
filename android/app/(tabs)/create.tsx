import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@synergy/design-tokens";

/**
 * Create foundation placeholder. Publishing, listing creation and community
 * creation surfaces arrive with their own tasks and ownership rules.
 */
export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create</Text>
      <Text style={styles.body}>
        Publishing, listing and community creation will start here once the
        identity and content foundations are live.
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
