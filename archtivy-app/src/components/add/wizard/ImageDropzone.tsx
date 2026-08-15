"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, X, GripVertical, Star } from "lucide-react";
import { uploadGalleryImageClient } from "@/lib/storage/clientUpload";
import type { UploadedGalleryItem } from "@/lib/storage/types";

/**
 * Drag-and-drop gallery upload.
 *
 * Real drop target with live state, per-file progress, drag-to-reorder and
 * inline alt text — not a bare <input type="file">. Uses the SAME
 * uploadGalleryImageClient + UploadedGalleryItem contract the old form used, so
 * createProject's `gallery` JSON payload is unchanged; only the surface differs.
 *
 * `alt` already exists on UploadedGalleryItem, so no new type is introduced.
 * Alt text is edited here rather than in a later step because it belongs to the
 * image, and because the SEO checklist scores it — asking for it three screens
 * away from the photo it describes is how it ends up empty.
 */

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_MB = 15;

export function ImageDropzone({
  items,
  onChange,
}: {
  items: UploadedGalleryItem[];
  onChange: (next: UploadedGalleryItem[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const ingest = useCallback(
    async (files: File[]) => {
      const accepted: File[] = [];
      const rejected: string[] = [];
      for (const f of files) {
        if (!ACCEPT.includes(f.type)) rejected.push(`${f.name}: use JPG, PNG, WebP or AVIF`);
        else if (f.size > MAX_MB * 1024 * 1024) rejected.push(`${f.name}: over ${MAX_MB}MB`);
        else accepted.push(f);
      }
      setErrors(rejected);
      if (accepted.length === 0) return;

      setPending((n) => n + accepted.length);
      // Sequential rather than parallel: a dozen concurrent uploads on a phone
      // connection stalls them all and the progress count stops moving.
      const added: UploadedGalleryItem[] = [];
      for (const file of accepted) {
        try {
          const uploaded = await uploadGalleryImageClient(file);
          if (uploaded) added.push({ ...uploaded, alt: "" });
        } catch (err) {
          setErrors((e) => [...e, `${file.name}: ${err instanceof Error ? err.message : "upload failed"}`]);
        } finally {
          setPending((n) => Math.max(0, n - 1));
        }
      }
      if (added.length > 0) onChange([...items, ...added]);
    },
    [items, onChange]
  );

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const setAlt = (i: number, alt: string) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, alt } : it)));

  const makeCover = (i: number) => {
    if (i === 0) return;
    const next = [...items];
    const [moved] = next.splice(i, 1);
    next.unshift(moved);
    onChange(next);
  };

  const onDrop = (i: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === i) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void ingest(Array.from(e.dataTransfer.files));
        }}
        className={[
          "relative rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200 motion-reduce:transition-none",
          dragOver
            ? "scale-[1.01] border-ink bg-stone/60"
            : "border-hairline bg-stone/20 hover:border-ink/30 hover:bg-stone/40",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            void ingest(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <UploadCloud
          strokeWidth={1.25}
          className={[
            "mx-auto h-10 w-10 transition-transform duration-200 motion-reduce:transition-none",
            dragOver ? "-translate-y-1 text-ink" : "text-muted",
          ].join(" ")}
          aria-hidden
        />
        <p className="mt-4 font-display text-[20px] tracking-tight text-ink">
          {dragOver ? "Drop to upload" : "Drag your photos here"}
        </p>
        <p className="mt-1.5 font-body text-[13px] text-muted">
          JPG, PNG, WebP or AVIF · up to {MAX_MB}MB each
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none"
        >
          Browse files
        </button>

        {pending > 0 && (
          <p aria-live="polite" className="mt-4 font-body text-[13px] text-muted">
            Uploading {pending} {pending === 1 ? "photo" : "photos"}…
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1">
          {errors.map((e) => (
            <li key={e} className="font-body text-[13px] text-red-700">
              {e}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <>
          <p className="font-body text-[13px] text-muted">
            {items.length} {items.length === 1 ? "photo" : "photos"} · drag to reorder · the first
            is your cover
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((item, i) => (
              <li
                key={item.url}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className="group relative overflow-hidden rounded-xl border border-hairline bg-cream transition-shadow duration-150 hover:shadow-md motion-reduce:transition-none"
              >
                <span className="relative block aspect-[4/3] bg-stone">
                  <Image src={item.url} alt="" fill sizes="240px" className="object-cover" />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2.5 py-1 font-body text-[11px] text-cream">
                      Cover
                    </span>
                  )}
                  <span className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                    {i !== 0 && (
                      <button
                        type="button"
                        onClick={() => makeCover(i)}
                        aria-label={`Make photo ${i + 1} the cover`}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/95 text-ink hover:bg-cream"
                      >
                        <Star strokeWidth={1.5} className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/95 text-ink hover:bg-cream"
                    >
                      <X strokeWidth={1.5} className="h-4 w-4" />
                    </button>
                  </span>
                  <GripVertical
                    strokeWidth={1.5}
                    className="absolute bottom-2 left-2 h-4 w-4 text-cream/80 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
                    aria-hidden
                  />
                </span>
                <label className="block p-2.5">
                  <span className="sr-only">Alt text for photo {i + 1}</span>
                  <input
                    value={item.alt ?? ""}
                    onChange={(e) => setAlt(i, e.target.value)}
                    placeholder="Describe this photo…"
                    className="w-full rounded-md border border-transparent bg-stone/40 px-2.5 py-1.5 font-body text-[12px] text-ink placeholder:text-muted focus:border-ink/20 focus:bg-cream focus:outline-none"
                  />
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
