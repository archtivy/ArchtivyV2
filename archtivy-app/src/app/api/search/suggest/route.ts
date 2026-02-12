import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type SuggestItemType = "title" | "material" | "brand" | "location";

export interface SuggestItem {
  type: SuggestItemType;
  label: string;
  value: string;
}

const MAX_TITLES = 4;
const MAX_MATERIALS = 2;
const MAX_BRANDS = 2;
const MAX_LOCATIONS = 2;
const LIMIT_PER_QUERY = 20;

function escapeIlike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * GET /api/search/suggest?type=projects|products&q=...
 * Returns normalized suggestions: { type, label, value }[].
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();
  if (!type || (type !== "projects" && type !== "products")) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!q || q.length < 2) {
    return Response.json({ items: [] as SuggestItem[] });
  }

  const sup = getSupabaseServiceClient();
  const pattern = `%${escapeIlike(q)}%`;
  const items: SuggestItem[] = [];

  if (type === "projects") {
    const [listingsRes, materialsRes, profilesRes, locationsRes] = await Promise.all([
      sup
        .from("listings")
        .select("id, title")
        .eq("type", "project")
        .is("deleted_at", null)
        .ilike("title", pattern)
        .limit(LIMIT_PER_QUERY),
      sup.from("materials").select("id, name, slug").or(`name.ilike.${pattern},slug.ilike.${pattern}`).limit(LIMIT_PER_QUERY),
      sup.from("profiles").select("id, display_name, username").eq("is_hidden", false).or(`display_name.ilike.${pattern},username.ilike.${pattern}`).limit(LIMIT_PER_QUERY),
      sup
        .from("listings")
        .select("location_city, location_country")
        .eq("type", "project")
        .is("deleted_at", null)
        .or(`location_city.ilike.${pattern},location_country.ilike.${pattern}`)
        .limit(LIMIT_PER_QUERY),
    ]);

    const titles = (listingsRes.data ?? []).slice(0, MAX_TITLES) as { id: string; title: string | null }[];
    for (const r of titles)
      if (r.title?.trim())
        items.push({ type: "title", label: r.title.trim(), value: r.title.trim() });

    const materials = (materialsRes.data ?? []).slice(0, MAX_MATERIALS) as { id: string; name: string; slug: string }[];
    const seenMat = new Set<string>();
    for (const m of materials) {
      const key = m.name?.trim()?.toLowerCase() ?? m.slug;
      if (key && !seenMat.has(key)) {
        seenMat.add(key);
        items.push({ type: "material", label: m.name ?? m.slug, value: m.slug });
      }
    }

    const profiles = (profilesRes.data ?? []).slice(0, MAX_BRANDS) as { id: string; display_name: string | null; username: string | null }[];
    for (const p of profiles) {
      const label = (p.display_name?.trim() || p.username?.trim() || p.id) as string;
      items.push({ type: "brand", label, value: label });
    }

    const locs = (locationsRes.data ?? []) as { location_city: string | null; location_country: string | null }[];
    const seenLoc = new Set<string>();
    for (const loc of locs.slice(0, MAX_LOCATIONS * 2)) {
      const parts = [loc.location_city?.trim(), loc.location_country?.trim()].filter(Boolean);
      const label = parts.join(", ");
      if (label && !seenLoc.has(label)) {
        seenLoc.add(label);
        items.push({ type: "location", label, value: label });
      }
    }
  } else {
    const [productsRes, materialsRes, profilesRes] = await Promise.all([
      sup.from("listings").select("id, title").eq("type", "product").is("deleted_at", null).ilike("title", pattern).limit(LIMIT_PER_QUERY),
      sup.from("materials").select("id, name, slug").or(`name.ilike.${pattern},slug.ilike.${pattern}`).limit(LIMIT_PER_QUERY),
      sup
        .from("profiles")
        .select("id, display_name, username")
        .eq("role", "brand")
        .eq("is_hidden", false)
        .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
        .limit(LIMIT_PER_QUERY),
    ]);

    const titles = (productsRes.data ?? []).slice(0, MAX_TITLES) as { id: string; title: string | null }[];
    for (const r of titles)
      if (r.title?.trim())
        items.push({ type: "title", label: r.title.trim(), value: r.title.trim() });

    const materials = (materialsRes.data ?? []).slice(0, MAX_MATERIALS) as { id: string; name: string; slug: string }[];
    const seenMat = new Set<string>();
    for (const m of materials) {
      const key = (m.name?.trim() ?? m.slug)?.toLowerCase();
      if (key && !seenMat.has(key)) {
        seenMat.add(key);
        items.push({ type: "material", label: m.name ?? m.slug, value: m.slug });
      }
    }

    const profiles = (profilesRes.data ?? []).slice(0, MAX_BRANDS) as { id: string; display_name: string | null; username: string | null }[];
    for (const p of profiles) {
      const label = (p.display_name?.trim() || p.username?.trim() || p.id) as string;
      items.push({ type: "brand", label, value: label });
    }
  }

  return Response.json({ items: items.slice(0, 8) });
}
