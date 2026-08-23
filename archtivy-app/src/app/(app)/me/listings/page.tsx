export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getOwnedListingsForClerkUser } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getUserListingStats, getLiveSaveCountsByListingIds } from "@/lib/db/userStats";
import { getListingUrl } from "@/lib/canonical";
import { ListingRowActions } from "./ListingRowActions";
import { SitePage } from "@/components/layout/SitePage";
import type { OwnedListingSummary } from "@/lib/db/listings";
import type { ProfileRole } from "@/lib/auth/config";

/**
 * /me/listings — manage everything you own.
 *
 * ── RESTYLED ONTO THE EDITORIAL SYSTEM ──────────────────────────────────────
 * This page was the last high-traffic signed-in surface still on the legacy
 * zinc palette with the blue #002abf accent. Reached in one click from the
 * dashboard's "Manage listings", it made the two pages look like two products.
 *
 * It now renders SitePage on cream/ink/hairline with Jet Black accents, like
 * every other route.
 *
 * Behaviour is unchanged — same queries, same tabs, same filters, same actions.
 * This is chrome only.
 */

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; updated?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/listings");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const role = profile.role as ProfileRole;
  if (role === "reader") redirect("/me/settings");

  const profileId = profile.id ?? "";

  const [{ data: listings, error }, stats] = await Promise.all([
    getOwnedListingsForClerkUser(userId, profileId || null),
    getUserListingStats(userId, profileId),
  ]);

  const listingIds = listings?.map((l) => l.id) ?? [];

  const [imageResultResolved, liveSaves] = await Promise.all([
    listingIds.length > 0
      ? getFirstImageUrlPerListingIds(listingIds)
      : Promise.resolve({ data: {} as Record<string, string> }),
    getLiveSaveCountsByListingIds(listingIds),
  ]);
  const imageMap = imageResultResolved.data ?? {};

  const sp = await searchParams;
  const tab = sp.tab ?? "all";
  /*
   * Status is a second, independent axis: Drafts / Published.
   *
   * Deliberately TWO states, not Draft/Pending/Approved. `PENDING` is
   * unreachable from any user-facing create path — the wizard writes APPROVED,
   * or DRAFT for save-as-draft — so a Pending tab could never fill, and an
   * always-empty tab reads as a broken feature rather than an unused one.
   *
   * Anything not DRAFT counts as published, so an admin-set PENDING row still
   * appears somewhere rather than vanishing from the owner's own list.
   */
  const status = sp.status ?? "all";
  const byType =
    tab === "projects"
      ? (listings ?? []).filter((l) => l.type === "project")
      : tab === "products"
        ? (listings ?? []).filter((l) => l.type === "product")
        : listings ?? [];
  const filtered =
    status === "drafts"
      ? byType.filter((l) => l.status === "DRAFT")
      : status === "published"
        ? byType.filter((l) => l.status !== "DRAFT")
        : byType;

  const draftCount = (listings ?? []).filter((l) => l.status === "DRAFT").length;
  const qs = (next: { tab?: string; status?: string }) => {
    const params = new URLSearchParams();
    const t = next.tab ?? tab;
    const st = next.status ?? status;
    if (t !== "all") params.set("tab", t);
    if (st !== "all") params.set("status", st);
    const q = params.toString();
    return `/me/listings${q ? `?${q}` : ""}`;
  };

  const addHref = role === "designer" ? "/add/project" : "/add/product";
  const noun = role === "designer" ? "project" : "product";

  const statItems = [
    { label: "Listings", value: stats.totalListings },
    { label: "Views", value: stats.totalViews },
    { label: "Saves", value: stats.totalSaves },
    { label: "Connections", value: stats.totalConnections },
  ];

  return (
    <SitePage>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            <Link href="/me/dashboard" className="underline-offset-4 hover:underline">
              Dashboard
            </Link>
          </p>
          <h1 className="mt-3 font-display text-[36px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[42px]">
            Listings
          </h1>
          <p className="mt-3 font-body text-[15px] leading-[24px] text-muted">
            Manage your projects and products in one place.
          </p>
        </div>
        <Link
          href={addHref}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none"
        >
          Add a {noun}
          <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      {/* Stats — server-aggregated, APPROVED listings only. Rendered inline
          on the editorial tokens rather than via ListingStatsStrip, which is
          still on the zinc palette and is used elsewhere. */}
      <dl className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statItems.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-hairline bg-white p-5">
            <dd className="font-display text-[30px] leading-none tracking-tight text-ink tabular-nums">
              {value.toLocaleString()}
            </dd>
            <dt className="mt-2 font-body text-[12px] text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {/* Type tabs */}
      <nav
        className="mt-10 flex gap-1 border-b border-hairline"
        aria-label="Listings tabs"
      >
        <TabLink href={qs({ tab: "all" })} active={tab === "all"}>
          All
        </TabLink>
        {role === "designer" && (
          <TabLink href={qs({ tab: "projects" })} active={tab === "projects"}>
            Projects
          </TabLink>
        )}
        {role === "brand" && (
          <TabLink href={qs({ tab: "products" })} active={tab === "products"}>
            Products
          </TabLink>
        )}
      </nav>

      {/* Status filter — a second axis, so it reads as a filter on the tab
          above rather than a competing set of tabs. Drafts is shown even at
          zero so the state is discoverable before a draft exists. */}
      <div
        className="mt-5 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filter by status"
      >
        <StatusChip href={qs({ status: "all" })} active={status === "all"}>
          All
        </StatusChip>
        <StatusChip href={qs({ status: "published" })} active={status === "published"}>
          Published
        </StatusChip>
        <StatusChip href={qs({ status: "drafts" })} active={status === "drafts"}>
          Drafts{draftCount > 0 ? ` (${draftCount})` : ""}
        </StatusChip>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-red-50 px-4 py-3 font-body text-[14px] text-red-700"
        >
          Could not load listings. Please try again.
        </p>
      )}

      {!error && filtered.length === 0 && (
        <div className="mt-8 rounded-2xl border border-hairline bg-white p-10 text-center">
          <p className="font-display text-[22px] tracking-tight text-ink">
            {tab === "all" ? `No ${noun}s yet` : `No ${tab} yet`}
          </p>
          <p className="mx-auto mt-2 max-w-[42ch] font-body text-[14px] leading-[22px] text-muted">
            {status === "drafts"
              ? "Drafts you save from the wizard will wait for you here."
              : `Publish your first ${noun} — it takes about ten minutes.`}
          </p>
          <Link
            href={addHref}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none"
          >
            Add a {noun}
            <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}

      {!error && filtered.length > 0 && (
        <ul className="mt-8 space-y-3" aria-label="Your listings">
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
    </SitePage>
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
      aria-current={active ? "page" : undefined}
      className={[
        "-mb-px border-b-2 px-3 py-2.5 font-body text-[14px] transition-colors",
        // Jet Black is the accent now; the underline was archtivy-primary blue.
        active
          ? "border-archtivy-jet text-ink"
          : "border-transparent text-muted hover:text-ink",
      ].join(" ")}
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
  listing: OwnedListingSummary;
  imageUrl?: string;
  /** views_count from listings table (server-maintained counter). */
  liveViewCount: number;
  /** save_count from listing_saves (live SQL-aggregated on server). */
  liveSaveCount: number;
}) {
  const isDraft = listing.status === "DRAFT";
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-hairline bg-white p-4 transition-colors hover:border-ink/20 sm:flex-row sm:items-center">
      <Link
        href={getListingUrl(listing)}
        className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-stone/40 sm:w-40"
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
          <span className="flex h-full w-full items-center justify-center font-body text-[12px] text-muted">
            No image
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-body text-[15px] font-medium text-ink">
            {listing.title?.trim() || "Untitled"}
          </h2>
          <span className="rounded-full border border-hairline px-2 py-0.5 font-body text-[11px] capitalize text-muted">
            {listing.type}
          </span>
          {/* Mirrors the Drafts filter's rule exactly: DRAFT is a draft,
              anything else counts as published. */}
          {isDraft ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-body text-[11px] font-medium text-amber-900">
              Draft
            </span>
          ) : (
            <span className="rounded-full bg-stone/50 px-2 py-0.5 font-body text-[11px] text-muted">
              Published
            </span>
          )}
        </div>
        <p className="mt-1 font-body text-[12px] text-muted">
          Last updated {formatDate(listing.created_at)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-3 font-body text-[12px] text-muted">
          <span>{liveViewCount} views</span>
          <span>{liveSaveCount} saves</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/me/listings/${listing.id}`}
          className="rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
        >
          Manage
        </Link>
        <ListingRowActions
          listingId={listing.id}
          listingType={listing.type}
          listingTitle={listing.title?.trim() || "Untitled"}
          isDraft={isDraft}
        />
      </div>
    </li>
  );
}

/** Pill filter for the status axis. Visually distinct from TabLink so the two
 *  rows do not read as two competing sets of tabs. */
function StatusChip({
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
      aria-current={active ? "true" : undefined}
      className={[
        "rounded-full border px-3.5 py-1.5 font-body text-[12px] transition-colors",
        active
          ? "border-archtivy-jet bg-archtivy-jet text-cream"
          : "border-hairline text-muted hover:border-ink/25 hover:text-ink",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
