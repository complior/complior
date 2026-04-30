# Project State — Complior v8

**Updated:** 2026-04-30
**Updated by:** Reviewer (V1-M30.6 review)
**Version:** 0.10.0 (Cargo.toml workspace + package.json)
**Branch:** `feature/V1-M30.6-fria-regression-passport-hints-ts` (V1-M30.6 FRIA filter regression fix + TS passport hints — reviewed, APPROVED)

---

## Current Status

| Component | Status | Tests |
|-----------|--------|-------|
| TS Engine (`engine/core/`) | GREEN | 2459 passed, 2 skipped (202 files) — full unit suite |
| Rust CLI (`cli/`) | GREEN | 215 passed, fmt clean |
| tsc --noEmit | PASS | — |
| cargo clippy --all-targets -D warnings | PASS | — (TD-61 fixed in V1-M30.5 merge) |
| cargo fmt --check | PASS | — |
| SDK (`engine/sdk/`) | Not in this repo | — |

**V1-M30.6 new tests: 5 RED→GREEN (4 TS passport-hints + 1 restored FRIA doc-filter) + V1-M30 integration regression GREEN**
**V1-M30.6 process: dev filed SCOPE VIOLATION REQUEST for passport-presence.test.ts — architect handled (first correct process since TD-62 pattern)**
**V1-M30.5 new tests: 8 GREEN (7 TS in v1m30-5-doc-links-actions.test.ts + 1 Rust user_facing_init_hints) — all RED→GREEN**
**V1-M30.4 new tests: 26 GREEN (21 tab-ux + 2 agent-aliases + 3 Rust CLI agent/passport) — all RED→GREEN, no test weakening**
**V1-M30.3 new tests: 4 GREEN (auto-detect-timeout W-1.1/1.2/1.3 + W-2.1) — all RED→GREEN, no test weakening**
**V1-M30.2 new tests: 17 GREEN (10 format-dates + 6 tests-tab-ux + 1 E2E integration) — all RED→GREEN, no test weakening**
**V1-M30.1 regression check: 2/2 GREEN (evidence-chain genesis survives trim)**
**Adapter regression check: 41/41 GREEN (37 existing + 4 new)**

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
| V1-M29 | HTML Runtime Fixes (5 cross-profile UX issues) | `feature/V1-M29-html-runtime-fixes` | DONE (merged to main, PR #27) |
| V1-M30 | HTML Runtime Integration (5 integration tests replacing mock-driven tests) | `feature/V1-M30-html-runtime-integration` | DONE (reviewer APPROVED, ready for PR) |
| V1-M30.1 | Evidence chain genesis survives MAX_ENTRIES trim | `feature/V1-M30.1-evidence-chain-genesis-trim` | DONE (reviewer APPROVED) |
| V1-M30.2 | Tests tab UX polish + date humanization (5 HR-T fixes) | `feature/V1-M30.2-tests-tab-ux-polish` | DONE (reviewer APPROVED, ready for PR) |
| V1-M30.3 | Eval auto-detect timeout race fix (3s→15s) + script AI_TARGET patch | `feature/V1-M30.3-eval-adapter-detect-timeout-fix` | DONE (reviewer APPROVED WITH NOTES — see TD: script lines 292/374 still use `${AI_TARGET}/health` which now 404s) |
| V1-M30.4 | Tab UX polish (7 areas) + CLI passport→agent rename + TD-57/TD-58 | `feature/V1-M30.4-tabs-ux-rename-tech-debt` | DONE (reviewer APPROVED, ready for PR) |
| V1-M30.5 | Doc file:// links + action emojis + MD date humanized + CLI hint rename | `feature/V1-M30.5-doc-links-action-emojis-md-date` | DONE (merged to dev, PR #33) |
| V1-M30.6 | FRIA filter regression fix + TS engine passport→agent hints | `feature/V1-M30.6-fria-regression-passport-hints-ts` | DONE (reviewer APPROVED) |
| G-M02.5 | Remediation Pipeline (Guard integration) | `feature/G-M02.5-remediation-pipeline` | RED (T-7 pending) |

---

## V1-M30.6: FRIA Filter Regression + TS Engine Passport Hints (DONE — reviewer APPROVED)

**Branch:** `feature/V1-M30.6-fria-regression-passport-hints-ts`
**Commits:** 3 (0f9f718 architect spec+RED+test-restoration, 74f68c8 architect test-update for passport-presence, ed6b674 nodejs-dev W-1.2+W-2)
**Files:**
- Spec: `docs/sprints/V1-M30.6-fria-regression-passport-hints-ts.md` (+109)
- RED test restoration: `engine/core/src/domain/reporter/html-documents-strict-filter.test.ts` (+15/-5) — architect reverted V1-M30.5 W-2 flip
- New RED test: `engine/core/src/domain/reporter/v1m30-6-ts-passport-hints.test.ts` (+70, 4 tests)
- Architect test update: `engine/core/src/domain/scanner/checks/passport-presence.test.ts` (+5/-1) — `passport init` → `agent init` assertion
- Implementation W-1.2: `engine/core/src/domain/reporter/html-renderer.ts` (+36/-19) — FRIA risk-level filter restored
- Implementation W-2: `engine/core/src/domain/reporter/priority-actions.ts` (+1/-1), `engine/core/src/domain/registry/compute-agent-score.ts` (+2/-2), `engine/core/src/domain/scanner/checks/passport-presence.ts` (+1/-1), `engine/core/src/domain/scanner/checks/passport-completeness.ts` (+2/-2) — 6× `passport` → `agent`

**Section W-1.2 — FRIA risk-level filter restoration (REGRESSION FIX):**
- `isDocumentApplicable()` now has 2 clearly documented rules (applied in order):
  - Rule 1: Declaration of Conformity (Art. 47) → deployer-only restriction
  - Rule 2: FRIA / Art. 27 → shown ONLY for `high` or `unacceptable` risk levels
- Comment block rewritten with full rationale + V1-M30 W-4 spec reference + regression note
- Disclaimer updated: shows "(FRIA Art. 27 — high-risk only)" when FRIA is the sole excluded doc
- V1-M30 W-4 INTEGRATION test (`v1m30-documents-integration.test.ts`) was RED → now GREEN (4/4)
- V1-M29 W-4 unit test restored to original assertion ("FRIA NOT shown") → GREEN

**Section W-2 — TS engine passport→agent hints:**
- 6 string replacements across 4 files (1:1 `complior passport <verb>` → `complior agent <verb>`):
  - `priority-actions.ts:128`: `complior agent init`
  - `compute-agent-score.ts:89`: `complior agent fria ${ctx.name}`
  - `compute-agent-score.ts:93`: `complior agent init --force`
  - `passport-presence.ts:68`: `complior agent init`
  - `passport-completeness.ts:63`: `complior agent init --force`
  - `passport-completeness.ts:75`: `complior agent init --force`

**Quality gates:**
- 5/5 new RED tests GREEN (4 TS passport-hints + 1 restored FRIA doc-filter)
- V1-M30 integration regression: 4/4 GREEN (was RED before W-1.2)
- Full unit suite: 2459 passed / 2 skipped / 0 failed (was 2455, +4 new)
- Full Rust suite: 215 passed (unchanged — no Rust changes)
- tsc --noEmit: clean | cargo fmt --check: clean | cargo clippy --all-targets -D warnings: clean

**Architecture audit:**
- `isDocumentApplicable` remains a pure function — no mutation, readonly params ✅
- 2-rule filtering order is deterministic and well-documented ✅
- String replacements are source-text-only — zero logic changes ✅
- Disclaimer labels are profile-aware (Declaration for deployer, FRIA for non-high-risk) ✅

**Scope audit:**
- nodejs-dev (ed6b674): touched ONLY 5 `engine/core/src/domain/` files — zero test files, zero Rust files, zero docs ✅
- Architect (0f9f718): spec + RED tests + test restoration ✅
- Architect (74f68c8): `passport-presence.test.ts` assertion update — per dev's SCOPE VIOLATION REQUEST ✅
- **Dev did NOT modify ANY test files** — `git diff 74f68c8..ed6b674 -- '*.test.ts'` is EMPTY ✅
- **PROCESS WIN:** Dev filed SCOPE VIOLATION REQUEST for `passport-presence.test.ts` instead of modifying it silently. Architect handled the test update in a separate commit. This is the CORRECT process — first time since TD-62 recurring pattern began (V1-M27 TD-52 → V1-M29 TD-53 → V1-M30.5 TD-62). Lesson learned ✅

**Reviewer notes:**
- No blocking issues
- Minor cosmetic: disclaimer line 964 uses `excludedCount === 1` guard — when BOTH Declaration AND FRIA are excluded (deployer+limited), only Declaration gets its own parenthetical; FRIA appears as excluded link but without explicit label. Non-blocking — the information is still conveyed
- No new tech debt

---

## V1-M30.5: Doc Links + Action Emojis + MD Date Humanized (DONE — reviewer APPROVED WITH NOTES)

**Branch:** `feature/V1-M30.5-doc-links-action-emojis-md-date`
**Commits:** 3 (8d4564a spec+RED, 0584cfd rust-dev W-5, 2d443b8 nodejs-dev W-1..W-4)
**Files:**
- Spec: `docs/sprints/V1-M30.5-doc-links-action-emojis-md-date.md` (+135)
- RED tests: `engine/core/src/domain/reporter/v1m30-5-doc-links-actions.test.ts` (+191, 7 tests), `cli/src/headless/tests.rs` (+56, 1 test)
- Implementation W-1: `engine/core/src/domain/reporter/report-builder.ts` (+1) — `projectPath` field on summary
- Implementation W-1: `engine/core/src/domain/reporter/types.ts` (+2) — `projectPath?: string | null` on `ReportSummary`
- Implementation W-2: `engine/core/src/domain/reporter/html-renderer.ts` (+72/-48) — `resolveDocumentPath()` pure helper, FRIA filter removed, command-dedup removed, passport-init filter removed
- Implementation W-3: Actions tab renders ALL actions with emoji prefix (no dedup/filter)
- Implementation W-4: `engine/core/src/domain/reporter/compliance-md.ts` (+3/-1) — humanized timestamp via `formatDateTimeHuman`
- Implementation W-5: `cli/src/app/executor.rs` (+3/-3), `cli/src/headless/commands.rs` (+1/-1), `cli/src/headless/passport.rs` (+6/-6), `cli/src/headless/scan.rs` (+1/-1), `cli/src/views/passport/mod.rs` (+1/-1) — 12 string replacements `passport init` → `agent init`
- Test corrections: `actions-no-deprecated-passport-init.test.ts` (+22/-13), `html-documents-strict-filter.test.ts` (+19/-13) — V1-M29 specs superseded by V1-M30.5

**Section W-1+W-2 — Document file:// links (REAL BUG FIX):**
- `ReportSummary.projectPath?: string | null` — new optional field, populated from `scanResult.projectPath` in `report-builder.ts`
- `resolveDocumentPath(outputFile, projectPath)` — exported pure function with JSDoc: absolute path → as-is, relative + projectPath → resolved, fallback → `process.cwd()` (degraded path with comment)
- Both doc-cards AND excluded-links sections use the helper consistently
- **Resolves TD-60** (process.cwd() in renderer)

**Section W-2 — FRIA filter behavior change:**
- `isDocumentApplicable()` no longer excludes FRIA for limited-risk profiles
- FRIA is now shown for ALL profiles as a reference document (even when not strictly required)
- Declaration-of-Conformity remains deployer-only (Art. 47 — correct per EU AI Act)
- Disclaimer explains which documents are not required for the profile

**Section W-3 — Actions tab (REAL BUG FIX):**
- Legacy `passport init` filter REMOVED (V1-M11 was 5+ months ago; action plan no longer generates these)
- Command-based dedup REMOVED (was collapsing distinct actions with same `command` e.g. "manual review")
- `let actions` → `const actions` (immutability improvement)
- Each action now renders with source emoji prefix via `sourceIcon()` (📋 obligation, 🔍 scan, 🤖 passport, etc.)

**Section W-4 — MD date humanization:**
- `compliance-md.ts` imports `formatDateTimeHuman` from existing `format-dates.ts` (V1-M30.2)
- "Generated by Complior on …" line now shows "April 29, 2026 at 14:55 UTC" instead of raw ISO

**Section W-5 — CLI hint rename:**
- 12 string replacements across 5 Rust files: `complior passport init` → `complior agent init`
- Deprecation warning in `main.rs` intentionally preserved (correctly names the deprecated command)

**Quality gates:**
- 8/8 new RED tests GREEN (7 TS + 1 Rust)
- Full unit suite: 2455 passed / 2 skipped / 0 failed (was 2448, +7)
- Full Rust suite: 215 passed (was 214, +1)
- tsc --noEmit: clean | cargo fmt --check: clean
- cargo clippy: ❌ FAIL — 1 error in architect's RED test (`tests.rs:2004`, `manual-assert` lint). See TD-61

**Architecture audit:**
- `resolveDocumentPath` is pure function with JSDoc, exported named export ✅
- `projectPath` field is optional — backward-compatible with all existing tests ✅
- `isDocumentApplicable` FRIA change is well-documented with inline comment explaining rationale ✅
- Actions tab now uses `const` (was `let`), removes both filters cleanly ✅
- MD humanization reuses existing `formatDateTimeHuman` — no new code ✅
- Rust changes are string-literal-only, no logic changes ✅

**Scope audit:**
- rust-dev (0584cfd): touched ONLY `cli/` files — zero TypeScript files ✅
- nodejs-dev (2d443b8): touched ONLY `engine/core/src/domain/reporter/` — zero Rust files ✅
- Architect's NEW test file `v1m30-5-doc-links-actions.test.ts` NOT modified by dev ✅
- Two V1-M29 test files modified by dev (TD-62, see below)

**Reviewer notes:**
- **BLOCKING:** TD-61 — architect must fix clippy lint (`if { panic! }` → `assert!()`) in `tests.rs:2004` before merge
- **NON-BLOCKING:** TD-62 — dev modified 2 V1-M29 test files without SCOPE VIOLATION REQUEST. Both are justified spec supersessions (V1-M30.5 spec explicitly changes FRIA filtering and actions dedup behavior). No assertions weakened — old specs directly contradicted new milestone. Recurring process pattern from TD-52/TD-53
- TD-60 **FIXED** by W-2: `process.cwd()` replaced by `resolveDocumentPath` with `projectPath` from scan result

---

## V1-M30.4: Tab UX Polish + CLI passport→agent + TD-57/TD-58 (DONE — reviewer APPROVED)

**Branch:** `feature/V1-M30.4-tabs-ux-rename-tech-debt`
**Commits:** 4 (5bf2bda spec+RED+TD script, 9556c89 rust-dev B.1, 56490ac architect fmt fix, 5466767 nodejs-dev A+B.2 committed by architect)
**Files:**
- Spec: `docs/sprints/V1-M30.4-tabs-ux-rename-tech-debt.md` (+211)
- RED tests: `engine/core/src/domain/reporter/v1m30-4-tab-ux.test.ts` (+265, 21 tests), `engine/core/src/http/routes/agent-aliases.test.ts` (+85, 2 tests), `cli/src/headless/tests.rs` (+95, 3 tests)
- Implementation A (UX): `engine/core/src/domain/reporter/html-renderer.ts` (+187/-24), new `source-icons.ts` (+21)
- Implementation B.1 (CLI): `cli/src/cli.rs` (+13/-3), `cli/src/main.rs` (+11)
- Implementation B.2 (HTTP): `engine/core/src/http/routes/passport.route.ts` (+34/-24)
- Tech debt C: `scripts/verify_truly_deep_e2e.sh` (+5/-3) — TD-57 humanized dates, TD-58 rendered-card count

**Section A — Tab UX polish (7 sub-areas, all GREEN via 21-test it.each over 9 tabs):**
- A.1: tab intros (`<p class="tab-intro">`) on all 9 tabs (overview, tests, findings, laws, documents, fixes, passports, actions, timeline)
- A.2: findings cards display amber `Fix applied — re-scan to verify` badge when checkId in fixHistory
- A.3: laws obligations get status badge (✅ Covered / ⏳ Pending / 🚨 Past-due) + clickable linkedCheck anchors
- A.4: documents render file:// links (using process.cwd() for relative path resolution) + 4-status legend at top
- A.5: fixes rows where scoreBefore===scoreAfter explicitly explain "no overall change (single-dimension improvement, expected)"
- A.6: actions get source emoji prefix (📋/🔍/📄/🤖/🧪) + green "✓ Done" badge if id matched in fixHistory
- A.7: tests sorted failed-first via pure `sortTestsFailedFirst` (returns sliced copy, no input mutation; verdict→severity→confidence)

**Section B — CLI rename `passport` → `agent`:**
- B.1 (rust-dev): `Agent { action: PassportAction }` enum variant added as PRIMARY; existing `Passport` kept as deprecated alias that prints yellow `⚠ Deprecated: 'complior passport' is now 'complior agent'` to stderr (preserves JSON/SARIF stdout for CI). Same `PassportAction` enum, same handler, same internal types — zero subcommand drift. All 200+ existing passport E2E tests still pass.
- B.2 (nodejs-dev): `onBoth(method, suffix, handler)` helper registers each handler under both `/passport/*` and `/agent/*`. 16 routes aliased, no new endpoints, identical response shapes. `InitRequestSchema.path` made optional so empty-body POST `/agent/init` falls back to env-based getProjectPath().

**Section C — Tech debt:**
- TD-57 (timeline analyzer): `verify_truly_deep_e2e.sh` lines 647-648 now accept humanized dates (`August 2, 2026`) alongside raw ISO (`2026-08-02`) for V1-M30.2 compat
- TD-58 (findings analyzer): line 532 now counts rendered `<div class="finding-card"` instead of `len(data.findings)` — so profile-aware filter is genuinely measured (Profile A=20, B/C=24)
- TD-59 (ed25519/HMAC unification): DEFERRED to v1.0.1 per spec (internal architecture only, no user-facing impact)

**Quality gates:**
- 26/26 new RED tests GREEN (21 tab-ux + 2 agent-aliases + 3 CLI agent/passport)
- V1-M30.1 + V1-M30.2 E2E regression: 3/3 GREEN
- V1-M30.3 regression: 4/4 GREEN
- Full unit suite: 2448 passed / 2 skipped / 0 failed (was 2425 + 23 new + drift)
- Full Rust suite: 214 passed (was 211 + 3 new)
- tsc --noEmit: clean | cargo fmt --check: clean | cargo clippy --all-targets -D warnings: clean

**Architecture audit:**
- `Object.freeze` applied to SOURCE_ICONS, VERDICT_PRIORITY, SEVERITY_PRIORITY constants
- `sortTestsFailedFirst` is pure — `[...tests].sort(...)` returns a sorted COPY (does NOT mutate input)
- `sourceIcon()` is pure — single named export, no side effects
- `onBoth()` helper avoids route duplication; 1:1 alias mapping verified — no ad-hoc routes
- Deprecation warning on `Passport` variant goes to **stderr** only (eprintln!), `Agent` invocation prints nothing — JSON/SARIF stdout stays clean for CI consumers
- Internal types (`AgentPassport`, `PassportAction`, `run_passport_command`) intentionally NOT renamed — they correctly model the document concept; only the user-facing CLI verb changed

**Scope audit:**
- rust-dev (9556c89): touched ONLY `cli/src/cli.rs` + `cli/src/main.rs` — zero TypeScript files touched
- nodejs-dev work (5466767, committed by architect because dev finished without committing): touched ONLY `engine/core/src/domain/reporter/html-renderer.ts`, new `source-icons.ts`, `engine/core/src/http/routes/passport.route.ts` — zero Rust files touched
- architect (5bf2bda + 56490ac): only architect-owned files (spec, RED tests, script for tech debt). 56490ac is rustfmt-only whitespace fix (3 lines, line break in boolean expression — semantics identical, verified via diff)
- No V1-M30.1, V1-M30.2, V1-M30.3 RED tests modified
- No process violations observed

**Reviewer notes (NON-BLOCKING):**
- Minor concern: `process.cwd()` is read inside `renderTabDocuments` (lines 885, 922) for resolving relative document paths to absolute file:// URLs. This is a side-effect read in an otherwise pure renderer. Acceptable because it's a UX cosmetic in a leaf renderer (not domain logic), and the renderer is invoked at report-generation time only. Could be hoisted to a parameter in a future refactor — tracked as TD-60.
- TD-59 (ed25519/HMAC unification) confirmed deferred to v1.0.1 per the spec.

---

## V1-M30.3: Eval Auto-Detect Timeout Race Fix (DONE — reviewer APPROVED WITH NOTES)

**Branch:** `feature/V1-M30.3-eval-adapter-detect-timeout-fix`
**Commits:** 2 (9ba1ff7 spec+RED+script Part A, aaac8ae engine Part B)
**Files:** docs/sprints/V1-M30.3-eval-adapter-detect-timeout-fix.md (+122), engine/core/src/domain/eval/adapters/auto-detect-timeout.test.ts (+84), engine/core/src/domain/eval/adapters/auto-detect.ts (+26/-3), scripts/verify_truly_deep_e2e.sh (+8/-4)

**Root cause (verified cold reproduction):**
/deep-e2e Profile B (provider/high/healthcare) `--full` returned ALL 635 eval tests as `verdict: error` with `AdapterError: API error 404: non-JSON response`. Profiles A and C succeeded (87/B and 88/B). The race lived in `tryOpenAIPost`'s 3-second timeout: when the local AI server proxies to OpenRouter and the LLM is cold, the round-trip exceeds 3 s → returns false → autoDetectAdapter falls back to the generic http adapter → http adapter POSTs to root path / → AI server 404s with HTML → all tests error.

**Two-part fix:**
- **Part A (architect, scripts):** AI_BASE/AI_TARGET split. AI_BASE defaults to `http://127.0.0.1:4000` (used for `/health` probes inside `spawn_ai_server` / `ensure_ai_server`); AI_TARGET defaults to `${AI_BASE}/v1/chat/completions` (used for the eval target). Path heuristic in auto-detect.ts:135 catches the explicit `/v1/chat/completions` URL and skips the slow LLM probe entirely. Verified manually: Profile B with explicit URL yields adapterName=openai, overall=92 (A), 136 pass / 10 fail / 0 err.
- **Part B (nodejs-dev, engine):** `OPENAI_POST_PROBE_TIMEOUT_MS` named const = 15_000 ms (export). `tryOpenAIPost` now exported (was internal). `tryOpenAIPost(url, model, key, timeout = OPENAI_POST_PROBE_TIMEOUT_MS)`. `AutoDetectOptions.logger?: { warn(msg: string): void }` optional DI logger. `autoDetectAdapter` emits a single `opts.logger?.warn(...)` before the http fallback so callers can diagnose the surprise. NO global logger import. Adapter selection priority order unchanged. Backward compat: existing callers without logger continue to work.

**Quality gates:**
- 4/4 new RED tests GREEN (W-1.1 const exported, W-1.2 ≥15000, W-1.3 succeeds at 5s, W-2.1 warn on http-fallback)
- Adapter folder regression: 41/41 GREEN (was 37 + 4 new)
- V1-M30.1 + V1-M30.2 E2E regression: 3/3 GREEN
- Full unit suite: 2425 passed / 2 skipped / 0 failed (was 2421, +4)
- tsc --noEmit: clean | cargo fmt --check: clean | cargo clippy --all-targets -D warnings: clean
- Architecture audit: pure DI logger (no global import), named const (no magic number), backward-compat optional, priority order unchanged.
- Scope audit: dev touched ONLY `engine/core/src/domain/eval/adapters/auto-detect.ts`. Did NOT touch the RED test file, did NOT touch cli/, scripts/, docs/, or any other engine module.

**Reviewer note (NON-BLOCKING — flagged as tech debt for architect to fix in /deep-e2e re-run):**
- `scripts/verify_truly_deep_e2e.sh` lines 292 and 374 still call `curl -sf "${AI_TARGET}/health"`. With the new AI_TARGET = `http://127.0.0.1:4000/v1/chat/completions`, these resolve to `http://127.0.0.1:4000/v1/chat/completions/health` which 404s. Effects:
  - Line 374 (pre-flight): always falls into `spawn_ai_server`, which then correctly probes `${AI_BASE}/health` → harmless redundant work.
  - Line 292 (per-profile eval gate): the eval section is **always SKIPPED** with "AI server not reachable" because the `/health` URL never returns 200. /deep-e2e cannot end-to-end verify the V1-M30.3 fix until these two lines are flipped to `${AI_BASE}/health`. The reviewer checklist explicitly enumerated only lines ~130/~142 (which ARE correct), so this is reported as tech debt rather than a blocker for the engine fix.

---

## V1-M30.2: Tests Tab UX Polish + Date Humanization (DONE — reviewer APPROVED)

**Branch:** `feature/V1-M30.2-tests-tab-ux-polish`
**Commits:** 3 (1b5076f spec+RED, f6705e5 impl, 44a2b83 obsolete-assert relax)
**Files:** +5 / M2 (148 LOC spec, 60 LOC pure helpers, 60 LOC helper tests, 181 LOC tab-ux tests, 77 LOC E2E test, +101 LOC html-renderer, +5 LOC report-html.test relax)

**Scope (5 visible bugs in HTML report):**
- HR-T1: Tests-tab header score collapsed to 0 (F) when only `--security` ran → fall back to securityScore. Pure `pickHeaderScore()` helper, display-only (no scoring engine change).
- HR-T2: Empty Scan section now points users to Findings tab when scanner findings exist.
- HR-T3: Empty Eval/Security sections now show actionable hint (`complior eval --det <target>` etc.) instead of bare "No tests".
- HR-T4: ALL raw ISO date renders (`2026-08-02`, `2026-04-28T10:48:32.816Z`) replaced with humanized form (`August 2, 2026`, `April 28, 2026 at 10:48 UTC`) via two pure helpers in new `format-dates.ts`.
- HR-T5: "Total" stat label clarified to "Eval tests" so users distinguish from scanner findings.

**Quality gates:**
- 17/17 new RED tests GREEN (10 format-dates + 6 tests-tab-ux + 1 E2E real-HTML integration)
- Full unit suite: 2421 passed / 2 skipped / 0 failed
- V1-M30.1 regression: 2/2 GREEN
- tsc --noEmit: clean | cargo fmt --check: clean | cargo clippy: clean
- Architecture audit: format-dates.ts is pure (no I/O, locale-pinned `en-US`, UTC-pinned, returns input unchanged on invalid, JSDoc explains intent, named exports). renderTestSection extension is non-breaking (optional 6th param with `?? default` fallback). pickHeaderScore is pure.
- Scope audit: dev did NOT touch cli/, eval/, conformity-score.ts, eval-severity-scoring.ts, types.ts, or any other V1-M30/V1-M30.1 RED tests.

**Architect's relaxation patch (44a2b83):** `report-html.test.ts:272` previously asserted `toContain('2026-08-02')` which directly contradicts HR-T4 spec. Patched to `toMatch(/August\s+2,\s+2026|2026-08-02/)` — accepts BOTH humanized and raw forms, preserves the assertion's intent (countdown shows enforcement date), and is robust to either form. Justified relaxation, not a weakening; no other test files were modified.

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

## V1-M30: HTML Runtime Integration (DONE — reviewer APPROVED)

**Branch:** `feature/V1-M30-html-runtime-integration`
**Scope:** 15 files, +808/-89 LOC (full branch vs dev)
**What:** Replaces mock-driven unit tests with INTEGRATION tests that run through the real production code path (composition-root → service → renderer). Fixes 5 persistent HTML issues that passed V1-M27/M29 unit tests but failed in production:

| # | Task | Description | Status |
|---|------|-------------|--------|
| W-1 | Init evidence chain | Wired `runInit({projectPath})` in onboarding.route.ts — production `POST /onboarding/complete` now creates evidence genesis | ✅ GREEN |
| W-2 | Findings completeness | All findings render as `finding-card` (was `finding-item` for non-explanation findings). Every card has `complior fix --check-id X` command | ✅ GREEN |
| W-3 | Laws strict filter | Domain filter always active: only show obligations matching domain keywords. Generic articles (Article N) pass through. `excludedCount` from `ObligationCoverage.excludedCount` | ✅ GREEN |
| W-4 | Documents profile filter | Same domain filter applied in HTML renderer for doc-cards | ✅ GREEN |
| W-5 | Fixes tab commands | Always renders `complior fix --check-id X` (was using `f.fix` field or nothing). `appliedSection2` always shows "Applied Fixes" header | ✅ GREEN |

- Tests: 2547 passed + 14 skipped + 16 pre-existing E2E failures (unchanged from dev baseline)
- V1-M30 new integration tests: 14/14 GREEN (5 files in `e2e/v1m30-*.test.ts`)
- No existing tests modified by dev
- Architecture: `OnboardingRouteDeps` interface (clean DI), `excludedCount` on `ObligationCoverage` type, domain-aware obligation filtering in `obligation-coverage.ts` + `html-renderer.ts`

**Review Notes:**
- Dev did NOT modify any test files (clean `git diff ab56806..fabb274 -- '*.test.ts'` = empty) ✅
- Implementation touches 9 files — all within `engine/core/src/` (nodejs-dev scope) ✅
- TD-56: `domainKeywords` object duplicated in `obligation-coverage.ts` (lines 49-56 and lines 128-135) and `html-renderer.ts` (lines 573-580). Should be extracted to shared utility
- TD-55 persists (from V1-M29): `as unknown as` cast for `appliesToRole` in `renderTabFindings`
- TD-54 persists (from V1-M29): `runInitForProject` alias identical to `runInit`
- Missing newline at end of `onboarding.route.ts` (cosmetic)

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
