/**
 * Resolve user-provided "mentioned products" (brand + product name text) to existing product
 * listings when possible. Used for "Mentioned by submitter" sidebar block: show as link if
 * matched, plain text otherwise.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { batchResolveTaxonomySlugPaths } from "@/lib/taxonomy/resolve";
import type { MentionedProduct } from "@/lib/listings/mentionedProducts";

export type MentionedEntry = MentionedProduct;

export type MentionedResolvedItem = MentionedEntry & {
  productId?: string;
  productSlug?: string;
  productTitle?: string;
  taxonomy_slug_path?: string | null;
};

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");
}

/**
 * Resolve each entry to a real product where possible.
 *
 * ── AN EXACT ID BEATS A FUZZY TITLE ─────────────────────────────────────────
 * Entries carrying `product_id` were picked from the wizard's product picker,
 * so the product is known — no matching required. Only free-text entries fall
 * through to the substring match on title, which is a guess: it links on any
 * containment in either direction, so "Chair" matches "Eames Lounge Chair".
 * That heuristic is retained for typed entries because it is the only thing
 * available for them, but it no longer runs on entries that don't need it.
 */
export async function resolveMentionedProducts(
  mentioned: MentionedEntry[]
): Promise<MentionedResolvedItem[]> {
  if (mentioned.length === 0) return [];

  const supabase = getSupabaseServiceClient();
  const { data: products, error } = await supabase
    .from("listings")
    .select("id, slug, title")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null);

  if (error) return mentioned.map((m) => ({ ...m }));
  const rows = (products ?? []) as { id: string; slug: string | null; title: string | null }[];
  const byId = new Map(rows.map((p) => [p.id, p]));

  const results: MentionedResolvedItem[] = mentioned.map((entry) => {
    // Picked, not typed — link it directly. A miss here means the product was
    // deleted or unapproved since; the entry falls back to its stored text,
    // which is why hydrateMentionedProducts records that text on write.
    if (entry.product_id) {
      const exact = byId.get(entry.product_id);
      if (exact) {
        return {
          ...entry,
          productId: exact.id,
          productSlug: exact.slug ?? exact.id,
          productTitle: exact.title ?? undefined,
        };
      }
      return { ...entry };
    }

    const wantTitle = normalize(entry.product_name_text);
    if (!wantTitle) return { ...entry };

    const found = rows.find((p) => {
      const t = (p.title ?? "").trim();
      if (!t) return false;
      const normTitle = normalize(t);
      return normTitle === wantTitle || normTitle.includes(wantTitle) || wantTitle.includes(normTitle);
    });

    if (!found) return { ...entry };
    return {
      ...entry,
      productId: found.id,
      productSlug: found.slug ?? found.id,
      productTitle: found.title ?? undefined,
    };
  });

  // Enrich matched items with taxonomy slug_paths
  const matchedIds = results.filter((r) => r.productId).map((r) => r.productId!);
  if (matchedIds.length > 0) {
    const taxMap = await batchResolveTaxonomySlugPaths(matchedIds);
    for (const r of results) {
      if (r.productId) r.taxonomy_slug_path = taxMap.get(r.productId) ?? null;
    }
  }

  return results;
}
