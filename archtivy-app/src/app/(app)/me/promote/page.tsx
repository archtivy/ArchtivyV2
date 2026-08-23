import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getOwnedListingsForClerkUser } from "@/lib/db/listings";
import { getUserCampaigns } from "@/lib/promote/campaigns";
import { isFeatureListingEnabled } from "@/lib/db/siteSettings";
import { PromoteDashboard } from "./PromoteDashboard";
import { SitePage } from "@/components/layout/SitePage";

export const metadata: Metadata = {
  title: "Feature Your Listing | Archtivy",
  robots: { index: false, follow: false },
};

export default async function PromotePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Feature gate: block access when disabled
  const enabled = await isFeatureListingEnabled();
  if (!enabled) {
    return (
      <SitePage>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-[32px] font-medium tracking-tight text-ink">
            Coming Soon
          </h1>
          <p className="mt-3 font-body text-[16px] leading-relaxed text-muted">
            The Feature Listing option is not available yet. Check back soon.
          </p>
        </div>
      </SitePage>
    );
  }

  const profileRes = await getProfileByClerkId(userId);
  const profile = profileRes.data;
  const profileId = profile?.id ?? null;

  const [listingsRes, campaigns] = await Promise.all([
    getOwnedListingsForClerkUser(userId, profileId),
    getUserCampaigns(userId),
  ]);

  const listings = (listingsRes.data ?? []).map((l) => ({
    id: l.id,
    title: l.title ?? "Untitled",
    type: l.type as "project" | "product",
    cover_image_url: l.cover_image_url ?? null,
  }));

  // NOTE: PromoteDashboard's own internals are still on the zinc palette. It is
  // 450 lines behind a feature flag that is off, and HomeNav lists Promote as
  // "Coming soon" rather than linking to it — so it is unreachable in
  // production today. Restyling it is a follow-up, not part of the nav
  // consolidation; flagged in the PR description so it is not forgotten.
  return (
    <SitePage>
      <PromoteDashboard listings={listings} campaigns={campaigns} />
    </SitePage>
  );
}
