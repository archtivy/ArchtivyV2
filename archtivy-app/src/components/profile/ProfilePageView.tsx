import Link from "next/link";
import Image from "next/image";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
// lucide-react dropped its brand glyphs, so Instagram/LinkedIn use neutral
// icons rather than pulling in a second icon dependency for two links.
import { ProfileTabs, type ProfileTab } from "@/components/profile/ProfileTabs";
import { ProfileRail, type RailSection } from "@/components/profile/ProfileRail";
import {
  Panel,
  InfoRows,
  PeopleRow,
  TagRow,
  DocumentList,
  CompactListingList,
  ProfileEmptyState,
} from "@/components/profile/ProfileModules";
import type { ProfileMetrics } from "@/lib/db/profileMetrics";
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
  /** Listings / Connections / Followers. See lib/db/profileMetrics. */
  metrics: ProfileMetrics;
  isOwner: boolean;
  /** Viewer's follow state, resolved server-side. */
  initialFollowing: boolean;
  /** Listing used to seed the contact dialog, when one exists. */
  contactListing: { id: string; type: "project" | "product"; title: string } | null;
}

/* ── Identity ────────────────────────────────────────────────────────────── */

/** "https://www.molteni.it/en/" -> "molteni.it/en" — the raw URL overflows. */
function prettyUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || null;
}

function ProfileHeader({
  profile,
  data,
  isOwner,
  initialFollowing,
  contactListing,
}: ProfilePageViewProps) {
  /* Name, location and verification all render in the rail now — see
     ProfileRail. This header owns the cover, the statement and the chips. */
  return (
    <header>
      {/* Cover. No cover column exists on `profiles`, so this is the profile's
          own first cover image; when they have published nothing it falls back
          to a flat stone band rather than a broken frame. */}
      {/* ── COVER GEOMETRY, MEASURED FROM THE REFERENCE ────────────────────
          The reference cover spans the full main column at roughly 4.3 : 1 —
          755 x 176 in a 1024-wide render. This was a fixed 200/280px height,
          which at a 1050px column gave about 2.4 : 1: far taller and narrower
          than approved, and it pushed the tabs and the first row of work down
          the page. An aspect ratio rather than a height keeps that proportion
          at every width. */}
      <div className="relative aspect-[43/10] w-full overflow-hidden rounded-xl bg-stone">
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

      {/* Statement + expertise chips, sitting under the cover as in the
          reference. Identity, actions and metrics all moved to the persistent
          rail; repeating the name beside it would say it twice.

          The bio is clamped to 3 lines here. Real ones are unbounded — Schmidt
          Hammer Lassen's runs 25 — and the reference assumes a single
          sentence. The full text stays in the DOM for screen readers and for
          SEO; only the visual height is capped. */}
      {(profile.bio || data.styleTags.length > 0) && (
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          {profile.bio && (
            <p className="line-clamp-3 max-w-[54ch] font-body text-[17px] leading-[28px] text-ink">
              {profile.bio}
            </p>
          )}

          {/* Expertise chips are the profile's own most frequent style and
              discipline nodes, not an authored list — there is no expertise
              column. Capped at five so a heavily tagged studio does not push
              the tabs down. */}
          {data.styleTags.length > 0 && (
            <ul className="flex flex-wrap gap-2 lg:justify-end">
              {data.styleTags.slice(0, 5).map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-hairline px-3.5 py-1.5 font-body text-[13px] text-ink"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
          {/* Capped at 8. This panel sits in a row beside About and
              Specialisation, and CSS Grid sizes that row to its tallest item —
              Desai Chia credits 11 people, which stretched the row to roughly
              600px and left the other two panels floating in an empty field.
              The count keeps the full number honest. */}
          <PeopleRow people={data.collaborators.slice(0, 8)} compact />
          {data.collaborators.length > 8 && (
            <p className="mt-3 font-body text-[12px] text-muted">
              +{data.collaborators.length - 8} more
            </p>
          )}
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
  const { profile, data, metrics, isOwner, initialFollowing, contactListing } = props;
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

  /*
   * Rail nav is derived from what actually rendered, and only from anchors
   * that exist in the DOM.
   *
   * The reference lists Projects and Products as separate nav entries. Here
   * they are TABS — one panel is visible at a time — so two anchors pointing
   * at the same block would be two links to one place. A single entry names
   * the block instead: the tab's own label when there is one tab, "Work" when
   * there are two. The detail panels below get the second anchor.
   */
  const hasPanels =
    (isDesigner && (profile.bio || data.brandsUsed.length > 0 || data.collaborators.length > 0)) ||
    (isBrand && (data.seenInProjects.length > 0 || data.specifiedBy.length > 0 || data.documents.length > 0));

  const sections: RailSection[] = [
    ...(tabs.length > 0
      ? [{ id: "profile-work", label: tabs.length === 1 ? tabs[0].label : "Work" }]
      : []),
    ...(hasPanels ? [{ id: "profile-details", label: "Details" }] : []),
  ];

  /* Claimable only while unclaimed. A claimed profile has nothing to claim,
     and the route would be a dead end. */
  const claimHref =
    (profile as { claim_status?: string }).claim_status === "unclaimed" && profile.username
      ? `/u/${encodeURIComponent(profile.username)}/claim`
      : null;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* The canonical public chrome, the same pair /projects, /products and
          both detail pages render. SiteShell and ConditionalFooter now treat
          /u/* as shell-less so the legacy TopNav/Footer do not also mount —
          this page was the last public surface still on them. */}
      <HomeNav variant="solid" />

      {/* ── PAGE GEOMETRY, MEASURED FROM THE REFERENCE ─────────────────────
          Scaling the 1024-wide reference to a 1440 viewport gives: ~31px outer
          gutters, a ~287px rail, a ~30px column gap and a ~1062px main column
          — the composition spans essentially the whole viewport.

          This was max-w-[1400px] with up to 56px of padding inside a wider
          window, which at 1425px measured 194px of dead gutter on each side, a
          199px rail and a 684px main column. Far narrower and more compressed
          than approved.

          A FIXED rail rather than a 12-column fraction: the reference ratio is
          21:79, which no clean grid fraction lands on, and a fixed rail also
          keeps the profile card a constant size as the window grows instead of
          stretching it. */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-[92px] sm:px-6 lg:px-8">
        {/* Two columns, as in the reference: a persistent identity rail and the
            content beside it. Below `lg` the rail falls into document flow
            above the content, which is the order the page is read in — the
            name before the work. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <ProfileRail
              profile={profile}
              metrics={metrics}
              sections={sections}
              isOwner={isOwner}
              initialFollowing={initialFollowing}
              contactListing={contactListing}
              claimHref={claimHref}
            />
          </div>

          <div className="min-w-0">
            <ProfileHeader {...props} />

            <div className="mt-10">
              {hasWork ? (
                <>
                  <section id="profile-work" className="scroll-mt-[100px]">
                    <ProfileTabs tabs={tabs} />
                  </section>
                  {/* `reader` and any future role get the skeleton only — they
                      own no listings, so every role panel would be empty. */}
                  <div id="profile-details" className="scroll-mt-[100px]">
                    {isDesigner && <DesignerPanels profile={profile} data={data} />}
                    {isBrand && <BrandPanels profile={profile} data={data} />}
                  </div>
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
      </div>

      <HomeFooter />
    </div>
  );
}
