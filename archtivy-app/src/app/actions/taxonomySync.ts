"use server";

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { PRODUCT_TAXONOMY, PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID } from "@/lib/taxonomy/productTaxonomy";

/**
 * Sync the canonical product taxonomy (from productTaxonomy.ts) into the
 * taxonomy_nodes DB table. Creates missing nodes, updates legacy mapping
 * columns on existing nodes. Never deletes.
 *
 * Returns a summary of changes made.
 */
export async function syncCanonicalProductTaxonomy(): Promise<{
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}> {
  const sup = getSupabaseServiceClient();
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  // Build flat list of all canonical nodes with their legacy mappings
  interface CanonicalNode {
    slug_path: string;
    slug: string;
    label: string;
    depth: number;
    parent_slug_path: string | null;
    legacy_product_type: string;
    legacy_product_category: string | null;
    legacy_product_subcategory: string | null;
  }

  const allNodes: CanonicalNode[] = [];

  for (const type of PRODUCT_TAXONOMY) {
    // Depth 0: root type
    allNodes.push({
      slug_path: type.id,
      slug: type.id,
      label: type.label,
      depth: 0,
      parent_slug_path: null,
      legacy_product_type: type.id,
      legacy_product_category: null,
      legacy_product_subcategory: null,
    });

    for (const cat of type.categories) {
      // Depth 1: category
      allNodes.push({
        slug_path: `${type.id}/${cat.id}`,
        slug: cat.id,
        label: cat.label,
        depth: 1,
        parent_slug_path: type.id,
        legacy_product_type: type.id,
        legacy_product_category: cat.id,
        legacy_product_subcategory: null,
      });

      for (const sub of cat.subcategories) {
        if (sub.id === PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID) continue;
        // Depth 2: subcategory
        allNodes.push({
          slug_path: `${type.id}/${cat.id}/${sub.id}`,
          slug: sub.id,
          label: sub.label,
          depth: 2,
          parent_slug_path: `${type.id}/${cat.id}`,
          legacy_product_type: type.id,
          legacy_product_category: cat.id,
          legacy_product_subcategory: sub.id,
        });
      }
    }
  }

  // Fetch existing product taxonomy nodes from DB
  const { data: existingNodes, error: fetchErr } = await sup
    .from("taxonomy_nodes")
    .select("id, slug_path, slug, label, depth, parent_id, legacy_product_type, legacy_product_category, legacy_product_subcategory")
    .eq("domain", "product")
    .eq("is_active", true);

  if (fetchErr) {
    return { created: 0, updated: 0, unchanged: 0, errors: [`Fetch error: ${fetchErr.message}`] };
  }

  const existingBySlugPath = new Map<string, {
    id: string;
    slug_path: string;
    label: string;
    depth: number;
    parent_id: string | null;
    legacy_product_type: string | null;
    legacy_product_category: string | null;
    legacy_product_subcategory: string | null;
  }>();
  for (const n of existingNodes ?? []) {
    existingBySlugPath.set(n.slug_path, n as typeof existingBySlugPath extends Map<string, infer V> ? V : never);
  }

  // Process nodes in depth order (parents first so we can resolve parent_id)
  const sortedNodes = [...allNodes].sort((a, b) => a.depth - b.depth);
  // Map from slug_path to DB id for parent resolution
  const slugPathToId = new Map<string, string>();
  for (const n of existingNodes ?? []) {
    slugPathToId.set(n.slug_path, n.id);
  }

  for (const node of sortedNodes) {
    const existing = existingBySlugPath.get(node.slug_path);
    const parentId = node.parent_slug_path ? slugPathToId.get(node.parent_slug_path) ?? null : null;

    if (existing) {
      // Check if legacy mapping columns need updating
      const needsUpdate =
        existing.legacy_product_type !== node.legacy_product_type ||
        existing.legacy_product_category !== node.legacy_product_category ||
        existing.legacy_product_subcategory !== node.legacy_product_subcategory ||
        existing.label !== node.label;

      if (needsUpdate) {
        const { error: upErr } = await sup
          .from("taxonomy_nodes")
          .update({
            legacy_product_type: node.legacy_product_type,
            legacy_product_category: node.legacy_product_category,
            legacy_product_subcategory: node.legacy_product_subcategory,
            label: node.label,
            ...(parentId && !existing.parent_id ? { parent_id: parentId } : {}),
          })
          .eq("id", existing.id);

        if (upErr) {
          errors.push(`Update ${node.slug_path}: ${upErr.message}`);
        } else {
          updated++;
        }
      } else {
        unchanged++;
      }
    } else {
      // Create new node
      const { data: newNode, error: insErr } = await sup
        .from("taxonomy_nodes")
        .insert({
          domain: "product",
          slug: node.slug,
          slug_path: node.slug_path,
          label: node.label,
          depth: node.depth,
          parent_id: parentId,
          is_active: true,
          legacy_product_type: node.legacy_product_type,
          legacy_product_category: node.legacy_product_category,
          legacy_product_subcategory: node.legacy_product_subcategory,
        })
        .select("id")
        .single();

      if (insErr) {
        errors.push(`Create ${node.slug_path}: ${insErr.message}`);
      } else if (newNode) {
        slugPathToId.set(node.slug_path, newNode.id);
        created++;
      }
    }
  }

  return { created, updated, unchanged, errors };
}

/**
 * Backfill taxonomy_node_id for products that have legacy fields but no
 * taxonomy node link. Uses exact matching on product_type + product_category +
 * product_subcategory to find the correct node.
 *
 * Non-destructive: only fills NULL taxonomy_node_id fields.
 */
export async function backfillProductTaxonomyLinks(): Promise<{
  linked: number;
  skipped: number;
  errors: string[];
}> {
  const sup = getSupabaseServiceClient();
  let linked = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Get all products without taxonomy_node_id
  const { data: unmapped, error: fetchErr } = await sup
    .from("listings")
    .select("id, product_type, product_category, product_subcategory")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .is("taxonomy_node_id", null)
    .not("product_type", "is", null)
    .limit(5000);

  if (fetchErr) {
    return { linked: 0, skipped: 0, errors: [`Fetch error: ${fetchErr.message}`] };
  }

  if (!unmapped || unmapped.length === 0) {
    return { linked: 0, skipped: 0, errors: [] };
  }

  // Load all product taxonomy nodes
  const { data: nodes } = await sup
    .from("taxonomy_nodes")
    .select("id, slug_path, legacy_product_type, legacy_product_category, legacy_product_subcategory")
    .eq("domain", "product")
    .eq("is_active", true);

  if (!nodes || nodes.length === 0) {
    return { linked: 0, skipped: unmapped.length, errors: ["No product taxonomy nodes in DB"] };
  }

  // Build lookup: best match (deepest) wins
  type NodeRow = { id: string; slug_path: string; legacy_product_type: string | null; legacy_product_category: string | null; legacy_product_subcategory: string | null };

  for (const listing of unmapped) {
    const pt = listing.product_type?.trim() || null;
    const pc = listing.product_category?.trim() || null;
    const ps = listing.product_subcategory?.trim() || null;

    if (!pt) { skipped++; continue; }

    // Try exact 3-level match first, then 2-level, then 1-level
    let bestMatch: NodeRow | null = null;

    for (const node of nodes as NodeRow[]) {
      if (node.legacy_product_type !== pt) continue;

      if (ps && node.legacy_product_subcategory === ps && node.legacy_product_category === pc) {
        bestMatch = node;
        break; // Exact 3-level match
      }
      if (pc && node.legacy_product_category === pc && !node.legacy_product_subcategory) {
        if (!bestMatch || !bestMatch.legacy_product_category) bestMatch = node;
      }
      if (!node.legacy_product_category && !node.legacy_product_subcategory) {
        if (!bestMatch) bestMatch = node;
      }
    }

    if (!bestMatch) { skipped++; continue; }

    // Set taxonomy_node_id on the listing and create junction row
    const { error: upErr } = await sup
      .from("listings")
      .update({ taxonomy_node_id: bestMatch.id })
      .eq("id", listing.id);

    if (upErr) {
      errors.push(`Listing ${listing.id}: ${upErr.message}`);
      continue;
    }

    // Upsert listing_taxonomy_node junction
    const { error: juncErr } = await sup
      .from("listing_taxonomy_node")
      .upsert(
        { listing_id: listing.id, taxonomy_node_id: bestMatch.id, is_primary: true },
        { onConflict: "listing_id,taxonomy_node_id" },
      );

    if (juncErr) {
      errors.push(`Junction ${listing.id}: ${juncErr.message}`);
    } else {
      linked++;
    }
  }

  return { linked, skipped, errors };
}
