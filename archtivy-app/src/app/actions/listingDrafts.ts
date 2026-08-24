"use server";

import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { authorizeListingEdit } from "@/lib/auth/listingEditGuard";
import { canManageListing } from "@/lib/auth/listingOwnership";
import { ensureUniqueListingSlug } from "@/lib/db/listings";
import { replaceGallery } from "@/lib/db/listingGallery";
import { parseGalleryJson } from "@/lib/storage/types";
import { slugFromTitle } from "@/lib/db/gallery";
import { notifySearchEngines } from "@/lib/seo/indexnow";
import {
  notifyDesignerPublishedProject,
  notifyBrandPublishedProduct,
  notifyFollowedCategoryNewListing,
  notifyFollowedMaterialNewListing,
} from "@/lib/notifications/create";
import { getListingMaterialNodeIds } from "@/lib/taxonomy/taxonomyDb";

/**
 * Draft-first persistence for the publish wizard.
 *
 * ── THE PROBLEM THIS SOLVES ─────────────────────────────────────────────────
 * The wizard uploaded images to storage immediately but created no `listings`
 * row until final submit, so there were no `listing_images` rows and therefore
 * no listing_image.id until after publish. Product tagging pins to an image id,
 * which is why tagging could only ever be a separate step afterwards.
 *
 * The row is created when the IMAGES STEP COMPLETES, not at wizard start. An
 * abandoned wizard that never got as far as choosing a photo should not leave a
 * row behind, and until there is at least one image there is nothing a tag
 * could attach to anyway.
 *
 * After that the wizard is an edit form: every later step posts through
 * updateProjectCanonical / updateProductCanonical, which already replace the
 * gallery, relink products, relax validation for drafts and — importantly —
 * never touch slug or status. No new autosave infrastructure.
 *
 * ── SELF-SERVE ONLY, DELIBERATELY ───────────────────────────────────────────
 * The admin wizard keeps its single-submit flow. In admin context the owner is
 * chosen inside the form, so creating the row at the Images step would mean
 * writing a listing with no owner — the exact shape that made orphaned rows
 * publishable and unmanageable. An admin draft would have to either block on
 * owner selection first or accept an ownerless row, and neither is worth it for
 * a surface whose author is already an admin.
 */

const MIN_GALLERY_IMAGES = 3;

type DraftResult = { id: string } | { error: string };

/**
 * An explicit `ok` discriminant rather than `"error" in result`: the success
 * branch and the failure branch share no keys, and `in`-narrowing across an
 * inferred union of three object literals leaves `error` as `string | undefined`
 * at the call site. A boolean tag narrows cleanly and reads better besides.
 */
type AuthorContext =
  | { ok: false; error: string }
  | { ok: true; userId: string; profileId: string | null; role: string | null };

async function currentAuthor(): Promise<AuthorContext> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to start a listing." };
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data as
    | { id?: string | null; username?: string | null; role?: string | null }
    | null;
  if (!profile?.username) return { ok: false, error: "Complete onboarding first." };
  return {
    ok: true,
    userId,
    profileId: profile.id ?? null,
    role: profile.role ?? null,
  };
}

/**
 * Create the DRAFT shell for a project and attach the uploaded gallery.
 *
 * ── SLUG IS NULL UNTIL PUBLISH ──────────────────────────────────────────────
 * A draft's slug is not a real claim. Assigning one here would let an abandoned
 * draft hold "riverside-house" permanently against every future author, because
 * ensureUniqueListingSlug tests every row regardless of status. listings.slug is
 * nullable and idx_listings_slug_unique is partial (WHERE slug IS NOT NULL AND
 * slug <> ''), so a null costs nothing and collides with nothing.
 */
export async function createProjectDraft(galleryJson: string): Promise<DraftResult> {
  const who = await currentAuthor();
  if (!who.ok) return { error: who.error };

  const gallery = parseGalleryJson(galleryJson);
  if (gallery.length === 0) return { error: "Add at least one image first." };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({
      type: "project",
      listing_type: "project",
      status: "DRAFT",
      // Honest placeholder: the Information step has not been reached yet, so
      // the project genuinely has no title. /me/listings shows it as-is rather
      // than inventing a name the author never typed.
      title: "Untitled project",
      slug: null,
      owner_clerk_user_id: who.userId,
      owner_profile_id: who.profileId,
      cover_image_url: gallery[0]?.url ?? null,
      team_members: [],
      brands_used: [],
    })
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: error?.message ?? "Could not start the draft." };
  const listingId = (data as { id: string }).id;

  const galleryError = await replaceGallery(listingId, gallery);
  if (galleryError) return { error: galleryError };

  revalidatePath("/me/listings");
  return { id: listingId };
}

/**
 * Create the DRAFT shell for a product and attach the uploaded gallery.
 *
 * ── WHY THIS ONE GETS A PLACEHOLDER SLUG, NOT NULL ──────────────────────────
 * Products are created through create_product_with_sidecar, which writes the
 * listings row and the products sidecar in one transaction and explicitly
 * rejects an empty slug ("create_product_with_sidecar: slug is required").
 * Bypassing the RPC to allow a null would reintroduce the split-write that left
 * orphaned sidecar rows in the first place.
 *
 * So the draft gets `draft-<uuid>` — machine-shaped and deliberately NOT derived
 * from the title, so it claims nothing a future author would ever want. Publish
 * replaces it with the real slug. That satisfies the point of "null until
 * publish": no human-readable slug is held hostage by an abandoned draft.
 */
export async function createProductDraft(galleryJson: string): Promise<DraftResult> {
  const who = await currentAuthor();
  if (!who.ok) return { error: who.error };

  // Same allow-list as createProductCanonical: a role added later has to be
  // granted publishing explicitly rather than inherit it by omission.
  if (who.role !== "brand" && who.role !== "designer") {
    return { error: "Your account type cannot publish products." };
  }

  const gallery = parseGalleryJson(galleryJson);
  if (gallery.length === 0) return { error: "Add at least one image first." };

  const supabase = getSupabaseServiceClient();
  const { data: newId, error: rpcError } = await supabase.rpc("create_product_with_sidecar", {
    p_title: "Untitled product",
    p_description: null,
    p_slug: `draft-${randomUUID()}`,
    p_owner_profile_id: who.profileId,
    p_product_type: null,
    p_product_category: null,
    p_product_subcategory: null,
    p_status: "DRAFT",
    p_owner_clerk_user_id: who.userId,
    p_color_options: [],
    p_product_stage: null,
    p_product_collaboration_status: null,
    p_product_looking_for: [],
  });

  if (rpcError) return { error: `Could not start the draft: ${rpcError.message}` };
  if (!newId) return { error: "Could not start the draft." };
  const listingId = newId as string;

  const galleryError = await replaceGallery(listingId, gallery);
  if (galleryError) return { error: galleryError };
  await supabase
    .from("listings")
    .update({ cover_image_url: gallery[0]?.url ?? null })
    .eq("id", listingId);

  revalidatePath("/me/listings");
  return { id: listingId };
}

/**
 * Bring a DRAFT's listing_images rows in line with what the wizard is holding.
 *
 * ── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────
 * The draft's gallery is written once, when the Images step completes. An author
 * who then goes back and adds a photo has it in wizard state and in storage, but
 * not yet as a listing_images row — and a pin attaches to a listing_image.id. So
 * the tagging step would offer the wrong set of photos: the ones that existed
 * when the draft was born, not the ones on screen.
 *
 * Called when the tagging step opens, so the two agree before anything can be
 * pinned to a stale id.
 *
 * ── DRAFTS ONLY ─────────────────────────────────────────────────────────────
 * A published listing's gallery is already persisted and is edited through the
 * normal save path. Replacing it as a side effect of opening a step would let a
 * half-finished edit take effect without the author pressing anything.
 *
 * replaceGallery diffs on image_url and keeps the rows for images that stayed,
 * so existing pins survive a sync — that is the whole reason it was rewritten to
 * diff rather than delete-and-reinsert.
 */
export async function syncDraftGallery(
  listingId: string,
  galleryJson: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await currentAuthor();
  if (!who.ok) return { ok: false, error: who.error };

  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("listings")
    .select("id, status, owner_profile_id, owner_clerk_user_id, deleted_at")
    .eq("id", listingId)
    .maybeSingle();
  const row = data as {
    status?: string;
    owner_profile_id?: string | null;
    owner_clerk_user_id?: string | null;
    deleted_at?: string | null;
  } | null;

  if (!row || row.deleted_at) return { ok: false, error: "Listing not found." };
  if (!canManageListing(row, who.userId, who.profileId)) {
    return { ok: false, error: "You can only edit your own listings." };
  }
  // Not an error — a published listing simply has nothing to scaffold.
  if (row.status !== "DRAFT") return { ok: true };

  const gallery = parseGalleryJson(galleryJson);
  if (gallery.length === 0) return { ok: true };

  const error = await replaceGallery(listingId, gallery);
  if (error) return { ok: false, error };
  return { ok: true };
}

/**
 * Promote a DRAFT to its published state.
 *
 * ── THE TWO TYPES PUBLISH TO DIFFERENT STATUSES, ON PURPOSE ─────────────────
 * A project goes straight to APPROVED; a product goes to PENDING and waits for
 * review. That asymmetry is an existing, intentional review gate — it is
 * preserved verbatim here rather than unified.
 *
 * ── SLUG IS ASSIGNED HERE, ONCE ─────────────────────────────────────────────
 * This is the moment the listing becomes real, so it is the moment it earns a
 * URL. Republishing an already-published listing is not this action's job:
 * anything that is not a DRAFT is refused, so a slug can never be silently
 * rewritten under existing inbound links.
 */
export async function publishListing(
  listingId: string,
  type: "project" | "product"
): Promise<{ slug: string } | { error: string }> {
  const authResult = await authorizeListingEdit(listingId, type);
  if ("error" in authResult) return authResult;
  const { listing, profileId } = authResult;

  if (String(listing.status) !== "DRAFT") {
    return { error: "This listing has already been published." };
  }

  const title = String(listing.title ?? "").trim();
  if (!title || title === "Untitled project" || title === "Untitled product") {
    return { error: "Add a title before publishing." };
  }
  if (!String(listing.description ?? "").trim()) {
    return { error: "Add a description before publishing." };
  }

  const supabase = getSupabaseServiceClient();
  const { count: imageCount } = await supabase
    .from("listing_images")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if ((imageCount ?? 0) < MIN_GALLERY_IMAGES) {
    return { error: `At least ${MIN_GALLERY_IMAGES} gallery images are required.` };
  }

  // The draft either has no slug (project) or a draft-<uuid> placeholder
  // (product). Either way the real one is derived now, from the final title.
  const slug = await ensureUniqueListingSlug(slugFromTitle(title));
  const nextStatus = type === "project" ? "APPROVED" : "PENDING";

  const { error: updateError } = await supabase
    .from("listings")
    .update({ slug, status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (updateError) return { error: updateError.message };

  if (type === "product") {
    // Sidecar slug must track the listing's, or /products/[slug] and the
    // sidecar disagree about what this row is called.
    const { error: sidecarError } = await supabase
      .from("products")
      .update({ slug, status: nextStatus })
      .eq("id", listingId);
    if (sidecarError) {
      console.error("[publishListing] sidecar slug sync failed:", sidecarError.message);
    }
  }

  // ── Announcements fire HERE, not at draft creation ────────────────────────
  // This is the first moment the listing is something a follower could go and
  // look at. Notifying earlier would announce a URL that 404s for everyone.
  if (profileId) {
    if (type === "project") {
      notifyDesignerPublishedProject(profileId, listingId, title, slug).catch(() => {});
    } else {
      notifyBrandPublishedProduct(profileId, listingId, title, slug).catch(() => {});
    }
  }

  // Category and materials come off the row and its links, not off a FormData
  // — by publish time both were persisted by the update actions several steps
  // ago. listings.taxonomy_node_id is the denormalised primary node.
  const categoryNodeId = listing.taxonomy_node_id ? String(listing.taxonomy_node_id) : null;
  if (categoryNodeId) {
    notifyFollowedCategoryNewListing(categoryNodeId, listingId, title, slug, type).catch(() => {});
  }
  const materialNodes = await getListingMaterialNodeIds(listingId);
  for (const materialNodeId of materialNodes.data ?? []) {
    notifyFollowedMaterialNewListing(materialNodeId, listingId, title, slug, type).catch(() => {});
  }

  revalidatePath("/");
  revalidatePath("/me/listings");
  revalidatePath("/explore");
  revalidatePath(`/explore/${type}s`);
  revalidatePath(`/${type}s/${slug}`);
  revalidateTag(CACHE_TAGS.listings);
  revalidateTag(CACHE_TAGS.explore);
  revalidateTag(`${type}:${slug}`);

  // Only an APPROVED row is reachable, so only a project is worth announcing to
  // search engines. A PENDING product would be submitted as a 404.
  if (nextStatus === "APPROVED") {
    notifySearchEngines([`/${type}s/${slug}`]).catch(() => {});
  }

  return { slug };
}
