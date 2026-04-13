# Project State

> Last updated: 2026-04-13
> Status: V1-M01..M04 DONE · V1-M05 partial · V1-M06 DONE · V1-M08 DONE · V1-M09 DONE (onboarding enrichment) · V1-M07 RED (ISO 42001 — awaiting dev) · **REVIEWER APPROVED V1-M09** — awaiting architect ratify TD-5/6, resolve TD-7, then user merge

## Overview

Complior v8 — EU AI Act compliance toolkit: CLI + Daemon + TUI + MCP Server + TypeScript SDK.

**Key distinction from ariadne/Olympus:** This is a developer tooling project (static analysis + dynamic testing + runtime middleware), not a 3D visualization or embedded systems project. Workflow: `Vision → Strategy → Feature Area → Milestone → Test Specs → Code`.

---

## Document Hierarchy

```
docs/PRODUCT-VISION.md       → Product Vision
docs/STRATEGY.md            → Roadmap
docs/feature-areas/*.md     → Feature Area (КАК УСТРОЕНА подсистема)
docs/sprints/V1-M0X-*.md    → V1 Milestones
tests/*.test.ts             → Test Specs (RED)
cli/, engine/                → Code (GREEN)
```

---

## Feature Areas

| ID | Name | Source | Status |
|----|------|--------|--------|
| FA-01 | Scanner Architecture | `docs/SCANNER.md` | ✅ Done |
| FA-02 | Eval Architecture | `docs/EVAL.md` | ✅ Done |
| FA-03 | Fix Architecture | `docs/FIX.md` | ✅ Done |
| FA-04 | Passport Architecture | `docs/FEATURE-AGENT-PASSPORT.md` + `docs/PASSPORT-DATA-PIPELINE.md` | ✅ Done |
| FA-05 | Report Architecture | `docs/REPORT.md` | ✅ Done |
| FA-06 | SDK Architecture | `docs/SDK.md` | ✅ Done |
| FA-07 | TUI Architecture | `docs/TUI-DESIGN-SPEC.md` | ✅ Done |
| FA-08 | MCP Architecture | `docs/MCP-UNIFIED-PLAN.md` | ✅ Done |

---

## Milestones

| ID | Status | Feature Areas | Branch | Merged |
|----|--------|---------------|--------|--------|
| V1-M01 | ✅ MERGED | FA-01..03, FA-05 — pipeline acceptance | `feature/reporter` | 2026-04-11 |
| V1-M02 | ✅ DONE | FA-04 (Passport), FA-01 (Scanner) — all CLI flags E2E (36 tests) | `feature/reporter` | 2026-04-11 |
| V1-M03 | ✅ DONE | All — docs, CI, version bump, release polish | `feature/reporter` | 2026-04-11 |
| V1-M04 | ✅ DONE | All FA — full CLI flag binary E2E + engine flags | `feature/reporter` | 2026-04-11 |
| V1-M05 | ⏳ PARTIAL | All FA — 57 TS type errors fixed, CI typecheck re-enabled. Release pending. | `feature/reporter` | — |
| V1-M06 | ✅ DONE | FA-07 (TUI) — UX quality sprint, 11 RED→GREEN | `feature/V1-M06-ux-quality` | — |
| V1-M07 | 🔴 RED | FA-04 (Passport), FA-05 (Report) — ISO 42001 Document Generators. Specs ready, awaiting dev. | `feature/V1-M07-iso42001` | — |
| V1-M08 | ✅ DONE | FA-01 (Scanner) — Context-Aware Scan: profile filters, risk-level, filterContext | `feature/V1-M08-context-scan` | — |
| V1-M09 | ✅ DONE | Onboarding Enrichment — 9 questions, dynamic obligation filtering, reconfigure, GPAI auto-detect | `feature/V1-M09-onboarding-enrichment` | — |

> Old milestones (M01-M04, S01-S12) archived to `docs/old/sprints/`

---

## Architecture Summary

### CLI (Rust)

```
complior scan [--deep|--llm|--cloud]   # static code analysis (5 layers)
complior eval --target <url> [--llm|--security|--full]  # dynamic AI testing
complior fix [--dry-run|--ai]         # auto-remediation
complior agent init                   # passport generation
complior report [--json|--format markdown|pdf]  # compliance report
```

### Daemon (Node.js)

- HTTP API for TUI + CLI
- File watcher (chokidar: auto-rescan)
- MCP Server for external agents
- State store (in-memory + disk)

### TUI (Rust + ratatui)

9 pages: Dashboard, Scan, Fix, Passport, Obligations, Timeline, Report, Log, Chat

### SDK (@complior/sdk)

Runtime middleware: pre-hooks → LLM call → post-hooks (EU AI Act compliance in production)

---

## Key Files

| Path | Purpose |
|------|---------|
| `cli/` | Rust CLI (TUI, commands) |
| `engine/core/` | Node.js engine (scanner, eval, fixer, passport, reporter) |
| `engine/sdk/` | TypeScript SDK (@complior/sdk) |
| `docs/feature-areas/` | Feature Area specifications |
| `docs/sprints/` | V1 milestone specs |

---

## Test Status (2026-04-13)

| Suite | Count | Status |
|-------|-------|--------|
| Engine TS (vitest) | 2261 passed, 10 skipped | ✅ GREEN (166 files) |
| CLI Rust (cargo test) | 199 | ✅ GREEN |
| **Total** | **2460** | ✅ **ALL GREEN** |
| Acceptance: verify_pipeline.sh | 9/9 checks | ✅ PASS |
| Acceptance: verify_report_export.sh | 6/6 checks | ✅ PASS |
| E2E: pipeline-e2e.test.ts | 5 passed, 1 skipped (LLM — no key) | ✅ GREEN |
| E2E: gaps-e2e.test.ts | 9 passed | ✅ GREEN |
| E2E: report-html.test.ts | 11 passed | ✅ GREEN |
| E2E: ci-flags-e2e.test.ts | 7 passed, 3 skipped (eval target — no env) | ✅ GREEN |
| E2E: context-scan-e2e.test.ts | 5 passed (V1-M08) | ✅ GREEN |
| E2E: onboarding-enrichment-e2e.test.ts | 6 passed (V1-M09) | ✅ GREEN |

---

## V1-M01 Delivery (feature/reporter → main)

**Merged:** 2026-04-11
**Branch:** `feature/reporter`
**Commits:** 9 commits (d876da6..43e8706)

### What was delivered:

| Component | Description |
|-----------|-------------|
| Reporter 9-tab HTML | `engine/core/src/domain/reporter/html-renderer.ts` — full 9-tab compliance report |
| Eval scoring | `domain/eval/conformity-score.ts` — grade A-F + N/A per category |
| Scan modes | Per-mode score tracking (deterministic / llm / security / full) |
| Sync contract | `src/types/sync.types.ts` — SyncPassportSchema, SyncScanSchema, SyncDocumentsSchema, SyncFriaSchema |
| CLI report command | `cli/src/headless/format/report.rs` — human-readable report output |
| Acceptance scripts | `scripts/verify_pipeline.sh`, `scripts/verify_report_export.sh` (+ llm + no-key variants) |
| E2E pipeline tests | `src/e2e/pipeline-e2e.test.ts` (5 tests) |
| Report builder tests | `src/domain/reporter/report-builder.test.ts` (717 lines, comprehensive) |
| Sync contract tests | `src/types/sync-contract.test.ts` (196 lines) |

---

## V1-M02 Delivery (feature/reporter)

**Completed:** 2026-04-11 | **Status:** DONE

| Component | Description |
|-----------|-------------|
| E2E flag tests (36) | Full CLI flag matrix via Hono in-memory HTTP — scan/eval/fix/report/agent |
| `verify_agent_cli.sh` | Acceptance: agent init/list/show/validate/completeness/fria/evidence CLI |
| `verify_api_key_handling.sh` | Acceptance: LLM flag passthrough, no-key fallback |
| Headless runners | All CLI flags wired in Rust headless: scan, eval, fix, report, agent |

---

## V1-M03 Delivery (feature/reporter)

**Completed:** 2026-04-11 | **Status:** DONE

| Component | Description |
|-----------|-------------|
| CI rules | `.github/workflows/ci.yml` — fmt, clippy, vitest, cargo audit |
| Docs polish | Scope-guard updated with merge/CI rules |
| Version bump | Cargo.toml + package.json version aligned |
| `verify_ci.sh` | Acceptance: CI pipeline smoke test |

---

## V1-M04 Delivery (feature/reporter)

**Branch:** `feature/reporter` | **Status:** ✅ DONE (automated tests GREEN, acceptance scripts require binary build)

| Component | Description |
|-----------|-------------|
| `engine/core/src/e2e/ci-flags-e2e.test.ts` | 10 tests: SARIF fields, threshold, diff/regression, markdown, report outputPath, eval flags (3 skipped — env-gated) |
| `scripts/verify_cli_flags.sh` | 15 CLI binary checks: JSON/SARIF/CI/quiet/fail-on/fix-source/report/agent |
| `scripts/verify_eval_flags.sh` | 8 checks (requires COMPLIOR_EVAL_TARGET): det/ci/json/last/failures/verbose/categories |
| outputPath fix | `fix(V1-M04): pass outputPath to generateMarkdown endpoint` — `POST /report/status/markdown` now forwards outputPath |

**Remaining:** `cargo build --release` + `bash scripts/verify_cli_flags.sh` — требует binary в PATH.

---

## V1-M08 Delivery (feature/V1-M08-context-scan)

**Completed:** 2026-04-13 | **Status:** ✅ DONE — REVIEWER APPROVED (with scope violation noted as TD-15)

**Branch:** `feature/V1-M08-context-scan` (5 commits: acbae26..ecc500e)

### What was delivered:

| Component | Description |
|-----------|-------------|
| ScanFilterContext type | `types/common.types.ts` — role, riskLevel, domain, profileFound, obligation/skip counts |
| Zod schema | `types/common.schemas.ts` — ScanFilterContextSchema |
| Risk-level filter | `domain/scanner/risk-level-filter.ts` — filters findings by project risk level (mirrors role-filter) |
| Profile-aware scan | `services/scan-service.ts` — `applyProfileFilters()` replaces `applyRoleFilter()`, supports getProjectProfile + legacy getProjectRole fallback |
| Obligation coverage | `domain/reporter/obligation-coverage.ts` — `riskApplies()` filter for risk level |
| Scan route topActions | `http/routes/scan.route.ts` — top-3 priority actions in scan response |
| Fix route filterContext | `http/routes/fix.route.ts` — filterContext from last scan in fix response |
| Composition root wiring | `composition-root.ts` — getProjectProfile closure wired |
| check-to-obligations data | `data/check-to-obligations.json` — expanded mappings for fria, conformity-assessment |
| Rust types | `cli/src/types/engine.rs` — ScanFilterContext + TopAction structs |
| Contract tests | `types/contract.test.ts` + `cli/src/contract_test.rs` — schema+sample extended |

### Test specs delivered (architect):

| File | Tests | Scope |
|------|-------|-------|
| `risk-level-filter.test.ts` | 8 | T-2: risk level filtering logic |
| `scan-service-context.test.ts` | 4 | T-3: filterContext integration |
| `scan-filter-context.test.ts` | 4 | T-4/T-5: scan route filter + topActions |
| `obligation-coverage-risk.test.ts` | 5 | T-7: obligation coverage with risk |
| `fix-filter-context.test.ts` | 2 | T-8: fix route filterContext passthrough |
| `context-scan-e2e.test.ts` | 5 | E2E: full HTTP contract |
| contract.test.ts (extended) | +3 | T-1: schema conformance |

---

## V1-M09 Delivery (feature/V1-M09-onboarding-enrichment)

**Completed:** 2026-04-13 | **Status:** ✅ DONE — REVIEWER APPROVED (conditions: architect ratify TD-17/18, resolve TD-19)

**Branch:** `feature/V1-M09-onboarding-enrichment` (7 commits on top of dev: 23af11b..c7ccff2)

### What was delivered:

| Component | Description |
|-----------|-------------|
| 5 question blocks (9 Qs) | `onboarding/questions.ts` — role, business, data + NEW system, deployment |
| Dynamic obligations | `onboarding/profile.ts` — `computeApplicableObligationsDynamic()` filters 108 obligations by role/risk/GPAI |
| ProfileSchema fields | `onboarding/profile.ts` + `common.types.ts` — gpaiModel, autonomousDecisions, biometricData, userFacing |
| `--reconfigure` flag | `wizard.ts` + `onboarding.route.ts` — re-run init to update profile |
| GPAI auto-detect | `auto-detect.ts` — detect GPAI model SDKs (openai, anthropic, google, mistral, cohere) |
| E2E tests | `onboarding-enrichment-e2e.test.ts` (6 tests) |
| Unit tests | `onboarding.test.ts` (+14), `wizard-reconfigure.test.ts` (4), `auto-detect-gpai.test.ts` (10) |

### Test specs delivered (architect):

| File | Tests | Scope |
|------|-------|-------|
| `onboarding.test.ts` | +14 | T-6: question blocks, dynamic obligations, profile schema |
| `wizard-reconfigure.test.ts` | 4 | T-4: reconfigure mode |
| `auto-detect-gpai.test.ts` | 10 | T-5: GPAI detection from package.json |
| `onboarding-enrichment-e2e.test.ts` | 6 | E2E: onboarding + scan integration |

---

## Tech Debt

| # | Description | File | Status |
|---|-------------|------|--------|
| TD-1 | Archival of old sprints (S01-S12) | — | ✅ Done |
| TD-2 | project-state.md initial creation | — | ✅ Done |
| TD-3 | Feature Area documents | — | ✅ Done (8 files) |
| TD-4 | Milestone V1-M01 creation | — | ✅ Done |
| TD-5 | Agent definitions (.claude/agents/) | — | ✅ Done (6 agents) |
| TD-6 | Rules files (.claude/rules/) | — | ✅ Done (4 rules) |
| TD-7 | 🟡 OPEN: Programmer added test in impl commit | `conformity-score.test.ts` — 1 test added in `ff7f2d9`. Correct spec but scope violation. | architect ratify |
| TD-8 | 🟡 OPEN: Test fixture corrected by programmer | `report-html.test.ts` — category string `'CT-1 Transparency'`→`'Transparency'` in `149904d`. Not spec-weakening. | architect ratify |
| TD-9 | 🟡 OPEN: Dev changed test assertion (scope violation) | `layer4-patterns.test.ts` — bare-llm `info`→`fail`/`medium` in `dfff13e`. Policy change correct, impl in sync. | architect ratify |
| TD-10 | 🟡 OPEN: SDK tests run separately | SDK ~414 tests not in main vitest count. Total 2360 excludes SDK. | architect wire |
| TD-11 | 🟡 OPEN: V1-M04 acceptance not CI-automated | `verify_cli_flags.sh` requires binary. Manual gate before v1.0. | architect/user |
| TD-12 | 🟡 OPEN: scan.route.ts imports unused `buildPriorityActions` | V1-M08 `scan.route.ts` — imports `buildPriorityActions` but uses inline `computeTopActions` instead. Deduplicate. | dev fix |
| TD-13 | 🟡 OPEN: O(n²) skip counting in applyProfileFilters | V1-M08 `scan-service.ts` — uses `.find()` in loop for skippedByRole/skippedByRiskLevel counting. Refactor to Set-based lookup. | dev fix |
| TD-14 | 🔴 OPEN: agent-discovery Express route parsing | `agent-discovery.ts` — `app.get('env')` parsed as route. RED test written (V1-M07). | dev fix |
| TD-15 | 🔴 SCOPE VIOLATION: Dev changed existing test spec | V1-M08 `scan-service.test.ts` — dev changed score assertion 33→40, skippedChecks 2→0 in role-filter test. Legacy fallback no longer recalculates score. Original spec: score recalculated after role filtering. | architect ratify or revert |
| TD-16 | 🟡 OPEN: Dev modified E2E test setup | V1-M08 `context-scan-e2e.test.ts` — dev added temp dir isolation (mkdtemp) to fix vitest module-state leakage. Assertions unchanged. Infra fix, not spec change. | architect ratify |
| TD-17 | 🟡 OPEN: V1-M09 dev modified M08 E2E test data+assertions | `context-scan-e2e.test.ts` — TEST_PROFILE changed from 3 fake OBL-IDs → 19 real `eu-ai-act-OBL-*`. Assertions range→exact (applicableObligations=19). Stricter but scope violation. | architect ratify |
| TD-18 | 🟡 OPEN: V1-M09 dev fixed field name in E2E test | `onboarding-enrichment-e2e.test.ts` — `applicableObligationCount`→`applicableObligations`. Architect spec naming mismatch. | architect ratify |
| TD-19 | 🔴 OPEN: V1-M07 files duplicated on M09 branch | `iso-42001-controls.json`, `soa-generator.ts`, `risk-register-generator.ts`, `passport-documents.ts` — copied from M07 branch for typecheck. Merge conflict risk when M07 merges to dev. | architect resolve before merge |
