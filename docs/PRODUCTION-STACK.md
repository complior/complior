# Production Stack — Complior

> **Версия:** 3.0.0 | **Дата:** 2026-02-21

### Changelog

- **v3.0.0** (2026-02-21): Auth: сервис Ory Kratos удалён → WorkOS (managed). Docker стек: 7 → 6 сервисов (минус Kratos). Caddy: удалены `.ory/*` proxy маршруты. Добавлены WorkOS env vars.

---

## Архитектура

```
Internet → :443/:80
       │
   ┌───┴────────────────────────┐
   │  Caddy (reverse proxy)     │  auto-TLS, HTTP→HTTPS redirect
   │  /api/*   → backend:8000   │
   │  /health  → backend:8000   │
   │  /*       → placeholder    │  (позже → frontend:3001)
   └────┬──────────┬────────────┘
        │          │
   ┌────┴───┐ ┌───┴──────┐
   │Backend │ │Gotenberg │  HTML→PDF
   │Fastify │ │:3000     │
   │:8000   │ └──────────┘
   └────┬───┘
        │
   ┌────┴┐
   │ PG  │    Auth → WorkOS (managed cloud, без контейнера)
   │:5432│
   └─────┘

Все сервисы в Docker network `complior_net`.
Наружу открыт ТОЛЬКО Caddy (:80, :443).
Auth обрабатывается WorkOS (managed) — не требует Docker контейнера.
```

## Сервисы

| Сервис | Контейнер | Образ | Роль |
|--------|-----------|-------|------|
| PostgreSQL | complior-postgres | postgres:16-alpine | БД (user: `complior`, db: `complior`) |
| Gotenberg | complior-gotenberg | gotenberg/gotenberg:8 | PDF генерация |
| Backend | complior-backend | build: Dockerfile.production | Fastify API |
| Caddy | complior-caddy | caddy:2-alpine | Reverse proxy + TLS |
| **WorkOS** | — (managed) | — | Авторизация, SSO, сессии (облачный сервис) |

## Ключевые файлы

```
docker-compose.production.yml   — оркестрация 6 сервисов
Dockerfile.production            — backend multi-stage build
.env.production                  — секреты (chmod 600, НЕ в git)
secrets/db_password.txt          — пароль PostgreSQL (Docker secret)
caddy/Caddyfile                  — маршрутизация + security headers
```

### Переменные окружения WorkOS (в `.env.production`)

| Переменная | Описание |
|------------|----------|
| `WORKOS_CLIENT_ID` | WorkOS client ID |
| `WORKOS_API_KEY` | WorkOS API key |
| `WORKOS_REDIRECT_URI` | AuthKit callback URL |

---

## Управление стеком

Все команды выполняются из `/home/openclaw/PROJECT`.

### Статус
```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

### Логи
```bash
# Все сервисы
docker compose --env-file .env.production -f docker-compose.production.yml logs -f --tail=50

# Один сервис
docker compose --env-file .env.production -f docker-compose.production.yml logs -f backend --tail=50
```

### Остановка
```bash
docker compose --env-file .env.production -f docker-compose.production.yml down
```

### Запуск (после остановки)
```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

---

## Деплой обновлений (zero-downtime)

### Шаг 1: Обновить код
```bash
cd /home/openclaw/PROJECT
git pull origin develop   # или main
```

### Шаг 2: Пересобрать только backend (пока старый работает)
```bash
docker compose --env-file .env.production -f docker-compose.production.yml build backend
```
Старый контейнер продолжает обслуживать запросы во время сборки.

### Шаг 3: Заменить контейнер
```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps backend
```
`--no-deps` — не трогать postgres/gotenberg/caddy, заменить ТОЛЬКО backend.

Даунтайм: ~3-5 секунд (пока новый контейнер стартует и проходит health check).

### Шаг 4: Миграции (если были изменения в схеме)
```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T backend node app/setup.js
```
Все миграции идемпотентные (`ADD COLUMN IF NOT EXISTS`).

### Шаг 5: Проверить
```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T backend \
  wget -qO- http://127.0.0.1:8000/health
```
Ожидаемый ответ: `{"status":"ok","services":{"workos":"ok","gotenberg":"ok","database":"ok"}}`

### Одной командой (copy-paste)
```bash
git pull origin develop && \
docker compose --env-file .env.production -f docker-compose.production.yml build backend && \
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps backend && \
sleep 10 && \
docker compose --env-file .env.production -f docker-compose.production.yml exec -T backend wget -qO- http://127.0.0.1:8000/health
```

---

## Откат (если что-то сломалось)

```bash
# Найти предыдущий коммит
git log --oneline -5

# Вернуться на него
git checkout <sha>

# Пересобрать и запустить
docker compose --env-file .env.production -f docker-compose.production.yml build backend && \
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps backend
```

---

## Когда добавим frontend

1. Раскомментировать `frontend` сервис в `docker-compose.production.yml`
2. Исправить Caddyfile — заменить `file_server` блок на:
   ```
   handle {
       reverse_proxy frontend:3001
   }
   ```
3. Деплой:
   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml build frontend && \
   docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps frontend caddy
   ```

---

## Частые проблемы

**Backend не стартует:**
```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs backend --tail=30
```

**Проблемы с WorkOS авторизацией:**
```bash
# Проверить WorkOS env vars в .env.production
# Проверить статус в WorkOS Dashboard: https://dashboard.workos.com
# Проверить callback URL (WORKOS_REDIRECT_URI)
```

**Нет места на диске:**
```bash
df -h /
docker image prune -f          # удалить старые образы
docker system df                # что жрёт место
```

**Посмотреть что внутри БД:**
```bash
docker exec -it complior-postgres psql -U complior -d complior
```
