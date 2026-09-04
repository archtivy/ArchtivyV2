export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Bookmark, Eye, Plus } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getOwnedListingsForClerkUser } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getUserListingStats, getLiveSaveCountsByListingIds } from "@/lib/db/userStats";
import { ListingActionsMenu } from "@/components/me/ListingActionsMenu";
import { ListingsToolbar } from "./ListingsToolbar";
import type { OwnedListingSummary } from "@/lib/db/listings";
import type { ProfileRole } from "@/lib/auth/config";

/**
 * /me/listings — the full owner-management interface.
 *
 * ── THE LOGIC IS UNCHANGED; THE SURFACE IS THE WORKSPACE'S ──────────────────
 * Loading, ownership, stats and the delete path are exactly as they were. What
 * changed: the page no longer draws its own HomeNav or page container (the
 * shell owns those), the type tabs are no longer gated by role, and search and
 * sort were added.
 *
 * ── TABS ARE NO LONGER ROLE-GATED ───────────────────────────────────────────
 * A designer saw only "All / Projects" and a brand only "All / Products", from
 * profile.role. But ownership does not follow role: a studio that publishes a
 * product had no way to filter to it, and its listings were reachable only
 * under All. Tabs are now driven by what the owner ACTUALLY has, so a tab
 * appears when there is something behind it and never otherwise.
 *
 * ── SEARCH AND SORT ARE URL-BACKED ──────────────────────────────────────────
 * ?q= and ?sort= are read here and applied server-side, so the first paint is
 * already filtered and Back restores the exact view. Sorting by title uses
 * localeCompare; "updated" sorts on created_at, which is the only timestamp
 * `listings` exposes to this query — see the note on the Updated column.
 */
export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; q?: string; sort?: string }>;
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

  const all = listings ?? [];
  const listingIds = all.map((l) => l.id);

  const [imageResultResolved, liveSaves] = await Promise.all([
    listingIds.length > 0
      ? getFirstImageUrlPerListingIds(listingIds)
      : Promise.resolve({ data: {} as Record<string, string> }),
    getLiveSaveCountsByListingIds(listingIds),
  ]);
  const imageMap = imageResultResolved.data ?? {};

  const sp = await searchParams;
  const tab = sp.tab ?? "all";
  const status = sp.status ?? "all";
  const q = (sp.q ?? "").trim();
  const sort = sp.sort ?? "recent";

  const projectCount = all.filter((l) => l.type === "project").length;
  const productCount = all.filter((l) => l.type === "product").length;
  const draftCount = all.filter((l) => l.status === "DRAFT").length;

  const byType =
    tab === "projects"
      ? all.filter((l) => l.type === "project")
      : tab === "products"
        ? all.filter((l) => l.type === "product")
        : tab === "drafts"
          ? all.filter((l) => l.status === "DRAFT")
          : all;

  /*
   * Status is a second axis on top of the tab. Deliberately TWO states, not
   * Draft/Pending/Approved: `PENDING` is unreachable from any user-facing
   * create path, so a Pending filter could never fill. Anything not DRAFT
   * counts as published, so an admin-set PENDING row still appears somewhere
   * rather than vanishing from the owner's own list.
   */
  const byStatus =
    status === "drafts"
      ? byType.filter((l) => l.status === "DRAFT")
      : status === "published"
        ? byType.filter((l) => l.status !== "DRAFT")
        : byType;

  const searched = q
    ? byStatus.filter((l) => (l.title ?? "").toLowerCase().includes(q.toLowerCase()))
    : byStatus;

  const filtered = [...searched].sort((a, b) => {
    if (sort === "title") return (a.title ?? "").localeCompare(b.title ?? "");
    if (sort === "views") return (b.views_count ?? 0) - (a.views_count ?? 0);
    if (sort === "saves") return (liveSaves[b.id] ?? 0) - (liveSaves[a.id] ?? 0);
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const addHref = role === "brand" ? "/add/product" : "/add/project";
  const noun = role === "brand" ? "product" : "project";

  const statItems = [
    { label: "Listings", value: stats.totalListings },
    { label: "Views", value: stats.totalViews },
    { label: "Saves", value: stats.totalSaves },
    { label: "Connections", value: stats.totalConnections },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">
            Listings
          </h1>
          <p className="mt-2 font-body text-[15px] text-muted">
            Manage your projects and products in one place.
          </p>
        </div>
        <Link
          href={addHref}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 font-body text-[13px] text-cream transition-colors hover:bg-ink/90"
        >
          <Plus strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          Add a {noun}
        </Link>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statItems.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-hairline bg-white px-4 py-3.5">
            <dd className="font-display text-[24px] leading-none tracking-tight text-ink tabular-nums">
              {value.toLocaleString()}
            </dd>
            <dt className="mt-1.5 font-body text-[12px] text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <ListingsToolbar
        tab={tab}
        status={status}
        q={q}
        sort={sort}
        counts={{ all: all.length, projects: projectCount, products: productCount, drafts: draftCount }}
      />

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-body text-[14px] text-red-700">
          Could not load listings. Please try again.
        </p>
      )}

      {!error && filtered.length === 0 && (
        <div className="mt-6 rounded-xl border border-hairline bg-white px-6 py-14 text-center">
          <p className="font-display text-[20px] tracking-tight text-ink">
            {q ? "Nothing matches that search" : "Nothing here yet"}
          </p>
          <p className="mx-auto mt-2 max-w-[42ch] font-body text-[14px] leading-[20px] text-muted">
            {q
              ? "Try a different title, or clear the search to see everything."
              : status === "drafts" || tab === "drafts"
                ? "Drafts you save from the wizard will wait for you here."
                : `Publish your first ${noun} — it takes about ten minutes.`}
          </p>
        </div>
      )}

      {!error && filtered.length > 0 && (
        <ul className="mt-6 space-y-2.5" aria-label="Your listings">
          {filtered.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              imageUrl={imageMap[listing.id]}
              views={listing.views_count ?? 0}
              saves={liveSaves[listing.id] ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
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

/**
 * One listing, as a responsive row: thumbnail · title/meta · stats · actions.
 * A table at this width would force a horizontal scroll on tablet, so the
 * columns collapse into a stacked card below `sm` instead.
 */
function ListingRow({
  listing,
  imageUrl,
  views,
  saves,
}: {
  listing: OwnedListingSummary;
  imageUrl?: string;
  views: number;
  saves: number;
}) {
  const isDraft = listing.status === "DRAFT";
  const title = listing.title?.trim() || "Untitled";
  const editHref = `/me/listings/${listing.id}/edit`;

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-hairline bg-white p-3.5 transition-colors hover:border-ink/20 sm:flex-row sm:items-center">
      {/*
        Opening a listing from your own workspace means opening it to work on
        it, so the image and the title both go to the edit page. That is what
        the "Manage" button did; the button is gone and the card does its job.
        The PUBLIC page has not become unreachable — it is "View" in the ••• menu,
        which is also where it belongs, since a draft has no public page yet.
      */}
      <Link
        href={editHref}
        className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg bg-stone/40 sm:h-16 sm:w-24"
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-body text-[11px] text-muted">
            No image
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate font-body text-[14px] text-ink">
            <Link href={editHref} className="hover:underline">
              {title}
            </Link>
          </h2>
          <span className="rounded border border-hairline px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.08em] text-muted">
            {listing.type}
          </span>
          <span
            className={[
              "rounded px-1.5 py-0.5 font-body text-[11px]",
              isDraft ? "bg-stone/50 text-muted" : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {isDraft ? "Draft" : "Published"}
          </span>
        </div>
        {/* `listings` exposes no updated_at to this query, so this is the
            creation date and is labelled as such rather than as "updated". */}
        <p className="mt-1 font-body text-[12px] text-muted">
          Added {formatDate(listing.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="flex items-center gap-1.5 font-body text-[12px] text-muted">
          <Eye strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          {views.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-muted">
          <Bookmark strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          {saves.toLocaleString()}
        </span>
        <ListingActionsMenu
          listingId={listing.id}
          listingType={listing.type}
          listingTitle={title}
          listingSlug={listing.slug}
          isDraft={isDraft}
        />
      </div>
    </li>
  );
}
