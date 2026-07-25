import { unstable_noStore } from "next/cache";
import { getListingUrl } from "@/lib/canonical";
import { sanitizeListingImageUrl } from "@/lib/db/listingImages";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { BrandUsed } from "@/lib/types/listings";

export type LiveNetworkPinRegion = "blue" | "amber" | "teal";

export type LiveNetworkCard = {
  listingId: string;
  type: "project" | "product";
  href: string;
  title: string;
  studioName: string | null;
  locationLine: string | null;
  imageUrl: string | null;
  creditedBrands: string[];
};

export type LiveNetworkPin = {
  id: string;
  label: string;
  lng: number;
  lat: number;
  region: LiveNetworkPinRegion;
  card: LiveNetworkCard;
};

export type LiveNetworkConnection = {
  from: string;
  to: string;
};

export type LiveNetworkData = {
  pins: LiveNetworkPin[];
  connections: LiveNetworkConnection[];
  countryCount: number;
  initialCard: LiveNetworkCard;
  initialPinId: string | null;
};

export const REGION_COLORS: Record<LiveNetworkPinRegion, string> = {
  blue: "#6b8cff",
  amber: "#e8a838",
  teal: "#2ec4a0",
};

type HubConfig = {
  id: string;
  label: string;
  lng: number;
  lat: number;
  region: LiveNetworkPinRegion;
  city?: string;
  countryPatterns?: string[];
};

const HUBS: HubConfig[] = [
  { id: "lisbon", label: "Lisbon", lng: -9.1393, lat: 38.7223, region: "blue", city: "Lisbon", countryPatterns: ["Portugal"] },
  { id: "copenhagen", label: "Copenhagen", lng: 12.5683, lat: 55.6761, region: "blue", city: "Copenhagen", countryPatterns: ["Denmark"] },
  {
    id: "hail",
    label: "Hail",
    lng: 41.6901,
    lat: 27.5219,
    region: "amber",
    city: "Hail",
    countryPatterns: ["Saudi Arabia", "Kingdom of Saudi Arabia"],
  },
  { id: "costa-rica", label: "Costa Rica", lng: -84.0907, lat: 9.9281, region: "teal", countryPatterns: ["Costa Rica"] },
  { id: "melbourne", label: "Melbourne", lng: 144.9633, lat: -37.8136, region: "teal", city: "Melbourne", countryPatterns: ["Australia"] },
  {
    id: "buenos-aires",
    label: "Buenos Aires",
    lng: -58.3816,
    lat: -34.6037,
    region: "teal",
    city: "Buenos Aires",
    countryPatterns: ["Argentina"],
  },
];

const PIN_CONNECTIONS: LiveNetworkConnection[] = [
  { from: "lisbon", to: "copenhagen" },
  { from: "copenhagen", to: "hail" },
  { from: "hail", to: "melbourne" },
  { from: "melbourne", to: "buenos-aires" },
  { from: "buenos-aires", to: "costa-rica" },
  { from: "costa-rica", to: "lisbon" },
  { from: "lisbon", to: "hail" },
  { from: "copenhagen", to: "melbourne" },
];

const LISTING_SELECT =
  "id, type, slug, title, cover_image_url, location_city, location_country, location_lat, location_lng, year, brands_used, owner_profile_id, profiles!listings_owner_profile_id_fkey(display_name, username, role)";

type ListingRow = {
  id: string;
  type: "project" | "product";
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  year: number | string | null;
  brands_used: BrandUsed[] | null;
  owner_profile_id: string | null;
  profiles?: { display_name: string | null; username: string | null; role?: string | null } | null;
};

function toCoord(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isNaN(n) ? null : n;
}

async function getTaxonomySlugPaths(listingIds: string[]): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("listing_taxonomy_node")
    .select("listing_id, taxonomy_node:taxonomy_nodes(slug_path)")
    .eq("is_primary", true)
    .in("listing_id", listingIds);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const id = r.listing_id as string | undefined;
    const node = r.taxonomy_node as { slug_path?: string } | { slug_path?: string }[] | null;
    const slugPath = Array.isArray(node) ? node[0]?.slug_path : node?.slug_path;
    if (id && slugPath) map.set(id, slugPath);
  }
  return map;
}

async function getDistinctCountryCount(): Promise<number> {
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("listings")
    .select("location_country")
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .not("location_country", "is", null);
  const set = new Set(
    (data ?? [])
      .map((r) => (r as { location_country: string | null }).location_country?.trim())
      .filter(Boolean)
  );
  return set.size;
}

export async function getCreditedBrandNames(
  listingId: string,
  type: "project" | "product",
  brandsUsed: BrandUsed[] | null
): Promise<string[]> {
  const names = new Set<string>();
  for (const b of brandsUsed ?? []) {
    const n = b.name?.trim();
    if (n) names.add(n);
  }

  if (type !== "project") return Array.from(names).slice(0, 12);

  const sup = getSupabaseServiceClient();
  const { data: links } = await sup
    .from("project_product_links")
    .select("product_id")
    .eq("project_id", listingId);
  const productIds = (links ?? []).map((r) => (r as { product_id: string }).product_id).filter(Boolean);
  if (productIds.length === 0) return Array.from(names).slice(0, 12);

  const { data: products } = await sup
    .from("listings")
    .select("id, title, owner_profile_id")
    .in("id", productIds)
    .eq("type", "product")
    .is("deleted_at", null);

  const profileIds = Array.from(
    new Set(
      (products ?? [])
        .map((p) => (p as { owner_profile_id: string | null }).owner_profile_id)
        .filter(Boolean) as string[]
    )
  );

  const profileNames = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await sup
      .from("profiles")
      .select("id, display_name, username, role")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; display_name: string | null; username: string | null; role: string | null };
      const label = row.display_name?.trim() || row.username?.trim();
      if (label) profileNames.set(row.id, label);
    }
  }

  for (const p of products ?? []) {
    const row = p as { title: string; owner_profile_id: string | null };
    const brandLabel = row.owner_profile_id ? profileNames.get(row.owner_profile_id) : null;
    if (brandLabel) names.add(brandLabel);
    else {
      const t = row.title?.trim();
      if (t) names.add(t);
    }
  }

  return Array.from(names).slice(0, 12);
}

function formatLocationLine(row: ListingRow): string | null {
  const city = row.location_city?.trim();
  const country = row.location_country?.trim();
  const loc = city && country ? `${city}, ${country}` : city || country || null;
  const year = row.year != null && String(row.year).trim() ? String(row.year) : null;
  if (loc && year) return `${loc} · ${year}`;
  return loc || year;
}

function studioFromRow(row: ListingRow): string | null {
  const p = row.profiles;
  if (!p) return null;
  return p.display_name?.trim() || p.username?.trim() || null;
}

async function rowToCard(row: ListingRow, taxMap: Map<string, string>): Promise<LiveNetworkCard | null> {
  const imageUrl = sanitizeListingImageUrl(row.cover_image_url);
  if (!imageUrl) return null;
  const slug = row.slug?.trim() || row.id;
  const type = row.type === "product" ? "product" : "project";
  const creditedBrands = await getCreditedBrandNames(row.id, type, row.brands_used);
  return {
    listingId: row.id,
    type,
    href: getListingUrl({
      id: row.id,
      type,
      slug,
      taxonomySlugPath: taxMap.get(row.id) ?? null,
    }),
    title: row.title?.trim() || (type === "project" ? "Project" : "Product"),
    studioName: studioFromRow(row),
    locationLine: formatLocationLine(row),
    imageUrl,
    creditedBrands,
  };
}

async function fetchHubListings(hub: HubConfig): Promise<ListingRow[]> {
  const sup = getSupabaseServiceClient();
  const rows: ListingRow[] = [];

  const merge = (data: unknown) => {
    for (const r of (data ?? []) as ListingRow[]) {
      if (!rows.some((x) => x.id === r.id)) rows.push(r);
    }
  };

  if (hub.city) {
    const { data } = await sup
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .not("cover_image_url", "is", null)
      .ilike("location_city", `%${hub.city}%`)
      .order("created_at", { ascending: false })
      .limit(30);
    merge(data);
  }

  for (const pattern of hub.countryPatterns ?? []) {
    const { data } = await sup
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .not("cover_image_url", "is", null)
      .ilike("location_country", `%${pattern}%`)
      .order("created_at", { ascending: false })
      .limit(30);
    merge(data);
  }

  return rows;
}

async function pickBestListing(rows: ListingRow[], hub: HubConfig): Promise<ListingRow | null> {
  if (rows.length === 0) return null;
  const sup = getSupabaseServiceClient();
  const projectIds = rows.filter((r) => r.type === "project").map((r) => r.id);
  const linked = new Set<string>();
  if (projectIds.length > 0) {
    const { data: links } = await sup
      .from("project_product_links")
      .select("project_id")
      .in("project_id", projectIds);
    for (const l of links ?? []) linked.add((l as { project_id: string }).project_id);
  }

  const score = (r: ListingRow) => {
    let s = 0;
    if (r.type === "project") s += 10;
    if (linked.has(r.id)) s += 20;
    if (toCoord(r.location_lat) != null && toCoord(r.location_lng) != null) s += 15;
    if (sanitizeListingImageUrl(r.cover_image_url)) s += 5;
    return s;
  };

  return [...rows].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function pinCoords(row: ListingRow | null, hub: HubConfig): { lng: number; lat: number } {
  const lat = row ? toCoord(row.location_lat) : null;
  const lng = row ? toCoord(row.location_lng) : null;
  if (lng != null && lat != null) return { lng, lat };
  return { lng: hub.lng, lat: hub.lat };
}

async function findListingForHub(hub: HubConfig): Promise<{ row: ListingRow; lng: number; lat: number } | null> {
  const rows = await fetchHubListings(hub);
  const row = await pickBestListing(rows, hub);
  if (!row) return null;
  const coords = pinCoords(row, hub);
  return { row, ...coords };
}

async function getDefaultConnectedListing(): Promise<ListingRow | null> {
  const sup = getSupabaseServiceClient();
  const { data: linkRows } = await sup
    .from("project_product_links")
    .select("project_id")
    .order("created_at", { ascending: false })
    .limit(200);
  const projectIds = Array.from(
    new Set((linkRows ?? []).map((r) => (r as { project_id: string }).project_id).filter(Boolean))
  );
  if (projectIds.length === 0) return null;

  const { data } = await sup
    .from("listings")
    .select(LISTING_SELECT)
    .in("id", projectIds)
    .eq("type", "project")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .not("cover_image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  return (data?.[0] as ListingRow | undefined) ?? null;
}

export async function getLiveNetworkData(): Promise<LiveNetworkData | null> {
  unstable_noStore();

  const [countryCount, hubResults] = await Promise.all([
    getDistinctCountryCount(),
    Promise.all(HUBS.map(async (hub) => ({ hub, result: await findListingForHub(hub) }))),
  ]);

  const listingIds: string[] = [];
  for (const { result } of hubResults) {
    if (result) listingIds.push(result.row.id);
  }

  const defaultRow = await getDefaultConnectedListing();
  if (defaultRow && !listingIds.includes(defaultRow.id)) listingIds.push(defaultRow.id);

  const taxMap = await getTaxonomySlugPaths(listingIds);
  const pins: LiveNetworkPin[] = [];

  for (const { hub, result } of hubResults) {
    if (!result) continue;
    const card = await rowToCard(result.row, taxMap);
    if (!card) continue;
    pins.push({
      id: hub.id,
      label: hub.label,
      lng: result.lng,
      lat: result.lat,
      region: hub.region,
      card,
    });
  }

  if (pins.length === 0) return null;

  let initialCard = pins[0].card;
  let initialPinId: string | null = pins[0].id;

  if (defaultRow) {
    const defaultCard = await rowToCard(defaultRow, taxMap);
    if (defaultCard) {
      initialCard = defaultCard;
      initialPinId = pins.find((p) => p.card.listingId === defaultRow.id)?.id ?? null;
    }
  } else {
    const withBrands = pins.find((p) => p.card.creditedBrands.length > 0);
    if (withBrands) {
      initialCard = withBrands.card;
      initialPinId = withBrands.id;
    }
  }

  const pinIds = new Set(pins.map((p) => p.id));
  const connections = PIN_CONNECTIONS.filter((c) => pinIds.has(c.from) && pinIds.has(c.to));

  return {
    pins,
    connections,
    countryCount,
    initialCard,
    initialPinId,
  };
}
