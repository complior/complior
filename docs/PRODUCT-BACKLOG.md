# PRODUCT-BACKLOG.md — AI Act Compliance Platform

**Версия:** 2.0.0
**Дата:** 2026-02-07
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ⛔ Ожидает утверждения Product Owner
**Зависимости:** PRODUCT-VISION.md ✅, ARCHITECTURE.md ✅, DATABASE.md ✅

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
| **P0** | Must Have — без этого продукт не запустится | Sprint 0-3 |
| **P1** | Should Have — значительно повышает ценность | Sprint 4-6 |
| **P2** | Could Have — расширение, post-MVP | Sprint 7-8 |

### Размер фичи (грубая оценка)

| Размер | Объём | Примерно |
|--------|-------|----------|
| **S** | 1-2 спринта, 1-2 разработчика | 10-20 SP при декомпозиции |
| **M** | 2-3 спринта, 1-2 разработчика | 20-35 SP |
| **L** | 3-4 спринта, 2+ разработчика | 35-50 SP |
| **XL** | 4+ спринта, команда | 50+ SP, декомпозиция на sub-features |

---

## Feature 01: Инфраструктура и настройка проекта

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 0

### Бизнес-ценность
Техническая основа для всей разработки: monorepo, CI/CD, база данных, job queue.

### Описание
- Monorepo: `src/` (backend, Onion Architecture) + `frontend/` (Next.js 14)
- Backend из existing-code: Fastify + MetaSQL + VM Sandbox
- Все 22 таблицы из DATABASE.md как MetaSQL schemas + миграции
- Библиотека ошибок AppError + structured logging (pino)
- GitHub Actions CI: lint, type-check, tests, `npm audit`
- Docker Compose: app + PostgreSQL (dev environment)

### MVP Scope
- Полная DB-схема с seed data (AI Act requirements, pricing plans)
- CI pipeline рабочий с первого дня
- pg-boss НЕ нужен на Sprint 0 — подключается в Sprint 4 (Feature 07)

### Зависимости
Нет (базовая фича, все остальные зависят от неё)

---

## Feature 02: IAM — Аутентификация и управление пользователями

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 1

### Бизнес-ценность
As a CTO компании в DACH-регионе, I want to register, login and manage my team's access, so that we can securely use the compliance platform.

### Описание
- Регистрация: email + пароль (scrypt hash) + создание Organization + Role(owner) + Subscription(free)
- Аутентификация: email magic link (без пароля) + JWT + httpOnly cookies
- Session management: PostgreSQL Session table (type='magic_link' TTL 10 мин, type='auth' TTL 30 дней)
- RBAC: Permission table (role + resource + action)
- Multi-tenancy: ВСЕ запросы фильтруются по organizationId
- AuditLog: запись каждого auth-события

### MVP Scope
- Регистрация с email + magic link auth
- Базовые роли: Owner, Member
- Multi-tenancy изоляция
- Rate limiting: не более 3 magic link в 10 минут

### Зависимости
Feature 01 (инфраструктура)

---

## Feature 03: Регистрация AI-систем (5-step Wizard)

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 1-2

### Бизнес-ценность
As a compliance officer, I want to describe my AI system step-by-step, so that the platform can classify it and determine requirements.

### Описание
- CRUD API для AI-систем (`/api/systems`)
- 5-step wizard (XState state chart):
  1. Basic Info — название, описание
  2. Purpose & Context — цель, область (biometrics, HR, education, etc.)
  3. Technical Details — тип модели, автономность, safety component
  4. Data & Users — типы данных, количество пользователей
  5. Review & Classify — обзор + кнопка классификации
- Auto-save на каждом шаге
- Валидация: React Hook Form + Zod

### MVP Scope
- Полный CRUD + wizard с 5 шагами
- XState для управления состоянием wizard
- Responsive, WCAG AA

### Зависимости
Feature 02 (IAM — нужна аутентификация)

---

## Feature 04: Classification Engine — Классификация AI-систем

**Приоритет:** P0 (Must Have) | **Размер:** XL | **Спринт:** 2-3

### Бизнес-ценность
As a CTO, I want to know the risk level of my AI system under EU AI Act, so that I understand which requirements apply and what needs to be done.

### Описание
Гибридный 4-step classification pipeline:
1. **Rule-based pre-filter** — Art. 5 (prohibited), Annex III (8 доменов high-risk), safety components
2. **LLM classification** — Mistral Small/Medium для сложных случаев
3. **Cross-validation** — при расхождении rules/LLM → escalation на Mistral Large
4. **Requirements mapping** — riskLevel + category → набор Requirement из справочника

Output: riskLevel, confidence, matchedRules[], articleReferences[], generatedRequirements[]

- Confidence >= 90% → результат без LLM
- Domain events: `SystemClassified` → пересчёт complianceScore

### MVP Scope
- Rule-based classification (Annex III + Art. 5)
- LLM second opinion (Mistral Medium)
- Базовый requirements mapping
- Экран результата: risk level, обоснование, ссылки на статьи

### Зависимости
Feature 03 (wizard предоставляет данные для классификации)

### Экспертиза
Elena: валидация правил на соответствие тексту AI Act

---

## Feature 05: Compliance Dashboard

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 3-4

### Бизнес-ценность
As a CEO / CTO, I want to see the overall compliance status of all AI systems on one page, so that I can quickly assess the situation and report to the board.

### Описание
- Compliance Score (aggregate): круговой прогресс-бар (0-100%)
- Распределение по risk levels: визуальная диаграмма
- Таблица AI-систем: название, risk level badge, compliance score, статус
- «Требует внимания»: системы с просроченными задачами
- Ближайшие дедлайны
- Детальная страница AI-системы: classification details, requirements checklist, документы, actions

### MVP Scope
- Обзорная страница + карточка системы
- Dashboard API endpoints (CQS: read-only queries)
- Фильтры по risk level и compliance status
- Responsive grid: mobile → desktop

### Зависимости
Feature 03 (нужны AI-системы в базе)

---

## Feature 06: Консультант Ева (базовая версия)

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 4

### Бизнес-ценность
As a CTO без юридического бэкграунда, I want to ask questions about AI Act in plain language, so that I understand what to do for my specific case.

### Описание
- WebSocket-чат с AI-консультантом «Ева»
- Mistral Large 3 API: streaming responses
- Context injection: данные пользователя, организации, AI-систем → system prompt
- Conversation persistence (Conversation + ChatMessage)
- Quick actions: предопределённые вопросы-кнопки
- Цитирование статей AI Act в ответах
- Disclaimer: «не является юридической консультацией»
- Rate limiting по плану (Free: 10 сообщений/день)

### MVP Scope
- Базовый чат со streaming
- Контекстные ответы (видит данные пользователя)
- Без tool calling (добавляется в Feature 10)

### Зависимости
Feature 02 (IAM), Feature 04 (Classification — для контекста)

---

## Feature 07: Генерация документов

**Приоритет:** P1 (Should Have) | **Размер:** L | **Спринт:** 4-5

### Бизнес-ценность
As a compliance officer, I want the platform to generate draft Technical Documentation (Art. 11), so that I don't have to write every section from scratch.

### Описание
- **pg-boss + JobQueue adapter** подключается здесь (ARCHITECTURE.md §6.10) — первая фича с async-задачами
- Структурированные шаблоны документов по Art. 11 AI Act (~8-10 секций)
- LLM-генерация черновиков секций (Mistral Medium 3) через pg-boss queue
- Section-by-section workflow: Generate → Edit → Approve
- Rich text editor (Tiptap) для редактирования
- Export в PDF через pg-boss job → S3 link
- WebSocket уведомление при готовности секции

### MVP Scope
- pg-boss + JobQueue port/adapter (миграция на BullMQ при необходимости)
- Technical Documentation (Art. 11) — единственный тип документа
- Генерация + редактирование + PDF export

### Зависимости
Feature 04 (Classification — нужна классификация для генерации)

### Экспертиза
Elena: валидация структуры шаблонов на соответствие Art. 11

---

## Feature 08: Gap Analysis

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 5

### Бизнес-ценность
As a compliance officer, I want to see which requirements are met and which are not, so that I can create an action plan for compliance.

### Описание
- Анализ gaps: для каждого requirement — статус (fulfilled/in_progress/gap)
- Action plan: LLM-рекомендации по закрытию gaps (Mistral Medium 3)
- Estimated effort из справочника Requirement
- Приоритизация: risk level + proximity к deadline
- UI: три секции (Fulfilled ✅, In Progress 🔄, Gaps ❌), progress bars, CTA

### MVP Scope
- Gap analysis per AI-system
- Action plan recommendations
- Визуализация прогресса

### Зависимости
Feature 04 (Classification — нужны requirements)

---

## Feature 09: Billing & подписки

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 5-6

### Бизнес-ценность
As a user, I want to upgrade from Free to a paid plan, so that I can access full platform capabilities.

### Описание
- Stripe Checkout integration (checkout.completed, invoice.paid, payment_failed webhooks)
- 5 тарифов: Free, Starter (€49), Growth (€149), Scale (€399), Enterprise (custom)
- Feature limits: maxSystems, maxUsers, maxMessages из Plan
- Pricing page с comparison table
- Settings → Billing: текущий план, следующий платёж

### MVP Scope
- Stripe Checkout + webhook handling
- Feature limits enforcement
- Pricing page + billing settings

### Зависимости
Feature 02 (IAM)

---

## Feature 10: Ева — tool calling (полная версия)

**Приоритет:** P1 (Should Have) | **Размер:** S | **Спринт:** 6

### Бизнес-ценность
As a user, I want Eva to perform actions (classify system, search regulation, create document), so that I can manage compliance through chat.

### Описание
- Mistral tool calling: `classify_system`, `search_regulation`, `create_document`
- Tool result → продолжение генерации ответа
- Расширяет базовую Eva (Feature 06) действиями

### MVP Scope
- 3 tool definitions + execution

### Зависимости
Feature 06 (Eva базовая), Feature 04 (Classification), Feature 07 (Documents)

---

## Feature 11: Onboarding и notifications

**Приоритет:** P1 (Should Have) | **Размер:** S | **Спринт:** 6

### Бизнес-ценность
As a new user, I want a quick assessment after registration, so that I immediately understand the scope of compliance work. As a user, I want notifications about important events.

### Описание
- Quick questionnaire (5-7 вопросов) → LLM-оценка масштаба работы
- Notifications: classification_complete, document_ready, deadline_approaching
- Notification bell + dropdown + domain events → Notification creation

### MVP Scope
- Onboarding questionnaire + Eva welcome
- In-app notifications

### Зависимости
Feature 02 (IAM), Feature 06 (Eva)

---

## Feature 12: Regulatory Monitor

**Приоритет:** P2 (Could Have) | **Размер:** M | **Спринт:** 7

### Бизнес-ценность
As a compliance officer, I want to be notified about changes in AI Act regulations, so that I can react to regulatory updates in time.

### Описание
- EUR-Lex API scraping (pg-boss scheduled job: ежедневно 02:00 UTC)
- LLM-анализ: affected articles, impact level (Mistral Small)
- Impact assessment: определение затронутых AI-систем
- Dashboard секция: regulatory updates + impact per system
- Notifications для затронутых пользователей

### MVP Scope
Не входит в MVP. Реализация после запуска.

### Зависимости
Feature 01 (pg-boss), Feature 11 (notifications)

---

## Feature 13: Дополнительные compliance-документы

**Приоритет:** P2 (Could Have) | **Размер:** M | **Спринт:** 7-8

### Бизнес-ценность
As a compliance officer with a high-risk system, I want to generate Risk Assessment (Art. 9) and EU Declaration of Conformity (Art. 47), so that I fulfill all AI Act documentation requirements.

### Описание
- Risk Assessment шаблон по Art. 9 (генерация через Mistral + edit workflow)
- EU Declaration of Conformity шаблон по Art. 47 (pre-fill из данных системы)
- Тот же workflow что Feature 07: generate → edit → approve → export PDF

### MVP Scope
Не входит в MVP. Расширяет Feature 07 дополнительными типами документов.

### Зависимости
Feature 07 (Document Generation — переиспользует engine)

### Экспертиза
Elena: шаблоны Art. 9 и Art. 47

---

## Feature 14: Multi-language (DE/EN)

**Приоритет:** P2 (Could Have) | **Размер:** S | **Спринт:** 8

### Бизнес-ценность
As a user from Austria/Switzerland, I want to use the platform in German or English, so that I can work in my preferred language.

### Описание
- i18n (next-intl): все UI-тексты в translation files (DE, EN)
- Language switcher в header
- Eva отвечает на языке пользователя (prompt engineering)

### MVP Scope
Не входит в MVP. DACH market launch может быть только на немецком.

### Зависимости
Feature 02 (IAM — locale в профиле)

---

## Сводка по приоритетам

### P0 — Must Have (MVP core)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 01 | Инфраструктура и настройка | M | 0 |
| 02 | IAM — Auth и управление | L | 1 |
| 03 | 5-step Wizard | M | 1-2 |
| 04 | Classification Engine | XL | 2-3 |
| 05 | Compliance Dashboard | M | 3-4 |
| 06 | Ева (базовая) | L | 4 |

**MVP-ready: Sprint 4 (неделя 8-10)** — классификация, dashboard, базовая Eva

### P1 — Should Have (полноценный продукт)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 07 | Генерация документов | L | 4-5 |
| 08 | Gap Analysis | M | 5 |
| 09 | Billing & подписки | M | 5-6 |
| 10 | Ева tool calling | S | 6 |
| 11 | Onboarding & notifications | S | 6 |

**Product-ready: Sprint 6 (неделя 12-14)** — документы, gap analysis, billing, Eva tools

### P2 — Could Have (расширение)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 12 | Regulatory Monitor | M | 7 |
| 13 | Доп. compliance-документы | M | 7-8 |
| 14 | Multi-language (DE/EN) | S | 8 |

**Full scope: Sprint 8 (неделя 16-18)** — regulatory monitor, multi-language

---

## Roadmap

```
Sprint 0     ██ Feature 01: Инфраструктура
Sprint 1     ████ Feature 02: IAM + Feature 03: Wizard (start)
Sprint 2     ████ Feature 03: Wizard (end) + Feature 04: Classification (start)
Sprint 3     ████ Feature 04: Classification (end) + Feature 05: Dashboard
Sprint 4     ████ Feature 05: Dashboard (end) + Feature 06: Eva + Feature 07: Docs (start)
             ── MVP READY ──
Sprint 5     ████ Feature 07: Docs (end) + Feature 08: Gap + Feature 09: Billing
Sprint 6     ██ Feature 09: Billing (end) + Feature 10: Eva tools + Feature 11: Onboarding
             ── PRODUCT READY ──
Sprint 7     ████ Feature 12: Regulatory + Feature 13: Docs (start)
Sprint 8     ██ Feature 13: Docs (end) + Feature 14: i18n
             ── FULL SCOPE ──
```

---

## Архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| **pg-boss** вместо BullMQ+Redis | PostgreSQL-only на MVP: -1 сервис, проще деплой. JobQueue adapter для миграции (ARCHITECTURE.md §6.10) |
| **Session в PostgreSQL** | Таблица Session с index — достаточно для 50 пользователей. Redis при масштабировании |
| **Без кэширования на MVP** | 50 пользователей — PostgreSQL справится с прямыми запросами. Кэш добавить при необходимости |
| **Rate limiting in-process** | Map + sliding window — достаточно для одного сервера. Redis при горизонтальном масштабировании |
| **Mistral EU-only** | Sovereign AI: данные клиентов обрабатываются только EU-моделями (Mistral, Франция) |

---

⛔ **APPROVAL GATE:** Product Owner должен утвердить Product Backlog (фичи и приоритеты) перед Sprint Planning.

💡 **Следующий шаг:** После утверждения → Marcus декомпозирует P0-фичи Sprint 0 в User Stories → SPRINT-BACKLOG.md
