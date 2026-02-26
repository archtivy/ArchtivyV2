"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface ExploreBottomSearchProps {
  city?: string | null;
}

export function ExploreBottomSearch({ city }: ExploreBottomSearchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cityValue, setCityValue] = useState(city ?? "");
  const [keyword, setKeyword] = useState("");

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cityValue.trim();
    startTransition(() => {
      if (trimmed) {
        router.push(`/explore?city=${encodeURIComponent(trimmed)}`);
      } else {
        router.push("/explore");
      }
    });
  };

  const handleKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;
    startTransition(() => {
      router.push(`/explore/projects?q=${encodeURIComponent(trimmed)}`);
    });
  };

  const inputClass =
    "w-full rounded border border-[#eeeeee] bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#002abf] focus:ring-1 focus:ring-[#002abf]/20 disabled:opacity-60";

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[#eeeeee] bg-white">
      <div className="mx-auto flex max-w-[1040px] items-end gap-3 px-4 py-3 sm:px-6">
        {/* City filter */}
        <form onSubmit={handleCitySubmit} className="flex flex-1 flex-col gap-1 min-w-0">
          <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Filter by city
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cityValue}
              onChange={(e) => setCityValue(e.target.value)}
              placeholder="e.g. London, Tokyo…"
              className={inputClass}
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded border border-[#002abf] bg-[#002abf] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#001fa0] disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </form>

        {/* Keyword search */}
        <form onSubmit={handleKeywordSubmit} className="flex flex-1 flex-col gap-1 min-w-0">
          <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Search projects
          </label>
          <div className="flex gap-2">
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Designer, material, brand…"
              className={inputClass}
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !keyword.trim()}
              className="shrink-0 rounded border border-[#eeeeee] bg-white px-3 py-2 text-xs font-medium text-[#002abf] transition hover:border-[#002abf]/40 hover:bg-zinc-50 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
