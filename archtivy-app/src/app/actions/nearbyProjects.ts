"use server";

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfilesByClerkIds } from "@/lib/db/profiles";

const LIMIT = 6;

export type NearbyProjectCard = {
  id: string;
  slug: string | null;
  title: string;
  coverImageUrl: string | null;
  ownerName: string;
  city: string | null;
  country: string | null;
  year: number | null;
  category: string | null;
  areaSqft: number | null;
};

/**
 * Fetch 4–6 projects near this location for lightbox sidebar.
 * Priority: same city → same country → fallback by created_at.
 */
export async function getNearbyProjects(
  excludeListingId: string,
  city: string | null,
  country: string | null
): Promise<NearbyProjectCard[]> {
  const sup = getSupabaseServiceClient();
  const select =
    "id, slug, title, cover_image_url, owner_clerk_user_id, location_city, location_country, year, category, area_sqft";
  const base = () =>
    sup
      .from("listings")
      .select(select)
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .neq("id", excludeListingId);

  const ids: string[] = [];
  const cityTrim = city?.trim();
  const countryTrim = country?.trim();

  if (cityTrim) {
    const { data } = await base().eq("location_city", cityTrim).limit(LIMIT);
    for (const r of data ?? []) ids.push((r as { id: string }).id);
  }
  if (ids.length < LIMIT && countryTrim) {
    const { data } = await base().eq("location_country", countryTrim).limit(LIMIT * 2);
    const fromCountry = (data ?? []) as { id: string }[];
    for (const r of fromCountry) {
      if (!ids.includes(r.id)) ids.push(r.id);
      if (ids.length >= LIMIT) break;
    }
  }
  if (ids.length < LIMIT) {
    const { data } = await sup
      .from("listings")
      .select(select)
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(LIMIT * 2);
    const fallback = (data ?? []) as { id: string }[];
    for (const r of fallback) {
      if (r.id === excludeListingId) continue;
      if (!ids.includes(r.id)) ids.push(r.id);
      if (ids.length >= LIMIT) break;
    }
  }

  const uniq = Array.from(new Set(ids)).slice(0, LIMIT);
  if (uniq.length === 0) return [];

  const { data: rows, error } = await sup
    .from("listings")
    .select(select)
    .in("id", uniq);
  if (error || !rows?.length) return [];

  const clerkIds = Array.from(
    new Set(
      (rows as { owner_clerk_user_id?: string | null }[])
        .map((r) => r.owner_clerk_user_id)
        .filter(Boolean) as string[]
    )
  );
  const { data: profiles } = await getProfilesByClerkIds(clerkIds);
  const nameByClerk: Record<string, string> = {};
  for (const p of profiles ?? []) {
    const name =
      (p.display_name && p.display_name.trim()) ||
      (p.username && p.username.trim()) ||
      "Studio";
    nameByClerk[p.clerk_user_id] = name;
  }

  const result: NearbyProjectCard[] = [];
  for (const r of rows as RawRow[]) {
    result.push({
      id: r.id,
      slug: r.slug ?? null,
      title: r.title ?? "",
      coverImageUrl: r.cover_image_url ?? null,
      ownerName: (r.owner_clerk_user_id && nameByClerk[r.owner_clerk_user_id]) || "Studio",
      city: r.location_city?.trim() ?? null,
      country: r.location_country?.trim() ?? null,
      year: r.year != null && !Number.isNaN(r.year) ? r.year : null,
      category: r.category?.trim() ?? null,
      areaSqft: r.area_sqft != null && !Number.isNaN(r.area_sqft) ? r.area_sqft : null,
    });
  }
  return result;
}

type RawRow = {
  id: string;
  slug: string | null;
  title: string | null;
  cover_image_url: string | null;
  owner_clerk_user_id: string | null;
  location_city: string | null;
  location_country: string | null;
  year: number | null;
  category: string | null;
  area_sqft: number | null;
};
