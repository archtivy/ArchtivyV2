"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SaveToFolderModal } from "@/components/gallery/SaveToFolderModal";
import { ContactLeadModal } from "@/components/listing/ContactLeadModal";
import { track } from "@/lib/events";
import { ProductDetailGallery } from "./ProductDetailGallery";
import { BrandChip } from "./BrandChip";
import { ExpandableDescription } from "./ExpandableDescription";
import { MaterialsList } from "./MaterialsList";
import { TeamList } from "./TeamList";
import { FilesSection } from "@/components/files/FilesSection";
import { LightboxGallery, type RelatedItem } from "@/components/gallery/LightboxGallery";
import { productExploreUrl } from "@/lib/exploreUrls";
import { RelatedSection, type RelatedSectionItem } from "@/components/related/RelatedSection";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";
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

export interface RelatedProjectItem {
  id: string;
  slug?: string;
  title: string;
  location?: string | null;
}

export interface RelatedProductItem {
  id: string;
  slug?: string;
  title: string;
  thumbnail?: string | null;
}

export interface ProductDetailLayoutProps {
  images: GalleryImage[];
  product: ProductCanonical;
  brandName: string | null;
  brandHref: string | null;
  brandLogoUrl?: string | null;
  isSaved: boolean;
  currentPath: string;
  relatedItems: RelatedItem[];
  listingDocuments: ListingDocument[];
  signInRedirectUrl: string;
  relatedListings: RelatedProjectItem[];
  thumbnailMap: Record<string, string>;
  teamWithProfiles: ListingTeamMemberWithProfile[] | null;
  relatedProducts?: RelatedProductItem[];
  mapHref?: string | null;
  /** Used in projects (for RelatedSection). */
  usedInProjects?: RelatedSectionItem[];
  usedInProjectsTotalCount?: number;
  /** More in this category (for RelatedSection). Excludes current product. */
  moreInCategory?: RelatedSectionItem[];
  categoryTotalCount?: number;
}

export function ProductDetailLayout({
  images,
  product,
  brandName,
  brandHref,
  brandLogoUrl,
  isSaved: initialSaved,
  currentPath,
  relatedItems,
  listingDocuments,
  signInRedirectUrl,
  relatedListings,
  thumbnailMap,
  teamWithProfiles,
  relatedProducts = [],
  mapHref,
  usedInProjects = [],
  usedInProjectsTotalCount,
  moreInCategory = [],
  categoryTotalCount,
}: ProductDetailLayoutProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [saved, setSaved] = useState(initialSaved);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(currentPath)}`);
      return;
    }
    setSaveModalOpen(true);
  }, [isLoaded, userId, currentPath, router]);

  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void navigator.clipboard?.writeText(url).then(() => {
      track("listing_share", { listingId: product.id });
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  }, [product.id]);

  const ctaClass =
    "inline-flex flex-1 items-center justify-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950 sm:flex-initial";
  const btnRadius = { borderRadius: 4 };

  const materials = product.materials ?? [];
  const teamForList = (teamWithProfiles ?? []).map((m) => ({
    profile_id: m.profile_id,
    display_name: m.display_name ?? null,
    title: m.title ?? null,
    username: m.username ?? null,
    avatar_url: null,
  }));
  const usedProjects = usedInProjects.length > 0 ? usedInProjects : relatedListings.map((p) => ({
    id: p.id,
    slug: p.slug ?? null,
    title: p.title,
    thumbnail: thumbnailMap[p.id] ?? null,
    location: p.location ?? null,
  }));

  return (
    <>
      <div className="w-full bg-white dark:bg-zinc-950">
        {/* Two-column: gallery 58–60%, content 40–42% */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.45fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <ProductDetailGallery images={images} onImageClick={handleImageClick} />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-6">
              {/* 1) Title */}
              <h1 className="font-serif text-3xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100 md:text-4xl">
                {product.title}
              </h1>
              {/* 2) Brand Chip */}
              {brandName && (
                <BrandChip name={brandName} href={brandHref ?? undefined} logoUrl={brandLogoUrl ?? undefined} variant="pill" />
              )}
              {/* 3) CTA Row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isLoaded}
                  aria-label={saved ? "Saved" : "Save to folder"}
                  className={ctaClass}
                  style={btnRadius}
                >
                  <BookmarkIcon className="h-4 w-4 shrink-0" />
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setContactModalOpen(true)}
                  aria-label="Contact"
                  className={ctaClass}
                  style={btnRadius}
                >
                  Contact
                </button>
                <button type="button" onClick={handleShare} aria-label="Share" className={ctaClass} style={btnRadius}>
                  <ShareIcon className="h-4 w-4" />
                  Share
                </button>
                {shareToast && (
                  <span role="status" className="text-sm text-zinc-500 dark:text-zinc-400">Link copied</span>
                )}
              </div>
              {/* 4) Short description (expandable) */}
              {product.description?.trim() && (
                <ExpandableDescription
                  text={product.description.trim()}
                  id="product-description"
                  className="border-t border-zinc-100 pt-6 dark:border-zinc-800"
                />
              )}
              {/* Materials */}
              {materials.length > 0 && (
                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Materials
                  </h3>
                  <MaterialsList
                    materials={materials}
                    exploreUrl={(slug) => productExploreUrl({ materials: [slug] })}
                    variant="pills"
                  />
                </div>
              )}
              {/* Team (compact) */}
              {teamForList.length > 0 && (
                <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Team
                  </h3>
                  <TeamList members={teamForList} compact />
                </div>
              )}
              {/* Files */}
              <FilesSection
                raw={product.documents}
                listingDocuments={listingDocuments}
                listingId={product.id}
                useDownloadApi
              />
            </div>
          </aside>
        </div>

        {/* Used in Projects (only if at least 1 project) */}
        {usedProjects.length > 0 && (
          <RelatedSection
            title="Used in Projects"
            items={usedProjects}
            totalCount={usedInProjectsTotalCount ?? usedProjects.length}
            viewAllHref={null}
            variant="project"
            mobileLayout={usedProjects.length === 1 ? "featured" : "scroll"}
            desktopShown={4}
          />
        )}

        {/* More in this category (always if items exist) */}
        {moreInCategory.length > 0 && (
          <RelatedSection
            title="More in this category"
            items={moreInCategory}
            totalCount={categoryTotalCount ?? moreInCategory.length}
            viewAllHref={
              (product.product_category ?? product.category)?.trim()
                ? productExploreUrl({ category: (product.product_category ?? product.category)!.trim() })
                : null
            }
            variant="product"
            mobileLayout="scroll"
            desktopShown={4}
          />
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
      <SaveToFolderModal
        entityType="product"
        entityId={product.id}
        entityTitle={product.title}
        currentPath={currentPath}
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSaved={() => setSaved(true)}
      />
      <ContactLeadModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        listingId={product.id}
        listingType="product"
        listingTitle={product.title}
      />
    </>
  );
}
