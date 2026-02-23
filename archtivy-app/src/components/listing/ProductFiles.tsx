"use client";

import Link from "next/link";

/** Normalized file item for display. */
export interface ProductFileItem {
  name: string;
  url?: string | null;
  type?: string | null;
  size?: number | string | null;
  /** For listing_documents: id needed for download API. */
  id?: string;
}

/** Normalize documents from product.documents (jsonb). */
function normalizeDocuments(documents: unknown): ProductFileItem[] {
  const raw = documents;
  let files: unknown[] = [];
  if (Array.isArray(raw)) files = raw;
  else if (raw && typeof raw === "object" && "files" in raw && Array.isArray((raw as { files: unknown }).files))
    files = (raw as { files: unknown[] }).files;
  else files = [];

  if (files.length === 0) return [];
  return files
      .filter((d): d is Record<string, unknown> => d != null && typeof d === "object")
      .map((d) => {
        const name =
          typeof d.name === "string"
            ? d.name.trim()
            : typeof d.file_name === "string"
              ? d.file_name.trim()
              : null;
        const url =
          typeof d.url === "string"
            ? d.url.trim()
            : typeof d.file_url === "string"
              ? d.file_url.trim()
              : null;
        const type =
          typeof d.type === "string"
            ? d.type.trim()
            : typeof d.file_type === "string"
              ? d.file_type.trim()
              : null;
        const size =
          typeof d.size === "number"
            ? d.size
            : typeof d.size_bytes === "number"
              ? d.size_bytes
              : typeof d.size === "string"
                ? d.size
                : null;
        const displayName = name || (url ? url.split("/").pop() ?? "File" : "File");
        return { name: displayName, url: url || null, type: type || null, size: size ?? null };
      })
      .filter((d) => d.name);
}

function formatSize(size: number | string | null | undefined): string {
  if (size == null) return "";
  if (typeof size === "number") {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  }
  return String(size);
}

function getExtension(name: string): string {
  const ext = name.slice(name.lastIndexOf(".") + 1).toUpperCase();
  return ext && ext !== name ? ext : "";
}

export interface ProductFilesProps {
  /** Documents from product.documents (jsonb) or listing_documents mapped to same shape. */
  documents: unknown;
  /** When using listing_documents, pass listingId for download API. Otherwise urls used directly. */
  listingId?: string;
  /** When true, use download API for links (listing_documents). */
  useDownloadApi?: boolean;
  /** Pre-normalized items from listing_documents (takes precedence over documents when both empty). */
  listingDocuments?: Array<{ id: string; file_url: string; file_name: string; file_type?: string; size_bytes?: number | null }>;
}

export function ProductFiles({
  documents,
  listingId,
  useDownloadApi = false,
  listingDocuments = [],
}: ProductFilesProps) {
  let items: ProductFileItem[] = normalizeDocuments(documents);
  if (items.length === 0 && listingDocuments.length > 0) {
    items = listingDocuments.map((d) => ({
      name: d.file_name?.trim() || d.file_url?.split("/").pop() || "File",
      url: d.file_url || null,
      type: d.file_type || null,
      size: d.size_bytes ?? null,
      id: d.id,
    }));
  }

  if (items.length === 0) return null;

  return (
    <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800" aria-labelledby="product-files-heading">
      <h3 id="product-files-heading" className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Files
      </h3>
      <ul className="space-y-0 divide-y divide-zinc-100 rounded dark:divide-zinc-800" role="list">
        {items.map((item, i) => {
          const docId = item.id ?? listingDocuments[i]?.id;
          const href =
            useDownloadApi && listingId && docId
              ? `/api/documents/download?docId=${encodeURIComponent(docId)}&listingId=${encodeURIComponent(listingId)}`
              : item.url || null;
          const ext = getExtension(item.name);
          const sizeStr = formatSize(item.size);

          return (
            <li
              key={item.name + String(item.url ?? i)}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </span>
                {(ext || sizeStr) && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[ext, sizeStr].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              {href && (
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-[#002abf] hover:underline focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded"
                >
                  Download
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
