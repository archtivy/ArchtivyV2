import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getOwnedListingsForClerkUser } from "@/lib/db/listings";
import { getUserCampaigns } from "@/lib/promote/campaigns";
import { isFeatureListingEnabled } from "@/lib/db/siteSettings";
import { PromoteDashboard } from "./PromoteDashboard";

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
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-normal text-zinc-900 dark:text-zinc-100">
          Coming Soon
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          The Feature Listing option is not available yet. Check back soon.
        </p>
      </div>
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

  return (
    <PromoteDashboard
      listings={listings}
      campaigns={campaigns}
    />
  );
}
