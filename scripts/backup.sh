#!/usr/bin/env bash
#
# backup.sh — dump the Postgres database to ./backups/<db>-YYYYMMDD-HHMMSS.sql
#
#   ./scripts/backup.sh
#
# RUN THIS BEFORE EVERY MIGRATION. Not because migrations usually fail — they
# usually don't — but because the one time it does fail, it fails against data
# you cared about. A backup you took is cheap; a backup you meant to take is
# the most expensive file in the world.
#
# Why `pg_dump` and not "copy the volume": Postgres writes its data files
# lazily via a write-ahead log. Copying /var/lib/postgresql/data out from under
# a RUNNING server gives you a torn, possibly unrestorable snapshot. pg_dump
# asks the server for a transactionally consistent view instead, so the output
# is a valid point-in-time copy even while the app keeps writing.

set -euo pipefail

# Resolve the repo root from this script's own location, so the script works
# no matter which directory you invoke it from.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVICE="postgres"
BACKUP_DIR="$ROOT_DIR/backups"

if [[ ! -f .env ]]; then
  echo "ERROR: no root .env found. Copy it first:  cp .env.example .env" >&2
  exit 1
fi

# `set -a` marks everything defined until `set +a` for export, which is how we
# pull POSTGRES_USER / POSTGRES_DB out of the root .env without naming each one.
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_USER:?POSTGRES_USER is not set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB is not set in .env}"

# A dump can only come from a running server.
if [[ -z "$(docker compose ps -q "$SERVICE" 2>/dev/null)" ]]; then
  echo "ERROR: the '$SERVICE' service is not running." >&2
  echo "Start it with:  docker compose up -d $SERVICE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTFILE="$BACKUP_DIR/${POSTGRES_DB}-${TIMESTAMP}.sql"
TMPFILE="${OUTFILE}.partial"

# Write to a .partial file and only rename it into place on success. Without
# this, a dump that dies halfway leaves a truncated .sql sitting in ./backups
# that LOOKS like a valid backup until the day you try to restore it.
cleanup() { rm -f "$TMPFILE"; }
trap cleanup EXIT

echo "Dumping '$POSTGRES_DB' as '$POSTGRES_USER' ..."

# --clean --if-exists : emit DROP statements so the dump can be restored over
#                       an existing database without "already exists" errors.
# --no-owner          : don't tie objects to the dumping role, so the dump can
# --no-privileges       be restored under a different user (e.g. on a teammate's
#                       machine, or into a managed cloud instance).
# -T on `exec`        : no TTY allocation, otherwise Docker injects carriage
#                       returns into the stream and corrupts the SQL.
docker compose exec -T "$SERVICE" \
  pg_dump \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --clean --if-exists \
  --no-owner --no-privileges \
  >"$TMPFILE"

# A zero-byte or header-less file means pg_dump failed in a way that still
# exited 0. Verify before declaring success.
if [[ ! -s "$TMPFILE" ]] || ! grep -q "PostgreSQL database dump" "$TMPFILE"; then
  echo "ERROR: dump looks invalid (empty or missing header). Nothing written." >&2
  exit 1
fi

mv "$TMPFILE" "$OUTFILE"
trap - EXIT

SIZE="$(du -h "$OUTFILE" | cut -f1)"
TABLES="$(grep -c '^CREATE TABLE' "$OUTFILE" || true)"

echo "OK  $OUTFILE  ($SIZE, $TABLES table(s))"
echo
echo "Restore it with:  ./scripts/restore.sh $(basename "$OUTFILE")"
