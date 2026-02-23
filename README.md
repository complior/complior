# Complior — AI Act Compliance Platform (SaaS)

**Dual-product:** Free TUI CLI (`npx complior`) + Paid Dashboard (this repo)

> "AI Act compliance за 48 часов, а не 12 месяцев"

**EU AI Act enforcement deadline: August 2, 2026**

---

## Описание

SaaS-платформа для компаний, которые **используют** AI (deployers). Автоматизирует EU AI Act compliance:

- AI-инвентаризация и классификация рисков (Art. 6, Annex III)
- AI Literacy обучение сотрудников (Art. 4, обязательно с 02.02.2025)
- FRIA + compliance документы (Art. 27)
- Eva — AI Act Q&A ассистент (Mistral Large 3)
- Registry API — 4,983+ AI инструментов с compliance assessments

## Целевая аудитория

B2B — CTO, compliance officers, legal teams в компаниях 10-250 сотрудников (DACH + EU)

## Технологический стек

### Backend
- **Runtime:** Fastify 5 + VM Sandbox (vm.Script) — бизнес-логика изолирована
- **Language:** JavaScript (CommonJS, strict) — backend намеренно JS, не TS
- **DB:** PostgreSQL 16 (Hetzner Managed, ~40 таблиц, MetaSQL schemas)
- **Queues:** pg-boss (PostgreSQL-native background jobs)
- **Auth:** WorkOS (managed) — AuthKit, SSO (SAML/OIDC free до 1M MAU), MFA
- **Email:** Brevo (France) — transactional, 300/day free

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript strict
- **UI:** TailwindCSS + shadcn/ui
- **Forms:** React Hook Form + Zod
- **State:** React Query (server state), XState (wizards)

### AI / LLM (EU Sovereign)
- **Eva Q&A:** Mistral Large 3 (Vercel AI SDK 6, SSE streaming)
- **Classifier:** Mistral Small 3.1
- **Doc Writer:** Mistral Medium 3
- Все модели — только Mistral (EU, GDPR-compliant)

### Infrastructure
- **Hosting:** Hetzner Cloud (Germany) — EU data residency
- **PDF:** Gotenberg (self-hosted Docker, HTML→PDF)
- **Storage:** Hetzner Object Storage (S3-compatible)
- **CDN:** Cloudflare (edge only)

## Структура проекта

```
PROJECT/
├── server/          # Fastify HTTP runtime + infrastructure clients
│   ├── main.js      # Entry point
│   └── infrastructure/  # auth/workos, email/brevo, pdf/gotenberg, storage/s3
├── app/             # Business logic (VM-sandboxed, NO require)
│   ├── api/         # Endpoints { access, httpMethod, path, method }
│   ├── application/ # Use cases (orchestration)
│   ├── domain/      # Pure domain logic
│   ├── schemas/     # MetaSQL definitions (~40 files)
│   ├── seeds/       # Seed data
│   └── config/      # plans.js (pricing source of truth)
├── frontend/        # Next.js 14 App Router
│   ├── app/         # Pages
│   ├── components/  # React components
│   └── messages/    # i18n (en.json base)
├── scripts/         # Migration + export scripts
├── data/            # Exported JSON bundles (generated)
│   ├── registry/    # all_tools.json (~21MB)
│   └── regulations/ # obligations.json, regulation-meta.json, etc.
├── docs/            # Documentation
└── tests/           # Test suites
```

## AI Registry

**4,983+ AI инструментов** с EU AI Act compliance assessments.

| Level | Count | Description |
|-------|-------|-------------|
| verified | 85 | Полная проверка (human + LLM tests) |
| scanned | 2,380 | Passive scan + evidence |
| classified | 2,518 | Базовая классификация |

**Обновление:** Еженедельно через pg-boss (понедельник 03:00 UTC).

**API:**
- `GET /v1/registry/tools` — поиск, фильтрация, пагинация
- `GET /v1/registry/tools/:id` — полная запись с evidence + assessments
- `GET /v1/regulations/obligations` — 108 обязательств EU AI Act
- `GET /v1/regulations/meta` — метаданные регуляции

**TUI Integration:** `EngineDataProvider` в Rust TUI подключается к этому API через `COMPLIOR_API_KEY`.

## Ценообразование

| Plan | Price | Limits |
|------|-------|--------|
| Free | €0 | 1 инструмент, no Eva |
| Starter | €49/мес | 5 инструментов, AI Literacy, Eva 200 msg |
| Growth | €149/мес | 20 инструментов, FRIA, gap analysis |
| Scale | €399/мес | unlimited, auto-discovery, Registry API |
| Enterprise | custom | on-premise, white-label, SLA |

Source of truth: `app/config/plans.js`

## Начало работы

```bash
# Установка зависимостей
npm install

# Настройка БД
npm run db:setup

# Запуск
npm run dev

# Миграция данных (если нужно)
npm run migrate:regulations    # 108 обязательств EU AI Act
npm run migrate:registry       # 4,983 AI инструментов (~15 мин)

# Экспорт JSON бэкапов
npm run export:all
```

## Документация

- `docs/ARCHITECTURE.md` — 10 Bounded Contexts, DDD/Onion v3.1
- `docs/DATABASE.md` — ~40 таблиц, MetaSQL schemas
- `docs/CODING-STANDARDS.md` — FP-first, rules, patterns
- `docs/ADR-007-workos-migration.md` — WorkOS vs Ory (принято)
- `docs/SPRINT-BACKLOG-007.md` — текущий спринт

## Команда

Проект разрабатывается автономной AI-командой:
- **Alex** (Orchestrator): Kimi K2.5
- **Marcus** (CTO/Architect): Claude Opus 4.6
- **Max** (Backend+QA): GPT-5.2 Codex
- **Nina** (Frontend+UX): Claude Opus 4.6
- **Elena** (AI Act Expert): Gemini 3 Flash

## Лицензия

Proprietary — All rights reserved

---

**Status:** Sprint 7 (WorkOS Migration + Registry API)
**Last Updated:** 2026-02-23
