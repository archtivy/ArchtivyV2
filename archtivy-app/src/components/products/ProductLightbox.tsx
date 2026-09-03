"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ExternalLink, Send } from "lucide-react";
import { LightboxShell } from "@/components/lightbox/LightboxShell";
import { DiscoveryFeed } from "@/components/lightbox/DiscoveryFeed";
import { useImageDiscovery } from "@/components/lightbox/useImageDiscovery";
import { ContactLeadModal } from "@/components/listing/ContactLeadModal";
import { SaveToggle } from "@/components/home/SaveToggle";
import type { GalleryImage } from "@/components/entity/Gallery";

/**
 * The Product Lightbox — the shared immersive shell, plus a product panel.
 *
 * ── THE PANEL IS IDENTITY, THREE ACTIONS, THEN DISCOVERY ────────────────────
 * The approved design gives the right-hand column to the product's name, its
 * publisher, one row of actions, and then a continuous feed of visually
 * similar products. That is all of it.
 *
 * What was here before — category, materials, dimensions, colours, designers,
 * "Used in N projects", "More from <brand>" — has not been lost, only stopped
 * being said twice: every one of those rows is on the product page directly
 * underneath this overlay, in the specification block and the rails. A
 * lightbox that reprinted the page it is covering was competing with the
 * photograph for the column.
 *
 * There is deliberately no price anywhere. No listing on Archtivy carries one,
 * and a specification platform is not a shop.
 *
 * ── NO OBJECT CLICKING HERE ─────────────────────────────────────────────────
 * A product photograph has one subject and the reader is already on its page,
 * so no regions are requested and no boxes are drawn. The discovery model is
 * simply: this product → products that currently look like it.
 *
 * `exact` is always empty on this surface — "used in this project" is a claim
 * only a project can make — so the feed renders suggestions alone. It is still
 * the same component with the same separation, so the day a product photo
 * carries a confirmed pin it is already handled.
 */

export interface ProductLightboxProps {
  open: boolean;
  onClose: () => void;
  startIndex: number;
  images: GalleryImage[];
  title: string;
  shareUrl: string;
  listingId: string;
  initialSaved?: boolean;

  /** The publisher line under the title. */
  brandName: string | null;
  brandHref: string | null;
  brandLocation: string | null;
  year: number | null;

  /**
   * Where "Visit website" goes, already resolved and normalised by the page:
   * the product's own URL when it has one, the brand's homepage otherwise,
   * and null when neither is a usable absolute URL. Never re-derived here —
   * two answers to "which website" is the bug this once had.
   */
  websiteHref: string | null;
  websiteLabel: string | null;
}

export function ProductLightbox(props: ProductLightboxProps) {
  const {
    open,
    onClose,
    startIndex,
    images,
    title,
    shareUrl,
    listingId,
    initialSaved,
    brandName,
    brandHref,
    brandLocation,
    year,
    websiteHref,
    websiteLabel,
  } = props;

  const subtitle =
    [brandName, brandLocation, year != null ? String(year) : null].filter(Boolean).join(" · ") ||
    null;

  /* One fetch per photograph, held here rather than in the panel, which the
     shell renders twice — once as the xl column, once inside the sub-xl sheet. */
  const [activeImageId, setActiveImageId] = useState<string | undefined>(undefined);
  const { data, loading } = useImageDiscovery(activeImageId);
  const onActiveImageChange = useCallback((image: GalleryImage) => {
    setActiveImageId(image.id);
  }, []);

  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <LightboxShell
        open={open}
        onClose={onClose}
        startIndex={startIndex}
        images={images}
        title={title}
        shareUrl={shareUrl}
        listingId={listingId}
        entityType="product"
        initialSaved={initialSaved}
        subtitle={subtitle}
        /* The panel owns Save now, so the shell must not draw a second one.
           Share and Fullscreen are untouched. */
        showSave={false}
        onActiveImageChange={onActiveImageChange}
        sidebar={({ close }) => (
          <>
            <ProductIdentity
              title={title}
              brandName={brandName}
              brandHref={brandHref}
              listingId={listingId}
              initialSaved={initialSaved}
              websiteHref={websiteHref}
              websiteLabel={websiteLabel}
              onMessage={() => setContactOpen(true)}
              onNavigate={close}
            />
            <DiscoveryFeed
              loading={loading}
              exact={[]}
              similar={data?.room.similar ?? []}
              mode="room"
              variant="detailed"
              title="Similar products"
              subtitle="Pieces that currently look closest to this one."
              moreLabel="Explore more similar products"
              onNavigate={close}
            />
          </>
        )}
      />

      {/*
       * "Message" is the platform's existing enquiry pipeline — the same modal,
       * the same POST /api/leads, the same /admin/leads moderation queue that
       * the product page's own button uses. Nothing second was built for it.
       *
       * Rendered OUTSIDE LightboxShell so it is not inside the shell's focus
       * trap, which would otherwise fight the dialog for focus.
       */}
      <ContactLeadModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        listingId={listingId}
        listingType="product"
        listingTitle={title}
        kind="contact"
      />
    </>
  );
}

function ProductIdentity({
  title,
  brandName,
  brandHref,
  listingId,
  initialSaved,
  websiteHref,
  websiteLabel,
  onMessage,
  onNavigate,
}: {
  title: string;
  brandName: string | null;
  brandHref: string | null;
  listingId: string;
  initialSaved?: boolean;
  websiteHref: string | null;
  websiteLabel: string | null;
  onMessage: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[26px] leading-[32px] tracking-tight text-white">{title}</h2>

      {brandName && (
        <p className="mt-1.5 font-body text-[14px] text-white/50">
          by{" "}
          {brandHref ? (
            <Link
              href={brandHref}
              onClick={onNavigate}
              className="underline-offset-4 transition-colors hover:text-white/85 hover:underline"
            >
              {brandName}
            </Link>
          ) : (
            brandName
          )}
        </p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        {/* The platform's one save mechanism, in its inline form because here
            it is a primary action rather than an overlay on a photograph. */}
        <span className="flex items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-2 py-2.5 transition-colors hover:bg-white/[0.07] [&_button]:!text-white/85">
          <SaveToggle
            listingId={listingId}
            entityType="product"
            entityTitle={title}
            initialSaved={initialSaved}
            variant="inline"
            align="left"
            tone="dark"
          />
        </span>

        <ActionButton onClick={onMessage} icon={<Send strokeWidth={1.5} className="h-4 w-4" />}>
          Message
        </ActionButton>

        {/*
         * Rendered only with a real destination. The page resolves it through
         * normaliseExternalUrl, which returns null for anything it cannot make
         * into a safe absolute URL — so a stored value like "archtivy.com"
         * declines to render rather than resolving as a relative path and 404ing.
         */}
        {websiteHref ? (
          <ActionButton
            href={websiteHref}
            icon={<ExternalLink strokeWidth={1.5} className="h-4 w-4" />}
            ariaLabel={websiteLabel ?? "Visit website"}
          >
            Visit website
          </ActionButton>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  icon,
  onClick,
  href,
  ariaLabel,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
}) {
  const className =
    "flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.09] bg-white/[0.035] px-2 py-2.5 font-body text-[12.5px] text-white/85 transition-colors hover:bg-white/[0.07]";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        aria-label={ariaLabel}
        className={className}
      >
        <span className="shrink-0 text-white/60">{icon}</span>
        <span className="truncate">{children}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
      <span className="shrink-0 text-white/60">{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}
