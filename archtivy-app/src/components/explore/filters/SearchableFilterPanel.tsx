"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FilterTrigger } from "./FilterTrigger";

interface Option {
  value: string;
  label: string;
}

interface SearchableFilterPanelProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  multi?: boolean;
  placeholder?: string;
  /** Use a wider panel with popular suggestions section. */
  wide?: boolean;
  /** Popular option values to show at the top of the panel. */
  popularValues?: string[];
}

const Z_PANEL = 1000;
const Z_BACKDROP = 999;

export function SearchableFilterPanel({
  label,
  options,
  selected,
  onChange,
  multi = true,
  placeholder = "Search...",
  wide = false,
  popularValues,
}: SearchableFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const h = () => updatePos();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open, updatePos]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedSet = new Set(selected);
  const hasSelection = selected.length > 0;

  const toggle = (value: string) => {
    if (multi) {
      onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selectedSet.has(value) ? [] : [value]);
      setOpen(false);
    }
  };

  const displayLabel = hasSelection
    ? selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? label
      : `${label} (${selected.length})`
    : label;

  if (options.length === 0) return null;

  // Popular options (only shown when not searching)
  const popularSet = new Set(popularValues ?? []);
  const popularOptions = popularValues?.length
    ? options.filter((o) => popularSet.has(o.value))
    : [];
  const showPopular = popularOptions.length > 0 && !query.trim();

  const panelWidth = wide ? "w-96" : "w-72";

  const renderOption = (opt: Option) => {
    const active = selectedSet.has(opt.value);
    return (
      <li key={opt.value}>
        <button
          type="button"
          onClick={() => toggle(opt.value)}
          className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition ${
            active
              ? "bg-stone/40 text-ink"
              : "text-ink/80 hover:bg-stone/25"
          }`}
        >
          {multi && (
            <span
              className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[8px] ${
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-hairline"
              }`}
              style={{ borderRadius: 2 }}
            >
              {active && (
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </span>
          )}
          {!multi && active && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
          )}
          <span className="truncate">{opt.label}</span>
        </button>
      </li>
    );
  };

  const panel = open && typeof document !== "undefined" ? createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: Z_BACKDROP }} aria-hidden onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        className={`${panelWidth} border border-hairline bg-cream`}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: Z_PANEL, borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        {/* Search input */}
        <div className="px-3.5 pt-3 pb-2">
          <div className="flex items-center gap-2 border-b border-hairline pb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder-muted outline-none"
            />
          </div>
        </div>

        {/* Popular section */}
        {showPopular && (
          <div className="px-1 pb-1">
            <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">Popular</p>
            <ul>{popularOptions.map(renderOption)}</ul>
            <div className="mx-3.5 mt-1 border-t border-hairline" />
          </div>
        )}

        {/* All options */}
        <ul className="max-h-60 overflow-auto px-1 pb-2">
          {filtered.length === 0 ? (
            <li className="px-3.5 py-3 text-xs text-muted">No results</li>
          ) : (
            filtered.map(renderOption)
          )}
        </ul>

        {/* Selected tags footer */}
        {multi && selected.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-hairline px-3.5 py-2.5">
            {selected.map((v) => {
              const opt = options.find((o) => o.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full border border-hairline bg-stone/40 px-2 py-0.5 text-[11px] text-ink"
                  style={{ borderRadius: 2 }}
                >
                  {opt?.label ?? v}
                  <button type="button" onClick={() => toggle(v)} className="text-muted hover:text-ink" aria-label={`Remove ${opt?.label}`}>
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <FilterTrigger
        ref={triggerRef}
        label={displayLabel}
        active={hasSelection}
        open={open}
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
      />
      {panel}
    </>
  );
}
