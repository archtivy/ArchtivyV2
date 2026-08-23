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
 * Simple breadcrumb trail for archive pages.
 * Home / Projects / Residential / Houses
 */
export function ArchiveBreadcrumb({ segments, current }: ArchiveBreadcrumbProps) {
  return (
    <nav
      className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-[#374151]"
      aria-label="Breadcrumb"
    >
      <Link href="/" className="hover:text-ink transition-colors">
        Home
      </Link>
      {segments.map((seg) => (
        <span key={seg.href} className="contents">
          <span aria-hidden className="text-muted">/</span>
          <Link href={seg.href} className="hover:text-ink transition-colors">
            {seg.label}
          </Link>
        </span>
      ))}
      <span aria-hidden className="text-muted">/</span>
      <span className="text-ink font-medium">{current}</span>
    </nav>
  );
}
