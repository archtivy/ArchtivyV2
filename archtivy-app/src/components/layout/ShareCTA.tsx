"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ShareWorkChooser } from "@/components/ShareWorkChooser";

import type { ProfileRole } from "@/lib/auth/config";

interface ShareCTAProps {
  userId: string | null;
  role: ProfileRole | undefined;
}

const READER_MESSAGE = "This account type can't share work.";

const SIGN_IN_PROJECT_REDIRECT =
  "/sign-in?redirect_url=" + encodeURIComponent("/add/project");
const SIGN_IN_PRODUCT_REDIRECT =
  "/sign-in?redirect_url=" + encodeURIComponent("/add/product");

export function ShareCTA({ userId, role }: ShareCTAProps) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [showReaderMessage, setShowReaderMessage] = useState(false);

  const handleReaderClick = useCallback(() => {
    setShowReaderMessage(true);
    const t = setTimeout(() => setShowReaderMessage(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const shareButtonClass =
    "inline-flex items-center justify-center rounded-[20px] bg-archtivy-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:focus:ring-offset-zinc-950";

  if (role === "reader") {
    return (
      <div className="relative">
        <Button
          type="button"
          variant="primary"
          onClick={handleReaderClick}
          className="rounded-[20px]"
          aria-describedby={showReaderMessage ? "share-reader-message" : undefined}
        >
          Share your work
        </Button>
        {showReaderMessage && (
          <p
            id="share-reader-message"
            role="alert"
            className="absolute left-0 top-full z-10 mt-2 max-w-[220px] rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
