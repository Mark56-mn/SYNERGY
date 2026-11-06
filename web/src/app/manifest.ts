import type { MetadataRoute } from "next";

/**
 * Installable PWA manifest for the ADR-0002 mobile path (same codebase as the
 * web app). Brand icon/pin assets are intentionally absent: inventing brand
 * assets is prohibited by DESIGN_SYSTEM.md; icons land with the real brand
 * design task. The app is honest about this in handoff documents.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SYNERGY",
    short_name: "SYNERGY",
    description:
      "Nigeria-first social and commerce ecosystem connecting people, creators, communities, services and products.",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1220",
    theme_color: "#0B1220",
    // Orientation follows the mobile-first product; rotation is not blocked.
    orientation: "portrait-primary",
  };
}
