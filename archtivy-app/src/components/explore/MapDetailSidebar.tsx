"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MapPin, PinType } from "./ExploreMapView";

const COLORS: Record<PinType, string> = {
  project: "#002abf",
  product: "#059669",
  designer: "#7c3aed",
  brand: "#d4a017",
};

const LABELS: Record<PinType, string> = {
  project: "Project",
  product: "Product",
  designer: "Designer",
  brand: "Brand",
};

/* ── Network data types (from /api/explore/network) ─────────────────────── */

interface TeamMember {
  profileId: string;
  displayName: string | null;
  title: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface UsedProduct {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  brandName: string | null;
}

interface ArchitectProject {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  year: string | null;
  city: string | null;
}

interface CollabPair {
  nameA: string;
  nameB: string;
  count: number;
}

interface OwnerProfile {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface UsedInProject {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  ownerName: string | null;
}

interface BrandProduct {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
}

interface BrandPopularProduct {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  category: string | null;
  projectUsageCount: number;
}

interface BrandNetworkData {
  brandProfile: OwnerProfile;
  popularProducts: BrandPopularProduct[];
  totalProducts: number;
  usedInProjectsCount: number;
  relatedProjectIds: string[];
  relatedDesignerIds: string[];
}

interface DesignerProject {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  year: string | null;
  city: string | null;
}

interface DesignerNetworkData {
  designerProfile: OwnerProfile;
  designerProjects: DesignerProject[];
  totalProjects: number;
  relatedBrandIds: string[];
  relatedProjectIds: string[];
}

type NetworkData = ProjectNetworkData | ProductNetworkData | BrandNetworkData | DesignerNetworkData;

interface ProjectNetworkData {
  teamMembers: TeamMember[];
  usedProducts: UsedProduct[];
  architectProjects: ArchitectProject[];
  collaborationPairs: CollabPair[];
  ownerProfile: OwnerProfile | null;
  ownerProfileId: string | null;
}

interface ProductNetworkData {
  usedInProjects: UsedInProject[];
  brandProducts: BrandProduct[];
  brandProfile: OwnerProfile | null;
  brandProfileId: string | null;
}

/* ── Props ──────────────────────────────────────────────────────────────── */

export interface MapDetailSidebarProps {
  selected: MapPin | null;
  similarPins: MapPin[];
  allPins: MapPin[];
  onClose: () => void;
  onSelectPin: (pin: MapPin) => void;
  /** Callback to highlight related pin IDs on the map */
  onHighlightPins: (ids: Set<string>) => void;
  /** Callback to filter map by ownerName */
  onFilterByOwner: (ownerName: string) => void;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function MapDetailSidebar({
  selected,
  similarPins,
  allPins,
  onClose,
  onSelectPin,
  onHighlightPins,
  onFilterByOwner,
}: MapDetailSidebarProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch network data when a pin is selected
  useEffect(() => {
    if (!selected || !selected.entityId) {
      setNetworkData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNetworkData(null);

    fetch(`/api/explore/network?listingId=${selected.entityId}&type=${selected.type}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setNetworkData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selected]);

  // Compute and emit related pin IDs when network data changes
  useEffect(() => {
    if (!selected || !networkData) {
      onHighlightPins(new Set());
      return;
    }

    const relatedIds = new Set<string>();

    if (selected.type === "project") {
      const data = networkData as Partial<ProjectNetworkData>;
      for (const p of data.architectProjects ?? []) relatedIds.add(`project-${p.id}`);
      for (const p of data.usedProducts ?? []) relatedIds.add(`product-${p.id}`);
      if (selected.ownerProfileId) {
        relatedIds.add(`designer-${selected.ownerProfileId}`);
        relatedIds.add(`brand-${selected.ownerProfileId}`);
      }
    } else if (selected.type === "product") {
      const data = networkData as Partial<ProductNetworkData>;
      for (const p of data.usedInProjects ?? []) relatedIds.add(`project-${p.id}`);
      for (const p of data.brandProducts ?? []) relatedIds.add(`product-${p.id}`);
      if (data.brandProfileId) relatedIds.add(`brand-${data.brandProfileId}`);
    } else if (selected.type === "brand") {
      const data = networkData as Partial<BrandNetworkData>;
      for (const id of data.relatedProjectIds ?? []) relatedIds.add(`project-${id}`);
      for (const id of data.relatedDesignerIds ?? []) relatedIds.add(`designer-${id}`);
    } else if (selected.type === "designer") {
      const data = networkData as Partial<DesignerNetworkData>;
      for (const id of data.relatedProjectIds ?? []) relatedIds.add(`project-${id}`);
      for (const id of data.relatedBrandIds ?? []) relatedIds.add(`brand-${id}`);
    }

    onHighlightPins(relatedIds);
  }, [selected, networkData, onHighlightPins]);

  const handleShare = useCallback(async (pin: MapPin) => {
    const url = `${window.location.origin}${pin.href}`;
    if (navigator.share) {
      try { await navigator.share({ title: pin.title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // Find same-architect pins from allPins
  const sameArchitectPins = selected?.ownerName
    ? allPins.filter((p) =>
        p.id !== selected.id &&
        p.type === "project" &&
        p.ownerName === selected.ownerName
      ).slice(0, 4)
    : [];

  const handleClickArchitect = useCallback(() => {
    if (selected?.ownerName) {
      onFilterByOwner(selected.ownerName);
    }
  }, [selected, onFilterByOwner]);

  // Reset state on pin change
  useEffect(() => {
    setCopied(false);
    setSaved(false);
  }, [selected?.id]);

  return (
    <div
      className={`absolute bottom-0 right-0 top-0 z-20 w-full overflow-hidden bg-white shadow-2xl transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[420px] ${
        selected
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-full opacity-0"
      }`}
    >
      {selected && (
        <div className="flex h-full flex-col">
          {/* Close */}
          <div className="absolute right-3 top-3 z-10 flex gap-1.5">
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-sm backdrop-blur transition-all hover:scale-105 hover:text-zinc-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* ── 1. Hero Image ──────────────────────────────── */}
            {selected.imageUrl ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100">
                <img src={selected.imageUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <span
                    className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                    style={{ background: COLORS[selected.type] }}
                  >
                    {LABELS[selected.type]}
                  </span>
                  {selected.category && (
                    <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                      {selected.category}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-zinc-50">
                <span className="text-xs text-zinc-300">No image</span>
                <div className="absolute bottom-3 left-3">
                  <span
                    className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                    style={{ background: COLORS[selected.type] }}
                  >
                    {LABELS[selected.type]}
                  </span>
                </div>
              </div>
            )}

            {/* ── 2. Header ──────────────────────────────── */}
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-lg font-semibold leading-tight text-zinc-900">
                {selected.title}
              </h2>

              {/* Owner / Architect — clickable */}
              {selected.ownerName && (
                <button
                  onClick={handleClickArchitect}
                  className="mt-1 text-left text-sm text-zinc-600 transition-colors hover:text-[#002abf]"
                >
                  {selected.type === "project" ? "by " : ""}
                  <span className="font-medium text-zinc-800 hover:text-[#002abf]">{selected.ownerName}</span>
                  <svg className="ml-1 inline h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}

              {/* Location */}
              {selected.locationLabel && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500">
                  <svg className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                  </svg>
                  {selected.locationLabel}
                </p>
              )}

              {/* Year + Category chips */}
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.year && (
                  <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                    {selected.year}
                  </span>
                )}
                {selected.subtitle && selected.subtitle !== selected.category && (
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                    {selected.subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* ── 3. Actions ──────────────────────────────── */}
            <div className="flex gap-2 px-5 pb-4">
              <Link
                href={selected.href}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#002abf] px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-[#0022a0] hover:shadow-md active:scale-[0.98]"
              >
                View {LABELS[selected.type]}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <button
                onClick={() => setSaved((s) => !s)}
                title={saved ? "Saved" : "Save"}
                className={`flex items-center justify-center rounded-lg px-3 py-2.5 ring-1 transition-all active:scale-95 ${
                  saved
                    ? "bg-[#002abf]/5 text-[#002abf] ring-[#002abf]/20"
                    : "text-zinc-500 ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <svg className="h-4 w-4" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
              </button>
              <button
                onClick={() => handleShare(selected)}
                title="Share"
                className="flex items-center justify-center rounded-lg px-3 py-2.5 text-zinc-500 ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 active:scale-95"
              >
                {copied ? (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 0-2.186 2.25 2.25 0 0 0 0 2.186Zm0 12.814a2.25 2.25 0 1 0 0 2.186 2.25 2.25 0 0 0 0-2.186Z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="mx-5 border-t border-zinc-100" />

            {/* ── 4. Network loading ──────────────────────── */}
            {loading && (
              <div className="flex items-center gap-2 px-5 py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-[#002abf]" />
                <span className="text-xs text-zinc-400">Loading connections…</span>
              </div>
            )}

            {/* ── 5. PROJECT network sections ────────────── */}
            {selected.type === "project" && networkData && !loading && (() => {
              const raw = networkData as Partial<ProjectNetworkData>;
              const data = {
                ownerProfile: raw.ownerProfile ?? null,
                ownerProfileId: raw.ownerProfileId ?? null,
                teamMembers: raw.teamMembers ?? [],
                usedProducts: raw.usedProducts ?? [],
                collaborationPairs: raw.collaborationPairs ?? [],
                architectProjects: raw.architectProjects ?? [],
              };
              return (
                <>
                  {/* Owner / Architect Profile */}
                  {data.ownerProfile && (
                    <div className="px-5 py-4">
                      <SectionTitle icon="user">Architect / Studio</SectionTitle>
                      <Link
                        href={data.ownerProfile.username ? `/u/${data.ownerProfile.username}` : selected.href}
                        className="mt-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200">
                          {data.ownerProfile.avatarUrl ? (
                            <img src={data.ownerProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-zinc-500">
                              {(data.ownerProfile.displayName ?? "?")[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {data.ownerProfile.displayName ?? "Unknown"}
                          </div>
                          {data.ownerProfile.username && (
                            <div className="text-xs text-zinc-400">@{data.ownerProfile.username}</div>
                          )}
                        </div>
                        <svg className="h-4 w-4 shrink-0 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    </div>
                  )}

                  {/* Team Members */}
                  {data.teamMembers.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="team">Team Members</SectionTitle>
                      <div className="mt-2 space-y-1">
                        {data.teamMembers.map((m) => (
                          <TeamMemberRow
                            key={m.profileId}
                            member={m}
                            allPins={allPins}
                            onSelectPin={onSelectPin}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Used Products */}
                  {data.usedProducts.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="product">Products Used</SectionTitle>
                      <div className="mt-2 space-y-1">
                        {data.usedProducts.map((p) => (
                          <ProductRow key={p.id} product={p} allPins={allPins} onSelectPin={onSelectPin} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collaboration hints */}
                  {data.collaborationPairs.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="collab">Collaborations</SectionTitle>
                      <div className="mt-2 space-y-1.5">
                        {data.collaborationPairs.map((pair, i) => (
                          <div
                            key={i}
                            className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600"
                          >
                            <span className="font-medium text-zinc-900">{pair.nameA}</span>
                            {" & "}
                            <span className="font-medium text-zinc-900">{pair.nameB}</span>
                            {" worked together on "}
                            <span className="font-semibold text-[#002abf]">{pair.count} projects</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* More from this architect */}
                  {data.architectProjects.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="architect">
                        More from {data.ownerProfile?.displayName ?? selected.ownerName ?? "this architect"}
                      </SectionTitle>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {data.architectProjects.map((p) => {
                          const mapPin = allPins.find((pin) => pin.entityId === p.id && pin.type === "project");
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (mapPin) onSelectPin(mapPin);
                              }}
                              className="group overflow-hidden rounded-lg text-left ring-1 ring-zinc-100 transition-all hover:ring-zinc-200 hover:shadow-sm"
                            >
                              {p.coverUrl ? (
                                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                                  <img src={p.coverUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                              ) : (
                                <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50">
                                  <span className="text-[9px] text-zinc-300">No image</span>
                                </div>
                              )}
                              <div className="p-2">
                                <div className="truncate text-xs font-medium text-zinc-900">{p.title}</div>
                                {(p.city || p.year) && (
                                  <div className="truncate text-[10px] text-zinc-400">
                                    {[p.city, p.year].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── 6. PRODUCT network sections ────────────── */}
            {selected.type === "product" && networkData && !loading && (() => {
              const raw = networkData as Partial<ProductNetworkData>;
              const data = {
                brandProfile: raw.brandProfile ?? null,
                brandProfileId: raw.brandProfileId ?? null,
                usedInProjects: raw.usedInProjects ?? [],
                brandProducts: raw.brandProducts ?? [],
              };
              return (
                <>
                  {/* Brand profile */}
                  {data.brandProfile && (
                    <div className="px-5 py-4">
                      <SectionTitle icon="brand">Brand</SectionTitle>
                      <Link
                        href={data.brandProfile.username ? `/u/${data.brandProfile.username}` : selected.href}
                        className="mt-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200">
                          {data.brandProfile.avatarUrl ? (
                            <img src={data.brandProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-zinc-500">
                              {(data.brandProfile.displayName ?? "?")[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {data.brandProfile.displayName ?? "Unknown"}
                          </div>
                        </div>
                        <svg className="h-4 w-4 shrink-0 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    </div>
                  )}

                  {/* Used in projects */}
                  {data.usedInProjects.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="project">Used in Projects</SectionTitle>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {data.usedInProjects.map((p) => {
                          const mapPin = allPins.find((pin) => pin.entityId === p.id && pin.type === "project");
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (mapPin) onSelectPin(mapPin);
                              }}
                              className="group overflow-hidden rounded-lg text-left ring-1 ring-zinc-100 transition-all hover:ring-zinc-200 hover:shadow-sm"
                            >
                              {p.coverUrl ? (
                                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                                  <img src={p.coverUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                              ) : (
                                <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50">
                                  <span className="text-[9px] text-zinc-300">No image</span>
                                </div>
                              )}
                              <div className="p-2">
                                <div className="truncate text-xs font-medium text-zinc-900">{p.title}</div>
                                {p.ownerName && (
                                  <div className="truncate text-[10px] text-zinc-400">by {p.ownerName}</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* More from this brand */}
                  {data.brandProducts.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="brand">
                        More from {data.brandProfile?.displayName ?? "this brand"}
                      </SectionTitle>
                      <div className="mt-2 space-y-1">
                        {data.brandProducts.map((p) => {
                          const mapPin = allPins.find((pin) => pin.entityId === p.id && pin.type === "product");
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (mapPin) onSelectPin(mapPin);
                              }}
                              className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-zinc-50"
                            >
                              <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {p.coverUrl ? (
                                  <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-[9px] text-zinc-400">—</span>
                                )}
                              </span>
                              <span className="truncate text-xs font-medium text-zinc-800">{p.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── 7. BRAND network sections ──────────────── */}
            {selected.type === "brand" && networkData && !loading && (() => {
              const raw = networkData as Partial<BrandNetworkData>;
              const data = {
                brandProfile: raw.brandProfile ?? null,
                popularProducts: raw.popularProducts ?? [],
                totalProducts: raw.totalProducts ?? 0,
                usedInProjectsCount: raw.usedInProjectsCount ?? 0,
                relatedProjectIds: raw.relatedProjectIds ?? [],
                relatedDesignerIds: raw.relatedDesignerIds ?? [],
              };
              return (
                <>
                  {/* Brand stats */}
                  {(data.totalProducts > 0 || data.usedInProjectsCount > 0) && (
                    <div className="flex gap-4 px-5 py-3">
                      {data.totalProducts > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-zinc-900">{data.totalProducts}</div>
                          <div className="text-[10px] text-zinc-400">Products</div>
                        </div>
                      )}
                      {data.usedInProjectsCount > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-zinc-900">{data.usedInProjectsCount}</div>
                          <div className="text-[10px] text-zinc-400">Used in Projects</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Popular products */}
                  {data.popularProducts.length > 0 && (
                    <div className="border-t border-zinc-100 px-5 py-4">
                      <SectionTitle icon="product">
                        Popular Products{data.totalProducts > 0 ? ` · ${data.totalProducts}` : ""}
                      </SectionTitle>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {data.popularProducts.map((p) => {
                          const mapPin = allPins.find((pin) => pin.entityId === p.id && pin.type === "product");
                          return (
                            <button
                              key={p.id}
                              onClick={() => { if (mapPin) onSelectPin(mapPin); }}
                              className="group overflow-hidden rounded-lg text-left ring-1 ring-zinc-100 transition-all hover:ring-zinc-200 hover:shadow-sm"
                            >
                              {p.coverUrl ? (
                                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                                  <img src={p.coverUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                              ) : (
                                <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50">
                                  <span className="text-[9px] text-zinc-300">No image</span>
                                </div>
                              )}
                              <div className="p-2">
                                <div className="truncate text-xs font-medium text-zinc-900">{p.title}</div>
                                <div className="flex items-center gap-1">
                                  {p.category && (
                                    <span className="truncate text-[10px] text-zinc-400">{p.category}</span>
                                  )}
                                  {p.projectUsageCount > 0 && (
                                    <span className="text-[10px] text-zinc-300">· {p.projectUsageCount} {p.projectUsageCount === 1 ? "project" : "projects"}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {data.totalProducts > data.popularProducts.length && (
                        <Link
                          href={selected.href}
                          className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-[#002abf] transition-colors hover:text-[#0022a0]"
                        >
                          View all products
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── 7b. DESIGNER network sections ─────────────── */}
            {selected.type === "designer" && networkData && !loading && (() => {
              const raw = networkData as Partial<DesignerNetworkData>;
              const data = {
                designerProfile: raw.designerProfile ?? null,
                designerProjects: raw.designerProjects ?? [],
                totalProjects: raw.totalProjects ?? 0,
                relatedBrandIds: raw.relatedBrandIds ?? [],
                relatedProjectIds: raw.relatedProjectIds ?? [],
              };
              return (
                <>
                  {/* Designer projects */}
                  {data.designerProjects.length > 0 && (
                    <div className="px-5 py-4">
                      <SectionTitle icon="project">
                        Projects{data.totalProjects > 0 ? ` · ${data.totalProjects}` : ""}
                      </SectionTitle>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {data.designerProjects.map((p) => {
                          const mapPin = allPins.find((pin) => pin.entityId === p.id && pin.type === "project");
                          return (
                            <button
                              key={p.id}
                              onClick={() => { if (mapPin) onSelectPin(mapPin); }}
                              className="group overflow-hidden rounded-lg text-left ring-1 ring-zinc-100 transition-all hover:ring-zinc-200 hover:shadow-sm"
                            >
                              {p.coverUrl ? (
                                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                                  <img src={p.coverUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                              ) : (
                                <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50">
                                  <span className="text-[9px] text-zinc-300">No image</span>
                                </div>
                              )}
                              <div className="p-2">
                                <div className="truncate text-xs font-medium text-zinc-900">{p.title}</div>
                                {(p.city || p.year) && (
                                  <div className="truncate text-[10px] text-zinc-400">
                                    {[p.city, p.year].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {data.totalProjects > data.designerProjects.length && (
                        <Link
                          href={selected.href}
                          className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-[#002abf] transition-colors hover:text-[#0022a0]"
                        >
                          View full portfolio
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Fallback if no projects */}
                  {data.designerProjects.length === 0 && (
                    <div className="px-5 py-4">
                      <div className="rounded-lg bg-zinc-50 px-4 py-3">
                        <p className="text-xs font-medium text-zinc-600">
                          Visit this designer&apos;s profile to explore their portfolio and collaborations.
                        </p>
                        <Link
                          href={selected.href}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#002abf] transition-colors hover:text-[#0022a0]"
                        >
                          Explore full details
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── 7c. Brand/Designer — loading fallback ──── */}
            {(selected.type === "designer" || selected.type === "brand") && !networkData && !loading && (
              <div className="px-5 py-4">
                <div className="rounded-lg bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-medium text-zinc-600">
                    {selected.type === "designer"
                      ? "Visit this designer's profile to explore their portfolio and collaborations."
                      : "Visit this brand's profile to discover their product catalog and featured projects."}
                  </p>
                  <Link
                    href={selected.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#002abf] transition-colors hover:text-[#0022a0]"
                  >
                    Explore full details
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}

            {/* ── 8. Similar / Related ──────────────────── */}
            {similarPins.length > 0 && (
              <div className="border-t border-zinc-100 px-5 py-4">
                <SectionTitle icon="related">
                  {selected.type === "project" ? "Nearby Projects" : "Similar Nearby"}
                </SectionTitle>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {similarPins.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectPin(p)}
                      className="group overflow-hidden rounded-lg text-left ring-1 ring-zinc-100 transition-all hover:ring-zinc-200 hover:shadow-sm"
                    >
                      {p.imageUrl ? (
                        <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        </div>
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50">
                          <span className="text-[9px] text-zinc-300">No image</span>
                        </div>
                      )}
                      <div className="p-2">
                        <div className="truncate text-xs font-medium text-zinc-900">{p.title}</div>
                        {p.locationLabel && (
                          <div className="truncate text-[10px] text-zinc-400">{p.locationLabel}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Same Architect on Map ──────────────────── */}
            {sameArchitectPins.length > 0 && (
              <div className="border-t border-zinc-100 px-5 py-4">
                <SectionTitle icon="architect">Same Architect on Map</SectionTitle>
                <div className="mt-2 space-y-1">
                  {sameArchitectPins.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectPin(p)}
                      className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-zinc-50"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: COLORS[p.type] }}
                      />
                      <span className="truncate text-xs font-medium text-zinc-800">{p.title}</span>
                      {p.locationLabel && (
                        <span className="ml-auto shrink-0 text-[10px] text-zinc-400">{p.locationLabel.split(",")[0]}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
            <p className="text-[11px] text-zinc-400">
              Click map to close
            </p>
            <Link
              href={selected.href}
              className="text-[11px] font-medium text-[#002abf] transition-colors hover:text-[#0022a0]"
            >
              Full details →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  const iconMap: Record<string, React.ReactNode> = {
    user: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    team: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    product: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    collab: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    architect: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    brand: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
      </svg>
    ),
    related: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
      </svg>
    ),
    project: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
      </svg>
    ),
  };
  return (
    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
      {iconMap[icon] ?? null}
      {children}
    </h3>
  );
}

function TeamMemberRow({ member, allPins, onSelectPin }: { member: TeamMember; allPins: MapPin[]; onSelectPin: (pin: MapPin) => void }) {
  // Check if this team member has a designer/brand pin on the map
  const mapPin = allPins.find(
    (p) => (p.type === "designer" || p.type === "brand") && p.ownerProfileId === member.profileId
  );

  const content = (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-medium text-zinc-500">
            {(member.displayName ?? "?")[0]?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-zinc-900">
          {member.displayName ?? "Unknown"}
        </div>
        {member.title && (
          <div className="truncate text-[10px] text-zinc-400">{member.title}</div>
        )}
      </div>
      {mapPin && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[mapPin.type] }} title="On map" />
      )}
    </div>
  );

  if (mapPin) {
    return (
      <button
        onClick={() => onSelectPin(mapPin)}
        className="w-full rounded-md p-1.5 text-left transition-colors hover:bg-zinc-50"
      >
        {content}
      </button>
    );
  }

  if (member.username) {
    return (
      <Link
        href={`/u/${member.username}`}
        className="block rounded-md p-1.5 transition-colors hover:bg-zinc-50"
      >
        {content}
      </Link>
    );
  }

  return <div className="p-1.5">{content}</div>;
}

function ProductRow({ product, allPins, onSelectPin }: { product: UsedProduct; allPins: MapPin[]; onSelectPin: (pin: MapPin) => void }) {
  const mapPin = allPins.find((p) => p.entityId === product.id && p.type === "product");

  const inner = (
    <div className="flex items-center gap-3">
      <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded bg-zinc-100">
        {product.coverUrl ? (
          <img src={product.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[9px] text-zinc-400">—</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-zinc-900">{product.title}</div>
        {product.brandName && (
          <div className="truncate text-[10px] text-zinc-400">{product.brandName}</div>
        )}
      </div>
      {mapPin && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#059669]" title="On map" />
      )}
    </div>
  );

  if (mapPin) {
    return (
      <button
        onClick={() => onSelectPin(mapPin)}
        className="w-full rounded-md p-1.5 text-left transition-colors hover:bg-zinc-50"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={`/products/${product.slug ?? product.id}`}
      className="block rounded-md p-1.5 transition-colors hover:bg-zinc-50"
    >
      {inner}
    </Link>
  );
}
