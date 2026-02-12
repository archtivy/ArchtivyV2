import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * GET /api/profiles/suggest?q=...
 * Returns profiles matching display_name or username (for team member autocomplete).
 * Excludes hidden profiles; includes designer and brand roles.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ profiles: [] });
  }

  const sup = getSupabaseServiceClient();
  const escaped = q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const pattern = `%${escaped}%`;

  const { data, error } = await sup
    .from("profiles")
    .select("id, display_name, username")
    .eq("is_hidden", false)
    .in("role", ["designer", "brand"])
    .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
    .order("display_name", { ascending: true })
    .limit(15);

  if (error) {
    return Response.json({ profiles: [] });
  }

  const profiles = (data ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => ({
    id: p.id,
    display_name: p.display_name?.trim() ?? null,
    username: p.username?.trim() ?? null,
  }));

  return Response.json({ profiles });
}
