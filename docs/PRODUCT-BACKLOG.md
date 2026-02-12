# PRODUCT-BACKLOG.md — AI Act Compliance Platform (Deployer-First)

**Версия:** 3.5.0
**Дата:** 2026-02-12
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ✅ Утверждено PO (2026-02-10)
**Зависимости:** PRODUCT-VISION.md v2.1 ✅

---

## Changelog

### v3.5.0 (2026-02-12) — Sprint 3.5 Additions
- **Feature 02:** Registration is now plan-aware (Sprint 3.5). URL params `?plan=` and `?period=` route users through free or paid (Stripe Checkout) flows.
- **Feature 09:** Partial scope (Stripe Checkout + Webhook) moved to Sprint 3.5. Full billing management (portal, invoices, plan changes) remains Sprint 5-6.
- **Feature 23:** Quick Check + Penalty Calculator moved to Sprint 3.5 scope. Free Classification stays Sprint 5.
- **Roadmap:** Added Sprint 3.5 between Sprint 3 and Sprint 4.

### v3.4.0 (2026-02-12) — Sprint 3 Additions (6 Proposals)
- **Pricing v3.0:** Free=1 tool/no Eva, Starter=5/200msg, Growth=20/1000msg, Scale=unlimited. Annual 20%, 14-day trial. Source: `app/config/plans.js`
- **Feature 06 (Eva):** Eva Guard — 3-level protection (system prompt + Mistral Small 3.1 pre-filter + output monitoring). Eva message limits per plan.
- **Feature 09 (Billing):** 14-day trial (card required), annual toggle (20% discount), Stripe trial_period
- **Feature 18 (AI Literacy):** Content: English-first (default), DE + FR post-MVP
- **NEW Feature 21:** Provider-Lite Wizard (P2, Sprint 7-8)
- **NEW Feature 22:** Compliance Checklist Generator (P2, Sprint 7+)
- **NEW Feature 23:** Free Lead Generation Tools (P1, Sprint 5)
- **Catalog:** +20 API platform tools (`api_platform` category)

### v3.3.0 (2026-02-12) — AI Act Roles + Use Case Model
- **Feature 03:** AITool = Use Case (Anwendungsfall), не программный продукт. Новые wizard-поля: `useCaseDetails`, `decisionImpact`, `deploymentDate`, `employeesInformed` (Art. 26)
- **Feature 02:** Organization получает `aiActRoles` (provider, deployer, distributor, importer)
- **Plan Limits:** Source of truth вынесен в `app/config/plans.js`

### v3.2.0 (2026-02-12) — Sprint 2.5: Invite Flow + Team Management + Enforcement
- **Feature 02:** Расширена секциями Invite Flow, Team Management, Subscription Enforcement
- **Feature 09:** Добавлена note про enforcement infrastructure из Sprint 2.5
- **Roadmap:** Вставлен Sprint 2.5 между Sprint 2 и Sprint 3
- **P0 Summary:** Обновлён Feature 02 спринт "1 + 2.5"
- **Plan Limits:** Обновлены: free=5 tools, starter=15/3users, growth=25/10users, scale=100/50users, eva=-1 everywhere

### v3.1.0 (2026-02-11) — Eva Pivot + Sprint 3 Planning
- **Feature 04b:** LLM Cross-validation removed → Classification History + Reclassification
- **Feature 06:** Eva переосмыслена как conversational onboarding (discovery + registration через диалог)
- **Feature 03:** Добавлен блок EU-Compliant Alternatives (из DESIGN-BRIEF v2.2.0)
- **Roadmap:** Sprint 3 = Requirements + Dashboard + History APIs; Sprint 4 = Eva

### v3.0.0 (2026-02-08) — Deployer-First Pivot
- **Pivot:** universal → deployer-first (компании, которые ИСПОЛЬЗУЮТ AI)
- **Новые фичи:** Feature 18 (AI Literacy), Feature 19 (FRIA Generator), Feature 20 (KI-Compliance Siegel)
- **Переименования:** Feature 03 → AI Tool Inventory, Feature 07 → Deployer Doc Generation
- **Все фичи** перефокусированы на deployer context (Art. 4, 26-27, 50)
- **Provider features** → P3 Future (отдельный блок)
- **Shadow AI Auto-Discovery** → Feature 16 (P3, EU-sovereign)

---

## Как читать этот документ

**Product Backlog** — это ЧТО делает продукт (фичи, бизнес-уровень).

| | Product Backlog (этот документ) | Sprint Backlog (отдельный) |
|--|--------------------------------|---------------------------|
| **Уровень** | Фичи / Эпики | User Stories |
| **Вопрос** | ЧТО делает продукт? | КАК это реализовать? |
| **Когда** | Phase 0, дополняется | Sprint Planning |
| **Кем** | Marcus → PO approval | Marcus декомпозирует фичи → US |
| **Связь** | 1 фича → 5-10 user stories | US-NNN → Feature-NNN |

### Приоритеты

| Приоритет | Значение | Спринты |
|-----------|----------|---------|
| **P0** | Must Have — без этого продукт не запустится | Sprint 0-4 |
| **P1** | Should Have — значительно повышает ценность | Sprint 4-6 |
| **P2** | Could Have — расширение, post-MVP | Sprint 7-8 |
| **P3** | Future — post-launch, требует отдельного решения | Post-launch |

### Размер фичи

| Размер | Объём | Примерно |
|--------|-------|----------|
| **S** | 1-2 спринта, 1-2 разработчика | 10-20 SP |
| **M** | 2-3 спринта, 1-2 разработчика | 20-35 SP |
| **L** | 3-4 спринта, 2+ разработчика | 35-50 SP |

---

## Feature 01: Инфраструктура и настройка проекта

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 0

### Бизнес-ценность
Техническая основа для всей разработки.

### Описание
- Monorepo: `server/` (HTTP runtime) + `app/` (business logic, VM-sandboxed) + `frontend/` (Next.js 14)
- Backend из existing-code: Fastify + MetaSQL + VM Sandbox
- Все таблицы из DATABASE.md как MetaSQL schemas + миграции
- Библиотека ошибок AppError + structured logging (pino)
- GitHub Actions CI: lint, type-check, tests, `npm audit`
- Docker Compose: app + PostgreSQL + Ory + Gotenberg (dev environment)
- Hetzner Object Storage (S3) — настройка bucket
- @fastify/rate-limit — подключение plugin
- Plausible — подключение скрипта аналитики
- Better Uptime — настройка мониторинга endpoint

### MVP Scope
- Полная DB-схема с seed data (deployer requirements, AI Tool Catalog, pricing plans, training courses)
- Docker Compose с Ory и Gotenberg
- CI pipeline рабочий с первого дня
- pg-boss НЕ нужен на Sprint 0 — подключается в Sprint 4 (Feature 07)

### Зависимости
Нет (базовая фича)

---

## Feature 02: IAM — Аутентификация и управление пользователями

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 1 + 2.5 + 3.5

### Бизнес-ценность
As a CTO компании, работающей с EU-клиентами, I want to register, login and manage my team's access, so that we can securely use the compliance platform.

### Описание
- **Ory (self-hosted, Hetzner EU):** регистрация, login, magic links, password, sessions, MFA
- **Brevo (Франция):** transactional email для magic links и verification emails
- Ory webhook → наш API → создание Organization + User (sync) + Role(owner) + Subscription(free)
- RBAC: Permission table (role + resource + action) — наша таблица поверх Ory identity
- Multi-tenancy: ВСЕ запросы фильтруются по organizationId
- **AI Act Roles:** Organization.aiActRoles — 4 роли по AI Act (Art. 3): provider, deployer, distributor, importer. Default: ["deployer"]. Одна организация может иметь несколько ролей. Выбирается при регистрации (Step 2 onboarding). Влияет на отображаемые obligations и requirements.
- AuditLog: запись каждого auth-события (Ory webhook → AuditLog)

> **Note (Sprint 3.5):** Registration is now plan-aware. URL params `?plan=` and `?period=` determine the flow: free plan → 2-step (Account → Company → Dashboard), paid plans → 3-step (Account → Company → Trial Confirmation → Stripe Checkout redirect → `/checkout/success`). See DESIGN-BRIEF Screen 03 + Screen 22.

### Invite Flow (Sprint 2.5)
- **Invite API:** Owner/Admin приглашает сотрудника по email → POST `/api/team/invite`
- **Accept Flow:** Invitee получает email → регистрируется через Ory → webhook проверяет pending invitation → присоединяется к СУЩЕСТВУЮЩЕЙ организации (не создаёт новую) → получает роль из invitation
- **Existing User:** Уже зарегистрированный пользователь принимает invite → transfer в новую org
- **Token:** UUID, expires 7 дней, revocable
- **Roles:** admin, member, viewer (назначается при приглашении)

### Team Management (Sprint 2.5)
- **List Members:** Owner/Admin видит всех участников + pending приглашения + plan limits
- **Change Role:** Owner/Admin меняет роль участника (admin/member/viewer). Нельзя менять свою роль. Нельзя изменить owner'а
- **Remove Member:** Owner/Admin деактивирует участника (active: false)
- **Revoke/Resend Invite:** Отмена или повторная отправка pending приглашения
- **Admin Upgrade:** Admin получает User.manage + Invitation.manage + Organization.read (но НЕ Organization.manage, НЕ Subscription.manage)

### Subscription Enforcement (Sprint 2.5)
- **maxUsers:** проверяется при создании invitation (currentUsers + pendingInvites >= maxUsers → 403)
- **maxTools:** проверяется при регистрации AI-инструмента (currentTools >= maxTools → 403)
- **SubscriptionLimitChecker:** чистый domain service (без I/O), -1 = unlimited, 0 = blocked
- **PlanLimitError:** новый класс ошибки (403 PLAN_LIMIT_EXCEEDED + limitType, current, max)

### Тарифные лимиты

> **Source of truth:** `app/config/plans.js` (Pricing v3.0). Краткий обзор:

| Plan | maxTools | maxUsers | maxEmployees | Eva (msg/мес) |
|------|---------|---------|-------------|-------------|
| free | 1 | 1 | 0 | 0 (нет) |
| starter | 5 | 2 | 15 | 200 |
| growth | 20 | 10 | 50 | 1,000 |
| scale | -1 (unlimited) | -1 | 250 | -1 (unlimited) |
| enterprise | -1 | -1 | -1 | -1 (unlimited) |

### MVP Scope
- Ory setup в Docker Compose + Brevo SMTP integration
- Регистрация с email + magic link (Ory code method)
- Ory webhook → User sync + Organization creation
- Базовые роли: Owner, Admin, Member, Viewer
- Multi-tenancy изоляция
- Invite flow + team management + subscription enforcement (Sprint 2.5)

### Зависимости
Feature 01 (инфраструктура)

---

## Feature 03: AI Tool Inventory — Реестр Use Cases AI-инструментов

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 1-2

### Бизнес-ценность
As an IT manager, I want a centralized inventory of all AI tool use cases our company has, so that I can assess compliance risks for each use case.

> **Ключевая концепция:** AITool ≠ программный продукт. AITool = конкретный **use case (Anwendungsfall)** применения AI-системы в организации. Один программный продукт (напр. ChatGPT) может порождать несколько AITool записей, если используется в разных контекстах с разными целями и затронутыми лицами. Это соответствует Art. 26 AI Act, где обязанности deployer'а привязаны к конкретному применению, а не к продукту.

### Описание

**Реестр (ГЛАВНАЯ рабочая страница продукта):**
- Таблица/карточки всех AI-инструментов организации:

| Колонка | Описание |
|---------|----------|
| Название | Имя AI-инструмента + vendor (ChatGPT / OpenAI) |
| Домен | HR, медицина, финансы, образование... (Annex III) |
| Risk Level | 🔴 Prohibited · 🟠 High Risk · 🟡 Limited · 🟢 Minimal |
| Статус | Черновик → Классифицирован → В работе → Compliant → Мониторинг |
| Compliance % | Progress bar |
| AI Literacy | Связанные сотрудники обучены? ✅/❌ |
| Actions | Classify, Details, FRIA, Eva |

- Фильтры по risk level, статусу, домену
- Поиск по названию/vendor

**AI Tool Catalog (seed data):**
- 200+ предзаполненных AI-инструментов с дефолтными данными:
  - ChatGPT, Claude, Copilot, Jasper, Copy.ai — general purpose
  - HireVue, Textio, Pymetrics — HR (high-risk по Annex III п.4)
  - Ada Health, Babylon — медицина (high-risk)
  - Grammarly, DeepL — limited risk
- Пользователь выбирает из каталога или добавляет свой

**Multi-user Tool Registration (employee self-service):**
- Настройка в Organization Settings: `allowEmployeeRegistration: true/false`
- Когда включено: любой сотрудник организации может регистрировать AI-инструменты
- Approval workflow: employee submits → manager/IT reviews → approved → inventory
- Поле `registeredBy` (= `createdById`) показывает, кто зарегистрировал инструмент
- Поле `approvalStatus`: `pending_approval` / `approved` / `rejected`
- Admin/Owner всегда может регистрировать без approval

**5-step Wizard** (XState) для регистрации use case:
1. **AI-инструмент** — выбор из каталога или ввод вручную (название, vendor, описание)
2. **Use Case** — цель использования (`purpose`), детали use case (`useCaseDetails`), **домен Annex III**, влияние на решения (`decisionImpact`), дата начала использования (`deploymentDate`)
3. **Данные и пользователи** — персональные данные, **уязвимые группы?**, кто затронут, **уведомлены ли сотрудники** (`employeesInformed`, Art. 26(7))
4. **Автономность и контроль** — уровень автономности, human oversight, **safety component?**
5. **Обзор и классификация** — summary → trigger classification

- Auto-save на каждом шаге
- CSV import: IT-отдел выгружает список SaaS-приложений
- CRUD API (`/api/tools`) с multi-tenancy

**EU-Compliant Alternatives (из DESIGN-BRIEF v2.2.0):**
- Для high-risk / prohibited инструментов — блок альтернатив на Tool Detail
- Каталог фильтруется по domain + maxRisk → предлагает инструменты с более низким уровнем риска
- API: `GET /api/tools/catalog/search?domain={domain}&maxRisk=limited`
- Маппинг maxRisk: high → high+gpai+limited+minimal, limited → limited+minimal, minimal → только minimal

### MVP Scope
- Полная страница реестра с risk level badges
- Wizard с deployer-focused вопросами
- AI Tool Catalog (seed: 200+ инструментов)
- CSV import для массового добавления
- Lifecycle статусы (5 состояний)
- EU-Compliant Alternatives для high-risk/prohibited инструментов
- Responsive, WCAG AA

### Зависимости
Feature 02 (IAM)

---

## Feature 18: AI Literacy Module — Обучение сотрудников (Art. 4)

**Приоритет:** P2 (Could Have) | **Размер:** L | **Спринт:** 8+ (after Full Scope)

### Бизнес-ценность
As an HR director, I want to ensure all employees complete AI literacy training, so that our company complies with Art. 4 AI Act (already mandatory since Feb 2, 2025).

**⚠️ WEDGE PRODUCT** — это standalone продукт за €49/мес. Art. 4 уже обязателен. 70% сотрудников не обучены.

### Описание

**Обучающий контент (собственный, English-first, DE + FR post-MVP):**
- 4 role-based курса:

| Курс | Для кого | Модулей | Длительность |
|------|----------|---------|-------------|
| **Executive** | CEO, CTO, руководство | 3 | ~20 мин |
| **HR Manager** | HR, рекрутеры | 4 | ~30 мин |
| **Developer** | Разработчики, IT | 5 | ~40 мин |
| **General** | Все сотрудники | 3 | ~15 мин |

- Каждый модуль: текст + примеры + quiz (5-10 вопросов)
- Темы: что такое AI Act, deployer obligations, prohibited practices, transparency, риски shadow AI
- Контент валидируется Elena (AI Act expert agent)

**Employee Management:**
- Импорт списка сотрудников: CSV (name, email, department, role)
- Назначение курсов по ролям (автоматическое или ручное)
- Email-приглашение сотрудникам (Brevo)
- Tracking: статус per employee (not started / in progress / completed / overdue)

**Compliance Tracking:**
- Dashboard widget: "X% сотрудников обучены"
- Per-department breakdown
- Overdue alerts: "5 сотрудников не прошли обучение за 30 дней"
- Compliance certificate per employee (PDF через Gotenberg)
- Organization-level certificate: "100% сотрудников обучены по Art. 4"

### MVP Scope
- 4 курса на немецком (контент создаётся при разработке)
- Employee import (CSV)
- Course assignment + email invitation
- Completion tracking + quiz scoring
- PDF certificates (employee + organization level)
- Dashboard widget

### Зависимости
Feature 01 (infrastructure), Feature 02 (IAM — нужны users)

### Экспертиза
Elena: валидация контента курсов на соответствие Art. 4

---

## Feature 04a: Rule Engine — Rule-based классификация (Deployer Context)

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 2

### Бизнес-ценность
As a CTO, I want my AI tools classified by risk level from a deployer perspective, so that I know my obligations under Art. 26-27.

### Описание

**Чистый Domain Service (RuleEngine)** — deployer-focused:

1. **Art. 5 check** — prohibited practices (социальный скоринг, real-time biometrics)
2. **Annex III check** — 8 доменов high-risk (biometrics, HR, education, law enforcement...)
3. **Safety component check** — Annex I harmonisation legislation
4. **Контекст использования** — тот же инструмент может быть high-risk или minimal в зависимости от ТОГО, КАК deployer его использует

**Deployer-specific classification:**

| Risk Level | Badge | Deployer обязанности |
|-----------|-------|---------------------|
| **Prohibited** (Art. 5) | 🔴 | WARNING: прекратить использование |
| **High Risk** (Annex III) | 🟠 | Art. 4 (literacy) + Art. 26 (17 обязанностей) + Art. 27 (FRIA) + Art. 50 |
| **Limited Risk** (Art. 50) | 🟡 | Art. 4 + transparency к пользователям |
| **Minimal Risk** | 🟢 | Art. 4 (только literacy) |

Output: riskLevel, deployerRequirements[], confidence, matchedRules[], articleReferences[]

### MVP Scope
- RuleEngine в domain/classification/services/ (pure, 100% тестируемый)
- Art. 5, Annex III rules (deployer context)
- Deployer requirements mapping (Art. 4, 26, 27, 50)
- Экран результата: risk level badge, deployer обязанности, статьи

### Зависимости
Feature 03 (wizard предоставляет данные)

### Экспертиза
Elena: валидация правил, маппинг deployer-статей AI Act

---

## Feature 04b: Classification History + Reclassification

**Приоритет:** P0 (Must Have) | **Размер:** S | **Спринт:** 3

### Бизнес-ценность
As a CTO, I want to see the full classification history of my AI tools and reclassify when context changes, so that I can track risk evolution and maintain compliance.

### Описание

**Решение PO:** RuleEngine (Feature 04a) достаточен для детерминированной классификации (34 теста, все 5 risk paths). LLM-валидация не нужна для классификации.

**Classification History (ClassificationLog):**
- Текущая классификация с полным reasoning: ruleResult, метод, обоснование, ссылки на статьи
- Список всех предыдущих классификаций: версия, дата, метод, уровень риска, confidence, кто классифицировал
- History отсортирована от новых к старым (version DESC)

**Reclassification workflow:**
- Контекст использования изменился → deployer запускает переклассификацию
- Новый riskLevel → обновление requirements → обновление complianceScore

### MVP Scope
- Classification history API (`GET /api/tools/:id/classification-history`)
- Reclassification trigger (уже существует: `POST /api/tools/:id/classify`)
- Версионирование классификаций (RiskClassification.version)

### Зависимости
Feature 04a (RuleEngine), Feature 03 (wizard data)

---

## Feature 04c: Deployer Requirements Mapping + рекомендации

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 3

### Бизнес-ценность
As a CTO, I want to know ALL my deployer obligations with specific recommendations, so that I have a clear action plan.

### Описание

**Deployer requirements mapping:**
- riskLevel + domain + usage context → applicable deployer Articles
- **High Risk deployer:** Art. 4, 26 (17 обязанностей), 27 (FRIA), 50
- **Limited Risk deployer:** Art. 4, 50 (transparency)
- **Minimal Risk deployer:** Art. 4 (только AI Literacy)

**17 обязанностей deployer high-risk (Art. 26):**
1. Использование по инструкции provider
2. Human oversight — назначить ответственных
3. Качество входных данных
4. Мониторинг работы AI
5. Логирование (хранить 6+ мес)
6. Информирование сотрудников о использовании AI
7. DPIA (если персональные данные)
8. Информирование затронутых лиц
9. Приостановка при рисках
10. Отчёт о серьёзных инцидентах
11. Сотрудничество с надзорными органами
... + 6 дополнительных

**Рекомендации "Что делать?":**
- Per requirement: конкретные шаги
- Estimated effort
- Приоритет (urgency × impact)

### MVP Scope
- Requirements mapping по risk levels (deployer perspective)
- Recommendations per requirement
- Экран: requirements checklist + рекомендации per gap

### Зависимости
Feature 04a/b (classification результат)

### Экспертиза
Elena: deployer requirements mapping, тексты рекомендаций

---

## Feature 05: Deployer Compliance Dashboard

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 3 (backend API) + 5+ (frontend)

### Бизнес-ценность
As a CEO, I want a visual overview of all AI tools, employee training status, and compliance progress, so that I can make decisions and report to the board.

### Описание

**AI Tool Risk Distribution (центральный виджет):**
- Color-coded диаграмма по ВСЕМ AI-инструментам:
  🔴 Prohibited (X) · 🟠 High Risk (X) · 🟡 Limited (X) · 🟢 Minimal (X)
- Click по сегменту → фильтрация реестра (Feature 03)

**AI Literacy Progress:**
- Circular progress: "78% сотрудников обучены"
- Per-department breakdown
- "5 сотрудников overdue" → deep link

**Compliance Score** (aggregate) — 0-100%

**"Требует внимания"** — приоритизированный список:
- 🔴 Prohibited AI tools → "СТОП: запрещённый AI-инструмент"
- 🟠 High-risk без FRIA → "FRIA required for [tool]"
- 📚 Сотрудники без обучения → "5 employees overdue"
- ⏰ Approaching deadlines
- 🔄 Regulatory changes

**Compliance Timeline** — дедлайны AI Act (Art. 113):
- ~~Feb 2, 2025: AI Literacy (Art. 4)~~ — уже в силе
- ~~Aug 2, 2025: Prohibited practices (Art. 5)~~ — уже в силе
- **Aug 2, 2026: High-risk deployer requirements** ← основной дедлайн

**Детальная страница AI-инструмента:**
- Classification: risk level, reasoning, статьи
- Deployer requirements checklist (✅ / 🔄 / ❌)
- Connected employees (AI Literacy status)
- FRIA status (if high-risk)
- Audit Trail

### MVP Scope
- Risk distribution chart
- AI Literacy progress widget
- "Requires attention" панель
- Compliance timeline
- Детальная страница AI-инструмента
- Responsive grid

### Зависимости
Feature 03 (реестр), Feature 04a/b/c (classification), Feature 18 (AI Literacy)

---

## Feature 06: Eva — Conversational AI Onboarding

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 4

### Бизнес-ценность
As a CTO, I want an AI assistant that helps me discover and register all AI tools my company uses through a conversation, so that I don't miss any tools and get guided through compliance from day one.

### Описание

**Решение PO:** Eva — не просто Q&A чат, а **альтернативный способ регистрации AI-инструментов через диалог**. Eva — интерактивный помощник для conversational onboarding.

**Conversational Onboarding (основная функция):**
- Eva проактивно спрашивает: "Какие AI-инструменты использует ваша компания?", "В каком домене вы их применяете?"
- Eva помогает обнаружить инструменты, о которых deployer мог забыть (shadow AI discovery через диалог)
- Eva автоматически заполняет wizard на основе ответов пользователя → создаёт draft AI Tool
- После заполнения: предлагает классифицировать

**Deployer Q&A (вторичная функция):**
- Ответы на вопросы по deployer obligations в plain language
- Quick actions: "Что мне делать как deployer?", "Нужен ли FRIA?", "Как обучить сотрудников?"
- Цитирование статей AI Act
- Disclaimer: «не является юридической консультацией»

**Архитектура:**
- **Vercel AI SDK 6** — framework для streaming chat ([ADR-005](ADR-005-vercel-ai-sdk.md)):
  - Backend: `streamText()` на Fastify с Mistral Large 3 API (EU)
  - Frontend: `useChat()` hook в Next.js — SSE streaming, zero boilerplate
  - Provider: `@ai-sdk/mistral` (model-agnostic — можно переключить на Claude/GPT без изменений кода)
- **RAG по EU AI Act** — контекстные ответы на основе knowledge base (pgvector)
- Context injection: AI-инструменты компании, risk levels, compliance status
- Rate limiting по плану

### Eva Guard — 3-Level Protection

Без защиты Eva = бесплатный ChatGPT за наш счёт. 3-уровневая система:

**Level 1: System Prompt (topic scope)**
- Scope: EU AI Act, deployer obligations, company AI tools, compliance status
- Refuse patterns: code generation, creative writing, personal questions, non-EU-regulation topics
- Redirect template: "I can only help with AI Act compliance. Try asking about your AI tools or deployer obligations."

**Level 2: Pre-filter — Mistral Small 3.1**
- Каждое пользовательское сообщение → Mistral Small 3.1 → `ON_TOPIC` / `OFF_TOPIC` classification
- ON_TOPIC → forward to Mistral Large 3 (standard Eva flow)
- OFF_TOPIC → canned response (skip Large = save cost), no token consumption
- Cost: ~$0.00001/check (negligible, $0.03/1M input tokens)

**Level 3: Output Monitoring**
- Логирование всех Eva interactions (topic classification, token count, response quality)
- Weekly sampling: 5% случайных разговоров для ревью качества
- Off-topic cooldown: 3 strikes → 5-min cooldown на Eva для пользователя
- Metrics: on-topic rate, avg tokens per conversation, off-topic patterns

**Cost comparison (1000 клиентов, 500 msg/day):**

| Без Guard | С Guard |
|-----------|---------|
| All 500 → Large ($2.50/day) | 450 on-topic → Large ($2.25) + 50 off-topic → Small ($0.001) |
| $75/мес | $67.53/мес (10% savings + quality protection) |

### Eva Message Limits

| Plan | Eva Messages/мес | При исчерпании |
|------|:---:|---|
| Free | 0 | Eva недоступна. CTA: "Upgrade to Starter" |
| Starter | 200 | Сообщение: "Quota reached. Upgrade or wait until next month." |
| Growth | 1,000 | Сообщение: "Quota reached. Upgrade to Scale for unlimited." |
| Scale | Unlimited | — |
| Enterprise | Unlimited + SLA | Dedicated instance option |

### MVP Scope
- Conversational onboarding: discovery AI-инструментов + auto-fill wizard через диалог
- Deployer Q&A со streaming via Vercel AI SDK `streamText` + `useChat`
- Контекстные ответы (видит AI-инструменты и compliance status)
- RAG по EU AI Act knowledge base
- Eva Guard (all 3 levels)
- Eva message quota enforcement per plan
- Без tool calling (добавляется в Feature 10)

### Зависимости
Feature 02 (IAM), Feature 03 (AI Tool Inventory — для auto-fill), Feature 04a (Classification — для контекста)

---

## Feature 07: Deployer Document Generation

**Приоритет:** P1 (Should Have) | **Размер:** L | **Спринт:** 4-5

### Бизнес-ценность
As a compliance officer, I want the platform to generate deployer compliance documents, so that I don't have to write them from scratch.

### Описание
- **pg-boss + JobQueue adapter** подключается здесь
- Deployer-specific документы:

| Документ | Статья | Описание |
|----------|--------|----------|
| **FRIA** (Art. 27) | Fundamental Rights Impact Assessment | Для high-risk deployers |
| **Monitoring Plan** | Art. 26 | План мониторинга AI-инструментов |
| **AI Usage Policy** | Art. 4, 26 | Корпоративная политика использования AI |
| **Employee Notification** | Art. 26(7) | Информирование сотрудников о использовании AI |
| **Incident Report** | Art. 26(5) | Шаблон отчёта о серьёзных инцидентах |

- LLM-генерация черновиков (Mistral Medium 3) через pg-boss queue
- Section-by-section workflow: Generate → Edit → Approve
- Rich text editor (Tiptap)
- Export PDF через Gotenberg → Hetzner Object Storage

### MVP Scope
- pg-boss + JobQueue port/adapter
- FRIA + AI Usage Policy (первые 2 типа документов)
- Генерация + редактирование + PDF export

### Зависимости
Feature 04c (Requirements mapping)

### Экспертиза
Elena: валидация шаблонов deployer-документов

---

## Feature 08: Gap Analysis & Action Plan

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 5

### Бизнес-ценность
As a compliance officer, I want a detailed gap analysis of my deployer obligations, so that I know exactly what to do.

### Описание

**Анализ gaps per AI-инструмент:**
- Для каждого deployer requirement: статус (fulfilled / in_progress / gap / not_applicable)
- Группировка по статьям (Art. 4, 26, 27, 50)
- Overall compliance score с трендом

**Рекомендации per gap:**
- Конкретные шаги
- Estimated effort
- Приоритет (urgency × impact)
- Ссылка на шаблон документа / action

**Action Plan (LLM):**
- Приоритизированный step-by-step план
- Что за 1 неделю / 1 месяц / 3 месяца
- Export PDF

### MVP Scope
- Gap analysis per AI-инструмент (deployer requirements)
- Рекомендации per gap
- Action plan с приоритетами

### Зависимости
Feature 04c (Requirements mapping)

---

## Feature 19: FRIA Generator (Art. 27)

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 5

### Бизнес-ценность
As a deployer of high-risk AI, I want a guided FRIA workflow, so that I fulfill Art. 27 requirements.

### Описание

**Кому нужен FRIA:** deployers high-risk AI в public services, credit scoring, insurance.

**Guided wizard (6 секций):**
1. **Контекст использования** — как, когда, как часто используется AI
2. **Затронутые лица** — категории людей, кого затрагивает AI
3. **Specific risks** — конкретные риски для fundamental rights
4. **Human oversight** — меры контроля
5. **Mitigation** — меры снижения рисков
6. **Review & Export** — обзор → PDF

**GDPR DPIA overlap:**
- Если компания уже делала DPIA по GDPR → pre-fill секций 1-3 ("60% уже сделано")
- Art. 27(4): FRIA дополняет существующую DPIA

**LLM assistance:**
- Per секция: Mistral генерирует черновик на основе данных AI-инструмента
- Пользователь редактирует → approve

### MVP Scope
- Guided FRIA wizard (6 секций)
- LLM-assisted drafting
- DPIA pre-fill (manual import)
- PDF export

### Зависимости
Feature 04a/b (classification — нужен risk level), Feature 07 (doc generation infrastructure)

### Экспертиза
Elena: валидация FRIA шаблона на соответствие Art. 27

---

## Feature 09: Billing & подписки

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 3.5 (partial) + 5-6 (full)

### Описание
- Stripe Checkout integration
- 5 тарифов: Free, Starter ($49), Growth ($149), Scale ($399), Enterprise (custom)
- Feature limits: maxTools, maxUsers, maxEmployees, Eva messages из Plan (`app/config/plans.js`)
- Pricing page (`/pricing`) с comparison table и toggle Monthly/Annual
- **14-day trial** (Starter/Growth/Scale): card required, Stripe `trial_period_days: 14`
- **Annual billing toggle:** 20% discount (Starter: $470/yr, Growth: $1,430/yr, Scale: $3,830/yr)
- **Free tier:** no card required, no trial
- **Enterprise:** "Contact us" flow → Calendly/email, custom pricing

> **Note (Sprint 2.5):** Enforcement infrastructure (SubscriptionLimitChecker, PlanLimitError, getOrgLimits) уже реализована в Sprint 2.5 для maxUsers и maxTools. Sprint 5-6 добавляет Stripe integration + pricing UI, но enforcement logic переиспользуется.

> **Note (Sprint 3.5):** Partial scope (Stripe Checkout Session API + Webhook Handler) moved to Sprint 3.5 to enable plan-aware registration flow. Covers: `POST /api/billing/checkout`, `POST /api/webhooks/stripe` (checkout.session.completed), `GET /api/billing/checkout-status`, Pricing Page UI, Checkout Success page. Full billing management (customer portal, invoice history, plan upgrades/downgrades, cancellation, payment method management) remains Sprint 5-6.

### Зависимости
Feature 02 (IAM)

---

## Feature 10: Ева — tool calling (полная версия)

**Приоритет:** P1 (Should Have) | **Размер:** S | **Спринт:** 6

### Описание
- **Vercel AI SDK Zod-typed tools** с `needsApproval` для compliance-critical actions:
  - `classify_ai_tool` — запуск классификации из чата
  - `create_fria` — создание FRIA assessment
  - `setup_monitoring` — настройка monitoring plan
  - `search_regulation` — RAG поиск по AI Act knowledge base (pgvector)
- `maxSteps: 5` — Eva может последовательно вызывать несколько tools за один ответ
- Human-in-the-loop: `needsApproval: true` для `classify_ai_tool` и `create_fria`
- Расширяет базовую Eva (Feature 06) действиями

### Зависимости
Feature 06 (Eva базовая), Feature 04a/b (Classification), Feature 07 (Documents)

---

## Feature 11: Onboarding, Notifications & Proactive Compliance Checks

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 6

### Описание

**Onboarding:**
- Quick questionnaire: "Какие AI-инструменты вы используете?"
- Eva приветствует, предлагает начать с AI Literacy

**Notification system:**
- In-app notification bell
- Email через Brevo: instant / daily digest / weekly

**Proactive Checks (ежедневный cron):**

| Триггер | Уведомление | Когда |
|---------|-------------|-------|
| Дедлайн AI Act | «До Aug 2, 2026 осталось 90 дней — X инструментов не compliant» | 180d, 90d, 30d, 14d, 7d |
| AI Literacy overdue | «5 сотрудников не прошли обучение» | Каждые 7 дней |
| FRIA не создан | «High-risk tool X: FRIA required» | 7 дней после классификации |
| Новый AI-инструмент | «Новый инструмент добавлен — классифицировать?» | При добавлении |
| Requirements не начаты | «Tool X: 5 requirements не начаты» | Каждые 7 дней |

### Зависимости
Feature 02 (IAM + Brevo), Feature 05 (Dashboard), Feature 18 (AI Literacy)

---

## Feature 12: Regulatory Monitor

**Приоритет:** P2 (Could Have) | **Размер:** M | **Спринт:** 7

### Описание
- EUR-Lex API scraping (pg-boss scheduled job)
- Фильтр: **deployer-relevant articles** (Art. 4, 26, 27, 50, BNetzA guidelines)
- LLM-анализ: impact на конкретные AI-инструменты компании
- Dashboard секция: regulatory updates
- Notifications для затронутых пользователей

### Зависимости
Feature 07 (pg-boss), Feature 11 (notifications)

---

## Feature 20: KI-Compliance Siegel (Trust Badge)

**Приоритет:** P2 (Could Have) | **Размер:** S | **Спринт:** 7

### Бизнес-ценность
As a CEO, I want to display an "AI Act Compliant" badge on our website, so that customers and partners trust our AI usage.

### Описание
- **Criteria:** AI Literacy 100%, все инструменты classified, no open high-priority gaps
- Platform-issued badge: "KI-Compliance Siegel — AI Act Compliant"
- Embeddable widget для сайта (HTML snippet)
- **Viral loop:** badge → link to platform → новые регистрации
- Нет прямого аналога для SMB (Nemko AI Trust Mark — enterprise, не self-service)
- Premium badge (Scale/Enterprise): с детальной compliance page

### Зависимости
Feature 05 (Dashboard — compliance data), Feature 18 (AI Literacy — completion data)

---

## Feature 13: Дополнительные deployer-документы

**Приоритет:** P2 (Could Have) | **Размер:** M | **Спринт:** 7-8

### Описание
- Risk Assessment шаблон (Art. 9, deployer perspective)
- Incident Report detailed template
- Human Oversight Documentation (Art. 26)
- Тот же workflow что Feature 07: generate → edit → approve → export PDF

### Зависимости
Feature 07 (Document Generation)

---

## Feature 14: Multi-language (+ DE, FR)

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** post-MVP (сразу после Sprint 4)

### Бизнес-ценность
MVP выходит на английском. DE и FR добавляются сразу после MVP, т.к. DACH и Франция — крупнейшие EU-рынки по числу SMB, использующих AI.

### Описание
- i18n (next-intl): все UI-тексты (EN — уже в MVP, + DE, FR)
- AI Literacy courses: DE + FR versions (EN is default from MVP)
- Eva отвечает на языке пользователя (locale из профиля)
- Compliance documents: generated in user's locale
- Regulatory content (requirements): DE + FR translations

### Зависимости
Feature 02 (IAM — locale)

---

## Feature 15: Compliance Copilot — multi-channel delivery

**Приоритет:** P3 (Future) | **Размер:** M

### Описание
Расширение Feature 11 доставкой вне платформы: Webhook API, Matrix/Element (EU), Slack/Teams (с предупреждением о US).

### Зависимости
Feature 11 (Notifications)

---

## Feature 16: Shadow AI Auto-Discovery (EU-Sovereign)

**Приоритет:** P3 (Future) | **Размер:** L

### Бизнес-ценность
As a CTO, I want automatic detection of AI tools employees use, so that I have a complete inventory without relying on manual reporting.

### Описание

**Implementation:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) в sandboxed Docker container — autonomous agent с built-in tools (WebSearch, WebFetch, Bash) для сканирования и анализа.

**Agent Integrations:** Nango (self-hosted, Hetzner EU) — OAuth/API integration platform для подключения к корпоративным сервисам. Вместо Composio (US data).

**EU-sovereign методы (без M365/Google):**

| Метод | Как работает | Данные |
|-------|-------------|--------|
| **DNS/Proxy Log Analysis** | Компания загружает firewall логи → парсинг AI-доменов | Домены + частота |
| **Browser Extension** | Self-hosted extension → детектирует AI-сайты | Домен + timestamp |
| **Ory/Keycloak OAuth Audit** | Читаем OAuth apps из SSO → фильтруем AI | App name + permissions |

- Human-in-the-loop: Auto-discovery НЕ добавляет автоматически — только предлагает
- База 200+ AI-доменов для matching

### Зависимости
Feature 03 (AI Tool Inventory)

---

## Feature 17: Autonomous Compliance Agent — on-premise

**Приоритет:** P3 (Future) | **Размер:** XL | **Тариф:** Enterprise

### Описание
Docker container в инфраструктуре клиента: мониторинг AI-использования, уведомления, air-gapped mode.

**Implementation:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) — autonomous agent loop с built-in tools, subagents, session persistence. Docker sandbox isolation обязателен. Agent Integrations через Nango (self-hosted).

### Зависимости
Feature 16 (Shadow AI Discovery)

---

## Provider Features (P3 Future)

> **Note:** Provider-Lite (Feature 21, P2) covers bootstrapped AI startups (<50 employees) building for EU market. Full provider features below (Art. 43, 51-56) remain P3 for foundation model companies.

**Когда:** После product-market fit с deployer-сегментом. При запросе от клиентов, которые также являются AI providers.

| Feature | Статья | Описание |
|---------|--------|----------|
| Technical Documentation (Art. 11) | Annex IV | Генерация 12 секций tech docs для AI providers |
| Conformity Assessment (Art. 43) | Self-assessment | Guided workflow для self-assessment high-risk AI |
| GPAI Model Cards (Art. 51-56) | Transparency sheets | Для GPAI model providers |
| CE Declaration (Art. 47) | Conformity declaration | EU Declaration of Conformity |
| EU DB Registration (Art. 49) | Annex VIII | Pre-fill + submission help |

---

## Feature 21: Provider-Lite Wizard

**Приоритет:** P2 (Could Have) | **Размер:** M | **Спринт:** 7-8

### Бизнес-ценность
As a bootstrapped AI startup building for the EU market, I want a guided wizard that assesses my provider obligations, so that I understand what compliance steps are needed before launching.

### Описание

**Target:** Bootstrapped AI startups (<50 employees) building AI products for EU market. NOT foundation model companies (GPAI).

**Provider-Lite Wizard (5 steps):**
1. "Are you building an AI product?" → Yes/No
2. Product domain (what does your AI do?)
3. End users — who are they? Where are they?
4. EU clients? → Art. 2 extraterritorial scope check
5. Risk level as provider → obligations (Art. 6/9/11/16)

**Sub-features:**
- **Compliance Checklist Generator:** Personalized checklist based on wizard answers → downloadable PDF (via Gotenberg)
- **EU Market Readiness Score:** 0-100% score with breakdown by category (technical docs, conformity, registration)
- **Provider Starter Kit:** Templates for Art. 11 basic tech documentation (simplified, not full Annex IV)

### MVP Scope
- Guided wizard (5 steps)
- Compliance Checklist PDF
- EU Market Readiness Score

### Зависимости
Feature 01 (infrastructure), Feature 02 (IAM)

---

## Feature 22: Compliance Checklist Generator

**Приоритет:** P2 (Could Have) | **Размер:** S | **Спринт:** 7+

### Бизнес-ценность
As a compliance officer, I want a personalized downloadable checklist for my organization, so that I have a clear paper-based action plan.

### Описание
- Input: organization's AI tools + risk levels + AI Act role (deployer/provider-lite)
- Output: personalized compliance checklist PDF
- Per-tool breakdown: tool name, risk level, applicable articles, requirements status
- Organization summary: total tools, risk distribution, overall compliance score
- PDF generation via Gotenberg → Hetzner Object Storage
- Shareable link (optional, with org consent)

### Зависимости
Feature 04a/b/c (classification), Feature 07 (doc generation infrastructure)

---

## Feature 23: Free Lead Generation Tools

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 3.5 (Quick Check + Penalty Calculator) + 5 (Free Classification)

### Бизнес-ценность
As a potential customer, I want free tools to check if AI Act applies to me, so that I can assess the urgency before committing to a paid plan.

### Описание

**3 public tools (no auth required, email-gated):**

> **Note (Sprint 3.5):** Quick Check and Penalty Calculator moved to Sprint 3.5 to serve as lead gen tools alongside the new Stripe Checkout and Pricing flows. Free Classification remains Sprint 5 as it requires full wizard integration.

**(a) Quick Check (`/check`) — Sprint 3.5:**
- 5-step micro-wizard:
  1. "Does your company use AI tools?" (Yes/No)
  2. "How many employees?" (1-10 / 11-50 / 51-200 / 200+)
  3. "Do you have EU clients or EU operations?" (Yes/No)
  4. "Do you use AI in HR, healthcare, or finance?" (Yes/No/Unsure)
  5. Email input → instant result
- Result: "X obligations apply, Y potential high-risk areas"
- CTA: "Create free account for full assessment"

**(b) Penalty Calculator (`/penalty-calculator`) — Sprint 3.5:**
- Revenue input (annual turnover)
- Art. 99 formula: max(7% of turnover, €35M) for prohibited; max(3%, €15M) for high-risk
- Visual: animated counter to max fine
- Shareable OG card: "Your max AI Act penalty: €X"
- CTA: "Reduce your risk — Start compliance now"

**(c) Free Classification — Sprint 5:**
- 1 tool from catalog → full wizard → full classification result
- Same flow as Feature 03/04a but limited to 1 tool for unregistered users
- After result: "Add more tools → Create account (Free) or Start trial (Starter)"

**Technical:**
- Public endpoints, no auth
- Rate limiting: 10 requests/IP/hour via @fastify/rate-limit
- Email capture → Brevo transactional API → lead list
- No account created until user explicitly signs up

### Зависимости
Feature 01 (infrastructure), Feature 04a (classification for Free Classification)

---

## Сводка по приоритетам

### P0 — Must Have (Deployer MVP)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 01 | Инфраструктура | M | 0 |
| 02 | IAM (Ory) + Invite + Team + Enforcement | L | 1 + 2.5 |
| 03 | AI Tool Inventory + Wizard + Alternatives | L | 1-3 |
| 04a | Rule Engine (deployer) | L | 2 |
| 04b | Classification History + Reclassification | S | 3 |
| 04c | Deployer Requirements Mapping | M | 3 |
| 05 | Deployer Dashboard | L | 3 (backend) + 5+ (frontend) |
| 06 | Eva — Conversational Onboarding | L | 4 |

**MVP-ready: Sprint 4 (неделя 8-10)** — inventory, classification, dashboard, Eva

### P1 — Should Have

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 07 | Deployer Doc Generation | L | 4-5 |
| 08 | Gap Analysis | M | 5 |
| 19 | FRIA Generator (Art. 27) | M | 5 |
| **23** | **Free Lead Gen Tools (Quick Check, Penalty Calc → 3.5; Free Classification → 5)** | **M** | **3.5 + 5** |
| 09 | Billing (Stripe Checkout → 3.5; full management → 5-6) | M | 3.5 + 5-6 |
| 10 | Eva tool calling | S | 6 |
| 11 | Onboarding + Notifications | M | 6 |

**Product-ready: Sprint 6 (неделя 12-14)**

### P2 — Could Have

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 12 | Regulatory Monitor | M | 7 |
| 20 | KI-Compliance Siegel | S | 7 |
| **21** | **Provider-Lite Wizard** | **M** | **7-8** |
| **22** | **Compliance Checklist Generator** | **S** | **7+** |
| 13 | Доп. deployer-документы | M | 7-8 |
| 18 | **AI Literacy Module (WEDGE, EN-first)** | L | 8+ |
| 14 | Multi-language (+ DE, FR) | M | post-MVP |

### P3 — Future

| # | Feature | Размер |
|---|---------|--------|
| 15 | Compliance Copilot | M |
| 16 | Shadow AI Auto-Discovery (EU) | L |
| 17 | Autonomous Agent | XL |
| — | Provider Features (Art. 11, 43, 47, 51-56, 49) — full providers only | XL |

---

## Roadmap

```
Sprint 0     ██ Feature 01: Infrastructure                                        ✅
Sprint 1     ████ Feature 02: IAM + Feature 03: AI Tool Inventory (start)         ✅
Sprint 2     ████ Feature 03 (end) + Feature 04a: Rules + Feature 04c (mapping)   ✅
Sprint 2.5   ████ Feature 02: Invite Flow + Team Management + Enforcement (24 SP) ✅
Sprint 3     ████ Feature 04b: History + Feature 04c: Requirements API            ✅
                  + Feature 05: Dashboard API + Feature 03: Alternatives
Sprint 3.5   ████ Feature 09 (partial): Stripe Checkout + Webhook
                  + Feature 23 (partial): Quick Check + Penalty Calculator
                  + Feature 02: Plan-aware Registration + Pricing Page
Sprint 4     ████ Feature 06: Eva (with Eva Guard) Conversational Onboarding
             ── MVP READY ──
Sprint 5     ████ Frontend спринты + Feature 07: Deployer Docs (start)
                  + Feature 23: Free Classification (remaining)
Sprint 6     ████ Feature 07 (end) + Feature 08: Gap + Feature 19: FRIA
                  + Feature 09: Full Billing (portal, invoices, plan changes)
Sprint 7     ██ Feature 10: Eva tools + Feature 11: Onboarding
             ── PRODUCT READY ──
Sprint 7-8   ████ Feature 12: Reg Monitor + Feature 20: KI-Siegel
                  + Feature 21: Provider-Lite Wizard + Feature 22: Checklist
Sprint 8     ████ Feature 13: Docs
             ── FULL SCOPE ──
Sprint 8+    ████ Feature 18: AI Literacy (EN-first) + Feature 14: i18n (+ DE, FR)
```

---

## Архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| **Deployer-first** вместо universal | 125K+ deployers vs 1.1K providers в Германии. Рынок в 120x больше, не обслужен. Provider features → P3 |
| **AI Literacy как wedge product** | Art. 4 уже обязателен (Feb 2025). 70% сотрудников не обучены. Standalone за €49/мес |
| **AI Tool Catalog (seed 200+)** | Упрощает onboarding: не нужно описывать инструмент с нуля, выбери из каталога |
| **Shadow AI Auto-Discovery: EU-sovereign** | Без M365/Google. DNS logs + browser extension + Ory OAuth |
| **pg-boss** вместо BullMQ+Redis | PostgreSQL-only на MVP |
| **Ory (self-hosted)** вместо custom auth | EU, Apache 2.0, webhook sync |
| **Brevo** вместо custom email | EU (Франция), 300/day free |
| **Gotenberg** для PDF | Self-hosted, certificates + FRIA + docs |
| **Hetzner Object Storage** для файлов | S3-compatible, €5.27/TB, EU |
| **@fastify/rate-limit** | Official Fastify plugin |
| **Better Uptime** (мониторинг) | EU (Литва), free tier |
| **Plausible** (аналитика) | EU (Эстония), €9/мес, без cookies |
| **Mistral EU-only** | Sovereign AI: данные клиентов только в EU |

---

✅ **APPROVED:** Deployer-First Backlog утверждён PO (2026-02-10).

💡 **Следующий шаг:** Sprint 3.5 реализация (Feature 09 partial: Stripe Checkout + Feature 23 partial: Quick Check + Penalty Calc + Plan-aware Registration + Pricing Page) — см. `SPRINT-BACKLOG-003.5.md`
