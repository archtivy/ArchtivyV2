import { supabase } from "@/lib/supabaseClient";

/**
 * ⚠️ DEPRECATED 2026-08-23 — `listing_saves` is no longer written.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * There were two unconnected save mechanisms. This one wrote `listing_saves`;
 * the other writes `folders` / `folder_items` through SaveToFolderModal. Only
 * the second is ever read — `/me/saved` renders boards, and getSavedListingIds
 * below has had no callers at all.
 *
 * So every save made through this path was written to a table nothing queries.
 * You pressed Save, a row was inserted, and the item appeared nowhere. Boards
 * are now the single save mechanism (SaveToggle → SaveToBoardPopover →
 * folder_items).
 *
 * ── WHY THE TABLE IS NOT DROPPED ────────────────────────────────────────────
 * It holds real rows: genuine save intent from real users, recorded even
 * though nothing surfaced it. Dropping it would destroy the only record of
 * what people tried to save, and it is the input any future backfill into
 * folder_items would need. Per Database Bible, a table that still holds
 * meaning is deprecated in the code, not deleted from the schema.
 *
 * The functions below are kept for that eventual backfill and for the two
 * remaining callers, both on chains no route renders (DetailActions via
 * ListingDetailHero, and RemoveFromSavedButton). Do not wire anything new to
 * them — use @/app/actions/savedFolders.
 *
 * ── ORIGINAL NOTE ───────────────────────────────────────────────────────────
 * Saved listings.
 *
 * ── REPOINTED 2026-08-08: user_saves -> listing_saves ───────────────────────
 * This module wrote to `user_saves`, which has never existed. Every save
 * therefore failed, on every card, across all five directory pages.
 *
 * `listing_saves` is the real table and was already correctly shaped — it just
 * had nothing writing to it. Verified against production:
 *
 *   id             uuid  pk
 *   listing_id     uuid  not null, FK -> listings.id
 *   clerk_user_id  text  not null
 *   created_at     timestamptz not null
 *   unique (listing_id, clerk_user_id)   -- confirmed by probe
 *
 * The column names are identical to what this file already sent, so the fix is
 * the table name and nothing else. Per Database Bible Single Source of Truth,
 * `user_saves` and `saved_listings` are NOT created — one save table, and this
 * is it. See DATA_INTEGRITY_LOG.md item 6.
 */
const TABLE = "listing_saves";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Saved listing ids for a user, most recently saved first.
 *
 * A read error is logged and returns an empty list rather than throwing: the
 * saved page degrades to "nothing saved" instead of erroring. The previous
 * version returned `{ data: [], error: null }` SILENTLY, which is part of why a
 * completely missing table went unnoticed — an empty saved page looks identical
 * to a broken one. The log line is the difference.
 */
export async function getSavedListingIds(
  clerkUserId: string
): Promise<DbResult<string[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("listing_id")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`[userSaves] read failed: ${error.code ?? "?"} ${error.message}`);
    return { data: [], error: null };
  }
  const ids = (data ?? []).map((row: { listing_id: string }) => row.listing_id);
  return { data: ids, error: null };
}

/**
 * Add a listing to a user's saved list.
 *
 * Saving something already saved is a no-op, not an error: the unique index on
 * (listing_id, clerk_user_id) makes a double-tap raise 23505, and surfacing
 * "duplicate key" to someone who pressed Save twice would be nonsense.
 */
export async function addSave(
  clerkUserId: string,
  listingId: string
): Promise<DbResult<void>> {
  const { error } = await supabase.from(TABLE).insert({
    clerk_user_id: clerkUserId,
    listing_id: listingId,
  });
  if (error) {
    if (error.code === "23505") return { data: undefined, error: null };
    return { data: null, error: error.message };
  }
  return { data: undefined, error: null };
}

/**
 * Remove a listing from a user's saved list.
 */
export async function removeSave(
  clerkUserId: string,
  listingId: string
): Promise<DbResult<void>> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("listing_id", listingId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
