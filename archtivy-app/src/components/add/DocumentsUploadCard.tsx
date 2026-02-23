"use client";

import { useCallback, useState } from "react";
import { UploadBox } from "./UploadBox";

const MAX_DOCUMENTS = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".zip"];

const DEFAULT_ACCEPT =
  ".pdf,.docx,.pptx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip";

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export interface DocumentsUploadCardProps {
  /** Current list of document files */
  files: File[];
  onChange: (files: File[]) => void;
  id?: string;
  accept?: string;
}

export function DocumentsUploadCard({
  files,
  onChange,
  id = "documents",
  accept = DEFAULT_ACCEPT,
}: DocumentsUploadCardProps) {
  const [error, setError] = useState<string | null>(null);

  const count = files.length;
  const atLimit = count >= MAX_DOCUMENTS;

  const validateAndAdd = useCallback(
    (newFiles: File[]) => {
      setError(null);
      if (newFiles.length === 0) return;

      const remaining = MAX_DOCUMENTS - count;
      if (remaining <= 0) {
        setError("Maximum 5 documents allowed.");
        return;
      }

      const toAdd: File[] = [];
      for (const f of newFiles) {
        if (toAdd.length >= remaining) {
          setError("Maximum 5 documents allowed.");
          break;
        }
        if (!isAcceptedFile(f)) {
          setError(`"${f.name}" is not allowed. Use PDF, DOCX, PPTX or ZIP.`);
          continue;
        }
        if (f.size > MAX_FILE_BYTES) {
          setError(`"${f.name}" exceeds 20MB limit.`);
          continue;
        }
        toAdd.push(f);
      }

      if (toAdd.length > 0) {
        onChange([...files, ...toAdd]);
      }
    },
    [files, count, onChange]
  );

  const removeAt = useCallback(
    (index: number) => {
      setError(null);
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  const handleFilesSelected = useCallback(
    (list: File[]) => {
      if (atLimit) {
        setError("Maximum 5 documents allowed.");
        return;
      }
      validateAndAdd(list);
    },
    [atLimit, validateAndAdd]
  );

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-labelledby={`${id}-heading`}
    >
      <h3
        id={`${id}-heading`}
        className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4"
      >
        Documents (optional)
      </h3>
      <div className="mb-4">
        <UploadBox
          id={id}
          accept={accept}
          disabled={atLimit}
          primaryText="Drag & drop documents or click to upload"
          hintText="PDF, DOCX, PPTX or ZIP · max 20MB each"
          onFilesSelected={handleFilesSelected}
        />
      </div>
      <p
        id={`${id}-hint`}
        className="mb-3 text-xs text-zinc-500 dark:text-zinc-400"
        role="status"
      >
        {count}/{MAX_DOCUMENTS} documents
      </p>
      {error && (
        <p className="mb-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}-${file.size}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeAt(i);
                }}
                className="shrink-0 rounded p-1 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
