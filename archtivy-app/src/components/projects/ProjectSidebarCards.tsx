import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { SidebarCard } from "@/components/projects/SidebarCard";
import { ShareProjectLinks } from "@/components/projects/ShareProjectLinks";

/**
 * Location — an extension of Project Details, not decoration.
 *
 * ── NO MAP ──────────────────────────────────────────────────────────────────
 * The reference shows a map tile. There is no map provider wired anywhere in
 * this application, and rendering one means an external tile host, which the
 * page's own image and connection policy does not allow for. listings does
 * carry location_lat / location_lng, so a map is buildable later; drawing a
 * generic street graphic in the meantime would be a picture of nowhere
 * presented as this project's surroundings. The card carries the real thing
 * instead: the place, and the way into projects near it.
 *
 * ── HIERARCHY, NOT A HARDCODED CITY ─────────────────────────────────────────
 * City and country are separate filters in the explore layer, so the deepest
 * available level drives the action: "See more in Los Angeles" where a city
 * exists, "See more in Italy" where only a country does. 46 of 53 projects
 * currently have a country but no city, which is exactly why this is derived
 * rather than assumed.
 */
export function ProjectLocationCard({
  city,
  country,
  fallback,
}: {
  city: string | null;
  country: string | null;
  /** listings.location — free text, used only when nothing structured exists. */
  fallback: string | null;
}) {
  const label = [city, country].filter(Boolean).join(", ") || fallback;
  if (!label) return null;

  const deepest = city ?? country;
  const href = city
    ? `/projects?city=${encodeURIComponent(city)}`
    : country
      ? `/projects?country=${encodeURIComponent(country)}`
      : null;

  return (
    <SidebarCard title="Location">
      <p className="flex items-start gap-2 font-body text-[14px] text-ink">
        <MapPin strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        {label}
      </p>
      {href && deepest && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          See more in {deepest}
          <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </SidebarCard>
  );
}

/**
 * Claim this Project.
 *
 * The claim workflow in this codebase is PROFILE-level: profiles carry
 * claim_status and there is a /u/{username}/claim route. There is no
 * listing-level claim table, so this points at the studio's profile claim
 * rather than inventing a project-claim flow, and the card disappears once
 * that profile is claimed — which is the only honest reading of "claim this
 * project" given the model that exists.
 */
export function ClaimProjectCard({
  href,
  studio,
}: {
  href: string | null;
  studio: string | null;
}) {
  if (!href) return null;

  return (
    <SidebarCard title="Claim this Project">
      <p className="font-body text-[13px] leading-[20px] text-muted">
        {studio
          ? `Are you part of ${studio}? Claim the profile to update this project's details and connect with the community.`
          : "Are you part of this project? Claim the profile to update its details and connect with the community."}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-2.5 font-body text-[13px] text-cream transition-opacity hover:opacity-90"
      >
        Claim Project
      </Link>
    </SidebarCard>
  );
}

export function ShareProjectCard({ title }: { title: string }) {
  return (
    <SidebarCard title="Share Project">
      <ShareProjectLinks title={title} />
    </SidebarCard>
  );
}
