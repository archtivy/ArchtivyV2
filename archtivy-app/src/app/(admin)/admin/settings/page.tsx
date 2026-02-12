import { AdminPage } from "@/components/admin/AdminPage";

export default function AdminSettingsPage() {
  const allow = (process.env.ARCHTIVY_ADMIN_CLERK_IDS ?? "").trim();
  const isProd = process.env.NODE_ENV === "production";

  return (
    <AdminPage title="Settings">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">System status</div>
          <div className="mt-2 space-y-1 text-sm text-zinc-700">
            <div>
              Admin access control:{" "}
              <span className="font-medium">
                {allow ? "Allowlist enabled" : isProd ? "BLOCKING (missing allowlist)" : "Dev open"}
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Env var: <span className="font-mono">ARCHTIVY_ADMIN_CLERK_IDS</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Defaults</div>
          <div className="mt-2 text-sm text-zinc-600">
            Default locations / years will live here once we add a lightweight config table.
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Admin-only flags</div>
          <div className="mt-2 text-sm text-zinc-600">
            Feature / hide / indexability flags require DB columns. The admin UI is structured to
            accommodate them without redesign.
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Notes</div>
          <div className="mt-2 text-sm text-zinc-700">
            Admin is forced to a neutral light UI (no dark mode styles).
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

