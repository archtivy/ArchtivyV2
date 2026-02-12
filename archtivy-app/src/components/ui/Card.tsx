import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

interface CardProps {
  href: string;
  /** Optional image URL; if missing, a neutral placeholder is shown */
  imageUrl?: string | null;
  imageAlt?: string;
  title: string;
  /** Subtitle under title (e.g. location or date) */
  subtitle?: ReactNode;
  className?: string;
}

export function Card({
  href,
  imageUrl,
  imageAlt,
  title,
  subtitle,
  className = "",
}: CardProps) {
  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-archtivy-primary/50 hover:shadow focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-offset-zinc-950 ${className}`.trim()}
    >
      <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800/80">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? title}
            width={400}
            height={300}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500"
            aria-hidden
          >
            <span className="text-sm font-medium">No image</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-zinc-900 group-hover:opacity-90 dark:text-zinc-100 dark:group-hover:opacity-90">
          {title}
        </h3>
        {subtitle != null && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
