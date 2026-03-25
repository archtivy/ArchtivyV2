/**
 * Normalization and fuzzy matching for taxonomy backfill.
 *
 * Handles mismatches between legacy listing fields and taxonomy node values:
 * - casing differences (Furniture vs furniture)
 * - spaces/underscores vs hyphens (dining chair vs dining-chair)
 * - common plural forms (sofas vs sofa)
 * - known aliases (fixtures-fittings vs fixtures-and-fittings)
 */

// ── Normalization ────────────────────────────────────────────────────────────

/** Normalize a string for comparison: lowercase, hyphens, trim, singularize. */
export function normalize(value: string): string {
  let s = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")       // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/g, "")    // strip non-alphanumeric (except hyphens)
    .replace(/-{2,}/g, "-")        // collapse multiple hyphens
    .replace(/^-|-$/g, "");        // trim leading/trailing hyphens

  // Singularize common architectural/product plural forms
  s = singularize(s);

  return s;
}

/** Simple English singularizer for common product/category terms. */
function singularize(word: string): string {
  // Exact known plurals that don't follow simple rules
  const IRREGULAR: Record<string, string> = {
    "shelves": "shelf",
    "leaves": "leaf",
    "knives": "knife",
    "halves": "half",
    "loaves": "loaf",
    "valves": "valve",  // valve is already singular, keep as-is
  };

  if (IRREGULAR[word]) return IRREGULAR[word];

  // Don't singularize words that end in -ss (glass, grass, etc.)
  if (word.endsWith("ss")) return word;

  // -ies → -y (accessories → accessory, categories → category)
  if (word.endsWith("ies") && word.length > 4) {
    return word.slice(0, -3) + "y";
  }

  // -ses → -s for words ending in -se (chaise → chaise, NOT chais)
  // But handles: cases → case, vases → vase
  if (word.endsWith("ses") && word.length > 4) {
    return word.slice(0, -1);
  }

  // -ches, -shes, -xes → remove -es
  if (/(?:ch|sh|x)es$/.test(word)) {
    return word.slice(0, -2);
  }

  // -s (but not -ss, -us, -is)
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is")) {
    return word.slice(0, -1);
  }

  return word;
}

// ── Alias Map ────────────────────────────────────────────────────────────────

/**
 * Maps known legacy values to canonical taxonomy slugs.
 * Keys are normalized legacy field values; values are canonical slugs.
 * Add entries here when unmapped listings have identifiable patterns.
 */
const PRODUCT_TYPE_ALIASES: Record<string, string> = {
  // Common legacy names → canonical type slugs
  "fixture-and-fitting": "fixtures-fittings",
  "fixture-fitting": "fixtures-fittings",
  "fixtures-and-fittings": "fixtures-fittings",
  "surface-and-material": "surfaces-materials",
  "surface-material": "surfaces-materials",
  "surfaces-and-materials": "surfaces-materials",
  "appliance": "appliances",
  "light": "lighting",
  "lights": "lighting",
  "lighting-fixture": "lighting",
  "lighting-fixtures": "lighting",
  "door-and-window": "doors-windows",
  "doors-and-windows": "doors-windows",
  "door-window": "doors-windows",
  "outdoor": "outdoor-landscape",
  "landscape": "outdoor-landscape",
  "outdoor-and-landscape": "outdoor-landscape",
  "kitchen-and-bath": "kitchen-bath",
  "kitchen-bathroom": "kitchen-bath",
  "kitchens-baths": "kitchen-bath",
  "wall-ceiling": "walls-ceilings",
  "walls-and-ceilings": "walls-ceilings",
  "wall-and-ceiling": "walls-ceilings",
  "system-and-technology": "systems-technology",
  "systems-and-technology": "systems-technology",
  "textile": "textiles",
  "fabric": "textiles",
};

// ── Fuzzy Matching ───────────────────────────────────────────────────────────

export interface TaxonomyNodeForMatch {
  id: string;
  slug_path: string;
  legacy_product_type: string | null;
  legacy_product_category: string | null;
  legacy_product_subcategory: string | null;
  legacy_project_category: string | null;
  label: string;
  slug: string;
  depth: number;
}

export interface FuzzyMatch {
  node: TaxonomyNodeForMatch;
  confidence: "exact" | "normalized" | "alias" | "label";
}

/**
 * Find the best matching product taxonomy node for a set of legacy fields.
 * Tries exact → normalized → alias → label matching, in that order.
 * Returns the deepest confident match, or null.
 */
export function fuzzyMatchProductNode(
  nodes: TaxonomyNodeForMatch[],
  productType: string,
  productCategory?: string | null,
  productSubcategory?: string | null,
): FuzzyMatch | null {
  const normType = normalize(productType);
  const normCat = productCategory ? normalize(productCategory) : null;
  const normSub = productSubcategory ? normalize(productSubcategory) : null;

  // Resolve type aliases
  const resolvedType = PRODUCT_TYPE_ALIASES[normType] ?? normType;

  // Try to match at each depth level, deepest first
  let bestMatch: FuzzyMatch | null = null;

  for (const node of nodes) {
    const match = matchNode(node, resolvedType, normCat, normSub);
    if (!match) continue;

    // Prefer deeper matches and higher confidence
    if (!bestMatch || nodeIsBetterMatch(match, bestMatch)) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

function matchNode(
  node: TaxonomyNodeForMatch,
  normType: string,
  normCat: string | null,
  normSub: string | null,
): FuzzyMatch | null {
  const nodeNormType = node.legacy_product_type ? normalize(node.legacy_product_type) : null;
  const nodeNormCat = node.legacy_product_category ? normalize(node.legacy_product_category) : null;
  const nodeNormSub = node.legacy_product_subcategory ? normalize(node.legacy_product_subcategory) : null;

  // Type must match (normalized)
  const typeMatches = nodeNormType === normType
    || normalize(node.slug.split("/")[0] || "") === normType
    || normalize(node.label) === normType;

  if (!typeMatches && node.depth === 0) {
    // For root nodes, also try label match
    if (normalize(node.label) === normType) {
      return { node, confidence: "label" };
    }
    return null;
  }

  if (!typeMatches) return null;

  // Depth 0: type-only node
  if (node.depth === 0) {
    if (!normCat && !normSub) return { node, confidence: "normalized" };
    // We matched the type but listing has deeper fields — this is a parent fallback
    return { node, confidence: "normalized" };
  }

  // Depth 1: type + category
  if (node.depth === 1) {
    if (!normCat) return null;
    const catMatches = nodeNormCat === normCat
      || normalize(node.slug) === normCat
      || normalize(node.label) === normCat;

    if (catMatches) {
      const confidence = nodeNormCat === normCat ? "normalized" : "label";
      return { node, confidence };
    }
    return null;
  }

  // Depth 2: type + category + subcategory
  if (node.depth === 2) {
    if (!normSub || !normCat) return null;
    const catMatches = nodeNormCat === normCat
      || normalize(node.slug_path.split("/")[1] || "") === normCat;
    const subMatches = nodeNormSub === normSub
      || normalize(node.slug) === normSub
      || normalize(node.label) === normSub;

    if (catMatches && subMatches) {
      const confidence = (nodeNormCat === normCat && nodeNormSub === normSub)
        ? "normalized" : "label";
      return { node, confidence };
    }
    return null;
  }

  return null;
}

const CONFIDENCE_RANK: Record<string, number> = {
  exact: 4,
  normalized: 3,
  alias: 2,
  label: 1,
};

function nodeIsBetterMatch(a: FuzzyMatch, b: FuzzyMatch): boolean {
  // Prefer deeper nodes (more specific match)
  if (a.node.depth !== b.node.depth) return a.node.depth > b.node.depth;
  // Prefer higher confidence
  return (CONFIDENCE_RANK[a.confidence] ?? 0) > (CONFIDENCE_RANK[b.confidence] ?? 0);
}

/**
 * Find the best matching project taxonomy node for a legacy category value.
 */
export function fuzzyMatchProjectNode(
  nodes: TaxonomyNodeForMatch[],
  category: string,
): FuzzyMatch | null {
  const normCat = normalize(category);

  for (const node of nodes) {
    if (node.depth !== 0) continue; // project taxonomy is flat (depth 0)

    // Exact legacy match (normalized)
    const nodeLegacy = node.legacy_project_category ? normalize(node.legacy_project_category) : null;
    if (nodeLegacy === normCat) return { node, confidence: "normalized" };

    // Slug match
    if (normalize(node.slug) === normCat) return { node, confidence: "normalized" };

    // Label match
    if (normalize(node.label) === normCat) return { node, confidence: "label" };
  }

  return null;
}
