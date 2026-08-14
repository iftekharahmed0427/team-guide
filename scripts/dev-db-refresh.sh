#!/usr/bin/env bash
#
# Reload the DEV database from the newest production backup, then strip every
# live credential out of the copy.
#
#   /srv/teamguide/repo/scripts/dev-db-refresh.sh
#
# The dev database is a SEPARATE Postgres container (/srv/postgres-dev, port
# 5433) with its own volume and its own password. Nothing here touches
# production: it only reads a dump file that already exists in the backups
# directory. Run scripts/backup.sh first if you want today's data.
#
# Sanitising is not optional. A production copy on an externally reachable port
# would otherwise publish the Discord bot token, every member's OAuth
# access/refresh tokens, and valid session tokens. The app does not need any of
# them locally: outside NODE_ENV=production, lib/auth serves a stub admin
# session, so there is nothing to log into.
#
# Env overrides: TEAMGUIDE_ROOT, DEV_PORT, SCRUB_EMAILS=1 (also anonymise
# member/invite/customer email addresses).
set -euo pipefail

ROOT="${TEAMGUIDE_ROOT:-/srv/teamguide}"
BACKUP_DIR="$ROOT/backups"
DEV_ENV="${DEV_ENV_FILE:-/srv/postgres-dev/.env}"
DEV_PORT="${DEV_PORT:-5433}"
DEV_CONTAINER="postgres-dev"
DEV_DB="teamguide_dev"
DEV_USER="devuser"
PG_IMAGE="postgres:17"

log() { echo "[dev-db] $*"; }
fail() { echo "[dev-db] ERROR: $*" >&2; exit 1; }

docker inspect "$DEV_CONTAINER" >/dev/null 2>&1 || fail "container $DEV_CONTAINER is not running"
[ -f "$DEV_ENV" ] || fail "$DEV_ENV not found"

DEV_PASS="$(grep -E '^POSTGRES_PASSWORD=' "$DEV_ENV" | head -1 | cut -d= -f2-)"
[ -n "$DEV_PASS" ] || fail "POSTGRES_PASSWORD missing from $DEV_ENV"

DUMP="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | head -1 || true)"
[ -n "$DUMP" ] || fail "no db-*.dump in $BACKUP_DIR (run scripts/backup.sh first)"
log "source: $(basename "$DUMP")  ($(date -u -r "$DUMP" +'%Y-%m-%d %H:%M UTC'))"

log "recreating $DEV_DB"
docker exec "$DEV_CONTAINER" psql -U "$DEV_USER" -d postgres -q \
  -c "drop database if exists $DEV_DB with (force)"
docker exec "$DEV_CONTAINER" psql -U "$DEV_USER" -d postgres -q \
  -c "create database $DEV_DB owner $DEV_USER"

log "restoring"
docker run --rm --network host -v "$BACKUP_DIR:/in:ro" "$PG_IMAGE" \
  pg_restore --no-owner --no-privileges \
  -d "postgres://$DEV_USER:$DEV_PASS@127.0.0.1:$DEV_PORT/$DEV_DB" \
  "/in/$(basename "$DUMP")" 2>&1 | grep -v 'already exists' || true

log "stripping credentials"
docker exec -i "$DEV_CONTAINER" psql -U "$DEV_USER" -d "$DEV_DB" -q -v ON_ERROR_STOP=1 <<'SQL'
-- The live Discord bot token. Leaving this in a dev copy hands over the bot.
update bot_setting set token = null;
-- OAuth tokens for every member.
update account set access_token = null, refresh_token = null, id_token = null, password = null;
-- Valid sessions and pending verifications.
delete from session;
delete from verification;
-- Make it obvious which database you are looking at.
update bot_status set state = 'offline', bot_tag = 'DEV COPY', last_error = null;
SQL

if [ "${SCRUB_EMAILS:-0}" = "1" ]; then
  log "anonymising email addresses"
  docker exec -i "$DEV_CONTAINER" psql -U "$DEV_USER" -d "$DEV_DB" -q -v ON_ERROR_STOP=1 <<'SQL'
update "user" set email = 'dev+' || id || '@example.test';
update invite set email = 'dev+' || id || '@example.test';
update commission set customer_email = 'dev+' || id || '@example.test';
SQL
fi

LEFT="$(docker exec "$DEV_CONTAINER" psql -U "$DEV_USER" -d "$DEV_DB" -At -c \
  "select (select count(*) from session) + (select count(*) from account where access_token is not null) + (select count(*) from bot_setting where token is not null)")"
[ "$LEFT" = "0" ] || fail "sanitising failed: $LEFT credential rows remain"

ROWS="$(docker exec "$DEV_CONTAINER" psql -U "$DEV_USER" -d "$DEV_DB" -At -c \
  "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'")"
log "done: $ROWS tables, 0 credentials left"
log "DATABASE_URL=postgres://$DEV_USER:***@<vps-host>:$DEV_PORT/$DEV_DB"
