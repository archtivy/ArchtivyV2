"use client";

import * as React from "react";
import { Field, inputCls } from "./WizardPrimitives";

/**
 * Cascading taxonomy picker — Category → Subcategory → Type.
 *
 * ── ONE STORED VALUE, NOT THREE ─────────────────────────────────────────────
 * The wizard holds a single `taxonomy_node_id`: the DEEPEST node the author
 * chose. Every visible select is derived from it by walking up parent_id.
 *
 * That is what makes "changing the parent clears an incompatible child" fall
 * out for free rather than needing to be enforced. Picking a new Category sets
 * the stored value TO that category, so the Subcategory select — whose value
 * is "the ancestor of the stored node at depth 1" — has nothing to show and
 * renders empty. There is no state where the selects disagree with each other,
 * because there is only one piece of state.
 *
 * Three separate useStates would have needed explicit clearing on every
 * change, and would have allowed a stale child to survive a parent switch if
 * any path forgot — which is exactly the bug the brief asks to prevent.
 *
 * ── DEPTH IS DATA, NOT A CONSTANT ───────────────────────────────────────────
 * Projects are two levels; products are three (14 project roots with 103
 * children; 19 product roots with 115 subcategories and 453 types). This
 * renders as many levels as the tree actually has beneath the current
 * selection, so neither domain is hardcoded and a future fourth level needs no
 * change here.
 *
 * ── INCOMPLETE IS NOT INVALID ───────────────────────────────────────────────
 * A node with children is an incomplete choice: "Furniture" alone does not say
 * what the product is. `onIncompleteChange` reports that upward so the wizard
 * can gate publishing, but the selection is still stored and still saved. An
 * author who gets halfway must not lose the half they did.
 *
 * Leaves are complete by definition — some roots genuinely have no children in
 * other domains, and demanding a subcategory that does not exist would be an
 * unsatisfiable requirement.
 */

export interface TaxonomyCascadeNode {
  id: string;
  label: string;
  parentId: string | null;
  depth: number;
}

const LEVEL_LABELS = ["Category", "Subcategory", "Type"] as const;

function labelForLevel(level: number): string {
  return LEVEL_LABELS[level] ?? `Level ${level + 1}`;
}

export function TaxonomyCascade({
  nodes,
  value,
  onChange,
  onIncompleteChange,
  required = true,
}: {
  /** Every active node of one domain, all depths. */
  nodes: TaxonomyCascadeNode[];
  /** The deepest selected node id, or "" when nothing is chosen. */
  value: string;
  onChange: (nodeId: string) => void;
  /** Fired when the selection is a node that still has children below it. */
  onIncompleteChange?: (incomplete: boolean) => void;
  required?: boolean;
}) {
  const byId = React.useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const childrenOf = React.useMemo(() => {
    const m = new Map<string | null, TaxonomyCascadeNode[]>();
    for (const n of nodes) {
      const key = n.parentId;
      const arr = m.get(key) ?? [];
      arr.push(n);
      m.set(key, arr);
    }
    return m;
  }, [nodes]);

  /**
   * The chain from root to the selected node.
   *
   * Walks up parent_id rather than splitting slug_path: a label can contain a
   * slash ("Walls, Ceilings & Facades" does not, but "Landscape / Urban"
   * does), and slug_path is only reliable if every slug is slash-free. The
   * parent pointer is the actual structure.
   */
  const chain = React.useMemo(() => {
    const out: TaxonomyCascadeNode[] = [];
    let cur = value ? byId.get(value) : undefined;
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      out.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  }, [value, byId]);

  const selected = value ? byId.get(value) : undefined;
  const hasChildren = selected ? (childrenOf.get(selected.id)?.length ?? 0) > 0 : false;
  const incomplete = Boolean(selected) && hasChildren;

  React.useEffect(() => {
    onIncompleteChange?.(incomplete);
  }, [incomplete, onIncompleteChange]);

  /*
   * One select per level that has options: the roots, plus one for the
   * children of each node in the chain. The trailing level only appears when
   * the current selection actually has children, so a leaf does not leave a
   * permanently empty "Type" dropdown on screen.
   */
  const levels: { options: TaxonomyCascadeNode[]; selectedId: string }[] = [];
  levels.push({ options: childrenOf.get(null) ?? [], selectedId: chain[0]?.id ?? "" });
  for (let i = 0; i < chain.length; i++) {
    const kids = childrenOf.get(chain[i].id) ?? [];
    if (kids.length === 0) break;
    levels.push({ options: kids, selectedId: chain[i + 1]?.id ?? "" });
  }

  return (
    <>
      {levels.map((level, i) => (
        <Field
          key={i}
          label={labelForLevel(i)}
          // Only the first level is unconditionally required. Deeper levels are
          // required only because something above them has children — which the
          // hint below states in words rather than with a bare asterisk.
          required={required && i === 0}
          hint={
            i === levels.length - 1 && incomplete
              ? `Choose a ${labelForLevel(i).toLowerCase()} to finish classifying`
              : undefined
          }
        >
          <select
            value={level.selectedId}
            onChange={(e) => {
              // Selecting the empty option at level i means "stop here": fall
              // back to the parent, so clearing a subcategory leaves the
              // category selected rather than wiping the whole classification.
              const next = e.target.value || chain[i - 1]?.id || "";
              onChange(next);
            }}
            className={inputCls}
          >
            <option value="">
              {i === 0 ? "Choose a category…" : `Choose a ${labelForLevel(i).toLowerCase()}…`}
            </option>
            {level.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      ))}
    </>
  );
}
