"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExploreFilters } from "@/lib/explore/filters/schema";
import { FollowFilterAction } from "@/components/follow/FollowFilterAction";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";
import { buildExploreUrl, countActiveFilters } from "@/lib/explore/filters/query";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

interface FilterSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

interface CheckboxOption {
  value: string;
  label: string;
}

export interface ProductFilterSidebarProps {
  currentFilters: ExploreFilters;
  options: ExploreFilterOptions;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Collapsible Section
   ═══════════════════════════════════════════════════════════════════════════ */

function FilterSection({ title, defaultOpen = false, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="text-[13px] font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Checkbox list with optional search
   ═══════════════════════════════════════════════════════════════════════════ */

function CheckboxList({
  items,
  selected,
  onToggle,
  searchable = false,
  maxVisible = 8,
}: {
  items: CheckboxOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  searchable?: boolean;
  maxVisible?: number;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = searchable && search
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;
  const visible = showAll ? filtered : filtered.slice(0, maxVisible);
  const hasMore = filtered.length > maxVisible;

  return (
    <div>
      {searchable && items.length > maxVisible && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="mb-2 w-full rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          style={{ borderRadius: 4 }}
        />
      )}
      <div className="space-y-1">
        {visible.map((item) => (
          <label
            key={item.value}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <input
              type="checkbox"
              checked={selected.has(item.value)}
              onChange={() => onToggle(item.value)}
              className="h-3.5 w-3.5 rounded border-zinc-300 text-[#002abf] focus:ring-[#002abf]/20 dark:border-zinc-600"
              style={{ borderRadius: 3 }}
            />
            <span className="truncate text-zinc-700 dark:text-zinc-300">{item.label}</span>
          </label>
        ))}
      </div>
      {hasMore && !showAll && !search && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1.5 text-[11px] font-medium text-[#002abf] hover:underline"
        >
          Show all ({filtered.length})
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Taxonomy tree (recursive)
   ═══════════════════════════════════════════════════════════════════════════ */

interface TaxonomyTreeNode {
  id: string;
  slug_path: string;
  label: string;
  children?: TaxonomyTreeNode[];
}

function TaxonomyTree({
  nodes,
  selected,
  onSelect,
  depth = 0,
}: {
  nodes: TaxonomyTreeNode[];
  selected: string | null;
  onSelect: (slugPath: string | null) => void;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-3 border-l border-zinc-100 pl-2 dark:border-zinc-800" : ""}>
      {nodes.map((node) => {
        const isActive = selected === node.slug_path;
        const hasChildren = node.children && node.children.length > 0;

        return (
          <div key={node.id}>
            <button
              type="button"
              onClick={() => onSelect(isActive ? null : node.slug_path)}
              className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition ${
                isActive
                  ? "font-semibold text-[#002abf]"
                  : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
              }`}
            >
              {hasChildren && (
                <svg className="h-2.5 w-2.5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              )}
              <span className="truncate">{node.label}</span>
            </button>
            {hasChildren && (isActive || selected?.startsWith(node.slug_path + "/")) && (
              <TaxonomyTree
                nodes={node.children!}
                selected={selected}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Sidebar
   ═══════════════════════════════════════════════════════════════════════════ */

export function ProductFilterSidebar({ currentFilters, options }: ProductFilterSidebarProps) {
  const router = useRouter();

  const navigate = useCallback(
    (filters: ExploreFilters) => {
      router.push(buildExploreUrl("products", filters.taxonomy, filters));
    },
    [router],
  );

  const update = useCallback(
    (patch: Partial<ExploreFilters>) => {
      navigate({ ...currentFilters, ...patch });
    },
    [currentFilters, navigate],
  );

  const toggleInSet = useCallback(
    (key: keyof ExploreFilters, value: string) => {
      const arr = (currentFilters[key] as string[]) ?? [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      update({ [key]: next });
    },
    [currentFilters, update],
  );

  const activeCount = countActiveFilters(currentFilters, "products");

  // Build checkbox sets
  const brandsSet = new Set(currentFilters.brands ?? []);
  const materialsSet = new Set(currentFilters.materials ?? []);
  const materialTypeSet = new Set(currentFilters.material_type ?? []);
  const colorSet = new Set(currentFilters.color ?? []);
  const productStageSet = new Set(currentFilters.product_stage ?? []);

  // Facet sets
  const facetSets = new Map<string, Set<string>>();
  for (const group of options.facets) {
    facetSets.set(group.slug, new Set(currentFilters.facets?.[group.slug] ?? []));
  }

  const handleTaxonomySelect = useCallback(
    (slugPath: string | null) => {
      update({ taxonomy: slugPath });
    },
    [update],
  );

  const handleFacetToggle = useCallback(
    (facetSlug: string, value: string) => {
      const current = currentFilters.facets?.[facetSlug] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      update({ facets: { ...currentFilters.facets, [facetSlug]: next } });
    },
    [currentFilters, update],
  );

  return (
    <aside className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
          Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => navigate({
              ...currentFilters,
              taxonomy: null,
              brands: [],
              materials: [],
              taxonomy_materials: [],
              material_type: [],
              color: [],
              year: null,
              year_min: null,
              year_max: null,
              product_stage: [],
              collaboration: false,
              facets: {},
              country: null,
            })}
            className="text-[11px] font-medium text-[#002abf] hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* Category (taxonomy tree) */}
      {options.taxonomyTree.length > 0 && (
        <FilterSection title="Category" defaultOpen>
          <TaxonomyTree
            nodes={options.taxonomyTree as TaxonomyTreeNode[]}
            selected={currentFilters.taxonomy}
            onSelect={handleTaxonomySelect}
          />
          {/* Following a category was previously unreachable anywhere in the
              app: the only follow control lived on the projects filter bar and
              covered materials alone. notifyFollowedCategoryNewListing had no
              way to ever acquire a subscriber. */}
          {currentFilters.taxonomy && (
            <div className="pb-3 pt-1">
              <FollowFilterAction
                targetType="category"
                slugPath={currentFilters.taxonomy}
                domain="product"
              />
            </div>
          )}
        </FilterSection>
      )}

      {/* Brands */}
      {options.brands.length > 0 && (
        <FilterSection title="Brands">
          <CheckboxList
            items={options.brands}
            selected={brandsSet}
            onToggle={(v) => toggleInSet("brands", v)}
            searchable
          />
        </FilterSection>
      )}

      {/* Materials */}
      {options.materials.length > 0 && (
        <FilterSection title="Materials">
          <CheckboxList
            items={options.materials}
            selected={materialsSet}
            onToggle={(v) => toggleInSet("materials", v)}
            searchable
          />
          {/* Single selection only — "following" an intersection of three
              materials is not a thing the follows table can express, and the
              projects filter bar applies the same rule. */}
          {(currentFilters.materials?.length ?? 0) === 1 && (
            <div className="pb-3 pt-1">
              <FollowFilterAction
                targetType="material"
                slugPath={currentFilters.materials[0]}
                domain="material"
              />
            </div>
          )}
        </FilterSection>
      )}

      {/* Material Type */}
      {options.materialTypes.length > 0 && (
        <FilterSection title="Material Type">
          <CheckboxList
            items={options.materialTypes}
            selected={materialTypeSet}
            onToggle={(v) => toggleInSet("material_type", v)}
          />
        </FilterSection>
      )}

      {/* Color */}
      {options.colors.length > 0 && (
        <FilterSection title="Color Options">
          <CheckboxList
            items={options.colors}
            selected={colorSet}
            onToggle={(v) => toggleInSet("color", v)}
          />
        </FilterSection>
      )}

      {/* Dynamic facets (e.g. Design Style) */}
      {options.facets.map((group) => (
        <FilterSection key={group.slug} title={group.label}>
          <CheckboxList
            items={group.values.map((v) => ({ value: v.slug, label: v.label }))}
            selected={facetSets.get(group.slug) ?? new Set()}
            onToggle={(v) => handleFacetToggle(group.slug, v)}
          />
        </FilterSection>
      ))}

      {/* Product Stage / Availability */}
      {options.years.length > 0 && (
        <FilterSection title="Year">
          <CheckboxList
            items={options.years}
            selected={new Set(currentFilters.year != null ? [String(currentFilters.year)] : [])}
            onToggle={(v) => {
              const num = parseInt(v, 10);
              update({ year: currentFilters.year === num ? null : num });
            }}
            maxVisible={6}
          />
        </FilterSection>
      )}

      {/* Collaboration */}
      <FilterSection title="Connections">
        <label className="flex cursor-pointer items-center gap-2 px-1 py-1 text-xs">
          <input
            type="checkbox"
            checked={currentFilters.collaboration ?? false}
            onChange={() => update({ collaboration: !currentFilters.collaboration })}
            className="h-3.5 w-3.5 rounded border-zinc-300 text-[#002abf] focus:ring-[#002abf]/20 dark:border-zinc-600"
            style={{ borderRadius: 3 }}
          />
          <span className="text-zinc-700 dark:text-zinc-300">Used in projects only</span>
        </label>
      </FilterSection>

      {/* Stage */}
      {(productStageSet.size > 0 || true) && (
        <FilterSection title="Availability">
          <CheckboxList
            items={[
              { value: "production", label: "In Production" },
              { value: "prototype", label: "Prototype" },
              { value: "concept", label: "Concept" },
              { value: "custom", label: "Custom / Made to Order" },
            ]}
            selected={productStageSet}
            onToggle={(v) => toggleInSet("product_stage", v)}
          />
        </FilterSection>
      )}
    </aside>
  );
}
