import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

function seoScore(input: {
  title: string;
  description: string;
  cover: boolean;
  location: boolean;
  year: boolean;
  links: number;
  altCoverage: number; // 0..1
}) {
  let score = 100;
  if (input.title.length < 8) score -= 10;
  if (input.description.length < 40) score -= 20;
  if (!input.cover) score -= 15;
  if (!input.location) score -= 10;
  if (!input.year) score -= 5;
  if (input.links === 0) score -= 15;
  if (input.altCoverage < 0.8) score -= 10;
  score = Math.max(0, Math.min(100, score));
  return score;
}

export default async function AdminSeoQualityPage() {
  const supabase = getSupabaseServiceClient();
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, type, title, description, location, year, cover_image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return (
      <AdminPage title="SEO & Quality">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const ids = (listings ?? []).map((l: any) => l.id as string);
  const [imagesRes, projectLinksRes, productLinksRes] = await Promise.all([
    supabase.from("listing_images").select("listing_id,alt").in("listing_id", ids),
    supabase.from("project_product_links").select("project_id").in("project_id", ids),
    supabase.from("project_product_links").select("product_id").in("product_id", ids),
  ]);

  const altStats: Record<string, { total: number; withAlt: number }> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string; alt: string | null }>) {
    altStats[r.listing_id] = altStats[r.listing_id] ?? { total: 0, withAlt: 0 };
    altStats[r.listing_id].total += 1;
    if (toText(r.alt)) altStats[r.listing_id].withAlt += 1;
  }

  const linkCount: Record<string, number> = {};
  for (const r of (projectLinksRes.data ?? []) as Array<{ project_id: string }>) {
    linkCount[r.project_id] = (linkCount[r.project_id] ?? 0) + 1;
  }
  for (const r of (productLinksRes.data ?? []) as Array<{ product_id: string }>) {
    linkCount[r.product_id] = (linkCount[r.product_id] ?? 0) + 1;
  }

  const rows = (listings ?? []).map((l: any) => {
    const title = toText(l.title);
    const description = toText(l.description);
    const alt = altStats[l.id] ?? { total: 0, withAlt: 0 };
    const altCoverage = alt.total ? alt.withAlt / alt.total : 0;
    const links = linkCount[l.id] ?? 0;
    const score = seoScore({
      title,
      description,
      cover: !!toText(l.cover_image_url),
      location: !!toText(l.location),
      year: !!toText(l.year),
      links,
      altCoverage,
    });
    const missing: string[] = [];
    if (!description) missing.push("description");
    if (!toText(l.cover_image_url)) missing.push("image");
    if (!toText(l.location)) missing.push("location");
    if (!toText(l.year)) missing.push("year");
    if (links === 0) missing.push("links");
    if (altCoverage < 0.8) missing.push("alt");
    return {
      id: l.id as string,
      type: (l.type ?? l.listing_type) as "project" | "product",
      title: title || "—",
      score,
      wordCount: description ? description.split(/\s+/).filter(Boolean).length : 0,
      altCoverage,
      links,
      missing,
    };
  });

  return (
    <AdminPage title="SEO & Quality">
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Listing
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  SEO score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Word count
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Alt coverage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Internal links
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Missing
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      <Link
                        href={r.type === "project" ? `/admin/projects/${r.id}` : `/admin/products/${r.id}`}
                        className="hover:underline"
                      >
                        {r.title}
                      </Link>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">{r.type} • {r.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                        r.score >= 80
                          ? "bg-emerald-50 text-emerald-700"
                          : r.score >= 60
                            ? "bg-amber-50 text-amber-800"
                            : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {r.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.wordCount}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {Math.round(r.altCoverage * 100)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.links}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {r.missing.length ? r.missing.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    <span className="text-zinc-400">Auto tools coming next</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No listings found
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

