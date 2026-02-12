"use server";

import { redirect } from "next/navigation";
import { getSupabaseGalleryClient, getSupabaseGalleryUserId } from "@/lib/supabaseGalleryAuth";
import { getBookmarkState } from "@/lib/db/gallery";
import { revalidatePath } from "next/cache";

export type GalleryBookmarkResult = { saved: boolean; error?: string };

export async function toggleBookmark(
  entityType: "project" | "product",
  entityId: string,
  currentPath: string
): Promise<GalleryBookmarkResult> {
  const sup = await getSupabaseGalleryClient();
  const { data: { user } } = await sup.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(currentPath);
    redirect(`/sign-in?next=${next}`);
  }
  const existing = await getBookmarkState(user.id, entityType, entityId);
  if (existing) {
    const { error } = await sup
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    if (error) return { saved: true, error: error.message };
    revalidatePath(currentPath);
    return { saved: false };
  }
  const { error } = await sup.from("bookmarks").insert({
    user_id: user.id,
    entity_type: entityType,
    entity_id: entityId,
  });
  if (error) return { saved: false, error: error.message };
  revalidatePath(currentPath);
  return { saved: true };
}

export async function getGalleryBookmarkState(
  entityType: "project" | "product",
  entityId: string
): Promise<boolean> {
  const userId = await getSupabaseGalleryUserId();
  return getBookmarkState(userId, entityType, entityId);
}
