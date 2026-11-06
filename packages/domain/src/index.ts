/**
 * @synergy/domain — shared SYNERGY domain contracts.
 *
 * This package holds ONLY contract-level shapes: TypeScript types, Zod
 * validation schemas and CONFIRMED-limitation constants (e.g. listing media
 * caps, pre-hire message cap). It contains no business rules, no feature
 * modules, no framework-dependent code, and no server-only code — it must be
 * safe to consume from both the web app and the Android app.
 *
 * Boundary modules (minimum set needed for the first application milestones):
 * - users-and-profiles.ts — users and profiles
 * - providers.ts — provider/business profiles
 * - communities.ts — communities
 * - content.ts — content
 * - listings.ts — listings
 * - bookings.ts — booking requests
 * - messaging.ts — messaging
 *
 * Enquiry/booking state enums are contract shapes for TASK-010; the
 * server-side enforcement rules for those states live in their own tasks.
 */

export * from "./users-and-profiles.js";
export * from "./providers.js";
export * from "./communities.js";
export * from "./content.js";
export * from "./listings.js";
export * from "./bookings.js";
export * from "./messaging.js";
