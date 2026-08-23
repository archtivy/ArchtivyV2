"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { canManageListing } from "@/lib/auth/listingOwnership";
import { replaceGallery } from "@/lib/db/listingGallery";
import { normaliseInstagramHandle } from "@/lib/publish/instagram";
import { parseGalleryJson } from "@/lib/storage/types";
import {
  setListingTaxonomyNode,
  setListingMaterialNodes,
  setListingFacets,
  getTaxonomyNodeById,
} from "@/lib/taxonomy/taxonomyDb";
import { setProjectMaterials, setProductMaterials } from "@/lib/db/materials";
import {
  parseMentionedProductsField,
  hydrateMentionedProducts,
  mentionedProductIds,
} from "@/lib/listings/mentionedProducts";
import { setProjectProductsManualAction } from "@/app/actions/projectBrandsProducts";
import { persistListingTeamMembers } from "@/app/actions/createProject";
import { notifySearchEngines } from "@/lib/seo/indexnow";
import type { ActionResult } from "./types";
import type { TeamMember } from "@/lib/types/listings";

/**
 * Owner-side edit for an existing listing.
 *
 * ── WHY NOT REUSE THE CREATE ACTIONS ────────────────────────────────────────
 * Create and update differ in more than the verb. Create picks a slug, inserts
 * through create_product_with_sidecar, sets an initial status, and fires
 * "new listing" notifications to followers. None of that is correct on an edit:
 * a slug change breaks every inbound link, and re-notifying followers on every
 * save would turn a typo fix into a broadcast.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT CHANGE ──────────────────────────────────
 * · slug — the public URL is stable once published. The wizard's SEO step still
 *   shows it, but read-only in edit mode.
 * · status — editing never publishes and never unpublishes. A DRAFT stays a
 *   draft unless the author uses Publish, which is the one path that promotes
 *   it; an APPROVED listing is not silently returned to review.
 * · owner columns — reassignment is an admin operation, not a self-serve one.
 *
 * ── REPLACE SEMANTICS ───────────────────────────────────────────────────────
 * Relationship sets (images, taxonomy, materials, facets, team) are REPLACED
 * with what the form submitted, not merged. The wizard always posts the full
 * set it loaded, so a merge would make removals impossible — the author could
 * add a material forever but never delete one.
 */

const PRODUCT_MIN_DESC_WORDS = 200;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseStringArray(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseTeamMembers(value: FormDataEntryValue | null): TeamMember[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is TeamMember =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as TeamMember).name === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Shared guard: resolves the caller, loads the listing, and confirms ownership.
 *
 * Uses canManageListing rather than an owner_clerk_user_id comparison — 118 of
 * the 129 live listings carry only owner_profile_id, so the narrower check
 * would lock their real owners out of editing exactly as it did out of
 * deleting.
 */
async function authorizeListingEdit(
  listingId: string,
  expectedType: "project" | "product"
): Promise<
  | { error: string }
  | {
      listing: Record<string, unknown>;
      profileId: string | null;
      userId: string;
    }
> {
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

/**
 * Material-taxonomy and facet links, applied ONLY when the form actually
 * carries them.
 *
 * ── ABSENT IS NOT EMPTY ─────────────────────────────────────────────────────
 * setListingMaterialNodes / setListingFacets both REPLACE the full set, and the
 * create actions call them unconditionally — harmless on insert, because there
 * is nothing yet to destroy. On update it is not harmless: neither wizard has a
 * control for these two fields, so neither posts them, and calling the setters
 * with the resulting [] would delete every material node and facet value the
 * listing has on the author's first save. Those are exactly the links the
 * advanced filters run on, so the listing would quietly drop out of them.
 *
 * FormData.get() returns null for an absent key and "" for a present-but-empty
 * one, which is the whole distinction: absent means "this form does not manage
 * that", empty means "the author cleared it".
 */
async function applyOptionalTaxonomySets(
  listingId: string,
  formData: FormData,
  logLabel: string
): Promise<void> {
  const rawMaterialNodes = formData.get("taxonomy_material_ids");
  if (rawMaterialNodes !== null) {
    const res = await setListingMaterialNodes(listingId, parseStringArray(rawMaterialNodes));
    if (res.error) console.warn(`[${logLabel}] material nodes:`, res.error);
  }

  const rawFacets = formData.get("facet_value_ids");
  if (rawFacets !== null) {
    const res = await setListingFacets(listingId, parseStringArray(rawFacets));
    if (res.error) console.warn(`[${logLabel}] facets:`, res.error);
  }
}

/** Cache busting shared by both update paths. */
function revalidateListing(type: "project" | "product", slug: string) {
  revalidatePath("/");
  revalidatePath("/me/listings");
  revalidatePath(`/explore/${type}s`);
  revalidatePath(`/${type}s/${slug}`);
  revalidateTag(CACHE_TAGS.listings);
  revalidateTag(CACHE_TAGS.explore);
  revalidateTag(`${type}:${slug}`);
}

// ─── Project ────────────────────────────────────────────────────────────────

export async function updateProjectCanonical(
  listingId: string,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await authorizeListingEdit(listingId, "project");
  if ("error" in authResult) return authResult;
  const { listing } = authResult;

  const isDraft = String(listing.status) === "DRAFT";
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const locationText = (formData.get("location_text") as string)?.trim() || null;
  const locationCity = (formData.get("location_city") as string)?.trim() || null;
  const locationCountry = (formData.get("location_country") as string)?.trim() || null;
  const latRaw = formData.get("location_lat");
  const lngRaw = formData.get("location_lng");
  const locationLat =
    latRaw != null && String(latRaw).trim() !== "" ? Number(String(latRaw).trim()) : null;
  const locationLng =
    lngRaw != null && String(lngRaw).trim() !== "" ? Number(String(lngRaw).trim()) : null;
  const category = (formData.get("category") as string)?.trim() || null;
  const taxonomyNodeId = (formData.get("taxonomy_node_id") as string)?.trim() || null;
  const year = (formData.get("year") as string)?.trim() || null;
  const areaRaw = formData.get("area_sqft");
  const areaSqft =
    areaRaw != null && String(areaRaw).trim() !== "" ? Number(String(areaRaw).trim()) : null;
  const materialOrFinish = (formData.get("material_or_finish") as string)?.trim() || null;
  const teamMembers = parseTeamMembers(formData.get("team_members"));
  const materialIds = parseStringArray(formData.get("project_material_ids"));
  const mentionedProductsRaw = parseMentionedProductsField(formData.get("mentioned_products"));
  const projectStatus = (formData.get("project_status") as string)?.trim() || null;
  const projectCollab = (formData.get("project_collaboration_status") as string)?.trim() || null;
  const projectLookingFor = parseStringArray(formData.get("project_looking_for"));
  const metaDescription = (formData.get("meta_description") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const instagramRaw = (formData.get("instagram") as string)?.trim() || "";
  const instagram = normaliseInstagramHandle(instagramRaw);
  if (instagramRaw && !instagram) {
    return { error: "Instagram should be a handle like studioname, not a full URL." };
  }

  if (!title) return { error: "Title is required." };
  // A published project must stay publishable. Draft edits stay permissive so
  // an unfinished draft can be saved again without being completed first.
  if (!isDraft) {
    if (!description) return { error: "Description is required." };
    if (!locationText) return { error: "Project location is required." };
    if (!taxonomyNodeId && !category) return { error: "Project category is required." };
    if (!year) return { error: "Year is required." };
  }

  let resolvedCategory = category;
  if (taxonomyNodeId && !category) {
    const nodeRes = await getTaxonomyNodeById(taxonomyNodeId);
    if (nodeRes.data) {
      resolvedCategory = nodeRes.data.legacy_project_category || nodeRes.data.label || null;
    }
  }

  const supabase = getSupabaseServiceClient();

  // Was parseStringArray, which stored bare product ids — a shape neither the
  // public project page nor the admin form could read. Normalised and hydrated
  // into the canonical object shape now; free-text entries typed in the admin
  // form survive the round-trip untouched.
  const mentionedProducts = await hydrateMentionedProducts(supabase, mentionedProductsRaw);

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      title,
      description,
      category: resolvedCategory,
      project_category: resolvedCategory,
      year,
      area_sqft: areaSqft != null && !Number.isNaN(areaSqft) && areaSqft > 0 ? areaSqft : null,
      location: locationText,
      location_text: locationText,
      location_city: locationCity,
      location_country: locationCountry,
      location_lat: locationLat != null && !Number.isNaN(locationLat) ? locationLat : null,
      location_lng: locationLng != null && !Number.isNaN(locationLng) ? locationLng : null,
      material_or_finish: materialOrFinish,
      team_members: teamMembers,
      mentioned_products: mentionedProducts,
      project_status: projectStatus,
      project_collaboration_status: projectCollab,
      project_looking_for: projectLookingFor,
      meta_description: metaDescription,
      website,
      instagram,
      video_url: videoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (updateError) return { error: updateError.message };

  const galleryError = await replaceGallery(listingId, parseGalleryJson(formData.get("gallery")));
  if (galleryError) return { error: galleryError };

  if (taxonomyNodeId) {
    const taxRes = await setListingTaxonomyNode(listingId, taxonomyNodeId);
    if (taxRes.error) console.warn("[updateProject] taxonomy set failed:", taxRes.error);
  }

  await applyOptionalTaxonomySets(listingId, formData, "updateProject");

  const { error: legacyMatErr } = await setProjectMaterials(listingId, materialIds);
  if (legacyMatErr) return { error: `Failed to save materials: ${legacyMatErr}` };

  try {
    await persistListingTeamMembers(supabase, listingId, teamMembers);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save team members." };
  }

  // Keep project_product_links in step with the author's picks. Replace
  // semantics, matching every other relationship set on this action — an
  // unticked product must actually lose its link. photo_tag links are
  // preserved by setProjectProductsManualAction.
  const linkRes = await setProjectProductsManualAction(
    listingId,
    mentionedProductIds(mentionedProducts)
  );
  if (!linkRes.ok) console.warn("[updateProject] product links failed:", linkRes.error);

  const slug = String(listing.slug ?? "");
  revalidateListing("project", slug);
  if (!isDraft && slug) notifySearchEngines([`/projects/${slug}`]).catch(() => {});

  return { slug };
}

// ─── Product ────────────────────────────────────────────────────────────────

export async function updateProductCanonical(
  listingId: string,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await authorizeListingEdit(listingId, "product");
  if ("error" in authResult) return authResult;
  const { listing } = authResult;

  const isDraft = String(listing.status) === "DRAFT";
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const taxonomyNodeId = (formData.get("taxonomy_node_id") as string)?.trim() || null;
  const colorOptions = parseStringArray(formData.get("color_options"));
  const materialIds = parseStringArray(formData.get("product_material_ids"));
  const metaDescription = (formData.get("meta_description") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const instagramRaw = (formData.get("instagram") as string)?.trim() || "";
  const instagram = normaliseInstagramHandle(instagramRaw);
  if (instagramRaw && !instagram) {
    return { error: "Instagram should be a handle like studioname, not a full URL." };
  }

  if (!title) return { error: "Product title is required." };
  if (!isDraft) {
    if (!description) return { error: "Product description is required." };
    const words = countWords(description);
    if (words < PRODUCT_MIN_DESC_WORDS) {
      return {
        error: `Description must be at least ${PRODUCT_MIN_DESC_WORDS} words (currently ${words}).`,
      };
    }
  }

  // Mirrors createProductCanonical: legacy product_type/category/subcategory are
  // derived from the taxonomy node when the author has not set them directly.
  let productType = (formData.get("product_type") as string)?.trim() || null;
  let productCategory = (formData.get("product_category") as string)?.trim() || null;
  let productSubcategory = (formData.get("product_subcategory") as string)?.trim() || null;
  if (taxonomyNodeId && !productType) {
    const nodeRes = await getTaxonomyNodeById(taxonomyNodeId);
    if (nodeRes.data) {
      productType = nodeRes.data.legacy_product_type || null;
      productCategory = nodeRes.data.legacy_product_category || productCategory;
      productSubcategory = nodeRes.data.legacy_product_subcategory || productSubcategory;
    }
  }

  const supabase = getSupabaseServiceClient();

  // The two tables hold DIFFERENT columns, mirroring how
  // create_product_with_sidecar splits them — verified against the live schema
  // rather than assumed symmetrical:
  //   listings → product_type / product_category / product_subcategory,
  //              description, and the publish-flow fields
  //   products → subtitle (which IS the description), color_options, color
  // `listings` has no color_options column and `products` has no product_type
  // column, so writing either to the wrong table fails with 42703.
  const { error: updateError } = await supabase
    .from("listings")
    .update({
      title,
      description,
      product_type: productType,
      product_category: productCategory,
      product_subcategory: productSubcategory,
      meta_description: metaDescription,
      website,
      instagram,
      video_url: videoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (updateError) return { error: updateError.message };

  // A product is a listings row PLUS a products sidecar sharing the same id;
  // the public detail page reads from both. Updating only `listings` would
  // leave the sidecar showing the pre-edit title and description.
  const { error: sidecarError } = await supabase
    .from("products")
    .update({
      title,
      subtitle: description,
      color_options: colorOptions,
      // Scalar `color` mirrors the RPC's rule: first colour, or null.
      color: colorOptions.length > 0 ? colorOptions[0] : null,
    })
    .eq("id", listingId);
  if (sidecarError) {
    console.error("[updateProduct] sidecar update failed:", sidecarError.message);
    return { error: `Failed to update product record: ${sidecarError.message}` };
  }

  const galleryError = await replaceGallery(listingId, parseGalleryJson(formData.get("gallery")));
  if (galleryError) return { error: galleryError };

  if (taxonomyNodeId) {
    const taxRes = await setListingTaxonomyNode(listingId, taxonomyNodeId);
    if (taxRes.error) console.warn("[updateProduct] taxonomy set failed:", taxRes.error);
  }

  await applyOptionalTaxonomySets(listingId, formData, "updateProduct");

  const { error: legacyMatErr } = await setProductMaterials(listingId, materialIds);
  if (legacyMatErr) return { error: `Failed to save materials: ${legacyMatErr}` };

  const slug = String(listing.slug ?? "");
  revalidateListing("product", slug);
  if (!isDraft && slug) notifySearchEngines([`/products/${slug}`]).catch(() => {});

  return { slug };
}
