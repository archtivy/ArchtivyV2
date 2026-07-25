"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { LiveNetworkMap } from "@/components/home/LiveNetworkMap";
import type { LiveNetworkCard, LiveNetworkData } from "@/lib/db/liveNetwork";

function BookmarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#e8e8ec] bg-white text-zinc-600 shadow-sm transition hover:scale-105 hover:border-zinc-200 hover:bg-white"
    >
      {children}
    </button>
  );
}

function NetworkCard({ card, visible }: { card: LiveNetworkCard; visible: boolean }) {
  const external = card.imageUrl?.startsWith("http") ?? false;

  return (
    <div
      className="flex h-full flex-col transition-opacity duration-150 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-zinc-100">
        {card.imageUrl ? (
          <Link href={card.href} className="block h-full w-full">
            <Image
              src={card.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 380px"
              unoptimized={external}
            />
          </Link>
        ) : null}
        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
          <IconButton label="Save" onClick={(e) => e.preventDefault()}>
            <BookmarkIcon />
          </IconButton>
          <IconButton label="Follow" onClick={(e) => e.preventDefault()}>
            <HeartIcon />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-0.5">
        <Link
          href={card.href}
          className="block text-[13px] font-medium text-zinc-900 hover:underline"
        >
          {card.title}
        </Link>
        {card.studioName && (
          <p className="text-[11px] text-[#666]">{card.studioName}</p>
        )}
        {card.locationLine && (
          <p className="text-[10px] text-[#999]">{card.locationLine}</p>
        )}
      </div>

      <div className="mt-4 border-t border-[#f0f0f0] pt-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#999]">
          Credited brands
        </p>
        {card.creditedBrands.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.creditedBrands.map((brand) => (
              <span
                key={brand}
                className="rounded-full border border-[#e8e8ec] bg-[#f4f4f6] px-2 py-0.5 text-[10px] text-[#666]"
              >
                {brand}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-[#999]">No linked products yet.</p>
        )}
      </div>
    </div>
  );
}

export function LiveNetworkPanel({ data }: { data: LiveNetworkData }) {
  const pinById = useMemo(() => new Map(data.pins.map((p) => [p.id, p])), [data.pins]);

  const [activePinId, setActivePinId] = useState<string | null>(data.initialPinId);
  const [card, setCard] = useState<LiveNetworkCard>(data.initialCard);
  const [fadeIn, setFadeIn] = useState(true);

  const selectPin = useCallback(
    (pinId: string) => {
      const pin = pinById.get(pinId);
      if (!pin) return;
      setFadeIn(false);
      window.setTimeout(() => {
        setActivePinId(pinId);
        setCard(pin.card);
        setFadeIn(true);
      }, 80);
    },
    [pinById]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[#f0f0f0] bg-white">
      <div className="flex min-h-[400px] flex-col lg:flex-row">
        {/* Map — 60% */}
        <div className="relative flex min-h-[320px] flex-[3] flex-col bg-[#f8f8fa] lg:min-h-[400px]">
          <div className="relative z-10 shrink-0 px-5 pb-2 pt-5 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Live network
            </p>
            <h2 className="mt-1.5 font-serif text-xl font-normal tracking-tight text-zinc-900 sm:text-2xl">
              Architecture across the world.
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">Tap a city to explore.</p>
          </div>
          <div className="relative min-h-[260px] flex-1 lg:min-h-0">
            <LiveNetworkMap
              pins={data.pins}
              connections={data.connections}
              countryCount={data.countryCount}
              activePinId={activePinId}
              onSelectPin={selectPin}
            />
          </div>
        </div>

        {/* Card — 40% */}
        <div className="flex flex-[2] flex-col border-t border-[#f0f0f0] bg-white p-5 lg:border-l lg:border-t-0 lg:p-6">
          <NetworkCard card={card} visible={fadeIn} />
        </div>
      </div>
    </div>
  );
}
