"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";

type ProfileSuggestion = { id: string; display_name: string | null; username: string | null };

export function TeamMemberNameInput({
  value,
  onChange,
  placeholder = "Name",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
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
            const sub = p.display_name?.trim() && p.username?.trim() ? `@${p.username}` : null;
            return (
              <li
                key={p.id}
                role="option"
                aria-selected={false}
                className="cursor-pointer px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => selectProfile(p)}
              >
                {label}
                {sub && <span className="ml-1 text-zinc-500 dark:text-zinc-400">{sub}</span>}
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
