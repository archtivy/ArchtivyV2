/**
 * The user's whole saved library, in one batched read.
 *
 * ── WHERE SAVES ACTUALLY LIVE ───────────────────────────────────────────────
 * `folder_items`, keyed (folder_id, entity_type, entity_id) with a real
 * created_at. NOT `listing_saves` and NOT `bookmarks`:
 *
 *   listing_saves  0 rows, deprecated 2026-08-23, nothing writes it
 *   bookmarks      0 rows, nothing writes it
 *   folders        5 rows   \  the live system, written by
 *   folder_items  12 rows   /  SaveToggle -> SaveToBoardPopover -> saveToFolders
 *
 * `collections` / `collection_items` are a DIFFERENT feature entirely — the
 * cron-refreshed, taxonomy-driven Inspiration collections that are public and
 * indexable. Nothing here touches them.
 *
 * ── PROJECTS AND PRODUCTS ONLY ──────────────────────────────────────────────
 * entity_type is `"project" | "product"` everywhere in savedFolders.ts, all 12
 * live rows are one of those two, and no profile surface renders a save
 * control at all. Designers and brands are therefore not saveable, and this
 * module deliberately has no notion of them — an empty "Designers" bucket
 * would be a permanently dead filter rather than an unused one. When profile
 * saving ships, widen the union here and the type counts follow.
 *
 * ── ONE ITEM, HOWEVER MANY BOARDS ───────────────────────────────────────────
 * The same listing can sit in several boards. "All Saved" de-duplicates on
 * (entity_type, entity_id) and keeps every board id on the item, so a listing
 * saved to three boards is one card that three board filters can find.
 *
 * savedAt is the EARLIEST of its rows: that is when the thing entered the
 * library. Adding an already-saved item to a second board is not a new save,
 * and taking the latest would jump it to the top of "Recently added" for an
 * action that saved nothing new.
 *
 * ── QUERY COUNT IS FLAT ─────────────────────────────────────────────────────
 * Two queries here (folders, then their items), plus whatever the two shared
 * card resolvers issue — both of which are themselves batched and constant.
 * Nothing runs per item.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProjectRailCards } from "@/lib/cards/projectRailCards";
import { getProductRailCards } from "@/lib/cards/productRailCards";
import type { ListingCardModel } from "@/components/listing/ListingCardShared";

export type SavedEntityType = "project" | "product";

export interface SavedItem {
  /** Stable React key and dedupe key. */
  key: string;
  entityType: SavedEntityType;
  entityId: string;
  /** Earliest folder_items.created_at across every board holding it. */
  savedAt: string;
  boardIds: string[];
  /** The FULL canonical model, from the same resolver the rails use. */
  model: ListingCardModel;
}

export interface SavedBoard {
  id: string;
  name: string;
  itemCount: number;
  /**
   * The board's own cover if it has one, otherwise the newest saved item's
   * image. DERIVED, never invented: `folders.cover_image_url` is NULL on every
   * board on the platform, so a strict reading would leave the rail and the
   * sidebar showing five grey rectangles. Falling back to the board's own
   * newest contents shows what is actually in it, which is what a cover is for.
   */
  coverUrl: string | null;
  sortOrder: number;
  /** Sharing state, so the board header can open the existing share modal. */
  isPublic: boolean;
  shareSlug: string | null;
}

export interface SavedLibrary {
  items: SavedItem[];
  boards: SavedBoard[];
  /**
   * Whole-library totals. `recent` is the rail's "Recently added" — saves
   * inside RECENT_WINDOW_DAYS, counted from resolved items like every other
   * number here.
   */
  counts: { all: number; project: number; product: number; recent: number };
  /** True when the folders tables are absent, so the page can say so. */
  setupRequired: boolean;
}

export const EMPTY_SAVED_LIBRARY: SavedLibrary = {
  items: [],
  boards: [],
  counts: { all: 0, project: 0, product: 0, recent: 0 },
  setupRequired: false,
};

/** Mirrors WINDOW_DAYS.recent in lib/saved/params. */
const RECENT_WINDOW_DAYS = 30;

function isTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("could not find the table") ||
    m.includes("schema cache") ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}

export async function getSavedLibrary(clerkUserId: string): Promise<SavedLibrary> {
  try {
    const sup = getSupabaseServiceClient();

    const { data: folderRows, error: folderErr } = await sup
      .from("folders")
      .select("id, name, cover_image_url, sort_order, created_at, is_public, share_slug")
      .eq("user_id", clerkUserId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (folderErr) {
      return { ...EMPTY_SAVED_LIBRARY, setupRequired: isTableMissing(folderErr.message) };
    }

    type FolderRow = {
      id: string; name: string; cover_image_url: string | null;
      sort_order: number | null; is_public: boolean | null; share_slug: string | null;
    };
    const folders = (folderRows ?? []) as FolderRow[];
    if (folders.length === 0) return EMPTY_SAVED_LIBRARY;

    const { data: itemRows, error: itemErr } = await sup
      .from("folder_items")
      .select("folder_id, entity_type, entity_id, created_at")
      .in("folder_id", folders.map((f) => f.id));

    if (itemErr) {
      return { ...EMPTY_SAVED_LIBRARY, setupRequired: isTableMissing(itemErr.message) };
    }

    type ItemRow = {
      folder_id: string; entity_type: string; entity_id: string; created_at: string;
    };
    const rows = (itemRows ?? []) as ItemRow[];

    // Dedupe to one entry per entity, collecting its boards and earliest save.
    const byKey = new Map<
      string,
      { entityType: SavedEntityType; entityId: string; savedAt: string; boardIds: string[] }
    >();

    for (const r of rows) {
      if (r.entity_type !== "project" && r.entity_type !== "product") continue;
      const key = `${r.entity_type}:${r.entity_id}`;
      const existing = byKey.get(key);
      if (existing) {
        if (r.created_at < existing.savedAt) existing.savedAt = r.created_at;
        if (!existing.boardIds.includes(r.folder_id)) existing.boardIds.push(r.folder_id);
      } else {
        byKey.set(key, {
          entityType: r.entity_type as SavedEntityType,
          entityId: r.entity_id,
          savedAt: r.created_at,
          boardIds: [r.folder_id],
        });
      }
    }

    const entries = [...byKey.values()];
    const projectIds = entries.filter((e) => e.entityType === "project").map((e) => e.entityId);
    const productIds = entries.filter((e) => e.entityType === "product").map((e) => e.entityId);

    // The same two resolvers the detail-page rails use, so a saved card is the
    // same card — full model, relationship badge, owner identity and all.
    const [projectCards, productCards] = await Promise.all([
      getProjectRailCards(projectIds),
      getProductRailCards(productIds),
    ]);

    const recentCutoff = new Date(
      Date.now() - RECENT_WINDOW_DAYS * 86_400_000
    ).toISOString();

    const items: SavedItem[] = [];
    for (const e of entries) {
      const model =
        e.entityType === "project"
          ? projectCards.get(e.entityId)
          : productCards.get(e.entityId);
      // A listing unpublished or soft-deleted since it was saved resolves to
      // nothing and drops out, rather than rendering a card that 404s. The
      // board row stays in the database untouched.
      if (!model) continue;
      items.push({
        key: `${e.entityType}:${e.entityId}`,
        entityType: e.entityType,
        entityId: e.entityId,
        savedAt: e.savedAt,
        boardIds: e.boardIds,
        // Every item on this page is saved by definition, so the card's own
        // save control starts active instead of flickering from empty after
        // its own lookup.
        model: { ...model, initialSaved: true },
      });
    }

    /*
     * Board counts are computed from the RESOLVED items, not the raw rows.
     *
     * Two of this platform's twelve saved rows point at listings that were
     * since deleted or unpublished. Counting rows gave the "LA" board a
     * sidebar count of 5 beside a grid showing 3 — a number that matched
     * nothing on screen. The count now means "cards you will see", which is
     * the only reading that stays true.
     */
    const liveByFolder = new Map<string, number>();
    for (const it of items) {
      for (const b of it.boardIds) liveByFolder.set(b, (liveByFolder.get(b) ?? 0) + 1);
    }

    /*
     * Board covers, derived from the board's own newest RESOLVED item.
     *
     * `folders.cover_image_url` is NULL on all five boards on the platform —
     * nothing writes it, and there is no UI to set one. The reference draws a
     * photograph on every board card, so the choice was a rail of grey
     * placeholders or a cover taken from what the board actually holds. The
     * second is real data about that board; the first is the truth about an
     * unused column, told in the least useful place.
     *
     * Newest rather than first, so adding to a board refreshes its cover, and
     * resolved-only, so a board never advertises itself with a deleted listing.
     * An explicit cover_image_url still wins if one is ever set.
     */
    const newestFirst = [...items].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    const derivedCover = new Map<string, string>();
    for (const it of newestFirst) {
      if (!it.model.imageUrl) continue;
      for (const b of it.boardIds) {
        if (!derivedCover.has(b)) derivedCover.set(b, it.model.imageUrl);
      }
    }

    const boards: SavedBoard[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      itemCount: liveByFolder.get(f.id) ?? 0,
      coverUrl: f.cover_image_url?.trim() || derivedCover.get(f.id) || null,
      sortOrder: f.sort_order ?? 0,
      isPublic: f.is_public ?? false,
      shareSlug: f.share_slug ?? null,
    }));

    return {
      items,
      boards,
      counts: {
        all: items.length,
        project: items.filter((i) => i.entityType === "project").length,
        product: items.filter((i) => i.entityType === "product").length,
        recent: items.filter((i) => i.savedAt >= recentCutoff).length,
      },
      setupRequired: false,
    };
  } catch (err) {
    console.error("[savedLibrary] failed:", err);
    return EMPTY_SAVED_LIBRARY;
  }
}
