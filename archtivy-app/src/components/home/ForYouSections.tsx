"use client";

import { useEffect, useRef, useState } from "react";
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
 *
 * ── #for-you HAD NOWHERE TO LAND ────────────────────────────────────────────
 * The interest digest links to `/?ref=interest-digest#for-you`, and nothing in
 * the document carried that id — so the browser had no fragment to resolve,
 * scrolled nowhere, and the notification read as broken even when the feed
 * below was rendering correctly. The band now owns the anchor, and brings
 * itself into view once its content exists.
 *
 * The timing is the whole difficulty: the fragment is resolved by the browser
 * during load, long before this component has finished fetching, so by the
 * time the sections exist the browser has already given up on the hash. The
 * scroll therefore happens after the first render that has something to show,
 * not on mount.
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
  const containerRef = useRef<HTMLDivElement>(null);
  /** Guards against re-scrolling on every later render. */
  const honouredHash = useRef(false);

  /*
   * Bring the band into view when the page was opened at #for-you.
   *
   * Runs after the sections land rather than on mount, because the fragment is
   * resolved during document load — before this component has fetched anything
   * — and an anchor that does not exist yet is simply ignored by the browser.
   *
   * `hashchange` is listened to as well so that arriving at #for-you from an
   * in-page link, or via browser back/forward between `/` and `/#for-you`,
   * behaves the same as a fresh load. Nothing happens on a plain `/`.
   */
  useEffect(() => {
    if (!sections || sections.length === 0) return;

    const jump = (smooth: boolean) => {
      if (window.location.hash !== "#for-you") return;
      const el = containerRef.current;
      if (!el) return;
      // Honour prefers-reduced-motion: an unexpected smooth scroll on a long
      // editorial page is exactly what that setting exists to prevent.
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "auto", block: "start" });
    };

    if (!honouredHash.current) {
      honouredHash.current = true;
      jump(true);
    }

    const onHashChange = () => jump(true);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [sections]);

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
    /*
     * `scroll-mt-[92px]` clears the fixed 72px header plus a little air, so a
     * hash landing puts the heading below the nav instead of behind it.
     */
    <div id="for-you" ref={containerRef} className="scroll-mt-[92px]">
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
    </div>
  );
}
