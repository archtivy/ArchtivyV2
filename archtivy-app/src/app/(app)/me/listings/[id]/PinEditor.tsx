"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
 * Pin placement surface — the Products tab of the owner project-management page
 * (Image 1, scoped to this tab only for v1).
 *
 * Positions are stored as PERCENTAGES of the rendered image box, so a pin lands
 * in the same place at every viewport. Nothing here works in pixels.
 *
 * STATUS IS ALWAYS VISIBLE on a pin. An AI-suggested pin is labelled and looks
 * different from an owner-placed one, and only `verified`/`official` pins are
 * public — matching the RLS policy exactly, so what the owner sees marked
 * "public" is genuinely what a visitor sees.
 */
export function PinEditor({
  images,
  products,
  tagsTableReady,
}: {
  images: ManagedImage[];
  products: TaggableProduct[];
  tagsTableReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState(images[0]?.id ?? null);
  const [placing, setPlacing] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const active = images.find((i) => i.id === activeId) ?? images[0] ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set(active?.pins.map((p) => p.taggedListingId) ?? []);
    return products
      .filter((p) => !taken.has(p.id))
      .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.brandName ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query, active]);

  if (images.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        This listing has no images yet. Pins are placed on photos, so add images first.
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
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else {
        setPlacing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {!tagsTableReady && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code>product_tags</code> table does not exist yet. Apply{" "}
          <code>supabase/migrations-review/20260808_product_tags.REVIEW.sql</code> to enable
          tagging. Existing pins and placement are disabled until then.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {/* ── Canvas ──────────────────────────────────────────────────── */}
          <div
            ref={canvasRef}
            onClick={onCanvasClick}
            className={`relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900 ${
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
                priority
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
                    className={`block h-4 w-4 rounded-full border-2 border-white shadow ${
                      isPublic ? "bg-zinc-900" : "bg-amber-500"
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
                <span className="block h-4 w-4 animate-pulse rounded-full border-2 border-white bg-blue-600 shadow" />
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            {tagsTableReady
              ? "Click anywhere on the photo to place a pin."
              : "Placement disabled until the migration is applied."}
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
                    className={`relative block h-14 w-20 overflow-hidden rounded border-2 ${
                      img.id === active?.id ? "border-zinc-900 dark:border-zinc-100" : "border-transparent"
                    }`}
                  >
                    <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                    {img.pins.length > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-zinc-900/80 px-1 text-[10px] text-white">
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
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Which product?
                </h3>
                <button
                  type="button"
                  onClick={() => setPlacing(null)}
                  aria-label="Cancel"
                  className="text-zinc-500"
                >
                  <X strokeWidth={1.5} className="h-4 w-4" />
                </button>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                autoFocus
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900"
                    >
                      <Plus strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span className="min-w-0">
                        <span className="block truncate text-zinc-900 dark:text-zinc-100">
                          {p.title}
                        </span>
                        {p.brandName && (
                          <span className="block truncate text-xs text-zinc-500">{p.brandName}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-2 py-2 text-sm text-zinc-500">No matching product.</li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pins on this photo{" "}
              <span className="font-normal text-zinc-500">({active?.pins.length ?? 0})</span>
            </h3>

            {(active?.pins.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Nothing pinned yet. Products pinned here appear on the public page.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {active!.pins.map((pin) => (
                  <li key={pin.id} className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <Link
                        href={pin.productHref}
                        className="block truncate text-sm text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {pin.productTitle}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={pin.verificationStatus} />
                        {pin.tagSource === "ai" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
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
                              className="rounded p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                            >
                              <Check strokeWidth={1.5} className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => reviewPin(pin.id, "reject"))}
                              aria-label={`Reject ${pin.productTitle}`}
                              className="rounded p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
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
                        className="rounded p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
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
      className={`rounded px-1.5 py-0.5 text-[10px] ${
        isPublic
          ? "bg-emerald-100 text-emerald-900"
          : status === "rejected"
            ? "bg-zinc-200 text-zinc-700"
            : "bg-zinc-100 text-zinc-700"
      }`}
      title={isPublic ? "Visible on the public page" : "Not shown publicly"}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
