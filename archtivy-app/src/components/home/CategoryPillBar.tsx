import Link from "next/link";
import {
  Home,
  Hotel,
  Building2,
  Landmark,
  Library,
  LayoutGrid,
  Trees,
  Hammer,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getHomeCategories } from "@/lib/db/homeCategories";

/**
 * Category pill bar (Build Brief §3).
 *
 * A cream rounded card that overlaps the hero band's bottom edge by ~40px.
 * The overlap is produced with a negative top margin on the wrapper rather than
 * absolute positioning, so the bar still occupies layout height and the section
 * below it cannot slide underneath.
 *
 * Labels come from the live project taxonomy (getHomeCategories) rather than a
 * hardcoded list, so a pill never links to a category with no listings. The
 * brief's ordering is used where those categories exist; the icon map is keyed
 * by taxonomy slug and falls back to a neutral glyph.
 */

const ICONS: Record<string, LucideIcon> = {
  residential: Home,
  hospitality: Hotel,
  commercial: Building2,
  cultural: Landmark,
  "public-civic": Library,
  interior: LayoutGrid,
  "landscape-urban": Trees,
  other: Hammer,
};

/** Brief ordering. Categories outside this list sort after, by listing count. */
const PREFERRED = [
  "residential",
  "hospitality",
  "commercial",
  "cultural",
  "public-civic",
  "interior",
  "landscape-urban",
  "other",
];

export async function CategoryPillBar() {
  const categories = await getHomeCategories();
  if (categories.length === 0) return null;

  const ordered = [...categories].sort((a, b) => {
    const ai = PREFERRED.indexOf(a.slugPath);
    const bi = PREFERRED.indexOf(b.slugPath);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b.listingCount - a.listingCount;
  });

  const shown = ordered.slice(0, 8);

  return (
    <div className="relative z-10 -mt-10 px-4 md:px-12 lg:px-24">
      <div className="mx-auto max-w-content">
        <div className="rounded-xl bg-cream px-2 py-3 shadow-[0_2px_8px_rgba(22,22,22,0.06)]">
          {/* Horizontally scrollable below lg rather than wrapping or hiding
              items (Blueprint §9). */}
          <ul className="flex items-stretch gap-1 overflow-x-auto lg:justify-between lg:overflow-visible">
            {shown.map((c, i) => {
              const Icon = ICONS[c.slugPath] ?? LayoutGrid;
              const active = i === 0;
              return (
                <li key={c.id} className="min-w-0 shrink-0 lg:flex-1">
                  <Link
                    href={c.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex w-full flex-col items-center gap-2 rounded-lg px-4 py-3 transition-colors",
                      active ? "bg-ink text-cream" : "text-ink hover:bg-stone/50",
                    ].join(" ")}
                  >
                    <Icon strokeWidth={1.5} className="h-5 w-5" aria-hidden />
                    <span className="whitespace-nowrap font-body text-[12px] leading-[16px]">
                      {c.label}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="min-w-0 shrink-0 lg:flex-1">
              <Link
                href="/projects"
                className="flex w-full flex-col items-center gap-2 rounded-lg px-4 py-3 text-ink transition-colors hover:bg-stone/50"
              >
                <MoreHorizontal strokeWidth={1.5} className="h-5 w-5" aria-hidden />
                <span className="whitespace-nowrap font-body text-[12px] leading-[16px]">
                  More
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
