"use client";

import { useState } from "react";

type Category = "Partnerships" | "Press" | "Support" | "General";

const CATEGORIES: Category[] = ["Partnerships", "Press", "Support", "General"];

interface FormState {
  name: string;
  email: string;
  category: Category;
  message: string;
}

interface FieldError {
  name?: string;
  email?: string;
  message?: string;
}

function validate(form: FormState): FieldError {
  const errors: FieldError = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.message.trim()) {
    errors.message = "Message is required.";
  } else if (form.message.trim().length < 20) {
    errors.message = "Please provide at least 20 characters.";
  }
  return errors;
}

export function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    category: "General",
    message: "",
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setStatus("submitting");
    // Placeholder: no backend integration
    await new Promise((r) => setTimeout(r, 500));
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="rounded-[4px] border border-zinc-200 bg-white px-8 py-10 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Message received.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          We review all inquiries and respond within two business days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-[4px] border border-zinc-200 bg-white px-8 py-10 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {/* Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-name"
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          Name
        </label>
        <input
          id="cf-name"
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={set("name")}
          disabled={status === "submitting"}
          className="w-full rounded-[4px] border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
          placeholder="Your name"
        />
        {errors.name && (
          <p className="text-[11px] text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-email"
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          id="cf-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          disabled={status === "submitting"}
          className="w-full rounded-[4px] border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="text-[11px] text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-category"
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          Category
        </label>
        <select
          id="cf-category"
          value={form.category}
          onChange={set("category")}
          disabled={status === "submitting"}
          className="w-full rounded-[4px] border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 transition focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-message"
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          Message
        </label>
        <textarea
          id="cf-message"
          rows={5}
          value={form.message}
          onChange={set("message")}
          disabled={status === "submitting"}
          className="w-full resize-none rounded-[4px] border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
          placeholder="Describe your inquiry"
        />
        {errors.message && (
          <p className="text-[11px] text-red-500">{errors.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-[4px] bg-[#002abf] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
