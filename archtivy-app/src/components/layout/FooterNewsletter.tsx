"use client";

import { useState } from "react";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    try {
      // Placeholder: POST to a future API route or external service
      await new Promise((r) => setTimeout(r, 400));
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        id="footer-newsletter"
        placeholder="Your email"
        disabled={status === "submitting"}
        className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-[#002abf] dark:focus:ring-[#002abf]"
        aria-label="Email for newsletter"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#002abf] text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-900"
        aria-label="Subscribe"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12h14M12 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
