# Project State

> Last updated: 2026-04-11
> Status: V1-M01..M04 DONE · V1-M05 partial (typecheck fix) · **REVIEWER APPROVED** — awaiting user merge to main

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

## Test Status (2026-04-11)

| Suite | Count | Status |
|-------|-------|--------|
| Engine TS (vitest) | 2165 passed, 10 skipped | ✅ GREEN (156 files) |
| CLI Rust (cargo test) | 195 | ✅ GREEN |
| **Total** | **2360** | ✅ **ALL GREEN** |
| Acceptance: verify_pipeline.sh | 9/9 checks | ✅ PASS |
| Acceptance: verify_report_export.sh | 6/6 checks | ✅ PASS |
| E2E: pipeline-e2e.test.ts | 5 passed, 1 skipped (LLM — no key) | ✅ GREEN |
| E2E: gaps-e2e.test.ts | 9 passed | ✅ GREEN |
| E2E: report-html.test.ts | 11 passed | ✅ GREEN |
| E2E: ci-flags-e2e.test.ts | 7 passed, 3 skipped (eval target — no env) | ✅ GREEN |

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
