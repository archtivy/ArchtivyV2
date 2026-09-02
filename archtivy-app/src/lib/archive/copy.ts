import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";

/**
 * The one description a category archive uses.
 *
 * ── WHY THIS IS A FUNCTION AND NOT FIVE STRING LITERALS ─────────────────────
 * This sentence was written out four times — twice in each [...segments]
 * route's generateMetadata, and once in each archive component for the
 * CollectionPage JSON-LD — with the same fallback chain copied by hand. That
 * is the near-duplicate-path pattern this codebase keeps producing: four
 * copies, and nothing stopping the next edit from changing three of them.
 * The meta description, the OG description and the JSON-LD description are the
 * same claim about the same page, so they resolve through the same function.
 *
 * ── NO INVENTED COPY ────────────────────────────────────────────────────────
 * Authored text wins when it exists: meta_description, then description. The
 * fallback is a template over the node's own label and nothing else — no
 * counts, no claims about who publishes here, no adjectives the data cannot
 * support. Today every one of the 760 live project/product nodes has both
 * authored fields NULL, so the fallback is what every archive actually emits;
 * it had better be a sentence that is true for all 760. Both fallback strings
 * are byte-identical to the ones the routes emitted before this was extracted,
 * so no live meta description changes.
 */
export function archiveIntro(
  domain: "project" | "product",
  node: Pick<TaxonomyNode, "label" | "meta_description" | "description">
): string {
  if (node.meta_description) return node.meta_description;
  if (node.description) return node.description;
  const label = node.label.toLowerCase();
  return domain === "project"
    ? `Browse ${label} architecture projects on Archtivy.`
    : `Browse ${label} products on Archtivy.`;
}
