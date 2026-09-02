import Image from "next/image";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ProfileRail } from "@/components/profile/ProfileRail";
import {
  ProfileViewProvider,
  ProfileView,
  ProfileStatement,
  type ProfileViewItem,
} from "@/components/profile/ProfileViews";
import {
  Section,
  InfoRows,
  ListingGrid,
  PeopleRow,
  TagRow,
  ProfileFileList,
  CompactListingList,
  ProfileEmptyState,
} from "@/components/profile/ProfileModules";
import type { ProfileMetrics } from "@/lib/db/profileMetrics";
import type { ProfilePageData } from "@/lib/db/profilePage";
import { ProfileEditProvider } from "@/components/profile/edit/ProfileEditContext";
import { EditableText } from "@/components/profile/edit/EditableText";
import { ProfileIntro } from "@/components/profile/edit/ProfileIntro";
import { ProfileCoverImage } from "@/components/profile/edit/ProfileCoverImage";
import type { Profile } from "@/lib/types/profiles";

/**
 * The public profile page — ONE component, two content models.
 *
 * ── THE PAGE IS NOW A NAVIGATOR, NOT A SCROLL ───────────────────────────────
 * It used to be a hero, a tab row that switched Projects/Products, and then a
 * long row of bottom panels — About, Specialisation, Collaborators, and the
 * role-specific relationship cards — that every visitor paid the height for
 * whether they wanted them or not. The rail's "Details" item was an anchor
 * that scrolled you down to them.
 *
 * Those panels are gone. Their CONTENT is not: it is redistributed into rail
 * views, one visible at a time, and only the active view is in the DOM. So
 * About and Collaborators are destinations you navigate to, the page is a
 * fraction of its previous height, and nothing renders twice.
 *
 * Specialisation was absorbed into About rather than kept as its own view. It
 * is a list of style tags derived from the profile's own projects — a fact
 * about them, which is what About is for — and on its own it was a card
 * holding one row of chips.
 *
 * ── WHAT'S SHOWN IS STILL DERIVED FROM WHAT EXISTS ──────────────────────────
 * Every view is omitted when its data is empty, so no profile ever gets a nav
 * item leading to an empty state. Files appears for 13 profiles of 199; the
 * other 186 have no Files item at all rather than an empty one.
 *
 * ── DEFERRED, BY DECISION ───────────────────────────────────────────────────
 * Articles, Collections, Awards, certifications and regional availability have
 * no table at all — every one answers PGRST205. They are absent rather than
 * stubbed, so adding the tables later is purely additive. The Promote/Featured
 * CTA is the same: a marked slot, not a fake button.
 */

export interface ProfilePageViewProps {
  profile: Profile;
  data: ProfilePageData;
  /** Listings / Connections. See lib/db/profileMetrics. */
  metrics: ProfileMetrics;
  isOwner: boolean;
  /** Viewer's follow state, resolved server-side. */
  initialFollowing: boolean;
  /** Listing used to seed the contact dialog, when one exists. */
  contactListing: { id: string; type: "project" | "product"; title: string } | null;
  /**
   * A signed-in non-owner already has a pending claim on this profile.
   * Resolved from profile_claim_requests, not from profiles.claim_status —
   * see the note in loadProfilePage.ts for why that column cannot say it.
   */
  viewerHasPendingClaim?: boolean;
}

/* ── Identity ────────────────────────────────────────────────────────────── */

/** "https://www.molteni.it/en/" -> "molteni.it/en" — the raw URL overflows. */
function prettyUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || null;
}

function ProfileCover({
  profile,
  data,
  isOwner,
}: {
  profile: Profile;
  data: ProfilePageData;
  isOwner: boolean;
}) {
  return (
    <header>
      {/* Cover. `profiles.cover_image_url` if the owner set one, otherwise the
          profile's own first published cover image, otherwise a flat stone band
          rather than a broken frame. See ProfileCoverImage.

          ── COVER GEOMETRY, MEASURED FROM THE REFERENCE ────────────────────
          The reference cover spans the full main column at roughly 4.3 : 1 —
          755 x 176 in a 1024-wide render. An aspect ratio rather than a fixed
          height keeps that proportion at every width. */}
      <ProfileCoverImage
        profileId={profile.id}
        savedCover={profile.cover_image_url}
        derivedCover={data.coverImage}
        isOwner={isOwner}
      />

      {/*
       * The statement, and nothing beside it.
       *
       * ── THE EXPERTISE CHIPS ARE GONE FROM HERE ────────────────────────────
       * A row of Japanese / Contemporary / Residential pills sat to the right
       * of the bio. They were never an authored field — there is no expertise
       * column — only the profile's most frequent style nodes, and as a
       * right-aligned second column they competed with the one sentence that
       * actually introduces the studio. The tags still exist, in About, where
       * "Specialisation" says what they are. Nothing replaces them here: the
       * band under the cover is the statement alone, with room around it.
       *
       * The bio is clamped to 3 lines. Real ones are unbounded — Schmidt
       * Hammer Lassen's runs 25 — and the reference assumes a single sentence.
       * The full text stays in the DOM for screen readers and for SEO; only
       * the visual height is capped, and About shows it unclamped.
       */}
      {/* In edit mode the statement renders even when bio is empty, so a
          profile with no introduction still has somewhere to write one.
          Publicly it is unchanged: no bio, no band. */}
      <ProfileIntro shortBio={profile.short_bio} bio={profile.bio} isOwner={isOwner} />

      {/* SLOT: Promote / Featured CTA. Blocked on Stripe — intentionally not
          rendered rather than shown as a button that cannot complete. */}
    </header>
  );
}

/* ── Views ───────────────────────────────────────────────────────────────── */

/**
 * About — everything factual the schema actually holds.
 *
 * Absorbs the old About and Specialisation panels. The rail already shows the
 * name, role and city, so this repeats the location only as "Based in", where
 * it sits beside "Builds in" and means something different. No field is
 * invented: each row is dropped when its column is null.
 */
function AboutView({
  profile,
  data,
  isOwner,
}: {
  profile: Profile;
  data: ProfilePageData;
  isOwner: boolean;
}) {
  const basedIn = [profile.location_city, profile.location_country].filter(Boolean).join(", ");
  const website = prettyUrl(profile.website);

  const rows =
    profile.role === "brand"
      ? [
          { label: "Type", value: profile.brand_type ?? null },
          { label: "Based in", value: basedIn || null },
          { label: "Website", value: website },
        ]
      : [
          { label: "Discipline", value: profile.designer_discipline ?? null },
          { label: "Based in", value: basedIn || null },
          { label: "Builds in", value: data.locations.length > 0 ? data.locations.join(", ") : null },
          { label: "Website", value: website },
        ];

  return (
    <div className="max-w-[72ch]">
      {(profile.bio || isOwner) && (
        <Section title="Profile">
          <EditableText
            field="bio"
            multiline
            rows={10}
            inputClassName="whitespace-pre-line font-body text-[15px] leading-[26px] text-ink"
            placeholder="What your studio does, and what it is known for."
          >
            <p className="whitespace-pre-line font-body text-[15px] leading-[26px] text-ink">
              {profile.bio}
            </p>
          </EditableText>
        </Section>
      )}
      <Section title="Details">
        <InfoRows rows={rows} />
      </Section>
      {data.styleTags.length > 0 && (
        <Section title="Specialisation">
          <TagRow tags={data.styleTags} />
        </Section>
      )}
    </div>
  );
}

/**
 * Collaborators — the people, with the real relationship preserved.
 *
 * Every name here comes from listing_team_members with a non-null profile_id,
 * resolved against a live, non-hidden profile, so each one is a real entity and
 * PeopleRow links it: /u/{username} when they have one, /u/id/{uuid} when they
 * do not. Both routes exist and render this same page. That distinction is not
 * academic — all 11 of Desai Chia's collaborators have username NULL, so the id
 * route is the one that carries this view.
 *
 * Nothing is capped any more. The cap existed because this was a panel in a
 * grid row whose height was set by its tallest member; as a full view, a long
 * list is just a long list.
 */
function CollaboratorsView({ data }: { data: ProfilePageData }) {
  return (
    <div>
      {data.collaborators.length > 0 && (
        <Section title="Collaborators" count={data.collaborators.length}>
          <PeopleRow people={data.collaborators} />
        </Section>
      )}
      {data.brandsUsed.length > 0 && (
        <Section title="Brands they've used" count={data.brandsUsed.length}>
          <PeopleRow people={data.brandsUsed} />
        </Section>
      )}
      {data.specifiedBy.length > 0 && (
        <Section title="Specified by" count={data.specifiedBy.length}>
          <PeopleRow people={data.specifiedBy} />
        </Section>
      )}
      {data.seenInProjects.length > 0 && (
        <Section title="Seen in projects" count={data.seenInProjects.length}>
          <div className="max-w-[52ch]">
            <CompactListingList items={data.seenInProjects} />
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export function ProfilePageView(props: ProfilePageViewProps) {
  const {
    profile,
    data,
    metrics,
    isOwner,
    initialFollowing,
    contactListing,
    viewerHasPendingClaim = false,
  } = props;
  const displayName = profile.display_name ?? profile.username ?? "Profile";
  const isBrand = profile.role === "brand";
  const hasWork = data.projects.length > 0 || data.products.length > 0;

  const hasAbout = Boolean(
    profile.bio ||
      profile.website ||
      profile.location_city ||
      profile.location_country ||
      (isBrand ? profile.brand_type : profile.designer_discipline) ||
      data.locations.length > 0 ||
      data.styleTags.length > 0
  );

  /*
   * The relationship view. Named for whichever relation the profile actually
   * has, rather than forced to one label: a designer's is people they have
   * worked with, a brand's is the studios who specify them. Both are "who this
   * profile works with", and both are real rows, so one view holds them.
   */
  const relationSections = [
    { label: "Collaborators", count: data.collaborators.length },
    { label: "Brands used", count: data.brandsUsed.length },
    { label: "Specified by", count: data.specifiedBy.length },
    { label: "Seen in projects", count: data.seenInProjects.length },
  ].filter((r) => r.count > 0);

  /*
   * The nav item's number has to mean the same thing as its word.
   *
   * A first cut summed every section in this view and labelled the sum with
   * the first relation present, so Molteni's rail read "Specified by 4" over a
   * view containing one specifier and three projects — a number that was true
   * of nothing on the page. When the view holds one relation the label and the
   * count are that relation's; when it holds several there is no single honest
   * number, so it carries a name and no count, and the counts live on the
   * section headings inside where they are unambiguous.
   *
   * Collaborators wins the naming when present because it is the relation the
   * profile is actually about; otherwise the largest section names the view.
   */
  const primaryRelation =
    relationSections.find((r) => r.label === "Collaborators") ??
    [...relationSections].sort((a, b) => b.count - a.count)[0];

  /*
   * Every view that has content, in reading order: the work first, then who
   * made it possible, then the facts, then the files. A view with nothing in
   * it is never listed — the rail can only offer real destinations.
   */
  const views: ProfileViewItem[] = [
    ...(data.projects.length > 0
      ? [{ key: "projects", label: "Projects", count: data.projects.length }]
      : []),
    ...(data.products.length > 0
      ? [{ key: "products", label: "Products", count: data.products.length }]
      : []),
    ...(primaryRelation
      ? [
          {
            key: "people",
            label: primaryRelation.label,
            ...(relationSections.length === 1 ? { count: primaryRelation.count } : {}),
          },
        ]
      : []),
    ...(hasAbout ? [{ key: "about", label: "About" }] : []),
    ...(data.documents.length > 0
      ? [{ key: "files", label: "Files", count: data.documents.length }]
      : []),
  ];

  /*
   * ── THE CLAIM BLOCK ───────────────────────────────────────────────────────
   * Offered only while the profile is unclaimed or has a claim under review,
   * and never to the owner. A claimed profile has nothing to claim.
   *
   * `pending` is new here: it used to fall through to null, so the block
   * vanished the moment anyone submitted a claim — including for the person
   * who had just submitted it. It now renders as an inert "Claim pending"
   * rather than disappearing.
   *
   * The href is only a SIGN-IN return path. Claiming happens in a dialog on
   * this page now; ?claim=1 reopens it after the round trip.
   */
  const rawClaimStatus = (profile as { claim_status?: string }).claim_status;
  const claimState: "unclaimed" | "pending" | null =
    rawClaimStatus === "claimed"
      ? null
      : viewerHasPendingClaim
        ? "pending"
        : rawClaimStatus === "unclaimed"
          ? "unclaimed"
          : null;
  const claimProfilePath = profile.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : `/u/id/${profile.id}`;
  const claim =
    claimState && !isOwner
      ? {
          profileId: profile.id,
          profileName: (profile.display_name ?? profile.username ?? "this profile").trim(),
          profileKind: [
            profile.role === "brand" ? "Brand profile" : "Designer profile",
            [
              (profile as { location_city?: string | null }).location_city?.trim(),
              (profile as { location_country?: string | null }).location_country?.trim(),
            ]
              .filter(Boolean)
              .join(", "),
          ]
            .filter(Boolean)
            .join(" · "),
          state: claimState,
          signedOutHref: `${claimProfilePath}?claim=1`,
        }
      : null;

  const page = (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* The canonical public chrome, the same pair /projects, /products and
          both detail pages render. SiteShell and ConditionalFooter treat /u/*
          as shell-less so the legacy TopNav/Footer do not also mount. */}
      <HomeNav variant="solid" />

      {/* ── PAGE GEOMETRY, MEASURED FROM THE REFERENCE ─────────────────────
          Scaling the 1024-wide reference to a 1440 viewport gives: ~31px outer
          gutters, a ~287px rail, a ~30px column gap and a ~1062px main column
          — the composition spans essentially the whole viewport.

          A FIXED rail rather than a 12-column fraction: the reference ratio is
          21:79, which no clean grid fraction lands on, and a fixed rail also
          keeps the profile card a constant size as the window grows instead of
          stretching it. */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-[92px] sm:px-6 lg:px-8">
        <ProfileViewProvider views={views}>
          {/* Two columns, as in the reference: a persistent identity rail and
              the content beside it. Below `lg` the rail falls into document
              flow above the content, which is the order the page is read in —
              the name before the work. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-8">
            <div className="min-w-0">
              <ProfileRail
                profile={profile}
                metrics={metrics}
                views={views}
                isOwner={isOwner}
                initialFollowing={initialFollowing}
                contactListing={contactListing}
                claim={claim}
              />
            </div>

            <div className="min-w-0">
              <ProfileCover profile={profile} data={data} isOwner={isOwner} />

              <div className="mt-10">
                {/* The empty state is not a VIEW — it is a statement about the
                    profile, so it sits above whatever views exist rather than
                    being one of them. A studio with a bio but nothing
                    published still gets its About; it just is not left to
                    infer from a missing tab that there is no work. */}
                {!hasWork && (
                  <div className={views.length > 0 ? "mb-12" : undefined}>
                    <ProfileEmptyState
                      isOwner={isOwner}
                      displayName={displayName}
                      role={profile.role}
                    />
                  </div>
                )}
                {views.length > 0 && (
                  <>
                    <ProfileView viewKey="projects">
                      <ListingGrid items={data.projects} />
                    </ProfileView>
                    <ProfileView viewKey="products">
                      <ListingGrid items={data.products} />
                    </ProfileView>
                    <ProfileView viewKey="people">
                      <CollaboratorsView data={data} />
                    </ProfileView>
                    <ProfileView viewKey="about">
                      <AboutView profile={profile} data={data} isOwner={isOwner} />
                    </ProfileView>
                    <ProfileView viewKey="files">
                      <ProfileFileList documents={data.documents} />
                    </ProfileView>
                  </>
                )}
              </div>
            </div>
          </div>
        </ProfileViewProvider>
      </div>

      <HomeFooter />
    </div>
  );

  /* The provider is mounted ONLY for the owner. That is what keeps edit-mode
     markup — pencils, camera chip, Edit links, Save/Cancel — out of a public
     visitor's HTML entirely rather than hidden with CSS: with no context,
     every editable component returns its published children untouched. */
  return isOwner ? <ProfileEditProvider profile={profile}>{page}</ProfileEditProvider> : page;
}
