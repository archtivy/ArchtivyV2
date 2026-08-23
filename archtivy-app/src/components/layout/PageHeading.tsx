import type { ReactNode } from "react";

/**
 * The title block at the top of an interior page.
 *
 * Every signed-in route carried its own copy of the same two elements — an h1
 * and a supporting line — written against the zinc palette:
 *
 *   <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl …">
 *   <p  className="mt-0.5 text-sm text-zinc-500 …">
 *
 * On the cream ground those read as a different product, and there were six
 * copies to keep in step. The editorial equivalent lives here once.
 *
 * Dark-mode variants are deliberately absent. The editorial palette is a single
 * fixed ground — cream with ink text — so a `dark:` class on these surfaces has
 * nothing to switch to.
 */

interface PageHeadingProps {
  title: ReactNode;
  /** Small caps label above the title — usually a parent route or section. */
  eyebrow?: ReactNode;
  /** Supporting line beneath the title. */
  description?: ReactNode;
  /** Buttons or links set opposite the title on the same baseline. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeading({
  title,
  eyebrow,
  description,
  actions,
  className = "",
}: PageHeadingProps) {
  return (
    <header
      className={`flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-[32px] font-medium tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-[60ch] font-body text-[16px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}
