import Link from "next/link";

export interface TaxonomyCrumb {
  label: string;
  slug_path: string;
}

export interface TaxonomyMaterialTag {
  label: string;
  slug_path: string;
}

export interface TaxonomyFacetGroup {
  facet_label: string;
  facet_slug: string;
  values: { label: string; slug: string }[];
}

export interface TaxonomyTagsProps {
  listingType: "product" | "project";
  /** Category breadcrumb chain (ancestors + leaf), ordered by depth */
  categoryCrumbs: TaxonomyCrumb[];
  /** Material taxonomy nodes */
  materialNodes: TaxonomyMaterialTag[];
  /** Facet values grouped by facet */
  facetGroups: TaxonomyFacetGroup[];
}

const pillClass =
  "inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-[#002abf]/10 hover:text-[#002abf] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-[#002abf]/20 dark:hover:text-[#5b7cff]";

const labelClass =
  "mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500";

function buildExploreBase(type: "product" | "project"): string {
  return type === "product" ? "/explore/products" : "/explore/projects";
}

export function TaxonomyTags({
  listingType,
  categoryCrumbs,
  materialNodes,
  facetGroups,
}: TaxonomyTagsProps) {
  const base = buildExploreBase(listingType);
  const hasCategory = categoryCrumbs.length > 0;
  const hasMaterials = materialNodes.length > 0;
  const hasFacets = facetGroups.some((g) => g.values.length > 0);
  if (!hasCategory && !hasMaterials && !hasFacets) return null;

  return (
    <div className="space-y-4">
      {/* Category breadcrumb */}
      {hasCategory && (
        <div>
          <p className={labelClass}>Category</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryCrumbs.map((crumb, i) => (
              <span key={crumb.slug_path} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-[10px] text-zinc-300 dark:text-zinc-600" aria-hidden>
                    ›
                  </span>
                )}
                <Link href={`${base}/${crumb.slug_path}`} className={pillClass}>
                  {crumb.label}
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Material taxonomy nodes */}
      {hasMaterials && (
        <div>
          <p className={labelClass}>Materials</p>
          <div className="flex flex-wrap gap-1.5">
            {materialNodes.map((mat) => (
              <Link
                key={mat.slug_path}
                href={`${base}?taxonomy_materials=${encodeURIComponent(mat.slug_path)}`}
                className={pillClass}
              >
                {mat.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Facet groups */}
      {facetGroups.map((group) =>
        group.values.length > 0 ? (
          <div key={group.facet_slug}>
            <p className={labelClass}>{group.facet_label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.values.map((val) => (
                <Link
                  key={val.slug}
                  href={`${base}?${encodeURIComponent(group.facet_slug)}=${encodeURIComponent(val.slug)}`}
                  className={pillClass}
                >
                  {val.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
