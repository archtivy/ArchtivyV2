import Link from "next/link";
import Image from "next/image";
import { initialsOf } from "@/components/home/EntityCard";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { getListingUrl } from "@/lib/canonical";
import { documentDownloadHref } from "@/lib/documents/downloadHref";
import { TYPE, SURFACE, BTN_PRIMARY } from "@/components/admin/ui/tokens";
import type {
  ProfileListingCard,
  ProfileMiniProfile,
  ProfileDocument,
} from "@/lib/db/profilePage";

/**
 * Profile page modules, in the reference design's card language.
 *
 * Every module keeps the SeenInProjects rule: render nothing when there is no
 * data, rather than a titled shell around an empty state.
 *
 * ── THREE THINGS FROM THE REFERENCE ARE DELIBERATELY ABSENT ─────────────────
 * The left sidebar nav, the stats bar, and the followers panel were all removed
 * by decision, not adapted. The counts behind them are too sparse to read as
 * intentional, and a follower LIST contradicts the standing "no visible
 * follower count" rule rather than merely extending it.
 *
 * ── AND ONE THING INSIDE THE CARD ──────────────────────────────────────────
 * The reference card shows a view count AND a save/like count. `saves_count`
 * exists but is 0 on all 128 approved listings, so rendering it would print a
 * fabricated zero on every card. Views are real on 24 of 128, so they render
 * only when non-zero.
 */

/* ── Section + panel shells ──────────────────────────────────────────────── */

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="mb-5 font-display text-[20px] tracking-[-0.01em] text-ink">
        {title}
        {count != null && count > 0 && (
          <span className="ml-2.5 font-body text-[14px] text-muted">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

/** Bottom info panel — the reference's soft-bordered card. */
export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className={`${SURFACE} flex flex-col p-6`}>
      <h3 className="mb-4 font-body text-[15px] font-semibold text-ink">{title}</h3>
      <div className="flex-1">{children}</div>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-1.5 font-body text-[13px] text-muted transition-colors hover:text-ink"
        >
          {action.label} <span aria-hidden>→</span>
        </Link>
      )}
    </section>
  );
}

/** Label/value rows for an About panel. Rows with no value are dropped. */
export function InfoRows({ rows }: { rows: { label: string; value: string | null }[] }) {
  const present = rows.filter((r) => r.value);
  if (present.length === 0) return null;
  return (
    <dl className="space-y-2.5">
      {present.map((r) => (
        <div key={r.label} className="flex items-baseline gap-4">
          <dt className="w-[92px] shrink-0 font-body text-[13px] text-muted">{r.label}</dt>
          <dd className="min-w-0 flex-1 break-words font-body text-[13px] text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Listing card + grid ─────────────────────────────────────────────────── */

function listingHref(c: ProfileListingCard): string {
  return getListingUrl({
    id: c.id,
    type: c.type,
    slug: c.slug,
    taxonomy_slug_path: c.taxonomySlugPath,
  });
}


export function ListingCard({ card }: { card: ProfileListingCard }) {
  /*
   * ── THIS USED TO BE ITS OWN CARD ─────────────────────────────────────────
   * A locally-defined component, also called ListingCard, with rounded-xl
   * instead of rounded-lg, a 15px title instead of 17px, no bookmark, no
   * relationship badge, no owner logo and no connections row. It is why the
   * profile page's cards looked unlike every other card on the site, and why a
   * name-based grep for card components never found it: nothing imported it.
   *
   * It now maps to the shared card like everywhere else. ProfileListingCard
   * carries every field the model needs, so no data change was required.
   *
   * The view count this card used to show is dropped: views_count is populated
   * on 11 of 51 projects and 13 of 77 products, and the shared card has no
   * slot for a number that is absent four times out of five.
   */
  return (
    <ListingCardShared
      model={{
        id: card.id,
        type: card.type,
        title: card.title,
        href: listingHref(card),
        imageUrl: card.cover,
        categoryLabel: card.categoryLabel,
        metaLabel: card.type === "project" ? card.locationText : null,
        authorName: card.byline,
        year: card.type === "project" ? card.year : null,
      }}
      ratio={card.type === "product" ? "1/1" : "4/3"}
      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 24vw"
    />
  );
}

export function ListingGrid({ items }: { items: ProfileListingCard[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-4">
      {items.map((c) => (
        <li key={c.id}>
          <ListingCard card={c} />
        </li>
      ))}
    </ul>
  );
}

/** Compact list for use inside a Panel, where a 4-up grid would not fit. */
export function CompactListingList({ items }: { items: ProfileListingCard[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={listingHref(c)} className="group flex items-center gap-3">
            <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-stone">
              {c.cover && <Image src={c.cover} alt="" fill sizes="56px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-body text-[13px] text-ink group-hover:underline">
                {c.title}
              </span>
              {c.byline && (
                <span className="block truncate font-body text-[12px] text-muted">{c.byline}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ── People ──────────────────────────────────────────────────────────────── */

export function PeopleRow({
  people,
  compact = false,
}: {
  people: ProfileMiniProfile[];
  compact?: boolean;
}) {
  if (people.length === 0) return null;
  return (
    <ul className={compact ? "space-y-3" : "flex flex-wrap gap-3"}>
      {people.map((p) => {
        const inner = (
          <>
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-stone">
              {p.avatarUrl ? (
                <Image src={p.avatarUrl} alt="" fill sizes="36px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-body text-[12px] text-muted">
                  {initialsOf(p.displayName)}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-body text-[13px] text-ink">{p.displayName}</span>
              {p.label && (
                <span className="block truncate font-body text-[12px] text-muted">{p.label}</span>
              )}
            </span>
          </>
        );
        const href = p.username ? `/u/${encodeURIComponent(p.username)}` : `/u/id/${p.id}`;
        return (
          <li key={p.id}>
            <Link
              href={href}
              className={
                compact
                  ? "flex items-center gap-3 transition-opacity hover:opacity-70"
                  : "flex items-center gap-3 rounded-xl border border-hairline bg-white px-3.5 py-2.5 transition-colors hover:bg-stone/25"
              }
            >
              {inner}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Tags ────────────────────────────────────────────────────────────────── */

export function TagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <li
          key={t}
          className="rounded-full border border-hairline px-3 py-1 font-body text-[12px] text-muted"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

/* ── Documents ───────────────────────────────────────────────────────────── */

export function DocumentList({ documents }: { documents: ProfileDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {documents.map((d) => {
        // Same rule as the product page: never link to listing_documents.file_url,
        // which is a /object/public/ address on a private bucket.
        const href = documentDownloadHref({ id: d.id, listing_id: d.listingId });
        const label = (
          <>
            <span className="min-w-0 flex-1 truncate font-body text-[13px] text-ink">
              {d.fileName}
            </span>
            <span className="shrink-0 font-body text-[12px] text-muted">{d.listingTitle}</span>
          </>
        );
        return (
          <li key={d.id}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition-opacity hover:opacity-70"
              >
                {label}
              </a>
            ) : (
              <span className="flex items-center gap-3 opacity-60" title="This file is unavailable">
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

/**
 * Shown when a profile has no published work — true for roughly 85% of profiles
 * (18 of 149 designers and 15 of 47 brands have any approved listing), so this
 * IS the page for most visitors.
 *
 * OWNER   — a soft prompt with the one action that changes the state.
 * VISITOR — a calm, finished statement with no CTA: a visitor cannot publish on
 *           someone else's behalf, and "nothing yet" must not read as broken.
 */
export function ProfileEmptyState({
  isOwner,
  displayName,
  role,
}: {
  isOwner: boolean;
  displayName: string;
  role: string;
}) {
  const noun = role === "brand" ? "products" : "projects";

  if (isOwner) {
    return (
      <div className={`${SURFACE} px-6 py-12 text-center sm:px-10 sm:py-16`}>
        <h2 className="font-display text-[22px] tracking-[-0.01em] text-ink">
          Your profile is ready — it just needs work on it.
        </h2>
        <p className={`${TYPE.pageSubtitle} mx-auto mt-3 max-w-[46ch]`}>
          Published {noun} appear here, on Explore, and in the feeds of everyone who follows you.
        </p>
        <Link
          href={role === "brand" ? "/add/product" : "/add/project"}
          className={`${BTN_PRIMARY} mt-7`}
        >
          Publish your first {role === "brand" ? "product" : "project"}
        </Link>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <p className="font-body text-[15px] text-ink">
        {displayName} hasn&rsquo;t published any {noun} yet.
      </p>
      <p className={`${TYPE.pageSubtitle} mt-2`}>Follow to be notified when they do.</p>
    </div>
  );
}
