"use client";

import Image from "next/image";
import Link from "next/link";

export interface ProductListItem {
  id: string;
  slug: string;
  title: string;
  brand?: string | null;
  thumbnail?: string | null;
}

export interface ProductListProps {
  items: ProductListItem[];
  className?: string;
}

export function ProductList({ items, className = "" }: ProductListProps) {
  if (items.length === 0) return null;

  return (
    <ul className={"space-y-3 " + className} role="list">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={"/products/" + p.slug}
            className="flex items-center gap-3 rounded-md transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1"
          >
            <span className="relative h-[42px] w-14 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              {p.thumbnail ? (
                <Image
                  src={p.thumbnail}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized={String(p.thumbnail).startsWith("http")}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">—</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {p.title}
              </span>
              {p.brand?.trim() && (
                <span className="mt-0.5 inline-block rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {p.brand.trim()}
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
