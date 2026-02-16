# Sprint Backlog 004 — Production Deployment

**Sprint Goal:** Запустить платформу в production на Hetzner Cloud с полной безопасностью, EU-compliance, автоматическими бэкапами и zero-downtime деплоем.
**Статус:** ✅ Утверждено PO и реализовано (2026-02-13)

**Capacity:** ~30 SP | **Duration:** 2 weeks
**Developer:** Max (Infra+Backend, US-045..052)
**Baseline:** 214 tests → **New: ~8 tests (total: ~222)**

> **Тестов мало** потому что спринт инфраструктурный — основная работа: Docker, конфиги, TLS, firewall, CI/CD, legal pages. Новый код (data export, account deletion) покрывается тестами.

**Контекст разработки:** GDPR/NIS2/ePrivacy/AI Act compliance. Все данные остаются в EU. Никаких US-субпроцессоров без DPA + Standard Contractual Clauses. Production secrets НИКОГДА в git.

**Prerequisite:** Sprint 3.5 merged to main.

---

## Контекст

Платформа функционально готова к MVP: IAM, RBAC, каталог, классификация, dashboard, billing (Stripe), registration flow, quick check, penalty calculator. **Но запустить в production невозможно** — нет:

- Production Docker-конфигурации (текущий `docker-compose.yml` — dev-only с `postgres:postgres`)
- Reverse proxy с TLS (HTTPS)
- Production-конфигурации Ory Kratos (dev secrets, localhost URLs, нет SMTP)
- Автоматических бэкапов БД
- Security hardening (firewall, SSH, security headers)
- Рабочего CI/CD пайплайна (`deploy.yml` ссылается на Prisma — у нас MetaSQL)
- Мониторинга и алертов
- Legal pages (Privacy Policy, Terms of Service, Imprint)
- GDPR data rights (export, deletion)

---

## Архитектура Production

### Топология сервера (один Hetzner Cloud)

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────┐
│  Hetzner Cloud (Falkenstein, DE)                │
│  Ubuntu 22.04, 4 vCPU, 16GB RAM                │
│                                                 │
│  UFW Firewall: ALLOW 22/tcp, 80/tcp, 443/tcp   │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Caddy (reverse proxy + auto-TLS)       │    │
│  │ :443 → app.complior.eu                  │    │
│  │   /api/*    → backend:8000              │    │
│  │   /health   → backend:8000              │    │
│  │   /*        → frontend:3001             │    │
│  └─────────────────────────────────────────┘    │
│         │                │                      │
│  ┌──────┴──────┐  ┌──────┴──────┐               │
│  │ Backend     │  │ Frontend    │               │
│  │ Fastify     │  │ Next.js     │               │
│  │ :8000       │  │ :3001       │               │
│  └──────┬──────┘  └─────────────┘               │
│         │                                       │
│  ┌──────┴──────┐  ┌─────────────┐               │
│  │ PostgreSQL  │  │ Ory Kratos  │               │
│  │ :5432       │  │ :4433/:4434 │               │
│  │ (internal)  │  │ (internal)  │               │
│  └─────────────┘  └─────────────┘               │
│                                                 │
│  ┌─────────────┐                                │
│  │ Gotenberg   │                                │
│  │ :3000       │                                │
│  │ (internal)  │                                │
│  └─────────────┘                                │
└─────────────────────────────────────────────────┘
```

### Почему Caddy, а не Nginx

| Критерий | Caddy | Nginx + Certbot |
|----------|-------|-----------------|
| Auto-TLS (Let's Encrypt) | Встроен, 0 конфиг | Отдельный certbot + cron |
| Config | 15 строк | 100+ строк |
| Auto-renewal | Встроен | Cron job, может сломаться |
| HTTP/2 + HTTP/3 | По умолчанию | Нужна настройка |
| Перезагрузка при обновлении cert | Не нужна | `nginx -s reload` |
| RAM | ~20MB | ~5MB |

Для MVP с <50 пользователей Caddy — оптимальный выбор. Миграция на Nginx тривиальна при необходимости.

### Почему один домен, а не 4 субдомена

Другая модель предлагает app/api/auth.complior.eu. **Это over-engineering для MVP:**

- Один домен `app.complior.eu` → Caddy маршрутизирует по path (`/api/*` → backend, `/*` → frontend)
- Ory Kratos доступен через backend (уже реализовано — `ory-client.js` ходит на localhost:4433)
- Нет проблем с cookies cross-domain (SameSite=Lax работает)
- Нет проблем с CORS
- Один TLS-сертификат вместо wildcard
- При росте до >1000 пользователей — легко добавить `api.complior.eu`

---

## Карта данных (EU Data Residency)

| Сервис | Локация | Тип данных | EU-compliant? |
|--------|---------|-----------|:------------:|
| Hetzner Cloud Server | Falkenstein, DE | Все данные приложения | ✅ |
| PostgreSQL (Docker) | Тот же сервер | PII, бизнес-данные | ✅ |
| Hetzner Object Storage | Falkenstein, DE | PDF документы | ✅ |
| Ory Kratos (Docker) | Тот же сервер | Identity, sessions | ✅ |
| Brevo | Париж, FR | Email-адреса (транзакционные) | ✅ |
| Stripe | EU + US | Платёжные данные | ✅ c DPA |
| Sentry | US | Stack traces (без PII) | ⚠️ DPA + SCC |
| Plausible | Таллинн, EE | Аналитика (анонимная, без cookies) | ✅ |
| Mistral | Париж, FR | Chat-сообщения (Sprint Eva) | ✅ |

**Sentry** — единственный US-субпроцессор. Варианты:
1. Sentry SaaS + DPA с Standard Contractual Clauses (текущий план)
2. Позже: self-host GlitchTip на Hetzner (Sentry-совместимый, 100% EU)

---

## User Stories

### US-045: Production Docker Configuration (5 SP)

**Цель:** Создать production-ready Docker-конфигурацию для всех сервисов.

**Что нужно исправить в текущем состоянии:**
- `Dockerfile` — нет multi-stage build, нет non-root user, нет healthcheck
- `docker-compose.yml` — dev-only (пароль `postgres:postgres`, volume mounts, `--dev` flag)
- Нет Dockerfile для frontend
- `next.config.js` — rewrite на `localhost:8000` (сломается между контейнерами)

**Новые файлы:**

`Dockerfile.production` (backend, multi-stage):
- Stage 1 (builder): `node:20-alpine`, `npm ci --omit=dev`
- Stage 2 (runtime): `node:20-alpine`, non-root user `nodejs:1001`
- HEALTHCHECK: `wget http://127.0.0.1:8000/health`
- CMD: `node server/main.js`

`frontend/Dockerfile.production`:
- Stage 1: `npm ci && npm run build` (с `output: 'standalone'` в next.config.js)
- Stage 2: non-root user, copy `.next/standalone` + `.next/static` + `public`
- HEALTHCHECK: `wget http://127.0.0.1:3001/`
- CMD: `node server.js`

`docker-compose.production.yml`:
- PostgreSQL 16-alpine: пароль через Docker secret, порт ТОЛЬКО `127.0.0.1:5432` (не наружу), WAL archiving
- Ory Kratos v1.3.1: production config (US-047), depends on postgres healthy
- Gotenberg 8: порт только internal network
- Backend: `.env.production`, depends on postgres+kratos healthy
- Frontend: `NEXT_PUBLIC_API_URL` через env, depends on backend
- Caddy: reverse proxy (US-046), ports 80+443
- Все сервисы: `restart: unless-stopped`, log rotation (`max-size: 10m, max-file: 3`)
- Network: `complior_net` (bridge, internal для DB)
- Volumes: `pgdata`, `caddy_data`, `caddy_config`

**Модифицированные файлы:**
- `frontend/next.config.js` — добавить `output: 'standalone'`, rewrite destination из env var:
  ```js
  destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`
  ```

**AC:**
- `docker compose -f docker-compose.production.yml up -d` поднимает все 6 сервисов
- Все health checks зелёные
- PostgreSQL НЕ доступен снаружи (`nmap -p 5432 <server-ip>` → closed)
- Backend и frontend работают через Caddy

---

### US-046: Caddy Reverse Proxy + Auto-TLS (3 SP)

**Цель:** HTTPS для всех endpoints, автоматический TLS через Let's Encrypt.

**Новые файлы:**

`caddy/Caddyfile`:
```
app.complior.eu {
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle /health {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3001
    }

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -Server
    }

    log {
        output file /var/log/caddy/access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
```

- HTTP → HTTPS redirect автоматический (Caddy default)
- TLS certificate provisioning автоматический (ACME)
- Certificate renewal автоматический (фоновый процесс)
- Security headers на все ответы
- Заголовок `Server` удалён (информация об инфраструктуре не раскрывается)

**В docker-compose.production.yml:**
```yaml
caddy:
  image: caddy:2-alpine
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
    - "443:443/udp"  # HTTP/3
  volumes:
    - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
    - caddy_data:/data
    - caddy_config:/config
```

**Prerequisite:** DNS A-запись `app.complior.eu` → IP сервера (создать до деплоя).

**AC:**
- `https://app.complior.eu` — работает с valid TLS (Let's Encrypt)
- `http://app.complior.eu` → 301 redirect на HTTPS
- `https://app.complior.eu/api/health` → `{ status: 'ok' }` (Fastify через Caddy)
- Security headers присутствуют (проверить: `curl -I https://app.complior.eu`)
- SSL Labs: A+ рейтинг

---

### US-047: Ory Kratos Production Config (5 SP)

**Цель:** Заменить dev-конфигурацию Kratos на production-ready.

**Текущие проблемы в `ory/kratos.yml`:**
- Secrets: `dev-cookie-secret-at-least-32-chars-change-in-production` (hardcoded!)
- URLs: `http://localhost:3001` (11 мест), `http://localhost:4433`
- SMTP: `smtp://localhost:1025/?disable_starttls=true` (MailHog dev)
- Webhook secret: `dev-webhook-secret-change-in-production` (2 места)
- Docker compose: `--dev` flag

**Новые файлы:**

`ory/kratos.production.yml`:
- `serve.public.base_url`: `https://app.complior.eu/.ory/kratos/public`
- `serve.admin.base_url`: `http://kratos:4434/`
- CORS: `https://app.complior.eu`
- Все `ui_url`: `https://app.complior.eu/auth/...`
- `default_browser_return_url`: `https://app.complior.eu/`
- `allowed_return_urls`: `https://app.complior.eu`
- Secrets: из env vars `KRATOS_COOKIE_SECRET`, `KRATOS_CIPHER_SECRET`
- Webhook URL: `http://backend:8000/api/auth/webhook` (Docker internal)
- Webhook secret: из env var `ORY_WEBHOOK_SECRET`
- SMTP: Brevo SMTP relay
  ```yaml
  courier:
    smtp:
      connection_uri: smtps://login:password@smtp-relay.brevo.com:465
      from_address: noreply@complior.eu
      from_name: Complior
  ```
- Argon2: production settings (memory: 256MB, iterations: 3, parallelism: 2)
- Session lifespan: 24h (оставляем)
- Cookie: `SameSite: Lax`, `domain: app.complior.eu`
- Log: `level: warn` (production)

**docker-compose.production.yml** (Kratos service):
```yaml
kratos:
  image: oryd/kratos:v1.3.1
  command: serve -c /etc/config/kratos/kratos.production.yml --watch-courier
  # НЕТ --dev flag!
  environment:
    DSN: postgres://complior:${DB_PASSWORD}@postgres:5432/complior?sslmode=disable
    KRATOS_COOKIE_SECRET: ${KRATOS_COOKIE_SECRET}
    KRATOS_CIPHER_SECRET: ${KRATOS_CIPHER_SECRET}
  ports: []  # НЕ экспозировать наружу
  networks:
    - complior_net
```

**Модифицированные файлы:**
- `server/src/http.js` — добавить proxy routes для Kratos public API:
  - `/.ory/kratos/public/*` → `http://kratos:4433/*` (для frontend self-service flows)
  - Или: frontend ходит через backend API (уже реализовано через `ory-client.js`)

**AC:**
- Kratos НЕ доступен снаружи (порты 4433/4434 не экспонируются)
- Регистрация/логин работают через `https://app.complior.eu`
- Verification emails приходят через Brevo SMTP
- Cookie `aiact_session` с `domain=app.complior.eu`, `Secure`, `SameSite=Lax`
- Dev secrets НЕ используются нигде

---

### US-048: Database Security + Automated Backups (5 SP)

**Цель:** PostgreSQL защищён и бэкапится автоматически.

**Database Security:**

`docker-compose.production.yml` (PostgreSQL):
```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: complior
    POSTGRES_USER: complior
    POSTGRES_PASSWORD_FILE: /run/secrets/db_password
  secrets:
    - db_password
  ports: []  # НИКОГДА не экспонировать наружу!
  networks:
    - complior_net
  volumes:
    - pgdata:/var/lib/postgresql/data
    - ./backups:/backups
  command:
    - postgres
    - -c
    - ssl=off
    - -c
    - log_connections=on
    - -c
    - log_disconnections=on
    - -c
    - log_statement=ddl
    - -c
    - shared_buffers=256MB
    - -c
    - work_mem=16MB
    - -c
    - max_connections=100
```

**Почему `ssl=off` внутри Docker?** Трафик идёт только по internal Docker network (`complior_net`). Внешний трафик шифруется Caddy (TLS). SSL внутри Docker — двойное шифрование без пользы.

**Automated Backup Script:**

`scripts/backup-db.sh`:
- `pg_dump` через Docker exec → gzip → `/home/complior/backups/`
- Именование: `complior_YYYYMMDD_HHMMSS.sql.gz`
- Upload в Hetzner Object Storage (S3) через `aws s3 cp` (уже есть s3-client)
- Retention: 14 дней локально, 90 дней в S3
- Cron: ежедневно в 03:00 UTC
- Логирование: `/var/log/complior/backup.log`
- Проверка: exit code + размер файла > 1KB

`scripts/restore-db.sh`:
- Принимает аргумент: имя backup файла
- Восстанавливает из gzip в PostgreSQL
- Документированная процедура disaster recovery

**Crontab (`complior` user):**
```
0 3 * * * /home/complior/scripts/backup-db.sh >> /var/log/complior/backup.log 2>&1
```

**AC:**
- `nmap -p 5432 <server-ip>` → port closed (не видно снаружи)
- Backup скрипт: запуск → файл создан → размер > 1KB
- Backup в Hetzner S3: файл появился в бакете
- Restore тест: восстановление из backup → данные целы
- Cron job активен: `crontab -l` показывает расписание
- Retention: файлы старше 14 дней удаляются автоматически

---

### US-049: Server Hardening (3 SP)

**Цель:** Защитить сервер от атак.

**1. Системный пользователь:**
```bash
adduser --disabled-password complior
usermod -aG docker complior
# Проект в /home/complior/PROJECT
# Docker запускается от complior, НЕ от root
```

**2. UFW Firewall:**
```
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw allow 443/udp   # HTTP/3 (QUIC)
ufw enable
```
Все остальные порты (5432, 4433, 4434, 3000, 8000, 3001) **закрыты** снаружи.

**3. SSH Hardening** (`/etc/ssh/sshd_config`):
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers complior
```

**4. Fail2Ban:**
```ini
[sshd]
enabled = true
maxretry = 3
bantime = 3600
findtime = 600
```

**5. Security Headers (дополнительно к Caddy из US-046):**

В Fastify (`server/src/http.js`) — добавить хук для API-specific headers:
```javascript
// Content-Security-Policy для API (JSON only)
reply.header('Content-Security-Policy', "default-src 'none'");
reply.header('X-Content-Type-Options', 'nosniff');
```

**6. Автоматические обновления безопасности:**
```bash
apt install unattended-upgrades
dpkg-reconfigure unattended-upgrades  # Только security updates
```

**7. Docker daemon hardening:**
- `userns-remap` (пользовательские namespaces)
- `no-new-privileges: true` в Docker Compose
- Read-only root filesystem где возможно

**AC:**
- `ufw status` — 4 правила (22, 80, 443/tcp, 443/udp)
- SSH: `ssh root@server` → denied
- SSH: `ssh complior@server` с паролем → denied (только ключ)
- Fail2Ban: 3 неудачных SSH попытки → IP забанен на 1 час
- `nmap <server-ip>` → только 22, 80, 443 открыты
- Docker containers: все non-root (проверить: `docker exec <c> whoami` → NOT root)

---

### US-050: CI/CD Pipeline Fix (3 SP)

**Цель:** Рабочий пайплайн: push to main → автоматический деплой.

**Текущие проблемы в `.github/workflows/deploy.yml`:**
1. `npx prisma migrate deploy` — Prisma нет, используем MetaSQL
2. Docker push в неуказанный registry
3. `cd /opt/ai-act-platform` — путь должен быть `/home/complior/PROJECT`
4. `docker system prune -af` — опасно, может удалить нужные images
5. Нет rollback стратегии
6. Нет уведомления о результате

**Исправленный `deploy.yml`:**

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: complior
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /home/complior/PROJECT
            git fetch origin main
            git checkout main
            git pull origin main

            # Build and restart (zero-downtime для stateless сервисов)
            docker compose -f docker-compose.production.yml build --no-cache backend frontend
            docker compose -f docker-compose.production.yml up -d --no-deps backend frontend

            # Run database migrations (idempotent)
            docker compose -f docker-compose.production.yml exec -T backend node app/setup.js

            # Wait for health check
            sleep 5
            curl -f http://127.0.0.1:8000/health || exit 1

            # Cleanup old images (safe)
            docker image prune -f

      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://app.complior.eu/health || exit 1
```

**Стратегия деплоя (zero-downtime для MVP):**
1. `git pull` — новый код
2. `docker compose build` — новые images (старые контейнеры ещё работают)
3. `docker compose up -d --no-deps backend` — Compose заменяет контейнер
4. Health check: ~5-10 сек downtime максимум
5. Если health check упал → rollback: `git checkout <prev-sha> && docker compose up -d`

**Rollback процедура** (документировать в `docs/RUNBOOK.md`):
```bash
# Быстрый rollback (< 2 минут)
cd /home/complior/PROJECT
git log --oneline -5  # Найти предыдущий commit
git checkout <prev-sha>
docker compose -f docker-compose.production.yml up -d --build backend frontend
curl -f http://127.0.0.1:8000/health
```

**Модифицированные файлы:**
- `.github/workflows/deploy.yml` — полностью переписать
- `.github/workflows/ci.yml` — добавить job `build-docker` (проверить что images собираются)

**AC:**
- Push to main → GitHub Action запускается → деплой на Hetzner
- Health check после деплоя → 200 OK
- Rollback: `git checkout HEAD~1 && docker compose up -d --build` → работает
- Нет ссылок на Prisma
- Путь: `/home/complior/PROJECT`

---

### US-051: Monitoring + Alerting (3 SP)

**Цель:** Знать о проблемах раньше пользователей.

**1. Sentry (Error Tracking):**
Уже интегрирован условно (`server/main.js:24-31`). Нужно:
- Создать проект на sentry.io
- Добавить `SENTRY_DSN` в `.env.production`
- Фильтрация: не отправлять cookies, auth headers, PII:
  ```javascript
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
    }
    return event;
  }
  ```

**2. Uptime Monitoring (Better Uptime / UptimeRobot):**
- Monitor 1: `https://app.complior.eu` (каждые 60 сек)
- Monitor 2: `https://app.complior.eu/health` (каждые 60 сек) — проверяет DB + Kratos
- Алерты: email (сразу), опционально Telegram
- Бесплатный тир: достаточно для MVP

**3. Plausible Analytics (privacy-friendly):**
- Self-hosted на том же сервере (Docker, бесплатно) ИЛИ SaaS (€9/мес)
- Рекомендация для MVP: SaaS — не усложнять инфраструктуру
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=app.complior.eu`
- Script tag в `frontend/app/layout.tsx`
- Без cookies, GDPR-compliant без consent banner

**4. Log Aggregation:**
- Docker logs: `json-file` driver, `max-size: 10m`, `max-file: 3`
- Просмотр: `docker compose logs -f --tail=100 backend`
- Для MVP достаточно. Позже: Loki + Grafana

**5. Disk Space Monitoring:**
```bash
# Cron job: alert if disk > 80%
0 */6 * * * [ $(df / --output=pcent | tail -1 | tr -d ' %') -gt 80 ] && \
  curl -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
  -d "chat_id=${TG_CHAT}&text=ALERT: Disk usage above 80%"
```

**AC:**
- Sentry: test error → появляется в dashboard
- Uptime: сервис вниз → email алерт в течение 2 минут
- Plausible: посещение страницы → event в dashboard
- Логи: `docker compose logs backend --tail=20` → видны запросы

---

### US-052: EU Compliance Pack (3 SP)

**Цель:** Юридическое соответствие GDPR, NIS2, ePrivacy, AI Act.

**1. Legal Pages (frontend):**

`frontend/app/legal/privacy/page.tsx` — Privacy Policy:
- Контроллер данных: Complior (реквизиты)
- Собираемые данные: email, имя, AI tool inventory, compliance scores
- Правовое основание: Art. 6(1)(b) исполнение договора
- Субпроцессоры: Stripe (US, DPA+SCC), Brevo (FR), Sentry (US, DPA+SCC), Plausible (EE)
- Хранение: EU (Hetzner, DE)
- Права: доступ (Art. 15), исправление (Art. 16), удаление (Art. 17), портируемость (Art. 20)
- DPO: не назначен (< 250 сотрудников, не core activity — обработка PII)
- Retention: данные аккаунта — до удаления + 1 год (legal obligations); логи — 14 дней
- Контакт: privacy@complior.eu

`frontend/app/legal/terms/page.tsx` — Terms of Service:
- Описание сервиса
- Ограничение ответственности (not legal advice)
- SLA: best effort (без гарантий для бесплатного плана)
- Stripe payments: ссылка на Stripe ToS
- Юрисдикция: EU law

`frontend/app/legal/imprint/page.tsx` — Imprint/Impressum:
- Обязательно по EU eCommerce Directive (2000/31/EC)
- Юридическое имя, адрес, контакт, регистрация

**2. Data Export API (GDPR Art. 20):**

Новый файл в DDD-архитектуре (sandbox):
- `app/application/iam/exportUserData.js`:
  - Собирает: User, Organization, AITools, Classifications, ComplianceDocuments, Conversations
  - Формат: JSON
  - Только данные текущего пользователя (multi-tenant filter)
- `app/api/user/exportData.js`:
  - `GET /api/user/export` → JSON download
  - Auth: authenticated, только свои данные

**3. Account Deletion API (GDPR Art. 17):**

- `app/application/iam/deleteAccount.js`:
  - Soft delete: анонимизация PII (email → `deleted_<id>@deleted.local`, fullName → `[DELETED]`)
  - Сохранение: auditLog (legal obligation), anonymized metrics
  - Удаление: Ory identity (`ory.deleteIdentity(oryId)`)
  - Stripe: cancel subscription если активна
- `app/api/user/deleteAccount.js`:
  - `DELETE /api/user/account` → подтверждение через body `{ confirm: true }`
  - Auth: authenticated, только свой аккаунт

**4. Cookie Notice:**
- **НЕ НУЖЕН.** Используем только strictly necessary cookies (`aiact_session` от Kratos).
- Plausible — без cookies. Stripe — redirect (их cookies, их ответственность).
- ePrivacy Directive Art. 5(3): exemption для strictly necessary cookies.
- Документировать в Privacy Policy: "We only use strictly necessary session cookies."

**5. Checklist Sub-процессоров (DPA):**

| Субпроцессор | DPA нужен? | Как получить |
|-------------|:---------:|-------------|
| Stripe | ✅ | Автоматически в Stripe ToS |
| Brevo | ✅ | В dashboard Brevo: Account → GDPR → DPA |
| Sentry | ✅ | sentry.io → Settings → Legal → DPA |
| Plausible | ❌ | Не обрабатывает PII |
| Hetzner | ✅ | Автоматически в Hetzner ToS (AV-Vertrag) |
| Mistral | ✅ | При подключении Eva (Sprint Eva) |

**6. NIS2 Directive (для SaaS-платформ):**
- Базовая оценка рисков: документировать в `docs/RISK-ASSESSMENT.md`
- Incident response procedure: документировать в `docs/INCIDENT-RESPONSE.md`
- Supply chain security: `npm audit` в CI, зафиксированные версии (`package-lock.json`)
- НЕ обязательно для стартапа < 50 сотрудников, < €10M revenue, но подготовиться полезно

**Тесты:** 4 теста
- Data export: возвращает JSON с данными пользователя
- Data export: не возвращает данные другого пользователя
- Account deletion: анонимизирует PII
- Account deletion: требует `{ confirm: true }`

**AC:**
- `/legal/privacy` — страница доступна, содержит все обязательные секции GDPR
- `/legal/terms` — страница доступна
- `/legal/imprint` — страница доступна
- `GET /api/user/export` → JSON со всеми данными текущего пользователя
- `DELETE /api/user/account` → soft delete, PII анонимизированы
- DPA checklist заполнен для всех субпроцессоров

---

## Зависимости

```
US-045 (Docker) ──→ US-046 (Caddy TLS)
US-045 (Docker) ──→ US-047 (Kratos Prod)
US-045 (Docker) ──→ US-048 (DB Security)
US-049 (Hardening) — параллельно, не зависит от Docker
US-050 (CI/CD) ──→ зависит от US-045..049 (нужна рабочая production среда)
US-051 (Monitoring) — параллельно после US-046 (нужен HTTPS)
US-052 (Compliance) — параллельно, бэкенд часть после US-045
```

**Порядок выполнения:**
1. **US-045** (Docker) — фундамент, первым
2. **US-046** (Caddy) + **US-047** (Kratos) + **US-048** (DB) + **US-049** (Hardening) — параллельно
3. **US-050** (CI/CD) + **US-051** (Monitoring) + **US-052** (Compliance) — финал

---

## Secrets для .env.production

```bash
# Генерация всех секретов
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')
KRATOS_COOKIE_SECRET=$(openssl rand -hex 32)
KRATOS_CIPHER_SECRET=$(openssl rand -hex 32)
ORY_WEBHOOK_SECRET=$(openssl rand -hex 32)

# .env.production (создать на сервере, НЕ в git)
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=warn
DATABASE_URL=postgres://complior:${DB_PASSWORD}@postgres:5432/complior
ORY_SDK_URL=http://kratos:4433
ORY_ADMIN_URL=http://kratos:4434
ORY_WEBHOOK_SECRET=${ORY_WEBHOOK_SECRET}
BREVO_API_KEY=<real key>
GOTENBERG_URL=http://gotenberg:3000
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_BUCKET=compliance-docs
S3_ACCESS_KEY=<real key>
S3_SECRET_KEY=<real key>
S3_REGION=fsn1
STRIPE_SECRET_KEY=sk_test_<key>  # Начинаем в test mode
STRIPE_WEBHOOK_SECRET=whsec_<key>
SENTRY_DSN=https://<key>@sentry.io/<id>
FRONTEND_URL=https://app.complior.eu
CORS_ORIGIN=https://app.complior.eu
```

**Права доступа:** `chmod 600 .env.production` (только owner-read)

---

## Стоимость Production (ежемесячно)

| Сервис | Стоимость | Примечание |
|--------|--------:|-----------|
| Hetzner Cloud (CX31) | ~€15 | 4 vCPU, 16GB RAM, существующий |
| Hetzner Object Storage | ~€5 | Бэкапы + PDF документы |
| Plausible Analytics | €9 | Или self-host бесплатно |
| Brevo | €0 | Бесплатный тир (300 email/день) |
| Sentry | €0 | Бесплатный тир (5K events/мес) |
| UptimeRobot | €0 | Бесплатный тир (50 monitors) |
| Let's Encrypt | €0 | Caddy auto-TLS |
| Stripe | 1.5%+€0.25 | Per transaction |
| **Итого** | **~€29/мес** | **+ transaction fees** |

---

## Стратегия Zero-Downtime Deployment

### Текущий подход (MVP, <50 пользователей):
1. `git pull` на сервере
2. `docker compose build --no-cache backend frontend` (старые контейнеры работают)
3. `docker compose up -d --no-deps backend` (замена контейнера, ~5 сек downtime)
4. `docker compose up -d --no-deps frontend` (замена контейнера, ~3 сек downtime)
5. Health check: `curl -f localhost:8000/health`

**Downtime:** ~5-10 секунд. Приемлемо для MVP.

### Эволюция (>100 пользователей):
- Docker Swarm mode: `deploy.replicas: 2` + `update_config.order: start-first`
- Или: Kubernetes на Hetzner (overkill для <1000 пользователей)

### Database Migrations:
- Все migrations в `app/setup.js` **идемпотентные** (`ADD COLUMN IF NOT EXISTS`)
- Backward-compatible: только ADD, никогда DROP в одном деплое
- Порядок: сначала migration, потом код → старый код работает с новой схемой

---

## Incident Response Plan

### Severity Levels:
| Level | Описание | Response Time | Действие |
|:-----:|----------|:------------:|----------|
| P0 | Сервис недоступен, потеря данных | Немедленно | Rollback, restore backup |
| P1 | Ключевая функция сломана | < 1 час | Hotfix deploy |
| P2 | Минорная проблема | < 4 часа | Fix в следующем деплое |
| P3 | Косметика | Следующий спринт | Backlog |

### Rollback:
```bash
cd /home/complior/PROJECT
git log --oneline -5
git checkout <previous-sha>
docker compose -f docker-compose.production.yml up -d --build backend frontend
curl -f http://127.0.0.1:8000/health
```

### Database Restore:
```bash
# Последний backup
ls -la /home/complior/backups/
# Restore
gunzip -c /home/complior/backups/complior_YYYYMMDD_030000.sql.gz | \
  docker exec -i complior-postgres psql -U complior -d complior
```

---

## Pre-Launch Checklist

**Infrastructure:**
- [ ] DNS A-запись `app.complior.eu` → IP сервера
- [ ] Все Docker контейнеры running + healthy
- [ ] TLS certificate valid (Let's Encrypt)
- [ ] PostgreSQL НЕ доступен снаружи
- [ ] UFW: только 22, 80, 443
- [ ] SSH: только ключ, не root

**Security:**
- [ ] Все dev secrets заменены на production
- [ ] `.env.production` НЕ в git, права 600
- [ ] `npm audit --production` → 0 critical
- [ ] Security headers присутствуют
- [ ] Fail2Ban активен

**Data:**
- [ ] Backup скрипт работает
- [ ] Test restore успешен
- [ ] Backup в Hetzner S3 работает
- [ ] Cron job активен

**Compliance:**
- [ ] Privacy Policy опубликована
- [ ] Terms of Service опубликованы
- [ ] Imprint/Impressum опубликован
- [ ] Data export работает
- [ ] Account deletion работает
- [ ] DPA с Stripe, Brevo, Sentry, Hetzner

**Monitoring:**
- [ ] Sentry получает test error
- [ ] UptimeRobot → alert при downtime
- [ ] Plausible → tracking pageviews

**Operations:**
- [ ] CI/CD: push to main → auto deploy
- [ ] Rollback процедура задокументирована и протестирована
- [ ] Incident response plan задокументирован
- [ ] Stripe в test mode (переключить на live после первой недели)

---

## Новые файлы (13 файлов)

```
Dockerfile.production                    # Multi-stage backend build
frontend/Dockerfile.production           # Multi-stage frontend build
docker-compose.production.yml            # Production orchestration
caddy/Caddyfile                          # Reverse proxy + TLS
ory/kratos.production.yml                # Production Kratos config
scripts/backup-db.sh                     # Automated DB backup
scripts/restore-db.sh                    # DB restore procedure
app/application/iam/exportUserData.js    # GDPR data export
app/application/iam/deleteAccount.js     # GDPR account deletion
app/api/user/exportData.js               # Data export API handler
app/api/user/deleteAccount.js            # Account deletion API handler
docs/RUNBOOK.md                          # Operations runbook
docs/INCIDENT-RESPONSE.md               # Incident response plan
```

## Модифицированные файлы (5 файлов)

```
.github/workflows/deploy.yml            # Fix CI/CD pipeline
frontend/next.config.js                  # output: 'standalone', env-based rewrite
server/src/http.js                       # Security headers hook
server/lib/schemas.js                    # Zod schemas для export/delete
tests/helpers/test-sandbox.js            # Моки для новых application services
```

## Новые тесты (1 файл, ~8 тестов)

```
tests/gdpr-data-rights.test.js          # Export + deletion tests
```
