import Link from "next/link";
import Image from "next/image";
import type { ProfileDirectoryItem } from "@/lib/db/profileDirectory";

// ─── Cover collage sub-components ────────────────────────────────────────────

function PlaceholderCover({ initial }: { initial: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-zinc-50">
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, #e4e4e7 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden
      />
      <span className="relative select-none text-4xl font-light text-zinc-200">
        {initial}
      </span>
    </div>
  );
}

function SingleCover({ src }: { src: string }) {
  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        unoptimized
      />
    </div>
  );
}

function DualCover({ src1, src2 }: { src1: string; src2: string }) {
  return (
    <div className="flex h-full">
      <div className="relative w-1/2 overflow-hidden">
        <Image
          src={src1}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 13vw, (min-width: 768px) 17vw, (min-width: 640px) 25vw, 50vw"
          unoptimized
        />
      </div>
      {/* 1px white separator between collage images */}
      <div className="w-px shrink-0 bg-white/50" aria-hidden />
      <div className="relative w-1/2 overflow-hidden">
        <Image
          src={src2}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 13vw, (min-width: 768px) 17vw, (min-width: 640px) 25vw, 50vw"
          unoptimized
        />
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

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
  const isPremium = item.cover_images.length >= 2;

  return (
    <Link
      href={`/u/${encodeURIComponent(item.username)}`}
      className="group flex flex-col rounded border border-zinc-200 bg-white transition-colors hover:border-[#002abf]/30"
      style={{ borderRadius: 4 }}
      aria-label={`${displayName} profile`}
    >
      {/* ── Cover collage ── */}
      <div className="relative h-[132px] overflow-hidden rounded-t bg-zinc-100" style={{ borderRadius: "4px 4px 0 0" }}>
        {item.cover_images.length === 0 && <PlaceholderCover initial={initial} />}
        {item.cover_images.length === 1 && <SingleCover src={item.cover_images[0]} />}
        {isPremium && (
          <DualCover src1={item.cover_images[0]} src2={item.cover_images[1]} />
        )}

        {/* Avatar — overlaps 20px into card body via translate-y-1/2 */}
        <div className="absolute bottom-0 left-4 z-10 h-10 w-10 translate-y-1/2 overflow-hidden rounded-full bg-zinc-100 ring-2 ring-white">
          {item.avatar_url ? (
            <Image
              src={item.avatar_url}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-500">
              {initial}
            </span>
          )}
        </div>
      </div>

      {/* ── Card body ── pt-8 = 32px makes room for the 20px avatar overlap + gap */}
      <div className="flex flex-1 flex-col px-4 pt-8 pb-4">
        {roleLabel && (
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            {roleLabel}
          </p>
        )}
        <h2 className="mt-0.5 text-sm font-medium text-zinc-900 transition-colors group-hover:text-[#002abf] line-clamp-1">
          {displayName}
        </h2>
        {location && (
          <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{location}</p>
        )}

        {/* Stats row */}
        <div className="mt-auto pt-3 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-500">
            {item.listings_count}{" "}
            {item.listings_count === 1 ? "listing" : "listings"}
            {item.connections_count > 0 && (
              <> · {item.connections_count} connections</>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
