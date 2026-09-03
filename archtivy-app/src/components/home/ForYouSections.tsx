"use client";

import { useEffect, useState } from "react";
import { ListingCardShared, type ListingCardModel } from "@/components/listing/ListingCardShared";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";

/**
 * The personalized part of the homepage.
 *
 * ── WHY THIS IS CLIENT-FETCHED ──────────────────────────────────────────────
 * The homepage is statically rendered with `revalidate = 3600`, and that is
 * worth keeping: it is the first page most visitors see and the overwhelming
 * majority of them are signed out. Making it dynamic to personalize it would
 * cost every anonymous visitor a server render to deliver nothing.
 *
 * So the editorial page stays cached and identical for everyone, and this
 * fetches after hydration for signed-in viewers only. Signed-out visitors get
 * one 200 with an empty body and render nothing at all — no layout shift, no
 * skeleton for a feature they do not have.
 *
 * ── IT IS ALLOWED TO RENDER NOTHING ─────────────────────────────────────────
 * Every section can decline to appear, and so can this whole block. A new
 * account with no follows, no saves and no city sees the homepage exactly as
 * it is today, which is the correct cold-start experience for an editorial
 * platform — not an empty "For you" heading.
 *
 * ── NO NEW CARD ─────────────────────────────────────────────────────────────
 * ListingCardShared, unmodified, in the same grid the product and project
 * rails use. Personalization changes WHICH listings appear, never how one
 * looks.
 */

interface FeedItem {
  model: ListingCardModel;
  contextLabel: string | null;
}

interface FeedSection {
  key: string;
  title: string;
  subtitle: string | null;
  items: FeedItem[];
}

export function ForYouSections() {
  const [sections, setSections] = useState<FeedSection[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/home/for-you", { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { sections?: FeedSection[] } | null) => {
        if (controller.signal.aborted) return;
        setSections(Array.isArray(json?.sections) ? json!.sections! : []);
      })
      .catch(() => {
        /* Personalization is an enhancement over an editorial page that is
           already complete. If it cannot load, the reader loses nothing they
           can see, so there is no error state to show them. */
      });
    return () => controller.abort();
  }, []);

  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <section key={section.key} className="mt-20" aria-label={section.title}>
          <HomeSectionHeader title={section.title} />
          {section.subtitle && (
            <p className="-mt-4 mb-6 font-body text-[13px] text-muted">{section.subtitle}</p>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {section.items.map((item) => (
              <div key={item.model.id}>
                <ListingCardShared model={item.model} />
                {/*
                  ── THE QUIET PART ────────────────────────────────────────
                  At most one short line, under the card rather than badged
                  over the image, and only on the minority of items that have
                  a reason worth stating. The API returns null for most of
                  them by design: a feed where every card explains itself
                  reads as an algorithm justifying its choices, which is the
                  opposite of the editorial tone this platform holds.
                */}
                {item.contextLabel && (
                  <p className="mt-2 font-body text-[11.5px] leading-[16px] text-muted">
                    {item.contextLabel}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
