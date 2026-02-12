import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminCard } from "@/components/admin/AdminCard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export default async function AdminDashboardPage() {
  const supabase = getSupabaseServiceClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: projectsCount },
    { count: productsCount },
    { count: newUsers },
    { count: newListings },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("type", "project"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("type", "product"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
  ]);

  const stats = {
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    projectsCount: projectsCount ?? 0,
    productsCount: productsCount ?? 0,
    newUsers: newUsers ?? 0,
    newListings: newListings ?? 0,
  };

  const { data: latestRows } = await supabase
    .from("listings")
    .select("id, title, location, year, updated_at, owner_clerk_user_id")
    .eq("type", "project")
    .order("updated_at", { ascending: false })
    .limit(5);

  const clerkIds = (latestRows ?? [])
    .map((r) => (r as { owner_clerk_user_id?: string }).owner_clerk_user_id)
    .filter(Boolean) as string[];
  const { data: ownerProfiles } =
    clerkIds.length > 0
      ? await supabase.from("profiles").select("clerk_user_id, display_name, username").in("clerk_user_id", clerkIds)
      : { data: [] as { clerk_user_id: string; display_name: string | null; username: string | null }[] };
  const ownerByClerkId: Record<string, string> = {};
  for (const p of ownerProfiles ?? []) {
    ownerByClerkId[p.clerk_user_id] = (p.display_name || p.username || "—").trim();
  }

  return (
    <AdminPage
      title="Dashboard"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/projects/new"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Project
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard label="Total users" value={stats.totalUsers} hint={stats.newUsers > 0 ? `+${stats.newUsers} last 7 days` : undefined} />
        <AdminCard label="Total listings" value={stats.totalListings} hint={stats.newListings > 0 ? `+${stats.newListings} last 7 days` : undefined} />
        <AdminCard label="Projects" value={stats.projectsCount} />
        <AdminCard label="Products" value={stats.productsCount} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Latest projects</div>
            <div className="text-xs text-zinc-500">Recent content activity</div>
          </div>
          <Link
            href="/admin/listings?tab=projects"
            className="text-sm font-medium text-zinc-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(latestRows ?? []).map((r) => {
                const row = r as { id: string; title: string | null; location: string | null; year: number | null; updated_at: string; owner_clerk_user_id: string | null };
                const author = row.owner_clerk_user_id ? ownerByClerkId[row.owner_clerk_user_id] ?? "—" : "—";
                return (
                  <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${row.id}`} className="text-sm font-medium text-zinc-900 hover:underline">
                        {row.title || "—"}
                      </Link>
                      <div className="mt-0.5 text-xs text-zinc-500">{row.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.location ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.year ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{author}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
              {(!latestRows || latestRows.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No projects yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPage>
  );
}

