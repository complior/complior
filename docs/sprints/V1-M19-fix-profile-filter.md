# V1-M19: Fix Profile Filter

**Status:** 🔴 RED (tests written, implementation pending)
**Created:** 2026-04-21
**Feature Area:** FA-03 (Fix Architecture) — see `docs/feature-areas/fix-architecture.md` §9
**Goal:** Filter fix plans by project profile so only profile-relevant fixes appear
**Depends on:** V1-M18 (Scanner Domain Filter) — provides domain-filtered findings + check-applicability.json

---

## Context

Fix pipeline currently generates fix plans for ALL failed findings, including those that were already marked as `skip` by the scanner's profile filtering (role, risk-level, domain). A deployer project should not see provider-only fix plans. A healthcare project should not see HR-only fix plans.

This milestone adds profile-based filtering to the fix pipeline, bringing it to parity with scanner (V1-M08/M09/M18) and eval (V1-M12).

**Key design decisions:**
1. **Post-generation filter** — filter fix plans AFTER fixer generates them, not inside strategies. Strategies stay profile-unaware. Minimal change to 18+ strategy files.
2. **Primary mechanism**: Since scan findings are already role/risk/domain-filtered (`type: 'skip'`), the fix filter simply excludes plans whose associated finding is `type: 'skip'`.
3. **Secondary mechanism**: For direct fix calls without prior scan, use `check-applicability.json` to validate checkId applicability (future — not in MVP).
4. **Backward compatible**: No profile → all plans pass through unchanged.
5. **New FixFilterContext type**: Reports total/applicable/excluded counts, mirroring ScanFilterContext.

---

## Acceptance Criteria

- [ ] 9 fix-profile-filter unit tests GREEN
- [ ] 2 fix-service integration tests GREEN
- [ ] Existing fix-service tests GREEN (backward compat)
- [ ] Fix preview only shows profile-relevant fixes
- [ ] `FixFilterContext` populated in fix responses
- [ ] All 2261+ existing tests GREEN
- [ ] `tsc --noEmit` PASS

---

## Tasks

| # | Task | Agent | Method | Files |
|---|------|-------|--------|-------|
| T-1 | Add FixFilterContext type + Zod schema | architect | types + schemas | `types/common.types.ts`, `types/common.schemas.ts` |
| T-2 | RED tests: fix-profile-filter (9 tests) | architect | test spec | `domain/fixer/fix-profile-filter.test.ts` |
| T-3 | RED tests: fix-service integration (2 tests) | architect | test spec | `services/fix-service.test.ts` |
| T-4 | Create fix-profile-filter.ts | nodejs-dev | T-2 tests GREEN | `domain/fixer/fix-profile-filter.ts` |
| T-5 | Wire filter into fix-service + add getProjectProfile | nodejs-dev | T-3 tests GREEN | `services/fix-service.ts` |
| T-6 | Add fixFilterContext to fix route responses | nodejs-dev | existing tests GREEN | `http/routes/fix.route.ts` |

---

## Dependencies

```
V1-M18 (Scanner Domain Filter)     ← provides domain-filtered findings  ← MUST be DONE first
V1-M19 T-1,T-2,T-3                ← architect delivers types + RED tests
V1-M19 T-4                         ← implement fix-profile-filter
V1-M19 T-5                         ← wire into fix-service (depends on T-4)
V1-M19 T-6                         ← add to route responses (depends on T-5)
```

---

## Предусловия среды (architect обеспечивает):

- [x] npm install в engine/core
- [x] cargo build компилируется
- [x] npm test запускается (RED тесты — ок, ошибки среды — нет)
- [x] `tsc --noEmit` PASS с новыми типами
- [x] FixFilterContext type + Zod schema created
- [x] V1-M18 check-applicability.json available

---

## Type Changes

### FixFilterContext (new)

```typescript
export interface FixFilterContext {
  readonly role: Role;
  readonly riskLevel: string | null;
  readonly domain: string | null;
  readonly profileFound: boolean;
  readonly totalPlans: number;
  readonly applicablePlans: number;
  readonly excludedBySkip: number;    // from scan's already-skipped findings
  readonly excludedByDomain: number;  // direct domain check (no prior scan)
}
```

### FixServiceDeps extension

```typescript
readonly getProjectProfile?: (path: string) => Promise<{
  role: Role;
  riskLevel: string | null;
  domain: string | null;
} | null>;
```

### FixService return type extension

```typescript
readonly getFixFilterContext?: () => FixFilterContext | null;
```

---

## Test Specs (T-2): fix-profile-filter.test.ts — 9 RED tests

1. `returns all plans when profile is null (no filtering)` — backward compat
2. `excludes plans for skip findings (role-skipped)` — provider-only → no fix for deployer
3. `excludes plans for skip findings (domain-skipped)` — HR check → no fix for healthcare
4. `preserves plans for applicable fail findings` — fail findings keep their fixes
5. `context reports correct counts` — totalPlans, applicablePlans, excludedBySkip accurate
6. `handles empty plans array` — edge case: no crash
7. `is deterministic (same input → same output)` — pure function
8. `returns frozen filtered array` — immutability

## Test Specs (T-3): fix-service integration — 2 RED tests

1. `previewAll with deployer profile: excludes provider-only fixes, reports fixFilterContext`
2. `previewAll with healthcare domain: excludes HR-only fixes`

---

## Architecture Requirements

- **fix-profile-filter.ts**: Pure function, no I/O. Takes `(plans, findings, profile | null)`, returns `{ filtered, context }`.
- **Primary filter logic**: Match each plan's `checkId` to its finding. If finding is `type: 'skip'` → exclude plan.
- **Object.freeze** on returned filtered array.
- **fix-service.ts**: Call `filterFixPlansByProfile()` inside `previewAll()` after `fixer.generateFixes()`.
- **FixFilterContext**: Expose via `getFixFilterContext()` on service return type.
- **No changes to fix strategies**: Strategies remain profile-unaware. Only the service layer filters.
