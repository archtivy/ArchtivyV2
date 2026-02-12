"use server";

import { redirect } from "next/navigation";
import { bulkUpdateListings, duplicateListingAndGo } from "@/app/(admin)/admin/_actions/listings";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export async function updateAdminProductAction(formData: FormData) {
  const listingId = (formData.get("_listingId") as string)?.trim();
  if (!listingId) {
    redirect("/admin/products?error=missing-id");
  }
  const patch = {
    title: toText(formData.get("title")) || null,
    location: toText(formData.get("location")) || null,
    year: toText(formData.get("year")) || null,
    category: toText(formData.get("category")) || null,
    product_type: toText(formData.get("product_type")) || null,
    feature_highlight: toText(formData.get("feature_highlight")) || null,
    material_or_finish: toText(formData.get("material_or_finish")) || null,
    dimensions: toText(formData.get("dimensions")) || null,
    description: toText(formData.get("description")) || null,
    cover_image_url: toText(formData.get("cover_image_url")) || null,
    owner_profile_id: toText(formData.get("owner_profile_id")) || null,
  };
  const res = await bulkUpdateListings({ ids: [listingId], patch });
  if (!res.ok) {
    redirect(`/admin/products/${listingId}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/admin/products/${listingId}?saved=1`);
}

export async function duplicateProductAction(formData: FormData) {
  const id = (formData.get("_listingId") as string)?.trim();
  if (!id) return;
  await duplicateListingAndGo(id);
}
