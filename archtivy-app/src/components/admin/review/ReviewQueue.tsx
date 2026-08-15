"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveListingAction } from "@/app/(admin)/admin/_actions/listings";
import { StatusPill, ListingStatusPill } from "@/components/admin/ui/StatusPill";
import { TYPE, SURFACE, BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/ui/tokens";

/**
 * Verification queue — the shared review/approve surface.
 *
 * ── WHY THIS IS BUILT HERE ──────────────────────────────────────────────────
 * The brief asked me to reuse the Dashboard redesign's Verification Queue
 * rather than build a second one. That component does not exist on any branch
 * in this repo — the Dashboard redesign has not landed. /admin/magazine already
 * carries a comment recording the same discovery from the Magazine round.
 *
 * So this IS that component, built once, in a shared location, taking a
 * generic row shape. When the Dashboard work lands it should import this
 * rather than add its own — which is exactly what the consistency requirement
 * was asking for, just resolved in the other direction.
 *
 * Not a table, deliberately. A queue is read one item at a time and acted on;
 * the cover image and the reason it is pending are the whole point, and both
 * disappear in a 14px table cell. The tables elsewhere in the admin area are
 * for scanning inventory — a different job.
 */

export interface ReviewItem {
  id: string;
  kind: "project" | "product";
  title: string;
  status: string;
  coverImageUrl: string | null;
  /** Location, year, category — whatever identifies it at a glance. */
  meta: string[];
  ownerName: string | null;
  imageCount: number;
  createdAt: string;
  /** Admin detail route. */
  href: string;
  /** Public route, for previewing what approval would publish. */
  previewHref: string;
  /** Things a reviewer should know before approving. Never fabricated — each
   *  is derived from a real null/empty field on the row. */
  warnings: string[];
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveListingAction(item.id);
      if (!res.ok) {
        setError(res.error ?? "Approval failed.");
        return;
      }
      setApproved(true);
      router.refresh();
    });
  };

  return (
    <article
      className={[
        "flex gap-5 p-5 transition-opacity duration-300",
        approved ? "opacity-50" : "",
      ].join(" ")}
    >
      {/* Cover. Fixed ratio so a queue of mixed images stays on a grid. */}
      <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-hairline bg-stone/30 sm:block">
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-body text-[11px] uppercase tracking-[0.1em] text-muted">
              No cover
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ListingStatusPill status={item.status} />
          <StatusPill tone="neutral">{item.kind === "project" ? "Project" : "Product"}</StatusPill>
          <span className={TYPE.meta}>{timeAgo(item.createdAt)}</span>
        </div>

        <h3 className="mt-2 font-body text-[17px] font-semibold tracking-[-0.01em] text-ink">
          <Link href={item.href} className="hover:underline">
            {item.title}
          </Link>
        </h3>

        <p className={`mt-1 ${TYPE.cellSecondary}`}>
          {[
            item.ownerName ? `by ${item.ownerName}` : null,
            ...item.meta,
            `${item.imageCount} ${item.imageCount === 1 ? "image" : "images"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {item.warnings.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {item.warnings.map((w) => (
              <li key={w}>
                <StatusPill tone="attention">{w}</StatusPill>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 font-body text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {approved ? (
            <StatusPill tone="positive" dot>
              Approved — now live
            </StatusPill>
          ) : (
            <>
              <button
                type="button"
                onClick={approve}
                disabled={isPending}
                className={BTN_PRIMARY}
              >
                {isPending ? "Approving…" : "Approve"}
              </button>
              <Link href={item.href} className={BTN_SECONDARY}>
                Review details
              </Link>
              <Link
                href={item.previewHref}
                target="_blank"
                rel="noreferrer"
                className={BTN_SECONDARY}
              >
                Preview
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function ReviewQueue({
  items,
  title = "Awaiting review",
  emptyHint,
}: {
  items: ReviewItem[];
  title?: string;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <section className={`${SURFACE} px-6 py-12 text-center`}>
        <p className={TYPE.sectionTitle}>Nothing awaiting review</p>
        <p className={`mt-1.5 ${TYPE.pageSubtitle}`}>
          {emptyHint ?? "Submissions appear here as soon as they are sent for review."}
        </p>
      </section>
    );
  }

  return (
    <section className={`overflow-hidden ${SURFACE}`}>
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-cream/60 px-5 py-3.5">
        <h2 className={TYPE.sectionTitle}>{title}</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-body text-[12px] font-medium tabular-nums text-amber-700">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="divide-y divide-hairline/60">
        {items.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
