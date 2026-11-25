/**
 * Public entry for the social-graph module.
 *
 * The posts module needs to READ the `follows` table to restrict a feed to the
 * creators a viewer follows, in the same SQL statement that enforces profile
 * visibility. That join is the only cross-module table access for the graph and
 * it is read-only: nothing outside this module may write `follows`.
 *
 * This mirrors the documented `profile/index.ts` exception for `profiles`.
 */
export { follows } from "./schema";
export type { FollowRow } from "./schema";
