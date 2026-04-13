# Technical Debt
> Updated by: **reviewer** after each review
> Read by: **every dev-agent** at startup (BEFORE milestone tasks)
> Closed by: **dev-agent** (owner) + **architect** (writes test for fix)

## Rules

1. Dev-agent reads this file at startup
2. If OPEN debt on you — check "Test for fix" column:
   - Test/script EXISTS -> fix debt FIRST, then milestone
   - Test/script MISSING -> DO NOT take it. Report: "TD-N waiting for test from architect."
3. Every fix MUST have test/script from architect
4. After fix — run ALL project tests (not just yours)
5. If fix breaks other tests -> STOP, !!! SCOPE VIOLATION REQUEST !!!
6. Closed debt: change status to CLOSED with date

## Debt Table

| # | File:line | Problem | Owner | Severity | Test for fix | Status |
|---|---|---|---|---|---|---|
| TD-1 | `engine/core/src/domain/eval/conformity-score.test.ts` | Dev added new test in feat commit `ff7f2d9` — spec addition (N/A grade) is correct but violates scope guard (architect should add specs) | architect | 🟡 Low | n/a — spec is correct, no code fix needed | 🟡 OPEN |
| TD-2 | `engine/core/src/domain/scanner/layers/layer4-patterns.test.ts` | Dev changed assertion in commit `dfff13e` — bare-llm: `info`→`fail`, `info`→`medium`. Policy change is deliberate and correct, but dev modified existing test assertions (scope violation). Impl `layer4-patterns.ts` changed in sync. | architect | 🟡 Low | n/a — behavior change is correct, architect should ratify | 🟡 OPEN |
| TD-3 | `engine/sdk/` | SDK tests (~414) not included in main `npx vitest run` count. Total 2360 excludes SDK suite. | nodejs-dev | 🟡 Medium | architect: wire SDK vitest into workspace test run | 🟡 OPEN |
| TD-4 | `scripts/verify_cli_flags.sh` | V1-M04 acceptance (15 checks) requires `cargo build --release` binary. Not CI-automated — manual run by user before v1.0. | architect | 🟡 Medium | architect: wire into CI or document as manual gate | 🟡 OPEN |
| TD-5 | `engine/core/src/e2e/context-scan-e2e.test.ts` | V1-M09 dev changed M08 E2E: TEST_PROFILE from 3 fake OBL-IDs → 19 real `eu-ai-act-OBL-*`, assertions range→exact (=19). Stricter assertions but scope violation (dev modified architect spec). Commit `c7ccff2`. | architect | 🟡 Medium | n/a — assertions are stricter, architect should ratify | ✅ RATIFIED 2026-04-13 — real obligation IDs and exact assertions are better than fake data with range checks. Spec improved. |
| TD-6 | `engine/core/src/e2e/onboarding-enrichment-e2e.test.ts` | V1-M09 dev fixed field name `applicableObligationCount`→`applicableObligations` (1 line). Architect spec used wrong field name. Commit `c7ccff2`. | architect | 🟡 Low | n/a — naming fix, architect should ratify | ✅ RATIFIED 2026-04-13 — architect spec had incorrect field name, dev fix is correct (matches ProfileSchema). |
| TD-7 | `iso-42001-controls.json`, `soa-generator.ts`, `risk-register-generator.ts`, `passport-documents.ts` | V1-M07 files duplicated on V1-M09 branch for typecheck. Same files exist on `feature/V1-M07-iso42001`. Files DIFFER between branches (M09 dev improved generators: document IDs, approval sections, scale tables). Merge conflict in 3/4 files (json identical). | architect | 🔴 High | Resolution: M09 merges to dev first. When M07 merges later, resolve conflicts keeping M07's logic + M09's rendering improvements. | 🟡 ACCEPTED 2026-04-13 — merge order documented, conflicts trivial (same functions, different formatting). |
