# Project State — Complior v8

**Updated:** 2026-04-24
**Updated by:** Reviewer (V1-M22 review)
**Version:** 0.10.0 (Cargo.toml workspace + package.json)
**Branch:** `feature/V1-M22-release-blockers` (pending merge to dev)

---

## Current Status

| Component | Status | Tests |
|-----------|--------|-------|
| TS Engine (`engine/core/`) | GREEN | 2310 passed, 2 skipped (175 files) |
| Rust CLI (`cli/`) | GREEN | 207 passed (0 failed) |
| tsc --noEmit | PASS | — |
| cargo clippy | PASS | — |
| SDK (`engine/sdk/`) | Not in this repo | — |

**Total: 2517 tests GREEN**

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

## In Progress / RED

| Milestone | Description | Branch | Status |
|-----------|-------------|--------|--------|
| V1-M22 E | Test infrastructure fixes (architect scope) | `feature/V1-M22-release-blockers` | Pending (after review) |
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
