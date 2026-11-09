/**
 * Public entry for the profile module.
 *
 * The posts module needs to READ the profile table to join an author onto a
 * post and to enforce profile visibility in the same SQL statement that builds
 * the feed (a privacy rule must hold at the query, not only in the UI). That
 * join is the only cross-module table access in the app and it is read-only:
 * nothing outside this module may write `profiles`.
 *
 * The import-boundary check allows a module's `index.ts` / `service.ts` entry
 * points; this file is the documented exception for the profile table shape.
 */
export { profiles, profileVisibilityEnum } from "./schema";
export type { ProfileRow } from "./schema";
