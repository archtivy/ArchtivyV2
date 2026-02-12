"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import type { ListingDocument } from "@/lib/types/listings";

const PREVIEW_SIZE = 52;

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function getExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toUpperCase() : "FILE";
}

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string): boolean {
  return IMAGE_MIMES.has(mime?.toLowerCase?.());
}

function truncateName(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 3) + "…";
}

interface ProductSidebarDocumentsProps {
  documents: ListingDocument[];
  listingId: string;
  /** Full URL to redirect back after sign-in (e.g. getAbsoluteUrl(currentPath)). */
  signInRedirectUrl: string;
}

export function ProductSidebarDocuments({
  documents,
  listingId,
  signInRedirectUrl,
}: ProductSidebarDocumentsProps) {
  if (documents.length === 0) return null;

  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(signInRedirectUrl)}`;

  return (
    <aside
      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
      aria-labelledby="sidebar-documents-title"
    >
      <h2
        id="sidebar-documents-title"
        className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        Documents
      </h2>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        Downloads require an account.
      </p>
      <ul className="space-y-3">
        {documents.map((doc) => {
          const ext = getExtension(doc.file_name);
          const mime = doc.file_type || doc.mime_type || "";
          const isImageType = isImage(mime);
          const isPdf = mime.toLowerCase().includes("pdf");
          const downloadUrl = `/api/documents/download?docId=${encodeURIComponent(doc.id)}&listingId=${encodeURIComponent(listingId)}`;

          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200/80 bg-white p-2 dark:border-zinc-700/80 dark:bg-zinc-800/80"
            >
              {/* Preview: image thumbnail (signed-in only), PDF icon, or type tile */}
              <div
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700"
                aria-hidden
              >
                {isImageType ? (
                  <>
                    <SignedIn>
                      {/* eslint-disable-next-line @next/next/no-img-element -- preview uses redirect to signed URL */}
                      <img
                        src={downloadUrl}
                        alt=""
                        width={PREVIEW_SIZE}
                        height={PREVIEW_SIZE}
                        className="h-full w-full object-cover"
                      />
                    </SignedIn>
                    <SignedOut>
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                        IMG
                      </span>
                    </SignedOut>
                  </>
                ) : isPdf ? (
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                    PDF
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {ext || "FILE"}
                  </span>
                )}
              </div>

              {/* File info + Download */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  title={doc.file_name}
                >
                  {truncateName(doc.file_name, 28)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {ext}
                  {doc.size_bytes != null && doc.size_bytes > 0 && (
                    <> · {formatSize(doc.size_bytes)}</>
                  )}
                </p>
              </div>
              <div className="shrink-0">
                <SignedIn>
                  <a
                    href={downloadUrl}
                    className="inline-block rounded-[20px] border border-zinc-300 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Download
                  </a>
                </SignedIn>
                <SignedOut>
                  <span
                    className="inline-block rounded-[20px] border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                    aria-label="Sign in to download"
                  >
                    Locked
                  </span>
                </SignedOut>
              </div>
            </li>
          );
        })}
      </ul>
      <SignedOut>
        <p className="mt-4">
          <Button as="link" href={signInHref} variant="primary">
            Sign in to download
          </Button>
        </p>
      </SignedOut>
    </aside>
  );
}
