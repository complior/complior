# PROJECT.md — AI Act Compliance Platform

**Версия:** 2.0.0
**Дата:** 2026-02-07
**Фаза:** Phase 0 (Architecture & Planning)
**Источник:** PRODUCT-VISION.md v2.0.0 (deployer-first)

---

## 1. Суть проекта

**Название:** AI Act Compliance Platform
**Тип:** Self-service B2B SaaS
**Рынок:** Global — любая компания, работающая с EU-клиентами (не только европейские)
**Позиционирование:** Deployer-first — для компаний, которые ИСПОЛЬЗУЮТ AI

**Проблема:** 125,000+ компаний в Германии уже используют AI-инструменты, но не знают своих обязанностей по AI Act. 70% сотрудников не обучены (Art. 4 AI Literacy обязателен с 02.02.2025). 71% используют AI без одобрения IT (Shadow AI). Традиционный compliance стоит €50-200K. К August 2026 — штрафы до €35M / 7% оборота.

**Решение:** Deployer-first платформа с AI-консультантом "Евой":
- Узнай какой AI использует твоя компания (AI Tool Inventory + каталог 200+ инструментов)
- Оцени риски (гибридный движок: rules + LLM + cross-validation для deployer context)
- Обучи сотрудников (AI Literacy Module — Art. 4, wedge product €49/мес)
- Получи compliance (FRIA, Monitoring Plan, AI Usage Policy, KI-Compliance Siegel)

**Слоган:** "AI Act compliance за 48 часов, а не 12 месяцев"

**Ключевые отличия:**
1. **Deployer-first** — единственная платформа для компаний, которые ИСПОЛЬЗУЮТ AI (не строят)
2. **AI Literacy** — Art. 4 wedge product (уже обязателен, 70% non-compliance)
3. **English-first** — MVP на английском; DE + FR добавляются сразу после MVP
4. **Self-service** — от €49/мес vs €10K+/year у конкурентов (Kertos)
5. **100% EU-sovereign** — Mistral AI + Hetzner + Ory + Brevo

---

## 2. Текущая фаза

| Параметр | Значение |
|----------|----------|
| Фаза | Phase 0 — Architecture & Planning |
| Цель | Создание всех архитектурных артефактов |
| Дедлайн Phase 0 | ~2026-02-14 |
| Следующая фаза | Sprint 001 (разработка) |
| Ключевой внешний дедлайн | August 2, 2026 (AI Act Art. 6 high-risk requirements) |

### Phase 0 Progress

| Артефакт | Статус | Approval |
|----------|--------|----------|
| PRODUCT-VISION.md | ✅ v2.0.0 (deployer-first) | ⏳ Ожидает PO |
| PROJECT.md | ✅ v2.0.0 | Информационный |
| ARCHITECTURE.md | ✅ v2.0.0 (8 BC, 29 tables) | ⏳ Ожидает PO |
| DATABASE.md | ✅ v2.0.0 (+8 tables) | Информационный |
| DATA-FLOWS.md | ✅ v2.0.0 (+4 flows) | Информационный |
| CODING-STANDARDS.md | ✅ Создан | ✅ PO принял |
| PRODUCT-BACKLOG.md | ✅ v3.0.0 (deployer-first) | ⏳ Ожидает PO |
| SPRINT-BACKLOG.md | ✅ v2.0.0 (updated) | ⏳ Ожидает PO |
| COMPETITOR-ANALYSIS.md | ✅ Создан | Информационный |
| ADR-001..004 | ⏳ Ожидает | Информационный |

---

## 3. Ключевые технические решения

### Backend
- **Runtime:** Metasql + VM sandbox (vm.Script) + Fastify
- **Архитектура:** DDD/Onion поверх существующего VM sandbox паттерна
- **БД:** PostgreSQL (Hetzner Managed)
- **Schema management:** MetaSQL (JavaScript schema → SQL DDL + TypeScript types)
- **Auth:** Ory (self-hosted, Hetzner EU) — identity, sessions, MFA, magic links
- **Email:** Brevo (Франция) — transactional API для magic links, notifications, digests
- **Очереди:** pg-boss (PostgreSQL-native, document generation, classification)
- **Rate limiting:** @fastify/rate-limit (официальный Fastify plugin)
- **PDF:** Gotenberg (self-hosted Docker, HTML→PDF)

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript strict
- **UI:** TailwindCSS + shadcn/ui
- **State:** Zustand (global) + React Query (server state)
- **Forms:** React Hook Form + Zod
- **Editor:** Tiptap (rich text для документов)

### AI/LLM Layer (Product — EU Sovereign)
- **Ева (Consultant):** Mistral Large 3 API (EU)
- **Classifier:** Mistral Small 3.1 API (EU) — self-hosted Mixtral 8x22B при >100 клиентов
- **Doc Writer:** Mistral Medium 3 API (EU)
- **Quick Tasks:** Mistral Small 3.1 (self-hosted)

### AI/LLM Layer (Dev Team — любые модели)
- **Marcus (CTO):** Claude Opus 4.6
- **Max (Backend+QA):** GPT-5.2 Codex
- **Nina (Frontend+UX):** Claude Opus 4.6
- **Leo (SecOps):** Gemini 3 Pro
- **Ava (Research):** Gemini 3 Pro
- **Elena (AI Act):** Gemini 3 Flash
- **Alex (Orchestrator):** Kimi K2.5

### Infrastructure
- **Hosting:** Hetzner Cloud (EU data residency, Германия)
- **GPU:** Hetzner GPU Server (1x A100 40GB) — при масштабировании (>100 клиентов, self-hosted LLM)
- **CI/CD:** GitHub Actions
- **CDN/DDoS:** Cloudflare
- **Error tracking:** Sentry
- **Storage:** Hetzner Object Storage (S3-compatible, €5.27/TB) для PDF-документов
- **Monitoring:** Better Uptime (EU, Литва) — uptime + status page
- **Analytics:** Plausible (EU, Эстония) — privacy-first, без cookies

### Workflow
- **Scrum:** 4-column board (Backlog → ToDo → Doing → Done)
- **PR flow:** Developer → Marcus review + Leo security (PARALLEL) → Marcus merge to develop
- **Release:** develop → main (PO approval)
- **Git:** Conventional Commits, branch protection

---

## 4. 7 ключевых систем (deployer-first)

1. **AI Tool Inventory** — каталог 200+ инструментов + wizard регистрации + CSV import + Shadow AI Discovery (P3)
2. **AI Literacy Platform** — role-based курсы (Art. 4) + tracking + certificates (PDF) + compliance widget — **WEDGE PRODUCT €49/мес**
3. **Classification Engine** — rule-based + LLM + cross-validation (deployer context: "Is my USE high-risk?")
4. **FRIA Generator** — guided FRIA wizard (Art. 27) + LLM pre-fill + GDPR DPIA overlap + PDF export
5. **Eva Consultant Chat** — deployer-focused AI consultant + tool calling + streaming
6. **Deployer Dashboard** — AI tools risk inventory + AI Literacy progress + compliance score + KI-Siegel status
7. **User & Organization Management** — Ory (identity + sessions) + multi-tenant + RBAC + billing (Stripe)

---

## 5. Ценностное предложение (deployer-first)

| Аудитория | Ценность |
|-----------|----------|
| CTO / CEO SMB (5-250 сотрудников) | "Какой AI мы используем? Какие риски? Что обязательно?" — ответ за 48 часов |
| HR-директор | AI в HR = high-risk (Annex III). AI Literacy обязательна (Art. 4). Мы готовим курсы и tracking |
| IT-директор | Shadow AI (71% используют без одобрения). Инвентаризация + классификация всех инструментов |
| Compliance Officer | Готовые deployer документы (FRIA, Monitoring Plan, Policies), audit trail, gap analysis |

### Pricing (deployer funnel)

| Tier | Цена | AI-инструментов | Ключевые фичи |
|------|------|----------------|---------------|
| Free | €0 | 0 | AI Act Quick Check (5 мин) + Eva (3 вопроса) + KI-Compass Newsletter |
| Starter | €49/мес | 1 | AI Literacy (курсы + tracking до 10 сотрудников) + 1 classification + Eva (10 msg/day) |
| Growth | €149/мес | 10 | Full Compliance: Inventory + Dashboard + Gap + FRIA + Eva (50 msg/day) + KI-Siegel |
| Scale | €399/мес | 50 | Unlimited + Auto-discovery + Post-market monitoring + API + Eva unlimited |
| Enterprise | Custom | Unlimited | On-premise agent + SLA + custom integrations |

---

## 6. Глоссарий

| Термин | Определение |
|--------|-------------|
| **AI Act** | EU Regulation 2024/1689 — закон об искусственном интеллекте Европейского Союза |
| **Deployer (Betreiber)** | Компания, которая ИСПОЛЬЗУЕТ AI-инструменты (наш основной клиент). Art. 3(4) AI Act |
| **Provider (Anbieter)** | Компания, которая СТРОИТ AI-системы. Art. 3(3) AI Act. P3 Future для нас |
| **AI Tool (KI-Instrument)** | AI-инструмент, который deployer использует (ChatGPT, HireVue, Copilot и т.д.) |
| **AI Literacy (KI-Kompetenz)** | Art. 4 — обязанность обучить сотрудников. Обязательна с 02.02.2025 |
| **FRIA** | Fundamental Rights Impact Assessment (Art. 27) — оценка влияния на основные права |
| **Shadow AI** | AI-инструменты, используемые сотрудниками без одобрения IT (71% по статистике) |
| **KI-Siegel** | Знак соответствия AI Act — бейдж для сайта компании (наша фича) |
| **High Risk AI** | AI-система категории "высокий риск" по Annex III (Art. 6) — deployer обязанности Art. 26-27 |
| **Prohibited AI** | Запрещённые практики AI (Art. 5) — social scoring, real-time biometrics |
| **Limited Risk** | Системы с требованием прозрачности (Art. 50) — chatbots, deepfakes |
| **Minimal Risk** | Системы без обязательных требований (кроме Art. 4 AI Literacy) |
| **Art. 26** | 17 обязанностей deployer'а high-risk AI (надзор, мониторинг, логи, данные) |
| **Art. 27** | Обязательная FRIA для deployer'ов в публичном секторе, кредитовании, страховании |
| **Art. 50** | Обязанности прозрачности (chatbots, deepfakes, emotion recognition) |
| **Annex III** | 8 категорий high-risk AI (biometrics, employment, education, justice, etc.) |
| **Ева** | AI-консультант для deployer'ов — отвечает на английском (+ DE/FR post-MVP), помогает с FRIA и compliance |
| **Classification Engine** | Гибридный движок: rules + LLM + cross-validation (deployer context) |
| **Guided Compliance** | UX: платформа ведёт deployer'а step-by-step |
| **MetaSQL** | Schema management: JavaScript schema → SQL DDL + TypeScript types |
| **VM Sandbox** | Паттерн изоляции модулей через vm.Script + frozen context |
| **DACH** | Немецкоязычный регион: Deutschland, Austria, Confoederatio Helvetica (Швейцария). Ключевой, но не единственный рынок |

---

## 7. Команда (v7.2 — 7 активных агентов)

### Активные

| Агент | Роль | Модель | Tier |
|-------|------|--------|------|
| Alex | Orchestrator (Execution Master) | Kimi K2.5 | ORK |
| Marcus | CTO / Architect (Planning Master) | Claude Opus 4.6 | 0 — Brain |
| Max | Senior Backend + QA | GPT-5.2 Codex | 1 — Senior Dev |
| Nina | Senior Frontend + UX | Claude Opus 4.6 | 1 — Senior Dev |
| Ava | Researcher | Gemini 3 Pro | 1.5 — Specialist |
| Leo | SecOps | Gemini 3 Pro | 2 — Workhorse |
| Elena | AI Act Expert | Gemini 3 Flash | 2 — Workhorse |

### Деактивированы (реактивация при необходимости)

| Агент | Роль | Когда реактивировать |
|-------|------|---------------------|
| Quinn | QA | Sprint 3+ (codebase grows) |
| Kai | UX Designer | Сложные UX flows |
| Diana | Docs | API docs priority |
| Derek | DevOps | Docker/k8s setup |

### Роли

- **Product Owner (Founder):** Утверждает Phase 0 артефакты, Sprint Backlog, Sprint Review, release (develop→main)
- **Alex (Execution Master):** Scrum Board, Daily Scrum, Burndown, Sprint Review, координация
- **Marcus (Planning Master):** Architecture, Sprint Planning (tech), Code Review, merge to develop

---

## 8. Существующий код

**Путь:** `/home/openclaw/PROJECT/existing-code/`

Существующий backend на базе Metasql + VM sandbox + Fastify сохраняется и используется как основа для новой архитектуры. Ключевые паттерны:

- **VM Sandbox Isolation** — модули изолированы через vm.Script с frozen context
- **MetaSQL Schema → SQL** — единый источник правды для БД и типов
- **Framework-agnostic Application** — бизнес-логика не зависит от HTTP framework
- **Layered:** API → Domain → Schema → DB
- **RBAC:** Permission table (role → action → identifier)

**Решение:** ARCHITECTURE.md и CODING-STANDARDS.md созданы ✅. Пример-код сохраняется как reference до начала Sprint 001, затем удаляется (кроме core architecture).

---

## 9. Ссылки на артефакты

| Документ | Путь | Описание |
|----------|------|----------|
| Product Vision | `docs/PRODUCT-VISION.md` | Видение продукта, MVP scope, use cases |
| Project Passport | `docs/PROJECT.md` | Этот файл |
| Architecture | `docs/ARCHITECTURE.md` | DDD/Onion, Mermaid diagrams |
| Database | `docs/DATABASE.md` | ER-diagrams, schema |
| Data Flows | `docs/DATA-FLOWS.md` | Sequence diagrams |
| Coding Standards | `docs/CODING-STANDARDS.md` | Правила кода |
| Product Backlog | `docs/PRODUCT-BACKLOG.md` | Фичи продукта (эпики, приоритеты, MVP scope) |
| Sprint Backlog | `docs/SPRINT-BACKLOG.md` | User Stories для спринта (Marcus при Sprint Planning) |
| ADR | `adr/ADR-00X-*.md` | Architecture Decision Records |
| Team Spec | `AGENTS-Settings.md` | Master spec команды (v7.2) |
| Phase 0 Process | `setup/PHASE-0-ITERATIVE-PROCESS.md` | Процесс Phase 0 |
| Phase 0 Sequence | `setup/PHASE-0-SEQUENCE.md` | Формат артефактов |

---

**Последнее обновление:** 2026-02-07 (v2.0.0: deployer-first pivot)
