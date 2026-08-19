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

  // avatar_url and role are selected so the picker can show who it is at a
  // glance. Without them every suggestion looked identical, which matters most
  // where two profiles share a display name — exactly the case a credit is
  // most likely to attach to the wrong one.
  //
  // deleted_at IS NULL matters more than it looks: `Faulkner Architects` exists
  // twice, and the SOFT-DELETED row is the one that owns 7 projects
  // (DATA_INTEGRITY_LOG item 2). Suggesting it would let new credits accumulate
  // on a row the rest of the app treats as gone.
  const { data, error } = await sup
    .from("profiles")
    .select("id, display_name, username, avatar_url, role")
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .in("role", ["designer", "brand"])
    .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
    // Claimed, named profiles first: a real studio should outrank the unclaimed
    // shell that a previous free-text credit created for the same name.
    .order("username", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true })
    .limit(15);

  if (error) {
    return Response.json({ profiles: [] });
  }

  const profiles = (data ?? []).map(
    (p: {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      role: string | null;
    }) => ({
      id: p.id,
      display_name: p.display_name?.trim() ?? null,
      username: p.username?.trim() ?? null,
      avatar_url: p.avatar_url?.trim() || null,
      role: p.role ?? null,
    })
  );

  return Response.json({ profiles });
}
