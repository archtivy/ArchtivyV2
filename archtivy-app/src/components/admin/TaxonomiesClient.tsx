"use client";

import { useState } from "react";
import { useTaxonomies, type TaxonomyEntry } from "@/lib/admin/hooks";

type TaxSection = "categories" | "productTypes" | "materials" | "colors" | "cities" | "countries";

const SECTION_LABELS: Record<TaxSection, string> = {
  categories: "Categories",
  productTypes: "Product Types",
  materials: "Materials",
  colors: "Colors",
  cities: "Cities",
  countries: "Countries",
};

function TaxonomyList({ entries, label }: { entries: TaxonomyEntry[]; label: string }) {
  const [q, setQ] = useState("");
  const filtered = q
    ? entries.filter((e) => e.value.toLowerCase().includes(q.toLowerCase()))
    : entries;

  return (
    <div className="rounded border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">{label}</div>
        <div className="text-xs text-zinc-500">{entries.length} values in use</div>
      </div>
      <div className="border-b border-zinc-200 px-4 py-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="h-8 w-full rounded border border-zinc-200 px-3 text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-[#002abf]/20"
        />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">
            {q ? "No matches" : "No data yet"}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.value} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-4 py-2 text-xs text-zinc-500 w-8">{i + 1}</td>
                  <td className="px-4 py-2 text-sm text-zinc-900">{e.value}</td>
                  <td className="px-4 py-2 text-right text-xs text-zinc-500">{e.count} listings</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function TaxonomiesClient() {
  const { data, isLoading, error, refetch } = useTaxonomies();
  const [activeSection, setActiveSection] = useState<TaxSection>("categories");

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Taxonomies</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            View and audit taxonomy values in use across the database. Product type tree is
            frontend-controlled.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200">
        {(Object.keys(SECTION_LABELS) as TaxSection[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActiveSection(k)}
            className={[
              "rounded-t px-4 py-2 text-sm font-medium transition-colors",
              activeSection === k
                ? "border-b-2 border-[#002abf] text-[#002abf]"
                : "text-zinc-600 hover:text-zinc-900",
            ].join(" ")}
          >
            {SECTION_LABELS[k]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded border border-zinc-200 bg-white" />
      ) : data ? (
        <div className="space-y-6">
          <TaxonomyList entries={data[activeSection]} label={SECTION_LABELS[activeSection]} />

          {/* Product taxonomy tree (read-only) */}
          {activeSection === "productTypes" && (
            <div className="rounded border border-zinc-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-zinc-900">
                Frontend Taxonomy Tree (read-only — edit in productTaxonomy.ts)
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {data.taxonomyTree.map((t) => (
                  <div key={t.id} className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
                    <div className="font-semibold text-zinc-800">{t.label}</div>
                    <div className="text-zinc-500">{t.categoryCount} categories</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
