"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { uploadGalleryImagesServer } from "@/lib/storage/gallery";
import { uploadListingDocumentsServer } from "@/lib/storage/documents";
import { addDocuments } from "@/lib/db/listingDocuments";
import { getProfileByClerkId } from "@/lib/db/profiles";
import type { ActionResult } from "@/app/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamMember, BrandUsed } from "@/lib/types/listings";
import { setProjectMaterials } from "@/lib/db/materials";
import { processProjectImages } from "@/lib/matches/pipeline";
import { computeAndUpsertMatchesForProject } from "@/lib/matches/engine";

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

function getImageFiles(formData: FormData): File[] {
  const raw = formData.getAll("images");
  return raw.filter((f): f is File => f instanceof File && f.size > 0);
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
    return parsed.filter(
      (x): x is TeamMember =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as TeamMember).name === "string" &&
        typeof (x as TeamMember).role === "string"
    );
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

export type MentionedProductEntry = { brand_name_text: string; product_name_text: string };

function parseMentionedProducts(value: FormDataEntryValue | null): MentionedProductEntry[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is MentionedProductEntry =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as MentionedProductEntry).brand_name_text === "string" &&
        typeof (x as MentionedProductEntry).product_name_text === "string"
    );
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

  for (let i = 0; i < teamMembers.length; i++) {
    const { name, role } = teamMembers[i];
    const displayName = (name ?? "").trim() || null;
    const titleLabel = (role ?? "").trim() || null;
    if (!displayName && !titleLabel) continue;

    const { data: profileId, error: rpcError } = await supabase.rpc("get_or_create_unclaimed_profile", {
      p_display_name: displayName,
      p_title: titleLabel,
    });
    if (rpcError) throw new Error(`get_or_create_unclaimed_profile: ${rpcError.message}`);
    if (!profileId || typeof profileId !== "string") {
      throw new Error("get_or_create_unclaimed_profile did not return a profile id");
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
  const areaSqftRaw = formData.get("area_sqft");
  const area_sqft =
    areaSqftRaw !== null && areaSqftRaw !== ""
      ? Number(String(areaSqftRaw).trim())
      : null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const material_or_finish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const team_members = parseTeamMembers(formData.get("team_members"));
  const material_ids = parseMaterialIds(formData.get("project_material_ids"));
  const mentioned_products = parseMentionedProducts(formData.get("mentioned_products"));

  const isDraft = formData.get("draft") === "1";

  if (!title) return { error: "Title is required." };
  if (!isDraft) {
    if (!description) return { error: "Description is required." };
    if (!location) return { error: "Project location is required." };
    if (!category) return { error: "Project category is required." };
    if (!year) return { error: "Year is required." };
    if (location_lat == null || location_lng == null || Number.isNaN(location_lat) || Number.isNaN(location_lng)) {
      return { error: "Please select a place from the location search so the project can appear on Explore." };
    }
  }

  const imageFiles = getImageFiles(formData);
  if (!isDraft && imageFiles.length < MIN_GALLERY_IMAGES) {
    return {
      error: `At least ${MIN_GALLERY_IMAGES} gallery images are required.`,
    };
  }

  const supabase = getSupabaseServiceClient();
  const baseSlug = slugFromTitle(title || "project");
  const slug = await ensureUniqueSlug(supabase, baseSlug);
  if (!slug || !String(slug).trim()) {
    return { error: "Unable to generate a valid slug for the project." };
  }

  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      type: "project",
      listing_type: "project",
      status: "APPROVED",
      deleted_at: null,
      views_count: 0,
      saves_count: 0,
      title,
      description: description || null,
      slug,
      category: category || null,
      project_category: category || null,
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
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!listing?.id) return { error: "Failed to create project." };
  const listingId = listing.id;

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

  if (imageFiles.length > 0) {
    const uploadResult = await uploadGalleryImagesServer(listingId, imageFiles);
    if (uploadResult.error || !uploadResult.data?.length) {
      await supabase.from("listings").delete().eq("id", listingId);
      return {
        error: uploadResult.error ?? "Image upload failed.",
      };
    }
    const imageUrls = uploadResult.data;
    const coverImageUrl = imageUrls[0];

    const imageRows = imageUrls.map((image_url, i) => ({
      listing_id: listingId,
      image_url,
      alt: null as string | null,
      sort_order: i,
    }));
    const { error: imagesInsertError } = await supabase
      .from("listing_images")
      .insert(imageRows);

    if (imagesInsertError) {
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Failed to save gallery: ${imagesInsertError.message}` };
    }

    const { error: coverError } = await supabase
      .from("listings")
      .update({ cover_image_url: coverImageUrl })
      .eq("id", listingId);

    if (coverError) {
      // Non-fatal: listing and images are created
    }

    try {
      const pipelineResult = await processProjectImages(listingId);
      console.log("[createProject] image_ai pipeline result: listing_images processed, image_ai rows upserted =", pipelineResult.processed, "errors =", pipelineResult.errors.length, pipelineResult.errors.length ? pipelineResult.errors : "");
      if (pipelineResult.errors.length > 0) {
        console.warn("[createProject] image_ai pipeline errors:", pipelineResult.errors);
      }
      const { upserted, errors: matchErrors } = await computeAndUpsertMatchesForProject(listingId);
      console.log("[createProject] matches upserted =", upserted, "match errors =", matchErrors.length);
      if (matchErrors.length > 0) {
        console.warn("[createProject] matches upsert errors:", matchErrors);
      }
    } catch (e) {
      console.warn("[createProject] matches pipeline non-fatal:", e);
    }
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

  revalidatePath("/explore");
  revalidatePath("/explore/projects");
  revalidatePath("/");
  return {
    id: listingId,
    slug,
  };
}
