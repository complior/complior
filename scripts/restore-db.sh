#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /home/complior/PROJECT/backups/complior_*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  # Try in backups directory
  BACKUP_FILE="/home/complior/PROJECT/backups/$1"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $1"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Restoring from: ${BACKUP_FILE}"
echo ""
read -p "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[restore] Starting restore at $(date -Iseconds)"

gunzip -c "${BACKUP_FILE}" | docker exec -i complior-postgres \
  psql -U complior -d complior --quiet

echo "[restore] Restore completed successfully at $(date -Iseconds)"
echo "[restore] Verify data integrity manually."
