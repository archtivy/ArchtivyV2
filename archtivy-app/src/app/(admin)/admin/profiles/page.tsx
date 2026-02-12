import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminProfilesTable } from "@/components/admin/AdminProfilesTable";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

function profileTypeLabel(p: any): string {
  if (p.role === "brand") return "Brand";
  const d = toText(p.designer_discipline).toLowerCase();
  if (d === "studio") return "Studio";
  if (d === "photographer") return "Photographer";
  return "Designer";
}

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = getSupabaseServiceClient();
  const q = toText(searchParams.q);
  const role = toText(searchParams.role);

  let query = supabase
    .from("profiles")
    .select("id,clerk_user_id,role,display_name,username,location_city,location_country,designer_discipline,brand_type,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  if (role) query = query.eq("role", role);
  // Exclude soft-deleted profiles (requires profiles.deleted_at; see docs/profiles-deleted-at-migration.sql)
  query = query.is("deleted_at", null);

  const { data: profiles, error } = await query;
  if (error) {
    return (
      <AdminPage title="Profiles">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const clerkIds = (profiles ?? []).map((p) => p.clerk_user_id as string).filter(Boolean);
  const { data: ownedListings } = await supabase
    .from("listings")
    .select("owner_clerk_user_id, type")
    .in("owner_clerk_user_id", clerkIds);

  const counts: Record<string, { projects: number; products: number }> = {};
  for (const row of (ownedListings ?? []) as Array<{ owner_clerk_user_id: string; type: string }>) {
    const key = row.owner_clerk_user_id;
    counts[key] = counts[key] ?? { projects: 0, products: 0 };
    if (row.type === "project") counts[key].projects += 1;
    if (row.type === "product") counts[key].products += 1;
  }

  const rows = (profiles ?? []).map((p: any) => {
    const name = toText(p.display_name) || toText(p.username) || "—";
    const city = toText(p.location_city);
    const country = toText(p.location_country);
    const location = [city, country].filter(Boolean).join(", ") || "—";
    const createdBy =
      toText(p.clerk_user_id).startsWith("archtivy_internal_") ? ("Archtivy" as const) : ("User" as const);
    const c = counts[p.clerk_user_id] ?? { projects: 0, products: 0 };
    const status = p.username ? ("Live" as const) : ("Draft" as const);
    return {
      id: p.id as string,
      name,
      typeLabel: profileTypeLabel(p),
      location,
      createdBy,
      projectsCount: c.projects,
      productsCount: c.products,
      status,
      username: (p.username as string | null) ?? null,
    };
  });

  return (
    <AdminPage
      title="Profiles"
      actions={
        <Link
          href="/admin/profiles/new"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Create Profile
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or username…"
            className="h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <select
            name="role"
            defaultValue={role}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          >
            <option value="">All roles</option>
            <option value="designer">Designer</option>
            <option value="brand">Brand</option>
            <option value="reader">Reader</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Apply
          </button>
        </form>
      </div>

      <AdminProfilesTable rows={rows} />
    </AdminPage>
  );
}

