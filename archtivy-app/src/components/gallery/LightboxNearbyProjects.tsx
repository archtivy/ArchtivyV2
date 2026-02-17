"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { getNearbyProjects, type NearbyProjectCard } from "@/app/actions/nearbyProjects";

const AUTO_ADVANCE_MS = 5000;

export interface LightboxNearbyProjectsProps {
  excludeListingId: string;
  city: string | null;
  country: string | null;
  onClose?: () => void;
}

export function LightboxNearbyProjects({
  excludeListingId,
  city,
  country,
  onClose,
}: LightboxNearbyProjectsProps) {
  const [projects, setProjects] = React.useState<NearbyProjectCard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [slideIndex, setSlideIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNearbyProjects(excludeListingId, city, country).then((data) => {
      if (!cancelled) {
        setProjects(data);
        setSlideIndex(0);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [excludeListingId, city, country]);

  React.useEffect(() => {
    if (projects.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setSlideIndex((i) => (i >= projects.length - 1 ? 0 : i + 1));
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [projects.length, paused]);

  const goPrev = () => setSlideIndex((i) => (i <= 0 ? projects.length - 1 : i - 1));
  const goNext = () => setSlideIndex((i) => (i >= projects.length - 1 ? 0 : i + 1));

  if (loading) {
    return (
      <section className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          More Projects Near This Location
        </h3>
        <div className="flex h-20 items-center justify-center rounded bg-zinc-800/50 text-sm text-zinc-500" style={{ borderRadius: "4px" }}>
          Loading…
        </div>
      </section>
    );
  }
  if (projects.length === 0) return null;

  const current = projects[slideIndex];
  const ownerDisplay = (current.ownerName ?? "").trim().toLowerCase().startsWith("by ")
    ? (current.ownerName ?? "").trim().slice(3).trim()
    : (current.ownerName ?? "").trim();
  const yearStr = current.year != null ? String(current.year) : null;

  return (
    <section
      className="group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        More Projects Near This Location ({projects.length})
      </h3>
      <div className="relative w-full">
        <div className="w-full overflow-hidden rounded border border-zinc-700/80 bg-zinc-800/40" style={{ borderRadius: "4px" }}>
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            {current.coverImageUrl ? (
              <Image
                src={current.coverImageUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized={current.coverImageUrl.startsWith("http")}
                sizes="360px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                <span className="text-xs uppercase">—</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <Link
              href={`/projects/${current.slug ?? current.id}`}
              onClick={onClose}
              className="block rounded focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-0 focus:ring-offset-[#252528]"
              style={{ borderRadius: "4px" }}
            >
              <p className="truncate text-sm font-semibold leading-tight text-zinc-100">
                {current.title}
              </p>
              {ownerDisplay ? (
                <p className="mt-0.5 truncate text-xs leading-snug text-zinc-500">
                  by {ownerDisplay}
                </p>
              ) : null}
              {yearStr ? (
                <p className="mt-0.5 truncate text-xs leading-snug text-zinc-600">
                  {yearStr}
                </p>
              ) : null}
            </Link>
          </div>
        </div>
        {projects.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-0.5 rounded border border-zinc-700 bg-zinc-900/95 p-1.5 text-zinc-400 opacity-0 shadow transition-opacity hover:border-[#002abf] hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#002abf] group-hover:opacity-100"
              style={{ borderRadius: "4px" }}
              aria-label="Previous project"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-0.5 rounded border border-zinc-700 bg-zinc-900/95 p-1.5 text-zinc-400 opacity-0 shadow transition-opacity hover:border-[#002abf] hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#002abf] group-hover:opacity-100"
              style={{ borderRadius: "4px" }}
              aria-label="Next project"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <div className="mt-2 flex justify-center gap-1.5">
              {projects.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === slideIndex ? "bg-[#002abf]" : "bg-zinc-600 hover:bg-zinc-500"}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
