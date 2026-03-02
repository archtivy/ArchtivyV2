import Link from "next/link";
import Image from "next/image";
import type { ProfileDirectoryItem } from "@/lib/db/profileDirectory";

// ─── Cover area (3:2 ratio via padding-top trick) ─────────────────────────────

function PlaceholderCover({ initial }: { initial: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50">
      <span className="select-none text-5xl font-light text-zinc-200">
        {initial}
      </span>
    </div>
  );
}

function CoverImage({ src, sizes }: { src: string; sizes: string }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      className="object-cover"
      sizes={sizes}
      unoptimized
    />
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

const IMG_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw";

export function ProfileDirectoryCard({ item }: { item: ProfileDirectoryItem }) {
  const displayName =
    item.display_name?.trim() ||
    item.username ||
    (item.role === "designer" ? "Designer" : "Brand");

  const roleLabel =
    item.role === "designer"
      ? (item.designer_discipline?.trim() ?? null)
      : (item.brand_type?.trim() ?? null);

  const location = [item.location_city, item.location_country]
    .filter(Boolean)
    .join(", ");

  const initial = (displayName[0] ?? "?").toUpperCase();

  const metaParts: string[] = [
    `${item.listings_count} ${item.listings_count === 1 ? "listing" : "listings"}`,
  ];
  if (item.connections_count > 0) {
    metaParts.push(
      `${item.connections_count} ${item.connections_count === 1 ? "connection" : "connections"}`
    );
  }

  return (
    <Link
      href={`/u/${encodeURIComponent(item.username)}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#ECECEC] bg-white transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      aria-label={`${displayName} profile`}
    >
      {/* ── Cover — 3:2 ratio ── */}
      <div className="relative w-full" style={{ paddingTop: "66.666%" }}>
        <div className="absolute inset-0 overflow-hidden rounded-t-lg bg-zinc-100">
          {item.cover_images.length === 0 && <PlaceholderCover initial={initial} />}
          {item.cover_images.length === 1 && (
            <CoverImage src={item.cover_images[0]} sizes={IMG_SIZES} />
          )}
          {item.cover_images.length >= 2 && (
            <div className="flex h-full">
              <div className="relative w-1/2 overflow-hidden">
                <CoverImage src={item.cover_images[0]} sizes={IMG_SIZES} />
              </div>
              <div className="w-px shrink-0 bg-white/60" aria-hidden />
              <div className="relative w-1/2 overflow-hidden">
                <CoverImage src={item.cover_images[1]} sizes={IMG_SIZES} />
              </div>
            </div>
          )}
        </div>

        {/* Avatar — centered, overlaps cover bottom by 50% */}
        <div className="absolute bottom-0 left-1/2 z-10 h-12 w-12 -translate-x-1/2 translate-y-1/2 overflow-hidden rounded-full bg-white ring-2 ring-white">
          {item.avatar_url ? (
            <Image
              src={item.avatar_url}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm font-semibold text-zinc-500">
              {initial}
            </span>
          )}
        </div>
      </div>

      {/* ── Card body — pt-8 clears avatar overlap ── */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-8 text-center">
        {roleLabel && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            {roleLabel}
          </p>
        )}
        <h2 className="mt-1 text-sm font-semibold text-zinc-900 transition-colors group-hover:text-[#002abf] line-clamp-1">
          {displayName}
        </h2>
        {location && (
          <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{location}</p>
        )}

        {/* Stats */}
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <p className="text-[11px] text-zinc-500">{metaParts.join(" · ")}</p>
        </div>
      </div>
    </Link>
  );
}
