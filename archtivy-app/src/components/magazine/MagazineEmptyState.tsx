import Link from "next/link";
import { PenLine } from "lucide-react";

/**
 * The real launch state. There are zero published articles, so this is what
 * /magazine actually renders today — not seeded stories, not placeholder
 * bylines, not the reference screenshot's invented authors.
 *
 * Blueprint §17: say why it is empty, and offer the specific action that fills
 * it. The action here is real — /add/article is built and works.
 */
export function MagazineEmptyState() {
  return (
    <div className="rounded-xl border border-hairline px-6 py-20 text-center">
      <PenLine strokeWidth={1.5} className="mx-auto h-6 w-6 text-muted" aria-hidden />
      <h2 className="mt-5 font-display text-[26px] leading-tight tracking-tight text-ink">
        No stories published yet.
      </h2>
      <p className="mx-auto mt-3 max-w-[52ch] font-body text-[15px] leading-[24px] text-muted">
        The Magazine is written by the people on Archtivy — architects, designers and brands
        writing about the work in the archive. Nothing has been published yet, so there is
        genuinely nothing here to show.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/add/article"
          className="rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-opacity hover:opacity-90"
        >
          Be the first to write one
        </Link>
        <Link
          href="/projects"
          className="rounded-full border border-ink/25 px-5 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
        >
          Browse the archive
        </Link>
      </div>
    </div>
  );
}
