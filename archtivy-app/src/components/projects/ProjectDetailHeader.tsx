import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { ProjectStatusBadge, CollaborationBadge } from "@/components/listing/StatusBadge";

/**
 * Project identity: category line, title, and a restrained meta line.
 *
 * ── WHAT LEFT, AND WHY ──────────────────────────────────────────────────────
 * Share / Save / More moved to the breadcrumb line as ProjectHeaderActions.
 * Three bordered, labelled controls directly under the title carried more
 * weight than the project name, which is the one thing this block exists to
 * establish. Their logic moved with them, unchanged.
 *
 * The meta line is Location and Year only. It used to also carry the studio
 * and the building type, four items of equal weight competing for the same
 * glance — and both of those are already stated elsewhere on the page: the
 * studio in the sidebar card and the Project Details panel, the building type
 * directly above as the category line and again in the breadcrumb. Neither is
 * lost, and neither needed a third and fourth appearance.
 *
 * Location keeps its city/country links: the brief to quieten the header is
 * not a reason to remove routing from values that resolve.
 *
 * No longer a client component. Everything interactive left with the actions.
 */
export function ProjectDetailHeader({
  title,
  locationCity,
  locationCountry,
  locationFallback,
  year,
  buildingType,
  buildingTypeHref,
  projectStatus,
  collaborationStatus,
}: {
  title: string;
  locationCity: string | null;
  locationCountry: string | null;
  /** listings.location — free text, shown only when nothing structured exists. */
  locationFallback: string | null;
  year: number | null;
  buildingType: string | null;
  buildingTypeHref?: string | null;
  projectStatus?: string | null;
  collaborationStatus?: string | null;
}) {
  const hasStructuredLocation = Boolean(locationCity || locationCountry);

  return (
    <header>
      {buildingType && (
        <p className="font-body text-[12px] uppercase tracking-[0.1em] text-muted">
          {buildingTypeHref ? (
            <Link href={buildingTypeHref} className="hover:text-ink">
              {buildingType}
            </Link>
          ) : (
            buildingType
          )}
        </p>
      )}

      <h1 className="mt-2 font-display text-[36px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[46px]">
        {title}
      </h1>

      <div className="mt-3 flex flex-wrap gap-2 empty:mt-0">
        <ProjectStatusBadge status={projectStatus} />
        <CollaborationBadge status={collaborationStatus} kind="project" />
      </div>

      {(hasStructuredLocation || locationFallback || year) && (
        <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {(hasStructuredLocation || locationFallback) && (
            <li className="flex items-center gap-1.5 font-body text-[13px] text-muted">
              <MapPin strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {hasStructuredLocation ? (
                <span>
                  {locationCity && (
                    <Link
                      href={`/explore/projects?city=${encodeURIComponent(locationCity)}`}
                      className="underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      {locationCity}
                    </Link>
                  )}
                  {locationCity && locationCountry && ", "}
                  {locationCountry && (
                    <Link
                      href={`/explore/projects?country=${encodeURIComponent(locationCountry)}`}
                      className="underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      {locationCountry}
                    </Link>
                  )}
                </span>
              ) : (
                locationFallback
              )}
            </li>
          )}
          {year && (
            <li className="flex items-center gap-1.5 font-body text-[13px] text-muted">
              <Calendar strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <Link
                href={`/explore/projects?year=${year}`}
                className="underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                {year}
              </Link>
            </li>
          )}
        </ul>
      )}
    </header>
  );
}
