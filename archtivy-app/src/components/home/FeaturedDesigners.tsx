import Image from "next/image";
import Link from "next/link";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getProfilesForStrip } from "@/lib/db/profiles";

/**
 * Featured Designers (Build Brief §5, left half).
 *
 * Circular avatar treatment, distinguishing designers from the square brand
 * logo tiles beside them.
 *
 * getProfilesForStrip already filters to profiles that have an avatar, so this
 * never renders an empty circle.
 *
 * NOTE: the reference shows a project count per designer ("127 Projects").
 * That needs a per-profile aggregate over listings which no current helper
 * provides, and adding five count queries to the homepage for a decorative
 * figure is a poor trade. Location is shown instead; the count can be added
 * later behind one grouped query.
 */
export async function FeaturedDesigners() {
  const designers = await getProfilesForStrip(["designer"], 5);
  if (designers.length === 0) return null;

  return (
    <div>
      <HomeSectionHeader
        title="Featured Designers"
        href="/designers"
        linkLabel="View all designers"
      />
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        {designers.map((d) => {
          const location = [d.location_city, d.location_country]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={d.id}>
              <Link
                href={d.username ? `/u/${d.username}` : `/u/id/${d.id}`}
                className="group flex flex-col items-center rounded-lg border border-hairline bg-cream p-4 text-center transition-colors hover:bg-stone/40"
              >
                <span className="relative h-12 w-12 overflow-hidden rounded-full bg-stone">
                  {d.avatar_url && (
                    <Image
                      src={d.avatar_url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="mt-3 line-clamp-2 font-body text-[13px] leading-[18px] text-ink">
                  {d.display_name ?? "Designer"}
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
