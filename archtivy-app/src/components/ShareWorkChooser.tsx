"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const PROJECT_HREF = "/add/project";
const PRODUCT_HREF = "/add/product";

export interface ShareWorkChooserProps {
  open: boolean;
  onClose: () => void;
  /** Override project submission path (default: /add/project) */
  projectHref?: string;
  /** Override product submission path (default: /add/product) */
  productHref?: string;
}

export function ShareWorkChooser({
  open,
  onClose,
  projectHref = PROJECT_HREF,
  productHref = PRODUCT_HREF,
}: ShareWorkChooserProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLAnchorElement>(null);
  const lastCardRef = useRef<HTMLAnchorElement>(null);
  const [entered, setEntered] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    setEntered(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = setTimeout(() => firstCardRef.current?.focus(), 50);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="share-chooser-title"
      aria-describedby="share-chooser-desc"
    >
      {/* Backdrop: soft blur, click to close */}
      <div
        className={`absolute inset-0 bg-black/15 backdrop-blur-[2px] transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      {/* Panel: centered, fade + scale */}
      <div
        ref={panelRef}
        className={`relative w-full max-w-[520px] rounded-lg border border-zinc-200/90 bg-white p-8 shadow-xl transition-all duration-[180ms] ease-out dark:border-zinc-700/90 dark:bg-zinc-900 ${entered ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-6">
          <h2
            id="share-chooser-title"
            className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            What would you like to share?
          </h2>
          <p
            id="share-chooser-desc"
            className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400"
          >
            Choose the type of work you want to publish.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          <Link
            ref={firstCardRef}
            href={projectHref}
            onClick={onClose}
            className="flex w-full cursor-pointer flex-col rounded-lg border border-zinc-200 bg-white p-5 text-left transition-all duration-200 hover:border-[#002abf] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-[#002abf]"
          >
            <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              Project
            </span>
            <span className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Share a built architectural work
            </span>
          </Link>
          <Link
            ref={lastCardRef}
            href={productHref}
            onClick={onClose}
            className="flex w-full cursor-pointer flex-col rounded-lg border border-zinc-200 bg-white p-5 text-left transition-all duration-200 hover:border-[#002abf] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-[#002abf]"
          >
            <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              Product
            </span>
            <span className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Share a product, furniture, or material
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
