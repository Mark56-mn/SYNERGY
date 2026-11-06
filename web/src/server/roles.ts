import "server-only";

/**
 * Role vocabulary for the foundation.
 *
 * The blueprint's role set is member, creator, provider/seller, advertiser,
 * moderator/support agent, administrator/security operator — with one account
 * capable of holding several roles. The foundation only needs the deny-by-
 * default check shape; the full role/membership model arrives with the
 * identity tasks and is deliberately NOT invented here.
 */
export type Role = "member" | "creator" | "provider" | "moderator";

export const DEFAULT_SESSION_ROLES: Role[] = ["member"];
