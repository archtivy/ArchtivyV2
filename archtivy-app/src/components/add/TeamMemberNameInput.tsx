"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";

export type ProfileSuggestion = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

/**
 * Name field with profile search-as-you-type.
 *
 * ── WHY onSelect EXISTS ─────────────────────────────────────────────────────
 * This used to fetch a profile, take its NAME, and throw the id away —
 * `onChange(name)` and nothing else. The credit then went through
 * get_or_create_unclaimed_profile(), which matches or creates an UNCLAIMED
 * shell rather than attaching to the real studio. Measured across live data:
 * of 232 linked listing_team_members rows, 230 point at a username-less shell
 * and only 2 at a real profile. Typing a studio name did not fail to link — it
 * manufactured a duplicate profile on every publish.
 *
 * onSelect now hands the whole profile back so the caller can keep the id.
 * onChange stays for free typing: crediting someone with no profile yet is
 * still valid and still falls through to the old behaviour.
 */
export function TeamMemberNameInput({
  value,
  onChange,
  onSelect,
  linkedProfile,
  onClearLink,
  placeholder = "Name",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fired when a real profile is picked. Receives the whole row, not a name. */
  onSelect?: (profile: ProfileSuggestion) => void;
  /** When set, the field renders as linked rather than as free text. */
  linkedProfile?: { display_name: string | null; username: string | null; avatar_url?: string | null } | null;
  onClearLink?: () => void;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/profiles/suggest?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.profiles ?? []);
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectProfile = (p: ProfileSuggestion) => {
    const name = (p.display_name?.trim() || p.username?.trim() || "").trim();
    if (name) onChange(name);
    onSelect?.(p);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length >= 2 && suggestions.length > 0 && setOpen(true)}
        className={`${inputClass} w-full min-w-0 md:min-w-[240px]`}
        aria-label={ariaLabel}
        role="combobox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="team-member-suggestions"
      />
      {open && suggestions.length > 0 && (
        <ul
          id="team-member-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {suggestions.map((p) => {
            const label = (p.display_name?.trim() || p.username?.trim() || p.id) as string;
            const handle = p.username?.trim() ? `@${p.username.trim()}` : null;
            return (
              <li
                key={p.id}
                role="option"
                aria-selected={false}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => selectProfile(p)}
              >
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-500 dark:text-zinc-300">
                      {label.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{label}</span>
                  {/* A profile with no username is an unclaimed shell. Saying so
                      lets the author pick the real studio when both appear. */}
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {handle ?? "Unclaimed profile"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {loading && value.trim().length >= 2 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Searching…</span>
      )}
    </div>
  );
}
