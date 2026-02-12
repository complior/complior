# TECH-STACK.md — AI Act Compliance Platform

**Version:** 2.1.0
**Last updated:** 2026-02-12
**Author:** Marcus (CTO) via Claude Code

> **v2.1.0 (2026-02-12):** Added Eva Pre-filter (Mistral Small 3.1) for topic boundary enforcement.
>
> **v2.0.0 (2026-02-09):** Полное обновление — актуализация стека после Sprint 0-1, deployer-first pivot, интеграция исследований (Vercel AI SDK, Claude Agent SDK, Nango). Удалены устаревшие технологии (Prisma, NextAuth, DeepSeek).

---

## Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **UI Library:** TailwindCSS + shadcn/ui (Radix UI primitives)
- **State Management:** XState (wizards), React Query (data fetching)
- **Forms:** React Hook Form + Zod validation
- **Rich Text Editor:** Tiptap (для compliance-документов)
- **AI Chat UI:** Vercel AI SDK `useChat` hook (SSE streaming)
- **Testing:** Vitest + React Testing Library + Playwright (E2E)

## Backend
- **Runtime:** Fastify 5 + VM Sandbox (vm.Script)
- **Language:** JavaScript (CommonJS, strict mode) — backend intentionally JS, not TS
- **Schema/ORM:** MetaSQL (JavaScript schema → SQL DDL + TypeScript types)
- **Database:** PostgreSQL 16 (Hetzner Managed)
- **Validation:** Zod (API endpoints)
- **Job Queues:** pg-boss (PostgreSQL-native, MVP) → BullMQ+Redis via JobQueue adapter (>100 users)
- **Testing:** Node.js built-in test runner (`node:test`) + assert

## AI/LLM Layer

### Product AI (клиентские данные — EU only)
- **Framework:** Vercel AI SDK 6 (`@ai-sdk/core`, `@ai-sdk/anthropic`, `@ai-sdk/ui`) — [ADR-005](ADR-005-vercel-ai-sdk.md)
  - Model-agnostic: поддерживает 25+ провайдеров через единый интерфейс
  - `streamText` (Fastify backend) + `useChat` (Next.js frontend) — SSE streaming
  - Zod-typed tools для Eva: `classifyAITool`, `searchRegulation`, `createFRIA`
  - Human-in-the-loop: `needsApproval` flag на tools
  - RAG: встроенная поддержка PostgreSQL + embeddings для AI Act knowledge base
  - Apache 2.0, no Vercel lock-in, runs on Hetzner
- **Ева (Q&A):** Mistral Large 3 API (Париж, EU) — via `@ai-sdk/mistral`
- **Classifier:** Mistral Small 3.1 API (EU) — risk classification
- **Doc Writer:** Mistral Medium 3 API (EU) — document generation
- **Eva Pre-filter:** Mistral Small 3.1 API (EU, $0.03/1M input) — ON_TOPIC/OFF_TOPIC classification before Large API call
- **Cross-validation:** Mistral Large 3 API — эскалация при расхождении
- **Масштабирование:** При >100 клиентов → self-hosted Mistral (Hetzner GPU)

### Autonomous Agents (P3, Sprint 5+)
- **Framework:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) — для backend autonomous agents
  - Shadow AI Auto-Discovery (Feature 16): autonomous file/web scanning в sandboxed Docker
  - On-premise Compliance Agent (Feature 17): air-gapped monitoring
  - Built-in tools: Bash, Read, Write, WebSearch, WebFetch
  - Subagents: specialized child agents для focused tasks
  - **Требует:** Docker sandbox isolation в production
- **Agent Integrations (planned):** Nango (self-hosted, EU) — вместо Composio (US data)
  - OAuth/API integration platform для подключения внешних сервисов к агентам
  - Self-hosted на Hetzner → EU data sovereignty

### Development AI (наш код — любые модели)
| Agent | Model | OpenRouter ID |
|-------|-------|---------------|
| Alex (Orchestrator) | Kimi K2.5 | `moonshotai/kimi-k2.5` |
| Marcus (CTO) | Claude Opus 4.6 | `anthropic/claude-opus-4.6` |
| Max (Backend+QA) | GPT-5.2 Codex | `openai/gpt-5.2-codex` |
| Nina (Frontend+UX) | Claude Opus 4.6 | `anthropic/claude-opus-4.6` |
| Elena (AI Act) | Gemini 3 Flash | `google/gemini-3-flash-preview` |
| Leo (SecOps) | Gemini 3 Pro | `google/gemini-3-pro-preview` |
| Ava (Research) | Gemini 3 Pro | `google/gemini-3-pro-preview` |

**Provider:** OpenRouter (https://openrouter.ai/api/v1)

## Auth & Email
- **Auth:** Ory Kratos (self-hosted, Hetzner EU) — [ADR-006](ADR-006-ory-vs-workos.md)
  - Identity, sessions, MFA, magic links, webhook sync → our DB
  - Apache 2.0, Германия, EU data residency
  - Отклонён WorkOS (нет EU data residency — US only)
- **Email:** Brevo (Франция) — transactional API, 300/day free

## PDF & Storage
- **PDF:** Gotenberg (self-hosted Docker) — HTML→PDF для certificates, FRIA, compliance docs
- **Storage:** Hetzner Object Storage (S3-compatible, €5.27/TB) — PDF documents, exports

## Infrastructure
- **Hosting:** Hetzner Cloud (EU, Германия) — data residency
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions (lint, type-check, tests, security audit)
- **Rate Limiting:** @fastify/rate-limit (official Fastify plugin)
- **Monitoring:** Better Uptime (Литва) — uptime + status page
- **Analytics:** Plausible (Эстония) — €9/мес, без cookies, GDPR by design
- **CDN/DDoS:** Cloudflare (edge only, no data storage)

## Отклонённые технологии (Feb 2026)

| Технология | Причина отказа | Альтернатива |
|-----------|---------------|-------------|
| **WorkOS** | US-only data residency — блокирует EU compliance | Ory Kratos (self-hosted EU) |
| **Convex.dev** | Несовместим с PostgreSQL/MetaSQL/DDD архитектурой | PostgreSQL + pg-boss |
| **Composio.dev** | US data, нет EU hosting | Nango (self-hosted EU) — planned |
| **Greptile** | Marcus + Leo уже покрывают code review | Existing agent workflow |
| **DeepSeek** | Hardcoded encryption keys, Chinese data law | Gemini 3 Pro (Leo, Ava) |
| **Prisma** | MetaSQL уже есть, даёт VM sandbox + type generation | MetaSQL (existing) |
| **NextAuth/Clerk** | US data residency | Ory Kratos (self-hosted EU) |

---

**Последнее обновление:** 2026-02-12 (v2.1.0)
