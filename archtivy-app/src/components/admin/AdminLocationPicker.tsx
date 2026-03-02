"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AdminLocationValue {
  place_name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  mapbox_id: string;
}

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
  city: string | null;
  country: string | null;
}

export interface AdminLocationPickerProps {
  value: AdminLocationValue | null;
  onChange: (value: AdminLocationValue) => void;
  label?: string;
  placeholder?: string;
  /** Legacy city (when no Mapbox data) */
  legacyCity?: string | null;
  /** Legacy country (when no Mapbox data) */
  legacyCountry?: string | null;
}

export function AdminLocationPicker({
  value,
  onChange,
  label = "Location",
  placeholder = "Search for a city or place…",
  legacyCity,
  legacyCountry,
}: AdminLocationPickerProps) {
  const [query, setQuery] = useState(
    value?.place_name ?? [legacyCity, legacyCountry].filter(Boolean).join(", ") ?? ""
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextFetchRef = useRef(false);

  const fetchSuggestions = useCallback((q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/mapbox/suggest?q=${encodeURIComponent(q.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (value?.place_name) setQuery(value.place_name);
    else if (legacyCity || legacyCountry) {
      setQuery([legacyCity, legacyCountry].filter(Boolean).join(", "));
    }
  }, [value?.place_name, legacyCity, legacyCountry]);

  useEffect(() => {
    if (suppressNextFetchRef.current) return;
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const selectPlace = useCallback(
    (s: Suggestion) => {
      suppressNextFetchRef.current = true;
      const [lng, lat] = s.center;
      onChange({
        place_name: s.place_name,
        city: s.city,
        country: s.country,
        lat,
        lng,
        mapbox_id: s.id,
      });
      setQuery(s.place_name);
      setOpen(false);
      setSuggestions([]);
      setTimeout(() => {
        suppressNextFetchRef.current = false;
      }, 0);
    },
    [onChange]
  );

  const inputClass =
    "mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 placeholder-zinc-500";
  const labelClass = "text-sm font-medium text-zinc-900";

  return (
    <div>
      <label htmlFor="admin-location-search" className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id="admin-location-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          className={inputClass}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
            Searching…
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((s) => (
              <li
                key={s.id}
                role="option"
                aria-selected={false}
                tabIndex={0}
                className="cursor-pointer px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPlace(s);
                }}
              >
                {s.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Select a suggestion from the list. Supports legacy city/country display.
      </p>
    </div>
  );
}
