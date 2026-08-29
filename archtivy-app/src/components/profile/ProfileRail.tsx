import Link from "next/link";
import Image from "next/image";
import { AtSign, BadgeCheck, Globe, Link2, MapPin } from "lucide-react";
import { FollowButton } from "@/components/follow/FollowButton";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import { initialsOf } from "@/components/home/EntityCard";
import { normaliseInstagramHandle } from "@/lib/publish/instagram";
import type { ProfileMetrics } from "@/lib/db/profileMetrics";
import type { Profile } from "@/lib/types/profiles";

/**
 * The persistent left rail: identity, actions, metrics, section nav, links,
 * claim.
 *
 * ── THE METRICS ARE NOT THE REFERENCE'S ─────────────────────────────────────
 * The mockup shows Projects / Followers / Following. Following is a fact about
 * the profile's own browsing habits, not about its value to anyone reading the
 * page, and "Projects" reports zero for every brand on the platform. The three
 * here say what a profile is worth inside a connected archive: how much it has
 * published, how much of the graph it touches, and how many people track it.
 * The definitions live in lib/db/profileMetrics — one rule, used wherever this
 * metric appears.
 *
 * Each stat omits itself at zero rather than printing a 0. Followers is the
 * one the brief calls out, but the same rule is right for all three: a profile
 * with nothing published should not announce "0 Listings".
 */

const NUMBER = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export interface RailSection {
  id: string;
  label: string;
}

export function ProfileRail({
  profile,
  metrics,
  sections,
  isOwner,
  initialFollowing,
  contactListing,
  claimHref,
}: {
  profile: Profile;
  metrics: ProfileMetrics;
  /** Anchors to sections that actually rendered. Never a fixed list. */
  sections: RailSection[];
  isOwner: boolean;
  initialFollowing: boolean;
  contactListing: { id: string; type: "project" | "product"; title: string } | null;
  /** Null when the profile is already claimed or has no claim route. */
  claimHref: string | null;
}) {
  const displayName = profile.display_name ?? profile.username ?? "Profile";

  const showLocation =
    (profile as { location_visibility?: string }).location_visibility !== "private";
  const location = showLocation
    ? [profile.location_city, profile.location_country].filter(Boolean).join(", ") || null
    : null;

  /* Verification ties to claim_status: a claimed profile is one a real person
     proved they control. There is no separate verified flag to read. */
  const isVerified = (profile as { claim_status?: string }).claim_status === "claimed";

  const roleLabel =
    profile.role === "designer"
      ? ((profile as { show_designer_discipline?: boolean }).show_designer_discipline !== false &&
          profile.designer_discipline) ||
        "Architect / Designer"
      : profile.role === "brand"
        ? ((profile as { show_brand_type?: boolean }).show_brand_type !== false &&
            profile.brand_type) ||
          "Brand"
        : "Member";

  const igHandle = profile.instagram ? normaliseInstagramHandle(profile.instagram) : null;
  const links = [
    profile.website && { key: "web", href: profile.website, Icon: Globe, label: "Website" },
    igHandle && {
      key: "ig",
      href: `https://instagram.com/${igHandle}`,
      Icon: AtSign,
      label: "Instagram",
    },
    profile.linkedin && {
      key: "li",
      href: profile.linkedin,
      Icon: Link2,
      label: "LinkedIn",
    },
  ].filter(Boolean) as { key: string; href: string; Icon: typeof Globe; label: string }[];

  const stats = [
    { label: metrics.listings === 1 ? "Listing" : "Listings", value: metrics.listings },
    {
      label: metrics.connections === 1 ? "Connection" : "Connections",
      value: metrics.connections,
    },
    ...(metrics.followers
      ? [{ label: metrics.followers === 1 ? "Follower" : "Followers", value: metrics.followers }]
      : []),
  ].filter((s) => s.value > 0);

  return (
    <aside className="lg:sticky lg:top-[92px]">
      <div className="rounded-2xl border border-hairline bg-cream p-6">
        <span className="relative mx-auto block h-24 w-24 overflow-hidden rounded-2xl bg-stone">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="96px" className="object-cover" priority />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-[26px] text-muted">
              {initialsOf(displayName)}
            </span>
          )}
        </span>

        <h1 className="mt-5 flex items-center justify-center gap-1.5 text-center font-display text-[22px] leading-[1.15] tracking-[-0.01em] text-ink">
          <span className="min-w-0">{displayName}</span>
          {isVerified && (
            <BadgeCheck
              strokeWidth={1.5}
              className="h-4 w-4 shrink-0 text-archtivy-primary"
              aria-label="Verified profile"
            />
          )}
        </h1>

        <p className="mt-1.5 text-center font-body text-[13px] text-muted">{roleLabel}</p>
        {location && (
          <p className="mt-1 flex items-center justify-center gap-1 text-center font-body text-[13px] text-muted">
            <MapPin strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {location}
          </p>
        )}

        {!isOwner ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <FollowButton
              targetType={profile.role === "brand" ? "brand" : "designer"}
              targetId={profile.id}
              initialFollowing={initialFollowing}
            />
            {contactListing && (
              <ProfileContactButton
                listingId={contactListing.id}
                listingType={contactListing.type}
                listingTitle={contactListing.title}
              />
            )}
          </div>
        ) : (
          <div className="mt-5 text-center">
            <Link
              href="/me/profile"
              className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Edit profile
            </Link>
          </div>
        )}

        {stats.length > 0 && (
          <dl className="mt-6 flex items-start justify-center gap-6 border-t border-hairline pt-5">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <dd className="font-display text-[19px] leading-none text-ink">
                  {NUMBER.format(s.value)}
                </dd>
                <dt className="mt-1.5 font-body text-[12px] text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Section nav. Built from the sections that ACTUALLY rendered, so it can
          never offer a link to a heading that is not on the page — the
          reference's fixed Overview/Projects/Products/Articles/Team/About/
          Followers list would be mostly dead on every real profile. */}
      {sections.length > 0 && (
        <nav aria-label="Profile sections" className="mt-4 rounded-2xl border border-hairline p-2">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-lg px-4 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {links.length > 0 && (
        <div className="mt-4 rounded-2xl border border-hairline p-5">
          <h2 className="mb-3 font-body text-[12px] uppercase tracking-[0.08em] text-muted">
            Connect
          </h2>
          <ul className="space-y-2.5">
            {links.map(({ key, href, Icon, label }) => (
              <li key={key}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="inline-flex items-center gap-2.5 font-body text-[13px] text-muted transition-colors hover:text-ink"
                >
                  <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {claimHref && (
        <div className="mt-4 rounded-2xl border border-hairline p-5">
          <h2 className="font-body text-[14px] text-ink">
            {profile.role === "brand" ? "Are you this brand?" : "Are you this designer?"}
          </h2>
          <p className="mt-2 font-body text-[13px] leading-[20px] text-muted">
            Claim your profile to update your information and gain more visibility.
          </p>
          <Link
            href={claimHref}
            className="mt-4 inline-flex rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
          >
            Claim Profile
          </Link>
        </div>
      )}
    </aside>
  );
}
