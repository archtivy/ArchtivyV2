/**
 * matches table access and match computation data helpers.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { ProjectImageRef, ProductImageRef } from "@/lib/matches/types";

/** Project images: listing_images for listings where type='project'. */
export async function getProjectImageRefs(projectId: string): Promise<ProjectImageRef[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listing_images")
    .select("id, listing_id, image_url")
    .eq("listing_id", projectId)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return [];
  return (data as { id: string; listing_id: string; image_url: string }[]).map((r) => ({
    image_id: r.id,
    project_id: r.listing_id,
    url: r.image_url,
  }));
}

/** All project IDs (listings.type = 'project'). */
export async function getAllProjectIds(): Promise<string[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.from("listings").select("id").eq("type", "project");
  if (error || !data?.length) return [];
  return (data as { id: string }[]).map((r) => r.id);
}

/** Product images for one product. */
export async function getProductImageRefs(productId: string): Promise<ProductImageRef[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("product_images")
    .select("id, product_id, src")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return [];
  return (data as { id: string; product_id: string; src: string }[]).map((r) => ({
    image_id: r.id,
    product_id: r.product_id,
    url: r.src,
  }));
}

/** All product IDs. */
export async function getAllProductIds(): Promise<string[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.from("products").select("id");
  if (error || !data?.length) return [];
  return (data as { id: string }[]).map((r) => r.id);
}
