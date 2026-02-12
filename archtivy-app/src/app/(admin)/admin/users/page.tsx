import Link from "next/link";
import Image from "next/image";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { isAllowedAvatarUrl } from "./avatarUrl";

type SearchParams = { [key: string]: string | string[] | undefined };

const toText = (v: unknown) => (v == null ? "" : String(v).trim());
const PAGE_SIZE = 20;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseServiceClient();
  const page = Math.max(1, parseInt(toText(searchParams.page), 10) || 1);
  const q = toText(searchParams.q);
  const role = toText(searchParams.role);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("profiles")
    .select("id,clerk_user_id,role,display_name,username,avatar_url,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  if (role) query = query.eq("role", role);

  const { data: profiles, error, count } = await query;
  if (error) {
    return (
      <AdminPage title="Users">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const clerkIds = (profiles ?? []).map((p) => (p as { clerk_user_id: string }).clerk_user_id).filter(Boolean);
  const { data: ownedListings } =
    clerkIds.length > 0
      ? await supabase.from("listings").select("owner_clerk_user_id, type").in("owner_clerk_user_id", clerkIds)
      : { data: [] as { owner_clerk_user_id: string; type: string }[] };

  const counts: Record<string, number> = {};
  for (const row of ownedListings ?? []) {
    counts[row.owner_clerk_user_id] = (counts[row.owner_clerk_user_id] ?? 0) + 1;
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminPage title="Users">
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
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Listings</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => {
                const row = p as { id: string; clerk_user_id: string; role: string; display_name: string | null; username: string | null; avatar_url: string | null; created_at: string };
                const name = toText(row.display_name) || toText(row.username) || "—";
                const listCount = counts[row.clerk_user_id] ?? 0;
                return (
                  <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${row.id}`} className="flex items-center gap-3">
                        {row.avatar_url && isAllowedAvatarUrl(row.avatar_url) ? (
                          <Image src={row.avatar_url} alt="" width={36} height={36} className="rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600">
                            {(name[0] || "?").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-zinc-900">{name}</div>
                          <div className="text-xs text-zinc-500">{row.username ? `@${row.username}` : row.clerk_user_id}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{listCount}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="text-sm font-medium text-zinc-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${role ? `&role=${encodeURIComponent(role)}` : ""}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium hover:bg-zinc-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${role ? `&role=${encodeURIComponent(role)}` : ""}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium hover:bg-zinc-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
