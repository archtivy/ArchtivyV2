"use client";

import Link from "next/link";
import { normalizeDocuments, type DocFile } from "@/lib/utils/normalizeDocuments";

export interface FilesSectionProps {
  /** Raw from product.documents (jsonb) or similar */
  raw: unknown;
  /** Pre-normalized from listing_documents (fallback when raw normalizes empty) */
  listingDocuments?: Array<{ id: string; file_url: string; file_name: string; file_type?: string }>;
  listingId?: string;
  useDownloadApi?: boolean;
  /** Product/project title used to generate clean document display names. */
  listingTitle?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getExt(name?: string | null, url?: string): string {
  const n = (name ?? "").split(".").pop()?.toLowerCase();
  if (n && n.length <= 5) return n.toUpperCase();
  const u = (url ?? "").toLowerCase();
  const m = u.match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? m[1].toUpperCase() : "";
}

function formatSize(size?: number | null): string {
  if (size == null) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

/**
 * Generate a clean document display name from filename + optional listing title.
 * Strips storage-appended UUID hashes and converts separators to spaces.
 * Falls back to "{listingTitle} Documentation" when the filename is unreadable.
 */
function cleanDocumentTitle(
  fileName: string | null | undefined,
  listingTitle: string | null | undefined,
  index: number
): string {
  const suffix = index > 0 ? ` (${index + 1})` : "";
  const base = listingTitle?.trim();

  if (fileName) {
    const withoutExt = fileName.replace(/\.[a-z0-9]{2,6}$/i, "");
    // Strip UUID-like trailing hash appended by storage (e.g. "Name_aliJ9I7Mx")
    const stripped = withoutExt
      .replace(/_[a-zA-Z0-9]{6,}$/, "")
      .replace(/-[a-zA-Z0-9]{6,}$/, "");
    const readable = stripped.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();

    if (readable.length >= 4 && !/^[0-9\s]+$/.test(readable)) {
      return readable + suffix;
    }
  }

  if (base) return `${base} Documentation${suffix}`;
  return `Document${suffix}`;
}

// ── Icon ───────────────────────────────────────────────────────────────────────

function DocIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FilesSection({
  raw,
  listingDocuments = [],
  listingId,
  useDownloadApi = false,
  listingTitle,
}: FilesSectionProps) {
  let items: (DocFile & { id?: string })[] = normalizeDocuments(raw);
  if (items.length === 0 && listingDocuments.length > 0) {
    items = listingDocuments.map((d) => ({
      url: d.file_url,
      name: d.file_name ?? "File",
      mime: d.file_type ?? undefined,
      id: d.id,
    }));
  }
  if (items.length === 0) return null;

  return (
    <section
      className="border-t border-zinc-100 pt-6 dark:border-zinc-800"
      aria-labelledby="files-section-heading"
    >
      <h2
        id="files-section-heading"
        className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400"
      >
        Files
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          const docId = "id" in item ? item.id : listingDocuments[i]?.id;
          const href =
            useDownloadApi && listingId && docId
              ? `/api/documents/download?docId=${encodeURIComponent(docId)}&listingId=${encodeURIComponent(listingId)}`
              : item.url;

          const displayTitle = cleanDocumentTitle(item.name, listingTitle, i);
          const ext = getExt(item.name, item.url);
          const sizeStr = formatSize(item.size);
          const metaLine = [ext, sizeStr].filter(Boolean).join(" · ");

          return (
            <div
              key={item.url + String(i)}
              className="flex items-center gap-3 bg-white dark:bg-zinc-900"
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              {/* Icon */}
              <div className="shrink-0 text-neutral-400 dark:text-zinc-500">
                <DocIcon />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <span
                  className="block line-clamp-1 text-[13px] text-neutral-900 dark:text-zinc-100"
                  style={{ fontWeight: 500 }}
                >
                  {displayTitle}
                </span>
                {metaLine && (
                  <span
                    className="block text-[13px] text-neutral-400 dark:text-zinc-500"
                  >
                    {metaLine}
                  </span>
                )}
              </div>

              {/* Download */}
              {href && (
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="shrink-0 inline-flex items-center justify-center rounded border border-zinc-300 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  style={{ borderRadius: 6 }}
                >
                  Download
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
