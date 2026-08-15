"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, Download } from "lucide-react";
import type { ProjectDetail } from "@/lib/db/projectDetail";

/**
 * Tabbed sub-navigation (brief §3).
 *
 * TAB SET, and why each is here or absent — measured against production:
 *   Overview   always
 *   Products   always rendered; empty state inside when this project has none
 *              (45 of 50 projects)
 *   Team       always rendered; 189 rows across 51 projects back it
 *   Drawings   CONDITIONAL on this listing having >= 1 document. All 60
 *              documents in the platform are on products, so today this is
 *              invisible on every project — and it self-activates with no code
 *              change the first time one is attached to a project.
 *   Collections OMITTED — folders/folder_items are private user save-folders
 *              (1 public folder, 5 public items platform-wide), not curated
 *              collections. Wrong semantics for a public detail page.
 *   Activity   OMITTED platform-wide — listing_views 0, listing_saves 0, and
 *              no per-listing activity feed exists at all.
 *
 * Horizontally scrollable pill bar below lg, per the responsive notes.
 */
export function ProjectDetailTabs({ project }: { project: ProjectDetail }) {
  const tabs = [
    { key: "overview", label: "Overview", count: null as number | null },
    { key: "products", label: "Products", count: project.products.length },
    { key: "team", label: "Team", count: project.team.length },
    ...(project.documents.length > 0
      ? [{ key: "drawings", label: "Drawings", count: project.documents.length }]
      : []),
  ];

  const [active, setActive] = useState("overview");

  return (
    <div className="mt-8">
      <div className="border-b border-hairline">
        <ul className="flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((t) => {
            const isActive = t.key === active;
            return (
              <li key={t.key} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(t.key)}
                  className={[
                    "whitespace-nowrap border-b-2 px-4 py-3 font-body text-[14px] transition-colors",
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                  {t.count !== null && <span className="ml-1.5 opacity-60">{t.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="py-8" role="tabpanel">
        {active === "overview" && <OverviewPanel project={project} />}
        {active === "products" && <ProductsPanel project={project} />}
        {active === "team" && <TeamPanel project={project} />}
        {active === "drawings" && <DrawingsPanel project={project} />}
      </div>
    </div>
  );
}

function OverviewPanel({ project }: { project: ProjectDetail }) {
  return (
    <div>
      <h2 className="font-display text-[20px] tracking-tight text-ink">About the Project</h2>
      {project.description ? (
        <div className="mt-4 max-w-[68ch] space-y-4">
          {project.description
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((para, i) => (
              <p key={i} className="font-body text-[15px] leading-[26px] text-ink/85">
                {para.trim()}
              </p>
            ))}
        </div>
      ) : (
        // Public read page: state the absence, never prompt an edit.
        <p className="mt-4 font-body text-[14px] text-muted">No description added yet.</p>
      )}

      {project.materials.length > 0 && (
        <div className="mt-8">
          <h3 className="font-body text-[13px] font-medium text-ink">Materials</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.materials.map((m) => (
              <li
                key={m}
                className="rounded-full border border-hairline px-3 py-1 font-body text-[12px] text-muted"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProductsPanel({ project }: { project: ProjectDetail }) {
  if (project.products.length === 0) {
    return (
      <p className="font-body text-[14px] text-muted">
        No products have been tagged in this project yet.{" "}
        <Link href="/products" className="text-ink underline underline-offset-4">
          Browse all products
        </Link>
        .
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
      {project.products.map((p) => (
        <li key={p.id}>
          <Link href={p.href} className="group block">
            <span className="relative block aspect-square overflow-hidden rounded-lg bg-stone">
              {p.cover && (
                <Image
                  src={p.cover}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, 22vw"
                  className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              )}
            </span>
            <span className="mt-3 block font-body text-[14px] text-ink">{p.title}</span>
            {p.category && (
              <span className="mt-0.5 block font-body text-[12px] text-muted">{p.category}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TeamPanel({ project }: { project: ProjectDetail }) {
  if (project.team.length === 0) {
    return <p className="font-body text-[14px] text-muted">No team credits added yet.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {project.team.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-xl border border-hairline bg-cream p-4"
        >
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone">
            {t.avatarUrl && (
              <Image src={t.avatarUrl} alt="" fill sizes="44px" className="object-cover" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-[14px] text-ink">{t.name}</span>
            {t.role && (
              <span className="block truncate font-body text-[12px] text-muted">{t.role}</span>
            )}
          </span>
          {/* Link only when a username resolves — otherwise omitted rather than
              pointing at a 404. */}
          {t.profileUsername && (
            <Link
              href={`/u/${t.profileUsername}`}
              className="shrink-0 font-body text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              View
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function DrawingsPanel({ project }: { project: ProjectDetail }) {
  return (
    <ul className="space-y-2">
      {project.documents.map((d) => (
        <li key={d.id}>
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 transition-colors hover:bg-stone/40"
          >
            <FileText strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-body text-[14px] text-ink">
              {d.name}
            </span>
            <Download strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
