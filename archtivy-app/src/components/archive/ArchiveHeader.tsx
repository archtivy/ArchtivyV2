interface ArchiveHeaderProps {
  title: string;
  /** Optional intro text from taxonomy_nodes.intro_text. */
  intro?: string | null;
  /** Total listing count for this taxonomy node. */
  count?: number;
}

/**
 * Header block for archive pages.
 * Shows title, optional intro text, and listing count.
 */
export function ArchiveHeader({ title, intro, count }: ArchiveHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h1>
      {intro && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          {intro}
        </p>
      )}
      {count != null && count > 0 && (
        <p className="mt-2 text-xs text-zinc-400">
          {count} {count === 1 ? "listing" : "listings"}
        </p>
      )}
    </div>
  );
}
