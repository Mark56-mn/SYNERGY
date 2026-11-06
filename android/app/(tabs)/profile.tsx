import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@synergy/design-tokens";

/**
 * Profile foundation placeholder. Identity and profile ownership arrive with
 * the identity tasks; no sign-in surface exists yet and none is faked here.
 */
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.body}>
        Sign-in and profile management will use Supabase Auth through the same
        verification boundary as the website — never a second identity system.
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
