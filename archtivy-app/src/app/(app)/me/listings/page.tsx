export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getOwnedListingsForClerkUser } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getUserListingStats, getLiveSaveCountsByListingIds } from "@/lib/db/userStats";
import { getListingUrl } from "@/lib/canonical";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypeBadge } from "@/components/TypeBadge";
import { ListingRowActions } from "./ListingRowActions";
import { ListingStatsStrip } from "@/components/dashboard/ListingStatsStrip";
import type { ListingSummary } from "@/lib/types/listings";
import type { ProfileRole } from "@/lib/auth/config";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const role = profile.role as ProfileRole;
  if (role === "reader") redirect("/me/settings");

  const profileId = profile.id ?? "";

  // Fetch listings + stats in parallel (stats queries are independent).
  const [{ data: listings, error }, stats] = await Promise.all([
    getOwnedListingsForClerkUser(userId, profileId || null),
    getUserListingStats(userId, profileId),
  ]);

  const listingIds = listings?.map((l) => l.id) ?? [];

  // Image thumbnails and live save counts both depend on listing IDs.
  const [imageResultResolved, liveSaves] = await Promise.all([
    listingIds.length > 0
      ? getFirstImageUrlPerListingIds(listingIds)
      : Promise.resolve({ data: {} as Record<string, string> }),
    getLiveSaveCountsByListingIds(listingIds),
  ]);
  const imageMap = imageResultResolved.data ?? {};

  const tab = (await searchParams).tab ?? "all";
  const filtered =
    tab === "projects"
      ? (listings ?? []).filter((l) => l.type === "project")
      : tab === "products"
        ? (listings ?? []).filter((l) => l.type === "product")
        : listings ?? [];

  const addHref = role === "designer" ? "/add/project" : "/add/product";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Listings
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your projects and products in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button as="link" href={addHref} variant="primary" className="rounded-[20px]">
            Add {role === "designer" ? "project" : "product"}
          </Button>
        </div>
      </div>

      {/* Stats strip — server-aggregated, APPROVED listings only, always fresh */}
      <ListingStatsStrip stats={stats} />

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800" aria-label="Listings tabs">
        <TabLink href="/me/listings?tab=all" active={tab === "all"}>
          All
        </TabLink>
        {role === "designer" && (
          <TabLink href="/me/listings?tab=projects" active={tab === "projects"}>
            Projects
          </TabLink>
        )}
        {role === "brand" && (
          <TabLink href="/me/listings?tab=products" active={tab === "products"}>
            Products
          </TabLink>
        )}
      </nav>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load listings. Please try again.
        </p>
      )}

      {!error && filtered.length === 0 && (
        <EmptyState
          title={tab === "all" ? "No listings yet" : `No ${tab} yet`}
          description={
            tab === "all"
              ? "Create your first project or product to get started."
              : undefined
          }
          action={
            <Button as="link" href={addHref} variant="primary">
              Add {role === "designer" ? "project" : "product"}
            </Button>
          }
        />
      )}

      {!error && filtered.length > 0 && (
        <ul className="space-y-4" aria-label="Your listings">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              imageUrl={imageMap[listing.id]}
              liveViewCount={listing.views_count ?? 0}
              liveSaveCount={liveSaves[listing.id] ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-archtivy-primary text-archtivy-primary"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ListingCard({
  listing,
  imageUrl,
  liveViewCount,
  liveSaveCount,
}: {
  listing: ListingSummary;
  imageUrl?: string;
  /** views_count from listings table (server-maintained counter). */
  liveViewCount: number;
  /** save_count from saved_listings table (live SQL-aggregated on server). */
  liveSaveCount: number;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center">
      <Link
        href={getListingUrl(listing)}
        className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="160px"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
            No image
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {listing.title?.trim() || "Untitled"}
          </h2>
          <TypeBadge type={listing.type} />
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            Published
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Last updated {formatDate(listing.created_at)}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{liveViewCount} views</span>
          <span>{liveSaveCount} saves</span>
        </div>
      </div>
      <div className="shrink-0">
        <ListingRowActions
          listingId={listing.id}
          listingType={listing.type}
          listingTitle={listing.title?.trim() || "Untitled"}
        />
      </div>
    </li>
  );
}
