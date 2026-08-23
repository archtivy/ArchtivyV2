/**
 * Listing ownership: the single predicate every write guard must use.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * A listing records its owner in TWO columns, and which one is populated
 * depends entirely on how the row was created. Measured against production on
 * 2026-08-22, across the 129 live (non-deleted) listings:
 *
 *   owner_profile_id only, owner_clerk_user_id NULL ... 118
 *   both columns set .................................. 10
 *   owner_clerk_user_id only .......................... 0
 *   neither ........................................... 1
 *
 * Rows seeded or admin-created carry only owner_profile_id; only rows created
 * through the signed-in wizard carry the Clerk id. So a guard written as
 * `listing.owner_clerk_user_id !== userId` rejects the real owner of 118 of 129
 * listings — it is not a stricter check, it is a broken one.
 *
 * The read path (getOwnedListingsForClerkUser) has always ORed both columns,
 * which is why /me/listings showed rows their owner could not then act on.
 *
 * ── FAIL CLOSED ─────────────────────────────────────────────────────────────
 * A listing with neither column set (1 row today) is owned by nobody and is
 * NOT manageable by anybody. Matching a null owner against a null profileId
 * would hand that row to every signed-in user without a profile, so both sides
 * of each comparison are required to be non-empty.
 */

export interface ListingOwnerColumns {
  owner_clerk_user_id?: string | null;
  owner_profile_id?: string | null;
}

/**
 * True when `userId` / `profileId` identify the owner of `listing`.
 *
 * Pass BOTH identifiers wherever they are available. Passing only the Clerk id
 * reproduces the bug this helper exists to fix.
 */
export function canManageListing(
  listing: ListingOwnerColumns | null | undefined,
  userId: string | null | undefined,
  profileId: string | null | undefined
): boolean {
  if (!listing) return false;

  const ownerClerkId = listing.owner_clerk_user_id ?? null;
  const ownerProfileId = listing.owner_profile_id ?? null;

  if (userId && ownerClerkId && ownerClerkId === userId) return true;
  if (profileId && ownerProfileId && ownerProfileId === profileId) return true;

  return false;
}
