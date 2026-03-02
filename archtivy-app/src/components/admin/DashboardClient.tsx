"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/admin/hooks";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded border bg-white p-4",
        accent ? "border-[#002abf]/30" : "border-zinc-200",
      ].join(" ")}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div
        className={[
          "mt-2 text-2xl font-bold",
          accent ? "text-[#002abf]" : "text-zinc-900",
        ].join(" ")}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

function AlertRow({ label, count, href }: { label: string; count: number; href: string }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3 last:border-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
          !
        </span>
        <span className="text-sm text-zinc-700">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-amber-700">{count}</span>
        <Link
          href={href}
          className="rounded bg-[#002abf] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Fix
        </Link>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 px-6 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded border border-zinc-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="rounded border border-red-200 bg-white p-4 text-sm text-red-700">
          Failed to load dashboard: {error.message}
          <button
            onClick={() => refetch()}
            className="ml-3 rounded bg-red-600 px-2 py-1 text-xs text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts =
    data.alerts.missing_cover_image +
    data.alerts.missing_location +
    data.alerts.missing_team +
    data.alerts.low_word_count +
    data.alerts.no_matches;

  return (
    <div className="space-y-6 px-6 py-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Live view · auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/projects/new"
            className="rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Project
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Add Product
          </Link>
          <Link
            href="/admin/profiles"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Add Profile
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard
          label="Profiles today"
          value={data.profiles.today}
          sub={`+${data.profiles.last7d} / 7d`}
          accent
        />
        <StatCard
          label="Profiles 30d"
          value={data.profiles.last30d}
          sub={`${data.profiles.total} total`}
        />
        <StatCard
          label="Projects"
          value={data.projects.total}
          sub={`+${data.projects.last7d} this week`}
        />
        <StatCard
          label="Products"
          value={data.products.total}
          sub={`+${data.products.last7d} this week`}
        />
        <StatCard label="Total saves" value={data.metrics.total_saves} />
        <StatCard label="Connections" value={data.metrics.total_connections} />
        <StatCard
          label="Alerts"
          value={totalAlerts}
          sub={totalAlerts > 0 ? "Needs attention" : "All good"}
          accent={totalAlerts > 0}
        />
      </div>

      {/* Alerts panel */}
      {totalAlerts > 0 && (
        <div className="rounded border border-amber-200 bg-white">
          <div className="border-b border-amber-100 px-4 py-3">
            <div className="text-sm font-semibold text-zinc-900">Content Alerts</div>
            <div className="text-xs text-zinc-500">Listings with missing or weak SEO signals</div>
          </div>
          <AlertRow
            label="Missing cover image"
            count={data.alerts.missing_cover_image}
            href="/admin/projects?missing=1"
          />
          <AlertRow
            label="Missing location (projects)"
            count={data.alerts.missing_location}
            href="/admin/projects?missing=1"
          />
          <AlertRow
            label="Missing team members"
            count={data.alerts.missing_team}
            href="/admin/projects?hasTeam=0"
          />
          <AlertRow
            label="Thin content (low word count)"
            count={data.alerts.low_word_count}
            href="/admin/seo/projects?filter=FAIL"
          />
          <AlertRow
            label="No product matches"
            count={data.alerts.no_matches}
            href="/admin/projects?hasProducts=0"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded border border-zinc-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-900">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Add Project", href: "/admin/projects/new" },
            { label: "Add Product", href: "/admin/products/new" },
            { label: "SEO Audit", href: "/admin/seo" },
            { label: "Featured Slots", href: "/admin/featured" },
            { label: "Taxonomies", href: "/admin/taxonomies" },
            { label: "Claims Queue", href: "/admin/claims" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded border border-zinc-200 bg-[#f5f5f5] px-3 py-2 text-sm font-medium text-zinc-700 hover:border-[#002abf] hover:text-[#002abf]"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Profile growth summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Today</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">{data.profiles.today}</div>
          <div className="mt-1 text-xs text-zinc-400">New profiles</div>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Last 7 days</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">{data.profiles.last7d}</div>
          <div className="mt-1 text-xs text-zinc-400">New profiles</div>
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Last 30 days</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">{data.profiles.last30d}</div>
          <div className="mt-1 text-xs text-zinc-400">New profiles</div>
        </div>
      </div>
    </div>
  );
}
