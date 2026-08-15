import { FileText, ExternalLink } from "lucide-react";

/**
 * Trust strip (brief §3).
 *
 * TWO of the reference's four tiles are gone, and the reason matters:
 *
 *   "Products used in 125,000+ projects"  DROPPED. The real aggregate is 13
 *       project_product_links rows — 12 distinct products across 5 projects.
 *       The brief allows deriving from a real aggregate or dropping the tile;
 *       "used in 5 projects" is not a trust signal, so it is dropped.
 *
 *   "Information from verified brands"    DROPPED. All 15 brand profiles that
 *       own products have claim_status = 'unclaimed'. This is not an
 *       exaggeration of scale but a claim that is currently FALSE, so it
 *       cannot ship regardless of framing.
 *
 *   "Sustainability information"          DROPPED. 3 of 76 products carry any
 *       sustainability value; stating it as a platform property overstates it.
 *
 * The two that remain are verifiable, and their supporting numbers are passed
 * in from real aggregates rather than asserted.
 */
export function ProductsTrustStrip({
  withDocuments,
  total,
  brandsWithWebsite,
}: {
  withDocuments: number;
  total: number;
  brandsWithWebsite: number;
}) {
  const tiles: { icon: React.ReactNode; title: string; sub: string }[] = [];

  if (withDocuments > 0) {
    tiles.push({
      icon: <FileText strokeWidth={1.5} className="h-5 w-5" aria-hidden />,
      title: "Detailed product specifications",
      sub: `${withDocuments} of ${total} products have specification documents`,
    });
  }

  if (brandsWithWebsite > 0) {
    tiles.push({
      icon: <ExternalLink strokeWidth={1.5} className="h-5 w-5" aria-hidden />,
      title: "Direct links to manufacturer",
      sub: `${brandsWithWebsite} brands link to their own site`,
    });
  }

  if (tiles.length === 0) return null;

  return (
    <section className="mt-16 rounded-xl border border-hairline bg-stone/40 px-6 py-6">
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tiles.map((t) => (
          <li key={t.title} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-muted">{t.icon}</span>
            <span>
              <span className="block font-body text-[14px] text-ink">{t.title}</span>
              <span className="mt-0.5 block font-body text-[12px] text-muted">{t.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
