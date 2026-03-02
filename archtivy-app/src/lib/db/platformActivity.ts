import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const supabase = () => getSupabaseServiceClient();

export interface PlatformActivityItem {
  text: string;
}

export interface PlatformStats {
  projectsThisWeek: number;
  professionalsCount: number;
  countriesCount: number;
}

/**
 * Returns recent activity items for the live ticker strip.
 * Pulls recent approved projects and new profiles from the last 7 days.
 */
export async function getPlatformActivityFeed(): Promise<PlatformActivityItem[]> {
  const sup = supabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [projectsRes, profilesRes] = await Promise.all([
    sup
      .from("listings")
      .select("title, location_city, location_country")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(6),
    sup
      .from("profiles")
      .select("display_name, location_city, location_country")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const items: PlatformActivityItem[] = [];

  const projects = (projectsRes.data ?? []) as {
    title: string | null;
    location_city: string | null;
    location_country: string | null;
  }[];

  const profiles = (profilesRes.data ?? []) as {
    display_name: string | null;
    location_city: string | null;
    location_country: string | null;
  }[];

  for (const p of projects) {
    const loc = [p.location_city, p.location_country].filter(Boolean).join(", ");
    const title = p.title?.trim();
    if (title && loc) {
      items.push({ text: `New project: "${title}" — ${loc}` });
    } else if (title) {
      items.push({ text: `New project: "${title}"` });
    } else if (loc) {
      items.push({ text: `New project added in ${loc}` });
    }
  }

  for (const p of profiles) {
    const name = p.display_name?.trim();
    const city = p.location_city?.trim();
    if (name && city) {
      items.push({ text: `${name} joined from ${city}` });
    } else if (name) {
      items.push({ text: `${name} joined the network` });
    }
  }

  return items;
}

/**
 * Returns aggregate platform stats for the explore header micro-activity line.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const sup = supabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [weekProjectsRes, professionalsRes, countriesRes] = await Promise.all([
    sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .gte("created_at", sevenDaysAgo),
    sup
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    sup
      .from("listings")
      .select("location_country")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .not("location_country", "is", null),
  ]);

  const projectsThisWeek = weekProjectsRes.count ?? 0;
  const professionalsCount = professionalsRes.count ?? 0;

  // Manually compute distinct countries (Supabase JS doesn't support SELECT DISTINCT COUNT)
  const countryRows = (countriesRes.data ?? []) as { location_country: string | null }[];
  const uniqueCountries = new Set(countryRows.map((r) => r.location_country).filter(Boolean));
  const countriesCount = uniqueCountries.size;

  return { projectsThisWeek, professionalsCount, countriesCount };
}
