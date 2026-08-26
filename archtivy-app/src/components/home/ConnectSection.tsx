import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ConnectChain } from "@/lib/db/connectShowcase";

/**
 * Connect — one real chain through the graph, chosen by the graph itself.
 *
 * Project → Designer → Product → Brand → also used in.
 *
 * ── EVERY NODE IS A REAL ROW, AND EVERY LINK RESOLVES ───────────────────────
 * Nothing here is illustrative. The selection query (lib/db/connectShowcase.ts)
 * only returns a chain when all five hops exist against live, APPROVED rows, so
 * this section cannot render a hop that dead-ends. When no project qualifies it
 * returns null and the section does not appear — the same self-activating
 * pattern used elsewhere on the site, rather than a hand-drawn placeholder
 * chain that would need removing later.
 *
 * ── WHY THE ARROWS ARE NOT LINKS ────────────────────────────────────────────
 * Each node links to its own page; the arrows between them are decorative and
 * marked aria-hidden. A screen reader gets five destinations, not five
 * destinations interleaved with punctuation.
 */

function Node({
  href,
  kind,
  title,
  subtitle,
  imageUrl,
  rounded,
}: {
  href: string;
  kind: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  /** Brands and designers read as avatars; listings read as cards. */
  rounded?: boolean;
}) {
  return (
    <li className="flex min-w-[132px] max-w-[168px] shrink-0 flex-col">
      <span className="mb-2 font-body text-[11px] uppercase tracking-[0.08em] text-muted">
        {kind}
      </span>
      <Link href={href} className="group block">
        <div
          className={[
            "relative w-full overflow-hidden bg-stone",
            rounded ? "aspect-square rounded-lg" : "aspect-[4/3] rounded-lg",
          ].join(" ")}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="168px"
              className={[
                "transition-transform duration-300 group-hover:scale-[1.03]",
                rounded ? "object-contain p-3" : "object-cover",
              ].join(" ")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-[20px] text-muted">
              {title.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <p className="mt-2.5 truncate font-body text-[13px] font-medium text-ink group-hover:underline">
          {title}
        </p>
        {subtitle && (
          <p className="truncate font-body text-[12px] text-muted">{subtitle}</p>
        )}
      </Link>
    </li>
  );
}

function Arrow() {
  return (
    <li aria-hidden className="shrink-0 self-center pt-6 text-muted">
      <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
    </li>
  );
}

export function ConnectSection({ chain }: { chain: ConnectChain | null }) {
  if (!chain) return null;

  const projectHref = chain.project.slug ? `/projects/${chain.project.slug}` : "#";
  const productHref = chain.product.slug ? `/products/${chain.product.slug}` : "#";

  return (
    <section className="border-t border-hairline py-14" aria-labelledby="connect-heading">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <h2
            id="connect-heading"
            className="font-display text-[24px] leading-[32px] tracking-tight text-ink sm:text-[28px]"
          >
            Explore architecture through real connections.
          </h2>
          <p className="mt-4 max-w-[40ch] font-body text-[14px] leading-[24px] text-muted">
            Every project is connected to the people, products and brands that bring it to
            life.
          </p>
          <Link
            href={projectHref}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-body text-[13px] text-cream transition-opacity hover:opacity-90"
          >
            Explore this connection
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <ul className="flex items-start gap-3 overflow-x-auto pb-2 sm:gap-4">
            <Node
              href={projectHref}
              kind="Project"
              title={chain.project.title}
              subtitle={chain.project.subtitle}
              imageUrl={chain.project.imageUrl}
            />
            {chain.designer && (
              <>
                <Arrow />
                <Node
                  href={chain.designer.username ? `/u/${chain.designer.username}` : "#"}
                  kind="Designer"
                  title={chain.designer.title}
                  subtitle={chain.designer.subtitle}
                  imageUrl={chain.designer.imageUrl}
                  rounded
                />
              </>
            )}
            <Arrow />
            <Node
              href={productHref}
              kind="Product"
              title={chain.product.title}
              subtitle={chain.product.subtitle}
              imageUrl={chain.product.imageUrl}
              rounded
            />
            {chain.brand && (
              <>
                <Arrow />
                <Node
                  href={chain.brand.username ? `/u/${chain.brand.username}` : "#"}
                  kind="Brand"
                  title={chain.brand.title}
                  subtitle={chain.brand.subtitle}
                  imageUrl={chain.brand.imageUrl}
                  rounded
                />
              </>
            )}

            {chain.alsoUsedIn.length > 0 && (
              <>
                <Arrow />
                <li className="flex min-w-[132px] shrink-0 flex-col">
                  <span className="mb-2 font-body text-[11px] uppercase tracking-[0.08em] text-muted">
                    Also used in
                  </span>
                  <Link href={productHref} className="group block">
                    <div className="grid grid-cols-2 gap-1.5">
                      {chain.alsoUsedIn.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="relative aspect-square overflow-hidden rounded bg-stone"
                        >
                          {p.imageUrl && (
                            <Image src={p.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 font-body text-[13px] font-medium text-ink group-hover:underline">
                      {chain.alsoUsedInCount}{" "}
                      {chain.alsoUsedInCount === 1 ? "other project" : "other projects"}
                    </p>
                    <p className="font-body text-[12px] text-muted">See all projects</p>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
