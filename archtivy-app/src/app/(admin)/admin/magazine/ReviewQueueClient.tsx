"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  publishArticle,
  rejectArticle,
  setArticleFeatured,
} from "@/app/actions/articles";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import { SegmentedButtons, EmptyState } from "@/components/admin/ui/AdminPageShell";
import {
  SURFACE,
  TYPE,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "@/components/admin/ui/tokens";

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
 * Article review queue.
 *
 * Every transition is authorised server-side inside the action — this component
 * cannot publish anything by sending a different status, because status is
 * never part of the payload. Publish only accepts an article already in
 * pending_review; reject requires a note the author will see. That contract is
 * unchanged by this redesign.
 *
 * What changed: it was one undifferentiated list mixing articles awaiting a
 * decision with articles already live, and it carried dark-mode classes no
 * other admin screen has. Now the two states are separate tabs, because "what
 * needs me" and "what is published" are different jobs.
 */
type Tab = "queue" | "published";

export function ReviewQueueClient({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const queued = rows.filter((r) => r.status === "pending_review");
  const published = rows.filter((r) => r.status === "published");
  const [tab, setTab] = useState<Tab>(queued.length > 0 ? "queue" : "published");

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

  const visible = tab === "queue" ? queued : published;

  return (
    <div className="space-y-5">
      <SegmentedButtons<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "queue", label: "Awaiting review", count: queued.length },
          { value: "published", label: "Published", count: published.length },
        ]}
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 font-body text-[14px] text-red-700"
        >
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "queue" ? "Nothing awaiting review" : "Nothing published yet"}
          hint={
            tab === "queue"
              ? "Articles submitted for review appear here."
              : "Approved articles appear here once published."
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <article key={r.id} className={`${SURFACE} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status === "pending_review" ? (
                      <StatusPill tone="attention" dot>
                        Awaiting review
                      </StatusPill>
                    ) : (
                      <StatusPill tone="positive" dot>
                        Published
                      </StatusPill>
                    )}
                    {r.isFeatured && <StatusPill tone="info">Featured</StatusPill>}
                    {r.topic && <StatusPill tone="neutral">{r.topic}</StatusPill>}
                    <span className={TYPE.meta}>{r.readTimeMinutes} min read</span>
                  </div>

                  <h2 className="mt-2.5 font-body text-[18px] font-semibold tracking-[-0.01em] text-ink">
                    {r.title}
                  </h2>
                  <p className={`mt-1 ${TYPE.cellSecondary}`}>by {r.authorName}</p>
                </div>

                {r.status === "published" && r.slug && (
                  <Link
                    href={`/magazine/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className={BTN_SECONDARY}
                  >
                    View live
                  </Link>
                )}
              </div>

              {r.dek && (
                <p className="mt-3 font-body text-[15px] leading-relaxed text-ink/80">{r.dek}</p>
              )}
              <p className="mt-2.5 line-clamp-3 whitespace-pre-wrap font-body text-[14px] leading-relaxed text-muted">
                {r.bodyExcerpt}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {r.status === "pending_review" && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => publishArticle(r.id))}
                      className={BTN_PRIMARY}
                    >
                      {pending ? "Working…" : "Publish"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setRejecting(rejecting === r.id ? null : r.id)}
                      aria-expanded={rejecting === r.id}
                      className={BTN_SECONDARY}
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
                    className={BTN_SECONDARY}
                  >
                    {r.isFeatured ? "Remove from featured" : "Feature on the index"}
                  </button>
                )}
              </div>

              {rejecting === r.id && (
                <div className="mt-4 border-t border-hairline pt-4">
                  <label
                    htmlFor={`note-${r.id}`}
                    className="font-body text-[14px] font-medium text-ink"
                  >
                    What should the author change?
                  </label>
                  <p className={`mt-0.5 ${TYPE.meta}`}>
                    The author sees this note, so be specific.
                  </p>
                  <textarea
                    id={`note-${r.id}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className={`${INPUT} mt-2 h-auto resize-none py-2.5`}
                  />
                  <button
                    type="button"
                    disabled={pending || !note.trim()}
                    onClick={() => run(() => rejectArticle(r.id, note))}
                    className={`${BTN_PRIMARY} mt-3`}
                  >
                    Send back with note
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
