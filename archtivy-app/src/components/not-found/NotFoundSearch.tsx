"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

export function NotFoundSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      router.push(`/explore/projects?q=${encodeURIComponent(q)}`);
    },
    [query, router]
  );

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto max-w-lg">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, products, brands, or professionals"
          className="w-full rounded border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#5b7cff] dark:focus:ring-[#5b7cff]/20"
        />
      </div>
    </form>
  );
}
