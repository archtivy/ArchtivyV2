import Link from "next/link";
import { ExternalLink, MapPin, Ruler, Tag, Calendar, Layers, Camera, Globe, CircleDot } from "lucide-react";
import type { ProjectDetail } from "@/lib/db/projectDetail";
import { getArchiveCategoryUrl } from "@/lib/archive/urls";
import { normaliseExternalUrl } from "@/lib/url/externalUrl";
import { SidebarCard } from "@/components/projects/SidebarCard";

/**
 * Project Details — a navigation surface, not a specification table.
 *
 * ── WHY EVERY LINK HERE IS REAL ─────────────────────────────────────────────
 * Each destination below was checked against the routing that actually exists
 * before it was written, and a value with no destination stays plain text
 * rather than being dressed as a link:
 *
 *   Type        -> /projects/{taxonomy slug_path}   archive route, real
 *   Location    -> /projects?city= / ?country=      the directory's own
 *                  filters, on location_city / location_country
 *   Completed   -> /projects?year_min=&year_max=    the same year both ends
 *   Status      -> /projects?project_status=        listings.project_status
 *   Materials   -> /projects?materials={slug}       ONE LINK PER MATERIAL,
 *                  matched on slug, which is why the directory facet is keyed
 *                  on slugs rather than display names
 *   Photographer-> /u/{username} or /u/id/{id}      the credit is a team
 *                  member row, so it carries a real profile
 *   Website     -> the project's own site, through normaliseExternalUrl
 *
 * NOT LINKED, because nothing resolves them:
 *   Size        listings.area_sqft has no single-value filter route. The
 *               explore layer has `area_bucket`, but mapping one project's
 *               footage into a bucket is an inference about what the visitor
 *               wanted, not a fact about this project. Plain text.
 *   Style       there is no `style` param in the explore filter schema
 *               (checked: q, category, city, country, designers, brands, year,
 *               materials, material_type, area_bucket, color, sort,
 *               taxonomy_materials, project_status, product_stage,
 *               collaboration). A style archive would be a 404. Plain text.
 *
 * ── THE ROW STAYS A ROW ─────────────────────────────────────────────────────
 * Links are underlined on hover and inherit the row's type; they are not
 * buttons, chips or a coloured palette. A sidebar of fourteen tappable
 * controls would read as a toolbar. Everything is a real <Link> or <a>, so
 * middle-click, cmd-click, "open in new tab" and crawlers all behave.
 */

const NUMBER = new Intl.NumberFormat("en-US");

/** Presentational names for listings.project_status, which stores snake_case. */
const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  under_construction: "Under construction",
  in_progress: "In progress",
  concept: "Concept",
  on_hold: "On hold",
  unbuilt: "Unbuilt",
};

function statusLabel(raw: string): string {
  return STATUS_LABELS[raw] ?? raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function ProjectDetailsPanel({ detail }: { detail: ProjectDetail }) {
  const site = normaliseExternalUrl(detail.website);

  const rows: {
    label: string;
    icon: typeof MapPin;
    /** Rendered when the value is a single thing, linked or not. */
    value?: React.ReactNode;
  }[] = [];

  if (detail.buildingTypeLabel) {
    const href = detail.buildingTypeSlugPath
      ? getArchiveCategoryUrl("project", detail.buildingTypeSlugPath)
      : null;
    rows.push({
      label: "Type",
      icon: Tag,
      value: href ? <RowLink href={href}>{detail.buildingTypeLabel}</RowLink> : detail.buildingTypeLabel,
    });
  }

  // City and country are linked INDEPENDENTLY: they are two different filters,
  // and 46 of 53 projects have a country but no city, so one combined link
  // would be dead on most of them.
  if (detail.locationCity || detail.locationCountry || detail.location) {
    rows.push({
      label: "Location",
      icon: MapPin,
      value:
        detail.locationCity || detail.locationCountry ? (
          <>
            {detail.locationCity && (
              <RowLink href={`/projects?city=${encodeURIComponent(detail.locationCity)}`}>
                {detail.locationCity}
              </RowLink>
            )}
            {detail.locationCity && detail.locationCountry && <span className="text-muted">, </span>}
            {detail.locationCountry && (
              <RowLink href={`/projects?country=${encodeURIComponent(detail.locationCountry)}`}>
                {detail.locationCountry}
              </RowLink>
            )}
          </>
        ) : (
          detail.location
        ),
    });
  }

  if (detail.year) {
    rows.push({
      label: "Completed",
      icon: Calendar,
      value: <RowLink href={`/projects?year_min=${detail.year}&year_max=${detail.year}`}>{String(detail.year)}</RowLink>,
    });
  }

  // ft², matching the Projects Index decision: area_sqm is 0/50 populated, and
  // values <= 100 are placeholder junk rather than very small buildings.
  if (detail.areaSqft && detail.areaSqft > 100) {
    rows.push({
      label: "Size",
      icon: Ruler,
      value: `${NUMBER.format(detail.areaSqft)} sq ft`,
    });
  }

  if (detail.projectStatus) {
    rows.push({
      label: "Status",
      icon: CircleDot,
      value: (
        <RowLink href={`/projects?project_status=${encodeURIComponent(detail.projectStatus)}`}>
          {statusLabel(detail.projectStatus)}
        </RowLink>
      ),
    });
  }

  if (detail.styleLabel) {
    // No style filter exists — see the header note. Plain text on purpose.
    rows.push({ label: "Style", icon: Layers, value: detail.styleLabel });
  }

  if (detail.materials.length > 0) {
    rows.push({
      label: "Materials",
      icon: Layers,
      value: (
        <span className="inline">
          {detail.materials.map((m, i) => (
            <span key={m.slug ?? m.name}>
              {i > 0 && <span className="text-muted">, </span>}
              {m.slug ? (
                <RowLink href={`/projects?materials=${encodeURIComponent(m.slug)}`}>
                  {m.name}
                </RowLink>
              ) : (
                m.name
              )}
            </span>
          ))}
        </span>
      ),
    });
  }

  if (detail.photographer) {
    rows.push({
      label: "Photographer",
      icon: Camera,
      value: detail.photographerHref ? (
        <RowLink href={detail.photographerHref}>{detail.photographer}</RowLink>
      ) : (
        detail.photographer
      ),
    });
  }

  if (site) {
    rows.push({
      label: "Website",
      icon: Globe,
      value: (
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          <ExternalLink strokeWidth={1.5} className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        </a>
      ),
    });
  }

  if (rows.length === 0) return null;

  return (
    <SidebarCard title="Project Details">
      <dl className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-3">
            <dt className="flex w-[104px] shrink-0 items-center gap-2 font-body text-[13px] text-muted">
              <r.icon strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {r.label}
            </dt>
            <dd className="min-w-0 font-body text-[13px] text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </SidebarCard>
  );
}

/**
 * The one link treatment in this panel. Underline on hover only — a sidebar
 * where every real value is permanently underlined reads as a link farm, and
 * the whole point of the panel is that it still looks like a specification.
 */
function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="underline-offset-4 transition-colors hover:text-ink hover:underline">
      {children}
    </Link>
  );
}
