"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

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

  const panel = open && typeof document !== "undefined" ? createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: Z_BACKDROP }} aria-hidden onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        className="w-72 border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: Z_PANEL, borderRadius: 6 }}
      >
        {/* Search input */}
        <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
          />
        </div>

        {/* Options */}
        <ul className="max-h-56 overflow-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">No results</li>
          ) : (
            filtered.map((opt) => {
              const active = selectedSet.has(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition ${
                      active
                        ? "text-[#002abf] dark:text-blue-400"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {multi && (
                      <span
                        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] ${
                          active
                            ? "border-[#002abf] bg-[#002abf] text-white"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {active ? "✓" : ""}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Selected tags */}
        {multi && selected.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
            {selected.map((v) => {
              const opt = options.find((o) => o.value === v);
              return (
                <span key={v} className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {opt?.label ?? v}
                  <button type="button" onClick={() => toggle(v)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" aria-label={`Remove ${opt?.label}`}>
                    &times;
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
        className={`flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition ${
          hasSelection
            ? "border-[#002abf]/30 bg-[#002abf]/5 text-[#002abf] dark:border-[#002abf]/40 dark:bg-[#002abf]/10"
            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
        }`}
        style={{ borderRadius: 4 }}
      >
        {displayLabel}
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {panel}
    </>
  );
}
