# V1-M08: Context-Aware Scan — Init-to-Report UX Connection

**Status:** IN PROGRESS
**Branch:** `feature/V1-M08-context-scan`
**Created:** 2026-04-13

## Problem

User runs `complior scan` and gets 100+ findings from all 108 EU AI Act obligations. 80% are inapplicable (deployer vs provider, limited vs high risk). Score 45/100 is scary when real applicable score is ~75/100. No guidance on what to fix first.

**Infrastructure exists but is disconnected:**
- `complior init` saves profile with `riskLevel` + `applicableObligations`
- `role-filter.ts` filters findings by role (provider/deployer) → `type: 'skip'`
- `obligations.route.ts` filters by role AND risk_level
- `priority-actions.ts` computes top-5 actions with projected score
- **GAP:** risk_level filtering of findings doesn't exist. Score counts everything. CLI shows no context. Fix gives no feedback.

## Tasks

### T-1: `ScanFilterContext` type + Zod schema ✅ DONE (architect)
**Files:** `common.types.ts`, `common.schemas.ts`, `http-contract-sample.json`, `http-contract.json`

Added:
- `ScanFilterContext` interface (role, riskLevel, domain, profileFound, obligation counts, skip counts)
- `filterContext?: ScanFilterContext` on `ScanResult`
- `ScanFilterContextSchema` Zod schema
- Updated contract sample + JSON schema
- Fixed FindingSchema to accept 'info' type (was missing)
- Fixed contract sample to match Zod schemas (regulationVersion, confidenceSummary, evidence)

**Verification:** `npx vitest run src/types/contract.test.ts` — 19/19 GREEN

### T-2: `risk-level-filter.ts` — filter findings by risk level
**Agent:** nodejs-dev
**Files:** `engine/core/src/domain/scanner/risk-level-filter.ts` (NEW)

Pattern = mirror of `role-filter.ts`:
1. Build reverse map: `checkId → obligationId[]` → `obligationId → applies_to_risk_level[]`
2. If ALL obligations for a checkId require risk levels that don't include the project's → skip
3. If `riskLevel === null` → no filtering (like `role === 'both'` in role-filter)

**Verification:** `npx vitest run src/domain/scanner/risk-level-filter.test.ts` — 8 tests RED
**Dependencies:** T-1

### T-3: Integrate risk-level filter + context in `scan-service.ts`
**Agent:** nodejs-dev
**Files:** `engine/core/src/services/scan-service.ts`

1. Add `getProjectProfile?: (path) => Promise<{ role, riskLevel, domain, applicableObligations } | null>` to deps
2. Replace `applyRoleFilter` with `applyProfileFilters`:
   - Call existing `filterFindingsByRole()`
   - Call new `filterFindingsByRiskLevel()` (T-2)
   - Count `skippedByRole`, `skippedByRiskLevel`
   - Build `ScanFilterContext`
   - Return scan result with `filterContext`
3. If no profile → `filterContext.profileFound = false`, no filtering
4. Recalculate score only by applicable findings

**Verification:** `npx vitest run src/services/scan-service-context.test.ts` — 4 tests RED
**Dependencies:** T-1, T-2

### T-4: Wire `getProjectProfile` in `composition-root.ts`
**Agent:** nodejs-dev
**Files:** `engine/core/src/composition-root.ts`

Replace `getProjectRole` closure with `getProjectProfile`:
```typescript
const getProjectProfile = async (_projectPath: string) => {
  const profile = await lazyWizard?.loadProfile();
  if (!profile) return null;
  return {
    role: (profile.organization?.role ?? 'both') as Role,
    riskLevel: profile.computed?.riskLevel ?? null,
    domain: profile.business?.domain ?? null,
    applicableObligations: profile.computed?.applicableObligations ?? [],
  };
};
```

**Verification:** POST /scan returns `filterContext` in response
**Dependencies:** T-3

### T-5: `topActions` in scan response
**Agent:** nodejs-dev
**Files:** `engine/core/src/http/routes/scan.route.ts`

After scan result, compute top-3 priority actions from fail findings and include in response:
```typescript
return c.json({ ...result, topActions });
```

**Verification:** `npx vitest run src/http/routes/scan-filter-context.test.ts` — 3 tests RED (topActions)
**Dependencies:** T-4

### T-6: Rust CLI renders filterContext + topActions
**Agent:** rust-dev
**Files:** `cli/src/types/engine.rs` (types DONE), `cli/src/headless/scan.rs` (rendering)

Types added by architect:
- `ScanFilterContext` struct with `#[serde(default)]`
- `TopAction` struct
- `filter_context: Option<ScanFilterContext>` on `ScanResult`
- `top_actions: Option<Vec<TopAction>>` on `ScanResult`

Rust-dev renders in human output:
```
Filtered for: deployer, limited risk, healthcare
22/57 obligations apply · 4 role-filtered · 8 risk-filtered

Score: 68/100  [████████████████░░░░]  yellow

FIX FIRST:
1. Create FRIA document (high) · complior fix · score 68→75 · ~30 min
```

If `profileFound == false`:
```
Hint: run `complior init` to filter findings to your role and risk level.
```

**Verification:** `cargo test contract` — 4 new tests GREEN (deserialization), rendering tests TBD
**Dependencies:** T-4, T-5

### T-7: Report obligation coverage filters by risk_level
**Agent:** nodejs-dev
**Files:** `engine/core/src/domain/reporter/obligation-coverage.ts`, `report-builder.ts`, `report-service.ts`

1. Add `riskLevel?: string | null` parameter to `buildObligationCoverage()`
2. Filter obligations by `applies_to_risk_level` (pattern from `obligations.route.ts`)
3. Thread riskLevel through `ReportBuildInput` → `buildComplianceReport()` → `buildObligationCoverage()`

**Verification:** `npx vitest run src/domain/reporter/obligation-coverage-risk.test.ts` — 2 tests RED
**Dependencies:** T-1

### T-8: Fix apply-all includes filterContext + score delta
**Agent:** nodejs-dev
**Files:** `engine/core/src/http/routes/fix.route.ts`

In `POST /fix/apply-all` response — include `filterContext` from last scan result:
```typescript
const lastScan = fixService.getLastScanResult?.();
return c.json({ results, summary, unfixedFindings, filterContext: lastScan?.filterContext ?? null });
```

**Verification:** `npx vitest run src/http/routes/fix-filter-context.test.ts` — 1 test RED
**Dependencies:** T-3, T-4

## Dependency Graph

```
T-1 (types) ───────┬─────────────────────────┐
                    │                         │
                    v                         v
T-2 (risk-filter) → T-3 (scan-service) → T-4 (composition-root) → T-5 (topActions)
                                              │                         │
                                              v                         v
                                         T-6 (Rust CLI)           T-8 (fix response)
                    │
                    v
               T-7 (report filter)
```

## Execution Order

1. **architect** ✅: T-1 (types + schemas + RED tests + Rust types)
2. **nodejs-dev**: T-2, T-7 (parallel — both depend only on T-1)
3. **nodejs-dev**: T-3 → T-4 → T-5, T-8 (sequential chain)
4. **rust-dev**: T-6 (after T-4 + T-5)

## Verification Table

| # | Task | Agent | Verification | Key Files | Status |
|---|------|-------|-------------|-----------|--------|
| T-1 | `ScanFilterContext` type + Zod | architect | contract test GREEN | `common.types.ts`, `common.schemas.ts` | ✅ DONE |
| T-2 | `risk-level-filter.ts` | nodejs-dev | 8 unit tests RED | `risk-level-filter.ts` (NEW) | ⏳ |
| T-3 | Integrate filter in scan-service | nodejs-dev | 4 unit tests RED | `scan-service.ts` | ⏳ |
| T-4 | Wire `getProjectProfile` | nodejs-dev | filterContext in /scan response | `composition-root.ts` | ⏳ |
| T-5 | `topActions` in scan response | nodejs-dev | 3 tests RED (topActions) | `scan.route.ts` | ⏳ |
| T-6 | Rust CLI renders context | rust-dev | 4 contract tests GREEN | `engine.rs`, `scan.rs` | ⏳ |
| T-7 | Report obligation + risk_level | nodejs-dev | 2 tests RED | `obligation-coverage.ts` | ⏳ |
| T-8 | Fix response + filterContext | nodejs-dev | 1 test RED | `fix.route.ts` | ⏳ |

## Test Summary

**RED tests committed (23 total):**
- `risk-level-filter.test.ts` — 8 tests (T-2)
- `scan-service-context.test.ts` — 4 tests (T-3)
- `scan-filter-context.test.ts` — 4 tests (T-4/T-5, 1 trivially passes)
- `obligation-coverage-risk.test.ts` — 5 tests (T-7, 3 trivially pass)
- `fix-filter-context.test.ts` — 2 tests (T-8, 1 trivially passes)

**GREEN tests (contract):**
- `contract.test.ts` — 19/19 GREEN (TS, includes 3 new ScanFilterContext tests)
- `contract_test.rs` — 18/18 GREEN (Rust, includes 4 new ScanFilterContext/TopAction tests)
- Rust full suite: 199/199 GREEN

## Предусловия среды (architect обеспечивает)

- [x] `npm install` в engine/core
- [x] `cargo build` компилируется (199 tests pass)
- [x] `npx vitest run` запускается (RED тесты — ок, ошибки среды — нет)
- [x] `cargo test` запускается (199 GREEN)
- [ ] НЕ нужен Docker
- [ ] НЕ нужен OPENROUTER_API_KEY
- [ ] НЕ нужен daemon

## UX Result

**Before:**
```
$ complior scan
Score: 45/100
❌ 47 findings (100+ obligations checked)
```

**After:**
```
$ complior scan
Filtered for: deployer, limited risk, healthcare
22/57 obligations apply · 4 role-filtered · 8 risk-filtered

Score: 78/100  [████████████████░░░░]  yellow

❌ 8 findings

FIX FIRST:
1. Create FRIA document (high) · complior fix · score 78→83 · ~30 min
2. Wrap bare LLM call (medium) · complior fix · score 83→86 · ~10 min
3. Add monitoring policy (medium) · complior fix · score 86→88 · ~30 min
```
