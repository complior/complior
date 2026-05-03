# Feature Area: SDK Architecture

> **Source:** `docs/SDK.md`
> **Version:** 1.0.0
> **Date:** 2026-03-22
> **Purpose:** Runtime compliance middleware — `@complior/sdk` for production
> **Status (v1.0.1):** 🟡 BASE VERSION — 14 hooks shipped in S05 (7 pre + 7 post) + 138 Art. 5 prohibited patterns + 50+ PII patterns with checksum validation (IBAN, BSN, NIR, PESEL, Codice Fiscale). Full Layer 2 enrichment (HTTP middleware, hook composition, per-domain enrichment, Guard API readiness): **POST-v1.0.0** (V2-M01). См. `docs/V2-ROADMAP.md` V2-M01.

---

## 1. Purpose

**SDK** — runtime compliance middleware working in user's production code. One line transforms any LLM client into EU AI Act-compliant system:

```typescript
import { complior } from '@complior/sdk';
const client = complior(new OpenAI());
// Use as regular OpenAI — API identical
```

Every API call passes through: pre-hooks → LLM call → post-hooks. All checks are deterministic (regex, rules). No proprietary model. Optional Guard API for semantic verification.

---

## 2. Architecture Role

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLIOR ARCHITECTURE                               │
│                                                                             │
│  ┌─── Development-time ───────────────────────────────────────────────┐     │
│  │  CLI/Daemon           Engine (TS)         Scanner → Fixer          │     │
│  │  complior scan    →   5-layer scan    →   20 fix strategies        │     │
│  │  complior fix     →   auto-fix code   →   injects SDK into code    │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─── Runtime (Production) ───────────────────────────────────────────┐   │
│  │  @complior/sdk — complior(client, config)                            │   │
│  │  pre-hooks → API call → post-hooks                                   │   │
│  │  • Block prohibited practices (Art.5)                                │   │
│  │  • PII redaction (GDPR)                                               │   │
│  │  • Disclosure injection (Art.50)                                      │   │
│  │  • Bias detection (Art.21)                                            │   │
│  │  • Safety filtering (Art.15)                                          │   │
│  │  • Audit logging (Art.12)                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Two APIs

### 3.1 `complior(client, config?)` — basic wrapper

```typescript
import { complior } from '@complior/sdk';
const client = complior(new OpenAI(), {
  jurisdictions: ['EU'],
  role: 'provider',
  sanitizeMode: 'replace',
  disclosureMode: 'warn-only',
  safetyFilter: true,
  biasThreshold: 0.3,
});
```

**Includes:** 6 pre-hooks + 6 post-hooks (no agent-specific features).

### 3.2 `compliorAgent(client, config)` — agent-aware wrapper

```typescript
import { compliorAgent } from '@complior/sdk';
const client = compliorAgent(new Anthropic(), {
  passport: agentPassportJSON,
  budgetLimitUsd: 10.0,
  toolCallAction: 'block',
  onAction: (entry) => auditLog(entry),
  circuitBreaker: { errorThreshold: 5 },
});
```

**Includes:** everything in `complior()` + permission, rate-limit, budget, action-log, circuit-breaker, tool-call permission.

---

## 4. Pipeline

```
Request
    │
    ▼
┌───────────────────────── PRE-HOOKS ─────────────────────────────┐
│                                                             │
│  1. logger        → log request (Art.12)                    │
│  2. prohibited     → block Art.5 violations (8 categories)   │
│  3. sanitize       → PII redaction before send (GDPR)       │
│  4. disclosure     → inject into system prompt (Art.50)      │
│  5. permission*    → tools allowlist/deny check              │
│  6. rate-limit*    → sliding window (window/max)            │
│                                                             │
│  * = only compliorAgent()                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  LLM API     │
                  │  OpenAI/     │
                  │  Anthropic/  │
                  │  Gemini/     │
                  │  Vercel AI   │
                  └──────┬───────┘
                         │
                         ▼
┌──────────────────────── POST-HOOKS ────────────────────────────┐
│                                                             │
│  1. disclosure-verify → verify in response (Art.50)         │
│  2. content-marking    → C2PA metadata (Art.50(2))           │
│  3. safety-filter      → harmful content (Art.15)           │
│  4. escalation         → detect "speak to human"             │
│  5. bias-check         → bias detection (Art.21)            │
│  6. headers           → compliance HTTP headers             │
│  7. budget*           → USD limit tracking                  │
│  8. action-log*       → audit callback                      │
│  9. circuit-breaker*  → cascade protection                  │
│  10. tool-permission* → tool_calls check                    │
│                                                             │
│  * = only compliorAgent()                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  Response + _complior metadata
```

---

## 5. Providers

SDK auto-detects provider via:
1. Symbol hint: `client[Symbol.for('complior:provider')] = 'openai'`
2. Constructor name: `OpenAI`, `Anthropic`, `GoogleGenerativeAI`
3. Property inspection: `chat.completions` → OpenAI, `messages` → Anthropic

| Provider | Intercepted Method | Proxy Chain |
|----------|-------------------|-------------|
| OpenAI | `chat.completions.create()` | `client→chat→completions→create` |
| Anthropic | `messages.create()` | `client→messages→create` |
| Google Gemini | `generateContent()` | `client→generate` |
| Vercel AI | `generateText()` / `streamText()` | direct call |

---

## 6. Key Features

| Feature | Article | Description |
|---------|---------|-------------|
| Prohibited practices block | Art.5 | 8 categories blocked |
| PII sanitization | GDPR | Replace/redact before LLM |
| AI disclosure injection | Art.50 | Inject into system prompt |
| Content marking | Art.50(2) | C2PA metadata |
| Bias detection | Art.21 | Threshold-based check |
| Safety filtering | Art.15 | Harmful content block |
| Audit logging | Art.12 | Structured logs, PII masked |
| Rate limiting | — | Sliding window |
| Circuit breaker | — | Error threshold cascade |
| Budget tracking | — | USD per session |

---

## 7. Connection to Scanner

Scanner finds `l4-bare-llm` (bare LLM call without wrapper) → Fixer generates self-sufficient compliance code (Level 1) → Suggests SDK as optional upgrade (Level 2) for full runtime enforcement.

## 8. Cross-Dependencies

| Depends on | How |
|---|---|
| **Scanner** | Scanner finds `l4-bare-llm` → triggers SDK suggestion |
| **Fix** | Fixer injects SDK as optional Level 2 upgrade |

| Used by | How |
|---|---|
| **Eval** | Security probes test SDK's 10 runtime safety hooks |
| **TUI/MCP** | MCP Guard tools call SDK hooks internally |

## 9. Test Coverage

16 tests: agent.test.ts, bias-detection.test.ts, circuit-breaker.test.ts, domains.test.ts, middleware.test.ts, permission-tool-calls.test.ts, pipeline.test.ts, post-hooks.test.ts, pre-hooks.test.ts, prohibited-patterns.test.ts, proxy-adapters.test.ts, runtime-control.test.ts, safety-hitl.test.ts, sanitize-patterns.test.ts, sdk.test.ts, tool-call-parser.test.ts
