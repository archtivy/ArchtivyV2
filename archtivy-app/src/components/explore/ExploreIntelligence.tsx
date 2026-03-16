"use client";

import { useEffect, useState } from "react";
import type {
  MaterialUsage,
  MaterialCoOccurrence,
  CountryCount,
  BrandPenetration,
} from "@/lib/explore/intelligence";

const ACCENT = "#002abf";

async function fetchPanel<T>(panel: string, limit = 20): Promise<T[]> {
  const res = await fetch(`/api/explore/intelligence?panel=${panel}&limit=${limit}`);
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {title}
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

function BarChart({
  items,
  maxValue,
}: {
  items: { label: string; value: number }[];
  maxValue: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 truncate text-xs text-zinc-700 dark:text-zinc-300">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.max(2, (item.value / maxValue) * 100)}%`,
                backgroundColor: ACCENT,
                opacity: 0.75,
              }}
            />
          </div>
          <span className="w-10 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ExploreIntelligence() {
  const [materials, setMaterials] = useState<MaterialUsage[]>([]);
  const [coOccurrence, setCoOccurrence] = useState<MaterialCoOccurrence[]>([]);
  const [countries, setCountries] = useState<CountryCount[]>([]);
  const [brands, setBrands] = useState<BrandPenetration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPanel<MaterialUsage>("materials", 15),
      fetchPanel<MaterialCoOccurrence>("co_occurrence", 10),
      fetchPanel<CountryCount>("countries", 20),
      fetchPanel<BrandPenetration>("brands", 10),
    ]).then(([m, co, c, b]) => {
      setMaterials(m);
      setCoOccurrence(co);
      setCountries(c);
      setBrands(b);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Loading intelligence data...
      </div>
    );
  }

  const maxMaterial = materials[0]?.project_count ?? 1;
  const maxCountry = countries[0]?.count ?? 1;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Material Usage */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          title="Material Usage"
          subtitle="Most frequently used materials across all projects"
        />
        <BarChart
          items={materials.map((m) => ({
            label: m.display_name,
            value: m.project_count,
          }))}
          maxValue={maxMaterial}
        />
      </div>

      {/* Projects by Country */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          title="Geographic Distribution"
          subtitle="Projects by country"
        />
        <BarChart
          items={countries.map((c) => ({
            label: c.country,
            value: c.count,
          }))}
          maxValue={maxCountry}
        />
      </div>

      {/* Material Co-occurrence */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          title="Material Pairs"
          subtitle="Materials that appear together most frequently"
        />
        <div className="space-y-2">
          {coOccurrence.map((pair) => (
            <div
              key={`${pair.material_a}-${pair.material_b}`}
              className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-xs text-zinc-700 dark:text-zinc-300">
                {pair.label_a}
                <span className="mx-2 text-zinc-400">+</span>
                {pair.label_b}
              </span>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {pair.co_count} projects
              </span>
            </div>
          ))}
          {coOccurrence.length === 0 && (
            <p className="text-xs text-zinc-400">No material pair data available yet.</p>
          )}
        </div>
      </div>

      {/* Brand Penetration */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          title="Brand Penetration"
          subtitle="Brands with widest geographic and category reach"
        />
        <div className="space-y-3">
          {brands.map((b) => (
            <div
              key={b.brand_id}
              className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {b.brand_name}
                </span>
                <span className="text-xs text-zinc-500">
                  {b.project_count} projects · {b.country_count} countries
                </span>
              </div>
              {b.categories.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {b.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded px-1.5 py-0.5 text-[10px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {brands.length === 0 && (
            <p className="text-xs text-zinc-400">No brand data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
