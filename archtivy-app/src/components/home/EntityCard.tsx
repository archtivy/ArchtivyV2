import Image from "next/image";
import Link from "next/link";
import { MapPin, Images } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";

/**
 * One card anatomy, several entity skins (Blueprint §20).
 *
 * Image → Title → Subtitle/attribution → Metadata row. A Project card and a
 * Product card differ only in what fills those slots, never in structure, so
 * users learn the pattern once.
 *
 * No shadow at rest and none on hover — hover is a 1–2% scale on the image only
 * (Design Tokens §4), so nothing competes with the photography.
 */

export interface EntityCardProps {
  href: string;
  title: string;
  /** Attribution line — studio for a project, brand for a product. */
  subtitle?: string | null;
  /** Metadata slot — location for projects, category for products. */
  meta?: string | null;
  /** Shown above the title with a pin glyph, for projects. */
  location?: string | null;
  imageUrl?: string | null;
  /** 4:3 for grid cards, 1:1 for product tiles (Blueprint §19). */
  ratio?: "4/3" | "1/1";
  sizes?: string;
  priority?: boolean;

  /* ── Directory extensions (Projects Index brief §3) ─────────────────────
   * Added to this component rather than forked into a second card, so the
   * homepage and the directory keep one anatomy. All optional: the homepage
   * passes none of them and renders exactly as before. */

  /** Image-count badge, top-left. Omitted when 0 or 1 — a "1" badge is noise. */
  imageCount?: number;
  /** Renders the save toggle, top-right. Omit to leave the card read-only. */
  saveListingId?: string;
  /**
   * What `saveListingId` refers to. Required alongside it — the save control
   * labels itself from this, and a default would relabel every product card
   * "Save project" again.
   */
  saveEntityType?: "project" | "product";
  /** Small circular attribution badge, bottom-right of the image. */
  avatarUrl?: string | null;
  /** Fallback when there is no avatar image. */
  avatarInitials?: string | null;
  /** Metadata chips under the title, e.g. Residential · 2023 · 420 ft². */
  chips?: string[];
}

/** "Studio Jencquel" -> "SJ". Two letters max. */
export function initialsOf(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function EntityCard({
  href,
  title,
  subtitle,
  meta,
  location,
  imageUrl,
  ratio = "4/3",
  sizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw",
  priority = false,
  imageCount,
  saveListingId,
  saveEntityType,
  avatarUrl,
  avatarInitials,
  chips,
}: EntityCardProps) {
  return (
    <Link href={href} className="group block">
      <div
        className={[
          "relative w-full overflow-hidden rounded-lg bg-stone",
          ratio === "1/1" ? "aspect-square" : "aspect-[4/3]",
        ].join(" ")}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="absolute inset-0" aria-hidden />
        )}

        {typeof imageCount === "number" && imageCount > 1 && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded bg-ink/70 px-2 py-1 font-body text-[11px] text-cream backdrop-blur-sm">
            <Images strokeWidth={1.5} className="h-3 w-3" aria-hidden />
            {imageCount}
          </span>
        )}

        {saveListingId && saveEntityType && (
          <SaveToggle
            listingId={saveListingId}
            entityType={saveEntityType}
            entityTitle={title}
          />
        )}

        {(avatarUrl || avatarInitials) && (
          <span className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink font-body text-[11px] text-cream">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
            ) : (
              avatarInitials
            )}
          </span>
        )}
      </div>

      {location && (
        <p className="mt-3 flex items-center gap-1 font-body text-[12px] leading-[16px] text-muted">
          <MapPin strokeWidth={1.5} className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{location}</span>
        </p>
      )}

      <h3
        className={[
          "font-body text-[15px] leading-[22px] text-ink",
          location ? "mt-1" : "mt-3",
        ].join(" ")}
      >
        {title}
      </h3>

      {subtitle && (
        <p className="mt-1 font-body text-[13px] leading-[18px] text-muted">{subtitle}</p>
      )}
      {meta && (
        <p className="mt-0.5 font-body text-[12px] leading-[16px] text-muted">{meta}</p>
      )}

      {chips && chips.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded border border-hairline px-2 py-0.5 font-body text-[11px] leading-[16px] text-muted"
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
