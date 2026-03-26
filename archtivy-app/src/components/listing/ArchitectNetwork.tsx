"use client";

import Link from "next/link";
import Image from "next/image";
import { getListingUrl } from "@/lib/canonical";

export interface ArchitectProjectCard {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  location_city: string | null;
  location_country: string | null;
  year: string | null;
  taxonomy_slug_path?: string | null;
}

export interface ArchitectNetworkProps {
  displayName: string;
  profileHref: string | null;
  projects: ArchitectProjectCard[];
}

export function ArchitectNetwork({ displayName, profileHref, projects }: ArchitectNetworkProps) {
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="architect-network-heading">
      <h2
        id="architect-network-heading"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        More from {displayName}
      </h2>
      <div className="space-y-2">
        {projects.map((p) => {
          const href = getListingUrl({ id: p.id, type: "project", slug: p.slug, taxonomy_slug_path: p.taxonomy_slug_path });
          const loc = [p.location_city, p.location_country].filter(Boolean).join(", ");
          return (
            <Link
              key={p.id}
              href={href}
              className="group flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                {p.cover_image_url ? (
                  <Image
                    src={p.cover_image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized={p.cover_image_url.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                    —
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-900 group-hover:text-[#002abf] dark:text-zinc-100">
                  {p.title}
                </span>
                {(loc || p.year) && (
                  <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {[loc, p.year].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {profileHref && (
        <Link
          href={profileHref}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#002abf] transition-colors hover:text-[#0022a0] dark:text-[#5b7cff]"
        >
          View full portfolio
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      )}
    </section>
  );
}
