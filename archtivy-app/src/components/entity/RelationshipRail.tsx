import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Relationship Rail — the persistent right-hand panel stack (Blueprint §21).
 *
 * Reduced to RailPanel alone. UsedInProjectPanel, DetailsPanel and
 * RelatedPanel all lost their last caller when Project Detail was rebuilt as a
 * two-column page and Product Detail moved its rails below the fold: the
 * relationships they drew are now full-width sections rendering the canonical
 * shared card, not sidebar miniatures. Deleted rather than left orphaned.
 *
 * Generic on purpose: Product Detail and Professional Profile reuse the same
 * panel primitive, so this lives in components/entity/ alongside Gallery.
 *
 * "Relationships are as valuable as entities" — this rail is the literal
 * interface expression of that, which is why it renders on every tab rather
 * than only on Overview.
 */

export function RailPanel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-cream p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-body text-[15px] text-ink">{title}</h2>
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {linkLabel}
            <ArrowRight strokeWidth={1.5} className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
