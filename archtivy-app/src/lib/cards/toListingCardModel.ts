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
    metaHref: city ? `/projects?city=${encodeURIComponent(city)}` : null,
    authorName: cleanText(project.owner?.displayName),
    authorHref: project.owner ? getOwnerProfileHref(project.owner) : null,
    logoUrl: project.owner?.avatarUrl ?? null,
    year: project.year ?? null,
    yearHref: project.year ? `/projects?year_min=${project.year}&year_max=${project.year}` : null,
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
    /*
     * The product's sub-type — "Office chair" under "Furniture", which is how
     * /products renders the same line.
     *
     * taxonomy_type_label is the leaf from the taxonomy join. product_category
     * is the fallback and is only that: on live rows it holds a raw slug
     * ("seating", "wood-countertops"), which is what the homepage card was
     * printing before the canonical layer resolved real labels.
     *
     * No href: unlike a project's city there is no single-value filter route.
     */
    metaLabel: cleanText(product.taxonomy_type_label) ?? cleanText(product.product_category),
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
 * A raw project `listings` row (plus resolved taxonomy and owner) → card
 * model, deriving exactly what projectToCardModel derives from a
 * ProjectCanonical. Same reasoning as productRowToCardModel below: the detail
 * page's rails do not go through the canonical normalisers, and a mapper kept
 * anywhere but beside its twin is how the card families drifted apart before.
 */
export function projectRowToCardModel(
  row: {
    id: string;
    slug: string | null;
    title: string | null;
    cover: string | null;
    location_city: string | null;
    location_country: string | null;
    year: number | null;
    taxonomy_label: string | null;
    taxonomy_slug_path: string | null;
    owner: { displayName: string; avatarUrl?: string | null; profileId?: string | null; username?: string | null } | null;
  },
  counts: CardCounts = {},
  initialSaved = false
): ListingCardModel {
  const city = cleanText(row.location_city);
  const country = cleanText(row.location_country);
  const location = city && country ? `${city}, ${country}` : city || country;

  return {
    id: row.id,
    type: "project",
    title: cleanText(row.title) ?? "Untitled project",
    href: getListingUrl({
      id: row.id,
      type: "project",
      slug: row.slug,
      taxonomySlugPath: row.taxonomy_slug_path,
    }),
    imageUrl: row.cover,
    categoryLabel: cleanText(row.taxonomy_label),
    categoryHref: rootArchiveUrl("project", row.taxonomy_slug_path),
    metaLabel: location,
    metaHref: city ? `/projects?city=${encodeURIComponent(city)}` : null,
    authorName: cleanText(row.owner?.displayName),
    authorHref: row.owner ? getOwnerProfileHref(row.owner) : null,
    logoUrl: row.owner?.avatarUrl ?? null,
    year: row.year ?? null,
    yearHref: row.year ? `/projects?year_min=${row.year}&year_max=${row.year}` : null,
    relatedCount: counts.badge?.related ?? 0,
    ownerCount: counts.badge?.owners ?? 0,
    creditCount: counts.credits ?? 0,
    initialSaved,
  };
}

/**
 * A raw product `listings` row (plus its resolved taxonomy and owner) → card
 * model, with EXACTLY the fields productToCardModel derives from a
 * ProductCanonical.
 *
 * It lives here, immediately below that function, on purpose: the product
 * detail rails do not go through the canonical normalisers, and giving them
 * their own mapper somewhere else is precisely how the card families drifted
 * apart before. Side by side, a change to one is visibly a change the other
 * needs.
 */
export function productRowToCardModel(
  row: {
    id: string;
    slug: string | null;
    title: string | null;
    cover: string | null;
    product_category: string | null;
    taxonomy_label: string | null;
    taxonomy_slug_path: string | null;
    owner: { displayName: string; avatarUrl?: string | null; profileId?: string | null; username?: string | null } | null;
  },
  counts: CardCounts = {},
  initialSaved = false
): ListingCardModel {
  return {
    id: row.id,
    type: "product",
    title: cleanText(row.title) ?? "Untitled product",
    href: getListingUrl({
      id: row.id,
      type: "product",
      slug: row.slug,
      taxonomySlugPath: row.taxonomy_slug_path,
    }),
    imageUrl: row.cover,
    categoryLabel: cleanText(row.taxonomy_label),
    categoryHref: rootArchiveUrl("product", row.taxonomy_slug_path),
    metaLabel: cleanText(row.product_category),
    metaHref: null,
    authorName: cleanText(row.owner?.displayName),
    authorHref: row.owner ? getOwnerProfileHref(row.owner) : null,
    logoUrl: row.owner?.avatarUrl ?? null,
    relatedCount: counts.badge?.related ?? 0,
    ownerCount: counts.badge?.owners ?? 0,
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
      isProject && city ? `/projects?city=${encodeURIComponent(city)}` : null,
    authorName: cleanText(options.authorName),
    authorHref: null,
    logoUrl: null,
    year: isProject ? listing.year ?? null : null,
    yearHref: isProject && listing.year ? `/projects?year_min=${listing.year}&year_max=${listing.year}` : null,
    relatedCount: options.counts?.badge?.related ?? 0,
    ownerCount: options.counts?.badge?.owners ?? 0,
    creditCount: isProject ? options.counts?.credits ?? 0 : 0,
    initialSaved: options.initialSaved ?? false,
  };
}
