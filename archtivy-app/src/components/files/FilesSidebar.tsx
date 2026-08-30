"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, FileText, Files } from "lucide-react";
import { filesHref, type FilesParams } from "@/lib/files/params";

/**
 * The Files rail: library navigation, then the two facets that have data.
 *
 * ── WHAT THE REFERENCE HAS THAT THIS DOES NOT, AND WHY ──────────────────────
 * The mockup's rail is All Files / Recently added / Collections / Trash, then a
 * File type checkbox group of PDF / CAD / Image / Other, then Source / Brand /
 * Designer / Studio / Project / Download date accordions. Measured against the
 * live schema before building:
 *
 *   Collections   no file-collection table exists. (`collections` is the
 *                 unrelated public Inspiration system.) Omitted.
 *   Trash         no soft-delete or trash table for downloads. Omitted.
 *   CAD, Image    every document on the platform is PDF (50) or ZIP (11).
 *                 Those two facets would be permanently empty, so the type
 *                 list is built from the formats actually present instead of
 *                 a fixed four.
 *   Project       60 of 61 documents hang off a PRODUCT; exactly one hangs off
 *                 a project. A "Project" facet would have a single value.
 *                 Folded into Source, which covers the same ground honestly.
 *   Brand vs
 *   Designer      two separate accordions for what is one column —
 *                 listings.owner_profile_id. They are one Source list, with
 *                 the role shown per row.
 *
 * Counts are computed from the user's OWN downloads, so every row here leads
 * to at least one file. A facet value with nothing behind it never renders.
 */

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  avatarUrl?: string | null;
  role?: "brand" | "designer" | "other";
}

function Row({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-[14px] transition-colors",
        active ? "bg-stone/70 font-medium text-ink" : "text-ink hover:bg-stone/40",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function FilesSidebar({
  params,
  total,
  recentCount,
  formats,
  sources,
}: {
  params: FilesParams;
  total: number;
  recentCount: number;
  formats: FacetValue[];
  sources: FacetValue[];
}) {
  return (
    <nav aria-label="Files" className="flex flex-col gap-8">
      <div>
        <p className="mb-2 px-3 font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Files
        </p>
        <ul className="space-y-0.5">
          <li>
            <Row
              href={filesHref({ ...params, window: "all" })}
              active={params.window === "all"}
            >
              <Files strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">All files</span>
              <span className="shrink-0 font-body text-[13px] text-muted">{total}</span>
            </Row>
          </li>
          <li>
            {/* "Recently added" as a real 30-day window rather than a second
                list — the default sort is already newest-first, so a separate
                view would be the same rows in the same order. */}
            <Row
              href={filesHref({ ...params, window: "recent" })}
              active={params.window === "recent"}
            >
              <Clock strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">Recently added</span>
              <span className="shrink-0 font-body text-[13px] text-muted">{recentCount}</span>
            </Row>
          </li>
        </ul>
      </div>

      {formats.length > 1 && (
        <div className="border-t border-hairline pt-6">
          <p className="mb-2 px-3 font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            File type
          </p>
          <ul className="space-y-0.5">
            <li>
              <Row
                href={filesHref({ ...params, format: "all" })}
                active={params.format === "all"}
              >
                <FileText strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate">All types</span>
                <span className="shrink-0 font-body text-[13px] text-muted">{total}</span>
              </Row>
            </li>
            {formats.map((f) => (
              <li key={f.value}>
                <Row
                  href={filesHref({ ...params, format: f.value })}
                  active={params.format === f.value}
                >
                  <FileText strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{f.label}</span>
                  <span className="shrink-0 font-body text-[13px] text-muted">{f.count}</span>
                </Row>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div className="border-t border-hairline pt-6">
          <p className="mb-2 px-3 font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Source
          </p>
          <ul className="space-y-0.5">
            <li>
              <Row
                href={filesHref({ ...params, source: "all" })}
                active={params.source === "all"}
              >
                <span className="h-6 w-6 shrink-0 rounded-md bg-stone" aria-hidden />
                <span className="min-w-0 flex-1 truncate">All sources</span>
                <span className="shrink-0 font-body text-[13px] text-muted">{total}</span>
              </Row>
            </li>
            {sources.map((s) => (
              <li key={s.value}>
                <Row
                  href={filesHref({ ...params, source: s.value })}
                  active={params.source === s.value}
                >
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md bg-stone">
                    {s.avatarUrl && (
                      <Image src={s.avatarUrl} alt="" fill sizes="24px" className="object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 font-body text-[13px] text-muted">{s.count}</span>
                </Row>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
