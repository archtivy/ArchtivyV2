import Link from "next/link";
import { getCachedPlatformMetrics } from "@/lib/db/footer-metrics";
import { Container } from "@/components/layout/Container";
import { FooterNewsletter } from "@/components/layout/FooterNewsletter";

// ─── Link definitions ─────────────────────────────────────────────────────────

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Vision", href: "/vision" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Press", href: "/press" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

const PLATFORM_LINKS = [
  { label: "Projects", href: "/explore/projects" },
  { label: "Products", href: "/explore/products" },
  { label: "Professionals", href: "/explore/professionals" },
  { label: "Brands", href: "/explore/brands" },
  { label: "Locations", href: "/explore/locations" },
  { label: "Categories", href: "/explore/categories" },
];

const PROFESSIONALS_LINKS = [
  { label: "Create a Profile", href: "/onboarding" },
  { label: "Submit a Project", href: "/add/project" },
  { label: "Credit Your Team", href: "/add/project" },
  { label: "Specification History", href: "/me" },
  { label: "Network Visibility", href: "/about" },
  { label: "Claim Your Profile", href: "/claim" },
];

const RESOURCES_LINKS = [
  { label: "Press Kit", href: "/press" },
  { label: "API Documentation", href: "#" },
  { label: "Data & Intelligence", href: "/vision" },
  { label: "Brand Intelligence", href: "#" },
  { label: "Partner Program", href: "#" },
  { label: "Status", href: "#" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Use", href: "/legal/terms" },
  { label: "Cookie Preferences", href: "/legal/cookies" },
  { label: "Data Processing", href: "/legal/data-processing" },
];

// ─── Footer ───────────────────────────────────────────────────────────────────

export async function Footer() {
  const metrics = await getCachedPlatformMetrics();
  const year = new Date().getFullYear();

  const METRICS = [
    { value: metrics.projects, label: "Projects" },
    { value: metrics.products, label: "Products" },
    { value: metrics.professionals, label: "Professionals" },
    { value: metrics.countries, label: "Countries" },
  ];

  return (
    <footer
      role="contentinfo"
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* ── 1. Top positioning block ──────────────────────────────────── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <Container className="py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-20">

            {/* Left: headline + paragraph + CTAs */}
            <div className="space-y-6">
              <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
                The Permanent Record of Global Architecture.
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Every project, every product, every credit — connected through
                one structured intelligence system. Built for professionals and
                brands who shape the built environment.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/add/project"
                  className="inline-flex items-center justify-center rounded-[4px] bg-[#002abf] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-950"
                >
                  Submit Your Work
                </Link>
                <Link
                  href="/explore/projects"
                  className="inline-flex items-center justify-center rounded-[4px] border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 focus:ring-offset-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100 dark:focus:ring-offset-zinc-950"
                >
                  Explore the Platform
                </Link>
              </div>
            </div>

            {/* Right: metrics strip */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {METRICS.map(({ value, label }) => (
                <div key={label} className="space-y-1">
                  <div className="font-mono text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {value > 0 ? value.toLocaleString() : "—"}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </Container>
      </div>

      {/* ── 2. Five-column link grid ──────────────────────────────────── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <Container className="py-12 sm:py-14">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">

            {/* Col 1: About the platform */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Archtivy
              </div>
              <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                Global architecture intelligence.
                <br />
                Structured credits, product traceability,
                <br />
                professional records.
              </p>
              <ul className="space-y-2.5">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 2: Platform */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Platform
              </h3>
              <ul className="space-y-2.5">
                {PLATFORM_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: For Professionals */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Professionals
              </h3>
              <ul className="space-y-2.5">
                {PROFESSIONALS_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Resources */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Resources
              </h3>
              <ul className="space-y-2.5">
                {RESOURCES_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 5: Legal */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Legal
              </h3>
              <ul className="space-y-2.5">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600">
                All credits and specifications are reviewed prior to
                publication.
              </p>
            </div>

          </div>
        </Container>
      </div>

      {/* ── 3. Intelligence Briefing / Newsletter ─────────────────────── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <Container className="py-10 sm:py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                Intelligence Briefing
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Architecture Intelligence. Delivered Monthly.
              </h3>
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                A curated summary of specification trends, professional records,
                and platform data — drawn from projects across global markets.
              </p>
            </div>

            <div className="space-y-3">
              <FooterNewsletter />
              <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-600">
                No promotional content. No third-party sharing. Unsubscribe
                with one action.
              </p>
            </div>

          </div>
        </Container>
      </div>

      {/* ── 4. Bottom strip ───────────────────────────────────────────── */}
      <Container className="py-6 sm:py-7">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            © {year} Archtivy Technologies, Inc. All rights reserved.
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            Headquartered in Los Angeles. Operating globally.
          </p>
          <nav
            className="flex items-center gap-5"
            aria-label="Social media links"
          >
            {[
              {
                label: "LinkedIn",
                href: "https://linkedin.com/company/archtivy",
              },
              { label: "Instagram", href: "https://instagram.com/archtivy" },
              { label: "X", href: "https://x.com/archtivy" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-5 text-center text-[10px] tracking-[0.15em] text-zinc-300 dark:text-zinc-800">
          Built for architectural intelligence.
        </p>
      </Container>
    </footer>
  );
}
