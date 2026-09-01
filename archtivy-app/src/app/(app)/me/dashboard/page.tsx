export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getDashboardData } from "@/lib/db/dashboard";
import { getWorkspaceMetrics, countTeamCredits } from "@/lib/db/workspaceMetrics";
import { computeProfileStrength } from "@/lib/profile/profileStrength";
import { WorkspaceMetricCards } from "@/components/me/WorkspaceMetricCards";
import { MyListingsSection } from "@/components/me/MyListingsSection";
import { RecentActivityCard } from "@/components/me/RecentActivityCard";
import { ProfileStrengthCard } from "@/components/me/ProfileStrengthCard";
import { PromoteUpsellCard } from "@/components/me/PromoteUpsellCard";

export const metadata: Metadata = {
  title: "Dashboard | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/dashboard — the workspace overview.
 *
 * ── ONE LAYOUT, NOT THREE ───────────────────────────────────────────────────
 * This used to branch into RichDashboard / SparseDashboard / ReaderDashboard,
 * three separate presentations of the same account chosen by published count
 * and role. The rich and sparse variants disagreed about what a dashboard even
 * looks like, so a user crossing three published listings arrived at a page
 * they had never seen. The DATA logic behind them is kept — getDashboardData is
 * unchanged and still does all the loading — but there is now a single visual
 * composition that reads correctly at zero listings and at fifty, because every
 * section below has its own empty state.
 *
 * The reader branch survives as a data fact rather than a layout: readers own
 * no listings, so getDashboardData returns null and the sections simply render
 * their empty states around a real Profile Strength card.
 *
 * The chrome — sidebar, top bar, page padding — belongs to (app)/me/layout.tsx
 * now, which is why this file renders no HomeNav and no outer container.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/dashboard");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const displayName = profile.display_name?.trim() || profile.username;

  const [data, metrics] = await Promise.all([
    getDashboardData(profile.id ?? "", profile.role),
    getWorkspaceMetrics(userId, profile.id ?? ""),
  ]);

  const listings = data?.listings ?? [];
  const teamMemberCount = await countTeamCredits(listings.map((l) => l.id));
  const strength = computeProfileStrength(profile, {
    listingCount: listings.length,
    teamMemberCount,
  });

  const published = data?.published ?? [];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      {/* ── HEADER + METRICS ───────────────────────────────────────────────
          Side by side on wide screens as in the reference; the metrics wrap
          beneath the greeting before they would squeeze it. */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 xl:pt-1">
          <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">
            Welcome back, {displayName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 font-body text-[15px] text-muted">
            Here&rsquo;s what&rsquo;s happening with your profile today.
          </p>
        </div>
        <div className="w-full xl:max-w-[720px]">
          <WorkspaceMetricCards metrics={metrics} />
        </div>
      </div>

      <div className="mt-7">
        <MyListingsSection
          projects={published.filter((l) => l.type === "project")}
          products={published.filter((l) => l.type === "product")}
          drafts={data?.drafts ?? []}
        />
      </div>

      {/* ── LOWER ROW ──────────────────────────────────────────────────────
          Activity · Strength · Upsell, matching the reference's three-up
          composition and collapsing to one column on tablet and phone. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RecentActivityCard feed={data?.feed ?? []} />
        <ProfileStrengthCard strength={strength} />
        <PromoteUpsellCard />
      </div>
    </div>
  );
}
