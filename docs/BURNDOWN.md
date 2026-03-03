# BURNDOWN.md — Sprint Burndown Charts

> Numbers and metrics. Implementation details per US → see [FEATURE-MAP.md](./FEATURE-MAP.md)

---

## v1 Summary (Completed)

> **19 sprints, 365 SP, 84 US, 568 tests** — completed 2026-02-18 to 2026-02-19 (2 days)

| Sprint | Track | SP | US | Tests | Notes |
|--------|-------|----|----|-------|-------|
| E01 | Engine | 47 | 11 | 0→78 | US-001..011: HTTP, Scanner L1, Scoring, LLM, Gate |
| T02 | TUI | 38 | 7 | 78→131 | US-012..018: Dashboard, Chat, File Browser, Diff |
| T02.5 | TUI | 25 | ~3 | 131→156 | OpenRouter, 4-step wizard, sidebar polish |
| E03 | Engine | 20 | 4 | 156→193 | US-E301..304: Scanner L2-L4, Confidence |
| E04 | Engine | 22 | 5 | 193→220 | US-E401..405: Fixer, Templates, CI/CD |
| T03 | TUI | 16 | 4 | 220→238 | US-T301..304: 6-View, Engine Launch |
| T04 | TUI | 20 | 4 | 238→255 | US-T401..404: Scan/Fix/Timeline/Report |
| T05 | TUI | 18 | 5 | 255→275 | US-T501..505: Widgets, Watch Mode |
| E05 | Engine | 20 | 5 | 275→295 | US-E501..505: MCP, LLM Tools, Agent Modes |
| E06 | Engine | 22 | 5 | 295→315 | Onboarding, Memory, Scanner L5, What-If |
| E06.5 | Engine | 3 | 1 | 315→315 | Clean Architecture migration |
| T06 | TUI | 20 | 4 | 315→340 | US-T601..604: Themes, Onboarding |
| T07 | TUI | 18 | 5 | 340→365 | US-T701..705: Zen, Zoom, Split-View |
| E07 | Engine | 22 | 5 | 365→390 | US-E701..705: SDK, Badge, Undo |
| E08 | Engine | 18 | 4 | 390→420 | US-E801..804: External Scan, PDF, Sessions |
| T08 | TUI | 16 | 6 | 420→458 | US-T801..806: Mouse, Animations, Undo UI |
| T09 | TUI | 17 | 5 | 458→505 | Headless CLI, Scan Viz, What-If |
| L09 | Launch | 20 | 5 | 505→568 | US-L901..905: Distribution, E2E, npm |

**Total v1:** 365 SP | 84 US | 568 tests | 100% velocity (zero carryover)

---

## v8 Reboot — Phase 0 (Docs)

**Duration:** 2026-02-21 — 2026-02-26 | **Team:** Claude Code

| Day | Date | Done | Notes |
|-----|------|------|-------|
| 1 | 2026-02-21 | ARCHITECTURE.md | v6→v8 daemon architecture rewrite |
| 2 | 2026-02-22 | PRODUCT-VISION, DATA-FLOWS | Daemon-orchestrator vision, 12 diagrams |
| 3 | 2026-02-23 | TUI-DESIGN-SPEC | 8 pages, CLI commands, MCP tools |
| 4 | 2026-02-24 | EU-AI-ACT-PIPELINE | 108 obligations → 7-step pipeline |
| 5 | 2026-02-26 | PRODUCT-BACKLOG, FEATURE-AGENT-PASSPORT | v8 backlog (167 features), Passport spec (36 fields) |

**Velocity:** All docs delivered | **Carry-over:** 0

---

## S01 — v8 TUI Overhaul

**Duration:** 2026-02-26 — 2026-02-28 | **Team:** Claude Code

| Day | Date | Done | Notes |
|-----|------|------|-------|
| 1 | 2026-02-26 | ViewState rewrite | US-S01-01: Remove PTY/ACP stubs, add Passport/Obligations |
| 1 | 2026-02-26 | Dashboard overhaul | US-S01-02: Two-column, info panel |
| 2 | 2026-02-27 | Scan + Fix pages | US-S01-03..04: Severity sort, article refs, predicted score |
| 2 | 2026-02-27 | Help + Engine trait | US-S01-05, US-S01-10: 8-view hotkeys, EngineConnection |
| 3 | 2026-02-28 | S01 Polish | US-S01-P1..P3: Type-aware preview, real fix apply, data provider |

**Velocity:** 6 US + 3 polish | **Tests:** 568 → ~600 | **Carry-over:** 0

---

## S02 — Scanner Production-Grade

**Duration:** 2026-02-28 — 2026-03-01 | **Team:** Claude Code

| Day | Date | Done | Notes |
|-----|------|------|-------|
| 1 | 2026-02-28 | A1, A2, A3 | US-S02-A1..A3: Banned 6→45, L2 shallow, L5 wired |
| 1 | 2026-02-28 | B1, B2, B3 | US-S02-B1..B3: Patterns 13→33, cross-layer, evidence |
| 2 | 2026-03-01 | C1, C2, C3 | US-S02-C1..C3: Drift, versioning, SBOM (CycloneDX 1.5) |

**Velocity:** 9/9 US | **Tests:** ~600 → ~680 | **Carry-over:** 0

---

## S03 — Daemon Foundation

**Duration:** 2026-03-01 — 2026-03-02 | **Team:** Claude Code

| Day | Date | Done | Notes |
|-----|------|------|-------|
| 1 | 2026-03-01 | tui→cli rename | US-S03-01a: Package rename, all refs updated |
| 1 | 2026-03-01 | Daemon CLI | US-S03-01b: `complior daemon [start\|status\|stop]` |
| 1 | 2026-03-01 | PID file | US-S03-01c: JSON PID, process alive check (libc) |
| 1 | 2026-03-01 | TUI discovery | US-S03-01d: Auto-detect daemon, external mode |

**Velocity:** 4/4 US | **Carry-over:** 0

---

## S03-ref — Refactoring (SRP + Architecture)

**Duration:** 2026-03-01 — 2026-03-02 | **Team:** Claude Code

| Day | Date | Done | Notes |
|-----|------|------|-------|
| 1 | 2026-03-01 | Structural cleanup | Split large files, consolidate modules, add contracts |
| 1 | 2026-03-01 | SRP restructuring | types.rs 480→7 modules, CheckResultType enum, 11 new fields |
| 2 | 2026-03-02 | Dead code cleanup | connection/ deleted, coding/ deduped, memory/ removed |

**Velocity:** 3 refactoring rounds | **Tests:** ~680 → 756 (375 TS + 95 SDK + 286 Rust) | **Carry-over:** 0

---

## S04 — Compliance Core (in progress)

**Duration:** 2026-03-03 — ongoing | **Team:** Claude Code

| Day | Date | Done | Notes |
|-----|------|------|-------|
| 1 | 2026-03-03 | Agent Passport Mode 1 | US-S03-02: Full auto pipeline, 6 domain modules, HTTP routes, CLI, TUI binding |

**Velocity:** 1/10 US | **Tests:** 756 → 811 (410 TS + 95 SDK + 306 Rust)

**Remaining S04 (from PRODUCT-BACKLOG.md):**

| Backlog ID | Feature | Status |
|------------|---------|--------|
| C.S01 | Agent Passport (3 modes) | Mode 1 DONE, Mode 2-3 pending |
| C.S02 | Autonomy Rating L1-L5 | Analyzer DONE, CLI command pending |
| C.S07 | Passport Validate | -- |
| C.S09 | Passport Completeness Score | -- |
| C.R12 | compliorAgent() SDK | -- |
| C.R13 | Budget Controller | -- |
| C.R14 | Circuit Breaker | -- |
| C.R20 | Evidence Chain | -- |
| C.R21 | Compliance Changelog | -- |
| C.D01 | FRIA Generator (CLI) | -- |

---

## Test Count History

| Milestone | TS Engine | SDK | Rust CLI | Total |
|-----------|-----------|-----|----------|-------|
| v1 final (L09) | 315 | 9 | 253 | **568** |
| S02 scanner | 375 | 9 | 253 | **637** |
| S03 SRP restructuring | 375 | 95 | 286 | **756** |
| S04 Agent Passport | 410 | 95 | 306 | **811** |

---

## Velocity Summary

| Phase | Duration | SP | US | Tests Added |
|-------|----------|----|----|-------------|
| v1 (19 sprints) | 2 days | 365 | 84 | +568 |
| v8 Phase 0 | 5 days | — | — | 0 |
| S01 (TUI overhaul) | 3 days | — | 9 | +32 |
| S02 (Scanner) | 2 days | — | 9 | +80 |
| S03 (Daemon) | 2 days | — | 4 | +76 |
| S03-ref (Refactoring) | 2 days | — | — | +44 |
| S04 (Passport, day 1) | 1 day | — | 1 | +55 |
| **Total v8** | **~15 days** | — | **23+** | **+243** |
