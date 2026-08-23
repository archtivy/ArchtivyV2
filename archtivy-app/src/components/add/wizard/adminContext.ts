import type { MentionedProduct } from "@/lib/listings/mentionedProducts";

/**
 * Admin context for the publish wizards.
 *
 * ── PRESENCE, NOT A MODE FLAG ───────────────────────────────────────────────
 * Both wizards already establish that a capability is signalled by the
 * presence of the data it needs, not by a string that has to be kept in sync
 * with it: `initial` is what makes a wizard an edit form, deliberately instead
 * of a `mode: "create" | "edit"` prop. This follows that. A wizard is in admin
 * context because it was handed the things only an admin has — an owner list
 * and admin-capable write actions — so the two cannot disagree.
 *
 * The legacy forms this replaces did it the other way, with
 * `formMode?: "user" | "admin"` alongside a separate `ownerProfileOptions`
 * array, and consequently could be put into admin mode with no owner list, or
 * handed an owner list that nothing rendered.
 *
 * ── WHY NOT AN OWNER STEP ───────────────────────────────────────────────────
 * Step indices are load-bearing: /me/dashboard draft cards deep-link to
 * ?step=N to land the author on the exact field they were told was missing,
 * and each wizard's `complete:` array is positional. An extra step in admin
 * only would make the same URL mean different things depending on who opened
 * it. The picker goes at the top of the Information step instead — which in
 * ProductWizard is exactly where the read-only "Publishing as {brand}" note
 * already sat, since that note is the sentence that stops being true here.
 */
export interface WizardOwnerOption {
  id: string;
  /** display_name, or the username when a profile has no display name. */
  label: string;
  /** @username, shown as the disambiguator when two profiles share a name. */
  sub: string | null;
}

export interface WizardAdminContext {
  /** Candidate owners. Projects allow designers and brands; products, brands. */
  ownerOptions: WizardOwnerOption[];
  /** Preselected when editing: the listing's current owner. */
  ownerProfileId: string | null;
  /**
   * Free-text product mentions that carry no product id, so cannot round-trip
   * through the Products picker. Held here and resubmitted verbatim so an
   * admin edit preserves them instead of dropping them. Projects only.
   */
  mentionedFreeText?: MentionedProduct[];
  /**
   * Credit titles for the team field. Products only: ProjectWizard takes these
   * as a top-level prop because every author needs them, but the product flow
   * has no team step outside admin — so the data arrives with the context that
   * is the only reason to load it.
   */
  memberTitles?: { label: string }[];
  /** Admin create action — assigns the chosen owner, audit-logs, no follower notifications. */
  onCreate: (fd: FormData) => Promise<{ error?: string } | void>;
  /** Admin update action — bypasses the self-serve ownership guard. */
  onUpdate: (id: string, fd: FormData) => Promise<{ error?: string } | void>;
  /** Where a successful write returns to. */
  returnTo: string;
}
