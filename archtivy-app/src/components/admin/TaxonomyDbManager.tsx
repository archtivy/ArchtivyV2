"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { TaxonomyNode, FacetWithValues } from "@/lib/taxonomy/taxonomyDb";
import type { BackfillStats } from "@/lib/taxonomy/backfill";
import {
  TAXONOMY_DOMAINS,
  TAXONOMY_DOMAIN_LABELS,
  PENDING_TAXONOMY_DOMAINS,
  type TaxonomyDomain,
} from "@/lib/taxonomy/domains";
import {
  getTaxonomyData,
  seedTaxonomyNodes,
  seedFacets,
  seedSynonyms,
  seedRedirects,
  triggerBackfill,
  editTaxonomyNode,
} from "@/app/(admin)/admin/_actions/taxonomy";
import { AddTermForm } from "@/components/admin/taxonomy/AddTermForm";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import { Panel, SegmentedButtons } from "@/components/admin/ui/AdminPageShell";
import {
  SURFACE,
  INPUT,
  SELECT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ROW,
  TYPE,
} from "@/components/admin/ui/tokens";

/**
 * Taxonomy manager.
 *
 * Redesigned onto the shared admin kit, and completed: "add a term" now has a
 * UI. `addTaxonomyNode` existed and was even imported into this file, but no
 * component ever called it — so the panel could toggle a term active and edit
 * its SEO fields, and that was all. Renaming is new for the same reason.
 *
 * The tree stays a tree. It is the one place in the admin area where the shape
 * of the data IS the information, and flattening 1101 nodes into a table would
 * lose the parent/child relationship entirely.
 */

interface TaxonomyDbManagerState {
  nodes: TaxonomyNode[];
  facets: FacetWithValues[];
  nodeCounts: Record<string, number>;
  unmappedCount: number;
}

type Tab = "tree" | "facets" | "tools";

export function TaxonomyDbManager() {
  const [state, setState] = useState<TaxonomyDbManagerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("tree");
  const [domainFilter, setDomainFilter] = useState<TaxonomyDomain>("project");
  const [adding, setAdding] = useState(false);
  const [seedLog, setSeedLog] = useState<string[]>([]);
  const [backfillResult, setBackfillResult] = useState<BackfillStats | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getTaxonomyData();
    if (res.ok) {
      setState({
        nodes: res.nodes ?? [],
        facets: res.facets ?? [],
        nodeCounts: res.nodeCounts ?? {},
        unmappedCount: res.unmappedCount ?? 0,
      });
    } else {
      setSeedLog((prev) => [...prev, `Error loading: ${res.error}`]);
    }
    setLoading(false);
  }, []);

  if (!state && !loading) loadData();

  const runSeed = (
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>,
    describe: (r: Record<string, unknown>) => string
  ) => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, `${label}…`]);
      const res = await fn();
      setSeedLog((prev) => [
        ...prev,
        res.ok ? describe(res) : `${label} failed: ${res.error}`,
      ]);
      await loadData();
    });
  };

  const handleBackfill = (dryRun: boolean) => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, dryRun ? "Running backfill dry-run…" : "Running backfill…"]);
      const res = await triggerBackfill({ dryRun });
      if (res.ok && res.stats) {
        const s = res.stats;
        setBackfillResult(s);
        const lines = [
          `${dryRun ? "Dry-run" : "Backfill"} done: ${s.productsBackfilled}/${s.productsProcessed} products, ${s.projectsBackfilled}/${s.projectsProcessed} projects`,
        ];
        if (s.errors.length > 0) lines.push(`Errors: ${s.errors.slice(0, 5).join("; ")}`);
        if (dryRun && s.summary) {
          lines.push(
            `Summary: ${s.summary.mapped_exact} exact, ${s.summary.mapped_to_parent} to-parent, ${s.summary.no_match} unmatched, ${s.summary.skipped} skipped`
          );
        }
        setSeedLog((prev) => [...prev, ...lines]);
      } else {
        setSeedLog((prev) => [...prev, `Backfill error: ${res.error}`]);
      }
      if (!dryRun) await loadData();
    });
  };

  const handleToggleActive = (nodeId: string, active: boolean) => {
    startTransition(async () => {
      await editTaxonomyNode(nodeId, { is_active: active });
      await loadData();
    });
  };

  const handleRename = (nodeId: string, label: string) => {
    startTransition(async () => {
      await editTaxonomyNode(nodeId, { label });
      await loadData();
    });
  };

  const handleSaveSeo = (
    nodeId: string,
    seo: {
      seo_title: string | null;
      meta_description: string | null;
      intro_text: string | null;
      featured_image: string | null;
    }
  ) => {
    startTransition(async () => {
      await editTaxonomyNode(nodeId, seo);
      await loadData();
    });
  };

  if (!state) {
    return <div className="h-64 animate-pulse rounded-2xl border border-hairline bg-white" />;
  }

  const filteredNodes = state.nodes.filter((n) => n.domain === domainFilter);
  const rootNodes = filteredNodes
    .filter((n) => n.depth === 0)
    .sort((a, b) => a.sort_order - b.sort_order);

  const childrenMap = new Map<string, TaxonomyNode[]>();
  for (const n of filteredNodes) {
    if (n.parent_id) {
      const arr = childrenMap.get(n.parent_id) ?? [];
      arr.push(n);
      childrenMap.set(n.parent_id, arr);
    }
  }

  const isPendingDomain = PENDING_TAXONOMY_DOMAINS.includes(domainFilter);
  const facetValueCount = state.facets.reduce((sum, f) => sum + f.values.length, 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Taxonomy nodes" value={state.nodes.length} />
        <Stat label="Facets" value={state.facets.length} />
        <Stat label="Facet values" value={facetValueCount} />
        <Stat
          label="Unmapped listings"
          value={state.unmappedCount}
          tone={state.unmappedCount > 0 ? "attention" : "positive"}
          hint={state.unmappedCount > 0 ? "Needs backfill" : "All mapped"}
        />
      </div>

      <SegmentedButtons<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "tree", label: "Terms" },
          { value: "facets", label: "Facets", count: state.facets.length },
          { value: "tools", label: "Seed & backfill" },
        ]}
      />

      {/* ── Terms ── */}
      {tab === "tree" && (
        <div className={`overflow-hidden ${SURFACE}`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-cream/60 px-5 py-3.5">
            {/* Controlled directly rather than via SelectField, which is
                uncontrolled by design for use inside filter <form>s. */}
            <select
              aria-label="Taxonomy dimension"
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value as TaxonomyDomain);
                setAdding(false);
              }}
              className={`${SELECT} w-56`}
            >
              {TAXONOMY_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {TAXONOMY_DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
            <span className={TYPE.meta}>
              {filteredNodes.length} {filteredNodes.length === 1 ? "term" : "terms"} ·{" "}
              {rootNodes.length} top level
            </span>
            {isPendingDomain && <StatusPill tone="attention">Migration pending</StatusPill>}
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className={`${BTN_SECONDARY} ml-auto`}
              aria-expanded={adding}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add term
            </button>
          </div>

          {adding && (
            <AddTermForm
              domain={domainFilter}
              nodes={filteredNodes}
              onAdded={() => {
                setAdding(false);
                void loadData();
              }}
              onCancel={() => setAdding(false)}
            />
          )}

          <div className="flex items-center gap-2 border-b border-hairline/60 bg-white px-5 py-2.5">
            <span className={`flex-1 ${TYPE.columnHeader}`} style={{ paddingLeft: 28 }}>
              Term
            </span>
            <span className={`w-40 ${TYPE.columnHeader}`}>Slug</span>
            <span className={`w-20 text-right ${TYPE.columnHeader}`}>Listings</span>
            <span className={`w-44 ${TYPE.columnHeader}`} />
          </div>

          {rootNodes.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className={TYPE.sectionTitle}>
                No terms in {TAXONOMY_DOMAIN_LABELS[domainFilter]} yet
              </p>
              <p className={`mt-1.5 ${TYPE.pageSubtitle}`}>
                {isPendingDomain
                  ? "This dimension needs its migration applied before terms can be saved."
                  : "Add a term above, or use Seed & backfill to populate from seed data."}
              </p>
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {rootNodes.map((root) => (
                <TreeRow
                  key={root.id}
                  node={root}
                  childrenMap={childrenMap}
                  counts={state.nodeCounts}
                  onToggleActive={handleToggleActive}
                  onRename={handleRename}
                  onSaveSeo={handleSaveSeo}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Facets ── */}
      {tab === "facets" && (
        <div className="space-y-3">
          {state.facets.length === 0 ? (
            <div className={`${SURFACE} px-5 py-14 text-center`}>
              <p className={TYPE.sectionTitle}>No facets yet</p>
              <p className={`mt-1.5 ${TYPE.pageSubtitle}`}>
                Use Seed &amp; backfill to populate them.
              </p>
            </div>
          ) : (
            state.facets.map((facet) => (
              <div key={facet.id} className={`overflow-hidden ${SURFACE}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
                  <div>
                    <span className={TYPE.sectionTitle}>{facet.label}</span>
                    <span className={`ml-2 font-mono ${TYPE.meta}`}>{facet.slug}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="neutral">{facet.values.length} values</StatusPill>
                    <StatusPill tone="neutral">
                      {facet.is_multi_select ? "Multi-select" : "Single select"}
                    </StatusPill>
                    <span className={TYPE.meta}>Applies to {facet.applies_to.join(", ")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 px-5 py-4">
                  {facet.values.map((v) => (
                    <StatusPill key={v.id} tone={v.is_active ? "neutral" : "critical"}>
                      {v.is_active ? v.label : <s>{v.label}</s>}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Seed & backfill ── */}
      {tab === "tools" && (
        <div className="space-y-5">
          <Panel
            title="Seed data"
            description="Populates the taxonomy tables from seed files. Safe to re-run — existing entries are skipped."
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runSeed(
                    "Seeding taxonomy nodes",
                    seedTaxonomyNodes,
                    (r) => `Nodes: ${r.inserted} inserted, ${r.skipped} skipped`
                  )
                }
                className={BTN_SECONDARY}
              >
                Seed nodes
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runSeed(
                    "Seeding facets",
                    seedFacets,
                    (r) => `Facets: ${r.facetsInserted} facets, ${r.valuesInserted} values inserted`
                  )
                }
                className={BTN_SECONDARY}
              >
                Seed facets
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runSeed(
                    "Seeding synonyms",
                    seedSynonyms,
                    (r) => `Synonyms: ${r.inserted} inserted, ${r.skipped} skipped`
                  )
                }
                className={BTN_SECONDARY}
              >
                Seed synonyms
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runSeed(
                    "Seeding redirects",
                    seedRedirects,
                    (r) => `Redirects: ${r.inserted} inserted, ${r.skipped} skipped`
                  )
                }
                className={BTN_SECONDARY}
              >
                Seed redirects
              </button>
            </div>
          </Panel>

          <Panel
            title="Backfill listings"
            description="Maps existing listings to taxonomy nodes from legacy columns. Only touches listings with no taxonomy_node_id."
          >
            {state.unmappedCount > 0 && (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 font-body text-[13px] text-amber-800">
                {state.unmappedCount} listings are not yet mapped.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBackfill(true)}
                className={BTN_SECONDARY}
              >
                Dry run
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBackfill(false)}
                className={BTN_PRIMARY}
              >
                {isPending ? "Running…" : "Run backfill"}
              </button>
            </div>

            {backfillResult && (
              <div className="mt-5 rounded-xl border border-hairline bg-cream/60 p-4">
                <p className={TYPE.cellSecondary}>
                  Products {backfillResult.productsBackfilled}/
                  {backfillResult.productsProcessed} · Projects{" "}
                  {backfillResult.projectsBackfilled}/{backfillResult.projectsProcessed}
                </p>
                {backfillResult.summary && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat label="Exact" value={backfillResult.summary.mapped_exact} />
                    <MiniStat label="To parent" value={backfillResult.summary.mapped_to_parent} />
                    <MiniStat label="No match" value={backfillResult.summary.no_match} />
                    <MiniStat label="Skipped" value={backfillResult.summary.skipped} />
                  </div>
                )}
                {backfillResult.errors.length > 0 && (
                  <p className="mt-3 font-body text-[13px] text-red-600">
                    Errors: {backfillResult.errors.slice(0, 5).join("; ")}
                  </p>
                )}
              </div>
            )}
          </Panel>

          {seedLog.length > 0 && (
            <Panel
              title="Activity log"
              actions={
                <button type="button" onClick={() => setSeedLog([])} className={BTN_ROW}>
                  Clear
                </button>
              }
            >
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-ink p-4">
                {seedLog.map((line, i) => (
                  <div key={i} className="font-mono text-[12px] leading-relaxed text-cream/80">
                    {line}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "attention" | "positive";
}) {
  return (
    <div className={`${SURFACE} px-5 py-4`}>
      <div className={TYPE.columnHeader}>{label}</div>
      <div
        className={[
          "mt-1.5 font-body text-[24px] font-semibold tabular-nums tracking-[-0.02em]",
          tone === "attention" ? "text-amber-700" : "text-ink",
        ].join(" ")}
      >
        {value}
      </div>
      {hint ? <div className={`mt-0.5 ${TYPE.meta}`}>{hint}</div> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-white px-3 py-2.5 text-center">
      <div className="font-body text-[18px] font-semibold tabular-nums text-ink">{value}</div>
      <div className={`mt-0.5 ${TYPE.meta}`}>{label}</div>
    </div>
  );
}

/** One row of the term tree, with its rename, SEO and active controls. */
function TreeRow({
  node,
  childrenMap,
  counts,
  onToggleActive,
  onRename,
  onSaveSeo,
}: {
  node: TaxonomyNode;
  childrenMap: Map<string, TaxonomyNode[]>;
  counts: Record<string, number>;
  onToggleActive: (id: string, active: boolean) => void;
  onRename: (id: string, label: string) => void;
  onSaveSeo: (
    id: string,
    seo: {
      seo_title: string | null;
      meta_description: string | null;
      intro_text: string | null;
      featured_image: string | null;
    }
  ) => void;
}) {
  const [expanded, setExpanded] = useState(node.depth === 0);
  const [seoOpen, setSeoOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(node.label);
  const [seoTitle, setSeoTitle] = useState(node.seo_title ?? "");
  const [metaDesc, setMetaDesc] = useState(node.meta_description ?? "");
  const [introText, setIntroText] = useState(node.intro_text ?? "");
  const [featuredImage, setFeaturedImage] = useState(node.featured_image ?? "");

  const children = (childrenMap.get(node.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const hasChildren = children.length > 0;
  const indent = node.depth * 20;
  const count = counts[node.id] ?? 0;
  const hasSeo = !!(node.seo_title || node.meta_description);

  return (
    <div>
      <div
        className={[
          "group flex items-center gap-2 border-b border-hairline/50 px-5 py-2.5 transition-colors hover:bg-cream/60",
          node.is_active ? "" : "opacity-55",
        ].join(" ")}
        style={{ paddingLeft: `${indent + 20}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-ink"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
              aria-hidden
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {renaming ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              aria-label={`Rename ${node.label}`}
              className={`${INPUT} h-8 max-w-xs`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                if (draftLabel.trim() && draftLabel.trim() !== node.label) {
                  onRename(node.id, draftLabel.trim());
                }
                setRenaming(false);
              }}
              className={BTN_ROW}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftLabel(node.label);
                setRenaming(false);
              }}
              className={BTN_ROW}
            >
              Cancel
            </button>
          </div>
        ) : (
          <span
            className={[
              "flex-1 truncate font-body text-[14px] text-ink",
              node.depth === 0 ? "font-medium" : "",
            ].join(" ")}
          >
            {node.label}
          </span>
        )}

        {!renaming && (
          <>
            <span className={`w-40 shrink-0 truncate font-mono ${TYPE.meta}`}>{node.slug}</span>
            <span
              className={`w-20 shrink-0 text-right font-body text-[13px] tabular-nums ${
                count > 0 ? "text-ink" : "text-muted"
              }`}
            >
              {count > 0 ? count : "—"}
            </span>
            {/* Visible by default; recessed only where hover exists to restore
                it. Hiding these below md would make renaming unreachable on a
                touch device. */}
            <div className="flex w-44 shrink-0 items-center justify-end gap-0.5 opacity-100 transition-opacity focus-within:opacity-100 md:opacity-70 md:group-hover:opacity-100">
              <button type="button" onClick={() => setRenaming(true)} className={BTN_ROW}>
                Rename
              </button>
              <button
                type="button"
                onClick={() => setSeoOpen(!seoOpen)}
                aria-expanded={seoOpen}
                className={hasSeo ? `${BTN_ROW} text-archtivy-primary` : BTN_ROW}
              >
                SEO
              </button>
              <button
                type="button"
                onClick={() => onToggleActive(node.id, !node.is_active)}
                className={BTN_ROW}
              >
                {node.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          </>
        )}
      </div>

      {seoOpen && (
        <div
          className="space-y-2.5 border-b border-hairline bg-cream/70 px-5 py-4"
          style={{ paddingLeft: `${indent + 46}px` }}
        >
          <p className={TYPE.columnHeader}>SEO — {node.label}</p>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="SEO title (falls back to the label)"
            className={`${INPUT} h-9`}
          />
          <input
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            placeholder="Meta description"
            className={`${INPUT} h-9`}
          />
          <textarea
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            placeholder="Intro text, shown above the listings"
            rows={2}
            className={`${INPUT} h-auto resize-none py-2`}
          />
          <input
            value={featuredImage}
            onChange={(e) => setFeaturedImage(e.target.value)}
            placeholder="Featured image URL (used as the OG image)"
            className={`${INPUT} h-9`}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onSaveSeo(node.id, {
                  seo_title: seoTitle.trim() || null,
                  meta_description: metaDesc.trim() || null,
                  intro_text: introText.trim() || null,
                  featured_image: featuredImage.trim() || null,
                });
                setSeoOpen(false);
              }}
              className={BTN_PRIMARY}
            >
              Save SEO
            </button>
            <button type="button" onClick={() => setSeoOpen(false)} className={BTN_SECONDARY}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded &&
        children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            childrenMap={childrenMap}
            counts={counts}
            onToggleActive={onToggleActive}
            onRename={onRename}
            onSaveSeo={onSaveSeo}
          />
        ))}
    </div>
  );
}
