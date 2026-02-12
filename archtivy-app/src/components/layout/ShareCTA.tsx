"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";

import type { ProfileRole } from "@/lib/auth/config";

interface ShareCTAProps {
  userId: string | null;
  role: ProfileRole | undefined;
}

const READER_MESSAGE = "This account type can't share work.";

export function ShareCTA({ userId, role }: ShareCTAProps) {
  const [showReaderMessage, setShowReaderMessage] = useState(false);

  const handleReaderClick = useCallback(() => {
    setShowReaderMessage(true);
    const t = setTimeout(() => setShowReaderMessage(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const shareButtonClass =
    "inline-flex items-center justify-center rounded-[20px] bg-archtivy-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:focus:ring-offset-zinc-950";

  if (!userId) {
    return (
      <Link href="/sign-in?from=share" className={shareButtonClass}>
        Share your work
      </Link>
    );
  }

  if (role === "designer") {
    return (
      <Button
        as="link"
        href="/add/project"
        variant="primary"
        className="rounded-[20px]"
      >
        Share your work
      </Button>
    );
  }

  if (role === "brand") {
    return (
      <Button
        as="link"
        href="/add/product"
        variant="primary"
        className="rounded-[20px]"
      >
        Share your work
      </Button>
    );
  }

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
    <Button
      as="link"
      href="/sign-in?from=share"
      variant="primary"
      className="rounded-[20px]"
    >
      Share your work
    </Button>
  );
}
