"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterPillDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  multi?: boolean;
  "data-testid"?: string;
}

const DROPDOWN_Z = 1000;
const BACKDROP_Z = 999;

export function FilterPillDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select…",
  multi = true,
  "data-testid": testId,
}: FilterPillDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(rect.width, 200),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        open &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const toggle = useCallback(
    (value: string) => {
      if (multi) {
        const next = selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value];
        onChange(next);
      } else {
        onChange(selected.includes(value) ? [] : [value]);
        setOpen(false);
      }
    },
    [multi, selected, onChange]
  );

  const selectedSet = new Set(selected);
  const hasSelection = selected.length > 0;
  const displayLabel = hasSelection
    ? selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? `${selected.length} selected`
      : `${selected.length} selected`
    : label;

  if (options.length === 0) return null;

  const dropdownContent = open && typeof document !== "undefined" && (
    <>
      {/* Backdrop for mobile: tap to close, blocks interaction behind */}
      <div
        className="fixed inset-0 md:hidden"
        style={{ zIndex: BACKDROP_Z, backgroundColor: "rgba(0,0,0,0.3)" }}
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        className="min-w-[200px] max-h-[min(72vh,288px)] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        role="listbox"
        aria-multiselectable={multi}
        style={{
          position: "fixed",
          left: position.left,
          top: position.top,
          width: position.width,
          zIndex: DROPDOWN_Z,
        }}
      >
        <ul className="py-2">
          {options.map((opt) => {
            const active = selectedSet.has(opt.value);
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {multi && (
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        active
                          ? "border-[#002abf] bg-[#002abf] text-white"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </span>
                  )}
                  <span>{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );

  return (
    <div className="shrink-0" data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) setTimeout(updatePosition, 0);
        }}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
          hasSelection
            ? "border-[#002abf] bg-[#002abf]/10 text-[#002abf] dark:bg-[#002abf]/20 dark:text-[#002abf]"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}, ${hasSelection ? selected.length + " selected" : "none selected"}`}
      >
        <span>{displayLabel}</span>
        <span className="text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}
