"use server";

import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { rebuildMatchesFromEmbeddings } from "@/lib/matches/rebuild";

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, error: "Profile not found" };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, error: "Forbidden" };
  return { ok: true };
}

export type RebuildMatchesResult =
  | { ok: true; runId: string; projectsCount: number; productsCount: number; matchesUpserted: number; matchesDeletedStale: number; errors: string[] }
  | { ok: false; error: string };

/**
 * Admin-only: rebuild all matches from image_ai embeddings (avg per listing, cosine all vs all).
 */
export async function rebuildMatchesAction(): Promise<RebuildMatchesResult> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  try {
    const result = await rebuildMatchesFromEmbeddings();
    return {
      ok: true,
      runId: result.runId,
      projectsCount: result.projectsCount,
      productsCount: result.productsCount,
      matchesUpserted: result.matchesUpserted,
      matchesDeletedStale: result.matchesDeletedStale,
      errors: result.errors,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
