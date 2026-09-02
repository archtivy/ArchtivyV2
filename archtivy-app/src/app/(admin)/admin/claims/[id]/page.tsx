import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell, Panel } from "@/components/admin/ui/AdminPageShell";
import { RequestStatusPill } from "@/components/admin/ui/StatusPill";
import { TYPE } from "@/components/admin/ui/tokens";
import { getClaimRequestById } from "@/lib/db/profileClaimRequests";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { ClaimDetailActions } from "./ClaimDetailActions";

/**
 * Admin claim review.
 *
 * ── WHAT WAS HERE BEFORE ────────────────────────────────────────────────────
 * A stub. The entire page was `<AdminPage title={`Claim: ${id}`}>` plus the
 * line "Claim detail for id: {id}" — so "Review" led to a screen showing the
 * claim's UUID and nothing else. That is the whole of the reported bug: the
 * claimant's message was never missing from the database, and no query or
 * mapper was dropping it. profile_claim_requests already stores it, the
 * mapper in profileClaimRequests.ts already reads it, and getClaimRequestById
 * already returns it. There was simply no screen rendering any of it.
 *
 * ClaimDetailActions — the approve/reject controls — was orphaned for the same
 * reason: it existed, fully written, and nothing imported it. So an admin
 * could not approve or reject from the review page either.
 *
 * ── TWO COLUMNS HOLD THE CLAIMANT'S TEXT, BOTH REAL ─────────────────────────
 * There are two claim entry points and they always wrote different columns:
 *
 *   /u/[username]/claim   -> requester_name, requester_email, proof_note
 *   /u/id/[id]/claim      -> requested_username, message
 *
 * Live data confirms it: of 4 claims, one carries `proof_note` and one carries
 * `message`, never both. Reading either column alone hides half the claims'
 * text, which is why this reads `message ?? proof_note` and labels the result
 * once. Neither column is deprecated and no migration is needed — see the note
 * on claimantMessage below.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={TYPE.columnHeader}>{label}</dt>
      <dd className="mt-1.5 font-body text-[14px] text-ink">{children}</dd>
    </div>
  );
}

/** Muted placeholder — never a blank cell, never "null". */
const Absent = ({ children = "Not provided" }: { children?: string }) => (
  <span className="font-body text-[14px] text-muted">{children}</span>
);

export default async function AdminClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: claim, error } = await getClaimRequestById(id);
  if (error) {
    return (
      <AdminPageShell title="Claim request">
        <Panel>
          <p className="font-body text-[14px] text-red-600">{error}</p>
        </Panel>
      </AdminPageShell>
    );
  }
  if (!claim) notFound();

  const supabase = getSupabaseServiceClient();
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, display_name, username, role, claim_status, location_city, location_country")
    .eq("id", claim.profile_id)
    .maybeSingle();
  const profile = profileRow as {
    id: string;
    display_name: string | null;
    username: string | null;
    role: string | null;
    claim_status: string | null;
    location_city: string | null;
    location_country: string | null;
  } | null;

  const profileName =
    toText(profile?.display_name) || toText(profile?.username) || claim.profile_id;
  const profileKind = profile?.role === "brand" ? "Brand profile" : "Designer profile";
  const place = [toText(profile?.location_city), toText(profile?.location_country)]
    .filter(Boolean)
    .join(", ");

  /*
   * ── THE CLAIMANT'S OWN WORDS ────────────────────────────────────────────
   * `message` and `proof_note` are the same thing written by two different
   * entry points (see the header note). Whichever the claim carries is shown
   * in full: no clamp, no truncation, and whitespace-pre-wrap so the line
   * breaks the claimant typed survive to the person deciding on their claim.
   */
  const claimantMessage = toText(claim.message) || toText(claim.proof_note) || "";

  const submitted = new Date(claim.created_at);
  const reviewed = claim.reviewed_at ? new Date(claim.reviewed_at) : null;
  const fmt = (d: Date) =>
    `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  const publicHref = profile?.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : `/u/id/${claim.profile_id}`;

  return (
    <AdminPageShell
      title="Claim request"
      description="Someone is asking to take ownership of this profile."
    >
      {/* Status and timing first, but as METADATA — small, on one line. The
          claim id is here rather than in the page title: it identifies the
          row and is worth nothing to the person deciding. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <RequestStatusPill status={claim.status} />
        <span className={TYPE.meta}>Submitted {fmt(submitted)}</span>
        {reviewed && <span className={TYPE.meta}>Reviewed {fmt(reviewed)}</span>}
        <span className={`${TYPE.meta} font-mono`}>#{claim.id}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Profile">
          <dl className="space-y-4">
            <Field label="Name">
              <span className="font-medium">{profileName}</span>
            </Field>
            <Field label="Type">
              {profileKind}
              {place && <span className="text-muted"> · {place}</span>}
            </Field>
            <Field label="Current claim state">
              {profile?.claim_status ? (
                <span className="capitalize">{profile.claim_status}</span>
              ) : (
                <Absent>Unknown</Absent>
              )}
            </Field>
            <div className="flex flex-wrap gap-4 pt-1">
              <Link
                href={publicHref}
                target="_blank"
                rel="noreferrer"
                className="font-body text-[13px] text-archtivy-primary underline-offset-4 hover:underline"
              >
                View public profile →
              </Link>
              <Link
                href={`/admin/profiles/${claim.profile_id}`}
                className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Open in admin →
              </Link>
            </div>
          </dl>
        </Panel>

        <Panel title="Claimant">
          <dl className="space-y-4">
            <Field label="Name">
              {toText(claim.requester_name) || <Absent />}
            </Field>
            <Field label="Email">
              {toText(claim.requester_email) ? (
                <a
                  href={`mailto:${claim.requester_email}`}
                  className="text-archtivy-primary underline-offset-4 hover:underline"
                >
                  {claim.requester_email}
                </a>
              ) : (
                <Absent />
              )}
            </Field>
            {toText(claim.requester_website) && (
              <Field label="Website">
                <a
                  href={claim.requester_website!}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all text-archtivy-primary underline-offset-4 hover:underline"
                >
                  {claim.requester_website}
                </a>
              </Field>
            )}
            {/* Only on claims that came through the by-id route, which is the
                only one that asks for a username. Hidden rather than shown
                empty on the claims that never had the field. */}
            {toText(claim.requested_username) && (
              <Field label="Requested username">
                <span className="font-mono text-[13px]">@{claim.requested_username}</span>
              </Field>
            )}
            <Field label="Account">
              <span className="break-all font-mono text-[12px] text-muted">
                {claim.requester_user_id}
              </span>
            </Field>
          </dl>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Message from the claimant">
          {claimantMessage ? (
            <p className="whitespace-pre-wrap font-body text-[14px] leading-[22px] text-ink">
              {claimantMessage}
            </p>
          ) : (
            <Absent>No message provided.</Absent>
          )}
        </Panel>
      </div>

      {/* A decision already taken keeps its note visible — it is the record of
          why, and rejecting twice is not possible. */}
      {(toText(claim.admin_note) || toText(claim.decision_note)) && (
        <div className="mt-5">
          <Panel title="Admin note">
            <p className="whitespace-pre-wrap font-body text-[14px] leading-[22px] text-ink">
              {toText(claim.admin_note) || toText(claim.decision_note)}
            </p>
          </Panel>
        </div>
      )}

      <div className="mt-5">
        <Panel title="Decision">
          <ClaimDetailActions requestId={claim.id} status={claim.status} />
        </Panel>
      </div>

      <div className="mt-5">
        <Link
          href="/admin/claims"
          className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to claims
        </Link>
      </div>
    </AdminPageShell>
  );
}
