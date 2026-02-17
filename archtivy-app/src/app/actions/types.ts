/** Legacy: use for backward compatibility where error is the only signal. */
export type ActionResult = { error?: string; id?: string; slug?: string } | null;

/** Consistent shape for all server actions: { ok, data? } | { ok: false, error }. */
export type ActionResultSuccess<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
