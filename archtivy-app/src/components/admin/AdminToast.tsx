"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "info" | "success" | "warn" | "error";

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, opts?: { kind?: ToastKind; action?: Toast["action"] }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside AdminToastProvider");
  return ctx;
}

const KIND_CLASSES: Record<ToastKind, string> = {
  info: "bg-[#002abf] text-white",
  success: "bg-emerald-600 text-white",
  warn: "bg-amber-500 text-white",
  error: "bg-red-600 text-white",
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => onDismiss(t.id), 5000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [t.id, onDismiss]);

  return (
    <div
      className={[
        "flex min-w-[280px] max-w-sm items-start gap-3 rounded px-4 py-3 shadow-lg text-sm",
        KIND_CLASSES[t.kind],
      ].join(" ")}
      role="alert"
    >
      <span className="flex-1">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
          className="shrink-0 underline underline-offset-2 font-medium hover:opacity-80"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss"
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, opts?: { kind?: ToastKind; action?: Toast["action"] }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, kind: opts?.kind ?? "info", action: opts?.action }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
