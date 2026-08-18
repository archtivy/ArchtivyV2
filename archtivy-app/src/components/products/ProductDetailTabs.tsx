"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import { documentDownloadHref } from "@/lib/documents/downloadHref";
import type { ProductDetail } from "@/lib/db/productDetail";

/**
 * Product detail tabs (brief §5).
 *
 * TAB SET, and why — measured against production:
 *   About      always
 *   Details    always; rows omitted individually when their field is null
 *   Downloads  CONDITIONAL on this product having >= 1 document
 *              (listing_documents, real for 49 of 76 products)
 *   Projects   CONDITIONAL on this product being tagged in >= 1 project
 *              (project_product_links, real for 12 of 76)
 *   Reviews    OMITTED PLATFORM-WIDE — no reviews/ratings table exists
 *   Q&A        OMITTED PLATFORM-WIDE — no table exists
 *
 * The two omissions are the Magazine/Activity case: no infrastructure at all,
 * so there is nothing to show an empty state for.
 */
export function ProductDetailTabs({ product }: { product: ProductDetail }) {
  const tabs = [
    { key: "about", label: "About", count: null as number | null },
    { key: "details", label: "Details", count: null as number | null },
    ...(product.documents.length > 0
      ? [{ key: "downloads", label: "Downloads", count: product.documents.length }]
      : []),
    ...(product.projects.length > 0
      ? [{ key: "projects", label: "Projects", count: product.projects.length }]
      : []),
  ];

  const [active, setActive] = useState("about");

  return (
    <div className="mt-8">
      <div className="border-b border-hairline">
        <ul className="flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((t) => {
            const isActive = t.key === active;
            return (
              <li key={t.key} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(t.key)}
                  className={[
                    "whitespace-nowrap border-b-2 px-4 py-3 font-body text-[14px] transition-colors",
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                  {t.count !== null && <span className="ml-1.5 opacity-60">{t.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="py-8" role="tabpanel">
        {active === "about" && <AboutPanel product={product} />}
        {active === "details" && <DetailsPanel product={product} />}
        {active === "downloads" && <DownloadsPanel product={product} />}
        {active === "projects" && <ProjectsPanel product={product} />}
      </div>
    </div>
  );
}

function AboutPanel({ product }: { product: ProductDetail }) {
  return (
    <div>
      {product.description ? (
        <div className="max-w-[68ch] space-y-4">
          {product.description
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((para, i) => (
              <p key={i} className="font-body text-[15px] leading-[26px] text-ink/85">
                {para.trim()}
              </p>
            ))}
        </div>
      ) : (
        <p className="font-body text-[14px] text-muted">No description added yet.</p>
      )}

      {/*
        The reference shows a fixed row of four attribute icons ("Premium
        Materials / Customizable / Made in Denmark / Sustainable Design") on
        every product. There is no per-product flag behind any of them, so a
        fixed set would assert four claims about products that may not be true.
        Instead the chips below are generated only from fields this product
        actually has.
      */}
      {(product.materials.length > 0 || product.styleLabel || product.year) && (
        <ul className="mt-8 flex flex-wrap gap-2">
          {product.styleLabel && <Chip>{product.styleLabel}</Chip>}
          {product.materials.map((m) => (
            <Chip key={m}>{m}</Chip>
          ))}
          {product.year && <Chip>{product.year}</Chip>}
        </ul>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-hairline px-3 py-1 font-body text-[12px] text-muted">
      {children}
    </li>
  );
}

function DetailsPanel({ product }: { product: ProductDetail }) {
  const rows: { label: string; value: string }[] = [];
  if (product.categoryLabel) rows.push({ label: "Category", value: product.categoryLabel });
  if (product.typeLabel) rows.push({ label: "Type", value: product.typeLabel });
  if (product.styleLabel) rows.push({ label: "Style", value: product.styleLabel });
  if (product.materials.length > 0)
    rows.push({ label: "Materials", value: product.materials.join(", ") });
  if (product.dimensions) rows.push({ label: "Dimensions", value: product.dimensions });
  if (product.year) rows.push({ label: "Year", value: String(product.year) });
  if (product.brand?.location) rows.push({ label: "Made in", value: product.brand.location });

  if (rows.length === 0) {
    return <p className="font-body text-[14px] text-muted">No specifications recorded yet.</p>;
  }

  return (
    <dl className="max-w-[52ch] divide-y divide-hairline border-y border-hairline">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-6 py-3">
          <dt className="shrink-0 font-body text-[13px] text-muted">{r.label}</dt>
          <dd className="text-right font-body text-[14px] text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DownloadsPanel({ product }: { product: ProductDetail }) {
  return (
    <ul className="max-w-[52ch] space-y-2">
      {product.documents.map((d) => {
        // NOT d.url. That is listing_documents.file_url, stored in the
        // /object/public/ form against a PRIVATE bucket, so it answers
        // {"error":"Bucket not found","code":"NoSuchBucket"} every time. This
        // panel is the live download surface for products, so that dead link
        // was the whole reported bug.
        const href = documentDownloadHref({ id: d.id, listing_id: product.id });
        const label = (
          <>
            <FileText strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-body text-[14px] text-ink">{d.name}</span>
            <Download strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </>
        );
        return (
          <li key={d.id}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 transition-colors hover:bg-stone/40"
              >
                {label}
              </a>
            ) : (
              <span
                className="flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 opacity-60"
                title="This file is unavailable"
              >
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Inverse of Project Detail's Products tab — same join, read the other way. */
function ProjectsPanel({ product }: { product: ProductDetail }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3">
      {product.projects.map((p) => (
        <EntityCard
          key={p.id}
          href={p.href}
          title={p.title}
          subtitle={p.architect}
          imageUrl={p.cover}
          imageCount={p.imageCount}
          avatarInitials={initialsOf(p.architect)}
          sizes="(max-width: 640px) 45vw, 30vw"
        />
      ))}
      {product.projects.length === 0 && (
        <p className="font-body text-[14px] text-muted">
          Not yet tagged in any project.{" "}
          <Link href="/projects" className="text-ink underline underline-offset-4">
            Browse projects
          </Link>
          .
        </p>
      )}
    </div>
  );
}
