"use client";

import { useState, useTransition, useCallback } from "react";
import type { TaxonomyNode, FacetWithValues } from "@/lib/taxonomy/taxonomyDb";
import type { BackfillStats } from "@/lib/taxonomy/backfill";
import {
  getTaxonomyData,
  seedTaxonomyNodes,
  seedFacets,
  seedSynonyms,
  seedRedirects,
  triggerBackfill,
  addTaxonomyNode,
  editTaxonomyNode,
} from "@/app/(admin)/admin/_actions/taxonomy";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaxonomyDbManagerState {
  nodes: TaxonomyNode[];
  facets: FacetWithValues[];
  nodeCounts: Record<string, number>;
  unmappedCount: number;
}

type Tab = "tree" | "facets" | "tools";

// ─── Tree Node Component ─────────────────────────────────────────────────────

function TreeNode({
  node,
  children,
  count,
  onToggleActive,
}: {
  node: TaxonomyNode;
  children: TaxonomyNode[];
  count: number;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(node.depth === 0);
  const hasChildren = children.length > 0;
  const indent = node.depth * 24;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 text-sm hover:bg-zinc-50 ${
          !node.is_active ? "opacity-50" : ""
        }`}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-700"
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <span className="flex-1 text-zinc-800">{node.label}</span>
        <span className="text-xs text-zinc-400">{node.slug}</span>
        <span className="min-w-[60px] text-right text-xs text-zinc-500">
          {count > 0 ? `${count}` : "—"}
        </span>
        <button
          type="button"
          onClick={() => onToggleActive(node.id, !node.is_active)}
          className={`rounded px-2 py-0.5 text-xs ${
            node.is_active
              ? "text-green-700 hover:bg-green-50"
              : "text-red-600 hover:bg-red-50"
          }`}
        >
          {node.is_active ? "Active" : "Inactive"}
        </button>
      </div>
      {expanded && hasChildren && children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          children={[]}
          count={count}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TaxonomyDbManager() {
  const [state, setState] = useState<TaxonomyDbManagerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("tree");
  const [domainFilter, setDomainFilter] = useState<"product" | "project" | "material">("product");
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

  // Load on first render
  if (!state && !loading) {
    loadData();
  }

  const handleSeedNodes = () => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, "Seeding taxonomy nodes..."]);
      const res = await seedTaxonomyNodes();
      if (res.ok) {
        setSeedLog((prev) => [...prev, `Nodes: ${res.inserted} inserted, ${res.skipped} skipped`]);
      } else {
        setSeedLog((prev) => [...prev, `Node seed error: ${res.error}`]);
      }
      await loadData();
    });
  };

  const handleSeedFacets = () => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, "Seeding facets..."]);
      const res = await seedFacets();
      if (res.ok) {
        setSeedLog((prev) => [...prev, `Facets: ${res.facetsInserted} facets, ${res.valuesInserted} values inserted`]);
      } else {
        setSeedLog((prev) => [...prev, `Facet seed error: ${res.error}`]);
      }
      await loadData();
    });
  };

  const handleSeedSynonyms = () => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, "Seeding synonyms..."]);
      const res = await seedSynonyms();
      if (res.ok) {
        setSeedLog((prev) => [...prev, `Synonyms: ${res.inserted} inserted, ${res.skipped} skipped`]);
      } else {
        setSeedLog((prev) => [...prev, `Synonym seed error: ${res.error}`]);
      }
    });
  };

  const handleSeedRedirects = () => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, "Seeding redirects..."]);
      const res = await seedRedirects();
      if (res.ok) {
        setSeedLog((prev) => [...prev, `Redirects: ${res.inserted} inserted, ${res.skipped} skipped`]);
      } else {
        setSeedLog((prev) => [...prev, `Redirect seed error: ${res.error}`]);
      }
    });
  };

  const handleBackfill = (dryRun: boolean) => {
    startTransition(async () => {
      setSeedLog((prev) => [...prev, dryRun ? "Running backfill dry-run..." : "Running backfill..."]);
      const res = await triggerBackfill({ dryRun });
      if (res.ok && res.stats) {
        setBackfillResult(res.stats);
        const label = dryRun ? "Dry-run" : "Backfill";
        const s = res.stats!;
        const logLines: string[] = [
          `${label} done: ${s.productsBackfilled}/${s.productsProcessed} products, ${s.projectsBackfilled}/${s.projectsProcessed} projects`,
        ];
        if (s.errors.length > 0) {
          logLines.push(`Errors: ${s.errors.slice(0, 5).join("; ")}`);
        }
        if (dryRun && s.summary) {
          logLines.push(
            `Summary: ${s.summary.mapped_exact} exact, ${s.summary.mapped_to_parent} to-parent, ${s.summary.no_match} unmatched, ${s.summary.skipped} skipped`
          );
        }
        setSeedLog((prev) => [...prev, ...logLines]);
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

  if (!state) {
    return (
      <div className="rounded border border-zinc-200 bg-white p-6">
        <div className="animate-pulse h-6 w-48 rounded bg-zinc-100" />
      </div>
    );
  }

  const filteredNodes = state.nodes.filter((n) => n.domain === domainFilter);
  const rootNodes = filteredNodes.filter((n) => n.depth === 0).sort((a, b) => a.sort_order - b.sort_order);

  // Build parent -> children map
  const childrenMap = new Map<string, TaxonomyNode[]>();
  for (const n of filteredNodes) {
    if (n.parent_id) {
      const arr = childrenMap.get(n.parent_id) ?? [];
      arr.push(n);
      childrenMap.set(n.parent_id, arr);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-4 rounded border border-zinc-200 bg-white px-4 py-3">
        <div className="text-sm">
          <span className="font-medium text-zinc-900">{state.nodes.length}</span>{" "}
          <span className="text-zinc-500">taxonomy nodes</span>
        </div>
        <div className="text-sm">
          <span className="font-medium text-zinc-900">{state.facets.length}</span>{" "}
          <span className="text-zinc-500">facets</span>
        </div>
        <div className="text-sm">
          <span className="font-medium text-zinc-900">{state.facets.reduce((sum, f) => sum + f.values.length, 0)}</span>{" "}
          <span className="text-zinc-500">facet values</span>
        </div>
        <div className="text-sm">
          {state.unmappedCount > 0 ? (
            <span className="font-medium text-amber-600">{state.unmappedCount} unmapped listings</span>
          ) : (
            <span className="text-green-600">All listings mapped</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-200">
        {(["tree", "facets", "tools"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "rounded-t px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-b-2 border-[#002abf] text-[#002abf]"
                : "text-zinc-600 hover:text-zinc-900",
            ].join(" ")}
          >
            {t === "tree" ? "Taxonomy Tree" : t === "facets" ? "Facets" : "Seed & Backfill"}
          </button>
        ))}
      </div>

      {/* Tree tab */}
      {tab === "tree" && (
        <div className="rounded border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as "product" | "project" | "material")}
              className="rounded border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="product">Product</option>
              <option value="project">Project</option>
              <option value="material">Material</option>
            </select>
            <span className="text-xs text-zinc-500">
              {filteredNodes.length} nodes ({rootNodes.length} root)
            </span>
          </div>

          {/* Header row */}
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
            <span className="flex-1" style={{ paddingLeft: "32px" }}>Label</span>
            <span>Slug</span>
            <span className="min-w-[60px] text-right">Listings</span>
            <span className="w-[70px]">Status</span>
          </div>

          {rootNodes.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              No taxonomy nodes found. Use the Seed & Backfill tab to populate.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {rootNodes.map((root) => (
                <RecursiveTreeNode
                  key={root.id}
                  node={root}
                  childrenMap={childrenMap}
                  counts={state.nodeCounts}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Facets tab */}
      {tab === "facets" && (
        <div className="space-y-3">
          {state.facets.length === 0 ? (
            <div className="rounded border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
              No facets found. Use the Seed & Backfill tab to populate.
            </div>
          ) : (
            state.facets.map((facet) => (
              <div key={facet.id} className="rounded border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900">{facet.label}</span>
                    <span className="ml-2 text-xs text-zinc-500">{facet.slug}</span>
                  </div>
                  <div className="flex gap-2 text-xs text-zinc-500">
                    <span>{facet.values.length} values</span>
                    <span>{facet.is_multi_select ? "Multi-select" : "Single"}</span>
                    <span>Applies to: {facet.applies_to.join(", ")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 py-3">
                  {facet.values.map((v) => (
                    <span
                      key={v.id}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        v.is_active
                          ? "border-zinc-200 bg-zinc-50 text-zinc-700"
                          : "border-red-200 bg-red-50 text-red-600 line-through"
                      }`}
                    >
                      {v.label}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tools tab */}
      {tab === "tools" && (
        <div className="space-y-4">
          {/* Seed buttons */}
          <div className="rounded border border-zinc-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-zinc-900">Seed Data</div>
            <p className="mb-3 text-xs text-zinc-500">
              Populate the taxonomy tables with seed data. Safe to run multiple times — existing entries are skipped.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSeedNodes}
                disabled={isPending}
                className="rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#001f8f] disabled:opacity-50"
              >
                {isPending ? "..." : "Seed Taxonomy Nodes"}
              </button>
              <button
                type="button"
                onClick={handleSeedFacets}
                disabled={isPending}
                className="rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#001f8f] disabled:opacity-50"
              >
                {isPending ? "..." : "Seed Facets"}
              </button>
              <button
                type="button"
                onClick={handleSeedSynonyms}
                disabled={isPending}
                className="rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#001f8f] disabled:opacity-50"
              >
                {isPending ? "..." : "Seed Synonyms"}
              </button>
              <button
                type="button"
                onClick={handleSeedRedirects}
                disabled={isPending}
                className="rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#001f8f] disabled:opacity-50"
              >
                {isPending ? "..." : "Seed Redirects"}
              </button>
            </div>
          </div>

          {/* Backfill */}
          <div className="rounded border border-zinc-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-zinc-900">Backfill Listings</div>
            <p className="mb-3 text-xs text-zinc-500">
              Map existing listings to taxonomy nodes by matching legacy columns (product_type, product_category, etc.).
              Only processes listings with no taxonomy_node_id set.
            </p>
            {state.unmappedCount > 0 && (
              <p className="mb-3 text-xs text-amber-600">
                {state.unmappedCount} listings are not yet mapped to taxonomy nodes.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleBackfill(true)}
                disabled={isPending}
                className="rounded border border-amber-600 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
              >
                {isPending ? "..." : "Dry Run (Preview)"}
              </button>
              <button
                type="button"
                onClick={() => handleBackfill(false)}
                disabled={isPending}
                className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? "Running..." : "Run Backfill"}
              </button>
            </div>

            {backfillResult && (
              <div className="mt-3 rounded bg-zinc-50 p-3 text-xs text-zinc-700 space-y-1">
                <div>Products: {backfillResult.productsBackfilled}/{backfillResult.productsProcessed} backfilled</div>
                <div>Projects: {backfillResult.projectsBackfilled}/{backfillResult.projectsProcessed} backfilled</div>
                {backfillResult.summary && (
                  <div className="mt-2 grid grid-cols-4 gap-2 rounded bg-white p-2 border border-zinc-200">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-700">{backfillResult.summary.mapped_exact}</div>
                      <div className="text-[10px] text-zinc-500">Exact</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-amber-600">{backfillResult.summary.mapped_to_parent}</div>
                      <div className="text-[10px] text-zinc-500">To Parent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{backfillResult.summary.no_match}</div>
                      <div className="text-[10px] text-zinc-500">No Match</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-zinc-400">{backfillResult.summary.skipped}</div>
                      <div className="text-[10px] text-zinc-500">Skipped</div>
                    </div>
                  </div>
                )}
                {backfillResult.errors.length > 0 && (
                  <div className="mt-1 text-red-600">
                    Errors: {backfillResult.errors.slice(0, 5).join("; ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Log */}
          {seedLog.length > 0 && (
            <div className="rounded border border-zinc-200 bg-zinc-900 p-4">
              <div className="mb-2 text-xs font-medium text-zinc-400">Activity Log</div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {seedLog.map((line, i) => (
                  <div key={i} className="text-xs font-mono text-zinc-300">{line}</div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSeedLog([])}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear log
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recursive Tree Node ─────────────────────────────────────────────────────

function RecursiveTreeNode({
  node,
  childrenMap,
  counts,
  onToggleActive,
}: {
  node: TaxonomyNode;
  childrenMap: Map<string, TaxonomyNode[]>;
  counts: Record<string, number>;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(node.depth === 0);
  const children = (childrenMap.get(node.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const hasChildren = children.length > 0;
  const indent = node.depth * 24;
  const count = counts[node.id] ?? 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 text-sm hover:bg-zinc-50 border-b border-zinc-50 ${
          !node.is_active ? "opacity-50" : ""
        }`}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-700 text-xs"
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <span className={`flex-1 ${node.depth === 0 ? "font-medium" : ""} text-zinc-800`}>
          {node.label}
        </span>
        <span className="text-xs text-zinc-400 shrink-0">{node.slug}</span>
        <span className="min-w-[60px] text-right text-xs text-zinc-500 shrink-0">
          {count > 0 ? count : "—"}
        </span>
        <button
          type="button"
          onClick={() => onToggleActive(node.id, !node.is_active)}
          className={`shrink-0 rounded px-2 py-0.5 text-xs ${
            node.is_active
              ? "text-green-700 hover:bg-green-50"
              : "text-red-600 hover:bg-red-50"
          }`}
        >
          {node.is_active ? "Active" : "Inactive"}
        </button>
      </div>
      {expanded && children.map((child) => (
        <RecursiveTreeNode
          key={child.id}
          node={child}
          childrenMap={childrenMap}
          counts={counts}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
