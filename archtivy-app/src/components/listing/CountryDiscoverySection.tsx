"use client";

import { useState } from "react";
import Link from "next/link";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import Image from "next/image";
import { getListingUrl } from "@/lib/canonical";
import type { CountryProjectItem, CountryDesignerItem } from "@/lib/db/networkDiscovery";

/** Returns true only for absolute http/https URLs. */
function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

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
      {/* Legacy zinc + dark: card replaced by the shared one. Location here is
          location_city, which is exactly the field the site-wide location rule
          now uses, so this rail agrees with every other card by construction. */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const city = item.location_city != null ? String(item.location_city).trim() : "";
          return (
            <ListingCardShared
              key={item.id}
              model={{
                id: item.id,
                type: "project",
                title: item.title,
                href: getListingUrl({
                  id: item.id,
                  type: "project",
                  slug: item.slug,
                  taxonomy_slug_path: item.taxonomy_slug_path,
                }),
                imageUrl: isValidImageUrl(item.cover_image_url)
                  ? (item.cover_image_url as string)
                  : null,
                metaLabel: city || null,
                year: item.year ?? null,
              }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          );
        })}
      </div>
    </section>
  );
}

// ── Designer Avatar with onError fallback ───────────────────────────────────

function DesignerAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const validSrc = isValidImageUrl(src) && !failed;

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
      {validSrc ? (
        <Image
          src={src}
          alt=""
          fill
          className="object-cover object-center"
          sizes="64px"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-lg font-medium text-zinc-500 dark:text-zinc-400">
          {name[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
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
          href={`/designers?country=${encodeURIComponent(country)}`}
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
              <DesignerAvatar src={designer.avatar_url} name={displayName} />
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
