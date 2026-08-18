export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getFollowedTargetKeys, type FollowTargetType } from "@/lib/db/follows";
import {
  getTaxonomyNodeIdsBySlugPaths,
  taxonomyNodePairKey,
} from "@/lib/taxonomy/taxonomyDb";
import {
  taxonomyFollowKey,
  dedupeTaxonomyFollowTargets,
  MAX_TAXONOMY_FOLLOW_TARGETS,
  type TaxonomyFollowTarget,
  type TaxonomyFollowTargetType,
} from "@/lib/follows/taxonomyFollowKeys";

/**
 * POST /api/follows/taxonomy-check
 *
 * Body:  { targets: [{ targetType, slugPath, domain }, ...] }
 * Reply: { states: { "<targetType>|<domain>|<slugPath>": boolean } }
 *
 * ── WHY A BATCH ENDPOINT ────────────────────────────────────────────────────
 * The follow control used to appear only when exactly one category or material
 * filter was selected, so one request per page was the whole cost. Now that an
 * affordance is attached to EVERY active category/material chip, the per-chip
 * GET below would fire once per chip, and each call independently repeated the
 * Clerk lookup, the profile lookup, the node lookup and the follow check.
 *
 * This resolves any number of chips in a fixed three queries — profile, nodes,
 * follows — regardless of how many are selected.
 *
 * ── FAILURE POSTURE ─────────────────────────────────────────────────────────
 * Every failure path returns `states: {}` rather than an error status. A missing
 * entry is read by the client as "not followed", so the button says "Follow".
 * That is the safe direction: the toggle action re-checks server-side and
 * upserts, so a stale "Follow" costs one redundant write at worst, whereas a
 * wrong "Following" would hide the affordance the user came for.
 */

const VALID_TARGET_TYPES: TaxonomyFollowTargetType[] = ["category", "material"];

function isValidTarget(v: unknown): v is TaxonomyFollowTarget {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.targetType === "string" &&
    VALID_TARGET_TYPES.includes(t.targetType as TaxonomyFollowTargetType) &&
    typeof t.slugPath === "string" &&
    t.slugPath.trim() !== "" &&
    typeof t.domain === "string" &&
    t.domain.trim() !== ""
  );
}

export async function POST(req: Request) {
  const empty = NextResponse.json({ states: {} });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return empty;
  }

  const rawTargets = (body as { targets?: unknown })?.targets;
  if (!Array.isArray(rawTargets)) return empty;

  const targets = dedupeTaxonomyFollowTargets(
    rawTargets.filter(isValidTarget)
  ).slice(0, MAX_TAXONOMY_FOLLOW_TARGETS);
  if (targets.length === 0) return empty;

  const { userId } = await auth();
  if (!userId) return empty;

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) return empty;

  const nodeResult = await getTaxonomyNodeIdsBySlugPaths(
    targets.map((t) => ({ domain: t.domain, slugPath: t.slugPath }))
  );
  if (!nodeResult.data) return empty;
  const nodeIds = nodeResult.data;

  // Only targets that resolved to a real node can be followed at all.
  const resolved = targets
    .map((t) => ({
      target: t,
      nodeId: nodeIds.get(taxonomyNodePairKey(t.domain, t.slugPath)),
    }))
    .filter((r): r is { target: TaxonomyFollowTarget; nodeId: string } => !!r.nodeId);

  if (resolved.length === 0) return empty;

  const followed = await getFollowedTargetKeys(
    profile.id,
    resolved.map((r) => ({
      targetType: r.target.targetType as FollowTargetType,
      targetId: r.nodeId,
    }))
  );

  const states: Record<string, boolean> = {};
  for (const r of resolved) {
    states[taxonomyFollowKey(r.target)] = followed.has(
      `${r.target.targetType}:${r.nodeId}`
    );
  }

  return NextResponse.json({ states });
}
