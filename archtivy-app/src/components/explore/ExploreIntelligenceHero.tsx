"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ACCENT = "#002abf";

export function ExploreIntelligenceHero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", term);
    startTransition(() => {
      router.push(`/explore/projects?${params.toString()}`);
    });
  };

  const handleQuickButton = (action: "nearby" | "trending" | "connected") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("quick", action);
    startTransition(() => {
      router.push(`/explore?${params.toString()}`);
    });
  };

  const inputClass =
    "w-full rounded border border-[#eeeeee] bg-white px-4 py-3.5 text-base text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#002abf] focus:ring-1 focus:ring-[#002abf]/20";
  const btnClass =
    "rounded border border-[#eeeeee] bg-white px-4 py-2.5 text-sm font-medium text-[#002abf] hover:bg-[#fafafa] hover:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/30 disabled:opacity-50";

  return (
    <section className="py-16 sm:py-20" aria-label="Explore hero">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
          Where would you like to position your architecture?
        </h1>
        <p className="mt-3 text-base text-zinc-600 sm:text-lg">
          Search projects, designers, brands or cities to explore network intelligence.
        </p>

        <form onSubmit={handleSearch} className="mt-8 max-w-2xl">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search city, material, designer, brand or project…"
            className={inputClass}
            style={{ borderRadius: 4 }}
            aria-label="Search"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickButton("nearby")}
              disabled={isPending}
              className={btnClass}
              style={{ borderRadius: 4 }}
            >
              Nearby Me
            </button>
            <button
              type="button"
              onClick={() => handleQuickButton("trending")}
              disabled={isPending}
              className={btnClass}
              style={{ borderRadius: 4 }}
            >
              Trending Now
            </button>
            <button
              type="button"
              onClick={() => handleQuickButton("connected")}
              disabled={isPending}
              className={btnClass}
              style={{ borderRadius: 4 }}
            >
              Most Connected
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
