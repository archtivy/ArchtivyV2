"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { RequestInformationModal } from "./RequestInformationModal";

/**
 * "Request Information" on the product detail page.
 *
 * Replaces "Request a Quote", which opened ContactLeadModal — an anonymous
 * form on the legacy palette that asked a signed-in person to type the name
 * and email the session already knows, and whose submission the server had no
 * way to attribute to anyone.
 *
 * ── SIGNED OUT ──────────────────────────────────────────────────────────────
 * A link to sign-in that returns to this product with ?request=1, the same
 * pattern the profile claim CTA uses. The dialog reopens once and the
 * parameter is stripped, so a refresh or a shared link does not reopen it.
 * Rendered as a link rather than a button so it works without JS and shows its
 * destination on hover.
 */
export function RequestInformationButton({
  listingId,
  productTitle,
  brandName,
  coverUrl,
  productPath,
}: {
  listingId: string;
  productTitle: string;
  brandName: string | null;
  coverUrl: string | null;
  /** Canonical path of this product, for the sign-in return. */
  productPath: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("request") !== "1") return;
    url.searchParams.delete("request");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setOpen(true);
  }, [isLoaded, isSignedIn]);

  const CLS =
    "inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50";

  if (!isLoaded || !isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(`${productPath}?request=1`)}`}
        className={CLS}
      >
        Request Information
        <Mail strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </Link>
    );
  }

  const full = user?.fullName?.trim() || "";
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={CLS}
      >
        Request Information
        <Mail strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </button>

      <RequestInformationModal
        open={open}
        onClose={close}
        listingId={listingId}
        productTitle={productTitle}
        brandName={brandName}
        coverUrl={coverUrl}
        viewer={{
          name: full || user?.primaryEmailAddress?.emailAddress || "your account",
          avatarUrl: user?.imageUrl ?? null,
          firstName: user?.firstName?.trim() || full.split(" ")[0] || "",
          lastName: user?.lastName?.trim() || full.split(" ").slice(1).join(" ") || "",
        }}
      />
    </>
  );
}
