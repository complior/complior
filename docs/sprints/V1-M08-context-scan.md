# V1-M08: Context-Aware Scan — Init-to-Report UX Connection

**Status:** IN PROGRESS
**Branch:** `feature/V1-M08-context-scan`
**Created:** 2026-04-13
**Updated:** 2026-04-13

## Problem

User runs `complior scan` and gets 100+ findings from all 108 EU AI Act obligations. 80% are inapplicable (deployer vs provider, limited vs high risk). Score 45/100 is scary when real applicable score is ~75/100. No guidance on what to fix first.

**Infrastructure exists but is disconnected:**
- `complior init` saves profile with `riskLevel` + `applicableObligations`
- `role-filter.ts` filters findings by role (provider/deployer) → `type: 'skip'`
- `obligations.route.ts` filters by role AND risk_level
- `priority-actions.ts` computes top-5 actions with projected score
- **GAP:** risk_level filtering of findings doesn't exist. Score counts everything. CLI shows no context. Fix gives no feedback.

---

## Текущее состояние (2026-04-13)

Nodejs-dev реализовал T-2, T-3, T-5, T-7, T-8 — код работает, **не закоммичен**.
Один блокер: **T-4** — `getProjectProfile` не подключен в `composition-root.ts`.

```
Unit тесты:  22/23 GREEN (1 RED = T-3 skip counts, blocked by T-4)
E2E тесты:   1/5 GREEN  (4 RED, все blocked by T-4)
Rust тесты:  199/199 GREEN (типы готовы, рендеринг T-6 ожидает)
Contract:    19/19 TS + 18/18 Rust GREEN
```

### Незакоммиченные файлы nodejs-dev:

```
NEW  engine/core/src/domain/scanner/risk-level-filter.ts    (T-2)
MOD  engine/core/src/services/scan-service.ts               (T-3)
MOD  engine/core/src/http/routes/scan.route.ts              (T-5)
MOD  engine/core/src/domain/reporter/obligation-coverage.ts (T-7)
MOD  engine/core/src/http/routes/fix.route.ts               (T-8)
```

---

## Следующие действия

### 1. nodejs-dev: Wire T-4 + commit (блокер)

**Файл:** `engine/core/src/composition-root.ts`

Добавить closure `getProjectProfile` рядом с `getProjectRole` (~строка 278):
```typescript
const getProjectProfile = async (_projectPath: string) => {
  try {
    const profile = await lazyWizard?.loadProfile();
    if (!profile) return null;
    return {
      role: (profile.organization?.role ?? 'both') as Role,
      riskLevel: profile.computed?.riskLevel ?? null,
      domain: profile.business?.domain ?? null,
      applicableObligations: profile.computed?.applicableObligations ?? [],
    };
  } catch (e) { log.debug('Profile load for filtering:', e); return null; }
};
```

Передать в scanService deps (~строка 298):
```typescript
getProjectProfile,  // ← ADD
getProjectRole,     // keep for legacy
```

Потом прогнать тесты и закоммитить все 6 файлов.

### 2. rust-dev: T-6 рендеринг (после коммита nodejs-dev)

Типы в `cli/src/types/engine.rs` готовы. Рендеринг в `cli/src/headless/scan.rs`.

### 3. architect: Review + PR → dev

---

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

### T-2: `risk-level-filter.ts` ✅ DONE (nodejs-dev, не закоммичен)
**Files:** `engine/core/src/domain/scanner/risk-level-filter.ts` (NEW)

Реализовано: зеркало `role-filter.ts`. Строит map `checkId → obligationId[] → applies_to_risk_level[]`. Если ВСЕ obligations для checkId требуют другой risk level → `type: 'skip'`. Если `riskLevel === null` → без фильтрации.

**Verification:** `npx vitest run src/domain/scanner/risk-level-filter.test.ts` — **8/8 GREEN** ✅

### T-3: Integrate risk-level filter + context in `scan-service.ts` ✅ DONE (nodejs-dev, не закоммичен)
**Files:** `engine/core/src/services/scan-service.ts`

Реализовано:
- `getProjectProfile` option в `ScanServiceDeps` + legacy fallback к `getProjectRole`
- `applyProfileFilters()` заменяет `applyRoleFilter()`: role filter → risk filter → count skips → build ScanFilterContext → recalc score
- Если no profile → `filterContext.profileFound = false`

**Verification:** `npx vitest run src/services/scan-service-context.test.ts` — **3/4 GREEN, 1 RED** (blocked by T-4)
- ❌ `filterContext shows correct skip counts` — `skippedByRiskLevel = 0` потому что `getProjectProfile` не подключен в composition-root

### T-4: Wire `getProjectProfile` in `composition-root.ts` ❌ НЕ СДЕЛАНО (блокер)
**Agent:** nodejs-dev
**Files:** `engine/core/src/composition-root.ts`

Closure `getProjectProfile` нужно создать и передать в scanService deps. Без этого scan-service fallbacks к `getProjectRole` (только role, без riskLevel/domain).

**Verification:** После wire → T-3 тест 4/4 GREEN, E2E 4-5/5 GREEN
**Dependencies:** T-3

### T-5: `topActions` in scan response ✅ DONE (nodejs-dev, не закоммичен)
**Files:** `engine/core/src/http/routes/scan.route.ts`

Реализовано: `computeTopActions()` — top-3 fail findings по severity → `{ id, title, severity, command, fixAvailable, scoreImpact }`. Включается в `c.json({ ...result, topActions })`.

**Verification:** `npx vitest run src/http/routes/scan-filter-context.test.ts` — **4/4 GREEN** ✅

### T-6: Rust CLI renders filterContext + topActions ⏳ ОЖИДАЕТ
**Agent:** rust-dev
**Files:** `cli/src/types/engine.rs` (types DONE), `cli/src/headless/scan.rs` (rendering)

Типы готовы (architect). Рендеринг ожидает T-4 wire.

Output с профилем:
```
Filtered for: deployer, limited risk, healthcare
22/57 obligations apply · 4 role-filtered · 8 risk-filtered

Score: 68/100  [████████████████░░░░]  yellow

FIX FIRST:
1. Create FRIA document (high) · complior fix · score 68→75 · ~30 min
```

Output без профиля:
```
Hint: run `complior init` to filter findings to your role and risk level.
```

**Verification:** `cargo test contract` — 4 new tests GREEN (deserialization), rendering tests TBD
**Dependencies:** T-4, T-5

### T-7: Report obligation coverage filters by risk_level ✅ DONE (nodejs-dev, не закоммичен)
**Files:** `engine/core/src/domain/reporter/obligation-coverage.ts`

Реализовано: `riskApplies()` helper + параметр `projectRisk: string | null` в `buildObligationCoverage()`. Фильтрует obligations по role AND risk level.

**Verification:** `npx vitest run src/domain/reporter/obligation-coverage-risk.test.ts` — **5/5 GREEN** ✅

### T-8: Fix apply-all includes filterContext ✅ DONE (nodejs-dev, не закоммичен)
**Files:** `engine/core/src/http/routes/fix.route.ts`

Реализовано: `filterContext: lastScan?.filterContext ?? null` в response `/fix/apply-all`.

**Verification:** `npx vitest run src/http/routes/fix-filter-context.test.ts` — **2/2 GREEN** ✅

---

## Verification Table

| # | Task | Agent | Verification | Status |
|---|------|-------|-------------|--------|
| T-1 | `ScanFilterContext` type + Zod | architect | 19/19 contract GREEN | ✅ DONE (committed) |
| T-2 | `risk-level-filter.ts` | nodejs-dev | 8/8 GREEN | ✅ DONE (uncommitted) |
| T-3 | Integrate filter in scan-service | nodejs-dev | 3/4 GREEN, 1 RED (T-4 blocker) | ✅ DONE (uncommitted, blocked) |
| T-4 | Wire `getProjectProfile` | nodejs-dev | T-3 4/4 + E2E 4-5/5 after wire | ❌ БЛОКЕР |
| T-5 | `topActions` in scan response | nodejs-dev | 4/4 GREEN | ✅ DONE (uncommitted) |
| T-6 | Rust CLI renders context | rust-dev | types GREEN, rendering TBD | ⏳ ОЖИДАЕТ |
| T-7 | Report obligation + risk_level | nodejs-dev | 5/5 GREEN | ✅ DONE (uncommitted) |
| T-8 | Fix response + filterContext | nodejs-dev | 2/2 GREEN | ✅ DONE (uncommitted) |

---

## Test Summary

**Unit tests (23 spec):**
- `risk-level-filter.test.ts` — 8/8 GREEN (T-2) ✅
- `scan-service-context.test.ts` — 3/4 GREEN, 1 RED (T-3, blocked by T-4) 🔴
- `scan-filter-context.test.ts` — 4/4 GREEN (T-4/T-5) ✅
- `obligation-coverage-risk.test.ts` — 5/5 GREEN (T-7) ✅
- `fix-filter-context.test.ts` — 2/2 GREEN (T-8) ✅

**E2E tests (5 spec):**
- `context-scan-e2e.test.ts`:
  - `filterContext with profile data` — RED (T-4 blocker) 🔴
  - `filterContext counts consistent` — RED (T-4 blocker) 🔴
  - `topActions array` — GREEN ✅
  - `fix/apply-all filterContext` — RED (T-4 blocker) 🔴
  - `no profile profileFound=false` — RED (T-4 blocker) 🔴

**Contract tests:**
- `contract.test.ts` — 19/19 GREEN ✅
- `contract_test.rs` — 18/18 GREEN ✅
- Rust full suite: 199/199 GREEN ✅

---

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
