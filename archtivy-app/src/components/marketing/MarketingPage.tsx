import Link from "next/link";
import { SitePage } from "@/components/layout/SitePage";

// ─── MarketingPage ────────────────────────────────────────────────────────────

/**
 * The corporate / legal / policy page frame — about, vision, careers, privacy,
 * terms and nine others.
 *
 * These used to be the one branch of SiteShell that painted its own ground:
 * the shell wrapped them in a cream <main> because a page rendered inside
 * PageContainer cannot paint full-bleed behind the container it sits in. Now
 * that the frame is a component the page renders itself, the ground comes with
 * it and that special case in the shell goes away.
 */

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
    <SitePage width="narrow" footer>
      <article className="space-y-16 sm:space-y-20">
        <header className="space-y-5">
          {label && (
            <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              {label}
            </p>
          )}
          <h1 className="max-w-3xl font-display text-[34px] font-medium leading-[1.1] tracking-tight text-ink sm:text-[42px]">
            {headline}
          </h1>
          {subheadline && (
            <p className="max-w-2xl font-body text-[17px] leading-relaxed text-muted">
              {subheadline}
            </p>
          )}
        </header>
        {children}
      </article>
    </SitePage>
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
        <h2 className="mb-8 text-lg font-semibold tracking-tight text-ink">
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
    <section className="border-t border-hairline pt-12 sm:pt-16">
      <div className="space-y-5">
        {heading && (
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {heading}
          </h2>
        )}
        {body && (
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            {body}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-full border border-ink/25 px-5 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-stone/50 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
