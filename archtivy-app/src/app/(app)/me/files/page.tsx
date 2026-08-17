import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getDownloadsForProfile } from "@/lib/db/documentDownloads";
import { HomeNav } from "@/components/home/HomeNav";

export const metadata: Metadata = {
  title: "Your files | Archtivy",
  robots: { index: false, follow: false },
};

// The whole point is a personal, current list — never a cached one.
export const dynamic = "force-dynamic";

/**
 * /me/files — everything this user has downloaded, with re-download access.
 *
 * ── NO STORED LINKS ─────────────────────────────────────────────────────────
 * Signed storage URLs expire after 60 seconds, so nothing here links to a file
 * directly. Every button re-authorises through /api/documents/download, the
 * same route the original download used — which means access is re-checked at
 * click time rather than inherited from whenever the file was first fetched.
 * If a brand revokes something, this page stops working for it immediately,
 * which is the correct behaviour.
 *
 * ── HONEST DEGRADATION ──────────────────────────────────────────────────────
 * A document that has since been deleted, or whose listing was removed or
 * unpublished, stays listed and says "No longer available" instead of
 * disappearing or 404ing. The file name and listing title are denormalised at
 * download time precisely so that row is still readable once the source is gone.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function extensionOf(name: string): string {
  const ext = name.split(".").pop();
  return ext && ext.length <= 5 ? ext.toUpperCase() : "FILE";
}

export default async function MyFilesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/files");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) redirect("/onboarding");

  const { data: files, error, tableMissing } = await getDownloadsForProfile(profile.id);

  return (
    <div className="min-h-screen bg-cream">
      <HomeNav variant="solid" />
      <main className="mx-auto max-w-content px-4 pb-24 pt-[120px] md:px-12">
        <header className="max-w-2xl">
          <h1 className="font-display text-[32px] font-medium tracking-tight text-ink">
            Your files
          </h1>
          <p className="mt-3 font-body text-[16px] leading-relaxed text-muted">
            Spec sheets, catalogues and drawings you&rsquo;ve downloaded from brand and
            designer pages. Downloading again always fetches the current version.
          </p>
        </header>

        <div className="mt-10">
          {tableMissing ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
              <p className="font-body text-[15px] font-medium text-amber-900">
                Download history isn&rsquo;t switched on yet.
              </p>
              <p className="mt-1 font-body text-[14px] leading-relaxed text-amber-800">
                Downloads work as normal — they just aren&rsquo;t being recorded here
                until the tracking migration is applied.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/60 px-5 py-4 font-body text-[14px] text-red-700">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-white px-6 py-16 text-center">
              <p className="font-body text-[16px] font-medium text-ink">No files yet</p>
              <p className="mx-auto mt-2 max-w-sm font-body text-[14px] leading-relaxed text-muted">
                When you download a spec sheet or catalogue from a product or project
                page, it&rsquo;ll appear here so you can find it again.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-opacity hover:opacity-90"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-hairline bg-white">
              {files.map((f) => (
                <li
                  key={f.listingDocumentId ?? `${f.fileName}-${f.downloadedAt}`}
                  className="flex flex-wrap items-center gap-4 border-b border-hairline/60 px-5 py-4 last:border-0"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone/40 text-muted"
                    aria-hidden
                  >
                    <FileText strokeWidth={1.5} className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[15px] font-medium text-ink">
                      {f.fileName}
                    </p>
                    <p className="mt-0.5 font-body text-[13px] text-muted">
                      {[
                        extensionOf(f.fileName),
                        f.listingTitle,
                        `Downloaded ${formatDate(f.downloadedAt)}`,
                        f.downloadCount > 1 ? `${f.downloadCount} times` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  {f.stillAvailable && f.listingDocumentId && f.listingId ? (
                    <a
                      href={`/api/documents/download?docId=${encodeURIComponent(
                        f.listingDocumentId
                      )}&listingId=${encodeURIComponent(f.listingId)}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink/20 px-4 py-2 font-body text-[13px] font-medium text-ink transition-colors hover:bg-stone/40"
                    >
                      <Download strokeWidth={1.5} className="h-4 w-4" />
                      Download
                    </a>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-stone/40 px-3 py-1.5 font-body text-[12px] text-muted">
                      No longer available
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
