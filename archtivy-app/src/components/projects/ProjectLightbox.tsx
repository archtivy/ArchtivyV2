"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { LightboxShell, type StageRegion } from "@/components/lightbox/LightboxShell";
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
 * ── THE SIDEBAR IS DISCOVERY ────────────────────────────────────────────────
 * The approved design gives the whole right-hand column to "Explore this look"
 * — one continuous wall of products, no category shelves, no headings between
 * rows. What it shows depends on whether an object in the photograph is
 * selected:
 *
 *   nothing selected   products the project declares, then products that suit
 *                      the room, in one mixed feed
 *   object selected    the product an owner pinned on that object, if there is
 *                      one, then pieces visually close to it
 *
 * The project's own facts have not been deleted, they have moved to where the
 * design puts them: location and credits are printed over the photograph
 * (overlayMeta), and the title, place and year sit in the bar beneath it on
 * narrow viewports (subtitle). The reader still sees them; they are simply not
 * competing with the feed for the column.
 *
 * The "N products identified" and "N connections" rows are gone with the rest
 * of the card, and their props with them rather than left dangling: the feed
 * now shows every one of those products directly, and an unused prop is how a
 * second source of one fact begins.
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
  locationLabel: string | null;
  year: number | null;
  credits: LightboxCredit[];
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
  locationLabel,
  year,
  credits,
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
        <DiscoveryFeed
          loading={loading}
          exact={feedExact}
          similar={feedSimilar}
          mode={selected ? "object" : "room"}
          variant="tile"
          title="Explore this look"
          subtitle={
            selected
              ? "Pieces visually close to the one you selected."
              : "Handpicked pieces that match the vibe of this space."
          }
          onClearSelection={clearSelection}
          onNavigate={close}
        />
      )}
    />
  );
}
