/**
 * Mappers into ListingCardModel — the one input the shared card takes.
 *
 * ── WHY MAPPERS AND NOT A POLYMORPHIC CARD ──────────────────────────────────
 * Two data shapes reach card surfaces: raw `ListingCardData` rows (saved
 * boards, linked-listings rails) and normalised `ProjectCanonical` /
 * `ProductCanonical` (explore, archive, homepage). Before this, that difference
 * was absorbed by FOUR adapter components wrapping two near-identical base
 * cards, which is how the two families drifted apart in the first place.
 *
 * Putting the difference in pure functions instead means the card has one
 * input, no branching on provenance, and nothing to drift: a change to how a
 * title or an owner link is derived happens once, here.
 *
 * ── BADGE COUNTS ARE NEVER FETCHED HERE ─────────────────────────────────────
 * Counts come from getCardBadgeCounts / getCreditCounts, batched once per grid.
 * A mapper takes them either as an explicit argument or, for canonical inputs,
 * off the object itself — getProjectsCanonical and getProductsCanonical attach
 * them during their existing fan-out. Neither path queries per card, which is
 * the whole point. A caller with neither renders no badge, which is correct for
 * a surface that has not wired the counts up.
 */

import type { ListingCardModel } from "@/components/listing/ListingCardShared";
import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";
import type { ListingCardData } from "@/lib/types/listings";
import type { CardBadgeCount } from "@/lib/db/cardBadgeCounts";
import { getListingUrl } from "@/lib/canonical";
import { getCityLabel, getOwnerProfileHref } from "@/lib/cardUtils";
import { getArchiveCategoryUrl } from "@/lib/archive/urls";

export interface CardCounts {
  badge?: CardBadgeCount;
  credits?: number;
}

/**
 * Archive URL for the ROOT of a taxonomy path.
 *
 * `taxonomy_slug_path` can be deep ("residential/houses"), but the label shown
 * on the card is the root's, so the link has to point at the root too — a link
 * whose text says "Residential" must not land on a narrower archive.
 */
function rootArchiveUrl(type: "project" | "product", slugPath: string | null | undefined): string | null {
  const root = slugPath?.split("/")[0]?.trim();
  return root ? getArchiveCategoryUrl(type, root) : null;
}

/** Boards use "1 project", "0 projects" — never "null". */
function cleanText(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

export function projectToCardModel(
  project: ProjectCanonical,
  counts: CardCounts = {},
  initialSaved = false
): ListingCardModel {
  // City + country when a real city exists, country alone otherwise. The raw
  // free-text location is deliberately NOT a fallback any more — see the note
  // on getCityLabel for why its first segment is often a street.
  const city = getCityLabel(project);
  const country = cleanText(project.location?.country);
  const location = city && country ? `${city}, ${country}` : city || country;

  return {
    id: project.id,
    type: "project",
    title: cleanText(project.title) ?? "Untitled project",
    href: getListingUrl({
      id: project.id,
      type: "project",
      slug: project.slug,
      taxonomySlugPath: project.taxonomy_slug_path ?? null,
    }),
    imageUrl: project.cover,
    categoryLabel: cleanText(project.taxonomy_label) ?? cleanText(project.category),
    // Archive route for the category root, e.g. /projects/residential. Built
    // only from a real taxonomy slug_path — never from the display label, which
    // would produce a URL that does not resolve.
    categoryHref: rootArchiveUrl("project", project.taxonomy_slug_path),
    metaLabel: location,
    // City filter, kept from the previous cards — a working discovery entry
    // point the mockup does not show but that visitors already use.
    metaHref: city ? `/explore/projects?city=${encodeURIComponent(city)}` : null,
    authorName: cleanText(project.owner?.displayName),
    authorHref: project.owner ? getOwnerProfileHref(project.owner) : null,
    logoUrl: project.owner?.avatarUrl ?? null,
    year: project.year ?? null,
    yearHref: project.year ? `/explore/projects?year=${project.year}` : null,
    // Explicit counts win; otherwise fall back to what the canonical layer
    // already batched onto the object. Surfaces that go through
    // getProjectsCanonical therefore get the badge with no prop plumbing at
    // all, which is why four client-component grids did not need rewriting.
    relatedCount: counts.badge?.related ?? project.cardBadge?.related ?? 0,
    ownerCount: counts.badge?.owners ?? project.cardBadge?.owners ?? 0,
    creditCount: counts.credits ?? project.cardCreditCount ?? 0,
    initialSaved,
  };
}

export function productToCardModel(
  product: ProductCanonical,
  counts: CardCounts = {},
  initialSaved = false
): ListingCardModel {
  return {
    id: product.id,
    type: "product",
    title: cleanText(product.title) ?? "Untitled product",
    href: getListingUrl({
      id: product.id,
      type: "product",
      slug: product.slug,
      taxonomySlugPath: product.taxonomy_slug_path ?? null,
    }),
    imageUrl: product.cover,
    categoryLabel: cleanText(product.taxonomy_label) ?? cleanText(product.category),
    categoryHref: rootArchiveUrl("product", product.taxonomy_slug_path),
    // The product's sub-type. No href: unlike a project's city there is no
    // equivalent single-value filter route for it.
    metaLabel: cleanText(product.product_category),
    metaHref: null,
    authorName: cleanText(product.owner?.displayName),
    authorHref: product.owner ? getOwnerProfileHref(product.owner) : null,
    logoUrl: product.owner?.avatarUrl ?? null,
    relatedCount: counts.badge?.related ?? product.cardBadge?.related ?? 0,
    ownerCount: counts.badge?.owners ?? product.cardBadge?.owners ?? 0,
    initialSaved,
  };
}

/**
 * Raw `listings` row → card model.
 *
 * Used where a surface never went through the canonical normalisers — saved
 * boards and the linked-listings rails. Deliberately conservative: it maps only
 * fields that exist on the row, so a board card shows less than an explore card
 * rather than inventing what it cannot know.
 */
export function listingRowToCardModel(
  listing: ListingCardData,
  options: {
    type?: "project" | "product";
    imageUrl?: string | null;
    href?: string | null;
    authorName?: string | null;
    location?: string | null;
    counts?: CardCounts;
    initialSaved?: boolean;
  } = {}
): ListingCardModel {
  const type = options.type ?? (listing.type === "product" ? "product" : "project");
  const isProject = type === "project";
  const location = cleanText(options.location ?? listing.location);
  const city = location ? location.split(",")[0]?.trim() || location : null;

  return {
    id: listing.id,
    type,
    title: cleanText(listing.title) ?? (isProject ? "Untitled project" : "Untitled product"),
    href: cleanText(options.href) ?? getListingUrl(listing),
    imageUrl: options.imageUrl ?? listing.cover_image_url ?? null,
    categoryLabel: cleanText(listing.category),
    metaLabel: isProject ? location : cleanText(listing.product_category),
    metaHref:
      isProject && city ? `/explore/projects?city=${encodeURIComponent(city)}` : null,
    authorName: cleanText(options.authorName),
    authorHref: null,
    logoUrl: null,
    year: isProject ? listing.year ?? null : null,
    yearHref: isProject && listing.year ? `/explore/projects?year=${listing.year}` : null,
    relatedCount: options.counts?.badge?.related ?? 0,
    ownerCount: options.counts?.badge?.owners ?? 0,
    creditCount: isProject ? options.counts?.credits ?? 0 : 0,
    initialSaved: options.initialSaved ?? false,
  };
}
