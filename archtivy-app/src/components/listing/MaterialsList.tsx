"use client";

import Link from "next/link";

export interface MaterialItem {
  id: string;
  name: string;
  slug?: string;
}

export interface MaterialsListProps {
  materials: MaterialItem[];
  /** If provided, each material links to explore with this filter builder */
  exploreUrl?: (slug: string) => string;
  /** 'list' | 'pills' */
  variant?: "list" | "pills";
  className?: string;
}

/**
 * Editorial style: tight vertical list or subtle pill tags.
 */
export function MaterialsList({
  materials,
  exploreUrl,
  variant = "pills",
  className = "",
}: MaterialsListProps) {
  if (materials.length === 0) return null;

  if (variant === "list") {
    return (
      <ul className={`space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 ${className}`.trim()} role="list">
        {materials.map((m) => {
          const href = exploreUrl && m.slug ? exploreUrl(m.slug) : null;
          const content = m.name?.trim() || "—";
          return (
            <li key={m.id}>
              {href ? (
                <Link
                  href={href}
                  className="transition-colors hover:text-[#002abf] dark:hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded"
                >
                  {content}
                </Link>
              ) : (
                <span>{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {materials.map((m) => {
        const href = exploreUrl && m.slug ? exploreUrl(m.slug) : null;
        const content = m.name?.trim() || "—";
        const pillClass =
          "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition-colors dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 " +
          (href
            ? "hover:border-[#002abf]/40 hover:text-[#002abf] dark:hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1"
            : "");
        return href ? (
          <Link key={m.id} href={href} className={pillClass}>
            {content}
          </Link>
        ) : (
          <span key={m.id} className={pillClass}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
