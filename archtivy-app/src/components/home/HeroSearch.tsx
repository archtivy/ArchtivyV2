"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

/**
 * Hero search bar (Build Brief §2).
 *
 * Deliberately NOT the shared HomeHeroSearch component: that one carries a
 * projects/products scope toggle and suggestion popover that the brief's hero
 * does not have. Rather than add a fourth styling mode to a shared component
 * used elsewhere, this is a homepage-scoped input that submits to the same
 * destination the shared component uses — /explore/{scope}?q= — so search
 * behaviour stays consistent even though the chrome differs.
 */

export interface HeroSearchProps {
  popularSearches: { label: string; href: string }[];
}

export function HeroSearch({ popularSearches }: HeroSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    // /projects is the canonical project discovery route. This used to
    // push to /explore/projects, which is now a 308 to exactly this URL —
    // going straight there saves every visitor a redirect hop.
    router.push(q ? `/projects?q=${encodeURIComponent(q)}` : "/projects");
  }

  return (
    <div className="w-full max-w-[560px]">
      <form onSubmit={onSubmit} className="relative">
        <label htmlFor="home-hero-search" className="sr-only">
          Search projects, designers, products, brands
        </label>
        <input
          id="home-hero-search"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search projects, designers, products, brands..."
          className="h-[56px] w-full rounded-full border border-transparent bg-cream pl-6 pr-16 font-body text-[15px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cream focus:ring-offset-2 focus:ring-offset-ink"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-cream transition-opacity hover:opacity-90"
        >
          <Search strokeWidth={1.5} className="h-4 w-4" />
        </button>
      </form>

      {popularSearches.length > 0 && (
        /* ── ONE ROW, EQUAL CHIPS ──────────────────────────────────────────
           Was `flex-wrap` on both the row and the list with `py-1` chips: the
           chips took their height from the text metrics rather than a fixed
           box, and a label that did not fit dropped to a second line under the
           label, so the row read as ragged rather than as a set.

           Now: a fixed 28px box with the text centred in it, `flex-nowrap`, and
           horizontal scroll when the row runs out of width — the same treatment
           the Showcase filter pills already use, rather than a new one. */
        <div className="mt-5 flex items-center gap-x-3">
          <span className="shrink-0 font-body text-[13px] text-cream/60">
            Popular searches:
          </span>
          {/* The right edge fades so an overflowing row reads as "scrollable"
              rather than as a chip sliced in half. It masks the ul's own right
              edge, so when the chips fit the fade falls on empty space and
              nothing is dimmed. */}
          <ul className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {popularSearches.map((p) => (
              <li key={p.href} className="shrink-0">
                <Link
                  href={p.href}
                  className="inline-flex h-7 items-center whitespace-nowrap rounded-full border border-cream/35 px-3 font-body text-[12px] leading-none text-cream/90 transition-colors hover:bg-cream/10"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
