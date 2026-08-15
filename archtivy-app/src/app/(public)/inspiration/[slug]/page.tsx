export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection, getCollections, MIN_INDEXABLE_ITEMS } from "@/lib/db/collections";
import { getAbsoluteUrl } from "@/lib/canonical";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { InspirationCard } from "@/components/inspiration/InspirationCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * /inspiration/{slug} — AI Collection landing page (spec §11.5).
 *
 * Server-rendered, ISR 3600. Items come from the materialised membership the
 * daily job wrote, never from a live filter run.
 *
 * INDEXATION GATE: `robots` is derived from collection.isIndexable, which the
 * daily job sets from item_count vs MIN_INDEXABLE_ITEMS. A collection that
 * decays below the threshold de-indexes itself on the next run — no manual
 * flag, nothing to remember (SEO Bible §Programmatic Pages).
 *
 * Each JSON-LD type is emitted in its own script tag (SEO Bible §Structured
 * Data) — JsonLd already renders one tag per schema in the array.
 */

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { robots: { index: false, follow: false } };

  const url = getAbsoluteUrl(`/inspiration/${collection.slug}`);

  return {
    // Authored per collection, not a template with the name swapped in — the
    // schema requires description to be >= 120 chars for exactly this reason.
    title: `${collection.title} | Archtivy`,
    description: collection.description.slice(0, 300),
    robots: collection.isIndexable ? undefined : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: collection.title,
      description: collection.description.slice(0, 300),
      url,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const url = getAbsoluteUrl(`/inspiration/${collection.slug}`);

  const collectionJsonLd = buildCollectionPageJsonLd({
    name: collection.title,
    description: collection.description,
    url,
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Inspiration", url: getAbsoluteUrl("/inspiration") },
    { name: collection.title, url },
  ]);
  // Curated ItemList of the real members (SEO Bible §Structured Data).
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: collection.title,
    numberOfItems: collection.items.length,
    itemListElement: collection.items.slice(0, 50).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: getAbsoluteUrl(item.href),
      name: item.title,
    })),
  };

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[collectionJsonLd, breadcrumb, itemListJsonLd]} />
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        <nav aria-label="Breadcrumb" className="mb-6 font-body text-[12px] text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/inspiration" className="hover:text-ink">
            Inspiration
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink">{collection.title}</span>
        </nav>

        <header className="max-w-[52ch]">
          <h1 className="font-display text-[36px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px]">
            {collection.title}
          </h1>
          <p className="mt-4 font-body text-[16px] leading-[27px] text-muted">
            {collection.description}
          </p>
          <p className="mt-4 font-body text-[13px] text-muted">
            {collection.items.length} {collection.items.length === 1 ? "item" : "items"}
            {collection.lastGeneratedAt && (
              <> · updated {new Date(collection.lastGeneratedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}</>
            )}
          </p>
        </header>

        <div className="mt-12">
          {collection.items.length === 0 ? (
            <div className="rounded-xl border border-hairline px-6 py-14 text-center">
              <p className="font-body text-[15px] text-ink">
                This collection has no items right now.
              </p>
              <p className="mx-auto mt-2 max-w-[46ch] font-body text-[13px] leading-[20px] text-muted">
                Its definition currently matches nothing in the archive. It is not indexed while
                that is true.
              </p>
              <Link
                href="/inspiration"
                className="mt-6 inline-flex rounded-full bg-ink px-4 py-2 font-body text-[13px] text-cream"
              >
                Browse everything
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {collection.items.map((item, i) => (
                <InspirationCard
                  key={`${item.entityType}-${item.id}`}
                  item={item}
                  priority={i < 3}
                />
              ))}
            </div>
          )}
        </div>

        {/* Visible only to us in dev — a collection below the bar is not an
            error, but it should be obvious why it is not being indexed. */}
        {!collection.isIndexable && process.env.NODE_ENV !== "production" && (
          <p className="mt-8 rounded-lg bg-stone/50 px-4 py-3 font-body text-[12px] text-muted">
            Not indexable: {collection.items.length} items, threshold is {MIN_INDEXABLE_ITEMS}.
          </p>
        )}
      </div>

      <HomeFooter />
    </div>
  );
}
