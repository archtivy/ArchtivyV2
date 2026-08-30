import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getDownloadsForProfile } from "@/lib/db/documentDownloads";
import { HomeNav } from "@/components/home/HomeNav";
import { FilesSidebar, type FacetValue } from "@/components/files/FilesSidebar";
import { FilesMobileNav } from "@/components/files/FilesMobileNav";
import { FilesControls } from "@/components/files/FilesControls";
import { FilesTable } from "@/components/files/FilesTable";
import { parseFilesParams, filesHref, hasActiveFileFilters, WINDOW_DAYS } from "@/lib/files/params";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";

export const metadata: Metadata = {
  title: "Your files | Archtivy",
  robots: { index: false, follow: false },
};

/** A personal, current list — never a cached one. */
export const dynamic = "force-dynamic";

/**
 * /me/files — everything this user has downloaded, with re-download access.
 *
 * ── THE LEDGER IS REAL ──────────────────────────────────────────────────────
 * document_downloads records profile, document, listing, denormalised names and
 * a timestamp, written by /api/documents/download AFTER the signed URL succeeds
 * — so a file only enters history if the user actually received it, and a
 * logging failure can never cost anyone their download.
 *
 * ── NO STORED LINKS ─────────────────────────────────────────────────────────
 * Signed storage URLs expire after 60 seconds, so nothing here links to a file
 * directly. Every button re-authorises through the same route the original
 * download used, which means access is re-checked at click time. If a brand
 * revokes something, this page stops working for it immediately.
 *
 * ── WHAT THE MOCKUP DREW THAT THE DATA CANNOT SUPPORT ───────────────────────
 * Checked against the live schema before building, and omitted rather than
 * faked. Each omission is noted where the component would have rendered it:
 *
 *   Collections, Trash   no table exists for either
 *   CAD / Image facets   every document is PDF (50) or ZIP (11)
 *   Size column          size_bytes NULL on all 61 rows -> the column renders
 *                        only when a row in view has one, so the proposed
 *                        backfill turns it on with no code change
 *   Grid toggle          preview_image_path NULL on all 61 -> a grid of
 *                        identical file icons
 *   Pagination           the largest history on the platform is 4 files
 *   Project facet        60 of 61 documents hang off a product, one off a
 *                        project; folded into Source
 *
 * Filtering runs on the server from URL state, so first paint is already
 * filtered and back/forward restore it exactly.
 */
export default async function MyFilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/files");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) redirect("/onboarding");

  const params = parseFilesParams(await searchParams);
  const { data: all, error, tableMissing } = await getDownloadsForProfile(profile.id);

  // Facets are built from THIS user's own files, so every value leads to at
  // least one row and a filter can never return an empty table by itself.
  const formatCounts = new Map<string, number>();
  const sourceMap = new Map<string, FacetValue>();
  for (const f of all) {
    if (f.format) formatCounts.set(f.format, (formatCounts.get(f.format) ?? 0) + 1);
    if (f.source?.href) {
      const key = f.source.href;
      const existing = sourceMap.get(key);
      if (existing) existing.count += 1;
      else
        sourceMap.set(key, {
          value: key,
          label: f.source.name,
          count: 1,
          avatarUrl: f.source.avatarUrl,
          role: f.source.role,
        });
    }
  }
  const formats: FacetValue[] = [...formatCounts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const sources = [...sourceMap.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );

  const days = WINDOW_DAYS[params.window];
  const cutoff = days ? Date.now() - days * 86_400_000 : null;
  const recentCount = all.filter(
    (f) => Date.parse(f.downloadedAt) >= Date.now() - 30 * 86_400_000
  ).length;

  let files = all;
  if (cutoff !== null) files = files.filter((f) => Date.parse(f.downloadedAt) >= cutoff);
  if (params.format !== "all") files = files.filter((f) => f.format === params.format);
  if (params.source !== "all") files = files.filter((f) => f.source?.href === params.source);
  if (params.q) {
    const needle = params.q.toLowerCase();
    files = files.filter((f) =>
      [f.fileName, f.listingTitle, f.source?.name, f.format]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }

  files = [...files].sort((a, b) => {
    if (params.sort === "name") return a.fileName.localeCompare(b.fileName);
    if (params.sort === "oldest") return a.downloadedAt.localeCompare(b.downloadedAt);
    return b.downloadedAt.localeCompare(a.downloadedAt);
  });

  const sidebarProps = {
    params,
    total: all.length,
    recentCount,
    formats,
    sources,
  };

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* The canonical header, not the one drawn in the mockup. */}
      <HomeNav variant="solid" />

      <div className="mx-auto flex w-full max-w-[1600px] gap-10 px-4 pb-24 pt-[92px] sm:px-6 lg:px-8">
        <aside className="hidden w-[264px] shrink-0 lg:block">
          <div className="sticky top-[92px] border-r border-hairline pr-6">
            <FilesSidebar {...sidebarProps} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[32px] leading-[40px] tracking-[-0.01em] text-ink">
                All Files
              </h1>
              {all.length > 0 && (
                <span className="rounded-full bg-stone/70 px-3 py-1 font-body text-[13px] text-ink">
                  {all.length} {all.length === 1 ? "file" : "files"}
                </span>
              )}
              <span className="ml-auto">
                <FilesMobileNav {...sidebarProps} />
              </span>
            </div>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[24px] text-muted">
              Spec sheets, catalogues and drawings you&rsquo;ve downloaded from brand and
              designer pages. Downloading again always fetches the current version.
            </p>
          </header>

          {tableMissing ? (
            <p className="font-body text-[14px] text-muted">
              Download history isn&rsquo;t set up on this environment yet.
            </p>
          ) : error ? (
            <p className="font-body text-[14px] text-muted">
              Your files couldn&rsquo;t be loaded just now. Try again shortly.
            </p>
          ) : all.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-body text-[15px] text-ink">
                You haven&rsquo;t downloaded anything yet.
              </p>
              <p className="mt-2 font-body text-[14px] text-muted">
                Spec sheets and catalogues you download from a product or project appear here.
              </p>
              <Link href="/products" className={`${BTN_PILL_SECONDARY} mt-6`}>
                Browse products
              </Link>
            </div>
          ) : (
            <>
              <FilesControls params={params} sources={sources} />
              <div className="mt-8">
                {files.length > 0 ? (
                  <FilesTable files={files} />
                ) : (
                  <div className="py-16 text-center">
                    <p className="font-body text-[15px] text-ink">
                      {params.q
                        ? `No files match "${params.q}".`
                        : "No files match these filters."}
                    </p>
                    {hasActiveFileFilters(params) && (
                      <Link
                        href={filesHref({
                          q: "",
                          format: "all",
                          source: "all",
                          window: "all",
                          sort: params.sort,
                        })}
                        scroll={false}
                        className="mt-4 inline-block font-body text-[14px] text-muted underline underline-offset-4 hover:text-ink"
                      >
                        Clear filters
                      </Link>
                    )}
                  </div>
                )}
              </div>
              {files.length > 0 && (
                <p className="mt-6 font-body text-[13px] text-muted">
                  {/* The reference's "Showing 1-20 of 128" over page numbers.
                      There is no pagination because there is nothing to
                      paginate — the count is stated plainly instead. */}
                  Showing {files.length} of {all.length}{" "}
                  {all.length === 1 ? "file" : "files"}
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
