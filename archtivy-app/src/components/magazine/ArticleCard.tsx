import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { initialsOf } from "@/components/home/EntityCard";
import type { ArticleSummary } from "@/lib/db/articles";

/**
 * WHY THIS IS NOT EntityCard — stated explicitly, per the brief's rule against
 * silently forking a card.
 *
 * EntityCard's anatomy is image -> location -> title -> subtitle -> meta ->
 * chips, with the avatar as a BADGE OVERLAID ON THE IMAGE. An article card is
 * kicker + date -> headline -> dek -> a byline ROW that places a small avatar
 * INLINE beside the author's name and read time, below the text.
 *
 * The blocking difference is the byline: EntityCard has no slot in which an
 * avatar sits inline with text, and adding one would mean a second avatar
 * position plus a third text row on a component now used by four directory
 * pages. That is a worse trade than a small editorial card that owns its own
 * anatomy. Everything shareable is still shared — initialsOf() comes from
 * EntityCard, and the tokens, ratios and hover behaviour match it exactly.
 *
 * Related-entity strips on Article Detail DO use EntityCard, because there the
 * item genuinely is a project/product/professional, not an article.
 */

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DATE.format(d);
}

export function Byline({
  article,
  tone = "ink",
}: {
  article: ArticleSummary;
  tone?: "ink" | "cream";
}) {
  const { author, readTimeMinutes } = article;
  const muted = tone === "cream" ? "text-cream/70" : "text-muted";
  const strong = tone === "cream" ? "text-cream" : "text-ink";

  return (
    <span className="flex items-center gap-2.5">
      {author && (
        <span
          className={[
            "relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full font-body text-[10px]",
            tone === "cream" ? "bg-cream/20 text-cream" : "bg-stone text-ink",
          ].join(" ")}
        >
          {author.avatarUrl ? (
            <Image src={author.avatarUrl} alt="" fill sizes="28px" className="object-cover" />
          ) : (
            initialsOf(author.name)
          )}
        </span>
      )}
      <span className={`min-w-0 font-body text-[12px] leading-[16px] ${muted}`}>
        {author && <span className={strong}>By {author.name}</span>}
        <span className="block">
          {[formatDate(article.publishedAt), `${readTimeMinutes} min read`]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </span>
  );
}

/** Featured Stories row: text overlaid on the cover, editorial scale. */
export function FeaturedArticleCard({
  article,
  priority = false,
}: {
  article: ArticleSummary;
  priority?: boolean;
}) {
  return (
    <Link
      href={article.href}
      className="group relative flex aspect-[4/5] min-w-0 flex-col justify-end overflow-hidden rounded-lg bg-stone p-5"
    >
      {article.cover && (
        <Image
          src={article.cover}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 24vw"
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      )}
      {/* Scrim keeps the overlaid text legible over any photograph. Opacity
          steps are multiples of 5 — Tailwind silently drops anything else. */}
      <span
        className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
        aria-hidden
      />

      <span className="relative">
        {article.topic && (
          <span className="font-body text-[11px] uppercase tracking-[0.12em] text-cream/70">
            {article.topic}
          </span>
        )}
        <span className="mt-2 block font-display text-[22px] leading-[1.15] tracking-tight text-cream">
          {article.title}
        </span>
        {article.dek && (
          <span className="mt-2 line-clamp-2 block font-body text-[13px] leading-[19px] text-cream/80">
            {article.dek}
          </span>
        )}
        <span className="mt-4 flex items-end justify-between gap-3">
          <Byline article={article} tone="cream" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream/15 text-cream">
            <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Latest Articles grid: image left, editorial text right. */
export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link href={article.href} className="group flex min-w-0 gap-4">
      <span className="relative aspect-[4/3] w-[38%] shrink-0 overflow-hidden rounded-lg bg-stone">
        {article.cover && (
          <Image
            src={article.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 40vw, 16vw"
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="font-body text-[11px] uppercase tracking-[0.12em] text-muted">
          {[article.topic, formatDate(article.publishedAt)].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-1.5 block font-display text-[19px] leading-[1.2] tracking-tight text-ink">
          {article.title}
        </span>
        {article.dek && (
          <span className="mt-1.5 line-clamp-2 block font-body text-[13px] leading-[19px] text-muted">
            {article.dek}
          </span>
        )}
        <span className="mt-3 block">
          <Byline article={article} />
        </span>
      </span>
    </Link>
  );
}
