import { FileText, Download } from "lucide-react";
import { documentDownloadHref } from "@/lib/documents/downloadHref";
import type { DetailDocument } from "@/lib/db/projectDetail";

/**
 * Drawings and documents. Lifted out of the retired tab strip unchanged,
 * and self-suppressing: no project carries a document today, so this section
 * is invisible in production and activates the first time one is attached.
 *
 * Links go through documentDownloadHref, never file_url — the stored address
 * is the /object/public/ form against a private bucket and always answers
 * "Bucket not found". Fixing it here is what stops the defect reappearing the
 * first time a drawing is uploaded.
 */
export function ProjectDrawings({
  documents,
  listingId,
}: {
  documents: DetailDocument[];
  listingId: string;
}) {
  if (documents.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="project-drawings-heading">
      <h2
        id="project-drawings-heading"
        className="mb-6 font-display text-[24px] tracking-tight text-ink"
      >
        Drawings &amp; Documents
        <span className="ml-2.5 font-body text-[16px] text-muted">{documents.length}</span>
      </h2>

      <ul className="max-w-[52ch] space-y-2">
        {documents.map((d) => {
          const href = documentDownloadHref({ id: d.id, listing_id: listingId });
          const label = (
            <>
              <FileText strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-body text-[14px] text-ink">{d.name}</span>
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
                  className="flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 transition-colors hover:bg-stone/40"
                >
                  {label}
                </a>
              ) : (
                <span
                  className="flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 opacity-60"
                  title="This file is unavailable"
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
