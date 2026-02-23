/**
 * Resolve user-provided "mentioned products" (brand + product name text) to existing product
 * listings when possible. Used for "Mentioned by submitter" sidebar block: show as link if
 * matched, plain text otherwise.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type MentionedEntry = { brand_name_text: string; product_name_text: string };

export type MentionedResolvedItem = MentionedEntry & {
  productId?: string;
  productSlug?: string;
  productTitle?: string;
};

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");
}

/**
 * For each mentioned entry, try to find an APPROVED product whose title matches
 * (normalized product_name_text equals or is contained in product title).
 * If brand were stored on product we could match brand too; fallback to title-only.
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

  return mentioned.map((entry) => {
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
}
