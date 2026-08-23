import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getTaxonomyTree } from "@/lib/taxonomy/taxonomyDb";

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

/** Top-level nodes of a taxonomy domain, alphabetical. */
export async function getWizardCategories(
  domain: "project" | "product"
): Promise<TaxonomyOptionShape[]> {
  const res = await getTaxonomyTree(domain);
  return (res.data ?? [])
    .filter((n) => !n.slug_path.includes("/"))
    .map((n) => ({ id: n.id, label: n.label, slugPath: n.slug_path }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
