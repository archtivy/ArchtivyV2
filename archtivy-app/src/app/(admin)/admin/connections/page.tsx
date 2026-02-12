import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { linkProjectProduct, unlinkProjectProduct } from "@/app/(admin)/admin/_actions/connections";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminConnectionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = getSupabaseServiceClient();
  const projectId = toText(searchParams.projectId);
  const productId = toText(searchParams.productId);

  let q = supabase
    .from("project_product_links")
    .select("project_id,product_id,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (projectId) q = q.eq("project_id", projectId);
  if (productId) q = q.eq("product_id", productId);

  const { data: links, error } = await q;
  if (error) {
    return (
      <AdminPage title="Connections">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const projectIds = Array.from(new Set((links ?? []).map((l) => l.project_id).filter(Boolean)));
  const productIds = Array.from(new Set((links ?? []).map((l) => l.product_id).filter(Boolean)));

  const [{ data: projects }, { data: products }] = await Promise.all([
    supabase.from("listings").select("id,title").in("id", projectIds),
    supabase.from("listings").select("id,title").in("id", productIds),
  ]);
  const projectTitle = new Map((projects ?? []).map((p: any) => [p.id, toText(p.title) || "—"]));
  const productTitle = new Map((products ?? []).map((p: any) => [p.id, toText(p.title) || "—"]));

  async function unlinkAction(formData: FormData) {
    "use server";
    const projectId = toText(formData.get("project_id"));
    const productId = toText(formData.get("product_id"));
    const res = await unlinkProjectProduct({ projectId, productId });
    if (!res.ok) throw new Error(res.error);
  }

  async function create(formData: FormData) {
    "use server";
    const projectId = toText(formData.get("project_id"));
    const productId = toText(formData.get("product_id"));
    if (!projectId || !productId) throw new Error("Missing IDs");
    const res = await linkProjectProduct({ projectId, productId });
    if (!res.ok) throw new Error(res.error);
  }

  return (
    <AdminPage title="Connections">
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Manual linking</div>
          <div className="mt-1 text-xs text-zinc-500">
            Paste IDs for speed. Suggestions/AI scoring can be layered on later.
          </div>
          <form action={async (fd) => { await create(fd); }} className="mt-3 flex flex-wrap items-center gap-2">
            <input
              name="project_id"
              defaultValue={projectId}
              placeholder="Project ID"
              className="h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <input
              name="product_id"
              defaultValue={productId}
              placeholder="Product ID"
              className="h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <button
              type="submit"
              className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:opacity-90"
            >
              Link
            </button>
          </form>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Connection model</div>
          <div className="mt-2 text-sm text-zinc-700">
            <div className="mb-1">
              <span className="font-medium">Match strength</span>: placeholder (100)
            </div>
            <div>
              <span className="font-medium">Source</span>: Manual (AI suggestions coming later)
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Project → Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Strength
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(links ?? []).map((l: any) => (
                <tr key={`${l.project_id}:${l.product_id}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      <Link href={`/admin/projects/${l.project_id}`} className="hover:underline">
                        {projectTitle.get(l.project_id) ?? "—"}
                      </Link>
                      <span className="mx-2 text-zinc-400">→</span>
                      <Link href={`/admin/products/${l.product_id}`} className="hover:underline">
                        {productTitle.get(l.product_id) ?? "—"}
                      </Link>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {l.project_id} → {l.product_id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">100</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">Manual</td>
                  <td className="px-4 py-3">
                    <form action={unlinkAction}>
                      <input type="hidden" name="project_id" value={l.project_id} />
                      <input type="hidden" name="product_id" value={l.product_id} />
                      <button type="submit" className="text-sm font-medium text-zinc-700 hover:underline">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {(links ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No connections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPage>
  );
}

