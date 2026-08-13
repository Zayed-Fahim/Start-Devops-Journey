#!/usr/bin/env bash
#
# restore.sh — restore a dump from ./backups into the running Postgres container
#
#   ./scripts/restore.sh                     # list available backups
#   ./scripts/restore.sh <file>              # restore (asks for confirmation)
#   ./scripts/restore.sh <file> --yes        # restore without prompting
#
# This is a DESTRUCTIVE operation: the dump begins with DROP statements, so
# whatever is currently in the database is replaced by whatever was in the
# database when the dump was taken. It deliberately refuses to guess which
# file you meant, and deliberately makes you type the database name.
#
# Note what this is NOT: it is not a fix for "the container won't start" or
# "a migration looks wrong". Restoring throws away every write since the dump.
# It is the last resort, not the first debugging step.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SERVICE="postgres"
BACKUP_DIR="$ROOT_DIR/backups"

if [[ ! -f .env ]]; then
  echo "ERROR: no root .env found. Copy it first:  cp .env.example .env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_USER:?POSTGRES_USER is not set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB is not set in .env}"

list_backups() {
  if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR"/*.sql 2>/dev/null)" ]]; then
    echo "No backups found in ./backups"
    echo "Create one with:  ./scripts/backup.sh"
    return
  fi
  echo "Available backups in ./backups:"
  echo
  ls -1t "$BACKUP_DIR"/*.sql | while read -r f; do
    printf '  %-46s %6s  %s\n' \
      "$(basename "$f")" \
      "$(du -h "$f" | cut -f1)" \
      "$(date -r "$f" '+%Y-%m-%d %H:%M')"
  done
}

INPUT="${1:-}"
ASSUME_YES="${2:-}"

if [[ -z "$INPUT" ]]; then
  list_backups
  echo
  echo "Usage:  ./scripts/restore.sh <backup-file> [--yes]"
  exit 0
fi

# Accept either a bare filename or a path.
if [[ -f "$INPUT" ]]; then
  FILE="$INPUT"
elif [[ -f "$BACKUP_DIR/$INPUT" ]]; then
  FILE="$BACKUP_DIR/$INPUT"
else
  echo "ERROR: no such backup: $INPUT" >&2
  echo >&2
  list_backups >&2
  exit 1
fi

if ! grep -q "PostgreSQL database dump" "$FILE"; then
  echo "ERROR: $FILE does not look like a pg_dump file." >&2
  exit 1
fi

if [[ -z "$(docker compose ps -q "$SERVICE" 2>/dev/null)" ]]; then
  echo "ERROR: the '$SERVICE' service is not running." >&2
  echo "Start it with:  docker compose up -d $SERVICE" >&2
  exit 1
fi

echo "About to restore into database '$POSTGRES_DB'."
echo "  source : $FILE"
echo "  taken  : $(date -r "$FILE" '+%Y-%m-%d %H:%M:%S')"
echo
echo "This REPLACES the current contents of '$POSTGRES_DB'."
echo "Any data written since this dump was taken will be lost."
echo

if [[ "$ASSUME_YES" != "--yes" && "$ASSUME_YES" != "-y" ]]; then
  # Typing the database name, rather than "y", is a deliberate speed bump.
  # It is very hard to do by accident at 2am.
  read -r -p "Type the database name ($POSTGRES_DB) to continue: " CONFIRM
  if [[ "$CONFIRM" != "$POSTGRES_DB" ]]; then
    echo "Aborted — nothing was changed."
    exit 1
  fi
fi

echo "Restoring ..."

# ON_ERROR_STOP=1 is the important flag. Without it, psql shrugs off failing
# statements and keeps going, leaving a HALF-restored database while still
# exiting 0 — the worst possible outcome, because it looks like it worked.
# stdout goes to /dev/null because a dump contains internal SELECTs
# (set_config, setval) whose result tables are noise. Errors and NOTICEs go to
# stderr and are still shown — and ON_ERROR_STOP means any error aborts anyway.
docker compose exec -T "$SERVICE" \
  psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set ON_ERROR_STOP=1 \
  --quiet \
  <"$FILE" >/dev/null

echo "OK  restored '$POSTGRES_DB' from $(basename "$FILE")"
