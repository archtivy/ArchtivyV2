"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2, Check, X } from "lucide-react";
import { createPin, deletePin, reviewPin } from "@/app/actions/productTags";
import {
  STATUS_LABELS,
  PUBLIC_STATUSES,
  type ManagedImage,
  type TaggableProduct,
  type VerificationStatus,
} from "@/lib/db/productTags";

/**
 * Pin placement surface. Click a photo, pick a product, get a hotspot.
 *
 * ── ONE COMPONENT, TWO HOMES ────────────────────────────────────────────────
 * This was PinEditor, private to /me/listings/[id]. The publish wizard now needs
 * the same interaction inside its Products step, and click-to-place hotspot
 * maths duplicated across two components is the kind of pair that drifts until
 * one of them is subtly wrong. So it moved here and is shared.
 *
 * Two things had to change to make it portable:
 *
 *   1. REFRESHING IS THE CALLER'S JOB. It used to call router.refresh() itself,
 *      which works on the management page because `images` is an RSC prop. In
 *      the wizard the same data arrives from a server action, and router.refresh
 *      would reload the route without touching it. `onChanged` lets each host
 *      reload the way its own data actually arrives.
 *
 *   2. EDITORIAL TOKENS, NOT ZINC. The wizard is cream/ink and has no dark
 *      counterpart, so the old zinc + dark: styling rendered as a grey slab
 *      inside it. Restyling rather than forking means the management page picks
 *      up the same look — a visible change to that page, made deliberately.
 *
 * Positions are stored as PERCENTAGES of the rendered image box, so a pin lands
 * in the same place at every viewport. Nothing here works in pixels.
 *
 * STATUS IS ALWAYS VISIBLE on a pin. An AI-suggested pin is labelled and looks
 * different from an owner-placed one, and only `verified`/`official` pins are
 * public — matching the RLS policy exactly, so what the owner sees marked
 * "public" is genuinely what a visitor sees.
 */
export function ProductPinEditor({
  images,
  products,
  tagsTableReady,
  onChanged,
  initialImageId,
  emptyHint = "This listing has no images yet. Pins are placed on photos, so add images first.",
}: {
  images: ManagedImage[];
  /**
   * Which photo to open on. Set by the tagging grid, which is a view onto the
   * SAME editor rather than a second one: the caller says "start on this
   * image" and everything below — placing, searching, existing pins, the
   * image strip that moves between photos — is unchanged.
   */
  initialImageId?: string | null;
  products: TaggableProduct[];
  tagsTableReady: boolean;
  /** Called after any successful mutation so the host can reload its own data. */
  onChanged: () => void;
  emptyHint?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState(initialImageId ?? images[0]?.id ?? null);

  // Follow the caller when it names a different photo — reopening the grid on
  // a new image must move the canvas, not just remount around a stale id.
  useEffect(() => {
    if (initialImageId) setActiveId(initialImageId);
  }, [initialImageId]);
  const [placing, setPlacing] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const active = images.find((i) => i.id === activeId) ?? images[0] ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Already pinned here is not a candidate: the unique constraint would
    // reject it, and offering it only to fail is a worse answer than hiding it.
    const taken = new Set(active?.pins.map((p) => p.taggedListingId) ?? []);
    return products
      .filter((p) => !taken.has(p.id))
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          (p.brandName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, query, active]);

  if (images.length === 0) {
    return (
      <p className="rounded-2xl border border-hairline px-6 py-12 text-center font-body text-[14px] text-muted">
        {emptyHint}
      </p>
    );
  }

  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!tagsTableReady) return;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    setPlacing({
      x: Math.min(100, Math.max(0, Number(x.toFixed(2)))),
      y: Math.min(100, Math.max(0, Number(y.toFixed(2)))),
    });
    setQuery("");
    setError(null);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setPlacing(null);
      onChanged();
    });
  }

  return (
    <div className="space-y-6">
      {/* The flag goes false on ANY read failure, not only a missing table, so
          the copy does not assert a specific cause it cannot know. */}
      {!tagsTableReady && (
        <p className="rounded-2xl border border-hairline bg-stone/40 px-4 py-3 font-body text-[13px] text-ink">
          Product tags couldn&rsquo;t be loaded, so tagging is unavailable right now. Existing
          pins are safe — reload in a moment, and if it persists this is worth reporting.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[#F6E4E4] px-3 py-2 font-body text-[13px] text-[#7A2222]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {/* ── Canvas ──────────────────────────────────────────────────── */}
          <div
            ref={canvasRef}
            onClick={onCanvasClick}
            className={`relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-stone/50 ${
              tagsTableReady ? "cursor-crosshair" : ""
            }`}
          >
            {active && (
              <Image
                src={active.url}
                alt={active.alt ?? ""}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-contain"
              />
            )}

            {active?.pins.map((pin) => {
              const isPublic = PUBLIC_STATUSES.includes(pin.verificationStatus);
              return (
                <span
                  key={pin.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                >
                  <span
                    title={`${pin.productTitle} — ${STATUS_LABELS[pin.verificationStatus]}`}
                    className={`block h-4 w-4 rounded-full border-2 border-cream shadow ${
                      isPublic ? "bg-ink" : "bg-[#B8860B]"
                    }`}
                  />
                </span>
              );
            })}

            {placing && (
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${placing.x}%`, top: `${placing.y}%` }}
              >
                <span className="block h-4 w-4 animate-pulse rounded-full border-2 border-cream bg-archtivy-primary shadow motion-reduce:animate-none" />
              </span>
            )}
          </div>

          <p className="mt-2 font-body text-[12px] text-muted">
            {tagsTableReady
              ? "Click anywhere on the photo to place a pin."
              : "Placement is unavailable right now."}
          </p>

          {/* ── Image strip ─────────────────────────────────────────────── */}
          {images.length > 1 && (
            <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => (
                <li key={img.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(img.id);
                      setPlacing(null);
                    }}
                    aria-pressed={img.id === active?.id}
                    className={`relative block h-14 w-20 overflow-hidden rounded-lg border-2 ${
                      img.id === active?.id ? "border-ink" : "border-transparent"
                    }`}
                  >
                    <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                    {img.pins.length > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-ink/80 px-1 font-body text-[10px] text-cream">
                        {img.pins.length}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Side panel ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {placing && (
            <div className="rounded-2xl border border-hairline p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-body text-[14px] text-ink">Which product?</h3>
                <button
                  type="button"
                  onClick={() => setPlacing(null)}
                  aria-label="Cancel"
                  className="text-muted hover:text-ink"
                >
                  <X strokeWidth={1.5} className="h-4 w-4" />
                </button>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                autoFocus
                className="mt-2 w-full rounded-lg border border-ink/25 bg-transparent px-3 py-2 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          createPin({
                            listingImageId: active!.id,
                            taggedListingId: p.id,
                            xPercent: placing.x,
                            yPercent: placing.y,
                          })
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-stone/50 disabled:opacity-50"
                    >
                      <Plus strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="min-w-0">
                        <span className="block truncate font-body text-[14px] text-ink">
                          {p.title}
                        </span>
                        {p.brandName && (
                          <span className="block truncate font-body text-[12px] text-muted">
                            {p.brandName}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-2 font-body text-[13px] text-muted">No matching product.</li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-hairline p-4">
            <h3 className="font-body text-[14px] text-ink">
              Pinned on this photo{" "}
              <span className="text-muted">({active?.pins.length ?? 0})</span>
            </h3>

            {(active?.pins.length ?? 0) === 0 ? (
              <p className="mt-2 font-body text-[13px] text-muted">
                Nothing pinned yet. Products pinned here appear on the public page.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {active!.pins.map((pin) => (
                  <li key={pin.id} className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <Link
                        href={pin.productHref}
                        className="block truncate font-body text-[14px] text-ink hover:underline"
                      >
                        {pin.productTitle}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={pin.verificationStatus} />
                        {pin.tagSource === "ai" && (
                          <span className="rounded bg-[#EADFC8] px-1.5 py-0.5 font-body text-[10px] text-[#5C4413]">
                            AI detected
                            {pin.aiConfidence != null &&
                              ` · ${Math.round(pin.aiConfidence * 100)}%`}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="flex shrink-0 gap-1">
                      {/* Confirm/reject only where there is something to decide. */}
                      {pin.tagSource === "ai" &&
                        !PUBLIC_STATUSES.includes(pin.verificationStatus) &&
                        pin.verificationStatus !== "rejected" && (
                          <>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => reviewPin(pin.id, "confirm"))}
                              aria-label={`Confirm ${pin.productTitle}`}
                              className="rounded-lg p-1 text-muted hover:bg-stone/50 hover:text-ink disabled:opacity-50"
                            >
                              <Check strokeWidth={1.5} className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => reviewPin(pin.id, "reject"))}
                              aria-label={`Reject ${pin.productTitle}`}
                              className="rounded-lg p-1 text-muted hover:bg-stone/50 hover:text-ink disabled:opacity-50"
                            >
                              <X strokeWidth={1.5} className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => deletePin(pin.id))}
                        aria-label={`Remove ${pin.productTitle}`}
                        className="rounded-lg p-1 text-muted hover:bg-stone/50 hover:text-ink disabled:opacity-50"
                      >
                        <Trash2 strokeWidth={1.5} className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const isPublic = PUBLIC_STATUSES.includes(status);
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-body text-[10px] ${
        isPublic ? "bg-ink text-cream" : "bg-stone text-ink"
      }`}
      title={isPublic ? "Visible on the public page" : "Not shown publicly"}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
