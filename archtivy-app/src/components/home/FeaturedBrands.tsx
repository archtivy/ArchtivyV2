import Image from "next/image";
import Link from "next/link";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getProfilesForStrip } from "@/lib/db/profiles";

/**
 * Featured Brands (Build Brief §5, right half).
 *
 * Square logo-mark tiles on stone, distinguishing brands from the circular
 * designer avatars beside them.
 *
 * These are the platform's OWN brand profiles. The reference screenshot showed
 * Vitra / FLOS / B&B Italia / Gaggenau / Mutina — third-party trademarks used
 * as mockup filler. Reproducing those would mean fabricating logo assets for
 * companies that have no presence on the platform, so real brand profiles are
 * used instead.
 */
export async function FeaturedBrands() {
  const brands = await getProfilesForStrip(["brand"], 5);
  if (brands.length === 0) return null;

  return (
    <div>
      <HomeSectionHeader
        title="Featured Brands"
        href="/brands"
        linkLabel="View all brands"
      />
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        {brands.map((b) => {
          const location = [b.location_city, b.location_country]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={b.id}>
              <Link
                href={b.username ? `/u/${b.username}` : `/u/id/${b.id}`}
                className="group flex flex-col items-center rounded-lg border border-hairline bg-cream p-4 text-center transition-colors hover:bg-stone/40"
              >
                <span className="relative h-12 w-12 overflow-hidden rounded bg-stone">
                  {b.avatar_url && (
                    <Image
                      src={b.avatar_url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain"
                    />
                  )}
                </span>
                <span className="mt-3 line-clamp-2 font-body text-[13px] leading-[18px] text-ink">
                  {b.display_name ?? "Brand"}
                </span>
                {location && (
                  <span className="mt-1 line-clamp-1 font-body text-[12px] leading-[16px] text-muted">
                    {location}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
