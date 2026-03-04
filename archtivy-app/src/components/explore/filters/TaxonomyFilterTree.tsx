"use client";

import { useState } from "react";
import type { TaxonomyTreeNode } from "@/lib/explore/filters/schema";

interface TaxonomyFilterTreeProps {
  tree: TaxonomyTreeNode[];
  currentSlugPath: string | null;
  onSelect: (slugPath: string) => void;
}

function TreeNode({
  node,
  currentSlugPath,
  onSelect,
  depth,
}: {
  node: TaxonomyTreeNode;
  currentSlugPath: string | null;
  onSelect: (slugPath: string) => void;
  depth: number;
}) {
  const isActive = currentSlugPath === node.slug_path;
  const isAncestor =
    currentSlugPath != null && currentSlugPath.startsWith(node.slug_path + "/");
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(isAncestor || isActive);

  return (
    <div>
      <div className="flex items-center">
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            >
              <path
                d="M3 1l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelect(node.slug_path)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
            !hasChildren ? "ml-6" : ""
          } ${
            isActive
              ? "font-medium text-[#002abf]"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
          style={{ paddingLeft: hasChildren ? undefined : undefined }}
        >
          {node.label}
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="ml-3 border-l border-zinc-100 pl-1 dark:border-zinc-800">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              currentSlugPath={currentSlugPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaxonomyFilterTree({
  tree,
  currentSlugPath,
  onSelect,
}: TaxonomyFilterTreeProps) {
  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          currentSlugPath={currentSlugPath}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}
