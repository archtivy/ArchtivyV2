export function MaintenanceLanding() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f3f4f6]">
      {/* Atmospheric plane */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 15% 10%, rgba(23, 61, 237, 0.12), transparent 55%), radial-gradient(ellipse 70% 60% at 90% 85%, rgba(0, 0, 41, 0.08), transparent 50%), linear-gradient(165deg, #eef0f4 0%, #f7f7f8 45%, #e8eaef 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,41,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,41,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
        <p
          className="animate-[maint-fade_0.9s_ease-out_both] text-3xl font-semibold tracking-[0.12em] text-[#002abf] sm:text-4xl md:text-5xl"
          style={{ fontFamily: "var(--font-lato, 'Lato', system-ui, sans-serif)" }}
        >
          archtivy
        </p>

        <h1
          className="mt-10 max-w-lg animate-[maint-fade_0.9s_ease-out_0.15s_both] text-2xl font-semibold tracking-tight text-[#000029] sm:text-3xl"
          style={{ fontFamily: "var(--font-lato, 'Lato', system-ui, sans-serif)" }}
        >
          We&apos;re preparing something new.
        </h1>

        <p
          className="mt-4 max-w-md animate-[maint-fade_0.9s_ease-out_0.3s_both] text-base leading-relaxed text-zinc-600 sm:text-lg"
          style={{ fontFamily: "var(--font-lato, 'Lato', system-ui, sans-serif)" }}
        >
          The intelligence layer of architecture is almost ready. Check back soon.
        </p>

        <a
          href="mailto:info@archtivy.com"
          className="mt-10 inline-flex animate-[maint-fade_0.9s_ease-out_0.45s_both] items-center justify-center rounded-md bg-archtivy-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-archtivy-primary/90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 focus:ring-offset-[#f3f4f6]"
          style={{ fontFamily: "var(--font-lato, 'Lato', system-ui, sans-serif)" }}
        >
          Contact us
        </a>
      </main>

      <footer
        className="relative z-10 animate-[maint-fade_0.9s_ease-out_0.6s_both] px-6 pb-8 text-center text-xs text-zinc-500"
        style={{ fontFamily: "var(--font-lato, 'Lato', system-ui, sans-serif)" }}
      >
        © {new Date().getFullYear()} Archtivy Technologies, Inc.
      </footer>
    </div>
  );
}
