import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HEADER_CLEARANCE } from "@/components/home/headerClearance";

/**
 * The chrome every public directory surface renders: the editorial HomeNav,
 * one content column, and HomeFooter.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * /projects, /products and their category archives already share their entire
 * RESULTS body — ProjectsDirectory / ProductsDirectory, the same filter bar,
 * the same canonical card. What they did NOT share was the wrapper, and that
 * was the whole of the visual gap between them. Measured at 1440px before this
 * component existed:
 *
 *              /projects                     /projects/commercial/showroom
 *   header     HomeNav, 73px, cream          TopNav, 65px, #ffffff
 *   column     max-w-content → 1440px        Container → 1040px
 *   footer     HomeFooter, cream             global Footer, #fafafa
 *
 * So the same grid rendered 1440px wide under a cream editorial header on one
 * URL and 1040px wide under the legacy white header on the other. Nothing
 * about the archive was "legacy" except the four lines that wrapped it.
 *
 * Putting the wrapper in one component means a category page cannot drift from
 * its parent directory again: there is no second copy to forget to update.
 *
 * ── SiteShell STILL DOES NOT DECIDE THIS ────────────────────────────────────
 * /projects/* and /products/* remain shell-less in SiteShell and
 * ConditionalFooter, because that catch-all serves BOTH archives and listing
 * detail pages and a client component cannot tell which one resolved. Only the
 * server branch knows, and it is the branch that mounts this.
 */
export function DirectoryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* solid: there is no dark hero behind the bar on any directory page. */}
      <HomeNav variant="solid" />
      <main className={`mx-auto max-w-content px-4 ${HEADER_CLEARANCE} md:px-12 lg:px-24`}>
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
