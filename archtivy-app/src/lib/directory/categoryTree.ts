import { getTaxonomyTree } from "@/lib/taxonomy/taxonomyDb";
import type { TaxonomyDomain } from "@/lib/taxonomy/domains";

/**
 * The category tree behind the directory's Category pill.
 *
 * ── ROOTS AND THEIR CHILDREN, NOT THE WHOLE TAXONOMY ────────────────────────
 * Depth is capped at 2. The dropdown shows roots down one side and the hovered
 * root's children down the other, which is two levels by construction; fetching
 * grandchildren would ship nodes the panel cannot render. `taxonomy_nodes`
 * holds 1111 rows across 11 domains, so the depth filter is the difference
 * between a small payload and most of the taxonomy.
 *
 * ── ONLY BRANCHES THAT LEAD SOMEWHERE ───────────────────────────────────────
 * Every entry navigates to /projects/{slug_path} or /products/{slug_path} — the
 * canonical archive routes that already exist — so a node with no listings
 * behind it would be a link to an empty page. The caller passes the root slugs
 * that actually carry listings (the same facet the category rail uses) and
 * roots outside that set are dropped. Children are left in: an empty
 * subcategory under a populated root is a real, navigable archive.
 */
export interface CategoryTreeNode {
  slug: string;
  slugPath: string;
  label: string;
  children: CategoryTreeNode[];
}

export async function getDirectoryCategoryTree(
  domain: Extract<TaxonomyDomain, "project" | "product">,
  populatedRootSlugs: string[]
): Promise<CategoryTreeNode[]> {
  const { data, error } = await getTaxonomyTree(domain);
  if (error || !data) return [];

  const allow = new Set(populatedRootSlugs);
  const byId = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];
  const rootIds = new Set<string>();

  // getTaxonomyTree orders by depth then sort_order, so a parent is always
  // seen before its children and one pass is enough.
  for (const n of data) {
    if (n.depth > 1) continue;
    const node: CategoryTreeNode = {
      slug: n.slug,
      slugPath: n.slug_path,
      label: n.label,
      children: [],
    };
    if (n.depth === 0) {
      if (!allow.has(n.slug)) continue;
      byId.set(n.id, node);
      rootIds.add(n.id);
      roots.push(node);
      continue;
    }
    // depth 1 — attached only when its root survived the populated filter.
    if (n.parent_id && rootIds.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(node);
    }
  }

  return roots;
}
