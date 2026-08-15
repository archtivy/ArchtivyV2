import Link from "next/link";
import {
  AdminPageShell,
  Toolbar,
  SearchField,
  SelectField,
  ErrorPanel,
} from "@/components/admin/ui/AdminPageShell";
import { AdminProfilesTable } from "@/components/admin/AdminProfilesTable";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/ui/tokens";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

function profileTypeLabel(p: {
  role?: string | null;
  designer_discipline?: string | null;
}): string {
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
  const hasFilters = !!(q || role);

  let query = supabase
    .from("profiles")
    .select(
      "id,clerk_user_id,role,display_name,username,location_city,location_country,designer_discipline,brand_type,updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  if (role) query = query.eq("role", role);
  query = query.is("deleted_at", null);

  const { data: profiles, error } = await query;
  if (error) {
    return (
      <AdminPageShell title="Profiles">
        <ErrorPanel message={error.message} />
      </AdminPageShell>
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

  const rows = (profiles ?? []).map((p) => {
    const row = p as {
      id: string;
      clerk_user_id: string;
      role: string | null;
      display_name: string | null;
      username: string | null;
      location_city: string | null;
      location_country: string | null;
      designer_discipline: string | null;
    };
    const name = toText(row.display_name) || toText(row.username) || "Unnamed";
    const location =
      [toText(row.location_city), toText(row.location_country)].filter(Boolean).join(", ") || "—";
    const createdBy = toText(row.clerk_user_id).startsWith("archtivy_internal_")
      ? ("Archtivy" as const)
      : ("User" as const);
    const c = counts[row.clerk_user_id] ?? { projects: 0, products: 0 };
    return {
      id: row.id,
      name,
      typeLabel: profileTypeLabel(row),
      location,
      createdBy,
      projectsCount: c.projects,
      productsCount: c.products,
      status: row.username ? ("Live" as const) : ("Draft" as const),
      username: row.username ?? null,
    };
  });

  return (
    <AdminPageShell
      title="Profiles"
      description="Designers, studios and brands on the platform."
      actions={
        <Link href="/admin/profiles/new" className={BTN_PRIMARY}>
          Create profile
        </Link>
      }
      toolbar={
        <form className="contents">
          <Toolbar>
            <SearchField name="q" defaultValue={q} placeholder="Search name or username…" />
            <SelectField
              name="role"
              defaultValue={role}
              options={[
                { value: "", label: "All roles" },
                { value: "designer", label: "Designer" },
                { value: "brand", label: "Brand" },
                { value: "reader", label: "Reader" },
              ]}
            />
            <button type="submit" className={BTN_SECONDARY}>
              Apply
            </button>
            {hasFilters && (
              <Link href="/admin/profiles" className={BTN_SECONDARY}>
                Clear
              </Link>
            )}
          </Toolbar>
        </form>
      }
    >
      <AdminProfilesTable rows={rows} filtered={hasFilters} />
    </AdminPageShell>
  );
}
