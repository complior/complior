# V1-M10: Score Transparency — What Does 80/100 Mean?

**Status:** 🔴 RED (contracts + RED tests committed, awaiting dev)
**Branch:** `feature/V1-M10-score-transparency`
**Created:** 2026-04-13
**Depends on:** V1-M09 ✅ DONE (dynamic obligations, profile enrichment)
**Feature Areas:** FA-01 (Scanner), FA-05 (Report)

---

## Problem

`complior scan` returns `score: 80/100` but the user has no idea what this means:
- 80% of what? ~39 checks? 108 obligations? Both?
- Which categories drag the score down?
- Why did the score drop to 40 (critical cap)?
- What should I fix first?
- Is my system actually 80% compliant?

**Reality:** Score 80/100 = 80% of ~39 automated checks passing. EU AI Act has 108 obligations. ~69 obligations have no automated check — they require manual review. The score does NOT represent full compliance posture.

**After M10:** Every scan response includes a `scoreTransparency` block with disclaimer, per-category breakdown, and profile-aware priority actions. New `complior status` gives a single-command posture overview.

---

## New Types (contracts — architect adds to `common.types.ts`)

```typescript
/** V1-M10: Explains what the compliance score covers and doesn't cover. */
export interface ScoreDisclaimer {
  readonly summary: string;                    // "Covers N automated checks across K obligations"
  readonly coveredObligations: number;         // Obligations with at least one check
  readonly totalApplicableObligations: number; // From profile (or 108 if no profile)
  readonly coveragePercent: number;            // covered / total * 100
  readonly uncoveredCount: number;             // total - covered
  readonly limitations: readonly string[];     // List of caveats
  readonly criticalCapExplanation: string | null; // If cap at 40 was applied
}

/** V1-M10: Category breakdown with human-readable explanation. */
export interface CategoryBreakdown {
  readonly category: string;
  readonly score: number;           // 0-100
  readonly weight: number;
  readonly passed: number;
  readonly failed: number;
  readonly impact: 'high' | 'medium' | 'low';
  readonly topFailures: readonly string[];  // Top 3 failing checkIds
  readonly explanation: string;     // "3 of 5 checks passing. Fix: ..."
}

/** V1-M10: Aggregated compliance posture for `complior status`. */
export interface CompliancePosture {
  readonly score: ScoreBreakdown;
  readonly disclaimer: ScoreDisclaimer;
  readonly categories: readonly CategoryBreakdown[];
  readonly topActions: readonly PriorityAction[];
  readonly profile: ScanFilterContext | null;
  readonly lastScanAt: string | null;
  readonly passportCount: number;
  readonly documentCount: number;
  readonly evidenceVerified: boolean | null;
}
```

---

## Tasks

### T-1: Score Disclaimer Generator (nodejs-dev)

**New file:** `engine/core/src/domain/scanner/score-disclaimer.ts`

Pure function: `ScoreBreakdown` + `ScanFilterContext | null` → `ScoreDisclaimer`

```typescript
export function buildScoreDisclaimer(
  score: ScoreBreakdown,
  filterContext: ScanFilterContext | null,
  coveredObligationIds: readonly string[],
): ScoreDisclaimer
```

Logic:
1. `coveredObligations` = unique obligation IDs covered by at least one check (from `check-to-obligations.ts` mapping)
2. `totalApplicableObligations` = `filterContext?.applicableObligations ?? 108`
3. `coveragePercent` = `coveredObligations / totalApplicable * 100`
4. `uncoveredCount` = `totalApplicable - coveredObligations`
5. `summary` = template: `"Score covers {totalChecks} automated checks across {covered}/{total} applicable obligations. {uncovered} obligations require manual evidence."`
6. `limitations` = static list: `["Score reflects automated checks only", "Manual obligations (FRIA, risk assessment, etc.) are not included", "Score ≠ compliance readiness"]`
7. `criticalCapExplanation` = if `score.criticalCapApplied` → `"Score capped at 40/100: a critical obligation failed."` else `null`

**Verification:** `npx vitest run src/domain/scanner/score-disclaimer.test.ts` — 6 tests GREEN

### T-2: Category Breakdown with Explanations (nodejs-dev)

**New file:** `engine/core/src/domain/scanner/category-breakdown.ts`

Pure function: `ScoreBreakdown` + `Finding[]` → `CategoryBreakdown[]`

```typescript
export function buildCategoryBreakdown(
  score: ScoreBreakdown,
  findings: readonly Finding[],
): CategoryBreakdown[]
```

Logic:
1. For each `CategoryScore` in `score.categoryScores`:
   - `impact` = compute `weight × (100 - score)` → assign: top third = 'high', middle = 'medium', bottom = 'low'
   - `topFailures` = top 3 `checkId` from `findings` where `type='fail'` and category matches
   - `explanation` = template: `"{passed} of {total} checks passing. {impact === 'high' ? 'Priority: ...' : ''}"`
2. Sort by impact (high first), then by score (low first)

**Verification:** `npx vitest run src/domain/scanner/category-breakdown.test.ts` — 5 tests GREEN

### T-3: Profile-Aware topActions in Scan Response (nodejs-dev)

**Modify:** `engine/core/src/http/routes/scan.route.ts`

Replace inline `computeTopActions()` (lines 25-46) with profile-aware version:

```typescript
import { buildProfileAwareTopActions } from '../../domain/scanner/profile-priority.js';

// In POST /scan handler:
const topActions = buildProfileAwareTopActions(result, result.filterContext ?? null);
```

**New file:** `engine/core/src/domain/scanner/profile-priority.ts`

```typescript
export function buildProfileAwareTopActions(
  result: ScanResult,
  filterContext: ScanFilterContext | null,
): PriorityAction[]
```

Logic:
1. Filter fail findings → only those whose obligationId is in applicable obligations (if profile exists)
2. Score each action: `severity_weight × deadline_proximity × score_impact × category_weakness`
3. `category_weakness` = inverse of category score (weaker categories get higher priority)
4. Return top 5 actions with rank, effort, projectedScore

**Verification:** `npx vitest run src/domain/scanner/profile-priority.test.ts` — 4 tests GREEN

### T-4: `GET /status/posture` + CLI `complior status` (nodejs-dev + rust-dev)

**TS endpoint:** `GET /status/posture`

Extend `engine/core/src/http/routes/status.route.ts`:
- Add `GET /status/posture` → returns `CompliancePosture`
- Aggregates: last scan score, disclaimer (T-1), categories (T-2), topActions (T-3), profile, passport count, doc count, evidence verified

**Rust CLI:** `complior status [--json] [path]`

- `cli/src/cli.rs` — add `Status` command (new top-level, NOT behind `#[cfg(feature = "extras")]`)
- `cli/src/headless/status.rs` — call `GET /status/posture`, format output

**Verification:** E2E test + acceptance script `verify_score_transparency.sh`

### T-5: RED Tests (architect — this commit) ✅ DONE

**Unit tests (RED):**
| File | Count | Scope |
|------|-------|-------|
| `score-disclaimer.test.ts` | 6 | T-1: disclaimer generation |
| `category-breakdown.test.ts` | 5 | T-2: category explanations |
| `profile-priority.test.ts` | 4 | T-3: profile-aware actions |

**E2E tests (RED):**
| File | Count | Scope |
|------|-------|-------|
| `score-transparency-e2e.test.ts` | 5 | T-1..T-4: HTTP contract |

**Acceptance script (FAIL):**
| File | Checks | Scope |
|------|--------|-------|
| `verify_score_transparency.sh` | 6 | T-1..T-4: CLI output |

---

## Verification Table

| # | Task | Agent | Method | Files |
|---|------|-------|--------|-------|
| T-1 | Score disclaimer | nodejs-dev | unit: 6 tests GREEN | `score-disclaimer.ts` |
| T-2 | Category breakdown | nodejs-dev | unit: 5 tests GREEN | `category-breakdown.ts` |
| T-3 | Profile-aware topActions | nodejs-dev | unit: 4 tests GREEN, E2E | `profile-priority.ts`, `scan.route.ts` |
| T-4 | `/status/posture` + CLI | nodejs+rust-dev | E2E + acceptance | `status.route.ts`, `cli.rs` |
| T-5 | RED tests | architect | ✅ committed | `*.test.ts`, `verify_*.sh` |

---

## Предусловия среды (architect обеспечивает)

- [x] V1-M09 merged to dev (dynamic obligations)
- [ ] `npm install` в engine/core
- [ ] `cargo build` компилируется
- [ ] `npx vitest run` запускается (RED тесты — ок)
- [ ] `cargo test` запускается
- [ ] НЕ нужен Docker
- [ ] НЕ нужен OPENROUTER_API_KEY
