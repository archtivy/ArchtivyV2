"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";

interface NetworkFeedItem {
  type: "project" | "product";
  project?: ProjectCanonical;
  product?: ProductCanonical;
  reason: string;
}

interface NetworkFeedResponse {
  items: NetworkFeedItem[];
  followCount: number;
}

export function NetworkFeedSection() {
  const { isSignedIn, isLoaded } = useUser();
  const [data, setData] = useState<NetworkFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }
    fetch("/api/network-feed")
      .then((r) => r.json())
      .then((json: NetworkFeedResponse) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  // Not signed in — invisible
  if (!isSignedIn) return null;

  // Loading — subtle skeleton
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-52 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="mb-2 h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="aspect-[3/2] animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // No follows — editorial prompt
  if (data && data.followCount === 0) {
    return (
      <section>
        <div className="rounded border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Your network
          </p>
          <h2 className="mx-auto mt-3 max-w-md font-serif text-xl font-normal tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Architecture is a connected discipline.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Follow the designers, brands, categories, and materials that shape your practice. Their latest work will appear here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/explore/projects"
              className="inline-block rounded-[20px] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
              style={{ backgroundColor: "#002abf" }}
            >
              Explore the network
            </Link>
            <Link
              href="/explore/designers"
              className="inline-block rounded-[20px] border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus:outline-none dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Browse designers
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Has follows but no matching items yet
  if (!data || data.items.length === 0) {
    if (data && data.followCount > 0) {
      return (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            From your network
          </h2>
          <div className="rounded border border-zinc-200 bg-white px-6 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No recent activity from your network yet. New projects and products from the people and topics you follow will appear here.
            </p>
          </div>
        </section>
      );
    }
    return null;
  }

  // Render feed
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
        From your network
      </h2>
      <ul
        className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="From your network"
      >
        {data.items.map((item) => {
          const id = item.project?.id ?? item.product?.id ?? "";
          return (
            <li key={id} className="h-full">
              <p className="mb-1.5 truncate text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {item.reason}
              </p>
              {item.type === "project" && item.project ? (
                <ProjectCardPremium project={item.project} />
              ) : item.type === "product" && item.product ? (
                <ProductCardPremium product={item.product} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
