# Project State — Complior v8

**Updated:** 2026-04-27
**Updated by:** Reviewer (V1-M29 review)
**Version:** 0.10.0 (Cargo.toml workspace + package.json)
**Branch:** `feature/V1-M29-html-runtime-fixes` (V1-M29 HTML runtime fixes — reviewed, APPROVED)

---

## Current Status

| Component | Status | Tests |
|-----------|--------|-------|
| TS Engine (`engine/core/`) | GREEN | 2405 passed, 2 skipped (195 files) |
| Rust CLI (`cli/`) | GREEN | 211 passed (0 failed) |
| tsc --noEmit | PASS | — |
| cargo clippy | PASS | — |
| SDK (`engine/sdk/`) | Not in this repo | — |

**Total: 2616 tests GREEN**

---

## Completed Milestones (on main, released)

| Milestone | Description | Status | Release |
|-----------|-------------|--------|---------|
| V1-M01 | Pipeline acceptance (happy path) | DONE | v0.9.0 |
| V1-M02 | All CLI flags covered by E2E tests (36 tests) | DONE | v0.9.1 |
| V1-M03 | Docs, CI, version bump, release polish | DONE | v0.9.2 |
| V1-M04 | Full CLI flag binary E2E + engine flags | DONE | v0.9.3 |
| V1-M05 | Type errors fixed, CI typecheck re-enabled | DONE | v0.9.5 |
| V1-M06 | UX quality sprint (11 RED→GREEN) | DONE | v0.9.5 |
| V1-M07 | ISO 42001 Document Generators (SoA, Risk Register) | DONE | v0.9.5 |
| V1-M08 | Context-Aware Scan (profile filters, filterContext) | DONE | v0.9.5 |
| V1-M09 | Onboarding Enrichment (9 questions, dynamic obligations) | DONE | v0.9.5 |
| V1-M10 | Score Transparency (disclaimer, category breakdown) | DONE | v0.9.5 |
| V1-M11 | Command Restructuring (agent→passport, docs→fix --doc) | DONE | v0.9.5 |
| V1-M13 | Route cleanup (/agent/ → /passport/ in Rust CLI) | DONE | v0.9.5 |
| V1-M14 | Release polish (18 UX fixes, version bump) | DONE | v0.9.7 |
| V1-M15 | Pre-release polish (SARIF, completions, UX) | DONE | v0.9.9 |
| V1-M16 | Pre-release polish sprint (quality gate 0.9.8→0.9.9) | DONE | v0.9.9 |
| V1-M17 | Quiet mode, version bump 0.9.9 | DONE | v0.9.9 |
| C-M01 | @complior/contracts package extraction | DONE | v0.10.0 |
| C-M02 | SaaS migration to @complior/contracts | DONE | v0.10.0 |

## Completed Milestones (on dev, pending merge to main)

| Milestone | Description | Status | Merged to dev |
|-----------|-------------|--------|---------------|
| C-M03 | CLI pre-send safeParse validation (4 sync endpoints) | DONE | ✅ |
| C-M04 | E2E bug fix sprint (13 tasks, 19 issues) | DONE | ✅ |
| V1-M12 | Context-Aware Eval (profile filter, severity scoring, disclaimer, timeout retry) | DONE | ✅ |
| V1-M12.1 | Eval Pre-Filter (filter BEFORE execution, saves HTTP/LLM costs) | DONE | ✅ (PR #17) |
| V1-M18 | Scanner Domain Filter (3rd dimension: industry domain) | DONE | ✅ (PR #18) |
| V1-M19 | Fix Profile Filter (filter fix plans by project profile) | DONE | ✅ (PR #18) |
| V1-M20 | Tech Debt Cleanup (TD-44, TD-31, TD-35, TD-41) | DONE | pending merge |
| V1-M22 | v1.0.0 Release Blockers (HTML report, ISO 42001 removal, UX fixes) | DONE | pending merge |
| V1-M23 | Runtime Wiring Fixes (4 release blockers from V1-M21 re-run) | DONE | pending merge |
| V1-M24 | Final Wiring (R-1..R-5 — last 4 wiring gaps before v1.0.0 tag) | DONE | ✅ (PR #21) |
| V1-M24.1 | CI Hotfix (cargo fmt + rustls-webpki RUSTSEC-2026-0104) | DONE | ✅ (PR #22) |
| V1-M25 | R-4b Composition Wiring (profile → reportService → HTML) | DONE | pending merge |

## In Progress / RED

| Milestone | Description | Branch | Status |
|-----------|-------------|--------|--------|
| V1-M26 | Applicable Articles (OBL-IDs → Article refs) | `main` (merged PR #24) | DONE |
| V1-M27 | HTML Report UX Rework (8 tab improvements) | `main` (merged PR #25) | DONE |
| V1-M28 | init --yes respects project.toml | `main` (merged PR #26) | DONE |
| V1-M29 | HTML Runtime Fixes (5 cross-profile UX issues) | `feature/V1-M29-html-runtime-fixes` | DONE (reviewer APPROVED, ready for PR) |
| G-M02.5 | Remediation Pipeline (Guard integration) | `feature/G-M02.5-remediation-pipeline` | RED (T-7 pending) |

---

## V1-M11: Command Restructuring (DONE — on main, PR #12)

**Scope:** 32 files, +4233/-1510 LOC
**What:** Breaking CLI restructuring:
- `complior agent` → `complior passport` (16 subcommands)
- Document generation → `complior fix --doc <type>` (7 types)
- `/agent/*` HTTP routes → `/passport/*` (19 routes)
- Document routes → `/fix/doc/*` (8 routes)
- Old `/agent/*` routes return 404

- E2E Tests: 14/14 GREEN
- Acceptance: 10/10 PASS (`verify_passport_cli.sh`)

## V1-M13: Route Cleanup (DONE — on main)

**Scope:** Inline with V1-M11 chain
**What:** Replaced remaining `/agent/` route references in Rust CLI with `/passport/`.

## V1-M14: Release Polish (DONE — on main)

**Scope:** 18 UX fixes
**What:** Pre-release quality pass. Version bump to 0.9.7.

## C-M03: CLI Pre-Send Validation (DONE — on dev)

**Scope:** 1 file, +22/-4 LOC
**What:** All 4 sync endpoints (passport, scan, documents, FRIA) validate payloads via Zod `safeParse()` before sending to SaaS. Invalid data logged and skipped.

- Tests: 22/22 GREEN (sync-route-contracts.test.ts)
- Acceptance: 3/3 PASS (verify_presend_validation.sh)
- Dev did NOT modify test files

## C-M04: E2E Bug Fix Sprint (DONE — on dev)

**Scope:** 19 files, +2000/-104 LOC
**What:** Fixed 13 tasks from E2E test report (3 critical + 7 bugs + 5 UX + 4 inconsistencies):

| Task | Description | Status |
|------|-------------|--------|
| T-1 | Eval auto-detect URL path heuristic + POST probe | FIXED |
| T-2 | `fix --doc all` doc-type handling | FIXED |
| T-3 | Passport autonomy 500 error | FIXED |
| T-4 | `--fail-on` gate works without `--ci` (CRITICAL) | FIXED |
| T-5 | Score consistency (compliance = framework bar) | FIXED |
| T-6 | Passport validate completeness display | FIXED |
| T-7 | Passport permissions "No agents found" | FIXED |
| T-8 | Passport registry "No agents found" | FIXED |
| T-9 | Quick Actions — removed nonexistent commands | FIXED |
| T-10 | Weight display 900% -> 9% | FIXED |
| T-11 | `fix --dry-run` estimated score | FIXED |
| T-12 | `openai://` protocol hints in CLI | FIXED |
| T-13 | Passport init name handling | FIXED |
| R2-1 | OpenAI health check tolerance (404 != unhealthy) | FIXED |
| R2-2 | Score JSON path fix | FIXED |
| R2-3 | Name arg in 3 passport subcommands | FIXED |

**Review Notes:** Dev modified 3 test files (protocol deviation, TD-42). Assertions not weakened.

## V1-M12: Context-Aware Eval (DONE — on dev)

**Scope:** 12 new files, ~800 LOC
**What:** Eval results include profile-based filtering metadata (filterContext) and disclaimer. Four new domain modules:

| Module | Purpose |
|--------|---------|
| `eval-profile-filter.ts` | Filters conformity tests by role, risk level, domain |
| `eval-severity-scoring.ts` | Severity-weighted scoring (critical=4x, high=2x, medium=1x, low=0.5x) |
| `eval-disclaimer.ts` | Builds disclaimer with summary, limitations, profile metadata |
| `eval-timeout-retry.ts` | Retries once on AbortError (timeout), no retry on 401/403 |

- Tests: 33/33 GREEN (7 files)
- **Review Notes:** Comment-stub RED pattern. Assertions match spec. Non-blocking: filter was post-execution only (fixed in M12.1).

## V1-M12.1: Eval Pre-Filter (DONE — on dev)

**Scope:** 1 file (`eval-service.ts` +45/-23), 1 data file (+8 entries)
**What:** Moved eval profile filtering from post-execution (metadata only) to pre-execution (actual cost savings). Tests filtered BEFORE `runEval()` — provider-only/GPAI-only/wrong-domain tests never make HTTP calls.

- Tests: 4/4 GREEN (`eval-prefilter.test.ts`)
- **Review Notes:** TD-43 (dev modified test), TD-44 (double `as unknown as` cast).

## V1-M18 + V1-M19: Scanner Domain Filter + Fix Profile Filter (DONE — on dev)

**Scope:** 29 files, +3968/-18 LOC (PR #18)
**What:** Brings scanner and fix to parity with eval's 3-dimension profile filtering:

| Module | Purpose |
|--------|---------|
| `domain-filter.ts` | Filters scanner findings by project industry domain (3rd dimension after role + risk-level) |
| `fix-profile-filter.ts` | Filters fix plans by project profile: excludes plans for skip findings |
| `check-applicability.ts` | Shared data accessor for `check-applicability.json` (deduped TD-46/TD-47) |
| `check-applicability.json` | Sparse override map: 29 overrides for role + domain applicability |
| Feature Areas | `scanner-architecture.md` (160→955 lines), `fix-architecture.md` (157→1174 lines) |

- Tests: 27 new (domain-filter 16, fix-profile-filter 8, scan-service 1, fix-service 2, E2E 6, Rust 1)
- **Review Notes:** TD-45 (architect import path error), TD-46 (FixFilterContext dedup — fixed), TD-47 (helper dedup — fixed)

## V1-M20: Tech Debt Cleanup (DONE — pending merge to dev)

**Branch:** `feature/V1-M20-M21-roadmap-cleanup`
**Scope:** 37 files, +3333/-54 LOC (unique to branch)
**What:** Resolves 4 tracked tech debt items with RED tests written by architect:

| TD | Description | Resolution |
|----|-------------|------------|
| TD-44 | Double `as unknown as` cast in eval-service | `filterTestsByProfile` now accepts `SecurityProbe[]` natively; zero `as unknown as` in eval-service.ts |
| TD-31 | Passport schema tests skipped on CI (env-dependent) | 2 repo fixtures (`passport-anthropic.json`, `passport-openai.json`) in `data/fixtures/`; tests never skip |
| TD-35 | 4x `#[allow(dead_code)] // TODO(T10)` markers in cli/src | Removed annotations (responsive widgets wired or fields deleted) |
| TD-41 | C-M04 acceptance grep fails on `eval --det` empty output | `verify_eval_det_grep.sh` acceptance script with fallback |

- Tests: 5 new (TS: 2 files, Rust: 1 test)
- Acceptance scripts: 3 new (`verify_completions_isolated.sh`, `verify_eval_det_grep.sh`, `verify_v1_deep_e2e.sh`)
- Feature Areas: 8 new (contract-layer, guard-integration, mcp, passport, report, sdk, sync, tui)
- V1-M19 hotfix: wired `getProjectProfile` + `fixFilterContext` in fix route

**Review Notes:**
- Tests GREEN: 2297 TS + 203 Rust = 2500 total
- No existing test assertions weakened or removed
- TD-48: Architect wrote implementation code for TD-44/TD-35/TD-31 fixes (minor process deviation — acceptable for targeted tech debt cleanup)
- V1-M21 milestone spec created (Deep E2E Testing) — RED, not yet implemented

## V1-M22: v1.0.0 Release Blockers (DONE — pending merge to dev)

**Branch:** `feature/V1-M22-release-blockers` (chained from V1-M20-M21)
**Scope:** 133 files, +16146/-2083 LOC (full branch vs main)
**What:** Closes all release blockers from V1-M21 Deep E2E test:

| Section | Tasks | Description | Status |
|---------|-------|-------------|--------|
| A (HTML Report) | A-1..A-8 | Report --output, $1 placeholders, company profile, LAWS tab, document IDs, FIXES tab, actions dedup, evidence auto-init | ✅ 8/8 GREEN |
| B (Feature Gaps) | B-1..B-2 | `passport notify` subcommand + route, `scan --json` disclaimer | ✅ 2/2 GREEN |
| C (ISO 42001 Removal) | C-1..C-6 | Remove all iso42001 refs from engine + CLI, delete templates, archive in branch | ✅ 6/6 GREEN |
| D (UX Fixes) | D-1..D-2 | `passport export --format aiuc1` alias, `fix --check-id` exit codes | ✅ 2/2 GREEN |
| E (Test Infrastructure) | E-1..E-3 | Fix test scripts, reorient on eval-target | 🔲 Architect scope (post-review) |

**ISO 42001 Archive:** Code preserved in `archive/iso-42001` branch for future V2-M04 restoration.

- Tests: 2517 GREEN (2310 TS + 207 Rust), 2 skipped
- Clippy: CLEAN
- tsc --noEmit: CLEAN
- ISO 42001: 0 source refs in engine + CLI (templates deleted)

**Review Notes:**
- TD-49: Dev modified 8 architect test files across 3 commits. 5 expected (ISO removal counts 17→14), 2 clippy/mock fixes, 1 eval-service assertion narrowed (justified — getLastResult Zod cast). No assertions weakened critically
- TD-50: 2 passport-schemas tests still skipped (was fixed in V1-M20 with repo fixtures — needs investigation)
- Section E (test infrastructure) remains for architect after this review

## V1-M23: Runtime Wiring Fixes (DONE — pending merge to dev)

**Branch:** `feature/V1-M23-wiring-fixes` (chained from V1-M22)
**Scope:** 4 files, +96/-10 LOC (V1-M23 specific) + 4 new test files
**What:** Closes 4 runtime wiring gaps discovered during V1-M21 deep E2E re-run:

| ID | Description | Fix | Status |
|----|-------------|-----|--------|
| W-1 | `scan --json` missing `disclaimer` field | Wire `buildScanDisclaimer` in scan-service, attach to ScanResult | ✅ GREEN |
| W-2 | `report --output` ignored for md/html/pdf | CLI passes `outputPath` in JSON body to engine | ✅ GREEN |
| W-3 | `passport notify` route returns 404 | Register `POST /passport/notify` in passport.route.ts with Zod validation | ✅ GREEN |
| W-4 | `aiuc1` alias rejected at runtime | Add `aiuc1` to clap value_parser + normalize to `aiuc-1` in engine route | ✅ GREEN |

- Tests: 2536 GREEN (2328 TS + 208 Rust), 2 skipped
- New test files: 4 TS + 1 Rust test added to `tests.rs`
- No existing tests modified by V1-M23 commits

**Review Notes:**
- Clean implementation — all fixes are minimal, focused wiring
- W-1 follows eval-service disclaimer pattern, Object.freeze on result
- W-2 includes sanity warning if engine path differs from requested
- W-3 uses Zod body validation (consistent with other routes)
- No new tech debt

## V1-M24: Final Wiring (DONE — pending merge to dev)

**Branch:** `feature/V1-M23-wiring-fixes` (chained from V1-M23)
**Scope:** 11 files, +757/-27 LOC (V1-M24 delta)
**What:** Closes last 4 wiring gaps from V1-M23 final E2E (51/64 PASS → targeting 0 release blockers):

| Task | Description | Status |
|------|-------------|--------|
| R-1 | Rust `ScanResult` struct missing `disclaimer` field (serde silently drops) | FIXED |
| R-2 | PDF endpoint ignores `outputPath` (Zod schema missing field) | FIXED |
| R-3 | ~~HTML `$N` placeholders~~ FALSE POSITIVE — was `$500,000` in security probes | REMOVED |
| R-4 | HTML Overview missing company profile block | FIXED |
| R-5 | HTML embedded doc markdown contains `[YYYY]/[NNN]` placeholders | FIXED |

- Tests: 2557 GREEN (2348 TS + 209 Rust), 2 skipped
- New test files: 3 TS (`scan-route-disclaimer`, `report-pdf-output-path`, `html-production-output`) + 1 Rust test
- No existing tests modified (only `disclaimer: None` fixture extension in Rust mock + cosmetic reformat)

**Review Notes:**
- Clean implementation — all fixes are minimal, focused wiring
- R-1: Added `Disclaimer` struct + `disclaimer: Option<Disclaimer>` to Rust ScanResult with serde roundtrip test
- R-2: Added `outputPath` to `PdfReportSchema` in report.route.ts
- R-4: Added `renderCompanyProfile()` section to `generateOfflineHtml()` in html-renderer.ts
- R-5: `generateDocumentId()` helper substitutes `[YYYY]/[NNN]` with real values (e.g. `TDD-2026-001`)
- No new tech debt

## V1-M25: R-4b Composition Wiring (DONE — pending merge to dev)

**Branch:** `feature/V1-M25-r4b-profile-wiring`
**Scope:** 2 files, +15/-1 LOC (implementation only)
**What:** Closes last release blocker — profile block absent from production HTML report despite V1-M24 builder fix. Wiring gap between project.toml → reportService → buildComplianceReport:

| ID | Description | Status |
|----|-------------|--------|
| W-1 | Add `getProjectProfile` to `ReportServiceDeps` interface (optional, back-compat) | ✅ GREEN |
| W-2 | `generateReport()` calls getter, passes `profile` to `buildComplianceReport` | ✅ GREEN |
| W-3 | `composition-root.ts` wires `getProjectProfile` with `Object.freeze` on output | ✅ GREEN |

- Tests: 2560 GREEN (2351 TS + 209 Rust), 2 skipped
- New test file: `report-service-profile-wiring.test.ts` (5 tests — created by architect, not modified by dev)
- No existing tests modified

**Review Notes:**
- Clean, minimal implementation — 3 changes total across 2 files
- Optional dep pattern preserves back-compat with all existing tests
- `Object.freeze` on composition-root profile output (follows project conventions)
- No new tech debt

## V1-M26: Applicable Articles (DONE — reviewer APPROVED)

**Branch:** `dev` (uncommitted working tree changes)
**Scope:** 2 files modified, 1 new file, +113/-2 LOC
**What:** Closes UX gap — profile shows EU AI Act article references instead of raw obligation IDs:

| ID | Description | Status |
|----|-------------|--------|
| W-1 | Pure fn `obligationsToArticles(obligationIds, options)` — maps OBL-IDs to deduplicated, sorted article references with optional domain filter | ✅ GREEN |
| W-2 | Update composition-root.ts — call `obligationsToArticles` to convert before returning profile | ✅ GREEN |

- Tests: 2569 GREEN (2360 TS + 209 Rust), 2 skipped
- New file: `domain/profile/applicable-articles.ts` (pure function, Object.freeze, data from obligations.json)
- Composition-root change: 6 lines — focused wiring
- Architecture: pure function, Object.freeze, data externalization, domain layer ✅

**Review Notes:**
- TD-51: Dev modified architect test — corrected 2 OBL IDs in sorting test (architect assumed wrong OBL→Article mappings per obligations.json). Test intent preserved, assertions not weakened. Data correction only
- Changes not yet committed — dev should commit and push for CI

## V1-M27: HTML Report UX Rework (DONE — reviewer APPROVED)

**Branch:** `feature/V1-M27-html-report-ux`
**Scope:** 10 files, +665/-131 LOC (implementation commit)
**What:** Closes 8 UX gaps in HTML compliance report identified by user:

| # | Task | Description | Status |
|---|------|-------------|--------|
| HR-1 | Auto-init evidence chain | `runInit` creates genesis evidence entry, removes "Score capped" message | ✅ GREEN |
| HR-2 | Tests tab grouping | Group tests by source (scan/eval --det/--llm/--security/--deep) with human descriptions | ✅ GREEN |
| HR-3 | Findings human format | Card layout: What Happened / Why This Matters / What To Do + severity/article/fixable | ✅ GREEN |
| HR-4 | Laws profile filter | Show only applicable obligations + disclaimer about excluded profiles | ✅ GREEN |
| HR-5 | Documents profile filter | Show only required docs for profile + disclaimer | ✅ GREEN |
| HR-6 | Fixes tab populate | Applied fixes + available fix plans (or "No fixes needed" if green) | ✅ GREEN |
| HR-7 | Passports expandable | `<details><summary>` per passport with Identity/Compliance/Endpoints/Evidence sections | ✅ GREEN |
| HR-8 | Actions/Timeline UX | Explanatory headers: "Suggested next commands" / "EU AI Act enforcement deadlines" | ✅ GREEN |

- Tests: 2603 GREEN (2394 TS + 209 Rust), 2 skipped
- Implementation: 4 files (html-renderer.ts major rework, init-service.ts new, evidence-store.ts factory, scan-service.ts wiring)
- Architecture: pure functions, Object.freeze, data externalization ✅

**Review Notes:**
- TD-52: Dev modified 6 architect test files — 5× `extractTab()` regex helper fix (architect used `id="${tabId}"` but HTML generates `id="tab-${tabId}"`), 1× async `await` correction (architect called async factory synchronously). All modifications are infrastructure corrections — zero assertion changes, test intent 100% preserved. No SCOPE VIOLATION REQUEST filed

## V1-M29: HTML Runtime Fixes (DONE — reviewer APPROVED)

**Branch:** `feature/V1-M29-html-runtime-fixes`
**Scope:** 8 files, +246/-292 LOC (implementation commit)
**What:** Closes 5 cross-profile visual quality issues found by /deep-e2e per-tab analysis on 3 profiles:

| # | Task | Description | Status |
|---|------|-------------|--------|
| W-1 | Init evidence chain | `runInit` creates genesis evidence entry; idempotent — re-run skips if chain valid | ✅ GREEN |
| W-2 | Findings completeness | Render ALL findings (not truncated to 2), each card has `complior fix` command, profile-aware filter by `appliesToRole` | ✅ GREEN |
| W-3 | Laws strict filter | Strict role+risk+domain filter on obligations; disclaimer only when `excludedCount > 0` | ✅ GREEN |
| W-4 | Documents strict filter | FRIA only for high-risk, declaration-of-conformity only for provider; disclaimer with specific exclusion reasons | ✅ GREEN |
| W-5 | Actions filter | Remove deprecated `passport init` from action plan suggestions | ✅ GREEN |

- Tests: 2616 GREEN (2405 TS + 211 Rust), 2 skipped
- 2 superseded V1-M27 test files deleted (documents-profile-filter, laws-profile-filter) — replaced by M29 strict filter tests
- `no-iso42001-doc-types.test.ts` updated to exclude `.test.ts` files from iso42001 scan
- Architecture: pure functions, profile-aware filtering, clean disclaimer logic ✅

**Review Notes:**
- TD-53: Dev modified 3 architect test files (171 insertions, 42 deletions). Changes: (a) added `explanation`, `layer`, `title` fields to test fixtures (required by HTML rendering pipeline — data infrastructure), (b) scoped FRIA/declaration assertions to doc-cards only (not disclaimer text — assertion correction), (c) rewrote findings profile test with explicit role-based assertions (test strengthened). No assertion weakening. Recurring pattern from V1-M27 TD-52 — architect test data lags behind type contracts
- TD-54: `runInitForProject` alias in init-service.ts identical to `runInit` — unnecessary wrapper
- TD-55: `as unknown as` cast for `appliesToRole` in renderTabFindings — should use extended type

## G-M02.5: Remediation Pipeline (RED — feature branch)

**Branch:** `feature/G-M02.5-remediation-pipeline`
**What:** Guard API integration for remediation pipeline. T-5/T-6 DONE, T-7 RED.
**Note:** Guard is a separate repo (`~/guard/guard/`). This milestone depends on Guard progress.

---

## Known Issues (Out of Scope)

- I-02: Obligation vs check count — needs product decision
- I-03: Version mismatch 0.9.9 vs 0.10.0 — coordinated version bump at release
- I-04: Agent-scoped scan — design decision pending
- U-04: `scan --quiet` too verbose — tracked as TD-38
- `audit`, `evidence`, `registry` sync endpoints not validated (no contract schemas yet)

---

## Process Gap: Why project-state.md Falls Behind

**Root cause:** No protocol step triggers project-state update at merge time.

| Event | Who updates project-state? | Result |
|-------|---------------------------|--------|
| Feature review | Reviewer ✅ | Updated during review |
| Merge feature → dev | User merges, **nobody updates** | ❌ Status stays "pending merge" |
| Merge dev → main | User merges, **nobody updates** | ❌ Milestone not moved to "on main" |
| Fast milestones (M13, M14) | No separate review cycle | ❌ Never recorded at all |

**Fix:** Architect adds post-merge update step to Phase 7 protocol — after user confirms merge, architect updates project-state.md status from "pending merge" to "on dev" or "on main".
