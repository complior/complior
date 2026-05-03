# Feature Area: Passport Architecture

> **Sources:** `docs/FEATURE-AGENT-PASSPORT.md` + `docs/PASSPORT-DATA-PIPELINE.md`
> **Version:** 2.2.0 (Passport) + 2.0.0 (Pipeline)
> **Date:** 2026-03-25
> **Purpose:** Agent Passport — EU AI Act compliance record for AI systems
> **Status (v1.0.0):** ✅ COMPLETE — production-ready, in v1.0.0 scope

---

## 1. Purpose

**Agent Passport** — standardized `agent-manifest.json` record identifying an AI agent, describing identity, capabilities, constraints, compliance status, and human oversight.

Juridical requirement: EU AI Act Art.26-27 obligates deployers to maintain a registry of AI systems. Deadline: **2 August 2026**.

---

## 2. Three Generation Modes

```
┌─────────────────────────────────────────────────────────────────────┐
│  Mode 1: AUTO          Mode 2: RUNTIME          Mode 3: MANUAL    │
│  (CLI, code available) (Observation + Eval)      (SaaS Dashboard)  │
│                                                                      │
│  AST analysis          MCP Proxy observes       Deployer fills form  │
│  → permissions         tool calls runtime        Pre-fill from       │
│  → autonomy L1-L5     → discovered perms        AI Registry         │
│  → tools/APIs         → data access patterns   Completeness: 100%  │
│  → human gates         → autonomy inferred       (manual)           │
│  → framework detect                                                     │
│  → model detect        Eval tests system         Product:           │
│  → kill-switch        → conformity score        SaaS PAID           │
│  → risk class         → security score                               │
│                                                                      │
│  Completeness:         Completeness:             Target user:       │
│  85-95%                40-60%                    DPO / CTO /        │
│  Product: CLI FREE     Product: CLI + SaaS       Compliance Mgr     │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode 1 (AUTO)

`complior passport init` analyzes code via AST. Auto-detects: framework, model, permissions, tools, human gates, logging, autonomy level, kill-switch.

### Mode 2 (RUNTIME)

MCP Proxy (Scanner Mode 11) intercepts tool calls: tools_used, data_access, timing. Eval (Modes 14-16) tests running system: conformity score, security score.

---

## 3. Passport Structure

### 3.1 Core Fields

```jsonc
{
  "agent_id": "ag_<uuid>",
  "name": "order-processor",
  "display_name": "Order Processor",
  "version": "1.0.0",
  "created": "2026-03-20T14:30:00Z",
  "updated": "2026-03-20T14:30:00Z",

  // Identity (auto)
  "identity": {
    "description": "LangChain-based order processor for ERP",
    "owner": { "team": "", "contact": "", "responsible_person": "" },
    "lifecycle": { "status": "draft", "deployed_since": "" }
  },

  // Autonomy (auto, L1-L5 from AST patterns)
  "autonomy": {
    "type": "autonomous | assistive | hybrid",
    "autonomy_level": "L3",
    "autonomy_evidence": "gates, unsupervised, no_logging counts"
  },

  // Tech Stack (auto, from L3 deps + SDK detection)
  "tech_stack": {
    "framework": "langchain | crewai | openai | anthropic",
    "model": { "provider": "", "model_id": "", "deployment": "api" }
  },

  // Permissions (auto, from permission scanner)
  "permissions": {
    "tools": ["fetch_order", "query_db"],
    "data_access": { "read": true, "write": true },
    "denied": []
  },

  // Compliance (computed)
  "compliance": {
    "risk_class": "high | limited | minimal",
    "applicable_articles": ["Art.26", "Art.27"],
    "obligations_met": [],
    "obligations_pending": [],
    "complior_score": 0,
    "project_score": 0,
    "scan_summary": { /* per-agent totals */ }
  },

  // Signature (Ed25519)
  "signature": { "algorithm": "Ed25519", "value": "" }
}
```

### 3.2 Document Quality Tracking

| Level | Value | Detection | Score Impact |
|-------|-------|-----------|-------------|
| 0 | `none` | No file | L1 fail |
| 1 | `scaffold` | SHALLOW/placeholders | L1 pass, L2 fail |
| 2 | `draft` | Real content | L1+L2 pass |
| 3 | `reviewed` | `complior:reviewed` marker | L1+L2 pass+verified |

---

## 4. Data Pipeline (4 Stages)

### Stage 0: INIT (0% → 65-70%)
`complior init` or TUI onboarding wizard → creates `.complior/` + profile + passports (idempotent).

### Stage 1: SCAN (65% → 70%)
`complior scan` → `updatePassportsAfterScan()` updates per-agent:
- `compliance.complior_score` (per-agent)
- `compliance.project_score` (project-level)
- `compliance.last_scan`
- `compliance.scan_summary`

### Stage 2: FIX (+score improvement via rescan)
`complior fix` → auto-rescan → passport score updates.

### Stage 3: MANUAL (70% → 93%)
TUI wizard / JSON edit / CLI → manual fields: owner, disclosure, lifecycle.

---

## 5. Per-Agent Document Requirements

| Document | Article | When Required |
|----------|---------|---------------|
| FRIA | Art.27 | High-risk |
| Risk Management | Art.9 | High-risk |
| Technical Documentation | Art.11 | All |
| Declaration of Conformity | Art.47 | Before market |
| Art.5 Screening | Art.5 | All |
| Instructions for Use | Art.13 | All |
| Data Governance | Art.10 | All |

---

## 6. Scanner ↔ Passport Mapping

Each Finding has `agentId` field. Findings filtered per-agent → derive doc-status + scan_summary.

| Passport Field | Scanner CheckId | Article | Auto-Populated |
|---------------|----------------|---------|----------------|
| `compliance.fria_completed` | `fria` | Art.27 | Yes |
| `compliance.risk_management.documented` | `risk-management` | Art.9 | Yes |
| `compliance.technical_documentation.documented` | `tech-docs` | Art.11 | Yes |
| `compliance.declaration_of_conformity.documented` | `declaration` | Art.47 | Yes |
| `compliance.art5_screening.completed` | `art5-screening` | Art.5 | Yes |

---

## 7. Dual Scoring

- **complior_score** — per-agent score (passed/total × 100) from agent's own findings
- **project_score** — project-level score (same for all passports)

## 8. Cross-Dependencies

| Depends on | How |
|---|---|
| **Scanner** | L1 checks presence/completeness; Scanner→Passport Mapping updates 5 fields |
| **Eval** | Mode 2 RUNTIME: MCP Proxy infers autonomy level (confidence 0.55) |
| **Fix** | Fix Category E generates passports via `complior init` or `complior passport init` |

| Used by | How |
|---|---|
| **Report** | 20% of Readiness Score from avg completeness |
| **Scanner** | Passport fields inform Scanner check results |

## 9. Test Coverage

12 tests: builder/ (manifest-builder, manifest-diff), discovery/ (agent-discovery, autonomy-analyzer, permission-scanner), export.test.ts, a2a-importer.test.ts, crypto-signer.test.ts, obligation-field-map.test.ts, passport-validator.test.ts, scan-to-compliance.test.ts, test-generator.test.ts
