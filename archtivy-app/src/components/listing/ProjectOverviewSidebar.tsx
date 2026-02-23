"use client";

import Image from "next/image";
import Link from "next/link";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";
import type { ProjectDocumentItem } from "./ProjectDetailContent";
import { projectExploreUrl } from "@/lib/exploreUrls";
import { areaSqftToBucket } from "@/lib/exploreFilters";
import type { ProjectOwner } from "@/lib/canonical-models";

const ACCENT = "#002abf";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export interface UsedProductSidebarItem {
  id: string;
  slug: string;
  title: string;
  brand?: string | null;
  thumbnail?: string | null;
}

export interface MentionedSidebarItem {
  brand_name_text: string;
  product_name_text: string;
  productId?: string;
  productSlug?: string;
  productTitle?: string;
}

export interface ProjectOverviewSidebarProps {
  category: string | null;
  year: number | null;
  areaSqft: number | null;
  style?: string | null;
  location: string | null;
  /** City and country for Explore link (project.location) */
  locationCity?: string | null;
  locationCountry?: string | null;
  connectionLine?: string | null;
  mapHref?: string | null;
  saveHref?: string;
  contactHref?: string;
  owner?: ProjectOwner | null;
  teamWithProfiles?: ListingTeamMemberWithProfile[] | null;
  teamMembersFallback?: { name: string; role: string }[];
  materials?: { id: string; name: string }[];
  documents?: ProjectDocumentItem[];
  /** Verified products (admin image tags / manual links). Shown as primary "Used products (verified)". */
  usedProducts?: UsedProductSidebarItem[];
  /** User-mentioned products (text pairs); resolved to links when matched. Shown as "Mentioned by submitter". */
  mentionedItems?: MentionedSidebarItem[];
}

export function ProjectOverviewSidebar({
  category,
  year,
  areaSqft,
  style: styleVal,
  location,
  locationCity,
  locationCountry,
  connectionLine,
  mapHref,
  owner,
  teamWithProfiles,
  teamMembersFallback = [],
  materials = [],
  documents = [],
  usedProducts = [],
  mentionedItems = [],
}: ProjectOverviewSidebarProps) {
  const hasAny =
    category?.trim() ||
    year != null ||
    areaSqft != null ||
    styleVal?.trim() ||
    location?.trim();

  const mapUrl = mapHref?.trim() || "#";

  const hasTeam = (teamWithProfiles?.length ?? 0) > 0 || teamMembersFallback.length > 0;
  const hasMaterials = materials.length > 0;
  const hasDocuments = documents.length > 0;
  const hasUsedProducts = usedProducts.length > 0;
  const hasMentioned = mentionedItems.length > 0;

  const categoryHref = category?.trim() ? projectExploreUrl({ category: category.trim() }) : null;
  const yearHref = year != null && !Number.isNaN(year) ? projectExploreUrl({ year }) : null;
  const areaBucket = areaSqft != null && !Number.isNaN(areaSqft) ? areaSqftToBucket(areaSqft) : null;
  const areaHref = areaBucket ? projectExploreUrl({ area_bucket: areaBucket }) : null;
  const locationHref =
    locationCity?.trim() || locationCountry?.trim()
      ? projectExploreUrl({
          city: locationCity?.trim() || undefined,
          country: locationCountry?.trim() || undefined,
        })
      : null;

  const displayName = owner?.displayName?.trim() || "—";
  const avatarUrl = owner?.avatarUrl?.trim() || null;
  const profileId = owner?.profileId;

  return (
    <aside
      className="sticky top-6 self-start rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-labelledby="project-overview-title"
    >
      {/* Author block at top — clickable to profile when profileId exists */}
      {(displayName !== "—" || avatarUrl) && (
        <div className="mb-5 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          {profileId ? (
            <Link
              href={`/u/id/${profileId}`}
              className="flex items-center gap-3 transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                    unoptimized={avatarUrl.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {(displayName !== "—" ? displayName : "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Shared by
                </p>
                <p className="truncate text-sm font-semibold text-[#111827] underline decoration-transparent transition-colors hover:text-[#002abf] hover:decoration-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf] dark:hover:decoration-[#002abf]">
                  {displayName}
                </p>
                <p className="text-xs text-[#374151] dark:text-zinc-400">Project owner</p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                    unoptimized={avatarUrl.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {(displayName !== "—" ? displayName : "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Shared by
                </p>
                <p className="truncate text-sm font-semibold text-[#111827] dark:text-zinc-100">
                  {displayName}
                </p>
                <p className="text-xs text-[#374151] dark:text-zinc-400">Project owner</p>
              </div>
            </div>
          )}
        </div>
      )}

      <h2
        id="project-overview-title"
        className="font-serif text-lg font-normal text-[#111827] dark:text-zinc-100"
      >
        Project Overview
      </h2>

      {hasUsedProducts && (
        <section className="mt-5 border-b border-zinc-100 pb-5 dark:border-zinc-800" aria-labelledby="sidebar-used-products-heading">
          <h3 id="sidebar-used-products-heading" className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Used products (verified)
          </h3>
          <ul className="mt-3 space-y-2">
            {usedProducts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="text-sm text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]"
                >
                  {p.title}
                  {p.brand?.trim() && (
                    <span className="ml-1 text-zinc-500 dark:text-zinc-400">· {p.brand.trim()}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasMentioned && (
        <section className="mt-5 border-b border-zinc-100 pb-5 dark:border-zinc-800" aria-labelledby="sidebar-mentioned-heading">
          <h3 id="sidebar-mentioned-heading" className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Mentioned by submitter
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[#374151] dark:text-zinc-400">
            {mentionedItems.map((item, i) => {
              const label = [item.brand_name_text?.trim(), item.product_name_text?.trim()].filter(Boolean).join(" — ") || "—";
              if (item.productId && item.productSlug) {
                return (
                  <li key={i}>
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]"
                    >
                      {label}
                    </Link>
                  </li>
                );
              }
              return <li key={i}>{label}</li>;
            })}
          </ul>
        </section>
      )}

      {hasAny && (
        <dl className="mt-5 space-y-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          {category?.trim() && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Category
              </dt>
              <dd className="mt-0.5 text-sm">
                {categoryHref ? (
                  <Link
                    href={categoryHref}
                    className="inline-flex items-center gap-1 text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]"
                  >
                    {category.trim()}
                    <ChevronIcon className="shrink-0 opacity-60" />
                  </Link>
                ) : (
                  <span className="text-[#111827] dark:text-zinc-100">{category.trim()}</span>
                )}
              </dd>
            </div>
          )}
          {year != null && !Number.isNaN(year) && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Year
              </dt>
              <dd className="mt-0.5 text-sm">
                {yearHref ? (
                  <Link
                    href={yearHref}
                    className="inline-flex items-center gap-1 text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]"
                  >
                    {year}
                    <ChevronIcon className="shrink-0 opacity-60" />
                  </Link>
                ) : (
                  <span className="text-[#111827] dark:text-zinc-100">{year}</span>
                )}
              </dd>
            </div>
          )}
          {areaSqft != null && !Number.isNaN(areaSqft) && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Area
              </dt>
              <dd className="mt-0.5 text-sm">
                {areaHref ? (
                  <Link
                    href={areaHref}
                    className="inline-flex items-center gap-1 text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]"
                  >
                    {Math.round(areaSqft)} sqft
                    <ChevronIcon className="shrink-0 opacity-60" />
                  </Link>
                ) : (
                  <span className="text-[#111827] dark:text-zinc-100">
                    {Math.round(areaSqft)} sqft
                  </span>
                )}
              </dd>
            </div>
          )}
          {styleVal?.trim() && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Style
              </dt>
              <dd className="mt-0.5 text-sm text-[#111827] dark:text-zinc-100">{styleVal.trim()}</dd>
            </div>
          )}
          {(location?.trim() || locationHref) && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Location
              </dt>
              <dd className="mt-0.5 text-sm">
                {locationHref && location?.trim() ? (
                  <Link
                    href={locationHref}
                    className="inline-flex items-center gap-1 text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]"
                  >
                    {location.trim()}
                    <ChevronIcon className="shrink-0 opacity-60" />
                  </Link>
                ) : (
                  <span className="text-[#111827] dark:text-zinc-100">{location?.trim() || "—"}</span>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}

      {hasTeam && (
        <section className="mt-5 border-b border-zinc-100 pb-5 dark:border-zinc-800" aria-labelledby="sidebar-team-heading">
          <h3 id="sidebar-team-heading" className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Team Members
          </h3>
          <ul className="mt-3 space-y-2">
            {teamWithProfiles && teamWithProfiles.length > 0
              ? teamWithProfiles.map((m) => {
                  const label = [m.display_name?.trim(), m.title?.trim()].filter(Boolean).join(" · ") || "—";
                  const href = m.username ? `/u/${m.username}` : `/u/id/${m.profile_id}`;
                  return (
                    <li key={m.profile_id} className="flex items-center justify-between gap-2">
                      <Link href={href} className="text-sm text-[#111827] hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#002abf]">
                        {label}
                      </Link>
                      <button type="button" className="shrink-0 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                        Invite
                      </button>
                    </li>
                  );
                })
              : teamMembersFallback.map((m, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#111827] dark:text-zinc-100">
                      {m.name?.trim() || "—"}
                      {m.role?.trim() && <span className="ml-1.5 text-[#374151] dark:text-zinc-400">{m.role}</span>}
                    </span>
                    <button type="button" className="shrink-0 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                      Invite
                    </button>
                  </li>
                ))}
          </ul>
        </section>
      )}

      {hasMaterials && (
        <section className="mt-5 border-b border-zinc-100 pb-5 dark:border-zinc-800" aria-labelledby="sidebar-materials-heading">
          <h3 id="sidebar-materials-heading" className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Materials
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-[#374151] dark:text-zinc-400">
            {materials.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        </section>
      )}

      {hasDocuments && (
        <section className="mt-5 border-b border-zinc-100 pb-5 dark:border-zinc-800" aria-labelledby="sidebar-documents-heading">
          <h3 id="sidebar-documents-heading" className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Documents
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[#374151] dark:text-zinc-400">
            {documents.map((doc) => (
              <li key={doc.id}>
                <Link href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#002abf] hover:underline dark:hover:text-[#002abf]">
                  <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>📄</span>
                  {doc.file_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5">
        <Link
          href={mapUrl}
          className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          style={{ backgroundColor: ACCENT }}
        >
          Explore on Map
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#374151] dark:text-zinc-400">
        <Link href="#" className="font-medium hover:text-[#111827] hover:underline dark:hover:text-zinc-100">
          Save project
        </Link>
        <span aria-hidden>·</span>
        <Link href="#" className="font-medium hover:text-[#111827] hover:underline dark:hover:text-zinc-100">
          Contact team
        </Link>
      </div>

      {connectionLine?.trim() && (
        <p className="mt-4 border-t border-zinc-100 pt-4 text-xs text-[#374151] dark:border-zinc-800 dark:text-zinc-400">
          {connectionLine.trim()}
        </p>
      )}
    </aside>
  );
}
