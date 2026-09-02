"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { BTN_PILL_SECONDARY, BTN_PILL_MUTED } from "@/components/ui/publicButton";
import { ClaimProfileModal } from "./ClaimProfileModal";

/**
 * The rail's claim control and the dialog behind it.
 *
 * ── STATES, UNCHANGED FROM WHAT THE DATA ALREADY SAID ───────────────────────
 * `claim_status` on the profile is the authority, exactly as before:
 *
 *   unclaimed  -> "Claim Profile", opens the dialog
 *   pending    -> "Claim pending", inert
 *   claimed    -> nothing; the caller passes no claim block at all
 *
 * The pending state is the only visible change. Submitting a claim sets the
 * profile to `pending`, and the rail block used to vanish outright at that
 * point — so the claimant's own successful submission made the section
 * disappear, which reads as a failure. It now says what actually happened.
 * "Pending" is a property of the PROFILE, not of the viewer, so it is honest
 * for every visitor: a claim really is open on it.
 *
 * An owner never sees this: the caller does not render it for them.
 *
 * ── SIGNED OUT ──────────────────────────────────────────────────────────────
 * Unchanged in substance — a claim has always required signing in, and the
 * server action refuses without a session regardless of what the UI does.
 * What changes is where you land afterwards: sign-in returns to the profile
 * with ?claim=1, which reopens this dialog, instead of dropping you on a
 * separate claim page. The parameter is stripped from the URL once consumed so
 * a refresh or a shared link does not reopen it.
 */
export function ClaimProfileCta({
  profileId,
  profileName,
  profileKind,
  state,
  signedOutHref,
}: {
  profileId: string;
  profileName: string;
  profileKind: string;
  state: "unclaimed" | "pending";
  /** Profile URL to return to after sign-in, already ?claim=1 suffixed. */
  signedOutHref: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  /* Reopened after a sign-in round trip. Consumed once, then removed from the
     URL with replaceState so it does not survive a refresh. */
  useEffect(() => {
    if (state !== "unclaimed" || !isLoaded || !isSignedIn) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("claim") !== "1") return;
    url.searchParams.delete("claim");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setOpen(true);
  }, [state, isLoaded, isSignedIn]);

  if (state === "pending") {
    return (
      <span className={`${BTN_PILL_MUTED} mt-4 cursor-default`} aria-disabled="true">
        Claim pending
      </span>
    );
  }

  /* Not signed in — a link, so it works without JS and shows its destination
     on hover. isLoaded is treated as signed-out because Clerk renders nothing
     during SSR here; a signed-in visitor sees the link for a moment and the
     sign-in page would bounce them straight back anyway. */
  if (!isLoaded || !isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(signedOutHref)}`}
        className={`${BTN_PILL_SECONDARY} mt-4`}
      >
        Claim Profile
      </Link>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${BTN_PILL_SECONDARY} mt-4`}
      >
        Claim Profile
      </button>
      <ClaimProfileModal
        open={open}
        onClose={close}
        profileId={profileId}
        profileName={profileName}
        profileKind={profileKind}
        defaultName={user?.fullName?.trim() ?? ""}
        defaultEmail={user?.primaryEmailAddress?.emailAddress ?? ""}
      />
    </>
  );
}
