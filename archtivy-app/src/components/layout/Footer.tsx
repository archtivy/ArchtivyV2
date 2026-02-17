import Link from "next/link";
import { getCachedTotalConnections } from "@/lib/db/footer-metrics";
import { FooterNewsletter } from "@/components/layout/FooterNewsletter";
import { ShareWorkTrigger } from "@/components/ShareWorkTrigger";

export async function Footer() {
  const totalConnections = await getCachedTotalConnections();
  const displayCount = totalConnections > 0 ? totalConnections : null;
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip bg-zinc-100 dark:bg-zinc-900/50"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 dark:border-zinc-700/80 dark:bg-zinc-900/95">
          {/* CTA card */}
          <section className="relative border-b border-zinc-200/80 px-6 py-10 sm:px-10 sm:py-12 dark:border-zinc-700/80">
            <div className="absolute right-0 top-0 h-full w-1/3 overflow-hidden rounded-tr-2xl">
              <span
                className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-[#002abf]/10 dark:border-[#002abf]/20"
                aria-hidden
              />
              <span
                className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-[#002abf]/15 dark:border-[#002abf]/25"
                aria-hidden
              />
              <span
                className="absolute right-4 top-4 h-24 w-24 rounded-full border border-[#002abf]/20 dark:border-[#002abf]/30"
                aria-hidden
              />
            </div>
            <div className="relative flex flex-col items-start gap-6">
              {displayCount != null && (
                <>
                  <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
                    {displayCount.toLocaleString()}+ connections mapped across real projects.
                  </h2>
                  <p className="max-w-xl text-zinc-600 dark:text-zinc-400 sm:text-lg">
                    Projects, products, and credits linked in one place — growing every day.
                  </p>
                </>
              )}
              {displayCount == null && (
                <>
                  <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
                    Build the connections behind architecture.
                  </h2>
                  <p className="max-w-xl text-zinc-600 dark:text-zinc-400 sm:text-lg">
                    Link projects, products, and credits in one place. Discover and be discovered.
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-3">
                <ShareWorkTrigger
                  className="inline-flex items-center justify-center rounded-full bg-[#002abf] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                >
                  Share your work
                </ShareWorkTrigger>
                <Link
                  href="/explore/projects"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900"
                >
                  Explore
                </Link>
              </div>
            </div>
          </section>

          {/* 4-column link grid */}
          <section className="grid grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-2 sm:px-10 sm:py-12 lg:grid-cols-4 lg:gap-10">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Archtivy
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                A platform for connecting projects, products, designers, and brands. Link work, credit products, and discover what goes into the built environment.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Explore
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/explore/projects" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Projects
                  </Link>
                </li>
                <li>
                  <Link href="/explore/products" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Products
                  </Link>
                </li>
                <li>
                  <Link href="/explore/designers" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Designers
                  </Link>
                </li>
                <li>
                  <Link href="/explore/brands" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Brands
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Product
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/about" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Community
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/guidelines" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Guidelines
                  </Link>
                </li>
                <li>
                  <Link href="/feedback" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Feedback
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-zinc-600 transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#002abf]">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          {/* Newsletter */}
          <section className="border-t border-zinc-200/80 px-6 py-8 sm:px-10 dark:border-zinc-700/80">
            <div className="max-w-md">
              <label htmlFor="footer-newsletter" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Stay in the loop
              </label>
              <FooterNewsletter />
            </div>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:gap-2 sm:text-left">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © {year} Archtivy
            </p>
            <span className="hidden text-zinc-400 sm:inline" aria-hidden>·</span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Built in Los Angeles
            </p>
          </div>
          <nav className="flex items-center gap-6" aria-label="Social">
            <a
              href="https://x.com/archtivy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition hover:text-[#002abf] dark:hover:text-[#002abf]"
              aria-label="X (Twitter)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/archtivy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition hover:text-[#002abf] dark:hover:text-[#002abf]"
              aria-label="Instagram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://linkedin.com/company/archtivy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition hover:text-[#002abf] dark:hover:text-[#002abf]"
              aria-label="LinkedIn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
