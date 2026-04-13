# V1-M10: Score Transparency — What Does 80/100 Actually Mean?

**Status:** PLANNED
**Branch:** `feature/V1-M10-score-transparency`
**Created:** 2026-04-13
**Depends on:** V1-M09 (Onboarding Enrichment) — dynamic obligations needed for accurate coverage stats

## Problem

User sees `Score: 80/100` and thinks "I'm 80% compliant with EU AI Act". In reality:

1. **Score = 80% of ~39 automated checks pass.** Not 80% of 108 obligations.
2. **69 obligations have no automated checks.** They require manual evidence (FRIA, risk assessment, human oversight procedures, etc.)
3. **No category breakdown.** User doesn't know: "Am I weak on transparency? Data governance? Documentation?"
4. **topActions are generic.** They don't account for which obligations matter most for the user's profile.
5. **No way to see overall compliance posture** without running individual commands.

**Impact:** False sense of compliance. User ships product thinking they're "80% done" when they've addressed 31/108 obligations (29%).

---

## Solution

### Score disclaimer

Every scan response includes a disclaimer explaining what the score measures:

```
Score: 80/100 (automated checks only)
Coverage: 39/46 applicable obligations have automated checks
⚠ 7 obligations require manual evidence (FRIA, risk assessment, etc.)
Run `complior report --format human` for full obligation breakdown.
```

### Per-category breakdown

Score split into categories matching EU AI Act structure:

```
Category breakdown:
  Transparency:          9/10  ██████████░  90%
  Data governance:       7/8   ████████░░░  88%
  Risk management:       5/8   ██████░░░░░  63%
  Documentation:         3/5   ██████░░░░░  60%
  Human oversight:       2/4   █████░░░░░░  50%
  Technical robustness:  4/4   ███████████  100%
```

### `complior status` — single-command compliance posture

```
$ complior status
Complior v1.0.0 — EU AI Act Compliance Status

Profile: deployer · high risk · healthcare · GPAI
Applicable obligations: 46/108

Automated score:    80/100 (39 checks)
Manual evidence:    3/7 provided (FRIA ✅, risk assessment ❌, ...)
Overall readiness:  42/46 obligations addressed (91%)

Last scan:     2 min ago
Last report:   1 day ago
Deadline:      2026-08-02 (111 days)
```

---

## Tasks

### T-1: Score disclaimer in scan response (nodejs-dev + rust-dev)

**Files:**
- `engine/core/src/http/routes/scan.route.ts` — add `scoreDisclaimer` to scan response
- `engine/core/src/domain/scanner/score-disclaimer.ts` — NEW: pure function
- `cli/src/headless/scan.rs` — render disclaimer after score

Add to scan JSON response:
```typescript
interface ScoreDisclaimer {
  automatedCheckCount: number      // how many checks ran
  applicableObligationCount: number // from filterContext
  uncoveredObligationCount: number  // applicable - covered
  message: string                   // human-readable disclaimer
}
```

**Verification:** unit test: disclaimer has correct counts; E2E: scan response includes `scoreDisclaimer`

### T-2: Per-category score breakdown (nodejs-dev)

**Files:**
- `engine/core/src/http/routes/scan.route.ts` — add `categoryBreakdown` to response
- `engine/core/src/domain/scanner/category-breakdown.ts` — NEW: pure function
- `engine/core/src/types/common.types.ts` — `CategoryScore` type

Group findings by category (from `obligation_type` field in obligations.json) and compute per-category scores:

```typescript
interface CategoryScore {
  category: string       // e.g. 'transparency', 'data-governance'
  passed: number
  total: number
  percentage: number
}
```

Categories derived from obligation `obligation_type` field. Current obligation_types in data: transparency, data-governance, risk-management, documentation, human-oversight, technical-robustness, conformity-assessment, record-keeping, cybersecurity, deployer-monitoring, gpai-transparency.

**Verification:** unit test: correct grouping, percentages; E2E: response has `categoryBreakdown[]`

### T-3: topActions improvement — profile-aware prioritization (nodejs-dev)

**Files:**
- `engine/core/src/http/routes/scan.route.ts` — replace `computeTopActions` with profile-aware version
- `engine/core/src/domain/scanner/priority-actions.ts` — extend existing module

Current `computeTopActions()` sorts by severity only. Improve to consider:
1. **Deadline proximity** — obligations with earlier deadlines rank higher
2. **Penalty severity** — higher penalties rank higher
3. **Score impact** — estimated score gain from fixing
4. **Category weakness** — actions that improve weakest category rank higher

```typescript
interface EnrichedTopAction {
  id: string
  title: string
  severity: string
  command: string
  fixAvailable: boolean
  scoreImpact: number
  category: string            // NEW: which category this improves
  obligationId?: string       // NEW: linked obligation
  deadlineDays?: number       // NEW: days until obligation deadline
}
```

**Verification:** unit test: priority order changes with profile; E2E: topActions include category+deadline

### T-4: Fix/report/eval profile-awareness (nodejs-dev)

**Files:**
- `engine/core/src/http/routes/fix.route.ts` — include obligation coverage gap in fix response
- `engine/core/src/http/routes/report.route.ts` — include uncovered obligations section
- `engine/core/src/domain/reporter/html-renderer.ts` — add "Obligation Coverage" tab/section

When profile exists:
- **Fix response:** show "fixing X will address obligation OBL-NNN (transparency)"
- **Report:** add section "Obligations without automated checks" listing the uncovered obligations with required evidence types

**Verification:** E2E: report includes uncovered obligations section

### T-5: `complior status` command (rust-dev + nodejs-dev)

**Files:**
- `cli/src/cli.rs` — add `Status` to `Commands` enum
- `cli/src/headless/commands.rs` — add `run_status()` handler
- `cli/src/headless/format/status.rs` — NEW: format status output
- `engine/core/src/http/routes/status.route.ts` — NEW or extend existing
- `engine/core/src/services/status-service.ts` — NEW: aggregate compliance posture

New command aggregates:
1. Profile info (role, risk, domain, GPAI)
2. Last scan score + disclaimer
3. Manual evidence status (which obligations have evidence, which don't)
4. Overall readiness percentage
5. Days until EU AI Act deadline (2026-08-02)

```
$ complior status [--json]
```

**Verification:** acceptance script: `scripts/verify_status_command.sh`; E2E: `GET /status/compliance` returns aggregated posture

---

## Verification Table

| # | Task | Agent | Verification | Files |
|---|------|-------|-------------|-------|
| T-1 | Score disclaimer | nodejs-dev+rust-dev | unit: disclaimer counts; E2E: scan response | `score-disclaimer.ts`, `scan.route.ts`, `scan.rs` |
| T-2 | Per-category breakdown | nodejs-dev | unit: grouping+percentages; E2E: response | `category-breakdown.ts`, `scan.route.ts` |
| T-3 | topActions improvement | nodejs-dev | unit: profile-aware priority; E2E: enriched actions | `priority-actions.ts`, `scan.route.ts` |
| T-4 | Fix/report profile-awareness | nodejs-dev | E2E: report includes uncovered obligations | `fix.route.ts`, `report.route.ts`, `html-renderer.ts` |
| T-5 | `complior status` command | rust-dev+nodejs-dev | acceptance: `verify_status_command.sh` | `cli.rs`, `status.route.ts`, `status-service.ts` |

---

## Предусловия среды (architect обеспечивает)

- [ ] V1-M09 merged (dynamic obligations working)
- [ ] `npm install` в engine/core
- [ ] `cargo build` компилируется
- [ ] `npx vitest run` запускается (RED тесты — ок)
- [ ] `cargo test` запускается
- [ ] НЕ нужен Docker
- [ ] НЕ нужен OPENROUTER_API_KEY
- [ ] НЕ нужен daemon

---

## UX Result

**Before:**
```
$ complior scan
Score: 80/100
❌ 8 findings
```

**After:**
```
$ complior scan
Filtered for: deployer, high risk, healthcare, GPAI
46/108 obligations apply

Score: 80/100 (automated checks only)
Coverage: 39/46 applicable obligations have automated checks
⚠ 7 obligations require manual evidence

Category breakdown:
  Transparency:          9/10  90%
  Data governance:       7/8   88%
  Risk management:       5/8   63%
  Documentation:         3/5   60%
  Human oversight:       2/4   50%
  Technical robustness:  4/4   100%

FIX FIRST:
1. Complete FRIA (risk-management, OBL-028) · score 80→84 · deadline: 111 days
2. Add data retention policy (data-governance, OBL-042) · score 84→87
3. Document human oversight procedure (human-oversight, OBL-055) · manual evidence

$ complior status
Complior v1.0.0 — EU AI Act Compliance Status

Profile: deployer · high risk · healthcare · GPAI
Applicable: 46/108 obligations

Automated:    80/100 (39 checks)
Manual:       3/7 evidence provided
Readiness:    42/46 obligations (91%)

Last scan:    2 min ago · Last report: 1 day ago
Deadline:     2026-08-02 (111 days)
```

---

## Dependencies

```
V1-M09 (enrichment) → V1-M10 (transparency) → V1-M02/M03 (release prep)
```
