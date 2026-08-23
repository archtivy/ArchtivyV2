import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingImagesWithIds } from "@/lib/db/listingImages";
import {
  getListingMaterialNodeIds,
  getListingFacetValueIds,
  getListingTaxonomyNodes,
} from "@/lib/taxonomy/taxonomyDb";
import { getMaterialsByProductIds, getMaterialsByProjectIds } from "@/lib/db/materials";
import {
  normaliseMentionedProducts,
  mentionedProductIds,
  type MentionedProduct,
} from "@/lib/listings/mentionedProducts";
import type { UploadedGalleryItem } from "@/lib/storage/types";
import type { TeamMember } from "@/lib/types/listings";

/**
 * Loads a listing back into the shape the publish wizards accept, so editing
 * reuses the create form rather than a second, drifting one.
 *
 * ── WHY A DEDICATED LOADER ──────────────────────────────────────────────────
 * A listing's authored state is spread over six places: the `listings` row, the
 * `products` sidecar, `listing_images`, `listing_taxonomy_node` (primary node
 * AND material nodes, distinguished only by `is_primary`), `listing_facets`,
 * and the legacy `product_material_links` / `project_material_links` tables.
 * getListingById returns only the first of those, so an edit form built on it
 * would silently blank every relationship the author had set on save.
 *
 * Service client throughout: this runs behind an ownership check in the route,
 * and the anon role cannot see DRAFT rows — which are exactly the rows most
 * likely to be edited.
 */

/** Bucket public URLs look like …/storage/v1/object/public/gallery/<path>. */
const PUBLIC_URL_MARKER = "/storage/v1/object/public/gallery/";

/**
 * Recover the storage path from a public URL.
 *
 * listing_images stores only `image_url`, but UploadedGalleryItem carries a
 * `path` too. Returning "" would still satisfy parseGalleryJson (it requires
 * the key to be a string, not a non-empty one) — but the path is what any
 * future storage-side cleanup would need, so it is reconstructed where the URL
 * shape allows rather than discarded on every edit round-trip.
 */
function storagePathFromUrl(url: string): string {
  const i = url.indexOf(PUBLIC_URL_MARKER);
  if (i === -1) return "";
  return decodeURIComponent(url.slice(i + PUBLIC_URL_MARKER.length).split("?")[0]);
}

export interface ListingEditCommon {
  id: string;
  slug: string;
  status: string;
  title: string;
  description: string;
  metaDescription: string;
  website: string;
  instagram: string;
  videoUrl: string;
  images: UploadedGalleryItem[];
  /** Primary taxonomy node id, or "" when unclassified. */
  taxonomyNodeId: string;
  /** Material taxonomy node ids (domain = "material"). */
  taxonomyMaterialIds: string[];
  facetValueIds: string[];
  /** Legacy `materials` table ids, still written by both create actions. */
  materialIds: string[];
  ownerProfileId: string | null;
  ownerClerkUserId: string | null;
}

export interface ProjectEditData extends ListingEditCommon {
  type: "project";
  locationText: string;
  locationCity: string;
  locationCountry: string;
  locationLat: number | null;
  locationLng: number | null;
  category: string;
  year: string;
  areaSqft: number | null;
  materialOrFinish: string;
  teamMembers: TeamMember[];
  /** Linked product listing ids — what the wizard's Products picker binds to. */
  mentionedProducts: string[];
  /** Entries naming a product that is not on the platform. Preserved on save. */
  mentionedProductsFreeText: MentionedProduct[];
  projectStatus: string;
  projectCollaborationStatus: string;
  projectLookingFor: string[];
}

export interface ProductEditData extends ListingEditCommon {
  type: "product";
  colorOptions: string[];
  productType: string;
  productCategory: string;
  productSubcategory: string;
}

export type ListingEditData = ProjectEditData | ProductEditData;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

/**
 * Returns null when the listing does not exist or is soft-deleted. Ownership is
 * NOT checked here — callers must run canManageListing against the returned
 * ownerProfileId / ownerClerkUserId.
 */
export async function getListingForEdit(listingId: string): Promise<ListingEditData | null> {
  const supabase = getSupabaseServiceClient();

  const { data: row, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !row) return null;
  const listing = row as Record<string, unknown>;
  const type = str(listing.type) === "product" ? "product" : "project";

  const [imagesRes, materialNodesRes, facetsRes, taxonomyRes] = await Promise.all([
    getListingImagesWithIds(listingId),
    getListingMaterialNodeIds(listingId),
    getListingFacetValueIds(listingId),
    getListingTaxonomyNodes(listingId),
  ]);

  const images: UploadedGalleryItem[] = (imagesRes.data ?? []).map((img) => ({
    path: storagePathFromUrl(img.image_url),
    url: img.image_url,
    alt: img.alt ?? undefined,
    caption: img.caption ?? undefined,
  }));

  // getListingTaxonomyNodes returns primary and non-primary together; the
  // wizard's category picker wants the primary one only.
  const primaryNode = (taxonomyRes.data ?? []).find((n) => n.is_primary);

  const legacyMaterials =
    type === "product"
      ? (await getMaterialsByProductIds([listingId]))[listingId] ?? []
      : (await getMaterialsByProjectIds([listingId]))[listingId] ?? [];

  const common: ListingEditCommon = {
    id: listingId,
    slug: str(listing.slug),
    status: str(listing.status) || "APPROVED",
    title: str(listing.title),
    description: str(listing.description),
    metaDescription: str(listing.meta_description),
    website: str(listing.website),
    instagram: str(listing.instagram),
    videoUrl: str(listing.video_url),
    images,
    // getListingTaxonomyNodes returns the joined taxonomy_nodes row, so the
    // node's own `id` is the node id — there is no taxonomy_node_id key on it.
    taxonomyNodeId: primaryNode?.id ?? str(listing.taxonomy_node_id),
    taxonomyMaterialIds: materialNodesRes.data ?? [],
    facetValueIds: facetsRes.data ?? [],
    materialIds: legacyMaterials.map((m) => m.id),
    ownerProfileId: (listing.owner_profile_id as string | null) ?? null,
    ownerClerkUserId: (listing.owner_clerk_user_id as string | null) ?? null,
  };

  if (type === "product") {
    // color_options lives ONLY on the products sidecar — `listings` has no such
    // column, so reading it off the listings row would silently return [] and
    // the edit form would blank every colour on save.
    const { data: sidecar } = await supabase
      .from("products")
      .select("color_options")
      .eq("id", listingId)
      .maybeSingle();

    return {
      ...common,
      type: "product",
      colorOptions: strArray((sidecar as { color_options?: unknown } | null)?.color_options),
      productType: str(listing.product_type),
      productCategory: str(listing.product_category),
      productSubcategory: str(listing.product_subcategory),
    };
  }

  const areaRaw = listing.area_sqft;
  return {
    ...common,
    type: "project",
    locationText: str(listing.location_text) || str(listing.location),
    locationCity: str(listing.location_city),
    locationCountry: str(listing.location_country),
    locationLat: typeof listing.location_lat === "number" ? listing.location_lat : null,
    locationLng: typeof listing.location_lng === "number" ? listing.location_lng : null,
    category: str(listing.category) || str(listing.project_category),
    year: listing.year != null ? String(listing.year) : "",
    areaSqft: typeof areaRaw === "number" && areaRaw > 0 ? areaRaw : null,
    materialOrFinish: str(listing.material_or_finish),
    teamMembers: Array.isArray(listing.team_members)
      ? (listing.team_members as TeamMember[])
      : [],
    // The wizard's picker selects by product id, so this exposes the linked
    // ids only. It used to be strArray(), which ran String() over the stored
    // { brand_name_text, product_name_text } objects and produced the literal
    // "[object Object]" — showing an empty Products step, then overwriting the
    // real entries with that string on save.
    mentionedProducts: mentionedProductIds(
      normaliseMentionedProducts(listing.mentioned_products)
    ),
    // Free-text entries carry no product id and so cannot round-trip through
    // the picker. Passed through separately so an edit preserves them instead
    // of dropping them on save.
    mentionedProductsFreeText: normaliseMentionedProducts(
      listing.mentioned_products
    ).filter((m) => !m.product_id),
    projectStatus: str(listing.project_status),
    projectCollaborationStatus: str(listing.project_collaboration_status),
    projectLookingFor: strArray(listing.project_looking_for),
  };
}
