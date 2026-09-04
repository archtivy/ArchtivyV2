import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getInspirations, INSPIRATION_TABS, type InspirationTab } from "@/lib/db/inspirations";
import { getCollections } from "@/lib/db/collections";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { InspirationCard } from "@/components/inspiration/InspirationCard";
import { InspirationControls } from "@/components/inspiration/InspirationControls";
import { InspirationFilters } from "@/components/inspiration/InspirationFilters";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { HEADER_CLEARANCE } from "@/components/home/headerClearance";

/**
 * /inspiration — the feed (spec §9.6 v1 scope).
 *
 * SERVER-RENDERED. The feed itself is composed here, not fetched by the client
 * from /api/inspirations; the API exists for external consumers and for the
 * documented URL contract, but SEO-critical content must be in the initial
 * response (SEO Bible §Performance).
 *
 * INDEXATION (SEO Bible §Crawl Rules): the bare /inspiration page is indexable;
 * any FILTERED variant is noindex, because a faceted permutation competes with
 * the canonical collection page for the same query. generateMetadata derives
 * this from the actual search params rather than a hand-maintained list.
 */

export const dynamic = "force-dynamic";

function hasFilters(sp: Record<string, string | string[] | undefined>): boolean {
  return ["q", "style", "space", "element", "color", "category", "city", "yearMin", "yearMax", "hasProducts", "page"]
    .some((k) => sp[k] !== undefined);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = hasFilters(sp);

  return {
    title: "Inspiration — Architecture, Interiors & Design | Archtivy",
    description:
      "Browse architecture, interiors, products and materials from the Archtivy archive. Filter by style, space, architectural element and colour.",
    // Filtered permutations stay out of the index; the canonical collection
    // pages under /inspiration/{slug} are what search engines are pointed to.
    robots: filtered ? { index: false, follow: true } : undefined,
    alternates: { canonical: "/inspiration" },
    openGraph: {
      title: "Inspiration | Archtivy",
      description: "Architecture, interiors, products and materials from the Archtivy archive.",
      images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy Inspiration" }],
    },
  };
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function all(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  const list = (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

export default async function InspirationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tabRaw = first(sp.tab) as InspirationTab | undefined;
  const tab = tabRaw && INSPIRATION_TABS.includes(tabRaw) ? tabRaw : "all";
  const pageNum = Number.parseInt(first(sp.page) ?? "1", 10) || 1;

  const [result, collections] = await Promise.all([
    getInspirations({
      q: first(sp.q),
      tab,
      style: all(sp.style),
      space: all(sp.space),
      element: all(sp.element),
      color: all(sp.color),
      category: all(sp.category),
      city: all(sp.city),
      yearMin: Number.parseInt(first(sp.yearMin) ?? "", 10) || null,
      yearMax: Number.parseInt(first(sp.yearMax) ?? "", 10) || null,
      hasProducts: first(sp.hasProducts) === "1",
      page: pageNum,
    }),
    getCollections(),
  ]);

  const canonicalUrl = getAbsoluteUrl("/inspiration");
  const jsonLd = buildCollectionPageJsonLd({
    name: "Inspiration",
    description: "Architecture, interiors, products and materials from the Archtivy archive.",
    url: canonicalUrl,
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Inspiration", url: canonicalUrl },
  ]);

  const qs = (page: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) next.append(k, item);
    }
    if (page > 1) next.set("page", String(page));
    const s = next.toString();
    return s ? `/inspiration?${s}` : "/inspiration";
  };

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[jsonLd, breadcrumb]} />
      <HomeNav variant="solid" />

      <div className={`mx-auto max-w-content px-4 ${HEADER_CLEARANCE} md:px-12 lg:px-24`}>
        <header className="max-w-[46ch]">
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            Visual discovery
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">
            Find your next design inspiration.
          </h1>
          <p className="mt-4 font-body text-[16px] leading-[26px] text-muted">
            Architecture, interiors, products and materials from the archive — every card links
            through to the studios, brands and materials behind it.
          </p>
        </header>

        {/* ── Collections row. Absent entirely until collections exist, rather
            than rendering an empty carousel. ───────────────────────────────── */}
        {collections.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-[22px] tracking-tight text-ink">Collections</h2>
              <p className="font-body text-[12px] text-muted">Curated, updated daily</p>
            </div>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  href={c.href}
                  className="group relative flex aspect-[3/4] w-[46vw] shrink-0 flex-col justify-end overflow-hidden rounded-lg bg-stone p-4 sm:w-[30vw] lg:w-[190px]"
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
                    aria-hidden
                  />
                  <span className="relative">
                    <span className="block font-display text-[17px] leading-[1.15] text-cream">
                      {c.title}
                    </span>
                    <span className="mt-1 block font-body text-[12px] text-cream/70">
                      {c.itemCount} {c.itemCount === 1 ? "item" : "items"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <Suspense fallback={null}>
            <InspirationControls total={result.total} relaxed={result.relaxed} />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <Suspense fallback={null}>
              <InspirationFilters facets={result.facets} />
            </Suspense>
          </aside>

          <div className="min-w-0 lg:col-span-9">
            {result.items.length === 0 ? (
              <ZeroResults collections={collections.slice(0, 3)} />
            ) : (
              <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((item, i) => (
                  <InspirationCard key={`${item.entityType}-${item.id}`} item={item} priority={i < 3} />
                ))}
              </div>
            )}

            {result.totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-12 flex items-center justify-between border-t border-hairline pt-6"
              >
                {result.page > 1 ? (
                  <Link
                    href={qs(result.page - 1)}
                    className="rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink hover:bg-stone/50"
                  >
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="font-body text-[13px] text-muted">
                  Page {result.page} of {result.totalPages}
                </span>
                {result.page < result.totalPages ? (
                  <Link
                    href={qs(result.page + 1)}
                    className="rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink hover:bg-stone/50"
                  >
                    Next
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </div>
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}

/**
 * Zero-result recovery step 2 (Search Bible): the feed already auto-relaxed the
 * least-selective filter before reaching here, so if this renders, nothing at
 * all matched. Offer the nearest collections rather than a bare "no results".
 */
function ZeroResults({ collections }: { collections: { id: string; title: string; href: string }[] }) {
  return (
    <div className="rounded-xl border border-hairline px-6 py-14 text-center">
      <p className="font-body text-[15px] text-ink">Nothing in the archive matches that yet.</p>
      <p className="mx-auto mt-2 max-w-[46ch] font-body text-[13px] leading-[20px] text-muted">
        Removing a filter usually helps — the archive covers 126 projects and products today, so
        narrow combinations run out quickly.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/inspiration"
          className="rounded-full bg-ink px-4 py-2 font-body text-[13px] text-cream"
        >
          Clear all filters
        </Link>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink hover:bg-stone/50"
          >
            {c.title}
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
