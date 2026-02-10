# PRODUCT-BACKLOG.md — AI Act Compliance Platform (Deployer-First)

**Версия:** 3.0.0
**Дата:** 2026-02-08
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ⏳ Ожидает утверждения PO (Deployer-First Pivot)
**Зависимости:** PRODUCT-VISION.md v2.0 ✅

---

## Changelog

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
- Monorepo: `src/` (backend, Onion Architecture) + `frontend/` (Next.js 14)
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

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 1

### Бизнес-ценность
As a CTO компании, работающей с EU-клиентами, I want to register, login and manage my team's access, so that we can securely use the compliance platform.

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

### Зависимости
Feature 01 (инфраструктура)

---

## Feature 03: AI Tool Inventory — Реестр AI-инструментов

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 1-2

### Бизнес-ценность
As an IT manager, I want a centralized inventory of all AI tools our company uses, so that I can assess compliance risks for each tool.

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

**5-step Wizard** (XState) для добавления:
1. **AI-инструмент** — выбор из каталога или ввод вручную (название, vendor, описание)
2. **Контекст использования** — как используете, **домен Annex III** (HR, медицина, финансы...), цель
3. **Данные и пользователи** — персональные данные, **уязвимые группы?**, масштаб, кто затронут
4. **Автономность и контроль** — уровень автономности, human oversight, **safety component?**
5. **Обзор и классификация** — summary → trigger classification

- Auto-save на каждом шаге
- CSV import: IT-отдел выгружает список SaaS-приложений
- CRUD API (`/api/tools`) с multi-tenancy

### MVP Scope
- Полная страница реестра с risk level badges
- Wizard с deployer-focused вопросами
- AI Tool Catalog (seed: 200+ инструментов)
- CSV import для массового добавления
- Lifecycle статусы (5 состояний)
- Responsive, WCAG AA

### Зависимости
Feature 02 (IAM)

---

## Feature 18: AI Literacy Module — Обучение сотрудников (Art. 4)

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 2-3

### Бизнес-ценность
As an HR director, I want to ensure all employees complete AI literacy training, so that our company complies with Art. 4 AI Act (already mandatory since Feb 2, 2025).

**⚠️ WEDGE PRODUCT** — это standalone продукт за €49/мес. Art. 4 уже обязателен. 70% сотрудников не обучены.

### Описание

**Обучающий контент (собственный, на немецком):**
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

## Feature 04b: LLM Classification + Cross-validation

**Приоритет:** P0 (Must Have) | **Размер:** M | **Спринт:** 2-3

### Бизнес-ценность
As a CTO with ambiguous AI tool usage, I want LLM analysis, so that edge cases are handled correctly.

### Описание

**Application-layer orchestration (classifyAITool use case):**
1. Вызывает RuleEngine → rule-based результат
2. Вызывает LLM (Mistral Small) → deployer-focused промпт: "Компания использует [tool] для [purpose] в домене [domain]. Какой risk level для deployer?"
3. **Cross-validation:** при расхождении → Mistral Large
4. Финальный результат: riskLevel, confidence, reasoning, deployerRequirements[]

**Переклассификация:**
- Контекст использования изменился → переклассификация
- Новый riskLevel → обновление requirements → notification

### MVP Scope
- classifyAITool use case в application/classification/
- LLM через infrastructure port (Mistral API adapter)
- Cross-validation logic
- Classification history (ClassificationLog)

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

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 3-4

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

## Feature 06: Консультант Ева (Deployer Focus)

**Приоритет:** P0 (Must Have) | **Размер:** L | **Спринт:** 4

### Бизнес-ценность
As a CTO без юридического бэкграунда, I want to ask about deployer obligations in plain language, so that I understand what to do for my specific AI tools.

### Описание
- **Vercel AI SDK 6** — framework для streaming chat ([ADR-005](ADR-005-vercel-ai-sdk.md)):
  - Backend: `streamText()` на Fastify с Mistral Large 3 API (EU)
  - Frontend: `useChat()` hook в Next.js — SSE streaming, zero boilerplate
  - Provider: `@ai-sdk/mistral` (model-agnostic — можно переключить на Claude/GPT без изменений кода)
- **Deployer-focused system prompt:** обязанности deployer, Art. 26-27, shadow AI risks
- Context injection: AI-инструменты компании, risk levels, AI Literacy status
- Quick actions: "Что мне делать как deployer?", "Нужен ли FRIA?", "Как обучить сотрудников?"
- Цитирование статей AI Act
- Disclaimer: «не является юридической консультацией»
- Rate limiting по плану

### MVP Scope
- Базовый чат со streaming (deployer Q&A) via Vercel AI SDK `streamText` + `useChat`
- Контекстные ответы (видит AI-инструменты и compliance status)
- Без tool calling (добавляется в Feature 10)

### Зависимости
Feature 02 (IAM), Feature 04a/b (Classification — для контекста)

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

**Приоритет:** P1 (Should Have) | **Размер:** M | **Спринт:** 5-6

### Описание
- Stripe Checkout integration
- 5 тарифов: Free, Starter (€49), Growth (€149), Scale (€399), Enterprise (custom)
- Feature limits: maxTools, maxUsers, maxEmployees, maxMessages из Plan
- Pricing page с comparison table

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

**Когда:** После product-market fit с deployer-сегментом. При запросе от клиентов, которые также являются AI providers.

| Feature | Статья | Описание |
|---------|--------|----------|
| Technical Documentation (Art. 11) | Annex IV | Генерация 12 секций tech docs для AI providers |
| Conformity Assessment (Art. 43) | Self-assessment | Guided workflow для self-assessment high-risk AI |
| GPAI Model Cards (Art. 51-56) | Transparency sheets | Для GPAI model providers |
| CE Declaration (Art. 47) | Conformity declaration | EU Declaration of Conformity |
| EU DB Registration (Art. 49) | Annex VIII | Pre-fill + submission help |

---

## Сводка по приоритетам

### P0 — Must Have (Deployer MVP)

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 01 | Инфраструктура | M | 0 |
| 02 | IAM (Ory) | L | 1 |
| 03 | AI Tool Inventory + Wizard | L | 1-2 |
| 18 | **AI Literacy Module (WEDGE)** | L | 2-3 |
| 04a | Rule Engine (deployer) | L | 2 |
| 04b | LLM Classification | M | 2-3 |
| 04c | Deployer Requirements Mapping | M | 3 |
| 05 | Deployer Dashboard | L | 3-4 |
| 06 | Ева (deployer focus) | L | 4 |

**MVP-ready: Sprint 4 (неделя 8-10)** — inventory, AI Literacy, classification, dashboard, Eva

### P1 — Should Have

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 07 | Deployer Doc Generation | L | 4-5 |
| 08 | Gap Analysis | M | 5 |
| 19 | FRIA Generator (Art. 27) | M | 5 |
| 09 | Billing | M | 5-6 |
| 10 | Eva tool calling | S | 6 |
| 11 | Onboarding + Notifications | M | 6 |

**Product-ready: Sprint 6 (неделя 12-14)**

### P2 — Could Have

| # | Feature | Размер | Спринт |
|---|---------|--------|--------|
| 12 | Regulatory Monitor | M | 7 |
| 20 | KI-Compliance Siegel | S | 7 |
| 13 | Доп. deployer-документы | M | 7-8 |
| 14 | Multi-language (+ DE, FR) | M | post-MVP |

### P3 — Future

| # | Feature | Размер |
|---|---------|--------|
| 15 | Compliance Copilot | M |
| 16 | Shadow AI Auto-Discovery (EU) | L |
| 17 | Autonomous Agent | XL |
| — | Provider Features (Art. 11, 43, 47, 51-56, 49) | XL |

---

## Roadmap

```
Sprint 0     ██ Feature 01: Infrastructure
Sprint 1     ████ Feature 02: IAM + Feature 03: AI Tool Inventory (start)
Sprint 2     ████ Feature 03 (end) + Feature 18: AI Literacy + Feature 04a: Rules
Sprint 3     ████ Feature 04b/c: Classification + Feature 05: Dashboard
Sprint 4     ████ Feature 05 (end) + Feature 06: Eva + Feature 07: Deployer Docs (start)
             ── MVP READY ──
Sprint 5     ████ Feature 07 (end) + Feature 08: Gap + Feature 19: FRIA + Feature 09: Billing
Sprint 6     ██ Feature 09 (end) + Feature 10: Eva tools + Feature 11: Onboarding
             ── PRODUCT READY ──
Sprint 7     ████ Feature 12: Reg Monitor + Feature 20: KI-Siegel + Feature 13: Docs
Sprint 8     ██ Feature 13 (end)
             ── FULL SCOPE ──
Sprint 8+    ██ Feature 14: i18n (+ DE, FR) — сразу после MVP
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

⛔ **APPROVAL GATE:** Product Owner должен утвердить Deployer-First Backlog перед Sprint Planning.

💡 **Следующий шаг:** После утверждения → обновить ARCHITECTURE.md, DATABASE.md, DATA-FLOWS.md, SPRINT-BACKLOG.md
