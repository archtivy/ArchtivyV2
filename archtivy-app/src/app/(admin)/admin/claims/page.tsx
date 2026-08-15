import Link from "next/link";
import {
  AdminPageShell,
  Toolbar,
  SegmentedLinks,
  ErrorPanel,
} from "@/components/admin/ui/AdminPageShell";
import { RequestStatusPill } from "@/components/admin/ui/StatusPill";
import {
  TableShell,
  TableBar,
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
      <AdminPageShell title="Claims">
        <ErrorPanel message={error} />
      </AdminPageShell>
    );
  }

  const rows = requests ?? [];

  const profileIds = Array.from(new Set(rows.map((r) => r.profile_id)));
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

  // Counts come from the rows actually loaded, so the tab badge can only ever
  // be shown on the unfiltered view — a count derived from a filtered query
  // would claim a total it cannot know.
  const pendingCount = !status ? rows.filter((r) => r.status === "pending").length : undefined;

  return (
    <AdminPageShell
      title="Claims"
      description="Requests from people asking to take ownership of a profile."
      toolbar={
        <Toolbar>
          <SegmentedLinks
            items={[
              { label: "All", href: "/admin/claims", active: !status, count: pendingCount },
              {
                label: "Pending",
                href: "/admin/claims?status=pending",
                active: status === "pending",
              },
              {
                label: "Approved",
                href: "/admin/claims?status=approved",
                active: status === "approved",
              },
              {
                label: "Rejected",
                href: "/admin/claims?status=rejected",
                active: status === "rejected",
              },
            ]}
          />
        </Toolbar>
      }
    >
      <TableShell>
        {showApprovedToast && (
          <TableBar tone="positive">
            Claim approved. The profile is now owned by the requester.
          </TableBar>
        )}
        <Table minWidth={860}>
          <THead>
            <TH>Profile</TH>
            <TH>Requester</TH>
            <TH>Status</TH>
            <TH>Requested</TH>
            <TH align="right">
              <span className="sr-only">Actions</span>
            </TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="max-w-[280px]">
                  <CellStack
                    title={
                      <Link href={`/admin/profiles/${r.profile_id}`} className="hover:underline">
                        {profileMap.get(r.profile_id) ?? r.profile_id}
                      </Link>
                    }
                  />
                </TD>
                <TD className="max-w-[300px]">
                  {r.requested_username ? (
                    <CellStack title={`@${r.requested_username}`} sub={r.requester_user_id} />
                  ) : (
                    <CellStack
                      title={toText(r.requester_name) || "—"}
                      sub={toText(r.requester_email) || undefined}
                    />
                  )}
                </TD>
                <TD>
                  <RequestStatusPill status={r.status} />
                </TD>
                <TD className="text-muted">{new Date(r.created_at).toLocaleDateString()}</TD>
                <RowActions>
                  <Link href={`/admin/claims/${r.id}`} className={BTN_ROW}>
                    Review
                  </Link>
                </RowActions>
              </TR>
            ))}
            {rows.length === 0 && (
              <TableEmpty
                colSpan={5}
                title={status ? `No ${status} claims` : "No claims yet"}
                hint={
                  status
                    ? "Try another status filter."
                    : "Claim requests appear here when someone asks to take over a profile."
                }
              />
            )}
          </TBody>
        </Table>
      </TableShell>

      {rows.length > 0 && (
        <p className={`mt-3 ${TYPE.meta}`}>
          Showing {rows.length} {rows.length === 1 ? "claim" : "claims"}
        </p>
      )}
    </AdminPageShell>
  );
}
