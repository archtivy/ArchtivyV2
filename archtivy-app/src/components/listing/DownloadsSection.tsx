"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { ListingDocument } from "@/lib/types/listings";
import { documentDownloadHref } from "@/lib/documents/downloadHref";

export function DownloadsSection({
  documents = [],
}: {
  documents?: ListingDocument[];
}) {
  const hasDocuments = documents.length > 0;

  return (
    <section
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
      aria-labelledby="downloads-heading"
    >
      <h2
        id="downloads-heading"
        className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
      >
        Downloads
      </h2>
      <SignedOut>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to download files.
        </p>
        <p className="mt-3">
          <Button as="link" href="/sign-in" variant="primary">
            Sign in to download
          </Button>
        </p>
      </SignedOut>
      <SignedIn>
        {!hasDocuments ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No files attached to this listing.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((doc) => {
              // Was href={doc.file_url} — a /object/public/ URL on a private
              // bucket, which always answered "Bucket not found".
              const href = documentDownloadHref(doc);
              const label = (
                <>
                  <span>{doc.file_name}</span>
                  <span className="text-zinc-500 dark:text-zinc-400" aria-hidden>
                    ({doc.file_type.split("/").pop() ?? "file"})
                  </span>
                </>
              );
              return (
                <li key={doc.id}>
                  {href ? (
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-archtivy-primary underline hover:opacity-90"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SignedIn>
    </section>
  );
}
