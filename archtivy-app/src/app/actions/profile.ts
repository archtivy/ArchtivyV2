"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { uploadProfileCover } from "@/lib/storage/avatars";
import {
  getProfileForOwnershipCheck,
  ownsProfile,
  updateProfile,
  isUsernameTaken,
} from "@/lib/db/profiles";
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

  /*
   * Ownership is enforced HERE, server-side, on the row being written — never
   * inferred from the caller's own profile and never trusted from the client.
   * `ownsProfile` is the same rule loadProfilePage uses to show the editor, so
   * the control and the mutation behind it cannot drift apart.
   */
  const existingResult = await getProfileForOwnershipCheck(profileId);
  const existing = existingResult.data;
  if (!existing || !ownsProfile(userId, existing)) {
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
    behance: (formData.get("behance") as string)?.trim() || null,
    twitter_url: (formData.get("twitter_url") as string)?.trim() || null,
    pinterest_url: (formData.get("pinterest_url") as string)?.trim() || null,
    cover_image_url: (formData.get("cover_image_url") as string)?.trim() || null,
    // Trimmed rather than rejected, matching how `username` is sanitised a few
    // lines above. 300 is the limit the textarea enforces; this is the guard
    // for anything that reaches the action another way.
    short_bio: (formData.get("short_bio") as string)?.trim().slice(0, 300) || null,
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
  revalidatePath("/designers");
  revalidatePath("/brands");
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

/**
 * Upload a cover for a profile the caller owns, and return its public URL.
 *
 * ── OWNERSHIP IS CHECKED HERE TOO ───────────────────────────────────────────
 * This writes to storage, which updateProfileAction does not cover, so it
 * repeats the same check with the same `ownsProfile` rule rather than trusting
 * that the UI only offers the control to owners. Without it, any signed-in user
 * could write objects under another profile's storage prefix.
 *
 * It only UPLOADS. The URL goes into the edit draft and is persisted by the
 * normal save, so an upload followed by Cancel leaves the profile unchanged.
 *
 * Removing a cover nulls the column and deliberately does NOT delete the
 * object: the draft is cancellable, and deleting on click would break the
 * rendered cover of an owner who then cancels. The file sits at a fixed path
 * and is overwritten by the next upload, so orphans are bounded to one per
 * profile.
 */
export async function uploadProfileCoverAction(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to update this profile." };

  const profileId = (formData.get("_profileId") as string)?.trim();
  const file = formData.get("file");
  if (!profileId) return { error: "Missing profile." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };

  const existing = (await getProfileForOwnershipCheck(profileId)).data;
  if (!existing || !ownsProfile(userId, existing)) {
    return { error: "Not allowed to update this profile." };
  }

  const result = await uploadProfileCover(profileId, file);
  if (result.error !== null || result.data === null) {
    return { error: result.error ?? "Upload failed." };
  }
  return { url: result.data };
}
