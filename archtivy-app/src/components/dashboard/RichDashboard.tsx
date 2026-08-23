import Link from "next/link";
import { ArrowRight, Bookmark, FolderDown, TrendingUp, Users } from "lucide-react";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardListingCard } from "@/components/dashboard/DashboardListingCard";
import { DashboardFeed } from "@/components/dashboard/DashboardFeed";
import type { DashboardData, DashboardWindow } from "@/lib/db/dashboard";

/**
 * The dashboard for an account with a real catalogue behind it.
 *
 * ── ORDER FOLLOWS THE MOCKUP, CONTENT DOES NOT ──────────────────────────────
 * Listings first, then stats, then activity, with the promote card held to the
 * lower right exactly as drawn — that placement was confirmed as deliberate.
 *
 * Removed against the mockup, each for a reason recorded in the PR:
 *   · Quote Requests — no RFQ system exists in the schema at all.
 *   · Leads — the table exists and joins to an owner, but every lead ever filed
 *     is on a project, none on a product, and leads carry an admin moderation
 *     gate whose brand-facing visibility rule has not been decided.
 *   · Public follower counts — the follower list stays private, consistent
 *     with the profile-page decision.
 *
 * Drafts lead the grid for both roles. For a designer that was the agreed
 * ordering; for a brand it falls out of the same logic — an unfinished thing
 * you own is more urgent than a finished one.
 */
export function RichDashboard({
  data,
  displayName,
  window: activeWindow,
}: {
  data: DashboardData;
  displayName: string;
  window: DashboardWindow;
}) {
  const isBrand = data.role === "brand";
  const addHref = isBrand ? "/add/product" : "/add/project";
  const noun = isBrand ? "product" : "project";
  const ordered = [...data.drafts, ...data.published];

  return (
    <div className="space-y-10">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            {displayName}
          </p>
          <h1 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[38px]">
            Your {noun}s
          </h1>
        </div>
        <Link
          href={addHref}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none"
        >
          Add a {noun}
          <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      {/* ── Listings ──────────────────────────────────────────────────────── */}
      <section aria-label={`Your ${noun}s`}>
        {data.drafts.length > 0 && (
          <p className="mb-3 font-body text-[13px] text-muted">
            {data.drafts.length} unfinished {data.drafts.length === 1 ? "draft" : "drafts"} —
            each shows what it still needs.
          </p>
        )}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ordered.slice(0, 8).map((l) => (
            <DashboardListingCard key={l.id} listing={l} />
          ))}
        </ul>
        {ordered.length > 8 && (
          <Link
            href="/me/listings"
            className="mt-4 inline-flex items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            View all {ordered.length}
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <DashboardStats stats={data.stats} window={activeWindow} />

      {/* ── Activity + side column ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardFeed items={data.feed} />
        </div>

        <div className="space-y-4">
          {/* Followers: count only, never the list. Private by decision, and
              consistent with the profile page. */}
          <section
            aria-label="Followers"
            className="rounded-2xl border border-hairline bg-white p-6"
          >
            <div className="flex items-center gap-2">
              <Users strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
              <h2 className="font-body text-[13px] uppercase tracking-[0.14em] text-muted">
                Followers
              </h2>
            </div>
            <p className="mt-3 font-display text-[30px] leading-none tracking-tight text-ink tabular-nums">
              {data.followerCount.toLocaleString()}
            </p>
            <p className="mt-2 font-body text-[11px] text-muted">Only visible to you</p>
          </section>

          <section
            aria-label="Documents"
            className="rounded-2xl border border-hairline bg-white p-6"
          >
            <div className="flex items-center gap-2">
              <FolderDown strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
              <h2 className="font-body text-[13px] uppercase tracking-[0.14em] text-muted">
                Documents
              </h2>
            </div>
            <p className="mt-3 font-display text-[30px] leading-none tracking-tight text-ink tabular-nums">
              {data.documentCount.toLocaleString()}
            </p>
            <p className="mt-2 font-body text-[11px] text-muted">
              Attached across your {noun}s
            </p>
          </section>

          {/* Promote: position and emphasis kept exactly as drawn — confirmed
              deliberate, so it stays a filled block in the lower right rather
              than being demoted to a text link. */}
          <section
            aria-label="Promote"
            className="rounded-2xl border border-hairline bg-stone/30 p-6"
          >
            <TrendingUp strokeWidth={1.5} className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="mt-3 font-body text-[15px] font-medium text-ink">
              {isBrand ? "Promote your brand" : "Promote your studio"}
            </h2>
            <p className="mt-2 font-body text-[13px] leading-[20px] text-muted">
              Feature your work in top placements and reach specifiers browsing
              your categories.
            </p>
            {/* Non-interactive, matching the header menu: /me/promote renders a
                full dashboard that cannot yet take payment, so linking there
                would point at something that looks finished. */}
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink/10 px-4 py-2 font-body text-[13px] text-muted">
              <Bookmark strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
              Coming soon
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}
