import Link from "next/link";
import Image from "next/image";
import { AtSign, BadgeCheck, Globe, Link2, MapPin } from "lucide-react";
import { FollowButton } from "@/components/follow/FollowButton";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import {
  ProfileOwnerActions,
  AvatarEditBadge,
  EditableLocation,
  EditLinksControl,
  ConnectBlock,
} from "@/components/profile/edit/ProfileOwnerActions";
import { EditableText } from "@/components/profile/edit/EditableText";
import { initialsOf } from "@/components/home/EntityCard";
import { normaliseInstagramHandle } from "@/lib/publish/instagram";
import { ProfileViewNav, type ProfileViewItem } from "@/components/profile/ProfileViews";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";
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
 * Followers and Following are gone entirely — the stat, the nav item and the
 * count. `follows` holds 9 rows platform-wide, so a follower number was "1" or
 * absent on every profile: at that scale it reads as a judgement rather than a
 * fact. The Follow BUTTON stays; being able to follow someone does not require
 * publishing a scoreboard of who has.
 *
 * Each stat still omits itself at zero — a profile with nothing published
 * should not announce "0 Listings".
 *
 * ── THE ACTIONS ARE THE PLATFORM'S BUTTONS NOW ──────────────────────────────
 * Follow and Message were the last controls on any public page still drawn in
 * the pre-editorial system — zinc borders, a hard-coded #002abf focus ring,
 * dark: variants, and two different heights and corner radii sitting side by
 * side. They now use the shared public pill tokens, so Follow is the same
 * solid ink button as Save on a project and Message the same outlined pill as
 * Share beside it. See components/ui/publicButton.
 *
 * ── ONE PANEL, NOT FOUR CARDS ───────────────────────────────────────────────
 * The reference draws the whole rail as a single tall card with internal
 * dividers, anchoring the page from top to bottom. Four separate bordered
 * boxes read as a floating profile widget beside an unrelated article.
 */

const NUMBER = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Section inside the single rail panel, separated by a hairline. */
function RailSectionBlock({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-hairline px-5 py-5">{children}</div>;
}

export function ProfileRail({
  profile,
  metrics,
  views,
  isOwner,
  initialFollowing,
  contactListing,
  claimHref,
}: {
  profile: Profile;
  metrics: ProfileMetrics;
  /** The views that actually have content. Never a fixed list. */
  views: ProfileViewItem[];
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
    // The three columns nothing could write before this pass. Each obeys the
    // same rule as the originals: rendered only when it has a value, so a
    // profile that uses none of them shows exactly the section it always did.
    profile.behance && { key: "be", href: profile.behance, Icon: Link2, label: "Behance" },
    profile.twitter_url && {
      key: "tw",
      href: profile.twitter_url,
      Icon: Link2,
      label: "X / Twitter",
    },
    profile.pinterest_url && {
      key: "pin",
      href: profile.pinterest_url,
      Icon: Link2,
      label: "Pinterest",
    },
  ].filter(Boolean) as { key: string; href: string; Icon: typeof Globe; label: string }[];

  const stats = [
    { label: metrics.listings === 1 ? "Listing" : "Listings", value: metrics.listings },
    {
      label: metrics.connections === 1 ? "Connection" : "Connections",
      value: metrics.connections,
    },
  ].filter((s) => s.value > 0);

  return (
    <aside className="lg:sticky lg:top-[92px]">
      {/* ONE panel. Every block below is a section of it, divided by hairlines,
          matching the reference's single tall rail. */}
      <div className="overflow-hidden rounded-xl border border-hairline bg-cream">
        <div className="px-5 pb-6 pt-7">
        <span className="relative mx-auto block h-24 w-24 overflow-hidden rounded-2xl bg-stone">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="96px" className="object-cover" priority />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-[26px] text-muted">
              {initialsOf(displayName)}
            </span>
          )}
          <AvatarEditBadge />
        </span>

        <h1 className="mt-5 flex items-center justify-center gap-1.5 text-center font-display text-[22px] leading-[1.15] tracking-[-0.01em] text-ink">
          <EditableText
            field="display_name"
            align="center"
            inputClassName="font-display text-[22px] leading-[1.15] tracking-[-0.01em] text-ink"
            placeholder="Studio or brand name"
          >
            <span className="min-w-0">{displayName}</span>
          </EditableText>
          {isVerified && (
            <BadgeCheck
              strokeWidth={1.5}
              className="h-4 w-4 shrink-0 text-archtivy-primary"
              aria-label="Verified profile"
            />
          )}
        </h1>

        <p className="mt-1.5 text-center font-body text-[13px] text-muted">{roleLabel}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-center font-body text-[13px] text-muted">
          <EditableLocation>
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {location}
              </span>
            )}
          </EditableLocation>
        </p>

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
          /* The owner gets the editor in the same slot Follow/Message occupy
             for everyone else — same position, same weight, nothing moves. It
             used to be a Link to /me/profile, which was a placeholder page;
             that route now redirects back here and opens this drawer. */
          <ProfileOwnerActions />
        )}

        </div>

        {/* Two balanced columns, as specified — never three, and never a lone
            centred number when one of the two is zero. */}
        {stats.length > 0 && (
          <RailSectionBlock>
            <dl className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <dd className="font-display text-[20px] leading-none text-ink">
                    {NUMBER.format(s.value)}
                  </dd>
                  <dt className="mt-1.5 font-body text-[12px] text-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
          </RailSectionBlock>
        )}

      {/* The profile navigator. Built from the views that ACTUALLY have
          content, so it can never offer a destination with nothing in it —
          the reference's fixed Overview/Projects/Products/Articles/Team/
          About/Followers list would be mostly dead on every real profile.

          These used to be `#anchor` links that scrolled down to a row of
          bottom panels. They are real view switches now; see ProfileViews. */}
      <ProfileViewNav views={views} />

      {/* In edit mode the block renders even with zero populated links, so the
          owner has somewhere to add the first one. Publicly it is unchanged:
          no links, no section. */}
      <ConnectBlock hasLinks={links.length > 0}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-body text-[12px] uppercase tracking-[0.08em] text-muted">
              Connect
            </h2>
            <EditLinksControl />
          </div>
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
      </ConnectBlock>

      {claimHref && (
        <RailSectionBlock>
          <h2 className="font-body text-[14px] text-ink">
            {profile.role === "brand" ? "Are you this brand?" : "Are you this designer?"}
          </h2>
          <p className="mt-2 font-body text-[13px] leading-[20px] text-muted">
            Claim your profile to update your information and gain more visibility.
          </p>
          <Link
            href={claimHref}
            className={`${BTN_PILL_SECONDARY} mt-4`}
          >
            Claim Profile
          </Link>
        </RailSectionBlock>
      )}
      </div>
    </aside>
  );
}
