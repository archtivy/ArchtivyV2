export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByClerkId } from "@/lib/db/profiles";
import {
  getDashboardData,
  DEFAULT_WINDOW,
  type DashboardWindow,
} from "@/lib/db/dashboard";
import { RichDashboard } from "@/components/dashboard/RichDashboard";
import { SparseDashboard } from "@/components/dashboard/SparseDashboard";
import { ReaderDashboard } from "@/components/dashboard/ReaderDashboard";
import { HomeNav } from "@/components/home/HomeNav";

export const metadata: Metadata = {
  title: "Dashboard | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/dashboard — the signed-in home for an account.
 *
 * Sits alongside /me rather than replacing it: /me redirects to the public
 * profile at /u/[username], and every existing link and menu item depends on
 * that.
 *
 * ── THREE OUTCOMES, ONE BRANCH ──────────────────────────────────────────────
 *   reader (or any future role) → ReaderDashboard, a minimal skeleton
 *   publisher, < 3 published    → SparseDashboard, the common case
 *   publisher, 3+ published     → RichDashboard
 *
 * The reader branch is a null from getDashboardData(), not a flag read here —
 * so the rich layout is never constructed for a reader, and its components are
 * not even imported by that path.
 */

const VALID_WINDOWS = new Set<DashboardWindow>(["7d", "30d", "90d", "all"]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/dashboard");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const { window: windowParam } = await searchParams;
  const w: DashboardWindow = VALID_WINDOWS.has(windowParam as DashboardWindow)
    ? (windowParam as DashboardWindow)
    : DEFAULT_WINDOW;

  const displayName = profile.display_name?.trim() || profile.username;
  const data = await getDashboardData(profile.id ?? "", profile.role, w);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <HomeNav variant="solid" />
      <div className="mx-auto max-w-content px-4 pb-20 pt-[104px] md:px-12 lg:px-24">
        {data == null ? (
          <ReaderDashboard displayName={displayName} />
        ) : data.isSparse ? (
          <SparseDashboard data={data} displayName={displayName} />
        ) : (
          <RichDashboard data={data} displayName={displayName} window={w} />
        )}
      </div>
    </div>
  );
}
