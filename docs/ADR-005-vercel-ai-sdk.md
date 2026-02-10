# ADR-005: Vercel AI SDK для консультанта Евы

**Статус:** Принято
**Дата:** 2026-02-09
**Автор:** Marcus (CTO) via Claude Code
**Контекст:** Выбор AI SDK framework для Eva chatbot и LLM-интеграций

---

## Контекст

Консультант «Ева» (Feature 06, Sprint 4) — AI-чат с deployer-focused Q&A, streaming responses, tool calling, RAG по AI Act. Нужен framework, который:

1. Поддерживает streaming chat UI (SSE) в Next.js frontend + Fastify backend
2. Позволяет определять typed tools (Zod schemas) для domain actions
3. Model-agnostic — возможность переключения между Mistral, Claude, GPT
4. Open-source, no vendor lock-in, runs on Hetzner

## Рассмотренные варианты

### Вариант A: Vercel AI SDK 6

- **Тип:** Open-source TypeScript toolkit (Apache 2.0)
- **Зрелость:** 20M+ monthly npm downloads, v6 (major)
- **Интеграция:** First-class Next.js (`useChat`) + documented Fastify support
- **Модели:** 25+ providers через pluggable adapters (`@ai-sdk/anthropic`, `@ai-sdk/mistral`, etc.)
- **Tools:** Zod-schema tools с `needsApproval` для human-in-the-loop
- **Streaming:** `streamText` + Data Stream Protocol (SSE-based)
- **RAG:** Documented pipeline с PostgreSQL + embeddings
- **Agent loop:** `maxSteps`, `stopWhen`, `prepareStep` — fine-grained control

### Вариант B: Claude Agent SDK

- **Тип:** Anthropic proprietary SDK (Commercial Terms)
- **Зрелость:** v0.2.x (pre-1.0), API may change
- **Назначение:** Autonomous long-running agents (file I/O, shell commands, web search)
- **Модели:** Claude only (Anthropic, Bedrock, Vertex)
- **Chat UI:** НЕ предназначен для real-time streaming chat UI
- **Требования:** Docker sandbox isolation в production
- **Сильные стороны:** Built-in tool executors, subagents, session persistence

### Вариант C: Raw Anthropic API с tool use

- **Тип:** Direct API calls
- **Модели:** Claude only
- **Overhead:** Manual tool loop implementation, manual streaming, manual session management
- **Не дает:** Model-agnostic switch, built-in UI hooks, RAG pipeline

## Решение

**Vercel AI SDK 6** — как primary framework для Eva и всех LLM-интеграций продукта.

**Claude Agent SDK** — зарезервирован для future autonomous agents (Features 16-17, Sprint 5+).

## Обоснование

| Критерий | Vercel AI SDK | Claude Agent SDK | Raw API |
|----------|:---:|:---:|:---:|
| Stack fit (Next.js + Fastify) | **Идеальный** | Misaligned | Manual |
| Model flexibility | 25+ providers | Claude only | Depends |
| Streaming chat UI | First-class | Not designed | Manual |
| Tool calling (typed) | Zod + needsApproval | Built-in executors | Manual |
| RAG support | PostgreSQL cookbook | No built-in | Manual |
| Maturity | v6, 20M+ downloads | v0.2.x pre-1.0 | Stable |
| License | Apache 2.0 | Commercial | - |
| EU data residency | Your choice | Your choice | Your choice |
| Autonomous agents | Not designed | **Идеальный** | Not designed |

**Ключевые факторы:**

1. **`useChat` + `streamText`** — zero-boilerplate streaming chat между Next.js и Fastify
2. **Model-agnostic** — Eva стартует на Mistral Large 3 (EU), может переключиться на Claude/GPT для specific tasks
3. **Zod tools** — `classifyAITool`, `searchRegulation`, `createFRIA` с type safety
4. **`needsApproval`** — compliance-критично: подтверждение перед high-risk actions
5. **RAG с PostgreSQL** — уже есть PostgreSQL, AI SDK имеет documented RAG pipeline

## Архитектура

```
[Browser]
    |
    | useChat() hook (Vercel AI SDK UI)
    |
[Next.js 14 Frontend] ---- SSE streaming ---->
    |
    | API call to /api/chat
    |
[Fastify Backend]
    |
    | streamText() with tools (Vercel AI SDK Core)
    | - classifyAITool tool
    | - searchAIActKnowledgeBase tool (RAG via pgvector)
    | - createFRIA tool
    | - lookupRiskLevel tool
    |
    | Provider: @ai-sdk/mistral (Mistral Large 3 EU)
    |
[Mistral API] (Paris, EU)
```

## Последствия

### Позитивные
- Единый framework для всех LLM-интеграций (Eva, Classification, Doc Generation)
- Быстрая разработка streaming chat UI
- Возможность A/B testing между моделями (Mistral vs Claude) без изменения кода
- Human-in-the-loop для compliance actions

### Негативные
- Дополнительная зависимость (`@ai-sdk/*` packages)
- AI SDK 6 — major version, breaking changes от v5 (но мы начинаем с нуля)

### Нейтральные
- Claude Agent SDK не конфликтует — используется для другого use case (autonomous agents P3)
- Vercel AI SDK не требует Vercel hosting — runs on Hetzner

## Связанные решения
- ADR-006: Keep Ory, reject WorkOS
- Feature 06: Консультант Ева (Sprint 4)
- Feature 10: Eva tool calling (Sprint 6)
