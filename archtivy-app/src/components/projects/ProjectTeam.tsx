import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { HorizontalRail } from "@/components/entity/HorizontalRail";
import type { DetailTeamMember } from "@/lib/db/projectDetail";

/**
 * The Team — the project's real credits from listing_team_members.
 *
 * ── WHY THIS IS NOT A CANONICAL CARD ────────────────────────────────────────
 * There is no shared person/studio card in this codebase to reuse. The
 * profile-facing components that exist — the designers and brands directory
 * cards — are built for a ProfileDirectoryRow with follower counts, listing
 * counts and a bio, none of which a credit row carries: a credit is a name, a
 * role, and often a stub profile with no avatar. ListingCardShared is for
 * listings, not people. So this is a small local presentation of the credit
 * itself, lifted out of the retired tabs unchanged rather than redrawn.
 *
 * ── A RAIL, NOT A WRAPPING GRID ─────────────────────────────────────────────
 * The four-across grid this replaces laid six credits out as a row of four and
 * a row of two, leaving half a row of empty space beside the last two cards —
 * and the ragged half grows with the count. Widening the cards to fill it
 * would make a credit look like a feature; stretching the final row would make
 * two cards twice the size of the other four.
 *
 * A rail has no second row to leave ragged. Six, ten or fifteen credits are
 * one row that scrolls further, roughly four or five visible at desktop width,
 * and the arrows only appear when there is something past the edge. The
 * HorizontalRail primitive carries the scrolling; this file still owns how a
 * credit looks.
 *
 * ── THE WHOLE CARD IS THE LINK, WHEN THERE IS ONE ───────────────────────────
 * The retired tab put a separate "View" link at the right of each row. Here
 * the card itself is the link whenever the credit resolves to a profile, which
 * is a larger target and one destination per card instead of two. Credits with
 * no profile render as plain cards rather than pointing at a 404 — most are
 * auto-created stubs, so this is the common case, not an edge one.
 */
export function ProjectTeam({
  team,
  viewAllHref,
  headingId = "project-team-heading",
}: {
  team: DetailTeamMember[];
  /** Where "View all N team members" goes. Omitted when there is no such page. */
  viewAllHref?: string | null;
  headingId?: string;
}) {
  if (team.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby={headingId}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id={headingId} className="font-display text-[24px] tracking-tight text-ink">
          The Team
          <span className="ml-2.5 font-body text-[16px] text-muted">{team.length}</span>
        </h2>

        {/* Only offered when there is something the rail does not already
            show. "View all 4 team members" beside four visible cards is a
            link to what you are looking at. */}
        {viewAllHref && team.length > 4 && (
          <Link
            href={viewAllHref}
            className="inline-flex shrink-0 items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            View all {team.length} team members
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>

      <HorizontalRail ariaLabel="Project team">
        {team.map((t) => {
          const href = t.profileUsername
            ? `/u/${t.profileUsername}`
            : t.profileId
              ? `/u/id/${t.profileId}`
              : null;

          const body = (
            <>
              <span className="relative mx-auto block h-14 w-14 overflow-hidden rounded-full bg-stone">
                {t.avatarUrl ? (
                  <Image src={t.avatarUrl} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  /* Stub credits have no avatar. Initials beat an empty circle
                     and beat a generic silhouette, which reads as a missing
                     image rather than as a person with no photo yet. */
                  <span className="flex h-full w-full items-center justify-center font-display text-[16px] text-muted">
                    {t.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="mt-3 block truncate text-center font-body text-[14px] text-ink">
                {t.name}
              </span>
              {t.role && (
                <span className="mt-0.5 block truncate text-center font-body text-[12px] text-muted">
                  {t.role}
                </span>
              )}
            </>
          );

          return (
            <li
              key={t.id}
              className="w-[160px] shrink-0 snap-start sm:w-[184px]"
            >
              {href ? (
                <Link
                  href={href}
                  className="group block rounded-xl border border-hairline bg-cream p-5 transition-colors hover:border-ink/25"
                >
                  {body}
                  <span className="mt-3 flex justify-center">
                    <ExternalLink
                      strokeWidth={1.5}
                      className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-ink"
                      aria-hidden
                    />
                  </span>
                </Link>
              ) : (
                <div className="rounded-xl border border-hairline bg-cream p-5">{body}</div>
              )}
            </li>
          );
        })}
      </HorizontalRail>
    </section>
  );
}
