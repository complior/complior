# PRODUCT-BACKLOG.md — AI Act Compliance Platform

**Версия:** 2.0.0
**Дата:** 2026-02-07
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ✅ Утверждён Product Owner (2026-02-07)
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
- Все 21 таблица из DATABASE.md как MetaSQL schemas + миграции
- Библиотека ошибок AppError + structured logging (pino)
- GitHub Actions CI: lint, type-check, tests, `npm audit`
- Docker Compose: app + PostgreSQL + Ory + Gotenberg (dev environment)
- Hetzner Object Storage (S3) — настройка bucket
- @fastify/rate-limit — подключение plugin
- Plausible — подключение скрипта аналитики
- Better Uptime — настройка мониторинга endpoint

### MVP Scope
- Полная DB-схема с seed data (AI Act requirements, pricing plans)
- Docker Compose с Ory и Gotenberg
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
- **Ory (self-hosted, Hetzner EU):** регистрация, login, magic links, password, sessions, MFA
- **Brevo (Франция):** transactional email для magic links и verification emails
- Ory webhook → наш API → создание Organization + User (sync) + Role(owner) + Subscription(free)
- RBAC: Permission table (role + resource + action) — наша таблица поверх Ory identity
- Multi-tenancy: ВСЕ запросы фильтруются по organizationId
- AuditLog: запись каждого auth-события (Ory webhook → AuditLog)

### MVP Scope
- Ory setup в Docker Compose + Brevo SMTP integration
- Регистрация с email + magic link (Ory code method)
- Ory webhook → User sync + Organization creation
- Базовые роли: Owner, Member
- Multi-tenancy изоляция
- @fastify/rate-limit на public endpoints

### Зависимости
Feature 01 (инфраструктура)

---

## Feature 03: Реестр AI-систем — Inventory & Registration

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 1-2

### Бизнес-ценность
As a CTO, I want a centralized registry of all AI systems my company develops or uses, so that I can manage compliance for each system and have a complete picture.

### Описание

**Реестр (ГЛАВНАЯ рабочая страница продукта):**
- Таблица/карточки всех AI-систем организации:

| Колонка | Описание |
|---------|----------|
| Название | Имя системы + краткое описание |
| Роль | Provider / Deployer (badge) |
| Risk Level | 🔴 Prohibited · 🟠 High Risk · 🟡 Limited · 🟢 Minimal · 🔵 GPAI |
| Статус | Черновик → Классифицирована → В работе → Соответствует → Мониторинг |
| Compliance % | Progress bar |
| Дедлайн | Ближайшая дата по requirements |
| Actions | Classify, Details, Docs, Eva |

- Фильтры по risk level, статусу lifecycle, роли (Provider/Deployer)
- Сортировка по compliance %, дедлайну, дате создания
- Поиск по названию/описанию

**Живая система (онлайн-режим):**
- Добавить новую систему в любой момент → wizard
- Редактировать систему → при существенных изменениях → prompt «Переклассифицировать?»
- Архивировать систему (больше не используется, audit trail сохранён)
- Version history изменений по каждой системе
- AuditLog для каждого действия

**5-step Wizard** (XState state chart) для добавления:
1. Basic Info — название, описание, **роль: Provider или Deployer**
2. Purpose & Context — цель, **домен Annex III** (biometrics, HR, education, etc.)
3. Technical Details — тип модели, автономность, **safety component?**, **GPAI?**
4. Data & Users — персональные данные, **уязвимые группы?**, масштаб
5. Review & Classify — обзор введённых данных + кнопка классификации

- Auto-save на каждом шаге
- Валидация: React Hook Form + Zod
- CRUD API (`/api/systems`) с multi-tenancy

### MVP Scope
- Полная страница реестра с risk level badges (цветовая кодировка)
- Wizard с вопросом Provider/Deployer
- Lifecycle статусы (5 состояний)
- Edit/archive/version history
- Responsive, WCAG AA

### Зависимости
Feature 02 (IAM — нужна аутентификация)

---

## Feature 04a: Rule Engine — Rule-based классификация

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 2

### Бизнес-ценность
As a CTO, I want my AI systems classified by risk level using deterministic rules, so that I get instant, explainable results without waiting for LLM.

### Описание

**Чистый Domain Service (RuleEngine)** — не зависит от LLM, инфраструктуры, внешних сервисов:

1. **Art. 5 check** — prohibited practices (social scoring, real-time biometrics, etc.)
2. **Annex III check** — 8 доменов high-risk (biometrics, HR, education, law enforcement, etc.)
3. **Safety component check** — Annex I harmonisation legislation
4. **GPAI detection** — Art. 51 (general purpose AI indicators)
5. **Provider/Deployer role** — разные requirements per role

**Пять classification paths:**

| Risk Level | Badge | Что происходит |
|-----------|-------|----------------|
| **Prohibited** (Art. 5) | 🔴 | WARNING: практика запрещена. Guidance: прекратить / модифицировать / юрист |
| **High Risk** (Annex III) | 🟠 | Полный набор requirements: Art. 9-15, 17, 43, 47-49, 72 |
| **GPAI** (Art. 51-56) | 🔵 | Отдельный трек: technical docs, copyright, transparency + systemic risk |
| **Limited Risk** (Art. 50) | 🟡 | Только transparency requirements (chatbots, deepfakes, emotion recognition) |
| **Minimal Risk** | 🟢 | Нет обязательных требований. Voluntary codes of conduct |

Output: riskLevel, role, confidence, matchedRules[], articleReferences[]

### MVP Scope
- RuleEngine в domain/classification/services/ (pure, 100% тестируемый)
- Art. 5, Annex III, GPAI detection rules
- Provider/Deployer distinction
- Экран результата: risk level badge, обоснование, статьи

### Зависимости
Feature 03 (wizard предоставляет данные для классификации)

### Экспертиза
Elena: валидация правил, маппинг статей AI Act

---

## Feature 04b: LLM Classification + Cross-validation

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 2-3

### Бизнес-ценность
As a CTO with complex AI systems, I want LLM analysis for ambiguous cases, so that edge cases are handled correctly.

### Описание

**Application-layer orchestration (classifySystem use case):**
1. Вызывает RuleEngine (domain) → получает rule-based результат
2. Вызывает LLM (infrastructure port) → Mistral Small/Medium для сложных случаев
3. **Cross-validation:** при расхождении rules ↔ LLM → escalation на Mistral Large
4. Финальный результат: merged riskLevel, confidence, reasoning

**Рекомендации при классификации:**
- Per requirement: что конкретно нужно сделать
- Estimated effort и приоритет
- Если **Prohibited**: guidance (прекратить, модифицировать, юрист)
- Если **High Risk, не compliant**: ранжированный список действий

**Переклассификация:**
- Система изменилась → переклассификация через тот же pipeline
- Новый riskLevel → обновление requirements → notification

### MVP Scope
- classifySystem use case в application/classification/
- LLM через infrastructure port (Mistral API adapter)
- Cross-validation logic
- Classification history (ClassificationLog)

### Зависимости
Feature 04a (RuleEngine), Feature 03 (wizard data)

---

## Feature 04c: Requirements Mapping + рекомендации

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 3

### Бизнес-ценность
As a CTO, I want to know ALL applicable requirements for my classified AI system with specific recommendations, so that I have a clear action plan.

### Описание

**Requirements mapping:**
- riskLevel + **role (Provider/Deployer)** + category → applicable Articles
- **Provider** (разработчик AI): Art. 9-17, 43, 47-49, 72 — полный набор
- **Deployer** (использует AI): Art. 26-27 — использование по инструкции, мониторинг, логи

**Рекомендации «Что делать?»:**
- Per requirement: конкретные шаги
- Estimated effort
- Приоритет (urgency × impact)

Output: requirements[], recommendations[], estimatedEffort

### MVP Scope
- Requirements mapping по ролям и risk levels
- Recommendations per requirement
- Экран: requirements checklist + рекомендации per gap

### Зависимости
Feature 04a/b (classification результат)

### Экспертиза
Elena: requirements mapping, тексты рекомендаций

---

## Feature 05: Compliance Dashboard & Recommendations

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 3-4

### Бизнес-ценность
As a CEO / CTO, I want a visual overview of compliance status with clear risk indicators and actionable recommendations, so that I can make decisions and report to the board.

### Описание

**Risk Level Distribution (центральный виджет):**
- Color-coded диаграмма по ВСЕМ системам организации:
  🔴 Prohibited (X) · 🟠 High Risk (X) · 🟡 Limited (X) · 🟢 Minimal (X) · 🔵 GPAI (X)
- Click по сегменту → фильтрация реестра (Feature 03) по этому уровню
- Provider/Deployer breakdown внутри каждого уровня

**Compliance Score** (aggregate) — круговой прогресс-бар (0-100%)

**«Требует внимания»** — приоритизированный список:
- 🔴 Prohibited systems → "СТОП: запрещённая практика по Art. 5" + guidance
- 🟠 Non-compliant high-risk → конкретные action items
- ⏰ Approaching deadlines по requirements
- 📋 Незавершённые документы
- 🔄 Regulatory changes affecting systems

**Compliance Timeline** — ключевые дедлайны EU AI Act (Art. 113):
- ~~Feb 2, 2025: AI Literacy (Art. 4)~~ — уже в силе
- ~~Aug 2, 2025: Prohibited practices (Art. 5)~~ — уже в силе
- **Aug 2, 2026: High-risk + GPAI requirements** ← основной дедлайн
- Aug 2, 2027: High-risk Annex I products

**Рекомендации «Что делать?»** — actionable панель:
- Per system: конкретные следующие шаги на основе gaps
- Приоритизация: urgency × impact
- Quick actions: «Создать документ», «Gap Analysis», «Спросить Еву»
- Если **Prohibited**: guidance (прекратить, модифицировать, юрист)
- Если **Non-compliant**: ранжированный план действий с estimated effort
- Если **Compliant**: «Поддерживайте — следите за regulatory updates»

**Детальная страница AI-системы:**
- Classification: risk level badge, метод, confidence, обоснование, статьи
- Requirements checklist: по каждой применимой статье (Art. 9, 10, 11...)
  - Статус: ✅ Выполнено / 🔄 В работе / ❌ Не начато / ⬜ Не применимо
  - Per requirement: что делать, estimated effort, ссылка на документ/шаблон
- Documents: список сгенерированных compliance-документов
- Gap Analysis summary: compliance % + top gaps
- Audit Trail: история всех изменений
- Actions: «Переклассифицировать», «Создать документ», «Спросить Еву»

**Dashboard API** — CQS read-only endpoints

### MVP Scope
- Risk level distribution chart (color-coded)
- Per-system risk badges во всех представлениях
- «Requires attention» панель с приоритизацией
- Рекомендации «Что делать?» per system
- Compliance timeline widget (Art. 113 deadlines)
- Детальная страница системы с requirements checklist
- Responsive grid: mobile → desktop

### Зависимости
Feature 03 (реестр систем), Feature 04a/b/c (classification + requirements)

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
Feature 02 (IAM), Feature 04a/b (Classification — для контекста)

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
- Export в PDF через pg-boss job → Gotenberg (HTML→PDF, self-hosted Docker) → Hetzner Object Storage
- WebSocket уведомление при готовности секции

### MVP Scope
- pg-boss + JobQueue port/adapter (миграция на BullMQ при необходимости)
- Technical Documentation (Art. 11) — единственный тип документа
- Генерация + редактирование + PDF export

### Зависимости
Feature 04c (Requirements mapping — нужна классификация для генерации)

### Экспертиза
Elena: валидация структуры шаблонов на соответствие Art. 11

---

## Feature 08: Gap Analysis & Action Plan

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 5

### Бизнес-ценность
As a compliance officer, I want a detailed gap analysis with specific, actionable recommendations for each non-compliant requirement, so that I know exactly what to do, in what order, and how long it will take.

### Описание

**Анализ gaps per AI-system:**
- Для каждого requirement: статус (fulfilled / in_progress / gap / not_applicable)
- Группировка по статьям AI Act (Art. 9, 10, 11, ...)
- Overall compliance score с трендом (улучшается / ухудшается)

**Рекомендации per gap:**
- Что конкретно нужно сделать (пошаговые инструкции)
- Какая статья AI Act это требует (ссылка + цитата)
- Estimated effort (часы/дни)
- Приоритет: urgency (deadline proximity) × impact (risk level)
- Ссылка на шаблон документа (если есть)
- Кнопка «Спросить Еву» для детального guidance

**Action Plan generation (LLM):**
- Mistral Medium → приоритизированный step-by-step план
- Учитывает: роль (Provider/Deployer), risk level, текущее состояние, дедлайны
- Таймлайн: что можно сделать за 1 неделю / 1 месяц / 3 месяца
- Export как PDF / task list

**Сценарии «Что делать если не соответствует?»:**
1. Для каждого gap → конкретные remediation steps
2. Option: сгенерировать нужный документ прямо сейчас
3. Option: переклассифицировать (если система изменилась)
4. Когда обращаться к юристу (сложные кейсы, спорная классификация)

**UI:** три секции (Fulfilled ✅, In Progress 🔄, Gaps ❌), progress bars, CTAs

### MVP Scope
- Gap analysis per AI-system с группировкой по статьям
- Конкретные рекомендации per gap
- Action plan с приоритетами и estimates
- «Что делать» guidance per scenario
- Visual progress tracking с трендом

### Зависимости
Feature 04c (Requirements mapping — нужны requirements)

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
Feature 06 (Eva базовая), Feature 04a/b (Classification), Feature 07 (Documents)

---

## Feature 11: Onboarding, Notifications & Proactive Compliance Checks

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 6

### Бизнес-ценность
As a compliance officer, I want the platform to proactively remind me about deadlines, overdue tasks and required actions, so that my company is ready before Aug 2, 2026 — not after.

### Описание

**Onboarding:**
- Quick questionnaire (5-7 вопросов) → LLM-оценка масштаба работы
- Eva приветствует и предлагает помощь

**Notification system:**
- Notification bell + dropdown (in-app)
- Email notifications через **Brevo (Франция):** instant / daily digest / weekly (configurable)
- Domain events → Notification creation

**Proactive Scheduled Checks (ежедневный cron):**

| Триггер | Уведомление | Когда |
|---------|-------------|-------|
| Дедлайн AI Act приближается | «До Aug 2, 2026 осталось 90 дней — 3 системы не compliant» | 180d, 90d, 30d, 14d, 7d, 1d |
| Документ не создан | «System X: Technical Documentation (Art. 11) не создана — создать?» | 7 дней после классификации |
| Документ не завершён | «System X: 3 из 8 секций не заполнены — продолжить?» | Каждые 7 дней |
| Requirements не начаты | «System X (High Risk): 5 требований не начаты — начать?» | 3 дня после классификации |
| Классификация устарела | «System Y не обновлялась 6 месяцев — переклассифицировать?» | Каждые 180 дней |
| Система в Draft | «System Z: wizard не завершён — продолжить?» | 3, 7, 14 дней |

- Каждое уведомление содержит **action button** (deep link к нужному экрану)
- Пользователь может отключить/настроить частоту per notification type
- Escalation: если action не выполнен → повторное уведомление + notification Owner организации

### MVP Scope
- Onboarding questionnaire + Eva welcome
- In-app + email notifications (Brevo transactional API)
- Scheduled compliance checks (все триггеры из таблицы)
- Notification preferences (on/off per type)

### Зависимости
Feature 02 (IAM + Brevo уже настроен), Feature 05 (Dashboard — данные для checks), Feature 06 (Eva)

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

## Feature 15: Compliance Copilot — multi-channel delivery

**Приоритет:** P3 (Future) | **Размер:** M | **Тариф:** Growth+ (€149+)

### Бизнес-ценность
As a CTO, I want compliance notifications delivered outside the platform, so that my team stays informed without logging in daily.

### Описание
Расширение Feature 11 (proactive checks) доставкой вне платформы.

**EU-first подход** (соответствует нашему позиционированию "100% European AI"):

| Канал | Data residency | Приоритет | Статус |
|-------|---------------|-----------|--------|
| **Email digest** (weekly compliance report) | EU ✅ | Основной | Feature 11 (уже в P1) |
| **Webhook API** (Zapier, n8n, custom) | Клиент решает | Основной | Первый в Feature 15 |
| **Matrix / Element** | EU ✅ (self-hosted) | EU-рекомендуемый | Второй |
| Slack | US ⚠️ (DPF certified) | Опция | С предупреждением |
| MS Teams | US ⚠️ (DPF certified) | Опция | С предупреждением |

**Принципы:**
- Содержимое уведомлений — **минимальное**: только alert text + deep link в платформу
- Compliance data (risk levels, системы, документы) **НЕ передаётся** в сторонние каналы
- Slack/Teams: при подключении — уведомление «данные уведомлений покидают EU (US DPF)»
- Пользователь явно подтверждает: «Я понимаю, что уведомления будут доставляться через US-сервис»
- Configurable per organization: какие каналы, какая частота, какие типы уведомлений

**⚠️ GDPR note:** AI Act не регулирует каналы доставки. GDPR допускает US-трансфер через Data Privacy Framework (DPF). Но для trust и positioning — EU-каналы в приоритете.

### Зависимости
Feature 11 (Notifications & Proactive Checks)

---

## Feature 16: AI Inventory Scanner — автообнаружение AI-систем

**Приоритет:** P3 (Future) | **Размер:** L | **Тариф:** Scale+ (€399+)

### Бизнес-ценность
As a CTO of a mid-size company with 20+ AI systems across departments, I want the platform to automatically discover AI systems in our infrastructure, so that I have a complete inventory without manual registration.

### Описание
**Интеграционные коннекторы** (OAuth read-only):

| Источник | Что находит | Интеграция |
|----------|-------------|------------|
| AWS (SageMaker, Bedrock) | ML-модели в деплое, AI API calls | IAM Role |
| Azure (Azure ML, OpenAI Service) | ML endpoints, AI services | Service Principal |
| GCP (Vertex AI) | ML pipelines, models | Service Account |
| GitHub / GitLab | Репозитории с ML-кодом | OAuth App |
| API Gateway | Вызовы к OpenAI, Anthropic, Mistral | Log analysis |
| SaaS directory | AI-tools (Copilot, ChatGPT Enterprise) | SSO/SCIM sync |

**Human-in-the-loop:** Scanner НЕ добавляет системы автоматически — только предлагает. Решение за человеком.

### Безопасность
- ⚠️ Требует security review (Leo) перед реализацией
- OAuth scopes: минимальные (read-only)
- DPA обязателен
- Данные сканирования хранятся в EU

### Зависимости
Feature 03 (реестр), Feature 04a/b (classification)

---

## Feature 17: Autonomous Compliance Agent — on-premise

**Приоритет:** P3 (Future) | **Размер:** XL | **Тариф:** Enterprise (€999+)

### Бизнес-ценность
As a CTO of an enterprise with 100+ AI systems, I want a compliance agent deployed inside our infrastructure that continuously monitors AI usage, so that we have real-time compliance visibility.

### Описание
**Автономный агент** в инфраструктуре клиента:
- **Deployment:** Docker container / Kubernetes Helm chart
- **Auto-discovery:** сканирует сеть, API-трафик, container registries
- **Continuous monitoring:** новая модель → уведомление + предложение классифицировать
- **Secure communication:** outbound-only, передаёт только metadata (не данные клиента)
- **Self-updating:** автоматические обновления правил классификации
- **Air-gapped option:** офлайн-режим с ручным экспортом

### Безопасность
- ⚠️⚠️ Требует ПОЛНОГО security audit + external pentest
- Agent code: open-source для клиентского аудита (transparency)
- Zero-trust: агент не имеет write-доступа к системам клиента
- Data minimization: передаёт только metadata
- SOC 2 Type II рекомендуется перед запуском
- AI Act compliance агента: minimal risk, Art. 50 transparency

### Зависимости
Feature 16 (Scanner — переиспользует коннекторы)

---

## Сводка по приоритетам

### P0 — Must Have (MVP core)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 01 | Инфраструктура и настройка | M | 0 |
| 02 | IAM — Auth и управление | L | 1 |
| 03 | Реестр AI-систем + Wizard | L | 1-2 |
| 04a | Rule Engine (rule-based классификация) | L | 2 |
| 04b | LLM Classification + Cross-validation | M | 2-3 |
| 04c | Requirements Mapping + рекомендации | M | 3 |
| 05 | Dashboard & Recommendations | L | 3-4 |
| 06 | Ева (базовая) | L | 4 |

**MVP-ready: Sprint 4 (неделя 8-10)** — классификация, dashboard, базовая Eva

### P1 — Should Have (полноценный продукт)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 07 | Генерация документов | L | 4-5 |
| 08 | Gap Analysis | M | 5 |
| 09 | Billing & подписки | M | 5-6 |
| 10 | Ева tool calling | S | 6 |
| 11 | Onboarding & Proactive Compliance Checks | M | 6 |

**Product-ready: Sprint 6 (неделя 12-14)** — документы, gap analysis, billing, Eva tools

### P2 — Could Have (расширение)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 12 | Regulatory Monitor | M | 7 |
| 13 | Доп. compliance-документы | M | 7-8 |
| 14 | Multi-language (DE/EN) | S | 8 |

**Full scope: Sprint 8 (неделя 16-18)** — regulatory monitor, multi-language

### P3 — Future (post-launch, требует security review)

| # | Feature | Размер | Тариф |
|---|---------|--------|-------|
| 15 | Compliance Copilot (Slack/Teams) | M | Growth+ |
| 16 | AI Inventory Scanner | L | Scale+ |
| 17 | Autonomous Agent (on-premise) | XL | Enterprise |

**Реализация:** после launch, отдельный security review для каждой фичи

---

## Roadmap

```
Sprint 0     ██ Feature 01: Инфраструктура
Sprint 1     ████ Feature 02: IAM + Feature 03: Wizard (start)
Sprint 2     ████ Feature 03: Wizard (end) + Feature 04a: Rule Engine + 04b: LLM (start)
Sprint 3     ████ Feature 04b: LLM (end) + 04c: Requirements + Feature 05: Dashboard
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
| **Ory (self-hosted)** вместо custom auth | Open-source (Apache 2.0), self-hosted на Hetzner EU. Управляет identity, sessions, MFA. Webhook sync → наша БД |
| **Brevo** вместо custom email | EU (Франция), 300 emails/day free. Transactional API для magic links, notifications, digests |
| **Gotenberg** для PDF | Self-hosted Docker, HTML→PDF. Без внешних зависимостей, данные не покидают инфраструктуру |
| **Hetzner Object Storage** для файлов | S3-compatible, €5.27/TB, немецкий data residency. PDF-документы, экспорты |
| **@fastify/rate-limit** | Официальный Fastify plugin, in-process. Заменяет custom Map + sliding window |
| **Better Uptime** (мониторинг) | EU (Литва), free tier. Uptime monitoring + status page |
| **Plausible** (аналитика) | EU (Эстония), €9/мес. Privacy-first, без cookies, GDPR by design |
| **Без кэширования на MVP** | 50 пользователей — PostgreSQL справится с прямыми запросами. Кэш добавить при необходимости |
| **Mistral EU-only** | Sovereign AI: данные клиентов обрабатываются только EU-моделями (Mistral, Франция) |

---

⛔ **APPROVAL GATE:** Product Owner должен утвердить Product Backlog (фичи и приоритеты) перед Sprint Planning.

💡 **Следующий шаг:** После утверждения → Marcus декомпозирует P0-фичи Sprint 0 в User Stories → SPRINT-BACKLOG.md
