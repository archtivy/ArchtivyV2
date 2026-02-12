import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "project_brand_links";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface ProjectBrandLink {
  id: string;
  project_id: string;
  brand_profile_id: string;
  created_at: string;
}

/** Fetch brand profile ids linked to a project. */
export async function getProjectBrandIds(
  projectId: string
): Promise<DbResult<string[]>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("brand_profile_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: error.message };
  const ids = (data ?? []).map((r: { brand_profile_id: string }) => r.brand_profile_id).filter(Boolean);
  return { data: ids, error: null };
}

/** Replace all brand links for a project. Returns error or success. */
export async function setProjectBrands(
  projectId: string,
  brandProfileIds: string[]
): Promise<DbResult<void>> {
  const supabase = getSupabaseServiceClient();
  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .eq("project_id", projectId);

  if (deleteError) return { data: null, error: deleteError.message };

  const ids = [...new Set(brandProfileIds)].filter(Boolean);
  if (ids.length === 0) return { data: undefined, error: null };

  const rows = ids.map((brand_profile_id) => ({
    project_id: projectId,
    brand_profile_id,
  }));
  const { error: insertError } = await supabase.from(TABLE).insert(rows);
  if (insertError) return { data: null, error: insertError.message };
  return { data: undefined, error: null };
}

/** Search brand profiles (role=brand) by display_name or username. */
export async function searchBrandProfiles(
  q: string,
  limit: number = 20
): Promise<DbResult<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>> {
  const supabase = getSupabaseServiceClient();
  const term = typeof q === "string" ? q.trim() : "";
  let query = supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("role", "brand")
    .eq("is_hidden", false)
    .order("display_name");

  if (term.length > 0) {
    query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
  }
  const { data, error } = await query.limit(limit);
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[], error: null };
}
