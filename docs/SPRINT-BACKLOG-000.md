# SPRINT-BACKLOG-000 — Infrastructure & Project Setup

**Версия:** 2.0.0
**Дата:** 2026-02-07
**Статус:** ✅ Утверждено PO (2026-02-10). Done (merged to main, PR #2, #3)
**Фича:** Feature 01 (PRODUCT-BACKLOG.md)
**Длительность:** 2 недели (2026-02-10 → 2026-02-21)
**Цель спринта:** Рабочая среда разработки — monorepo, Fastify backend, все 29 таблиц (deployer-first), Docker Compose с Ory + Gotenberg, CI/CD, Next.js skeleton, deployer wireframes

---

## Capacity

| Разработчик | Роль | SP |
|-------------|------|----|
| Max | Backend + QA | ~30 SP |
| Nina | Frontend + UX | ~17 SP |
| **Итого** | | **~47 SP** |

---

## US-001: Monorepo structure + Fastify backend

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want a monorepo with working Fastify server based on existing-code patterns, so that I can start building API endpoints immediately.

### Acceptance Criteria

- [x] Monorepo root: `package.json` с workspaces (`src/`, `frontend/`)
- [x] Скопированы core-файлы из existing-code:
  - `main.js`, `src/http.js`, `src/ws.js`, `src/loader.js` (NodeJS-Fastify)
  - `lib/db.js` (CRUD builder) — **fix known bugs при копировании:**
    - `delete()` template string bug (backticks fix, см. ARCHITECTURE.md §8)
    - Add basic transaction support (`db.transaction(async (tx) => {...})`)
  - `schemas/.database.js`, `schemas/.types.js` (MetaSQL config)
  - `config/database.js`, `config/server.js`, `config/log.js`
  - `setup.js` (initialization)
- [x] Адаптирован Module Structure из ARCHITECTURE.md §5:
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
- [x] `GET /health` → `{ status: "ok", timestamp, version }` (200)
- [x] ESLint + Prettier конфигурация (из existing-code `.eslintrc.json`, `.prettierrc`)
- [x] `tsconfig.json` (TypeScript strict для frontend, JSDoc для backend)
- [x] `.gitignore`, `.env.example`
- [x] `npm start` → сервер стартует на порту 8000
- [x] Pino structured logging (config/log.js)

### Зависимости
Нет (первая US)

### Тесты
- `npm start` → сервер стартует без ошибок
- `curl localhost:8000/health` → 200 JSON
- `npm run lint` → 0 ошибок

---

## US-002: MetaSQL schemas — all 29 tables + deployer seeds

**Feature:** 01 | **SP:** 10 | **Разработчик:** Max

### Описание
As a developer, I want all database schemas defined in MetaSQL format with deployer-first seed data, so that the full DB structure is ready from day one.

### Acceptance Criteria

- [x] **IAM Context** (5 таблиц):
  - `schemas/Organization.js` — Registry, fields per DATABASE.md §4.1
  - `schemas/User.js` — Registry, `oryId` (string, unique), NO password field
  - `schemas/Role.js` — Entity, name unique
  - `schemas/Permission.js` — Entity, roleId FK, resource, action
  - `schemas/UserRole.js` — junction (many-to-many User↔Role)
- [x] **Inventory Context** (3 таблицы, NEW):
  - `schemas/AITool.js` — Entity, organizationId FK, vendorName, riskLevel, complianceStatus
  - `schemas/AIToolCatalog.js` — Entity, name unique, vendor, category, defaultRiskLevel
  - `schemas/AIToolDiscovery.js` — Entity, organizationId FK, source (manual/csv_import/dns_scan/etc.)
- [x] **Classification Context** (4 таблицы):
  - `schemas/RiskClassification.js` — Entity, aiToolId FK, ruleResult (jsonb), llmResult (jsonb)
  - `schemas/Requirement.js` — Entity, code unique, articleReference (deployer: Art. 4, 26-27, 50)
  - `schemas/ToolRequirement.js` — Entity, aiToolId FK, requirementId FK, status, progress
  - `schemas/ClassificationLog.js` — Entity, classificationId FK, history tracking
- [x] **AI Literacy Context** (4 таблицы, NEW):
  - `schemas/TrainingCourse.js` — Entity, title, roleTarget, durationMinutes, language
  - `schemas/TrainingModule.js` — Details, courseId FK, contentMarkdown, quizQuestions (jsonb)
  - `schemas/LiteracyCompletion.js` — Entity, userId FK (optional), organizationId FK, employeeName/employeeEmail, courseId FK, score, certificateUrl
  - `schemas/LiteracyRequirement.js` — Entity, organizationId FK, roleTarget, requiredCourses, deadline
- [x] **Deployer Compliance Context** (5 таблиц):
  - `schemas/ComplianceDocument.js` — Entity, aiToolId FK, documentType
  - `schemas/DocumentSection.js` — Details, documentId FK, content (jsonb)
  - `schemas/ChecklistItem.js` — Entity, aiToolId FK, requirementId FK, completed
  - `schemas/FRIAAssessment.js` — Entity, aiToolId FK, status, affectedPersons (jsonb), risks (jsonb)
  - `schemas/FRIASection.js` — Details, friaId FK, sectionType, content (jsonb)
- [x] **Consultation Context** (2 таблицы):
  - `schemas/Conversation.js` — Registry, userId FK, aiToolId FK (optional)
  - `schemas/ChatMessage.js` — Entity, conversationId FK, role, content (jsonb), toolCalls (jsonb)
- [x] **Monitoring Context** (3 таблицы):
  - `schemas/RegulatoryUpdate.js` — Entity, source, url, publishedAt
  - `schemas/ImpactAssessment.js` — Entity, updateId FK, aiToolId FK, impactLevel
  - `schemas/Notification.js` — Entity, userId FK, type
- [x] **Billing Context** (2 таблицы):
  - `schemas/Subscription.js` — Entity, organizationId FK, planId FK, stripeSubscriptionId
  - `schemas/Plan.js` — Entity, name unique, priceMonthly, maxTools, maxUsers, maxEmployees, features (jsonb)
- [x] **Cross-cutting** (1 таблица):
  - `schemas/AuditLog.js` — Entity, userId FK, action, resource, oldData (jsonb), newData (jsonb), ip (inet)
- [x] `.types.js` обновлён: riskLevel, complianceStatus custom types
- [x] Seed data:
  - 2 роли: Owner, Member
  - Permissions matrix (Owner: all, Member: read + limited write)
  - 5 планов (deployer funnel): Free, Starter (€49), Growth (€149), Scale (€399), Enterprise
  - Deployer requirements (Art. 4, 5, 26-27, 50) — 35 записей
  - AI Tool Catalog — 225 AI-инструментов
  - 4 AI Literacy курса: CEO (30 мин), HR (45 мин), Developer (60 мин), General (20 мин)
- [x] `npm run db:generate` → SQL DDL без ошибок
- [x] `npm run db:seed` → seed data загружена

### Зависимости
US-001 (project structure)

### Тесты
- MetaSQL → SQL генерация без ошибок
- Все 29 таблиц создаются в PostgreSQL
- Seeds вставляются без конфликтов
- Foreign keys валидны

---

## US-003: Docker Compose dev environment

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want `docker compose up` to start the complete dev environment with all services, so that I can begin development without manual setup.

### Acceptance Criteria

- [x] `docker-compose.yml` с сервисами:
  | Сервис | Image | Порт | Описание |
  |--------|-------|------|----------|
  | `app` | Node.js 20 | 8000 | Fastify backend (hot reload) |
  | `postgres` | PostgreSQL 16 | 5432 | БД с автоинициализацией |
  | `ory` | Ory Kratos | 4433/4434 | Identity + sessions |
  | `gotenberg` | gotenberg/gotenberg:8 | 3000 | HTML→PDF |
- [x] Ory Kratos конфигурация:
  - `ory/kratos.yml` — identity schema, self-service flows
  - `ory/identity.schema.json` — email + name fields
  - Code method (magic link) включён
  - Webhook: `after registration` → `POST http://app:8000/api/auth/webhook`
  - Courier (email) → Brevo SMTP
- [x] Volumes: postgres-data, ./src → /app/src, ./ory → Ory config
- [x] `.env.example` со всеми переменными
- [x] `docker compose up` → все сервисы стартуют за < 60 секунд
- [x] БД инициализируется автоматически (schemas + seeds)
- [x] Healthcheck для каждого сервиса

### Зависимости
US-001, US-002

### Тесты
- `docker compose up -d` → все сервисы healthy
- `curl localhost:8000/health` → 200
- `curl localhost:4433/health/ready` → Ory ready
- `curl localhost:3000/health` → Gotenberg ready
- PostgreSQL: `\dt` → 29 таблиц

---

## US-004: Infrastructure clients

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want initialized infrastructure clients for Ory, Brevo, Gotenberg and Hetzner S3, so that Sprint 1+ features can use them immediately.

### Acceptance Criteria

- [x] `infrastructure/auth/ory-client.js` — Ory SDK, verifySession, getIdentity
- [x] `infrastructure/email/brevo-client.js` — Brevo SDK, sendTransactional
- [x] `infrastructure/pdf/gotenberg-client.js` — HTTP client, convertHtmlToPdf
- [x] `infrastructure/storage/s3-client.js` — AWS SDK v3, upload, download, getSignedUrl
- [x] Каждый client: типизированные ошибки, pino logging, timeouts (10s/30s)
- [x] Config-файлы: `config/ory.js`, `config/brevo.js`, `config/gotenberg.js`, `config/s3.js`

### Зависимости
US-001, US-003

### Тесты
- Каждый client import без ошибок
- Config validation: missing env → понятная ошибка
- Ory: `verifySession()` с невалидным token → AuthError

---

## US-005: Error handling, logging, CI/CD, rate limiting

**Feature:** 01 | **SP:** 5 | **Разработчик:** Max

### Описание
As a developer, I want standardized error handling, CI pipeline and rate limiting, so that the codebase has a quality baseline from day one.

### Acceptance Criteria

- [x] `lib/errors.js` — AppError base + ValidationError(400), AuthError(401), ForbiddenError(403), NotFoundError(404), ConflictError(409), RateLimitError(429)
- [x] Fastify error handler: AppError → JSON, unknown → 500 + Sentry
- [x] Pino structured logging + Request ID (`X-Request-Id`)
- [x] CI/CD: `.github/workflows/ci.yml` — lint → type-check → test → audit
- [x] Startup .env validation: `config/validate.js`
- [x] `@fastify/rate-limit` — Global: 100 req/min per IP

### Зависимости
US-001

### Тесты
- ValidationError → 400 JSON
- Rate limit: 101-й запрос → 429
- CI pipeline: lint + type-check + test → green

---

## US-006: Frontend Next.js skeleton + design system

**Feature:** 01 | **SP:** 8 | **Разработчик:** Nina

### Описание
As a user, I want a working frontend application with consistent design system, so that Sprint 1 features can be built on a solid UI foundation.

### Acceptance Criteria

- [x] Next.js 14 App Router + TypeScript strict
- [x] `frontend/` workspace в monorepo, порт 3001
- [x] TailwindCSS 3 + shadcn/ui с custom theme (risk level colors)
- [x] Typography: Inter + JetBrains Mono, 4px spacing grid
- [x] Базовые компоненты: Button, Input, Label, Card, Badge, Dialog, Table, Skeleton, Toast
- [x] Responsive: mobile-first (xs → xl), sidebar (desktop) → bottom nav (mobile)
- [x] Pages: `/`, `/dashboard` (placeholder), `/404`, `/error`

### Зависимости
US-001

### Тесты
- `npm run dev` → стартует на 3001
- `npm run build` → без ошибок
- Risk level badges: все 5 цветов отображаются

---

## US-007: Monitoring + Analytics integration

**Feature:** 01 | **SP:** 3 | **Разработчик:** Nina

### Описание
As a product owner, I want analytics and monitoring from day one, so that I can track usage and uptime when we launch.

### Acceptance Criteria

- [x] Plausible Analytics: `<Script>` в layout.tsx, без cookies, GDPR-safe
- [x] Better Uptime: `/health` с service statuses (DB, Ory, Gotenberg)
- [x] Sentry: `@sentry/nextjs` + `@sentry/node`, source maps в CI

### Зависимости
US-001, US-006

### Тесты
- `/health` → 200 с service statuses
- Plausible скрипт: не рендерится в dev mode

---

## US-008: UX wireframes для Sprint 1-2 (deployer-first)

**Feature:** 01 (prep) | **SP:** 6 | **Разработчик:** Nina

### Описание
As a designer, I want wireframes for Sprint 1-2 pages, so that frontend development starts with clear deployer-focused visual specs.

### Acceptance Criteria

- [x] Wireframe: Login page (Ory magic link flow)
- [x] Wireframe: Register page (Ory registration + deployer onboarding)
- [x] Wireframe: Deployer Dashboard (placeholder layout)
- [x] Wireframe: AI Tool Inventory (Feature 03)
- [x] Wireframe: AI Literacy Dashboard (Feature 18)
- [x] Файл: `docs/wireframes/sprint-1-2-wireframes.md`

### Зависимости
US-006

### Тесты
- Wireframes покрывают все экраны Sprint 1
- Responsive: mobile и desktop вариант

---

## Sprint 0 Summary

### Story Map

```
Feature 01: Инфраструктура и настройка проекта
│
├── Backend (Max)
│   ├── US-001: Monorepo + Fastify (5 SP)
│   ├── US-002: MetaSQL schemas 29 таблиц (10 SP) ← зависит от US-001
│   ├── US-003: Docker Compose (5 SP) ← зависит от US-001, US-002
│   ├── US-004: Infrastructure clients (5 SP) ← зависит от US-001, US-003
│   └── US-005: Errors, CI, rate-limit (5 SP) ← зависит от US-001
│
└── Frontend (Nina)
    ├── US-006: Next.js + design system (8 SP) ← зависит от US-001
    ├── US-007: Monitoring + analytics (3 SP) ← зависит от US-001, US-006
    └── US-008: Wireframes Sprint 1-2 deployer (6 SP) ← зависит от US-006
```

### Sprint Totals

| Разработчик | Stories | SP | Фокус |
|-------------|---------|-----|-------|
| Max | US-001..005 | 30 | Backend infrastructure, 29 tables, Docker, CI |
| Nina | US-006..008 | 17 | Frontend skeleton, design system, deployer wireframes |
| **Итого** | **8 US** | **47 SP** | |

### Definition of Done (Sprint 0) ✅

- [x] `docker compose up` → все сервисы стартуют и healthy
- [x] 29 таблиц в PostgreSQL, deployer seed data загружена (225 catalog, 32 requirements, 5 plans, 4 courses)
- [x] Backend: `curl /health` → 200 с service statuses (DB, Ory, Gotenberg checks)
- [x] Frontend: `npm run build` → без ошибок
- [x] CI pipeline: lint + type-check + test → green (22 tests, 0 errors)
- [x] Все infrastructure clients инициализируются без ошибок (Ory, Brevo, Gotenberg, S3)
- [x] Rate limiting работает (@fastify/rate-limit, 100 req/min → 429)
- [x] Wireframes для Sprint 1-2 готовы (6 screens)
