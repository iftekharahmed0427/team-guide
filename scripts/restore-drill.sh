#!/usr/bin/env bash
#
# Prove the latest backup actually restores. Loads it into a throwaway database,
# compares every table's row count against the live one, then drops it. Nothing
# touches the live database at any point beyond reading counts.
#
#   /srv/teamguide/repo/scripts/restore-drill.sh
#
# Run it after setting backups up, and again whenever the schema changes. A dump
# that pg_restore --list can read is not the same as a dump that restores.
set -euo pipefail

ROOT="${TEAMGUIDE_ROOT:-/srv/teamguide}"
BACKUP_DIR="$ROOT/backups"
ENV_FILE="$ROOT/.env"
PG_IMAGE="postgres:17"
SCRATCH="teamguide_drill"
LIVE_DB="teamguide"

log() { echo "[drill] $*"; }
fail() { echo "[drill] ERROR: $*" >&2; exit 1; }

DUMP="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | head -1 || true)"
[ -n "$DUMP" ] || fail "no db-*.dump found in $BACKUP_DIR"
log "using $(basename "$DUMP")"

DB_PASS="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed -E 's#.*://[^:]+:([^@]*)@.*#\1#')"
[ -n "$DB_PASS" ] || fail "could not read the password from DATABASE_URL"

cleanup() {
  docker exec postgres psql -U postgres -q -c "drop database if exists $SCRATCH (force)" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "creating scratch database"
cleanup
docker exec postgres psql -U postgres -q -c "create database $SCRATCH owner teamguide"

log "restoring"
docker run --rm --network data -v "$BACKUP_DIR:/in" "$PG_IMAGE" \
  pg_restore --no-owner --no-privileges \
  -d "postgres://teamguide:$DB_PASS@postgres:5432/$SCRATCH" "/in/$(basename "$DUMP")" \
  2>&1 | grep -v 'schema "public" already exists' | grep -v 'errors ignored on restore: 1' || true

# Build one query that counts every public table, then run it against both.
COUNT_SQL="$(docker exec postgres psql -U postgres -d "$LIVE_DB" -At -c \
  "select string_agg(format('select %L::text as t, count(*)::bigint as n from public.%I', tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname = 'public'")"
[ -n "$COUNT_SQL" ] || fail "could not build the comparison query"

docker exec postgres psql -U postgres -d "$LIVE_DB" -At -F',' -c "$COUNT_SQL" | sort > /tmp/drill-live.csv
docker exec postgres psql -U postgres -d "$SCRATCH" -At -F',' -c "$COUNT_SQL" | sort > /tmp/drill-restored.csv

LIVE_ROWS="$(awk -F, '{s+=$2} END {print s}' /tmp/drill-live.csv)"
REST_ROWS="$(awk -F, '{s+=$2} END {print s}' /tmp/drill-restored.csv)"

if diff -u /tmp/drill-live.csv /tmp/drill-restored.csv > /tmp/drill-diff.txt; then
  log "PASS: $(wc -l < /tmp/drill-live.csv) tables match exactly, $LIVE_ROWS rows"
  exit 0
fi

log "MISMATCH between live ($LIVE_ROWS rows) and restored ($REST_ROWS rows):"
cat /tmp/drill-diff.txt
log "note: rows written since the dump was taken show up here and are expected."
exit 1
