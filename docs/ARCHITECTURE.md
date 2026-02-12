# ARCHITECTURE.md — AI Act Compliance Platform

**Версия:** 2.1.0
**Дата:** 2026-02-09
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ✅ Утверждено PO (2026-02-10)

> **v2.1.0 (2026-02-09):** AI SDK интеграция — Vercel AI SDK 6 как framework для Eva и LLM-интеграций (ADR-005). Claude Agent SDK для автономных агентов Features 16-17. Nango (self-hosted EU) как planned agent integration platform вместо Composio. Multi-user tool registration (employee self-service). Подтверждение Ory Kratos vs WorkOS (ADR-006).
>
> **v2.0.0 (2026-02-07):** Deployer-first pivot — архитектура перестроена под компании, которые ИСПОЛЬЗУЮТ AI (deployers), а не строят. Новые Bounded Contexts: AI Literacy (Art. 4), Inventory (каталог AI-инструментов). Classification Engine переориентирован на deployer-требования (Art. 4, 26-27, 50). Compliance → Deployer Compliance (FRIA, Monitoring Plan, AI Usage Policy вместо Art. 11 Annex IV).
>
> **v1.1.0 (2026-02-07):** Интеграция 7 EU-сервисов: Ory, Brevo, Gotenberg, Hetzner Object Storage, @fastify/rate-limit, Better Uptime, Plausible.

---

## 1. Архитектурные принципы

1. **DDD (Domain-Driven Design)** — бизнес-логика в центре, инфраструктура на периферии
2. **Onion Architecture** — зависимости направлены строго внутрь
3. **Framework-agnostic** — Application не знает про Fastify (существующий паттерн)
4. **VM Sandbox Isolation** — модули изолированы через vm.Script с frozen context (существующий паттерн)
5. **MetaSQL as Single Source of Truth** — JavaScript schema → SQL DDL + TypeScript types
6. **EU Sovereign AI** — данные клиентов только через EU-модели (Mistral) и EU-хостинг (Hetzner)
7. **Modular Monolith** — один deployable, но чёткие Bounded Contexts
8. **EU-first Services** — внешние сервисы только от EU-компаний (Ory — Германия, Brevo — Франция, Plausible — Эстония, Better Uptime — Литва)

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        NextJS["Next.js 14 App Router<br/>TailwindCSS + shadcn/ui"]
    end

    subgraph Server["Server (Hetzner EU)"]
        subgraph Presentation["Presentation Layer"]
            Fastify["Fastify HTTP/WS Server<br/>+ @fastify/rate-limit"]
            NextAPI["Next.js API Routes<br/>(SSR + RSC)"]
        end

        subgraph VMSandbox["VM Sandbox (vm.Script)"]
            subgraph Application["Application Layer"]
                API["api/* endpoints"]
                UseCases["Use Cases"]
            end

            subgraph DomainLayer["Domain Layer (pure)"]
                Entities["Entities & Value Objects"]
                DomainServices["Domain Services"]
                DomainEvents["Domain Events"]
            end

            subgraph Schemas["Schema Layer (MetaSQL)"]
                MetaSchemas["schemas/*.js"]
                Types[".types.js + .database.js"]
            end
        end

        subgraph Infrastructure["Infrastructure Layer"]
            DB["PostgreSQL<br/>(Hetzner Managed)"]
            PgBoss["pg-boss<br/>(job queues via PostgreSQL)"]
            HetznerS3["Hetzner Object Storage<br/>(S3-compatible, EU)"]
            Gotenberg_["Gotenberg<br/>(HTML→PDF, Docker)"]
        end

        subgraph AILayer["AI/LLM Layer (EU Sovereign)"]
            AISDK["Vercel AI SDK 6<br/>(model-agnostic framework)<br/>streamText + useChat + tools"]
            MistralAPI["Mistral Large 3<br/>Mistral Medium 3<br/>Mistral Small 3.1<br/>(все API, EU)"]
        end
    end

    subgraph ExternalEU["External Services (EU)"]
        Ory["Ory<br/>(auth, Германия)"]
        Brevo["Brevo<br/>(email, Франция)"]
        BetterUptime["Better Uptime<br/>(мониторинг, Литва)"]
        Plausible["Plausible<br/>(аналитика, Эстония)"]
    end

    subgraph ExternalOther["External Services"]
        Stripe["Stripe<br/>(billing)"]
        Cloudflare["Cloudflare<br/>(CDN, DDoS)"]
        Sentry["Sentry<br/>(errors)"]
        EURLex["EUR-Lex<br/>(regulatory)"]
    end

    NextJS -->|HTTPS| Fastify
    NextJS -->|SSR| NextAPI
    Fastify -->|route to| API
    NextAPI -->|delegate to| API
    API -->|call| UseCases
    UseCases -->|use| DomainServices
    DomainServices -->|operate on| Entities
    Entities -->|defined by| MetaSchemas
    MetaSchemas -->|generate| DB
    UseCases -->|persist via| DB
    UseCases -->|enqueue| PgBoss
    UseCases -->|store docs| HetznerS3
    UseCases -->|classify/generate/chat| AISDK
    AISDK -->|API calls| MistralAPI
    Fastify -->|auth| Ory
    UseCases -->|send email| Brevo
    PgBoss -->|generate PDF| Gotenberg_
    NextAPI -->|billing| Stripe
    PgBoss -->|scrape| EURLex
```

---

## 3. Onion Architecture Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Presentation Layer (Fastify + Next.js API Routes)           │
│  - HTTP/WS routing, request parsing, response formatting     │
│  - Static file serving, SSR                                  │
├──────────────────────────────────────────────────────────────┤
│  Application Layer (api/* endpoints, Use Cases)              │
│  - Orchestrates domain logic for specific use cases          │
│  - Input validation (Zod), authorization checks              │
│  - Transaction management, event dispatching                 │
├──────────────────────────────────────────────────────────────┤
│  Domain Services Layer                                       │
│  - Cross-entity business operations                          │
│  - Classification logic (deployer), compliance scoring       │
│  - Document generation (FRIA, Monitoring Plan, Policies)     │
│  - LiteracyManager, CertificateGenerator, CatalogMatcher    │
├──────────────────────────────────────────────────────────────┤
│  Domain Model Layer (центр — ЧИСТАЯ бизнес-логика)           │
│  - Entities: AITool, Organization, User, TrainingCourse,     │
│    ComplianceDoc, FRIAAssessment, AIToolCatalog               │
│  - Value Objects: RiskLevel, AnnexCategory, ComplianceScore  │
│  - Domain Events: AIToolClassified, LiteracyCompleted,       │
│    DocumentGenerated, AIToolDiscovered                        │
│  - NO dependencies on frameworks, DB, or external services   │
├──────────────────────────────────────────────────────────────┤
│  Schema Layer (MetaSQL)                                      │
│  - schemas/*.js → SQL DDL + TypeScript types                 │
│  - Single source of truth for data structure                 │
├──────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                        │
│  - PostgreSQL (via pg pool + pg-boss для job queues)          │
│  - Hetzner Object Storage (S3-compatible, EU)                │
│  - Ory client (auth, identity, sessions — Германия)          │
│  - Brevo client (transactional email — Франция)              │
│  - Gotenberg client (HTML→PDF, self-hosted Docker)           │
│  - Vercel AI SDK (model-agnostic LLM framework, ADR-005)      │
│  - Mistral API client via @ai-sdk/mistral (Large/Medium/Small)│
│  - Stripe client, EUR-Lex scraper                            │
│  - Logger, error tracking (Sentry)                           │
└──────────────────────────────────────────────────────────────┘

Dependency Direction: Infrastructure → Schema → Domain → Domain Services → Application → Presentation
                      (outer depends on inner, NEVER reverse)
```

### Dependency Rules

| Layer | Может зависеть от | НЕ может зависеть от |
|-------|-------------------|---------------------|
| Domain Model | Ничего (pure) | Всего остального |
| Domain Services | Domain Model | Application, Infrastructure, Presentation |
| Schema (MetaSQL) | Domain Model (types) | Application, Infrastructure |
| Application | Domain, Domain Services, Schema | Presentation |
| Infrastructure | Все inner layers | Presentation |
| Presentation | Application, Domain | — |

---

## 4. Bounded Contexts (DDD)

```mermaid
graph LR
    subgraph IAM["IAM Context"]
        User["User (sync from Ory)"]
        Organization["Organization"]
        Role["Role"]
        Invitation_["Invitation"]
        OryAuth["Ory (identity + sessions)"]
    end

    subgraph Inventory["Inventory Context"]
        AITool["AI Tool"]
        AIToolCatalog["AI Tool Catalog"]
        AIToolDiscovery["Discovery Log"]
    end

    subgraph Classification["Classification Context"]
        RiskClassification["Risk Classification"]
        Requirement["Requirement (deployer)"]
    end

    subgraph Literacy["AI Literacy Context"]
        TrainingCourse["Training Course"]
        LiteracyCompletion["Completion Tracking"]
        Certificate["Certificate (PDF)"]
    end

    subgraph DeployerCompliance["Deployer Compliance Context"]
        ComplianceDoc["FRIA / Monitoring Plan /<br/>AI Usage Policy"]
        ChecklistItem["Checklist Item"]
        ComplianceScore["Compliance Score"]
    end

    subgraph Consultation["Consultation Context"]
        Conversation["Conversation"]
        ChatMessage["Chat Message"]
        EvaAgent["Eva Agent (deployer)"]
    end

    subgraph Monitoring["Monitoring Context"]
        RegulatoryUpdate["Regulatory Update"]
        ImpactAssessment["Impact Assessment"]
        Notification["Notification"]
    end

    subgraph Billing["Billing Context"]
        Subscription["Subscription"]
        Plan["Plan"]
        Invoice["Invoice"]
    end

    IAM -->|"owns"| Inventory
    Inventory -->|"classifies"| Classification
    Classification -->|"generates"| DeployerCompliance
    Inventory -->|"trains"| Literacy
    Consultation -->|"uses"| Classification
    Consultation -->|"uses"| DeployerCompliance
    Monitoring -->|"notifies"| DeployerCompliance
    IAM -->|"subscribes"| Billing
    Literacy -->|"tracks"| DeployerCompliance
```

### 4.1 IAM Context (Identity & Access Management)
- **Identity & Auth:** Ory (self-hosted, Hetzner) — регистрация, login, magic links, sessions, MFA
- **Наша БД:** User (sync от Ory через webhook), Organization, Role, Permission, Invitation
- **Ответственный:** Max (backend Ory integration) + Nina (frontend auth UI)
- **Паттерн:** Ory управляет identity lifecycle → webhook → наш API синхронизирует User + создаёт Organization
- **Invite Flow (Sprint 2.5):** Owner/Admin создаёт Invitation → email через Brevo → invitee регистрируется через Ory → webhook проверяет pending invitation → присоединяется к существующей org (не создаёт новую)
- **Subscription Enforcement (Sprint 2.5):** SubscriptionLimitChecker (чистый domain service) проверяет maxUsers/maxTools перед созданием invitation и регистрацией инструмента. PlanLimitError (403) при превышении лимита

### 4.2 Inventory Context (точка входа для deployer)
- **Entities:** AITool, AIToolCatalog (200+ pre-populated tools), AIToolDiscovery
- **Domain Services:** CatalogMatcher (поиск по каталогу), DiscoveryLogger
- **Application:** registerAITool (wizard 5 шагов для deployer), importTools (CSV import)
- **Ответственный:** Max (backend) + Nina (wizard UI)
- **Описание:** Deployer регистрирует AI-инструменты, которые компания ИСПОЛЬЗУЕТ (ChatGPT, HireVue, Copilot и т.д.). Каталог помогает быстро найти и добавить инструмент с pre-fill данных.

### 4.3 Classification Context (ядро продукта)
- **Entities:** RiskClassification, AnnexCategory, Requirement (deployer: Art. 4, 26-27, 50)
- **Domain Services:** RuleEngine (pure rule-based: Art.5 prohibited, Annex III deployer domains)
- **Application:** classifyAITool (orchestrates RuleEngine + LLM via port + cross-validation)
- **Фокус:** "Является ли моё ИСПОЛЬЗОВАНИЕ этого AI high-risk?" (не "является ли мой AI high-risk?")
- **Output:** deployer-требования (Art. 4 AI Literacy, Art. 26 обязанности, Art. 27 FRIA, Art. 50 прозрачность)
- **Ответственный:** Max (backend engine) + Elena (AI Act rules) + Nina (wizard UI)

### 4.4 AI Literacy Context (wedge product, Art. 4)
- **Entities:** TrainingCourse, TrainingModule, LiteracyCompletion, LiteracyRequirement
- **Domain Services:** LiteracyManager, CertificateGenerator
- **Application:** enrollEmployee, trackCompletion, generateCertificate (PDF via Gotenberg)
- **Ответственный:** Max (backend) + Nina (learning UI) + Elena (контент курсов)
- **Описание:** Art. 4 AI Literacy обязателен с 02.02.2025. 70% сотрудников не обучены. 4 role-based курса на немецком: CEO, HR, Developer, General. Standalone продукт за €49/мес.

### 4.5 Deployer Compliance Context
- **Entities:** ComplianceDocument (FRIA, Monitoring Plan, AI Usage Policy, Employee Notification), ChecklistItem, ComplianceScore, DocumentSection, FRIAAssessment, FRIASection
- **Domain Services:** DocumentGenerator (deployer docs), GapAnalyzer, ScoreCalculator, FRIAWizard
- **Типы документов:** FRIA (Art. 27), Monitoring Plan, AI Usage Policy, Employee Notification, Incident Report
- **НЕ генерирует:** Art. 11 Annex IV Technical Documentation, Conformity Assessment (Art. 43) → P3 Future
- **Ответственный:** Max (backend) + Nina (dashboard + editor UI)

### 4.6 Consultation Context (Ева — deployer focus)
- **Entities:** Conversation, ChatMessage, QuickAction
- **Domain Services:** EvaOrchestrator (context injection + tool calling)
- **AI Framework:** Vercel AI SDK 6 — `streamText` (Fastify) + `useChat` (Next.js), Zod-typed tools с `needsApproval` ([ADR-005](ADR-005-vercel-ai-sdk.md))
- **Фокус:** Deployer-вопросы: "Bin ich Betreiber?", "Ist Slack AI high-risk?", "Was muss ich als Betreiber tun?"
- **Tools:** classify_ai_tool, create_fria, setup_monitoring, search_regulation
- **Ответственный:** Max (backend) + Nina (chat UI)
- **Существующий код:** Chat, Message, ChatMember schemas — адаптируем

### 4.7 Monitoring Context (post-MVP)
- **Entities:** RegulatoryUpdate, ImpactAssessment, Notification
- **Domain Services:** EURLexScraper, ChangeDetector, NotificationSender
- **Notification types:** ai_tool_discovered, literacy_overdue, fria_required, risk_threshold_exceeded, regulatory_update, compliance_change
- **Ответственный:** Max (background jobs)

### 4.8 Billing Context
- **Entities:** Subscription, Plan, Invoice
- **External:** Stripe API (webhooks → internal events)
- **Планы:** Free (Quick Check) → €49 (AI Literacy) → €149 (Full Compliance) → €399 (Scale) → Enterprise
- **Ответственный:** Max (Stripe integration)

---

## 5. Module Structure

```
server/                              # HTTP runtime (require-based)
├── main.js                          # Entry: loadApplication() pattern
├── src/
│   ├── loader.js                    # load, loadDir, loadDeepDir, loadApplication
│   ├── http.js                      # registerSandboxRoutes + middleware
│   ├── ws.js                        # WebSocket adapter
│   └── logger.js                    # Logger wrapping pino (console in sandbox)
├── lib/
│   ├── errors.js                    # AppError hierarchy
│   ├── schemas.js                   # Zod validators
│   └── db.js                        # CRUD builder (future)
└── infrastructure/                  # External clients (lazy-loaded)
    ├── auth/ory-client.js
    ├── email/brevo-client.js
    ├── pdf/gotenberg-client.js
    └── storage/s3-client.js

app/                                 # Business logic (VM-sandboxed, NO require)
├── setup.js                         # DB init (schemas + seeds)
├── config/                          # Loaded by server via require()
├── api/                             # Sandbox: { access, httpMethod, path, method }
│   ├── auth/
│   │   ├── webhook.js               # Ory → webhook (user created/updated/deleted)
│   │   ├── me.js                    # Session → user lookup with sync fallback
│   │   ├── updateOrganization.js    # PATCH org profile
│   │   └── audit.js                 # Paginated audit log
│   └── tools/
│       └── catalog.js               # Search pre-populated catalog
├── application/                     # Sandbox: use-case objects
│   ├── iam/
│   │   ├── syncUserFromOry.js       # Ory webhook → create/update User in our DB
│   │   └── resolveSession.js        # Ory session → User record
│   └── inventory/
│       └── searchCatalog.js         # ILIKE search, filters, pagination
├── lib/                             # Sandbox: IIFE closures (permissions, audit, tenant)
│   ├── permissions.js               # checkPermission with wildcard 'manage'
│   ├── audit.js                     # createAuditEntry + query helpers
│   └── tenant.js                    # createTenantQuery + CRUD helpers
├── domain/                          # DDD stubs (future)
│   ├── iam/
│   │   ├── entities/
│   │   └── value-objects/
│   ├── inventory/
│   │   ├── entities/
│   │   └── services/
│   ├── classification/
│   │   ├── entities/
│   │   ├── services/
│   │   └── value-objects/
│   ├── literacy/
│   │   ├── entities/
│   │   └── services/
│   ├── compliance/
│   │   ├── entities/
│   │   └── services/
│   ├── consultation/
│   │   ├── entities/
│   │   └── services/
│   └── events/
├── schemas/                         # MetaSQL definitions (30 files)
│   ├── Organization.js, User.js, Role.js, Permission.js, UserRole.js, Invitation.js
│   ├── AITool.js, AIToolCatalog.js, AIToolDiscovery.js
│   ├── RiskClassification.js, Requirement.js, ToolRequirement.js, ClassificationLog.js
│   ├── TrainingCourse.js, TrainingModule.js, LiteracyCompletion.js, LiteracyRequirement.js
│   ├── ComplianceDocument.js, DocumentSection.js, ChecklistItem.js
│   ├── FRIAAssessment.js, FRIASection.js, ImpactAssessment.js
│   ├── Conversation.js, ChatMessage.js
│   ├── Subscription.js, Plan.js, Notification.js, RegulatoryUpdate.js
│   └── AuditLog.js
└── seeds/                           # Seed data (5 files)
    ├── catalog.js, courses.js, plans.js, requirements.js, roles.js
```

---

## 6. Key Design Patterns

### 6.1 VM Sandbox Isolation (существующий, СОХРАНЯЕМ)

```javascript
// Каждый модуль загружается в изолированном контексте
const context = vm.createContext(Object.freeze({
  console,        // Logger (injected)
  config,         // Configuration (frozen)
  db,             // Database pool (frozen)
  domain,         // Domain layer (frozen)
  auth,           // Ory client (frozen) — verify session, get user identity
  email,          // Brevo client (frozen) — send transactional emails
}));

const script = new vm.Script(code, { timeout: 5000 });
const exported = script.runInContext(context);
```

**Плюсы:** Безопасность, изоляция, предотвращение cross-module pollution
**Новое:** Добавляем в sandbox доступ к infrastructure adapters (llm, storage, auth, email)

### 6.2 Vercel AI SDK — Model-Agnostic LLM Framework ([ADR-005](ADR-005-vercel-ai-sdk.md))

```javascript
// infrastructure/llm/ — uses Vercel AI SDK 6 (replaces custom adapter)
import { streamText, generateText } from '@ai-sdk/core';
import { mistral } from '@ai-sdk/mistral';

// Eva chat streaming (Fastify backend → Next.js frontend via SSE)
const result = streamText({
  model: mistral('mistral-large-latest'),
  system: 'Du bist Eva, KI-Act Compliance-Beraterin für Betreiber...',
  messages: conversationHistory,
  tools: { classifyAITool, searchRegulation, createFRIA },
  maxSteps: 5,
});

// Classification (non-streaming)
const classification = await generateText({
  model: mistral('mistral-small-latest'),
  system: 'You are an EU AI Act classifier for DEPLOYERS...',
  prompt: `Is the DEPLOYMENT of ${tool} in ${context} high-risk?`,
});

// Strategy: выбор модели по задаче (все через Vercel AI SDK, EU-sovereign)
// classify → mistral('mistral-small-latest') (speed)
// generateSection → mistral('mistral-medium-latest') (quality)
// chat → mistral('mistral-large-latest') (accuracy, Eva)
// A/B testing → swap to anthropic('claude-sonnet-4.5') without code changes
```

### 6.3 Repository Pattern

```javascript
// Domain НЕ знает про PostgreSQL
// Application использует repository для persistence

// application/classification/classifyAITool.js
async ({ toolId, answers }) => {
  const tool = await db.AITool.read(toolId);
  const classification = domain.classification.classify(tool, answers);
  await db.RiskClassification.create(classification);
  domain.events.emit('AIToolClassified', { toolId, classification });
  return classification;
};
```

### 6.4 Domain Events (Observer/EventEmitter)

```javascript
// domain/events/ — decoupling между контекстами
// Когда AI-инструмент классифицирован (AIToolClassified):
//   → Deployer Compliance Context создаёт checklist (Art. 26-27 requirements)
//   → Consultation Context обновляет контекст Евы
//   → Dashboard обновляет compliance score
// Когда сотрудник завершил курс (LiteracyCompleted):
//   → Dashboard обновляет AI Literacy progress
//   → Compliance Score пересчитывается (Art. 4 compliance)
// Когда обнаружен новый AI-инструмент (AIToolDiscovered):
//   → Notification: "Обнаружен новый AI-инструмент, требуется классификация"
```

### 6.5 Factory Pattern

```javascript
// Создание LLM clients, compliance documents, classification results
const createClassificationResult = (ruleResult, llmResult, confidence) => ({
  riskLevel: resolveRiskLevel(ruleResult, llmResult),
  annexCategory: resolveAnnex(ruleResult, llmResult),
  confidence,
  reasoning: generateReasoning(ruleResult, llmResult),
  requirements: mapRequirements(riskLevel),
});
```

### 6.6 CQS (Command Query Separation) для API Design

Принцип из лекции Тимура Шемсединова: метод либо **изменяет состояние** (command), либо **возвращает данные** (query), но никогда оба одновременно.

Применение к нашим API endpoints:

| Тип | Endpoints | Характеристика |
|-----|-----------|----------------|
| **Commands** (write) | `POST /api/tools/:id/classify`, `POST /api/literacy/enroll`, `POST /api/compliance/fria` | Изменяют состояние, возвращают только статус/id |
| **Queries** (read) | `GET /api/dashboard/overview`, `GET /api/tools/:id`, `GET /api/literacy/progress` | Только читают, никогда не изменяют |

Это упрощает кэширование (queries кэшируются), тестирование и аудит.

### 6.7 Audit Trail (Event Sourcing Lite)

Для AI Act compliance каждая классификация и изменение compliance-документов должны быть прослеживаемы. Вместо полного Event Sourcing (который избыточен для нашего масштаба) применяем **Event Sourcing Lite**:

- Каждая операция записывается как **Command-объект** (анемичная структура) в `ClassificationLog` / `AuditLog`
- Command содержит: `action`, `oldValue`, `newValue`, `userId`, `timestamp`
- Текущее состояние хранится в основных таблицах (не пересчитывается из событий)
- История позволяет: аудит для регулятора, undo ошибочной классификации, отладку

При масштабировании (>1000 клиентов) можно перейти к полному CQRS с отдельными Read/Write API.

### 6.8 MQ vs PubSub Strategy

Два паттерна передачи сообщений, применяемые в нашей системе:

| Паттерн | Реализация | Использование | Характеристика |
|---------|-----------|---------------|----------------|
| **Message Queue** | pg-boss (PostgreSQL) | Document generation, PDF export, EUR-Lex scraping, batch classification | Many→One, FIFO, persistent, exactly-once |
| **Pub/Sub** | WebSocket (Fastify ws) | Eva chat streaming, dashboard real-time, section ready notifications | One→Many, не persistent, at-least-once |

**Правила:**
- **pg-boss** — для задач, где порядок критичен и потеря недопустима (генерация документов, классификация)
- **WebSocket** — для уведомлений в реальном времени, где потеря одного сообщения не критична (UI обновления)
- **Idempotency:** каждое MQ-сообщение содержит GUID, получатель проверяет дубликаты
- **Error handling:** системные ошибки (DB down) → retry; бизнес-ошибки (невалидные данные) → обработать и завершить
- **Миграция:** при масштабировании pg-boss → BullMQ через JobQueue adapter (см. 6.10)

### 6.9 Анемичная доменная модель — обоснование

Наша Domain Model (MetaSQL schemas) является **анемичной** — содержит данные без поведения. Это осознанное решение:

- Мы моделируем **информационный слой** (AI-инструмент, классификация, FRIA, курс AI Literacy), а не реальные объекты с поведением
- Вся бизнес-логика — в Domain Services (RuleEngine, DocumentGenerator, GapAnalyzer, LiteracyManager, CatalogMatcher, FRIAWizard). LLM-интеграция — в Application layer через infrastructure ports
- MetaSQL schemas описывают структуру данных и генерируют SQL + типы — это **schema-based contracts**, единый инструмент для всех слоёв
- Схемы обеспечивают runtime-валидацию (в отличие от TypeScript, который проверяет только в compile-time)

Это соответствует подходу Тимура Шемсединова: «Анемичная модель — это нормально, когда мы моделируем не реальный объект, а набор документов и записей о нём».

### 6.10 JobQueue Port — Adapter для миграции pg-boss → BullMQ

Все обращения к очередям проходят через единый порт (интерфейс). Это обеспечивает замену pg-boss → BullMQ без изменения бизнес-логики:

```javascript
// domain/ports/JobQueue.js — порт (контракт)
// Все use cases работают ТОЛЬКО с этим интерфейсом
({
  enqueue: async (name, data, opts) => {},    // Поставить задачу в очередь
  schedule: async (name, cron, data) => {},   // Cron-задача
  work: (name, handler) => {},                // Зарегистрировать обработчик
});
```

```javascript
// infrastructure/jobs/pg-boss-adapter.js — MVP
const createPgBossQueue = (boss) => ({
  async enqueue(name, data, opts = {}) {
    const jobId = data.jobId || crypto.randomUUID();
    return boss.send(name, { ...data, jobId }, opts);
  },
  async schedule(name, cron, data) {
    return boss.schedule(name, cron, data);
  },
  work(name, handler) {
    boss.work(name, handler);
  },
});

// infrastructure/jobs/bullmq-adapter.js — при масштабировании
// Тот же интерфейс, другая реализация → ни один use case не меняется
```

**Когда мигрировать на BullMQ + Redis:**
- >100 concurrent пользователей
- Горизонтальное масштабирование (несколько серверов — нужен shared queue)
- PostgreSQL polling создаёт ощутимую нагрузку

**Шаги миграции:**
1. Добавить Redis в инфраструктуру
2. Написать `bullmq-adapter.js` (тот же интерфейс)
3. Заменить adapter в DI-конфигурации (одна строка)
4. Zero изменений в application/domain слоях

---

## 7. Classification Engine Architecture (Deployer Context)

```mermaid
sequenceDiagram
    participant UI as Frontend (AI Tool Wizard)
    participant API as API Layer
    participant CE as classifyAITool (Application)
    participant Rules as RuleEngine (Domain)
    participant LLM as LLM (Mistral Small API)
    participant Escalation as Mistral Large 3
    participant DB as PostgreSQL

    UI->>API: POST /api/tools/:id/classify
    API->>CE: classifyAITool(toolId, answers)

    Note right of CE: Deployer context:<br/>"Is my USE of this tool high-risk?"

    CE->>Rules: Step 1: Rule-based pre-filter (deployer rules)
    Rules->>Rules: Art. 5 prohibited practices
    Rules->>Rules: Annex III deployer domains
    Rules->>Rules: Deployer obligations check (Art. 26)
    Rules-->>CE: {riskLevel, confidence: 95%}

    alt confidence >= 90%
        CE-->>API: Return rule-based result
    else confidence < 90%
        CE->>LLM: Step 2: LLM analysis (deployer prompt)
        Note right of LLM: "Is the DEPLOYMENT of this AI tool<br/>in this context high-risk?"
        LLM-->>CE: {riskLevel, article, reasoning}

        alt rule_result == llm_result
            CE-->>API: Return confirmed result
        else rule_result != llm_result
            CE->>Escalation: Step 3: Cross-validation
            Escalation-->>CE: {final_classification}
        end
    end

    CE->>DB: Step 4: Save + map DEPLOYER requirements
    Note right of CE: Art. 4 (AI Literacy), Art. 26 (obligations),<br/>Art. 27 (FRIA), Art. 50 (transparency)
    CE-->>API: {riskLevel, annexCategory, confidence, deployerRequirements[]}
    API-->>UI: Show classification + deployer action plan
```

---

## 8. Migration from Existing Code

### Что переиспользуем (as-is или с минимальным рефакторингом)

| Существующий код | Новое использование |
|-----------------|---------------------|
| `NodeJS-Fastify/main.js` | `server/main.js` — Entry point, loadApplication() pattern |
| `src/loader.js` (VM sandbox) | `server/src/loader.js` — Core pattern, сохраняем полностью |
| `src/http.js` (HTTP routing) | `server/src/http.js` — registerSandboxRoutes (walkApiTree pattern) |
| `src/ws.js` (WebSocket) | `server/src/ws.js` — Используем для Eva chat streaming |
| `lib/db.js` (CRUD builder) | Расширяем (fix delete bug, добавляем transactions) |
| `schemas/.database.js` | Обновляем metadata для новых entities |
| `schemas/.types.js` | Расширяем custom types |
| `config/*.js` | Дополняем (llm.js, stripe.js) |
| `schemas/Account.js` | → User.js (rename + extend, add oryId, remove password) |
| `schemas/Role.js, Permission.js` | Сохраняем RBAC модель (поверх Ory identity) |
| `schemas/Division.js` | → Organization.js (rename + extend) |
| `schemas/Chat.js, Message.js` | → Conversation.js, ChatMessage.js (adapt for Eva, deployer focus) |

> **Deployer-first pivot (v2.0.0):** AISystem → AITool (переименование), SystemRequirement → ToolRequirement. Добавлены 8 новых таблиц: AIToolCatalog, AIToolDiscovery, TrainingCourse, TrainingModule, LiteracyCompletion, LiteracyRequirement, FRIAAssessment, FRIASection. Всего: **29 таблиц** в 8 Bounded Contexts.
>
> **Architecture split (Sprint 1):** `src/` split into `server/` (HTTP runtime, require-based) + `app/` (VM-sandboxed business logic, NO require). API handlers now use VM sandbox expression format (`{ access, httpMethod, path, method }`). `initRoutes` replaced by `registerSandboxRoutes` (walkApiTree pattern).

### Что добавляем

| Новый компонент | Описание |
|----------------|----------|
| `schemas/AITool.js` | Ключевая entity — AI-инструмент, который компания ИСПОЛЬЗУЕТ |
| `schemas/AIToolCatalog.js` | Pre-populated каталог 200+ AI-инструментов (seed data) |
| `schemas/AIToolDiscovery.js` | Лог обнаружения AI-инструментов (manual/import/scan) |
| `schemas/RiskClassification.js` | Результат классификации (deployer context) |
| `schemas/Requirement.js` | Справочник deployer-требований (Art. 4, 26-27, 50) |
| `schemas/ToolRequirement.js` | Связь инструмент ↔ требование |
| `schemas/TrainingCourse.js` | AI Literacy: курсы (CEO, HR, Developer, General) |
| `schemas/TrainingModule.js` | AI Literacy: модули внутри курса |
| `schemas/LiteracyCompletion.js` | AI Literacy: прогресс сотрудника |
| `schemas/LiteracyRequirement.js` | AI Literacy: какие роли какие курсы проходят |
| `schemas/ComplianceDocument.js` | Deployer документы (FRIA, Monitoring Plan, AI Usage Policy) |
| `schemas/DocumentSection.js` | Секции документов |
| `schemas/FRIAAssessment.js` | FRIA per AI tool (Art. 27) |
| `schemas/FRIASection.js` | Секции FRIA |
| `schemas/Subscription.js` | Подписки (billing) |
| `domain/inventory/` | AI Tool Inventory (каталог, wizard, import) |
| `domain/classification/` | Classification Engine (rules + LLM, deployer context) |
| `domain/literacy/` | AI Literacy (курсы, tracking, сертификаты) |
| `domain/compliance/` | Deployer Compliance (FRIA, docs, gap analysis) |
| `domain/consultation/` | Eva orchestrator (deployer focus) |
| `infrastructure/auth/` | Ory SDK client (identity, sessions, webhooks) |
| `infrastructure/email/` | Brevo SDK client (transactional email) |
| `infrastructure/pdf/` | Gotenberg client (HTML→PDF, сертификаты AI Literacy) |
| `infrastructure/llm/` | Mistral API adapters (Large/Medium/Small) |
| `infrastructure/jobs/` | Background jobs (pg-boss → BullMQ при масштабировании) |

### Что рефакторим

| Существующий код | Проблема | Решение |
|-----------------|----------|---------|
| `lib/db.js` delete() | Template string bug | Fix backticks |
| `config/database.js` | Hardcoded credentials | Env variables |
| Custom auth (Account, Session) | Самописная аутентификация | Заменяем на Ory (self-hosted, EU) |
| `lib/common.js` password hashing | Самописный scrypt | Удаляем — Ory управляет паролями и magic links |
| API error handling | Inconsistent format | Custom AppError hierarchy |
| No input validation | Security risk | Zod schemas на каждый endpoint |
| No transactions | Data integrity | Add transaction support to db.js |
| No audit logging | Compliance requirement | Add audit log to all data access |

---

## 9. Security Architecture

### Data Flow & Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│  EU BOUNDARY                                                  │
│                                                                │
│  Hetzner Cloud, Germany:                                       │
│  ┌──────────────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ App Server        │  │ PostgreSQL│  │ Hetzner Object   │   │
│  │ (Fastify + Next)  │  │ (managed) │  │ Storage (S3)     │   │
│  │ + Ory (self-host) │  └───────────┘  └──────────────────┘   │
│  │ + Gotenberg (PDF) │                                        │
│  └─────┬─────────────┘                                        │
│        │                                                       │
│  EU Services:                                                  │
│  ┌─────┴─────────────────────────────────────────────────┐    │
│  │ Mistral API (Paris, France — LLM)                      │    │
│  │ Brevo (Paris, France — email)                          │    │
│  │ Better Uptime (Vilnius, Lithuania — monitoring)         │    │
│  │ Plausible (Tallinn, Estonia — analytics)               │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ⛔ Client data NEVER leaves EU                               │
└──────────────────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │Cloudflare│  ← CDN/DDoS (edge, no data storage)
    └────┬────┘
         │
    ┌────┴────┐
    │ Browser │
    └─────────┘
```

### Security Measures

- **Auth:** Ory (self-hosted, Hetzner EU) — magic links, password, MFA, session management
- **Sessions:** Ory session cookies (httpOnly, Secure, SameSite) — не самописное решение
- **RBAC:** Permission(role, resource, action) — наша таблица поверх Ory identity
- **Input validation:** Zod schemas on every API endpoint
- **SQL injection:** Parameterized queries (existing CRUD builder)
- **XSS:** React auto-escaping + CSP headers
- **CSRF:** Ory CSRF protection + SameSite cookies
- **Rate limiting:** @fastify/rate-limit (plugin, in-process с поддержкой distributed stores при масштабировании)
- **Encryption:** TLS 1.3 in transit, AES-256 at rest
- **Secrets:** Environment variables (no hardcoded credentials)
- **Audit trail:** Log all data access for compliance
- **Email:** Brevo (Франция) — transactional email для magic links и уведомлений
- **Monitoring:** Better Uptime (Литва) — uptime + status page

---

## 10. Deployment Architecture

```mermaid
graph LR
    subgraph Hetzner["Hetzner Cloud (Germany)"]
        subgraph AppServer["App Server (CX41)"]
            Docker["Docker Compose"]
            Fastify_["Fastify + Next.js"]
            PgBoss_["pg-boss Worker"]
            Ory_["Ory (self-hosted)"]
            Gotenberg__["Gotenberg (PDF)"]
        end

        subgraph DBServer["DB Server (Managed)"]
            PG["PostgreSQL 16"]
        end

        subgraph Storage["Object Storage"]
            HetznerS3_["Hetzner S3<br/>(documents, PDFs)"]
        end

        MistralAPI_["Mistral API<br/>(Paris, EU)"]
    end

    subgraph ExternalEU_["External EU Services"]
        Brevo_["Brevo (email, FR)"]
        BetterUptime_["Better Uptime (LT)"]
        Plausible_["Plausible (EE)"]
    end

    subgraph CDN["CDN"]
        CF["Cloudflare"]
    end

    CF -->|proxy| Fastify_
    Fastify_ -->|auth| Ory_
    Fastify_ -->|query| PG
    Fastify_ -->|enqueue| PgBoss_
    Fastify_ -->|classify/generate| MistralAPI_
    Fastify_ -->|send email| Brevo_
    PgBoss_ -->|query| PG
    PgBoss_ -->|batch jobs| MistralAPI_
    PgBoss_ -->|HTML→PDF| Gotenberg__
    PgBoss_ -->|store| HetznerS3_
```

### MVP Scaling Plan

| Phase | Users | Infrastructure |
|-------|-------|---------------|
| MVP (Month 1-3) | 0-50 | 1 app server (Docker Compose: app + Ory + Gotenberg) + managed PG + Mistral API + Brevo + Hetzner S3 |
| Beta (Month 4-6) | 50-200 | 2 app servers + managed PG + Ory HA + Mistral API |
| Growth (Month 7-12) | 200-1000 | Horizontal scaling + self-hosted LLM (cost optimization) |

---

## 11. Trade-offs & Decisions

| Решение | Альтернатива | Почему так |
|---------|-------------|-----------|
| Modular Monolith | Microservices | Быстрее для MVP, проще deploy, достаточно для 1000 users |
| MetaSQL | Prisma ORM | Уже есть, даёт VM sandbox + type generation, zero-dependency |
| Fastify | Express, Koa | Уже есть, быстрый, WebSocket support, plugin ecosystem |
| VM Sandbox | Direct imports | Безопасность, изоляция, hot-reload potential |
| Mistral (product) | Claude/GPT | EU sovereignty, EU data residency trust, acceptable quality |
| **Vercel AI SDK** (LLM framework) | Raw API, LangChain | Model-agnostic, `streamText`+`useChat` for Eva, Zod tools, Apache 2.0 ([ADR-005](ADR-005-vercel-ai-sdk.md)) |
| **Claude Agent SDK** (autonomous) | Custom agent loop | Built-in tools, subagents, session persistence — for Features 16-17 (Sprint 5+) |
| **Ory** (auth) | WorkOS | EU data residency (Hetzner DE) vs WorkOS US-only ([ADR-006](ADR-006-ory-vs-workos.md)) |
| **Nango** (agent integrations) | Composio | Self-hosted EU vs Composio US data — planned for Sprint 5+ |
| PostgreSQL | MongoDB | Structured compliance data, ACID transactions, existing |
| pg-boss (MVP) | BullMQ, Temporal, Agenda | PostgreSQL-native: нет доп. инфраструктуры. Миграция на BullMQ через adapter при масштабировании |
| Next.js (frontend) | Remix, SvelteKit | Ecosystem, shadcn/ui compatibility, team expertise |
| **Ory** (auth) | Custom auth, Clerk, Auth0 | Self-hosted в EU (Hetzner), open-source (Apache 2.0), Германия. Clerk/Auth0 — US data only |
| **Brevo** (email) | Resend, SendGrid, custom SMTP | Французская компания, EU data residency, 300 emails/day free, Node.js SDK |
| **Gotenberg** (PDF) | Puppeteer, wkhtmltopdf | Self-hosted Docker, API-based (POST HTML → PDF), zero data leaks |
| **Hetzner Object Storage** | AWS S3, MinIO | Native Hetzner, S3-compatible, EUR 5.27/TB, EU data residency |
| **@fastify/rate-limit** | Custom Map+sliding window | Official plugin, configurable, supports distributed stores при масштабировании |
| **Better Uptime** (monitoring) | Uptime Robot, Pingdom | Литва (EU), free tier, status page included |
| **Plausible** (analytics) | Google Analytics, Matomo | Эстония (EU), no cookies, GDPR by design, EUR 9/month |

---

## 12. Risks & Mitigations

| Риск | Митигация |
|------|-----------|
| VM Sandbox performance overhead | Negligible for our scale; modules loaded once at startup |
| MetaSQL learning curve | Existing code as reference; well-documented schema format |
| Monolith scaling limits | Design with Bounded Contexts now; extract to services later if needed |
| Single point of failure (1 server) | Hetzner load balancer + auto-restart; managed PG with backups |
| GPU server cost | Start with API-only (Mistral); add self-hosted when >100 clients |

---

✅ **Утверждено PO** (2026-02-10). Deployer-first pivot v2.0.0.

**v2.1.0 (2026-02-12):** Sprint 2.5 — Invitation entity в IAM Context, Subscription Enforcement pattern (SubscriptionLimitChecker domain service), 30 таблиц.

**v2.0.0 (2026-02-07):** Deployer-first pivot — 8 Bounded Contexts (добавлены AI Literacy + Inventory), 29 таблиц, Classification Engine переориентирован на deployer (Art. 4, 26-27, 50), Deployer Compliance вместо provider Tech Docs.

**v1.1.0 (2026-02-07):** Интегрированы 7 EU-сервисов: Ory (auth), Brevo (email), Gotenberg (PDF), Hetzner Object Storage, @fastify/rate-limit, Better Uptime, Plausible.
