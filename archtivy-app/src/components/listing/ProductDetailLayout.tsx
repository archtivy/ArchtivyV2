"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toggleBookmark } from "@/app/actions/galleryBookmarks";
import { track } from "@/lib/events";
import { ProductDetailGallery } from "./ProductDetailGallery";
import { ProductSidebarDocuments } from "./ProductSidebarDocuments";
import { TeamMemberLinks } from "./TeamMemberLinks";
import { LightboxGallery, type RelatedItem } from "@/components/gallery/LightboxGallery";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";
import type { DetailSidebarRow } from "./DetailSidebar";
import type { ListingDocument } from "@/lib/types/listings";

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export interface ProductDetailLayoutProps {
  images: GalleryImage[];
  product: ProductCanonical;
  brandName: string | null;
  brandHref: string | null;
  isSaved: boolean;
  currentPath: string;
  relatedItems: RelatedItem[];
  sidebarRows: DetailSidebarRow[];
  listingDocuments: ListingDocument[];
  signInRedirectUrl: string;
  relatedListings: { id: string; slug?: string; title: string; location?: string | null }[];
  thumbnailMap: Record<string, string>;
  teamWithProfiles: ListingTeamMemberWithProfile[] | null;
  mapHref?: string | null;
}

export function ProductDetailLayout({
  images,
  product,
  brandName,
  brandHref,
  isSaved: initialSaved,
  currentPath,
  relatedItems,
  sidebarRows,
  listingDocuments,
  signInRedirectUrl,
  relatedListings,
  thumbnailMap,
  teamWithProfiles,
  mapHref,
}: ProductDetailLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [saved, setSaved] = useState(initialSaved);
  const [pendingSave, setPendingSave] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setPendingSave(true);
    try {
      const result = await toggleBookmark("product", product.id, currentPath);
      if (result.error) setSaved(!nextSaved);
    } finally {
      setPendingSave(false);
    }
  }, [product.id, currentPath, saved]);

  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void navigator.clipboard?.writeText(url).then(() => {
      track("listing_share", { listingId: product.id });
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  }, [product.id]);

  const highlights: { label: string; value: string }[] = [];
  if (product.material_type?.trim()) highlights.push({ label: "Material", value: product.material_type.trim() });
  if (product.color?.trim()) highlights.push({ label: "Color", value: product.color.trim() });
  if (product.category?.trim()) highlights.push({ label: "Category", value: product.category.trim() });
  if (product.year != null && !Number.isNaN(product.year)) highlights.push({ label: "Year", value: String(product.year) });
  const highlightsSlice = highlights.slice(0, 4);

  const visibleSidebarRows = sidebarRows.filter(
    (r) => r.value != null && r.value !== "" && r.label !== "Team Members"
  );

  return (
    <>
      <div className="w-full bg-white dark:bg-zinc-950">
        {/* Two-column: images left, details right */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
          {/* Left: gallery */}
          <div className="min-w-0">
            <ProductDetailGallery images={images} onImageClick={handleImageClick} />
          </div>

          {/* Right: sticky details panel */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-6">
              {/* Title row: title + Save/Share */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="font-serif text-3xl font-normal tracking-tight text-[#111827] dark:text-zinc-100 md:text-4xl">
                    {product.title}
                  </h1>
                  {brandName && (
                    <p className="mt-2 text-sm">
                      {brandHref ? (
                        <Link
                          href={brandHref}
                          className="font-medium text-[#002abf] hover:underline dark:text-[#002abf]"
                        >
                          {brandName}
                        </Link>
                      ) : (
                        <span className="text-[#374151] dark:text-zinc-400">{brandName}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={pendingSave}
                    aria-label={saved ? "Unsave product" : "Save product"}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    {saved ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share"
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
                  >
                    <ShareIcon className="h-4 w-4" />
                    Share
                  </button>
                  {shareToast && (
                    <span role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
                      Link copied
                    </span>
                  )}
                </div>
              </div>

              {/* Product highlights (2–4 items) */}
              {highlightsSlice.length > 0 && (
                <div className="flex flex-wrap gap-3 border-y border-zinc-100 py-4 dark:border-zinc-800">
                  {highlightsSlice.map((h) => (
                    <div key={h.label} className="text-sm">
                      <span className="font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {h.label}:
                      </span>{" "}
                      <span className="text-[#111827] dark:text-zinc-100">{h.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <a
                  href="#used-in-projects"
                  className="inline-flex items-center justify-center rounded-xl bg-[#002abf] px-5 py-3 text-sm font-medium text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                >
                  See used in projects
                </a>
                {mapHref?.trim() && (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
                  >
                    <MapPinIcon className="h-4 w-4" />
                    Explore on Map
                  </a>
                )}
              </div>

              {/* Description */}
              {product.description?.trim() && (
                <section className="border-t border-zinc-100 pt-6 dark:border-zinc-800" aria-labelledby="product-description-heading">
                  <h2 id="product-description-heading" className="mb-3 font-serif text-lg font-normal text-[#111827] dark:text-zinc-100">
                    Description
                  </h2>
                  <div className="max-w-[65ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[#374151] dark:text-zinc-400" style={{ lineHeight: 1.7 }}>
                    {product.description.trim()}
                  </div>
                </section>
              )}

              {/* Technical details */}
              {visibleSidebarRows.length > 0 && (
                <section className="border-t border-zinc-100 pt-6 dark:border-zinc-800" aria-labelledby="product-details-heading">
                  <h2 id="product-details-heading" className="mb-4 font-serif text-lg font-normal text-[#111827] dark:text-zinc-100">
                    Technical details
                  </h2>
                  <dl className="space-y-3">
                    {visibleSidebarRows.map((row) => (
                      <div key={row.label} className="flex flex-col gap-0.5">
                        <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          {row.label}
                        </dt>
                        <dd className="text-sm font-medium text-[#111827] dark:text-zinc-100">
                          {row.href ? (
                            <Link href={row.href} className="text-[#002abf] hover:underline dark:text-[#002abf]">
                              {row.value}
                            </Link>
                          ) : (
                            <span>{row.value}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Documents */}
              {listingDocuments.length > 0 && (
                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <ProductSidebarDocuments
                    documents={listingDocuments}
                    listingId={product.id}
                    signInRedirectUrl={signInRedirectUrl}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Full-width: Used in projects */}
        <section id="used-in-projects" className="mt-16 border-t border-zinc-100 pt-10 dark:border-zinc-800" aria-labelledby="used-in-projects-heading">
          <h2 id="used-in-projects-heading" className="mb-6 font-serif text-xl font-normal text-[#111827] dark:text-zinc-100">
            Used in projects
          </h2>
          {relatedListings.length === 0 ? (
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
              No linked projects yet.
            </p>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-2">
              {relatedListings.map((p) => {
                const href = `/projects/${p.slug ?? p.id}`;
                const thumb = thumbnailMap[p.id];
                const location = (p as { location?: string | null }).location?.trim() || null;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className="group flex shrink-0 flex-col focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                  >
                    <div className="relative h-44 w-64 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          className="object-cover transition-opacity group-hover:opacity-95"
                          sizes="256px"
                          unoptimized={thumb.startsWith("http")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
                          —
                        </div>
                      )}
                    </div>
                    <span className="mt-2 max-w-[256px] truncate text-sm font-medium text-[#111827] dark:text-zinc-100 group-hover:text-[#002abf] dark:group-hover:text-[#002abf]">
                      {p.title}
                    </span>
                    {location && (
                      <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{location}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Team members (optional) */}
        {teamWithProfiles && teamWithProfiles.length > 0 && (
          <section className="mt-12 border-t border-zinc-100 pt-10 dark:border-zinc-800" aria-labelledby="product-team-heading">
            <h2 id="product-team-heading" className="mb-4 font-serif text-lg font-normal text-[#111827] dark:text-zinc-100">
              Team
            </h2>
            <TeamMemberLinks members={teamWithProfiles} />
          </section>
        )}
      </div>

      <LightboxGallery
        images={images}
        listingTitle={product.title}
        context="product"
        relatedItems={relatedItems}
        entityType="product"
        entityId={product.id}
        entitySlug={product.slug ?? product.id}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        isSaved={saved}
        currentPath={currentPath}
        headerOverlay={{
          studioName: brandName ?? null,
          metaLine: null,
        }}
      />
    </>
  );
}
