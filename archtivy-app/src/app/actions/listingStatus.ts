"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { canManageListing } from "@/lib/auth/listingOwnership";
import { prewarmHeroInBackground } from "@/lib/images/prewarmHero";

/**
 * Move one listing between draft and live, for owners and admins alike.
 *
 * ── THE STATUS MODEL IS THE EXISTING ONE ────────────────────────────────────
 * `listings.status` already carries DRAFT / PENDING / APPROVED, and APPROVED is
 * what every public read filters on — the directories, the sitemap, explore,
 * search, the related rails and both detail routes. There is no second field
 * here and no new vocabulary: this writes the same column those readers
 * already obey.
 *
 * APPROVED is the internal name and it stays. "Published" is a word for the
 * interface only, because "Approved" describes a moderation queue rather than
 * what an owner did.
 *
 * PENDING is deliberately not reachable from these controls. Nothing in any
 * user-facing create path produces it, so offering it would add a state to the
 * product that nothing else can currently produce or clear.
 *
 * ── AUTHORISATION IS SERVER-SIDE, ALWAYS ────────────────────────────────────
 * The caller sends a listing id and a target status; everything else is
 * resolved here. Admin is read from the profile row, ownership from
 * `canManageListing` — the predicate that checks BOTH owner columns, because
 * 118 of 129 live listings carry only `owner_profile_id` and a Clerk-id-only
 * check rejects their real owner.
 *
 * No client-side gate is trusted, and the UI's decision to show a button is
 * never the thing that authorises the write.
 */

export type ListingLiveStatus = "DRAFT" | "APPROVED";

export type SetListingStatusResult =
  | { ok: true; status: ListingLiveStatus }
  | { ok: false; error: string };

export async function setListingStatusAction(
  listingId: string,
  next: ListingLiveStatus
): Promise<SetListingStatusResult> {
  if (next !== "DRAFT" && next !== "APPROVED") {
    return { ok: false, error: "Unsupported status." };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, error: "You must be signed in." };

  const supabase = getSupabaseServiceClient();

  /*
   * Read the row before deciding anything. `type` selects whether the products
   * sidecar needs the same write, `slug` drives revalidation, and both owner
   * columns are needed by the ownership predicate.
   */
  const { data: row, error: readError } = await supabase
    .from("listings")
    .select("id, type, slug, status, cover_image_url, owner_clerk_user_id, owner_profile_id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!row) return { ok: false, error: "Listing not found." };

  const listing = row as {
    id: string;
    type: string | null;
    slug: string | null;
    status: string | null;
    cover_image_url: string | null;
    owner_clerk_user_id: string | null;
    owner_profile_id: string | null;
  };

  const profileRes = await getProfileByClerkId(userId);
  const profile = profileRes.data as { id?: string | null; is_admin?: boolean } | null;
  const isAdmin = Boolean(profile?.is_admin);
  const isOwner = canManageListing(listing, userId, profile?.id ?? null);

  if (!isAdmin && !isOwner) {
    // Deliberately the same message either way. Telling a stranger that the
    // listing exists but is not theirs is a small disclosure with no upside.
    return { ok: false, error: "You do not have permission to change this listing." };
  }

  // Already there. Reported as success so a double-submit is idempotent rather
  // than an error the user has to interpret.
  if (listing.status === next) return { ok: true, status: next };

  /*
   * Products carry a sidecar row whose status must not drift from the
   * listing's. Written FIRST and aborted on failure, so the failure mode is
   * "nothing changed" rather than a half-published product — the same ordering
   * approveListingAction uses.
   */
  if (listing.type === "product") {
    const { error: sidecarError } = await supabase
      .from("products")
      .update({ status: next })
      .eq("id", listingId);
    if (sidecarError) {
      return { ok: false, error: `Sidecar update failed, nothing changed: ${sidecarError.message}` };
    }
  }

  const { error: writeError } = await supabase
    .from("listings")
    .update({ status: next })
    .eq("id", listingId);
  if (writeError) return { ok: false, error: writeError.message };

  /*
   * ── ONLY THE STATUS COLUMN MOVES ──────────────────────────────────────────
   * Slug, gallery, taxonomy links, team, materials, product links and every
   * connection are untouched by both directions, which is what makes going
   * back to draft reversible: publishing again restores exactly the listing
   * that was there, at the same URL.
   */

  if (next === "APPROVED") {
    // The same hero warming the canonical publish path performs, reused rather
    // than reimplemented — see prewarmHero.ts. Fire-and-forget; a failure here
    // cannot affect the status change that has already been written.
    prewarmHeroInBackground(listing.cover_image_url);
  }

  revalidateForListing(listing.type, listing.slug);

  return { ok: true, status: next };
}

/**
 * Refresh every surface whose contents depend on this listing being live.
 *
 * Both directions need the same set: publishing has to make the row appear in
 * the directories and its detail page resolve, and un-publishing has to make
 * both stop.
 */
function revalidateForListing(type: string | null, slug: string | null) {
  revalidatePath("/me/listings");
  revalidatePath("/me/dashboard");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");

  if (type === "product") {
    revalidatePath("/products");
    revalidatePath("/products/[...segments]", "page");
  } else {
    revalidatePath("/projects");
    revalidatePath("/projects/[...segments]", "page");
  }
  if (slug) {
    revalidatePath(type === "product" ? `/products/${slug}` : `/projects/${slug}`);
  }
}
