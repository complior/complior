# SPRINT-BACKLOG.md — AI Act Compliance Platform

**Версия:** 1.0.0
**Дата:** 2026-02-07
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ✅ Утверждён Product Owner (2026-02-07)
**Зависимости:** PRODUCT-BACKLOG.md ✅ (Feature 01)

---

## Как читать этот документ

**Sprint Backlog** — это КАК реализуется конкретная фича (User Stories, Acceptance Criteria).

| | Product Backlog | Sprint Backlog (этот документ) |
|--|-----------------|-------------------------------|
| **Уровень** | Фичи / Эпики | User Stories |
| **Вопрос** | ЧТО делает продукт? | КАК это реализовать? |
| **Формат** | Feature-NN | US-NNN → Feature-NN |

### Story Points

| SP | Объём | Пример |
|----|-------|--------|
| **1-2** | Несколько часов, 1-2 файла | Конфиг, подключение плагина |
| **3** | Полдня-день, 3-5 файлов | Error handling, CI pipeline |
| **5** | 1-2 дня, 5-10 файлов | Fastify сервер, Docker Compose |
| **8** | 2-3 дня, 10+ файлов | Все MetaSQL-схемы, дизайн-система |

---

## Sprint 0 — Infrastructure & Project Setup

**Фича:** Feature 01 (PRODUCT-BACKLOG.md)
**Длительность:** 2 недели (2026-02-10 → 2026-02-21)
**Цель спринта:** Рабочая среда разработки — monorepo, Fastify backend, все 21 таблица, Docker Compose с Ory + Gotenberg, CI/CD, Next.js skeleton

### Capacity

| Разработчик | Роль | SP |
|-------------|------|----|
| Max | Backend + QA | ~28 SP |
| Nina | Frontend + UX | ~16 SP |
| **Итого** | | **~44 SP** |

---

## US-001: Monorepo structure + Fastify backend

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want a monorepo with working Fastify server based on existing-code patterns, so that I can start building API endpoints immediately.

### Acceptance Criteria

- [ ] Monorepo root: `package.json` с workspaces (`src/`, `frontend/`)
- [ ] Скопированы core-файлы из existing-code:
  - `main.js`, `src/http.js`, `src/ws.js`, `src/loader.js` (NodeJS-Fastify)
  - `lib/db.js` (CRUD builder)
  - `schemas/.database.js`, `schemas/.types.js` (MetaSQL config)
  - `config/database.js`, `config/server.js`, `config/log.js`
  - `setup.js` (initialization)
- [ ] Адаптирован Module Structure из ARCHITECTURE.md §5:
  ```
  src/
  ├── domain/           # пустые директории с .gitkeep
  ├── application/
  ├── schemas/
  ├── api/
  ├── infrastructure/
  ├── config/
  ├── lib/
  └── setup.js
  ```
- [ ] `GET /health` → `{ status: "ok", timestamp, version }` (200)
- [ ] ESLint + Prettier конфигурация (из existing-code `.eslintrc.json`, `.prettierrc`)
- [ ] `tsconfig.json` (TypeScript strict для frontend, JSDoc для backend)
- [ ] `.gitignore`, `.env.example`
- [ ] `npm start` → сервер стартует на порту 8000
- [ ] Pino structured logging (config/log.js)

### Зависимости
Нет (первая US)

### Тесты
- `npm start` → сервер стартует без ошибок
- `curl localhost:8000/health` → 200 JSON
- `npm run lint` → 0 ошибок

---

## US-002: MetaSQL schemas — all 21 tables + seeds

**Feature:** 01 | **SP:** 8 | **Разработчик:** Max

### Описание
As a developer, I want all database schemas defined in MetaSQL format with seed data, so that the full DB structure is ready from day one.

### Acceptance Criteria

- [ ] **IAM Context** (5 таблиц):
  - `schemas/Organization.js` — Registry, fields per DATABASE.md §4.1
  - `schemas/User.js` — Registry, `oryId` (string, unique), NO password field
  - `schemas/Role.js` — Entity, name unique
  - `schemas/Permission.js` — Entity, roleId FK, resource, action
  - `schemas/UserRole.js` — junction (many-to-many User↔Role)
- [ ] **Classification Context** (5 таблиц):
  - `schemas/AISystem.js` — Registry, organizationId FK, riskLevel, complianceStatus
  - `schemas/RiskClassification.js` — Entity, aiSystemId FK, ruleResult (jsonb), llmResult (jsonb)
  - `schemas/Requirement.js` — Entity, code unique, articleReference
  - `schemas/SystemRequirement.js` — Entity, aiSystemId FK, requirementId FK, status, progress
  - `schemas/ClassificationLog.js` — Entity, classificationId FK, history tracking
- [ ] **Compliance Context** (3 таблицы):
  - `schemas/ComplianceDocument.js` — Entity, aiSystemId FK, documentType, version, status
  - `schemas/DocumentSection.js` — Details, documentId FK, content (jsonb)
  - `schemas/ChecklistItem.js` — Entity, aiSystemId FK, requirementId FK, completed
- [ ] **Consultation Context** (2 таблицы):
  - `schemas/Conversation.js` — Registry, userId FK, aiSystemId FK (optional)
  - `schemas/ChatMessage.js` — Entity, conversationId FK, role, content (jsonb), toolCalls (jsonb)
- [ ] **Monitoring Context** (3 таблицы):
  - `schemas/RegulatoryUpdate.js` — Entity, source, url, publishedAt
  - `schemas/ImpactAssessment.js` — Entity, updateId FK, aiSystemId FK, impactLevel
  - `schemas/Notification.js` — Entity, userId FK, type, title, read (boolean)
- [ ] **Billing Context** (2 таблицы):
  - `schemas/Subscription.js` — Entity, organizationId FK, planId FK, stripeSubscriptionId
  - `schemas/Plan.js` — Entity, name unique, priceMonthly, maxSystems, maxUsers, features (jsonb)
- [ ] **Cross-cutting** (1 таблица):
  - `schemas/AuditLog.js` — Entity, userId FK, action, resource, oldData (jsonb), newData (jsonb), ip (inet)
- [ ] `.types.js` обновлён: riskLevel, complianceStatus custom types
- [ ] Seed data:
  - 2 роли: Owner, Member
  - Permissions matrix (Owner: all, Member: read + limited write)
  - 5 планов: Free, Starter (€49), Growth (€149), Scale (€399), Enterprise
  - AI Act requirements (Art. 5, 9-15, 17, 26-27, 43, 47-51, 72) — минимум 20 записей
- [ ] `npm run db:generate` → SQL DDL без ошибок
- [ ] `npm run db:seed` → seed data загружена

### Зависимости
US-001 (project structure)

### Тесты
- MetaSQL → SQL генерация без ошибок
- Все 21 таблица создаются в PostgreSQL
- Seeds вставляются без конфликтов
- Foreign keys валидны

---

## US-003: Docker Compose dev environment

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want `docker compose up` to start the complete dev environment with all services, so that I can begin development without manual setup.

### Acceptance Criteria

- [ ] `docker-compose.yml` с сервисами:
  | Сервис | Image | Порт | Описание |
  |--------|-------|------|----------|
  | `app` | Node.js 20 | 8000 | Fastify backend (hot reload) |
  | `postgres` | PostgreSQL 16 | 5432 | БД с автоинициализацией |
  | `ory` | Ory Kratos | 4433/4434 | Identity + sessions |
  | `gotenberg` | gotenberg/gotenberg:8 | 3000 | HTML→PDF |
- [ ] Ory Kratos конфигурация:
  - `ory/kratos.yml` — identity schema, self-service flows
  - `ory/identity.schema.json` — email + name fields
  - Code method (magic link) включён
  - Webhook: `after registration` → `POST http://app:8000/api/auth/webhook`
  - Courier (email) → Brevo SMTP (настраивается через `.env`)
- [ ] Volumes:
  - `postgres-data` — персистентность данных
  - `./src` → `/app/src` (hot reload backend)
  - `./ory` → Ory конфигурация
- [ ] `.env.example` со всеми переменными:
  ```
  # App
  PORT=8000
  NODE_ENV=development

  # Database
  DATABASE_URL=postgres://postgres:postgres@postgres:5432/aiact

  # Ory
  ORY_SDK_URL=http://ory:4433
  ORY_ADMIN_URL=http://ory:4434
  ORY_WEBHOOK_SECRET=dev-webhook-secret

  # Brevo
  BREVO_API_KEY=
  BREVO_SMTP_HOST=smtp-relay.brevo.com
  BREVO_SMTP_PORT=587

  # Gotenberg
  GOTENBERG_URL=http://gotenberg:3000

  # Hetzner S3
  S3_ENDPOINT=https://fsn1.your-objectstorage.com
  S3_BUCKET=compliance-docs
  S3_ACCESS_KEY=
  S3_SECRET_KEY=
  S3_REGION=fsn1

  # Sentry
  SENTRY_DSN=
  ```
- [ ] `docker compose up` → все сервисы стартуют за < 60 секунд
- [ ] БД инициализируется автоматически (schemas + seeds)
- [ ] Healthcheck для каждого сервиса

### Зависимости
US-001, US-002 (schemas для DB init)

### Тесты
- `docker compose up -d` → все сервисы healthy
- `curl localhost:8000/health` → 200
- `curl localhost:4433/health/ready` → Ory ready
- `curl localhost:3000/health` → Gotenberg ready
- PostgreSQL: `\dt` → 21 таблиц

---

## US-004: Infrastructure clients

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want initialized infrastructure clients for Ory, Brevo, Gotenberg and Hetzner S3, so that Sprint 1+ features can use them immediately.

### Acceptance Criteria

- [ ] `infrastructure/auth/ory-client.js`:
  - Ory SDK инициализация (`@ory/client`)
  - `verifySession(sessionToken)` → identity object или throw AuthError
  - `getIdentity(identityId)` → identity data
  - Config из `config/ory.js` (ORY_SDK_URL, ORY_ADMIN_URL)
- [ ] `infrastructure/email/brevo-client.js`:
  - Brevo SDK инициализация (`@getbrevo/brevo` или HTTP API)
  - `sendTransactional({ to, templateId, params })` → send result
  - Config из `config/brevo.js` (BREVO_API_KEY)
- [ ] `infrastructure/pdf/gotenberg-client.js`:
  - HTTP client (fetch/undici)
  - `convertHtmlToPdf(html)` → PDF Buffer
  - `POST ${GOTENBERG_URL}/forms/chromium/convert/html`
  - Config из `config/gotenberg.js` (GOTENBERG_URL)
- [ ] `infrastructure/storage/s3-client.js`:
  - AWS SDK v3 (`@aws-sdk/client-s3`)
  - `upload(key, buffer, contentType)` → S3 URL
  - `download(key)` → Buffer
  - `getSignedUrl(key, expiresIn)` → presigned URL
  - Config из `config/s3.js` (S3_ENDPOINT, S3_BUCKET, credentials)
- [ ] Каждый client:
  - Логирует ошибки через pino
  - Бросает типизированные ошибки (AuthError, EmailError, StorageError)
  - Connection timeout: 10s, request timeout: 30s
- [ ] Config-файлы: `config/ory.js`, `config/brevo.js`, `config/gotenberg.js`, `config/s3.js`
- [ ] Unit tests: инициализация без ошибок, config validation

### Зависимости
US-001 (project structure), US-003 (Docker Compose для локального тестирования)

### Тесты
- Каждый client import без ошибок
- Config validation: missing env → понятная ошибка
- Ory: `verifySession()` с невалидным token → AuthError
- Gotenberg: `convertHtmlToPdf('<h1>Test</h1>')` → PDF Buffer (integration test)
- S3: upload + download roundtrip (integration test)

---

## US-005: Error handling, logging, CI/CD, rate limiting

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want standardized error handling, CI pipeline and rate limiting, so that the codebase has a quality baseline from day one.

### Acceptance Criteria

**Error handling (`lib/errors.js`):**
- [ ] AppError base class (statusCode, code, message, details)
- [ ] Подклассы:
  | Error | Status | Code | Когда |
  |-------|--------|------|-------|
  | ValidationError | 400 | VALIDATION_ERROR | Невалидный input |
  | AuthError | 401 | AUTH_ERROR | Нет сессии / невалидная |
  | ForbiddenError | 403 | FORBIDDEN | Нет прав |
  | NotFoundError | 404 | NOT_FOUND | Ресурс не найден |
  | ConflictError | 409 | CONFLICT | Дупликат (unique constraint) |
  | RateLimitError | 429 | RATE_LIMIT | Превышен лимит |
- [ ] Fastify error handler: AppError → JSON `{ error: { code, message, details } }`
- [ ] Неизвестные ошибки → 500, логируются в Sentry, клиенту `INTERNAL_ERROR`

**Logging:**
- [ ] Pino structured logging (уже в US-001, здесь — настройка уровней)
- [ ] Request ID (`X-Request-Id`) — генерация + propagation
- [ ] Формат: `{ level, time, reqId, msg, ...context }`

**CI/CD (`.github/workflows/ci.yml`):**
- [ ] Триггер: push/PR на `develop` и `main`
- [ ] Jobs: lint → type-check → test → `npm audit --audit-level=high`
- [ ] Node.js 20, PostgreSQL service container
- [ ] Cache: `node_modules`
- [ ] Status badge в README

**Startup .env validation:**
- [ ] `config/validate.js` — при старте проверяет все required env vars
- [ ] Missing env → понятная ошибка с именем переменной и подсказкой
- [ ] Вызывается в `setup.js` до инициализации сервисов

**Rate limiting:**
- [ ] `@fastify/rate-limit` подключён в `src/http.js`
- [ ] Global: 100 req/min per IP
- [ ] Config per route (подготовить hook pattern для Sprint 1+):
  ```javascript
  // api/auth/webhook.js — пример будущего использования
  // handler config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  ```

### Зависимости
US-001 (Fastify server)

### Тесты
- `throw new ValidationError('bad input', { field: 'email' })` → 400 JSON
- `throw new AppError()` → 500, Sentry уведомлён (mock)
- Request ID проброшен в логах
- Rate limit: 101-й запрос → 429
- `npm run lint` → CI проходит
- `npm test` → CI проходит

---

## US-006: Frontend Next.js skeleton + design system

**Feature:** 01 | **SP:** 8 | **Разработчик:** Nina

### Описание
As a user, I want a working frontend application with consistent design system, so that Sprint 1 features can be built on a solid UI foundation.

### Acceptance Criteria

**Next.js setup:**
- [ ] Next.js 14 App Router + TypeScript strict
- [ ] `frontend/` workspace в monorepo
- [ ] `npm run dev` → frontend на порту 3001 (proxy API → 8000)
- [ ] Layout: `<Header>` (логотип, navigation placeholder) + `<main>` + `<Footer>`
- [ ] `/health` → page с статусом backend API
- [ ] `next.config.js` — rewrites для API proxy

**TailwindCSS + shadcn/ui:**
- [ ] TailwindCSS 3 настроен с custom theme
- [ ] shadcn/ui инициализирован (`npx shadcn-ui@latest init`)
- [ ] Design tokens в `tailwind.config.ts`:
  ```
  colors: primary (blue-600), secondary (slate),
  risk: { prohibited: red-600, high: orange-500, gpai: blue-500, limited: yellow-500, minimal: green-500 }
  ```
- [ ] Typography: Inter (основной), JetBrains Mono (code)
- [ ] Spacing: 4px grid

**Базовые компоненты (shadcn/ui customized):**
- [ ] Button (primary, secondary, destructive, ghost, link)
- [ ] Input + Label
- [ ] Card (header, content, footer)
- [ ] Badge (default + 5 risk level вариантов)
- [ ] Dialog / AlertDialog
- [ ] Table (header, row, cell)
- [ ] Skeleton (loading state)
- [ ] Toast (success, error, warning, info)

**Responsive:**
- [ ] Mobile-first: xs(0) → sm(640) → md(768) → lg(1024) → xl(1280)
- [ ] Sidebar layout (desktop) → bottom nav (mobile) — структура, без content

**Pages:**
- [ ] `/` → redirect to `/dashboard` (placeholder)
- [ ] `/dashboard` → placeholder page "Dashboard — Sprint 3"
- [ ] `/404` → custom 404 page
- [ ] `/error` → error boundary fallback

### Зависимости
US-001 (monorepo structure)

### Тесты
- `npm run dev` (frontend) → стартует на 3001
- `npm run build` → build без ошибок
- `npm run lint` → 0 ошибок
- Responsive: mobile (375px) и desktop (1280px) — layout не ломается
- Risk level badges: все 5 цветов отображаются

---

## US-007: Monitoring + Analytics integration

**Feature:** 01 | **SP:** 3 | **Разработчик:** Nina

### Описание
As a product owner, I want analytics and monitoring from day one, so that I can track usage and uptime when we launch.

### Acceptance Criteria

**Plausible Analytics:**
- [ ] `<Script>` тег Plausible в `frontend/app/layout.tsx`
- [ ] Конфигурируется через `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env
- [ ] Не загружается в development (`NODE_ENV !== 'production'`)
- [ ] Без cookies, GDPR-safe — нет cookie banner

**Better Uptime:**
- [ ] Backend `/health` endpoint отдаёт:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-02-10T12:00:00Z",
    "version": "0.1.0",
    "services": {
      "database": "ok",
      "ory": "ok",
      "gotenberg": "ok"
    }
  }
  ```
- [ ] Каждый сервис проверяется (connection alive), timeout 5s
- [ ] Документация: как настроить Better Uptime monitor (URL + check interval)

**Sentry:**
- [ ] Frontend: `@sentry/nextjs` инициализация
- [ ] Backend: `@sentry/node` инициализация
- [ ] Source maps upload в CI/CD
- [ ] `SENTRY_DSN` из .env
- [ ] Error boundary в frontend → отправляет в Sentry

### Зависимости
US-001 (backend /health), US-006 (frontend layout)

### Тесты
- `/health` → 200 с service statuses
- Плаусибле скрипт: не рендерится в dev mode, рендерится в prod
- Sentry: ошибка в frontend → перехвачена error boundary

---

## US-008: UX wireframes для Sprint 1

**Feature:** 01 (prep) | **SP:** 5 | **Разработчик:** Nina

### Описание
As a designer, I want wireframes for Sprint 1 pages (login, register, registry), so that frontend development in Sprint 1 starts with clear visual specs.

### Acceptance Criteria

- [ ] Wireframe: **Login page** (Ory magic link flow)
  - Email input → "Отправить magic link" button
  - Status: "Проверьте email" → redirect после верификации
  - Link: "Нет аккаунта? Зарегистрироваться"
- [ ] Wireframe: **Register page** (Ory registration)
  - Fields: email, fullName, companyName, industry (select), country (select)
  - Submit → Ory → magic link email → verify → redirect
  - GDPR consent checkbox
- [ ] Wireframe: **Dashboard** (placeholder layout)
  - Header: logo, nav (Dashboard, Registry, Documents, Eva, Settings)
  - Sidebar: organization switcher (future)
  - Main: widget grid (risk distribution, compliance score, attention items, timeline)
- [ ] Wireframe: **AI System Registry** (Feature 03 prep)
  - Table: name, role badge, risk level badge, status, compliance %, deadline, actions
  - Filters bar, search, "Add System" button
- [ ] Wireframes в формате: Markdown с ASCII layout или Figma/Excalidraw export
- [ ] Файл: `docs/wireframes/sprint-1-wireframes.md`

### Зависимости
US-006 (design system tokens)

### Тесты
- Wireframes покрывают все экраны Sprint 1
- Используют design tokens из US-006 (цвета risk levels, типографика)
- Responsive: показан mobile и desktop вариант

---

## Sprint 0 Summary

### Story Map

```
Feature 01: Инфраструктура и настройка проекта
│
├── Backend (Max)
│   ├── US-001: Monorepo + Fastify (5 SP)
│   ├── US-002: MetaSQL schemas 21 таблиц (8 SP) ← зависит от US-001
│   ├── US-003: Docker Compose (5 SP) ← зависит от US-001, US-002
│   ├── US-004: Infrastructure clients (5 SP) ← зависит от US-001, US-003
│   └── US-005: Errors, CI, rate-limit (5 SP) ← зависит от US-001
│
└── Frontend (Nina)
    ├── US-006: Next.js + design system (8 SP) ← зависит от US-001
    ├── US-007: Monitoring + analytics (3 SP) ← зависит от US-001, US-006
    └── US-008: Wireframes Sprint 1 (5 SP) ← зависит от US-006
```

### Dependency Graph

```
US-001 (Monorepo + Fastify)
  ├──→ US-002 (Schemas)
  │      └──→ US-003 (Docker Compose)
  │             └──→ US-004 (Infra clients)
  ├──→ US-005 (Errors, CI, rate-limit)
  └──→ US-006 (Next.js + design system)
         ├──→ US-007 (Monitoring)
         └──→ US-008 (Wireframes)
```

### Sprint Totals

| Разработчик | Stories | SP | Фокус |
|-------------|---------|-----|-------|
| Max | US-001..005 | 28 | Backend infrastructure, DB, Docker, CI |
| Nina | US-006..008 | 16 | Frontend skeleton, design system, wireframes |
| **Итого** | **8 US** | **44 SP** | |

### Definition of Done (Sprint 0)

- [ ] `docker compose up` → все сервисы стартуют и healthy
- [ ] 21 таблица в PostgreSQL, seed data загружена
- [ ] Backend: `curl /health` → 200 с service statuses
- [ ] Frontend: `npm run build` → без ошибок
- [ ] CI pipeline: lint + type-check + test → green
- [ ] Все infrastructure clients инициализируются без ошибок
- [ ] Rate limiting работает (> 100 req/min → 429)
- [ ] Wireframes для Sprint 1 готовы

---

## Sprint 1 Preview (Feature 02: IAM)

> Подробный Sprint 1 Backlog будет создан на Sprint Planning после завершения Sprint 0.

**Ожидаемые User Stories:**
- US-009: Ory webhook → User + Organization sync
- US-010: Login page (Ory magic link flow)
- US-011: Register page (Ory registration + webhook)
- US-012: RBAC — Permission checks в API handlers (explicit, no middleware)
- US-013: Multi-tenancy isolation (organizationId filter)
- US-014: AuditLog — auth events

**Ключевой паттерн (CODING-STANDARDS.md):** Нет middleware. Каждый handler явно проверяет сессию:
```javascript
handler: async ({ params, body, session }) => {
  // 1. Ory session → User lookup
  const user = await db.User.query(
    'SELECT * FROM "User" WHERE "oryId" = $1',
    [session.identity.id]
  );
  // 2. Permission check — explicit call
  await checkPermission(user, 'systems', 'read');
  // 3. Multi-tenancy — explicit filter
  const systems = await db.AISystem.query(
    'SELECT * FROM "AISystem" WHERE "organizationId" = $1',
    [user.organizationId]
  );
  return systems;
}
```

---

✅ **APPROVED:** Sprint 0 Backlog утверждён Product Owner (2026-02-07).

💡 **Следующий шаг:** Max начинает с US-001, Nina с US-006 (параллельно после создания monorepo structure).
