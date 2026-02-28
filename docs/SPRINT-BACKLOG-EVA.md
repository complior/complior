# Sprint Backlog EVA — Eva: Conversational AI Onboarding

> **⚠️ SUPERSEDED:** Этот Sprint Backlog поглощён Sprint 9 (v2.0.0, 2026-02-28).
> Eva реализуется в рамках S9 как US-091..US-094 (Mistral Client + Guard + Pipeline + Streaming + UI + Tool Calling).
> Этот файл сохранён как исторический reference для деталей архитектуры (3-level Guard, streaming route, quota enforcement).

**Sprint Goal:** Дать deployer'ам AI-ассистента Eva для обнаружения/регистрации AI-инструментов через диалог и ответов на вопросы по EU AI Act — финальная P0-фича для MVP.
**Статус:** ~~Draft~~ → **SUPERSEDED by SPRINT-BACKLOG-009.md v2.0.0**

**Capacity:** ~34 SP | **Duration:** 2 weeks
**Developers:** Max (Backend+Infra+QA, US-045..050), Nina (Frontend+UX, US-051)
**Baseline:** ~214 tests (Sprint 1-3.5) → **New: ~35 tests (total: ~249)**

> **Prerequisite:** Sprint 3.5 merged to main. Sprint 3.5 предоставляет: Stripe billing, plan-aware registration, lead gen pages. Baseline tests: ~214.

**Контекст разработки:** Вся реализация ДОЛЖНА соответствовать правилам, описанным в `docs/CODING-STANDARDS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` и `docs/DATA-FLOWS.md`. В частности: DDD/Onion слои (domain → application → api), VM-sandbox (никаких `require()` в `app/`), CQS, factory functions вместо классов, Zod-валидация на всех API, explicit `resolveSession`/`checkPermission` в каждом handler, multi-tenancy через `organizationId`. Тарифные лимиты определены в `app/config/plans.js` (single source of truth).

---

## Контекст

MVP roadmap определяет Sprint 4 как **MVP-milestone**. После этого спринта платформа имеет: инвентаризацию, классификацию, dashboard, billing и **Eva** (AI-ассистент). Feature 06 (Eva) — последняя P0-фича.

**Что отсутствует сейчас:**
- Нет LLM-интеграции — платформа не может генерировать текст или вести диалог
- Нет streaming — существующий `registerSandboxRoutes()` (`server/src/http.js:185-206`) возвращает JSON синхронно, SSE невозможен
- Нет enforcement `features.eva` из тарифа (0/200/1000/-1 уже в `plans.js`, но не проверяется)
- Нет conversation persistence (таблицы `Conversation` + `ChatMessage` созданы в schema, но нет CRUD)
- Нет off-topic защиты — без guard'а LLM будет генерировать стихи и код за наш счёт

**Архитектурное решение (ADR-005):** Vercel AI SDK + Mistral (EU-hosted). Streaming через `streamText()` (Fastify SSE) + `useChat()` (Next.js). Без tool calling в Sprint 4 (перенесено в Feature 10, Sprint 6).

**RAG отложен:** Полный pgvector RAG pipeline — после Sprint Eva. Sprint Eva использует condensed AI Act reference в system prompt (~4K токенов: Art. 4, 5, 26-27, 50). Mistral Large 3 имеет 128K контекста — достаточно.

---

## Квоты Eva по тарифам

| Plan | `features.eva` | Поведение |
|------|:-:|---|
| Free | 0 | Заблокировано — "Перейдите на Starter" |
| Starter | 200 | 200 сообщений/мес |
| Growth | 1,000 | 1,000 сообщений/мес |
| Scale | -1 | Без лимита |
| Enterprise | -1 | Без лимита |

**Конвенция:** `-1` = unlimited, `0` = blocked. Квоты уже в `app/config/plans.js`, enforcement реализуется в этом спринте.

---

## Граф зависимостей

```
US-045 (Mistral Client) ──→ US-046 (Eva Guard) ──→ US-048 (Pipeline)
US-047 (Conversation CRUD) ──────────────────────→ US-048 (Pipeline)
US-049 (Quota) ──────────────────────────────────→ US-050 (Streaming)
US-048 (Pipeline) ──→ US-050 (Streaming Route) ──→ US-051 (Frontend UI)
```

US-045 первым. Затем US-046, US-047, US-049 параллельно. Затем US-048. Затем US-050. US-051 последним.

---

## Архитектура streaming route

Существующий `registerSandboxRoutes()` ожидает от каждого handler'а синхронный JSON. Eva требует **SSE streaming** — токен за токеном.

**Решение:** Отдельная функция `registerEvaRoutes()` в `server/src/eva-routes.js` регистрирует `POST /api/eva/chat` как **нативный Fastify route** (вне sandbox route system):
1. Переиспользует session hook (уже привязан ко всем `/api/` routes)
2. Вызывает sandbox для бизнес-логики (quota, guard, conversation)
3. Вызывает `llm` infrastructure client напрямую для streaming
4. Pipe через `result.pipeDataStreamToResponse(reply.raw)` (Node.js `http.ServerResponse`)
5. После завершения потока — сохраняет сообщения через sandbox application layer

Sandbox-архитектура сохраняется для всей бизнес-логики. Streaming I/O — только на уровне сервера.

---

## Off-topic tracking

Две новых колонки на таблице User (ALTER TABLE migration в `app/setup.js`):
- `evaOffTopicCount` (integer, default 0) — счётчик последовательных off-topic сообщений
- `evaCooldownUntil` (datetime, nullable) — timestamp окончания cooldown'а

Cooldown глобальный per user (применяется across all conversations). 3 подряд off-topic → 5-минутный cooldown. Сбрасывается по истечении.

---

## User Stories

### Phase 1: Infrastructure (5 SP)

#### US-045: Mistral Infrastructure Client — Vercel AI SDK (5 SP)

- **Feature:** 06 (Eva) | **Developer:** Max

##### Описание
Как платформа, я должна иметь Mistral AI клиент через Vercel AI SDK для topic classification и streaming chat с EU-hosted LLM.

##### Реализация

**Новые npm deps (server workspace):** `ai`, `@ai-sdk/mistral`

- Новый: `app/config/mistral.js` — читает `MISTRAL_API_KEY`, `MISTRAL_MODEL` (default: `mistral-large-latest`), `MISTRAL_SMALL_MODEL` (default: `mistral-small-latest`) из env
- Новый: `server/infrastructure/ai/mistral-client.js` — factory `createMistralClient(config)`:
  - `classifyTopic(message)` — Mistral Small → `{ classification: 'ON_TOPIC'|'OFF_TOPIC', confidence }`
  - `streamChat({ system, messages })` — Mistral Large → Vercel AI SDK result (`.toDataStream()`, `.textStream`)
  - `generateText({ system, prompt })` — non-streaming (для будущего использования)
- Изменён: `server/main.js` — lazy-load `llm` (noop-fallback паттерн как stripe/brevo/gotenberg/s3), передать в `loadApplication()` и `registerEvaRoutes()`
- Изменён: `server/src/loader.js` — деструктурировать `llm` из `serverContext` (строка 54), добавить в sandbox (строка 58-70). **Также исправить:** добавить `stripe` в деструктуризацию (latent bug Sprint 3.5 — `stripe` передаётся, но не деструктурируется)
- Изменён: `app/config/validate.js` — добавить warning: `'MISTRAL_API_KEY not set — Eva AI assistant disabled'`
- Изменён: `.eslintrc.json` — добавить `"llm": "readonly"` в sandbox globals (строка 57-72)
- Изменён: `tests/helpers/test-sandbox.js` — добавить `llm` mock

##### Критерии приёмки
- [ ] `app/config/mistral.js` экспортирует `{ apiKey, model, smallModel }`
- [ ] `createMistralClient()` создаёт Vercel AI SDK Mistral provider через `createMistral()`
- [ ] `classifyTopic(message)` — structured prompt → ON_TOPIC/OFF_TOPIC + confidence
- [ ] `streamChat({ system, messages })` — `streamText()` с Mistral Large, возвращает SDK result
- [ ] `generateText({ system, prompt })` — non-streaming вызов
- [ ] Без `MISTRAL_API_KEY` → `llm` = noop, Eva disabled, startup warning в логах
- [ ] `llm` доступен в sandbox как frozen global (рядом с `stripe`, `brevo`)
- [ ] Bug fix: `stripe` в деструктуризации `loader.js` (строка 54-55)
- [ ] ESLint проходит с `llm` global
- [ ] Test sandbox включает `llm` mock

- **Tests:** 4 (mistral-client.test.js)
- **Dependencies:** None

---

### Phase 2: Domain + CRUD + Quota (11 SP, параллельно)

#### US-046: Eva Guard — 3-уровневая защита (5 SP)

- **Feature:** 06 (Eva) | **Developer:** Max

##### Описание
Как платформа, я должна иметь 3-уровневую защиту (regex → LLM classification → cooldown) чтобы Eva не отвечала на off-topic вопросы и не тратила LLM-бюджет на стихи и код.

##### Реализация

**3 уровня guard'а:**

| Уровень | Метод | Где выполняется | Стоимость |
|---------|-------|-----------------|-----------|
| L1: Pattern | Regex на очевидный off-topic | `processMessage` (sandbox) | Бесплатно |
| L2: LLM | Mistral Small classification | `eva-routes.js` (server) | ~0.1 ct/msg |
| L3: System Prompt | Инструкции отказа | System prompt Mistral Large | N/A |

- Новый: `app/domain/consultation/services/EvaGuard.js` — чистый domain service (IIFE, без I/O):
  - `isOffTopicByPattern(message)` — L1: regex (~20 паттернов: code, creative writing, personal, math, jokes, weather, sports, recipes). Возвращает `{ offTopic: boolean, pattern: string|null }`
  - `buildGuardPrompt(message)` — structured prompt для Mistral Small classification
  - `parseGuardResponse(response)` — парсит LLM ответ → `{ classification, confidence }`. Обрабатывает malformed responses (default: ON_TOPIC)
  - `shouldCooldown(offTopicCount)` — `true` если `>= 3`
  - `getCooldownDuration()` — 300000 ms (5 минут)
  - `CANNED_RESPONSES` — 5 вежливых отказов (English), random selection
  - `getRandomCannedResponse()` — один случайный ответ
- Новый: `app/domain/consultation/services/SystemPrompt.js` — чистая функция (IIFE, без I/O):
  - `buildSystemPrompt({ organization, tools, complianceStatus })`:
    - Роль: EU AI Act compliance assistant для deployer'ов
    - Scope: AI Act obligations, deployer duties, registration, classification, compliance guidance
    - Refuse: code gen, creative writing, personal questions, non-EU-regulation topics
    - Context injection: org name, tool count, compliance score
    - Condensed AI Act reference (~4K tokens): Art. 4 (AI Literacy), Art. 5 (Prohibited), Art. 26 (Deployer Obligations), Art. 27 (FRIA), Art. 50 (Transparency)
  - `buildContextSummary({ organization, tools, complianceStatus })` — формат для injection

##### Критерии приёмки
- [ ] L1 ловит очевидный off-topic без LLM вызова (regex)
- [ ] L1 паттерны: code requests, creative writing, personal, math, jokes, weather, sports, recipes
- [ ] `buildGuardPrompt` — structured prompt с чёткими ON_TOPIC/OFF_TOPIC инструкциями
- [ ] `parseGuardResponse` — обработка валидных и malformed LLM ответов
- [ ] `shouldCooldown(3)` → `true`; `shouldCooldown(2)` → `false`
- [ ] 5 уникальных canned responses
- [ ] System prompt включает AI Act reference (Art. 4, 5, 26-27, 50)
- [ ] Context injection: org name, tool count, compliance score
- [ ] Все функции чистые — без `db`, без `fetch`

- **Tests:** 6 (eva-guard.test.js)
- **Dependencies:** None (чистый domain service)

---

#### US-047: Conversation CRUD (3 SP)

- **Feature:** 06 (Eva) | **Developer:** Max

##### Описание
Как deployer, я хочу создавать, просматривать и вести историю диалогов с Eva.

##### Реализация

**Схемы уже существуют:** `app/schemas/Conversation.js`, `app/schemas/ChatMessage.js`
**Conversation в `TENANT_TABLES`** (`app/lib/tenant.js:3`) — tenant queries работают автоматически.

- Новый: `app/application/consultation/createConversation.js` — создание через tenant query, `userId`, default title, context
- Новый: `app/application/consultation/listConversations.js` — paginated, non-archived, newest first
- Новый: `app/application/consultation/getConversation.js` — conversation + messages, валидация ownership
- Новый: `app/application/consultation/saveMessage.js` — INSERT ChatMessage (user/assistant)
- Новый: `app/api/eva/conversations.js` — 3 handler'а (массив):
  - `POST /api/eva/conversations` — создать
  - `GET /api/eva/conversations` — список (paginated)
  - `GET /api/eva/conversations/:id` — с messages
- Изменён: `server/lib/schemas.js`:
  - `ConversationCreateSchema` — `{ title?: string, context?: enum, aiToolId?: number }`
  - `ConversationListSchema` — `{ page?: number, pageSize?: number }`
  - `ConversationIdSchema` — `{ id: number }`

**Permissions:** `Conversation.read` и `Conversation.create` уже определены для member/admin/owner в `app/seeds/roles.js` (строки 24, 38, 52-53).

##### Критерии приёмки
- [ ] POST создаёт conversation с `userId`, `organizationId`, optional `title`/`context`/`aiToolId`
- [ ] Default title: `'New Conversation'`, default context: `'general'`
- [ ] GET list: paginated (default 20/page), non-archived, `conversationId DESC`
- [ ] GET :id: conversation + все messages (`chatMessageId ASC`)
- [ ] Ownership: user видит только свои conversations (admin/owner — все в org)
- [ ] `saveMessage`: content как JSON `{ text }`, optional `tokenCount`, `model`
- [ ] Multi-tenancy через `organizationId`
- [ ] Permission check: `Conversation.read` / `Conversation.create`
- [ ] Zod validation на всех inputs
- [ ] 404 если conversation не найден или чужая org

- **Tests:** 5 (conversation-crud.test.js)
- **Dependencies:** None

---

#### US-049: Eva Quota Enforcement (3 SP)

- **Feature:** 06 (Eva) | **Developer:** Max

##### Описание
Как платформа, я должна enforcement'ить квоты Eva из тарифа (Free: 0, Starter: 200, Growth: 1000, Scale/Enterprise: unlimited).

##### Реализация
- Новый: `app/domain/consultation/services/EvaQuotaChecker.js` — чистый domain service:
  - `checkQuota({ current, max })` → `{ allowed: boolean, remaining: number }`
  - `isUnlimited(max)` — `true` если `-1`
  - `isBlocked(max)` — `true` если `0`
  - `getResetDate()` — 1-е число следующего месяца (UTC)
- Изменён: `server/lib/errors.js` — новый `EvaQuotaError`:
  ```javascript
  class EvaQuotaError extends AppError {
    constructor(current, max, resetDate) {
      super(`Eva quota exceeded (${current}/${max})`, 429, 'EVA_QUOTA_EXCEEDED');
      this.current = current; this.max = max; this.resetDate = resetDate;
    }
    toJSON() { return { error: { code: this.code, message: this.message, current: this.current, max: this.max, resetDate: this.resetDate } }; }
  }
  ```
- Изменён: `app/setup.js` — новые migrations для User:
  - `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "evaOffTopicCount" integer DEFAULT 0`
  - `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "evaCooldownUntil" timestamp with time zone`

##### Критерии приёмки
- [ ] `checkQuota({ current: 150, max: 200 })` → `{ allowed: true, remaining: 50 }`
- [ ] `checkQuota({ current: 200, max: 200 })` → `{ allowed: false, remaining: 0 }`
- [ ] `isUnlimited(-1)` → `true`; `isBlocked(0)` → `true`
- [ ] `getResetDate()` → 1-е число следующего месяца, 00:00 UTC
- [ ] `EvaQuotaError` — 429, `EVA_QUOTA_EXCEEDED`, включает `current`, `max`, `resetDate`
- [ ] Migrations добавляют `evaOffTopicCount` и `evaCooldownUntil` в User
- [ ] Все domain функции чистые — без I/O

- **Tests:** 5 (eva-quota.test.js)
- **Dependencies:** None

---

### Phase 3: Pipeline (5 SP)

#### US-048: Eva Chat Pipeline — quota + guard + context (5 SP)

- **Feature:** 06 (Eva) | **Developer:** Max

##### Описание
Как платформа, я должна иметь центральный pipeline, который обрабатывает каждое сообщение через quota → cooldown → guard L1 → context, чтобы streaming route получал чистый, валидированный payload.

##### Реализация
- Новый: `app/application/consultation/processMessage.js` — pipeline:
  1. Валидация: conversation существует и принадлежит org пользователя
  2. Проверка Eva quota (COUNT user messages за текущий месяц vs plan limit) → 429 если exceeded
  3. Проверка cooldown (`evaCooldownUntil` на User) → 403 если cooling down
  4. Eva Guard Level 1 (pattern) → если off-topic: increment `evaOffTopicCount`, проверить cooldown trigger, вернуть canned response
  5. Если L1 проходит: подготовка payload для L2 (LLM classification — выполняется в streaming route)
  6. Build context: org info, AI tools, compliance status
  7. Build system prompt через `domain.consultation.services.SystemPrompt.buildSystemPrompt()`
  8. Fetch conversation messages (max 50 последних для context window)
  9. Вернуть `{ ready: true, payload }` или `{ ready: false, response, reason }`
- Новый: `app/application/consultation/checkEvaQuota.js` — COUNT `role='user'` ChatMessages за текущий календарный месяц, fetch plan `features.eva`, вызвать domain `EvaQuotaChecker.checkQuota()`
- Новый: `app/application/consultation/buildContext.js` — queries org name, AI tool count + names, avg compliance score для system prompt injection

##### Критерии приёмки
- [ ] `{ ready: false, reason: 'quota_exceeded' }` при исчерпании квоты
- [ ] `{ ready: false, reason: 'cooldown' }` при cooldown
- [ ] `{ ready: false, reason: 'off_topic_l1', response }` при L1 guard + canned response
- [ ] `{ ready: true, payload }` при успешных проверках
- [ ] `payload.systemPrompt` включает org context и AI Act reference
- [ ] `payload.messages` включает историю (max 50 messages)
- [ ] Off-topic L1: `evaOffTopicCount` инкрементируется
- [ ] Off-topic count >= 3: `evaCooldownUntil` = now + 5 минут
- [ ] On-topic: `evaOffTopicCount` сбрасывается в 0
- [ ] `checkEvaQuota` считает сообщения за текущий месяц (WHERE `creation` >= 1-е число)
- [ ] `buildContext` → `{ organizationName, toolCount, toolNames, avgComplianceScore }`
- [ ] Multi-tenancy, ownership validated

- **Tests:** 7 (eva-pipeline.test.js)
- **Dependencies:** US-046, US-047

---

### Phase 4: Streaming Route (5 SP)

#### US-050: Eva Streaming Route — Fastify SSE (5 SP)

- **Feature:** 06 (Eva) | **Developer:** Max

##### Описание
Как deployer, я хочу видеть ответ Eva токен за токеном в реальном времени через SSE.

##### Реализация
- Новый: `server/src/eva-routes.js` — `registerEvaRoutes(server, appSandbox, llmClient)`:
  - `POST /api/eva/chat` — **нативный Fastify route** (НЕ sandbox):
    1. Session из `request.session` (hook уже работает для `/api/`)
    2. `resolveUser(session)` → user
    3. `checkPermission(user, 'Conversation', 'create')`
    4. Zod parse body: `{ conversationId: number, message: string }`
    5. Save user message через `saveMessage.save()`
    6. Pipeline: `processMessage.process({ conversationId, message, userId, organizationId })`
    7. Если `ready === false` → JSON response (429/403 + reason)
    8. Если `ready === true` → Guard L2: `llmClient.classifyTopic(message)`
    9. L2 OFF_TOPIC → save canned response, increment offTopicCount, return JSON
    10. L2 ON_TOPIC → `llmClient.streamChat({ system, messages })`
    11. Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
    12. Pipe: `result.pipeDataStreamToResponse(reply.raw)`
    13. После stream: save assistant message с full text, tokenCount, model
- Изменён: `server/main.js` — import + вызов `registerEvaRoutes(server, appSandbox, llm)` после `registerSandboxRoutes()`

##### Критерии приёмки
- [ ] `POST /api/eva/chat` принимает `{ conversationId, message }` с сессией
- [ ] 401 без session
- [ ] 403 без permission `Conversation.create`
- [ ] 429 `EVA_QUOTA_EXCEEDED` при исчерпании квоты
- [ ] 403 при cooldown
- [ ] JSON с canned response для off-topic (L1 и L2)
- [ ] SSE stream (`text/event-stream`) для on-topic
- [ ] Stream формат Vercel AI SDK data stream (совместим с `useChat()`)
- [ ] User message сохранён ДО pipeline (для точного quota counting)
- [ ] Assistant message сохранён ПОСЛЕ stream (с полным текстом)
- [ ] Token count и model записаны в assistant message
- [ ] Off-topic count инкрементируется/сбрасывается
- [ ] Cooldown после 3-го подряд off-topic
- [ ] Без `MISTRAL_API_KEY` → 503 `'Eva is currently unavailable'`

- **Tests:** 5 (eva-streaming.test.js) — mock LLM, тест через Fastify injection
- **Dependencies:** US-048, US-049

---

### Phase 5: Frontend UI (8 SP)

#### US-051: Eva Chat UI — `useChat()` (8 SP)

- **Feature:** 06 (Eva) | **Developer:** Nina

##### Описание
Как deployer, я хочу чат-страницу `/eva` с real-time streaming, quick action chips и историей диалогов.

##### Реализация

**Новый npm dep (frontend):** `ai` (Vercel AI SDK — `useChat()` hook)

- Новый: `frontend/app/eva/page.tsx`:
  ```typescript
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: `${API_URL}/api/eva/chat`,
    body: { conversationId },
    credentials: 'include',
  });
  ```
- Новый: `frontend/app/eva/layout.tsx` — layout с metadata
- Новый: `frontend/components/eva/ChatPanel.tsx` — основной контейнер:
  - Desktop: max-width 800px, centered, full height
  - Mobile: full-screen с padding для bottom nav
  - Auto-scroll на новые сообщения
- Новый: `frontend/components/eva/MessageBubble.tsx`:
  - Eva: left-aligned, `bg-slate-100`, avatar icon, markdown support
  - User: right-aligned, `bg-primary-600`, white text
- Новый: `frontend/components/eva/QuickActions.tsx` — chips:
  - `[Discover AI Tools]` → "Help me discover what AI tools my company might be using"
  - `[Compliance Q&A]` → "What are the main deployer obligations under the EU AI Act?"
  - `[What should I do first?]` → "We're just starting with AI Act compliance. What should we do first?"
  - `[Do I need a FRIA?]` → "How do I know if I need a Fundamental Rights Impact Assessment?"
  - Показываются на пустой conversation, скрываются после первого сообщения
- Новый: `frontend/components/eva/TypingIndicator.tsx` — анимированные три точки (пока `isLoading`)
- Новый: `frontend/components/eva/ChatInput.tsx`:
  - Auto-resize textarea, max 2000 символов
  - Enter = send, Shift+Enter = newline
  - Send disabled когда пусто или loading
  - Placeholder: "Ask Eva about AI Act compliance..."
- Новый: `frontend/components/eva/EvaDisclaimer.tsx`:
  - "Eva provides general guidance on EU AI Act compliance. This is not legal advice. Consult qualified legal counsel for binding compliance decisions."
- Изменён: `frontend/lib/api.ts` — `eva` namespace:
  ```typescript
  eva: {
    createConversation: (data?) => apiFetch('/api/eva/conversations', { method: 'POST', body: JSON.stringify(data || {}) }),
    listConversations: (params?) => apiFetch('/api/eva/conversations', { params }),
    getConversation: (id) => apiFetch(`/api/eva/conversations/${id}`),
  }
  ```
  Новые interfaces: `Conversation`, `ConversationDetail`, `ChatMessage`
- Изменён: `frontend/package.json` — `"ai": "^4.0.0"`

**Sidebar:** Ссылка на Eva (`/eva`) уже есть в `frontend/components/layout/Sidebar.tsx:12` — изменения не нужны.

##### UI-состояния

| Состояние | Отображение |
|-----------|-------------|
| Пустой чат | Welcome message + quick action chips |
| Streaming | Typing indicator → токены появляются |
| Quota exceeded | "Вы исчерпали лимит Eva. Перейдите на более высокий тариф." + CTA → `/pricing` |
| Cooldown | "Подождите несколько минут." + таймер |
| Offline/503 | "Eva временно недоступна. Попробуйте позже." |
| Free plan | "Eva доступна на тарифе Starter и выше." + `[Upgrade Now]` → `/pricing` |

##### Критерии приёмки
- [ ] Страница `/eva` доступна из sidebar
- [ ] `useChat()` подключается к `POST /api/eva/chat` с credentials
- [ ] Новая conversation создаётся при загрузке страницы
- [ ] Quick action chips видны на пустом чате, скрываются после первого сообщения
- [ ] Клик по chip отправляет predefined message
- [ ] Токены стримятся через Vercel AI SDK data stream
- [ ] Typing indicator пока `isLoading`
- [ ] Auto-scroll на новые сообщения
- [ ] Eva messages: markdown (bold, lists, links), left-aligned, `bg-slate-100`
- [ ] User messages: right-aligned, primary color
- [ ] Enter → send, Shift+Enter → newline, max 2000 chars
- [ ] Send disabled когда пусто или loading
- [ ] Textarea auto-resize до 5 строк
- [ ] Quota exceeded: upgrade CTA
- [ ] Free plan: "Upgrade to use Eva" вместо chat input
- [ ] Disclaimer footer всегда виден
- [ ] Desktop: centered, max-width 800px
- [ ] Mobile: full-screen, bottom nav spacing
- [ ] Error states как system messages в чате

- **Tests:** 3 (frontend component tests)
- **Dependencies:** US-050

---

## Summary

| Phase | Stories | SP | Developer |
|-------|---------|:--:|-----------|
| Infrastructure | US-045 | 5 | Max |
| Domain: Guard | US-046 | 5 | Max |
| Application: CRUD | US-047 | 3 | Max |
| Domain: Quota | US-049 | 3 | Max |
| Application: Pipeline | US-048 | 5 | Max |
| Server: Streaming | US-050 | 5 | Max |
| Frontend: Chat UI | US-051 | 8 | Nina |
| **Total** | **7 stories** | **34 SP** | **2 devs** |

---

## New Files (22)

### Infrastructure (Max)
```
server/infrastructure/ai/mistral-client.js          # Vercel AI SDK Mistral wrapper
app/config/mistral.js                                # Mistral env config
```

### Domain (Max)
```
app/domain/consultation/services/EvaGuard.js         # Guard L1 + L2 support
app/domain/consultation/services/SystemPrompt.js     # System prompt builder + AI Act reference
app/domain/consultation/services/EvaQuotaChecker.js  # Quota domain logic
```

### Application (Max)
```
app/application/consultation/createConversation.js
app/application/consultation/listConversations.js
app/application/consultation/getConversation.js
app/application/consultation/saveMessage.js
app/application/consultation/processMessage.js
app/application/consultation/checkEvaQuota.js
app/application/consultation/buildContext.js
```

### API (Max)
```
app/api/eva/conversations.js                         # CRUD handlers (3 routes)
```

### Server (Max)
```
server/src/eva-routes.js                             # Нативный Fastify SSE streaming route
```

### Frontend (Nina)
```
frontend/app/eva/page.tsx
frontend/app/eva/layout.tsx
frontend/components/eva/ChatPanel.tsx
frontend/components/eva/MessageBubble.tsx
frontend/components/eva/QuickActions.tsx
frontend/components/eva/TypingIndicator.tsx
frontend/components/eva/ChatInput.tsx
frontend/components/eva/EvaDisclaimer.tsx
```

## Modified Files (10)

```
server/main.js                    # llm client lazy-load + registerEvaRoutes()
server/src/loader.js              # llm в sandbox + fix missing stripe destructuring
server/lib/errors.js              # EvaQuotaError (429)
server/lib/schemas.js             # ConversationCreateSchema, ConversationListSchema, ConversationIdSchema, EvaChatSchema
.eslintrc.json                    # "llm": "readonly" в sandbox globals
app/config/validate.js            # MISTRAL_API_KEY warning
app/setup.js                      # User columns migration: evaOffTopicCount, evaCooldownUntil
tests/helpers/test-sandbox.js     # llm mock
frontend/lib/api.ts               # eva namespace + Conversation interfaces
frontend/package.json             # ai dependency
```

## New Test Files

```
tests/mistral-client.test.js      (4 tests)
tests/eva-guard.test.js           (6 tests)
tests/conversation-crud.test.js   (5 tests)
tests/eva-pipeline.test.js        (7 tests)
tests/eva-streaming.test.js       (5 tests)
tests/eva-quota.test.js           (5 tests)
+ 3 frontend component tests
Total: ~35 new tests (214 → ~249)
```

---

## Новые переменные окружения

| Переменная | Обязательна | Default | Назначение |
|------------|:-----------:|---------|------------|
| `MISTRAL_API_KEY` | Нет* | — | Аутентификация Mistral API |
| `MISTRAL_MODEL` | Нет | `mistral-large-latest` | Модель для чата |
| `MISTRAL_SMALL_MODEL` | Нет | `mistral-small-latest` | Модель для guard classification |

\* Eva gracefully disabled без `MISTRAL_API_KEY`. Сервер запускается нормально, Eva возвращает 503.

---

## Стратегия enforcement `features.eva`

| Шаг | Где проверяется | Поведение |
|-----|-----------------|-----------|
| Free plan (eva=0) | `checkEvaQuota` | Сразу blocked → "Upgrade to use Eva" |
| Quota check | `checkEvaQuota` | COUNT user messages текущего месяца vs plan.features.eva |
| Unlimited (eva=-1) | `EvaQuotaChecker.isUnlimited()` | Всегда allowed, skip COUNT |
| Reset | Автоматический | 1-е число следующего месяца (calendar month) |

---

## Bug fix: stripe в loader.js

**Текущее состояние** (`server/src/loader.js:54-55`):
```javascript
const { console: logger, db, config, errors, schemas, zod,
  ory, brevo, gotenberg, s3 } = serverContext;
```
`stripe` **не деструктурирован**, хотя передаётся в `serverContext` из `server/main.js:112`.

**Исправление в Sprint 4:**
```javascript
const { console: logger, db, config, errors, schemas, zod,
  ory, brevo, gotenberg, s3, stripe, llm } = serverContext;
```
И добавить `stripe: Object.freeze(stripe)` и `llm: Object.freeze(llm)` в sandbox object.

**Влияние:** Сейчас sandbox-код (`app/`) обращается к `stripe` через globals, но он не инжектирован через loader. Работает случайно из-за scope leaking в VM context. Исправление делает injection explicit.

---

## Verification Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm test` — ~249 tests, 0 failures
- [ ] Eva chat E2E: message → guard L1 → guard L2 → LLM stream → persist → display
- [ ] Free plan: "Eva is available on Starter plan and above" + upgrade CTA
- [ ] Starter plan: quota enforced (200/month), 429 при лимите
- [ ] Scale/Enterprise: unlimited
- [ ] Off-topic L1: canned response без LLM вызова, 0 стоимости
- [ ] Off-topic L2: canned response после LLM classification
- [ ] 3 подряд off-topic → 5-минутный cooldown
- [ ] Cooldown expires → user может отправлять снова
- [ ] On-topic сбрасывает off-topic counter в 0
- [ ] Streaming: первый токен < 2s, токены появляются последовательно
- [ ] Сообщения сохраняются в Conversation + ChatMessage
- [ ] Multi-tenancy на всех запросах (organizationId)
- [ ] Quick action chips работают и скрываются
- [ ] Desktop: centered chat `/eva`, max-width 800px
- [ ] Mobile: full-screen layout
- [ ] Disclaimer footer виден
- [ ] Без `MISTRAL_API_KEY` → Eva 503, warning в логах
- [ ] Никаких `require()` в `app/`
- [ ] `stripe` bug fix в `loader.js` проверен
- [ ] `llm` global доступен во всех sandbox файлах
