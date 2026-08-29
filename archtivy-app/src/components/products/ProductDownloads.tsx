import { FileText, Download } from "lucide-react";
import { RailPanel } from "@/components/entity/RelationshipRail";
import { documentDownloadHref } from "@/lib/documents/downloadHref";
import type { ProductDetailDocument } from "@/lib/db/productDetail";

/**
 * Downloads — spec sheets, catalogues, CAD files — in the sticky sidebar,
 * directly under the brand card.
 *
 * ── WHY IT LEFT THE TABS ────────────────────────────────────────────────────
 * A download is the thing a specifier came for, and it was behind a click on a
 * tab that only appeared on the 49 of 80 products that have a file. Nothing
 * about a file list needs a tab: there is no competing panel to switch to now
 * that Details has been folded into the specification rows. Rendered directly,
 * it travels with the sticky column and stays reachable while the description
 * scrolls.
 *
 * ── FLAT LIST, NOT FOLDERS ──────────────────────────────────────────────────
 * Checked before building: `listing_documents` has no colour, finish or
 * document-category column. `file_type` holds a MIME string with exactly two
 * values across all 60 product documents (application/pdf x49,
 * application/zip x11) — a file FORMAT, not a catalogue grouping — and
 * size_bytes is null on every row. Grouping by format would put 49 files in a
 * folder called "PDF" and 11 in one called "ZIP", which is filing, not
 * navigation. Ten products have more than one document; the rest have exactly
 * one, where any grouping is meaningless by definition.
 *
 * So: a flat list, with the format shown as a tag because that much is real.
 * The moment a genuine grouping column exists this becomes a real decision;
 * inventing folder names ahead of it would not.
 *
 * Renders nothing when the product has no documents.
 */
export function ProductDownloads({
  documents,
  listingId,
}: {
  documents: ProductDetailDocument[];
  listingId: string;
}) {
  if (documents.length === 0) return null;

  return (
    <RailPanel title={`Downloads (${documents.length})`}>
      <ul className="space-y-2">
        {documents.map((d) => {
          /*
           * NOT d.url. That is listing_documents.file_url, stored in the
           * /object/public/ form against a PRIVATE bucket, so it answers
           * {"error":"Bucket not found","code":"NoSuchBucket"} every time.
           * documentDownloadHref points at the route that mints a fresh signed
           * URL per request — see lib/documents/downloadHref.ts.
           */
          const href = documentDownloadHref({ id: d.id, listing_id: listingId });
          const body = (
            <>
              <FileText strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-body text-[13px] text-ink">{d.name}</span>
                {d.format && (
                  <span className="mt-0.5 block font-body text-[11px] uppercase tracking-[0.08em] text-muted">
                    {d.format}
                  </span>
                )}
              </span>
              <Download strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </>
          );
          return (
            <li key={d.id}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5 transition-colors hover:bg-stone/40"
                >
                  {body}
                </a>
              ) : (
                /* A file whose href cannot be built is shown, dimmed and
                   inert, rather than dropped: the product does have the
                   document, and silently hiding it would read as "no
                   downloads" instead of "this one file is unavailable". */
                <span
                  className="flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5 opacity-60"
                  title="This file is unavailable"
                >
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </RailPanel>
  );
}
