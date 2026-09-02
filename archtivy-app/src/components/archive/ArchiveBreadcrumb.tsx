import Link from "next/link";

export interface BreadcrumbSegment {
  label: string;
  href: string;
}

interface ArchiveBreadcrumbProps {
  segments: BreadcrumbSegment[];
  /** Final non-linked label (current page). */
  current: string;
}

/**
 * Crawlable breadcrumb trail: Home / Projects / Commercial / Showroom.
 *
 * Real <Link>s to real taxonomy ancestors — the same paths the BreadcrumbList
 * JSON-LD emits, so the markup and the structured data cannot disagree.
 *
 * Styling is copied from the breadcrumb ProjectDetailView and ProductDetailView
 * already render — 12px, muted, px-2 separators, ink for the current node —
 * rather than invented here, so arriving at a category from a listing does not
 * change how the trail looks. The old zinc/#374151 palette was the last piece
 * of legacy styling on this page.
 */
export function ArchiveBreadcrumb({ segments, current }: ArchiveBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 font-body text-[12px] text-muted">
      <Link href="/" className="hover:text-ink">
        Home
      </Link>
      {segments.map((seg) => (
        <span key={seg.href}>
          <span className="px-2" aria-hidden>
            /
          </span>
          <Link href={seg.href} className="hover:text-ink">
            {seg.label}
          </Link>
        </span>
      ))}
      <span className="px-2" aria-hidden>
        /
      </span>
      <span className="text-ink">{current}</span>
    </nav>
  );
}
