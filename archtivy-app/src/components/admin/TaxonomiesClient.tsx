"use client";

import { useState } from "react";
import { useTaxonomies, type TaxonomyEntry } from "@/lib/admin/hooks";
import { TaxonomyDbManager } from "@/components/admin/TaxonomyDbManager";
import {
  AdminPageShell,
  Panel,
  SegmentedButtons,
} from "@/components/admin/ui/AdminPageShell";
import {
  TableShell,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  TDNum,
  TableEmpty,
} from "@/components/admin/ui/DataTable";
import { INPUT, BTN_SECONDARY, TYPE } from "@/components/admin/ui/tokens";

type TopTab = "db" | "legacy";
type TaxSection = "categories" | "productTypes" | "materials" | "colors" | "cities" | "countries";

const SECTION_LABELS: Record<TaxSection, string> = {
  categories: "Categories",
  productTypes: "Product types",
  materials: "Materials",
  colors: "Colours",
  cities: "Cities",
  countries: "Countries",
};

/**
 * Legacy values are read-only by nature — they are DISTINCT values scraped from
 * listing columns, not rows anyone can edit. The table says so rather than
 * offering controls that would have nothing to write to.
 */
function LegacyValueTable({ entries, label }: { entries: TaxonomyEntry[]; label: string }) {
  const [q, setQ] = useState("");
  const filtered = q
    ? entries.filter((e) => e.value.toLowerCase().includes(q.toLowerCase()))
    : entries;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-label={`Search ${label}`}
          className={`${INPUT} w-72`}
        />
        <span className={TYPE.meta}>{entries.length} distinct values in use</span>
      </div>

      <TableShell>
        <Table minWidth={520}>
          <THead>
            <TH width="64px" align="right">
              #
            </TH>
            <TH>{label}</TH>
            <TH align="right">Listings</TH>
          </THead>
          <TBody>
            {filtered.map((e, i) => (
              <TR key={e.value}>
                <TDNum muted>{i + 1}</TDNum>
                <TD>{e.value}</TD>
                <TDNum>{e.count}</TDNum>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TableEmpty
                colSpan={3}
                title={q ? "No matches" : "No values yet"}
                hint={
                  q
                    ? "Try a shorter search."
                    : "These are read from listing columns, so they appear once listings use them."
                }
              />
            )}
          </TBody>
        </Table>
      </TableShell>
    </div>
  );
}

export function TaxonomiesClient() {
  const { data, isLoading, error, refetch } = useTaxonomies();
  const [activeSection, setActiveSection] = useState<TaxSection>("categories");
  const [topTab, setTopTab] = useState<TopTab>("db");

  return (
    <AdminPageShell
      title="Taxonomies"
      description="The controlled vocabulary everything on the platform is filed under."
      actions={
        <button type="button" onClick={() => refetch()} className={BTN_SECONDARY}>
          Refresh
        </button>
      }
      toolbar={
        <SegmentedButtons<TopTab>
          value={topTab}
          onChange={setTopTab}
          items={[
            { value: "db", label: "Managed taxonomy" },
            { value: "legacy", label: "Legacy column values" },
          ]}
        />
      }
    >
      {topTab === "db" ? (
        <TaxonomyDbManager />
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50/60 px-5 py-4 font-body text-[14px] text-red-700">
              {error.message}
            </div>
          )}

          <p className={`${TYPE.pageSubtitle} max-w-2xl leading-relaxed`}>
            Distinct values found in legacy listing columns. These are read-only:
            they are query results, not rows, so they change by editing the
            listings that use them.
          </p>

          <SegmentedButtons<TaxSection>
            value={activeSection}
            onChange={setActiveSection}
            items={(Object.keys(SECTION_LABELS) as TaxSection[]).map((k) => ({
              value: k,
              label: SECTION_LABELS[k],
            }))}
          />

          {isLoading ? (
            <div className="h-64 animate-pulse rounded-2xl border border-hairline bg-white" />
          ) : data ? (
            <div className="space-y-5">
              <LegacyValueTable
                entries={data[activeSection]}
                label={SECTION_LABELS[activeSection]}
              />

              {activeSection === "productTypes" && (
                <Panel
                  title="Frontend taxonomy tree"
                  description="Read-only — this one lives in productTaxonomy.ts, not the database."
                >
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {data.taxonomyTree.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-hairline bg-cream/60 px-3.5 py-3"
                      >
                        <div className="font-body text-[14px] font-medium text-ink">{t.label}</div>
                        <div className={`mt-0.5 ${TYPE.meta}`}>{t.categoryCount} categories</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          ) : null}
        </div>
      )}
    </AdminPageShell>
  );
}
