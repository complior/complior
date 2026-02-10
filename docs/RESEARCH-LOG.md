# Research Log

Все результаты исследований команды (Ava + другие агенты).

## Формат записи

```
## [YYYY-MM-DD] Название темы
Запросил: [agent name] (via [group/sessions_send/sprint])
Источники: [urls с датами]
Результат: [findings]
Рекомендация: [если применимо]
```

---

## [2026-02-04] Initial Setup

Запросил: Setup
Статус: Knowledge Base инициализирована
Результат: Структура готова для начала работы команды

---

## [2026-02-09] Vercel AI SDK vs Claude Agent SDK — выбор framework для Eva

Запросил: Marcus (CTO) via Claude Code
Источники: ai-sdk.dev/docs, platform.claude.com/docs/en/agent-sdk, github.com/vercel/ai, github.com/anthropics/claude-agent-sdk-typescript
Результат:
- **Vercel AI SDK 6** — primary framework для Eva chatbot. 20M+ npm downloads, Apache 2.0, model-agnostic (25+ providers), `useChat` + `streamText` для streaming, Zod-typed tools, `needsApproval` flag, RAG cookbook с PostgreSQL. Runs on Hetzner, no Vercel lock-in.
- **Claude Agent SDK** — reserved для autonomous agents (Features 16-17, Sprint 5+). v0.2.x pre-1.0, Claude-only, built-in tools (Bash, Read, Write), requires Docker sandbox. Не подходит для real-time chat UI.
- **Вердикт:** Use BOTH — complementary, different use cases.
Рекомендация: ADR-005 создан. Vercel AI SDK для Sprint 4 (Eva), Claude Agent SDK для Sprint 5+ (auto-discovery).

---

## [2026-02-09] WorkOS vs Ory Kratos — оценка auth-провайдера

Запросил: Marcus (CTO) via Claude Code
Источники: workos.com/pricing, workos.com/security, workos.com/legal/subprocessors, ory.com/comparisons/ory-vs-workos
Результат:
- **WorkOS:** Generous free tier (1M MAU), enterprise SSO $125/connection, managed, zero ops. НО: **US-only data residency** (AWS US), US company (CLOUD Act), все subprocessors в US.
- **Ory Kratos:** Self-hosted Hetzner Германия, Apache 2.0, EU data sovereignty. SAML SSO требует Ory Enterprise License ($3K+/мес).
- **Вердикт:** KEEP Ory. EU data residency — non-negotiable для EU AI Act compliance platform.
Рекомендация: ADR-006 создан. Пересмотреть если WorkOS запустит EU region.

---

## [2026-02-09] Convex.dev — оценка как замена PostgreSQL/pg-boss

Запросил: Marcus (CTO) via Claude Code
Источники: convex.dev/components, news.convex.dev/we-finally-got-our-eu-visa, convex.dev/pricing, docs.convex.dev/auth
Результат:
- **EU hosting:** Запущен ~Feb 7 2026, `aws-eu-west-1` (Ireland), 30% surcharge, все планы.
- **Компоненты:** Agent, Durable Agents, Workflow, Workpool, Crons, Table History, Auth, Stripe, Rate Limiter — впечатляющий набор.
- **Проблема:** Convex — document DB, NOT SQL. Несовместим с MetaSQL + VM sandbox + DDD/Onion архитектурой. Требует полный rewrite backend.
- **Job queues:** Workpool + Crons + Workflow > pg-boss. Но только если уже на Convex.
- **Вердикт:** REJECTED. Архитектурная несовместимость. Convex хочет БЫТЬ backend, а не сидеть рядом.
Рекомендация: Не использовать. Pattern A (Convex как real-time layer) теоретически возможен, но overhead не оправдан.

---

## [2026-02-09] Composio.dev + Greptile — оценка для агентов и code review

Запросил: Marcus (CTO) via Claude Code
Источники: composio.dev, docs.composio.dev, greptile.com, nango.dev
Результат:
- **Composio:** 250+ tool integrations для AI agents, MCP support, managed auth. НО: US company, US data. Для EU compliance platform — risk.
- **Nango (альтернатива):** Self-hosted (Docker), EU data sovereignty на Hetzner, 300+ API integrations, OAuth management. MIT license.
- **Greptile:** AI code review built on Claude Agent SDK. Не нужен сейчас — Marcus + Leo уже покрывают code review в PR flow.
- **Вердикт:** Composio DEFERRED (Sprint 5+), рассмотреть Nango как EU-sovereign альтернативу. Greptile NOT NEEDED.
Рекомендация: Nango self-hosted на Hetzner для agent integrations когда дойдём до Features 16-17.

---

**Инструкция для Ava:**
- Каждый research результат → новая секция здесь
- Дата в формате YYYY-MM-DD
- Источники с полными URLs
- Отличай факты от предположений
- Сравнения → таблицы с критериями
