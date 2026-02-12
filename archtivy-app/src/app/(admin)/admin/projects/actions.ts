"use server";

import { redirect } from "next/navigation";
import { bulkUpdateListings, duplicateListingAndGo } from "@/app/(admin)/admin/_actions/listings";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export async function updateAdminProjectAction(formData: FormData) {
  const listingId = (formData.get("_listingId") as string)?.trim();
  if (!listingId) {
    redirect("/admin/projects?error=missing-id");
  }
  const patch = {
    title: toText(formData.get("title")) || null,
    location: toText(formData.get("location")) || null,
    year: toText(formData.get("year")) || null,
    category: toText(formData.get("category")) || null,
    description: toText(formData.get("description")) || null,
    cover_image_url: toText(formData.get("cover_image_url")) || null,
  };
  const res = await bulkUpdateListings({ ids: [listingId], patch });
  if (!res.ok) {
    redirect(`/admin/projects/${listingId}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/admin/projects/${listingId}?saved=1`);
}

export async function duplicateProjectAction(formData: FormData) {
  const id = (formData.get("_listingId") as string)?.trim();
  if (!id) return;
  await duplicateListingAndGo(id);
}
