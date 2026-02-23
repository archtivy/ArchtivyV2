import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { getLeads } from "@/lib/db/leads";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusParam = toText(params.status) as "pending" | "approved" | "rejected" | "";
  const status = statusParam && ["pending", "approved", "rejected"].includes(statusParam)
    ? statusParam
    : ("pending" as const);

  const leads = await getLeads({ status, limit: 100 });

  return (
    <AdminPage title="Leads">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-700">Filter:</span>
        <Link
          href="/admin/leads"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!statusParam ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          Pending
        </Link>
        <Link
          href="/admin/leads?status=approved"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusParam === "approved" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          Approved
        </Link>
        <Link
          href="/admin/leads?status=rejected"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusParam === "rejected" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          Rejected
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Listing
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Sender
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
              {leads.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-zinc-900">{r.listing_title}</span>
                    {r.listing_type && (
                      <span className="ml-1 text-xs text-zinc-500">({r.listing_type})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {r.sender_name}
                    {r.sender_email && (
                      <span className="text-zinc-500"> · {r.sender_email}</span>
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
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/leads/${r.id}`}
                      className="text-sm font-medium text-zinc-700 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No leads found
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
