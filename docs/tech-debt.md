# Tech Debt Tracker — Complior v8

**Updated:** 2026-05-03
**Author:** Architect (post v1.0.1 release — TD-63 closed, TD-64..TD-68 added/closed for V1-M30.10/.11/.12)

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
| TD-56 | MEDIUM | V1-M30.3 Part A incomplete: scripts/verify_truly_deep_e2e.sh lines 292 + 374 still use `${AI_TARGET}/health`. With AI_TARGET=`${AI_BASE}/v1/chat/completions`, the health URL becomes `…/v1/chat/completions/health` which 404s. Line 374 is harmless (falls into spawn_ai_server which probes correctly). Line 292 is harmful: per-profile eval gate always SKIPS the eval section ("AI server not reachable") so /deep-e2e cannot end-to-end verify the V1-M30.3 fix. Flip both to `${AI_BASE}/health` | scripts/verify_truly_deep_e2e.sh:292,374 | re-run /deep-e2e Profile B should show real Score (B/C), not "skipping eval section" | 🔴 OPEN |
| TD-57 | LOW | V1-M30.4: timeline analyzer in /deep-e2e accepted only raw ISO `2026-08-02`/`2027-08-02` substrings; V1-M30.2 changed renderer to emit humanized `August 2, 2026` form. Without alternation, /deep-e2e timeline checks would always fail post-V1-M30.2 | scripts/verify_truly_deep_e2e.sh:647-648 | /deep-e2e timeline check accepts both `August 2, 2026` and `2026-08-02` | ✅ FIXED (V1-M30.4 spec commit 5bf2bda) |
| TD-58 | LOW | V1-M30.4: findings analyzer in /deep-e2e counted `len(data.findings)` (raw, unfiltered) instead of `<div class="finding-card"` count from rendered HTML (profile-aware). Profile A=20, B/C=24 differ AFTER profile filter — analyzer was not measuring the filter at all | scripts/verify_truly_deep_e2e.sh:532 | per-profile counts genuinely differ in /deep-e2e output | ✅ FIXED (V1-M30.4 spec commit 5bf2bda) |
| TD-59 | LOW | V1-M30.4 spec called out: ed25519 vs HMAC signing path inconsistency between init-service and composition-root (internal architecture only, no user-facing impact). Deferred to v1.0.1 per spec | engine/core/src/services/init-service.ts vs composition-root.ts | TBD (v1.0.1 milestone) | ⏸ DEFERRED (v1.0.1) |
| TD-60 | LOW | V1-M30.4 A.4: `renderTabDocuments` reads `process.cwd()` directly (lines 885, 922) for resolving relative outputFile paths to absolute file:// URLs. Side-effect read in an otherwise pure renderer | engine/core/src/domain/reporter/html-renderer.ts:885,922 | renderTabDocuments accepts `baseDir` parameter; no `process.cwd()` reference inside renderer | ✅ FIXED (V1-M30.5 W-2 — `resolveDocumentPath(outputFile, projectPath)` reads projectPath from report.summary; `process.cwd()` only as degraded fallback) |
| TD-61 | MEDIUM | V1-M30.5: Architect's RED test `cli/src/headless/tests.rs:2004` uses `if line.contains(...) { panic!(...) }` instead of `assert!(!line.contains(...), ...)`. Clippy `manual-assert` lint fails. **Blocks CI** (`cargo clippy --all-targets -D warnings`). Architect must fix — dev cannot modify test file per scope guard | cli/src/headless/tests.rs:2004 | clippy --all-targets -D warnings passes | ✅ FIXED (commit 43646bc, merged to dev in PR #33) |
| TD-62 | LOW | V1-M30.5: dev modified 2 V1-M29 test files without filing SCOPE VIOLATION REQUEST. (1) `actions-no-deprecated-passport-init.test.ts` — old spec "no passport init" contradicts V1-M30.5 W-3 "render all actions". (2) `html-documents-strict-filter.test.ts` — old spec "FRIA excluded for limited-risk" contradicts V1-M30.5 W-2 "FRIA shown for all profiles". Both are justified spec supersessions, no assertions weakened. Recurring pattern from TD-52/TD-53. **V1-M30.6 NOTE:** V1-M30.5 W-2 FRIA change was itself a REGRESSION — the flipped assertion masked it. V1-M30.6 restored the original V1-M29 assertion and fixed the regression. Dev followed correct process in V1-M30.6 — filed SCOPE VIOLATION REQUEST for `passport-presence.test.ts`, architect handled | actions-no-deprecated-passport-init.test.ts, html-documents-strict-filter.test.ts | — | ✅ RESOLVED (process corrected in V1-M30.6) |
| TD-63 | MEDIUM | V1-M30.8b W-4 disclaimer redesign supersedes 2 older tests. Both tests retired by spec supersession. | `v1m30-4-tab-ux.test.ts`, `v1m30-5-doc-links-actions.test.ts` | Tests retired/replaced by V1-M30.9 spec | ✅ FIXED (V1-M30.9 spec supersession) |
| TD-64 | MEDIUM | V1-M30.9's W-3 fix was incomplete — only patched OFFLINE fallback (`fix.rs:119`). The CONNECTED branch (`engine_client::fix_dry_run`) still capped at 100.0. /deep-e2e v2 caught it. | `cli/src/engine_client.rs:202`, `cli/src/types/engine.rs:16` | `cargo test --bin complior types::engine::predicted_score_cap_tests` 5/5 GREEN | ✅ FIXED (V1-M30.10 + ADR-008) |
| TD-65 | LOW | V1-M30.11 BUG-1: `fix --doc <type>` swallowed engine 4xx errors silently. Showed fake "Document generated" + "Saved to: unknown" + 0/0 fields. Root cause: `engine_client::post_json` returns `Ok(error_json)` for HTTP 4xx (deliberate); doc-generate handlers didn't check `error` field. | `cli/src/headless/fix.rs:1432`, `cli/src/headless/doc.rs:159+256` | `cargo test --bin complior types::engine::doc_generate_error_tests` 4/4 GREEN | ✅ FIXED (V1-M30.11) |
| TD-66 | LOW | V1-M30.11 BUG-3: `complior scan --diff main` on non-git dumped ~70-line `git --help`. | `cli/src/headless/scan.rs:675-680` | scan_diff_main.log = 2 friendly lines | ✅ FIXED (V1-M30.11) |
| TD-67 | LOW | V1-M30.11 cargo fmt regression — multi-line assert! reflow needed | cli/src/types/engine.rs | `cargo fmt --check` clean | ✅ FIXED (commit `d1579ce`) |
| TD-68 | LOW | V1-M30.12 BUG-4 (v1.0.0 known limitation): V1-M30.11 read error message from wrong JSON path (`err_obj.get("message")` treating error as object — engine returns flat `{error: "CODE", message: "..."}`). User saw "Unknown engine error" instead of "Passport not found: default". | `cli/src/headless/{fix.rs:1432, doc.rs:159+256}` | `cargo test --bin complior types::engine::bug4_error_message_tests` 4/4 GREEN; /deep-e2e v4: 0 "Unknown engine error", 15 "Passport not found" per profile | ✅ FIXED (V1-M30.12, released v1.0.1) |

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
- TD-57: FIXED in V1-M30.4 spec commit. Architect wrote alternation for both forms simultaneously when shipping the RED tests + script TD section
- TD-58: FIXED in V1-M30.4 spec commit. Original analyzer line `n_data = len(data.get('findings', []))` was structurally wrong because profile-aware filtering happens in HTML renderer (renderTabFindings), not in scan-result data. Counting rendered cards is the only way to verify profile-aware filter is actually applied
- TD-59: DEFERRED to v1.0.1. Per architect, this is internal architecture only — both signing paths produce valid signatures; users see no difference. Unification is a refactor, not a bugfix
- TD-60: FIXED in V1-M30.5 W-2. `resolveDocumentPath(outputFile, projectPath)` now reads `report.summary.projectPath` (populated from `scanResult.projectPath` in report-builder.ts). `process.cwd()` remains only as a degraded fallback when projectPath is unavailable (with an inline comment explaining). The primary path is now pure
- TD-61: FIXED in V1-M30.5 merge to dev. Architect fixed in commit 43646bc (`assert!` replaced `if+panic!`). Clippy now clean
- TD-62: RESOLVED in V1-M30.6. V1-M30.5 W-2 FRIA change was itself a REGRESSION — the V1-M29 assertion "FRIA excluded for limited-risk" was CORRECT. V1-M30.5 dev's flip masked the bug. V1-M30.6 architect restored the original assertion, nodejs-dev fixed `isDocumentApplicable` to re-add the FRIA risk-level filter. In V1-M30.6, dev correctly filed SCOPE VIOLATION REQUEST for `passport-presence.test.ts` — architect handled in separate commit (74f68c8). This breaks the recurring TD-52→TD-53→TD-62 pattern — process now working correctly
- TD-63: V1-M30.8b W-4 removed the `excludedLinks` feature (file:// anchors to excluded docs in disclaimer) and replaced with simpler `excludedLabels` (text labels). Two older tests tested the removed feature: (1) V1-M30.4 A.4 tested that FRIA in doc list renders as file:// link — but FRIA is now excluded for limited-risk AND disclaimer no longer has links. (2) V1-M30.5 W-2 tested that excluded FRIA resolves relative path via projectPath — same root cause. Both are **architect-owned test files** that test a feature intentionally removed by V1-M30.8b spec. Dev correctly did NOT touch them (spec said "DO NOT touch other V1-M30.* tests"). Architect must update fixtures: switch from FRIA (excluded by profile) to a universally-applicable doc type like `ai-literacy` (Art. 4), OR change test profile to `high-risk` so FRIA appears in doc-cards where file:// links still work. BLOCKING for merge
