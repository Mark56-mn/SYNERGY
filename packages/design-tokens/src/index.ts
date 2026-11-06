/**
 * SYNERGY design tokens — single shared source for web and Android.
 *
 * Base values are the DESIGN_SYSTEM.md starter tokens (initial implementation
 * recommendations pending visual review). TASK-004 extends the set with the
 * interaction-state colours, radius/shadow and type scale that the responsive
 * experience needs. Reuse these; do not scatter hex values across product
 * code.
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
  success: "#5BC98F",
  danger: "#F07178",
  warning: "#F4C66A",
  /** Modal/drawer scrim; the only translucent token. */
  overlay: "rgba(4, 8, 16, 0.72)",
} as const;

/** Radius scale (DESIGN_SYSTEM.md starter values + pill radius). */
export const radii = {
  sm: "8px",
  md: "14px",
  lg: "20px",
  full: "999px",
} as const;

/** 4-based spacing ramp used by layouts and components. */
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
} as const;

/** Elevation is deliberately restrained: one raised surface for overlays. */
export const shadows = {
  raised: "0 16px 40px rgba(4, 8, 16, 0.55)",
} as const;

/**
 * Typography: system font stacks only (no web-font request — first paint stays
 * fast on slow networks). `typeScale` is the responsive ramp; sizes are px,
 * line heights are px, weights are strings.
 */
export const typeScale = {
  xs: { size: 12, lineHeight: 16, weight: "500" },
  sm: { size: 14, lineHeight: 20, weight: "400" },
  base: { size: 16, lineHeight: 24, weight: "400" },
  lg: { size: 18, lineHeight: 26, weight: "500" },
  xl: { size: 22, lineHeight: 30, weight: "600" },
  "2xl": { size: 28, lineHeight: 34, weight: "700" },
  "3xl": { size: 34, lineHeight: 40, weight: "700" },
} as const;

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

export const tokens = {
  colors,
  radii,
  spacing,
  shadows,
  typeScale,
  typography,
} as const;

export default tokens;
