"use client";

import Link from "next/link";
import Image from "next/image";

export interface MoreInCategoryItem {
  id: string;
  slug: string | null;
  title: string;
  thumbnail?: string | null;
  /** For projects: location text */
  location?: string | null;
}

export interface MoreInCategoryBlockProps {
  /** Type for href and grid layout */
  type: "projects" | "products";
  items: MoreInCategoryItem[];
}

const MORE_LIMIT = 8;

/**
 * Compact card grid for "More in this category" on listing detail pages.
 * TODO: Prefer recent/popular when such sort fields exist.
 */
export function MoreInCategoryBlock({ type, items }: MoreInCategoryBlockProps) {
  const list = items.slice(0, MORE_LIMIT);
  if (list.length === 0) return null;

  const baseHref = type === "projects" ? "/projects" : "/products";
  const aspectClass = type === "projects" ? "aspect-[4/3]" : "aspect-square";

  return (
    <section
      className="mt-10 border-t border-zinc-100 pt-10 dark:border-zinc-800"
      aria-labelledby="more-in-category-heading"
    >
      <h2
        id="more-in-category-heading"
        className="mb-4 font-serif text-xl font-normal text-zinc-900 dark:text-zinc-100"
      >
        More in this category
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {list.map((item) => {
          const href = `${baseHref}/${item.slug ?? item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              className="group flex flex-col focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 rounded-lg dark:focus:ring-offset-zinc-950"
            >
              <div
                className={`relative w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 ${aspectClass}`}
              >
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt=""
                    fill
                    className="object-cover transition-opacity group-hover:opacity-95"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized={String(item.thumbnail).startsWith("http")}
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
              {type === "projects" && item.location && (
                <span className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {item.location}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
