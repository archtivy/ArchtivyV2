import Link from "next/link";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
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
      /* The FULL canonical model. This used to omit the category link, the
         owner logo chip, the year link and — most importantly — the
         relationship badge, so the same ListingCardShared drew a poorer card
         on a profile than on /projects. A stripped model makes one component
         look like an inferior variant of itself. */
      model={{
        id: card.id,
        type: card.type,
        title: card.title,
        href: listingHref(card),
        imageUrl: card.cover,
        categoryLabel: card.categoryLabel,
        categoryHref: card.categoryHref,
        // Project: the place. Product: the type under its root, so the line
        // reads "Furniture · Bed frame" exactly as it does on /products.
        metaLabel: card.type === "project" ? card.locationText : card.typeLabel,
        authorName: card.byline,
        logoUrl: card.ownerAvatar,
        year: card.type === "project" ? card.year : null,
        yearHref:
          card.type === "project" && card.year
            ? `/projects?year_min=${card.year}&year_max=${card.year}`
            : null,
        relatedCount: card.badge.related,
        ownerCount: card.badge.owners,
        creditCount: card.creditCount,
      }}
      ratio={card.type === "product" ? "1/1" : "4/3"}
      /* Mirrors the grid above step for step — see the table there. Each value
         is the widest the card gets inside that band, rounded up. */
      sizes={
        "(max-width: 767px) 45vw, (max-width: 1023px) 30vw, " +
        "(max-width: 1279px) 35vw, (max-width: 1399px) 25vw, " +
        "(max-width: 1600px) 20vw, 292px"
      }
    />
  );
}

export function ListingGrid({ items }: { items: ProfileListingCard[] }) {
  if (items.length === 0) return null;
  return (
    /*
     * FOUR across on large desktop — and the count at every OTHER width is
     * derived from the column the cards actually sit in, not from the
     * viewport.
     *
     * That distinction matters here in a way it does not on a directory page,
     * because the 288px rail enters the layout at `lg` and takes its width out
     * of the grid. Main column, measured:
     *
     *     390    358   (rail above, full width)   2 cols -> 171px
     *     768    720   (rail above, full width)   3 cols -> 229px
     *    1024    640   (rail beside)              2 cols -> 296px
     *    1280    896   (rail beside)              3 cols -> 283px
     *    1400   1016                              4 cols -> 242px
     *    1440   1056   <- the approved reference   4 cols -> 252px
     *    1600+  1216   (page capped at 1600)      4 cols -> 292px
     *
     * A first cut ran four across from `lg`, which put four cards in a 640px
     * column at 148px each — exactly the "shrink the cards to fit five"
     * failure, one column further along. The count now steps DOWN when the
     * rail appears and back up as the column earns it, so no card is ever
     * under ~170px on mobile or ~240px on desktop.
     *
     * 1400 is a custom stop rather than Tailwind's 2xl (1536): the approved
     * reference viewport is 1440, and at 2xl a 1440 window would show three.
     * ListingCardShared is untouched — only the track count changes.
     */
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-4">
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

/* ── Files ───────────────────────────────────────────────────────────────── */

/**
 * The Files view's document list.
 *
 * ── ONLY WHAT IS STORED ─────────────────────────────────────────────────────
 * Name, format, and the listing the file belongs to. NO size: `size_bytes` is
 * NULL on all 61 rows in listing_documents, so a size column would be blank or
 * fabricated on every file on the platform. No categories either — there is no
 * colour, finish or document-type column to group by, which is the same
 * finding that kept the product page's Downloads list flat.
 *
 * ── AND ONLY THROUGH THE SAFE RESOLVER ──────────────────────────────────────
 * Every href comes from documentDownloadHref, which points at
 * /api/documents/download and mints a signed URL per request. The raw
 * listing_documents.file_url is a /object/public/ address on a PRIVATE bucket:
 * linking it directly returns "Bucket not found" and, if the bucket were ever
 * opened to fix that, would expose every document with no auth and no record.
 * A row whose href cannot be built renders disabled rather than dead.
 */
export function ProfileFileList({ documents }: { documents: ProfileDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {documents.map((d) => {
        const href = documentDownloadHref({ id: d.id, listing_id: d.listingId });
        const body = (
          <>
            <FileText
              strokeWidth={1.5}
              className="h-4 w-4 shrink-0 text-muted"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-body text-[14px] text-ink">
                {d.fileName}
              </span>
              <span className="mt-0.5 block truncate font-body text-[12px] text-muted">
                {d.listingTitle}
              </span>
            </span>
            {d.format && (
              <span className="shrink-0 rounded-full border border-hairline px-2.5 py-0.5 font-body text-[11px] uppercase tracking-[0.06em] text-muted">
                {d.format}
              </span>
            )}
          </>
        );
        return (
          <li key={d.id}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 py-3.5 transition-colors hover:bg-stone/30"
              >
                {body}
                <Download
                  strokeWidth={1.5}
                  className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-ink"
                  aria-hidden
                />
              </a>
            ) : (
              <span
                className="flex items-center gap-3 py-3.5 opacity-60"
                title="This file is unavailable"
              >
                {body}
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
