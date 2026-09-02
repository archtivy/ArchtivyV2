interface ArchiveHeaderProps {
  title: string;
  /** Optional intro text from taxonomy_nodes.intro_text / description. */
  intro?: string | null;
}

/**
 * The h1 and one line of context for a category archive.
 *
 * ── NO COUNT HERE ANY MORE ──────────────────────────────────────────────────
 * This used to render "{total} listings" under the title. DirectoryFilterBar,
 * immediately below, renders "N projects found" — so every archive showed the
 * count twice, and the two DISAGREED by construction: this one was the node's
 * total from the database, the bar's is the client-filtered result length, so
 * typing in the search box moved one number and not the other. The bar owns it,
 * because the bar is the thing whose number responds to the controls beside it.
 *
 * ── TYPOGRAPHY MATCHES THE DIRECTORY h1 ─────────────────────────────────────
 * Same font-display / 28px→32px / tracking-tight / text-ink as the "Projects"
 * heading DirectoryFilterBar draws on /projects. A category page is the same
 * page scoped, so its title is set in the same type.
 */
export function ArchiveHeader({ title, intro }: ArchiveHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[28px] leading-none tracking-tight text-ink sm:text-[32px]">
        {title}
      </h1>
      {intro && (
        <p className="mt-3 max-w-[62ch] font-body text-[14px] leading-relaxed text-muted">
          {intro}
        </p>
      )}
    </div>
  );
}
