/**
 * Unified filter options for explore (projects and products). Sourced from DB.
 * NO CACHE: Admin can add categories/materials/colors at any time and users must
 * see them immediately. Pages already set force-dynamic + revalidate=0.
 */

import { getProjectFilterOptions, getProductFilterOptions } from "@/lib/db/explore";
import { getTaxonomyTree, getFacetsForDomain } from "@/lib/taxonomy/taxonomyDb";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import type { ExploreType, TaxonomyTreeNode, FacetFilterGroup } from "./schema";

export interface ExploreFilterOptions {
  categories: { value: string; label: string }[];
  /** Hierarchical taxonomy tree for category selection. */
  taxonomyTree: TaxonomyTreeNode[];
  locations: { value: string; label: string; city: string | null; country: string | null }[];
  designers: { value: string; label: string }[];
  brands: { value: string; label: string }[];
  years: { value: string; label: string }[];
  materials: { value: string; label: string }[];
  /** Material taxonomy tree for material taxonomy filter. */
  materialTaxonomy: TaxonomyTreeNode[];
  areas: { value: string; label: string }[];
  colors: { value: string; label: string }[];
  materialTypes: { value: string; label: string }[];
  /** Dynamic facet groups with values. */
  facets: FacetFilterGroup[];
}

/** Build a tree structure from flat sorted taxonomy nodes. */
function buildTreeFromNodes(nodes: TaxonomyNode[]): TaxonomyTreeNode[] {
  const map = new Map<string, TaxonomyTreeNode>();
  const roots: TaxonomyTreeNode[] = [];

  for (const node of nodes) {
    map.set(node.id, {
      id: node.id,
      slug: node.slug,
      slug_path: node.slug_path,
      label: node.label,
      depth: node.depth,
      children: [],
    });
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

async function getProjectOptions(): Promise<ExploreFilterOptions> {
  const [raw, taxonomyRes, materialTaxRes, facetRes] = await Promise.all([
    getProjectFilterOptions(),
    getTaxonomyTree("project"),
    getTaxonomyTree("material"),
    getFacetsForDomain("project"),
  ]);

  const taxonomyTree = buildTreeFromNodes(taxonomyRes.data ?? []);
  const materialTaxonomy = buildTreeFromNodes(materialTaxRes.data ?? []);
  const facets: FacetFilterGroup[] = (facetRes.data ?? []).map((f) => ({
    slug: f.slug,
    label: f.label,
    is_multi_select: f.is_multi_select,
    values: f.values.map((v) => ({ slug: v.slug, label: v.label })),
  }));

  const locations = raw.locations.map((loc) => {
    const label = [loc.city, loc.country].filter(Boolean).join(", ") || "Unknown";
    const value = JSON.stringify({ city: loc.city, country: loc.country });
    return { value, label, city: loc.city, country: loc.country };
  });

  return {
    categories: raw.categories.map((c) => ({ value: c, label: c })),
    taxonomyTree,
    locations,
    designers: raw.designers.map((d) => ({ value: d.id, label: d.name })),
    brands: raw.brands.map((b) => ({ value: b, label: b })),
    years: raw.years.map((y) => ({ value: String(y), label: String(y) })),
    materials: raw.materials.map((m) => ({ value: m.slug, label: m.display_name })),
    materialTaxonomy,
    areas: raw.areas.map((a) => ({ value: a, label: a === "8000+" ? "8,000+" : a.replace("-", " – ") })),
    colors: [],
    materialTypes: [],
    facets,
  };
}

async function getProductOptions(): Promise<ExploreFilterOptions> {
  const [raw, taxonomyRes, materialTaxRes, facetRes] = await Promise.all([
    getProductFilterOptions(),
    getTaxonomyTree("product"),
    getTaxonomyTree("material"),
    getFacetsForDomain("product"),
  ]);

  const taxonomyTree = buildTreeFromNodes(taxonomyRes.data ?? []);
  const materialTaxonomy = buildTreeFromNodes(materialTaxRes.data ?? []);
  const facets: FacetFilterGroup[] = (facetRes.data ?? []).map((f) => ({
    slug: f.slug,
    label: f.label,
    is_multi_select: f.is_multi_select,
    values: f.values.map((v) => ({ slug: v.slug, label: v.label })),
  }));

  return {
    categories: raw.categories.map((c) => ({ value: c, label: c })),
    taxonomyTree,
    locations: [],
    designers: [],
    brands: raw.brands.map((b) => ({ value: b.id, label: b.name })),
    years: raw.years.map((y) => ({ value: String(y), label: String(y) })),
    materials: raw.materials.map((m) => ({ value: m.slug, label: m.display_name })),
    materialTaxonomy,
    areas: [],
    colors: raw.colors.map((c) => ({ value: c, label: c })),
    materialTypes: raw.materialTypes.map((m) => ({ value: m, label: m })),
    facets,
  };
}

/**
 * Get filter dropdown options for explore. Always fresh — no cache.
 * Called from force-dynamic pages; Supabase service client is server-only.
 */
export async function getExploreFilterOptions(type: ExploreType): Promise<ExploreFilterOptions> {
  return type === "projects" ? getProjectOptions() : getProductOptions();
}
