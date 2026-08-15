import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal, allow-list markdown renderer for article bodies.
 *
 * WHY THIS EXISTS RATHER THAN A DEPENDENCY
 * The app has 14 dependencies and no markdown or rich-text library. Article
 * bodies need headings, emphasis, links, lists and quotes — not the full
 * CommonMark surface. A hand-rolled subset avoids a client editor bundle and,
 * more importantly, avoids ever storing or rendering author-authored HTML.
 *
 * SECURITY MODEL
 * Raw HTML in the source is NOT parsed — it is emitted as literal text by
 * React, because every value below reaches the tree as a string child or as a
 * validated href, never through dangerouslySetInnerHTML. So `<script>alert(1)`
 * in a body renders as visible characters, not as a script. Link hrefs are
 * additionally restricted to http(s) and site-relative paths, which blocks
 * javascript: and data: URLs.
 *
 * Deliberately unsupported: images (covers are a separate field), tables, raw
 * HTML, footnotes, nested lists. Adding any of them means extending the
 * allow-list explicitly rather than widening a parser.
 */

const WORDS_PER_MINUTE = 225;

/** Derived on every write, never hand-edited. Reproducible from body_md. */
export function readTimeMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\-[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** First ~N characters of prose, for meta descriptions and card fallbacks. */
export function excerptFrom(markdown: string, max = 160): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, plain.lastIndexOf(" ", max) || max)}…`;
}

/** http(s) and site-relative only. Everything else is dropped to plain text. */
function safeHref(href: string): string | null {
  const h = href.trim();
  if (h.startsWith("/")) return h;
  if (/^https?:\/\//i.test(h)) return h;
  return null;
}

/** Inline pass: **bold**, *italic*, `code`, [text](href). */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-i${i++}`;

    if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-stone/60 px-1 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = safeHref(token.slice(split + 2, -1));
      if (!href) {
        out.push(label);
      } else if (href.startsWith("/")) {
        out.push(
          <Link key={key} href={href} className="underline underline-offset-4 hover:text-ink">
            {label}
          </Link>
        );
      } else {
        out.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-4 hover:text-ink"
          >
            {label}
          </a>
        );
      }
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Block pass. Returns a React tree — no HTML string is produced at any point,
 * so there is nothing to sanitize on the way out.
 */
export function renderMarkdown(markdown: string): ReactNode {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let n = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (!text) return;
    blocks.push(
      <p key={`p${n++}`} className="font-body text-[17px] leading-[30px] text-ink/85">
        {renderInline(text, `p${n}`)}
      </p>
    );
  };
  const flushList = () => {
    if (!list || list.items.length === 0) {
      list = null;
      return;
    }
    const { ordered, items } = list;
    list = null;
    const cls = "ml-5 space-y-2 font-body text-[17px] leading-[30px] text-ink/85";
    const children = items.map((it, idx) => (
      <li key={idx} className="pl-1">
        {renderInline(it, `l${n}-${idx}`)}
      </li>
    ));
    blocks.push(
      ordered ? (
        <ol key={`ol${n++}`} className={`${cls} list-decimal`}>
          {children}
        </ol>
      ) : (
        <ul key={`ul${n++}`} className={`${cls} list-disc`}>
          {children}
        </ul>
      )
    );
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    const text = quote.join(" ").trim();
    quote = [];
    if (!text) return;
    blocks.push(
      <blockquote
        key={`q${n++}`}
        className="border-l-2 border-ink/25 pl-5 font-display text-[20px] leading-[32px] text-ink"
      >
        {renderInline(text, `q${n}`)}
      </blockquote>
    );
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${n}`);
      blocks.push(
        level === 2 ? (
          <h2
            key={`h${n++}`}
            className="mt-4 font-display text-[26px] leading-[1.2] tracking-tight text-ink"
          >
            {content}
          </h2>
        ) : (
          <h3 key={`h${n++}`} className="mt-2 font-body text-[19px] font-medium text-ink">
            {content}
          </h3>
        )
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      flushList();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();

  return <div className="space-y-6">{blocks}</div>;
}
