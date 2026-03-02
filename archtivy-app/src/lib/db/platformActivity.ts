import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const supabase = () => getSupabaseServiceClient();

export interface PlatformActivityItem {
  text: string;
}

export interface PlatformStats {
  projectsThisWeek: number;
  productsThisWeek: number;
  professionalsCount: number;
  countriesCount: number; // distinct countries from approved projects (used on projects page only)
}

/**
 * Returns recent activity items for the rotating activity line.
 * Prioritized order: project publishing > platform connection signal > new professionals.
 */
export async function getPlatformActivityFeed(): Promise<PlatformActivityItem[]> {
  const sup = supabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [projectsRes, profilesRes, connectionsRes] = await Promise.all([
    sup
      .from("listings")
      .select("title, location_city, location_country, project_category")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(7),
    sup
      .from("profiles")
      .select("display_name, location_city, location_country, role")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(3),
    sup
      .from("project_product_links")
      .select("project_id", { count: "exact", head: true }),
  ]);

  const items: PlatformActivityItem[] = [];

  const projects = (projectsRes.data ?? []) as {
    title: string | null;
    location_city: string | null;
    location_country: string | null;
    project_category: string | null;
  }[];

  const profiles = (profilesRes.data ?? []) as {
    display_name: string | null;
    location_city: string | null;
    location_country: string | null;
    role: string | null;
  }[];

  const totalConnections = connectionsRes.count ?? 0;

  // Project activity — prefer category-based descriptions
  for (const p of projects) {
    const loc = [p.location_city, p.location_country].filter(Boolean).join(", ");
    const category = p.project_category?.trim().toLowerCase();
    const title = p.title?.trim();

    if (category && loc) {
      items.push({ text: `A ${category} project was published in ${loc}` });
    } else if (title && loc) {
      items.push({ text: `"${title}" was added in ${loc}` });
    } else if (category) {
      items.push({ text: `A new ${category} project was published` });
    } else if (title) {
      items.push({ text: `New project: "${title}"` });
    }
  }

  // Platform connection signal — only show if there are connections
  if (totalConnections > 0) {
    items.push({
      text: `${totalConnections} product–project connections documented on Archtivy`,
    });
  }

  // New professionals — lower frequency, at end
  for (const p of profiles) {
    const name = p.display_name?.trim();
    const city = p.location_city?.trim();
    const roleLabel = p.role === "brand" ? "brand" : "designer";

    if (name && city) {
      items.push({ text: `${name} joined from ${city}` });
    } else if (city) {
      items.push({ text: `A ${roleLabel} from ${city} joined the network` });
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

  const [weekProjectsRes, weekProductsRes, professionalsRes, countriesRes] = await Promise.all([
    sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .gte("created_at", sevenDaysAgo),
    sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("type", "product")
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
  const productsThisWeek = weekProductsRes.count ?? 0;
  const professionalsCount = professionalsRes.count ?? 0;

  // Manually compute distinct countries (Supabase JS doesn't support SELECT DISTINCT COUNT)
  const countryRows = (countriesRes.data ?? []) as { location_country: string | null }[];
  const uniqueCountries = new Set(countryRows.map((r) => r.location_country).filter(Boolean));
  const countriesCount = uniqueCountries.size;

  return { projectsThisWeek, productsThisWeek, professionalsCount, countriesCount };
}
