export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getOwnedListingsForClerkUser } from "@/lib/db/listings";
import { getUserCampaigns } from "@/lib/promote/campaigns";
import { isFeatureListingEnabled } from "@/lib/db/siteSettings";
import { ListingToolsClient } from "./ListingToolsClient";

export const metadata: Metadata = {
  title: "Listing Tools | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/tools — Listing Tools.
 *
 * ── THE NEW NAME AND HOME OF THE EXISTING PROMOTION SYSTEM ──────────────────
 * Same data, same server guards, same Stripe route as /me/promote, which now
 * redirects here so existing links keep working. The feature flag is still
 * checked HERE, server-side, before any of it renders: when promotion is
 * disabled the page says so rather than drawing a flow that the checkout route
 * would refuse anyway.
 *
 * ── ONLY PUBLISHED LISTINGS ARE ELIGIBLE ────────────────────────────────────
 * getOwnedListingsForClerkUser deliberately includes DRAFT, because /me/listings
 * needs it. A promotion sends paying traffic to a public page, and a draft has
 * none, so drafts are filtered out here. The checkout route does not enforce
 * this, so treat the filter as presentation — it is why a draft simply never
 * appears in the picker rather than being offered and then failing.
 */
export default async function ListingToolsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/tools");

  const enabled = await isFeatureListingEnabled();
  if (!enabled) return <Unavailable />;

  const profileRes = await getProfileByClerkId(userId);
  const profileId = profileRes.data?.id ?? null;

  const [listingsRes, campaigns] = await Promise.all([
    getOwnedListingsForClerkUser(userId, profileId),
    getUserCampaigns(userId),
  ]);

  const listings = (listingsRes.data ?? [])
    .filter((l) => l.status !== "DRAFT")
    .map((l) => ({
      id: l.id,
      title: l.title ?? "Untitled",
      type: l.type as "project" | "product",
      cover_image_url: l.cover_image_url ?? null,
    }));

  return (
    // useSearchParams needs a Suspense boundary to keep this page statically
    // analysable during build.
    <Suspense fallback={null}>
      <ListingToolsClient listings={listings} campaigns={campaigns} />
    </Suspense>
  );
}

/** The existing feature-gate state, restyled. Not a "coming soon" placeholder
 *  standing in for missing infrastructure — the infrastructure exists and is
 *  switched off in site settings. */
function Unavailable() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">
        Listing Tools
      </h1>
      <p className="mt-2 font-body text-[15px] text-muted">
        Get your work in front of more architects, designers, and brands.
      </p>
      <div className="mt-7 rounded-xl border border-hairline bg-white px-6 py-16 text-center">
        <p className="font-display text-[20px] leading-none tracking-tight text-ink">
          Promotions are currently unavailable
        </p>
        <p className="mx-auto mt-2.5 max-w-[400px] font-body text-[14px] leading-[20px] text-muted">
          Featuring listings is switched off at the moment. Check back soon.
        </p>
      </div>
    </div>
  );
}
