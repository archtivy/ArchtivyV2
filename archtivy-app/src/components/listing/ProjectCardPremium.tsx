"use client";

import Link from "next/link";
import Image from "next/image";
import type { ProjectCanonical } from "@/lib/canonical-models";
import { getListingUrl } from "@/lib/canonical";
import { getCityLabel, getOwnerProfileHref } from "@/lib/cardUtils";

export interface ProjectCardPremiumProps {
  project: ProjectCanonical;
}

function metaLine(p: ProjectCanonical): string {
  const city = getCityLabel(p);
  const year = p.year != null ? String(p.year) : null;
  const cat = p.category?.trim() || null;
  const parts = [city, year, cat].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "";
}

export function ProjectCardPremium({ project }: ProjectCardPremiumProps) {
  const href = getListingUrl({ id: project.id, type: "project" });
  const title = project.title?.trim() || "Project";
  const meta = metaLine(project);
  const connectionCount = project.connectionCount ?? 0;
  const owner = project.owner;
  const ownerLabel = owner?.displayName?.trim() || null;
  const ownerHref = ownerLabel ? getOwnerProfileHref(owner) : null;
  const showOwner = Boolean(ownerLabel);

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded border bg-white transition hover:shadow-md dark:bg-zinc-950"
      style={{ borderColor: "#f1f1f1" }}
    >
      <Link href={href} className="block shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-inset">
        <div className="aspect-[3/2] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
          {project.cover ? (
            <Image
              src={project.cover}
              alt={title}
              width={400}
              height={267}
              className="h-full w-full object-cover transition duration-200 hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500" aria-hidden>
              <span className="text-sm">—</span>
            </div>
          )}
        </div>
      </Link>
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
        <Link
          href={href}
          className="font-serif text-[18px] font-medium leading-tight tracking-tight text-zinc-900 hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#5b7cff] sm:text-xl line-clamp-2 min-h-[2.5rem] focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2"
        >
          {title}
        </Link>
        {showOwner && (
          <p className="mt-1.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            by{" "}
            {ownerHref ? (
              <Link
                href={ownerHref}
                className="text-zinc-500 no-underline transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#5b7cff] focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                {ownerLabel}
              </Link>
            ) : (
              <span>{ownerLabel}</span>
            )}
          </p>
        )}
        {meta && (
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {meta}
          </p>
        )}
        <p className="mt-auto pt-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-500">
          {connectionCount} {connectionCount === 1 ? "connection" : "connections"}
        </p>
      </div>
    </div>
  );
}
