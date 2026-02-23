# Operations Runbook

> **Версия:** 3.0.0 | **Дата:** 2026-02-21

### Changelog

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
# Создать новый API ключ
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-keys.js').create({ name: 'tui-prod', scope: 'registry:read' })"

# Список активных ключей
docker exec -it complior-postgres psql -U complior -d complior \
  -c "SELECT id, name, scope, created_at, last_used_at FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC;"

# Отозвать ключ
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-keys.js').revoke('<key-id>')"

# Ротация ключа (создать новый + отозвать старый)
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-keys.js').rotate('<key-id>')"
```

### Инвалидация кэша (ETag reset)
```bash
# Сбросить ETag для конкретного ресурса
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-cache.js').invalidate({ resource: '<resource-path>' })"

# Сбросить весь кэш registry
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-cache.js').invalidateAll()"
```

### Генерация и публикация бандлов
```bash
# Сгенерировать бандл для текущей версии правил
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-bundle.js').generate()"

# Опубликовать бандл
docker compose -f docker-compose.production.yml exec -T backend \
  node -e "require('./app/scripts/registry-bundle.js').publish({ version: '<semver>' })"

# Проверить статус публикации
curl -s http://127.0.0.1:8000/api/registry/bundles | jq .
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
