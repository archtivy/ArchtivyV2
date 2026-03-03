import Link from "next/link";

// ─── MarketingPage ────────────────────────────────────────────────────────────

interface MarketingPageProps {
  label?: string;
  headline: string;
  subheadline?: string;
  children: React.ReactNode;
}

export function MarketingPage({
  label,
  headline,
  subheadline,
  children,
}: MarketingPageProps) {
  return (
    <article className="space-y-16 sm:space-y-20">
      <header className="space-y-5 pt-4 sm:pt-8">
        {label && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            {label}
          </p>
        )}
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {headline}
        </h1>
        {subheadline && (
          <p className="max-w-2xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            {subheadline}
          </p>
        )}
      </header>
      {children}
    </article>
  );
}

// ─── MarketingSection ─────────────────────────────────────────────────────────

interface MarketingSectionProps {
  heading?: string;
  children: React.ReactNode;
  className?: string;
}

export function MarketingSection({
  heading,
  children,
  className = "",
}: MarketingSectionProps) {
  return (
    <section
      className={`border-t border-zinc-200 pt-12 dark:border-zinc-800 sm:pt-16 ${className}`.trim()}
    >
      {heading && (
        <h2 className="mb-8 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {heading}
        </h2>
      )}
      {children}
    </section>
  );
}

// ─── MarketingCTA ─────────────────────────────────────────────────────────────

interface MarketingCTAProps {
  heading?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function MarketingCTA({
  heading = "The record is growing.",
  body = "Submit your work to be part of the permanent record of global architecture.",
  primaryLabel = "Submit Your Work",
  primaryHref = "/add/project",
  secondaryLabel = "Explore Projects",
  secondaryHref = "/explore/projects",
}: MarketingCTAProps) {
  return (
    <section className="border-t border-zinc-200 pt-12 dark:border-zinc-800 sm:pt-16">
      <div className="space-y-5">
        {heading && (
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {heading}
          </h2>
        )}
        {body && (
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {body}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center rounded-[4px] bg-[#002abf] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-[4px] border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:border-zinc-500"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
