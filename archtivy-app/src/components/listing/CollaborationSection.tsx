import {
  PROJECT_COLLAB_LABELS,
  PRODUCT_COLLAB_LABELS,
  PROJECT_LOOKING_FOR_OPTIONS,
  PRODUCT_LOOKING_FOR_OPTIONS,
} from "@/lib/lifecycle";

/**
 * Collaboration panel — who the owner is looking to hear from.
 *
 * ── WHAT THIS NO LONGER DOES ────────────────────────────────────────────────
 * It used to also render the lifecycle status chip. That now lives in the
 * detail header (StatusBadge), where it belongs: status describes the thing
 * and reads next to its title, whereas collaboration is an invitation and
 * earns a block of its own. Keeping both would have printed "Under
 * Construction" twice on the same page.
 *
 * ── RESTYLED OFF ZINC ───────────────────────────────────────────────────────
 * Was zinc-50/zinc-200 with dark: variants, from the palette the detail pages
 * used before the editorial redesign. Those pages are now cream and have no
 * dark counterpart, so the section rendered as a grey slab on a cream ground.
 *
 * ── ROLE SLUGS ARE RESOLVED TO LABELS ───────────────────────────────────────
 * project_looking_for stores slugs ("interior_designer"). The old version
 * printed them raw, so a reader saw "interior_designer" rather than "Interior
 * Designer". Unknown slugs fall back to a de-slugged form rather than being
 * dropped — an unrecognised role is still information.
 */

const OPEN_PROJECT_COLLAB = new Set([
  "open_for_collaboration",
  "seeking_partners",
  "seeking_suppliers",
  "seeking_brands",
]);

const OPEN_PRODUCT_COLLAB = new Set([
  "seeking_manufacturer",
  "open_to_manufacturing_partnership",
  "open_to_licensing",
  "seeking_brand_partner",
]);

function deslug(v: string): string {
  return v
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Panel({
  headline,
  roles,
}: {
  headline: string;
  roles: string[];
}) {
  return (
    <section className="mt-10 rounded-2xl border border-hairline bg-stone/30 p-6 sm:p-8">
      <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
        Collaboration
      </p>
      <p className="mt-2 font-display text-[20px] leading-[1.25] tracking-[-0.01em] text-ink">
        {headline}
      </p>
      {roles.length > 0 && (
        <>
          <p className="mt-5 font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            Looking for
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {roles.map((r) => (
              <li
                key={r}
                className="rounded-full border border-ink/20 px-3.5 py-1.5 font-body text-[13px] text-ink"
              >
                {r}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function resolveRoles(
  slugs: string[] | null | undefined,
  options: readonly { value: string; label: string }[]
): string[] {
  const byValue = new Map(options.map((o) => [o.value, o.label]));
  return (slugs ?? []).filter(Boolean).map((s) => byValue.get(s) ?? deslug(s));
}

export function ProjectCollaborationSection({
  project_collaboration_status,
  project_looking_for,
}: {
  project_status?: string | null;
  project_collaboration_status?: string | null;
  project_looking_for?: string[] | null;
  ownerEmail?: string | null;
}) {
  const status = project_collaboration_status?.trim().toLowerCase() ?? "";
  // Only render when the owner has actually opened the door. A closed or unset
  // status is the default and says nothing worth a panel.
  if (!OPEN_PROJECT_COLLAB.has(status)) return null;

  const headline =
    PROJECT_COLLAB_LABELS[status as keyof typeof PROJECT_COLLAB_LABELS] ?? deslug(status);
  return (
    <Panel headline={headline} roles={resolveRoles(project_looking_for, PROJECT_LOOKING_FOR_OPTIONS)} />
  );
}

export function ProductCollaborationSection({
  product_collaboration_status,
  product_looking_for,
}: {
  product_stage?: string | null;
  product_collaboration_status?: string | null;
  product_looking_for?: string[] | null;
  ownerEmail?: string | null;
}) {
  const status = product_collaboration_status?.trim().toLowerCase() ?? "";
  if (!OPEN_PRODUCT_COLLAB.has(status)) return null;

  const headline =
    PRODUCT_COLLAB_LABELS[status as keyof typeof PRODUCT_COLLAB_LABELS] ?? deslug(status);
  return (
    <Panel headline={headline} roles={resolveRoles(product_looking_for, PRODUCT_LOOKING_FOR_OPTIONS)} />
  );
}
