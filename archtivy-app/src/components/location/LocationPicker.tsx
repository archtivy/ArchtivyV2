"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapCanvas } from "./MapCanvas";

const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export interface LocationValue {
  location_place_name: string;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_text: string;
}

const emptyValue: LocationValue = {
  location_place_name: "",
  location_city: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
  location_text: "",
};

interface MapboxFeature {
  id: string;
  place_name: string;
  geometry: { coordinates: [number, number] };
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

function parseFeature(f: MapboxFeature): LocationValue {
  const [lng, lat] = f.geometry.coordinates;
  let city: string | null = null;
  let country: string | null = null;
  for (const c of f.context ?? []) {
    if (c.id.startsWith("place.")) city = c.text;
    if (c.id.startsWith("country.")) country = c.text;
  }
  const location_text = f.place_name || (city && country ? `${city}, ${country}` : `${lat}, ${lng}`);
  return {
    location_place_name: f.place_name,
    location_city: city,
    location_country: country,
    location_lat: lat,
    location_lng: lng,
    location_text,
  };
}

/** Mapbox Static Images API: monochrome style, Archtivy blue pin, 600×360. */
function staticMapUrl(token: string, lng: number, lat: number): string {
  const base = "https://api.mapbox.com/styles/v1/mapbox/light-v11/static";
  const pinColor = "173DED"; // Archtivy brand blue (no #)
  const overlay = `pin-s+${pinColor}(${lng},${lat})`;
  const position = `${lng},${lat},12,0`;
  return `${base}/${overlay}/${position}/600x360?access_token=${encodeURIComponent(token)}`;
}

export interface LocationPickerProps {
  namePrefix?: string;
  value: LocationValue | null;
  onChange: (value: LocationValue) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** When true, show only a text fallback input (no map). */
  fallbackOnly?: boolean;
}

export function LocationPicker({
  namePrefix = "location",
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  fallbackOnly = false,
}: LocationPickerProps) {
  const [clientToken, setClientToken] = useState("");
  /** True when WebGL/init failed; we show static map preview instead. */
  const [mapFailed, setMapFailed] = useState(false);
  /** True when static image failed to load; we show nothing in map area. */
  const [staticImageFailed, setStaticImageFailed] = useState(false);

  useEffect(() => {
    setClientToken(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
  }, []);

  const token = clientToken;
  const canUseMapbox = Boolean(token && !fallbackOnly);

  const [query, setQuery] = useState(value?.location_text ?? "");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const suppressNextFetchRef = useRef(false);

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (!token || !q.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const url = `${GEOCODE_URL}/${encodeURIComponent(q.trim())}.json?access_token=${token}&limit=5&types=place,locality,address`;
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
    if (!canUseMapbox) return;
    setQuery(value?.location_text ?? "");
  }, [value?.location_text, canUseMapbox]);

  useEffect(() => {
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
      const next = parseFeature(feature);
      onChange(next);
      setQuery(next.location_text);
      setSuggestions([]);
      setOpen(false);
      setStaticImageFailed(false);
    },
    [onChange]
  );

  const handleMapLoaded = useCallback(() => {
    setMapFailed(false);
  }, []);

  const handleMapError = useCallback(() => {
    setMapFailed(true);
  }, []);

  const handleMarkerDragEnd = useCallback(
    (lat: number, lng: number) => {
      onChange({
        ...(value ?? emptyValue),
        location_lat: lat,
        location_lng: lng,
        location_text: value?.location_text || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    },
    [value, onChange]
  );

  const inputId = `${namePrefix}_search`;
  const inputClass =
    "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";

  /** No token or fallbackOnly: search + hidden inputs only, no map area, no error text. */
  if (!canUseMapbox) {
    return (
      <div className={className}>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Location {required && <span className="text-archtivy-primary">*</span>}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange({ ...emptyValue, location_text: e.target.value });
          }}
          required={required}
          disabled={disabled}
          className={inputClass}
          placeholder="City, country or address"
          name={namePrefix}
        />
        <input type="hidden" name="location" value={value?.location_text ?? query} />
        <input type="hidden" name="location_text" value={value?.location_text ?? query} />
        <input type="hidden" name={`${namePrefix}_city`} value={value?.location_city ?? ""} />
        <input type="hidden" name={`${namePrefix}_country`} value={value?.location_country ?? ""} />
        <input type="hidden" name={`${namePrefix}_lat`} value={value?.location_lat ?? ""} />
        <input type="hidden" name={`${namePrefix}_lng`} value={value?.location_lng ?? ""} />
        <input type="hidden" name={`${namePrefix}_place_name`} value={value?.location_place_name ?? ""} />
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Location {required && <span className="text-archtivy-primary">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          required={required}
          disabled={disabled}
          className={inputClass}
          placeholder="Search for a place or address"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={namePrefix + "_suggestions"}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400" aria-hidden>
            Searching…
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul
            id={namePrefix + "_suggestions"}
            role="listbox"
            className="absolute z-20 mt-1 w-full rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
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
      <input type="hidden" name="location" value={value?.location_text ?? query} />
      <input type="hidden" name="location_text" value={value?.location_text ?? query} />
      <input type="hidden" name="location_city" value={value?.location_city ?? ""} />
      <input type="hidden" name="location_country" value={value?.location_country ?? ""} />
      <input type="hidden" name="location_lat" value={value?.location_lat ?? ""} />
      <input type="hidden" name="location_lng" value={value?.location_lng ?? ""} />
      <input type="hidden" name="location_place_name" value={value?.location_place_name ?? ""} />

      {value?.location_lat != null && value?.location_lng != null && (
        <>
          {!mapFailed && (
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div
                ref={mapContainerRef}
                className="h-48 w-full"
                role="img"
                aria-label="Map showing selected location"
              />
              <MapCanvas
                accessToken={token}
                containerRef={mapContainerRef}
                center={{ lat: value.location_lat, lng: value.location_lng }}
                onLoaded={handleMapLoaded}
                onError={handleMapError}
                onMarkerDragEnd={handleMarkerDragEnd}
              />
              <p className="border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                Drag the pin to adjust the location.
              </p>
            </div>
          )}
          {mapFailed && !staticImageFailed && (
            <div className="mt-3 overflow-hidden rounded-[12px] border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50">
              <img
                src={staticMapUrl(token, value.location_lng, value.location_lat)}
                alt="Map showing selected location"
                className="h-[225px] w-full object-cover object-center"
                onError={() => setStaticImageFailed(true)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
