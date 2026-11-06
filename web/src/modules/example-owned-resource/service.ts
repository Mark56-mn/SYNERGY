/**
 * Example owned-resource module — the ADR-0006/0003 SERVICE-layer reference.
 *
 * This module exists to demonstrate and test the protected-resource boundary
 * that every real module must follow. It is NOT a product feature: when the
 * first real modules (identity, content, marketplace…) land, this module is
 * deleted or its routes are replaced — never shipped as user-facing surface.
 *
 * The reference service shows the required pattern:
 *   1. resolve the caller from a VERIFIED session (never from request data),
 *   2. deny unauthenticated callers outright,
 *   3. run the ownership/role check before touching data,
 *   4. use the parameterised data-access boundary for reads/writes,
 * almost like an in-memory store for tests (test double, not production
 * data access); real modules use the server/db client factory instead.
 */

import type { Session } from "@/server/auth/session";
import { notFound } from "@/server/http/errors";
import { requireAuthenticatedUser } from "@/server/authz";

export interface OwnedItem {
  id: string;
  ownerId: string;
  title: string;
  createdAtIso: string;
}

/** In-memory repository — a clearly labelled TEST DOUBLE, not production data access. */
export class InMemoryOwnedItemRepository {
  private readonly items = new Map<string, OwnedItem>();
  private sequence = 0;

  insert(item: Omit<OwnedItem, "id" | "createdAtIso">): OwnedItem {
    const itemWithId: OwnedItem = {
      ...item,
      id: `item_${++this.sequence}`,
      createdAtIso: new Date().toISOString(),
    };
    this.items.set(itemWithId.id, itemWithId);
    return itemWithId;
  }

  /** All items owned by `ownerId`. */
  listByOwner(ownerId: string): OwnedItem[] {
    return [...this.items.values()].filter((item) => item.ownerId === ownerId);
  }

  /** Deleted when the caller proved ownership; no-op otherwise. */
  deleteOwned(id: string, ownerId: string): boolean {
    const item = this.items.get(id);
    if (!item || item.ownerId !== ownerId) {
      return false;
    }
    this.items.delete(id);
    return true;
  }
}

export interface OwnedResourceService {
  listOwnItems(session: Session | null): OwnedItem[];
  createItem(session: Session | null, input: { title: string }): OwnedItem;
  deleteItem(session: Session | null, itemId: string): void;
}

export function createOwnedResourceService(
  repository: InMemoryOwnedItemRepository,
): OwnedResourceService {
  return {
    /** Only the owner's own items are ever returned. */
    listOwnItems(session: Session | null): OwnedItem[] {
      const user = requireAuthenticatedUser(session);
      return repository.listByOwner(user.userId);
    },

    /** Items are created attributed to the VERIFIED caller, never a passed-in ID. */
    createItem(session: Session | null, input: { title: string }): OwnedItem {
      const user = requireAuthenticatedUser(session);
      return repository.insert({ ownerId: user.userId, title: input.title });
    },

    /**
     * Ownership check BEFORE deletion. Another user's item is answered as
     * `not_found` so the API neither confirms its existence nor leaks that
     * it exists (deny-by-default + information minimisation).
     */
    deleteItem(session: Session | null, itemId: string): void {
      const user = requireAuthenticatedUser(session);
      // Only the owner's own items can match their list; anything else is
      // answered as not-found without touching the repository mutation path.
      const owned = repository
        .listByOwner(user.userId)
        .some((item) => item.id === itemId);
      if (!owned) {
        throw notFound();
      }
      repository.deleteOwned(itemId, user.userId);
    },
  };
}
