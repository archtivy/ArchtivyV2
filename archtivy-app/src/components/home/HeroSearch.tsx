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
    router.push(q ? `/explore/projects?q=${encodeURIComponent(q)}` : "/explore/projects");
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
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-body text-[13px] text-cream/60">Popular searches:</span>
          <ul className="flex flex-wrap gap-2">
            {popularSearches.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="inline-flex rounded-full border border-cream/35 px-3 py-1 font-body text-[12px] text-cream/90 transition-colors hover:bg-cream/10"
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
