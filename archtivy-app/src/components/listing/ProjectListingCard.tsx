"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { SaveToFolderModal } from "@/components/gallery/SaveToFolderModal";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProjectListingCardAvatar {
  name: string;
  src?: string | null;
  /** Profile link. Omit for non-linked avatars. */
  href?: string | null;
}

export interface ProjectListingCardProps {
  /** Cover image URL. */
  image?: string | null;
  /** Alt text for the image; falls back to title. */
  imageAlt?: string;
  /** Project title. Required. */
  title: string;
  /** href for project detail page. Required. */
  href: string;
  /** Studio / architect display name. */
  studioName?: string | null;
  /** href for studio/profile page. */
  studioHref?: string | null;
  /** Location label (city or city + country). */
  location?: string | null;
  /** href for location explore link. */
  locationHref?: string | null;
  /** Year as number or string. */
  year?: number | string | null;
  /** href for year explore filter. */
  yearHref?: string | null;
  /** Area in sqft — formatted and displayed inline. */
  areaSqft?: number | null;
  /** Total connection count (team + brands). Only rendered when > 0. */
  connectionCount?: number;
  /** Team member avatars shown in the connection row. */
  teamAvatars?: ProjectListingCardAvatar[];
  /** Listing ID required for save functionality. */
  entityId?: string;
  /** Listing title used in save modal. Falls back to title prop. */
  entityTitle?: string;
}

// ── Meta icon components ───────────────────────────────────────────────────────

function LocationIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function AreaIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <rect x="3" y="3" width="18" height="18" rx="1" />
    </svg>
  );
}

// ── Save icon ──────────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Share icon ─────────────────────────────────────────────────────────────────

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// ── Avatar circle ──────────────────────────────────────────────────────────────

function AvatarCircle({ avatar, index, total }: { avatar: ProjectListingCardAvatar; index: number; total: number }) {
  const initials = (avatar.name || "?")[0].toUpperCase();
  const circle = (
    <div
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-zinc-200 dark:border-zinc-900 dark:bg-zinc-700"
      style={{ width: 24, height: 24, zIndex: total - index }}
      title={avatar.name}
    >
      {avatar.src ? (
        <Image
          src={avatar.src}
          alt=""
          width={24}
          height={24}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span
          className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400"
          aria-hidden
        >
          {initials}
        </span>
      )}
    </div>
  );

  if (avatar.href) {
    return (
      <Link
        href={avatar.href}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002abf]"
        aria-label={`View profile of ${avatar.name}`}
        style={{ display: "inline-flex" }}
      >
        {circle}
      </Link>
    );
  }
  return circle;
}

// ── Component ──────────────────────────────────────────────────────────────────

const META_COLOR = "#6b6b6b";
const FONT_STACK = "var(--font-lato, 'Lato', system-ui, sans-serif)";

/**
 * Unified editorial project card used across the entire platform.
 * Design: no outer border/shadow, rounded image only, Lato typography,
 * meta row with icons, connection avatar row with save/share actions.
 */
export function ProjectListingCard({
  image,
  imageAlt,
  title,
  href,
  studioName,
  studioHref,
  location,
  locationHref,
  year,
  yearHref,
  areaSqft,
  connectionCount = 0,
  teamAvatars = [],
  entityId,
  entityTitle,
}: ProjectListingCardProps) {
  const { isSignedIn } = useUser();
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const areaDisplay =
    areaSqft != null && !Number.isNaN(areaSqft)
      ? `${Math.round(areaSqft).toLocaleString()} sqft`
      : null;

  const yearDisplay = year != null && String(year).trim() !== "" ? String(year).trim() : null;

  const handleSave = useCallback(() => {
    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }
    setSaveModalOpen(true);
  }, [isSignedIn]);

  const handleShare = useCallback(async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // User cancelled or API unavailable — silently ignore
    }
  }, [href, title]);

  // Build meta items array for inline rendering
  const metaItems: { icon: React.ReactNode; label: string; href?: string | null }[] = [];
  if (location) {
    metaItems.push({ icon: <LocationIcon />, label: location, href: locationHref });
  }
  if (yearDisplay) {
    metaItems.push({ icon: <CalendarIcon />, label: yearDisplay, href: yearHref });
  }
  if (areaDisplay) {
    metaItems.push({ icon: <AreaIcon />, label: areaDisplay, href: null });
  }

  const visibleAvatars = teamAvatars.slice(0, 3);
  const hasConnections = connectionCount > 0;

  return (
    <article
      className="group"
      style={{ fontFamily: FONT_STACK }}
    >
      {/* ── Image ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="block focus:outline-none"
        >
          <div
            className="relative aspect-[4/3] w-full overflow-hidden"
            style={{ borderRadius: 4, backgroundColor: "#f5f5f5" }}
          >
            {image ? (
              <Image
                src={image}
                alt={imageAlt ?? title}
                fill
                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                aria-hidden
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  style={{ color: "#d4d4d4" }}
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <path
                    d="M3 16.5l5-5 4 4 3-3 6 6"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 4 }}>
        <Link
          href={href}
          className="text-zinc-900 transition-opacity duration-200 hover:opacity-70 focus:outline-none focus-visible:underline dark:text-zinc-100"
          style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}
        >
          {title}
        </Link>
      </div>

      {/* ── Studio / Architect ────────────────────────────────────────── */}
      {studioName && (
        <div style={{ marginBottom: 10 }}>
          {studioHref ? (
            <Link
              href={studioHref}
              className="transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:underline"
              style={{ fontSize: 14, fontWeight: 400, color: META_COLOR, lineHeight: 1.4 }}
            >
              {studioName}
            </Link>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 400, color: META_COLOR, lineHeight: 1.4 }}>
              {studioName}
            </span>
          )}
        </div>
      )}

      {/* ── Meta row: location · year · area ──────────────────────────── */}
      {metaItems.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ marginBottom: 14 }}
        >
          {metaItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1" style={{ color: META_COLOR }}>
              {i > 0 && (
                <span style={{ color: "#d0d0d0", marginRight: 4, userSelect: "none" }}>·</span>
              )}
              {item.icon}
              {item.href ? (
                <Link
                  href={item.href}
                  className="transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:underline"
                  style={{ fontSize: 13, color: META_COLOR }}
                >
                  {item.label}
                </Link>
              ) : (
                <span style={{ fontSize: 13, color: META_COLOR }}>{item.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid #eaeaea",
          marginBottom: 12,
        }}
      />

      {/* ── Bottom row: connections LEFT, actions RIGHT ────────────────── */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: avatars + connection count */}
        <div className="flex min-w-0 items-center gap-2">
          {hasConnections && visibleAvatars.length > 0 && (
            <div className="flex -space-x-2">
              {visibleAvatars.map((avatar, i) => (
                <AvatarCircle
                  key={i}
                  avatar={avatar}
                  index={i}
                  total={visibleAvatars.length}
                />
              ))}
            </div>
          )}
          {hasConnections && (
            <Link
              href={href}
              className="transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:underline"
              style={{ fontSize: 13, color: META_COLOR, whiteSpace: "nowrap" }}
            >
              {connectionCount} connection{connectionCount === 1 ? "" : "s"}
            </Link>
          )}
        </div>

        {/* Right: save + share */}
        <div className="flex shrink-0 items-center gap-1">
          {entityId && (
            <button
              type="button"
              onClick={handleSave}
              aria-label="Save to board"
              className="flex items-center justify-center rounded p-1.5 text-zinc-400 transition-opacity duration-200 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002abf] dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <HeartIcon />
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share project"
            className="flex items-center justify-center rounded p-1.5 text-zinc-400 transition-opacity duration-200 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002abf] dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* ── Save modal ────────────────────────────────────────────────── */}
      {saveModalOpen && entityId && (
        <SaveToFolderModal
          entityType="project"
          entityId={entityId}
          entityTitle={entityTitle ?? title}
          currentPath={typeof window !== "undefined" ? window.location.pathname : ""}
          open={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
    </article>
  );
}
