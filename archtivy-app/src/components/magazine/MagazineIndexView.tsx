"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ArticleCard, FeaturedArticleCard } from "@/components/magazine/ArticleCard";
import { MagazineEmptyState } from "@/components/magazine/MagazineEmptyState";
import { NewsletterBand } from "@/components/magazine/NewsletterBand";
import type { MagazineIndex } from "@/lib/db/articles";
import type { HeroFeature } from "@/lib/db/heroFeature";

/**
 * Magazine index body (brief §3).
 *
 * Topic filtering is client-side over the full published set, matching every
 * other directory on this platform. Topics come from the SHARED taxonomy —
 * `articles.topic_node_id` is an FK into taxonomy_nodes, never a free-text
 * category (Blueprint §25) — and only topics with >= 1 real published article
 * are listed, the same measure-first rule the filter rails follow.
 */
export function MagazineIndexView({
  data,
  feature,
}: {
  data: MagazineIndex;
  feature: HeroFeature | null;
}) {
  const [topic, setTopic] = useState<string | null>(null);

  const latest = useMemo(
    () => (topic ? data.latest.filter((a) => a.topicSlug === topic) : data.latest),
    [data.latest, topic]
  );

  const hasArticles = data.total > 0;

  return (
    <div>
      {/* ── Header band ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl bg-stone/60">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="min-w-0 px-6 py-10 sm:px-10 sm:py-14 lg:col-span-6">
            <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              Archtivy Magazine
            </p>
            <h1 className="mt-3 max-w-[14ch] font-display text-[40px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[56px]">
              Design. Architecture. Ideas that inspire.
            </h1>
            <p className="mt-4 max-w-[46ch] font-body text-[16px] leading-[26px] text-muted">
              Stories on architecture, design, materials and people — written by the
              practitioners in the archive and linked to the work they discuss.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {/* Anchors, not routes: both targets are on this page. When there
                  are no articles, neither section exists, so the CTAs collapse
                  to the one action that is real — writing the first piece. */}
              {hasArticles ? (
                <>
                  <a
                    href="#articles"
                    className="rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-opacity hover:opacity-90"
                  >
                    Explore Articles
                  </a>
                  <a
                    href="#topics"
                    className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-5 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-cream"
                  >
                    Browse Topics
                    <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </>
              ) : (
                <Link
                  href="/add/article"
                  className="rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-opacity hover:opacity-90"
                >
                  Write the first story
                </Link>
              )}
            </div>
          </div>

          <div className="relative min-h-[220px] lg:col-span-6">
            {feature && (
              <Image
                src={feature.imageUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            )}
            {feature && (
              <p className="absolute bottom-2 left-4 font-body text-[11px] text-cream/70">
                Pictured:{" "}
                <Link
                  href={feature.href}
                  className="underline decoration-cream/40 underline-offset-2"
                >
                  {feature.title}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {!hasArticles ? (
        <div className="mt-10">
          <MagazineEmptyState />
        </div>
      ) : (
        <>
          {/* ── Featured Stories ─────────────────────────────────────────── */}
          {data.featured.length > 0 && (
            <section className="mt-14">
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2 className="font-display text-[22px] tracking-tight text-ink">
                  Featured Stories
                </h2>
                <a
                  href="#articles"
                  className="inline-flex items-center gap-1.5 font-body text-[13px] text-muted hover:text-ink"
                >
                  View all stories
                  <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
              {/* Only real featured articles — the row shrinks rather than
                  padding to four. Scrolls horizontally below lg. */}
              <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
                {data.featured.map((a, i) => (
                  <div key={a.id} className="w-[76vw] shrink-0 sm:w-[45vw] lg:w-auto">
                    <FeaturedArticleCard article={a} priority={i === 0} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Topics + Latest ──────────────────────────────────────────── */}
          <div id="articles" className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <aside id="topics" className="min-w-0 lg:col-span-3">
              <div className="rounded-xl border border-hairline p-5">
                <h2 className="mb-3 font-body text-[14px] text-ink">Topics</h2>
                {/* Horizontal pill bar below lg, list above — same adaptation
                    the directory rails use. */}
                <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0">
                  <TopicItem
                    label="All Topics"
                    count={data.total}
                    active={topic === null}
                    onClick={() => setTopic(null)}
                  />
                  {data.topics.map((t) => (
                    <TopicItem
                      key={t.slug}
                      label={t.label}
                      count={t.count}
                      active={topic === t.slug}
                      onClick={() => setTopic(t.slug)}
                    />
                  ))}
                </ul>
              </div>
            </aside>

            <div className="min-w-0 lg:col-span-9">
              <h2 className="mb-5 font-display text-[22px] tracking-tight text-ink">
                Latest Articles
              </h2>
              {latest.length === 0 ? (
                <p className="rounded-xl border border-hairline px-6 py-12 text-center font-body text-[14px] text-muted">
                  Nothing published under this topic yet.{" "}
                  <button
                    type="button"
                    onClick={() => setTopic(null)}
                    className="text-ink underline underline-offset-4"
                  >
                    Show all topics
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                  {latest.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <NewsletterBand />
    </div>
  );
}

function TopicItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={[
          "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-[13px] transition-colors lg:rounded lg:px-2",
          active ? "bg-ink text-cream lg:bg-stone/70 lg:text-ink" : "text-muted hover:text-ink",
        ].join(" ")}
      >
        <span className="truncate">{label}</span>
        <span className="opacity-60">{count}</span>
      </button>
    </li>
  );
}
