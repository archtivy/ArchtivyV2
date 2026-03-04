"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import {
  getAllTaxonomyNodes,
  getAllFacets,
  createTaxonomyNode,
  updateTaxonomyNode,
  getNodeListingCounts,
  getUnmappedListingCount,
  type TaxonomyNode,
  type FacetWithValues,
} from "@/lib/taxonomy/taxonomyDb";
import { ALL_SEED_NODES, REDIRECT_SEED_DATA, type TaxonomySeedNode } from "@/lib/taxonomy/seedData";
import { FACET_SEEDS, SYNONYM_SEEDS } from "@/lib/taxonomy/facetSeedData";
import { runTaxonomyBackfill, type BackfillStats } from "@/lib/taxonomy/backfill";

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, error: "Profile not found" };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, error: "Forbidden" };
  return { ok: true };
}

function revalidateTaxonomy() {
  revalidatePath("/admin/taxonomies");
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getTaxonomyData(): Promise<{
  ok: boolean;
  nodes?: TaxonomyNode[];
  facets?: FacetWithValues[];
  nodeCounts?: Record<string, number>;
  unmappedCount?: number;
  error?: string;
}> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const [nodesRes, facetsRes, countsRes, unmappedRes] = await Promise.all([
    getAllTaxonomyNodes(),
    getAllFacets(),
    getNodeListingCounts(),
    getUnmappedListingCount(),
  ]);

  if (nodesRes.error) return { ok: false, error: nodesRes.error };
  if (facetsRes.error) return { ok: false, error: facetsRes.error };

  return {
    ok: true,
    nodes: nodesRes.data ?? [],
    facets: facetsRes.data ?? [],
    nodeCounts: countsRes.data ?? {},
    unmappedCount: unmappedRes.data ?? 0,
  };
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export async function seedTaxonomyNodes(): Promise<{
  ok: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, inserted: 0, skipped: 0, error: admin.error };

  const supa = getSupabaseServiceClient();
  let inserted = 0;
  let skipped = 0;

  // Build a map of slug_path -> id for parent resolution
  const slugToId = new Map<string, string>();

  // Sort by depth to ensure parents are inserted first
  const sorted = [...ALL_SEED_NODES].sort((a, b) => a.depth - b.depth);

  for (const node of sorted) {
    // Check if already exists
    const { data: existing } = await supa
      .from("taxonomy_nodes")
      .select("id")
      .eq("domain", node.domain)
      .eq("slug_path", node.slug_path)
      .maybeSingle();

    if (existing) {
      slugToId.set(`${node.domain}:${node.slug_path}`, (existing as { id: string }).id);
      skipped++;
      continue;
    }

    // Resolve parent
    let parentId: string | null = null;
    if (node.parent_slug_path) {
      parentId = slugToId.get(`${node.domain}:${node.parent_slug_path}`) ?? null;
    }

    const res = await createTaxonomyNode({
      domain: node.domain,
      parent_id: parentId,
      depth: node.depth,
      slug: node.slug,
      slug_path: node.slug_path,
      label: node.label,
      sort_order: node.sort_order,
    });

    if (res.error) {
      return { ok: false, inserted, skipped, error: `Failed at ${node.slug_path}: ${res.error}` };
    }

    // Set legacy columns directly (createTaxonomyNode doesn't handle them)
    if (node.legacy_product_type || node.legacy_product_category || node.legacy_product_subcategory || node.legacy_project_category) {
      await supa
        .from("taxonomy_nodes")
        .update({
          legacy_product_type: node.legacy_product_type ?? null,
          legacy_product_category: node.legacy_product_category ?? null,
          legacy_product_subcategory: node.legacy_product_subcategory ?? null,
          legacy_project_category: node.legacy_project_category ?? null,
        })
        .eq("id", res.data!.id);
    }

    slugToId.set(`${node.domain}:${node.slug_path}`, res.data!.id);
    inserted++;
  }

  revalidateTaxonomy();
  return { ok: true, inserted, skipped };
}

export async function seedFacets(): Promise<{
  ok: boolean;
  facetsInserted: number;
  valuesInserted: number;
  error?: string;
}> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, facetsInserted: 0, valuesInserted: 0, error: admin.error };

  const supa = getSupabaseServiceClient();
  let facetsInserted = 0;
  let valuesInserted = 0;

  for (const facet of FACET_SEEDS) {
    // Check if already exists
    const { data: existing } = await supa
      .from("facets")
      .select("id")
      .eq("slug", facet.slug)
      .maybeSingle();

    let facetId: string;
    if (existing) {
      facetId = (existing as { id: string }).id;
      // Update applies_to + sort_order to match seed data
      await supa
        .from("facets")
        .update({ applies_to: facet.applies_to, sort_order: facet.sort_order })
        .eq("id", facetId);
    } else {
      const { data: inserted, error } = await supa
        .from("facets")
        .insert({
          slug: facet.slug,
          label: facet.label,
          description: facet.description,
          applies_to: facet.applies_to,
          is_multi_select: facet.is_multi_select,
          sort_order: facet.sort_order,
        })
        .select("id")
        .single();
      if (error) {
        return { ok: false, facetsInserted, valuesInserted, error: `Facet ${facet.slug}: ${error.message}` };
      }
      facetId = (inserted as { id: string }).id;
      facetsInserted++;
    }

    // Insert values
    for (const val of facet.values) {
      const { data: existingVal } = await supa
        .from("facet_values")
        .select("id")
        .eq("facet_id", facetId)
        .eq("slug", val.slug)
        .maybeSingle();

      if (!existingVal) {
        const { error: valErr } = await supa.from("facet_values").insert({
          facet_id: facetId,
          slug: val.slug,
          label: val.label,
          sort_order: val.sort_order,
        });
        if (valErr) {
          return { ok: false, facetsInserted, valuesInserted, error: `Value ${facet.slug}/${val.slug}: ${valErr.message}` };
        }
        valuesInserted++;
      }
    }
  }

  revalidateTaxonomy();
  return { ok: true, facetsInserted, valuesInserted };
}

export async function seedSynonyms(): Promise<{
  ok: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, inserted: 0, skipped: 0, error: admin.error };

  const supa = getSupabaseServiceClient();
  let inserted = 0;
  let skipped = 0;

  for (const syn of SYNONYM_SEEDS) {
    // Check if synonym already exists for this term
    const { data: existing } = await supa
      .from("search_synonyms")
      .select("id")
      .eq("term", syn.term)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    let taxonomyNodeId: string | null = null;
    let facetValueId: string | null = null;

    if (syn.taxonomy_slug_path) {
      // Find the taxonomy node
      const { data: node } = await supa
        .from("taxonomy_nodes")
        .select("id")
        .eq("slug_path", syn.taxonomy_slug_path)
        .maybeSingle();
      if (node) {
        taxonomyNodeId = (node as { id: string }).id;
      } else {
        skipped++;
        continue;
      }
    } else if (syn.facet_slug && syn.facet_value_slug) {
      // Find the facet value
      const { data: facet } = await supa
        .from("facets")
        .select("id")
        .eq("slug", syn.facet_slug)
        .maybeSingle();
      if (!facet) { skipped++; continue; }

      const { data: facetValue } = await supa
        .from("facet_values")
        .select("id")
        .eq("facet_id", (facet as { id: string }).id)
        .eq("slug", syn.facet_value_slug)
        .maybeSingle();
      if (facetValue) {
        facetValueId = (facetValue as { id: string }).id;
      } else {
        skipped++;
        continue;
      }
    }

    if (!taxonomyNodeId && !facetValueId) {
      skipped++;
      continue;
    }

    const { error } = await supa.from("search_synonyms").insert({
      term: syn.term,
      taxonomy_node_id: taxonomyNodeId,
      facet_value_id: facetValueId,
    });

    if (error) {
      return { ok: false, inserted, skipped, error: `Synonym "${syn.term}": ${error.message}` };
    }
    inserted++;
  }

  revalidateTaxonomy();
  return { ok: true, inserted, skipped };
}

// ─── Node CRUD ───────────────────────────────────────────────────────────────

export async function addTaxonomyNode(input: {
  domain: string;
  parent_id: string | null;
  slug: string;
  label: string;
  sort_order: number;
}): Promise<{ ok: boolean; node?: TaxonomyNode; error?: string }> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  // Resolve slug_path and depth from parent
  let slugPath = input.slug;
  let depth = 0;
  if (input.parent_id) {
    const supa = getSupabaseServiceClient();
    const { data: parent } = await supa
      .from("taxonomy_nodes")
      .select("slug_path, depth")
      .eq("id", input.parent_id)
      .single();
    if (parent) {
      const p = parent as { slug_path: string; depth: number };
      slugPath = `${p.slug_path}/${input.slug}`;
      depth = p.depth + 1;
    }
  }

  const res = await createTaxonomyNode({
    domain: input.domain,
    parent_id: input.parent_id,
    depth,
    slug: input.slug,
    slug_path: slugPath,
    label: input.label,
    sort_order: input.sort_order,
  });

  if (res.error) return { ok: false, error: res.error };
  revalidateTaxonomy();
  return { ok: true, node: res.data! };
}

export async function editTaxonomyNode(
  id: string,
  updates: { label?: string; sort_order?: number; is_active?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const res = await updateTaxonomyNode(id, updates);
  if (res.error) return { ok: false, error: res.error };
  revalidateTaxonomy();
  return { ok: true };
}

// ─── Redirects ────────────────────────────────────────────────────────────────

export async function seedRedirects(): Promise<{
  ok: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, inserted: 0, skipped: 0, error: admin.error };

  const supa = getSupabaseServiceClient();
  let inserted = 0;
  let skipped = 0;

  for (const r of REDIRECT_SEED_DATA) {
    const { data: existing } = await supa
      .from("taxonomy_redirects")
      .select("id")
      .eq("old_slug_path", r.old_slug_path)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supa.from("taxonomy_redirects").insert({
      old_slug_path: r.old_slug_path,
      new_slug_path: r.new_slug_path,
      domain: r.domain,
    });

    if (error) {
      return { ok: false, inserted, skipped, error: `Redirect ${r.old_slug_path}: ${error.message}` };
    }
    inserted++;
  }

  revalidateTaxonomy();
  return { ok: true, inserted, skipped };
}

// ─── Backfill ────────────────────────────────────────────────────────────────

export async function triggerBackfill(options?: {
  dryRun?: boolean;
}): Promise<{
  ok: boolean;
  stats?: BackfillStats;
  error?: string;
}> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false, error: admin.error };

  const stats = await runTaxonomyBackfill({ dryRun: options?.dryRun });
  if (!options?.dryRun) revalidateTaxonomy();
  return { ok: true, stats };
}
