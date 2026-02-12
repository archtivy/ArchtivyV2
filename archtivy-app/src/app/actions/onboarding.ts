"use server";

import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/auth/config";
import type { ProfileRole } from "@/lib/auth/config";
import {
  upsertProfileFromOnboarding,
  generateUsername,
  getProfileByClerkId,
  isUsernameTaken,
} from "@/lib/db/profiles";

export type OnboardingResult = { error?: string } | { ok: true };

export async function completeOnboardingAction(
  _prev: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  if (!isClerkConfigured()) {
    return { error: "Auth not configured." };
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const role = (formData.get("role") as string)?.trim();
  if (!role || !["designer", "brand", "reader"].includes(role)) {
    return { error: "Please choose a role." };
  }

  const displayName = (formData.get("display_name") as string)?.trim() || null;
  if (!displayName) {
    return { error: "Display name is required." };
  }

  let username = (formData.get("username") as string)?.trim() || null;
  const designerDiscipline = (formData.get("designer_discipline") as string)?.trim() || null;
  const brandType = (formData.get("brand_type") as string)?.trim() || null;
  const readerType = (formData.get("reader_type") as string)?.trim() || null;

  if (role === "designer" && !designerDiscipline) {
    return { error: "Please select a discipline for designers." };
  }
  if (role === "brand" && !brandType) {
    return { error: "Please select a brand type." };
  }
  if (role === "reader" && !readerType) {
    return { error: "Please select a reader type." };
  }

  if (!username) {
    username = generateUsername(displayName);
  }
  username = username.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50);
  if (!username) {
    username = generateUsername(displayName);
  }

  const existing = await getProfileByClerkId(userId);
  const taken = await isUsernameTaken(username, existing.data?.id);
  if (taken.data) {
    return { error: "Username is already taken." };
  }

  const profileResult = await upsertProfileFromOnboarding({
    clerk_user_id: userId,
    role: role as ProfileRole,
    display_name: displayName,
    username,
    designer_discipline: role === "designer" ? designerDiscipline : null,
    brand_type: role === "brand" ? brandType : null,
    reader_type: role === "reader" ? readerType : null,
  });

  if (profileResult.error) {
    return { error: profileResult.error };
  }

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
  } catch (e) {
    return { error: "Failed to update account. Try again." };
  }

  revalidatePath("/onboarding");
  revalidatePath("/me");
  revalidatePath("/");
  return { ok: true };
}

export async function suggestUsernameAction(displayName: string | null): Promise<string> {
  return generateUsername(displayName || "user");
}
