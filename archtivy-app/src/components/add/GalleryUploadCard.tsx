"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_GALLERY = 3;

export interface GalleryUploadCardProps {
  /** Current list of files (order = display order; first is primary/cover) */
  files: File[];
  onChange: (files: File[]) => void;
  minCount?: number;
  accept?: string;
  id?: string;
  /** Optional id for the hidden file input so form can reference it */
  inputName?: string;
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
}: GalleryUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const count = files.length;
  const valid = count >= minCount;

  const addFiles = useCallback(
    (newFiles: FileList | File[] | null) => {
      if (!newFiles?.length) return;
      const list = Array.from(newFiles).filter(
        (f) => f.type.startsWith("image/") && f.size > 0
      );
      if (list.length === 0) return;
      onChange([...files, ...list]);
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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`} className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        Gallery
      </h3>
      <input
        ref={inputRef}
        type="file"
        name={inputName}
        accept={accept}
        multiple
        className="sr-only"
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`mb-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-white p-4 transition dark:border-zinc-600 dark:bg-zinc-900/30 ${
          dragOver
            ? "border-[#002abf]/40 bg-[#002abf]/5"
            : "hover:border-zinc-300 dark:hover:border-zinc-500"
        }`}
      >
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Drag & drop images or click to upload
        </span>
        <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          JPEG, PNG, WebP or GIF · max 5MB each
        </span>
      </div>
      <p
        id={`${id}-hint`}
        className={`mb-3 text-xs ${valid ? "text-zinc-500 dark:text-zinc-400" : "text-amber-600 dark:text-amber-400"}`}
        role="status"
      >
        {count}/{minCount} images
        {!valid && count > 0 && " — add at least " + minCount + " to publish"}
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
