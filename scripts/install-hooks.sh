#!/usr/bin/env bash
#
# Installs the repo's git hooks. Run once per clone:
#   ./scripts/install-hooks.sh
#
# Git hooks live in .git/hooks, which is not tracked, so they cannot be
# committed directly — this script is the tracked part.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$REPO_ROOT/.git/hooks/pre-push"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Auto-installed by scripts/install-hooks.sh — edit that, not this.
#
# Builds the COMMITTED tree from a clean clone before allowing a push, because
# a local build compiles untracked files that CI will not have.
# Bypass with: git push --no-verify
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
exec "$REPO_ROOT/scripts/verify-clean-build.sh"
EOF

chmod +x "$HOOK"
chmod +x "$REPO_ROOT/scripts/verify-clean-build.sh"

echo "Installed pre-push hook -> $HOOK"
echo "Bypass a single push with: git push --no-verify"
