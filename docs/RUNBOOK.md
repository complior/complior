# Operations Runbook

> **Версия:** 3.1.0 | **Дата:** 2026-02-24

### Changelog

- **v3.1.0** (2026-02-24): Audit — added pg-boss Background Jobs section (3 scheduled jobs). Added Registry Data Management section (actual migration scripts). Marked planned scripts as NOT IMPLEMENTED. Aligned severity levels with SECURITY-POLICY (P0–P3).
- **v3.0.0** (2026-02-21): Auth: удалены операции Kratos (бэкап identity DB, миграция, отладка сессий). Добавлены операции WorkOS (ротация API key, SSO конфигурация). Добавлены операции Registry API (инвалидация кэша, управление API ключами).

---

## Service Management

### Start all services
```bash
cd /home/complior/PROJECT
docker compose -f docker-compose.production.yml up -d
```

### Stop all services
```bash
docker compose -f docker-compose.production.yml down
```

### Restart a single service
```bash
docker compose -f docker-compose.production.yml restart backend
```

### View logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f --tail=100

# Single service
docker compose -f docker-compose.production.yml logs -f backend --tail=50
```

### Health check
```bash
curl -s http://127.0.0.1:8000/health | jq .
```

---

## Deployment

### Standard deploy (from CI/CD)
Push to `main` branch triggers automatic deployment via GitHub Actions.

### Manual deploy
```bash
cd /home/complior/PROJECT
git fetch origin main
git checkout main
git pull origin main

docker compose -f docker-compose.production.yml build --no-cache backend frontend
docker compose -f docker-compose.production.yml up -d --no-deps backend
docker compose -f docker-compose.production.yml up -d --no-deps frontend

# Run migrations
docker compose -f docker-compose.production.yml exec -T backend node app/setup.js

# Verify
curl -s http://127.0.0.1:8000/health | jq .
```

### Rollback
```bash
cd /home/complior/PROJECT
git log --oneline -5        # Find previous good commit
git checkout <commit-sha>

docker compose -f docker-compose.production.yml up -d --build backend frontend

curl -s http://127.0.0.1:8000/health | jq .
```

---

## Database

### Connect to PostgreSQL
```bash
docker exec -it complior-postgres psql -U complior -d complior
```

### Manual backup
```bash
/home/complior/PROJECT/scripts/backup-db.sh
```

### Restore from backup
```bash
/home/complior/PROJECT/scripts/restore-db.sh <backup-file.sql.gz>
```

### List backups
```bash
ls -lh /home/complior/PROJECT/backups/
```

---

## WorkOS (Auth)

### Ротация API ключа
```bash
# 1. Сгенерировать новый ключ в WorkOS Dashboard → API Keys
# 2. Обновить .env.production
sed -i 's/^WORKOS_API_KEY=.*/WORKOS_API_KEY=sk_live_NEW_KEY/' /home/complior/PROJECT/.env.production

# 3. Перезапустить backend
docker compose -f docker-compose.production.yml restart backend

# 4. Проверить health
curl -s http://127.0.0.1:8000/health | jq .

# 5. Отозвать старый ключ в WorkOS Dashboard
```

### SSO конфигурация (SAML/OIDC)
```bash
# Настройка через WorkOS Dashboard → Organizations → SSO
# 1. Создать Organization в WorkOS
# 2. Настроить SSO Connection (SAML или OIDC)
# 3. Передать клиенту ACS URL и Entity ID
# 4. Проверить: WorkOS Dashboard → Events → SSO login events
```

### Отладка проблем авторизации
```bash
# Проверить статус WorkOS
curl -s https://status.workos.com/api/v2/status.json | jq .status

# Проверить логи backend на ошибки auth
docker compose -f docker-compose.production.yml logs backend --tail=50 | grep -i "workos\|auth\|session"

# Проверить события в WorkOS Dashboard → Events
# Фильтры: authentication.*, user.*, sso.*, organization.*
```

### Синхронизация организаций
```bash
# Проверить что организации синхронизированы
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT id, name, workos_org_id, updated_at FROM organizations ORDER BY updated_at DESC LIMIT 10;"

# Если рассинхронизация — проверить webhook endpoint
curl -s http://127.0.0.1:8000/api/webhooks/workos/health | jq .
```

---

## Registry API

### Управление API ключами
```bash
# Создать новый TUI API ключ (IMPLEMENTED)
node scripts/create-tui-api-key.js

# Список активных ключей
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT id, name, scope, created_at, last_used_at FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC;"

# NOTE: registry-keys.js (revoke, rotate) — NOT IMPLEMENTED yet
# For now, revoke manually:
# docker exec -it complior-postgres psql -U complior -d complior \
#   -c "UPDATE api_keys SET revoked_at = NOW() WHERE id = '<key-id>';"
```

### Инвалидация кэша (ETag reset)
```bash
# NOTE: registry-cache.js — NOT IMPLEMENTED yet
# ETag is based on data modification timestamps, cache resets automatically on data changes
# For manual reset, restart backend:
docker compose -f docker-compose.production.yml restart backend
```

### Генерация данных
```bash
# NOTE: registry-bundle.js (generate/publish) — NOT IMPLEMENTED yet
# Bundle is served dynamically via GET /v1/data/bundle endpoint
# To refresh exported JSON data:
npm run export:all
```

### Мониторинг rate limits
```bash
# Проверить текущее использование rate limits
docker compose -f docker-compose.production.yml logs backend --tail=100 | grep -i "rate.limit"

# Статистика запросов к registry API
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT api_key_id, COUNT(*), DATE_TRUNC('hour', created_at) AS hour FROM api_requests WHERE path LIKE '/api/registry/%' GROUP BY api_key_id, hour ORDER BY hour DESC LIMIT 20;"
```

---

## pg-boss Background Jobs

Three scheduled jobs run via pg-boss (PostgreSQL-native queue):

| Job | Schedule | Description | Source |
|-----|----------|-------------|--------|
| `registry-refresh` | Monday 03:00 UTC | Enrich CLASSIFIED → SCANNED tools via passive scan | `app/application/jobs/schedule-registry-refresh.js` |
| `export-json` | Monday 04:00 UTC | Export registry + regulation data to `data/` JSON files | `app/application/jobs/schedule-data-export.js` |
| `detection-enrichment` | Wednesday 03:00 UTC | Build detection patterns from category heuristics | `app/application/jobs/schedule-detection-enrichment.js` |

### Monitoring jobs
```bash
# Check job status in pg-boss
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT name, state, COUNT(*) FROM pgboss.job GROUP BY name, state ORDER BY name;"

# Check recent job completions
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT name, state, createdon, completedon FROM pgboss.job WHERE completedon IS NOT NULL ORDER BY completedon DESC LIMIT 10;"
```

### Manual trigger
```bash
# Trigger registry refresh manually (via admin API)
curl -X POST http://127.0.0.1:8000/api/admin/trigger-registry-refresh \
  -H "Cookie: <admin-session-cookie>"

# Run data export manually
npm run export:all
```

---

## Registry Data Management

### Migration scripts (actual, implemented)
```bash
# Run regulation DB migration (obligations, meta, timeline, etc.)
npm run migrate:regulations

# Run AI registry migration (4,983 tools from Engine JSON → PostgreSQL)
npm run migrate:registry

# Seed detection patterns for top-100 tools
npm run seed:detection-patterns

# Export all data to JSON
npm run export:all
```

### Data verification
```bash
# Check registry tool counts by level
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT level, COUNT(*) FROM \"RegistryTool\" GROUP BY level ORDER BY COUNT(*) DESC;"

# Check obligation counts by severity
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT severity, COUNT(*) FROM \"Obligation\" GROUP BY severity ORDER BY COUNT(*) DESC;"

# Check detection pattern coverage
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT COUNT(*) FILTER (WHERE \"detectionPatterns\" IS NOT NULL) AS with_patterns, COUNT(*) AS total FROM \"RegistryTool\";"
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|:-----:|-------------|:------------:|
| P0 | Service down, data loss | Immediate |
| P1 | Key feature broken | < 1 hour |
| P2 | Minor issue | < 4 hours |
| P3 | Cosmetic | Next sprint |

### Common Issues

**Backend not responding:**
```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs backend --tail=50
docker compose -f docker-compose.production.yml restart backend
```

**Database connection issues:**
```bash
docker exec complior-postgres pg_isready -U complior
docker compose -f docker-compose.production.yml restart postgres
# Wait for health check, then restart backend
sleep 10
docker compose -f docker-compose.production.yml restart backend
```

**TLS certificate issues:**
```bash
docker compose -f docker-compose.production.yml logs caddy --tail=20
docker compose -f docker-compose.production.yml restart caddy
```

**Disk space full:**
```bash
df -h /
docker system prune -f
# Check backup retention
ls -lh /home/complior/PROJECT/backups/
```
