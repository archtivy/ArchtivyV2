import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";

const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

async function ensureAdmin(): Promise<
  { ok: true } | { ok: false; status: number; body: { error: string } }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401, body: { error: "Unauthorized" } };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, status: 403, body: { error: "Forbidden" } };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, status: 403, body: { error: "Forbidden" } };
  return { ok: true };
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
}

export async function GET(request: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin.ok) {
    return Response.json(admin.body, { status: admin.status });
  }

  const token = process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  if (!token) {
    return Response.json({ error: "Mapbox token not configured" }, { status: 500 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return Response.json({ suggestions: [] });
  }

  try {
    const url = `${GEOCODE_URL}/${encodeURIComponent(q.trim())}.json?access_token=${token}&autocomplete=true&limit=6&language=en&types=place,locality,neighborhood,address`;
    const res = await fetch(url);
    const data = await res.json();

    const features = (data.features ?? []) as MapboxFeature[];
    const suggestions = features.map((f) => {
      const [lng, lat] = f.center;
      let city: string | null = null;
      let country: string | null = null;
      for (const c of f.context ?? []) {
        if (c.id.startsWith("country.")) country = c.text;
        if (c.id.startsWith("place.") || c.id.startsWith("locality.")) city = c.text;
      }
      if (!city) city = f.text || null;
      return {
        id: f.id,
        place_name: f.place_name,
        center: [lng, lat] as [number, number],
        city,
        country,
      };
    });

    return Response.json({ suggestions });
  } catch (e) {
    console.error("[admin/mapbox/suggest]", e);
    return Response.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
