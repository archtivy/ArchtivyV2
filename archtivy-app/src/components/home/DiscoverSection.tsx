"use client";

import { useState } from "react";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import type { ConnectedListing } from "@/lib/db/mostConnected";

/**
 * Discover — two tabs, ranked by how connected each listing is.
 *
 * ── "MOST CONNECTED", NOT "POPULAR" ─────────────────────────────────────────
 * The label names the actual sort. There is no engagement data to rank on
 * (listing_views, listing_saves and bookmarks are all empty and saves_count is
 * 0 on every listing), so a "Popular" tab would be a recency list wearing a
 * borrowed name. Connection count is real, varies, and is the thing the
 * platform is organised around — see lib/db/mostConnected.ts for the full note.
 *
 * The ranking used to be justified by a "N connections" chip on each card.
 * The shared listing card now carries the same information decomposed — the
 * "Used in N projects" badge and, on project cards, the credited-people line —
 * so the chip was removed rather than shown twice in two different shapes.
 *
 * ── EMPTY TABS ARE DROPPED, NOT SHOWN EMPTY ─────────────────────────────────
 * A tab with nothing behind it is removed from the tab strip, and if neither
 * has anything the section does not render at all. Same rule as the "Seen in
 * Projects" rail: self-activating, no placeholder to clean up later.
 */

export interface DiscoverSectionProps {
  projects: ConnectedListing[];
  products: ConnectedListing[];
  /** Prebuilt canonical hrefs, resolved server-side. */
  hrefById: Record<string, string>;
}

type TabId = "projects" | "products";

export function DiscoverSection({ projects, products, hrefById }: DiscoverSectionProps) {
  const allTabs: { id: TabId; label: string; items: ConnectedListing[]; href: string }[] = [
    { id: "projects", label: "Most Connected Projects", items: projects, href: "/projects" },
    { id: "products", label: "Most Connected Products", items: products, href: "/products" },
  ];
  const tabs = allTabs.filter((t) => t.items.length > 0);

  const [active, setActive] = useState<TabId>(tabs[0]?.id ?? "projects");

  if (tabs.length === 0) return null;

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section className="py-14" aria-labelledby="discover-heading">
      <HomeSectionHeader
        title="Discover"
        href={current.href}
        linkLabel={current.id === "projects" ? "View all projects" : "View all products"}
      />

      {/* One tab is not a choice — the strip is suppressed rather than rendered
          as a single dead control. */}
      {tabs.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Discover by type">
          {tabs.map((t) => {
            const selected = t.id === current.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(t.id)}
                className={[
                  "rounded-full px-4 py-2 font-body text-[13px] transition-colors",
                  selected
                    ? "bg-ink text-cream"
                    : "border border-hairline bg-transparent text-muted hover:border-ink/30 hover:text-ink",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-5"
        role="tabpanel"
      >
        {current.items.slice(0, 5).map((item, i) => (
          <ListingCardShared
            key={item.id}
            model={{
              id: item.id,
              type: item.type,
              title: item.title,
              href: hrefById[item.id] ?? "#",
              imageUrl: item.imageUrl,
              metaLabel: item.location,
              authorName: item.subtitle,
            }}
            ratio={current.id === "products" ? "1/1" : "4/3"}
            priority={i < 2}
          />
        ))}
      </div>
    </section>
  );
}
