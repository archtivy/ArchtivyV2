"use client";

import Link from "next/link";

export interface CompactDocumentItem {
  id: string;
  file_url: string;
  file_name: string;
}

export interface CompactDocumentsListProps {
  documents: CompactDocumentItem[];
  listingId?: string;
  /** If provided, documents use download API (signed). Otherwise direct file_url. */
  useDownloadApi?: boolean;
  className?: string;
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

/**
 * Clean list with small file icon; refined spacing. No heavy card.
 */
export function CompactDocumentsList({
  documents,
  listingId,
  useDownloadApi = false,
  className = "",
}: CompactDocumentsListProps) {
  if (documents.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Documents
      </h3>
      <ul className="space-y-2">
        {documents.map((doc) => {
          const href = useDownloadApi && listingId
            ? `/api/documents/download?docId=${encodeURIComponent(doc.id)}&listingId=${encodeURIComponent(listingId)}`
            : doc.file_url;
          const ext = doc.file_name?.slice(doc.file_name.lastIndexOf(".") + 1).toUpperCase() || "FILE";
          return (
            <li key={doc.id}>
              <Link
                href={href}
                target={href.startsWith("http") || href.startsWith("/") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2.5 text-sm text-zinc-700 transition-colors hover:text-[#002abf] dark:text-zinc-300 dark:hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                <span className="truncate">{doc.file_name}</span>
                {ext && (
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                    {ext}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
