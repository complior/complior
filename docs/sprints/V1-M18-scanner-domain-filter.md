# V1-M18: Scanner Domain Filter

**Status:** 🔴 RED (tests written, implementation pending)
**Created:** 2026-04-21
**Feature Area:** FA-01 (Scanner Architecture) — see `docs/feature-areas/scanner-architecture.md` §7
**Goal:** Add domain filtering as 3rd filter dimension to scanner + externalize role mappings to JSON

---

## Context

Scanner currently filters findings by role (V1-M08) and risk level (V1-M09), but not by industry domain. A healthcare project still receives HR-specific and finance-specific checks as `fail` findings, cluttering results and fix plans. This milestone adds domain as the 3rd filter dimension, matching eval's 3-dimension filtering (V1-M12).

**Key design decisions:**
1. **Post-filter approach** — scanner checks are local filesystem ops (cheap), no cost savings from pre-filtering. Post-filter is consistent with existing role + risk-level filter pattern.
2. **Externalize to JSON** — move hardcoded `CHECK_ROLE` map from `role-filter.ts` to `data/scanner/check-applicability.json` (mirrors eval's `test-applicability.json` pattern).
3. **Sparse override format** — only list checks that have non-default applicability. Unlisted checks apply to ALL roles/domains/risk levels (conservative default).
4. **Domain lookup** — `check-applicability.json` overrides (primary) + check ID prefix convention (`industry-hr-*`, `industry-finance-*`, etc.) as fallback.
5. **Skip, not remove** — inapplicable findings become `type: 'skip'` (visible in results but not scored). Consistent with role/risk-level filters.
6. **Backward compatible** — no domain (null) → all findings pass through unchanged.

---

## Acceptance Criteria

- [ ] 9 domain-filter unit tests GREEN
- [ ] 1 scan-service integration test GREEN
- [ ] 3 E2E tests GREEN (`e2e/domain-filter-e2e.test.ts`)
- [ ] `scripts/verify_domain_filter.sh` PASS
- [ ] Existing role-filter + risk-level-filter tests GREEN (backward compat)
- [ ] Role mappings moved from hardcoded TS to check-applicability.json
- [ ] `ScanFilterContext.skippedByDomain` populated in scan results
- [ ] All 2261+ existing tests GREEN
- [ ] `tsc --noEmit` PASS

---

## Tasks

| # | Task | Agent | Method | Arch Requirements | Files |
|---|------|-------|--------|-------------------|-------|
| T-1 | Create check-applicability.json (sparse format) | architect | data file | Sparse override format, version field | `data/scanner/check-applicability.json` |
| T-2 | Add `skippedByDomain` to ScanFilterContext | architect | types + schemas | readonly, Zod paired, Rust mirror | `types/common.types.ts`, `types/common.schemas.ts`, `cli/src/types/engine.rs` |
| T-3 | RED tests: domain-filter (9 tests) | architect | test spec | Real types, frozen, deterministic | `domain/scanner/domain-filter.test.ts` |
| T-4 | RED test: scan-service domain integration (1 test) | architect | test spec | Real types, concrete assertions | `services/scan-service.test.ts` |
| T-5 | RED E2E tests: domain filter (3 tests) | architect | test spec | Hono in-memory, temp project | `e2e/domain-filter-e2e.test.ts` |
| T-6 | RED acceptance script | architect | script FAIL | Bash+Python, exit codes | `scripts/verify_domain_filter.sh` |
| T-7 | Refactor role-filter.ts → use JSON data | nodejs-dev | existing tests GREEN | import JSON with `{ type: 'json' }`, pure fn | `domain/scanner/role-filter.ts` |
| T-8 | Create domain-filter.ts | nodejs-dev | T-3 tests GREEN | Pure fn, Object.freeze, data from JSON, same-ref optimization | `domain/scanner/domain-filter.ts` |
| T-9 | Wire domain filter into scan-service (Step 3) | nodejs-dev | T-4 + T-5 tests GREEN | Insert after Step 2, count skippedByDomain, no I/O in domain | `services/scan-service.ts` |

---

## Dependencies

```
V1-M08 (Context-Aware Scan)         ← provides role-filter + getProjectProfile  ✅ DONE
V1-M09 (Onboarding Enrichment)     ← provides risk-level-filter               ✅ DONE
V1-M18 T-1,T-2,T-3,T-4            ← architect delivers data + types + RED tests
V1-M18 T-5                         ← refactor role-filter (can parallel with T-6)
V1-M18 T-6                         ← implement domain-filter
V1-M18 T-7                         ← wire into scan-service (depends on T-5, T-6)
```

---

## Предусловия среды (architect обеспечивает):

- [x] npm install в engine/core
- [x] cargo build компилируется
- [x] npm test запускается (RED тесты — ок, ошибки среды — нет)
- [x] `tsc --noEmit` PASS с новыми типами
- [x] check-applicability.json создан
- [x] ScanFilterContext.skippedByDomain = 0 в scan-service (backward compat)

---

## Data File: check-applicability.json

Sparse format — only overrides. Path: `engine/core/data/scanner/check-applicability.json`

```json
{
  "version": "1.0.0",
  "defaults": { "roles": ["provider","deployer","both"], "riskLevels": [...], "domains": [] },
  "overrides": {
    "qms": { "roles": ["provider"] },
    "industry-hr-bias": { "domains": ["hr", "employment"] },
    "industry-finance-credit": { "domains": ["finance"] },
    ...
  }
}
```

Empty `domains: []` means "applies to ALL domains" (conservative default).

---

## Test Specs (T-3): domain-filter.test.ts — 9 RED tests

1. `returns findings unchanged when domain is null` — no profile → passthrough
2. `skips HR-only checks when project domain is healthcare` — cross-domain filtering
3. `preserves healthcare checks when project domain is healthcare` — same-domain pass
4. `preserves checks with no domain mapping (conservative default)` — no mapping → keep
5. `skips finance-only checks for education domain` — cross-domain verify
6. `includes descriptive skip message with domain info` — message format
7. `returns original array reference when no changes needed` — optimization
8. `is deterministic (same input → same output)` — pure function
9. `returns frozen result when changes made` — immutability

## Test Spec (T-4): scan-service integration — 1 RED test

1. `healthcare domain profile: HR-only checks become skip, skippedByDomain > 0`

---

## Architecture Requirements

- **domain-filter.ts**: Pure function, no I/O. Pattern matches `role-filter.ts` and `risk-level-filter.ts`.
- **Data from JSON**: Load `check-applicability.json` via `import ... from '...json' with { type: 'json' }`.
- **Object.freeze** on returned arrays when modifications are made.
- **Same reference** optimization: return input array unchanged when no modifications needed.
- **scan-service.ts Step 3**: Insert domain filter AFTER role filter (Step 1) and risk-level filter (Step 2). Count `skippedByDomain` and populate filterContext.
