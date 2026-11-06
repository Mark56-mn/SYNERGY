/**
 * SYNERGY design tokens — single shared source for web and Android.
 *
 * Values are the DESIGN_SYSTEM.md starter tokens (initial implementation
 * recommendations pending visual review). Reuse these; do not scatter
 * hex values across product code.
 */

export const colors = {
  bg: "#0B1220",
  surface: "#111C2E",
  surfaceRaised: "#17243A",
  border: "#26364D",
  text: "#F4F7FA",
  textMuted: "#A9B7C8",
  primary: "#63E6BE",
  primaryHover: "#43D6A9",
  danger: "#F07178",
  warning: "#F4C66A",
} as const;

/** Radius scale (DESIGN_SYSTEM.md starter values). */
export const radii = {
  sm: "8px",
  md: "14px",
  lg: "20px",
} as const;

/**
 * Spacing scale: an initial 4-based ramp recommended here and pending visual
 * review. Web uses these via its spacing utilities; Android via the theme.
 */
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
} as const;

/**
 * Typography: system font stacks only for now (no web-font dependency —
 * keeps first paint fast on slow networks). Exact type scale is a visual
 * review follow-up; Android maps System to the platform default.
 */
export const typography = {
  fontFamilies: {
    sans: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ],
    mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
  } as const,
  headings: {
    h1: { size: 28, lineHeight: 34, weight: "700" },
    h2: { size: 22, lineHeight: 28, weight: "700" },
    h3: { size: 18, lineHeight: 24, weight: "600" },
  } as const,
  body: { size: 16, lineHeight: 24, weight: "400" },
  small: { size: 14, lineHeight: 20, weight: "400" },
} as const;

export const tokens = { colors, radii, spacing, typography } as const;
export default tokens;
