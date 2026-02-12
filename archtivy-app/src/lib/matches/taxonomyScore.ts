/**
 * Taxonomy-based match score for product ↔ product comparison.
 * Combined with existing embedding/attribute scoring; does not replace it.
 * Type +20, Category +35, Subcategory +45. If either subcategory is fallback, cap sub at +10.
 */

import { isFallbackSubcategory } from "@/lib/taxonomy/productTaxonomy";

export interface ProductTaxonomyFields {
  product_type?: string | null;
  product_category?: string | null;
  product_subcategory?: string | null;
}

const SCORE_TYPE = 20;
const SCORE_CATEGORY = 35;
const SCORE_SUBCATEGORY = 45;
const SCORE_SUBCATEGORY_FALLBACK_CAP = 10;

/**
 * Compute taxonomy match score between two products (0–100).
 * Type match: +20. Category match: +35. Subcategory match: +45.
 * If either product has fallback subcategory ("Other / Not specified"), subcategory contribution is capped at +10.
 */
export function taxonomyMatchScore(a: ProductTaxonomyFields, b: ProductTaxonomyFields): number {
  const typeA = (a.product_type ?? "").trim();
  const typeB = (b.product_type ?? "").trim();
  const catA = (a.product_category ?? "").trim();
  const catB = (b.product_category ?? "").trim();
  const subA = (a.product_subcategory ?? "").trim();
  const subB = (b.product_subcategory ?? "").trim();

  let score = 0;
  if (typeA && typeB && typeA === typeB) score += SCORE_TYPE;
  if (catA && catB && catA === catB) score += SCORE_CATEGORY;

  if (subA && subB && subA === subB) {
    if (isFallbackSubcategory(subA) || isFallbackSubcategory(subB)) {
      score += Math.min(SCORE_SUBCATEGORY, SCORE_SUBCATEGORY_FALLBACK_CAP);
    } else {
      score += SCORE_SUBCATEGORY;
    }
  }

  return Math.min(100, score);
}
