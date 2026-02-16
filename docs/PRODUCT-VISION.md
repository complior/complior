# Product Vision — AI Act Compliance Platform (Deployer-First)

**Статус:** ✅ Заполнен Product Owner
**Дата:** 2026-02-12
**Версия:** 2.3.0 (Sprint 6: Admin Panel + Stripe + Deploy)
**Источники:** project1.pdf, eu_sovereign_llm_strategy.md.pdf, llm_strategy_and_product_ux.md.pdf, COMPETITOR-ANALYSIS.md

---

## Changelog

### v2.3.0 (2026-02-15) — Sprint 6: Admin Panel + Stripe + Deploy
- **Sprint 4 completed:** Production deployment (Docker, Caddy, Kratos, GDPR, CI/CD)
- **Sprint 5 completed:** Frontend fully rebuilt — landing page (15 sections), auth (login/register/forgot-password), pricing page, quick check, penalty calculator, checkout success. i18n EN/DE, dark/light themes, Ory Kratos dev integration
- **Sprint 6:** Platform Admin Panel (Feature 24) — cross-org admin API + frontend UI. Stripe test mode setup. Frontend production deployment via Docker + Caddy
- **Platform Admin** as P1 requirement: SaaS owner needs visibility into all users, organizations, subscriptions, and MRR

### v2.2.0 (2026-02-12) — Sprint 3.5 Additions
- **Registration:** Plan-aware flow. `/auth/register?plan=X&period=Y` → free (2-step → dashboard) or paid (3-step → Stripe Checkout → success page → dashboard)
- **Billing (partial):** Stripe Checkout Session + Webhook moved to Sprint 3.5. Full billing management remains Sprint 5-6
- **Lead Gen (partial):** Quick Check + Penalty Calculator moved to Sprint 3.5. Free Classification remains Sprint 5

### v2.1.0 (2026-02-12) — Sprint 3 Additions
- **Global TAM:** Art. 2 extraterritorial scope → 1M+ global deployers (beyond DACH 125K)
- **Provider-Lite segment:** Secondary ICP for bootstrapped AI startups (<50) building for EU market → P2, Sprint 7-8
- **Pricing v3.0:** Tighter Free (1 tool, no Eva), Eva message caps, employee limits, 14-day trial, annual 20% discount
- **Lead Gen tools:** Pre-signup Quick Check, Penalty Calculator, Free Classification — public endpoints, email-gated
- **Eva Guard:** 3-level protection system (system prompt + Mistral Small 3.1 pre-filter + output monitoring)

### v2.0.0 (2026-02-08) — Deployer-First Pivot
- **Стратегический pivot:** universal (providers + deployers) → **deployer-first** (компании, которые ИСПОЛЬЗУЮТ AI)
- **Обоснование:** 125,000+ deployers в Германии vs ~1,100 providers. Конкурент Kertos ($10K+/год, sales-gated) не покрывает deployer-сегмент. Рынок deployers в 120x больше и не обслужен.
- **Новые фичи:** AI Literacy Module (Art. 4), Shadow AI Discovery, FRIA Generator (Art. 27), KI-Compliance Siegel
- **Provider features** → P3 Future (Art. 11 Annex IV, conformity assessment, GPAI model cards)
- **Pricing:** пересмотрен под deployer funnel (€49 wedge → €149 full → €399 scale)

---

## 1. Executive Summary

### Проблема (Problem Statement)

**1,000,000+ компаний глобально подпадают под EU AI Act** по Art. 2 (экстерриториальное действие, аналог GDPR Art. 3). Среди них 125,000+ в Германии (Bitkom 2025: 36% используют AI), 50,000+ AI-стартапов, сотни тысяч SaaS-компаний, обслуживающих EU-клиентов. Но:

- **70% сотрудников не прошли обучение по AI** — а Art. 4 AI Act (AI Literacy) уже обязателен с 2 февраля 2025
- **71% сотрудников используют AI без одобрения IT** (shadow AI) — компания даже не знает, какие AI-инструменты используются
- **Не понимают, что они "Betreiber" (deployers)** — компания, которая использует ChatGPT для HR-скрининга, является deployer high-risk AI-системы по Annex III
- **Не знают своих обязанностей** — Art. 26-27 требуют: human oversight, логирование, FRIA, информирование сотрудников
- **Штрафы:** до €35M или 7% оборота (Art. 99). Для SMB с 20 сотрудниками это смерть бизнеса
- **Дедлайн:** 2 августа 2026 — полные требования для high-risk deployers вступают в силу
- **Нет доступного инструмента:** Kertos — €10K+/год, sales-gated. Vanta/Drata — $10K+/год, US-based. Нет немецкоязычной self-service платформы для SMB

### Решение (Solution)

**Self-service SaaS платформа для компаний, которые ИСПОЛЬЗУЮТ AI:**

```
Узнай какой AI использует → Оцени риски → Обучи сотрудников → Получи compliance
твоя компания               по AI Act      (Art. 4)            за €49/мес
```

1. **AI Tool Inventory** — зарегистрируй все AI-инструменты компании (manual wizard + каталог 200+ инструментов + employee self-service registration с approval workflow)
2. **Risk Classification** — гибридный движок (rules + LLM) определяет risk level каждого инструмента с точки зрения deployer
3. **AI Literacy Module** — обучающие курсы на немецком + tracking completion per employee (Art. 4 — уже обязателен!)
4. **Консультант "Ева"** — AI-чат, объясняющий обязанности deployer простым языком
5. **Compliance Dashboard** — прогресс, дедлайны, gaps, action plan
6. **Deployer Documents** — FRIA (Art. 27), Monitoring Plan, AI Usage Policy — генерация, не с нуля
7. **100% European** — Mistral (Франция), Hetzner (Германия), Ory (self-hosted). Данные не покидают EU

### Ценностное предложение (Value Proposition)

**"Ваши сотрудники уже используют AI. Мы помогаем делать это по закону."**

**Для CTO / IT-директора:**
- Узнай, какие AI-инструменты используют сотрудники (shadow AI → inventory)
- Получи risk classification каждого инструмента за 5 минут
- Чёткий action plan: что делать как deployer (Art. 26-27)
- €49/мес вместо €200K через консультантов

**Для HR-директора:**
- AI в рекрутинге = high-risk по Annex III. Обязанности: human oversight, информирование кандидатов, FRIA
- AI Literacy обучение сотрудников (Art. 4 — уже обязательно)
- Tracking: кто прошёл обучение, кто нет. Certificate per employee

**Для CEO / руководства:**
- Risk overview: сколько AI-инструментов, какой риск, какой прогресс
- AI Literacy: X% сотрудников обучены
- Compliance score для board meetings
- KI-Compliance Siegel — бейдж на сайт ("AI Act Compliant")

---

## 2. Целевая аудитория (Target Audience)

### Deployer — кто это?

**Deployer (Betreiber)** — компания, которая ИСПОЛЬЗУЕТ AI-инструмент. Не строит, а покупает/подключает.

Примеры:
- Рекрутинговое агентство, использующее AI-скрининг резюме → deployer high-risk AI (Annex III, п.4)
- Клиника, использующая AI-диагностику → deployer high-risk AI (медицинское ПО)
- SaaS-компания, использующая ChatGPT для поддержки → deployer limited-risk AI (Art. 50)
- Страховая, использующая AI для расчёта тарифов → deployer high-risk AI (Annex III, п.5)

### Первичная аудитория

- **Кто:** CTO, CEO, HR-директора, IT-менеджеры в SMB
- **Размер:** 5-250 сотрудников (micro + SMB по EU-определению)
- **География:** Global — любая компания, работающая с EU-клиентами или имеющая EU-операции (стартапы, SMB из US, UK, Asia и т.д.)
- **Общее:** Компания ИСПОЛЬЗУЕТ AI-инструменты (ChatGPT, Copilot, AI-рекрутинг, AI-диагностика, чат-боты, AI-аналитика)
- **Характеристики:**
  - Нет выделенного compliance-отдела
  - Не знают, что они "deployers" по AI Act
  - Сотрудники используют AI без формального одобрения (shadow AI)
  - Готовы платить €49-399/мес за самообслуживание vs €10K+ за консалтинг
  - English-first UI; DE + FR сразу после MVP

### Вторичная аудитория: Segment B — Provider-Lite (P2, Sprint 7-8)

**Provider-Lite** — bootstrapped AI-стартапы (<50 человек), которые СТРОЯТ AI-продукты для EU-рынка. Не путать с полными AI Providers (foundation models, GPAI) — те остаются вне нашей аудитории.

**Примеры ICP:**
- SaaS-стартап из UK, добавляющий AI-фичу для EU-клиентов → нужен compliance чеклист по Art. 6/9/11/16
- AI-рекрутинговый стартап из Берлина (5 человек) → provider high-risk, нужен Annex IV tech docs
- Американский fintech, использующий AI для EU-кредитного скоринга → provider + deployer obligations

**Messaging:** "Building AI for the EU market? Check your compliance in 5 minutes."

**Продуктовые фичи (Sprint 7+):**
- Provider-Lite Wizard: "Are you building an AI product?" → домен → конечные пользователи → EU clients? → risk level + provider obligations
- Compliance Checklist Generator (персонализированный PDF)
- EU Market Readiness Score

> **Full AI Providers** (foundation models, GPAI model cards, Art. 51-56) — NOT our audience. Для них: Kertos, Credo AI, Holistic AI. Полные provider features остаются P3.

### Другие вторичные аудитории
- **Консалтинговые компании** — используют как инструмент для своих клиентов (white-label в Enterprise)
- **HR-tech компании** — AI в рекрутинге = high-risk, нужен compliance
- **Стартапы** — Free tier для проверки "попадаю ли я под AI Act?"

### Антипаттерны (кто НЕ наша аудитория)
- **Full AI Providers** (строят foundation models, GPAI) — для них Kertos, Credo AI, Holistic AI. Provider-Lite (bootstrapped startups) — наш Segment B
- Компании, не использующие AI вообще
- Enterprise-гиганты (>5000 человек) с собственными compliance-отделами
- Компании вне EU, не работающие с EU-клиентами и не подпадающие под Art. 2

---

## 3. MVP Scope (Deployer-First)

### Must Have (P0) — Sprint 0-4

- **Infrastructure** (Sprint 0)
  - Monorepo, Fastify backend, MetaSQL schemas, Docker Compose (Ory + Gotenberg + PG)
  - CI/CD, rate limiting, monitoring, analytics

- **IAM — Ory Auth** (Sprint 1)
  - Ory (self-hosted, Hetzner): регистрация, login, magic links, sessions
  - Brevo (Франция): email для magic links
  - Ory webhook → Organization + User + Role + Subscription(free)
  - Multi-tenancy: всё фильтруется по organizationId

- **AI Tool Inventory** (Sprint 1-2)
  - 5-step wizard для регистрации AI-инструментов:
    1. **AI-инструмент:** выбор из каталога 200+ (ChatGPT, Copilot, HireVue...) или добавить свой
    2. **Контекст использования:** как используете, в каком домене (HR, медицина, финансы...)
    3. **Данные и пользователи:** какие данные обрабатывает, кто затронут, уязвимые группы?
    4. **Автономность и контроль:** уровень автономности, human oversight
    5. **Обзор и классификация:** summary → trigger classification
  - Каталог AI-инструментов (seed data: 200+ инструментов с дефолтными risk levels)
  - CSV import (IT-отдел выгружает список используемых SaaS)
  - **Employee self-service registration:** сотрудники регистрируют AI-инструменты (Organization Settings: enable/disable). Approval workflow: submit → review → approved/rejected

- **AI Literacy Module — WEDGE PRODUCT** (Sprint 2-3)
  - Собственный обучающий контент на немецком
  - 4 role-based курса: CEO/Executive, HR Manager, Developer, General Employee
  - Каждый курс: 3-5 модулей, quiz, ~30 минут
  - Tracking completion per employee (import список сотрудников через CSV)
  - Compliance certificate per employee (PDF через Gotenberg)
  - Dashboard widget: "X% сотрудников обучены"
  - **Это €49/мес standalone продукт — уже продаётся, Art. 4 уже обязателен**

- **Risk Classification** (Sprint 2-3)
  - RuleEngine (domain) — Art. 5 prohibited, Annex III domains, GPAI detection
  - LLM analysis (Mistral) — для сложных случаев
  - Cross-validation — при расхождении → эскалация на Mistral Large
  - **Deployer context:** "Какой risk level у МОЕГО ИСПОЛЬЗОВАНИЯ этого AI-инструмента?"
  - Output: riskLevel, deployer requirements (Art. 4, 26, 27, 50), recommendations

- **Deployer Dashboard** (Sprint 3-4)
  - AI Tool Risk Inventory: все инструменты, risk levels, compliance status
  - AI Literacy Progress: X% обучены, кто не прошёл
  - Compliance Score (0-100%) — aggregate
  - "Требует внимания": shadow AI, необученные сотрудники, пропущенные дедлайны
  - Compliance Timeline: дедлайны AI Act (Art. 113)

- **Консультант "Ева"** (Sprint 4)
  - WebSocket-чат, Mistral Large 3 API, streaming
  - **Deployer-focused:** "Bin ich Betreiber?", "Ist unser HR-Tool high-risk?", "Was muss ich als Betreiber tun?"
  - Context injection: данные компании, AI-инструменты, compliance status
  - Rate limiting по плану (Free: 3 вопроса, Starter: 10 msg/day)

### Should Have (P1) — Sprint 4-6

- **Deployer Document Generation** (Sprint 4-5)
  - FRIA (Art. 27) — Fundamental Rights Impact Assessment
  - Monitoring Plan — план мониторинга AI-инструментов
  - AI Usage Policy — корпоративная политика использования AI
  - Employee Notification templates — информирование сотрудников (Art. 26(7))
  - LLM-генерация черновиков → пользователь редактирует → PDF export (Gotenberg)

- **Gap Analysis & Action Plan** (Sprint 5)
  - Per AI tool: какие deployer requirements выполнены, какие нет
  - Приоритизированный action plan
  - "Что делать" per gap: конкретные шаги

- **FRIA Generator** (Sprint 5)
  - Guided workflow: affected persons → risks → oversight → mitigation
  - Pre-fill из GDPR DPIA ("60% уже сделано")
  - Для: public service deployers, credit scoring, insurance (Art. 27)

- **Billing** (Sprint 5-6) — Stripe, 5 тарифов

- **Eva Tools** (Sprint 6) — tool calling: classify_ai_tool, create_fria, setup_monitoring

- **Onboarding + Notifications** (Sprint 6) — proactive compliance checks, email (Brevo)

### Could Have (P2) — Sprint 7-8

- **Regulatory Monitor** — EUR-Lex, deployer-relevant articles
- **KI-Compliance Siegel** — trust badge для сайта ("AI Act Compliant")
- **Additional docs** — Risk Assessment (Art. 9 deployer), Incident Report templates
- **Multi-language** — + DE, FR (English is default from MVP)

### P3 — Future (post-launch)

- **Shadow AI Auto-Discovery** (EU-sovereign, см. §4a)
- **Provider features** — Art. 11 Annex IV tech docs, conformity assessment (Art. 43), GPAI model cards (Art. 51-56), CE Declaration (Art. 47), EU DB registration (Art. 49)
- **Compliance Copilot** — multi-channel delivery (webhook, Matrix, Slack)
- **Autonomous Agent** — on-premise monitoring
- **ISO 42001** — AI Management System support
- **Personio integration** — HR AI compliance bundle

---

## 4. Технические требования

### Стек (Tech Stack)

**Frontend:**
- Next.js 14 (App Router) + TypeScript strict
- TailwindCSS + shadcn/ui (design system)
- React Hook Form + Zod (forms + validation)
- XState (wizard state management)
- React Query (data fetching)
- Tiptap (rich text editor для документов)

**Backend:**
- Metasql + VM sandbox (vm.Script) + Fastify runtime (существующая архитектура)
- PostgreSQL (Hetzner Managed)
- pg-boss (job queues — PostgreSQL-native, без Redis на MVP)

**Auth & Email:**
- Ory (self-hosted, Hetzner EU) — identity, sessions, MFA, magic links
- Brevo (Франция) — transactional email, 300/day free

**PDF & Storage:**
- Gotenberg (self-hosted Docker) — HTML→PDF для certificates, FRIA, documents
- Hetzner Object Storage (S3-compatible) — PDF, exports

**AI/LLM Layer (EU Sovereign):**
- **Framework:** Vercel AI SDK 6 (model-agnostic, Apache 2.0) — [ADR-005](ADR-005-vercel-ai-sdk.md)
  - `streamText` (Fastify) + `useChat` (Next.js) — SSE streaming для Eva
  - Zod-typed tools: `classifyAITool`, `searchRegulation`, `createFRIA`
  - `needsApproval` flag для compliance-critical actions
- **Ева:** Mistral Large 3 API (EU) via `@ai-sdk/mistral` — deployer Q&A
- **Classifier:** Mistral Small 3.1 API (EU) — risk classification
- **Doc Writer:** Mistral Medium 3 API (EU) — document generation
- **Quick Tasks:** Mistral Small 3.1 API (EU) — autocomplete, forms
- **Cross-validation:** Mistral Large 3 API — для эскалации
- **Autonomous Agents (P3):** Claude Agent SDK — Shadow AI Discovery + On-premise Agent
- **Agent Integrations (P3):** Nango (self-hosted EU) — вместо Composio (US data)
- **Масштабирование:** При >100 клиентов → self-hosted Mistral (Hetzner GPU)

**Infrastructure:**
- Hetzner Cloud (EU, Германия)
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- @fastify/rate-limit (official plugin)
- Better Uptime (Литва) — мониторинг
- Plausible (Эстония) — аналитика, без cookies

### 4a. Shadow AI Auto-Discovery (P3, EU-Sovereign)

Автоматическое обнаружение AI-инструментов **без зависимости от US-сервисов (M365/Google)**:

**Метод 1: DNS/Proxy Log Analysis**
- Компания экспортирует логи из firewall (pfSense, OPNsense, Sophos)
- Платформа парсит домены: openai.com, anthropic.com, jasper.ai, midjourney.com и т.д.
- База 200+ AI-доменов. Результат: "12 AI-сервисов за месяц, 3 high-risk"
- Формат: загрузи CSV/JSON → анализ → отчёт

**Метод 2: Browser Extension (self-hosted)**
- Лёгкое расширение Chrome/Firefox, устанавливается сотрудникам
- Детектирует посещение AI-сайтов, отправляет на наш сервер (Hetzner)
- Собирает ТОЛЬКО: домен + timestamp. Не содержимое, не промпты
- Privacy-friendly, GDPR-compliant

**Метод 3: Ory/Keycloak OAuth Audit**
- Если компания использует Ory/Keycloak для SSO — читаем список OAuth-приложений
- AI-инструменты, авторизованные через корпоративный SSO → видны
- Полностью EU-sovereign

**Timeline:** MVP manual → Sprint 5-6 DNS logs → Sprint 7+ browser extension + OAuth audit

### Нефункциональные требования

**Performance:**
- Classification: < 3 sec rule-based, < 15 sec с LLM
- Dashboard load: < 2 sec
- Eva response: < 5 sec (streaming)
- AI Literacy course load: < 1 sec
- Target: 100 concurrent users для MVP

**Security:**
- EU data residency (Hetzner, Германия)
- Encryption at rest (AES-256) и in transit (TLS 1.3)
- GDPR compliance by design
- No US/CN models для данных клиентов (Mistral only)
- OWASP Top 10 compliance
- Rate limiting на public endpoints
- **Eva topic boundary:** 3-level protection (system prompt scope → Mistral Small 3.1 pre-filter → output monitoring)

---

## 5. Ключевые Use Cases

### UC-1: Регистрация и онбординг (Sprint 3.5 — Plan-Aware)
```
As a CTO of a company that serves EU clients
I want to register and find out if AI Act applies to my company
So that I understand what my obligations are as an AI deployer
```
**Шаги:**
1. Landing/Pricing: User selects a plan on `/pricing` page → CTA links to `/auth/register?plan={name}&period={period}`
2. Signup Step 1 (Account): Email, password, name. Selected plan badge shown at top
3. Signup Step 2 (Company): Company name, size, industry (mandatory)
4. **Free plan:** → redirect to `/dashboard`. **Paid plan:** → Step 3 (Trial Confirmation) → redirect to Stripe Checkout
5. **Stripe Checkout** (paid only): User enters credit card on Stripe-hosted page. 14-day trial starts
6. **Checkout Success** (paid only): `/checkout/success?session_id=cs_xxx` — polls API, shows plan badge + trial details, auto-redirect to dashboard
7. Dashboard: Quick questionnaire "Какие AI-инструменты использует ваша компания?" (select из каталога)
8. Мгновенный результат: "3 из 5 инструментов — high-risk. Art. 4 AI Literacy уже обязателен."

### UC-2: Регистрация AI-инструмента
```
As an IT manager
I want to register all AI tools our company uses
So that I have a complete inventory with risk levels
```
**Шаги:**
1. "+ Добавить инструмент" → выбор из каталога (ChatGPT, Copilot, HireVue...) или ввод вручную
2. 5-step wizard: инструмент → контекст → данные → автономность → обзор
3. Автоматическая risk classification → risk level + deployer requirements
4. Инструмент появляется на Dashboard с risk badge

### UC-3: AI Literacy — обучение сотрудников
```
As an HR director
I want to ensure all employees complete AI literacy training
So that our company complies with Art. 4 AI Act (already mandatory)
```
**Шаги:**
1. Импорт списка сотрудников (CSV: name, email, role)
2. Назначение курсов по ролям (CEO → Executive, HR → HR Manager, Dev → Developer, остальные → General)
3. Сотрудники получают email-приглашение (Brevo), проходят курс
4. Dashboard: X% completion, кто не прошёл
5. Certificate per employee (PDF через Gotenberg)

### UC-4: Общение с консультантом Евой
```
As a CTO without legal background
I want to ask about AI Act deployer obligations in simple language
So that I understand what to do for my specific AI tools
```
**Примеры вопросов:**
- "Мы используем ChatGPT для ответов клиентам — это high risk?"
- "Наш рекрутер использует AI-скрининг резюме — что нам нужно делать?"
- "Art. 4 уже обязателен — мы в нарушении?"
- "Нужен ли нам FRIA?"

### UC-5: Dashboard мониторинг
```
As a CEO
I want to see compliance status of all AI tools and employee training
So that I can report to the board and prioritize resources
```
**Данные:**
- AI Tool Inventory: 7 инструментов, 2 high-risk, 3 limited, 2 minimal
- AI Literacy: 78% сотрудников обучены
- Compliance Score: 62% → action plan
- "Требует внимания": 2 high-risk инструмента без FRIA, 5 сотрудников без обучения

### UC-6: FRIA — Fundamental Rights Impact Assessment
```
As a compliance officer using high-risk AI
I want a guided FRIA workflow
So that I fulfill Art. 27 deployer obligations
```
**Шаги:**
1. Выбираю AI-инструмент → "Создать FRIA"
2. Guided wizard: affected persons → specific risks → human oversight → mitigation
3. Pre-fill из GDPR DPIA ("60% данных уже есть")
4. LLM генерирует черновики секций → я редактирую
5. Export PDF → audit-ready

---

## 6. AI-агенты в продукте

### Архитектура AI-агентов

```
┌─────────────────────────────────────────────────────┐
│            КОНСУЛЬТАНТ "ЕВА"                        │
│         Mistral Large 3 API (EU)                    │
│  Deployer Q&A, помощь пользователям                 │
│                                                     │
│  ┌──────────────── EVA GUARD ─────────────────┐     │
│  │ L1: System Prompt (topic scope, redirects) │     │
│  │ L2: PRE-FILTER Mistral Small 3.1           │     │
│  │     ON_TOPIC → Large | OFF_TOPIC → canned  │     │
│  │ L3: Output monitor (logging, sampling 5%)  │     │
│  └────────────────────────────────────────────┘     │
└───────────────────┬─────────────────────────────────┘
          ┌─────────┼─────────┐
          ▼         ▼         ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │CLASSIFIER│ │DOC WRITER│ │ AUDITOR  │
  │Mistral   │ │Mistral   │ │Mistral   │
  │Small 3.1 │ │Medium 3  │ │Medium 3  │
  │API (EU)  │ │API (EU)  │ │API (EU)  │
  │скорость  │ │качество  │ │качество  │
  └──────────┘ └──────────┘ └──────────┘
          │
  ┌──────────────────────────────────────┐
  │    ВЫСОКОЧАСТОТНЫЕ ЗАДАЧИ            │
  │    Mistral Small 3.1 API (EU)        │
  │    Autocomplete, quiz, forms         │
  └──────────────────────────────────────┘
```

### Степень автоматизации

| Компонент | Автоматизация | Роль человека |
|-----------|:---:|---|
| Risk Classification | 80-90% | Утверждает классификацию |
| AI Literacy Content | 90% | Валидирует курсы на старте |
| FRIA Generation | 60-70% | Редактирует черновики |
| Gap Analysis | 80% | Валидирует приоритеты |
| Eva Chat (Q&A) | 80% | Контроль качества на старте |
| Shadow AI Detection | 50% | Подтверждает / отклоняет обнаружения |

---

## 7. EU Sovereign AI Strategy

### Почему это критично

```
"Мы продаём EU AI Act compliance, но используем US модели для данных клиентов"
→ Это лицемерие. Kertos хостится на AWS. Мы — на Hetzner. Это наше преимущество.
```

### Наш подход: 100% European AI

| Аспект | Наша платформа | Kertos | Vanta/Drata |
|--------|:---:|:---:|:---:|
| AI модели | Mistral (Франция) | ? | OpenAI (US) |
| Хостинг | Hetzner (Германия) | AWS Europe | AWS US |
| Auth | Ory (self-hosted EU) | ? | US-managed |
| Email | Brevo (Франция) | ? | US services |
| PDF | Gotenberg (self-hosted) | ? | US services |
| US CLOUD Act | Не применим | Риск (AWS) | Применим |
| Self-service | ✅ | ❌ (demo) | Partial |
| Цена/мес | €49-399 | ~$830+ | ~$830+ |

### Стоимость AI layer

```
Mistral API (EU) — все модели через API на старте:
├── Ева (Large 3): ~$1,000/мес на 1000 клиентов
├── Doc Writer (Medium 3): ~$80/мес
├── Classifier (Small 3.1): ~$30/мес
├── Quick Tasks (Small 3.1): ~$10/мес
└── Итого: ~$1,120/мес на 1000 клиентов = ~$1.1/клиент/мес

При подписке €49-399/мес → отличная маржа
```

### Разделение: Product vs Dev Team

```
PRODUCT (данные клиентов):          DEV TEAM (наш код):
├── ТОЛЬКО Mistral (EU)             ├── Любые модели
├── ТОЛЬКО Hetzner (EU)             ├── Claude, GPT, Gemini
└── Данные НЕ покидают EU           └── Минимальный риск
```

---

## 8. Pricing Tiers v3.0 (Deployer Funnel)

> **Source of truth:** `app/config/plans.js`. Таблица ниже — для обзора. Prices: $49 / €49 (dual display, stored in EUR cents).

**Lead Gen (без аккаунта):** Quick Check, Penalty Calculator, 1 Free Classification — public, email-gated.

| | Free | Starter $49/мес | Growth $149/мес | Scale $399/мес | Enterprise |
|---|:---:|:---:|:---:|:---:|:---:|
| **AI-инструменты** | 1 | 5 | 20 | Unlimited | Unlimited |
| **Users** | 1 | 2 | 10 | Unlimited | Unlimited |
| **Employees** | 0 | 15 | 50 | 250 | Unlimited |
| **Eva Chat** | ❌ (0 msg) | 200 msg/мес | 1,000 msg/мес | Unlimited | Unlimited + SLA |
| **Risk Classification** | Basic (1) | Full | Full | Full | Full |
| **AI Literacy курсы** | - | ✅ (4 курса) | ✅ | ✅ | Custom |
| **Dashboard** | - | Basic | Full | Full | Full |
| **Compliance Timeline** | - | ✅ | ✅ | ✅ | ✅ |
| **CSV Import** | - | Basic | Full | Full | Full |
| **CSV Import AI tools** | - | - | ✅ | ✅ | ✅ |
| **Employee Self-Reg** | - | - | ✅ | ✅ | ✅ |
| **FRIA Generator** | - | - | ✅ | ✅ | ✅ |
| **Doc Generation** | - | - | ✅ | ✅ | Custom templates |
| **Gap Analysis** | - | - | ✅ | ✅ | ✅ |
| **Compliance Badge** | - | - | ✅ | ✅ Premium | ✅ Premium |
| **Auto-Discovery** | - | - | - | ✅ | ✅ |
| **API Access** | - | - | - | ✅ | ✅ |
| **White-label** | - | - | - | - | ✅ |
| **On-premise** | - | - | - | - | ✅ |
| **SLA** | - | - | - | - | ✅ |
| **Trial** | Без карты | 14 дней (карта) | 14 дней (карта) | 14 дней (карта) | — |
| **Annual discount** | — | 20% off | 20% off | 20% off | Custom |

**Funnel:**
- **Lead Gen (public)** → Quick Check + Penalty Calculator + 1 Free Classification → email capture → CTA signup
- **Free** → try 1 tool, no Eva → upgrade path clear
- **Starter $49** → wedge: AI Literacy + 5 tools + Eva (200 msg) + CSV import
- **Growth $149** → full compliance: 20 tools, docs, FRIA, gap analysis, badge, employee self-reg
- **Scale $399** → unlimited tools/users + auto-discovery + API
- **Enterprise** → custom pricing, on-premise, white-label, SLA

---

## 9. Classification Engine — Deployer Context

### Гибридный 4-шаговый алгоритм (тот же движок, deployer промпты)

**Step 1: Rule-based Pre-filter (instant)**
- Input: данные из wizard (инструмент, домен использования, данные, автономность)
- Проверка: Art. 5 prohibited (социальный скоринг, real-time biometrics)
- Проверка: Annex III domains (HR, медицина, финансы, образование...)
- Вопрос: "В каком контексте вы ИСПОЛЬЗУЕТЕ этот инструмент?"
- Output: preliminary_risk_level, confidence

**Step 2: LLM Analysis (если confidence < 90%)**
- Mistral Small 3.1: описание использования → JSON {risk_level, deployer_requirements, reasoning}
- Промпт: "Компания использует [инструмент] для [цель] в домене [домен]. Какой risk level для deployer?"

**Step 3: Cross-validation**
- Если rule-based ≠ LLM → Mistral Large 3
- Output: final_classification, confidence, reasoning

**Step 4: Deployer Requirements Mapping**
- HIGH_RISK deployer → Art. 4 (literacy), 26 (17 обязанностей), 27 (FRIA), 50 (transparency)
- LIMITED deployer → Art. 4, 50 (transparency к пользователям)
- MINIMAL deployer → Art. 4 (только literacy)
- PROHIBITED → WARNING: прекратить использование
- Output: requirements[], recommendations[], estimated_effort

---

## 10. Content Strategy (Lead Generation)

### Pre-signup Lead Magnets (без аккаунта)

Три публичных инструмента с email-gate через Brevo. Покрывают весь top-of-funnel:

| Tool | Route | Цель | Механика |
|------|-------|------|----------|
| **Quick Check** | `/check` | Awareness: "Подпадаю ли я?" | 5 вопросов → email → instant result → CTA signup |
| **Penalty Calculator** | `/penalty-calculator` | Urgency: "Сколько штраф?" | Revenue input → Art. 99 formula (7%/€35M) → shareable OG card |
| **Free Classification** | `/tools/new` | Product experience | 1 tool из каталога → полный результат → CTA "Add more → Start trial" |

- Public endpoints, rate-limited (10/IP/hour via @fastify/rate-limit)
- Email capture → Brevo lead list → nurture sequence
- No auth required, no account created

### Контентный moat (чего нет ни у кого)

**Немецкоязычная AI Act экосистема фрагментирована** — Bitkom имеет PDF-гайд, IHK — региональные базовые гайды. Нет доминантного ресурса. Мы заполняем этот gap:

1. **KI-Kompass Newsletter** — еженедельный, бесплатный, на немецком. AI Act updates, практические советы
2. **Free AI Act Compliance Checker** — лучше EU-версии, deployer-focused
3. **Template Library** — FRIA шаблоны, AI Usage Policy, Employee Notification letters
4. **Blog/SEO** — "KI-Verordnung Betreiberpflichten", "Schatten-KI Risiken", "Art. 4 KI-Kompetenz"

Кто владеет контентом — владеет top-of-funnel.

---

## 11. Ограничения и Constraints

### Бюджет
- Infrastructure: ~€100-300/мес (Hetzner, без GPU на старте)
- AI API: ~€200-1200/мес (Mistral API)
- Dev team: OpenClaw (~€160-255/мес)
- Total: ~€1,200-2,750/мес на старте

### Временные
- MVP ready: Sprint 4 (~8-10 недель)
- Product ready: Sprint 6 (~12-14 недель)
- AI Act deadline: 2 августа 2026

### Юридические
- Disclaimer: "Не является юридической консультацией"
- No liability за классификацию
- EU data residency обязательно
- GDPR compliance by design

### Out of Scope (что НЕ делаем в MVP)
- Provider features (Art. 11, Art. 43, GPAI) → P3
- On-premise → Enterprise only, post-MVP
- Mobile app → responsive web
- ISO 42001 → post-MVP
- Интеграция с Personio/DATEV → post-MVP
- Shadow AI auto-discovery → post-MVP (EU-sovereign)

---

## 12. Success Metrics

### MVP (Month 1-6)
- 100+ зарегистрированных организаций
- 500+ классифицированных AI-инструментов
- 20+ платящих клиентов (Starter+)
- 1000+ сотрудников прошли AI Literacy
- Classification accuracy > 90%
- NPS > 40

### Key Metrics
- Monthly Active Organizations (MAO)
- AI Literacy completion rate
- Conversion: Free → Starter (target: 15-20%)
- Conversion: Starter → Growth (target: 20-30%)
- ARPA (Average Revenue Per Account)
- Churn rate (target: < 5% monthly)
- Time-to-compliance (от регистрации до "compliant")

---

## 13. Риски

### Технические
| Риск | Вероятность | Импакт | Митигация |
|------|:---:|:---:|---|
| Classification accuracy < 90% | Medium | High | Cross-validation + human review |
| Mistral API downtime | Low | High | Retry + queue + self-hosted fallback |
| AI Literacy контент устаревает | Medium | Medium | Elena (AI Act expert) мониторит |

### Бизнес
| Риск | Вероятность | Импакт | Митигация |
|------|:---:|:---:|---|
| Kertos углубляет AI Act модуль | High | Medium | Speed to market + deployer focus + price |
| SMB не готовы платить | Medium | High | Free tier + Art. 4 urgency + content marketing |
| AI Act deadline сдвигается | Low | Medium | AI Literacy уже обязателен (Art. 4) |

### Юридические
| Риск | Вероятность | Импакт | Митигация |
|------|:---:|:---:|---|
| Liability за неверную классификацию | Medium | High | Disclaimers + "recommendation, not legal advice" |
| AI Literacy контент неточный | Low | High | Elena валидирует + юридический review |

---

## 14. 6-системная архитектура

### 6 ключевых систем для проектирования:

1. **AI Tool Classifier** — rule-based + LLM + cross-validation + deployer requirements mapping
2. **AI Literacy Platform** — курсы, модули, quiz, tracking, certificates
3. **Eva Deployer Consultant** — conversation + context injection + tool calling + streaming
4. **Deployer Compliance Dashboard** — AI inventory, risk levels, literacy progress, compliance score
5. **User & Organization Management** — Ory + multi-tenant + roles + billing (Stripe)
6. **Document Generator** — FRIA, Monitoring Plan, AI Usage Policy, Employee Notification + PDF export

---

## 15. Next Steps

1. ✅ Product Vision v2.0 (Deployer-First Pivot)
2. → Обновить PRODUCT-BACKLOG.md (deployer features + new features 18-20)
3. → Обновить ARCHITECTURE.md (bounded contexts + new modules)
4. → Обновить DATABASE.md (new tables + seed data)
5. → Обновить DATA-FLOWS.md (deployer flows)
6. → Обновить SPRINT-BACKLOG.md (Sprint 0 adjustments)
7. → Создать COMPETITOR-ANALYSIS.md
8. → Sprint 0 начинается

---

## Approval Section

- [x] **Product Owner Review v1.0:** 2026-02-07 ✅ Принято
- [x] **Product Owner Review v2.0 (Deployer-First):** ✅ Утверждено PO (2026-02-10)
- [x] **Ready for Phase 0 Technical Artifacts:** YES
