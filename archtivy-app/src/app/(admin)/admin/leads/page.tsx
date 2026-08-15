import Link from "next/link";
import { AdminPageShell, Toolbar, SegmentedLinks } from "@/components/admin/ui/AdminPageShell";
import { RequestStatusPill } from "@/components/admin/ui/StatusPill";
import {
  TableShell,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  RowActions,
  CellStack,
  TableEmpty,
} from "@/components/admin/ui/DataTable";
import { BTN_ROW, TYPE } from "@/components/admin/ui/tokens";
import { getLeads } from "@/lib/db/leads";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusParam = toText(params.status) as "pending" | "approved" | "rejected" | "";
  const status =
    statusParam && ["pending", "approved", "rejected"].includes(statusParam)
      ? statusParam
      : ("pending" as const);

  const leads = await getLeads({ status, limit: 100 });

  return (
    <AdminPageShell
      title="Leads"
      description="Enquiries sent through a listing's contact form."
      toolbar={
        <Toolbar>
          <SegmentedLinks
            items={[
              { label: "Pending", href: "/admin/leads", active: !statusParam },
              {
                label: "Approved",
                href: "/admin/leads?status=approved",
                active: statusParam === "approved",
              },
              {
                label: "Rejected",
                href: "/admin/leads?status=rejected",
                active: statusParam === "rejected",
              },
            ]}
          />
        </Toolbar>
      }
    >
      <TableShell>
        <Table minWidth={860}>
          <THead>
            <TH>Listing</TH>
            <TH>Sender</TH>
            <TH>Status</TH>
            <TH>Received</TH>
            <TH align="right">
              <span className="sr-only">Actions</span>
            </TH>
          </THead>
          <TBody>
            {leads.map((r) => (
              <TR key={r.id}>
                <TD className="max-w-[300px]">
                  <CellStack
                    title={r.listing_title}
                    sub={r.listing_type ? r.listing_type : undefined}
                  />
                </TD>
                <TD className="max-w-[280px]">
                  <CellStack
                    title={r.sender_name}
                    sub={r.sender_email ? r.sender_email : undefined}
                  />
                </TD>
                <TD>
                  <RequestStatusPill status={r.status} />
                </TD>
                <TD className="text-muted">{new Date(r.created_at).toLocaleString()}</TD>
                <RowActions>
                  <Link href={`/admin/leads/${r.id}`} className={BTN_ROW}>
                    Review
                  </Link>
                </RowActions>
              </TR>
            ))}
            {leads.length === 0 && (
              <TableEmpty
                colSpan={5}
                title={`No ${status} leads`}
                hint={
                  status === "pending"
                    ? "New enquiries land here as soon as someone contacts a listing."
                    : "Try another status filter."
                }
              />
            )}
          </TBody>
        </Table>
      </TableShell>

      {leads.length > 0 && (
        <p className={`mt-3 ${TYPE.meta}`}>
          Showing {leads.length} {leads.length === 1 ? "lead" : "leads"}
        </p>
      )}
    </AdminPageShell>
  );
}
