"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import type { ActionResultSuccess } from "./types";
import type { FolderRow, FolderWithMeta } from "@/lib/savedFoldersConstants";
import { FOLDERS_SETUP_ERROR } from "@/lib/savedFoldersConstants";

const NAME_MAX_LENGTH = 40;

function generateShareSlug(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

function isTableMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table") ||
    lower.includes("schema cache") ||
    (lower.includes("relation") && lower.includes("does not exist"))
  );
}

/** Get current user id from Clerk. Used for folder ownership. */
async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/** List current user's folders (for Save modal). */
export async function listFolders(): Promise<ActionResultSuccess<FolderRow[]>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: true, data: [] };
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("folders")
    .select("id, name, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: isTableMissingError(error.message) ? FOLDERS_SETUP_ERROR : error.message };
  const rows = (data ?? []) as FolderRow[];
  return { ok: true, data: rows };
}

/** List folders with item count, cover, updated_at, is_public, share_slug. */
export async function listFoldersWithMeta(): Promise<ActionResultSuccess<FolderWithMeta[]>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: true, data: [] };
  const sup = getSupabaseServiceClient();
  const { data: folders, error: foldersError } = await sup
    .from("folders")
    .select("id, name, sort_order, cover_image_url, is_public, share_slug")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (foldersError) return { ok: false, error: isTableMissingError(foldersError.message) ? FOLDERS_SETUP_ERROR : foldersError.message };
  const list = (folders ?? []) as (FolderRow & { cover_image_url?: string | null; is_public?: boolean; share_slug?: string | null })[];
  if (list.length === 0) return { ok: true, data: [] };

  const folderIds = list.map((f) => f.id);
  const { data: items, error: itemsError } = await sup
    .from("folder_items")
    .select("folder_id, entity_type, entity_id, created_at")
    .in("folder_id", folderIds)
    .order("created_at", { ascending: true });
  if (itemsError) return { ok: false, error: isTableMissingError(itemsError.message) ? FOLDERS_SETUP_ERROR : itemsError.message };
  const rows = (items ?? []) as { folder_id: string; entity_type: string; entity_id: string; created_at: string }[];

  const countByFolder: Record<string, number> = {};
  const firstEntityByFolder: Record<string, string> = {};
  const lastUpdatedByFolder: Record<string, string> = {};
  for (const f of list) countByFolder[f.id] = 0;
  for (const r of rows) {
    countByFolder[r.folder_id] = (countByFolder[r.folder_id] ?? 0) + 1;
    if (!firstEntityByFolder[r.folder_id]) firstEntityByFolder[r.folder_id] = r.entity_id;
    if (!lastUpdatedByFolder[r.folder_id] || r.created_at > lastUpdatedByFolder[r.folder_id])
      lastUpdatedByFolder[r.folder_id] = r.created_at;
  }

  const firstIds = Array.from(new Set(Object.values(firstEntityByFolder))).filter(Boolean);
  let coverByEntityId: Record<string, string> = {};
  if (firstIds.length > 0) {
    try {
      const { data: listings } = await sup
        .from("listings")
        .select("id, cover_image_url")
        .in("id", firstIds);
      for (const row of listings ?? []) {
        const r = row as { id: string; cover_image_url?: string | null };
        if (r.cover_image_url?.trim()) coverByEntityId[r.id] = r.cover_image_url.trim();
      }
      const firstImageResult = await getFirstImageUrlPerListingIds(firstIds);
      const firstImageMap = firstImageResult.data ?? {};
      for (const id of firstIds) {
        if (!coverByEntityId[id] && firstImageMap[id]?.trim()) coverByEntityId[id] = firstImageMap[id].trim();
      }
    } catch {
      // Fallback: no covers
    }
  }

  const result: FolderWithMeta[] = list.map((f) => {
    const folderCover = f.cover_image_url?.trim() ?? null;
    const firstItemCover = firstEntityByFolder[f.id] ? coverByEntityId[firstEntityByFolder[f.id]] ?? null : null;
    return {
      ...f,
      item_count: countByFolder[f.id] ?? 0,
      cover_image_url: folderCover || firstItemCover,
      updated_at: lastUpdatedByFolder[f.id] ?? null,
      is_public: f.is_public ?? false,
      share_slug: f.share_slug ?? null,
    };
  });
  return { ok: true, data: result };
}

/** Create a new folder. Validates name (required, max 40, no duplicate case-insensitive). Returns consistent ActionResult. */
export async function createFolder(name: string): Promise<ActionResultSuccess<FolderRow>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not signed in" };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name required" };
  if (trimmed.length > NAME_MAX_LENGTH) return { ok: false, error: `Name must be ${NAME_MAX_LENGTH} characters or less` };
  const sup = getSupabaseServiceClient();
  const { data: allFolders } = await sup
    .from("folders")
    .select("name")
    .eq("user_id", userId);
  const existingNames = (allFolders ?? []).map((r) => (r as { name: string }).name?.toLowerCase().trim()).filter(Boolean);
  if (existingNames.includes(trimmed.toLowerCase())) return { ok: false, error: "A folder with this name already exists" };
  const { data, error } = await sup
    .from("folders")
    .insert({ user_id: userId, name: trimmed })
    .select("id, name, sort_order")
    .single();
  if (error) return { ok: false, error: isTableMissingError(error.message) ? FOLDERS_SETUP_ERROR : error.message };
  const row = data as FolderRow;
  return { ok: true, data: row };
}

/** Set board public/private. Generates share_slug when making public if missing. */
export async function setBoardVisibility(
  folderId: string,
  isPublic: boolean
): Promise<ActionResultSuccess<{ share_slug: string | null }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not signed in" };
  const sup = getSupabaseServiceClient();
  const { data: folder, error: fetchErr } = await sup
    .from("folders")
    .select("id, share_slug")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();
  if (fetchErr || !folder) return { ok: false, error: fetchErr ? (isTableMissingError(fetchErr.message) ? FOLDERS_SETUP_ERROR : fetchErr.message) : "Folder not found" };
  let share_slug: string | null = (folder as { share_slug?: string | null }).share_slug ?? null;
  if (isPublic && !share_slug) {
    for (let i = 0; i < 5; i++) {
      const slug = generateShareSlug();
      const { error: upErr } = await sup.from("folders").update({ is_public: true, share_slug: slug }).eq("id", folderId).eq("user_id", userId);
      if (!upErr) {
        share_slug = slug;
        break;
      }
      if ((upErr as { code?: string }).code === "23505") continue;
      return { ok: false, error: upErr.message };
    }
  } else {
    const { error: upErr } = await sup.from("folders").update({ is_public: isPublic }).eq("id", folderId).eq("user_id", userId);
    if (upErr) return { ok: false, error: isTableMissingError(upErr.message) ? FOLDERS_SETUP_ERROR : upErr.message };
  }
  revalidatePath("/me/saved");
  return { ok: true, data: { share_slug } };
}

/** Get public board by share_slug (for shared link). Returns null if private or not found. */
export async function getBoardByShareSlug(slug: string): Promise<ActionResultSuccess<{ folder: FolderWithMeta; items: FolderItemWithCreated[] } | null>> {
  const sup = getSupabaseServiceClient();
  const { data: folder, error: folderErr } = await sup
    .from("folders")
    .select("id, name, sort_order, cover_image_url, is_public, share_slug")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (folderErr) return { ok: false, error: isTableMissingError(folderErr.message) ? FOLDERS_SETUP_ERROR : folderErr.message };
  if (!folder) return { ok: true, data: null };
  const folderId = (folder as { id: string }).id;
  const { count, error: countErr } = await sup.from("folder_items").select("id", { count: "exact", head: true }).eq("folder_id", folderId);
  if (countErr) return { ok: false, error: countErr.message };
  const { data: items, error: itemsErr } = await sup
    .from("folder_items")
    .select("entity_type, entity_id, created_at")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });
  if (itemsErr) return { ok: false, error: itemsErr.message };
  const { data: lastItem } = await sup
    .from("folder_items")
    .select("created_at")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const folderWithMeta: FolderWithMeta = {
    id: (folder as { id: string }).id,
    name: (folder as { name: string }).name,
    sort_order: (folder as { sort_order?: number }).sort_order ?? 0,
    item_count: count ?? 0,
    cover_image_url: (folder as { cover_image_url?: string | null }).cover_image_url?.trim() ?? null,
    updated_at: (lastItem as { created_at?: string } | null)?.created_at ?? null,
    is_public: true,
    share_slug: (folder as { share_slug?: string | null }).share_slug ?? null,
  };
  const itemList: FolderItemWithCreated[] = (items ?? []).map((r) => ({
    entity_type: (r as { entity_type: string }).entity_type as "project" | "product",
    entity_id: (r as { entity_id: string }).entity_id,
    created_at: (r as { created_at: string }).created_at,
  }));
  return { ok: true, data: { folder: folderWithMeta, items: itemList } };
}

/** Get folder IDs that contain this entity (for pre-checking in Save modal). */
export async function getFolderIdsForEntity(
  entityType: "project" | "product",
  entityId: string
): Promise<ActionResultSuccess<string[]>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: true, data: [] };
  const sup = getSupabaseServiceClient();
  const { data: folders } = await sup
    .from("folders")
    .select("id")
    .eq("user_id", userId);
  if (!folders?.length) return { ok: true, data: [] };
  const folderIds = folders.map((f) => (f as { id: string }).id);
  const { data: items, error } = await sup
    .from("folder_items")
    .select("folder_id")
    .in("folder_id", folderIds)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) return { ok: false, error: isTableMissingError(error.message) ? FOLDERS_SETUP_ERROR : error.message };
  const ids = (items ?? []).map((i) => (i as { folder_id: string }).folder_id);
  return { ok: true, data: ids };
}

/** Add entity to selected folders. Remove from folders not selected. Returns consistent ActionResult. */
export async function saveToFolders(
  entityType: "project" | "product",
  entityId: string,
  folderIds: string[],
  currentPath: string
): Promise<ActionResultSuccess<void>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const next = encodeURIComponent(currentPath);
    redirect(`/sign-in?next=${next}`);
  }
  const sup = getSupabaseServiceClient();
  const { data: myFolders, error: foldersErr } = await sup
    .from("folders")
    .select("id")
    .eq("user_id", userId);
  if (foldersErr) return { ok: false, error: isTableMissingError(foldersErr.message) ? FOLDERS_SETUP_ERROR : foldersErr.message };
  const myFolderIds = (myFolders ?? []).map((r) => (r as { id: string }).id);
  const toAdd = folderIds.filter((id) => myFolderIds.includes(id));
  for (const folderId of toAdd) {
    const { error: upsertErr } = await sup.from("folder_items").upsert(
      { folder_id: folderId, user_id: userId, entity_type: entityType, entity_id: entityId },
      { onConflict: "folder_id,entity_type,entity_id" }
    );
    if (upsertErr) return { ok: false, error: isTableMissingError(upsertErr.message) ? FOLDERS_SETUP_ERROR : upsertErr.message };
  }
  const { data: existing } = await sup
    .from("folder_items")
    .select("folder_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("folder_id", myFolderIds);
  const currentFolderIds = (existing ?? []).map((r) => (r as { folder_id: string }).folder_id);
  const toRemove = currentFolderIds.filter((id) => !folderIds.includes(id));
  for (const folderId of toRemove) {
    await sup
      .from("folder_items")
      .delete()
      .eq("folder_id", folderId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
  }
  revalidatePath(currentPath);
  revalidatePath("/me/saved");
  return { ok: true };
}

export type FolderItemWithCreated = {
  entity_type: "project" | "product";
  entity_id: string;
  created_at: string;
};

/** Get items in a folder. Verifies folder belongs to current user. Returns created_at for sorting. */
export async function getFolderItems(
  folderId: string
): Promise<ActionResultSuccess<FolderItemWithCreated[]>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not signed in" };
  const sup = getSupabaseServiceClient();
  const { data: folder, error: folderErr } = await sup
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();
  if (folderErr || !folder) return { ok: false, error: folderErr ? (isTableMissingError(folderErr.message) ? FOLDERS_SETUP_ERROR : folderErr.message) : "Folder not found" };
  const { data: items, error } = await sup
    .from("folder_items")
    .select("entity_type, entity_id, created_at")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: isTableMissingError(error.message) ? FOLDERS_SETUP_ERROR : error.message };
  const list = (items ?? []) as { entity_type: string; entity_id: string; created_at: string }[];
  const typed: FolderItemWithCreated[] = list.map((r) => ({
    entity_type: r.entity_type as "project" | "product",
    entity_id: r.entity_id,
    created_at: r.created_at,
  }));
  return { ok: true, data: typed };
}

/** Get folder by id for current user. */
export async function getFolder(folderId: string): Promise<ActionResultSuccess<FolderWithMeta>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not signed in" };
  const sup = getSupabaseServiceClient();
  const { data: folder, error: folderErr } = await sup
    .from("folders")
    .select("id, name, sort_order, cover_image_url, is_public, share_slug")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();
  if (folderErr || !folder) return { ok: false, error: folderErr ? (isTableMissingError(folderErr.message) ? FOLDERS_SETUP_ERROR : folderErr.message) : "Folder not found" };
  const f = folder as FolderRow & { cover_image_url?: string | null; is_public?: boolean; share_slug?: string | null };
  const { count, error: countErr } = await sup
    .from("folder_items")
    .select("id", { count: "exact", head: true })
    .eq("folder_id", folderId);
  if (countErr) return { ok: false, error: isTableMissingError(countErr.message) ? FOLDERS_SETUP_ERROR : countErr.message };
  const { data: firstItem } = await sup
    .from("folder_items")
    .select("entity_id")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: lastItem } = await sup
    .from("folder_items")
    .select("created_at")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let cover_image_url: string | null = f.cover_image_url?.trim() ?? null;
  if (!cover_image_url && firstItem?.entity_id) {
    try {
      const { data: row } = await sup
        .from("listings")
        .select("cover_image_url")
        .eq("id", (firstItem as { entity_id: string }).entity_id)
        .single();
      if (row && (row as { cover_image_url?: string | null }).cover_image_url?.trim())
        cover_image_url = (row as { cover_image_url: string }).cover_image_url.trim();
    } catch {
      // ignore
    }
  }
  return {
    ok: true,
    data: {
      id: f.id,
      name: f.name,
      sort_order: f.sort_order ?? 0,
      item_count: count ?? 0,
      cover_image_url,
      updated_at: (lastItem as { created_at?: string } | null)?.created_at ?? null,
      is_public: f.is_public ?? false,
      share_slug: f.share_slug ?? null,
    },
  };
}

/** Whether the entity is saved in any folder for the current user. */
export async function isEntitySaved(
  entityType: "project" | "product",
  entityId: string
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const sup = getSupabaseServiceClient();
  const { data: folders } = await sup
    .from("folders")
    .select("id")
    .eq("user_id", userId);
  const folderIds = (folders ?? []).map((f) => (f as { id: string }).id);
  if (folderIds.length === 0) return false;
  const { data: item } = await sup
    .from("folder_items")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("folder_id", folderIds)
    .limit(1)
    .maybeSingle();
  return !!item;
}
