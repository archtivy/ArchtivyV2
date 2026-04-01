"use client";

interface MapControlsProps {
  onLocateMe: () => void;
  onResetView: () => void;
}

export function MapControls({ onLocateMe, onResetView }: MapControlsProps) {
  return (
    <div
      className="absolute right-3 z-10 flex flex-col overflow-hidden sm:right-5"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 8,
        boxShadow: "0 2px 10px -2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <button
        type="button"
        onClick={onLocateMe}
        className="flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors active:bg-zinc-100/80 sm:h-9 sm:w-9 sm:hover:bg-white/90 sm:hover:text-zinc-800"
        aria-label="Center on my location"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
      <div className="mx-2 h-px bg-zinc-200/50" />
      <button
        type="button"
        onClick={onResetView}
        className="flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors active:bg-zinc-100/80 sm:h-9 sm:w-9 sm:hover:bg-white/90 sm:hover:text-zinc-800"
        aria-label="Reset to global view"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>
    </div>
  );
}
