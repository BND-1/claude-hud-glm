#!/usr/bin/env bash
# claude-hud-glm statusline launcher.
#
# Claude Code invokes the statusline command frequently (~every 300ms poll),
# passing the session JSON on stdin. We:
#   1. refresh the GLM usage snapshot IN THE BACKGROUND only when it is stale,
#      so we don't spawn a node process on every poll (stat is cheap, node isn't);
#   2. exec the HUD renderer, which reads the (possibly slightly stale) snapshot
#      and the Claude session JSON on stdin.
#
# fetch.mjs inherits ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL from the session
# env that Claude Code injects, so no secrets live in this file.
set -u

# Resolve the repo dir from this script's location (portable across machines).
FORK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find node: prefer PATH, then common install locations (the statusline
# subprocess does not always inherit an nvm-aware PATH, hence the fallbacks).
NODE="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE" ]; then
  for cand in "$HOME/.nvm/versions/node"/v*/bin/node /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$cand" ]; then NODE="$cand"; break; fi
  done
fi
[ -z "$NODE" ] && { echo "[claude-hud-glm] node not found"; exit 0; }

SNAP="${HOME}/.claude/glm-usage.json"
TTL=240   # seconds; keep in sync with fetch.mjs GLM_TTL_MS (default 240000)

# Match the terminal width the way the original HUD statusline did.
cols=$(stty size </dev/tty 2>/dev/null | awk '{print $2}')
export COLUMNS=$(( ${cols:-120} > 4 ? ${cols:-120} - 4 : 1 ))

# Refresh only when stale (or missing). Backgrounded + non-blocking; fetch.mjs
# also self-throttles, so a rare overlap just rewrites identical data.
snap_mtime=$(stat -f %m "$SNAP" 2>/dev/null || echo 0)
now=$(date +%s)
if [ $(( now - snap_mtime )) -ge "$TTL" ]; then
  ( "$NODE" "$FORK/fetch.mjs" >/dev/null 2>&1 & )
fi

exec "$NODE" "$FORK/dist/index.js"
