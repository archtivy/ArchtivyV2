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
    <article className="space-y-20 pb-24 sm:space-y-24">
      <header className="space-y-6 pt-10 sm:pt-16">
        {label && (
          <p className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {label}
          </p>
        )}
        {/* Serif display at editorial scale. The headline is the page — it gets
            room, a measure that keeps lines readable, and no competition. */}
        <h1 className="max-w-[20ch] font-display text-[34px] leading-[1.08] tracking-tight text-ink sm:text-[44px] lg:text-[52px]">
          {headline}
        </h1>
        {subheadline && (
          <p className="max-w-[58ch] font-body text-[17px] leading-[27px] text-muted">
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
      className={`border-t border-hairline pt-12 sm:pt-16 ${className}`.trim()}
    >
      {heading && (
        <h2 className="mb-8 max-w-[34ch] font-display text-[26px] leading-[1.15] tracking-tight text-ink sm:text-[30px]">
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
  /* Defaults carry the current positioning, because most pages take them as
     given. "The record is growing / permanent record of global architecture"
     was the old one, and it shipped on every page that did not override it. */
  heading = "Start anywhere.",
  body = "Every project leads to the people who made it, the products inside it, and the brands behind those. Follow it as far as you like.",
  primaryLabel = "Explore projects",
  primaryHref = "/projects",
  secondaryLabel = "Browse products",
  secondaryHref = "/products",
}: MarketingCTAProps) {
  return (
    <section className="border-t border-hairline pt-12 sm:pt-16">
      <div className="space-y-5">
        {heading && (
          <h2 className="max-w-[26ch] font-display text-[28px] leading-[1.12] tracking-tight text-ink sm:text-[34px]">
            {heading}
          </h2>
        )}
        {body && (
          <p className="max-w-[56ch] font-body text-[16px] leading-[26px] text-muted">
            {body}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href={primaryHref}
            /* Ink, not the legacy #002abf. That hex is not the Archtivy blue —
               the accent is #173DED (archtivy-primary) — and on the cream
               editorial ground the primary action everywhere else in the
               product is an ink pill. */
            className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 font-body text-[14px] text-cream transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-archtivy-primary focus-visible:ring-offset-2"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 font-body text-[14px] text-ink transition-colors hover:bg-stone/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-archtivy-primary focus-visible:ring-offset-2"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
