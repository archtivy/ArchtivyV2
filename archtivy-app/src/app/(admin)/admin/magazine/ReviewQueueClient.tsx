"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  publishArticle,
  rejectArticle,
  setArticleFeatured,
} from "@/app/actions/articles";

export interface QueueRow {
  id: string;
  title: string;
  dek: string | null;
  status: string;
  slug: string | null;
  authorName: string;
  topic: string | null;
  readTimeMinutes: number;
  isFeatured: boolean;
  updatedAt: string;
  bodyExcerpt: string;
}

/**
 * Article review queue actions.
 *
 * Every transition is authorised server-side inside the action — this component
 * cannot publish anything by sending a different status, because status is
 * never part of the payload. Publish only accepts an article already in
 * pending_review; reject requires a note the author will see.
 */
export function ReviewQueueClient({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else {
        setRejecting(null);
        setNote("");
        router.refresh();
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Nothing waiting for review.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {rows.map((r) => (
        <article
          key={r.id}
          className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                {[r.topic, `${r.readTimeMinutes} min read`, r.status.replace("_", " ")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {r.title}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                by {r.authorName}
              </p>
            </div>

            {r.status === "published" && r.slug && (
              <Link
                href={`/magazine/${r.slug}`}
                target="_blank"
                className="shrink-0 text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
              >
                View live
              </Link>
            )}
          </div>

          {r.dek && (
            <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{r.dek}</p>
          )}
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-500">
            {r.bodyExcerpt}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {r.status === "pending_review" && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => publishArticle(r.id))}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Publish
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setRejecting(rejecting === r.id ? null : r.id)}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100"
                >
                  Send back
                </button>
              </>
            )}

            {r.status === "published" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setArticleFeatured(r.id, !r.isFeatured))}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100"
              >
                {r.isFeatured ? "Remove from featured" : "Feature on the index"}
              </button>
            )}
          </div>

          {rejecting === r.id && (
            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <label
                htmlFor={`note-${r.id}`}
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                What should the author change?
              </label>
              <textarea
                id={`note-${r.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                disabled={pending || !note.trim()}
                onClick={() => run(() => rejectArticle(r.id, note))}
                className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Send back with note
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
