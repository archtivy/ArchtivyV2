import Link from "next/link";

interface ArchivePaginationProps {
  /** Current 1-based page number */
  currentPage: number;
  totalPages: number;
  /** Base path without query params, e.g. "/projects/residential" */
  basePath: string;
}

/** Build the href for a given page (page 1 = no ?page param). */
function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/**
 * Build a window of page numbers around the current page.
 * Always shows first, last, current ±2, with -1 as ellipsis placeholder.
 */
function buildPageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
    pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(-1); // ellipsis
    }
    result.push(sorted[i]);
  }
  return result;
}

/**
 * SSR-friendly pagination with crawlable <Link> elements.
 * Only renders when totalPages > 1.
 */
export function ArchivePagination({
  currentPage,
  totalPages,
  basePath,
}: ArchivePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageWindow(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={pageHref(basePath, currentPage - 1)}
          className="inline-flex h-9 items-center rounded px-3 text-sm text-muted hover:bg-stone/60"
          rel="prev"
        >
          &larr; Prev
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center rounded px-3 text-sm text-muted">
          &larr; Prev
        </span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === -1 ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted"
          >
            &hellip;
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            className="inline-flex h-9 w-9 items-center justify-center rounded bg-ink text-sm font-medium text-cream"
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(basePath, p)}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-sm text-muted hover:bg-stone/60"
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={pageHref(basePath, currentPage + 1)}
          className="inline-flex h-9 items-center rounded px-3 text-sm text-muted hover:bg-stone/60"
          rel="next"
        >
          Next &rarr;
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center rounded px-3 text-sm text-muted">
          Next &rarr;
        </span>
      )}
    </nav>
  );
}
