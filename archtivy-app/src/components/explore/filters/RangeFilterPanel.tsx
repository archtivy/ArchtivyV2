"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FilterTrigger } from "./FilterTrigger";

interface RangeFilterPanelProps {
  label: string;
  minLabel: string;
  maxLabel: string;
  minValue: string;
  maxValue: string;
  onChange: (min: string, max: string) => void;
  placeholder?: [string, string];
}

const Z = 1000;

export function RangeFilterPanel({
  label,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  onChange,
  placeholder = ["", ""],
}: RangeFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasValue = minValue !== "" || maxValue !== "";

  const displayLabel = hasValue
    ? minValue && maxValue
      ? `${minValue}–${maxValue}`
      : minValue
        ? `${minValue}+`
        : `≤${maxValue}`
    : label;

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    setLocalMin(minValue);
    setLocalMax(maxValue);
    updatePos();
    const h = () => updatePos();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open, updatePos, minValue, maxValue]);

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

  const apply = () => {
    onChange(localMin.trim(), localMax.trim());
    setOpen(false);
  };

  const clear = () => {
    setLocalMin("");
    setLocalMax("");
    onChange("", "");
    setOpen(false);
  };

  const panel = open && typeof document !== "undefined" ? createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: Z - 1 }} aria-hidden onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        className="w-56 border border-zinc-200 bg-white p-3.5 dark:border-zinc-700 dark:bg-zinc-900"
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: Z, borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{minLabel}</label>
            <input
              type="text"
              inputMode="numeric"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={placeholder[0]}
              className="w-full border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
              style={{ borderRadius: 3 }}
            />
          </div>
          <div className="flex items-end pb-2 text-zinc-300 dark:text-zinc-600">
            <span className="text-xs">–</span>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{maxLabel}</label>
            <input
              type="text"
              inputMode="numeric"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={placeholder[1]}
              className="w-full border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
              style={{ borderRadius: 3 }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={clear} className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            Clear
          </button>
          <button
            type="button"
            onClick={apply}
            className="border border-zinc-900 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-800 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            style={{ borderRadius: 3 }}
          >
            Apply
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <FilterTrigger
        ref={triggerRef}
        label={displayLabel}
        active={hasValue}
        open={open}
        onClick={() => setOpen((p) => !p)}
      />
      {panel}
    </>
  );
}
