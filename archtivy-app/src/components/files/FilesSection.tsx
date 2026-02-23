"use client";

import Link from "next/link";
import Image from "next/image";
import { normalizeDocuments, type DocFile } from "@/lib/utils/normalizeDocuments";

export interface FilesSectionProps {
  /** Raw from product.documents (jsonb) or similar */
  raw: unknown;
  /** Pre-normalized from listing_documents (fallback when raw normalizes empty) */
  listingDocuments?: Array<{ id: string; file_url: string; file_name: string; file_type?: string }>;
  listingId?: string;
  useDownloadApi?: boolean;
}

function getExt(name?: string | null, url?: string): string {
  const n = (name ?? "").split(".").pop()?.toLowerCase();
  if (n && n.length <= 5) return `.${n}`;
  const u = (url ?? "").toLowerCase();
  const m = u.match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? `.${m[1]}` : "";
}

function isImage(mime?: string | null, url?: string): boolean {
  const t = (mime ?? "").toLowerCase();
  const u = (url ?? "").toLowerCase();
  return t.includes("image") || /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(u);
}

function isPdf(mime?: string | null, url?: string): boolean {
  const t = (mime ?? "").toLowerCase();
  const u = (url ?? "").toLowerCase();
  return t.includes("pdf") || u.endsWith(".pdf") || u.includes(".pdf?");
}

function formatSize(size?: number | null): string {
  if (size == null) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function DocIconSmall({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function FileIconSmall({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

export function FilesSection({
  raw,
  listingDocuments = [],
  listingId,
  useDownloadApi = false,
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
        FILES
      </h2>
      <div className="divide-y divide-neutral-200 rounded-[10px] border border-neutral-200 bg-white dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50">
        {items.map((item, i) => {
          const docId = "id" in item ? item.id : listingDocuments[i]?.id;
          const href =
            useDownloadApi && listingId && docId
              ? `/api/documents/download?docId=${encodeURIComponent(docId)}&listingId=${encodeURIComponent(listingId)}`
              : item.url;
          const ext = getExt(item.name, item.url);
          const sizeStr = formatSize(item.size);
          const metaLine = [ext, sizeStr].filter(Boolean).join(" · ");

          return (
            <div
              key={item.url + String(i)}
              className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-neutral-50/50 sm:px-4 dark:hover:bg-zinc-800/50"
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-neutral-200 bg-neutral-50 dark:border-zinc-700 dark:bg-zinc-800">
                {isImage(item.mime, item.url) && item.url ? (
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={item.url.startsWith("http")}
                    sizes="48px"
                  />
                ) : isPdf(item.mime, item.url) ? (
                  item.url ? (
                    <iframe
                      src={`${item.url}#page=1&view=FitH`}
                      title=""
                      className="h-full w-full border-0"
                      tabIndex={-1}
                    />
                  ) : (
                    <DocIconSmall className="h-[18px] w-[18px] stroke-neutral-600 dark:stroke-zinc-400" />
                  )
                ) : (
                  <FileIconSmall className="h-[18px] w-[18px] stroke-neutral-600 dark:stroke-zinc-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block line-clamp-1 text-[13px] font-medium text-neutral-900 dark:text-zinc-100">
                  {item.name ?? "File"}
                </span>
                {metaLine && (
                  <span className="block text-[12px] text-neutral-500 dark:text-zinc-400">
                    {metaLine}
                  </span>
                )}
              </div>
              {href && (
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="shrink-0 inline-flex items-center justify-center rounded-full border border-[#002abf] px-3 py-1.5 text-[12px] font-medium text-[#002abf] transition-colors hover:bg-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 dark:hover:bg-[#002abf] dark:hover:text-white"
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
