import Link from "next/link";
import Image from "next/image";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import { getListingUrl } from "@/lib/canonical";
import { documentDownloadHref } from "@/lib/documents/downloadHref";
import { TYPE, SURFACE, BTN_PRIMARY } from "@/components/admin/ui/tokens";
import type {
  ProfileListingCard,
  ProfileMiniProfile,
  ProfileDocument,
} from "@/lib/db/profilePage";

/**
 * Profile page modules.
 *
 * Every module here follows the SeenInProjects rule: render nothing at all when
 * there is no data, rather than a titled section wrapped around an empty state.
 * With 23 project<->product link rows platform-wide, most of these are absent on
 * most profiles — which is why ProfileEmptyState below carries more weight than
 * any single module.
 *
 * Visual language is the admin/wizard one, imported from admin/ui/tokens rather
 * than restated, so a token change lands here too. No new design system.
 */

/* ── Section shell ───────────────────────────────────────────────────────── */

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
    <section className="mt-14 first:mt-0">
      <h2 className="mb-5 font-display text-[22px] tracking-[-0.01em] text-ink">
        {title}
        {count != null && count > 0 && (
          <span className="ml-2.5 font-body text-[15px] text-muted">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function listingHref(c: ProfileListingCard): string {
  return getListingUrl({
    id: c.id,
    type: c.type,
    slug: c.slug,
    taxonomy_slug_path: c.taxonomySlugPath,
  });
}

/* ── Listing grid ────────────────────────────────────────────────────────── */

export function ListingGrid({ items }: { items: ProfileListingCard[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
      {items.map((c) => (
        <li key={c.id}>
          <EntityCard
            href={listingHref(c)}
            title={c.title}
            subtitle={c.byline}
            imageUrl={c.cover}
            avatarInitials={c.byline ? initialsOf(c.byline) : undefined}
            sizes="(max-width: 640px) 45vw, 22vw"
          />
        </li>
      ))}
    </ul>
  );
}

/* ── People row (brands used / specified by / collaborators) ─────────────── */

export function PeopleRow({ people }: { people: ProfileMiniProfile[] }) {
  if (people.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
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
              <span className="block truncate font-body text-[14px] text-ink">{p.displayName}</span>
              {p.label && (
                <span className="block truncate font-body text-[12px] text-muted">{p.label}</span>
              )}
            </span>
          </>
        );
        const cls =
          "flex items-center gap-3 rounded-xl border border-hairline bg-white px-3.5 py-2.5 transition-colors";
        // Only link when a username resolves — /u/id/{uuid} works too, but the
        // username URL is the canonical one and the id route redirects to it.
        return (
          <li key={p.id}>
            {p.username ? (
              <Link href={`/u/${encodeURIComponent(p.username)}`} className={`${cls} hover:bg-stone/25`}>
                {inner}
              </Link>
            ) : (
              <Link href={`/u/id/${p.id}`} className={`${cls} hover:bg-stone/25`}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Tag row (style / locations) ─────────────────────────────────────────── */

export function TagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <li
          key={t}
          className="rounded-full border border-hairline px-3 py-1 font-body text-[13px] text-muted"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

/* ── Catalogue downloads (brand) ─────────────────────────────────────────── */

export function DocumentList({ documents }: { documents: ProfileDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="max-w-[60ch] space-y-2">
      {documents.map((d) => {
        // Same rule as the product page: never link to listing_documents.file_url,
        // which is a /object/public/ address on a private bucket.
        const href = documentDownloadHref({ id: d.id, listing_id: d.listingId });
        const label = (
          <>
            <span className="min-w-0 flex-1 truncate font-body text-[14px] text-ink">
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
                className="flex items-center gap-3 rounded-xl border border-hairline bg-white px-4 py-3 transition-colors hover:bg-stone/25"
              >
                {label}
              </a>
            ) : (
              <span
                className="flex items-center gap-3 rounded-xl border border-hairline bg-white px-4 py-3 opacity-60"
                title="This file is unavailable"
              >
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
 * Shown when a profile has no published work at all — true for roughly 85% of
 * profiles today (18 of 149 designers and 15 of 47 brands have any approved
 * listing), so this IS the page for most visitors.
 *
 * Two audiences, deliberately different:
 *   OWNER   — a soft prompt with the one action that changes the state. Not a
 *             banner, not a nag; they already know the profile is empty.
 *   VISITOR — a calm, finished-looking statement. No CTA: a visitor cannot
 *             publish on someone else's behalf, so urging them to do anything
 *             would be noise, and "nothing here yet" should not read as broken.
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
      <div className={`${SURFACE} px-6 py-10 text-center sm:px-10 sm:py-14`}>
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
    <div className="border-t border-hairline py-14 text-center">
      <p className="font-body text-[15px] text-ink">
        {displayName} hasn&rsquo;t published any {noun} yet.
      </p>
      <p className={`${TYPE.pageSubtitle} mt-2`}>
        Follow to be notified when they do.
      </p>
    </div>
  );
}
