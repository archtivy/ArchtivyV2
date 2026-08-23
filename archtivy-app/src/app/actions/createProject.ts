"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { parseGalleryJson, type UploadedGalleryItem } from "@/lib/storage/types";
import { uploadListingDocumentsServer } from "@/lib/storage/documents";
import { addDocuments } from "@/lib/db/listingDocuments";
import { normaliseInstagramHandle } from "@/lib/publish/instagram";
import { getProfileByClerkId } from "@/lib/db/profiles";
import type { ActionResult } from "@/app/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamMember, BrandUsed } from "@/lib/types/listings";
import { setProjectMaterials } from "@/lib/db/materials";
import {
  parseMentionedProductsField,
  hydrateMentionedProducts,
  mentionedProductIds,
} from "@/lib/listings/mentionedProducts";
import { setProjectProductsManualAction } from "@/app/actions/projectBrandsProducts";
import { setListingTaxonomyNode, setListingMaterialNodes, setListingFacets } from "@/lib/taxonomy/taxonomyDb";
import {
  notifyDesignerPublishedProject,
  notifyNearbyUsersOfOpportunity,
  notifyFollowedCategoryNewListing,
  notifyFollowedMaterialNewListing,
} from "@/lib/notifications/create";
import { detectProjectOpportunities } from "@/lib/lifecycle";
import { notifySearchEngines } from "@/lib/seo/indexnow";

const MIN_GALLERY_IMAGES = 3;

/** Human-readable URL slug from title: lowercase, dash-separated, URL-safe (a-z0-9 and - only). */
function slugFromTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "project";
}

async function ensureUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${++n}`;
  }
}

function getGalleryItems(formData: FormData): UploadedGalleryItem[] {
  return parseGalleryJson(formData.get("gallery"));
}

function getDocumentFiles(formData: FormData): File[] {
  const raw = formData.getAll("documents");
  return raw.filter((f): f is File => f instanceof File && f.size > 0);
}

function parseTeamMembers(value: FormDataEntryValue | null): TeamMember[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is TeamMember =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as TeamMember).name === "string" &&
          typeof (x as TeamMember).role === "string"
      )
      .map((x) => ({
        name: x.name,
        role: x.role,
        // Only a string id survives; anything else falls back to free text
        // rather than being passed to the DB unchecked.
        profile_id: typeof x.profile_id === "string" && x.profile_id.trim() ? x.profile_id.trim() : null,
      }));
  } catch {
    return [];
  }
}

function parseBrandsUsed(value: FormDataEntryValue | null): BrandUsed[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is BrandUsed =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as BrandUsed).name === "string"
    );
  } catch {
    return [];
  }
}

function parseMaterialIds(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    return [];
  }
}


/**
 * Persist team members to listing_team_members: for each member call
 * get_or_create_unclaimed_profile(name, titleLabel) then insert row.
 * Deletes existing rows for listingId first. Throws on error.
 */
export async function persistListingTeamMembers(
  supabase: SupabaseClient,
  listingId: string,
  teamMembers: TeamMember[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("listing_team_members")
    .delete()
    .eq("listing_id", listingId);
  if (deleteError) throw new Error(`Failed to clear listing_team_members: ${deleteError.message}`);

  /*
   * profile_id arrives from the browser, so it is validated before it is
   * trusted — otherwise a crafted request could attach a credit to any profile
   * id, including a hidden or soft-deleted one the suggestions never offer.
   * One query for all of them; anything that fails validation falls through to
   * the RPC and becomes an ordinary free-text credit rather than an error.
   */
  const claimedIds = [
    ...new Set(
      teamMembers
        .map((m) => m.profile_id?.trim())
        .filter((id): id is string => !!id)
    ),
  ];
  const validProfileIds = new Set<string>();
  if (claimedIds.length > 0) {
    const { data: okRows } = await supabase
      .from("profiles")
      .select("id")
      .in("id", claimedIds)
      .eq("is_hidden", false)
      .is("deleted_at", null);
    for (const r of (okRows ?? []) as { id: string }[]) validProfileIds.add(r.id);
  }

  for (let i = 0; i < teamMembers.length; i++) {
    const { name, role } = teamMembers[i];
    const displayName = (name ?? "").trim() || null;
    const titleLabel = (role ?? "").trim() || null;
    if (!displayName && !titleLabel) continue;

    /*
     * A credit picked from the suggestions carries the real profile id, so use
     * it directly and skip the RPC entirely.
     *
     * The RPC is what has been generating duplicates: it matches or creates an
     * UNCLAIMED shell by name, so crediting "Schmidt Hammer Lassen" produced a
     * second, username-less SHL rather than attaching to the real one. Live
     * data: 230 of 232 linked credits point at a shell, only 2 at a real
     * profile. It stays as the fallback for genuinely new names — crediting
     * someone who has no profile yet is still valid — but it is no longer the
     * only path.
     */
    const claimed = teamMembers[i].profile_id?.trim() || null;
    const linkedProfileId = claimed && validProfileIds.has(claimed) ? claimed : null;
    let profileId: string | null = linkedProfileId;

    if (!profileId) {
      const { data: rpcProfileId, error: rpcError } = await supabase.rpc(
        "get_or_create_unclaimed_profile",
        { p_display_name: displayName, p_title: titleLabel }
      );
      if (rpcError) throw new Error(`get_or_create_unclaimed_profile: ${rpcError.message}`);
      profileId = typeof rpcProfileId === "string" ? rpcProfileId : null;
    }

    if (!profileId) {
      throw new Error("Could not resolve a profile for this team member.");
    }

    const { error: insertError } = await supabase.from("listing_team_members").insert({
      listing_id: listingId,
      profile_id: profileId,
      display_name: displayName,
      title: titleLabel,
      sort_order: i,
    });
    if (insertError) throw new Error(`Failed to insert listing_team_members: ${insertError.message}`);
  }
}

export async function createProject(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to create a project." };
  }
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) {
    return { error: "Complete onboarding first." };
  }
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const location = (formData.get("location") as string)?.trim() ?? null;
  const location_text = (formData.get("location_text") as string)?.trim() || location || null;
  const location_city = (formData.get("location_city") as string)?.trim() || null;
  const location_country = (formData.get("location_country") as string)?.trim() || null;
  const location_place_name = (formData.get("location_place_name") as string)?.trim() || null;
  const location_latRaw = formData.get("location_lat");
  const location_lngRaw = formData.get("location_lng");
  const location_lat =
    location_latRaw != null && String(location_latRaw).trim() !== ""
      ? Number(String(location_latRaw).trim())
      : null;
  const location_lng =
    location_lngRaw != null && String(location_lngRaw).trim() !== ""
      ? Number(String(location_lngRaw).trim())
      : null;
  const category = (formData.get("category") as string)?.trim() ?? null;
  const taxonomy_node_id = (formData.get("taxonomy_node_id") as string)?.trim() || null;
  const areaSqftRaw = formData.get("area_sqft");
  const area_sqft =
    areaSqftRaw !== null && areaSqftRaw !== ""
      ? Number(String(areaSqftRaw).trim())
      : null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const material_or_finish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const team_members = parseTeamMembers(formData.get("team_members"));
  const material_ids = parseMaterialIds(formData.get("project_material_ids"));
  const mentioned_products_raw = parseMentionedProductsField(formData.get("mentioned_products"));
  const project_status = (formData.get("project_status") as string)?.trim() || null;
  const project_collaboration_status = (formData.get("project_collaboration_status") as string)?.trim() || null;
  const project_looking_for = parseMaterialIds(formData.get("project_looking_for"));

  // Publish-flow fields (columns added 2026-08-10).
  const meta_description = (formData.get("meta_description") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const video_url = (formData.get("video_url") as string)?.trim() || null;
  // Stored as a normalised bare handle — the DB CHECK rejects '@' and URLs, so
  // normalise here rather than let a paste of a profile URL fail the insert.
  const instagramRaw = (formData.get("instagram") as string)?.trim() || "";
  const instagram = normaliseInstagramHandle(instagramRaw);
  if (instagramRaw && !instagram) {
    return { error: "Instagram should be a handle like studioname, not a full URL." };
  }
  // Author-supplied slug (SEO step). Falls back to the title-derived one.
  const slugInput = (formData.get("slug") as string)?.trim().toLowerCase() || "";

  const isDraft = formData.get("draft") === "1";

  if (!title) return { error: "Title is required." };
  if (!isDraft) {
    if (!description) return { error: "Description is required." };
    if (!location) return { error: "Project location is required." };
    if (!taxonomy_node_id && !category) return { error: "Project category is required." };
    if (!year) return { error: "Year is required." };
    if (location_lat == null || location_lng == null || Number.isNaN(location_lat) || Number.isNaN(location_lng)) {
      return { error: "Please select a place from the location search so the project can appear on Explore." };
    }
  }

  // Derive legacy category from taxonomy node when taxonomy is primary but category is empty
  let resolvedCategory: string | null = category;
  if (taxonomy_node_id && !category?.trim()) {
    const { getTaxonomyNodeById } = await import("@/lib/taxonomy/taxonomyDb");
    const nodeRes = await getTaxonomyNodeById(taxonomy_node_id);
    if (nodeRes.data) {
      resolvedCategory = nodeRes.data.legacy_project_category || nodeRes.data.label || null;
    }
  }

  const galleryItems = getGalleryItems(formData);
  if (!isDraft && galleryItems.length < MIN_GALLERY_IMAGES) {
    return {
      error: `At least ${MIN_GALLERY_IMAGES} gallery images are required.`,
    };
  }

  const supabase = getSupabaseServiceClient();
  // The SEO step lets the author edit the slug. Whatever they give is still run
  // through the same slugify + uniqueness path, so a hand-typed value can never
  // produce a URL the platform could not have generated itself.
  const baseSlug = slugFromTitle(slugInput || title || "project");
  const slug = await ensureUniqueSlug(supabase, baseSlug);
  if (!slug || !String(slug).trim()) {
    return { error: "Unable to generate a valid slug for the project." };
  }

  // Picked products arrive as bare ids. Fill in the brand and product names so
  // the stored row is readable on its own, and stays readable if the product is
  // deleted later.
  const mentioned_products = await hydrateMentionedProducts(supabase, mentioned_products_raw);

  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      type: "project",
      listing_type: "project",
      // DRAFT is a real status now, not a validation flag. Previously `draft=1`
      // only relaxed required-field checks and the row still went in as
      // APPROVED — so anything a user believed was saved-not-published was
      // live, public and indexable immediately.
      status: isDraft ? "DRAFT" : "APPROVED",
      deleted_at: null,
      views_count: 0,
      saves_count: 0,
      title,
      description: description || null,
      slug,
      category: resolvedCategory || null,
      project_category: resolvedCategory || null,
      year: year || null,
      area_sqft: area_sqft != null && !Number.isNaN(area_sqft) && area_sqft > 0 ? area_sqft : null,
      location: location_text,
      location_text: location_text,
      location_city: location_city || null,
      location_country: location_country || null,
      location_place_id: null,
      location_lat: location_lat != null && !Number.isNaN(location_lat) ? location_lat : null,
      location_lng: location_lng != null && !Number.isNaN(location_lng) ? location_lng : null,
      material_or_finish: material_or_finish || null,
      team_members,
      brands_used: [],
      mentioned_products: mentioned_products.length > 0 ? mentioned_products : [],
      owner_clerk_user_id: userId,
      owner_profile_id: profile?.id ?? null,
      project_status: project_status || null,
      project_collaboration_status: project_collaboration_status || null,
      project_looking_for: project_looking_for.length > 0 ? project_looking_for : [],
      meta_description,
      website,
      instagram,
      video_url,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!listing?.id) return { error: "Failed to create project." };
  const listingId = listing.id;

  // Set taxonomy node (new DB taxonomy system)
  if (taxonomy_node_id) {
    const taxRes = await setListingTaxonomyNode(listingId, taxonomy_node_id);
    if (taxRes.error) {
      console.warn("[createProject] taxonomy node set error (non-fatal):", taxRes.error);
    }
  }

  if (team_members.length > 0) {
    try {
      await persistListingTeamMembers(supabase, listingId, team_members);
    } catch (err) {
      await supabase.from("listings").delete().eq("id", listingId);
      return {
        error: err instanceof Error ? err.message : "Failed to save team members.",
      };
    }
  }

  if (galleryItems.length > 0) {
    const imageRows = galleryItems.map((item, i) => ({
      listing_id: listingId,
      image_url: item.url,
      alt: item.alt?.trim() || null,
      sort_order: i,
    }));
    const { error: imagesInsertError } = await supabase
      .from("listing_images")
      .insert(imageRows);

    if (imagesInsertError) {
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Failed to save gallery: ${imagesInsertError.message}` };
    }

    const coverImageUrl = galleryItems[0].url;
    await supabase
      .from("listings")
      .update({ cover_image_url: coverImageUrl })
      .eq("id", listingId);

    // Match computation runs in background; cache invalidation happens after completion
    const { enqueueMatchRecomputation } = await import("@/lib/matches/recompute");
    enqueueMatchRecomputation({ event: "project_created", listingId });
  }

  const docFiles = getDocumentFiles(formData);
  if (docFiles.length > 0) {
    const docUpload = await uploadListingDocumentsServer(listingId, docFiles);
    if (docUpload.data?.length) {
      await addDocuments(
        listingId,
        docUpload.data.map((d) => ({
          file_url: d.url,
          file_name: d.fileName,
          file_type: d.fileType,
          storage_path: d.storagePath,
        }))
      );
    }
  }

  if (material_ids.length >= 0) {
    const { error: materialErr } = await setProjectMaterials(listingId, material_ids);
    if (materialErr) {
      return { error: `Failed to save materials: ${materialErr}` };
    }
  }

  // Set material taxonomy nodes + facet values (advanced filters)
  // Always call even for empty arrays so cleared selections are persisted.
  const taxonomyMaterialIds = parseMaterialIds(formData.get("taxonomy_material_ids"));
  const matRes = await setListingMaterialNodes(listingId, taxonomyMaterialIds);
  if (matRes.error) console.warn("[createProject] material nodes error (non-fatal):", matRes.error);
  const facetValueIds = parseMaterialIds(formData.get("facet_value_ids"));
  const facetRes = await setListingFacets(listingId, facetValueIds);
  if (facetRes.error) console.warn("[createProject] facet values error (non-fatal):", facetRes.error);

  // ── THE RELATIONAL EDGE, WHICH NOTHING USED TO WRITE ──────────────────────
  // mentioned_products is the author's stated list; project_product_links is
  // what Explore, the network graph and the admin connection counts actually
  // read. No publish path wrote it — links only ever appeared when an admin
  // tagged a product in a photo. So the wizard's promise that tagging a product
  // "connects your project to that product's page" produced no connection.
  //
  // Manual source, so photo_tag links made later are preserved rather than
  // replaced (setProjectProductsManualAction keeps them).
  const linkedProductIds = mentionedProductIds(mentioned_products);
  if (linkedProductIds.length > 0) {
    const linkRes = await setProjectProductsManualAction(listingId, linkedProductIds);
    if (!linkRes.ok) {
      console.warn("[createProject] product links error (non-fatal):", linkRes.error);
    }
  }

  // Notify followers of this designer — fire and forget
  if (profile?.id) {
    notifyDesignerPublishedProject(profile.id, listingId, title || "Untitled", slug).catch(() => {});
  }

  // Notify followers of this project's category and materials — fire and forget.
  //
  // These two notifiers already existed and had never been called from
  // anywhere, because until now nothing in the UI could produce a category or
  // material follow to receive them. Both are wired here rather than in the
  // taxonomy helpers above so they fire once per publish, after the
  // associations are actually persisted.
  if (taxonomy_node_id) {
    notifyFollowedCategoryNewListing(
      taxonomy_node_id,
      listingId,
      title || "Untitled",
      slug,
      "project"
    ).catch(() => {});
  }
  for (const materialNodeId of taxonomyMaterialIds) {
    notifyFollowedMaterialNewListing(
      materialNodeId,
      listingId,
      title || "Untitled",
      slug,
      "project"
    ).catch(() => {});
  }

  // Notify nearby users if this project is an opportunity — fire and forget
  const projectOpportunities = detectProjectOpportunities(project_status, project_collaboration_status);
  if (projectOpportunities.length > 0) {
    notifyNearbyUsersOfOpportunity({
      listingId,
      listingSlug: slug,
      listingType: "project",
      listingTitle: title || "Untitled",
      // Real coordinates, not city/country strings — the notifier now
      // measures distance rather than matching place names.
      locationLat: location_lat,
      locationLng: location_lng,
      ownerProfileId: profile?.id ?? null,
      opportunity: projectOpportunities[0],
    }).catch(() => {});
  }

  revalidatePath("/explore");
  revalidatePath("/explore/projects");
  revalidatePath("/");
  notifySearchEngines([`/projects/${slug}`]).catch(() => {});
  return {
    id: listingId,
    slug,
  };
}
