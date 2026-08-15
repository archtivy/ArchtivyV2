export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArticle, getPublishedArticleSlugs, type ArticleDetail } from "@/lib/db/articles";
import { renderMarkdown, excerptFrom } from "@/lib/markdown/render";
import { getAbsoluteUrl } from "@/lib/canonical";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import { ArticleCard, Byline } from "@/components/magazine/ArticleCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * /magazine/[slug] — editorial pacing (Blueprint §25), not the Entity Detail
 * relationship rail. No sidebar competes with the text: the body holds a ~68ch
 * measure at every viewport, and related material sits BELOW the article rather
 * than beside it.
 *
 * Related entities reuse EntityCard — there the item genuinely is a project,
 * product or professional. Related articles use ArticleCard. Neither is a new
 * component.
 */

export async function generateStaticParams() {
  const slugs = await getPublishedArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { robots: { index: false, follow: false } };

  const description = article.dek?.trim() || excerptFrom(article.bodyMarkdown);
  const url = getAbsoluteUrl(`/magazine/${article.slug}`);

  return {
    title: `${article.title} | Archtivy Magazine`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url,
      publishedTime: article.publishedAt ?? undefined,
      authors: article.author ? [article.author.name] : undefined,
      images: article.cover ? [{ url: article.cover, alt: article.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.cover ? [article.cover] : undefined,
    },
  };
}

function buildArticleJsonLd(article: ArticleDetail, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek ?? excerptFrom(article.bodyMarkdown),
    mainEntityOfPage: url,
    ...(article.cover ? { image: [article.cover] } : {}),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.author
      ? {
          author: {
            "@type": "Person",
            name: article.author.name,
            ...(article.author.href ? { url: getAbsoluteUrl(article.author.href) } : {}),
          },
        }
      : {}),
    publisher: { "@type": "Organization", name: "Archtivy", url: getAbsoluteUrl("/") },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const url = getAbsoluteUrl(`/magazine/${article.slug}`);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Magazine", url: getAbsoluteUrl("/magazine") },
    { name: article.title, url },
  ]);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[buildArticleJsonLd(article, url), breadcrumbJsonLd]} />
      <HomeNav variant="solid" />

      <article className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        <nav aria-label="Breadcrumb" className="mb-6 font-body text-[12px] text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/magazine" className="hover:text-ink">
            Magazine
          </Link>
        </nav>

        {/* ── Header. Measure held at editorial width even on wide screens. */}
        <header className="mx-auto max-w-[42rem]">
          {article.topic && (
            <p className="font-body text-[12px] uppercase tracking-[0.12em] text-muted">
              {article.topic}
            </p>
          )}
          <h1 className="mt-3 font-display text-[34px] leading-[1.1] tracking-[-0.02em] text-ink sm:text-[46px]">
            {article.title}
          </h1>
          {article.dek && (
            <p className="mt-4 font-body text-[18px] leading-[28px] text-muted">{article.dek}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-hairline py-4">
            {article.author?.href ? (
              <Link href={article.author.href} className="hover:opacity-80">
                <Byline article={article} />
              </Link>
            ) : (
              <Byline article={article} />
            )}
          </div>
        </header>

        {/* ── Hero image, wider than the text measure. */}
        {article.cover && (
          <figure className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-xl bg-stone">
            <Image
              src={article.cover}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 80vw"
              className="object-cover"
            />
          </figure>
        )}

        {/* ── Body. ~68 characters per line, never full-bleed. */}
        <div className="mx-auto mt-10 max-w-[42rem]">
          {renderMarkdown(article.bodyMarkdown)}
        </div>

        {/* ── Related entities the author tagged. */}
        {article.related.length > 0 && (
          <section className="mx-auto mt-16 max-w-[42rem]">
            <h2 className="mb-5 font-body text-[13px] uppercase tracking-[0.12em] text-muted">
              Mentioned in this story
            </h2>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
              {article.related.map((r) => (
                <EntityCard
                  key={`${r.kind}-${r.id}`}
                  href={r.href}
                  title={r.title}
                  subtitle={r.subtitle}
                  meta={r.kind === "professional" ? "Designer" : capitalize(r.kind)}
                  imageUrl={r.cover}
                  avatarInitials={initialsOf(r.title)}
                  sizes="(max-width: 640px) 45vw, 22vw"
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Related articles. */}
        {article.relatedArticles.length > 0 && (
          <section className="mt-20 border-t border-hairline pt-10">
            <h2 className="mb-6 font-display text-[22px] tracking-tight text-ink">
              More from the Magazine
            </h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
              {article.relatedArticles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </article>

      <HomeFooter />
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
