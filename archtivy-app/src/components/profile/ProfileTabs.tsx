"use client";

import { useState } from "react";
import { ListingGrid } from "@/components/profile/ProfileModules";
import type { ProfileListingCard } from "@/lib/db/profilePage";

export interface ProfileTab {
  key: string;
  label: string;
  items: ProfileListingCard[];
}

/**
 * Tab row beneath the hero.
 *
 * Only tabs with content are passed in — the reference design shows
 * Projects / Products / Collections / Articles on every profile, but this
 * platform has no per-profile collections or articles, so those two would be
 * permanently empty tabs. A tab that can never have content is worse than an
 * absent one: it reads as a broken feature rather than an unused one.
 *
 * With a single tab the row still renders, because it labels the grid below it
 * and keeps the page rhythm identical whether a profile has one section or two.
 */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  if (tabs.length === 0) return null;

  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="border-b border-hairline">
        <ul className="flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((t) => {
            const isActive = t.key === current.key;
            return (
              <li key={t.key} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(t.key)}
                  className={[
                    "whitespace-nowrap border-b-2 px-4 py-3 font-body text-[14px] transition-colors",
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                  <span className="ml-1.5 opacity-60">{t.items.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pt-8" role="tabpanel">
        <ListingGrid items={current.items} />
      </div>
    </div>
  );
}
