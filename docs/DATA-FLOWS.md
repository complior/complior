# DATA-FLOWS.md — AI Act Compliance Platform

**Версия:** 1.0.0
**Дата:** 2026-02-07
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Информационный (PO approval не требуется)
**Зависимости:** ARCHITECTURE.md ✅, DATABASE.md ✅

---

## 1. User Registration & Onboarding

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Next as Next.js (SSR)
    participant API as Fastify API
    participant Auth as Auth Service
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Eva as Eva (Mistral)

    User->>Next: GET /register
    Next-->>User: Registration page (SSR)

    User->>API: POST /api/auth/register {email, fullName, company}
    API->>API: Validate input (Zod)
    API->>DB: Check email uniqueness
    DB-->>API: OK (no duplicate)

    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT Organization {name, industry, size, country}
    DB-->>API: organizationId
    API->>Auth: hashPassword(password) [scrypt]
    Auth-->>API: passwordHash
    API->>DB: INSERT User {email, fullName, passwordHash, organizationId}
    DB-->>API: userId
    API->>DB: INSERT UserRole {userId, roleId: 'owner'}
    API->>DB: INSERT Subscription {organizationId, planId: 'free'}
    API->>DB: COMMIT

    API->>Auth: generateToken(userId)
    Auth-->>API: JWT token
    API->>Redis: SET session:{token} {userId, orgId} TTL 30d
    API->>DB: INSERT Session {userId, token, ip}
    API->>DB: INSERT AuditLog {userId, action: 'login', resource: 'User'}

    API-->>User: 200 OK {token, user} + Set-Cookie: httpOnly

    User->>Next: GET /onboarding
    Next->>API: GET /api/user/me
    API-->>Next: {user, organization}
    Next-->>User: Onboarding page

    User->>API: POST /api/onboarding/quick-assessment {answers}
    API->>Eva: Analyze company AI usage (Mistral Large 3 API)
    Eva-->>API: {estimatedSystems, riskOverview}
    API-->>User: "У вас ~X систем, Y потенциально high-risk"
```

---

## 2. AI System Registration (5-step Wizard)

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Next as Next.js
    participant API as Fastify API
    participant DB as PostgreSQL

    User->>Next: GET /systems/new
    Next-->>User: Wizard Step 1

    Note over User,DB: Step 1: Basic Info
    User->>API: POST /api/systems {name, description}
    API->>API: Validate input (Zod)
    API->>DB: INSERT AISystem {organizationId, name, description, wizardStep: 1}
    DB-->>API: aiSystemId
    API-->>User: {aiSystemId, wizardStep: 2}

    Note over User,DB: Step 2: Purpose & Context
    User->>API: PATCH /api/systems/:id {purpose, domain}
    API->>DB: UPDATE AISystem SET purpose, domain, wizardStep=2
    API-->>User: {wizardStep: 3}

    Note over User,DB: Step 3: Technical Details
    User->>API: PATCH /api/systems/:id {modelType, autonomy, affects, safety}
    API->>DB: UPDATE AISystem SET modelType, makesAutonomousDecisions, ...
    API-->>User: {wizardStep: 4}

    Note over User,DB: Step 4: Data & Users
    User->>API: PATCH /api/systems/:id {dataTypes, userCount, dataScale}
    API->>DB: UPDATE AISystem SET dataTypes, userCount, dataScale, wizardStep=4
    API-->>User: {wizardStep: 5}

    Note over User,DB: Step 5: Review & Classify
    User->>API: POST /api/systems/:id/classify
    Note right of API: → See Flow 3: Classification Engine
    API-->>User: {riskLevel, confidence, reasoning, requirements}
```

---

## 3. Classification Engine (гибридный 4-шаговый)

```mermaid
sequenceDiagram
    participant API as Fastify API
    participant CE as ClassificationEngine
    participant Rules as RuleEngine
    participant LLM as Mistral Small API
    participant Escalation as Mistral Large API
    participant DB as PostgreSQL

    API->>CE: classifySystem(aiSystemId, wizardAnswers)

    rect rgb(240, 248, 255)
        Note over CE,Rules: Step 1: Rule-based Pre-filter (instant)
        CE->>Rules: applyRules(answers)
        Rules->>Rules: Check Annex III domains
        Rules->>Rules: Check Art. 5 prohibited practices
        Rules->>Rules: Check safety component + Annex I
        Rules-->>CE: {riskLevel, confidence, matchedRules[]}
    end

    alt confidence >= 90%
        Note over CE: Rule-based result sufficient
        CE->>CE: method = 'rule_only'
    else confidence < 90%
        rect rgb(255, 248, 240)
            Note over CE,LLM: Step 2: LLM Analysis
            CE->>LLM: POST /v1/chat/completions
            Note right of LLM: System: "You are an EU AI Act classifier..."<br/>User: system description + domain + purpose<br/>Response format: JSON
            LLM-->>CE: {riskLevel, article, reasoning}
        end

        alt ruleResult.riskLevel == llmResult.riskLevel
            Note over CE: Results agree — confirmed
            CE->>CE: method = 'rule_plus_llm'
        else ruleResult != llmResult
            rect rgb(255, 240, 240)
                Note over CE,Escalation: Step 3: Cross-validation (escalation)
                CE->>Escalation: POST /v1/chat/completions
                Note right of Escalation: System: "Resolve classification conflict..."<br/>User: ruleResult + llmResult + full context
                Escalation-->>CE: {finalRiskLevel, reasoning, confidence}
            end
            CE->>CE: method = 'cross_validated'
        end
    end

    rect rgb(240, 255, 240)
        Note over CE,DB: Step 4: Save & Map Requirements
        CE->>DB: INSERT RiskClassification {aiSystemId, riskLevel, ...}
        CE->>DB: UPDATE AISystem SET riskLevel, complianceStatus, wizardCompleted=true

        CE->>CE: mapRequirements(riskLevel, annexCategory)
        loop For each applicable requirement
            CE->>DB: INSERT SystemRequirement {aiSystemId, requirementId, status: 'pending'}
        end

        CE->>DB: INSERT ClassificationLog {action: 'initial', newRiskLevel}
        CE->>DB: INSERT AuditLog {action: 'classify', resource: 'AISystem'}
    end

    CE-->>API: {riskLevel, annexCategory, confidence, reasoning, requirements[]}
```

---

## 4. Eva Consultant Chat

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant WS as WebSocket (Fastify)
    participant Eva as EvaOrchestrator
    participant Context as ContextInjector
    participant LLM as Mistral Large API
    participant DB as PostgreSQL

    User->>WS: Connect /ws/chat
    WS->>WS: Authenticate (JWT from cookie)

    User->>WS: {type: 'message', text: "Наш чат-бот — это high risk?"}

    WS->>Eva: processMessage(userId, conversationId, text)

    Eva->>DB: SELECT Conversation WHERE id = conversationId
    Eva->>DB: SELECT last 20 ChatMessages WHERE conversationId ORDER BY creation DESC

    Eva->>Context: injectContext(userId, conversationId)
    Context->>DB: SELECT User, Organization
    Context->>DB: SELECT AISystem WHERE organizationId (all user's systems)
    Context-->>Eva: {userContext, systemsContext, pageContext}

    Eva->>LLM: POST /v1/chat/completions (stream: true)
    Note right of LLM: System prompt:<br/>- "You are Eva, AI Act compliance consultant"<br/>- User's company info<br/>- User's AI systems<br/>- Current page context<br/>- Available tools: classify, search_regulation, create_document<br/><br/>Messages: conversation history + new message

    loop Streaming response
        LLM-->>Eva: chunk {delta: "Ваш чат-бот..."}
        Eva-->>WS: {type: 'stream', delta: "Ваш чат-бот..."}
        WS-->>User: Real-time text display
    end

    alt Eva decides to use a tool
        LLM-->>Eva: {tool_call: 'search_regulation', args: {query: 'chatbot Art. 50'}}
        Eva->>DB: Search Requirement WHERE articleReference LIKE '%Art. 50%'
        DB-->>Eva: {matching requirements}
        Eva->>LLM: Tool result + continue generation
        LLM-->>Eva: Final answer with citations
    end

    Eva->>DB: INSERT ChatMessage {role: 'user', content: originalMessage}
    Eva->>DB: INSERT ChatMessage {role: 'assistant', content: response, toolCalls, tokenCount}
    Eva-->>WS: {type: 'complete', messageId}
    WS-->>User: Response complete (with citations)
```

---

## 5. Document Generation

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant API as Fastify API
    participant Queue as BullMQ
    participant Worker as BullMQ Worker
    participant DocGen as DocumentGenerator
    participant LLM as Mistral Medium API
    participant DB as PostgreSQL
    participant S3 as S3 Storage

    User->>API: POST /api/compliance/documents {aiSystemId, documentType: 'technical_documentation'}
    API->>DB: SELECT AISystem WHERE id + classification data
    API->>DB: INSERT ComplianceDocument {aiSystemId, type, status: 'generating', version: 1}
    DB-->>API: documentId

    API->>DocGen: getTemplateSections('technical_documentation')
    DocGen-->>API: [{code: 'TD_1_GENERAL', title: 'General Description'}, ...]

    loop For each template section
        API->>DB: INSERT DocumentSection {documentId, sectionCode, status: 'empty', sortOrder}
    end

    API-->>User: {documentId, sections[], status: 'generating'}

    Note over User,S3: Section-by-section generation (user-triggered)

    User->>API: POST /api/compliance/documents/:docId/sections/:code/generate
    API->>Queue: enqueue('generate-section', {documentId, sectionCode})
    API-->>User: 202 Accepted {jobId}

    Queue->>Worker: process job
    Worker->>DB: SELECT AISystem + RiskClassification + SystemRequirements
    Worker->>DocGen: generateSection(sectionCode, systemData, template)

    DocGen->>LLM: POST /v1/chat/completions
    Note right of LLM: System: "Generate technical documentation section..."<br/>Template: section structure<br/>Context: system data + classification + requirements
    LLM-->>DocGen: {generatedContent}

    DocGen->>DB: UPDATE DocumentSection SET content=generated, aiDraft=generated, status='ai_generated'
    Worker-->>Queue: Job complete

    Worker->>API: notify via WebSocket
    API-->>User: {type: 'section_ready', sectionCode, status: 'ai_generated'}

    Note over User,S3: User reviews and edits

    User->>API: PATCH /api/compliance/documents/:docId/sections/:code {content: editedContent}
    API->>DB: UPDATE DocumentSection SET content=edited, status='editing'
    API-->>User: OK

    User->>API: POST /api/compliance/documents/:docId/sections/:code/approve
    API->>DB: UPDATE DocumentSection SET status='approved'
    API-->>User: OK

    Note over User,S3: PDF Export (all sections approved)

    User->>API: POST /api/compliance/documents/:docId/export {format: 'pdf'}
    API->>Queue: enqueue('export-document', {documentId, format})
    Queue->>Worker: process job
    Worker->>DB: SELECT all DocumentSections WHERE documentId ORDER BY sortOrder
    Worker->>Worker: Render PDF (sections → formatted document)
    Worker->>S3: Upload PDF
    S3-->>Worker: fileUrl
    Worker->>DB: UPDATE ComplianceDocument SET fileUrl, status='approved'

    Worker-->>User: {type: 'export_ready', fileUrl}
    User->>S3: Download PDF
```

---

## 6. Compliance Dashboard Data Flow

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Next as Next.js (SSR)
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Redis as Redis

    User->>Next: GET /dashboard
    Next->>API: GET /api/dashboard/overview

    API->>Redis: GET dashboard:{organizationId}
    alt Cache hit
        Redis-->>API: cached dashboard data
    else Cache miss
        API->>DB: SELECT count(*) FROM AISystem WHERE organizationId GROUP BY riskLevel
        DB-->>API: {prohibited: 0, high: 3, gpai: 1, limited: 5, minimal: 2}

        API->>DB: SELECT AVG(complianceScore) FROM AISystem WHERE organizationId
        DB-->>API: {avgScore: 67}

        API->>DB: SELECT AISystem WHERE complianceStatus != 'compliant' ORDER BY riskLevel DESC LIMIT 10
        DB-->>API: [{name, riskLevel, complianceScore, status}, ...]

        API->>DB: SELECT sr.*, r.name FROM SystemRequirement sr JOIN Requirement r WHERE dueDate < NOW() + '30 days' AND status != 'completed'
        DB-->>API: [{requirement, dueDate, system}, ...]

        API->>DB: SELECT * FROM Notification WHERE userId AND read=false ORDER BY creation DESC LIMIT 5
        DB-->>API: [{type, title, message}, ...]

        API->>Redis: SET dashboard:{orgId} {data} EX 300
    end

    API-->>Next: {systemsByRisk, avgScore, attentionItems, deadlines, notifications}
    Next-->>User: Rendered dashboard (SSR)

    Note over User,Redis: Real-time updates via WebSocket
    User->>API: WS /ws/dashboard
    Note right of API: When AISystem complianceScore changes:<br/>→ Invalidate Redis cache<br/>→ Push update via WS
```

---

## 7. Gap Analysis

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant API as Fastify API
    participant Gap as GapAnalyzer
    participant LLM as Mistral Medium API
    participant DB as PostgreSQL

    User->>API: GET /api/compliance/gap-analysis/:aiSystemId
    API->>DB: SELECT AISystem + RiskClassification
    API->>DB: SELECT SystemRequirement + Requirement WHERE aiSystemId

    API->>Gap: analyzeGaps(system, requirements)

    loop For each requirement
        Gap->>Gap: Check status (completed/in_progress/pending)
        Gap->>Gap: Calculate progress percentage
        Gap->>Gap: Determine priority (risk level + deadline proximity)
    end

    Gap->>LLM: POST /v1/chat/completions
    Note right of LLM: "Generate action plan for requirements gaps"<br/>Input: unfulfilled requirements + system description
    LLM-->>Gap: {actionPlan: [{requirement, steps, estimatedHours}]}

    Gap-->>API: {
    Note right of API: fulfilled: [{req, progress: 100%}],<br/>inProgress: [{req, progress: 40%, eta}],<br/>gaps: [{req, priority, actionPlan, estimatedHours}],<br/>overallScore: 67%

    API-->>User: Gap analysis report with prioritized action plan
```

---

## 8. Authentication Flow (Magic Link)

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Email as Email Service

    Note over User,Email: Login with Magic Link

    User->>API: POST /api/auth/magic-link {email}
    API->>DB: SELECT User WHERE email
    alt User not found
        API-->>User: 200 OK (same response to prevent email enumeration)
    else User found
        API->>API: Generate magic token (crypto.randomUUID)
        API->>Redis: SET magic:{token} {userId, email} EX 600 (10 min TTL)
        API->>Email: Send magic link email
        Note right of Email: "Klicken Sie hier, um sich anzumelden"<br/>Link: /auth/verify?token={token}
        API-->>User: 200 OK "Check your email"
    end

    User->>API: GET /api/auth/verify?token={token}
    API->>Redis: GET magic:{token}
    alt Token valid
        Redis-->>API: {userId, email}
        API->>Redis: DEL magic:{token} (one-time use)

        API->>API: Generate JWT + session token
        API->>Redis: SET session:{token} {userId, orgId} TTL 30d
        API->>DB: INSERT Session {userId, token, ip}
        API->>DB: UPDATE User SET lastLoginAt = NOW()
        API->>DB: INSERT AuditLog {action: 'login'}

        API-->>User: 302 Redirect /dashboard + Set-Cookie: httpOnly, Secure, SameSite
    else Token invalid/expired
        API-->>User: 401 Invalid or expired link
    end

    Note over User,Email: Subsequent authenticated requests
    User->>API: GET /api/systems (Cookie: session_token)
    API->>Redis: GET session:{token}
    Redis-->>API: {userId, orgId}
    API->>API: Attach user context to request
    API->>DB: Query with organizationId filter (multi-tenancy)
    API-->>User: Response data
```

---

## 9. Regulatory Monitor (post-MVP)

```mermaid
sequenceDiagram
    participant Cron as BullMQ Scheduler
    participant Worker as Scraper Worker
    participant EURLex as EUR-Lex API
    participant LLM as Mistral Small API
    participant DB as PostgreSQL

    Note over Cron,DB: Daily scheduled job (02:00 UTC)

    Cron->>Worker: trigger('scrape-eurlex')

    Worker->>EURLex: GET /search?query=AI+Act&since=yesterday
    EURLex-->>Worker: {results: [{title, url, date, text}]}

    loop For each new result
        Worker->>DB: SELECT RegulatoryUpdate WHERE url = result.url
        alt Already scraped
            Worker->>Worker: Skip
        else New update
            Worker->>DB: INSERT RegulatoryUpdate {source: 'eur_lex', title, summary, url}
            DB-->>Worker: updateId

            Worker->>LLM: POST /v1/chat/completions
            Note right of LLM: "Analyze this AI Act update.<br/>Which articles are affected?<br/>What is the impact level?"
            LLM-->>Worker: {affectedArticles[], impactLevel}

            Worker->>DB: SELECT AISystem WHERE riskLevel IN (affected risk levels)
            DB-->>Worker: [{aiSystemId, name, riskLevel}]

            loop For each affected system
                Worker->>DB: INSERT ImpactAssessment {updateId, aiSystemId, impactLevel}
                Worker->>DB: INSERT Notification {userId: system.owner, type: 'regulatory_update', title, message}
            end

            Worker->>DB: UPDATE RegulatoryUpdate SET processed = true
        end
    end
```

---

## 10. Billing & Subscription (Stripe)

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant API as Fastify API
    participant Stripe as Stripe API
    participant DB as PostgreSQL

    Note over User,DB: Upgrade from Free to Paid plan

    User->>API: POST /api/billing/checkout {planId: 'growth'}
    API->>DB: SELECT Plan WHERE id = planId
    API->>DB: SELECT Subscription WHERE organizationId
    API->>Stripe: POST /v1/checkout/sessions {priceId, customer_email, success_url, cancel_url}
    Stripe-->>API: {sessionId, url}
    API-->>User: {checkoutUrl}
    User->>Stripe: Redirect to Stripe Checkout
    User->>Stripe: Enter payment details
    Stripe-->>User: Redirect to success_url

    Note over User,DB: Stripe Webhook (async confirmation)

    Stripe->>API: POST /api/webhooks/stripe {event: 'checkout.session.completed'}
    API->>API: Verify Stripe webhook signature
    API->>Stripe: GET /v1/subscriptions/:id
    Stripe-->>API: {subscription details}

    API->>DB: UPDATE Subscription SET plan='growth', stripeSubscriptionId, status='active', currentPeriodEnd
    API->>DB: INSERT AuditLog {action: 'update', resource: 'Subscription'}
    API-->>Stripe: 200 OK

    Note over User,DB: Monthly renewal (automatic)

    Stripe->>API: POST /api/webhooks/stripe {event: 'invoice.paid'}
    API->>DB: UPDATE Subscription SET currentPeriodEnd = newPeriodEnd
    API-->>Stripe: 200 OK

    Note over User,DB: Payment failure

    Stripe->>API: POST /api/webhooks/stripe {event: 'invoice.payment_failed'}
    API->>DB: UPDATE Subscription SET status = 'past_due'
    API->>DB: INSERT Notification {type: 'system_alert', message: 'Payment failed'}
    API-->>Stripe: 200 OK
```

---

## 11. Data Flow Summary

### Request → Response Latency Targets

| Flow | Target | Notes |
|------|--------|-------|
| Registration | < 3 sec | Includes org + user + role + subscription creation |
| Wizard step save | < 500 ms | Simple PATCH update |
| Classification (rule-only) | < 1 sec | No LLM call needed |
| Classification (with LLM) | < 10 sec | Mistral Small API call |
| Classification (cross-validated) | < 20 sec | Two sequential LLM calls |
| Eva chat (streaming) | First token < 2 sec | WebSocket streaming, Mistral Large API |
| Document section generation | < 30 sec | Async via BullMQ, Mistral Medium API |
| Dashboard load | < 1 sec | Redis cache (5 min TTL) |
| Gap analysis | < 5 sec | DB queries + Mistral Medium API |
| PDF export | < 60 sec | Async via BullMQ |

### Data Persistence Points

```
Browser → [HTTPS] → Cloudflare → [proxy] → Fastify → [validate] → PostgreSQL
                                                    → [cache]    → Redis
                                                    → [enqueue]  → BullMQ → Worker
                                                    → [stream]   → WebSocket
                                                    → [classify] → Mistral API (EU)
                                                    → [store]    → S3 (Hetzner)
```

### Cross-Context Events

| Event | Producer | Consumers | Action |
|-------|----------|-----------|--------|
| SystemClassified | Classification | Compliance, Dashboard | Create checklist, recalc score |
| DocumentGenerated | Compliance | Dashboard, Notification | Update progress, notify user |
| ComplianceScoreChanged | Compliance | Dashboard | Invalidate cache, push WS update |
| RegulatoryUpdateFound | Monitoring | Compliance, Notification | Assess impact, notify affected |
| SubscriptionChanged | Billing | IAM | Update feature access |

---

**Последнее обновление:** 2026-02-07
**Следующий документ:** CODING-STANDARDS.md (ЭТАП 5) ⛔ Требует PO approval
