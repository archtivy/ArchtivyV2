import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl } from "@/lib/canonical";
import { batchResolveTaxonomySlugPaths } from "@/lib/taxonomy/resolve";
import { ExploreMapView, type MapPin } from "@/components/explore/ExploreMapView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explore — Architecture Map | Archtivy",
  description:
    "Explore architecture projects, designers, and brands around the world on an interactive map. Discover built work by location on Archtivy.",
  alternates: { canonical: "/explore" },
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function safeCoord(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isNaN(n) ? null : n;
}

function loc(city: unknown, country: unknown): string {
  return [city, country].filter(Boolean).join(", ");
}

/** Deterministic daily pick from the top-viewed projects. */
function pickSpotlight(projectPins: MapPin[]): MapPin | null {
  if (projectPins.length === 0) return null;
  const pool = projectPins.slice(0, Math.min(50, projectPins.length));
  const d = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return pool[Math.abs(h) % pool.length];
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; focus?: string }>;
}) {
  const { type: focusType, focus: focusSlug } = await searchParams;
  const headersList = await headers();
  const geoLat = safeCoord(headersList.get("x-vercel-ip-latitude"));
  const geoLng = safeCoord(headersList.get("x-vercel-ip-longitude"));
  const initialCenter =
    geoLat != null && geoLng != null ? { lat: geoLat, lng: geoLng } : null;

  const supabase = getSupabaseServiceClient();

  const [projectsRes, profilesRes] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, slug, owner_profile_id, location_lat, location_lng, location_city, location_country, cover_image_url, year, category, created_at, profiles!listings_owner_profile_id_fkey(display_name)",
      )
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .not("location_lat", "is", null)
      .not("location_lng", "is", null)
      .order("views_count", { ascending: false })
      .limit(2000),
    supabase
      .from("profiles")
      .select(
        "id, role, display_name, username, location_lat, location_lng, location_city, location_country, avatar_url, designer_discipline, brand_type",
      )
      .eq("is_hidden", false)
      .eq("location_visibility", "public")
      .not("location_lat", "is", null)
      .not("location_lng", "is", null)
      .not("username", "is", null)
      .in("role", ["designer", "brand"])
      .limit(2000),
  ]);

  // Batch resolve taxonomy paths for canonical URLs
  const projectRows = projectsRes.data ?? [];
  const projectIds = projectRows.map((r) => r.id);
  const taxMap = projectIds.length > 0 ? await batchResolveTaxonomySlugPaths(projectIds) : new Map<string, string>();

  const pins: MapPin[] = [];
  const projectPins: MapPin[] = [];

  for (const r of projectRows) {
    const lat = safeCoord(r.location_lat);
    const lng = safeCoord(r.location_lng);
    if (lat == null || lng == null) continue;
    const ownerProfile = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as { display_name: string | null } | null;
    const pin: MapPin = {
      id: `project-${r.id}`,
      type: "project",
      title: (r.title as string) ?? "Untitled",
      locationLabel: loc(r.location_city, r.location_country),
      lat,
      lng,
      href: getListingUrl({ id: r.id, type: "project", slug: (r.slug as string) ?? null, taxonomy_slug_path: taxMap.get(r.id) ?? null }),
      imageUrl: (r.cover_image_url as string | null) ?? null,
      subtitle: (r.category as string | null) ?? null,
      year: (r.year as string | null) ?? null,
      createdAt: (r.created_at as string | null) ?? null,
      category: (r.category as string | null) ?? null,
      ownerName: ownerProfile?.display_name ?? null,
      ownerProfileId: (r.owner_profile_id as string | null) ?? null,
      entityId: r.id,
    };
    pins.push(pin);
    projectPins.push(pin);
  }

  for (const r of profilesRes.data ?? []) {
    const lat = safeCoord(r.location_lat);
    const lng = safeCoord(r.location_lng);
    if (lat == null || lng == null) continue;
    const role = r.role as "designer" | "brand";
    pins.push({
      id: `${role}-${r.id}`,
      type: role,
      title: (r.display_name as string) ?? "Unnamed",
      locationLabel: loc(r.location_city, r.location_country),
      lat,
      lng,
      href: `/u/${encodeURIComponent(r.username as string)}`,
      imageUrl: (r.avatar_url as string | null) ?? null,
      subtitle:
        role === "designer"
          ? ((r.designer_discipline as string | null) ?? null)
          : ((r.brand_type as string | null) ?? null),
      year: null,
      createdAt: null,
      category:
        role === "designer"
          ? ((r.designer_discipline as string | null) ?? null)
          : ((r.brand_type as string | null) ?? null),
      ownerName: null,
      ownerProfileId: r.id,
      entityId: r.id,
    });
  }

  /* Spotlight & recent */
  const spotlight = pickSpotlight(projectPins);

  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const recentPins = projectPins
    .filter((p) => p.createdAt && now - new Date(p.createdAt).getTime() < SEVEN_DAYS)
    .sort(
      (a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="absolute inset-0">
      <ExploreMapView
        pins={pins}
        initialCenter={initialCenter}
        spotlight={spotlight}
        recentPins={recentPins}
        focusType={focusType ?? null}
        focusSlug={focusSlug ?? null}
      />
      {pins.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg bg-white/90 px-6 py-4 text-center shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-zinc-700">
              No locations yet
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Projects, brands, and designers will appear here once they have
              coordinates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
