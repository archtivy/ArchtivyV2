"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";

/**
 * Account, Security, Notifications, Danger Zone.
 *
 * ── CLERK OWNS IDENTITY AND SECURITY ────────────────────────────────────────
 * Email, password, MFA and active sessions are all Clerk's, and Clerk's own
 * account modal already handles them with verification flows we would
 * otherwise have to reimplement badly. Both buttons open it rather than
 * rebuilding a second set of forms — that is the existing, working flow, kept.
 *
 * ── WHAT IS DELIBERATELY NOT WIRED ──────────────────────────────────────────
 * Two sections render as read-only on purpose, because building them would
 * mean inventing infrastructure that does not exist. They are drawn as plainly
 * unavailable rather than as controls that silently do nothing:
 *
 *   Username    `profiles.username` IS the public profile URL (/u/[username]).
 *               Nothing in the codebase maps an old username to a new one:
 *               there is no slug history table and no redirect, so a change
 *               would 404 every existing link, break the sitemap entry and the
 *               canonical URL, and strand references from other profiles'
 *               credits. The value is shown; editing waits until a redirect
 *               path exists. See the audit note in the PR.
 *
 *   Notifications  There is no notification_preferences table and no column on
 *               `profiles` holding any of these. Toggles that reset on reload
 *               would be worse than none, so they are disabled and labelled.
 *
 *   Danger Zone  No account deactivation or deletion flow exists anywhere in
 *               the codebase. Rather than invent destructive mutation logic,
 *               this points at support.
 */
export function SettingsAccount({
  username,
  roleLabel,
  publicUrl,
}: {
  username: string | null;
  roleLabel: string;
  publicUrl: string;
}) {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  return (
    <div className="mt-7 space-y-5">
      <Section title="Account">
        <Row label="Email" value={email} />
        <Row
          label="Username"
          value={username ?? "—"}
          note="Your profile URL is built from this. Changing it would break existing links, so it is managed by support for now."
        />
        <Row label="Role" value={roleLabel} />
        {publicUrl && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <span className="font-body text-[13px] text-muted">Public profile</span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-body text-[13px] text-ink underline-offset-4 hover:underline"
            >
              {publicUrl}
              <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          </div>
        )}
      </Section>

      <Section title="Security">
        <p className="py-3 font-body text-[13px] leading-[19px] text-muted">
          Your password, two-factor authentication and active sessions are managed in your
          Archtivy account settings.
        </p>
        <button
          type="button"
          onClick={() => openUserProfile?.()}
          className="mb-1 inline-flex h-9 items-center rounded-lg border border-ink/25 px-4 font-body text-[13px] text-ink transition-colors hover:bg-stone/40"
        >
          Open account settings
        </button>
      </Section>

      <Section title="Notifications">
        {[
          "New messages",
          "Listing activity",
          "Saves and connections",
          "Archtivy updates",
        ].map((label) => (
          <div key={label} className="flex items-center justify-between gap-3 py-3">
            <span className="font-body text-[13px] text-muted">{label}</span>
            <span
              aria-disabled
              className="flex h-5 w-9 shrink-0 items-center rounded-full bg-stone/60 px-0.5"
              title="Not available yet"
            >
              <span className="h-4 w-4 rounded-full bg-cream" />
            </span>
          </div>
        ))}
        <p className="pb-1 pt-2 font-body text-[12px] leading-[17px] text-muted">
          Notification preferences are not available yet — Archtivy does not store per-account
          notification settings. Everything is sent by email in the meantime.
        </p>
      </Section>

      <section className="rounded-xl border border-red-200 bg-white p-5">
        <h2 className="font-display text-[17px] leading-none tracking-tight text-ink">
          Danger Zone
        </h2>
        <p className="mt-3 font-body text-[13px] leading-[19px] text-muted">
          Deactivating or deleting an account also affects the listings, credits and
          collaborations attached to it. There is no self-service flow for this yet — contact us
          and we will handle it with you.
        </p>
        <a
          href="mailto:hello@archtivy.com?subject=Account%20deletion%20request"
          className="mt-4 inline-flex h-9 items-center rounded-lg border border-red-300 px-4 font-body text-[13px] text-red-700 transition-colors hover:bg-red-50"
        >
          Request account deletion
        </a>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline bg-white p-5">
      <h2 className="font-display text-[17px] leading-none tracking-tight text-ink">{title}</h2>
      <div className="mt-2 divide-y divide-hairline">{children}</div>
    </section>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-body text-[13px] text-muted">{label}</span>
        <span className="min-w-0 truncate font-body text-[13px] text-ink">{value}</span>
      </div>
      {note && <p className="mt-1.5 font-body text-[12px] leading-[17px] text-muted">{note}</p>}
    </div>
  );
}
