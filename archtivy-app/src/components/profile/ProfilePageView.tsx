import Link from "next/link";
import Image from "next/image";
// lucide-react dropped its brand glyphs, so Instagram/LinkedIn use neutral
// icons rather than pulling in a second icon dependency for two links.
import { AtSign, BadgeCheck, Globe, Link2, MapPin } from "lucide-react";
import { FollowButton } from "@/components/follow/FollowButton";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import { initialsOf } from "@/components/home/EntityCard";
import { normaliseInstagramHandle } from "@/lib/publish/instagram";
import { TYPE, SURFACE } from "@/components/admin/ui/tokens";
import {
  Section,
  ListingGrid,
  PeopleRow,
  TagRow,
  DocumentList,
  ProfileEmptyState,
} from "@/components/profile/ProfileModules";
import type { ProfilePageData } from "@/lib/db/profilePage";
import type { Profile } from "@/lib/types/profiles";

/**
 * The public profile page — ONE component, two content models.
 *
 * ── WHY ONE COMPONENT AND NOT ONE TEMPLATE ──────────────────────────────────
 * The platform's own competitive read is that sharing a template across
 * designers and brands is the mistake to avoid, and that is respected here: the
 * SKELETON is shared (identity, contact, follow) because a name and an avatar
 * are the same problem for everyone, while everything below it is composed per
 * role and the two orderings have nothing in common:
 *
 *   designer  portfolio-first  Projects -> Specialisation -> Locations
 *                              -> Brands used -> Collaborators
 *   brand     catalogue-first  Products -> Seen in Projects -> Specified by
 *                              -> Catalogues -> [certifications] [availability]
 *
 * What is shared is a shell, not a layout.
 *
 * ── WHY IT REPLACED TWO ROUTES ──────────────────────────────────────────────
 * /u/[username] and /u/id/[profileId] were two ~420-line implementations of the
 * same page. Only 41 of 199 profiles have a username, so the id route was not a
 * fallback — it served the MAJORITY of profiles with a different layout. Both
 * routes now render this.
 *
 * ── DEFERRED, BY DECISION ───────────────────────────────────────────────────
 * Awards (designer), certifications/sustainability and regional availability
 * (brand) have no table at all — `awards`, `certifications` and
 * `regional_availability` all answer PGRST205. The slots are marked below and
 * deliberately render nothing, so adding the tables later is additive. The
 * Promote/Featured CTA is the same: a marked slot, not a fake button.
 */

export interface ProfilePageViewProps {
  profile: Profile;
  data: ProfilePageData;
  isOwner: boolean;
  /** Viewer's follow state, resolved server-side. */
  initialFollowing: boolean;
  /** Listing used to seed the contact dialog, when one exists. */
  contactListing: { id: string; type: "project" | "product"; title: string } | null;
}

/* ── Identity ────────────────────────────────────────────────────────────── */

function SocialLinks({ profile }: { profile: Profile }) {
  // profiles.instagram is NOT normalised in the database — it holds whatever was
  // pasted, in practice a full URL, unlike listings.instagram which has a CHECK
  // enforcing a bare handle. Normalising at render was the chosen fix (no
  // migration); the format split is logged as DATA_INTEGRITY_LOG item 8.
  const igHandle = profile.instagram ? normaliseInstagramHandle(profile.instagram) : null;

  const links = [
    profile.website && { key: "web", href: profile.website, Icon: Globe, label: "Website" },
    igHandle && {
      key: "ig",
      href: `https://instagram.com/${igHandle}`,
      Icon: AtSign,
      label: `@${igHandle}`,
    },
    profile.linkedin && { key: "li", href: profile.linkedin, Icon: Link2, label: "LinkedIn" },
  ].filter(Boolean) as { key: string; href: string; Icon: typeof Globe; label: string }[];

  if (links.length === 0) return null;

  return (
    <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
      {links.map(({ key, href, Icon, label }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer me"
            className="inline-flex items-center gap-2 font-body text-[13px] text-muted transition-colors hover:text-ink"
          >
            <Icon strokeWidth={1.5} className="h-4 w-4" aria-hidden />
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function roleLabelFor(profile: Profile): string {
  if (profile.role === "designer") {
    const show = (profile as { show_designer_discipline?: boolean }).show_designer_discipline !== false;
    return (show && profile.designer_discipline) || "Architect / Designer";
  }
  if (profile.role === "brand") {
    const show = (profile as { show_brand_type?: boolean }).show_brand_type !== false;
    return (show && profile.brand_type) || "Brand";
  }
  return "Member";
}

function IdentityHeader({
  profile,
  isOwner,
  initialFollowing,
  contactListing,
}: Omit<ProfilePageViewProps, "data">) {
  const displayName = profile.display_name ?? profile.username ?? "Profile";
  const showLocation =
    (profile as { location_visibility?: string }).location_visibility !== "private";
  const location =
    showLocation
      ? [profile.location_city, profile.location_country].filter(Boolean).join(", ") || null
      : null;

  // Verification ties to claim_status: a claimed profile is one a real person
  // proved they control. Nothing is claimed today (all 199 rows are
  // 'unclaimed'), so this renders for nobody and self-activates as claims land.
  const isVerified = (profile as { claim_status?: string }).claim_status === "claimed";

  return (
    <header className={`${SURFACE} px-6 py-8 sm:px-9 sm:py-10`}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-stone sm:h-24 sm:w-24">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-[26px] text-muted">
              {initialsOf(displayName)}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className={TYPE.meta}>{roleLabelFor(profile)}</p>
          <h1 className="mt-1 flex items-center gap-2 font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink sm:text-[36px]">
            <span className="min-w-0">{displayName}</span>
            {isVerified && (
              <BadgeCheck
                strokeWidth={1.5}
                className="h-5 w-5 shrink-0 text-archtivy-primary"
                aria-label="Verified profile"
              />
            )}
          </h1>

          {location && (
            <p className="mt-2 inline-flex items-center gap-1.5 font-body text-[14px] text-muted">
              <MapPin strokeWidth={1.5} className="h-4 w-4" aria-hidden />
              {location}
            </p>
          )}

          {profile.bio && (
            <p className="mt-4 max-w-[62ch] font-body text-[15px] leading-[26px] text-ink/85">
              {profile.bio}
            </p>
          )}

          <SocialLinks profile={profile} />

          {/* Follower count is deliberately absent on both role types. */}
          {!isOwner && (
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
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
          )}
          {isOwner && (
            <div className="mt-6">
              <Link
                href="/me/profile"
                className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Edit profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* SLOT: Promote / Featured CTA. Blocked on Stripe — intentionally not
          rendered rather than shown as a button that cannot complete. The
          header lays out correctly with or without it. */}
    </header>
  );
}

/* ── Role compositions ───────────────────────────────────────────────────── */

function DesignerSections({ data }: { data: ProfilePageData }) {
  return (
    <>
      {data.projects.length > 0 && (
        <Section title="Projects" count={data.projects.length}>
          <ListingGrid items={data.projects} />
        </Section>
      )}
      {data.styleTags.length > 0 && (
        <Section title="Specialisation">
          <TagRow tags={data.styleTags} />
        </Section>
      )}
      {data.locations.length > 0 && (
        <Section title="Where they build">
          <TagRow tags={data.locations} />
        </Section>
      )}
      {data.brandsUsed.length > 0 && (
        <Section title="Brands they've used" count={data.brandsUsed.length}>
          <PeopleRow people={data.brandsUsed} />
        </Section>
      )}
      {data.collaborators.length > 0 && (
        <Section title="Collaborators" count={data.collaborators.length}>
          <PeopleRow people={data.collaborators} />
        </Section>
      )}
      {/* SLOT: Awards — no `awards` table exists (PGRST205). Deferred. */}
    </>
  );
}

function BrandSections({ data }: { data: ProfilePageData }) {
  return (
    <>
      {data.products.length > 0 && (
        <Section title="Catalogue" count={data.products.length}>
          <ListingGrid items={data.products} />
        </Section>
      )}
      {data.seenInProjects.length > 0 && (
        <Section title="Seen in Projects" count={data.seenInProjects.length}>
          <ListingGrid items={data.seenInProjects} />
        </Section>
      )}
      {data.specifiedBy.length > 0 && (
        <Section title="Specified by" count={data.specifiedBy.length}>
          <PeopleRow people={data.specifiedBy} />
        </Section>
      )}
      {data.documents.length > 0 && (
        <Section title="Catalogues & documents" count={data.documents.length}>
          <DocumentList documents={data.documents} />
        </Section>
      )}
      {/* SLOTS: Sustainability / certifications and regional availability —
          neither `certifications` nor `regional_availability` exists
          (PGRST205). Deferred; adding them is additive. */}
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export function ProfilePageView({
  profile,
  data,
  isOwner,
  initialFollowing,
  contactListing,
}: ProfilePageViewProps) {
  const displayName = profile.display_name ?? profile.username ?? "Profile";
  const hasWork = data.projects.length > 0 || data.products.length > 0;
  // `reader` (and any future role) gets the shared skeleton and nothing else —
  // it owns no listings, so every role module would be empty anyway.
  const isDesigner = profile.role === "designer";
  const isBrand = profile.role === "brand";

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-10 lg:px-14">
        <IdentityHeader
          profile={profile}
          isOwner={isOwner}
          initialFollowing={initialFollowing}
          contactListing={contactListing}
        />

        <div className="mt-12">
          {hasWork ? (
            <>
              {isDesigner && <DesignerSections data={data} />}
              {isBrand && <BrandSections data={data} />}
            </>
          ) : (
            <ProfileEmptyState
              isOwner={isOwner}
              displayName={displayName}
              role={profile.role}
            />
          )}
        </div>
      </div>
    </div>
  );
}
