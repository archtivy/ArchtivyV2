import { supabase } from "@/lib/supabaseClient";

const TABLE = "user_saves";
// Table schema: clerk_user_id (text), listing_id (uuid), created_at (timestamptz default now()).
// Unique on (clerk_user_id, listing_id). Create in Supabase if Saved page is used.

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Get saved listing IDs for a user (order: recently saved first).
 * Requires table: user_saves (clerk_user_id, listing_id, created_at).
 * If table does not exist, returns { data: [], error: null } on read error.
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
    return { data: [], error: null };
  }
  const ids = (data ?? []).map((row: { listing_id: string }) => row.listing_id);
  return { data: ids, error: null };
}

/**
 * Add a listing to user's saved list.
 */
export async function addSave(
  clerkUserId: string,
  listingId: string
): Promise<DbResult<void>> {
  const { error } = await supabase.from(TABLE).insert({
    clerk_user_id: clerkUserId,
    listing_id: listingId,
  });
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Remove a listing from user's saved list.
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
