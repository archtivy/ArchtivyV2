"use client";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";

export interface DocumentsUploadCardProps {
  id?: string;
  name?: string;
  accept?: string;
}

const DEFAULT_ACCEPT =
  ".pdf,.docx,.pptx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip";

export function DocumentsUploadCard({
  id = "documents",
  name = "documents",
  accept = DEFAULT_ACCEPT,
}: DocumentsUploadCardProps) {
  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`} className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        Documents (optional)
      </h3>
      <input
        id={id}
        type="file"
        name={name}
        accept={accept}
        multiple
        className={inputClass}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        PDF, DOCX, PPTX or ZIP. Max 20MB each.
      </p>
    </div>
  );
}
