"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * ONE navigation system for the profile.
 *
 * ── WHAT THIS REPLACED ──────────────────────────────────────────────────────
 * The page had two: a horizontal tab row over the grid that switched
 * Projects/Products, and a rail nav whose items were ANCHORS that scrolled you
 * down to a row of bottom panels. So About and Collaborators were not
 * destinations at all — they were a jump link to a card near the footer, and
 * the page carried the full height of those cards whether you wanted them or
 * not.
 *
 * Now the rail is the navigator and every item is a real view. Only one view's
 * content is in the DOM at a time, which is what removes the height rather than
 * just hiding it.
 *
 * The horizontal tab row is GONE rather than kept in sync. Projects and
 * Products are rail items now, so a second row offering the same two switches
 * would be two controls for one piece of state — the redundant second
 * navigation the brief asks to avoid. Their counts moved onto the rail items,
 * which is where the reference puts them anyway.
 *
 * ── WHY CLIENT STATE AND NOT A ?tab= URL ────────────────────────────────────
 * A query param on a profile makes /u/x?view=about a second indexable address
 * for a page whose canonical is /u/x, and the profile routes are ISR'd with a
 * per-username cache key. Switching views is a reading affordance, not a
 * distinct resource, so it stays client-side. Server components still render
 * every view's contents — they are passed through as children, so the About
 * and Files panels are server-rendered markup, not a client refetch.
 */

interface Ctx {
  active: string;
  setActive: (key: string) => void;
}

const ProfileViewCtx = createContext<Ctx | null>(null);

export interface ProfileViewItem {
  key: string;
  label: string;
  /** Rendered beside the label. Omitted when the view is not a countable list. */
  count?: number;
}

export function ProfileViewProvider({
  views,
  children,
}: {
  views: ProfileViewItem[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(views[0]?.key ?? "");
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <ProfileViewCtx.Provider value={value}>{children}</ProfileViewCtx.Provider>;
}

function useProfileView(): Ctx {
  const ctx = useContext(ProfileViewCtx);
  if (!ctx) throw new Error("ProfileView components must be inside ProfileViewProvider");
  return ctx;
}

/**
 * The rail's nav list. Lives inside the single rail panel, so it is styled as a
 * section of it rather than as a floating box — the rail stays one continuous
 * card top to bottom.
 */
export function ProfileViewNav({ views }: { views: ProfileViewItem[] }) {
  const { active, setActive } = useProfileView();
  if (views.length === 0) return null;

  return (
    <nav aria-label="Profile sections" className="border-t border-hairline p-2">
      <ul>
        {views.map((v) => {
          const on = v.key === active;
          return (
            <li key={v.key}>
              <button
                type="button"
                onClick={() => setActive(v.key)}
                aria-current={on ? "page" : undefined}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-lg px-4 py-2.5",
                  "text-left font-body text-[14px] transition-colors",
                  // Active state in the platform's own vocabulary: the same
                  // solid ink fill the directory category rail and the admin
                  // nav use for a current item.
                  on ? "bg-ink text-cream" : "text-ink hover:bg-stone/50",
                ].join(" ")}
              >
                <span className="min-w-0 truncate">{v.label}</span>
                {v.count != null && (
                  <span className={`shrink-0 text-[13px] ${on ? "opacity-70" : "text-muted"}`}>
                    {v.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * One view's contents. Renders nothing at all when inactive — not
 * `hidden`/`display:none` — so an unselected view costs no layout and no
 * images.
 */
export function ProfileView({
  viewKey,
  children,
}: {
  viewKey: string;
  children: React.ReactNode;
}) {
  const { active } = useProfileView();
  if (active !== viewKey) return null;
  return <div>{children}</div>;
}

/**
 * The statement under the cover — hidden while About is the active view.
 *
 * About renders the bio unclamped, and the cover band renders the same text
 * clamped to three lines. Showing both put the opening sentences on screen
 * twice, one directly above the other, which is the duplicate rendering this
 * whole change set exists to remove. The clamped copy stands down when the
 * full one is on screen.
 */
export function ProfileStatement({ children }: { children: React.ReactNode }) {
  const { active } = useProfileView();
  if (active === "about") return null;
  return <>{children}</>;
}
