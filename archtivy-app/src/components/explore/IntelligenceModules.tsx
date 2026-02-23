"use client";

import Link from "next/link";
import Image from "next/image";
import type { ExploreModules } from "@/lib/explore/queries";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

export interface IntelligenceModulesProps {
  modules: ExploreModules;
  city?: string | null;
  onViewAll: (panel: ExplorePanelType) => void;
}

export function IntelligenceModules({ modules, onViewAll }: IntelligenceModulesProps) {
  const viewAllClass = "text-sm font-medium text-[#002abf] hover:underline";

  const thumbBlock = (thumbs: string[]) =>
    thumbs.slice(0, 3).map((src, i) => (
      <div
        key={i}
        className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-zinc-100"
        style={{ borderRadius: 4 }}
      >
        {src ? (
          <Image src={src} alt="" fill className="object-cover" sizes="64px" unoptimized={src.startsWith("http")} />
        ) : null}
      </div>
    ));

  return (
    <section className="border-t border-[#eeeeee] py-12" aria-label="Intelligence modules">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-10">
            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Market Leaders</h2>
              {modules.marketLeadersDesigners.length > 0 ? (
                <>
                  <ul className="mt-4 space-y-4">
                    {modules.marketLeadersDesigners.map((d) => (
                      <li
                        key={d.id}
                        className="rounded border border-[#eeeeee] bg-white p-4"
                        style={{ borderRadius: 4 }}
                      >
                        <p className="text-sm font-medium text-zinc-900">{d.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">Collaboration Score {d.score}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Appears in {d.projectsCount} multi-team projects
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="flex gap-1">{thumbBlock(d.projectThumbs)}</div>
                          {d.brands.length > 0 && (
                            <>
                              <span className="text-xs text-zinc-400">|</span>
                              <span className="text-xs text-zinc-500">{d.brands.join(" · ")}</span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => onViewAll("market-leaders")} className={viewAllClass}>
                    View All
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No designers yet.</p>
              )}
            </div>

            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Top Projects</h2>
              {modules.topProjects.length > 0 ? (
                <>
                  <ul className="mt-4 space-y-3">
                    {modules.topProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.slug ?? p.id}`}
                        className="flex items-center gap-3 rounded border border-[#eeeeee] bg-white p-3 transition hover:bg-zinc-50"
                        style={{ borderRadius: 4 }}
                      >
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-zinc-100" style={{ borderRadius: 4 }}>
                          {p.coverImage ? (
                            <Image src={p.coverImage} alt="" fill className="object-cover" sizes="64px" unoptimized={p.coverImage.startsWith("http")} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{p.title}</span>
                      </Link>
                    ))}
                  </ul>
                  <button type="button" onClick={() => onViewAll("projects")} className={viewAllClass}>
                    View All
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No projects yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Strategic Brands</h2>
              {modules.strategicBrands.length > 0 ? (
                <>
                  <ul className="mt-4 space-y-4">
                    {modules.strategicBrands.map((b) => (
                      <li
                        key={b.id}
                        className="rounded border border-[#eeeeee] bg-white p-4"
                        style={{ borderRadius: 4 }}
                      >
                        <p className="text-sm font-medium text-zinc-900">{b.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">Used in {b.projectsCount} projects</p>
                        <p className="text-xs text-zinc-500">Connected to {b.designersCount} designers</p>
                        <div className="mt-3 flex gap-1">{thumbBlock(b.projectThumbs)}</div>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => onViewAll("brands")} className={viewAllClass}>
                    View All
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No brands yet.</p>
              )}
            </div>

            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Product Leaders</h2>
              {modules.productLeaders.length > 0 ? (
                <>
                  <ul className="mt-4 space-y-4">
                    {modules.productLeaders.map((p) => (
                      <li
                        key={p.id}
                        className="rounded border border-[#eeeeee] bg-white p-4"
                        style={{ borderRadius: 4 }}
                      >
                        <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">Used in {p.projectsCount} projects</p>
                        {p.brandName && (
                          <p className="text-xs text-zinc-500">by {p.brandName}</p>
                        )}
                        <div className="mt-3 flex gap-1">{thumbBlock(p.projectThumbs)}</div>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => onViewAll("products")} className={viewAllClass}>
                    View All
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No products yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
