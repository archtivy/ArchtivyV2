"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProfileByClerkId } from "@/lib/db/profiles";
import {
  isFollowing,
  addFollow,
  removeFollow,
  type FollowTargetType,
} from "@/lib/db/follows";
import { notifyNewFollower } from "@/lib/notifications/create";
import { getTaxonomyNodeBySlugPath } from "@/lib/taxonomy/taxonomyDb";

interface ToggleFollowResult {
  following: boolean;
  error?: string;
}

export async function toggleFollow(
  targetType: FollowTargetType,
  targetId: string
): Promise<ToggleFollowResult> {
  const { userId } = await auth();
  if (!userId) return { following: false, error: "Sign in to follow." };

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) return { following: false, error: "Profile not found." };

  const alreadyFollowing = await isFollowing(profile.id, targetType, targetId);

  if (alreadyFollowing) {
    const { error } = await removeFollow(profile.id, targetType, targetId);
    if (error) return { following: true, error };
    revalidatePath("/me/following");
    return { following: false };
  } else {
    const { error } = await addFollow(profile.id, targetType, targetId);
    if (error) return { following: false, error };

    // Notify the followed profile (designer or brand) — fire and forget
    if (targetType === "designer" || targetType === "brand") {
      notifyNewFollower(profile.id, targetId).catch(() => {});
    }

    revalidatePath("/me/following");
    return { following: true };
  }
}

/**
 * Toggle follow for a taxonomy entity (category or material) identified by slug_path.
 * Resolves slug_path → taxonomy node ID, then delegates to the standard follow logic.
 */
export async function toggleFollowTaxonomy(
  targetType: "category" | "material",
  slugPath: string,
  domain: string
): Promise<ToggleFollowResult> {
  const { userId } = await auth();
  if (!userId) return { following: false, error: "Sign in to follow." };

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) return { following: false, error: "Profile not found." };

  const nodeResult = await getTaxonomyNodeBySlugPath(domain, slugPath);
  if (!nodeResult.data) return { following: false, error: "Category not found." };

  const nodeId = nodeResult.data.id;
  const alreadyFollowing = await isFollowing(profile.id, targetType, nodeId);

  if (alreadyFollowing) {
    const { error } = await removeFollow(profile.id, targetType, nodeId);
    if (error) return { following: true, error };
    revalidatePath("/me/following");
    return { following: false };
  } else {
    const { error } = await addFollow(profile.id, targetType, nodeId);
    if (error) return { following: false, error };
    revalidatePath("/me/following");
    return { following: true };
  }
}
