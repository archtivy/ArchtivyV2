"use client";

import Link from "next/link";
import Image from "next/image";
import type { CountryProjectItem, CountryDesignerItem } from "@/lib/db/networkDiscovery";

// ── More Projects from {Country} ────────────────────────────────────────────

interface CountryProjectsProps {
  country: string;
  items: CountryProjectItem[];
}

export function CountryProjectsSection({ country, items }: CountryProjectsProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="mt-10 border-t border-zinc-100 pt-10 dark:border-zinc-800"
      aria-labelledby="country-projects-heading"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          id="country-projects-heading"
          className="font-serif text-xl font-normal text-zinc-900 dark:text-zinc-100"
        >
          More Projects from {country}
        </h2>
        <Link
          href={`/explore/projects?country=${encodeURIComponent(country)}`}
          className="text-sm text-[#002abf] hover:underline"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {items.map((item) => {
          const href = `/projects/${item.slug ?? item.id}`;
          const locationParts: string[] = [];
          const city = item.location_city != null ? String(item.location_city).trim() : "";
          if (city) locationParts.push(city);
          if (item.year != null) locationParts.push(String(item.year));
          const subtitle = locationParts.join(" · ") || null;

          return (
            <Link
              key={item.id}
              href={href}
              className="group flex flex-col rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            >
              <div className="relative w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 aspect-[4/3]">
                {item.cover_image_url ? (
                  <Image
                    src={item.cover_image_url}
                    alt=""
                    fill
                    className="object-cover transition-opacity group-hover:opacity-95"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized={item.cover_image_url.startsWith("http")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                    —
                  </div>
                )}
              </div>
              <span className="mt-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-[#002abf] dark:group-hover:text-[#002abf]">
                {item.title}
              </span>
              {subtitle && (
                <span className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {subtitle}
                </span>
              )}
              {item.owner_display_name && (
                <span className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {item.owner_display_name}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Popular Designers from {Country} ────────────────────────────────────────

interface CountryDesignersProps {
  country: string;
  items: CountryDesignerItem[];
}

export function CountryDesignersSection({ country, items }: CountryDesignersProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="mt-10 border-t border-zinc-100 pt-10 dark:border-zinc-800"
      aria-labelledby="country-designers-heading"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          id="country-designers-heading"
          className="font-serif text-xl font-normal text-zinc-900 dark:text-zinc-100"
        >
          Popular Designers from {country}
        </h2>
        <Link
          href={`/explore/designers?country=${encodeURIComponent(country)}`}
          className="text-sm text-[#002abf] hover:underline"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {items.map((designer) => {
          const displayName = designer.display_name ?? designer.username ?? "Designer";
          const href = `/u/${encodeURIComponent(designer.username ?? "")}`;

          return (
            <Link
              key={designer.id}
              href={href}
              className="group flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-[#002abf]/30 hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#002abf]/40 dark:hover:bg-zinc-900/80 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
              style={{ borderRadius: 4 }}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                {designer.avatar_url ? (
                  <Image
                    src={designer.avatar_url}
                    alt=""
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized={!designer.avatar_url.includes("supabase.co")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-medium text-zinc-500 dark:text-zinc-400">
                    {displayName[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <span className="mt-3 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-[#002abf]">
                {displayName}
              </span>
              {designer.designer_discipline?.trim() && (
                <span className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {designer.designer_discipline.trim()}
                </span>
              )}
              {designer.location_city?.trim() && (
                <span className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {designer.location_city.trim()}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
