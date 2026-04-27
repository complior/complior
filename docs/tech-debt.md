# Tech Debt Tracker — Complior v8

**Updated:** 2026-04-27
**Author:** Reviewer (V1-M29 review — add TD-53, TD-54, TD-55)

---

## Format

| ID | Severity | Description | Location | Test on fix | Status |
|----|----------|-------------|----------|-------------|--------|

- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Status**: OPEN / FIXED / WONTFIX
- **Test on fix**: Name of test that verifies the fix (architect writes)

---

## Active Tech Debt

| ID | Severity | Description | Location | Test on fix | Status |
|----|----------|-------------|----------|-------------|--------|
| TD-30 | LOW | `--cloud` flag returns stub "not yet available" | cli/src/headless/scan.rs:54 | — | OPEN (Phase 2) |
| TD-31 | LOW | 2 skipped tests: conditional on passport JSON files on disk | engine/core/src/types/passport-schemas.test.ts | `passport_schemas_use_repo_fixtures` (V1-M20) | ✅ FIXED (V1-M20) |
| TD-32 | LOW | Stale M01 milestone file (status NEXT, but work done) | docs/sprints/M01-scanner-eval-core.md | — | OPEN |
| TD-33 | LOW | Redteam command is alias to eval --security, not standalone | cli/src/headless/redteam.rs | — | OPEN (by design) |
| TD-34 | LOW | Sync command auth scaffolding only, logic feature-gated | cli/src/headless/sync.rs | — | OPEN (Phase 2) |
| TD-35 | LOW | 3x TODO(T10) dead_code markers for responsive widgets | cli/src/components/suggestions.rs:52, layout.rs:38, app/mod.rs:153 | `no_dead_code_markers` (V1-M20) | ✅ FIXED (V1-M20) |
| TD-36 | MEDIUM | PRODUCT-VISION.md 11 "Remaining for Month 1" checklist outdated | docs/PRODUCT-VISION.md:916-924 | — | OPEN |
| TD-37 | LOW | V1-M01..M15 milestone files not on disk (historical knowledge gap) | docs/sprints/ | — | OPEN |
| TD-38 | MEDIUM | `scan --quiet` outputs 16 lines instead of ≤5 (header+info not suppressed) | cli/src/headless/format/human.rs:28-30 | `format_human_quiet_compact` (cli/src/headless/tests.rs:1069) | ✅ FIXED (test GREEN; real-world re-verify in V1-M21) |
| TD-39 | LOW | Installed binary in PATH was v0.9.4 (stale), causing passport acceptance failures | ~/.cargo/bin/complior | — | ✅ FIXED (cargo install) |
| TD-40 | LOW | Completions acceptance test flaky in full pipeline script (engine process leak) | scripts/verify_v1_pipeline_full.sh:321 | `scripts/verify_completions_isolated.sh` (V1-M20) | 🔴 OPEN |
| TD-41 | LOW | C-M04 acceptance script B-01 grep `\d+ passed` fails when eval --det returns all 0/N/A | scripts/verify_e2e_bugfix.sh:187-195 | `scripts/verify_eval_det_grep.sh` (V1-M20) | 🔴 OPEN |
| TD-42 | LOW | C-M04: dev wrote Rust tests (T-4..T-12) without architect RED specs — process deviation | cli/src/headless/tests.rs | — | OPEN (process) |
| TD-43 | LOW | V1-M12.1: dev modified architect test (expanded healthcare IDs for new data entries) — process deviation | engine/core/src/services/eval-prefilter.test.ts | — | OPEN (process) |
| TD-44 | MEDIUM | V1-M12.1: double `as unknown as` cast in getSecurityProbes() filter — type safety smell | engine/core/src/services/eval-service.ts:221-224 | `eval-service-no-unsafe-cast.test.ts` (V1-M20) | ✅ FIXED (V1-M20) |
| TD-48 | LOW | V1-M20: architect wrote implementation code for TD-44/TD-35/TD-31 fixes — minor process deviation | V1-M20 commits | — | OPEN (process) |
| TD-49 | LOW | V1-M22: dev modified 8 architect test files (5 ISO removal expected, 2 clippy/mock fixes, 1 eval-service weakened — getLastResult cast exclusion). No SCOPE VIOLATION REQUEST filed for eval-service change | Multiple test files | — | OPEN (process) |
| TD-50 | LOW | V1-M22: 2 passport-schemas tests still skipped despite V1-M20 repo fixture fix (TD-31). May be test environment issue or fixture path mismatch | engine/core/src/types/passport-schemas.test.ts | — | 🔴 OPEN |
| TD-51 | LOW | V1-M26: dev modified architect test — corrected 2 OBL IDs in sorting test (OBL-005→OBL-002, OBL-014→OBL-015). Architect assumed wrong OBL→Article mappings. Test intent preserved, assertions not weakened. No SCOPE VIOLATION REQUEST filed | engine/core/src/domain/profile/applicable-articles.test.ts | — | OPEN (process) |
| TD-52 | LOW | V1-M27: dev modified 6 architect test files — 5× `extractTab()` regex helper fix (architect wrote `id="${tabId}"` but HTML generates `id="tab-${tabId}"` + boundary lookahead for nested divs), 1× added `await` to async `createEvidenceStoreForProject()` call. Zero assertion changes, test intent preserved. No SCOPE VIOLATION REQUEST filed | 5 html-*-*.test.ts + init-evidence-chain.test.ts | — | OPEN (process) |
| TD-53 | LOW | V1-M29: dev modified 3 architect test files (171 ins, 42 del). (a) Added `explanation`, `layer`, `title` fields to fixtures (required by HTML pipeline), (b) scoped FRIA/declaration assertions to doc-cards only (not disclaimer), (c) rewrote findings profile test with explicit role assertions. No assertion weakening. Recurring pattern from TD-52 — architect test data lags type contracts. No SCOPE VIOLATION REQUEST filed | html-documents-strict-filter.test.ts, html-findings-completeness.test.ts, html-laws-strict-filter.test.ts | — | OPEN (process) |
| TD-54 | LOW | V1-M29 W-1: `runInitForProject` export in init-service.ts is an unnecessary alias — identical to `runInit` | engine/core/src/services/init-service.ts:78 | — | OPEN |
| TD-55 | LOW | V1-M29 W-2: `as unknown as { appliesToRole?: string }` cast in renderTabFindings — should use extended FindingWithExplanation type | engine/core/src/domain/reporter/html-renderer.ts:442 | — | OPEN |

---

## Resolved Tech Debt (v0.9.5 - v0.9.8)

| ID | Description | Fixed in | Resolution |
|----|-------------|----------|------------|
| TD-12 | Unused `buildPriorityActions` import in scan.route.ts | v0.9.6 | Removed |
| TD-14 | Agent discovery parses non-path route strings | v0.9.6 | Fixed parser |
| TD-26 | Deprecated `/agent/*` route stubs remaining | v0.9.6 | Removed |
| TD-27 | Rust CLI routes incorrect: `/passport/doc` | v0.9.6 | Fixed to `/fix/doc/generate` |
| TD-28 | 57 TypeScript type errors | v0.9.5 | All resolved |
| TD-29 | npm security vulnerabilities (hono, vite) | v0.9.5 | Upgraded |

---

## Notes

- TD-30, TD-34: By design — Cloud and Sync are Phase 2 features, not v1.0 scope
- TD-31: Tests skip gracefully when test project not present; not a regression
- TD-33: Redteam as eval alias is acceptable for v1.0; standalone planned post-v1.0
- TD-36: PRODUCT-VISION checklist predates M07-M10 work that completed ISO 42001 docs and eval
- TD-38: V1-M17 milestone created with RED test `format_human_quiet_compact`
- TD-39: Fixed by running `cargo install --path cli` (0.9.4 → 0.9.9)
- TD-40: Completions test passes in isolation; fails in script due to engine process from prior section
- TD-41: Script grep looks for `\d+ passed` but `eval --det` output has `0/20 N/A` format when target returns empty results. Fix: add fallback — if no `176 errors` found AND eval completed, count as PASS
- TD-42: Architect spec'd test names in milestone doc (C-M04) but did not write RED Rust test code. Dev wrote both tests and implementation. No assertions weakened — acceptable for bugfix sprint, but future milestones should include RED Rust tests
- TD-43: Dev added 7 entries to `test-applicability.json` (CT-10-051..052, CT-11-051..055). CT-11-053 includes "healthcare", causing architect's test to fail. Dev expanded test assertions rather than filing SCOPE VIOLATION REQUEST. Assertions NOT weakened — expanded, not relaxed
- TD-44: FIXED in V1-M20 — `filterTestsByProfile` now accepts `SecurityProbe[]` natively via union type. Zero `as unknown as` casts in eval-service.ts. Verified by `eval-service-no-unsafe-cast.test.ts` (GREEN)
- TD-48: V1-M20 architect wrote impl code for tech debt cleanup (eval-profile-filter.ts, cli dead_code removal, fixture wiring). Acceptable for targeted fixes with pre-written RED tests, but not a pattern to repeat for feature milestones
- TD-49: V1-M22 dev modified tests in 3 categories: (1) ISO 42001 removal — all doc type counts 17→14, 2 test files deleted with their implementations (expected, scope C); (2) clippy/fmt — mechanical fixes to satisfy `cargo clippy -D warnings` (Option→i32, format!.into()→format!, map→map_or_else); (3) assertion changes — `document-id-generation.test.ts` mock fixed (architect used wrong structure), `html-report-no-placeholders.test.ts` refined to exclude JS regex `$1` in `<script>`, `eval-service-no-unsafe-cast.test.ts` narrowed to exclude `getLastResult()` Zod cast. The eval-service change is the only true weakening — getLastResult needs `as unknown as` for forward-compatible Zod passthrough deserialization. Dev should have filed SCOPE VIOLATION REQUEST
- TD-50: V1-M20 fixed TD-31 by adding repo fixtures (`data/fixtures/passport-anthropic.json`, `passport-openai.json`). But passport-schemas.test.ts still shows 2 skipped in V1-M22 test run. Possible causes: conditional `describe.skipIf()` not updated, or fixture path relative to test runner CWD
- TD-51: V1-M26 architect used `OBL-005` assuming "Article 5" and `OBL-014` assuming "Article 14" in sorting test. Actual data: `OBL-005` → "Article 11 / Annex IV", `OBL-014` → "Article 49". Dev corrected to `OBL-002` (→ "Article 5") and `OBL-015` (→ "Article 50(1)"). Ascending sort intent and assertions fully preserved — data correction only. Process note: dev should file SCOPE VIOLATION REQUEST before modifying test files
- TD-53: V1-M29 dev test modifications in three categories: (a) data infrastructure — architect test fixtures missing `explanation` (V1-M27 HR-3 format), `layer`, `title` fields required by HTML rendering pipeline (without these fields, cards render empty or skip). (b) assertion correction — architect tested `/\bFRIA\b/` on full tab text, but V1-M29 W-4 disclaimer legitimately mentions "FRIA Art. 27 — high-risk only"; dev scoped to doc-card elements only (assertion more precise, not weaker). (c) test rewrite — architect's findings profile test was weak (`dCount !== pCount`); dev replaced with explicit role-based filtering assertions using `appliesToRole` field. Pattern repeats from TD-52: architect writes tests against assumed type contracts, dev corrects when actual rendering needs more fields
- TD-54: `runInitForProject` is a dead-code alias. If no test references it distinctly, it can be deleted. If a test imports it specifically, rename to `runInit`
- TD-55: `appliesToRole` is not on the `FindingWithExplanation` type. Options: (a) extend type to include optional `appliesToRole`, (b) use intersection type in function signature. Cast works but hides type evolution
- TD-52: V1-M27 test modifications in two categories: (1) 5 html-*-*.test.ts files — `extractTab()` helper regex fix: architect wrote `id="${tabId}"` but actual html-renderer.ts generates `id="tab-${tabId}"`, plus lazy `</div>` boundary replaced with lookahead `(?=\s*<div[^>]*id=["']?tab-)` to handle nested divs inside tab content. (2) init-evidence-chain.test.ts — architect called `createEvidenceStoreForProject()` synchronously but factory returns Promise; dev added `await` and extracted intermediate types. Both categories are infrastructure/helper corrections — ZERO assertions changed in any file. Dev should file SCOPE VIOLATION REQUEST even for helper fixes
