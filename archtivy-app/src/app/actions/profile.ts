"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
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

  const input: ProfileUpdateInput = {
    display_name: (formData.get("display_name") as string)?.trim() || null,
    username: username.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50),
    bio: (formData.get("bio") as string)?.trim() || null,
    location_city: (formData.get("location_city") as string)?.trim() || null,
    location_country: (formData.get("location_country") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
    instagram: (formData.get("instagram") as string)?.trim() || null,
    linkedin: (formData.get("linkedin") as string)?.trim() || null,
    designer_discipline: existing.role === "designer" ? designerDiscipline : null,
    brand_type: existing.role === "brand" ? brandType : null,
    reader_type: existing.role === "reader" ? readerType : null,
  };

  const result = await updateProfile(profileId, input);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/me");
  revalidatePath("/");
  if (result.data?.username) {
    revalidatePath(`/u/${encodeURIComponent(result.data.username)}`);
  }
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
