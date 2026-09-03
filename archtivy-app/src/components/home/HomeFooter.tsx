import Link from "next/link";

/**
 * Social links as text, matching the existing global Footer, which uses labels
 * and the real Archtivy handles rather than glyphs. lucide-react v1 also
 * removed brand icons (Instagram/Linkedin) for trademark reasons, so icons
 * would have meant hand-rolling third-party marks.
 */
const SOCIAL = [
  { label: "LinkedIn", href: "https://linkedin.com/company/archtivy" },
  { label: "Instagram", href: "https://instagram.com/archtivy" },
  { label: "X", href: "https://x.com/archtivy" },
];

/**
 * Homepage footer (Build Brief §10).
 *
 * Distinct from the global Footer, which uses the existing zinc/archtivy
 * palette. This one is on the editorial cream/ink tokens and is rendered only
 * on "/" — ConditionalFooter suppresses the global footer there so the page
 * does not end with two.
 *
 * Only routes that exist are linked. The reference's Pricing, Resources, AI
 * Tools, Help Center and Guidelines entries are omitted rather than shipped as
 * dead links.
 */

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { label: "Projects", href: "/projects" },
      { label: "Designers", href: "/designers" },
      { label: "Brands", href: "/brands" },
      { label: "Products", href: "/products" },
      { label: "Inspiration", href: "/inspiration" },
      { label: "Magazine", href: "/magazine" },
    ],
  },
  {
    heading: "For Professionals",
    links: [
      { label: "Why Archtivy", href: "/vision" },
      { label: "How it works", href: "/how-it-works" },
      /* These two pages existed but were reachable only from the legacy
         footer, which corporate pages no longer render — so on most of the
         public site they had become unlinked. */
      { label: "For brands", href: "/brand-intelligence" },
      { label: "Connections", href: "/data-intelligence" },
      { label: "Partners", href: "/partners" },
      // "Opportunities" removed. The /opportunities route was confirmed unused
      // and has been deleted, so there is no page left to link to.
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Guidelines", href: "/guidelines" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function HomeFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-cream">
      <div className="mx-auto max-w-content px-4 py-16 md:px-12 lg:px-24">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <p className="font-display text-[22px] font-medium tracking-tight text-ink">
              archtivy
            </p>
            <p className="mt-3 max-w-[34ch] font-body text-[13px] leading-[20px] text-muted">
              The world&rsquo;s architecture knowledge graph. Discover, connect
              and get inspired.
            </p>
            <nav className="mt-5 flex items-center gap-4" aria-label="Social media links">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-body text-[13px] font-medium text-ink">{col.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-body text-[13px] leading-[20px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-hairline pt-6">
          <p className="font-body text-[12px] text-muted">
            © {new Date().getFullYear()} Archtivy Technologies, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
