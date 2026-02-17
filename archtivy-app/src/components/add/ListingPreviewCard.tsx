"use client";

export interface ListingPreviewCardProps {
  title: string;
  /** e.g. location for project */
  subtitle?: string | null;
  /** Primary/cover image URL (object URL or string) */
  imageUrl?: string | null;
  className?: string;
}

export function ListingPreviewCard({
  title,
  subtitle,
  imageUrl,
  className = "",
}: ListingPreviewCardProps) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50 ${className}`.trim()}
      aria-label="Live preview"
    >
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Preview
      </h3>
      {imageUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-3 flex items-center justify-center">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">No image</span>
        </div>
      )}
      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
        {title.trim() || "Untitled"}
      </p>
      {subtitle?.trim() && (
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 truncate">
          {subtitle.trim()}
        </p>
      )}
    </div>
  );
}
