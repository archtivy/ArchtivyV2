"use client";

import type { ProjectCanonical } from "@/lib/canonical-models";
import { getListingUrl } from "@/lib/canonical";
import { getOwnerProfileHref } from "@/lib/cardUtils";
import { getCityLabel } from "@/lib/cardUtils";
import { ProjectListingCard } from "./ProjectListingCard";

export interface ProjectCardPremiumProps {
  project: ProjectCanonical;
}

const SQM_TO_SQFT = 10.7639;

export function ProjectCardPremium({ project }: ProjectCardPremiumProps) {
  const href = getListingUrl({ id: project.id, type: "project", slug: project.slug });
  const studioHref = project.owner ? getOwnerProfileHref(project.owner) : null;

  // Location: city + country when both present, else one, else location_text
  const city = getCityLabel(project);
  const country = project.location?.country?.trim() ?? null;
  const location = city && country ? `${city}, ${country}` : city || country || project.location_text?.trim() || null;
  const locationHref = city
    ? `/explore/projects?city=${encodeURIComponent(city)}`
    : null;

  const yearHref = project.year ? `/explore/projects?year=${project.year}` : null;

  // Resolve area in sqft
  const areaSqft =
    project.area_sqft != null
      ? project.area_sqft
      : project.area_sqm != null
      ? Math.round(project.area_sqm * SQM_TO_SQFT)
      : null;

  const teamAvatars = (project.team_members ?? []).map((m) => ({ name: m.name ?? "?" }));

  return (
    <ProjectListingCard
      image={project.cover}
      imageAlt={project.title}
      title={project.title}
      href={href}
      studioName={project.owner?.displayName ?? null}
      studioHref={studioHref}
      location={location}
      locationHref={locationHref}
      year={project.year}
      yearHref={yearHref}
      areaSqft={areaSqft}
      connectionCount={project.connectionCount ?? 0}
      teamAvatars={teamAvatars}
      entityId={project.id}
      entityTitle={project.title}
    />
  );
}
