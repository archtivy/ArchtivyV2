"use client";

import Link from "next/link";
import Image from "next/image";

export interface BrandChipProps {
  name: string;
  href?: string | null;
  logoUrl?: string | null;
  /** "pill" = soft gray background only, no border (e.g. product detail under title) */
  variant?: "default" | "pill";
  className?: string;
}

export function BrandChip({ name, href, logoUrl, variant = "default", className = "" }: BrandChipProps) {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const content = (
    <>
      {logoUrl?.trim() ? (
        <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={logoUrl}
            alt=""
            width={24}
            height={24}
            className="object-cover"
            unoptimized={logoUrl.startsWith("http")}
          />
        </span>
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" aria-hidden>
          {trimmed[0].toUpperCase()}
        </span>
      )}
      <span className="truncate">{trimmed}</span>
    </>
  );

  const baseClass = "inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 dark:text-zinc-100";
  const chipClass =
    variant === "pill"
      ? "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium text-[#374151] tracking-wide focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 dark:text-zinc-300 " +
        "bg-[#f5f5f5] hover:bg-[#ebebeb] hover:text-[#002abf] dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-[#5b7cff]"
      : baseClass + " rounded-md border border-zinc-200 bg-white hover:border-[#002abf]/30 hover:text-[#002abf] dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-[#002abf]/40 dark:hover:text-[#002abf]";

  if (href?.trim()) {
    return (
      <Link href={href} className={chipClass + " " + className}>
        {content}
      </Link>
    );
  }
  return (
    <span className={chipClass + " cursor-default " + className}>
      {content}
    </span>
  );
}
