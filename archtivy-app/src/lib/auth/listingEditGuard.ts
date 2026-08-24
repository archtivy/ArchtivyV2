import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { canManageListing } from "@/lib/auth/listingOwnership";

/**
 * Shared guard: resolves the caller, loads the listing, and confirms ownership.
 *
 * ── WHY THIS LIVES IN lib/ AND NOT IN THE ACTION FILE ───────────────────────
 * It was a private function inside app/actions/updateListing.ts. publishListing
 * needs exactly the same check, and that file is "use server" — every export
 * there becomes a callable RPC endpoint, so it could not simply be exported to
 * share it. Copying it into a second action file would leave two independent
 * copies of an authorisation boundary, which is how the two drift and one of
 * them stops being right. It is a plain module now, importable by any number of
 * actions and callable from none.
 *
 * Uses canManageListing rather than an owner_clerk_user_id comparison — 118 of
 * the 129 live listings carry only owner_profile_id, so the narrower check
 * would lock their real owners out of editing exactly as it did out of
 * deleting.
 */
export type ListingEditAuth =
  | { error: string }
  | {
      listing: Record<string, unknown>;
      profileId: string | null;
      userId: string;
    };

export async function authorizeListingEdit(
  listingId: string,
  expectedType: "project" | "product"
): Promise<ListingEditAuth> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to edit a listing." };

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) return { error: "Complete onboarding first." };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return { error: "Listing not found." };
  const listing = data as Record<string, unknown>;

  if (!canManageListing(listing, userId, profile.id ?? null)) {
    return { error: "You can only edit your own listings." };
  }
  if (listing.type !== expectedType) {
    return { error: `That listing is not a ${expectedType}.` };
  }

  return { listing, profileId: profile.id ?? null, userId };
}
