"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export interface ProfileLocationValue {
  place_name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  mapbox_id: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

function parseFeature(f: MapboxFeature): ProfileLocationValue {
  const [lng, lat] = f.center;
  let city: string | null = null;
  let country: string | null = null;
  for (const c of f.context ?? []) {
    if (c.id.startsWith("country.")) country = c.text;
    if (c.id.startsWith("place.") || c.id.startsWith("locality.")) city = c.text;
  }
  if (!city) city = f.text || null;
  return {
    place_name: f.place_name,
    city,
    country,
    lat,
    lng,
    mapbox_id: f.id,
  };
}

export interface ProfileLocationPickerProps {
  value: ProfileLocationValue | null;
  onChange: (value: ProfileLocationValue) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
}

export function ProfileLocationPicker({
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  label = "Location",
  placeholder = "Search for a city or place…",
}: ProfileLocationPickerProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [query, setQuery] = useState(value?.place_name ?? "");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressNextFetchRef = useRef(false);

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (!token || !q.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const url = `${GEOCODE_URL}/${encodeURIComponent(q.trim())}.json?access_token=${token}&autocomplete=true&limit=6&language=en&types=place,locality,neighborhood,address`;
      fetch(url)
        .then((res) => res.json())
        .then((data: MapboxGeocodeResponse) => {
          setSuggestions(data.features ?? []);
          setOpen(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    if (value?.place_name) setQuery(value.place_name);
  }, [value?.place_name]);

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
    (feature: MapboxFeature) => {
      suppressNextFetchRef.current = true;
      const next = parseFeature(feature);
      onChange(next);
      setQuery(next.place_name);
      setOpen(false);
      setSuggestions([]);
      setTimeout(() => {
        suppressNextFetchRef.current = false;
      }, 0);
    },
    [onChange]
  );

  const inputClass =
    "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
  const labelClass = "mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100";

  return (
    <div className={className}>
      <label htmlFor="profile-location-search" className={labelClass}>
        {label} {required && <span className="text-archtivy-primary">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="profile-location-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          required={required}
          disabled={disabled}
          className={inputClass}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="profile-location-suggestions"
          aria-expanded={open && suggestions.length > 0}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400" aria-hidden>
            Searching…
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul
            id="profile-location-suggestions"
            role="listbox"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            {suggestions.map((f) => (
              <li
                key={f.id}
                role="option"
                aria-selected={false}
                tabIndex={0}
                className="cursor-pointer px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPlace(f);
                }}
              >
                {f.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Select a suggestion from the list. Free-typing is not accepted.
      </p>
    </div>
  );
}
