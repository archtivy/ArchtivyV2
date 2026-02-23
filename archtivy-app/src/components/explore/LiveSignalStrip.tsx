"use client";

import type { ExploreSignal } from "@/lib/explore/queries";

export interface LiveSignalStripProps {
  signals: ExploreSignal[];
}

export function LiveSignalStrip({ signals }: LiveSignalStripProps) {
  return (
    <section className="border-t border-[#eeeeee] bg-white py-6" aria-label="Live signals">
      <div className="mx-auto flex max-w-[1040px] flex-wrap justify-between gap-6 px-4 sm:px-6">
        {signals.map((s) => (
          <div
            key={s.label}
            className="min-w-0 flex-1 basis-[200px] border-b-2 border-[#002abf] pb-1"
            style={{ maxWidth: 260 }}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {s.label}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-900">{s.value}</p>
            <p className="text-sm text-zinc-600">{s.metric}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
