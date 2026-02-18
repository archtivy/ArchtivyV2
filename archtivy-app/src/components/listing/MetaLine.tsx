"use client";

import Link from "next/link";

const SEP = " · ";

export interface MetaLinePart {
  label: string;
  href?: string | null;
}

export interface MetaLineProps {
  parts: MetaLinePart[];
  /** Optional class for the container */
  className?: string;
}

/**
 * Single-line meta under a title: City · Year · Category · Area.
 * Each item clickable when href is set; subtle gray, hover Archtivy blue.
 */
export function MetaLine({ parts, className = "" }: MetaLineProps) {
  const filtered = parts.filter((p) => p.label?.trim());
  if (filtered.length === 0) return null;

  return (
    <p
      className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`.trim()}
      aria-label="Project metadata"
    >
      {filtered.map((part, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden>{SEP}</span>}
          {part.href?.trim() ? (
            <Link
              href={part.href}
              className="transition-colors hover:text-[#002abf] dark:hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded"
            >
              {part.label.trim()}
            </Link>
          ) : (
            <span>{part.label.trim()}</span>
          )}
        </span>
      ))}
    </p>
  );
}
