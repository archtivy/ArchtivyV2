#!/usr/bin/env bash
#
# Clean-clone build verification.
#
# WHY THIS EXISTS
# ---------------
# A local build compiles the working directory, which contains untracked files.
# A CI build compiles only what is committed. When those differ, the local build
# passes and the deploy fails.
#
# This has bitten this repo twice:
#   a86894b  /coming-soon imported lib/db/platformTotals.ts, which was untracked
#            (part of the uncommitted homepage work). Vercel:
#            "Module not found: @/lib/db/platformTotals". Fixed in 8dcbc38.
#   41d5ecc  committed migrations that depended on four Phase 6 migrations that
#            were never committed. A fresh clone's `supabase db push` would have
#            failed partway. Fixed in 7fe1854.
#
# Both were the same defect: a commit that reads as self-contained but depends
# on something absent from git. Only a build from a clean checkout catches it.
#
# WHAT IT DOES
# ------------
# Clones the repo at HEAD into a temp dir — so the tree contains committed files
# and nothing else — then typechecks and builds it.
#
# node_modules and .env.local are SYMLINKED rather than installed/copied:
#   - install is slow, and this must be cheap enough to run on every push
#   - .env.local holds secrets and is deliberately never written to a second
#     location on disk; the symlink is removed with the clone
# The tradeoff: this verifies SOURCE module resolution (the actual failure mode
# both times) but NOT package.json completeness. If you add or bump a
# dependency, run with FULL_INSTALL=1 to do a real `npm ci` instead.
#
# USAGE
#   scripts/verify-clean-build.sh              # fast path, symlinked deps
#   FULL_INSTALL=1 scripts/verify-clean-build.sh   # real npm ci
#
# Installed as a pre-push hook by scripts/install-hooks.sh.
# Bypass a single push with:  git push --no-verify

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR_NAME="archtivy-app"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/archtivy-clean-build.XXXXXX")"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

HEAD_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
echo "── clean-clone build check @ ${HEAD_SHA} ──────────────────────────────"

if ! git -C "$REPO_ROOT" clone -q --no-hardlinks "$REPO_ROOT" "$WORK/repo" 2>/dev/null; then
  echo "FAIL: could not clone the repo into $WORK"
  exit 1
fi
git -C "$WORK/repo" checkout -q "$(git -C "$REPO_ROOT" rev-parse HEAD)" || {
  echo "FAIL: could not check out HEAD in the clone"
  exit 1
}

APP="$WORK/repo/$APP_DIR_NAME"
SRC_APP="$REPO_ROOT/$APP_DIR_NAME"

if [ ! -d "$APP" ]; then
  echo "FAIL: $APP_DIR_NAME is missing from the clean checkout"
  exit 1
fi

if [ "${FULL_INSTALL:-0}" = "1" ]; then
  echo "· npm ci (FULL_INSTALL=1)"
  ( cd "$APP" && npm ci --silent ) || { echo "FAIL: npm ci"; exit 1; }
else
  [ -d "$SRC_APP/node_modules" ] || {
    echo "FAIL: $SRC_APP/node_modules not found — run npm install, or use FULL_INSTALL=1"
    exit 1
  }
  ln -s "$SRC_APP/node_modules" "$APP/node_modules"
  # Warn when the fast path is not good enough for what changed.
  if ! git -C "$REPO_ROOT" diff --quiet HEAD~1 HEAD -- "$APP_DIR_NAME/package.json" "$APP_DIR_NAME/package-lock.json" 2>/dev/null; then
    echo "· NOTE: package.json/lock changed in HEAD — symlinked node_modules will"
    echo "        not catch a missing dependency. Re-run with FULL_INSTALL=1."
  fi
fi

# Env is needed for the build to reach its normal code paths. Symlink, never copy.
[ -e "$SRC_APP/.env.local" ] && ln -s "$SRC_APP/.env.local" "$APP/.env.local"

echo "· tsc --noEmit"
if ! ( cd "$APP" && npx tsc --noEmit > "$WORK/tsc.log" 2>&1 ); then
  echo "FAIL: typecheck failed on the committed tree"
  grep -E "error TS" "$WORK/tsc.log" | head -20
  exit 1
fi

echo "· next build"
if ! ( cd "$APP" && npx next build > "$WORK/build.log" 2>&1 ); then
  echo "FAIL: build failed on the committed tree"
  grep -E "Module not found|Failed to compile|Error:" "$WORK/build.log" | head -20
  echo "  full log copied to /tmp/archtivy-clean-build-failure.log"
  cp "$WORK/build.log" /tmp/archtivy-clean-build-failure.log 2>/dev/null || true
  exit 1
fi

echo "── PASS: committed tree typechecks and builds ────────────────────────"
exit 0
