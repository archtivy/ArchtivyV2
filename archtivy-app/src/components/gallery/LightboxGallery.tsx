"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import type { GalleryImage } from "@/lib/db/gallery";
import { LightboxImageZoom, type LightboxZoomControlsRef } from "./LightboxImageZoom";
import { SaveToFolderModal } from "./SaveToFolderModal";
import { LightboxNearbyProjects } from "./LightboxNearbyProjects";

export type RelatedItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string;
};

/** Optional overlay shown above the image (project title, by studio, meta line). */
export type LightboxHeaderOverlay = {
  studioName?: string | null;
  metaLine?: string | null;
};

export interface LightboxGalleryProps {
  images: GalleryImage[];
  listingTitle: string;
  context: "project" | "product";
  relatedItems: RelatedItem[];
  entityType: "project" | "product";
  entityId: string;
  entitySlug: string;
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  isSaved: boolean;
  currentPath: string;
  /** Optional: top bar title, by studio, meta line (not on image). */
  headerOverlay?: LightboxHeaderOverlay | null;
  /** Optional: for "More Projects Near This Location" (project context). */
  nearbyLocation?: { excludeListingId: string; city: string | null; country: string | null } | null;
  /** Optional: compact team block (Studio, Lead Architect, Photographer). */
  team?: { name: string; role: string }[] | null;
  /** Optional: similar products for product lightbox sidebar (horizontal carousel). Only render if provided and non-empty. */
  similarProducts?: RelatedItem[] | null;
}

export function LightboxGallery({
  images,
  listingTitle,
  context,
  relatedItems,
  entityType,
  entityId,
  entitySlug,
  initialIndex,
  open,
  onClose,
  isSaved: initialSaved,
  currentPath,
  headerOverlay,
  nearbyLocation,
  team: teamMembers,
  similarProducts,
}: LightboxGalleryProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const [saved, setSaved] = React.useState(initialSaved);
  const [shareToast, setShareToast] = React.useState(false);
  const [relatedOpen, setRelatedOpen] = React.useState(false);
  const [saveModalOpen, setSaveModalOpen] = React.useState(false);
  const trapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<LightboxZoomControlsRef>(null);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, open]);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
        return;
      }
      if (e.key === "s" || e.key === "S") {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          setSaveModalOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, images.length]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !trapRef.current) return;
    const first = trapRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !trapRef.current) return;
    const el = trapRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => !n.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleShare = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    void navigator.clipboard?.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  }, []);

  const openSaveModal = useCallback(() => setSaveModalOpen(true), []);

  const goPrev = () => setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  const goNext = () => setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

  const activeImage = images?.[index];
  const activeImageWithTags = activeImage as
    | (GalleryImage & { productTags?: Array<{ product_id?: string; product_slug?: string; product_title?: string; product_thumbnail?: string; product_owner_name?: string }>; tags?: unknown[] })
    | undefined;
  const activeTags = (
    activeImageWithTags?.photoTags ??
    activeImageWithTags?.productTags ??
    activeImageWithTags?.tags ??
    []
  ) as Array<{ product_id?: string; product_slug?: string; product_title?: string; product_thumbnail?: string; product_owner_name?: string }>;

  /** Sanitize owner name: strip leading "by " to avoid "by by Studio" */
  const sanitizeOwner = (name: string | null | undefined): string => {
    const s = (name ?? "").trim();
    if (!s) return "";
    const lower = s.toLowerCase();
    if (lower.startsWith("by ")) return s.slice(3).trim();
    return s;
  };

  /** Sidebar list: project = tags for the active image only; product = global relatedItems. */
  const productsForCurrentImage: RelatedItem[] = React.useMemo(() => {
    if (context === "product") return relatedItems;
    const seen = new Set<string>();
    return activeTags
      .filter((t) => t.product_id && !seen.has(t.product_id) && seen.add(t.product_id))
      .map((t) => {
        const pid = t.product_id!;
        return {
          id: pid,
          slug: t.product_slug ?? pid,
          title: t.product_title ?? pid,
          subtitle: t.product_owner_name ?? null,
          thumbnail: t.product_thumbnail ?? undefined,
        };
      });
  }, [context, activeTags, relatedItems]);

  if (!open) return null;

  const currentImage = images[index];
  const relatedTitle = context === "project" ? "Products in this image" : "Used in projects";
  const baseHref = context === "project" ? "/products" : "/projects";
  const ownerName = sanitizeOwner(headerOverlay?.studioName);
  const metaLine = headerOverlay?.metaLine?.trim();

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Lightbox: ${listingTitle}`}
      className="fixed inset-0 z-50 flex h-full w-full flex-col text-white lg:flex-row"
      style={{ background: "#1c1c1e" }}
    >
      {/* 72% image area (100% on mobile) */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:w-[72%]">
        {/* Top bar: close, title block, counter — not on image */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 shrink-0 rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]"
              style={{ borderRadius: "4px" }}
              aria-label="Close lightbox"
            >
              <span className="text-xl font-bold leading-none" aria-hidden>×</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold leading-tight text-white">
                {listingTitle}
              </h1>
              {ownerName ? (
                <p className="mt-0.5 text-sm text-zinc-500">by {ownerName}</p>
              ) : null}
              {context === "project" && metaLine ? (
                <p className="mt-0.5 text-xs text-zinc-600">{metaLine}</p>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium text-zinc-500">
            {index + 1} / {images.length}
          </span>
        </header>

        {/* Image area with zoom (controls rendered in bottom bar) */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
          {currentImage ? (
            <div className="relative h-full w-full">
              <LightboxImageZoom
                ref={zoomRef}
                src={currentImage.src}
                alt={currentImage.alt}
                unoptimized={currentImage.src.startsWith("http")}
                renderControls={false}
              />
            </div>
          ) : null}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-700/80 bg-zinc-900/80 p-2.5 text-white backdrop-blur-sm hover:border-[#002abf] hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                style={{ borderRadius: "4px" }}
                aria-label="Previous image"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-700/80 bg-zinc-900/80 p-2.5 text-white backdrop-blur-sm hover:border-[#002abf] hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                style={{ borderRadius: "4px" }}
                aria-label="Next image"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>

        {/* Bottom bar: Save/Share left, zoom controls right */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSaveModal}
              className="rounded border border-zinc-700/80 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#002abf] hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
              style={{ borderRadius: "4px" }}
              aria-label={saved ? "Saved" : "Save to folder"}
            >
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded border border-zinc-700/80 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#002abf] hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
              style={{ borderRadius: "4px" }}
              aria-label="Share"
            >
              Share
            </button>
          </div>
          <div className="flex items-center gap-0.5 rounded border border-zinc-700/80 bg-zinc-900/80 transition-colors" style={{ borderRadius: "4px" }}>
            <button type="button" onClick={() => zoomRef.current?.zoomOut()} className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]" style={{ borderRadius: "4px" }} aria-label="Zoom out"><span className="text-lg font-medium">−</span></button>
            <button type="button" onClick={() => zoomRef.current?.zoomIn()} className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]" style={{ borderRadius: "4px" }} aria-label="Zoom in"><span className="text-lg font-medium">+</span></button>
            <button type="button" onClick={() => zoomRef.current?.zoomReset()} className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]" style={{ borderRadius: "4px" }} aria-label="Reset zoom">100%</button>
            <button type="button" onClick={() => zoomRef.current?.zoomFullscreen()} className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]" style={{ borderRadius: "4px" }} aria-label="Fullscreen zoom">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          </div>
        </div>
        {shareToast && (
          <div className="absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded border border-zinc-700/80 bg-zinc-900/90 px-4 py-2 text-sm text-zinc-200 shadow-lg" style={{ borderRadius: "4px" }}>
            Link copied to clipboard
          </div>
        )}
      </div>

      <SaveToFolderModal
        entityType={entityType}
        entityId={entityId}
        entityTitle={listingTitle}
        currentPath={currentPath}
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSaved={() => setSaved(true)}
      />

      {/* Right sidebar — 360px, flex column; hidden on mobile */}
      <aside className="archtivy-pswp-sidebar hidden h-full w-[360px] min-w-0 shrink-0 flex-col border-l border-zinc-800/80 bg-[#252528] backdrop-blur-md lg:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {relatedTitle}
          </h2>
          {productsForCurrentImage.length > 0 ? (
            <ul className="archtivy-pswp-sidebar-products space-y-3" role="list">
              {productsForCurrentImage.map((item) => {
                const thumbSrc = item.thumbnail ?? (item as RelatedItem & { image?: string }).image;
                const itemOwner = item.subtitle?.trim() ?? (item as RelatedItem & { owner_name?: string }).owner_name?.trim() ?? (item as RelatedItem & { owner?: string }).owner?.trim() ?? "";
                const itemYear = (item as RelatedItem & { year?: number | string | null }).year;
                const yearStr = itemYear != null && itemYear !== "" ? String(itemYear) : null;
                return (
                  <li key={item.id} className="w-full">
                    <Link
                      href={`${baseHref}/${item.slug}`}
                      className="archtivy-pswp-product-row flex w-full gap-3 rounded border border-zinc-700/80 bg-zinc-800/40 p-3 transition-[border-color] hover:border-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-0 focus:ring-offset-[#252528]"
                      style={{ borderRadius: "4px" }}
                    >
                      {thumbSrc ? (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800" style={{ borderRadius: "4px" }}>
                          <Image
                            src={thumbSrc}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized={thumbSrc.startsWith("http")}
                            sizes="56px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-500" style={{ borderRadius: "4px" }} aria-hidden>
                          <span className="text-[10px] font-medium uppercase">—</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-snug text-zinc-100">
                          {item.title}
                        </p>
                        {itemOwner ? (
                          <p className="mt-0.5 truncate text-xs leading-snug text-zinc-500">
                            by {sanitizeOwner(itemOwner) || itemOwner}
                          </p>
                        ) : null}
                        {context === "project" ? null : yearStr ? (
                          <p className="mt-0.5 truncate text-xs leading-snug text-zinc-600">
                            {yearStr}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                {context === "project" ? "No tagged products for this image." : "No related items."}
              </p>
            )}
          {teamMembers && teamMembers.length > 0 && (
            <div className="mt-6 border-t border-zinc-800/80 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Team</p>
              <ul className="space-y-1.5" role="list">
                {teamMembers.map((m, i) => (
                  <li key={i} className="text-[12px] text-zinc-400">
                    <span className="font-medium text-zinc-300">{m.role}:</span> {m.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {context === "project" && nearbyLocation && (
          <div className="mt-auto shrink-0 border-t border-zinc-800/80 p-4">
            <LightboxNearbyProjects
              excludeListingId={nearbyLocation.excludeListingId}
              city={nearbyLocation.city}
              country={nearbyLocation.country}
              onClose={onClose}
            />
          </div>
        )}
        {context === "product" && similarProducts && similarProducts.length > 0 && (
          <div className="mt-auto shrink-0 border-t border-zinc-800/80 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Similar products
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {similarProducts.map((item) => {
                const thumbSrc = item.thumbnail ?? (item as RelatedItem & { image?: string }).image;
                const itemOwner = item.subtitle?.trim() ?? "";
                return (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    className="flex w-full min-w-full shrink-0 snap-start gap-3 rounded border border-zinc-700/80 bg-zinc-800/40 p-3 transition-[border-color] hover:border-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-0 focus:ring-offset-[#252528]"
                    style={{ borderRadius: "4px" }}
                    onClick={onClose}
                  >
                    {thumbSrc ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800" style={{ borderRadius: "4px" }}>
                        <Image
                          src={thumbSrc}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={thumbSrc.startsWith("http")}
                          sizes="56px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-500" style={{ borderRadius: "4px" }} aria-hidden>
                        <span className="text-[10px] font-medium uppercase">—</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-snug text-zinc-100">
                        {item.title}
                      </p>
                      {itemOwner ? (
                        <p className="mt-0.5 truncate text-xs leading-snug text-zinc-500">
                          by {sanitizeOwner(itemOwner) || itemOwner}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile: Related drawer */}
      <div className="flex shrink-0 border-t border-zinc-800 lg:hidden">
        <button
          type="button"
          onClick={() => setRelatedOpen((o) => !o)}
          className="w-full px-4 py-3 text-left text-sm font-medium text-zinc-300 hover:bg-zinc-900"
          aria-expanded={relatedOpen}
        >
          {relatedTitle}
        </button>
        {relatedOpen && (
          <ul className="max-h-48 space-y-2 overflow-auto border-t border-zinc-800 p-4" role="list">
            {productsForCurrentImage.length > 0 ? (
              productsForCurrentImage.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${baseHref}/${item.slug}`}
                    className="block rounded py-2 text-sm text-zinc-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                    style={{ borderRadius: "4px" }}
                    onClick={onClose}
                  >
                    {item.title}
                    {item.subtitle ? ` — ${item.subtitle}` : ""}
                  </Link>
                </li>
              ))
            ) : (
              <li className="py-2 text-sm text-zinc-500">
                {context === "project" ? "No tagged products for this image." : "No related items."}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
