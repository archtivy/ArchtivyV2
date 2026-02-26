"use client";

import type { ExploreSignal } from "@/lib/explore/queries";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

const SIGNAL_PANEL_MAP: Record<string, ExplorePanelType> = {
  "Most Connected Designer": "market-leaders",
  "Most Integrated Brand": "brands",
  "Most Used Product": "products",
  "Most Active Category": "categories",
};

export interface LiveSignalStripProps {
  signals: ExploreSignal[];
  onOpen: (panel: ExplorePanelType) => void;
}

export function LiveSignalStrip({ signals, onOpen }: LiveSignalStripProps) {
  return (
    <section className="border-t border-[#eeeeee] bg-white py-6" aria-label="Live signals">
      <div className="mx-auto flex max-w-[1040px] flex-wrap justify-between gap-4 px-4 sm:px-6">
        {signals.map((s) => {
          const panel = SIGNAL_PANEL_MAP[s.label] ?? null;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => panel && onOpen(panel)}
              disabled={!panel}
              className="group min-w-0 flex-1 basis-[200px] border-l-2 border-[#002abf] pl-3 text-left transition-colors hover:bg-zinc-50 disabled:cursor-default"
              style={{ maxWidth: 260 }}
              aria-label={`View ${s.label}`}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                {s.label}
              </p>
              <p className="mt-1 truncate text-lg font-medium text-zinc-900 group-hover:text-[#002abf]">
                {s.value}
              </p>
              <p className="text-xs text-zinc-500">{s.metric}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
