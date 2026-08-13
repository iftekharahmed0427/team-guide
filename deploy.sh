#!/usr/bin/env bash
#
# Deploy the portal (app + reports bot) on the VPS. Run after each push:
#
#   cd /srv/teamguide/repo && ./deploy.sh
#
# Pulls the latest code and rebuilds + restarts both containers. Your secrets
# (/srv/teamguide/.env), the uploaded screenshots and the database are all
# outside the checkout, so nothing here can touch them.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
ENV_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/.env"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose is not installed." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. See .env.example for the required variables." >&2
  exit 1
fi

# The app writes screenshots as uid 1001 (the image's `nextjs` user).
UPLOADS="$(cd "$SCRIPT_DIR/.." && pwd)/data/uploads"
if [ -d "$UPLOADS" ] && [ "$(stat -c %u "$UPLOADS")" != "1001" ]; then
  echo "WARNING: $UPLOADS is not owned by uid 1001; screenshot uploads will fail." >&2
  echo "  fix with: sudo chown -R 1001:1001 $UPLOADS" >&2
fi

echo "==> Pulling latest from GitHub"
git -C "$SCRIPT_DIR" pull --ff-only

echo "==> Rebuilding and restarting"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Removing dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Status"
docker compose -f "$COMPOSE_FILE" ps
echo "==> Follow logs with: docker compose -f $COMPOSE_FILE logs -f"
