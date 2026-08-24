import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getManagedListing, getTaggableProducts } from "@/lib/db/productTags";
import { PinEditorHost } from "./PinEditorHost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage listing | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * Owner project-management page — v1, PRODUCTS TAB ONLY.
 *
 * Image 1 specifies a seven-tab shell (Overview / Gallery / Products / Drawings
 * / Team / Details / Activity) plus a Manage group. Per the locked scope
 * decision, only the Products tab ships: it is the surface Pinpoint Tagging
 * actually needs, and the investigation confirmed there is no existing
 * per-listing owner page to extend — this is a from-scratch build.
 *
 * The deferred tabs are NOT rendered as disabled stubs. A greyed-out "Drawings"
 * tab reads as broken; its absence reads as not-built-yet, which is the truth.
 *
 * ACCESS: signed in, and either the listing's owner or an admin. Ownership is
 * re-checked inside every Server Action too — this page gate is not the
 * security boundary on its own.
 */
export default async function ManageListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/me/listings/${id}`);

  const profileResult = await getProfileByClerkId(userId);
  const profile = (profileResult?.data ?? null) as { id: string; is_admin?: boolean } | null;
  if (!profile) redirect("/onboarding");

  const [listing, products] = await Promise.all([
    getManagedListing(id, profile.id, profile.is_admin === true),
    getTaggableProducts(),
  ]);

  // Not-found and not-yours are deliberately indistinguishable.
  if (!listing) notFound();

  const pinCount = listing.images.reduce((n, i) => n + i.pins.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/me/listings"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {listing.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="capitalize">{listing.type}</span>
            <span aria-hidden>·</span>
            <span>{listing.status === "APPROVED" ? "Published" : listing.status}</span>
            <span aria-hidden>·</span>
            <span>
              {listing.images.length} {listing.images.length === 1 ? "image" : "images"}
            </span>
            {pinCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {pinCount} {pinCount === 1 ? "pin" : "pins"}
                </span>
              </>
            )}
          </p>
        </div>

        {listing.publicHref && (
          <Link
            href={listing.publicHref}
            target="_blank"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
          >
            View public page
            <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Single tab, present so the shell reads as intentional rather than
          half-finished. The other six from Image 1 are not built. */}
      <nav className="mt-6 border-b border-zinc-200 dark:border-zinc-800" aria-label="Listing sections">
        <span className="inline-block border-b-2 border-zinc-900 px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100">
          Products
        </span>
      </nav>

      <div className="mt-6">
        <p className="mb-5 max-w-[70ch] text-sm text-zinc-600 dark:text-zinc-400">
          Pin the products used in this {listing.type} directly onto your photos. Pins you place
          are marked <strong>Official</strong> and appear on the public page; AI-suggested pins
          stay hidden until you confirm them.
        </p>

        <PinEditorHost
          images={listing.images}
          products={products}
          tagsTableReady={listing.tagsTableReady}
        />
      </div>
    </div>
  );
}
