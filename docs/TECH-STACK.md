# TECH-STACK.md — AI Act Compliance Platform

**Version:** 0.1.0 (initial)
**Last updated:** 2026-02-04

## Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **UI Library:** Tailwind CSS + shadcn/ui или Radix UI
- **State Management:** Zustand или Jotai
- **Forms:** React Hook Form + Zod validation
- **Testing:** Vitest + React Testing Library + Playwright (E2E)

## Backend
- **Framework:** Next.js 14 API routes или tRPC
- **Language:** TypeScript (strict mode)
- **ORM:** Prisma
- **Database:** PostgreSQL 15+
- **Validation:** Zod
- **Auth:** NextAuth.js или Clerk
- **Testing:** Vitest + Supertest

## DevOps
- **Containers:** Docker + docker-compose
- **CI/CD:** GitHub Actions
- **Hosting:** Hetzner Cloud (EU data residency)
- **Monitoring:** (TBD: Prometheus/Grafana если нужно)

## Development Team AI Models
**Provider:** OpenRouter (https://openrouter.ai/api/v1)
- **Alex (Orchestrator):** Kimi K2.5 (moonshotai/kimi-k2.5)
- **Marcus (CTO):** Claude Opus 4.5 (anthropic/claude-opus-4.5)
- **Max (Backend):** GPT-5.2-Codex (openai/gpt-5.2-codex)
- **Nina (Frontend):** GPT-5.2-Codex (openai/gpt-5.2-codex)
- **Kai (UX Designer):** Claude Sonnet 4.5 (anthropic/claude-sonnet-4.5)
- **Ava (Researcher):** Gemini 3 Pro preview (google/gemini-3-pro-preview)
- **Leo (SecOps):** DeepSeek V3.2 (deepseek/deepseek-v3.2)
- **Quinn (QA):** DeepSeek V3.2 (deepseek/deepseek-v3.2)
- **Elena (AI Act Expert):** Gemini 3 Flash preview (google/gemini-3-flash-preview)
- **Diana (Tech Writer):** Gemini 3 Flash preview (google/gemini-3-flash-preview)
- **Derek (DevOps):** DeepSeek V3.2 (deepseek/deepseek-v3.2)

## Product AI Models
**For end-users (planned):**
- **Primary:** Mistral API (EU sovereign)
- **Fallback:** Self-hosted OSS models

---

**Note:** Marcus может дополнить этот файл в Phase 0.
