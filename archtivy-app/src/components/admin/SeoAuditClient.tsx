"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useSeoAudit, type SeoRow, type SeoStatus } from "@/lib/admin/hooks";

const STATUS_BADGE: Record<SeoStatus, string> = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WARN: "bg-amber-50 text-amber-700 border-amber-200",
  FAIL: "bg-red-50 text-red-700 border-red-200",
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-red-700";

function CheckList({ checks }: { checks: SeoRow["checks"] }) {
  return (
    <ul className="mt-2 space-y-0.5">
      {checks.map((c) => (
        <li key={c.id} className="flex items-start gap-1.5 text-xs">
          <span
            className={
              c.status === "PASS"
                ? "text-emerald-600"
                : c.status === "WARN"
                  ? "text-amber-600"
                  : "text-red-600"
            }
          >
            {c.status === "PASS" ? "✓" : c.status === "WARN" ? "△" : "✕"}
          </span>
          <span className="text-zinc-600">{c.message}</span>
        </li>
      ))}
    </ul>
  );
}

function exportCsv(rows: SeoRow[], entity: string) {
  const headers = ["id", "title", "overall", "score", "checks_summary"];
  const lines = rows.map((r) => {
    const summary = r.checks
      .filter((c) => c.status !== "PASS")
      .map((c) => `[${c.status}] ${c.message}`)
      .join(" | ");
    return [r.id, `"${r.title.replace(/"/g, '""')}"`, r.overall, r.score, `"${summary}"`].join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `seo-audit-${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface SeoAuditClientProps {
  entity: "projects" | "products" | "profiles";
}

export function SeoAuditClient({ entity }: SeoAuditClientProps) {
  const [filter, setFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, dataUpdatedAt } = useSeoAudit(entity, filter);

  const toggle = useCallback(
    (id: string) => setExpandedId((prev) => (prev === id ? null : id)),
    []
  );

  const ENTITY_LABEL: Record<typeof entity, string> = {
    projects: "Projects",
    products: "Products",
    profiles: "Profiles",
  };

  const summary = data
    ? {
        total: data.data.length,
        pass: data.data.filter((r) => r.overall === "PASS").length,
        warn: data.data.filter((r) => r.overall === "WARN").length,
        fail: data.data.filter((r) => r.overall === "FAIL").length,
      }
    : null;

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            SEO Audit — {ENTITY_LABEL[entity]}
          </h1>
          {dataUpdatedAt > 0 && (
            <p className="mt-0.5 text-xs text-zinc-500">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()} · auto-refreshes every 15s
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button
              type="button"
              onClick={() => exportCsv(data.data, entity)}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary pills */}
      {summary && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("")}
            className={[
              "rounded-full border px-3 py-1 text-xs font-semibold",
              filter === "" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
            ].join(" ")}
          >
            All ({summary.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("PASS")}
            className={[
              "rounded-full border px-3 py-1 text-xs font-semibold",
              filter === "PASS" ? "border-emerald-700 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
            ].join(" ")}
          >
            PASS ({summary.pass})
          </button>
          <button
            type="button"
            onClick={() => setFilter("WARN")}
            className={[
              "rounded-full border px-3 py-1 text-xs font-semibold",
              filter === "WARN" ? "border-amber-700 bg-amber-600 text-white" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
            ].join(" ")}
          >
            WARN ({summary.warn})
          </button>
          <button
            type="button"
            onClick={() => setFilter("FAIL")}
            className={[
              "rounded-full border px-3 py-1 text-xs font-semibold",
              filter === "FAIL" ? "border-red-700 bg-red-600 text-white" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
            ].join(" ")}
          >
            FAIL ({summary.fail})
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
          <button
            onClick={() => refetch()}
            className="ml-3 rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-[#f5f5f5]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {ENTITY_LABEL[entity]}
                </th>
                <th className="w-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Issues
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                (data?.data ?? []).map((row) => {
                  const issues = row.checks.filter((c) => c.status !== "PASS");
                  const expanded = expandedId === row.id;

                  return (
                    <>
                      <tr
                        key={row.id}
                        className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50"
                        onClick={() => toggle(row.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900">
                            {entity === "profiles"
                              ? (row.display_name ?? row.title)
                              : row.title}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-zinc-400">{row.id}</div>
                          {entity === "profiles" && row.username && (
                            <div className="mt-0.5 text-xs text-zinc-500">@{row.username}</div>
                          )}
                          {entity === "profiles" && row.should_noindex && (
                            <span className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                              noindex
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold",
                              STATUS_BADGE[row.overall],
                            ].join(" ")}
                          >
                            {row.overall}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={["font-bold", SCORE_COLOR(row.score)].join(" ")}>
                            {row.score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {issues.length === 0 ? (
                            <span className="text-emerald-600">No issues</span>
                          ) : (
                            <span>
                              {issues
                                .slice(0, 2)
                                .map((c) => c.message)
                                .join(", ")}
                              {issues.length > 2 && ` +${issues.length - 2} more`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={row.edit_href}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded bg-[#002abf] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${row.id}-detail`} className="border-b border-zinc-100 bg-zinc-50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="text-xs font-semibold text-zinc-700">All checks</div>
                            <CheckList checks={row.checks} />
                            {row.slug && (
                              <div className="mt-2 text-xs text-zinc-500">
                                Slug: <code className="rounded bg-zinc-100 px-1 py-0.5">{row.slug}</code>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}

              {!isLoading && (data?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {filter ? `No ${filter} results` : "No records found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
