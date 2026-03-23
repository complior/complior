# ARCHITECTURE.md -- Архитектура SaaS Dashboard Complior v9

**Версия:** 9.0.0
**Дата:** 2026-03-06
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
**Статус:** Утверждено
**Репозиторий:** `ai-act-compliance-platform` (проприетарный, отдельный от CLI)

> **Область действия:** Этот документ описывает ТОЛЬКО архитектуру SaaS Dashboard (Next.js 14 + Fastify 5 + PostgreSQL 16). Архитектура Engine, CLI/TUI, SDK и MCP Server описана в `~/complior/docs/v9/ARCHITECTURE.md`.

---

## 1. Обзор SaaS платформы

### 1.1. Назначение

SaaS Dashboard -- проприетарная веб-платформа для DPO, CTO и Compliance Officer. Решает задачу управления AI-системами организации в контексте EU AI Act (108 обязательств, дедлайн 2 августа 2026).

| Проблема | Решение SaaS |
|----------|-------------|
| "У нас 7 AI-систем, нет реестра" | Единый реестр всех AI-систем (CLI + SaaS) |
| "Не знаю, какие обязательства на нас" | Gap Analysis по 108 obligations |
| "Нужен FRIA для high-risk систем" | FRIA wizard (80% auto-fill из Passport) |
| "Регулятор попросил Audit Package" | One-click ZIP: passports + evidence + FRIA |
| "Сотрудники не обучены AI literacy" | AI Literacy LMS (Art. 4) |

### 1.2. Тарифная сетка

| Тариф | Цена | AI-систем | Пользователей | Ключевые фичи |
|-------|------|-----------|---------------|---------------|
| **Starter** | EUR 0 | 3 | 1 | Базовый обзор комплаенса, 1 отчёт/месяц |
| **Growth** | EUR 149/мес | Unlimited | 10 | Полный аудит, уведомления, FRIA, CLI sync, Audit Package |
| **Enterprise** | EUR 499/мес | Unlimited | Unlimited | Growth + SSO, Multi-Workspace, API, неограниченные пользователи |

> **CLI-Scanner** — бесплатно навсегда (open-source daemon + TUI)

### 1.3. Воронка конверсии

```
Разработчик --> npx complior --> scan --> score 72 --> fix --> 85 --> passport
       |
       |  "Нужен реестр ВСЕХ AI-систем организации"
       |  "Нужен FRIA для high-risk систем"
       |  "Нужен Audit Package для регулятора"
       v
CTO/DPO --> app.complior.eu --> SaaS Dashboard --> EUR 149-499/мес
```

---

## 2. Архитектура SaaS (ASCII-диаграмма)

```
+=============================================================================+
|                                                                              |
|  SAAS DASHBOARD ARCHITECTURE                                                 |
|                                                                              |
|  +-- Клиенты -----------------------------------------------------------+  |
|  |                                                                        |  |
|  |  +-------------+   +-------------+   +---------------+                |  |
|  |  | Браузер     |   | CLI         |   | Coding Agent  |                |  |
|  |  | (DPO/CTO)   |   | (complior)  |   | (MCP proxy)   |                |  |
|  |  +------+------+   +------+------+   +-------+-------+                |  |
|  |         |                 |                   |                        |  |
|  +---------+-----------------+-------------------+------------------------+  |
|            |                 |                   |                            |
|            | HTTPS           | Device Flow       | (через CLI sync)          |
|            | (Caddy TLS)     | + Bearer JWT      |                           |
|            v                 v                   v                            |
|  +-- Frontend ----------------------------------------------------------+  |
|  |                                                                        |  |
|  |  Next.js 14 (App Router)                                              |  |
|  |  +--------------------------------------------------------------+    |  |
|  |  | /app                                                          |    |  |
|  |  |   /(auth)/login, /register, /verify                          |    |  |
|  |  |   /(dashboard)/                                               |    |  |
|  |  |     /overview        Score, donut, penalties, critical path   |    |  |
|  |  |     /tools           AI Tool Inventory (реестр AI-систем)     |    |  |
|  |  |     /tools/[id]      Детали AI-системы + wizard               |    |  |
|  |  |     /requirements    Gap Analysis (12 категорий AESIA)        |    |  |
|  |  |     /compliance      Compliance документы (8 типов)           |    |  |
|  |  |     /fria            FRIA wizard (6 секций)                   |    |  |
|  |  |     /timeline        Таймлайн до Aug 2, 2026                  |    |  |
|  |  |     /audit           Audit Package генератор                  |    |  |
|  |  |     /registry        Public AI Registry (5,011+ tools)        |    |  |
|  |  |     /literacy        AI Literacy (курсы, прохождение)         |    |  |
|  |  |     /settings        Организация, billing, API keys           |    |  |
|  |  +--------------------------------------------------------------+    |  |
|  |                                                                        |  |
|  |  Стек: TailwindCSS + shadcn/ui + Vercel AI SDK                       |  |
|  |  Auth: WorkOS AuthKit (middleware)                                     |  |
|  |  SSR: Server Components + Server Actions                              |  |
|  |                                                                        |  |
|  +----+-------------------------------------------------------------------+  |
|       |                                                                      |
|       | REST API (JSON)                                                      |
|       v                                                                      |
|  +-- Backend -----------------------------------------------------------+  |
|  |                                                                        |  |
|  |  Fastify 5 + VM Sandbox                                               |  |
|  |  +--------------------------------------------------------------+    |  |
|  |  | ONION LAYERS                                                  |    |  |
|  |  |                                                               |    |  |
|  |  |  +-- Routes (HTTP boundary) --+                              |    |  |
|  |  |  |  /api/auth/*               |  WorkOS Device Flow, JWT     |    |  |
|  |  |  |  /api/tools/*              |  AI Tool CRUD                |    |  |
|  |  |  |  /api/requirements/*       |  Deployer obligations        |    |  |
|  |  |  |  /api/compliance/*         |  Compliance documents        |    |  |
|  |  |  |  /api/fria/*               |  FRIA assessments            |    |  |
|  |  |  |  /api/registry/*           |  AI Registry (5,011+ tools)  |    |  |
|  |  |  |  /api/sync/*               |  CLI <-> SaaS sync           |    |  |
|  |  |  |  /api/billing/*            |  Stripe subscriptions        |    |  |
|  |  |  |  /api/audit/*              |  Audit Package generator     |    |  |
|  |  |  |  /api/admin/*              |  Org management              |    |  |
|  |  |  |  /api/bundle               |  Data bundle for CLI (ETag)  |    |  |
|  |  |  +---------+------------------+                              |    |  |
|  |  |            |                                                  |    |  |
|  |  |            v                                                  |    |  |
|  |  |  +-- Services (бизнес-логика) ---+                           |    |  |
|  |  |  |  Zod validation               |                           |    |  |
|  |  |  |  resolveApiAuth(headers)      |                           |    |  |
|  |  |  |  Org membership check         |                           |    |  |
|  |  |  |  Rate limiting                |                           |    |  |
|  |  |  +---------+--------------------+                            |    |  |
|  |  |            |                                                  |    |  |
|  |  |            v                                                  |    |  |
|  |  |  +-- Data Access (MetaSQL) ------+                           |    |  |
|  |  |  |  Parameterized SQL queries    |                           |    |  |
|  |  |  |  pg-boss job queue            |                           |    |  |
|  |  |  +-------------------------------+                           |    |  |
|  |  +--------------------------------------------------------------+    |  |
|  |                                                                        |  |
|  +----+-------------------------------------------------------------------+  |
|       |                                                                      |
|       | MetaSQL queries                                                      |
|       v                                                                      |
|  +-- Database ----------------------------------------------------------+  |
|  |                                                                        |  |
|  |  PostgreSQL 16 (Hetzner Managed, EU-hosted, Германия)                 |  |
|  |  39 таблиц, 10 Bounded Contexts                                      |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                              |
|  +-- External Services -------------------------------------------------+  |
|  |                                                                        |  |
|  |  +----------+  +--------+  +----------+  +--------+  +----------+    |  |
|  |  | WorkOS   |  | Stripe |  | Mistral  |  | Brevo  |  | Gotenberg|    |  |
|  |  | Auth/SSO |  | Billing|  | LLM (EU) |  | Email  |  | PDF gen  |    |  |
|  |  | (SCC)    |  | (EU)   |  | (France) |  | (FR)   |  | (Docker) |    |  |
|  |  +----------+  +--------+  +----------+  +--------+  +----------+    |  |
|  |                                                                        |  |
|  +------------------------------------------------------------------------+  |
|                                                                              |
+=============================================================================+
```

---

## 3. Frontend архитектура

### 3.1. Стек

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| **Next.js** | 14 (App Router) | SSR, Server Components, Server Actions |
| **TypeScript** | strict mode | Типизация |
| **TailwindCSS** | 3.x | Стилизация |
| **shadcn/ui** | latest | UI-компоненты (Radix primitives) |
| **Vercel AI SDK** | 3.x | LLM-интеграция в UI (streaming, chat) |
| **WorkOS AuthKit** | latest | Аутентификация (middleware, session) |

### 3.2. Структура App Router

```
app/
+===========================================================================+
|                                                                           |
|  layout.tsx                 Root layout (Providers, WorkOS session)       |
|  middleware.ts              Auth check, org context, redirects            |
|                                                                           |
|  (auth)/                    Публичные страницы (без auth)                 |
|  +---------------------------------------------------------------------+ |
|  | login/page.tsx           WorkOS AuthKit login                        | |
|  | register/page.tsx        Регистрация организации                     | |
|  | verify/page.tsx          Device Flow подтверждение для CLI           | |
|  | callback/page.tsx        OAuth callback                              | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  (dashboard)/               Защищённые страницы (auth required)          |
|  +---------------------------------------------------------------------+ |
|  | layout.tsx               Dashboard layout (sidebar, topbar, org)     | |
|  |                                                                      | |
|  | overview/page.tsx        Главная: score, donut, penalties, trends    | |
|  |                                                                      | |
|  | tools/                                                                | |
|  |   page.tsx               Реестр AI-систем (таблица + фильтры)       | |
|  |   [id]/page.tsx          Детали AI-системы + 5-step wizard          | |
|  |   new/page.tsx           Добавление AI-системы (Mode 3: Manual)     | |
|  |                                                                      | |
|  | requirements/page.tsx    Gap Analysis (12 категорий AESIA)          | |
|  |                                                                      | |
|  | compliance/                                                           | |
|  |   page.tsx               Список compliance документов               | |
|  |   [id]/page.tsx          Редактор документа (WYSIWYG)               | |
|  |                                                                      | |
|  | fria/                                                                 | |
|  |   page.tsx               Список FRIA assessments                    | |
|  |   [id]/page.tsx          FRIA wizard (6 секций)                     | |
|  |                                                                      | |
|  | timeline/page.tsx        Visual timeline до Aug 2, 2026             | |
|  |                                                                      | |
|  | audit/page.tsx           Audit Package генератор (one-click ZIP)    | |
|  |                                                                      | |
|  | registry/                                                             | |
|  |   page.tsx               Public AI Registry (5,011+ tools)          | |
|  |   [slug]/page.tsx        Tool card (risk score, docs, community)    | |
|  |                                                                      | |
|  | literacy/                                                             | |
|  |   page.tsx               AI Literacy программы (Art. 4)             | |
|  |   [id]/page.tsx          Прохождение курса                          | |
|  |                                                                      | |
|  | settings/                                                             | |
|  |   page.tsx               Организация, члены команды                 | |
|  |   billing/page.tsx       Stripe подписка, invoices                  | |
|  |   api/page.tsx           API keys для CLI                           | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  api/                       Route Handlers (API для frontend)             |
|  +---------------------------------------------------------------------+ |
|  | auth/device/route.ts     Device Flow initiation                     | |
|  | auth/device-confirm/route.ts  Device Flow confirmation              | |
|  | auth/token/route.ts      Token exchange                             | |
|  | chat/route.ts            AI-ассистент (Vercel AI SDK streaming)     | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
+===========================================================================+
```

### 3.3. Компонентная модель

```
components/
+===========================================================================+
|                                                                           |
|  ui/                        shadcn/ui примитивы (button, dialog, ...)     |
|                                                                           |
|  dashboard/                 Виджеты dashboard                             |
|  +---------------------------------------------------------------------+ |
|  | score-donut.tsx          Compliance score (0-100, цветовая шкала)    | |
|  | penalty-cards.tsx        Штрафы по статьям (EUR 7.5M / 15M / 35M)   | |
|  | deadline-countdown.tsx   Обратный отсчёт до Aug 2, 2026             | |
|  | tool-summary.tsx         Сводка по AI-системам (по типам риска)     | |
|  | trend-chart.tsx          Тренд compliance score (sparkline)         | |
|  | critical-path.tsx        Критический путь (ближайшие дедлайны)      | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  tools/                     AI Tool Inventory                             |
|  +---------------------------------------------------------------------+ |
|  | tool-table.tsx           Таблица AI-систем с сортировкой/фильтрами  | |
|  | tool-wizard.tsx          5-step wizard (info, risk, docs, review, done)|
|  | risk-badge.tsx           Бейдж классификации (Prohibited/High/...)  | |
|  | registry-prefill.tsx     Pre-fill из AI Registry (5,011+ tools)     | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  fria/                      FRIA wizard                                   |
|  +---------------------------------------------------------------------+ |
|  | fria-wizard.tsx          6-секционный wizard                        | |
|  | section-editor.tsx       Редактор секции (rich text)                | |
|  | passport-prefill.tsx     Auto-fill из Agent Passport (80%)          | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  compliance/                Документы                                     |
|  +---------------------------------------------------------------------+ |
|  | doc-editor.tsx           WYSIWYG редактор compliance документов     | |
|  | doc-templates.tsx        Шаблоны (Policy, QMS, Risk, Monitoring)    | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  chat/                      AI-ассистент                                  |
|  +---------------------------------------------------------------------+ |
|  | eva-chat.tsx             Chat widget (Vercel AI SDK useChat)        | |
|  | tool-calling.tsx         Function calling UI (suggestions)          | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
+===========================================================================+
```

---

## 4. Backend архитектура

### 4.1. Стек

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| **Fastify** | 5 | HTTP-сервер (typed routes, plugins) |
| **JavaScript** | CommonJS | Backend runtime |
| **VM Sandbox** | Node.js vm | Изолированное исполнение MetaSQL |
| **MetaSQL** | internal | Parameterized SQL schema framework |
| **Zod** | 3.x | Валидация на каждом boundary |
| **pg-boss** | latest | PostgreSQL-native job queue |
| **WorkOS SDK** | latest | Аутентификация (SSO/SAML, Device Flow) |
| **Mistral SDK** | latest | LLM API (EU-hosted) |
| **Stripe SDK** | latest | Billing, subscriptions, webhooks |

### 4.2. Onion-слои

```
+===========================================================================+
|  FASTIFY BACKEND -- ONION ARCHITECTURE                                    |
+===========================================================================+
|                                                                           |
|  +-- OUTER: HTTP Routes (boundary) --------------------------------+    |
|  |                                                                   |    |
|  |  Fastify plugins:                                                |    |
|  |    auth.plugin.ts       resolveApiAuth(), org membership         |    |
|  |    rate-limit.plugin.ts per-key/per-org rate limiting            |    |
|  |    cors.plugin.ts       CORS для Next.js frontend                |    |
|  |    error.plugin.ts      Unified error handler (Zod -> 400)      |    |
|  |                                                                   |    |
|  |  Route groups (80+ эндпоинтов):                                  |    |
|  |    /api/auth/*           9 routes   (WorkOS, Device Flow)        |    |
|  |    /api/tools/*         12 routes   (CRUD AI tools, wizard)      |    |
|  |    /api/requirements/*   8 routes   (obligations, gap analysis)  |    |
|  |    /api/compliance/*    10 routes   (documents, versions)        |    |
|  |    /api/fria/*           8 routes   (assessments, sections)      |    |
|  |    /api/registry/*       6 routes   (search, scores, docs)       |    |
|  |    /api/sync/*           5 routes   (passport, scan, doc, fria)  |    |
|  |    /api/billing/*        7 routes   (Stripe webhooks, plans)     |    |
|  |    /api/audit/*          5 routes   (packages, export)           |    |
|  |    /api/admin/*          6 routes   (org, members, invites)      |    |
|  |    /api/literacy/*       4 routes   (courses, completions)       |    |
|  |    /api/bundle            1 route   (data bundle, ETag)          |    |
|  |                                                                   |    |
|  +-------------------------------------------------------------------+    |
|       |                                                                    |
|       v                                                                    |
|  +-- MIDDLE: Services (бизнес-логика) --------------------------+       |
|  |                                                                |       |
|  |  tool.service.ts        CRUD + классификация + wizard steps   |       |
|  |  requirement.service.ts Gap analysis, obligation mapping      |       |
|  |  compliance.service.ts  Document lifecycle, version control   |       |
|  |  fria.service.ts        FRIA assessment (6 секций)            |       |
|  |  registry.service.ts    AI Registry query, risk scores        |       |
|  |  sync.service.ts        CLI sync (passport, scan, doc, fria)  |       |
|  |  audit.service.ts       Audit Package generation (ZIP + PDF)  |       |
|  |  billing.service.ts     Stripe integration, plan enforcement  |       |
|  |  literacy.service.ts    AI Literacy courses (Art. 4)          |       |
|  |  auth.service.ts        WorkOS sessions, Device Flow          |       |
|  |  llm.service.ts         Mistral API wrapper                   |       |
|  |  job.service.ts         pg-boss job scheduling                |       |
|  |                                                                |       |
|  +----------------------------------------------------------------+       |
|       |                                                                    |
|       v                                                                    |
|  +-- INNER: Data Access (MetaSQL + pg-boss) --------------------+       |
|  |                                                                |       |
|  |  MetaSQL queries:                                             |       |
|  |    /sql/tools/*.sql         AI Tool Inventory queries         |       |
|  |    /sql/compliance/*.sql    Document queries                  |       |
|  |    /sql/fria/*.sql          FRIA assessment queries           |       |
|  |    /sql/registry/*.sql      Registry queries                  |       |
|  |    /sql/auth/*.sql          Auth & IAM queries                |       |
|  |    /sql/billing/*.sql       Subscription queries              |       |
|  |    /sql/audit/*.sql         Audit log queries                 |       |
|  |    /sql/literacy/*.sql      Training queries                  |       |
|  |                                                                |       |
|  |  pg-boss jobs:                                                |       |
|  |    nightly-evidence        Community evidence aggregation     |       |
|  |    generate-pdf            Gotenberg PDF generation           |       |
|  |    send-email              Brevo transactional email          |       |
|  |    stripe-webhook          Stripe event processing            |       |
|  |    process-scan            Scan result import from CLI        |       |
|  |    generate-audit          Audit Package ZIP assembly         |       |
|  |                                                                |       |
|  +----------------------------------------------------------------+       |
|                                                                           |
+===========================================================================+
```

### 4.3. MetaSQL -- схема доступа к данным

MetaSQL -- внутренний фреймворк для параметризированных SQL-запросов. Каждый запрос -- отдельный `.sql` файл с именованными параметрами. Fastify VM Sandbox исполняет их изолированно.

```
Пример MetaSQL:

-- sql/tools/list-by-org.sql
SELECT
  id, name, vendor_name, risk_level,
  wizard_step, complior_score, lifecycle_status,
  created_at, updated_at
FROM ai_tools
WHERE organization_id = :organizationId
  AND deleted_at IS NULL
ORDER BY
  CASE risk_level
    WHEN 'prohibited' THEN 1
    WHEN 'high' THEN 2
    WHEN 'limited' THEN 3
    WHEN 'minimal' THEN 4
  END,
  name ASC
LIMIT :limit OFFSET :offset;
```

Принципы:
1. **Нет ORM** -- только параметризированный SQL (безопасность, контроль, производительность)
2. **Один файл = один запрос** -- легко ревьюить и тестировать
3. **Именованные параметры** -- `:organizationId`, `:limit` (нет позиционных `$1`)
4. **VM Sandbox** -- MetaSQL исполняется в изолированном контексте Node.js VM

---

## 5. 10 Bounded Contexts (DDD)

### 5.1. Диаграмма контекстов

```
+===========================================================================+
|  BOUNDED CONTEXTS (DDD)                                                    |
+===========================================================================+
|                                                                           |
|  +-- CORE DOMAIN ---------------------------------------------------+   |
|  |                                                                    |   |
|  |  (1) IAM             (2) AI Tool         (3) Deployer             |   |
|  |  +-----------+       Inventory            Compliance              |   |
|  |  | users     |       +------------+      +----------------+       |   |
|  |  | orgs      | ----> | ai_tools   | ---> | compliance_docs|       |   |
|  |  | members   |       | risk_class |      | doc_versions   |       |   |
|  |  | invites   |       | tool_reqs  |      | checks         |       |   |
|  |  +-----------+       | tool_tags  |      | remediation    |       |   |
|  |       |              +-----+------+      +----------------+       |   |
|  |       |                    |                     |                 |   |
|  |       v                    v                     v                 |   |
|  |  (4) AI Literacy     (10) Audit            (9) Document Mgmt     |   |
|  |  +------------+      +-----------+         +----------------+     |   |
|  |  | programs   |      | packages  |         | generated_docs |     |   |
|  |  | completions|      | audit_logs|         | templates      |     |   |
|  |  | assessments|      | fria_asmt |         | file_storage   |     |   |
|  |  +------------+      | fria_sect |         +----------------+     |   |
|  |                      +-----------+                                |   |
|  +--------------------------------------------------------------------+   |
|                                                                           |
|  +-- SUPPORTING DOMAIN ---------------------------------------------+   |
|  |                                                                    |   |
|  |  (5) Billing         (6) Registry API    (7) TUI Data            |   |
|  |  +-----------+       +-----------+       Collection               |   |
|  |  | subscr.   |       | reg_tools |       +----------------+       |   |
|  |  | invoices  |       | reg_scores|       | sync_history   |       |   |
|  |  | usage     |       | reg_docs  |       | device_codes   |       |   |
|  |  +-----------+       | comm_evid.|       +----------------+       |   |
|  |                      +-----------+                                |   |
|  +--------------------------------------------------------------------+   |
|                                                                           |
|  +-- GENERIC SUBDOMAIN ---------------------------------------------+   |
|  |                                                                    |   |
|  |  (8) Authentication                                               |   |
|  |  +-------------------+                                            |   |
|  |  | sessions          |                                            |   |
|  |  | api_keys          |                                            |   |
|  |  +-------------------+                                            |   |
|  |                                                                    |   |
|  +--------------------------------------------------------------------+   |
|                                                                           |
+===========================================================================+
```

### 5.2. Таблицы по контекстам

#### BC-1: IAM (Identity & Access Management)

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `users` | Пользователи | id, workos_id, email, name, role |
| `organizations` | Организации | id, name, slug, plan, stripe_customer_id |
| `org_memberships` | Членство | user_id, org_id, role (owner/admin/member) |
| `invitations` | Приглашения | email, org_id, role, token, expires_at |

#### BC-2: AI Tool Inventory

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `ai_tools` | AI-системы организации (21 поле) | id, org_id, name, vendor_name, risk_level, wizard_step, complior_score, passport_data (JSONB) |
| `risk_classifications` | Классификация риска | tool_id, method (auto/manual), risk_level, confidence, rationale |
| `tool_requirements` | Применимые обязательства | tool_id, requirement_id, status (met/unmet/partial) |
| `tool_tags` | Теги для категоризации | tool_id, tag |

#### BC-3: Deployer Compliance

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `compliance_documents` | Документы (8 типов) | id, tool_id, org_id, type, title, content, status, version |
| `document_versions` | Версионирование | doc_id, version, content, changed_by, created_at |
| `compliance_checks` | Результаты проверок | doc_id, check_type, result (pass/fail), details |
| `remediation_plans` | Планы исправлений | tool_id, gap_id, description, due_date, status |

8 типов документов: `usage_policy`, `risk_management`, `quality_management`, `monitoring_plan`, `worker_notification`, `incident_response`, `technical_documentation`, `declaration_of_conformity`.

#### BC-4: AI Literacy (Art. 4)

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `training_programs` | Программы обучения | id, org_id, title, modules (JSONB), duration_hours |
| `training_completions` | Прохождение | user_id, program_id, completed_at, score |
| `literacy_assessments` | Оценка AI literacy | user_id, org_id, level, assessment_date |

#### BC-5: Billing

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `subscriptions` | Stripe подписки | org_id, stripe_subscription_id, plan, status, period_end |
| `invoices` | Счета | org_id, stripe_invoice_id, amount_cents, currency, status |
| `usage_records` | Учёт использования | org_id, metric (api_calls/tools/llm_queries), count, period |

#### BC-6: Registry API (Public AI Risk Registry)

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `registry_tools` | 5,011+ AI tools | id, slug, name, vendor, category, risk_level |
| `registry_scores` | Risk scores (5 категорий) | tool_id, category, score, evidence_count |
| `registry_documents` | Документы вендора | tool_id, doc_type (DPA, model_card, ...), found, url |
| `community_evidence` | Агрегация от deployer'ов | tool_id, doc_type, deployer_count, last_aggregated |

Community Evidence: агрегация анонимная (k-anonymity, N >= 10), nightly batch, opt-out. Deployer'ы НЕ видят друг друга. Grade = только public scan + vendor upload.

#### BC-7: TUI Data Collection (CLI -> SaaS sync)

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `sync_history` | История синхронизаций | org_id, user_id, sync_type, payload_hash, status, created_at |
| `device_codes` | Device Flow auth tokens | device_code, user_code, status (pending/authorized/expired), user_id, org_id |

#### BC-8: Authentication

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `sessions` | Сессии (JWT) | user_id, token_hash, refresh_token_hash, expires_at |
| `api_keys` | API ключи для CLI | org_id, key_prefix (cpl_...), key_hash, name, last_used_at |

#### BC-9: Document Management

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `generated_documents` | PDF, ZIP | org_id, type, format (pdf/zip), storage_key, generated_at |
| `document_templates` | Шаблоны | type, title, content, version |
| `file_storage` | Ссылки на Hetzner S3 | id, bucket, key, size_bytes, content_type, uploaded_at |

#### BC-10: Audit

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `audit_packages` | Аудиторские пакеты | org_id, tools (JSONB), status, zip_storage_key, generated_at |
| `audit_logs` | Лог аудит-действий | org_id, user_id, action, entity_type, entity_id, details (JSONB) |
| `fria_assessments` | FRIA-оценки | tool_id, org_id, status (draft/in_progress/review/complete), assessor_id |
| `fria_sections` | Секции FRIA | assessment_id, type (6 типов), content (JSONB), completed |

6 типов FRIA-секций: `general_info`, `affected_persons`, `specific_risks`, `human_oversight`, `mitigation_measures`, `monitoring_plan`.

---

## 6. LLM-интеграция

### 6.1. Три модели Mistral

Все LLM-запросы обрабатываются через Mistral API (Франция, EU). Данные НЕ покидают EU.

| Модель | Задача | Латентность | Использование |
|--------|--------|-------------|---------------|
| **Mistral Large 3** | Q&A, объяснение статей EU AI Act, gap analysis | ~2-5s | Eva AI-ассистент, compliance chat |
| **Mistral Medium 3** | Генерация документов (FRIA, policies, risk plans) | ~3-8s | FRIA wizard, doc templates |
| **Mistral Small 3.1** | Классификация, risk assessment, quick tasks | ~0.5-2s | Tool classification, requirement matching |

### 6.2. Архитектура LLM-слоя

```
+===========================================================================+
|  LLM INTEGRATION (SaaS)                                                   |
+===========================================================================+
|                                                                           |
|  Frontend (Next.js)                                                       |
|  +---------------------------------------------------------------------+ |
|  | Vercel AI SDK:                                                       | |
|  |   useChat() --> /api/chat --> Fastify --> Mistral API               | |
|  |   useCompletion() --> streaming SSE --> UI                          | |
|  |                                                                      | |
|  | Eva AI-ассистент (chat widget):                                     | |
|  |   - Объяснение статей EU AI Act на языке пользователя              | |
|  |   - Рекомендации по gap analysis                                   | |
|  |   - Помощь с заполнением FRIA                                      | |
|  |   - Tool calling: searchRegistry(), classifyRisk()                  | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  Backend (Fastify)                                                        |
|  +---------------------------------------------------------------------+ |
|  | llm.service.ts:                                                      | |
|  |                                                                      | |
|  |   classify(description) --> Mistral Small 3.1                       | |
|  |     Input: описание AI-системы                                     | |
|  |     Output: {risk_level, confidence, articles[], rationale}         | |
|  |                                                                      | |
|  |   generateDocument(type, context) --> Mistral Medium 3              | |
|  |     Input: тип документа + passport данные + obligations            | |
|  |     Output: заполненный Markdown документ                           | |
|  |                                                                      | |
|  |   chat(messages, tools) --> Mistral Large 3                         | |
|  |     Input: история сообщений + function definitions                | |
|  |     Output: streaming ответ + tool calls                           | |
|  |                                                                      | |
|  |   assessFria(passport, section) --> Mistral Medium 3                | |
|  |     Input: passport данные + тип секции                            | |
|  |     Output: рекомендуемый текст секции FRIA                        | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  Бюджет по тарифам:                                                      |
|  +---------------------------------------------------------------------+ |
|  | Starter:    нет LLM                                                 | |
|  | Growth:     50 запросов/мес (Mistral Large + Medium)                | |
|  | Enterprise: Unlimited (или self-hosted LLM) + Guard API            | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
+===========================================================================+
```

---

## 7. Интеграция CLI <-> SaaS

### 7.1. Device Flow Authentication (OAuth 2.0)

CLI аутентифицируется через OAuth 2.0 Device Authorization Grant (RFC 8628). Пользователь подтверждает в браузере, CLI получает JWT.

```
+-----------------------------------------------------------------------+
|  DEVICE FLOW AUTHENTICATION                                            |
+-----------------------------------------------------------------------+
|                                                                        |
|  Шаг 1: CLI инициирует                                                |
|  $ complior login                                                      |
|      |                                                                 |
|      v                                                                 |
|  CLI --> POST /api/auth/device {}                                      |
|      |                                                                 |
|      v                                                                 |
|  SaaS API:                                                             |
|    Генерирует deviceCode (UUID) + userCode (8 символов)               |
|    INSERT device_codes {status: 'pending', expires_at: now() + 15min} |
|    --> CLI: {deviceCode, userCode, verificationUri, expiresIn, interval}
|                                                                        |
|  Шаг 2: Пользователь подтверждает в браузере                          |
|  CLI: "Visit app.complior.eu/verify and enter code: ABCD-1234"       |
|      |                                                                 |
|      v                                                                 |
|  Пользователь --> Браузер --> app.complior.eu/verify                  |
|  Браузер --> WorkOS AuthKit --> SSO / SAML / Email login              |
|  Браузер --> POST /api/auth/device-confirm {userCode} (session)       |
|  SaaS API: UPDATE device_codes SET status='authorized', userId, orgId |
|                                                                        |
|  Шаг 3: CLI получает токены (polling)                                 |
|  CLI: poll POST /api/auth/token {deviceCode} каждые 5 сек            |
|    pending    --> {error: "authorization_pending"}                     |
|    authorized --> {accessToken (JWT, 1h), refreshToken (30d)}         |
|  CLI: сохраняет --> ~/.config/complior/credentials                    |
|                                                                        |
|  Шаг 4: Использование                                                 |
|  CLI: Authorization: Bearer {accessToken}                             |
|  Истёк --> POST /api/auth/refresh {refreshToken} --> новая пара       |
|                                                                        |
+-----------------------------------------------------------------------+

Сроки действия:
  deviceCode:    15 минут
  accessToken:   1 час (JWT)
  refreshToken:  30 дней

Credentials файл (~/.config/complior/credentials):
  COMPLIOR_ACCESS_TOKEN=eyJ...
  COMPLIOR_REFRESH_TOKEN=rt_...
  COMPLIOR_ORGANIZATION_ID=org_...
```

### 7.2. Протокол синхронизации

Все sync-запросы: `POST /api/sync/*` с `Authorization: Bearer {JWT}`. SaaS валидирует JWT, извлекает `organizationId` и `userId`, применяет Zod-валидацию к body.

```
+===========================================================================+
|  CLI --> SaaS SYNC PROTOCOL                                               |
+===========================================================================+
|                                                                           |
|  Поток данных:                                                            |
|                                                                           |
|  $ complior sync                                                          |
|      |                                                                    |
|      v                                                                    |
|  1. Загрузка credentials (~/.config/complior/credentials)                |
|  2. Проверка accessToken (если истёк --> refresh)                        |
|  3. Последовательно:                                                     |
|      a) POST /api/sync/passport  (Agent Passports)                       |
|      b) POST /api/sync/scan      (Scan Results)                          |
|      c) POST /api/sync/documents (Compliance Docs)                       |
|      d) POST /api/sync/fria      (FRIA Reports)                         |
|  4. GET /api/bundle              (обратная синхронизация)                |
|                                                                           |
+===========================================================================+
```

#### DF-14: Passport Sync

```
CLI --> POST /api/sync/passport
Body: {passport: AgentPassport (36 полей)}

Маппинг 36 CLI полей --> 21 SaaS полей (ai_tools):
+-------------------------------+----------------------------+
| CLI (Passport)                | SaaS (ai_tools)           |
+-------------------------------+----------------------------+
| name                          | name                       |
| owner.team                    | vendor_name                |
| owner.contact                 | vendor_url                 |
| description                   | description                |
| compliance.eu_ai_act.purpose  | purpose                    |
| model.provider                | model_provider             |
| model.model_id                | model_id                   |
| model.data_residency          | data_residency             |
| framework                     | framework                  |
| autonomy_level                | autonomy_level (L1-L5 -->  |
|                               |   advisory/semi/autonomous)|
| compliance.complior_score     | complior_score             |
| lifecycle.status              | lifecycle_status           |
| compliance.eu_ai_act.risk_level| risk_level                |
| (full passport JSON)          | passport_data (JSONB)      |
| signature                     | sync_metadata.signature    |
+-------------------------------+----------------------------+

Conflict resolution:
  Технические поля (framework, model) --> CLI wins
  Организационные поля (purpose)      --> SaaS wins
  riskLevel --> SaaS wins (если уже классифицирован)
  wizardStep --> только повышение, never downgrade

Merge logic:
  EXISTS (по LOWER(name) + organizationId) --> UPDATE
  NOT EXISTS --> INSERT ai_tools (21 полей + sync_metadata)

Response: {action: 'created'|'updated', toolId, conflicts[]}
```

#### DF-15: Scan Results Sync

```
CLI --> POST /api/sync/scan
Body: {projectPath, score, findings[], toolsDetected[]}

Для каждого toolsDetected:
  EXISTS --> action: 'found', return toolId
  NOT EXISTS --> INSERT ai_tools {name, wizardStep: 1}

Response: {processed: N, tools: [{name, toolId, action}]}
```

#### DF-16: Document Sync

```
CLI --> POST /api/sync/documents
Body: {documents[]: {type, title, content, toolSlug}}  (max 20 per batch)

Для каждого документа:
  Tool found + doc exists     --> UPDATE (version++, metadata.source='cli')
  Tool found + no doc         --> INSERT {status: 'draft'}
  Tool not found              --> action: 'skipped'

Response: {synced, created, updated, results[]}
```

#### DF-17: FRIA Sync

```
CLI --> POST /api/sync/fria
Body: {toolSlug, assessmentId, date, sections: {6 типов}}

Секции: general_info, affected_persons, specific_risks,
        human_oversight, mitigation_measures, monitoring_plan

Merge strategy:
  Assessment in_progress/review --> SaaS wins (skip + conflict log)
  Assessment draft              --> merge (SaaS non-empty preserved)
  No assessment                 --> INSERT + 6 FRIASections

Response: {action: 'created'|'updated'|'skipped', assessmentId}
```

#### Data Bundle Fetch (SaaS --> CLI)

```
CLI --> GET /api/bundle (If-None-Match: {ETag})

200: {obligations[], registry_snapshot[], org_config}
304: Not Modified (данные не изменились)

Кэш: CLI хранит bundle в .complior/bundle.json + ETag
Содержит: 108 obligations, настройки организации, snapshot реестра
```

### 7.3. Agent Passport как мост между CLI и SaaS

```
CLI (Mode 1: Auto)                       SaaS (Mode 3: Manual)
+-----------------------+                +-----------------------+
| AST-анализ кода       |                | 5-step wizard         |
| Framework detection   |                | AI Registry pre-fill  |
| Permission scanner    |                | (5,011+ tools)        |
| Autonomy level L1-L5  |                | Manual attestation    |
| Ed25519 signed        |                | Vendor AI systems     |
| Confidence 85-95%     |                | (нет доступа к коду)  |
+-----------+-----------+                +-----------+-----------+
            |                                        |
            | POST /api/sync/passport                |
            +----------->-----------+                |
                                    |                |
                                    v                |
                       +------------+----------------+
                       |  F39: Agent Control Plane    |
                       |  (Единый реестр ALL AI)      |
                       |                             |
                       |  3 CLI agents (auto)         |
                       |  4 SaaS agents (manual)      |
                       |  = 7 AI-систем всего         |
                       |                             |
                       |  --> Gap Analysis (108 OBL)  |
                       |  --> FRIA Generator          |
                       |  --> Audit Package (F42)     |
                       |  --> Cert Readiness (F40)    |
                       +-----------------------------+
```

### 7.4. Маппинг обязательств CLI <-> SaaS

28 маппингов, обеспечивающих единую compliance-картину:

| Obligation | Статья | CLI Coverage | SaaS Coverage |
|-----------|--------|-------------|---------------|
| OBL-001 | Art. 4 (AI Literacy) | Scanner L1/L2: policy file | Training programs + completions |
| OBL-005 | Art. 11 (Tech Docs) | Scanner L1/L2: tech-doc presence | Document Management |
| OBL-008 | Art. 15 (Security) | Scanner L4: unsafe patterns | Compliance checks |
| OBL-009 | Art. 10/15 (Testing) | Scanner L3/L4: bias lib, CI/CD | Compliance checks |
| OBL-011 | Art. 26 (Deployer Use) | Scanner L1: monitoring-policy | Deployer Compliance |
| OBL-012 | Art. 26(7) (Workers) | Scanner L1: worker-notification | Worker notification docs |
| OBL-013 | Art. 27 (FRIA) | FRIA generator | FRIA wizard (6 sections) |
| OBL-014 | Art. 49 (EU Database) | Passport: eu_database_registered | Registration helper |
| OBL-015 | Art. 50(1) (Disclosure) | Scanner L4: bare API calls | Compliance checks |
| OBL-019 | Art. 47 (Conformity) | Scanner L1: declaration file | Document Management |
| OBL-021 | Art. 73 (Incident) | Scanner L1: incident-report | Incident tracking |

---

## 8. Инфраструктура

### 8.1. Docker Compose (6 сервисов)

```
+===========================================================================+
|  DOCKER COMPOSE STACK (SaaS Production)                                    |
+===========================================================================+
|                                                                           |
|  +-- caddy ----------+   +-- api -----------+   +-- dashboard --------+  |
|  | Reverse proxy      |   | Fastify 5        |   | Next.js 14          |  |
|  | TLS auto (Let's    |   | Port 3001        |   | Port 3000           |  |
|  |   Encrypt)         |   | Node.js 22       |   | Node.js 22          |  |
|  | HTTPS :443         |   | CommonJS         |   | App Router          |  |
|  | HTTP :80 (redirect)|   | MetaSQL + Zod    |   | SSR + Server Comp.  |  |
|  | HSTS, CSP headers  |   | pg-boss (in-proc)|   | TailwindCSS         |  |
|  +--------+-----------+   +--------+---------+   +--------+----------+  |
|           |                        |                       |              |
|           +--- proxy_pass ---------+--- proxy_pass --------+              |
|           |                        |                                      |
|           |                        v                                      |
|  +-- postgres --------+   +-- gotenberg ------+   +-- watchtower -----+  |
|  | PostgreSQL 16       |   | PDF generator     |   | Auto-update       |  |
|  | Hetzner Managed DB  |   | Port 3002         |   | Docker images     |  |
|  | Backups: daily      |   | Self-hosted       |   | Automated         |  |
|  | Read replicas: opt  |   | LibreOffice core  |   | Scheduled         |  |
|  | EU only (Germany)   |   | Chromium headless |   |                   |  |
|  +--------------------+   +------------------+   +-------------------+  |
|                                                                           |
+===========================================================================+

Caddy routing:
  app.complior.eu     --> dashboard:3000
  app.complior.eu/api --> api:3001

Docker networks:
  frontend  (caddy, dashboard)
  backend   (api, postgres, gotenberg, pg-boss)

Volumes:
  postgres_data     PostgreSQL data (Hetzner Managed)
  caddy_data        TLS certificates
  gotenberg_tmp     Temporary PDF files (auto-cleanup)
```

### 8.2. Hetzner Cloud EU

Вся инфраструктура расположена в EU (суверенные данные):

| Компонент | Провайдер | Страна | Назначение |
|-----------|----------|--------|-----------|
| **VPS Hosting** | Hetzner Cloud | Германия | API + Dashboard (Docker Compose) |
| **Managed Database** | Hetzner Managed PostgreSQL 16 | Германия | Основная БД, daily backups |
| **Object Storage** | Hetzner Object Storage (S3-compatible) | Германия | PDF, ZIP, файлы (Audit Package) |
| **GPU** (planned) | Hetzner GPU | Германия | Guard API (Mistral 7B fine-tuned) |

### 8.3. Внешние сервисы

| Сервис | Провайдер | Страна | Назначение | Data Residency |
|--------|----------|--------|-----------|---------------|
| **Auth** | WorkOS | Managed (SCC) | SSO/SAML, Magic Link, Device Flow | SCC compliant |
| **LLM** | Mistral API | Франция | 3 модели (Large/Medium/Small) | EU (France) |
| **Email** | Brevo | Франция | Транзакционные письма | EU (France) |
| **PDF** | Gotenberg | Self-hosted (Hetzner) | PDF-генерация из HTML/Markdown | EU (Germany) |
| **Billing** | Stripe | EU entity | Подписки, invoices, webhooks | EU |
| **Analytics** | Plausible | Эстония | Web-аналитика (privacy-first, no cookies) | EU (Estonia) |
| **Monitoring** | Better Uptime | Литва | Uptime monitoring, status page | EU (Lithuania) |

### 8.4. CI/CD (GitHub Actions)

```
+===========================================================================+
|  CI/CD PIPELINE (SaaS)                                                     |
+===========================================================================+
|                                                                           |
|  Push/PR --> .github/workflows/ci.yml                                     |
|  +---------------------------------------------------------------------+ |
|  |  1. Lint (ESLint, TypeScript check)                                  | |
|  |  2. Unit tests (Vitest)                                              | |
|  |  3. Integration tests (Vitest + test DB)                             | |
|  |  4. E2E tests (Playwright)                                           | |
|  |  5. Build check (Next.js build + Fastify build)                     | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  Merge to main --> .github/workflows/deploy.yml                          |
|  +---------------------------------------------------------------------+ |
|  |  1. docker build --target production (multi-stage)                   | |
|  |  2. docker push (Hetzner Container Registry)                        | |
|  |  3. SSH deploy to Hetzner VPS:                                       | |
|  |     a) docker compose pull                                           | |
|  |     b) docker compose up -d                                          | |
|  |     c) docker compose exec api node migrate.js                       | |
|  |  4. Health check: GET /api/health (retry 3x, 10s interval)          | |
|  |  5. Notify: Slack + Better Uptime                                    | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
|  Rollback:                                                                |
|  +---------------------------------------------------------------------+ |
|  |  Health check failed --> revert to previous image tag                | |
|  |  Manual: docker compose --env-file .env.rollback up -d              | |
|  +---------------------------------------------------------------------+ |
|                                                                           |
+===========================================================================+
```

---

## 9. Безопасность

### 9.1. Аутентификация (WorkOS)

| Метод | Где используется | Детали |
|-------|-----------------|--------|
| **WorkOS AuthKit** | Браузер (Dashboard) | SSO/SAML, Magic Link, Email+Password |
| **Device Flow** | CLI (complior login) | OAuth 2.0 Device Authorization Grant (RFC 8628) |
| **API Keys** | CLI (programmatic) | `cpl_...` prefix, org-scoped, key stored hashed |
| **JWT** | Все API запросы | Access token (1h), Refresh token (30d) |

WorkOS преимущества:
- Managed SSO/SAML (для Enterprise)
- Нет самостоятельного управления паролями
- SCC-совместимость (Standard Contractual Clauses)
- Миграция с Ory Kratos выполнена

### 9.2. Авторизация

```
Каждый API запрос:
  Authorization: Bearer {JWT}
      |
      v
  resolveApiAuth(headers):
      +-- Декодирование JWT
      +-- Проверка expiration
      +-- Извлечение: userId, organizationId
      +-- Organization membership check
      +-- Role check (owner / admin / member)
      |
      v
  Plan enforcement:
      +-- Starter:    3 AI tools, 1 user, no LLM
      +-- Growth:     unlimited tools, 10 users, 50 LLM/мес
      +-- Enterprise: unlimited tools/users, unlimited LLM
      |
      v
  Rate limiting:
      +-- 100 req/min per API key
      +-- 10 sync/min per organization
      +-- 1000 req/day per Starter tier
```

### 9.3. Row-Level Security (RLS)

Все данные организационно изолированы:

```sql
-- Каждая таблица с данными организации имеет organization_id
-- Каждый запрос фильтруется по organizationId из JWT

-- Пример MetaSQL:
SELECT * FROM ai_tools
WHERE organization_id = :organizationId   -- из JWT, не из тела запроса
  AND deleted_at IS NULL;

-- Мягкое удаление (soft delete):
UPDATE ai_tools SET deleted_at = NOW()
WHERE id = :toolId AND organization_id = :organizationId;
```

Принципы:
1. `organizationId` всегда из JWT (никогда из body/params)
2. Soft delete (`deleted_at`) для audit trail
3. Все JOIN-ы проверяют `organization_id` match

### 9.4. GDPR Compliance

| Требование | Реализация |
|-----------|-----------|
| **Data Residency** | Все данные в EU (Hetzner Germany, Mistral France, Brevo France) |
| **Нет US transfer** | Нет AWS/GCP/Azure; WorkOS через SCC; Stripe EU entity |
| **Right to erasure** | `DELETE /api/admin/org/:id` -- каскадное удаление всех данных организации |
| **Data portability** | `GET /api/admin/export` -- JSON export всех данных организации |
| **Consent** | CLI telemetry: opt-in only; Analytics: Plausible (no cookies) |
| **DPA** | WorkOS DPA, Mistral DPA, Stripe DPA, Brevo DPA -- все подписаны |
| **Community Evidence** | k-anonymity (N >= 10), opt-out доступен, nightly batch (не realtime) |
| **CLI telemetry** | SHA-256 hashing, no PII, no file names, no code |

### 9.5. Безопасность API

```
+===========================================================================+
|  API SECURITY LAYERS                                                       |
+===========================================================================+
|                                                                           |
|  1. TLS (Caddy):                                                         |
|     +-- HTTPS :443 (Let's Encrypt auto-renew)                           |
|     +-- HSTS: max-age=31536000; includeSubDomains                       |
|     +-- CSP: Content-Security-Policy                                     |
|                                                                           |
|  2. CORS:                                                                 |
|     +-- Origin: app.complior.eu (only)                                   |
|     +-- Methods: GET, POST, PUT, DELETE                                  |
|     +-- Credentials: true                                                |
|                                                                           |
|  3. Input Validation (Zod):                                               |
|     +-- Strict schema validation на каждом boundary                     |
|     +-- Отклонение unknown fields (.strict())                           |
|     +-- Type coercion disabled                                           |
|                                                                           |
|  4. SQL Injection Protection:                                             |
|     +-- MetaSQL parameterized queries (нет ORM, нет string concat)      |
|     +-- VM Sandbox isolation                                             |
|                                                                           |
|  5. Rate Limiting:                                                        |
|     +-- 100 req/min per API key                                         |
|     +-- 10 sync/min per organization                                    |
|     +-- 1000 req/day per Starter tier                                   |
|                                                                           |
|  6. Secrets:                                                              |
|     +-- .env (gitignored): WORKOS_SECRET, STRIPE_SECRET, MISTRAL_KEY   |
|     +-- API keys stored: bcrypt hash only (cpl_... prefix visible)      |
|     +-- JWT: RS256 signed, short-lived (1h)                             |
|                                                                           |
+===========================================================================+
```

---

## 10. Guard API (PLANNED)

Guard API -- планируемый микросервис для классификации контента, развёрнутый на GPU-серверах Hetzner в EU.

```
+===========================================================================+
|  GUARD API (PLANNED)                                                       |
+===========================================================================+
|                                                                           |
|  Модель: Mistral 7B, fine-tuned на EU AI Act данных                     |
|  Инфраструктура: Hetzner GPU (EU, sovereign data)                       |
|  Транспорт: REST API (JSON)                                             |
|  Задержка: <200ms (целевая)                                             |
|                                                                           |
|  5 задач классификации:                                                  |
|  +------------------------------------------------------------------+   |
|  | 1. Risk Classification                                            |   |
|  |    Input: описание AI-системы                                    |   |
|  |    Output: prohibited / high / limited / minimal + confidence     |   |
|  |                                                                    |   |
|  | 2. Article Mapping                                                |   |
|  |    Input: описание use case                                      |   |
|  |    Output: applicable_articles[]                                  |   |
|  |                                                                    |   |
|  | 3. Obligation Gap Analysis                                        |   |
|  |    Input: passport + scan results                                |   |
|  |    Output: gaps[], recommendations[]                              |   |
|  |                                                                    |   |
|  | 4. Content Compliance Check                                       |   |
|  |    Input: text content (disclosure, policy)                      |   |
|  |    Output: compliant / non-compliant + reasons                    |   |
|  |                                                                    |   |
|  | 5. Document Quality Assessment                                    |   |
|  |    Input: compliance document                                    |   |
|  |    Output: quality_score, missing_sections[]                      |   |
|  +------------------------------------------------------------------+   |
|                                                                           |
|  Интеграция:                                                             |
|    SaaS Backend --> POST /guard/classify --> Guard API                   |
|    CLI Engine   --> POST /guard/classify --> Guard API (Pro only)        |
|                                                                           |
|  Доступность: Enterprise тариф (EUR 499/мес, unlimited)                 |
|  Данные НЕ покидают EU (Hetzner GPU, Германия)                          |
|                                                                           |
+===========================================================================+
```

---

## Приложение A: Performance Budget (SaaS)

| Операция | Бюджет | Примечание |
|----------|--------|-----------|
| Dashboard page load (SSR) | <1s | Server Components, CDN static |
| API response (CRUD) | <200ms | MetaSQL, connection pooling |
| Passport sync | <2s | HTTP POST + merge logic |
| Scan sync | <3s | Bulk insert + tool matching |
| FRIA generation (LLM) | <8s | Mistral Medium, streaming |
| Audit Package (ZIP) | <30s | pg-boss async job |
| PDF generation (Gotenberg) | <10s | pg-boss async job |
| AI classification (Mistral) | <2s | Mistral Small 3.1 |
| Device Flow complete | <30s | Polling 5s interval |
| Bundle fetch (ETag cache) | <100ms | 304 Not Modified |

## Приложение B: Полная таблица API (SaaS)

| Группа | Метод | Путь | Описание |
|--------|-------|------|---------|
| **Auth** | POST | `/api/auth/device` | Инициация Device Flow |
| | POST | `/api/auth/device-confirm` | Подтверждение из браузера |
| | POST | `/api/auth/token` | Обмен deviceCode на JWT |
| | POST | `/api/auth/refresh` | Обновление access token |
| | GET | `/api/auth/session` | Текущая сессия |
| | POST | `/api/auth/logout` | Завершение сессии |
| **Tools** | GET | `/api/tools` | Список AI-систем организации |
| | POST | `/api/tools` | Создать AI-систему |
| | GET | `/api/tools/:id` | Детали AI-системы |
| | PUT | `/api/tools/:id` | Обновить AI-систему |
| | DELETE | `/api/tools/:id` | Удалить (soft delete) |
| | PUT | `/api/tools/:id/wizard` | Обновить шаг wizard |
| | POST | `/api/tools/:id/classify` | Классифицировать риск (LLM) |
| **Sync** | POST | `/api/sync/passport` | Passport sync (CLI -> SaaS) |
| | POST | `/api/sync/scan` | Scan results sync |
| | POST | `/api/sync/documents` | Document sync (batch) |
| | POST | `/api/sync/fria` | FRIA sync |
| | GET | `/api/bundle` | Data bundle (SaaS -> CLI, ETag) |
| **FRIA** | GET | `/api/fria` | Список FRIA assessments |
| | POST | `/api/fria` | Создать FRIA assessment |
| | GET | `/api/fria/:id` | Детали assessment |
| | PUT | `/api/fria/:id/sections/:type` | Обновить секцию |
| | POST | `/api/fria/:id/submit` | Завершить assessment |
| **Compliance** | GET | `/api/compliance` | Список документов |
| | POST | `/api/compliance` | Создать документ |
| | GET | `/api/compliance/:id` | Детали документа |
| | PUT | `/api/compliance/:id` | Обновить документ |
| | GET | `/api/compliance/:id/versions` | История версий |
| **Registry** | GET | `/api/registry/tools` | Поиск AI tools (5,011+) |
| | GET | `/api/registry/tools/:slug` | Tool card |
| | GET | `/api/registry/tools/:slug/scores` | Risk scores |
| **Billing** | GET | `/api/billing/subscription` | Текущая подписка |
| | POST | `/api/billing/checkout` | Stripe Checkout session |
| | POST | `/api/billing/webhook` | Stripe webhook handler |
| | GET | `/api/billing/invoices` | Список счётов |
| **Audit** | POST | `/api/audit/package` | Генерация Audit Package |
| | GET | `/api/audit/package/:id` | Статус генерации |
| | GET | `/api/audit/package/:id/download` | Скачать ZIP |
| | GET | `/api/audit/logs` | Audit log |
| **Admin** | GET | `/api/admin/org` | Данные организации |
| | PUT | `/api/admin/org` | Обновить организацию |
| | GET | `/api/admin/members` | Члены организации |
| | POST | `/api/admin/invite` | Пригласить участника |
| | GET | `/api/admin/export` | GDPR export (JSON) |

---

> **Полная архитектура платформы** (Engine, CLI/TUI, SDK, MCP Server, Guard API): см. `~/complior/docs/v9/ARCHITECTURE.md`

---

**Обновлено:** 2026-03-06
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
