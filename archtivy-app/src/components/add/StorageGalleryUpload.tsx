"use client";

import { useCallback, useState } from "react";
import { UploadBox } from "./UploadBox";
import { uploadGalleryImageClient } from "@/lib/storage/clientUpload";
import type { UploadedGalleryItem } from "@/lib/storage/types";

const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export interface StorageGalleryUploadProps {
  /** Already-uploaded items (order = display order; first is cover). */
  items: UploadedGalleryItem[];
  onChange: (items: UploadedGalleryItem[]) => void;
  minCount?: number;
  id?: string;
  /** Number of images already saved in the DB (edit mode). */
  existingCount?: number;
  /** Disable interaction (e.g. while publishing). */
  disabled?: boolean;
  /** Called when upload-in-progress state changes. */
  onUploadingChange?: (uploading: boolean) => void;
}

export function StorageGalleryUpload({
  items,
  onChange,
  minCount = 3,
  id = "gallery-upload",
  existingCount = 0,
  disabled = false,
  onUploadingChange,
}: StorageGalleryUploadProps) {
  const count = items.length;
  const hasExisting = existingCount > 0;
  const [uploading, setUploading] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  // Status text
  let statusText: string;
  let statusColor: string;
  if (uploading > 0) {
    statusText = `Uploading ${uploading} image${uploading !== 1 ? "s" : ""}…`;
    statusColor = "text-blue-600 dark:text-blue-400";
  } else if (hasExisting && count === 0) {
    statusText = `${existingCount} existing image${existingCount !== 1 ? "s" : ""} · upload ${minCount}+ new files to replace the gallery`;
    statusColor = "text-zinc-500 dark:text-zinc-400";
  } else if (hasExisting && count > 0 && count < minCount) {
    statusText = `${count}/${minCount} new — need at least ${minCount} to replace the gallery`;
    statusColor = "text-amber-600 dark:text-amber-400";
  } else if (hasExisting && count >= minCount) {
    statusText = `${count} new images · will replace existing gallery on save`;
    statusColor = "text-green-700 dark:text-green-400";
  } else {
    const valid = count >= minCount;
    statusText = `${count}/${minCount} images${!valid && count > 0 ? ` — add at least ${minCount} to publish` : ""}`;
    statusColor = valid ? "text-zinc-500 dark:text-zinc-400" : "text-amber-600 dark:text-amber-400";
  }

  const handleFilesSelected = useCallback(
    async (rawFiles: File[]) => {
      if (!rawFiles.length) return;
      setFileError(null);

      // Client-side validation
      const accepted: File[] = [];
      const errors: string[] = [];
      for (const f of rawFiles) {
        if (f.size === 0) continue;
        if (f.type === "image/heic" || f.type === "image/heif") {
          errors.push(`"${f.name}" is HEIC — convert to JPEG or WebP first.`);
          continue;
        }
        if (!ALLOWED_TYPES.has(f.type)) {
          errors.push(`"${f.name}" has unsupported type. Use JPEG, PNG, WebP or GIF.`);
          continue;
        }
        if (f.size > MAX_FILE_BYTES) {
          const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
          errors.push(`"${f.name}" is ${sizeMb}MB — max ${MAX_FILE_MB}MB.`);
          continue;
        }
        accepted.push(f);
      }
      if (errors.length > 0) setFileError(errors.join("\n"));
      if (accepted.length === 0) return;

      // Upload each file to Supabase Storage
      setUploading(accepted.length);
      onUploadingChange?.(true);
      const newItems: UploadedGalleryItem[] = [];
      const uploadErrors: string[] = [];

      for (const file of accepted) {
        try {
          const item = await uploadGalleryImageClient(file);
          newItems.push(item);
        } catch (err) {
          uploadErrors.push(
            `"${file.name}": ${err instanceof Error ? err.message : "Upload failed"}`
          );
        } finally {
          setUploading((prev) => Math.max(0, prev - 1));
        }
      }

      onUploadingChange?.(false);

      if (uploadErrors.length > 0) {
        setFileError((prev) =>
          [prev, ...uploadErrors].filter(Boolean).join("\n")
        );
      }

      if (newItems.length > 0) {
        onChange([...items, ...newItems]);
      }
    },
    [items, onChange, onUploadingChange]
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange]
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...items];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [items, onChange]
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return;
      const next = [...items];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next);
    },
    [items, onChange]
  );

  const isUploading = uploading > 0;

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-labelledby={`${id}-heading`}
    >
      <h3
        id={`${id}-heading`}
        className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4"
      >
        Gallery
      </h3>
      <div className="mb-4">
        <UploadBox
          id={id}
          accept="image/jpeg,image/png,image/webp,image/gif"
          primaryText={
            isUploading
              ? `Uploading ${uploading} image${uploading !== 1 ? "s" : ""}…`
              : "Drag & drop images or click to upload"
          }
          hintText={`JPEG, PNG, WebP or GIF · max ${MAX_FILE_MB}MB each`}
          onFilesSelected={(list) => handleFilesSelected(Array.from(list))}
          disabled={disabled || isUploading}
        />
      </div>
      {fileError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 whitespace-pre-line">
          {fileError}
        </div>
      )}
      <p
        id={`${id}-hint`}
        className={`mb-3 text-xs ${statusColor}`}
        role="status"
      >
        {statusText}
      </p>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={item.path}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt ?? ""} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                  {item.path.split("/").pop() ?? "Image"}
                </span>
                {i === 0 && (
                  <span className="ml-1 text-xs text-archtivy-primary">(cover)</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); moveUp(i); }}
                  disabled={i === 0}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); moveDown(i); }}
                  disabled={i === items.length - 1}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); removeAt(i); }}
                  className="rounded p-1 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Whether any gallery uploads are currently in progress. */
export function useGalleryUploading(uploading: number) {
  return uploading > 0;
}
