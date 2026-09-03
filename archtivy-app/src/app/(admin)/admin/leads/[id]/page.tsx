import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminPageShell, Panel } from "@/components/admin/ui/AdminPageShell";
import { RequestStatusPill, StatusPill } from "@/components/admin/ui/StatusPill";
import { TYPE } from "@/components/admin/ui/tokens";
import { getLeadById } from "@/lib/db/leads";
import { resolveLeadRecipient } from "@/lib/leads/recipient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl } from "@/lib/canonical";
import { LeadDetailActions } from "./LeadDetailActions";

/**
 * Admin lead review.
 *
 * ── WHAT CHANGED ────────────────────────────────────────────────────────────
 * The page existed, on the legacy zinc palette, and showed the lead's fields
 * as a flat definition list. Two things are new: the editorial admin tokens
 * the rest of the area uses, and — the substantive part — the RECIPIENT.
 *
 * An admin could not previously tell what "Approve" would do. It would send an
 * email if `listing_owner_email` happened to be set, and otherwise silently do
 * nothing beyond a status change. Now the recipient is resolved on this page
 * by the same function the approval uses, and stated plainly before the
 * decision is made — including when there is nobody to deliver to, which is
 * the case for 72 of the 80 approved products.
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

const Absent = ({ children = "Not provided" }: { children?: string }) => (
  <span className="font-body text-[14px] text-muted">{children}</span>
);

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const l = lead as typeof lead & {
    requester_profile_id?: string | null;
    recipient_profile_id?: string | null;
    conversation_id?: string | null;
  };

  const sup = getSupabaseServiceClient();

  const [recipient, listingRes, requesterRes] = await Promise.all([
    resolveLeadRecipient(lead.listing_id),
    sup
      .from("listings")
      .select("id, slug, title, cover_image_url, type, status")
      .eq("id", lead.listing_id)
      .maybeSingle(),
    l.requester_profile_id
      ? sup
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .eq("id", l.requester_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const listing = listingRes.data as {
    id: string;
    slug: string | null;
    title: string | null;
    cover_image_url: string | null;
    type: string | null;
    status: string | null;
  } | null;

  const requester = requesterRes.data as {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;

  /* The public URL, built by the same helper the directory cards use, so it
     is the canonical nested path rather than one that redirects. */
  const taxRes = await sup
    .from("listing_taxonomy_node")
    .select("taxonomy_nodes:taxonomy_node_id(slug_path, domain)")
    .eq("listing_id", lead.listing_id)
    .eq("is_primary", true)
    .maybeSingle();
  const taxNode = (taxRes.data as { taxonomy_nodes?: { slug_path?: string; domain?: string } } | null)
    ?.taxonomy_nodes;
  const publicHref = listing
    ? getListingUrl({
        id: listing.id,
        type: listing.type === "project" ? "project" : "product",
        slug: listing.slug,
        taxonomySlugPath:
          taxNode?.domain === (listing.type === "project" ? "project" : "product")
            ? (taxNode?.slug_path ?? null)
            : null,
      })
    : null;

  const submitted = new Date(lead.created_at);
  const reviewed = lead.reviewed_at ? new Date(lead.reviewed_at) : null;
  const fmt = (d: Date) =>
    `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  return (
    <AdminPageShell
      title="Lead"
      description="A request sent through a listing, awaiting review before it is forwarded."
    >
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <RequestStatusPill status={lead.status} />
        {lead.kind === "quote" && <StatusPill tone="info">Quote request</StatusPill>}
        <span className={TYPE.meta}>Submitted {fmt(submitted)}</span>
        {reviewed && <span className={TYPE.meta}>Reviewed {fmt(reviewed)}</span>}
        <span className={`${TYPE.meta} font-mono`}>#{lead.id}</span>
      </div>

      {/* ── DELIVERY, STATED BEFORE THE DECISION ────────────────────────────
          The one thing an admin needs to know that the lead row cannot tell
          them. Resolved by the same function approval uses, so what this says
          and what the button does cannot disagree. */}
      {lead.status === "pending" && (
        <div className="mb-5">
          {recipient.deliverable ? (
            <div className="rounded-2xl border border-hairline bg-white px-5 py-4">
              <p className="font-body text-[14px] font-medium text-ink">
                In-app delivery available
              </p>
              <p className="mt-1 font-body text-[13px] text-muted">
                Approving will place this request in{" "}
                <span className="text-ink">{recipient.displayName ?? "the owner"}</span>&rsquo;s
                Messages and notify them.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-4">
              <p className="font-body text-[14px] font-medium text-amber-900">
                In-app delivery unavailable
              </p>
              <p className="mt-1 font-body text-[13px] text-amber-800">
                {recipient.reason} The request will be delivered by email only.
              </p>
            </div>
          )}
        </div>
      )}

      {l.conversation_id && (
        <div className="mb-5 rounded-2xl border border-hairline bg-white px-5 py-4">
          <p className="font-body text-[14px] text-ink">Delivered to Messages</p>
          <p className={`mt-1 ${TYPE.meta} font-mono`}>conversation {l.conversation_id}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Product">
          <div className="flex gap-4">
            {listing?.cover_image_url && (
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone/40">
                <Image
                  src={listing.cover_image_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </span>
            )}
            <dl className="min-w-0 flex-1 space-y-4">
              <Field label="Title">
                <span className="font-medium">{lead.listing_title}</span>
              </Field>
              <Field label="Type">{lead.listing_type ?? <Absent>Unknown</Absent>}</Field>
              <Field label="Intended recipient">
                {recipient.displayName ? (
                  recipient.profileId ? (
                    <Link
                      href={`/admin/profiles/${recipient.profileId}`}
                      className="text-archtivy-primary underline-offset-4 hover:underline"
                    >
                      {recipient.displayName}
                    </Link>
                  ) : (
                    recipient.displayName
                  )
                ) : (
                  <Absent>No owner profile</Absent>
                )}
              </Field>
              <Field label="Owner email (snapshot)">
                {toText(lead.listing_owner_email) || <Absent />}
              </Field>
              {publicHref && (
                <div className="pt-1">
                  <Link
                    href={publicHref}
                    target="_blank"
                    rel="noreferrer"
                    className="font-body text-[13px] text-archtivy-primary underline-offset-4 hover:underline"
                  >
                    View public product →
                  </Link>
                </div>
              )}
            </dl>
          </div>
        </Panel>

        <Panel title="Requester">
          <div className="flex gap-4">
            {requester?.avatar_url && (
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone/40">
                <Image src={requester.avatar_url} alt="" fill sizes="44px" className="object-cover" />
              </span>
            )}
            <dl className="min-w-0 flex-1 space-y-4">
              <Field label="Name given">{toText(lead.sender_name) || <Absent />}</Field>
              <Field label="Archtivy account">
                {requester ? (
                  <Link
                    href={
                      requester.username
                        ? `/u/${encodeURIComponent(requester.username)}`
                        : `/u/id/${requester.id}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-archtivy-primary underline-offset-4 hover:underline"
                  >
                    {requester.display_name?.trim() || requester.username || requester.id}
                  </Link>
                ) : (
                  /* Every lead submitted before authenticated requests, and
                     every one from the anonymous project contact form, has no
                     profile behind it — the sender's name is a typed string. */
                  <Absent>Anonymous submission — no Archtivy profile</Absent>
                )}
              </Field>
              <Field label="Email">{toText(lead.sender_email) || <Absent />}</Field>
              {toText(lead.sender_company) && (
                <Field label="Company">{lead.sender_company}</Field>
              )}
            </dl>
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Message">
          {toText(lead.message) ? (
            <p className="whitespace-pre-wrap font-body text-[14px] leading-[22px] text-ink">
              {lead.message}
            </p>
          ) : (
            <Absent>No message provided.</Absent>
          )}
        </Panel>
      </div>

      {/* Quote-only fields, shown only when the lead actually carries them. */}
      {(lead.project_name || lead.quantity || lead.location || lead.desired_timeline) && (
        <div className="mt-5">
          <Panel title="Quote details">
            <dl className="grid gap-4 sm:grid-cols-2">
              {lead.project_name && <Field label="Project">{lead.project_name}</Field>}
              {lead.quantity && <Field label="Quantity">{lead.quantity}</Field>}
              {lead.location && <Field label="Location">{lead.location}</Field>}
              {lead.desired_timeline && <Field label="Timeline">{lead.desired_timeline}</Field>}
            </dl>
          </Panel>
        </div>
      )}

      <div className="mt-5">
        <Panel title="Decision">
          {lead.status === "pending" ? (
            <LeadDetailActions leadId={lead.id} deliverable={recipient.deliverable} />
          ) : (
            <p className="font-body text-[14px] text-muted">
              This lead has been {lead.status}. No further actions.
            </p>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Link
          href="/admin/leads"
          className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to leads
        </Link>
      </div>
    </AdminPageShell>
  );
}
