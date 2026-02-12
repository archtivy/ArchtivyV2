"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import type { GalleryImage } from "@/lib/db/gallery";
import { toggleBookmark } from "@/app/actions/galleryBookmarks";
import { MatchesList } from "@/components/matches/MatchesList";

export type RelatedItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string;
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
}: LightboxGalleryProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const [saved, setSaved] = React.useState(initialSaved);
  const [shareToast, setShareToast] = React.useState(false);
  const [relatedOpen, setRelatedOpen] = React.useState(false);
  const [pendingSave, setPendingSave] = React.useState(false);
  const trapRef = useRef<HTMLDivElement>(null);

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

  const handleSave = useCallback(async () => {
    setPendingSave(true);
    try {
      const result = await toggleBookmark(entityType, entityId, currentPath);
      if (result.error) return;
      setSaved(result.saved);
    } finally {
      setPendingSave(false);
    }
  }, [entityType, entityId, currentPath]);

  const goPrev = () => setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  const goNext = () => setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

  if (!open) return null;

  const currentImage = images[index];
  const relatedTitle = context === "project" ? "Used Products" : "Used in Projects";
  const matchesTitle = context === "project" ? "Matches" : "Used in Projects";
  const baseHref = context === "project" ? "/products" : "/projects";

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Lightbox: ${listingTitle}`}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white"
    >
      {/* Top: close + title */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close lightbox"
        >
          <span className="text-xl font-bold" aria-hidden>×</span>
        </button>
        <h1 className="truncate text-lg font-medium text-zinc-100">{listingTitle}</h1>
        <div className="w-10 shrink-0" />
      </header>

      {/* Main + related */}
      <div className="flex min-h-0 flex-1">
        {/* Left: image viewer */}
        <div className="relative flex flex-1 flex-col items-center justify-center p-4">
          {currentImage && (
            <div className="relative h-full w-full max-h-[70vh] max-w-4xl">
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                fill
                className="object-contain"
                unoptimized={currentImage.src.startsWith("http")}
                priority
              />
            </div>
          )}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-zinc-800/80 p-2 text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Previous image"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-zinc-800/80 p-2 text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Bottom-left: Save + Share */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pendingSave}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
              aria-label={saved ? "Unsave" : "Save"}
            >
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Share"
            >
              Share
            </button>
          </div>
          {shareToast && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200">
              Link copied to clipboard
            </div>
          )}
        </div>

        {/* Right (desktop): related panel */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-zinc-800 lg:flex">
          <div className="sticky top-0 flex h-full flex-col overflow-auto p-4">
            {relatedItems.length > 0 && (
              <>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  {relatedTitle}
                </h2>
                <ul className="space-y-3" role="list">
                  {relatedItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`${baseHref}/${item.slug}`}
                        className="flex gap-3 rounded-lg p-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                      >
                        {item.thumbnail ? (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800">
                            <Image
                              src={item.thumbnail}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized={item.thumbnail.startsWith("http")}
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                            —
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>
                          {item.subtitle != null && item.subtitle !== "" && (
                            <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <MatchesList
              type={entityType}
              id={entityId}
              title={matchesTitle}
              showBadge
              limit={8}
              variant="lightbox"
            />
          </div>
        </aside>
      </div>

      {/* Mobile: Related drawer toggle — only when there are related items */}
      {relatedItems.length > 0 && (
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
              {relatedItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${baseHref}/${item.slug}`}
                    className="block rounded py-2 text-sm text-zinc-200 hover:text-white"
                    onClick={onClose}
                  >
                    {item.title}
                    {item.subtitle ? ` — ${item.subtitle}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
