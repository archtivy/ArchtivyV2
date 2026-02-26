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

function ViewAllButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#002abf] transition-all hover:gap-2"
      aria-label={`View all ${label}`}
    >
      View all <span aria-hidden>→</span>
    </button>
  );
}

function ThumbRow({ thumbs }: { thumbs: string[] }) {
  return (
    <div className="flex gap-1.5">
      {thumbs.slice(0, 3).map((src, i) => (
        <div key={i} className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-zinc-100">
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={src.startsWith("http")}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function IntelligenceModules({ modules, onViewAll }: IntelligenceModulesProps) {
  const hasMarketLeaders = modules.marketLeadersDesigners.length > 0;
  const hasStrategicBrands = modules.strategicBrands.length > 0;
  const hasTopProjects = modules.topProjects.length > 0;
  const hasProductLeaders = modules.productLeaders.length > 0;

  const hasPrimary = hasMarketLeaders || hasStrategicBrands;
  const hasSecondary = hasTopProjects || hasProductLeaders;

  if (!hasPrimary && !hasSecondary) return null;

  return (
    <>
      {/* Primary Intelligence Grid */}
      {hasPrimary && (
        <section className="border-t border-[#eeeeee] py-12" aria-label="Primary intelligence">
          <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
            <p className="mb-8 text-xs font-medium uppercase tracking-widest text-zinc-400">
              Primary Intelligence
            </p>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              {/* Market Leaders */}
              {hasMarketLeaders && (
                <div>
                  <h2 className="font-serif text-2xl font-normal text-zinc-900">Market Leaders</h2>
                  <ul className="mt-5 space-y-4">
                    {modules.marketLeadersDesigners.map((d) => (
                      <li key={d.id} className="rounded border border-[#eeeeee] bg-white p-4">
                        {d.slug ? (
                          <Link
                            href={`/designers/${d.slug}`}
                            className="text-sm font-medium text-zinc-900 hover:text-[#002abf]"
                          >
                            {d.name}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-zinc-900">{d.name}</p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Collaboration Score {d.score} · {d.projectsCount} projects
                        </p>
                        {d.brands.length > 0 && (
                          <p className="mt-1 text-xs text-zinc-400">{d.brands.join(" · ")}</p>
                        )}
                        {d.projectThumbs.length > 0 && (
                          <div className="mt-3">
                            <ThumbRow thumbs={d.projectThumbs} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <ViewAllButton onClick={() => onViewAll("market-leaders")} label="market leaders" />
                </div>
              )}

              {/* Strategic Brands */}
              {hasStrategicBrands && (
                <div>
                  <h2 className="font-serif text-2xl font-normal text-zinc-900">Strategic Brands</h2>
                  <ul className="mt-5 space-y-4">
                    {modules.strategicBrands.map((b) => (
                      <li key={b.id} className="rounded border border-[#eeeeee] bg-white p-4">
                        {b.slug ? (
                          <Link
                            href={`/brands/${b.slug}`}
                            className="text-sm font-medium text-zinc-900 hover:text-[#002abf]"
                          >
                            {b.name}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-zinc-900">{b.name}</p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {b.projectsCount} projects · {b.designersCount} designers
                        </p>
                        {b.projectThumbs.length > 0 && (
                          <div className="mt-3">
                            <ThumbRow thumbs={b.projectThumbs} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <ViewAllButton onClick={() => onViewAll("brands")} label="brands" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Secondary Intelligence Grid */}
      {hasSecondary && (
        <section className="border-t border-[#eeeeee] py-12" aria-label="Secondary intelligence">
          <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
            <p className="mb-8 text-xs font-medium uppercase tracking-widest text-zinc-400">
              Network Intelligence
            </p>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              {/* Top Projects */}
              {hasTopProjects && (
                <div>
                  <h2 className="font-serif text-2xl font-normal text-zinc-900">Top Projects</h2>
                  <ul className="mt-5 space-y-3">
                    {modules.topProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.slug ?? p.id}`}
                        className="flex items-center gap-3 rounded border border-[#eeeeee] bg-white p-3 transition hover:bg-zinc-50"
                      >
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-zinc-100">
                          {p.coverImage ? (
                            <Image
                              src={p.coverImage}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={p.coverImage.startsWith("http")}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-300">
                              —
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-zinc-900 group-hover:text-[#002abf]">
                          {p.title}
                        </span>
                      </Link>
                    ))}
                  </ul>
                  <ViewAllButton onClick={() => onViewAll("projects")} label="projects" />
                </div>
              )}

              {/* Product Leaders */}
              {hasProductLeaders && (
                <div>
                  <h2 className="font-serif text-2xl font-normal text-zinc-900">Product Leaders</h2>
                  <ul className="mt-5 space-y-4">
                    {modules.productLeaders.map((p) => (
                      <li key={p.id} className="rounded border border-[#eeeeee] bg-white p-4">
                        {p.slug ? (
                          <Link
                            href={`/products/${p.slug}`}
                            className="text-sm font-medium text-zinc-900 hover:text-[#002abf]"
                          >
                            {p.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Used in {p.projectsCount} projects
                          {p.brandName ? ` · ${p.brandName}` : ""}
                        </p>
                        {p.projectThumbs.length > 0 && (
                          <div className="mt-3">
                            <ThumbRow thumbs={p.projectThumbs} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <ViewAllButton onClick={() => onViewAll("products")} label="products" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
