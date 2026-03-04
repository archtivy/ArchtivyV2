"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadBox } from "./UploadBox";

const MIN_GALLERY = 3;
const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export interface GalleryUploadCardProps {
  /** Current list of files (order = display order; first is primary/cover) */
  files: File[];
  onChange: (files: File[]) => void;
  minCount?: number;
  accept?: string;
  id?: string;
  /** Optional id for the hidden file input so form can reference it */
  inputName?: string;
  /** Number of images already saved in the DB (edit mode). When > 0, uploading
   *  minCount+ new files will replace the existing gallery. */
  existingCount?: number;
}

function previewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function GalleryUploadCard({
  files,
  onChange,
  minCount = MIN_GALLERY,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  id = "gallery-upload",
  inputName = "images",
  existingCount = 0,
}: GalleryUploadCardProps) {
  const count = files.length;
  const hasExisting = existingCount > 0;

  // Status text and colour depend on whether we're in edit (hasExisting) or create mode.
  let statusText: string;
  let statusColor: string;
  if (hasExisting && count === 0) {
    statusText = `${existingCount} existing image${existingCount !== 1 ? "s" : ""} · upload ${minCount}+ new files to replace the gallery`;
    statusColor = "text-zinc-500 dark:text-zinc-400";
  } else if (hasExisting && count > 0 && count < minCount) {
    statusText = `${count}/${minCount} new — need at least ${minCount} to replace the gallery`;
    statusColor = "text-amber-600 dark:text-amber-400";
  } else if (hasExisting && count >= minCount) {
    statusText = `${count} new images · will replace existing gallery on save`;
    statusColor = "text-green-700 dark:text-green-400";
  } else {
    // Create mode (no existing images)
    const valid = count >= minCount;
    statusText = `${count}/${minCount} images${!valid && count > 0 ? ` — add at least ${minCount} to publish` : ""}`;
    statusColor = valid ? "text-zinc-500 dark:text-zinc-400" : "text-amber-600 dark:text-amber-400";
  }

  const valid = hasExisting ? count === 0 || count >= minCount : count >= minCount;

  const [fileError, setFileError] = useState<string | null>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      if (!newFiles.length) return;
      setFileError(null);
      const accepted: File[] = [];
      const errors: string[] = [];
      for (const f of newFiles) {
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
      if (accepted.length > 0) onChange([...files, ...accepted]);
    },
    [files, onChange]
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...files];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [files, onChange]
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index >= files.length - 1) return;
      const next = [...files];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next);
    },
    [files, onChange]
  );

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`} className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        Gallery
      </h3>
      <div className="mb-4">
        <UploadBox
          id={id}
          accept={accept}
          primaryText="Drag & drop images or click to upload"
          hintText={`JPEG, PNG, WebP or GIF · max ${MAX_FILE_MB}MB each`}
          onFilesSelected={(list) => addFiles(Array.from(list))}
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
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}-${file.size}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <Thumbnail file={file} />
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                  {file.name}
                </span>
                {i === 0 && (
                  <span className="ml-1 text-xs text-archtivy-primary">(cover)</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    moveUp(i);
                  }}
                  disabled={i === 0}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    moveDown(i);
                  }}
                  disabled={i === files.length - 1}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeAt(i);
                  }}
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

function Thumbnail({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = previewUrl(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700" />
    );
  }
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
