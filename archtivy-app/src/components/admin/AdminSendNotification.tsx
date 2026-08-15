"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import { SURFACE, INPUT, BTN_PRIMARY, BTN_SECONDARY, TYPE } from "@/components/admin/ui/tokens";

/**
 * Admin notification composer.
 *
 * ── WHAT WAS ALREADY HERE ───────────────────────────────────────────────────
 * Admin-authored notifications already worked, to ONE profile at a time. The
 * notifications table has a `source` column with 'admin' as a valid value, and
 * three real admin rows already exist in production. Nothing about delivery
 * needed building: the bell, the dropdown and /me/notifications render whatever
 * is in the table, regardless of who wrote it.
 *
 * ── WHAT IS NEW ─────────────────────────────────────────────────────────────
 * Audience selection. A send can now target one profile, a role segment, or
 * every reachable profile — resolved server-side into a recipient list and
 * written through the same createNotification() call as before. One insert path,
 * N rows, sharing a group_key so the history can collapse them again.
 *
 * The preview is not decoration. A broadcast cannot be undone, so the exact
 * text and the real recipient count are shown before the button is armed.
 */

interface ProfileOption {
  id: string;
  display_name: string | null;
  username: string | null;
}

type Audience = "profile" | "role" | "all";

const MAX_TITLE = 120;
const MAX_BODY = 280;

const ROLE_OPTIONS = [
  { value: "designer", label: "All designers" },
  { value: "brand", label: "All brands" },
  { value: "reader", label: "All readers" },
] as const;

export function AdminSendNotification({ onSent }: { onSent?: () => void }) {
  const [audience, setAudience] = useState<Audience>("profile");
  const [audienceRole, setAudienceRole] = useState<string>("designer");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  /** Broadcasts require a second, explicit confirmation. */
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/profiles?q=${encodeURIComponent(query.trim())}&page=1`)
        .then((r) => r.json())
        .then((json) => {
          setResults(((json.data ?? []) as ProfileOption[]).slice(0, 8));
          setShowResults(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Changing the audience invalidates a staged confirmation — otherwise you
  // could confirm "all designers" and then send to everyone.
  useEffect(() => setConfirming(false), [audience, audienceRole, selectedProfile]);

  const selectProfile = useCallback((p: ProfileOption) => {
    setSelectedProfile(p);
    setQuery(p.display_name?.trim() || p.username || p.id);
    setShowResults(false);
  }, []);

  const clearRecipient = () => {
    setSelectedProfile(null);
    setQuery("");
  };

  const isBroadcast = audience !== "profile";
  const audienceLabel =
    audience === "profile"
      ? selectedProfile
        ? selectedProfile.display_name?.trim() || selectedProfile.username || "one profile"
        : "no one yet"
      : audience === "all"
        ? "every reachable profile"
        : ROLE_OPTIONS.find((r) => r.value === audienceRole)?.label.toLowerCase() ?? audienceRole;

  const reset = () => {
    setTitle("");
    setBody("");
    setCtaLabel("");
    setCtaUrl("");
    setPriority("normal");
    setConfirming(false);
    clearRecipient();
  };

  const send = async () => {
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          audience_role: audience === "role" ? audienceRole : undefined,
          recipient_profile_id: audience === "profile" ? selectedProfile?.id : undefined,
          title: title.trim(),
          body: body.trim(),
          cta_label: ctaLabel.trim() || undefined,
          cta_url: ctaUrl.trim() || undefined,
          priority,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to send.");
        return;
      }
      setSuccess(
        json.partial
          ? `Sent to ${json.sent} of ${json.sent + json.failed} — ${json.failed} failed.`
          : `Sent to ${json.sent} ${json.sent === 1 ? "person" : "people"}.`
      );
      reset();
      onSent?.();
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (audience === "profile" && !selectedProfile) return setError("Select a recipient.");
    if (!title.trim()) return setError("Title is required.");
    if (!body.trim()) return setError("Message is required.");
    if (ctaUrl.trim() && !ctaUrl.trim().startsWith("/"))
      return setError("CTA URL must be an internal path starting with /.");

    if (isBroadcast && !confirming) {
      setConfirming(true);
      return;
    }
    void send();
  };

  const labelCls = "mb-1.5 block font-body text-[13px] font-medium text-ink";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Audience ── */}
      <div>
        <span className={labelCls}>Audience</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "profile", label: "One person" },
              { value: "role", label: "A role" },
              { value: "all", label: "Everyone" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAudience(opt.value)}
              aria-pressed={audience === opt.value}
              className={[
                "inline-flex h-10 items-center rounded-xl border px-4 font-body text-[14px] font-medium transition-colors duration-150",
                audience === opt.value
                  ? "border-ink bg-ink text-cream"
                  : "border-hairline bg-white text-muted hover:bg-stone/25 hover:text-ink",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {audience === "profile" && (
        <div ref={searchRef} className="relative">
          <span className={labelCls}>Recipient</span>
          {selectedProfile ? (
            <div className="flex items-center gap-2 rounded-xl border border-hairline bg-stone/20 px-3.5 py-2.5 font-body text-[14px]">
              <span className="font-medium text-ink">
                {selectedProfile.display_name?.trim() || selectedProfile.username || selectedProfile.id}
              </span>
              {selectedProfile.username && (
                <span className="text-muted">@{selectedProfile.username}</span>
              )}
              <button
                type="button"
                onClick={clearRecipient}
                className="ml-auto text-[13px] text-muted underline underline-offset-2 hover:text-ink"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Search by name or username…"
                className={INPUT}
              />
              {showResults && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-hairline bg-white shadow-lg">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProfile(p)}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-body text-[14px] transition-colors hover:bg-cream"
                    >
                      <span className="font-medium text-ink">
                        {p.display_name?.trim() || p.username || "Unnamed"}
                      </span>
                      {p.username && <span className="text-muted">@{p.username}</span>}
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className={`mt-1.5 ${TYPE.meta}`}>Searching…</p>}
            </>
          )}
        </div>
      )}

      {audience === "role" && (
        <div>
          <span className={labelCls}>Which role</span>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setAudienceRole(r.value)}
                aria-pressed={audienceRole === r.value}
                className={[
                  "inline-flex h-10 items-center rounded-xl border px-4 font-body text-[14px] transition-colors duration-150",
                  audienceRole === r.value
                    ? "border-archtivy-primary/40 bg-archtivy-primary/[0.07] font-medium text-archtivy-primary"
                    : "border-hairline bg-white text-muted hover:bg-stone/25 hover:text-ink",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isBroadcast && (
        <p className={`${TYPE.meta} leading-relaxed`}>
          Sends to profiles that can actually sign in — those with a linked account
          and not deleted. Capped at 500 recipients per send.
        </p>
      )}

      {/* ── Message ── */}
      <div className="grid gap-5">
        <div>
          <label htmlFor="notif-title" className={labelCls}>
            Title
            <span className="ml-2 font-normal tabular-nums text-muted">
              {title.length}/{MAX_TITLE}
            </span>
          </label>
          <input
            id="notif-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="Profile review available"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="notif-body" className={labelCls}>
            Message
            <span className="ml-2 font-normal tabular-nums text-muted">
              {body.length}/{MAX_BODY}
            </span>
          </label>
          <textarea
            id="notif-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            placeholder="Short and professional. Two sentences at most."
            rows={3}
            className={`${INPUT} h-auto resize-none py-2.5`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="notif-cta-label" className={labelCls}>
              CTA label <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="notif-cta-label"
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Review profile"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="notif-cta-url" className={labelCls}>
              CTA link <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="notif-cta-url"
              type="text"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="/me/settings"
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <span className={labelCls}>Priority</span>
          <div className="flex gap-2">
            {(["low", "normal", "high"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                aria-pressed={priority === p}
                className={[
                  "inline-flex h-9 items-center rounded-xl border px-3.5 font-body text-[13px] font-medium capitalize transition-colors duration-150",
                  priority === p
                    ? "border-ink bg-ink text-cream"
                    : "border-hairline bg-white text-muted hover:bg-stone/25 hover:text-ink",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Preview ── */}
      {(title.trim() || body.trim()) && (
        <div>
          <span className={labelCls}>Preview</span>
          <div className={`${SURFACE} p-4`}>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-archtivy-primary" />
              <div className="min-w-0">
                <p className="font-body text-[14px] font-semibold text-ink">
                  {title.trim() || "Untitled"}
                </p>
                <p className="mt-0.5 font-body text-[13px] leading-relaxed text-muted">
                  {body.trim() || "No message yet."}
                </p>
                {ctaLabel.trim() && (
                  <p className="mt-2 font-body text-[13px] font-medium text-archtivy-primary">
                    {ctaLabel.trim()} →
                  </p>
                )}
              </div>
            </div>
          </div>
          <p className={`mt-2 ${TYPE.meta}`}>Goes to {audienceLabel}.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="font-body text-[14px] text-red-600">
          {error}
        </p>
      )}
      {success && (
        <StatusPill tone="positive" dot>
          {success}
        </StatusPill>
      )}

      {/* ── Send ── */}
      {confirming ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="font-body text-[14px] font-medium text-amber-900">
            Send to {audienceLabel}?
          </p>
          <p className="mt-1 font-body text-[13px] leading-relaxed text-amber-800">
            This writes a notification for every matching person and cannot be undone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={sending} className={BTN_PRIMARY}>
              {sending ? "Sending…" : "Yes, send it"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={BTN_SECONDARY}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="submit" disabled={sending} className={BTN_PRIMARY}>
          {sending ? "Sending…" : isBroadcast ? "Review and send" : "Send notification"}
        </button>
      )}
    </form>
  );
}
