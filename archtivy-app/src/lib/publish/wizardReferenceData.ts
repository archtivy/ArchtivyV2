import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getTaxonomyTree, getFacetsForDomain } from "@/lib/taxonomy/taxonomyDb";

/**
 * Reference data the publish wizards need to render their pickers.
 *
 * Lifted out of /add/project/page.tsx and /add/product/page.tsx so the edit
 * route feeds the same wizards from the same queries. Duplicating them would
 * mean an option list that exists when creating and is missing when editing —
 * which reads to the author as their selection having been deleted.
 */

export interface TaxonomyOptionShape {
  id: string;
  label: string;
  slugPath: string;
  /** Null at the top level. Drives the cascading picker. */
  parentId: string | null;
  /** 0 = category, 1 = subcategory, 2 = type (products only). */
  depth: number;
}
export interface LabelledOption {
  id: string;
  label: string;
}
export interface ProductOptionShape {
  id: string;
  title: string;
  brand: string | null;
  cover: string | null;
}
export interface MemberTitleOptionShape {
  label: string;
}

/**
 * EVERY active node of a taxonomy domain, at every depth.
 *
 * ── WHY THIS USED TO RETURN ONLY THE TOP LEVEL ──────────────────────────────
 * It filtered `!slug_path.includes("/")`, which kept root nodes and discarded
 * the rest. That was fine when the wizard had a single flat category select,
 * and quietly wrong for every listing already classified deeper than the root:
 * measured against production, 74 products carry a depth-2 primary node and 29
 * projects carry a depth-1 one. Their id was never in the options list, so
 * opening those listings in the wizard showed "Choose a category…" with
 * nothing selected.
 *
 * The stored value survived a save untouched, so nothing was lost outright —
 * but the control read as unset, which invites an author to re-pick and
 * silently reclassify a correctly-filed listing up to its root.
 *
 * Returning the full tree is what makes both the cascade and that fix
 * possible; they are the same change.
 *
 * Sorted by depth then sort_order then label so the cascade can slice by depth
 * without re-sorting, and siblings appear in the order the taxonomy defines
 * rather than alphabetically overriding it.
 */
export async function getWizardTaxonomyNodes(
  domain: "project" | "product"
): Promise<TaxonomyOptionShape[]> {
  const res = await getTaxonomyTree(domain);
  return (res.data ?? []).map((n) => ({
    id: n.id,
    label: n.label,
    slugPath: n.slug_path,
    parentId: n.parent_id,
    depth: n.depth,
  }));
}

export async function getWizardMaterials(): Promise<LabelledOption[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.from("materials").select("id, name").order("name");
  if (error) {
    console.error("[wizard] materials failed:", error.message);
    return [];
  }
  return ((data ?? []) as { id: string; name: string }[]).map((m) => ({
    id: m.id,
    label: m.name,
  }));
}

/** Published products, for the project wizard's "products used" picker. */
export async function getWizardProducts(): Promise<ProductOptionShape[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, title, cover_image_url, owner_profile_id")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("title");
  if (error) {
    console.error("[wizard] products failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as {
    id: string;
    title: string;
    cover_image_url: string | null;
    owner_profile_id: string | null;
  }[];
  const ownerIds = [
    ...new Set(rows.map((r) => r.owner_profile_id).filter((v): v is string => Boolean(v))),
  ];
  const brands = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await sup
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds);
    for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) brands.set(p.id, p.display_name);
    }
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    brand: r.owner_profile_id ? brands.get(r.owner_profile_id) ?? null : null,
    cover: r.cover_image_url,
  }));
}

export async function getWizardMemberTitles(): Promise<MemberTitleOptionShape[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("member_titles")
    .select("label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return ((data ?? []) as { label: string }[]).map((t) => ({ label: t.label }));
}

export interface WizardFacetShape {
  id: string;
  slug: string;
  label: string;
  values: { id: string; slug: string; label: string }[];
}

/**
 * Facets a domain declares, with their active values.
 *
 * Returns whatever `facets.applies_to` says — no UI-side whitelist. That
 * declaration is already the source of truth (color-family carries both
 * "product" and "project"), and a second list in the wizard would be one more
 * thing to keep in step with it.
 */
export async function getWizardFacets(
  domain: "project" | "product"
): Promise<WizardFacetShape[]> {
  const res = await getFacetsForDomain(domain);
  return (res.data ?? []).map((f) => ({
    id: f.id,
    slug: f.slug,
    label: f.label,
    values: f.values.map((v) => ({ id: v.id, slug: v.slug, label: v.label })),
  }));
}
