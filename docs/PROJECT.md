# PROJECT.md — AI Act Compliance Platform

**Версия:** 1.0.0
**Дата:** 2026-02-07
**Фаза:** Phase 0 (Architecture & Planning)
**Источник:** PRODUCT-VISION.md v1.0.0

---

## 1. Суть проекта

**Название:** AI Act Compliance Platform
**Тип:** Self-service B2B SaaS
**Рынок:** DACH region (Germany, Austria, Switzerland) → EU expansion

**Проблема:** EU AI Act вступает в силу в 2026. SMB-компании (10-250 сотрудников) не могут самостоятельно определить уровень риска своих AI-систем, понять применимые требования и подготовить техническую документацию. Традиционный compliance стоит €50-100K и занимает 6-12 месяцев.

**Решение:** Платформа с AI-консультантом "Евой", которая:
- Автоматически классифицирует AI-системы по уровням риска (гибридный движок: rules + LLM + cross-validation)
- Ведёт пользователя через compliance step-by-step (guided compliance)
- Генерирует техническую документацию (черновики AI → human review)
- Отвечает на вопросы по AI Act простым языком

**Слоган:** "AI Act compliance за 48 часов, а не 12 месяцев"

**Ключевое отличие:** 100% European AI — данные клиентов обрабатываются только EU-sovereign моделями (Mistral AI, Франция) и хостятся в EU (Hetzner, Германия).

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
| PRODUCT-VISION.md | ✅ Создан | ✅ PO принял |
| PROJECT.md | ✅ Создан | Информационный |
| ARCHITECTURE.md | ✅ Создан | ✅ PO принял (API-only старт) |
| DATABASE.md | ⏳ Следующий | Информационный |
| DATA-FLOWS.md | ⏳ Ожидает | Информационный |
| CODING-STANDARDS.md | ⏳ Ожидает | ⛔ Требует PO |
| PRODUCT-BACKLOG.md | ⏳ Ожидает | ⛔ Требует PO |
| ADR-001..004 | ⏳ Ожидает | Информационный |

---

## 3. Ключевые технические решения

### Backend
- **Runtime:** Metasql + VM sandbox (vm.Script) + Fastify
- **Архитектура:** DDD/Onion поверх существующего VM sandbox паттерна
- **БД:** PostgreSQL (Hetzner Managed)
- **Schema management:** MetaSQL (JavaScript schema → SQL DDL + TypeScript types)
- **Кэширование:** Redis (sessions, rate limiting)
- **Очереди:** BullMQ (document generation, classification)

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript strict
- **UI:** TailwindCSS + shadcn/ui
- **State:** Zustand (global) + React Query (server state)
- **Forms:** React Hook Form + Zod
- **Editor:** Tiptap (rich text для документов)

### AI/LLM Layer (Product — EU Sovereign)
- **Ева (Consultant):** Mistral Large 3 API (EU)
- **Classifier:** Mixtral 8x22B (self-hosted, Hetzner GPU)
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
- **GPU:** Hetzner GPU Server (1x A100 40GB) для self-hosted LLM
- **CI/CD:** GitHub Actions
- **CDN/DDoS:** Cloudflare
- **Error tracking:** Sentry
- **Storage:** S3-compatible (Hetzner) для документов

### Workflow
- **Scrum:** 4-column board (Backlog → ToDo → Doing → Done)
- **PR flow:** Developer → Marcus review + Leo security (PARALLEL) → Marcus merge to develop
- **Release:** develop → main (PO approval)
- **Git:** Conventional Commits, branch protection

---

## 4. 6 ключевых систем

1. **Classification Engine** — rule-based + LLM + cross-validation + requirements mapping
2. **Document Generation** — template engine + LLM expansion + human review + PDF export
3. **Eva Consultant Chat** — conversation management + context injection + tool calling + streaming
4. **Compliance Dashboard** — compliance score + requirements tracking + deadlines + notifications
5. **User & Organization Management** — multi-tenant + RBAC + billing (Stripe)
6. **Regulatory Monitor** — EUR-Lex scraping + change detection + impact assessment

---

## 5. Ценностное предложение

| Аудитория | Ценность |
|-----------|----------|
| CTO / Head of Engineering | Снижение legal risk, action plan, экономия времени, техдокументация |
| Compliance Officers | Готовые чеклисты, документация под ключ, audit trail, regulatory updates |
| Legal Teams | Mapping на статьи AI Act, обоснования классификации, gap analysis |
| CEO / руководство | Risk overview, compliance score, cost savings (10-50x vs consulting) |

### Pricing

| Tier | Цена | AI-систем | Ключевые фичи |
|------|------|-----------|---------------|
| Free | €0 | 1 | Risk Calculator (lead magnet) |
| Starter | €49/мес | 2 | Basic docs, email support |
| Growth | €149/мес | 10 | Full docs, Eva full, gap analysis |
| Scale | €399/мес | 50 | API access, audit prep, white-label docs |
| Enterprise | Custom | Unlimited | On-premise, SLA, legal review |

---

## 6. Глоссарий

| Термин | Определение |
|--------|-------------|
| **AI Act** | EU Regulation 2024/1689 — закон об искусственном интеллекте Европейского Союза |
| **High Risk AI System** | AI-система категории "высокий риск" по Annex III AI Act (Art. 6) — требует полного compliance |
| **Prohibited AI** | Запрещённые практики AI (Art. 5) — social scoring, real-time biometrics, etc. |
| **GPAI** | General Purpose AI — модели общего назначения (Art. 51-56) |
| **Limited Risk** | Системы с требованием прозрачности (Art. 50) — chatbots, deepfakes |
| **Minimal Risk** | Системы без обязательных требований |
| **Conformity Assessment** | Процедура подтверждения соответствия (Art. 43) — самооценка или notified body |
| **Technical Documentation** | Обязательная документация для high-risk систем (Art. 11) |
| **Risk Management System** | Система управления рисками (Art. 9) — обязательна для high-risk |
| **EU Database** | Реестр high-risk AI-систем ЕС (Art. 71) — обязательная регистрация |
| **Annex III** | Приложение III AI Act — список областей high-risk AI (8 категорий) |
| **Annex I** | Приложение I — EU harmonisation legislation (safety components) |
| **Ева** | AI-консультант платформы — отвечает на вопросы по AI Act, помогает с формами |
| **Classification Engine** | Гибридный движок классификации: rules + LLM + cross-validation |
| **Guided Compliance** | Подход UX: платформа ведёт пользователя step-by-step, не заваливает формами |
| **MetaSQL** | Schema management: JavaScript schema → SQL DDL + TypeScript types |
| **VM Sandbox** | Паттерн изоляции модулей через vm.Script + frozen context |
| **DACH** | Немецкоязычный регион: Deutschland, Austria, Confoederatio Helvetica (Швейцария) |

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

**Решение:** НЕ удалять до создания ARCHITECTURE.md + CODING-STANDARDS.md. Используется как reference для Marcus.

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
| Product Backlog | `docs/PRODUCT-BACKLOG.md` | User Stories |
| ADR | `adr/ADR-00X-*.md` | Architecture Decision Records |
| Team Spec | `AGENTS-Settings.md` | Master spec команды (v7.2) |
| Phase 0 Process | `setup/PHASE-0-ITERATIVE-PROCESS.md` | Процесс Phase 0 |
| Phase 0 Sequence | `setup/PHASE-0-SEQUENCE.md` | Формат артефактов |

---

**Последнее обновление:** 2026-02-07
