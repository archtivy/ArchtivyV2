import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { getClaimRequests } from "@/lib/db/profileClaimRequests";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = toText(params.status) as "pending" | "approved" | "rejected" | "";
  const showApprovedToast = toText(params.approved) === "1";

  const { data: requests, error } = await getClaimRequests({
    status: status || undefined,
    limit: 100,
  });

  if (error) {
    return (
      <AdminPage title="Claims">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error}
        </div>
      </AdminPage>
    );
  }

  const profileIds = Array.from(new Set((requests ?? []).map((r) => r.profile_id)));
  const supabase = getSupabaseServiceClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", profileIds);
  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => [
      p.id,
      toText(p.display_name) || toText(p.username) || "—",
    ])
  );

  return (
    <AdminPage title="Claims">
      {showApprovedToast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Claim approved. The profile is now owned by the requester.
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-700">Filter:</span>
        <Link
          href="/admin/claims"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!status ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          All
        </Link>
        <Link
          href="/admin/claims?status=pending"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === "pending" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          Pending
        </Link>
        <Link
          href="/admin/claims?status=approved"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === "approved" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          Approved
        </Link>
        <Link
          href="/admin/claims?status=rejected"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === "rejected" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          Rejected
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Profile
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Requester / username
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/profiles/${r.profile_id}`}
                      className="text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {profileMap.get(r.profile_id) ?? r.profile_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {r.requested_username ? (
                      <span title={r.requester_user_id}>@{r.requested_username}</span>
                    ) : (
                      <>
                        {toText(r.requester_name) || "—"}
                        {toText(r.requester_email) && (
                          <span className="text-zinc-500"> · {r.requester_email}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        r.status === "pending"
                          ? "bg-amber-50 text-amber-800"
                          : r.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/claims/${r.id}`}
                      className="text-sm font-medium text-zinc-700 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {(requests ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No claims found
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
