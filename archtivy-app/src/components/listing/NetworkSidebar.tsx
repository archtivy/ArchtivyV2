"use client";

import Link from "next/link";
import { TeamList, type TeamListMember } from "./TeamList";
import { ProductList, type ProductListItem } from "./ProductList";
import { MaterialsList, type MaterialItem } from "./MaterialsList";
import { projectExploreUrl } from "@/lib/exploreUrls";

export interface NetworkSidebarProps {
  teamMembers: TeamListMember[];
  usedProducts: ProductListItem[];
  materials: MaterialItem[];
  /** "Shared by" line above Team Members: display name of listing owner */
  sharedByDisplayName?: string | null;
  /** Profile URL for shared-by name (optional) */
  sharedByHref?: string | null;
  mapHref?: string | null;
  className?: string;
}

/**
 * Network sidebar: Team Members, Used Products, Materials.
 * White background, soft border, 4px radius, minimal separators, sticky on desktop.
 */
export function NetworkSidebar({
  teamMembers,
  usedProducts,
  materials,
  sharedByDisplayName,
  sharedByHref,
  mapHref,
  className = "",
}: NetworkSidebarProps) {
  const hasTeam = teamMembers.length > 0;
  const hasProducts = usedProducts.length > 0;
  const hasMaterials = materials.length > 0;
  const hasAny = hasTeam || hasProducts || hasMaterials;

  if (!hasAny && !mapHref?.trim()) return null;

  const exploreUrlForMaterial = (slug: string) => projectExploreUrl({ materials: [slug] });

  return (
    <aside
      className={"sticky top-6 self-start rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50 " + className}
      aria-label="Network"
    >
      {hasTeam && (
        <section className="border-b border-zinc-100 pb-5 dark:border-zinc-800" aria-labelledby="network-team-heading">
          {sharedByDisplayName?.trim() && (
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Shared by{" "}
              {sharedByHref?.trim() ? (
                <Link href={sharedByHref} className="text-zinc-600 hover:text-[#002abf] dark:text-zinc-300 dark:hover:text-[#5b7cff] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded">
                  {sharedByDisplayName.trim()}
                </Link>
              ) : (
                <span>{sharedByDisplayName.trim()}</span>
              )}
            </p>
          )}
          <h2 id="network-team-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Team Members
          </h2>
          <TeamList members={teamMembers} />
        </section>
      )}
      {hasProducts && (
        <section className={hasTeam ? "border-b border-zinc-100 pt-5 pb-5 dark:border-zinc-800" : "pb-5"} aria-labelledby="network-products-heading">
          <h2 id="network-products-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Used Products
          </h2>
          <ProductList items={usedProducts} />
        </section>
      )}
      {hasMaterials && (
        <section className={hasTeam || hasProducts ? "border-b border-zinc-100 pt-5 pb-5 dark:border-zinc-800" : "pb-5"} aria-labelledby="network-materials-heading">
          <h2 id="network-materials-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Materials
          </h2>
          <MaterialsList materials={materials} exploreUrl={exploreUrlForMaterial} variant="pills" />
        </section>
      )}
      {mapHref?.trim() && (
        <div className="pt-4">
          <Link
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            style={{ backgroundColor: "#002abf" }}
          >
            Explore on Map
          </Link>
        </div>
      )}
    </aside>
  );
}
