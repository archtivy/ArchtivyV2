import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getManagedListing, getTaggableProducts } from "@/lib/db/productTags";
import { PinEditor } from "./PinEditor";
import { SitePage } from "@/components/layout/SitePage";
import { PageHeading } from "@/components/layout/PageHeading";

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
    <SitePage>
      <PageHeading
        eyebrow={
          <Link
            href="/me/listings"
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" />
            Listings
          </Link>
        }
        title={listing.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
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
          </span>
        }
        actions={
          listing.publicHref && (
            <Link
              href={listing.publicHref}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 px-4 py-2 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
            >
              View public page
              <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />

      {/* Single tab, present so the shell reads as intentional rather than
          half-finished. The other six from Image 1 are not built. */}
      <nav className="mt-8 border-b border-hairline" aria-label="Listing sections">
        <span className="-mb-px inline-block border-b-2 border-ink px-3 py-2 font-body text-[14px] text-ink">
          Products
        </span>
      </nav>

      <div className="mt-6">
        <p className="mb-5 max-w-[70ch] font-body text-[15px] leading-relaxed text-muted">
          Pin the products used in this {listing.type} directly onto your photos. Pins you place
          are marked <strong className="font-medium text-ink">Official</strong> and appear on the
          public page; AI-suggested pins stay hidden until you confirm them.
        </p>

        <PinEditor
          images={listing.images}
          products={products}
          tagsTableReady={listing.tagsTableReady}
        />
      </div>
    </SitePage>
  );
}
