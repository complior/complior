#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/complior/PROJECT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="complior_${TIMESTAMP}.sql.gz"
LOG_PREFIX="[backup]"

echo "${LOG_PREFIX} Starting backup at $(date -Iseconds)"

# Create backup via Docker
docker exec complior-postgres pg_dump \
  -U complior \
  -d complior \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

FILESIZE=$(stat -c%s "${BACKUP_DIR}/${BACKUP_FILE}" 2>/dev/null || echo 0)

if [ "$FILESIZE" -lt 1024 ]; then
  echo "${LOG_PREFIX} ERROR: Backup file too small (${FILESIZE} bytes), possible failure"
  exit 1
fi

echo "${LOG_PREFIX} Local backup created: ${BACKUP_FILE} (${FILESIZE} bytes)"

# Upload to Hetzner S3 (if aws cli configured)
if command -v aws &> /dev/null && [ -n "${S3_ENDPOINT:-}" ]; then
  aws s3 cp \
    "${BACKUP_DIR}/${BACKUP_FILE}" \
    "s3://${S3_BACKUP_BUCKET:-complior-backups}/${BACKUP_FILE}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --quiet
  echo "${LOG_PREFIX} Uploaded to S3: ${BACKUP_FILE}"
fi

# Retention: keep 14 days locally
find "${BACKUP_DIR}" -name "complior_*.sql.gz" -mtime +14 -delete
echo "${LOG_PREFIX} Cleaned up backups older than 14 days"

echo "${LOG_PREFIX} Backup completed successfully at $(date -Iseconds)"
