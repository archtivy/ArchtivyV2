"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ProfileOption {
  id: string;
  display_name: string | null;
  username: string | null;
}

const MAX_TITLE = 120;
const MAX_BODY = 280;

export function AdminSendNotification({ onSent }: { onSent?: () => void }) {
  // Recipient search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");

  // Submit state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Profile search with debounce
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
          const profiles = (json.data ?? []) as ProfileOption[];
          setResults(profiles.slice(0, 8));
          setShowResults(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectProfile = useCallback((p: ProfileOption) => {
    setSelectedProfile(p);
    setQuery(p.display_name?.trim() || p.username || p.id);
    setShowResults(false);
  }, []);

  const clearRecipient = () => {
    setSelectedProfile(null);
    setQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedProfile) {
      setError("Select a recipient.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!body.trim()) {
      setError("Message is required.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_profile_id: selectedProfile.id,
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
      setSuccess(true);
      setTitle("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      setPriority("normal");
      clearRecipient();
      onSent?.();
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  };

  const labelCls = "block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5";
  const inputCls =
    "w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Recipient search */}
      <div ref={searchRef} className="relative">
        <label className={labelCls}>Recipient</label>
        {selectedProfile ? (
          <div className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-900 font-medium">
              {selectedProfile.display_name?.trim() || selectedProfile.username || selectedProfile.id}
            </span>
            {selectedProfile.username && (
              <span className="text-zinc-400">@{selectedProfile.username}</span>
            )}
            <button
              type="button"
              onClick={clearRecipient}
              className="ml-auto text-xs text-zinc-400 hover:text-zinc-600"
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
              placeholder="Search by name or username..."
              className={inputCls}
            />
            {showResults && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded border border-zinc-200 bg-white shadow-lg">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProfile(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-900">
                      {p.display_name?.trim() || p.username || "Unnamed"}
                    </span>
                    {p.username && (
                      <span className="text-zinc-400">@{p.username}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <p className="mt-1 text-xs text-zinc-400">Searching...</p>
            )}
          </>
        )}
      </div>

      {/* Title */}
      <div>
        <label className={labelCls}>
          Title
          <span className="ml-2 font-normal normal-case tracking-normal text-zinc-300">
            {title.length}/{MAX_TITLE}
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
          placeholder="e.g. Profile review available"
          className={inputCls}
        />
      </div>

      {/* Message */}
      <div>
        <label className={labelCls}>
          Message
          <span className="ml-2 font-normal normal-case tracking-normal text-zinc-300">
            {body.length}/{MAX_BODY}
          </span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
          placeholder="Short, professional update. Max 2 sentences."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* CTA (optional) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>CTA Label <span className="font-normal normal-case tracking-normal text-zinc-300">(optional)</span></label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="e.g. Review profile"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>CTA URL <span className="font-normal normal-case tracking-normal text-zinc-300">(optional)</span></label>
          <input
            type="text"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="e.g. /me/settings"
            className={inputCls}
          />
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className={labelCls}>Priority</label>
        <div className="flex gap-2">
          {(["low", "normal", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded border px-3 py-1.5 text-xs font-medium capitalize transition ${
                priority === p
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error / Success */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Notification sent.</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={sending}
        className="rounded bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send notification"}
      </button>
    </form>
  );
}
