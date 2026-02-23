import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getLeadById } from "@/lib/db/leads";
import { LeadDetailActions } from "./LeadDetailActions";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  return (
    <AdminPage
      title={`Lead: ${lead.listing_title}`}
      actions={
        <Link
          href="/admin/leads"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to leads
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Listing</dt>
              <dd className="mt-1 text-sm font-medium text-zinc-900">{lead.listing_title}</dd>
              {lead.listing_type && (
                <dd className="text-xs text-zinc-500">{lead.listing_type}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Owner email (snapshot)</dt>
              <dd className="mt-1 text-sm text-zinc-700">{lead.listing_owner_email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Sender</dt>
              <dd className="mt-1 text-sm text-zinc-900">{lead.sender_name}</dd>
              <dd className="text-sm text-zinc-600">{lead.sender_email}</dd>
              {lead.sender_company && (
                <dd className="text-sm text-zinc-500">{lead.sender_company}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    lead.status === "pending"
                      ? "bg-amber-50 text-amber-800"
                      : lead.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {lead.status}
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Message</dt>
              <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {lead.message}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Created</dt>
              <dd className="mt-1 text-sm text-zinc-600">{new Date(lead.created_at).toLocaleString()}</dd>
            </div>
            {lead.reviewed_at && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">Reviewed</dt>
                <dd className="mt-1 text-sm text-zinc-600">
                  {new Date(lead.reviewed_at).toLocaleString()}
                  {lead.reviewed_by && ` by ${lead.reviewed_by}`}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {lead.status === "pending" && (
          <LeadDetailActions leadId={lead.id} />
        )}
      </div>
    </AdminPage>
  );
}
