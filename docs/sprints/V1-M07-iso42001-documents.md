# V1-M07: ISO 42001 Document Generators

**Status:** 🔴 RED (tests written, implementation pending)
**Created:** 2026-04-12
**Deadline:** 2026-04-26 (2 weeks)
**Agents:** nodejs-dev (engine), rust-dev (CLI)
**Feature Areas:** FA-04 (Passport), FA-05 (Report)
**Branch:** feature/V1-M07-iso42001 (from dev)

---

## Context

### Why now

Phase 2 per STRATEGY.md: ISO 42001 is the first certifiable AI management standard.
EU AI Act enforcement in ~4 months (2026-08-02). Companies need **both**:
- EU AI Act compliance documents (14 types — ✅ DONE)
- ISO 42001 management system documents (3 new types — THIS MILESTONE)

ISO 42001 adds organizational governance layer on top of EU AI Act technical requirements.
Customers pursuing certification need: AI Policy, Statement of Applicability, Risk Register.

### What we're building

3 new deterministic document generators (no LLM required):

1. **Statement of Applicability (SoA)** — 39 ISO 42001 controls × applicability × evidence from scan
2. **Risk Register** — Scan findings → risk matrix (likelihood × impact × mitigation)
3. **ISO 42001 AI Policy** — Organizational AI policy from passport data

All follow the existing pattern: passport data → template → prefilled document + manual fields.

### Dependencies

- AgentPassport (36 fields) — ✅ exists
- ScanResult (findings) — ✅ exists
- Template Registry — ✅ exists (needs 3 new entries)
- Document Generator pattern — ✅ exists (`document-generator.ts`)
- FRIA Generator pattern — ✅ exists (`fria-generator.ts`)

---

## Предусловия среды (architect обеспечивает):

- [x] npm install в engine/core
- [x] cargo build компилируется
- [x] npm test запускается (RED тесты — ок, ошибки среды — нет)
- [x] cargo test запускается
- [ ] RED тесты закоммичены: `engine/core/src/domain/documents/soa-generator.test.ts`
- [ ] RED тесты закоммичены: `engine/core/src/domain/documents/risk-register-generator.test.ts`
- [ ] Acceptance script закоммичен: `scripts/verify_iso42001_docs.sh`
- [ ] Data file: `engine/core/data/iso-42001-controls.json`
- [ ] Templates: `engine/core/data/templates/iso-42001/*.md` (3 files)
- [ ] Types: `Iso42001Control`, `SoAEntry`, `RiskRegisterEntry` in common.types.ts

---

## Tasks

### T-1: ISO 42001 Controls Data (architect) ✅

Create `engine/core/data/iso-42001-controls.json` with 39 Annex A controls.

Each entry:
```typescript
{
  controlId: string       // "A.2.2"
  group: string           // "AI Policies"
  title: string           // "AI Policy"
  description: string     // Brief control description
  euAiActArticles: string[] // Related EU AI Act articles
  checkIds: string[]      // Scanner checkIds that provide evidence
}
```

**Verification:** JSON validates, 39 entries, all groups covered

---

### T-2: ISO 42001 Types + Template Registry (architect) ✅

Add to `engine/core/src/types/common.types.ts`:

```typescript
export interface Iso42001Control {
  readonly controlId: string;
  readonly group: string;
  readonly title: string;
  readonly description: string;
  readonly euAiActArticles: readonly string[];
  readonly checkIds: readonly string[];
}

export type SoAApplicability = 'applicable' | 'not-applicable' | 'partial';
export type SoAStatus = 'implemented' | 'planned' | 'not-started';

export interface SoAEntry {
  readonly controlId: string;
  readonly title: string;
  readonly applicable: SoAApplicability;
  readonly justification: string;
  readonly status: SoAStatus;
  readonly evidence: readonly string[];  // checkIds from scan
  readonly gaps: readonly string[];       // missing evidence
}

export interface SoAResult {
  readonly markdown: string;
  readonly entries: readonly SoAEntry[];
  readonly completeness: number;  // 0-100%
  readonly applicableCount: number;
  readonly implementedCount: number;
}

export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost-certain';
export type RiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
export type RiskTreatment = 'mitigate' | 'transfer' | 'avoid' | 'accept';

export interface RiskRegisterEntry {
  readonly riskId: string;
  readonly description: string;
  readonly source: string;        // finding checkId
  readonly severity: Severity;
  readonly likelihood: RiskLikelihood;
  readonly impact: RiskImpact;
  readonly riskScore: number;     // likelihood × impact (1-25)
  readonly treatment: RiskTreatment;
  readonly mitigation: string;
  readonly owner: string;
  readonly deadline: string;
  readonly status: 'open' | 'in-progress' | 'closed';
}

export interface RiskRegisterResult {
  readonly markdown: string;
  readonly entries: readonly RiskRegisterEntry[];
  readonly totalRisks: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly averageRiskScore: number;
}
```

Update `engine/core/src/data/template-registry.ts` with 3 new entries:
- `iso42001-ai-policy` | ISO 42001 6.2 | `ISOPOL`
- `iso42001-soa` | ISO 42001 6.1.3 | `ISOSOA`
- `iso42001-risk-register` | ISO 42001 6.1.2 | `ISOREG`

**Verification:** TypeScript compiles, template-registry has 17 entries

---

### T-3: ISO 42001 Templates (architect) ✅

Create 3 markdown templates in `engine/core/data/templates/iso-42001/`:

1. `iso-42001-ai-policy.md` — AI management policy
2. `iso-42001-soa.md` — Statement of Applicability
3. `iso-42001-risk-register.md` — Risk Register

Templates follow the same placeholder pattern as EU AI Act templates:
`[AI System Name]`, `[Date]`, `[Organization]`, `[Version]`, `[Risk Class]`, etc.

**Verification:** Files exist, contain required placeholder markers

---

### T-4: SoA Generator (nodejs-dev)

Create `engine/core/src/domain/documents/soa-generator.ts`:

**Input:**
```typescript
interface SoAGeneratorInput {
  readonly manifest: AgentPassport;
  readonly scanResult: ScanResult;        // findings → evidence
  readonly controls: readonly Iso42001Control[];  // from JSON data
  readonly organization?: string;
}
```

**Logic:**
1. Load 39 controls from `data/iso-42001-controls.json`
2. For each control:
   - Map `control.checkIds` to scan findings
   - If findings exist → status = 'implemented', evidence = matched checkIds
   - If some checkIds have findings → status = 'planned', gaps = missing checkIds
   - If no checkIds matched → status = 'not-started'
   - Determine applicability from risk_class + control.group
3. Calculate completeness = implementedCount / applicableCount × 100
4. Render markdown table using template

**Output:** `SoAResult` (see types above)

**Key files:**
- `engine/core/src/domain/documents/soa-generator.ts` (NEW)
- `engine/core/src/data/template-registry.ts` (updated)
- `engine/core/data/iso-42001-controls.json` (NEW, from T-1)

**Verification:** Unit test `soa-generator.test.ts` — 8+ tests GREEN

---

### T-5: Risk Register Generator (nodejs-dev)

Create `engine/core/src/domain/documents/risk-register-generator.ts`:

**Input:**
```typescript
interface RiskRegisterInput {
  readonly manifest: AgentPassport;
  readonly scanResult: ScanResult;  // findings
  readonly organization?: string;
}
```

**Logic:**
1. Group findings by severity
2. For each finding with type='fail':
   - Generate riskId: `RISK-YYYY-NNN`
   - Map severity → likelihood (critical→likely, high→possible, medium→unlikely, low→rare)
   - Map severity → impact (critical→severe, high→major, medium→moderate, low→minor)
   - Calculate riskScore = likelihoodScore × impactScore (1-25 matrix)
   - Determine treatment from finding.fix existence (has fix → mitigate, no fix → accept)
   - Set mitigation from finding.fix or "Manual remediation required"
   - Set deadline from enforcement date minus severity offset
3. Sort by riskScore descending
4. Calculate summary stats
5. Render markdown table using template

**Output:** `RiskRegisterResult` (see types above)

**Key files:**
- `engine/core/src/domain/documents/risk-register-generator.ts` (NEW)
- `engine/core/src/data/template-registry.ts` (updated)

**Verification:** Unit test `risk-register-generator.test.ts` — 8+ tests GREEN

---

### T-6: Service + HTTP Routes (nodejs-dev)

Wire generators into PassportService and HTTP API:

**Service methods (passport-service.ts):**
```typescript
generateSoA(name: string, opts?: { organization?: string }): Promise<SoAResult>
generateRiskRegister(name: string, opts?: { organization?: string }): Promise<RiskRegisterResult>
```

**HTTP routes (agent.route.ts):**
- `POST /agent/soa` → `{ name, organization? }` → `SoAResult`
- `POST /agent/risk-register` → `{ name, organization? }` → `RiskRegisterResult`

**Composition root:**
- Wire `iso42001Controls` data into PassportServiceDeps
- Load controls from `data/iso-42001-controls.json`

**Key files:**
- `engine/core/src/services/passport-service.ts` (add 2 methods)
- `engine/core/src/http/routes/agent.route.ts` (add 2 routes)
- `engine/core/src/composition-root.ts` (wire data)

**Verification:** E2E test in `iso42001-e2e.test.ts` — HTTP routes return valid responses

---

### T-7: Rust CLI Commands (rust-dev)

Add 2 new subcommands to `complior agent`:

```
complior agent soa <name> [--json] [--organization "Org"]
complior agent risk-register <name> [--json] [--organization "Org"]
```

**Key files:**
- `cli/src/cli.rs` — add `Soa` and `RiskRegister` to `AgentAction` enum
- `cli/src/headless/agent.rs` — add `run_agent_soa()` and `run_agent_risk_register()`
- Call `POST /agent/soa` and `POST /agent/risk-register` respectively

**Verification:** `cargo test` GREEN, `complior agent soa --help` works

---

## Verification Plan

1. **Unit tests:**
   - `npx vitest run src/domain/documents/soa-generator.test.ts` — all GREEN
   - `npx vitest run src/domain/documents/risk-register-generator.test.ts` — all GREEN
2. **E2E tests:**
   - `npx vitest run src/e2e/iso42001-e2e.test.ts` — HTTP routes return valid data
3. **Acceptance script:**
   - `bash scripts/verify_iso42001_docs.sh` — PASS
4. **Regression:**
   - `npx vitest run` — 2195+ tests pass (only TD-14 red intentionally)
   - `cargo test` — 195+ tests pass

---

## Task Summary

| # | Task | Agent | Method | Key Files |
|---|------|-------|--------|-----------|
| T-1 | ISO 42001 controls data | architect | JSON validated | `data/iso-42001-controls.json` |
| T-2 | Types + template registry | architect | tsc compiles | `types/common.types.ts`, `template-registry.ts` |
| T-3 | Templates (3 .md files) | architect | files exist | `data/templates/iso-42001/*.md` |
| T-4 | SoA Generator | nodejs-dev | unit test: 8+ GREEN | `domain/documents/soa-generator.ts` |
| T-5 | Risk Register Generator | nodejs-dev | unit test: 8+ GREEN | `domain/documents/risk-register-generator.ts` |
| T-6 | Service + HTTP routes | nodejs-dev | E2E: 2 routes GREEN | `services/passport-service.ts`, `routes/agent.route.ts` |
| T-7 | Rust CLI commands | rust-dev | cargo test GREEN | `cli/src/cli.rs`, `headless/agent.rs` |
