# Production Stack — Complior

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
   └──┬──┬──┘
      │  │
 ┌────┴┐ ┌┴──────┐
 │ PG  │ │Kratos │  Identity & Auth
 │:5432│ │:4433  │
 └─────┘ └───────┘

Все сервисы в Docker network `complior_net`.
Наружу открыт ТОЛЬКО Caddy (:80, :443).
```

## Сервисы

| Сервис | Контейнер | Образ | Роль |
|--------|-----------|-------|------|
| PostgreSQL | complior-postgres | postgres:16-alpine | БД (user: `complior`, db: `complior`) |
| Kratos | complior-kratos | oryd/kratos:v1.3.1 | Авторизация, сессии |
| Gotenberg | complior-gotenberg | gotenberg/gotenberg:8 | PDF генерация |
| Backend | complior-backend | build: Dockerfile.production | Fastify API |
| Caddy | complior-caddy | caddy:2-alpine | Reverse proxy + TLS |

## Ключевые файлы

```
docker-compose.production.yml   — оркестрация всех сервисов
Dockerfile.production            — backend multi-stage build
.env.production                  — секреты (chmod 600, НЕ в git)
secrets/db_password.txt          — пароль PostgreSQL (Docker secret)
caddy/Caddyfile                  — маршрутизация + security headers
ory/kratos.production.yml        — конфиг Kratos (URLs, SMTP, argon2)
ory/webhook-secret               — webhook secret для Kratos→Backend
```

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
`--no-deps` — не трогать postgres/kratos/gotenberg/caddy, заменить ТОЛЬКО backend.

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
Ожидаемый ответ: `{"status":"ok","services":{"ory":"ok","gotenberg":"ok","database":"ok"}}`

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

**Kratos unhealthy:**
```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs kratos --tail=30
# Обычно: проблема с SMTP или секретами → проверить .env.production
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
