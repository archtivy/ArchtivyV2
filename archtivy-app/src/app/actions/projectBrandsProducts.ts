"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import {
  getProjectBrandIds,
  setProjectBrands as dbSetProjectBrands,
  searchBrandProfiles,
} from "@/lib/db/projectBrands";
import {
  getPhotoProductTagsByImageIds,
  addPhotoProductTag as dbAddPhotoProductTag,
  removePhotoProductTag as dbRemovePhotoProductTag,
} from "@/lib/db/photoProductTags";

const PPL = "project_product_links";

/** Server: search products (listings type=product) for autocomplete; optional brand filter. */
export async function searchProductsAction(
  q: string,
  brandProfileId?: string | null
): Promise<{
  data: { id: string; title: string; slug: string | null }[] | null;
  error: string | null;
}> {
  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from("listings")
    .select("id, title, slug")
    .eq("type", "product")
    .is("deleted_at", null)
    .order("title")
    .limit(25);
  const term = typeof q === "string" ? q.trim() : "";
  if (term.length > 0) {
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (brandProfileId) {
    query = query.eq("owner_profile_id", brandProfileId);
  }
  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []) as { id: string; title: string; slug: string | null }[],
    error: null,
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Server: set brands for a project (project_brand_links). Optionally sync listings.brands_used for explore filters. */
export async function setProjectBrandsAction(
  projectId: string,
  brandProfileIds: string[]
): Promise<ActionResult> {
  const res = await dbSetProjectBrands(projectId, brandProfileIds);
  if (res.error) return { ok: false, error: res.error };
  const supabase = getSupabaseServiceClient();
  const profilesRes = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", brandProfileIds);
  const profiles = (profilesRes.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[];
  const brands_used = profiles.map((p) => ({
    name: (p.display_name || p.username || p.id).trim(),
    logo_url: p.avatar_url ?? undefined,
  }));
  await supabase
    .from("listings")
    .update({ brands_used })
    .eq("id", projectId);
  revalidatePath("/explore/projects");
  revalidatePath("/");
  revalidatePath(`/projects/[slug]`, "page");
  return { ok: true };
}

/** Server: get brand profile ids for a project. */
export async function getProjectBrandIdsAction(
  projectId: string
): Promise<{ data: string[] | null; error: string | null }> {
  return getProjectBrandIds(projectId);
}

/** Server: search brand profiles for autocomplete. */
export async function searchBrandsAction(
  q: string,
  limit?: number
): Promise<{
  data: { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[] | null;
  error: string | null;
}> {
  return searchBrandProfiles(q, limit ?? 20);
}

/** Server: set products linked to project with source='manual' (replace existing manual links). */
export async function setProjectProductsManualAction(
  projectId: string,
  productIds: string[]
): Promise<ActionResult> {
  const supabase = getSupabaseServiceClient();
  const { data: existing } = await supabase
    .from(PPL)
    .select("product_id, source")
    .eq("project_id", projectId);
  const existingRows = (existing ?? []) as { product_id: string; source: string }[];
  const toKeep = existingRows.filter((r) => r.source === "photo_tag").map((r) => r.product_id);
  const toAdd = Array.from(new Set(productIds)).filter(Boolean);
  const toRemove = existingRows
    .filter((r) => r.source === "manual" && !toAdd.includes(r.product_id))
    .map((r) => r.product_id);
  for (const productId of toRemove) {
    await supabase.from(PPL).delete().eq("project_id", projectId).eq("product_id", productId);
  }
  for (const pid of toAdd) {
    if (toKeep.includes(pid)) continue;
    await supabase.from(PPL).upsert(
      { project_id: projectId, product_id: pid, source: "manual" },
      { onConflict: "project_id,product_id" }
    );
  }
  revalidatePath("/explore/projects");
  revalidatePath("/");
  revalidatePath(`/projects/[slug]`, "page");
  return { ok: true };
}

/** Server: add photo product tag and upsert PPL with source='photo_tag'. */
export async function addPhotoProductTagAction(
  listingImageId: string,
  listingId: string,
  productId: string,
  x: number,
  y: number
): Promise<{ data: { id: string } | null; error: string | null }> {
  const res = await dbAddPhotoProductTag(listingImageId, listingId, productId, x, y);
  if (res.error) return { data: null, error: res.error };
  if (!res.data) return { data: null, error: "No tag returned" };
  revalidatePath(`/projects/[slug]`, "page");
  return { data: { id: res.data.id }, error: null };
}

/** Server: remove photo product tag. */
export async function removePhotoProductTagAction(
  tagId: string
): Promise<ActionResult> {
  const res = await dbRemovePhotoProductTag(tagId);
  if (res.error) return { ok: false, error: res.error };
  revalidatePath(`/projects/[slug]`, "page");
  return { ok: true };
}

/** Server: get photo product tags for listing image ids. */
export async function getPhotoProductTagsAction(
  listingImageIds: string[]
): Promise<{
  data: { id: string; listing_image_id: string; product_id: string; x: number; y: number }[] | null;
  error: string | null;
}> {
  const res = await getPhotoProductTagsByImageIds(listingImageIds);
  if (res.error) return { data: null, error: res.error };
  return {
    data: (res.data ?? []).map((t) => ({
      id: t.id,
      listing_image_id: t.listing_image_id,
      product_id: t.product_id,
      x: t.x,
      y: t.y,
    })),
    error: null,
  };
}
