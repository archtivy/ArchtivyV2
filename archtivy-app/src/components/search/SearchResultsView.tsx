import Link from "next/link";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import type { SearchEntity, SearchHit, SearchResult } from "@/lib/search/types";

/**
 * The universal results body.
 *
 * ── EVERY CONTROL IS A LINK ─────────────────────────────────────────────────
 * The tabs and the pager are anchors to the same route with a different query
 * string, not client state. So a filtered search is a URL someone can send to
 * a colleague, the back button steps through what they actually looked at, and
 * the whole page renders on the server — results are in the HTML, not fetched
 * after hydration. The directories learned this the hard way: reading the query
 * with `useSearchParams` opted them out of server rendering and left crawlers
 * looking at an empty grid.
 *
 * ── CARDS ARE THE EXISTING ONES ─────────────────────────────────────────────
 * `ListingCardShared` for projects and products, `EntityCard` for designers and
 * brands — the same components the four directories render, with no new props
 * and no search-only variant. A result should look identical to the thing it
 * points at.
 */

export type SearchTab = SearchEntity | "all";

const TABS: { key: SearchTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "project", label: "Projects" },
  { key: "product", label: "Products" },
  { key: "designer", label: "Designers" },
  { key: "brand", label: "Brands" },
];

/** The tab a hit belongs to, as a label for mixed result pages. */
const ENTITY_LABEL: Record<SearchEntity, string> = {
  project: "Project",
  product: "Product",
  designer: "Designer",
  brand: "Brand",
};

function buildHref(q: string, tab: SearchTab, page?: number): string {
  const p = new URLSearchParams();
  p.set("q", q);
  if (tab !== "all") p.set("type", tab);
  if (page && page > 1) p.set("page", String(page));
  return `/search?${p.toString()}`;
}

export function SearchResultsView({
  query,
  tab,
  result,
  intentLabel,
}: {
  query: string;
  tab: SearchTab;
  result: SearchResult;
  /** What the parser understood, e.g. "Residential · Projects · Los Angeles". */
  intentLabel: string;
}) {
  const { hits, counts, total, page, pageCount } = result;

  /*
   * The kind tag earns its place only when this page of results actually
   * holds more than one kind. On the All tab for "chair" every card is a
   * product, and stamping PRODUCT on all twenty-four of them says nothing the
   * reader cannot see — it just competes with the save control and repeats the
   * category line underneath. Decided per page rather than per tab, because
   * "All" is frequently all of one thing.
   */
  const mixedPage = new Set(hits.map((h) => h.entity)).size > 1;

  return (
    <div className="pb-24">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="border-b border-hairline pb-6 pt-2">
        <h1 className="font-display text-[28px] leading-tight text-ink md:text-[34px]">
          {query ? (
            <>
              Results for <span className="italic">“{query}”</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        <p className="mt-2 font-body text-[14px] text-muted">
          {counts.all === 0
            ? "No matches across projects, products, designers or brands."
            : `${counts.all} ${counts.all === 1 ? "result" : "results"} across projects, products, designers and brands.`}
          {/* What was understood, shown rather than hidden — a search that
              silently reinterprets the query is one nobody can correct. */}
          {intentLabel ? <span className="text-ink/60"> · Reading this as {intentLabel}</span> : null}
        </p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <nav aria-label="Result types" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex min-w-max items-center gap-1 border-b border-hairline py-3">
          {TABS.map((t) => {
            const n = t.key === "all" ? counts.all : counts[t.key];
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <Link
                  href={buildHref(query, t.key)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-[14px] transition-colors",
                    active
                      ? "bg-ink text-cream"
                      : n === 0
                        ? "text-muted hover:bg-stone/40"
                        : "text-ink hover:bg-stone/40",
                  ].join(" ")}
                >
                  {t.label}
                  <span className={active ? "text-cream/70" : "text-muted"}>{n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {hits.length === 0 ? (
        <EmptyState query={query} counts={counts} tab={tab} />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {hits.map((hit, i) => (
              <HitCard
                key={`${hit.entity}-${hit.id}`}
                hit={hit}
                priority={i < 5}
                showKind={mixedPage}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <Pager query={query} tab={tab} page={page} pageCount={pageCount} total={total} />
          )}
        </>
      )}
    </div>
  );
}

/** One result, drawn by the same card its own directory would draw. */
function HitCard({
  hit,
  priority,
  showKind,
}: {
  hit: SearchHit;
  priority: boolean;
  showKind: boolean;
}) {
  const sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw";

  if (hit.entity === "project" || hit.entity === "product") {
    return (
      <div className="relative">
        {showKind && <KindTag>{ENTITY_LABEL[hit.entity]}</KindTag>}
        <ListingCardShared
          model={{
            id: hit.id,
            type: hit.entity,
            title: hit.title,
            href: hit.href,
            imageUrl: hit.imageUrl,
            categoryLabel: hit.subtitle,
            metaLabel: hit.locationText,
            authorName: hit.ownerName,
            authorHref: hit.ownerHref,
            logoUrl: hit.avatarUrl,
            year: hit.year,
          }}
          priority={priority}
          sizes={sizes}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {showKind && <KindTag>{ENTITY_LABEL[hit.entity]}</KindTag>}
      <EntityCard
        href={hit.href}
        title={hit.title}
        subtitle={hit.locationText}
        meta={hit.subtitle}
        imageUrl={hit.imageUrl}
        avatarUrl={hit.avatarUrl}
        avatarInitials={initialsOf(hit.title)}
        priority={priority}
        sizes={sizes}
      />
    </div>
  );
}

/**
 * The kind label, shown only when a page of results genuinely mixes kinds.
 *
 * When a studio and a chair sit side by side the reader needs to know which is
 * which before clicking. When all twenty-four cards are chairs, the same label
 * repeated twenty-four times is decoration.
 */
function KindTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-ink/75 px-2.5 py-1 font-body text-[11px] uppercase tracking-wide text-cream">
      {children}
    </span>
  );
}

function EmptyState({
  query,
  counts,
  tab,
}: {
  query: string;
  counts: SearchResult["counts"];
  tab: SearchTab;
}) {
  /*
   * Nothing in THIS tab is a different problem from nothing anywhere, and
   * conflating them is how a search page tells someone their query failed when
   * it actually succeeded four tabs to the left.
   */
  const elsewhere = TABS.filter(
    (t) => t.key !== "all" && t.key !== tab && counts[t.key as SearchEntity] > 0
  );

  if (counts.all > 0 && elsewhere.length > 0) {
    return (
      <div className="mt-12 border border-hairline bg-stone/20 p-8 text-center">
        <p className="font-body text-[15px] text-ink">
          No {tab === "all" ? "results" : TABS.find((t) => t.key === tab)?.label.toLowerCase()} for
          this search — but there are matches elsewhere.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {elsewhere.map((t) => (
            <Link
              key={t.key}
              href={buildHref(query, t.key)}
              className="rounded-full border border-ink/20 px-4 py-2 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
            >
              {counts[t.key as SearchEntity]} in {t.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 border border-hairline bg-stone/20 p-10 text-center">
      <p className="font-display text-[20px] text-ink">Nothing matched “{query}”.</p>
      <p className="mx-auto mt-3 max-w-[46ch] font-body text-[14px] text-muted">
        Try a shorter phrase, a material like <em>oak</em> or <em>terrazzo</em>, a place, or the name
        of a studio or brand.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/projects"
          className="rounded-full border border-ink/20 px-4 py-2 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
        >
          Browse projects
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-ink/20 px-4 py-2 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}

function Pager({
  query,
  tab,
  page,
  pageCount,
  total,
}: {
  query: string;
  tab: SearchTab;
  page: number;
  pageCount: number;
  total: number;
}) {
  return (
    <nav
      aria-label="Result pages"
      className="mt-14 flex items-center justify-between border-t border-hairline pt-6"
    >
      {page > 1 ? (
        <Link
          href={buildHref(query, tab, page - 1)}
          rel="prev"
          className="rounded-full border border-ink/20 px-4 py-2 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="font-body text-[13px] text-muted">
        Page {page} of {pageCount} · {total} {total === 1 ? "result" : "results"}
      </span>

      {page < pageCount ? (
        <Link
          href={buildHref(query, tab, page + 1)}
          rel="next"
          className="rounded-full border border-ink/20 px-4 py-2 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
