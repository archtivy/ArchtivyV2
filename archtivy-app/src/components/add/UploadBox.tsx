"use client";

import { useCallback, useRef, useState } from "react";

export interface UploadBoxProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  primaryText: string;
  hintText: string;
  id?: string;
}

/**
 * Shared drag-and-drop upload zone. Matches Gallery upload styling.
 */
export function UploadBox({
  onFilesSelected,
  accept,
  multiple = true,
  disabled = false,
  primaryText,
  hintText,
  id = "upload-box",
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (newFiles: FileList | File[] | null) => {
      if (!newFiles?.length) return;
      const list = Array.from(newFiles);
      if (list.length === 0) return;
      onFilesSelected(list);
    },
    [onFilesSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, disabled]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setDragOver(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const onClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-white opacity-60 dark:border-zinc-700 dark:bg-zinc-900/30"
            : dragOver
              ? "border-[#002abf]/40 bg-[#002abf]/5 dark:border-[#002abf]/40 dark:bg-[#002abf]/5"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-900/30 dark:hover:border-zinc-500"
        }`}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {primaryText}
        </span>
        <span id={`${id}-hint`} className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          {hintText}
        </span>
      </div>
    </>
  );
}
