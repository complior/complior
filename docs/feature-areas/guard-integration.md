# FA-09: Guard Integration Architecture

**Version:** 1.0.0
**Updated:** 2026-04-17
**Owner:** Architect
**Status (v1.0.0):** 🔵 SEPARATE TRACK — разрабатывается параллельно (`~/guard/guard/`); интеграция в Complior — **POST-v1.0.0** (V2-M03), после Guard MVP

---

## 1. Purpose

**Guard Integration** connects Complior's development-time compliance analysis with Guard's runtime compliance enforcement. Guard is a separate Python ML service (FastAPI + Qwen 7B + PromptGuard 2 + LLM Guard/Presidio) that classifies LLM input/output against EU AI Act articles in real-time.

**Integration principle:** Complior detects compliance gaps at development time → Guard enforces compliance at runtime. Together they form a closed loop: detection → finding → fix → runtime guard → evidence → report.

---

## 2. Architecture Position

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLIOR + GUARD ARCHITECTURE                         │
│                                                                            │
│  ┌─── Development-time (Complior) ─────────────────────────────────────┐  │
│  │  CLI/Daemon           Engine (TS)           Scanner → Fixer          │  │
│  │  complior scan    →   5-layer scan      →   20 fix strategies        │  │
│  │  complior eval    →   security probes   →   remediation report       │  │
│  │  complior fix     →   auto-fix code     →   injects SDK + Guard ref  │  │
│  │  complior report  →   compliance report →   Guard stats included     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── Runtime (Guard API) ─────────────────────────────────────────────┐  │
│  │  POST /v1/classify — 11 tasks, 3 engine groups, parallel inference   │  │
│  │  POST /v1/batch    — batch classification                            │  │
│  │  GET  /v1/health   — health check                                    │  │
│  │  GET  /v1/articles — article mappings (planned G-M01)                │  │
│  │                                                                      │  │
│  │  Phase 1 (G-M01): + severity, action, violation, risk_summary        │  │
│  │  Phase 2 (G-M02): + REASK auto-remediation, fine-tuned sub-types     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── Runtime (SDK) ──────────────────────────────────────────────────┐   │
│  │  @complior/sdk — complior(client, config)                           │   │
│  │  Pre-hooks:  prohibited, sanitize, disclosure, permission           │   │
│  │  Post-hooks: safety-filter, bias-check, escalation, budget          │   │
│  │                                                                     │   │
│  │  Optional Guard layer:                                              │   │
│  │  pre-hook:  guard-classify (input text → Guard API → block/flag)    │   │
│  │  post-hook: guard-verify (output text → Guard API → filter/log)     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─── Hosted (Guard v2) ──────────────────────────────────────────────┐   │
│  │  POST /v2/chat     — RAG-powered Q&A (Qwen 14B)                    │   │
│  │  POST /v2/analyze  — deep compliance analysis                       │   │
│  │  POST /v2/evaluate — AI system evaluation                           │   │
│  │  POST /v2/generate — document generation                            │   │
│  │  POST /v2/fix      — AI-assisted fix suggestions                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Integration Points

### 3.1 Complior SDK → Guard API (Runtime)

The SDK's `complior(client, config)` and `compliorAgent(client, config)` wrappers can optionally call Guard API for ML-based classification. This supplements the SDK's deterministic regex/rule checks with semantic ML analysis.

**Current SDK hooks (deterministic, no Guard):**
- Pre: prohibited (138 regex patterns), sanitize (50+ PII), disclosure
- Post: safety-filter, bias-check, escalation, content-marking

**Planned Guard-enhanced hooks:**
```typescript
const client = complior(new OpenAI(), {
  guard: {
    apiUrl: 'https://guard.complior.com/v1',
    apiKey: process.env.GUARD_API_KEY,
    tasks: ['prohibited', 'bias', 'content_safety'],
    recipe: 'eu_ai_act_full',        // G-M01 recipe
    blockOn: ['high'],                // block on high severity
    reviewOn: ['medium'],             // flag for review on medium
  }
});
```

**Integration flow:**
```
User request
    │
    ▼
┌─ SDK Pre-hooks (deterministic) ──────────────────────────┐
│  1. prohibited (regex) — instant block on 138 patterns    │
│  2. sanitize (PII redaction)                              │
│  3. disclosure (Art.50 injection)                         │
│  4. guard-classify (if config.guard) ──┐                  │
│     POST /v1/classify                  │                  │
│     {text, tasks, recipe}              │                  │
│     → severity=high → BLOCK            │                  │
│     → severity=medium → FLAG metadata  │                  │
│     → severity=low → ALLOW + log       │                  │
└──────────────────────────────────────┬─┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │   LLM API    │
                                └──────┬───────┘
                                       │
                                       ▼
┌─ SDK Post-hooks (deterministic + Guard) ─────────────────┐
│  1. safety-filter                                         │
│  2. bias-check                                            │
│  3. guard-verify (if config.guard) ──┐                    │
│     POST /v1/classify                │                    │
│     {text: response, tasks}          │                    │
│     → severity=high → BLOCK response │                    │
│     → severity=medium → add warning  │                    │
└──────────────────────────────────────┘
```

**Priority:** P1 (Phase 3 — Python SDK + Integrations)

### 3.2 Complior Scanner → Guard Hosted (Deep Analysis)

Scanner Layer 5 (LLM analysis) currently uses Vercel AI SDK with configurable LLM provider. When `guard_api` is selected as provider, L5 calls Guard's hosted endpoints instead:

```
Scanner L5 (opt-in)
    │
    ├─ Provider: openrouter → OpenRouter API (100+ models)
    ├─ Provider: anthropic  → Claude directly
    ├─ Provider: openai     → GPT directly
    └─ Provider: guard_api  → Guard Hosted (/v2/analyze)
                               Advantage: EU-hosted, GDPR-compliant
                               No data leaves EU (Hetzner Germany)
```

**Current state:** `guard_api` provider is referenced in onboarding (steps.rs:109, config.rs:462) but not yet wired to actual Guard endpoints. The Guard hosted service has mock endpoints defined (hosted/mock.py).

**Wiring needed:**
- Engine LLM adapter to recognize `guard_api` provider
- Route to Guard /v2/* endpoints
- Pass `GUARD_API_KEY` from config

**Priority:** P1 (Phase 3)

### 3.3 Complior CLI → Guard (Flags)

Three CLI integration points planned:

| Flag | Command | What it does |
|------|---------|-------------|
| `--guard` | `complior scan` | Add Guard runtime check results alongside static scan |
| `--guard` | `complior eval` | Include Guard classification in security evaluation |
| `--guard` | `complior report` | Include Guard runtime stats in compliance report |

**Current state:** `complior guard` command suggested in eval output (eval.rs:1872) but not implemented. The `--guard` flag is NOT in v1.0 scope — it's post-v1.0.

**Priority:** P2 (Phase 3 — after SDK integration)

### 3.4 Complior Report → Guard Stats (Reporting)

Compliance report includes Guard runtime metrics when available:

```
Section: Runtime Compliance (Guard)
├── Total requests classified: 12,450
├── Violations detected: 23
│   ├── Art. 5 (prohibited): 2 BLOCKED
│   ├── Art. 9 (bias): 5 FLAGGED
│   ├── Art. 10 (PII): 8 FIXED (PII redacted)
│   ├── Art. 14 (escalation): 3 REVIEWED
│   └── Art. 15 (content safety): 5 FLAGGED
├── Overall risk score: 0.92 (low)
└── Recommendation: Maintain current configuration
```

**Data source:** Guard's audit log API (Phase 4: GET /v1/audit)
**Priority:** P2 (Phase 4 — Enterprise)

### 3.5 Passport ↔ Guard (Agent Governance)

Agent Passport flows bidirectionally with Guard:

```
Passport → Guard:
  passport.permissions.tools → Guard permission check
  passport.constraints.prohibited_actions → Guard prohibited patterns
  passport.constraints.budget → Guard budget tracking

Guard → Passport:
  Guard violations → Evidence Chain (append entry)
  Guard BLOCK action → Passport audit log
  Guard classify results → Passport compliance_score update
```

**Implementation:** SDK's `compliorAgent()` already enforces passport constraints. Guard integration adds ML-based semantic enforcement on top of regex rules.

**Priority:** P1 (Phase 3 — natural extension of compliorAgent)

---

## 4. Configuration

### 4.1 Global Config (`~/.config/complior/settings.toml`)

```toml
[guard]
api_url = "https://guard.complior.com/v1"   # Guard API endpoint
api_key = ""                                  # Guard API key (or GUARD_API_KEY env)
enabled = true                                # Enable Guard integration globally
```

### 4.2 Project Config (`.complior/project.toml`)

```toml
[guard]
recipe = "eu_ai_act_full"           # Default recipe for this project
tasks = ["prohibited", "bias", "content_safety", "pii", "escalation", "exfiltration"]
block_on_severity = "high"           # Block threshold
review_on_severity = "medium"        # Review/flag threshold
hosted_provider = true               # Use Guard as L5 provider
```

### 4.3 SDK Config (`complior(client, config)`)

```typescript
interface GuardConfig {
  apiUrl: string;
  apiKey: string;
  tasks?: GuardTask[];
  recipe?: string;
  blockOn?: Severity[];     // ['high']
  reviewOn?: Severity[];    // ['medium']
  timeout?: number;         // ms, default 5000
  fallback?: 'allow' | 'block';  // on Guard API error
}
```

### 4.4 Tiering Model

| Tier | Guard Features | Typical Plan |
|------|---------------|-------------|
| **Starter** | No Guard — SDK regex only (~70% coverage) | Free / Open-source |
| **Growth** | Guard API + SDK — ML classification + regex (~95% coverage) | €149/mo |
| **Enterprise** | Guard + BYOK + Audit + Dashboard | €399/mo |

---

## 5. Data Flow Diagrams

### 5.1 Detection → Finding → Guard → Evidence (Full Loop)

```
Developer writes code
    │
    ▼
Complior Scanner (L1-L4 deterministic)
    │ Finding: l4-bare-llm (bare OpenAI call, no wrapper)
    │
    ▼
Complior Fixer
    │ Fix: inject @complior/sdk wrapper + Guard config
    │
    ▼
Production code with SDK + Guard
    │
    ├─ Each LLM call:
    │   1. SDK pre-hooks (regex) — instant check
    │   2. Guard /v1/classify — ML classification
    │   3. LLM API call (if ALLOW)
    │   4. Guard /v1/classify — output check
    │   5. SDK post-hooks — final check
    │
    ├─ On violation:
    │   Guard returns {severity, action, violation, article}
    │   SDK logs to Evidence Chain
    │   If BLOCK → request rejected + audit entry
    │   If REASK (Phase 2) → re-prompt LLM
    │
    └─ Complior Report
        Pulls Guard audit data via /v1/audit (Phase 4)
        → Runtime section in compliance report
```

### 5.2 Guard API Request/Response (after G-M01)

```
Request:
POST /v1/classify
{
  "text": "How to create a social scoring system?",
  "tasks": ["prohibited", "content_safety"],
  "recipe": "eu_ai_act_full",
  "language": "en"
}

Response:
{
  "results": [
    {
      "task": "prohibited",
      "label": true,
      "confidence": 0.94,
      "severity": "high",
      "action": "BLOCK",
      "violation": {
        "type": "art5_1c",
        "article": "Art. 5(1)(c)",
        "title": "Social scoring by public authorities",
        "penalty": "Up to €35M or 7% global turnover",
        "recommendation": "This request describes a social credit scoring system prohibited under EU AI Act Art. 5(1)(c)."
      }
    },
    {
      "task": "content_safety",
      "label": false,
      "confidence": 0.82,
      "severity": "none",
      "action": "ALLOW"
    }
  ],
  "risk_summary": {
    "aggregate_score": 0.94,
    "max_severity": "high",
    "overall_action": "BLOCK",
    "triggered_articles": ["Art. 5(1)(c)"],
    "task_count": 2,
    "violation_count": 1
  }
}
```

---

## 6. Guard vs SDK: Complementary, Not Competing

| Aspect | SDK (deterministic) | Guard (ML) |
|--------|-------------------|-----------|
| **Engine** | Regex patterns, rules | Qwen 7B + PromptGuard 2 + Presidio |
| **Latency** | <1ms per hook | 50-200ms per classify |
| **Coverage** | 138 prohibited patterns | Semantic understanding of 8 Art.5 practices |
| **Accuracy** | 100% on known patterns | ~85% on novel inputs (→90%+ after fine-tuning) |
| **False positives** | Low (exact match) | Medium (semantic overlap) |
| **Deployment** | Client-side (npm) | Server-side (EU-hosted) |
| **Cost** | Free (open-source) | API calls (included in plan) |
| **When to use** | Always (first line) | When semantic analysis needed |

**Combined advantage:** SDK catches known patterns instantly → Guard catches novel/semantic violations → together they achieve ~95%+ coverage with <200ms total latency.

---

## 7. Cross-Dependencies

| Depends on | How |
|---|---|
| **Guard API** (~/guard/guard) | All runtime classification flows through Guard /v1/classify |
| **Guard Hosted** (~/guard/guard) | L5 deep analysis via /v2/analyze |
| **SDK** (engine/sdk) | Guard hooks plug into SDK pre/post pipeline |
| **Scanner** (engine/core/domain/scanner) | Finds bare LLM calls → triggers SDK+Guard fix |
| **Passport** (engine/core/domain/passport) | Agent constraints flow to Guard enforcement |
| **Config** (cli/src/config.rs) | Guard settings in global + project config |

| Used by | How |
|---|---|
| **Fixer** | Generates code with SDK + Guard config |
| **Report** | Includes Guard runtime stats |
| **Eval** | Security probes can test through Guard |
| **TUI/CLI** | `--guard` flag, onboarding provider selection |
| **Evidence Chain** | Guard violations appended to evidence |

---

## 8. Implementation Phases

### Phase 1: Guard Standalone (G-M01) — current
Guard API transforms from binary detector to compliance runtime:
- Severity scoring, recommended actions, violation details, article mapping
- Recipes, policy engine, PII merger
- **No Complior integration changes needed** — Guard improves independently

### Phase 2: Guard Fine-Tuning (G-M02)
- Sub-practice classification (which Art. 5 practice?)
- Severity prediction model
- REASK engine (auto-remediation)
- **Complior impact:** SDK REASK hook can delegate to Guard

### Phase 3: Complior ↔ Guard Integration
- SDK guard-classify and guard-verify hooks
- `guard_api` provider wiring for Scanner L5
- CLI `--guard` flag
- Config schema changes (global + project)
- **New tests:** SDK guard hook tests, integration tests

### Phase 4: Enterprise Integration
- Guard audit log → Complior report
- Guard dashboard widget in SaaS
- Passport ↔ Guard bidirectional sync

---

## 9. API Contract (Guard v1 → Complior)

### 9.1 Types (to mirror in engine/core/src/types/)

```typescript
// guard-integration.types.ts

type GuardTask =
  | 'prohibited' | 'bias' | 'content_safety' | 'escalation'
  | 'exfiltration' | 'pii' | 'injection' | 'jailbreak'
  | 'pii_scan' | 'toxicity_scan' | 'secrets_scan';

type GuardSeverity = 'none' | 'low' | 'medium' | 'high';

type GuardAction = 'ALLOW' | 'FLAG' | 'REVIEW' | 'BLOCK';

interface GuardClassifyResult {
  task: GuardTask;
  label: boolean;
  confidence: number;          // [0.0, 1.0]
  severity: GuardSeverity;
  action: GuardAction;
  violation?: GuardViolation;
  details?: Record<string, unknown>;
}

interface GuardViolation {
  type: string;                 // e.g., "art5_1c"
  article: string;              // e.g., "Art. 5(1)(c)"
  title: string;                // human-readable
  penalty: string;              // e.g., "Up to €35M or 7%"
  recommendation: string;       // remediation guidance
}

interface GuardRiskSummary {
  aggregate_score: number;      // [0.0, 1.0]
  max_severity: GuardSeverity;
  overall_action: GuardAction;
  triggered_articles: string[];
  task_count: number;
  violation_count: number;
}

interface GuardClassifyResponse {
  results: GuardClassifyResult[];
  risk_summary: GuardRiskSummary;
}
```

### 9.2 Zod Schemas (engine/core/src/types/guard-integration.schemas.ts)

```typescript
import { z } from 'zod';

export const GuardTaskSchema = z.enum([
  'prohibited', 'bias', 'content_safety', 'escalation',
  'exfiltration', 'pii', 'injection', 'jailbreak',
  'pii_scan', 'toxicity_scan', 'secrets_scan'
]);

export const GuardSeveritySchema = z.enum(['none', 'low', 'medium', 'high']);
export const GuardActionSchema = z.enum(['ALLOW', 'FLAG', 'REVIEW', 'BLOCK']);

export const GuardViolationSchema = z.object({
  type: z.string(),
  article: z.string(),
  title: z.string(),
  penalty: z.string(),
  recommendation: z.string(),
});

export const GuardClassifyResultSchema = z.object({
  task: GuardTaskSchema,
  label: z.boolean(),
  confidence: z.number().min(0).max(1),
  severity: GuardSeveritySchema,
  action: GuardActionSchema,
  violation: GuardViolationSchema.optional(),
  details: z.record(z.unknown()).optional(),
});

export const GuardRiskSummarySchema = z.object({
  aggregate_score: z.number().min(0).max(1),
  max_severity: GuardSeveritySchema,
  overall_action: GuardActionSchema,
  triggered_articles: z.array(z.string()),
  task_count: z.number().int(),
  violation_count: z.number().int(),
});

export const GuardClassifyResponseSchema = z.object({
  results: z.array(GuardClassifyResultSchema),
  risk_summary: GuardRiskSummarySchema,
});
```

---

## 10. Test Coverage Plan

| Test File | Scope | Phase |
|-----------|-------|-------|
| `guard-integration.test.ts` | Type/schema validation, mock classify | Phase 3 |
| `sdk-guard-hook.test.ts` | SDK guard-classify pre-hook, guard-verify post-hook | Phase 3 |
| `guard-provider.test.ts` | L5 guard_api provider adapter | Phase 3 |
| `guard-config.test.ts` | Config parsing, fallback behavior | Phase 3 |
| `guard-evidence.test.ts` | Violation → Evidence Chain append | Phase 3 |
| `guard-report.test.ts` | Guard stats in compliance report | Phase 4 |

---

## 11. Deployment Topology

```
┌───────────────────────────────────────────────┐
│         User's Production Environment          │
│                                                │
│  App + @complior/sdk                           │
│  └─ pre-hooks → Guard API → post-hooks         │
│                    │                            │
└────────────────────┼────────────────────────────┘
                     │ HTTPS
                     ▼
┌───────────────────────────────────────────────┐
│         Hetzner GX11 (Falkenstein, DE)         │
│         24GB VRAM, EU jurisdiction              │
│                                                │
│  Guard API (FastAPI, port 8000)                │
│  ├── Qwen 2.5 7B AWQ (vLLM, 4.2GB)            │
│  ├── PromptGuard 2 (86M, 0.4GB)               │
│  ├── LLM Guard + Presidio (1.3GB)              │
│  └── Qwen 2.5 14B AWQ (hosted, 8.0GB)         │
│                                                │
│  All data stays in EU (GDPR Art. 44)           │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│         Developer Machine                      │
│                                                │
│  Complior CLI (Rust binary)                    │
│  └── complior scan/eval/report                 │
│      └── Engine (TS, port 3000)                │
│          └── Scanner L5 → Guard /v2/analyze    │
└───────────────────────────────────────────────┘
```

---

## 12. Security Considerations

- **API key management:** Guard API key stored in `~/.config/complior/settings.toml` or `GUARD_API_KEY` env var. Never in project files or git.
- **Data in transit:** HTTPS only. Text sent to Guard for classification — consider sensitivity.
- **Data at rest:** Guard processes text in-memory, no storage (Phase 1-3). Audit log storage in Phase 4 — metadata only, no raw text.
- **Fallback behavior:** If Guard API unavailable, SDK deterministic hooks still run. Config `fallback: 'allow' | 'block'` controls degraded behavior.
- **Rate limiting:** Guard API has rate limits per API key. SDK respects 429 responses with exponential backoff.
- **GDPR compliance:** Guard hosted on Hetzner Germany. No data leaves EU. No raw text stored in audit logs.
