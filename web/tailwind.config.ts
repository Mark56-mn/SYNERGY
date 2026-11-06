import type { Config } from "tailwindcss";

/**
 * Web Tailwind configuration. Every colour/radius/shadow value below maps to
 * the shared CSS custom properties from @synergy/design-tokens/tokens.css —
 * this file contains no raw hex values, so the tokens stay single-source.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        ink: "var(--color-text)",
        "ink-muted": "var(--color-text-muted)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        overlay: "var(--color-overlay)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        raised: "var(--shadow-raised)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      // Shared 4-based ramp.
      spacing: {
        tokens: "var(--space-md)",
      },
      maxWidth: {
        content: "42rem",
        rail: "20rem",
      },
    },
  },
  plugins: [],
};

export default config;
