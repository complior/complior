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

## S03-us — Sprint S03 User Stories (COMPLETED)

**Duration:** 2026-03-03 — 2026-03-04 | **Team:** Claude Code
**Sprint backlog:** `docs/sprints/SPRINT-BACKLOG-S03.md` (13 US)

| Day | Date | US | Commit | Notes |
|-----|------|----|--------|-------|
| 1 | 2026-03-03 | US-S03-02 | `79d3f6d` | Agent Passport Mode 1 (Auto): 6 domain modules, HTTP routes, CLI, TUI binding |
| 1 | 2026-03-03 | US-S03-03 | `79d3f6d` + `ceca305` | Autonomy Rating L1-L5: analyzer in passport pipeline + CLI `autonomy` subcommand |
| 1 | 2026-03-03 | US-S03-04 | `ceca305` | Passport Validate: `complior agent validate`, per-category scores, gap list, --verbose |
| 2 | 2026-03-04 | US-S03-06 | `adad912` | compliorAgent() SDK: proxy wrapper, permission/rate-limit/budget/action-log hooks, 5 providers |
| 2 | 2026-03-04 | US-S03-07 | `adad912` | Evidence Chain: SHA-256 hash chain, ed25519 signatures, `.complior/evidence/chain.json` |
| 2 | 2026-03-04 | US-S03-08 | `adad912` + `6466fea` | FRIA Generator: template-based, 80% pre-fill, CLI flags for manual fields (AC#3) |
| 2 | 2026-03-04 | US-S03-13 | `adad912` | Safe Passport Re-Init: skip existing, --force flag, HTTP `force` param |
| 3 | 2026-03-04 | US-S03-05 | `6466fea` | Completeness Score: color coding (<50% Red, 50-79 Amber, 80-99 Yellow, 100% Green) |
| 3 | 2026-03-04 | US-S03-09 | `6466fea` | TUI Passport Page: AgentList + FieldEditor modes, detail panel, actions [o/c/f/x] |
| 3 | 2026-03-04 | US-S03-10 | `6466fea` | TUI Obligations Page: 108 obligations, 8 filters, critical path, linked features |
| 3 | 2026-03-04 | US-S03-11 | `6466fea` | Scanner Passport Awareness: passport-presence (L1), passport-completeness (L2), passport-code-mismatch (cross) |
| 3 | 2026-03-04 | US-S03-12 | `6466fea` | Scanner Quick Fixes: test file exclusion from L4, layer weights recalibrated |

**Velocity:** 13/13 US (including US-S03-01 from earlier S03 Daemon commit) | **Tests:** 756 → 944 (+188)

**Commits per US (cross-reference):**

| US | Backlog ID | Commit(s) | Key Files |
|----|------------|-----------|-----------|
| US-S03-01 | — | `b3d4e85` | cli/src/daemon.rs, cli/src/headless/daemon.rs, engine/core/src/server.ts |
| US-S03-02 | C.S01 | `79d3f6d` | domain/passport/*.ts, passport-service.ts, agent.route.ts, cli/src/headless/agent.rs |
| US-S03-03 | C.S02 | `79d3f6d`+`ceca305` | domain/passport/autonomy-analyzer.ts, cli.rs (autonomy subcommand) |
| US-S03-04 | C.S07 | `ceca305` | domain/passport/passport-validator.ts, obligation-field-map.ts, agent.route.ts |
| US-S03-05 | C.S09 | `6466fea` | cli/src/views/passport/mod.rs (completeness_color, color bars) |
| US-S03-06 | C.R12 | `adad912` | engine/sdk/src/agent.ts, pre/permission.ts, pre/rate-limit.ts, post/budget.ts, post/action-log.ts |
| US-S03-07 | C.R20 | `adad912` | domain/scanner/evidence-store.ts, scan-service.ts, composition-root.ts |
| US-S03-08 | C.D01 | `adad912`+`6466fea` | domain/fria/fria-generator.ts, cli.rs (fria subcommand), headless/agent.rs |
| US-S03-09 | — | `6466fea` | cli/src/views/passport/mod.rs (AgentList/FieldEditor), app/view_keys.rs, app/executor.rs |
| US-S03-10 | — | `6466fea` | cli/src/views/obligations/{mod,render,tests}.rs, obligations.route.ts, navigation.rs |
| US-S03-11 | — | `6466fea` | checks/passport-presence.ts, checks/passport-completeness.ts, cross-layer.ts |
| US-S03-12 | — | `6466fea` | layer4-patterns.ts, pattern-rules.ts, confidence.ts |
| US-S03-13 | C.S01 | `adad912` | passport-service.ts (initPassport force param), agent.route.ts |

---

## S03-qf — Quality Fixes (Post-Sprint Polish)

**Duration:** 2026-03-04 | **Team:** Claude Code
**Context:** Code quality audit after manual E2E testing of all S03 features in tmux

| # | Bug / Gap | File(s) | Fix |
|---|-----------|---------|-----|
| 1 | FRIA toast reads `"outputPath"` but engine returns `"savedPath"` | `cli/src/app/executor.rs` | Fixed JSON field name |
| 2 | Obligations `scroll_offset` never updated → cursor goes off-screen | `cli/src/app/actions.rs` | Added scroll tracking in ScrollUp/ScrollDown for Obligations view |
| 3 | `passport-completeness` counts empty `{}` / `[]` as filled → inflated % | `engine/core/src/domain/scanner/checks/passport-completeness.ts` | Added `isNonEmpty()` guard rejecting empty objects/arrays |
| 4 | `obligations.route.ts` had 0 tests | `engine/core/src/http/routes/obligations.route.test.ts` (new) | 5 tests: coverage, no-scan, normalization, linked_checks, field mapping |
| 5 | URL query params not encoded → broken on paths with spaces/unicode | `cli/src/headless/agent.rs`, `cli/src/app/executor.rs` | Added `url_encode()` helper, applied to 12 URLs total |
| 6 | `extract_completeness` u64→u8 cast without clamping | `cli/src/views/passport/mod.rs` | Changed return type to `u8` with `.min(100)` clamp |

**Velocity:** 6 fixes + 5 new tests | **Tests:** 944 → 950 (+6)

---

## S3.5 — United Sprint 1: CLI ↔ SaaS Integration Bridge

**Duration:** 2026-03-04 — 2026-03-05 | **Team:** Claude Code (Marcus)
**Cross-repo:** ~/complior (CLI, Rust + TS Engine) + ~/PROJECT (SaaS, Node.js + Next.js)
**Sprint backlog:** `~/.claude/plans/steady-leaping-sunbeam.md` (12 US, 28 SP total — 18 SP CLI-side)

**Goal:** *"CLI умеет аутентифицироваться в SaaS, синхронизировать passports/scans/документы, и TUI показывает реальный статус синхронизации."*

| Day | Date | US | Notes |
|-----|------|----|-------|
| 1 | 2026-03-04 | US-U01 | `complior login` — Device Flow client (SaasClient, poll_token, open browser) |
| 1 | 2026-03-04 | US-U02 | Token storage — save/load/clear in `~/.config/complior/credentials`, expiry check |
| 1 | 2026-03-04 | US-U03 | `complior logout` — clear tokens, auth status in `complior doctor` |
| 1 | 2026-03-04 | US-U04 | Engine Sync Service — `saas-client.ts` (5 methods), `sync.route.ts` (4 endpoints) |
| 1 | 2026-03-04 | US-U05 | `complior sync` — passport push (36→18 field mapping, batch, conflict display) |
| 1 | 2026-03-04 | US-U06 | Scan push — auto-sync after `complior scan` if authenticated, `--no-sync` flag |
| 2 | 2026-03-05 | US-U10 | Data Bundle client — `bundle-fetcher.ts`, ETag caching, offline fallback |
| 2 | 2026-03-05 | US-U11 | TUI Sync Panel — real status in `panels.rs` (Connected/email/org/stats/hotkeys S/L) |

**CLI-side code audit (7 violations fixed):**
- 5 HIGH: Removed `as` type assertions in 4 Engine TS files (saas-client.ts, sync.route.ts, scan.route.ts, bundle-fetcher.ts) — replaced with Zod schema, type annotations, runtime guards
- 1 HIGH: Added `chmod 0o600` on credentials file after write (`config.rs`)
- 4 PANIC: UTF-8 byte-slicing crash at 4 locations (panels.rs, render.rs, passport/mod.rs ×2) — created `truncate_str()` helper using `.chars()` API

**New files (CLI-side):**

| File | ~LOC | Description |
|------|------|-------------|
| `cli/src/saas_client.rs` | 120 | SaaS HTTP client (Device Flow + sync + data bundle) |
| `cli/src/headless/login.rs` | 80 | Login/logout command handlers |
| `cli/src/headless/sync.rs` | 70 | Sync command handler (passport + scan + docs) |
| `engine/core/src/infra/saas-client.ts` | 113 | Engine→SaaS HTTP adapter (5 methods, typed interfaces) |
| `engine/core/src/http/routes/sync.route.ts` | 249 | Engine sync routes (passport/scan/documents/status) |
| `engine/core/src/infra/bundle-fetcher.ts` | 77 | Data bundle fetcher with ETag + cache + offline fallback |

**Modified files (CLI-side):**

| File | Changes |
|------|---------|
| `cli/src/cli.rs` | +Login, +Logout, +Sync commands |
| `cli/src/config.rs` | +StoredTokens, +save/load/clear_tokens, +is_authenticated, +chmod 0o600 |
| `cli/src/headless/commands.rs` | +dispatch for login/logout/sync |
| `cli/src/views/mod.rs` | +truncate_str() UTF-8 safe helper |
| `cli/src/views/dashboard/panels.rs` | SaaS Sync panel (real status replaces stub) |
| `cli/src/views/obligations/render.rs` | UTF-8 safe truncation |
| `cli/src/views/passport/mod.rs` | UTF-8 safe truncation (2 locations) |
| `engine/core/src/http/routes/scan.route.ts` | Auto-sync hook (saasToken in Zod schema) |
| `engine/core/src/http/create-router.ts` | +sync route registration |

**Velocity:** 8 US + 7 audit fixes | **Tests:** 950 (no new tests — integration-tested via E2E)

---

## Test Count History

| Milestone | TS Engine | SDK | Rust CLI | Total |
|-----------|-----------|-----|----------|-------|
| v1 final (L09) | 315 | 9 | 253 | **568** |
| S02 scanner | 375 | 9 | 253 | **637** |
| S03 SRP restructuring | 375 | 95 | 286 | **756** |
| S03-us Agent Passport | 410 | 95 | 306 | **811** |
| S03-us Sprint complete | 483 | 116 | 345 | **944** |
| S03-qf Quality fixes | 489 | 116 | 345 | **950** |

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
| S03-us (Sprint S03 US) | 2 days | — | 13 | +188 |
| S03-qf (Quality fixes) | <1 day | — | — | +6 |
| S3.5 (United Sprint 1) | 2 days | — | 8+4 audit | +0 |
| **Total v8** | **~18 days** | — | **47** | **+382** |
