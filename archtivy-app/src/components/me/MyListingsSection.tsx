"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, ChevronDown, Eye, Plus } from "lucide-react";
import { getListingUrl } from "@/lib/canonical";
import { editHrefForStep } from "@/lib/publish/listingCompleteness";
import { ListingActionsMenu } from "@/components/me/ListingActionsMenu";
import type { DashboardListing } from "@/lib/db/dashboard";

const NUMBER = new Intl.NumberFormat("en-US");

type TabKey = "project" | "product" | "draft";

/**
 * "My Listings" — the dashboard's primary section.
 *
 * ── TABS ARE COUNTED FROM REAL ROWS ─────────────────────────────────────────
 * Projects / Products / Drafts, each labelled with the owner's actual number.
 * Drafts is the DRAFT status; the other two are APPROVED split by type. Those
 * are the only two statuses `listings` holds, so there is no fourth tab and no
 * "Unpublished".
 *
 * ── A RAIL, NOT THE MANAGEMENT TABLE ────────────────────────────────────────
 * The dashboard shows a horizontal slice with arrows, as in the reference; the
 * full interface is /me/listings. The arrows scroll the real overflow container
 * rather than paginating, so a keyboard user tabbing through cards drags the
 * rail naturally and the two never disagree about position.
 */
export function MyListingsSection({
  projects,
  products,
  drafts,
}: {
  projects: DashboardListing[];
  products: DashboardListing[];
  drafts: DashboardListing[];
}) {
  const tabs = useMemo(
    () =>
      [
        { key: "project" as const, label: "Projects", items: projects },
        { key: "product" as const, label: "Products", items: products },
        { key: "draft" as const, label: "Drafts", items: drafts },
      ].filter((t) => t.items.length > 0),
    [projects, products, drafts]
  );

  // Open on the first tab that has anything, so a brand does not land on an
  // empty Projects tab and conclude the dashboard is broken.
  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? "project");
  const active = tabs.find((t) => t.key === tab) ?? tabs[0] ?? null;
  const railRef = useRef<HTMLUListElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="rounded-xl border border-hairline bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <h2 className="font-display text-[20px] leading-none tracking-tight text-ink">
          My Listings
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/me/listings"
            className="hidden items-center gap-1.5 font-body text-[13px] text-muted transition-colors hover:text-ink sm:flex"
          >
            View all listings
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <AddNewMenu />
        </div>
      </div>

      {active == null ? (
        <EmptyListings />
      ) : (
        <>
          <div className="mt-4 flex gap-5 border-b border-hairline px-5 sm:px-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={t.key === active.key ? "true" : undefined}
                className={[
                  "-mb-px border-b-2 pb-2.5 font-body text-[14px] transition-colors",
                  t.key === active.key
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:text-ink",
                ].join(" ")}
              >
                {t.label} ({t.items.length})
              </button>
            ))}
          </div>

          <ul
            ref={railRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 py-5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {active.items.map((l) => (
              <WorkspaceListingCard key={l.id} listing={l} />
            ))}
          </ul>

          {active.items.length > 1 && (
            <div className="flex items-center justify-center gap-2 pb-5">
              <RailArrow label="Scroll left" onClick={() => scrollBy(-1)}>
                <ArrowLeft strokeWidth={1.5} className="h-4 w-4" aria-hidden />
              </RailArrow>
              <RailArrow label="Scroll right" onClick={() => scrollBy(1)}>
                <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
              </RailArrow>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RailArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-ink/25 hover:text-ink"
    >
      {children}
    </button>
  );
}

function WorkspaceListingCard({ listing }: { listing: DashboardListing }) {
  const isDraft = listing.status === "DRAFT";
  const href = isDraft
    ? editHrefForStep(listing.id, listing.completeness?.missing[0]?.step ?? null)
    : getListingUrl({ id: listing.id, type: listing.type, slug: listing.slug ?? undefined });

  return (
    <li className="w-[264px] shrink-0 snap-start overflow-hidden rounded-xl border border-hairline bg-white">
      <Link href={href} className="relative block aspect-[4/3] w-full overflow-hidden bg-stone/40">
        {listing.coverImageUrl ? (
          <Image
            src={listing.coverImageUrl}
            alt=""
            fill
            sizes="264px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-body text-[12px] text-muted">
            No image yet
          </span>
        )}
        <span className="absolute right-2 top-2 rounded bg-ink/70 px-2 py-1 font-body text-[10px] uppercase tracking-[0.1em] text-cream backdrop-blur-sm">
          {listing.type}
        </span>
      </Link>

      <div className="px-3.5 pb-3.5 pt-3">
        <Link
          href={href}
          className="block truncate font-body text-[14px] text-ink underline-offset-4 hover:underline"
        >
          {listing.title}
        </Link>
        {/* Self-omitting: a listing with neither category nor location simply
            has no second line rather than an em dash standing in for one. */}
        {listing.subtitle && (
          <p className="mt-0.5 truncate font-body text-[12px] text-muted">{listing.subtitle}</p>
        )}

        <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3">
          <span className="flex items-center gap-1 font-body text-[12px] text-muted">
            <Eye strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
            {NUMBER.format(listing.views)}
          </span>
          <span className="flex items-center gap-1 font-body text-[12px] text-muted">
            <Bookmark strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
            {NUMBER.format(listing.saves)}
          </span>
          <StatusChip isDraft={isDraft} />
          <span className="ml-auto">
            <ListingActionsMenu
              listingId={listing.id}
              listingType={listing.type}
              listingTitle={listing.title}
              listingSlug={listing.slug}
              isDraft={isDraft}
            />
          </span>
        </div>
      </div>
    </li>
  );
}

/** APPROVED and DRAFT are the only two statuses the column holds. */
export function StatusChip({ isDraft }: { isDraft: boolean }) {
  return (
    <span
      className={[
        "rounded px-1.5 py-0.5 font-body text-[11px]",
        isDraft ? "bg-stone/50 text-muted" : "bg-emerald-50 text-emerald-700",
      ].join(" ")}
    >
      {isDraft ? "Draft" : "Published"}
    </span>
  );
}

function EmptyListings() {
  return (
    <div className="px-5 py-12 text-center sm:px-6">
      <p className="font-body text-[15px] text-ink">Nothing published yet</p>
      <p className="mx-auto mt-1.5 max-w-[380px] font-body text-[13px] leading-[19px] text-muted">
        Your projects and products will appear here once you add them.
      </p>
      <div className="mt-5 flex justify-center">
        <AddNewMenu />
      </div>
    </div>
  );
}

/** Points at the existing publish wizard entry points. Creates nothing itself. */
function AddNewMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 font-body text-[13px] text-cream transition-colors hover:bg-ink/90"
      >
        <Plus strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        Add New
        <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 w-[150px] overflow-hidden rounded-lg border border-hairline bg-cream py-1 shadow-sm"
        >
          <Link
            href="/add/project"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/30"
          >
            New project
          </Link>
          <Link
            href="/add/product"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/30"
          >
            New product
          </Link>
        </div>
      )}
    </div>
  );
}
