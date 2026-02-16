# Production Deployment Plan — Complior (EU AI Act Compliance Platform)

## Задача / Problem Statement

### Исходный запрос
Запустить в продакшин EU AI Act Compliance Platform (Complior) — платформу для соответствия требованиям AI Act для деплойеров AI-систем.

### Требования к развертыванию

**Функциональные требования:**
- 99% uptime SLA (допустимый downtime: 7.2 часа/месяц)
- Timeline: 1-2 недели (10-14 дней)
- Бюджет: €150-250/месяц (оптимальный)
- Stripe интеграция: начать в тестовом режиме, затем переключить на live mode
- Полное соответствие EU законодательству (GDPR, NIS2, AI Act)

**Специфические технические требования:**

1. **Инфраструктура:**
   - Использовать существующий Hetzner сервер (~€50/месяц)
   - НЕ покупать новый сервер, НЕ покупать Managed Database сейчас
   - PostgreSQL: локальный Docker контейнер (купить Managed DB позже)

2. **Системная настройка:**
   - Создать выделенного системного пользователя `complior`
   - Переместить проект из `/home/openclaw/PROJECT/` в `/home/complior/PROJECT/`
   - Настроить SSH ключ для GitHub доступа для пользователя `complior`

3. **Организация документации:**
   - Создать отдельную директорию для документации спринта
   - Избежать потери файлов среди других документов

4. **Последовательность спринтов:**
   - Это будет Sprint 6 (после Sprint 5 — Frontend Development)
   - Следовать стандартному формату спринтов проекта

### Текущее состояние проекта

**Технологический стек:**
- Backend: Node.js 20, Fastify 5.7.4
- Frontend: Next.js 14 (App Router)
- Database: PostgreSQL (сейчас в development режиме)
- Auth: Ory Kratos (self-hosted, EU)
- AI/LLM: Mistral API (EU-hosted) via Vercel AI SDK
- Payments: Stripe (нужно настроить)
- Email: Brevo (transactional)

**Текущие проблемы:**
- Development secrets в файлах
- Нет SSL/TLS
- Нет production deployment конфигурации
- Нет мониторинга и алертов
- Нет автоматических бэкапов
- Нет GDPR compliance UI

---

## Production Deployment Plan

### Обзор плана

**Срок выполнения:** 14 дней (2026-02-13 → 2026-02-27)
**Стоимость:** ~€60/месяц (€50 server + €9 Plausible analytics)
**Подход:** Aggressive timeline, фокус на critical path

### Фазы развертывания

#### Phase 1: Foundation & Security (Days 1-3)
#### Phase 2: Infrastructure & Data (Days 4-6)
#### Phase 3: Monitoring & Compliance (Days 7-9)
#### Phase 4: Testing & Hardening (Days 10-12)
#### Phase 5: Go-Live (Days 13-14)

---

## Детальный план по дням

### Day 1: System Setup & User Configuration

**Цели:**
- Создать выделенного пользователя `complior`
- Переместить проект в новую локацию
- Настроить SSH доступ к GitHub

**Задачи:**

1. **Создание системного пользователя:**
```bash
# Создать пользователя без пароля (только SSH keys)
sudo adduser --disabled-password --gecos "" complior

# Добавить в Docker группу
sudo usermod -aG docker complior

# Добавить в sudo группу (опционально для админ задач)
sudo usermod -aG sudo complior

# Проверить группы
groups complior
```

2. **Переместить проект:**
```bash
# Создать директорию проекта
sudo mkdir -p /home/complior/PROJECT

# Скопировать существующий проект
sudo cp -r /home/openclaw/PROJECT/* /home/complior/PROJECT/

# Установить владельца
sudo chown -R complior:complior /home/complior/PROJECT

# Проверить права
ls -la /home/complior/PROJECT
```

3. **Настроить SSH ключи для GitHub:**
```bash
# Переключиться на пользователя complior
sudo su - complior

# Сгенерировать SSH ключ
ssh-keygen -t ed25519 -C "complior@server" -f ~/.ssh/id_ed25519_github

# Добавить в ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_github

# Показать публичный ключ (добавить в GitHub Deploy Keys)
cat ~/.ssh/id_ed25519_github.pub

# Создать SSH config
cat > ~/.ssh/config <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

4. **Тестировать GitHub доступ:**
```bash
ssh -T git@github.com
# Должно вернуть: "Hi username! You've successfully authenticated..."

cd /home/complior/PROJECT
git remote -v
git fetch
```

**Acceptance Criteria:**
- [ ] Пользователь `complior` создан и в группе `docker`
- [ ] Проект перемещен в `/home/complior/PROJECT/`
- [ ] SSH ключ настроен и добавлен в GitHub
- [ ] `git fetch` работает без пароля

---

### Day 2: Production Secrets & Environment

**Цели:**
- Сгенерировать production secrets
- Создать `.env.production` файлы
- Настроить secrets management

**Задачи:**

1. **Сгенерировать секреты:**
```bash
cd /home/complior/PROJECT

# JWT secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Session secrets
SESSION_SECRET=$(openssl rand -hex 32)
KRATOS_ADMIN_SECRET=$(openssl rand -hex 32)

# Database password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)

# Webhook signing secret
WEBHOOK_SECRET=$(openssl rand -hex 32)

# Сохранить в защищенный файл
cat > /home/complior/PROJECT/.env.production <<EOF
# Database
DATABASE_URL=postgresql://complior:${DB_PASSWORD}@localhost:5432/complior_production

# JWT & Auth
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Ory Kratos
KRATOS_PUBLIC_URL=https://auth.complior.eu
KRATOS_ADMIN_URL=http://localhost:4434
KRATOS_ADMIN_SECRET=${KRATOS_ADMIN_SECRET}

# Node Environment
NODE_ENV=production
PORT=3000

# Mistral AI (production key)
MISTRAL_API_KEY=your_production_key_here

# Stripe (test mode сначала)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}

# Brevo Email
BREVO_API_KEY=your_production_key_here
BREVO_SENDER_EMAIL=noreply@complior.eu
BREVO_SENDER_NAME=Complior

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# Frontend
NEXT_PUBLIC_API_URL=https://api.complior.eu
NEXT_PUBLIC_APP_URL=https://app.complior.eu
EOF

# Установить строгие права доступа
chmod 600 /home/complior/PROJECT/.env.production
```

2. **Создать secrets для Ory Kratos:**
```bash
cat > /home/complior/PROJECT/kratos/.env.production <<EOF
DSN=postgres://complior:${DB_PASSWORD}@localhost:5432/complior_production?sslmode=disable
SECRETS_COOKIE=${SESSION_SECRET}
SECRETS_CIPHER=${KRATOS_ADMIN_SECRET}
SERVE_PUBLIC_BASE_URL=https://auth.complior.eu
SERVE_ADMIN_BASE_URL=http://localhost:4434
EOF

chmod 600 /home/complior/PROJECT/kratos/.env.production
```

3. **Добавить в .gitignore:**
```bash
cat >> /home/complior/PROJECT/.gitignore <<EOF

# Production secrets
.env.production
kratos/.env.production
.secrets/
EOF
```

4. **Создать backup секретов (encrypted):**
```bash
mkdir -p /home/complior/.secrets-backup

# Зашифровать и сохранить backup
openssl enc -aes-256-cbc -salt \
  -in /home/complior/PROJECT/.env.production \
  -out /home/complior/.secrets-backup/env.production.enc

# Запомнить пароль шифрования в безопасном месте!
```

**Acceptance Criteria:**
- [ ] Все секреты сгенерированы криптографически стойким методом
- [ ] `.env.production` создан с правами 600
- [ ] Секреты НЕ в Git
- [ ] Encrypted backup создан

---

### Day 3: Docker Production Configuration

**Цели:**
- Настроить локальный PostgreSQL контейнер
- Создать production docker-compose.yml
- Настроить Nginx reverse proxy

**Задачи:**

1. **Создать production docker-compose.yml:**
```yaml
cd /home/complior/PROJECT

cat > docker-compose.production.yml <<EOF
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: complior_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: complior_production
      POSTGRES_USER: complior
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - complior_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U complior -d complior_production"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  kratos:
    image: oryd/kratos:v1.1.0
    container_name: complior_kratos
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DSN=postgres://complior:\${DB_PASSWORD}@postgres:5432/complior_production?sslmode=disable
      - SERVE_PUBLIC_BASE_URL=https://auth.complior.eu
      - SERVE_ADMIN_BASE_URL=http://localhost:4434
    secrets:
      - kratos_secrets
    volumes:
      - ./kratos/config:/etc/config/kratos
    command: serve -c /etc/config/kratos/kratos.production.yml --watch-courier
    ports:
      - "127.0.0.1:4433:4433"
      - "127.0.0.1:4434:4434"
    networks:
      - complior_network
    healthcheck:
      test: ["CMD", "wget", "--spider", "--quiet", "http://localhost:4434/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.production
    container_name: complior_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      kratos:
        condition: service_healthy
    env_file:
      - .env.production
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - complior_network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    container_name: complior_frontend
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=https://api.complior.eu
      - NEXT_PUBLIC_APP_URL=https://app.complior.eu
    ports:
      - "127.0.0.1:3001:3000"
    networks:
      - complior_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

secrets:
  db_password:
    file: ./secrets/db_password.txt
  kratos_secrets:
    file: ./secrets/kratos_secrets.txt

volumes:
  postgres_data:
    driver: local

networks:
  complior_network:
    driver: bridge
EOF
```

2. **Создать secrets файлы:**
```bash
mkdir -p /home/complior/PROJECT/secrets
echo "${DB_PASSWORD}" > /home/complior/PROJECT/secrets/db_password.txt
echo "${KRATOS_ADMIN_SECRET}" > /home/complior/PROJECT/secrets/kratos_secrets.txt
chmod 600 /home/complior/PROJECT/secrets/*
```

3. **Создать production Dockerfiles:**

Backend Dockerfile:
```dockerfile
cat > /home/complior/PROJECT/server/Dockerfile.production <<EOF
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "main.js"]
EOF
```

Frontend Dockerfile:
```dockerfile
cat > /home/complior/PROJECT/frontend/Dockerfile.production <<EOF
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

USER nodejs
EXPOSE 3000

CMD ["node", "server.js"]
EOF
```

4. **Настроить Nginx reverse proxy:**
```bash
sudo cat > /etc/nginx/sites-available/complior.eu <<EOF
upstream backend {
    server 127.0.0.1:3000;
}

upstream frontend {
    server 127.0.0.1:3001;
}

upstream kratos_public {
    server 127.0.0.1:4433;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name complior.eu www.complior.eu app.complior.eu api.complior.eu auth.complior.eu;
    return 301 https://\$host\$request_uri;
}

# Main app (frontend)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.complior.eu;

    ssl_certificate /etc/letsencrypt/live/complior.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/complior.eu/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.complior.eu;

    ssl_certificate /etc/letsencrypt/live/complior.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/complior.eu/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Ory Kratos Auth
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name auth.complior.eu;

    ssl_certificate /etc/letsencrypt/live/complior.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/complior.eu/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://kratos_public;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Root domain redirect
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name complior.eu www.complior.eu;

    ssl_certificate /etc/letsencrypt/live/complior.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/complior.eu/privkey.pem;

    return 301 https://app.complior.eu\$request_uri;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/complior.eu /etc/nginx/sites-enabled/
sudo nginx -t
```

**Acceptance Criteria:**
- [ ] docker-compose.production.yml создан
- [ ] PostgreSQL контейнер с persistent volumes
- [ ] Production Dockerfiles для backend и frontend
- [ ] Nginx конфигурация создана
- [ ] Health checks настроены

---

### Day 4: SSL/TLS Configuration

**Цели:**
- Получить Let's Encrypt SSL сертификаты
- Настроить Cloudflare DNS
- Включить HTTPS

**Задачи:**

1. **Установить Certbot:**
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

2. **Настроить Cloudflare DNS (делать вручную в UI):**
- Добавить A records:
  - `complior.eu` → IP сервера
  - `app.complior.eu` → IP сервера
  - `api.complior.eu` → IP сервера
  - `auth.complior.eu` → IP сервера
- Установить proxy status: DNS only (temporary, для получения сертификата)
- TTL: Auto

3. **Получить SSL сертификаты:**
```bash
# Временно остановить Nginx
sudo systemctl stop nginx

# Получить сертификаты для всех доменов
sudo certbot certonly --standalone \
  -d complior.eu \
  -d www.complior.eu \
  -d app.complior.eu \
  -d api.complior.eu \
  -d auth.complior.eu \
  --email admin@complior.eu \
  --agree-tos \
  --no-eff-email

# Запустить Nginx
sudo systemctl start nginx
```

4. **Настроить auto-renewal:**
```bash
# Тест renewal
sudo certbot renew --dry-run

# Certbot автоматически создает cron job, проверить:
sudo systemctl status certbot.timer
```

5. **Включить Cloudflare proxy (в UI):**
- Переключить A records на "Proxied" (оранжевое облако)
- Настроить SSL/TLS mode: "Full (strict)"
- Включить "Always Use HTTPS"
- Включить "Automatic HTTPS Rewrites"

6. **Настроить Cloudflare Firewall Rules:**
```
Rule 1: Rate limiting
- If: (http.request.uri.path contains "/api/")
- Then: Rate limit (10 requests per 10 seconds per IP)

Rule 2: Block suspicious patterns
- If: (http.user_agent contains "bot" and not cf.client.bot)
- Then: Challenge (CAPTCHA)

Rule 3: Geo-blocking (optional)
- If: (ip.geoip.country not in {"EU countries list"})
- Then: Block or Challenge
```

**Acceptance Criteria:**
- [ ] SSL сертификаты получены для всех доменов
- [ ] Cloudflare DNS настроен
- [ ] HTTPS работает на всех endpoints
- [ ] HTTP → HTTPS redirect работает
- [ ] Auto-renewal настроен

---

### Day 5-6: Database Setup & Migration

**Цели:**
- Развернуть PostgreSQL в Docker
- Запустить database migrations
- Создать backup скрипты

**Задачи:**

1. **Запустить PostgreSQL контейнер:**
```bash
cd /home/complior/PROJECT

# Запустить только postgres
docker compose -f docker-compose.production.yml up -d postgres

# Проверить логи
docker logs complior_postgres

# Проверить подключение
docker exec complior_postgres psql -U complior -d complior_production -c "SELECT version();"
```

2. **Запустить migrations:**
```bash
# Если используется migration tool (например, node-pg-migrate или Prisma)
cd /home/complior/PROJECT/server
npm run migrate:production

# Или вручную через SQL файлы
docker exec -i complior_postgres psql -U complior -d complior_production < migrations/001_initial_schema.sql
```

3. **Создать backup скрипт:**
```bash
cat > /home/complior/scripts/backup-db.sh <<'EOF'
#!/bin/bash

BACKUP_DIR="/home/complior/PROJECT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="complior_production_${TIMESTAMP}.sql.gz"

# Create backup
docker exec complior_postgres pg_dump -U complior -d complior_production | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to Cloudflare R2 (if configured)
if command -v aws &> /dev/null; then
    aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://complior-backups/" \
        --endpoint-url https://<account-id>.r2.cloudflarestorage.com
fi

# Keep only last 14 days locally
find "${BACKUP_DIR}" -name "complior_production_*.sql.gz" -mtime +14 -delete

echo "Backup completed: ${BACKUP_FILE}"
EOF

chmod +x /home/complior/scripts/backup-db.sh

# Добавить в crontab (ежедневно в 3:00 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /home/complior/scripts/backup-db.sh >> /home/complior/logs/backup.log 2>&1") | crontab -
```

4. **Настроить Cloudflare R2 (опционально, для offsite backups):**
```bash
# Установить AWS CLI
sudo apt install -y awscli

# Настроить R2 credentials
mkdir -p ~/.aws
cat > ~/.aws/credentials <<EOF
[default]
aws_access_key_id = YOUR_R2_ACCESS_KEY
aws_secret_access_key = YOUR_R2_SECRET_KEY
EOF

cat > ~/.aws/config <<EOF
[default]
region = auto
EOF
```

5. **Тестовый backup и restore:**
```bash
# Backup
/home/complior/scripts/backup-db.sh

# Test restore
gunzip -c /home/complior/PROJECT/backups/complior_production_*.sql.gz | \
    docker exec -i complior_postgres psql -U complior -d complior_production_test
```

**Acceptance Criteria:**
- [ ] PostgreSQL контейнер работает
- [ ] Database schema создана (migrations выполнены)
- [ ] Backup скрипт создан и работает
- [ ] Cron job для daily backups настроен
- [ ] Test restore успешен

---

### Day 7: Monitoring & Logging Setup

**Цели:**
- Настроить Sentry для error tracking
- Настроить Better Uptime для uptime monitoring
- Настроить Plausible Analytics

**Задачи:**

1. **Sentry Setup:**
```bash
# Создать проект на sentry.io (бесплатный tier)
# Получить DSN

# Обновить .env.production
echo "SENTRY_DSN=https://...@sentry.io/..." >> /home/complior/PROJECT/.env.production
```

Backend integration (server/main.js):
```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Не отправлять sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
});
```

Frontend integration (frontend/app/layout.tsx):
```javascript
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
  });
}
```

2. **Better Uptime Setup:**
- Создать аккаунт на betteruptime.com (бесплатный)
- Добавить monitors:
  - `https://app.complior.eu` (каждые 30 секунд)
  - `https://api.complior.eu/health` (каждые 60 секунд)
  - `https://auth.complior.eu/health/ready` (каждые 60 секунд)
- Настроить alert channels (email, опционально Telegram)

3. **Plausible Analytics:**
```bash
# Создать аккаунт на plausible.io (€9/month)
# Добавить сайт: app.complior.eu
```

Frontend integration (frontend/app/layout.tsx):
```javascript
<Script
  defer
  data-domain="app.complior.eu"
  src="https://plausible.io/js/script.js"
/>
```

4. **Structured Logging (Pino):**

Server logging (server/main.js):
```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // Не логировать headers с токенами
    }),
  },
});

fastify.log = logger;
```

5. **Log rotation:**
```bash
sudo cat > /etc/logrotate.d/complior <<EOF
/home/complior/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 complior complior
}
EOF
```

**Acceptance Criteria:**
- [ ] Sentry integration работает (test error отправлен)
- [ ] Better Uptime monitors созданы и работают
- [ ] Plausible Analytics установлен
- [ ] Structured logging настроен
- [ ] Log rotation работает

---

### Day 8-9: GDPR Compliance Implementation

**Цели:**
- Добавить UI для GDPR прав
- Реализовать data export
- Реализовать right to erasure
- Создать Privacy Policy и Terms of Service

**Задачи:**

1. **Data Export API (backend):**
```javascript
// server/routes/user/data-export.js
fastify.post('/api/user/export', async (request, reply) => {
  const userId = request.user.id;

  // Собрать все данные пользователя
  const userData = {
    profile: await db.query('SELECT * FROM users WHERE id = $1', [userId]),
    ai_systems: await db.query('SELECT * FROM ai_systems WHERE user_id = $1', [userId]),
    assessments: await db.query('SELECT * FROM assessments WHERE user_id = $1', [userId]),
    // ... другие таблицы
  };

  // Отправить JSON
  reply.send({
    requested_at: new Date().toISOString(),
    data: userData,
  });
});
```

2. **Account Deletion API:**
```javascript
// server/routes/user/delete-account.js
fastify.delete('/api/user/account', async (request, reply) => {
  const userId = request.user.id;

  // Soft delete (GDPR требует хранить некоторые данные для legal purposes)
  await db.query(`
    UPDATE users
    SET
      email = 'deleted_' || id || '@deleted.local',
      name = '[DELETED]',
      deleted_at = NOW(),
      deletion_reason = $2
    WHERE id = $1
  `, [userId, request.body.reason]);

  // Удалить сессию
  await kratosAdmin.deleteSessions({ id: userId });

  reply.send({ success: true });
});
```

3. **Frontend GDPR Settings Page:**
```typescript
// frontend/app/(authenticated)/settings/privacy/page.tsx
export default function PrivacySettingsPage() {
  const handleExportData = async () => {
    const response = await fetch('/api/user/export', { method: 'POST' });
    const data = await response.json();

    // Download JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complior-data-export-${new Date().toISOString()}.json`;
    a.click();
  };

  return (
    <div>
      <h1>Privacy & Data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>Download all your data in JSON format (GDPR Article 20)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData}>Export Data</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>Permanently delete your account (GDPR Article 17)</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
```

4. **Создать legal documents:**

Privacy Policy (`/home/complior/PROJECT/frontend/app/legal/privacy/page.tsx`):
```markdown
# Privacy Policy

Last updated: 2026-02-13

## 1. Data Controller
Complior [Company Details]
Email: privacy@complior.eu

## 2. Data We Collect
- Account data (email, name)
- AI system documentation
- Assessment results
- Usage analytics (via Plausible, privacy-friendly)

## 3. Legal Basis (GDPR Article 6)
- Contract performance (Art. 6(1)(b))
- Legitimate interests (Art. 6(1)(f))
- Consent (Art. 6(1)(a)) for marketing

## 4. Your Rights
- Right to access (Art. 15)
- Right to rectification (Art. 16)
- Right to erasure (Art. 17)
- Right to data portability (Art. 20)

Contact: privacy@complior.eu

## 5. Data Storage
All data stored in EU (Hetzner Germany)

## 6. Retention
- Account data: Until account deletion + 1 year (legal obligations)
- Logs: 14 days

## 7. Third-Party Services
- Ory Kratos (Auth) - EU
- Mistral AI (LLM) - EU
- Stripe (Payments) - GDPR compliant
- Sentry (Errors) - GDPR compliant
- Plausible (Analytics) - EU, no cookies
```

Terms of Service:
```markdown
# Terms of Service

Last updated: 2026-02-13

## 1. Service Description
Complior provides EU AI Act compliance tools for deployers of AI systems.

## 2. Stripe Terms
Payment processing via Stripe. See https://stripe.com/legal

## 3. Liability
Service provided "as is". No liability for AI Act compliance decisions.

## 4. Termination
You can delete your account anytime from Settings > Privacy.

## 5. Governing Law
EU law and [Your Country] law.
```

5. **Cookie Consent (если используются cookies):**
```typescript
// Complior использует только session cookies (strictly necessary)
// Plausible не использует cookies
// → Cookie banner НЕ нужен (GDPR ePrivacy exception)

// Но добавить информацию в Privacy Policy:
"We only use strictly necessary cookies for authentication.
We do not use tracking cookies."
```

**Acceptance Criteria:**
- [ ] Data export API работает
- [ ] Account deletion API работает
- [ ] Privacy settings page создана в UI
- [ ] Privacy Policy опубликована
- [ ] Terms of Service опубликованы
- [ ] Cookie usage documented

---

### Day 10: Security Hardening

**Цели:**
- Провести OWASP Top 10 security audit
- Настроить rate limiting
- Включить security headers
- Настроить firewall

**Задачи:**

1. **Rate Limiting (Fastify):**
```javascript
// server/main.js
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  errorResponseBuilder: (request, context) => ({
    code: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded, retry in ${context.after}`,
  }),
});

// Stricter limits для sensitive endpoints
fastify.register(rateLimit, {
  max: 5,
  timeWindow: '15 minutes',
}, (instance) => {
  instance.post('/api/auth/login', loginHandler);
  instance.post('/api/auth/register', registerHandler);
});
```

2. **Security Headers:**
```javascript
// server/main.js
fastify.addHook('onRequest', async (request, reply) => {
  reply.headers({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' plausible.io; style-src 'self' 'unsafe-inline';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  });
});
```

3. **Input Validation (Zod):**
```javascript
// Все endpoints должны валидировать input с Zod
import { z } from 'zod';

const createAISystemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000),
  risk_level: z.enum(['minimal', 'limited', 'high', 'unacceptable']),
});

fastify.post('/api/ai-systems', async (request, reply) => {
  const validated = createAISystemSchema.parse(request.body);
  // ...
});
```

4. **SQL Injection Protection:**
```javascript
// Всегда использовать parameterized queries
// ✅ GOOD
await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ BAD (не делать!)
// await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

5. **Firewall (UFW):**
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block все остальное
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Check status
sudo ufw status verbose
```

6. **Fail2Ban (защита от brute force):**
```bash
sudo apt install -y fail2ban

# Configure
sudo cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

7. **Security Audit Checklist:**
```
OWASP Top 10 (2021) Audit:

✅ A01 - Broken Access Control
  - [ ] JWT tokens properly validated
  - [ ] User can only access own resources
  - [ ] Admin endpoints protected

✅ A02 - Cryptographic Failures
  - [ ] HTTPS everywhere
  - [ ] Passwords hashed (Kratos handles this)
  - [ ] Secrets not in code/git

✅ A03 - Injection
  - [ ] SQL: Parameterized queries
  - [ ] NoSQL: N/A (using PostgreSQL)
  - [ ] Command injection: No exec() calls

✅ A04 - Insecure Design
  - [ ] Rate limiting on auth endpoints
  - [ ] CAPTCHA on registration (опционально)

✅ A05 - Security Misconfiguration
  - [ ] Security headers set
  - [ ] Default credentials changed
  - [ ] Error messages don't leak info

✅ A06 - Vulnerable Components
  - [ ] npm audit run и зафиксированы
  - [ ] Dependencies updated

✅ A07 - Identification and Authentication Failures
  - [ ] Ory Kratos (industry-standard auth)
  - [ ] MFA available (Kratos supports)

✅ A08 - Software and Data Integrity Failures
  - [ ] Package-lock.json committed
  - [ ] Stripe webhook signatures verified

✅ A09 - Security Logging Failures
  - [ ] Pino structured logging
  - [ ] Failed auth attempts logged
  - [ ] Sentry error tracking

✅ A10 - Server-Side Request Forgery (SSRF)
  - [ ] No user-controlled URLs in backend requests
  - [ ] Mistral API calls from backend only
```

8. **Run security scan:**
```bash
# npm audit
cd /home/complior/PROJECT/server
npm audit --production

cd /home/complior/PROJECT/frontend
npm audit --production

# OWASP Dependency-Check (опционально)
docker run --rm -v /home/complior/PROJECT:/src owasp/dependency-check:latest \
  --scan /src --format HTML --out /src/security-report
```

**Acceptance Criteria:**
- [ ] Rate limiting работает (проверить с curl)
- [ ] Security headers установлены (проверить в browser DevTools)
- [ ] UFW firewall включен
- [ ] Fail2Ban настроен
- [ ] OWASP Top 10 audit пройден
- [ ] npm audit: 0 high/critical vulnerabilities

---

### Day 11: Performance Optimization & Testing

**Цели:**
- Оптимизировать response times
- Load testing
- Database query optimization

**Задачи:**

1. **Database Indexing:**
```sql
-- Создать indexes для часто используемых queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_ai_systems_user_id ON ai_systems(user_id);
CREATE INDEX idx_ai_systems_created_at ON ai_systems(created_at DESC);
CREATE INDEX idx_assessments_ai_system_id ON assessments(ai_system_id);
CREATE INDEX idx_assessments_status ON assessments(status);

-- Composite indexes
CREATE INDEX idx_ai_systems_user_status ON ai_systems(user_id, status);
```

2. **Query Optimization:**
```javascript
// Использовать SELECT specific columns, не SELECT *
// ❌ BAD
const result = await db.query('SELECT * FROM ai_systems WHERE user_id = $1', [userId]);

// ✅ GOOD
const result = await db.query(`
  SELECT id, name, risk_level, status, created_at
  FROM ai_systems
  WHERE user_id = $1
`, [userId]);

// Добавить LIMIT для pagination
const result = await db.query(`
  SELECT id, name, risk_level
  FROM ai_systems
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT 50
`, [userId]);
```

3. **Caching Headers:**
```javascript
// Static assets (Nginx)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

// API responses (Fastify)
fastify.get('/api/ai-systems/:id', async (request, reply) => {
  const system = await getAISystem(request.params.id);
  reply.header('Cache-Control', 'private, max-age=60');
  return system;
});
```

4. **Load Testing (Artillery):**
```bash
npm install -g artillery

# Создать test scenario
cat > load-test.yml <<EOF
config:
  target: "https://api.complior.eu"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Spike test"

scenarios:
  - name: "List AI Systems"
    flow:
      - get:
          url: "/api/ai-systems"
          headers:
            Authorization: "Bearer {{token}}"
      - think: 2
      - get:
          url: "/api/ai-systems/{{systemId}}"
EOF

# Run test
artillery run load-test.yml --output report.json
artillery report report.json
```

5. **Frontend Performance:**
```typescript
// Next.js: использовать Server Components где возможно
// Dynamic imports для heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Spinner />,
  ssr: false,
});

// Image optimization
import Image from 'next/image';
<Image src="/logo.png" width={200} height={50} alt="Complior" />
```

6. **Monitoring Response Times:**
```javascript
// Fastify: добавить response time logging
fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = reply.getResponseTime();
  if (responseTime > 1000) {
    logger.warn({
      url: request.url,
      method: request.method,
      responseTime,
    }, 'Slow response');
  }
});
```

**Acceptance Criteria:**
- [ ] Database indexes созданы
- [ ] Load test пройден: p95 latency < 500ms
- [ ] Frontend: Lighthouse score > 90
- [ ] No slow queries (все < 100ms)

---

### Day 12: Stripe Integration & Testing

**Цели:**
- Настроить Stripe test mode
- Реализовать subscription logic
- Тестировать payment flow

**Задачи:**

1. **Stripe Account Setup:**
- Создать account на stripe.com
- Verify identity (потребуется для live mode)
- Получить test API keys

2. **Create Stripe Products:**
```bash
# Используя Stripe CLI или Dashboard
stripe products create --name "Complior Pro" --description "Professional plan"
stripe prices create --product {product_id} --unit-amount 2900 --currency eur --recurring interval=month
```

Or via Dashboard:
- Product: "Complior Pro"
- Price: €29/month
- Product: "Complior Enterprise"
- Price: €99/month

3. **Backend: Subscription API:**
```javascript
// server/routes/subscriptions/create-checkout.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

fastify.post('/api/subscriptions/checkout', async (request, reply) => {
  const { priceId } = request.body;
  const userId = request.user.id;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: request.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: 'https://app.complior.eu/dashboard?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://app.complior.eu/pricing',
    metadata: { user_id: userId },
  });

  return { url: session.url };
});
```

4. **Webhook Handler:**
```javascript
// server/routes/webhooks/stripe.js
fastify.post('/webhooks/stripe', async (request, reply) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return reply.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleSubscriptionCreated(session);
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionCanceled(subscription);
      break;

    // ... other events
  }

  return { received: true };
});

async function handleSubscriptionCreated(session) {
  const userId = session.metadata.user_id;
  await db.query(`
    UPDATE users
    SET
      subscription_status = 'active',
      stripe_customer_id = $2,
      stripe_subscription_id = $3
    WHERE id = $1
  `, [userId, session.customer, session.subscription]);
}
```

5. **Frontend: Pricing Page:**
```typescript
// frontend/app/(public)/pricing/page.tsx
export default function PricingPage() {
  const handleSubscribe = async (priceId: string) => {
    const response = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const { url } = await response.json();
    window.location.href = url;
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <PricingCard
        title="Pro"
        price="€29"
        features={["Up to 10 AI systems", "Risk assessments", "Email support"]}
        onSubscribe={() => handleSubscribe('price_xxx')}
      />
      <PricingCard
        title="Enterprise"
        price="€99"
        features={["Unlimited AI systems", "Priority support", "Custom integrations"]}
        onSubscribe={() => handleSubscribe('price_yyy')}
      />
    </div>
  );
}
```

6. **Setup Webhook in Stripe Dashboard:**
- Go to: Developers > Webhooks > Add endpoint
- URL: `https://api.complior.eu/webhooks/stripe`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

7. **Testing:**
```bash
# Use Stripe test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002

# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

**Acceptance Criteria:**
- [ ] Stripe test account created
- [ ] Products и prices созданы
- [ ] Checkout flow работает (test mode)
- [ ] Webhook handler deployed
- [ ] Webhook events обрабатываются корректно
- [ ] Subscription status обновляется в database

---

### Day 13: End-to-End Testing & QA

**Цели:**
- Прогнать full E2E test suite
- Manual QA testing
- Fix critical bugs

**Задачи:**

1. **E2E Test Scenarios:**

**Test 1: User Registration & Onboarding**
```
1. Go to https://app.complior.eu
2. Click "Sign Up"
3. Enter email + password
4. Verify email (check Brevo logs)
5. Complete profile
6. See dashboard
✅ Expected: User created, redirected to dashboard
```

**Test 2: AI System Creation**
```
1. Login
2. Click "Add AI System"
3. Fill form: name, description, risk level
4. Submit
5. See AI system in list
✅ Expected: AI system created, visible in database
```

**Test 3: Risk Assessment**
```
1. Open AI system
2. Click "Start Assessment"
3. Answer questionnaire (using Mistral AI)
4. Generate compliance report
5. Download PDF
✅ Expected: Assessment completed, PDF downloaded
```

**Test 4: Subscription Flow**
```
1. Go to /pricing
2. Click "Subscribe" (test mode)
3. Enter test card: 4242 4242 4242 4242
4. Complete checkout
5. Redirected to dashboard
6. Check subscription status = "active"
✅ Expected: Subscription active, stripe_customer_id set
```

**Test 5: GDPR Data Export**
```
1. Go to Settings > Privacy
2. Click "Export Data"
3. Download JSON
4. Verify: contains all user data
✅ Expected: JSON file with complete data
```

**Test 6: Account Deletion**
```
1. Settings > Privacy
2. Click "Delete Account"
3. Confirm
4. Logged out
5. Check database: user.deleted_at IS NOT NULL
✅ Expected: Account soft-deleted
```

2. **Performance Testing:**
```
✅ Homepage load time: < 2s
✅ Dashboard load time: < 1s
✅ API response time (p95): < 500ms
✅ Database query time: < 100ms
✅ Lighthouse score: > 90
```

3. **Security Testing:**
```
✅ SQL injection: Try malicious inputs → should fail validation
✅ XSS: Try <script> in inputs → should be escaped
✅ CSRF: Missing CSRF token → should reject
✅ Auth: Access /api/ai-systems without token → 401
✅ Rate limiting: 100 requests in 1 min → 429
```

4. **Browser Compatibility:**
```
✅ Chrome (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Edge (latest)
✅ Mobile: iOS Safari, Chrome Android
```

5. **Bug Tracking:**
```markdown
Create a file: /home/complior/PROJECT/docs/sprint-006-production/BUGS.md

# Sprint 6 Bugs

## Critical (P0) - Блокируют launch
- [ ] #001: ...

## High (P1) - Должны быть исправлены до launch
- [ ] #002: ...

## Medium (P2) - Можно исправить после launch
- [ ] #003: ...

## Low (P3) - Nice to have
- [ ] #004: ...
```

6. **Manual QA Checklist:**
```
Functional:
- [ ] Registration works
- [ ] Login works
- [ ] Password reset works (Kratos email)
- [ ] AI system CRUD operations work
- [ ] Risk assessment flow works
- [ ] Mistral AI integration works
- [ ] Stripe checkout works (test mode)
- [ ] Webhook processing works
- [ ] Data export works
- [ ] Account deletion works

UI/UX:
- [ ] Mobile responsive
- [ ] Loading states present
- [ ] Error messages clear
- [ ] Form validation works
- [ ] No console errors

Security:
- [ ] HTTPS everywhere
- [ ] Security headers present
- [ ] No sensitive data in client
- [ ] Rate limiting works

Compliance:
- [ ] Privacy Policy accessible
- [ ] Terms of Service accessible
- [ ] Cookie notice (if needed)
- [ ] GDPR rights available

Monitoring:
- [ ] Sentry receiving errors
- [ ] Better Uptime shows green
- [ ] Plausible tracking pageviews
- [ ] Logs being written
```

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] 0 critical (P0) bugs
- [ ] < 3 high (P1) bugs
- [ ] Manual QA checklist 100% complete

---

### Day 14: GO-LIVE

**Цели:**
- Final production deployment
- DNS cutover
- Post-launch monitoring
- Announce launch

**Задачи:**

1. **Pre-Launch Checklist:**
```
Infrastructure:
✅ All containers running
✅ SSL certificates valid
✅ Backups working (test restore)
✅ Monitoring active

Security:
✅ Firewall enabled
✅ Security headers set
✅ Secrets not in git
✅ npm audit clean

Compliance:
✅ Privacy Policy published
✅ Terms of Service published
✅ GDPR features working

Payments:
✅ Stripe test mode working
✅ Webhook processing confirmed

Testing:
✅ E2E tests passed
✅ Load test passed
✅ Manual QA complete
```

2. **Final Deployment:**
```bash
# On production server as user complior
cd /home/complior/PROJECT

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Install dependencies
cd server && npm ci --production
cd ../frontend && npm ci --production

# Build frontend
npm run build

# Run migrations
cd ../server
npm run migrate:production

# Restart containers
cd ..
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d --build

# Check all services healthy
docker compose -f docker-compose.production.yml ps

# Check logs
docker compose -f docker-compose.production.yml logs -f --tail=50
```

3. **Smoke Tests After Deployment:**
```bash
# Check all endpoints
curl -I https://app.complior.eu
curl -I https://api.complior.eu/health
curl -I https://auth.complior.eu/health/ready

# Expected: All return 200 OK

# Check SSL
openssl s_client -connect app.complior.eu:443 -servername app.complior.eu < /dev/null

# Check monitoring
# - Better Uptime: all green
# - Sentry: no new errors
```

4. **DNS Final Configuration:**
```
Cloudflare DNS:
- complior.eu → IP (Proxied ☁️)
- www.complior.eu → IP (Proxied ☁️)
- app.complior.eu → IP (Proxied ☁️)
- api.complior.eu → IP (Proxied ☁️)
- auth.complior.eu → IP (Proxied ☁️)

SSL/TLS: Full (strict)
Always Use HTTPS: On
```

5. **Post-Launch Monitoring (First 24 Hours):**
```
Hour 1:
- [ ] Check Better Uptime: all green
- [ ] Check Sentry: no errors
- [ ] Check logs: no anomalies
- [ ] Test user registration
- [ ] Test AI system creation

Hour 4:
- [ ] Check resource usage: CPU, RAM, Disk
- [ ] Check database connections
- [ ] Review Plausible: traffic coming in?

Hour 12:
- [ ] Check backups ran successfully
- [ ] Review error logs
- [ ] Check Stripe test transactions

Hour 24:
- [ ] Full system health check
- [ ] Review all metrics
- [ ] Plan Stripe live mode switch
```

6. **Incident Response Plan:**
```markdown
Create: /home/complior/PROJECT/docs/sprint-006-production/INCIDENT_RESPONSE.md

# Incident Response Runbook

## Severity Levels

**P0 (Critical):** Service down, data loss
- Response time: Immediate
- Action: Page on-call engineer

**P1 (High):** Major feature broken
- Response time: < 1 hour
- Action: Notify team, start investigation

**P2 (Medium):** Minor issue
- Response time: < 4 hours
- Action: Create ticket, fix in next deploy

**P3 (Low):** Cosmetic issue
- Response time: Next sprint
- Action: Add to backlog

## Common Issues

### Service Not Responding
```bash
# Check containers
docker compose -f docker-compose.production.yml ps

# Restart specific service
docker compose -f docker-compose.production.yml restart backend

# Check logs
docker compose -f docker-compose.production.yml logs backend --tail=100
```

### Database Connection Issues
```bash
# Check PostgreSQL
docker exec complior_postgres pg_isready

# Check connections
docker exec complior_postgres psql -U complior -d complior_production -c "SELECT count(*) FROM pg_stat_activity;"

# Restart PostgreSQL
docker compose -f docker-compose.production.yml restart postgres
```

### SSL Certificate Expiry
```bash
# Check expiry
sudo certbot certificates

# Renew
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Rollback Procedure
```bash
cd /home/complior/PROJECT

# Checkout previous version
git log --oneline -n 10
git checkout <previous-commit-sha>

# Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build

# Restore database if needed
gunzip -c backups/complior_production_YYYYMMDD.sql.gz | \
  docker exec -i complior_postgres psql -U complior -d complior_production
```
```

7. **Communication Plan:**
```
Internal:
- [ ] Team: "Launch complete ✅"
- [ ] Document lessons learned

External (if applicable):
- [ ] Social media: Launch announcement
- [ ] Email list: "Complior is now live!"
- [ ] Update website: Remove "Coming Soon"
```

**Acceptance Criteria:**
- [ ] Production deployment successful
- [ ] All smoke tests pass
- [ ] Monitoring shows healthy system
- [ ] 0 critical errors in first hour
- [ ] Team notified of launch

---

## Post-Launch (Week 2-3)

### Stripe Live Mode Switch

**Prerequisites:**
- [ ] Business verification completed on Stripe
- [ ] Test mode validated (>10 successful test transactions)
- [ ] All webhooks working in test mode
- [ ] Terms of Service include refund policy

**Steps:**
```bash
# 1. Get live mode API keys from Stripe Dashboard
# 2. Update .env.production
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (new signing secret for live mode)

# 3. Create live mode products in Stripe Dashboard
# (Same as test mode: Pro €29/month, Enterprise €99/month)

# 4. Update webhook endpoint to live mode
# Stripe Dashboard > Webhooks > Edit > Toggle to live mode

# 5. Update frontend with live priceIds
# frontend/app/(public)/pricing/page.tsx

# 6. Restart backend
docker compose -f docker-compose.production.yml restart backend

# 7. Test with real card (small amount)
# 8. Monitor first real transaction carefully
```

### Ongoing Tasks

**Daily:**
- Review Better Uptime alerts
- Check Sentry errors
- Review logs for anomalies
- Monitor resource usage

**Weekly:**
- Review Plausible analytics
- Check backup integrity (test restore)
- npm audit && update dependencies (if needed)
- Review Stripe transactions

**Monthly:**
- Security audit
- Performance review
- Cost optimization review
- Update documentation

---

## Cost Breakdown (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Hetzner Server | €50 | Existing server |
| Plausible Analytics | €9 | Up to 10K pageviews |
| **Subtotal** | **€59** | **Recurring** |
| Cloudflare | €0 | Free plan |
| Sentry | €0 | Free tier (<5K events) |
| Better Uptime | €0 | Free tier |
| Brevo Email | €0 | Free tier (300 emails/day) |
| Ory Kratos | €0 | Self-hosted |
| PostgreSQL | €0 | Self-hosted in Docker |
| Cloudflare R2 | €0 | Free tier (<10GB) |

**Total: ~€60/month** (well within €150-250 budget)

**Upgrade Path (если потребуется больше ресурсов):**
- Hetzner Managed PostgreSQL: +€32/month
- Better Uptime Pro: +€29/month (SLA monitoring)
- Sentry Team: +$29/month (если > 5K errors)
- Larger server: +€20-50/month

---

## Success Criteria

**Technical:**
- ✅ 99% uptime SLA achieved (< 7.2h downtime/month)
- ✅ Response time p95 < 500ms
- ✅ 0 critical security vulnerabilities
- ✅ All monitoring green

**Business:**
- ✅ Platform live and accessible
- ✅ Payment processing working (Stripe test mode)
- ✅ Ready to accept first customers
- ✅ GDPR compliant

**Compliance:**
- ✅ EU data residency
- ✅ GDPR features implemented
- ✅ Privacy Policy & ToS published
- ✅ Security best practices followed

---

## Next Steps (Post-Launch)

### Sprint 7 (Future)
- Switch Stripe to live mode
- Add more AI Act templates
- Implement team collaboration features
- Add SSO (SAML) for enterprise customers
- Migrate to Hetzner Managed PostgreSQL (if load increases)
- Add multi-language support (EN, DE, FR)

### Marketing & Growth
- SEO optimization
- Content marketing (blog about AI Act)
- Partnerships with AI vendors
- Webinars on EU AI Act compliance

---

## Rollback Plan

If critical issues occur during launch:

**Immediate Actions:**
1. Notify team in Slack/Discord
2. Assess severity (use incident response severity levels)
3. If P0 (critical): Execute rollback immediately

**Rollback Steps:**
```bash
# 1. Checkout previous stable version
cd /home/complior/PROJECT
git log --oneline -n 10
git checkout <last-stable-commit>

# 2. Rebuild containers
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d --build

# 3. Restore database if needed (if migrations broke something)
gunzip -c backups/complior_production_<timestamp>.sql.gz | \
  docker exec -i complior_postgres psql -U complior -d complior_production

# 4. Verify rollback
curl -I https://app.complior.eu
docker compose logs -f --tail=50

# 5. Update status page / notify users
```

**Post-Rollback:**
1. Document what went wrong
2. Create postmortem document
3. Fix issue in development
4. Re-test thoroughly
5. Schedule new deployment

---

## Support Contacts

**Infrastructure:**
- Hetzner Support: https://accounts.hetzner.com/support
- Cloudflare Support: https://dash.cloudflare.com/support

**Services:**
- Stripe Support: https://support.stripe.com
- Sentry Support: https://sentry.io/support
- Ory Kratos: https://github.com/ory/kratos/discussions

**Emergency:**
- Server access: root user / complior user
- Secrets backup: /home/complior/.secrets-backup/ (encrypted)

---

## Conclusion

This plan provides a comprehensive 14-day production deployment roadmap for Complior (EU AI Act Compliance Platform) with:

- **Aggressive but achievable timeline:** 2 weeks
- **Cost-effective:** €60/month (existing infrastructure)
- **EU compliant:** GDPR, NIS2, data residency
- **Secure:** OWASP Top 10, SSL, monitoring
- **Scalable:** Clear upgrade path when needed

The plan prioritizes the critical path: security → infrastructure → monitoring → testing → launch, while respecting all 7 user-specified requirements.

**Ready to execute Sprint 6? Let's build!** 🚀
