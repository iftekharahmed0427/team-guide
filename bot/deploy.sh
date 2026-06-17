#!/usr/bin/env bash
#
# Deploy the reports bot on the VPS. Run this after each push to GitHub:
#
#   cd team-guide/bot
#   ./deploy.sh
#
# It pulls the latest code and rebuilds + restarts the container. Your local
# .env (DATABASE_URL) and all bot config in the database are left untouched.
#
set -euo pipefail

# Resolve paths from this script's location so it works from anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Pick the available Docker Compose command (v2 plugin or legacy binary).
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "ERROR: docker compose is not installed." >&2
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "ERROR: $SCRIPT_DIR/.env not found." >&2
  echo "Create it from .env.example and set DATABASE_URL." >&2
  exit 1
fi

echo "==> Pulling latest from GitHub"
git -C "$REPO_DIR" pull --ff-only

echo "==> Rebuilding and restarting the bot"
cd "$SCRIPT_DIR"
$DC up -d --build

echo "==> Removing dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Done. Recent logs (Ctrl+C to stop following):"
$DC logs --tail=20 -f bot
