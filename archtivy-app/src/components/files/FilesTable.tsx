import Link from "next/link";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
import { documentDownloadHref } from "@/lib/documents/downloadHref";
import type { DownloadedFile } from "@/lib/db/documentDownloads";

/**
 * The file table.
 *
 * ── ONLY COLUMNS WITH DATA BEHIND THEM ──────────────────────────────────────
 * File name + its listing, type, source, download date, and the action. The
 * reference also draws a SIZE column: size_bytes is NULL on all 61 documents
 * today, so rather than print 61 dashes the column renders only when at least
 * one row in view actually has a size. Applying the proposed storage backfill
 * (supabase/migrations-review) turns it on with no code change, and new uploads
 * now carry it because listingDocumentsWrite finally writes the value it was
 * already being passed.
 *
 * ── EVERY LINK GOES THROUGH THE SAFE RESOLVER ───────────────────────────────
 * Never listing_documents.file_url — that is a /object/public/ address on a
 * private bucket. documentDownloadHref points at /api/documents/download, which
 * signs a fresh 60-second URL per request, so access is re-checked at click
 * time rather than inherited from whenever the file was first fetched.
 *
 * ── AND ROWS DEGRADE HONESTLY ───────────────────────────────────────────────
 * A document since deleted, or whose listing was unpublished, stays listed and
 * says "No longer available" rather than disappearing or 404ing. file_name and
 * listing_title are denormalised at download time precisely so that row is
 * still readable once the source is gone.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const HEAD =
  "px-4 py-3 text-left font-body text-[11px] font-medium uppercase tracking-[0.08em] text-muted";
const CELL = "px-4 py-4 align-middle";

export function FilesTable({ files }: { files: DownloadedFile[] }) {
  // The column appears only when the data does — see the note above.
  const showSize = files.some((f) => f.sizeBytes != null);

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="border-b border-hairline">
          <tr>
            <th scope="col" className={HEAD}>File name</th>
            <th scope="col" className={HEAD}>Type</th>
            <th scope="col" className={HEAD}>Source</th>
            <th scope="col" className={HEAD}>Downloaded</th>
            {showSize && <th scope="col" className={HEAD}>Size</th>}
            <th scope="col" className={`${HEAD} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => {
            const href = f.stillAvailable
              ? documentDownloadHref({ id: f.listingDocumentId, listing_id: f.listingId })
              : null;
            return (
              <tr
                key={f.listingDocumentId ?? `${f.fileName}:${f.downloadedAt}`}
                className="border-b border-hairline last:border-b-0 transition-colors hover:bg-stone/25"
              >
                <td className={CELL}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone/70">
                      <FileText strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-body text-[14px] text-ink">
                        {f.fileName}
                      </span>
                      {f.listingTitle && (
                        <span className="mt-0.5 block truncate font-body text-[12px] text-muted">
                          {f.listingHref ? (
                            <Link href={f.listingHref} className="hover:text-ink hover:underline">
                              {f.listingTitle}
                            </Link>
                          ) : (
                            f.listingTitle
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                <td className={CELL}>
                  <span className="font-body text-[13px] text-muted">{f.format ?? "—"}</span>
                </td>

                <td className={CELL}>
                  {f.source ? (
                    <div className="flex items-center gap-2.5">
                      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-stone">
                        {f.source.avatarUrl && (
                          <Image
                            src={f.source.avatarUrl}
                            alt=""
                            fill
                            sizes="28px"
                            className="object-contain"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-body text-[13px] text-ink">
                          {f.source.href ? (
                            <Link href={f.source.href} className="hover:underline">
                              {f.source.name}
                            </Link>
                          ) : (
                            f.source.name
                          )}
                        </span>
                        {/* The publisher's role, which is the honest version of
                            the reference's separate Brand and Designer columns
                            — both are listings.owner_profile_id. */}
                        <span className="block truncate font-body text-[12px] capitalize text-muted">
                          {f.source.role === "other" ? "" : f.source.role}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="font-body text-[13px] text-muted">—</span>
                  )}
                </td>

                <td className={CELL}>
                  <span className="whitespace-nowrap font-body text-[13px] text-muted">
                    {formatDate(f.downloadedAt)}
                  </span>
                  {f.downloadCount > 1 && (
                    <span className="mt-0.5 block whitespace-nowrap font-body text-[12px] text-muted">
                      {f.downloadCount} downloads
                    </span>
                  )}
                </td>

                {showSize && (
                  <td className={CELL}>
                    <span className="whitespace-nowrap font-body text-[13px] text-muted">
                      {f.sizeBytes != null ? formatSize(f.sizeBytes) : "—"}
                    </span>
                  </td>
                )}

                <td className={`${CELL} text-right`}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/25 px-4 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
                    >
                      <Download strokeWidth={1.5} className="h-4 w-4" aria-hidden />
                      Download
                    </a>
                  ) : (
                    <span className="whitespace-nowrap font-body text-[13px] text-muted">
                      No longer available
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
