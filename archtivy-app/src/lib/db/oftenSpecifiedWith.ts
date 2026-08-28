/**
 * "Often specified with" — the product page's related-products module.
 *
 * ── WHY NOT "YOU MAY ALSO LIKE" ─────────────────────────────────────────────
 * That label implies a taste model. There isn't one, and building a fake
 * similarity score would be the same class of fabrication as a review count.
 * The label here names the actual relationship the data supports: these
 * products were specified in the same real projects.
 *
 * ── WHY NOT THE `matches` TABLE ─────────────────────────────────────────────
 * `matches` holds 513 rows and looks like a recommender, but it is
 * PROJECT -> PRODUCT: "which products might appear in this project", produced
 * by the AI tagging workstation. There is no product-to-product similarity
 * anywhere in the schema, and `photo_matches` is the same shape.
 *
 * ── TWO TIERS, STRONGEST FIRST ──────────────────────────────────────────────
 * 1. CO-OCCURRENCE — other products linked to a project this product is also
 *    linked to. A real, editorially-meaningful relationship: someone specified
 *    both in the same building. Measured when written: available for 11 of 80
 *    products, so it cannot carry the module alone.
 *
 * 2. SAME CATEGORY — same top-level product taxonomy root. Weak signal, broad
 *    coverage (75 of 80 products have at least one sibling), used only to fill
 *    the remaining slots.
 *
 * Same brand is deliberately NOT a tier: the page already has a "More from
 * {brand}" rail, and using it here would render the same products twice under
 * two headings.
 *
 * Every tier requires the far end to be live and APPROVED, and excludes the
 * product being viewed. Returns [] rather than padding when nothing qualifies —
 * the module then renders nothing at all.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export interface OftenSpecifiedWithItem {
  id: string;
  title: string;
  slug: string | null;
  cover: string | null;
  brand: string | null;
  /** Which tier produced this row. Drives the module's subtitle. */
  basis: "co_occurrence" | "same_category";
}

const LIMIT = 4;

export async function getOftenSpecifiedWith(
  productId: string
): Promise<OftenSpecifiedWithItem[]> {
  try {
    const sup = getSupabaseServiceClient();

    // ── Tier 1: products sharing a project with this one ────────────────────
    const { data: myLinks } = await sup
      .from("project_product_links")
      .select("project_id")
      .eq("product_id", productId);
    const projectIds = [
      ...new Set(((myLinks ?? []) as { project_id: string }[]).map((r) => r.project_id)),
    ];

    const coIds: string[] = [];
    if (projectIds.length > 0) {
      const { data: siblings } = await sup
        .from("project_product_links")
        .select("product_id")
        .in("project_id", projectIds);
      for (const r of (siblings ?? []) as { product_id: string }[]) {
        if (r.product_id && r.product_id !== productId && !coIds.includes(r.product_id)) {
          coIds.push(r.product_id);
        }
      }
    }

    // ── Tier 2: same top-level category, only if tier 1 left room ───────────
    let catIds: string[] = [];
    if (coIds.length < LIMIT) {
      const { data: mine } = await sup
        .from("listing_taxonomy_node")
        .select("taxonomy_node_id, taxonomy_nodes(slug_path, domain)")
        .eq("listing_id", productId);
      type TaxRow = {
        taxonomy_nodes: { slug_path: string | null; domain: string | null } | { slug_path: string | null; domain: string | null }[] | null;
      };
      const node = ((mine ?? []) as TaxRow[])
        .map((r) => (Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] : r.taxonomy_nodes))
        .find((n) => n?.domain === "product" && n?.slug_path);
      const root = node?.slug_path?.split("/")[0];

      if (root) {
        // Every node under that root, then every listing tagged with one.
        const { data: nodes } = await sup
          .from("taxonomy_nodes")
          .select("id")
          .eq("domain", "product")
          .or(`slug_path.eq.${root},slug_path.like.${root}/%`);
        const nodeIds = ((nodes ?? []) as { id: string }[]).map((n) => n.id);
        if (nodeIds.length > 0) {
          const { data: tagged } = await sup
            .from("listing_taxonomy_node")
            .select("listing_id")
            .in("taxonomy_node_id", nodeIds);
          catIds = [
            ...new Set(((tagged ?? []) as { listing_id: string }[]).map((r) => r.listing_id)),
          ].filter((id) => id !== productId && !coIds.includes(id));
        }
      }
    }

    const candidateIds = [...coIds, ...catIds];
    if (candidateIds.length === 0) return [];

    // One resolve for both tiers. Liveness is enforced here, not in the tiers,
    // so a soft-deleted or draft product can never reach the page.
    const { data: rows } = await sup
      .from("listings")
      .select("id, title, slug, cover_image_url, owner_profile_id")
      .in("id", candidateIds)
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null);

    type Row = {
      id: string;
      title: string | null;
      slug: string | null;
      cover_image_url: string | null;
      owner_profile_id: string | null;
    };
    const byId = new Map(((rows ?? []) as Row[]).map((r) => [r.id, r]));

    const ownerIds = [
      ...new Set(((rows ?? []) as Row[]).map((r) => r.owner_profile_id).filter(Boolean) as string[]),
    ];
    const { data: owners } = ownerIds.length
      ? await sup.from("profiles").select("id, display_name").in("id", ownerIds)
      : { data: [] };
    const brandById = new Map(
      ((owners ?? []) as { id: string; display_name: string | null }[]).map((p) => [
        p.id,
        p.display_name,
      ])
    );

    const out: OftenSpecifiedWithItem[] = [];
    for (const id of candidateIds) {
      if (out.length >= LIMIT) break;
      const r = byId.get(id);
      if (!r) continue; // filtered out by the liveness check above
      out.push({
        id: r.id,
        title: r.title ?? "Untitled",
        slug: r.slug,
        cover: r.cover_image_url,
        brand: r.owner_profile_id ? brandById.get(r.owner_profile_id) ?? null : null,
        basis: coIds.includes(id) ? "co_occurrence" : "same_category",
      });
    }
    return out;
  } catch (err) {
    console.error("[oftenSpecifiedWith] failed:", err);
    return [];
  }
}
