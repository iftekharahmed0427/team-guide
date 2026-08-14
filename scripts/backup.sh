#!/usr/bin/env bash
#
# Nightly backup of the portal: the Postgres database and the uploaded
# screenshots. Supabase used to do this; on the VPS it is ours to run.
#
#   /srv/teamguide/repo/scripts/backup.sh
#
# Install (as the `ubuntu` user, which is in the docker group):
#
#   crontab -e
#   15 3 * * * /srv/teamguide/repo/scripts/backup.sh >> /srv/teamguide/backups/backup.log 2>&1
#
# Uses the postgres:17 image for pg_dump, so the host needs no Postgres client.
# Every dump is verified readable with pg_restore --list before older ones are
# pruned, so a silently corrupt file can never age out the last good copy.
#
# Env overrides: TEAMGUIDE_ROOT, KEEP_DAYS, BACKUP_REMOTE.
set -euo pipefail

ROOT="${TEAMGUIDE_ROOT:-/srv/teamguide}"
BACKUP_DIR="$ROOT/backups"
UPLOADS="$ROOT/data/uploads"
ENV_FILE="$ROOT/.env"
KEEP_DAYS="${KEEP_DAYS:-14}"
PG_IMAGE="postgres:17"
STAMP="$(date -u +%Y%m%d-%H%M)"

log() { echo "[$(date -u +'%Y-%m-%d %H:%M:%S')] $*"; }
fail() { echo "[$(date -u +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found"
[ -d "$UPLOADS" ] || fail "$UPLOADS not found"
mkdir -p "$BACKUP_DIR"

# Read DATABASE_URL without sourcing the file: values can legitimately contain
# spaces, and `.` would try to execute them.
DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
[ -n "$DB_URL" ] || fail "DATABASE_URL missing from $ENV_FILE"

DUMP="db-$STAMP.dump"
TARBALL="uploads-$STAMP.tar.gz"

log "dumping database -> $DUMP"
docker run --rm --network data --user "$(id -u):$(id -g)" \
  -v "$BACKUP_DIR:/out" "$PG_IMAGE" \
  pg_dump "$DB_URL" -Fc --no-owner --no-privileges -f "/out/$DUMP"

# Prove the dump is readable before it counts as a backup.
log "verifying $DUMP"
TABLES="$(docker run --rm -v "$BACKUP_DIR:/out" "$PG_IMAGE" \
  sh -c "pg_restore --list /out/$DUMP | grep -c 'TABLE DATA'")"
[ "$TABLES" -gt 0 ] || fail "$DUMP contains no table data"
log "  $TABLES tables with data"

log "archiving screenshots -> $TARBALL"
tar -czf "$BACKUP_DIR/$TARBALL" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"
FILES="$(tar -tzf "$BACKUP_DIR/$TARBALL" | grep -c '[^/]$' || true)"
log "  $FILES files"

# Optional off-box copy. An on-box backup does not survive losing the box, so
# set BACKUP_REMOTE to an rclone remote (e.g. b2:teamguide-backups) and put the
# rclone config at $ROOT/rclone.conf.
if [ -n "${BACKUP_REMOTE:-}" ]; then
  log "copying off-box -> $BACKUP_REMOTE"
  docker run --rm \
    -v "$BACKUP_DIR:/data:ro" \
    -v "$ROOT/rclone.conf:/config/rclone/rclone.conf:ro" \
    rclone/rclone copy /data "$BACKUP_REMOTE" --max-age "${KEEP_DAYS}d"
else
  log "BACKUP_REMOTE unset: backups exist only on this host"
fi

log "pruning backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.dump' -mtime "+$KEEP_DAYS" -print -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime "+$KEEP_DAYS" -print -delete

log "done. $(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR"
