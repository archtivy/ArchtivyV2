/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async redirects() {
    return [
      { source: "/pricing", destination: "/", permanent: false },
    ];
  },
images: {
  /*
   * ── HOW LONG AN OPTIMISED IMAGE SURVIVES ──────────────────────────────────
   * Measured, not guessed. The first request for a listing hero costs 3–8s:
   * the optimiser downloads a 1.9MB WebP from Supabase storage, decodes it and
   * re-encodes it. Served from cache the same request is ~2ms. Cold LCP on a
   * project detail page was 6.3s against 0.9s warm, and that gap is the whole
   * of the "slow to open" complaint.
   *
   * Without this setting the entry expires after one hour — Next takes the
   * larger of `minimumCacheTTL` and the upstream max-age, and Supabase storage
   * sends `max-age=3600`. So any listing not viewed for an hour pays the full
   * 3–8s again, per image, per region.
   *
   * 30 days is safe here because these URLs are immutable: every stored object
   * is named by UUID, so replacing a listing's photograph writes a NEW url and
   * the old entry is simply never requested again. There is no path by which a
   * longer TTL serves a stale image.
   */
  minimumCacheTTL: 2592000,
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**.supabase.co",
      pathname: "/storage/v1/**",
    },
    {
      protocol: "https",
      hostname: "img.clerk.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "**.clerk.accounts.dev",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "archtivy.com",
      pathname: "/**",
    },
    {
      protocol: "http",
      hostname: "localhost",
      pathname: "/**",
    },
  ],
},
};

export default nextConfig;
