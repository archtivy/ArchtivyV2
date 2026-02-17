"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import {
  createPhotoProductTagPlaceholder,
  updatePhotoProductTag,
  removePhotoProductTag,
  getListingIdByTagId,
  searchSuggestedProducts as dbSearchSuggestedProducts,
  getTagCategoryOptions as dbGetTagCategoryOptions,
  getTagSubcategoryOptions as dbGetTagSubcategoryOptions,
  getSuggestedProductsForWorkstation as dbGetSuggestedProductsForWorkstation,
  type UpdatePhotoProductTagInput,
  type TagSuggestionProduct,
  type SearchSuggestedProductsFilters,
  type WorkstationSuggestedProduct,
  type WorkstationSuggestedFilters,
} from "@/lib/db/photoProductTags";

export type { TagSuggestionProduct };
import { getListingSlugById } from "@/lib/db/listings";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { ActionResultSuccess } from "./types";

const PPL = "project_product_links";

/** Admin-only: create a placeholder tag (hotspot) at x,y. Returns tag id. */
export async function createTag(
  listingImageId: string,
  listingId: string,
  x: number,
  y: number
): Promise<ActionResultSuccess<{ id: string }>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not signed in" };
  const res = await createPhotoProductTagPlaceholder(listingImageId, listingId, x, y, userId);
  if (res.error) return { ok: false, error: res.error };
  revalidatePath(`/admin/projects/[id]`, "page");
  const projectSlug = await getListingSlugById(listingId);
  if (projectSlug) revalidatePath(`/projects/${projectSlug}`, "page");
  return { ok: true, data: { id: res.data!.id } };
}

/** Admin-only: update tag metadata and/or product_id. When product_id is set, upserts project_product_links. */
export async function updateTag(
  tagId: string,
  listingId: string,
  input: UpdatePhotoProductTagInput
): Promise<ActionResultSuccess<{ id: string }>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await updatePhotoProductTag(tagId, input);
  if (res.error) return { ok: false, error: res.error };
  const productId = res.data!.product_id ?? input.product_id;
  if (productId && listingId) {
    const supabase = getSupabaseServiceClient();
    const { data: existing } = await supabase
      .from(PPL)
      .select("source")
      .eq("project_id", listingId)
      .eq("product_id", productId)
      .maybeSingle();
    if ((existing as { source?: string } | null)?.source !== "manual") {
      await supabase
        .from(PPL)
        .upsert(
          { project_id: listingId, product_id: productId, source: "photo_tag" },
          { onConflict: "project_id,product_id" }
        );
    }
  }
  revalidatePath(`/admin/projects/[id]`, "page");
  const projectSlug = await getListingSlugById(listingId);
  if (projectSlug) revalidatePath(`/projects/${projectSlug}`, "page");
  return { ok: true, data: { id: tagId } };
}

/** Admin-only: delete a tag. */
export async function deleteTag(tagId: string): Promise<ActionResultSuccess<void>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await removePhotoProductTag(tagId);
  if (res.error) return { ok: false, error: res.error };
  revalidatePath(`/admin/projects/[id]`, "page");
  const listingId = await getListingIdByTagId(tagId);
  if (listingId) {
    const projectSlug = await getListingSlugById(listingId);
    if (projectSlug) revalidatePath(`/projects/${projectSlug}`, "page");
  }
  return { ok: true };
}

/** Admin-only: search products for tag suggestions. */
export async function searchSuggestedProducts(
  filters: SearchSuggestedProductsFilters
): Promise<ActionResultSuccess<TagSuggestionProduct[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbSearchSuggestedProducts(filters, 25);
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? [] };
}

/** Admin-only: get category options for tag editor. */
export async function getTagCategoryOptions(): Promise<ActionResultSuccess<string[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbGetTagCategoryOptions();
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? [] };
}

/** Admin-only: get subcategory options for tag editor. */
export async function getTagSubcategoryOptions(): Promise<ActionResultSuccess<string[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbGetTagSubcategoryOptions();
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? [] };
}

export type { WorkstationSuggestedProduct, WorkstationSuggestedFilters };

/** Admin-only: suggested products for tagging workstation with Best Match scoring. */
export async function getSuggestedProductsForWorkstation(
  filters: WorkstationSuggestedFilters
): Promise<
  ActionResultSuccess<{ bestMatch: WorkstationSuggestedProduct[]; allResults: WorkstationSuggestedProduct[] }>
> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbGetSuggestedProductsForWorkstation(filters, 50);
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? { bestMatch: [], allResults: [] } };
}
