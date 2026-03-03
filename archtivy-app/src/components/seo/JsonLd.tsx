import { serializeJsonLd } from "@/lib/seo/jsonld";

interface JsonLdProps {
  schemas: Record<string, unknown>[];
}

/**
 * Renders one or more JSON-LD schema objects as an inline <script> tag.
 * Multiple schemas are combined into a single @graph document to avoid
 * duplicate @context declarations and reduce DOM script count.
 * Empty schema objects are silently filtered out.
 */
export function JsonLd({ schemas }: JsonLdProps) {
  const valid = schemas.filter((s) => Object.keys(s).length > 0);
  if (valid.length === 0) return null;

  let payload: Record<string, unknown>;

  if (valid.length === 1) {
    payload = valid[0];
  } else {
    payload = {
      "@context": "https://schema.org",
      "@graph": valid.map(({ "@context": _ctx, ...rest }) => rest),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(payload) }}
    />
  );
}
