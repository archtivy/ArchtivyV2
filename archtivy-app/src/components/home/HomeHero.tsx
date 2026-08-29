import Image from "next/image";
import Link from "next/link";
import { HomeHeroSearch } from "@/components/search/HomeHeroSearch";
import { ShareWorkTrigger } from "@/components/ShareWorkTrigger";
import { getHomeHeroGridItems, type HeroGridItem } from "@/lib/db/homeHero";

function HeroGridCell({
  item,
  className,
}: {
  item: HeroGridItem;
  className: string;
}) {
  const external = item.imageUrl.startsWith("http");
  return (
    <Link
      href={item.href}
      className={`group relative block min-h-0 overflow-hidden bg-zinc-900 ${className}`}
    >
      <Image
        src={item.imageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 33vw, 25vw"
        className="object-cover brightness-[0.7] transition duration-300 group-hover:brightness-[0.85]"
        unoptimized={external}
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[11px] font-medium text-white/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:px-3 sm:py-2.5 sm:text-xs"
        aria-hidden
      >
        {item.title}
      </span>
      <span className="sr-only">{item.title}</span>
    </Link>
  );
}

function HeroPhotoGrid({ items }: { items: HeroGridItem[] }) {
  const slots: (HeroGridItem | null)[] = [
    items[0] ?? null,
    items[1] ?? null,
    items[2] ?? null,
    items[3] ?? null,
    items[4] ?? null,
  ];

  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-2" aria-hidden>
      {slots[0] ? (
        <HeroGridCell item={slots[0]} className="row-span-2" />
      ) : (
        <div className="row-span-2 bg-zinc-800" />
      )}
      {slots.slice(1).map((item, i) =>
        item ? (
          <HeroGridCell key={item.id} item={item} className="" />
        ) : (
          <div key={`empty-${i}`} className="bg-zinc-800" />
        )
      )}
    </div>
  );
}

export async function HomeHero() {
  const gridItems = await getHomeHeroGridItems();

  return (
    <section
      className="relative left-1/2 m-0 w-screen -translate-x-1/2 overflow-hidden p-0"
      aria-label="Homepage hero"
    >
      <div className="relative h-[70vh] max-h-[760px] min-h-[280px]">
        {gridItems.length > 0 ? (
          <HeroPhotoGrid items={gridItems} />
        ) : (
          <div className="h-full bg-zinc-900" aria-hidden />
        )}
        <div
          className="absolute inset-0 bg-[rgba(0,0,0,0.55)]"
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
              Architectural Specification Intelligence
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl font-serif text-3xl font-normal tracking-tight text-white sm:text-4xl md:text-5xl">
              The intelligence layer of architecture.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-200 sm:text-lg">
              The platform where architectural work is documented, products are credited, and
              professionals connect across cities.
            </p>
            <div className="mt-8 flex w-full flex-col items-center gap-4 [&_p]:text-zinc-300">
              <HomeHeroSearch />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/projects"
                className="inline-block rounded-[20px] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 focus:ring-offset-transparent"
                style={{ backgroundColor: "#002abf" }}
              >
                Explore the Network
              </Link>
              <ShareWorkTrigger className="inline-block rounded-[20px] border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent">
                Share your work
              </ShareWorkTrigger>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
