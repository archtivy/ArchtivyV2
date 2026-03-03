"use client";

import { useState } from "react";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");

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

  if (status === "done") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Request received. You will receive the next briefing.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        id="footer-newsletter"
        placeholder="Your professional email"
        disabled={status === "submitting"}
        required
        className="min-w-0 flex-1 rounded-[4px] border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-[#002abf]"
        aria-label="Email for intelligence briefing"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="shrink-0 rounded-[4px] bg-[#002abf] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-950"
      >
        {status === "submitting" ? "Sending…" : "Request Briefing"}
      </button>
    </form>
  );
}
