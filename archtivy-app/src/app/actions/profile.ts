"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getProfileByClerkId, updateProfile, isUsernameTaken } from "@/lib/db/profiles";
import type { ProfileUpdateInput } from "@/lib/types/profiles";

export type ProfileActionResult = { error?: string } | { ok: true };

export async function updateProfileAction(
  profileId: string,
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to update profile." };
  }

  const existingResult = await getProfileByClerkId(userId);
  const existing = existingResult.data;
  if (!existing || existing.id !== profileId) {
    return { error: "Not allowed to update this profile." };
  }

  const username = (formData.get("username") as string)?.trim();
  if (!username) {
    return { error: "Username is required." };
  }
  const taken = await isUsernameTaken(username, profileId);
  if (taken.data) {
    return { error: "Username is already taken." };
  }

  const designerDiscipline = (formData.get("designer_discipline") as string)?.trim() || null;
  const brandType = (formData.get("brand_type") as string)?.trim() || null;
  const readerType = (formData.get("reader_type") as string)?.trim() || null;
  const locationPlaceName = (formData.get("location_place_name") as string)?.trim() || null;
  const locationCity = (formData.get("location_city") as string)?.trim() || null;
  const locationCountry = (formData.get("location_country") as string)?.trim() || null;
  const locationLatRaw = formData.get("location_lat");
  const locationLngRaw = formData.get("location_lng");
  const locationLat =
    locationLatRaw != null && String(locationLatRaw).trim() !== ""
      ? Number(String(locationLatRaw).trim())
      : null;
  const locationLng =
    locationLngRaw != null && String(locationLngRaw).trim() !== ""
      ? Number(String(locationLngRaw).trim())
      : null;
  const locationMapboxId = (formData.get("location_mapbox_id") as string)?.trim() || null;
  const locationVisibility =
    (formData.get("location_visibility") as string)?.trim() === "private" ? "private" : "public";

  const showDesignerDiscipline =
    formData.get("show_designer_discipline") === "true";
  const showBrandType =
    formData.get("show_brand_type") === "true";

  const input: ProfileUpdateInput = {
    display_name: (formData.get("display_name") as string)?.trim() || null,
    username: username.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50),
    bio: (formData.get("bio") as string)?.trim() || null,
    location_place_name: locationPlaceName,
    location_city: locationCity,
    location_country: locationCountry,
    location_lat: locationLat,
    location_lng: locationLng,
    location_mapbox_id: locationMapboxId,
    location_visibility: locationVisibility,
    website: (formData.get("website") as string)?.trim() || null,
    instagram: (formData.get("instagram") as string)?.trim() || null,
    linkedin: (formData.get("linkedin") as string)?.trim() || null,
    designer_discipline: existing.role === "designer" ? designerDiscipline : null,
    brand_type: existing.role === "brand" ? brandType : null,
    reader_type: existing.role === "reader" ? readerType : null,
  };
  if (existing.role === "designer") input.show_designer_discipline = showDesignerDiscipline;
  if (existing.role === "brand") input.show_brand_type = showBrandType;

  const result = await updateProfile(profileId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/me");
  revalidatePath("/");
  revalidatePath(`/u/id/${profileId}`);
  revalidatePath("/explore/designers");
  revalidatePath("/explore/brands");
  revalidatePath("/explore");
  if (result.data?.username) {
    revalidatePath(`/u/${encodeURIComponent(result.data.username)}`);
  }
  revalidateTag(CACHE_TAGS.profiles);
  revalidateTag(CACHE_TAGS.explore);
  return { ok: true };
}

/**
 * Form-level server action for profile edit. Reads profileId from formData._profileId
 * so the Client Component can use this action without receiving it as a prop.
 */
export async function updateProfileActionForm(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const profileId = (formData.get("_profileId") as string)?.trim();
  if (!profileId) {
    return { error: "Missing profile." };
  }
  return updateProfileAction(profileId, _prev, formData);
}
