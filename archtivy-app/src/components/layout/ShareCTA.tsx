"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ShareWorkChooser } from "@/components/ShareWorkChooser";

import type { ProfileRole } from "@/lib/auth/config";

interface ShareCTAProps {
  userId: string | null;
  role: ProfileRole | undefined;
  /**
   * How the button looks. Behaviour is identical either way.
   *
   * ── WHY A PROP AND NOT A RESTYLE ──────────────────────────────────────────
   * This component is rendered in six places, including TopNav and the explore
   * tool header, where the accent pill is correct and expected. On a quiet
   * cream corporate page the same saturated pill is the loudest thing on the
   * screen — the "bright blue SaaS button" those pages are meant not to have.
   *
   * Restyling the component would have changed the product chrome everywhere;
   * replacing it on corporate pages would have thrown away its actual work
   * (reader-role gating, the sign-in redirects, the project/product chooser).
   * So appearance is a parameter and every existing call site keeps its
   * default.
   */
  tone?: "accent" | "editorial";
}

const READER_MESSAGE = "This account type can't share work.";

const SIGN_IN_PROJECT_REDIRECT =
  "/sign-in?redirect_url=" + encodeURIComponent("/add/project");
const SIGN_IN_PRODUCT_REDIRECT =
  "/sign-in?redirect_url=" + encodeURIComponent("/add/product");

export function ShareCTA({ userId, role, tone = "accent" }: ShareCTAProps) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [showReaderMessage, setShowReaderMessage] = useState(false);

  const handleReaderClick = useCallback(() => {
    setShowReaderMessage(true);
    const t = setTimeout(() => setShowReaderMessage(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const shareButtonClass =
    tone === "editorial"
      ? "inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 font-body text-[14px] text-cream transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-archtivy-primary focus-visible:ring-offset-2"
      : "inline-flex items-center justify-center rounded-[20px] bg-archtivy-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2";

  if (role === "reader") {
    return (
      <div className="relative">
        <Button
          type="button"
          variant="primary"
          onClick={handleReaderClick}
          className={tone === "editorial" ? "rounded-full px-6 py-3" : "rounded-[20px]"}
          aria-describedby={showReaderMessage ? "share-reader-message" : undefined}
        >
          Share your work
        </Button>
        {showReaderMessage && (
          <p
            id="share-reader-message"
            role="alert"
            className="absolute left-0 top-full z-10 mt-2 max-w-[220px] rounded-lg border border-hairline bg-white px-3 py-2 font-body text-[13px] text-ink shadow-[0_8px_24px_rgba(22,22,22,0.10)]"
          >
            {READER_MESSAGE}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setChooserOpen(true)}
        className={shareButtonClass}
      >
        Share your work
      </button>
      <ShareWorkChooser
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        projectHref={userId ? "/add/project" : SIGN_IN_PROJECT_REDIRECT}
        productHref={userId ? "/add/product" : SIGN_IN_PRODUCT_REDIRECT}
      />
    </>
  );
}
