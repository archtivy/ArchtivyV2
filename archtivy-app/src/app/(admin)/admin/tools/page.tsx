import { AdminPage } from "@/components/admin/AdminPage";
import { RebuildMatchesButton } from "./RebuildMatchesButton";

export default function AdminToolsPage() {
  return (
    <AdminPage title="Tools">
      <p className="mb-4 text-sm text-zinc-600">
        Admin utilities: rebuild matches, bulk import, and more.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RebuildMatchesButton />
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Bulk import</div>
          <div className="mt-1 text-xs text-zinc-500">CSV / JSON (fast content ingestion)</div>
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            UI scaffold is ready. Next step is wiring parsers + validation + insert batching.
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Bulk edit</div>
          <div className="mt-2 text-sm text-zinc-700">
            Bulk year/location is live on Projects/Products. Profile bulk location is live on
            Profiles.
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Feature listings</div>
          <div className="mt-2 text-sm text-zinc-600">
            Requires a DB flag (e.g. `is_featured`) to be added.
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Shadow draft mode</div>
          <div className="mt-2 text-sm text-zinc-600">
            Requires an indexability flag for SEO controls (not yet in schema).
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

