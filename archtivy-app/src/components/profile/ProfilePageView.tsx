import Link from "next/link";
import Image from "next/image";
// lucide-react dropped its brand glyphs, so Instagram/LinkedIn use neutral
// icons rather than pulling in a second icon dependency for two links.
import { AtSign, BadgeCheck, Globe, Link2, MapPin } from "lucide-react";
import { FollowButton } from "@/components/follow/FollowButton";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import { initialsOf } from "@/components/home/EntityCard";
import { normaliseInstagramHandle } from "@/lib/publish/instagram";
import { TYPE } from "@/components/admin/ui/tokens";
import { ProfileTabs, type ProfileTab } from "@/components/profile/ProfileTabs";
import {
  Panel,
  InfoRows,
  PeopleRow,
  TagRow,
  DocumentList,
  CompactListingList,
  ProfileEmptyState,
} from "@/components/profile/ProfileModules";
import type { ProfilePageData } from "@/lib/db/profilePage";
import type { Profile } from "@/lib/types/profiles";

/**
 * The public profile page — ONE component, two content models.
 *
 * ── CHROME FOLLOWS THE REFERENCE; CONTENT DOES NOT ──────────────────────────
 * Adopted from the reference design: full-bleed cover with the avatar
 * overlapping its bottom-left, identity block beneath, social icon row,
 * Follow/Message at the top right, a tab row under the hero, the card grid
 * style, and soft-bordered info panels along the bottom.
 *
 * REMOVED BY DECISION, not adapted:
 *   - the left sidebar nav (Overview/Projects/.../Messages) — gone entirely
 *   - the stats bar (Projects/Products Used/Collections/Articles/Followers/
 *     Following) — gone entirely, not simplified and not hidden-until-nonzero,
 *     because the underlying counts are too sparse to read as intentional
 *   - the followers panel — gone entirely, extending the standing "no visible
 *     follower count" decision to the list view as well
 *
 * ── WHY ONE COMPONENT AND NOT ONE TEMPLATE ──────────────────────────────────
 * Sharing a template across designers and brands is the mistake the platform's
 * own competitive read calls out. Only the SKELETON is shared — cover,
 * identity, follow/contact — while the tabs and the panel row are composed per
 * role, and the two orderings have nothing in common:
 *
 *   designer  portfolio-first  Projects | About · Brands they've used ·
 *                                        Collaborators
 *   brand     catalogue-first  Products | About · Seen in Projects ·
 *                                        Specified by · Catalogues
 *
 * ── DEFERRED, BY DECISION ───────────────────────────────────────────────────
 * Awards (designer), certifications/sustainability and regional availability
 * (brand) have no table at all — all three answer PGRST205. Their slots are
 * marked and render nothing, so adding the tables later is additive. The
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
    <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
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

/** "https://www.molteni.it/en/" -> "molteni.it/en" — the raw URL overflows. */
function prettyUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || null;
}

function roleLabelFor(profile: Profile): string {
  if (profile.role === "designer") {
    const show =
      (profile as { show_designer_discipline?: boolean }).show_designer_discipline !== false;
    return (show && profile.designer_discipline) || "Architect / Designer";
  }
  if (profile.role === "brand") {
    const show = (profile as { show_brand_type?: boolean }).show_brand_type !== false;
    return (show && profile.brand_type) || "Brand";
  }
  return "Member";
}

function ProfileHeader({
  profile,
  data,
  isOwner,
  initialFollowing,
  contactListing,
}: ProfilePageViewProps) {
  const displayName = profile.display_name ?? profile.username ?? "Profile";
  const showLocation =
    (profile as { location_visibility?: string }).location_visibility !== "private";
  const location = showLocation
    ? [profile.location_city, profile.location_country].filter(Boolean).join(", ") || null
    : null;

  // Verification ties to claim_status: a claimed profile is one a real person
  // proved they control. Nothing is claimed today (all 199 rows are
  // 'unclaimed'), so this renders for nobody and self-activates as claims land.
  const isVerified = (profile as { claim_status?: string }).claim_status === "claimed";

  return (
    <header>
      {/* Cover. No cover column exists on `profiles`, so this is the profile's
          own first cover image; when they have published nothing it falls back
          to a flat stone band rather than a broken frame. */}
      <div className="relative h-[200px] w-full overflow-hidden rounded-2xl bg-stone sm:h-[280px]">
        {data.coverImage && (
          <Image
            src={data.coverImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="relative px-1 sm:px-6">
        {/* Avatar overlaps the cover's bottom-left, per the reference. */}
        <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-cream bg-stone sm:h-28 sm:w-28">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-[28px] text-muted">
                  {initialsOf(displayName)}
                </span>
              )}
            </span>
          </div>

          {/* Follow / Message, top-right of the identity block. Follower count
              is deliberately absent, here and everywhere on this page. */}
          {!isOwner ? (
            <div className="flex flex-wrap items-center gap-2.5 pb-1">
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
            <div className="pb-1">
              <Link
                href="/me/profile"
                className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Edit profile
              </Link>
            </div>
          )}
        </div>

        <div className="mt-5">
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

          {/* Clamped to 5 lines. The reference assumes a ~3-line bio, but real
              ones are unbounded — Schmidt Hammer Lassen's runs 25 lines and
              pushed the tabs and the entire grid below the fold. The full text
              stays in the DOM, so it is intact for screen readers and for SEO;
              only the visual height is capped. */}
          {profile.bio && (
            <p className="mt-4 line-clamp-5 max-w-[62ch] font-body text-[15px] leading-[26px] text-ink/85">
              {profile.bio}
            </p>
          )}

          <SocialLinks profile={profile} />
        </div>
      </div>

      {/* SLOT: Promote / Featured CTA. Blocked on Stripe — intentionally not
          rendered rather than shown as a button that cannot complete. */}
    </header>
  );
}

/* ── Panel rows ──────────────────────────────────────────────────────────── */

function PanelGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-14 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}

function DesignerPanels({ profile, data }: { profile: Profile; data: ProfilePageData }) {
  const about = (
    <InfoRows
      rows={[
        { label: "Discipline", value: profile.designer_discipline ?? null },
        { label: "Based in", value: [profile.location_city, profile.location_country].filter(Boolean).join(", ") || null },
        { label: "Builds in", value: data.locations.length > 0 ? data.locations.join(", ") : null },
        { label: "Website", value: prettyUrl(profile.website) },
      ]}
    />
  );
  const hasAbout = Boolean(
    profile.designer_discipline || profile.location_city || data.locations.length > 0 || profile.website
  );

  if (!hasAbout && data.styleTags.length === 0 && data.brandsUsed.length === 0 && data.collaborators.length === 0) {
    return null;
  }

  return (
    <PanelGrid>
      {hasAbout && <Panel title="About">{about}</Panel>}
      {data.styleTags.length > 0 && (
        <Panel title="Specialisation">
          <TagRow tags={data.styleTags} />
        </Panel>
      )}
      {data.brandsUsed.length > 0 && (
        <Panel title="Brands they've used">
          <PeopleRow people={data.brandsUsed} compact />
        </Panel>
      )}
      {data.collaborators.length > 0 && (
        <Panel title="Collaborators">
          <PeopleRow people={data.collaborators} compact />
        </Panel>
      )}
      {/* SLOT: Awards — no `awards` table exists (PGRST205). Deferred.
          SLOT: Latest activity — there is no per-profile activity feed and
          listing_views/listing_saves are both empty, so a "recent activity"
          panel would have nothing truthful to show. */}
    </PanelGrid>
  );
}

function BrandPanels({ profile, data }: { profile: Profile; data: ProfilePageData }) {
  const hasAbout = Boolean(profile.brand_type || profile.location_city || profile.website);

  if (
    !hasAbout &&
    data.seenInProjects.length === 0 &&
    data.specifiedBy.length === 0 &&
    data.documents.length === 0
  ) {
    return null;
  }

  return (
    <PanelGrid>
      {hasAbout && (
        <Panel title="About">
          <InfoRows
            rows={[
              { label: "Type", value: profile.brand_type ?? null },
              { label: "Based in", value: [profile.location_city, profile.location_country].filter(Boolean).join(", ") || null },
              { label: "Website", value: prettyUrl(profile.website) },
            ]}
          />
        </Panel>
      )}
      {data.seenInProjects.length > 0 && (
        <Panel title="Seen in Projects">
          <CompactListingList items={data.seenInProjects} />
        </Panel>
      )}
      {data.specifiedBy.length > 0 && (
        <Panel title="Specified by">
          <PeopleRow people={data.specifiedBy} compact />
        </Panel>
      )}
      {data.documents.length > 0 && (
        <Panel title="Catalogues & documents">
          <DocumentList documents={data.documents} />
        </Panel>
      )}
      {/* SLOTS: Sustainability / certifications and regional availability —
          neither `certifications` nor `regional_availability` exists
          (PGRST205). Deferred; adding them is additive. */}
    </PanelGrid>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export function ProfilePageView(props: ProfilePageViewProps) {
  const { profile, data, isOwner } = props;
  const displayName = profile.display_name ?? profile.username ?? "Profile";
  const hasWork = data.projects.length > 0 || data.products.length > 0;

  const isDesigner = profile.role === "designer";
  const isBrand = profile.role === "brand";

  // Only tabs with content. Collections and Articles from the reference have no
  // per-profile data model at all, so they are absent rather than empty.
  const tabs: ProfileTab[] = [
    ...(data.projects.length > 0
      ? [{ key: "projects", label: "Projects", items: data.projects }]
      : []),
    ...(data.products.length > 0
      ? [{ key: "products", label: isBrand ? "Products" : "Products", items: data.products }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-6 md:px-10 lg:px-14">
        <ProfileHeader {...props} />

        <div className="mt-12">
          {hasWork ? (
            <>
              <ProfileTabs tabs={tabs} />
              {/* `reader` and any future role get the skeleton only — they own
                  no listings, so every role panel would be empty anyway. */}
              {isDesigner && <DesignerPanels profile={profile} data={data} />}
              {isBrand && <BrandPanels profile={profile} data={data} />}
            </>
          ) : (
            <ProfileEmptyState isOwner={isOwner} displayName={displayName} role={profile.role} />
          )}
        </div>
      </div>
    </div>
  );
}
