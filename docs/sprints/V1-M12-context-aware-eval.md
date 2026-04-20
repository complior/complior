# V1-M12: Context-Aware Eval

**Status:** 🔴 RED
**Created:** 2026-04-20
**Feature Area:** FA-02 (Eval Architecture) — see `docs/feature-areas/eval-architecture.md` §11-§14
**Goal:** Eval filters tests by role, risk level, and domain — matching scan's context-awareness

---

## Context

`complior eval` runs ALL 688 tests against every AI system regardless of role, risk level, or industry. This wastes time/money ($1.42 per full LLM run) and produces irrelevant failures. `complior scan` already has context-awareness via onboarding profile (V1-M08/M09/M10). This milestone brings eval to parity.

**Key design decisions:**
1. Filter BEFORE execution (unlike scan which filters AFTER) — saves HTTP/LLM costs
2. Sparse applicability map — only ~60 overrides vs 688 defaults-to-include
3. Severity weighting additive — composes with existing category weights
4. Exactly 1 retry for timeouts — 2s backoff, not exponential
5. Backward compatible — no profile → identical to current behavior
6. Reuse existing `getProjectProfile()` — same DI closure already in composition-root for scan

---

## Acceptance Criteria

- [ ] `complior eval <url> --full` with profile → runs only applicable tests
- [ ] `complior eval <url> --full` without profile → runs ALL tests (backward compat)
- [ ] EvalResult JSON contains `filterContext` + `disclaimer` fields
- [ ] Severity-weighted scoring changes category scores
- [ ] Timeout tests retry once with 2s backoff
- [ ] 32 new tests GREEN (7 test files)
- [ ] Existing 2225+ tests still GREEN
- [ ] `scripts/verify_eval_context.sh` PASS

---

## Tasks

| # | Task | Agent | Method | Files |
|---|------|-------|--------|-------|
| T-1 | Create test-applicability.json | architect | data file | `data/eval/test-applicability.json` |
| T-2 | Create severity-weights.json | architect | data file | `data/eval/severity-weights.json` |
| T-3 | Add EvalFilterContext + EvalDisclaimer types | architect | types | `types/common.types.ts` |
| T-4 | Add Zod schemas | architect | schemas | `types/common.schemas.ts` |
| T-5 | Extend EvalOptions + EvalResult | architect | types | `domain/eval/types.ts` |
| T-6 | Implement role filter | nodejs-dev | unit test: `eval-role-filter.test.ts` GREEN | `domain/eval/eval-profile-filter.ts` |
| T-7 | Implement risk-level filter | nodejs-dev | unit test: `eval-risk-filter.test.ts` GREEN | (same file) |
| T-8 | Implement domain filter | nodejs-dev | unit test: `eval-domain-filter.test.ts` GREEN | (same file) |
| T-9 | Severity-weighted scoring | nodejs-dev | unit test: `eval-severity-score.test.ts` GREEN | `domain/eval/conformity-score.ts` |
| T-10 | Eval disclaimer builder | nodejs-dev | unit test: `eval-disclaimer.test.ts` GREEN | `domain/eval/eval-disclaimer.ts` |
| T-11 | Timeout retry | nodejs-dev | unit test: `eval-timeout-retry.test.ts` GREEN | `domain/eval/eval-runner.ts` |
| T-12 | Wire filters into eval-runner | nodejs-dev | unit test: `eval-context-integration.test.ts` GREEN | `domain/eval/eval-runner.ts` |
| T-13 | Wire getProjectProfile | nodejs-dev | composition-root integration | `composition-root.ts` |
| T-14 | Add filterContext + disclaimer to route | nodejs-dev | integration | `http/routes/eval.route.ts` |

---

## Dependencies

```
T-1,T-2 (data) ──┐
T-3,T-4 (types) ──┼──► T-6,T-7,T-8 (filters) ──► T-12 (wire runner) ──► T-14 (route)
T-5 (eval types) ─┘     T-9 (scoring) ──────────┘
                         T-10 (disclaimer) ──────┘
                         T-11 (retry) ───────────┘
                         T-13 (composition-root) ┘
```

---

## Предусловия среды (architect обеспечивает)

- [x] npm install в engine/core
- [x] cargo build компилируется
- [x] npm test запускается (RED тесты — ок, ошибки среды — нет)
- [x] cargo test запускается
- [ ] Feature branch: `feature/V1-M12-context-aware-eval`
- [ ] RED тесты закоммичены на feature branch

---

## Verification

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npx vitest run eval-role-filter` | 6 RED → GREEN |
| 2 | `npx vitest run eval-risk-filter` | 5 RED → GREEN |
| 3 | `npx vitest run eval-domain-filter` | 5 RED → GREEN |
| 4 | `npx vitest run eval-severity-score` | 5 RED → GREEN |
| 5 | `npx vitest run eval-disclaimer` | 4 RED → GREEN |
| 6 | `npx vitest run eval-timeout-retry` | 4 RED → GREEN |
| 7 | `npx vitest run eval-context-integration` | 3 RED → GREEN |
| 8 | `npx vitest run` | Existing 2225+ GREEN + 32 new GREEN |
| 9 | `bash scripts/verify_eval_context.sh` | PASS |
