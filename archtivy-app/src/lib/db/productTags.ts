/**
 * Product Pinpoint Tagging repository.
 *
 * Schema per migrations-review/20260808_product_tags.sql:
 *   pins live on listing_images(id); the tagged product is a listings(id) row
 *   with type='product'; the actor is profiles(id).
 *
 * FAILS SOFT ON A MISSING TABLE. The migration is prepared but unapplied, so a
 * PostgREST "relation does not exist" is treated as "no pins yet" and the
 * management page renders an explanatory notice instead of a 500.
 *
 * AI CONFIDENCE IS NEVER A PROMOTION SIGNAL. Nothing in this file moves a tag
 * to `verified` or `official` based on ai_confidence — that transition only
 * happens through an explicit human action in app/actions/productTags.ts.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending_review",
  "verified",
  "official",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Statuses a visitor may see. Mirrors the RLS policy in the migration. */
export const PUBLIC_STATUSES: VerificationStatus[] = ["verified", "official"];

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending_review: "In review",
  verified: "Verified",
  official: "Official",
  rejected: "Rejected",
};

export interface ProductPin {
  id: string;
  listingImageId: string;
  taggedListingId: string;
  productTitle: string;
  productHref: string;
  productCover: string | null;
  brandName: string | null;
  xPercent: number;
  yPercent: number;
  tagSource: "owner" | "ai";
  verificationStatus: VerificationStatus;
  aiConfidence: number | null;
  createdAt: string;
}

export interface ManagedImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  pins: ProductPin[];
}

export interface ManagedListing {
  id: string;
  title: string;
  type: "project" | "product";
  slug: string | null;
  status: string;
  publicHref: string | null;
  ownerProfileId: string | null;
  images: ManagedImage[];
  /** False when the product_tags migration has not been applied yet. */
  tagsTableReady: boolean;
}

const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

function isMissingTable(code: string | undefined): boolean {
  return Boolean(code && MISSING_TABLE.has(code));
}

/**
 * Loads a listing the caller owns, with its gallery and every pin on it —
 * including unverified ones, because this is the owner's own management view.
 * Returns null when the listing does not exist OR the profile does not own it;
 * the caller cannot distinguish the two, which is deliberate.
 */
export async function getManagedListing(
  listingId: string,
  ownerProfileId: string,
  isAdmin = false
): Promise<ManagedListing | null> {
  const sup = getSupabaseServiceClient();

  const { data: listing, error } = await sup
    .from("listings")
    .select("id, title, type, slug, status, owner_profile_id, deleted_at")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) return null;

  const row = listing as {
    id: string;
    title: string;
    type: string;
    slug: string | null;
    status: string;
    owner_profile_id: string | null;
    deleted_at: string | null;
  };
  if (row.deleted_at) return null;
  if (!isAdmin && row.owner_profile_id !== ownerProfileId) return null;

  const { data: imageRows } = await sup
    .from("listing_images")
    .select("id, image_url, alt, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  const images = (imageRows ?? []) as {
    id: string;
    image_url: string;
    alt: string | null;
    sort_order: number | null;
  }[];

  // ── Pins ─────────────────────────────────────────────────────────────────
  let pinsByImage = new Map<string, ProductPin[]>();
  let tagsTableReady = true;

  if (images.length > 0) {
    const { data: tagRows, error: tagErr } = await sup
      .from("product_tags")
      .select(
        "id, listing_image_id, tagged_listing_id, x_percent, y_percent, tag_source, verification_status, ai_confidence, created_at"
      )
      .in(
        "listing_image_id",
        images.map((i) => i.id)
      );

    if (tagErr) {
      if (!isMissingTable(tagErr.code)) {
        console.error("[productTags] read failed:", tagErr.code, tagErr.message);
      }
      tagsTableReady = false;
    } else {
      const tags = (tagRows ?? []) as {
        id: string;
        listing_image_id: string;
        tagged_listing_id: string;
        x_percent: string | number;
        y_percent: string | number;
        tag_source: string;
        verification_status: string;
        ai_confidence: string | number | null;
        created_at: string;
      }[];

      // Hydrate the tagged products in one round trip, not per pin.
      const productIds = [...new Set(tags.map((t) => t.tagged_listing_id))];
      const products = new Map<
        string,
        { title: string; slug: string | null; cover: string | null; owner: string | null }
      >();
      const owners = new Map<string, string>();

      if (productIds.length > 0) {
        const { data: prodRows } = await sup
          .from("listings")
          .select("id, title, slug, cover_image_url, owner_profile_id")
          .in("id", productIds);

        const prods = (prodRows ?? []) as {
          id: string;
          title: string;
          slug: string | null;
          cover_image_url: string | null;
          owner_profile_id: string | null;
        }[];

        const ownerIds = [
          ...new Set(prods.map((p) => p.owner_profile_id).filter((v): v is string => Boolean(v))),
        ];
        if (ownerIds.length > 0) {
          const { data: profileRows } = await sup
            .from("profiles")
            .select("id, display_name")
            .in("id", ownerIds);
          for (const p of (profileRows ?? []) as { id: string; display_name: string | null }[]) {
            if (p.display_name) owners.set(p.id, p.display_name);
          }
        }

        for (const p of prods) {
          products.set(p.id, {
            title: p.title,
            slug: p.slug,
            cover: p.cover_image_url,
            owner: p.owner_profile_id,
          });
        }
      }

      pinsByImage = new Map();
      for (const t of tags) {
        const p = products.get(t.tagged_listing_id);
        const pin: ProductPin = {
          id: t.id,
          listingImageId: t.listing_image_id,
          taggedListingId: t.tagged_listing_id,
          productTitle: p?.title ?? "Unknown product",
          productHref: `/products/${p?.slug ?? t.tagged_listing_id}`,
          productCover: p?.cover ?? null,
          brandName: p?.owner ? owners.get(p.owner) ?? null : null,
          xPercent: Number(t.x_percent),
          yPercent: Number(t.y_percent),
          tagSource: t.tag_source === "owner" ? "owner" : "ai",
          verificationStatus: (VERIFICATION_STATUSES as readonly string[]).includes(
            t.verification_status
          )
            ? (t.verification_status as VerificationStatus)
            : "unverified",
          aiConfidence: t.ai_confidence == null ? null : Number(t.ai_confidence),
          createdAt: t.created_at,
        };
        pinsByImage.set(t.listing_image_id, [...(pinsByImage.get(t.listing_image_id) ?? []), pin]);
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    type: row.type === "product" ? "product" : "project",
    slug: row.slug,
    status: row.status,
    publicHref: row.slug ? `/${row.type === "product" ? "products" : "projects"}/${row.slug}` : null,
    ownerProfileId: row.owner_profile_id,
    tagsTableReady,
    images: images.map((i) => ({
      id: i.id,
      url: i.image_url,
      alt: i.alt,
      sortOrder: i.sort_order ?? 0,
      pins: pinsByImage.get(i.id) ?? [],
    })),
  };
}

export interface TaggableProduct {
  id: string;
  title: string;
  brandName: string | null;
  cover: string | null;
}

/**
 * Products that can be pinned: every approved product listing.
 *
 * Ships the whole set (76 today) to the client for local filtering, matching
 * the directory pages' approach. Becomes a search action if the catalogue grows
 * past a few thousand.
 */
export async function getTaggableProducts(): Promise<TaggableProduct[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, title, cover_image_url, owner_profile_id")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("title");

  if (error) {
    console.error("[productTags] taggable products failed:", error.message);
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
  const owners = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profileRows } = await sup
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds);
    for (const p of (profileRows ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) owners.set(p.id, p.display_name);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    brandName: r.owner_profile_id ? owners.get(r.owner_profile_id) ?? null : null,
    cover: r.cover_image_url,
  }));
}
