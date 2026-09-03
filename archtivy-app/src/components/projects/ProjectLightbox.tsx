"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Share2 as ConnectionsIcon } from "lucide-react";
import { LightboxShell, LightboxAvatar, type StageRegion } from "@/components/lightbox/LightboxShell";
import { DiscoveryFeed } from "@/components/lightbox/DiscoveryFeed";
import { useImageDiscovery, type FeedProduct } from "@/components/lightbox/useImageDiscovery";
import type { GalleryImage } from "@/components/entity/Gallery";

/**
 * The Project Lightbox — the shared immersive shell, plus a project sidebar.
 *
 * ── EVERY NUMBER IS REAL ────────────────────────────────────────────────────
 * The counter is the gallery length. "N products identified" is
 * project_product_links. "N connections" is the SAME definition the project
 * card uses (getCreditCounts), not one invented for this surface. Credits are
 * whatever roles the project actually carries.
 *
 * ── HOTSPOTS ARE NEVER INVENTED ─────────────────────────────────────────────
 * Pins come from product_tags with real coordinates, filtered to
 * verified/official by getHotspotsForListing. A product known to be used in
 * the project but not located in a given photograph appears in the sidebar's
 * products block and NOWHERE on the image.
 *
 * All shell behaviour — pin geometry, Escape/Back, focus trap, the sub-xl
 * bottom sheet, Save/Share/Fullscreen — lives in LightboxShell.
 *
 * ── THE SIDEBAR IS NOW IDENTITY, THEN DISCOVERY ─────────────────────────────
 * The project's own facts stay at the top — title, place, year, credits,
 * connections — and the rest of the column is a continuous product feed. What
 * the reader sees there depends on whether they have clicked an object in the
 * photograph:
 *
 *   nothing selected   products the project declares, then products that suit
 *                      the room
 *   object selected    the product an owner pinned on that object, if there is
 *                      one, then visually similar pieces
 *
 * The old "N products identified" row with its four thumbnails is gone,
 * because the feed's first section IS those products, shown larger and named.
 * Its destination survives as the section's "See all" link — no information
 * was dropped, only a worse presentation of it.
 */

export interface LightboxCredit {
  /** The real role, e.g. "Architecture", "Photography". */
  role: string;
  name: string;
  href: string | null;
  avatarUrl: string | null;
}

export interface ProjectLightboxProps {
  open: boolean;
  onClose: () => void;
  startIndex: number;
  images: GalleryImage[];
  title: string;
  shareUrl: string;
  /** In-page anchors on the project beneath, used by the two block arrows. */
  productsHref: string;
  connectionsHref: string | null;
  locationLabel: string | null;
  year: number | null;
  credits: LightboxCredit[];
  /*
   * `products` and `productCount` used to be passed in and drawn as a row of
   * four thumbnails. The feed now fetches project_product_links itself and
   * renders every one of them, named, so the props were carrying a second,
   * shorter copy of data the sidebar already had. Removed rather than left
   * unused: an ignored prop is how two sources of one fact start.
   */
  connectionCount: number;
  listingId: string;
  initialSaved?: boolean;
}

export function ProjectLightbox({
  open,
  onClose,
  startIndex,
  images,
  title,
  shareUrl,
  productsHref,
  connectionsHref,
  locationLabel,
  year,
  credits,
  connectionCount,
  listingId,
  initialSaved,
}: ProjectLightboxProps) {
  /*
   * The shell owns the slide index, so it reports which photograph is showing
   * and this component holds everything that depends on it. One fetch per
   * image lives here rather than in the sidebar, because the shell renders the
   * sidebar TWICE — once as the xl column, once inside the sub-xl sheet — and
   * a hook in there would open two identical requests and keep two unrelated
   * selections.
   */
  const [activeImageId, setActiveImageId] = useState<string | undefined>(undefined);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const { data, loading } = useImageDiscovery(activeImageId);

  const onActiveImageChange = useCallback((image: GalleryImage) => {
    setActiveImageId(image.id);
  }, []);

  // A selection belongs to one photograph. Paging to the next slide returns
  // the feed to that room rather than leaving the previous object's results
  // beside an image it has nothing to do with.
  useEffect(() => setSelectedRegionId(null), [activeImageId]);
  useEffect(() => {
    if (!open) setSelectedRegionId(null);
  }, [open]);

  const regions: StageRegion[] = useMemo(
    () =>
      (data?.regions ?? []).map((r) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      })),
    [data]
  );

  const selected = data?.regions.find((r) => r.id === selectedRegionId) ?? null;

  /* Two entirely separate pairs of arrays. The confirmed list and the
     suggestion list are chosen together and never merged, so no rendering
     decision downstream can put one where the other belongs. */
  const feedExact: FeedProduct[] = selected ? selected.exact : data?.room.exact ?? [];
  const feedSimilar: FeedProduct[] = selected ? selected.similar : data?.room.similar ?? [];

  const clearSelection = useCallback(() => setSelectedRegionId(null), []);

  return (
    <LightboxShell
      open={open}
      onClose={onClose}
      startIndex={startIndex}
      images={images}
      title={title}
      shareUrl={shareUrl}
      listingId={listingId}
      entityType="project"
      initialSaved={initialSaved}
      subtitle={[locationLabel, year != null ? String(year) : null].filter(Boolean).join(" · ") || null}
      overlayMeta={
        (locationLabel || credits.length > 0) && (
          <>
            {locationLabel && (
              <p className="flex items-center gap-1.5 font-body text-[13px] text-white/90">
                <MapPin strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {locationLabel}
              </p>
            )}
            {credits.length > 0 && (
              <p className="pointer-events-auto mt-1 font-body text-[15px] leading-[22px] text-white/80">
                {credits.slice(0, 2).map((c, i) => (
                  <span key={`${c.name}-${i}`}>
                    {i > 0 && <span className="px-1.5 text-white/50">·</span>}
                    {c.href ? (
                      <Link
                        href={c.href}
                        onClick={onClose}
                        className="underline-offset-4 transition-colors hover:text-white hover:underline"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </span>
                ))}
              </p>
            )}
          </>
        )
      }
      regions={regions}
      selectedRegionId={selectedRegionId}
      onRegionSelect={setSelectedRegionId}
      onActiveImageChange={onActiveImageChange}
      sidebar={({ close }) => (
        <ProjectSidebar
          title={title}
          locationLabel={locationLabel}
          year={year}
          credits={credits}
          connectionCount={connectionCount}
          productsHref={productsHref}
          connectionsHref={connectionsHref}
          onNavigate={close}
          feedLoading={loading}
          feedExact={feedExact}
          feedSimilar={feedSimilar}
          feedMode={selected ? "object" : "room"}
          onClearSelection={clearSelection}
        />
      )}
    />
  );
}

/**
 * The sidebar's content, independent of the shell that holds it.
 *
 * Rendered twice — as the xl column and inside the sub-xl bottom sheet — from
 * ONE definition, so the tablet and phone panels cannot drift from the desktop
 * one the way two hand-written copies would. Both copies are driven by state
 * held in ProjectLightbox, so the two renders always agree about what is
 * selected.
 */
function ProjectSidebar({
  title,
  locationLabel,
  year,
  credits,
  connectionCount,
  productsHref,
  connectionsHref,
  onNavigate,
  feedLoading,
  feedExact,
  feedSimilar,
  feedMode,
  onClearSelection,
}: {
  title: string;
  locationLabel: string | null;
  year: number | null;
  credits: LightboxCredit[];
  connectionCount: number;
  productsHref: string;
  connectionsHref: string | null;
  onNavigate: () => void;
  feedLoading: boolean;
  feedExact: FeedProduct[];
  feedSimilar: FeedProduct[];
  feedMode: "room" | "object";
  onClearSelection: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-6">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
          Project
        </p>
        <h2 className="mt-2 font-display text-[26px] leading-[32px] tracking-tight text-white">
          {title}
        </h2>
        {locationLabel && (
          <p className="mt-2 font-body text-[14px] text-white/55">{locationLabel}</p>
        )}
        {year != null && <p className="font-body text-[14px] text-white/55">{year}</p>}

        {credits.length > 0 && (
          <div className="mt-6 space-y-5 border-t border-white/[0.07] pt-5">
            {credits.map((c, i) => (
              <div key={`${c.name}-${i}`} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                    {c.role}
                  </p>
                  <p className="mt-1 truncate font-body text-[14px] text-white/85">
                    {c.href ? (
                      <Link
                        href={c.href}
                        onClick={onNavigate}
                        className="underline-offset-4 transition-colors hover:text-white hover:underline"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </p>
                </div>
                <LightboxAvatar name={c.name} url={c.avatarUrl} />
              </div>
            ))}
          </div>
        )}

        {/* The project card's definition of a connection, unchanged: distinct
            profile-linked credits. Rendered only with a real destination, so
            the arrow is never dead. */}
        {connectionCount > 0 && connectionsHref && (
          <div className="mt-5 border-t border-white/[0.07] pt-5">
            <Link href={connectionsHref} onClick={onNavigate} className="group flex items-center gap-3">
              <ConnectionsIcon
                strokeWidth={1.5}
                className="h-[18px] w-[18px] shrink-0 text-white/60"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-body text-[14px] text-white/90">
                  {connectionCount} connection{connectionCount === 1 ? "" : "s"}
                </span>
                <span className="block font-body text-[12px] text-white/45">
                  Products and people linked to this project
                </span>
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* The discovery feed: the rest of the column, scrolling with it. */}
      <DiscoveryFeed
        loading={feedLoading}
        exact={feedExact}
        similar={feedSimilar}
        mode={feedMode}
        onClearSelection={onClearSelection}
        exactHref={productsHref}
        onNavigate={onNavigate}
      />
    </>
  );
}
