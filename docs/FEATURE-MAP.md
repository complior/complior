# Complior CLI — Feature Map

> Maps every feature to implementation status.
> Each feature lists its completed user stories with implementation details.
> Sprint burndown numbers → see [BURNDOWN.md](./BURNDOWN.md)

**Updated:** 2026-03-24
**Current status:** Sprint S05 Phase 1-5 DONE (30/34 US) + S06 partial (5/30 US + Passport Rewrite) + S08/S09 partial (5 US) + S10 partial (6 US) + S11 partial (12 US) + S12-REM DONE (10 US) — Eval Remediation
**Tests:** 2808 | **TS Engine:** 1876 | **Rust CLI:** 518 | **SDK:** 414
**Next:** Sprint S06 (remaining 25 US) — ISO 42001, MCP Proxy, NHI Scanner

---

## Summary Dashboard

| # | Feature | Status | US Done | Sprint |
|---|---------|--------|---------|--------|
| F01 | Engine Foundation (HTTP, Scanner L1, Scoring, LLM) | **DONE** | 11 | E01 |
| F02 | TUI Foundation (Dashboard, Chat, Views) | **DONE** | 7 | T02 |
| F03 | Provider Selection + UX Polish | **DONE** | ~3 | T02.5 |
| F04 | Scanner L2-L4 + Confidence System | **DONE** | 4 | E03 |
| F05 | Auto-Fixer + Templates + CI/CD | **DONE** | 5 | E04 |
| F06 | 6-View Architecture + Engine Launch | **DONE** | 4 | T03 |
| F07 | Scan/Fix/Timeline/Report Views | **DONE** | 4 | T04 |
| F08 | Dashboard Widgets + Watch Mode | **DONE** | 5 | T05 |
| F09 | MCP Server + LLM Tools + Agent Modes | **DONE** | 5 | E05 |
| F10 | Onboarding + Memory + Scanner L5 + What-If | **DONE** | 5 | E06 |
| F11 | Clean Architecture Migration | **DONE** | 1 | E06.5 |
| F12 | Themes + Onboarding + Code Search | **DONE** | 4 | T06 |
| F13 | Complior Zen + Advanced UX | **DONE** | 5 | T07 |
| F14 | SDK Middleware + Badge + Undo | **DONE** | 5 | E07 |
| F15 | External Scan + PDF + Sessions | **DONE** | 4 | E08 |
| F16 | Advanced UX Part 2 (Undo, Mouse, Animations) | **DONE** | 6 | T08 |
| F17 | Headless CLI + Scan Viz + What-If | **DONE** | 5 | T09 |
| F18 | Distribution + Launch | **DONE** | 5 | L09 |
| F19 | v8 Docs Overhaul (v6→v8 Architecture) | **DONE** | — | v8-P0 |
| F20 | v8 TUI Overhaul (Daemon layout, 8 pages) | **DONE** | 6 | S01 |
| F21 | S01 Polish (Fix pipeline, data provider) | **DONE** | 3 | S01-polish |
| F22 | Scanner Production-Grade (9 enhancements) | **DONE** | 9 | S02 |
| F23 | Daemon Foundation (tui→cli, PID, lifecycle) | **DONE** | 4 | S03 |
| F24 | Refactoring (SRP, dead code, contracts) | **DONE** | — | S03-ref |
| F25 | Agent Passport Mode 1 (Auto) | **DONE** | 1 | S03-us |
| F26 | Autonomy CLI + Passport Validate + Completeness | **DONE** | 3 | S03-us |
| F27 | compliorAgent() SDK + Evidence Chain + FRIA + Re-Init | **DONE** | 4 | S03-us |
| F28 | TUI Passport Page (AgentList + FieldEditor) | **DONE** | 1 | S03-us |
| F29 | TUI Obligations Page (108 obligations, filters) | **DONE** | 1 | S03-us |
| F30 | Scanner Passport Awareness + Quick Fixes | **DONE** | 2 | S03-us |
| F31 | Passport Completeness Color Coding | **DONE** | 1 | S03-us |
| F32 | S03 Quality Fixes (6 bugs, 5 tests) | **DONE** | — | S03-qf |
| F33 | SaaS Authentication (Device Flow) | **DONE** | 3 | S3.5 |
| F34 | SaaS Sync Service (Engine adapter) | **DONE** | 1 | S3.5 |
| F35 | Passport + Scan + Doc Push | **DONE** | 3 | S3.5 |
| F36 | Data Bundle Client (ETag cache) | **DONE** | 1 | S3.5 |
| F37 | TUI Sync Panel (live status) | **DONE** | 1 | S3.5 |
| F38 | S3.5 Code Audit Fixes (UTF-8, `as`, permissions) | **DONE** | — | S3.5 |
| F39 | S04 Fixes (FRIA JSON, evidence, sync, login) | **DONE** | 1 | S04 |
| F40 | SDK Production (Prohibited, Sanitize, Permission, Disclosure, Bias, Middleware) | **DONE** | 6 | S05-P1 |
| F41 | Engine Core (Finding Explanations, Worker Notification, Passport Export, Behavior Contract) | **DONE** | 4 | S05-P2 |
| F42 | Industry Patterns + Agent Registry + Permissions Matrix + Policy Templates | **DONE** | 4 | S05-P2 |
| F43 | AIUC-1 Cert Readiness Score | **DONE** | 1 | S05-P3 |
| F44 | Guided Onboarding Wizard (5-step) | **DONE** | 1 | S05-P3 |
| F45 | Compliance Diff in PR | **DONE** | 1 | S05-P3 |
| F46 | S05 Quality Fixes (score.totalScore, SRP, DRY, Zod, scoped names) | **DONE** | — | S05-QF |
| F47 | Runtime Control (Permission Scanner, Disclosure, Safety, Proxy) | **DONE** | 4 | S05-P4 |
| F48 | Adversarial Test Runner (Art.9/Art.15) | **DONE** | 1 | S05-P4 |
| F49 | Multi-Agent + Cost/Debt/Simulation | **DONE** | 5 | S05-P5 |
| F50 | Multi-Framework Scoring + TUI Metrics Widgets | **DONE** | — | S05-P5 |
| F51 | LLM Chat Service + TUI Chat Page (9th View) | **DONE** | 2 | S06 |
| F52 | S05-S06 Quality Fixes (port discovery, SDK strict, DRY) | **DONE** | — | S05-S06-QF |
| F53 | Chat UX Improvements (multiline, tool names, timestamps removed) | **DONE** | 1 | S06 |
| F54 | Onboarding Rework (10→8 steps, persistence, Esc block) | **DONE** | 1 | S06 |
| F55 | `complior init` + Project Root Discovery (9 markers) | **DONE** | 1 | S06 |
| F56 | Scanner Intelligence (Import Graph, Multi-Lang, Git History, L5 Targeted+DocVal) | **DONE** | 5 | S08/S09 |
| F57 | Enhanced CLI Scan Output (severity, fix roadmap, deadline, badges) | **DONE** | — | S08/S09 |
| F58 | Code Quality Audit (H1 constants, H4 AI packages, C1 file-collector, GPAI checks) | **DONE** | — | S08/S09 |
| F59 | Scanner Tier-2 (Semgrep/Bandit runners, finding mapper, dedup, scan cache) | **DONE** | 3 | S10 |
| F60 | CLI Scan Output SRP Rewrite (format/ module, ANSI colors, layers) | **DONE** | — | S10 |
| F61 | Fix Report: Scaffold Badges + Code Fix Dedup + Upgrade CTA | **DONE** | 3 | S10 |
| F62 | FIX.md Pipeline Documentation | **DONE** | — | S10 |
| F63 | Passport Production Rewrite (10 fixes) | **DONE** | — | S06 |
| F64 | Eval Subsystem (Conformity + Security + LLM Judge) | **DONE** | 12 | S11 |
| F65 | Eval Remediation (Knowledge Base + Fix Generator + CLI Output) | **DONE** | 7 | S12 |
| F66 | Eval → Passport Sync + Fix Pipeline Integration | **DONE** | 3 | S12 |
| F67 | Eval → Passport Binding + Passport Rename | **DONE** | 2 | S12 |
| F68 | CLI Onboarding Removal + Doc Sync | **DONE** | 1 | S12-REM |
| **TOTAL** | | | **~207** | |

---

## Status Legend

- **DONE** — Feature fully implemented and tested
- **PARTIAL** — Core implemented but not all aspects complete
- **--** — Not started

---

## F01: Engine Foundation

**Sprint:** E01 | **Status:** DONE | **SP:** 47

HTTP server, 5-layer scanner, scoring engine, LLM provider abstraction, file ops, compliance gate.

| US | Title | Description |
|----|-------|-------------|
| US-001 | HTTP-Server + Routes | Hono HTTP server, route handlers, SSE support |
| US-002 | Data Layer | Regulation JSON (108 obligations), scoring data, local file storage |
| US-003 | Scanner L1 | Layer 1: file presence checks (19 compliance checks) |
| US-004 | Scoring Engine | 0-100 score from 5-layer results, zone classification (red/yellow/green) |
| US-005 | LLM Provider | Vercel AI SDK, model routing, cost tracking, 4 agent modes |
| US-006 | File Operations | File read/write, project detection, workspace management |
| US-007 | Shell + Git | Shell command execution, git adapter for version control |
| US-008 | Compliance Gate | File change → rescan (200ms) → score update → SSE notification |
| US-009 | Framework Detector | 57 AI SDK detection patterns (npm/pip/cargo/go) |
| US-010 | Project Detector | Zero-config project type detection |
| US-011 | Prioritization + Memory + Config | Finding priority, session memory, `.complior/config.toml` |

---

## F02: TUI Foundation

**Sprint:** T02 | **Status:** DONE | **SP:** 38

Ratatui-based terminal UI with navigation, chat, file browser, diff preview.

| US | Title | Description |
|----|-------|-------------|
| US-012 | Dashboard TUI + Navigation | 8-page state machine, digit hotkeys, sidebar, layout engine |
| US-013 | Chat Interface + IPC Client | Chat widget, SSE connection to engine, streaming responses |
| US-014 | File Browser + Code Viewer | Project tree, syntax highlighting, scrollable code view |
| US-015 | Code Selection → AI | Select code range → send to LLM for compliance analysis |
| US-016 | Score Gauge + Statusbar | Arc gauge widget, 6-indicator status bar |
| US-017 | Terminal Panel | Embedded terminal output panel |
| US-018 | Diff Preview | Side-by-side diff view for fix proposals |

---

## F03: Provider Selection + UX Polish

**Sprint:** T02.5 | **Status:** DONE | **SP:** 25

OpenRouter provider, 4-step AI provider wizard, sidebar polish, command palette, sessions.

---

## F04: Scanner L2-L4 + Confidence

**Sprint:** E03 | **Status:** DONE | **SP:** 20

| US | Title | Description |
|----|-------|-------------|
| US-E301 | Scanner L2: Document Structure | YAML-based validators, section depth analysis, shallow detection |
| US-E302 | Scanner L3: Dependency & Config | Package parser (4 ecosystems), banned packages (45), AI SDK detection |
| US-E303 | Scanner L4: Pattern Matching | 33 AST patterns across 8 categories (human-oversight, logging, kill-switch, etc.) |
| US-E304 | 5-Tier Confidence System | Confidence levels per finding, evidence collection |

---

## F05: Auto-Fixer + Templates + CI/CD

**Sprint:** E04 | **Status:** DONE | **SP:** 22

| US | Title | Description |
|----|-------|-------------|
| US-E401 | Auto-Fix Engine | LLM-guided fix generation with diff preview, real file apply |
| US-E402 | 8 EU AI Act Document Templates | FRIA, transparency notice, monitoring plan, etc. |
| US-E403 | Compliance Metadata Standard | `.complior/` directory structure, config format |
| US-E404 | Headless CLI for CI/CD | `complior scan --ci --threshold 50`, JSON/SARIF output |
| US-E405 | Git Hooks + Export | Pre-commit compliance check, SARIF for IDE integration |

---

## F06: 6-View Architecture

**Sprint:** T03 | **Status:** DONE | **SP:** 16

| US | Title | Description |
|----|-------|-------------|
| US-T301 | 6-View State Machine | ViewState enum, digit hotkey navigation, focus management |
| US-T302 | Engine Auto-Launch | EngineManager: auto-detect free port, spawn, health check, restart |
| US-T303 | Updated Chat View | Chat with @OBL/@Art references, context-aware responses |
| US-T304 | Updated Dashboard | 2-column layout, info panel, quick actions |

---

## F07: Scan/Fix/Timeline/Report Views

**Sprint:** T04 | **Status:** DONE | **SP:** 20

| US | Title | Description |
|----|-------|-------------|
| US-T401 | Scan View | Findings grouped by severity, detail panel, explain action |
| US-T402 | Fix View | Fixable items list, diff preview, type-aware rendering (A/B/C) |
| US-T403 | Timeline View | Visual timeline to Aug 2, 2026 deadline, milestones |
| US-T404 | Report View | Compliance report generation (Markdown/PDF) |

---

## F08: Dashboard Widgets + Watch Mode

**Sprint:** T05 | **Status:** DONE | **SP:** 18

| US | Title | Description |
|----|-------|-------------|
| US-T501 | Enhanced Dashboard: 2×2 Widget Grid | Score, deadlines, AI systems, quick actions |
| US-T502 | Watch Mode: Auto-Scan on Changes | File watcher → debounced rescan → SSE score update |
| US-T503 | @OBL/@Art References in Chat | Obligation/article cross-references in AI responses |
| US-T504 | Status Bar: 6 Indicators | Engine, score, zone, findings, mode, connection |
| US-T505 | Dynamic Footer + Help Overlay | Context-aware hotkeys, F1 help overlay |

---

## F09: MCP Server + LLM Tools + Agent Modes

**Sprint:** E05 | **Status:** DONE | **SP:** 20

| US | Title | Description |
|----|-------|-------------|
| US-E501 | MCP Server: 8 Compliance Tools | scan, fix, score, explain, passport, validate, deadline, suggest |
| US-E502 | 23 LLM Tool Definitions | Tool schemas for AI agents |
| US-E503 | 4 Agent Modes | build/comply/audit/learn with different tool sets |
| US-E504 | Smart Model Routing + Cost Display | Route by task type, track token cost |
| US-E505 | Legal Disclaimer Framework | Disclaimer injection, legal notices |

---

## F10: Onboarding + Memory + Scanner L5 + What-If

**Sprint:** E06 | **Status:** DONE | **SP:** 22

Onboarding wizard, session memory L2/L3, Scanner L5 (LLM deep analysis), What-If simulator.

---

## F11: Clean Architecture Migration

**Sprint:** E06.5 | **Status:** DONE | **SP:** 3

Full migration to Clean Architecture: ports → domain → services → infra → http. `composition-root.ts` as single wiring point. All factories return `Object.freeze({...})`.

---

## F12: Themes + Onboarding + Code Search

**Sprint:** T06 | **Status:** DONE | **SP:** 20

| US | Title | Description |
|----|-------|-------------|
| US-T601 | 8 Theme System | dark, light, dracula, nord, solarized, monokai, gruvbox, catppuccin |
| US-T602 | Theme Picker with Live Preview | Interactive theme selection, instant preview |
| US-T603 | Onboarding Wizard: 6-Step Setup | Jurisdiction, role, industry, AI systems, config |
| US-T604 | Code Viewer Enhancement | Syntax highlighting, diff overlay, search |

---

## F13: Complior Zen + Advanced UX

**Sprint:** T07 | **Status:** DONE | **SP:** 18

| US | Title | Description |
|----|-------|-------------|
| US-T701 | Complior Zen Integration | Zen mode for focused compliance work |
| US-T702 | Widget Zoom/Expand | Full-screen toggle for any widget |
| US-T703 | Split-View Fix Mode | Side-by-side code + fix preview |
| US-T704 | Toast Notifications + Dialogs | Non-blocking notifications, confirmation dialogs |
| US-T705 | Context Meter + Quick Actions | Token context display, quick action palette |

---

## F14: SDK Middleware + Badge + Undo

**Sprint:** E07 | **Status:** DONE | **SP:** 22

| US | Title | Description |
|----|-------|-------------|
| US-E701 | @complior/sdk Core Middleware | `complior(client, config)` proxy wrapper, pre/post hooks |
| US-E702 | Domain-Specific Middleware | HR, finance, healthcare, education, legal, content hooks |
| US-E703 | Auto-Validation After Fix | Re-scan after fix apply, score delta display |
| US-E704 | Fix Undo Engine | Undo stack, revert fixes, state rollback |
| US-E705 | Compliance Badge SVG | Badge generation, COMPLIANCE.md auto-update |

---

## F15: External Scan + PDF + Sessions

**Sprint:** E08 | **Status:** DONE | **SP:** 18

| US | Title | Description |
|----|-------|-------------|
| US-E801 | External Scan: Headless Browser | Playwright-based SaaS tool scanning |
| US-E802 | PDF Audit Report | Gotenberg HTML→PDF, branded compliance report |
| US-E803 | Session Sharing | Export/import scan sessions |
| US-E804 | VulnerAI Demo Repository | Reference project with intentional compliance gaps |

---

## F16: Advanced UX Part 2

**Sprint:** T08 | **Status:** DONE | **SP:** 16

| US | Title | Description |
|----|-------|-------------|
| US-T801 | Global Undo Stack UI | Visual undo history, batch revert |
| US-T802 | Proactive Idle Suggestions | Context-aware suggestions when idle |
| US-T803 | Responsive Layout | Adapt to terminal size |
| US-T804 | Shell Commands + Colon Mode | `:scan`, `:fix` colon-commands |
| US-T805 | Animations | Loading spinners, transitions |
| US-T806 | Mouse Support + Scroll | Click navigation, scroll acceleration |

---

## F17: Headless CLI + Scan Viz + What-If

**Sprint:** T09 | **Status:** DONE | **SP:** 17

Headless scan visualization, What-If CLI mode, advanced CLI flags.

---

## F18: Distribution + Launch

**Sprint:** L09 | **Status:** DONE | **SP:** 20

| US | Title | Description |
|----|-------|-------------|
| US-L901 | Multi-Platform Distribution | npm, cargo, homebrew, curl, docker |
| US-L902 | E2E Integration Testing | 7 end-to-end scenarios |
| US-L903 | Demo Materials | Walkthrough, Show HN draft, Product Hunt listing |
| US-L904 | CLI Polish | `--help`, `doctor`, `version`, error messages |
| US-L905 | npm Publish Prep | Package config, README, landing page |

---

## F19: v8 Docs Overhaul

**Sprint:** v8-Phase 0 | **Status:** DONE

Rewrite all documentation from v6 wrapper architecture to v8 daemon architecture.

| Doc | Description |
|-----|-------------|
| ARCHITECTURE.md | Full system design: daemon + TUI + CLI, 5-layer scanner, Agent Passport |
| PRODUCT-VISION.md | Daemon-orchestrator vision, 7-step pipeline, business model |
| PRODUCT-BACKLOG.md | v8 features, obligation-driven roadmap, ~167 features |
| DATA-FLOWS.md | 12 data flow diagrams for daemon architecture |
| TUI-DESIGN-SPEC.md | 8 TUI pages, CLI commands, MCP tools |
| FEATURE-AGENT-PASSPORT.md | 36-field specification, 3 creation modes |
| EU-AI-ACT-PIPELINE.md | 108 obligations → 7-step compliance pipeline |

---

## F20: v8 TUI Overhaul

**Sprint:** S01 | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S01-01 | ViewState rewrite | Remove PTY/ACP/Agents stubs, add Passport/Obligations |
| US-S01-02 | Dashboard layout overhaul | Two-column with info panel, deadline display |
| US-S01-03 | Scan page overhaul | Severity sorting, penalty display, article references |
| US-S01-04 | Fix view article references | Predicted score delta, obligation links |
| US-S01-05 | Help overlay update | 8 view hotkeys, keyboard shortcuts |
| US-S01-10 | EngineConnection trait | Daemon abstraction for TUI↔engine communication |

---

## F21: S01 Polish

**Sprint:** S01-polish | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S01-P1 | Type-aware fix preview | `render_diff_preview_single()` matches FindingType A/B/C |
| US-S01-P2 | Fix apply pipeline | `apply_fix_to_file()`: splice diff + import, stale protection, auto re-scan |
| US-S01-P3 | Data provider audit | EngineDataProvider (online) ↔ MockDataProvider (12 demo, offline fallback) |

---

## F22: Scanner Production-Grade

**Sprint:** S02 | **Status:** DONE

9 enhancements to make scanner production-ready.

| US | Title | Description |
|----|-------|-------------|
| US-S02-A1 | Banned packages expansion | 6→45 packages, all 8 Art. 5 prohibitions + regex fallback |
| US-S02-A2 | L2 shallow detection | `measureSectionDepth()`, >50% shallow → SHALLOW status |
| US-S02-A3 | L5 wired into scanner | `scanDeep()`, `POST /scan/deep`, Vercel AI SDK |
| US-S02-B1 | Pattern rules expansion | 13→33 rules, 8 new categories (data-governance, cybersecurity, etc.) |
| US-S02-B2 | Cross-layer verification | 5 rules: doc-code-mismatch, sdk-no-disclosure, etc. |
| US-S02-B3 | Evidence collection | `Evidence` type on `Finding`, SARIF codeFlows |
| US-S02-C1 | Drift detection | `detectDrift()`, `scan.drift` event, severity levels |
| US-S02-C2 | Regulation versioning | `regulationVersion` on ScanResult, `SCANNER_RULES_VERSION` |
| US-S02-C3 | SBOM generation | CycloneDX 1.5 JSON, `GET /sbom`, AI SDK classification |

---

## F23: Daemon Foundation

**Sprint:** S03 | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S03-01a | tui→cli rename | Package `complior-tui` → `complior-cli`, binary stays `complior` |
| US-S03-01b | Daemon CLI commands | `complior daemon [start\|status\|stop]`, DaemonAction enum |
| US-S03-01c | PID file management | JSON at `.complior/daemon.pid`, process alive check via `kill(pid, 0)` |
| US-S03-01d | TUI daemon discovery | Auto-detect running daemon, `EngineManager::external(port)` |

---

## F24: Refactoring (SRP + Architecture)

**Sprint:** S03-ref | **Status:** DONE

Major codebase restructuring: SRP splits, dead code removal, shared type contracts.

| Item | Description |
|------|-------------|
| types.rs SRP split | 480 LOC → 7 modules (engine, ui, navigation, chat, activity, file_tree) |
| CheckResultType enum | `Finding.type` from String to `CheckResultType { Pass, Fail, Skip }` |
| 11 new optional fields | Finding (+4), ScoreBreakdown (+1), ScanResult (+3), EngineStatus (+3) |
| Shared type contract | `http-contract.json` schema + fixture, validated by both TS and Rust tests |
| Dead code cleanup | connection/ deleted, coding/ deduped with infra/, memory/ removed |
| Browser port inlined | `browser.port.ts` deleted, interface moved to `headless-browser.ts` |

---

## F25: Agent Passport Mode 1 (Auto)

**Sprint:** S03-us | **Status:** DONE | **Backlog:** C.S01, C.S02

`complior agent init` — auto-generates `agent-manifest.json` from codebase analysis.

| US | Title | Description |
|----|-------|-------------|
| US-S03-02 | Agent Passport Auto-Generation | Full pipeline: discover AI agents (57 SDKs) → rate autonomy L1-L5 → scan permissions → build 36-field manifest → ed25519 sign → save to `.complior/agents/`. TS: 6 domain modules + service + HTTP routes. Rust: `complior agent init\|list\|show` commands + TUI data binding. 35 TS + 8 Rust tests |

**Implementation details:**
- **Types:** `passport.types.ts` — 36-field `AgentPassport` + Zod, AutonomyLevel L1-L5, AgentType, PassportRiskClass
- **Discovery:** `agent-discovery.ts` — framework detection (LangChain, CrewAI, OpenAI, Anthropic, Vercel AI, LlamaIndex), model detection
- **Autonomy:** `autonomy-analyzer.ts` — L4 results → L1-L5 rating (human gates, unsupervised actions, logging, kill-switch)
- **Permissions:** `permission-scanner.ts` — tools, DB access (read/write/delete), MCP configs, human approval patterns
- **Manifest:** `manifest-builder.ts` — assembles 36 fields, risk class inference, confidence calculation
- **Crypto:** `crypto-signer.ts` — ed25519 via Node.js native crypto, `~/.config/complior/keys/`
- **Service:** `passport-service.ts` — orchestrator: collectFiles → discover → analyze → build → sign → save
- **HTTP:** `agent.route.ts` — POST /agent/init, GET /agent/list, GET /agent/show
- **CLI:** `agent.rs` — human-readable + JSON output for all 3 subcommands

---

## F26: Autonomy CLI + Passport Validate + Completeness

**Sprint:** S03-us | **Status:** DONE | **Backlog:** C.S02, C.S07, C.S09

| US | Title | Description |
|----|-------|-------------|
| US-S03-03 | Autonomy Rating L1-L5 | Auto-rate from AST: human_gates, unsupervised_actions, logging. `complior agent autonomy` CLI. Analyzer in passport pipeline + standalone command |
| US-S03-04 | Passport Validate | `complior agent validate` — per-category completeness (Identity/Ownership/Autonomy/Constraints/Compliance), gap list, `--verbose` flag. TS: passport-validator.ts + obligation-field-map.ts |
| US-S03-05 | Passport Completeness Score | TUI color coding: <50% Red, 50-79% Amber, 80-99% Yellow, 100% Green. `completeness_color()` helper, colored bars in agent list |

---

## F27: compliorAgent() SDK + Evidence Chain + FRIA + Re-Init

**Sprint:** S03-us | **Status:** DONE | **Backlog:** C.R12, C.R13, C.R14, C.R20, C.D01, C.S01

| US | Title | Description |
|----|-------|-------------|
| US-S03-06 | compliorAgent() SDK | `compliorAgent(client, config)` proxy wrapper. Pre-hooks: permission (tools allow/deny), rate-limit (sliding window). Post-hooks: budget (cost accumulation), action-log (callback), circuit-breaker (anomaly suspend). 5 provider adapters |
| US-S03-07 | Evidence Chain | SHA-256 hash chain + ed25519 signatures. Events: scan, fix, passport, FRIA. Storage: `.complior/evidence/chain.json`. CLI: `complior agent evidence [--verify]` |
| US-S03-08 | FRIA Generator | `complior agent fria <name>` — 80% pre-fill from passport. CLI flags `--impact`, `--mitigation`, `--approval` for manual fields. Template: `data/templates/eu-ai-act/fria.md`. Saves to `.complior/fria/` |
| US-S03-13 | Safe Passport Re-Init | `complior agent init` skips existing passports. `--force` to overwrite. HTTP API `POST /agent/init` accepts `force?: boolean` |

---

## F28: TUI Passport Page (AgentList + FieldEditor)

**Sprint:** S03-us | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S03-09 | TUI Passport Page | Dual-mode: AgentList (table with name/L-level/score/completeness%) + FieldEditor (drill-down). Detail panel toggles FieldDetail ↔ ObligationChecklist. Action keys: [o] Obligations, [c] Validate, [f] FRIA, [x] Export. Enter to drill down, Esc to go back |

**Key components:**
- `PassportViewMode`: AgentList | FieldEditor
- `PassportDetailMode`: FieldDetail | ObligationChecklist
- `render_agent_list_view()`, `render_agent_table()`, `render_agent_detail()`
- `AppCommand`: LoadPassportCompleteness, ValidatePassport, GeneratePassportFria, ExportPassport

---

## F29: TUI Obligations Page

**Sprint:** S03-us | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S03-10 | TUI Obligations Page | Hotkey `O` (or digit 5). 108 EU AI Act obligations from `obligations.json`. 8 filters: All/RoleProvider/RoleDeployer/RiskHigh/RiskLimited/CoveredOnly/UncoveredOnly/SeverityCritical. Two-column layout: filtered list + detail panel. Critical path highlighting (uncovered + has deadline). Coverage from scan cross-referencing (37-entry checkId→oblId mapping). Linked features section |

**Key components:**
- `ObligationsViewState`: obligations, filters, scroll, selection
- `ObligationFilter` with `cycle()` through 8 variants
- `is_critical_path()` for bold-red highlighting
- `GET /obligations?path=...` endpoint with coverage mapping

---

## F30: Scanner Passport Awareness + Quick Fixes

**Sprint:** S03-us | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S03-11 | Scanner Passport Awareness | L1: `passport-presence` (agent-manifest.json exists, HIGH severity if AI SDK detected). L2-like: `passport-completeness` (validate required fields per risk_class, output "Passport Completeness: 72%"). Cross-layer rule #6: `passport-code-mismatch` (declared vs actual permissions) |
| US-S03-12 | Scanner Quick Fixes | Exclude `*.test.ts`, `*.spec.ts`, `__tests__/` from L4 bare-llm checks. Layer weights recalibrated: L3=0.90, L4=0.75, L5=0.70 (deterministic > probabilistic) |

---

## F31: Passport Completeness Color Coding

**Sprint:** S03-us | **Status:** DONE

| US | Title | Description |
|----|-------|-------------|
| US-S03-05 | Completeness Color Coding | `completeness_color(pct, theme)` → zone_green (100%), zone_yellow (80-99%), severity_medium/amber (50-79%), zone_red (<50%). Applied to agent list table and detail panel bars |

---

## F32: S03 Quality Fixes

**Sprint:** S03-qf (post-sprint polish) | **Status:** DONE

Code quality audit after manual E2E testing. 6 bugs fixed, 5 new tests added.

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | FRIA toast wrong JSON field | `cli/src/app/executor.rs` | `"outputPath"` → `"savedPath"` |
| 2 | Obligations scroll broken | `cli/src/app/actions.rs` | Added `scroll_offset` tracking in ScrollUp/ScrollDown |
| 3 | Empty objects counted as filled | `engine/core/.../passport-completeness.ts` | `isNonEmpty()` rejects `{}` and `[]` |
| 4 | obligations.route untested | `engine/core/.../obligations.route.test.ts` | 5 new tests |
| 5 | URLs not percent-encoded | `cli/src/headless/agent.rs`, `cli/src/app/executor.rs` | `url_encode()` on 12 URLs |
| 6 | u64→u8 cast unclamped | `cli/src/views/passport/mod.rs` | Return `u8` with `.min(100)` clamp |

---

## F33: SaaS Authentication (Device Flow Client)

**Sprint:** S3.5 (United Sprint 1) | **Status:** DONE

OAuth 2.0 Device Authorization Grant for CLI↔SaaS. Browser-based auth, JWT token storage, auto-refresh.

| US | Title | Description |
|----|-------|-------------|
| US-U01 | `complior login` | Device Flow client in `saas_client.rs`. POST /api/auth/device → display user_code + open browser → poll POST /api/auth/token every 5s → save JWT to credentials file. `open` crate for browser launch |
| US-U02 | Token Storage + Refresh | `StoredTokens` struct in `config.rs`. Save/load/clear tokens in `~/.config/complior/credentials` (KEY=VALUE format). `is_authenticated()` checks expiry. Session-expired message if token died (no refresh endpoint yet) |
| US-U03 | `complior logout` + Status | Clear all token keys from credentials. Auth status in `complior doctor` (email, org, expiry) |

**Key files:**
- `cli/src/saas_client.rs` (NEW, 120 LOC) — `SaasClient` with `request_device_code()`, `poll_token()`, `sync_passport()`, `sync_scan()`, `sync_status()`
- `cli/src/headless/login.rs` (NEW, 80 LOC) — `run_login()`, `run_logout()` handlers
- `cli/src/config.rs` — +`StoredTokens`, +`save_tokens()`, +`load_tokens()`, +`clear_tokens()`, +`is_authenticated()`, +`chmod 0o600`
- `cli/src/cli.rs` — +`Login`, `Logout` commands

---

## F34: SaaS Sync Service (Engine Adapter)

**Sprint:** S3.5 (United Sprint 1) | **Status:** DONE

Engine-side HTTP adapter and routes that bridge CLI→Engine→SaaS for all sync operations.

| US | Title | Description |
|----|-------|-------------|
| US-U04 | Engine SaaS Sync Service | `saas-client.ts` — typed interfaces (SyncPassportPayload, SyncScanPayload, SyncDocPayload). `createSaasClient(baseUrl)` factory returns frozen object with 5 methods (syncPassport, syncScan, syncDocuments, syncStatus, fetchDataBundle). `sync.route.ts` — 4 Hono routes (POST /sync/passport, POST /sync/scan, POST /sync/documents, GET /sync/status). 36→18 field mapping via `mapPassport()`. Document type mapping (8 CLI→SaaS types). Token forwarded from CLI via request body |

**Key files:**
- `engine/core/src/infra/saas-client.ts` (NEW, 113 LOC) — 3 typed payload interfaces + SaasClient interface + factory
- `engine/core/src/http/routes/sync.route.ts` (NEW, 249 LOC) — `createSyncRoute(deps)` with 4 endpoints
- `engine/core/src/http/create-router.ts` — +sync route registration

---

## F35: Passport + Scan + Document Push

**Sprint:** S3.5 (United Sprint 1) | **Status:** DONE

CLI commands and Engine logic for pushing passports, scan results, and compliance documents to SaaS.

| US | Title | Description |
|----|-------|-------------|
| US-U05 | `complior sync` + Passport Push | `headless/sync.rs` — `run_sync()` checks auth, connects to Engine, pushes via POST /sync/passport. Engine reads all `.complior/passports/*.json`, maps 36 AgentPassport fields to SaaS payload, shows created/updated/conflicts per passport |
| US-U06 | Scan Result Push | Auto-sync: `scan.route.ts` extended with `saasToken` in Zod schema — after scan, if token present, push results to SaaS (non-blocking). Explicit: `complior sync --scan`. Engine reads last scan result, maps projectPath/score/findings/toolsDetected |
| US-U07* | Document Push | Engine reads `docs/compliance/*.md`, maps file names to SaaS document types (8 mappings in DOC_TYPE_MAP), pushes via `syncDocuments()`. `complior sync --docs` or `complior sync` (all) |

*US-U07 application logic (processDocuments.js) is on the SaaS side, but the Engine push client is here.

---

## F36: Data Bundle Client (ETag Cache)

**Sprint:** S3.5 (United Sprint 1) | **Status:** DONE

Engine downloads regulation data (obligations, scoring rules, tools) from SaaS API with ETag caching and offline fallback.

| US | Title | Description |
|----|-------|-------------|
| US-U10 | Data Bundle Client | `bundle-fetcher.ts` — `createBundleFetcher(saasUrl, cacheDir)` factory. `fetchIfUpdated()`: read ETag from cache → GET /v1/data/bundle with If-None-Match → 304 = no change, 200 = save bundle.json + bundle.etag. `getBundle()`: try online → fallback to cache → fallback to embedded data. Integrated into daemon startup (5s delay) + periodic refresh (5 min interval) |

---

## F37: TUI Sync Panel (Live Status)

**Sprint:** S3.5 (United Sprint 1) | **Status:** DONE

TUI Dashboard shows real SaaS sync status instead of "Run `complior login` to sync" stub.

| US | Title | Description |
|----|-------|-------------|
| US-U11 | TUI Sync Panel | `panels.rs` — replaced stub (lines 250-296) with real SyncState rendering. If authenticated: green indicator "● Connected (Org Name)", user email, last sync time, passport/scan counts, hotkeys [S] Sync now / [L] Logout. If not authenticated: current stub with login instruction. Background poll every 30s via Engine GET /sync/status |

---

## F38: S3.5 Code Audit Fixes

**Sprint:** S3.5 (post-sprint audit) | **Status:** DONE

Full code audit of Sprint S3.5 deliverables against CODING-STANDARDS. 11 issues fixed.

| # | Severity | Issue | File(s) | Fix |
|---|----------|-------|---------|-----|
| 1 | PANIC | UTF-8 byte-slicing on em-dash `—` | `panels.rs:215`, `render.rs:146`, `passport/mod.rs:306,609` | Created `truncate_str()` helper using `.chars().count()` + `.chars().take()` |
| 2 | HIGH | `as` type assertion (×3) | `saas-client.ts:68,82,108` | Type annotation `const data: Record<...> = await resp.json()` |
| 3 | HIGH | `as` type assertion (×2) | `scan.route.ts:26,32` | Extended Zod schema with `saasToken`, `saasUrl` fields |
| 4 | HIGH | `as` type assertion (×3) | `sync.route.ts:54,115,155` | `?? undefined`, `parseManifest()` helper with `'name' in parsed` guard |
| 5 | HIGH | `as` type assertion (×1) | `bundle-fetcher.ts:37` | Type annotation |
| 6 | HIGH | Credentials world-readable | `config.rs:296` | Added `#[cfg(unix)] set_permissions(path, 0o600)` after write |

---

## F39: S04 Fixes (FRIA JSON + Sync + Evidence)

**Sprint:** S04 | **Status:** DONE

Bugfixes and enhancements from S04 sprint (FRIA, Evidence Chain, SaaS sync).

| US | Title | Description |
|----|-------|-------------|
| US-S04-16 | FRIA structured JSON + sync | Structured JSON payload for FRIA, file watcher loop fix |
| — | S04 bug fixes | Evidence bloat fix, engine reliability, login UX, sync paths |

---

## F40: SDK Production (6 Hooks)

**Sprint:** S05 Phase 1 | **Status:** DONE | **Backlog:** S-09..S-36

6 production-ready SDK hooks covering EU AI Act Articles 5, 9, 26, 50 and EU Charter Art.21.

| US | Title | Description |
|----|-------|-------------|
| US-S05-01 | Prohibited Hook | 138 patterns across 8 Art.5 categories (subliminal manipulation, exploitation, social scoring, predictive policing, facial scraping, emotion inference, biometric categorization, real-time biometric ID). 6 languages (EN/DE/FR/NL/ES/IT). Configurable strictness (strict/standard). `ProhibitedContentError` with category + article reference |
| US-S05-02 | Sanitize Hook | 50+ PII types with checksum validation: IBAN (mod-97), BSN (11-check), NIR (mod-97 key), PESEL (weighted), Codice Fiscale. 6 PII categories (identity_national, identity_passport, financial, contact, medical, gdpr_art9). 3 modes: replace/block/warn. Context-dependent GDPR Art.9 matching |
| US-S05-03 | Permission Hook | Post-hook parsing `tool_calls` from 3 providers: OpenAI (`choices[].message.tool_calls[]`), Anthropic (`content[].type === 'tool_use'`), Google (`candidates[].content.parts[].functionCall`). Allowlist/denylist enforcement. Passport integration via `permissions.tools` |
| US-S05-04 | Disclosure Verify Hook | Multilingual disclosure phrase verification: EN/DE/FR/ES. Regex-based response checking. Configurable: warn-only vs block. Custom phrases via config. `DisclosureMissingError` |
| US-S05-05 | Bias Detection Hook | 15 protected characteristics (EU Charter Art.21). Weighted scoring: LOW/MEDIUM/HIGH/CRITICAL severity. 5 domain profiles: general/hr/finance/healthcare/education. Configurable threshold (0.3 default). `BiasDetectedError` with evidence array |
| US-S05-06 | HTTP Middleware | `compliorMiddleware()` factory for Express/Fastify/Hono/Next.js. Auto-inject headers: `X-AI-Disclosure`, `X-AI-Provider`, `X-AI-Model`, `X-Compliance-Score`. Headers configurable via whitelist/blacklist |

**Key files:**
- `engine/sdk/src/hooks/pre/prohibited.ts`, `sanitize.ts`
- `engine/sdk/src/hooks/post/permission-tool-calls.ts`, `disclosure-verify.ts`, `bias-check.ts`
- `engine/sdk/src/middleware/` — express.ts, fastify.ts, hono.ts, nextjs.ts
- `engine/sdk/src/data/` — prohibited-patterns.ts, pii-patterns.ts, bias-patterns.ts, disclosure-phrases.ts
- `engine/sdk/src/data/pii-validators/` — iban.ts, bsn.ts, nir.ts, pesel.ts, codice-fiscale.ts
- **Tests:** SDK 116→373 (+257 tests)

---

## F41: Engine Core — Documents + Passport Extensions

**Sprint:** S05 Phase 2 | **Status:** DONE | **Backlog:** E-13, E-18, E-33, E-30

Finding Explanations, Worker Notification, Passport Export Hub, Behavioral Constraints.

| US | Title | Description |
|----|-------|-------------|
| US-S05-07 | Finding Explanations | Static mapping `check_id → explanation` in JSON. Each has: article, penalty, deadline, business_impact. 19+ check_ids covered. `FindingExplanation` type in Rust. HTTP: included in `/scan` response |
| US-S05-08 | Worker Notification | `complior agent notify <name>`. Art.26(7) template pre-filled from passport: system name, purpose, data, capabilities, oversight. Saves to `.complior/reports/worker-notification-{name}.md`. Updates passport: `worker_notification_sent: true` |
| US-S05-09 | Passport Export Hub | 3 export formats: A2A (Google Agent Card), AIUC-1 compliance profile, NIST AI RMF Playbook. `complior agent export <name> --format a2a\|aiuc-1\|nist`. Zod-validated output. 36→target field mapping per format |
| US-S05-11 | Behavioral Constraints | Passport extension: `constraints.escalation_rules[]`, `permissions.data_boundaries{}`. Types: EscalationRule, DataBoundaries, PiiHandlingMode. Auto-fill on `agent init`. Scanner check: `checkBehavioralConstraints()` (L1, risk-class-aware). Shared helpers: `extractRiskClass()` in manifest-files.ts |

**Key files:**
- `engine/core/src/data/finding-explanations.json` — static check_id → explanation mapping
- `engine/core/src/domain/documents/worker-notification-generator.ts`
- `engine/core/data/templates/eu-ai-act/worker-notification.md`
- `engine/core/src/domain/passport/export/` — a2a-mapper.ts, aiuc1-mapper.ts, nist-mapper.ts
- `engine/core/src/domain/scanner/checks/behavioral-constraints.ts`
- `engine/core/src/domain/passport/manifest-files.ts` — shared helpers

---

## F42: Industry Patterns + Agent Registry + Permissions + Policy

**Sprint:** S05 Phase 2 | **Status:** DONE | **Backlog:** E-10, E-52..55, E-59

Agent Governance framework: industry scanning, registry, permissions matrix, audit trail, policy templates.

| US | Title | Description |
|----|-------|-------------|
| US-S05-12 | Industry-Specific Scanner Patterns | 4 domains: HR (5+ patterns: recruitment, CV screening, monitoring), Finance (5+: credit scoring, fraud, AML), Healthcare (5+: diagnosis, medical device, patient monitoring), Education (4+: admissions, grading, student monitoring). Shared source-filter architecture. Auto-update passport `industry_context` |
| US-S05-13 | Agent Registry + Per-Agent Score | `complior agent registry`. Per-agent: compliance score (0-100, weighted: passport 30% + scanner 40% + evidence 15% + docs 15%), autonomy level, last scan, completeness %, risk class. Filter/sort: `--sort score\|risk`, `--filter high-risk`. HTTP: `GET /agent/registry` |
| US-S05-14 | Permissions Matrix + Unified Audit Trail | Permissions matrix: agent × permission (tools, data, actions). Cross-agent conflict detection. Unified audit trail: `.complior/audit/trail.jsonl` (ed25519 signed, append-only). Events: passport + compliance + scan. `complior agent permissions`, `complior agent audit`. HTTP: `GET /agent/permissions`, `GET /agent/audit` |
| US-S05-15 | Policy Templates | 5 industry AI usage policy templates: HR, Finance, Healthcare, Education, Legal. Pure generator: `generatePolicy(input)` → `PolicyResult { markdown, prefilledFields, manualFields }`. Pre-fill from passport. `complior agent policy <name> --industry hr\|finance\|healthcare\|education\|legal`. HTTP: `POST /policy/generate`. Saves to `.complior/policies/` |

**Key files:**
- `engine/core/src/data/industry-patterns.ts` — patterns + IndustryId + INDUSTRY_TEMPLATE_MAP
- `engine/core/src/domain/registry/` — registry-calculator.ts, permissions-matrix.ts, audit-trail.ts
- `engine/core/src/domain/documents/policy-generator.ts` — pure policy generator
- `engine/core/data/templates/policies/` — 5 industry markdown templates
- `cli/src/headless/agent.rs` — registry, permissions, audit, policy CLI handlers

---

## F43: AIUC-1 Certification Readiness Score

**Sprint:** S05 Phase 3 | **Status:** DONE | **Backlog:** E-76, C.T01

`complior cert readiness <name>` — readiness score for AIUC-1 certification.

| US | Title | Description |
|----|-------|-------------|
| US-S05-19 | AIUC-1 Readiness Score | 6 requirement categories: documentation, testing, risk_management, monitoring, transparency, human_oversight. Per-requirement: status (met/partial/unmet), evidence from scan + passport + documents. Gap analysis: actionable list of what's missing. Overall readiness %: weighted by category criticality. Readiness levels: certified/near_ready/in_progress/not_started. HTTP: `GET /cert/readiness?name=X&path=Y`. CLI: `complior cert readiness <name> [--json]` |

**Key files:**
- `engine/core/src/domain/certification/aiuc1-readiness.ts` — pure score calculation
- `engine/core/src/data/certification/aiuc1-requirements.json` — requirement mapping
- `engine/core/src/http/routes/cert.route.ts` (NEW) — `GET /cert/readiness` with Zod validation
- `cli/src/cli.rs` — `CertAction::Readiness`
- `cli/src/headless/cert.rs` (NEW) — `run_cert_readiness()` with human-readable + JSON output

---

## F44: Guided Onboarding Wizard (5-Step)

**Sprint:** S05 Phase 3 | **Status:** DONE | **Backlog:** E-104

5-step guided onboarding: Detect → Scan → Passport → Fix → Document. 15 minutes to first compliance report.

| US | Title | Description |
|----|-------|-------------|
| US-S05-33 | Guided Onboarding Wizard | Pure domain state machine: `GuidedOnboardingState` with 5 steps. Functions: `createInitialState()`, `startOnboarding()`, `completeStep()`, `skipStep()`, `canRunStep()`, `getProgress()`. Shared `advanceStep()` (DRY). HTTP: `POST /onboarding/state`, `POST /onboarding/start`, `POST /onboarding/step/:n`. State persistence: `.complior/onboarding-progress.json` with Zod validation on load. Route orchestrates existing services (scan, passport, fix, fria). Can interrupt and resume |

**Key files:**
- `engine/core/src/domain/onboarding/guided-onboarding.ts` — pure state machine
- `engine/core/src/domain/onboarding/guided-onboarding.test.ts` — 7+ tests
- `engine/core/src/http/routes/guided-onboarding.route.ts` — route with `executeStep()` orchestrator
- `engine/core/src/http/create-router.ts` — state load/save with Zod validation, static imports

---

## F45: Compliance Diff in PR

**Sprint:** S05 Phase 3 | **Status:** DONE | **Backlog:** C-16, C-27

Compliance delta for pull requests: score before/after, new/resolved findings, PR gate support.

| US | Title | Description |
|----|-------|-------------|
| US-S05-34 | Compliance Diff in PR | `computeComplianceDiff(before, after, changedFiles?)` — pure function producing `ComplianceDiffResult { scoreBefore, scoreAfter, scoreDelta, newFindings, resolvedFindings, markdown }`. Changed-files filter: only shows findings from modified files. Markdown summary: formatted table for PR comments. HTTP: `POST /scan/diff` with Zod-validated `ScanDiffRequestSchema`. Uses `compareSeverity()` shared helper for severity sorting |

**Key files:**
- `engine/core/src/domain/scanner/compliance-diff.ts` — pure diff calculator
- `engine/core/src/domain/scanner/compliance-diff.test.ts` — tests
- `engine/core/src/http/routes/scan.route.ts` — `POST /scan/diff` with `ScanDiffRequestSchema`
- `engine/core/src/types/common.types.ts` — `compareSeverity()` helper

---

## F46: S05 Quality Fixes (2 rounds E2E + Code Audit)

**Sprint:** S05-QF (post-Phase 3 quality) | **Status:** DONE

Two full rounds of E2E testing + code audits. 21/21 E2E tests pass.

| # | Severity | Issue | File(s) | Fix |
|---|----------|-------|---------|-----|
| 1 | CRITICAL | `score.overall` doesn't exist (ScoreBreakdown has `totalScore`) | compliance-diff.ts, aiuc1-readiness.ts, +2 tests | `score.overall` → `score.totalScore` |
| 2 | CRITICAL | Onboarding Step 3 HTTP 500 — scoped npm names create subdirs | passport-service.ts | `mkdir(dirname(filePath), { recursive: true })` |
| 3 | CRITICAL | Onboarding route ignores `path` from request body | guided-onboarding.route.ts | `resolveProjectPath()` with Zod `RequestSchema` |
| 4 | HIGH | DRY violation: url_encode/resolve_client/ensure_engine duplicated | cert.rs, agent.rs → common.rs (NEW) | Extracted shared module `headless/common.rs` |
| 5 | HIGH | SRP violation: guided-onboarding.route.ts 130 LOC orchestration | guided-onboarding.route.ts | Extracted `executeStep()`, moved I/O to deps |
| 6 | HIGH | Unvalidated JSON.parse in loadOnboardingState | create-router.ts | `OnboardingStateSchema` Zod + `safeParse()` fallback |
| 7 | HIGH | `in` operator on potentially null `manifest.compliance` | passport-service.ts | `compliance && 'policy_generated' in compliance` |
| 8 | IMPORTANT | `DiffFinding.severity: string` → `Severity` type | compliance-diff.ts | Proper type import |
| 9 | IMPORTANT | `await import()` for standard Node modules | create-router.ts | Static imports |
| 10 | IMPORTANT | Inline Zod schemas in routes | scan.route.ts, cert.route.ts | Named constants: `ScanDiffRequestSchema`, `ReadinessQuerySchema` |
| 11 | MINOR | `skipStep` sets wrong status (`completed` vs `skipped`) | guided-onboarding.ts | Shared `advanceStep()` with parameterized status |

---

## F47: Runtime Control (Permission Scanner + Disclosure + Safety + Proxy)

**Sprint:** S05 Phase 4 | **Status:** DONE | **Backlog:** E-63..E-72

4 US delivering runtime compliance enforcement: AST-based permission detection, transparency disclosure, safety filtering, and compliance proxy.

| US | Title | Description |
|----|-------|-------------|
| US-S05-10 | Permission Scanner (AST-based) | Vercel AI SDK tool detection, file system operations, HTTP request patterns. Auto-updates passport `permissions.tools` from code analysis. `checkPermissionScanner()` L4 check |
| US-S05-16 | Disclosure + Content Marking + Logger | Runtime hooks: `createDisclosureInjector()` (Art.50 transparency notice), `createContentMarker()` (AI-generated content marking), `createInteractionLogger()` (Art.12 logging). 3 SDK pre/post hooks |
| US-S05-17 | Safety Filter + HITL Gate | `createSafetyFilter()` pre-hook: prohibited content blocking (Art.5), PII detection, context-aware filtering. `createHumanInTheLoopGate()`: approval queue for high-risk actions, timeout with auto-deny, callback integration |
| US-S05-18 | Compliance Proxy + SDK Adapters | `createComplianceProxy()` wraps any LLM client with full compliance stack. SDK adapter pattern: OpenAI, Anthropic, Google, Vercel AI. Config-driven hook composition. `compliorProxy(client, config)` convenience function |

---

## F48: Adversarial Test Runner

**Sprint:** S05 Phase 4 | **Status:** DONE | **Backlog:** E-73, C.T02

Adversarial testing framework for AI system robustness (Art.9(6)-(8) + Art.15(4)).

| US | Title | Description |
|----|-------|-------------|
| US-S05-20 | Adversarial Test Runner | `createAdversarialRunner(deps)` — 5 test categories: prompt injection, jailbreak, data extraction, bias probing, robustness. Per-test: severity, pass/fail, evidence. Overall robustness score (0-100). `complior cert test <name> [--json]`. HTTP: `POST /cert/test`. Results saved to `.complior/adversarial/`. Evidence chain integration |

---

## F49: Multi-Agent + Cost/Debt/Simulation

**Sprint:** S05 Phase 5 | **Status:** DONE | **Backlog:** E-74..E-80

5 US for multi-agent compliance, cost estimation, debt scoring, and simulation.

| US | Title | Description |
|----|-------|-------------|
| US-S05-22 | Compliance Debt Score | Technical debt scoring for compliance gaps. Weighted by severity × age × risk_class. Trend tracking. `complior agent debt <name> [--json]`. HTTP: `GET /agent/debt` |
| US-S05-25 | Compliance Simulation | What-if simulator: predict score impact of planned changes before implementation. `computeSimulation(current, planned)` pure function. HTTP: `POST /scan/simulate` |
| US-S05-26 | Multi-Agent Awareness | Per-agent compliance scan with SSE events. Agent grouping in TUI. Cross-agent conflict detection. `scan.agent` event type. Multi-passport scan aggregation |
| US-S05-27 | Compliance Cost Estimator | Estimate effort/cost to achieve target compliance score. Per-finding fix cost (time + complexity). Total cost to 100%. `complior agent cost <name> [--json]`. HTTP: `GET /agent/cost` |
| US-S05-35 | RegistryToolCard Refactor | `ModelComplianceCard` → `RegistryToolCard` rename for SaaS compatibility. Shared type between CLI and SaaS. Updated all references in registry, routes, tests |

---

## F50: Multi-Framework Scoring + TUI Metrics Widgets

**Sprint:** S05 Phase 5 | **Status:** DONE | **Backlog:** E-105, E-106, E-107

Dual-framework compliance scoring (EU AI Act + AIUC-1) and TUI dashboard metrics.

| Item | Description |
|------|-------------|
| Multi-Framework Scoring | `eu-ai-act-framework.ts` + AIUC-1 framework. Dual scores in scan result. Framework-specific obligation mapping. Interactive focus toggle in TUI (Tab key). `compliance-constants.ts` shared across frameworks |
| TUI Metrics Widgets | Dashboard Cost/Debt/Readiness sparkline widgets. `render_metric_widget()` reusable component. Score history visualization. Real-time SSE-driven updates |

---

## F51: LLM Chat Service + TUI Chat Page (9th View)

**Sprint:** S06 (partial) | **Status:** DONE | **Backlog:** E-47, C-23

LLM chat infrastructure in engine + dedicated 9th TUI page for interactive compliance chat.

| US | Title | Description |
|----|-------|-------------|
| US-S06-03 | LLM Chat Service | `chat-service.ts` — Anthropic Claude integration with SSE streaming. `rate-limiter.ts` — sliding window rate limiter. `POST /chat` route with Zod validation. System prompt with compliance context. Token tracking. Configurable model/temperature |
| US-S06-17 | TUI Chat Assistant (9th View) | Dedicated `C:Chat` page separated from `L:Log`. 9-view navigation (D/S/F/P/O/T/R/L/C). Chat = interactive (SYS/YOU/AI messages, input area, streaming, /cost /mode /model commands). Log = readonly status messages. `LlmSettings` overlay for model/provider configuration. SSE streaming with cancel support |

**Key files:**
- `engine/core/src/services/chat-service.ts` — LLM chat orchestration
- `engine/core/src/infra/rate-limiter.ts` — sliding window rate limiter
- `engine/core/src/http/routes/chat.route.ts` — SSE streaming endpoint
- `cli/src/views/chat.rs` — `render_chat_view()` + `render_log_view()`
- `cli/src/chat_stream.rs` — SSE stream parser
- `cli/src/llm_settings.rs` — LLM settings overlay
- `cli/src/types/chat.rs` — ChatMessage, ChatRole types

---

## F52: S05-S06 Quality Fixes

**Sprint:** S05-S06 post-sprint | **Status:** DONE

Code quality audit fixes across S05 Phase 4-5 and S06 deliverables.

| # | Issue | Fix |
|---|-------|-----|
| 1 | Daemon/TUI port discovery unreliable | DRY `find_preferred_port()` — prefer default 3099, fallback scan |
| 2 | SDK TypeScript strict compliance | Unused imports, return types, test await fixes |
| 3 | DRY/SRP audit | Extracted shared helpers, removed duplication across headless runners |
| 4 | `render_with_sidebar()` DRY | Eliminated duplicate sidebar layout code (Log + Chat views) |
| 5 | Charter doc alignment | Updated TUI-DESIGN-SPEC.md and PRODUCT-VISION.md for 9 pages |

---

## F53: Chat UX Improvements

**Sprint:** S06 | **Status:** DONE

Chat experience polish: multiline input, tool visibility, error handling, timestamp cleanup.

| US | Title | Description |
|----|-------|-------------|
| US-S06-18 | Chat UX Polish | Multiline input (Shift+Enter for newline, Enter to send). Tool names displayed in assistant messages. Inline error display. Scroll improvements. `[HH:MM]` timestamps removed from all messages (system, user, assistant) and status log for cleaner UI. Updated INDENT constant |

**Key changes:**
- `cli/src/views/chat.rs` — removed timestamp spans from all message types, updated INDENT
- `cli/src/app/overlays.rs` — multiline input handling
- `cli/src/types/chat.rs` — ChatMessage improvements

---

## F54: Onboarding Rework (10→8 Steps)

**Sprint:** S06 | **Status:** DONE

Major rework of TUI onboarding wizard: reduced from 10 to 8 steps, fixed persistence, blocked escape.

| US | Title | Description |
|----|-------|-------------|
| US-S06-19 | Onboarding Rework | 7 fixes: (1) Persistence bug — `find_project_root()` resolves absolute path instead of CWD-relative. (2) Navigation step removed (always standard). (3) Project Type simplified to 2 options: My project / Demo mode. (4) Jurisdiction → Requirements Frameworks (Checkbox: EU AI Act + ISO 42001). (5) Scan Scope step removed (always full scan). (6) AI Provider: 5 options (OpenRouter, Anthropic, OpenAI, Complior Guard API [RECOMMENDED], Offline) — BYOK key input for first 3. (7) Esc/Quit blocked during onboarding — must complete all steps. New `requirements: Vec<String>` field in ProjectConfig |

**Key files:**
- `cli/src/views/onboarding/steps.rs` — 8 step definitions (was 10)
- `cli/src/views/onboarding/mod.rs` — `selected_config_value()` updated for new steps
- `cli/src/views/onboarding/render.rs` — summary items, provider-specific key prompt
- `cli/src/app/overlays.rs` — Esc blocked, substep handlers for 5-option AI provider
- `cli/src/config.rs` — `find_project_root()`, `requirements` field, `save_onboarding_results()` rewrite

---

## F55: `complior init` + Project Root Discovery

**Sprint:** S06 | **Status:** DONE

`complior init` creates `.complior/` directory (like `git init`). Automatic project root discovery for existing projects.

| US | Title | Description |
|----|-------|-------------|
| US-S06-20 | Project Init + Root Discovery | `complior init [path]` creates `.complior/` with `project.toml` (TUI config) + `profile.json` (engine config). `find_project_root()`: walks up directory tree (max 10 levels, stops at `$HOME`) looking for 9 project markers: `.complior/`, `.git/`, `Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`, `pom.xml`, `build.gradle`, `.project`. Fallback to CWD. `default_project_toml()` public function. If `init` not run manually, `.complior/` auto-created during onboarding completion |

**Key files:**
- `cli/src/config.rs` — `find_project_root()`, `project_config_path()`, `default_project_toml()`
- `cli/src/headless/commands.rs` — enhanced `run_init()` with `project.toml` + `profile.json`

---

## F56: Scanner Intelligence (Import Graph + Multi-Language + Git History + L5)

**Sprint:** S08/S09 (partial) | **Status:** DONE

5 scanner enhancement modules + code quality refactoring for production-grade compliance scanning.

| US | Title | Description |
|----|-------|-------------|
| E-109 | L4 Import Graph | `import-graph.ts` — static import analysis across 5 ecosystems. 45 AI SDK packages (npm 28, pip 7, Go 5, Rust 8, Java 6). Dependency chain tracking. Wired into `create-scanner.ts` pipeline |
| E-111 | Multi-Language Scanner | `languages/adapter.ts` — Go, Rust, Java language adapters. Regex-based pattern detection for AI SDK usage, logging, error handling, kill-switch patterns per language. `detectLanguagePatterns()` unified entry point |
| E-112 | Git History Analysis | `checks/git-history.ts` — 21 compliance document types tracked. `analyzeGitHistory()` checks file age, update frequency, staleness. `gitHistoryToCheckResults()` converter. Wired via `GitHistoryPort` + `git-history-adapter.ts` |
| E-113 | Targeted L5 Analysis | `layers/layer5-targeted.ts` — 8 LLM prompts for targeted deep analysis (50-80% confidence range). Focuses on specific compliance gaps identified by L1-L4. Cost-efficient partial L5 scans |
| E-114 | L5 Document Validation | `layers/layer5-docs.ts` — LLM-powered document quality validation. 4 doc types (FRIA, transparency notice, monitoring plan, risk assessment). 34 validation elements. `buildDocValidationPrompt()` + `docValidationToFindings()` |

**Key files:**
- `engine/core/src/domain/scanner/import-graph.ts` — import analysis engine
- `engine/core/src/domain/scanner/languages/adapter.ts` — Go/Rust/Java adapters
- `engine/core/src/domain/scanner/checks/git-history.ts` — git history checks
- `engine/core/src/domain/scanner/layers/layer5-targeted.ts` — targeted L5 prompts
- `engine/core/src/domain/scanner/layers/layer5-docs.ts` — doc validation via LLM
- `engine/core/src/domain/scanner/checks/gpai-systemic-risk.ts` — GPAI Art.51-52 checks
- `engine/core/src/domain/documents/ai-enricher.ts` — LLM document enrichment
- **Tests:** TS 862→1255 (+393 tests)

---

## F57: Enhanced CLI Scan Output

**Sprint:** S08/S09 (partial) | **Status:** DONE

Human-readable scan output enriched with severity summary, fix roadmap, deadline countdown, fix type badges, and actionable next steps.

| Item | Description |
|------|-------------|
| Severity Summary | Counts by severity (critical/high/medium/low) + fixability breakdown (auto-fixable, suggestions, manual) |
| Deadline Countdown | EU AI Act enforcement countdown (days until Aug 2, 2026) |
| Fix Type Badges | `[A]` code fix, `[B]` missing doc, `[C]` config change — on every finding |
| Obligation IDs | `Obligation: OBL-015` shown per finding when available |
| Business Impact | From `FindingExplanation.business_impact` — explains real-world consequence |
| Auto-Fix Indicator | `=>` for auto-fixable (has fixDiff), `->` for suggestion only |
| Fix Roadmap | Top 5 fixes sorted by predicted score impact (+8/+5/+3/+1), cumulative gain |
| Next Steps | Structured section with actionable commands (`complior fix`, `complior scan --json`, `complior scan --deep`) |

**Key files:**
- `cli/src/headless/format.rs` — `render_severity_summary()`, `render_deadline_countdown()`, `render_fix_roadmap()`, `render_finding_group()` enhanced, `render_footer()` restructured
- `cli/src/headless/tests.rs` — 8 new tests for all output enhancements
- **Tests:** Rust 433→466 (+33 tests)

---

## F58: Code Quality Audit (H1/H4/C1)

**Sprint:** S08/S09 (partial) | **Status:** DONE

Architecture and DRY cleanup: unified extension lists, centralized AI package registry, Clean Architecture fix.

| Item | Description |
|------|-------------|
| H1: Unified Extensions | `data/scanner-constants.ts` — `CODE_EXTENSIONS`, `DOC_EXTENSIONS`, `CONFIG_EXTENSIONS`, `STYLE_EXTENSIONS`, `AST_SUPPORTED_EXTENSIONS`, `ALL_SCANNABLE_EXTENSIONS`. Replaced 6 inline sets across scanner modules |
| H4: AI Package Registry | `data/ai-packages.ts` — central registry with ecosystem-tagged entries. Exports: `NPM_AI_PACKAGES`, `PIP_AI_PACKAGES`, `GO_AI_PACKAGES`, `RUST_AI_PACKAGES`, `JAVA_AI_PACKAGES`. Replaced 4 scattered lists |
| C1: File Collector Move | `domain/scanner/file-collector.ts` → `infra/file-collector.ts`. Port interface: `FileCollectorPort`. Clean Architecture: domain no longer does direct filesystem I/O |
| GPAI Checks | `checks/gpai-systemic-risk.ts` — Art.51/52 GPAI systemic risk compliance checks |
| AI Enricher | `documents/ai-enricher.ts` — LLM-powered document section enrichment |
| E2E Tests | `e2e/gaps-e2e.test.ts` — end-to-end gap closure verification |

**Key files:**
- `engine/core/src/data/scanner-constants.ts` — unified extension constants
- `engine/core/src/data/ai-packages.ts` — centralized AI SDK package registry
- `engine/core/src/infra/file-collector.ts` — moved from domain/ (C1 fix)
- `engine/core/src/domain/scanner/checks/gpai-systemic-risk.ts` — GPAI checks
- `engine/core/src/domain/documents/ai-enricher.ts` — LLM enrichment

---

## F59: Scanner Tier-2 (External Tools + Multi-Framework)

**Sprint:** S10 (partial) | **Status:** DONE

Scanner Tier-2: external SAST tools (Semgrep, Bandit) via subprocess, finding mapper/dedup, multi-framework scoring (OWASP/MITRE/NIST), scan cache wiring.

| US | Title | Description |
|----|-------|-------------|
| US-S10-01 | Obligation Mapper | OWASP LLM Top 10 + MITRE ATLAS + NIST AI RMF mapping tables. `findingToFrameworks(finding)` cross-framework mapper. Data: `owasp-llm/categories.json`, `mitre-atlas/techniques.json` |
| US-S10-08 | Semgrep Runner | `external/semgrep-runner.ts` — subprocess Semgrep execution, SARIF output parsing, finding normalization. Tier-2 SAST for taint analysis and control flow |
| US-S10-09 | Bandit Runner | `external/bandit-runner.ts` — Python security scanner via subprocess. Bandit JSON output → complior findings with severity mapping |

**Key files:**
- `engine/core/src/domain/scanner/external/semgrep-runner.ts` — Semgrep subprocess + SARIF parsing
- `engine/core/src/domain/scanner/external/bandit-runner.ts` — Bandit subprocess + JSON parsing
- `engine/core/src/domain/scanner/external/finding-mapper.ts` — external finding → complior Finding normalization
- `engine/core/src/domain/scanner/external/dedup.ts` — cross-tool finding deduplication
- `engine/core/src/domain/scanner/score-calculator.ts` — multi-framework score extensions
- `engine/core/src/domain/scanner/fix-diff-builder.ts` — enhanced fix diff generation
- `engine/core/src/domain/scanner/fix-diff-builder.test.ts` — 38 builder tests (NEW)
- **Tests:** TS 1255→1407 (+152 tests)

---

## F60: CLI Scan Output SRP Rewrite

**Sprint:** S10 (partial) | **Status:** DONE

Complete SRP rewrite of headless scan output: monolithic `format.rs` split into `format/` module with dedicated files for colors, labels, and layer rendering.

| Item | Description |
|------|-------------|
| format/ module | `cli/src/headless/format/mod.rs` — public API, severity summary, fix roadmap, next steps, deadline countdown |
| colors.rs | ANSI terminal color utilities with `NO_COLOR` / `TERM=dumb` detection. `OnceLock`-cached. Helpers: `red`, `green`, `yellow`, `cyan`, `bold`, `dim`, `score_color`, `severity_icon`, `layer_status_color` |
| labels.rs | `check_label(check_id)` — maps 20+ check IDs to human-readable names (e.g. `l4-bare-llm` → "Bare LLM Call Detected") |
| layers.rs | `render_layer_group()` — per-layer finding group rendering with severity icons, article refs, obligation IDs, fix badges, business impact |

**Key files:**
- `cli/src/headless/format/mod.rs` — public API module
- `cli/src/headless/format/colors.rs` — ANSI color system
- `cli/src/headless/format/labels.rs` — check ID → label mapping
- `cli/src/headless/format/layers.rs` — layer-grouped finding rendering

---

## F61: Fix Report — Scaffold Badges + Code Fix Dedup + Upgrade CTA

**Sprint:** S10 (partial) | **Status:** DONE

Fix report enhancements: distinguish scaffold (create-action) fixes from inline (splice) fixes, collapse duplicate code fixes, dedup file paths, and add upgrade guidance.

| US | Title | Description |
|----|-------|-------------|
| US-S10-FIX-01 | Scaffold Badge Detection | `FixEntry.is_scaffold: bool` — true when all plan actions are type `create`. Detected in `extract_entries()` from engine JSON response |
| US-S10-FIX-02 | Scaffold Badges + Hints | `[SCAFFOLD]` yellow badge on document/code/config entries. `scaffold_hint(check_id, fix_type)` returns context-aware recommendation per fix type (6 variants: template_generation, metadata_generation, config_fix with 3 sub-matches, code_injection, dependency_fix) |
| US-S10-FIX-03 | Code Fix Dedup | `normalize_code_desc()` strips `Inline fix:` prefix and ` at file:line` / ` from file` suffixes, capitalizes first letter. Collapses 52 individual fixes → 5 merged rows with `(+ N more)` file count. File path dedup prevents duplicate paths in merged rows |

**Additional changes:**
- `pad_article()` — ensures minimum gap between article and label (fixes `Art. 50(1)Wrap` → `Art. 50(1) Wrap`)
- UPGRADE → PRODUCTION CTA section: shown when scaffold fixes exist, recommends `complior fix --ai` and MCP agent connection
- 8 new unit tests: normalize_code_desc (4), pad_article (2), scaffold_hint (1), scaffold detection (1)

**Key files:**
- `cli/src/headless/fix.rs` — all scaffold badge, dedup, and CTA logic (single file, +637/-83 LOC)
- **Tests:** Rust 466→487 (+21 tests including 8 fix-specific)

---

## F62: FIX.md Pipeline Documentation

**Sprint:** S10 (partial) | **Status:** DONE

Comprehensive documentation of the fix pipeline: methodology, 5 fix categories, 18 scaffold strategies, inline splice mechanics, evidence chain integration.

| Item | Description |
|------|-------------|
| FIX.md | `docs/FIX.md` — full fix pipeline docs: PHASE 1 (Discovery), PHASE 2 (Planning), PHASE 3 (Apply). 5 categories (A: Code, B: Docs, C: Config, D: Deps, E: Passport). 18 strategies mapped to articles. Inline fix mechanics: constructor detection, paren-depth tracking, import injection. Backup/undo via `.complior/backups/` |

---

## F63: Passport Production Rewrite (10 Fixes)

**Sprint:** S06 (partial) | **Status:** DONE

Production-grade rewrite of Agent Passport Mode 1 (auto-generation). 10 fixes to make `complior agent init` EU AI Act Art.26 deployer-compliant.

| # | Fix | Description |
|---|-----|-------------|
| 1 | resolveRiskClass | Risk classification from project profile (domain + autonomy). HR recruitment + L3 = **high** per Annex III. Takes HIGHER of autonomy-based and domain-based risk. Falls back to autonomy-only if no profile |
| 2 | getApplicableArticles | Dynamic article mapping per risk class: high → 10 articles (Art.6,9,11-14,26,27,49,50), limited → Art.50+52, minimal → Art.50. Replaces hardcoded `['Art.50.1', 'Art.50.2', 'Art.12']` |
| 3 | inferDataResidency | From profile `data.storage` or provider fallback. `'eu'`→`'eu'`, `'us'`→`'us'`, `'mixed'`→`'global'`. Provider fallback: anthropic/openai/google → `'us'`. Replaces `'unknown'` |
| 4 | generateDescription | Contextual: `"Openai-based autonomous agent for healthcare, using gpt-4 (openai), with 5 tools, at autonomy level L4"`. Replaces generic `"AI agent using ${framework}"` |
| 5 | buildOversight | Oversight block for high-risk / L3+ autonomy. Uses `killSwitchPresent` for `override_mechanism`. Returns `undefined` for minimal/limited + L1/L2 |
| 6 | computeDeployerObligations | Groups `OBLIGATION_FIELD_MAP` by obligation ID. All fields filled → met, else → pending. Returns `{ met: string[], pending: string[] }` |
| 7 | computeNextReview | `next_review = created + 90 days` (YYYY-MM-DD). Replaces empty string |
| 8 | killSwitch export | `killSwitchPresent: boolean` exported from `autonomy-analyzer.ts`. Was computed but discarded |
| 9 | Deep completeness | `passport-completeness.ts` uses deep paths (34 required fields like `owner.team`, not `owner`). High-risk adds `oversight.responsible_person`, `oversight.override_mechanism` |
| 10 | Auto-update after scan | `updatePassportsAfterScan()` in passport-service.ts. Wired via `events.on('scan.completed')` in composition-root.ts. Refreshes `complior_score` + `last_scan` on all passports |

**Key files:**
- `engine/core/src/domain/passport/manifest-builder.ts` — fixes 1-7 (resolveRiskClass, getApplicableArticles, inferDataResidency, generateDescription, buildOversight, computeNextReview, obligation computation)
- `engine/core/src/domain/passport/autonomy-analyzer.ts` — fix 8 (killSwitchPresent export)
- `engine/core/src/domain/passport/obligation-field-map.ts` — fix 6 (computeDeployerObligations)
- `engine/core/src/domain/scanner/checks/passport-completeness.ts` — fix 9 (deep-path checking)
- `engine/core/src/services/passport-service.ts` — fixes 1,10 (profile read, updatePassportsAfterScan)
- `engine/core/src/composition-root.ts` — fix 10 (scan.completed → passport update wiring)
- **Tests:** TS 1407→1439 (+32), Rust 487→489 (+2)

---

## F64: Eval Subsystem (Conformity + Security + LLM Judge)

**Sprint:** S11 (partial) | **Status:** DONE

Full AI system evaluation pipeline: 688 tests (176 deterministic + 212 LLM-judged + 300 security probes), 5 target adapters, LLM-as-judge with 11 specialized OWASP rubrics, dedicated judge model, scoring engine, passport integration, evidence chain, CLI commands.

| US | Title | Description |
|----|-------|-------------|
| E-130 | Eval Core Runner | `eval-runner.ts` — 6-phase pipeline: load tests → run deterministic → run LLM-judged → run security probes → score → persist. `EvalRunnerDeps` with DI. `EvalTestSources` lazy loader. `verdict-utils.ts` shared helpers (countVerdicts, calculateScore) |
| E-131 | LLM Judge + Dedicated Judge Model | `llm-judge.ts` — LLM-as-judge for subjective conformity tests. `COMPLIOR_JUDGE_API_KEY` env var: auto-detect provider from key format (Anthropic/OpenRouter/OpenAI). Separate judge avoids circular grading. Fallback: target adapter → deps.callLlm → regex-only |
| E-132 | Security Probes (300 OWASP) | `security-integration.ts` — bridges 300 `AttackProbe` → eval pipeline. 10 OWASP LLM Top 10 categories + Art.5. `adaptProbesForEval()`, `calculateEvalSecurityScore()` with per-category breakdown. `security-rubrics.ts` — 11 specialized rubrics with few-shot examples per OWASP category |
| E-133 | Conformity Scoring Engine | `conformity-score.ts` — per-category weighted scoring. 11 categories: transparency, oversight, explanation, bias, accuracy, robustness, prohibited, monitoring, risk-awareness, gpai, industry. Grade assignment: A (90+), B (75+), C (60+), D (40+), F (<40). Security cap: critical fail → max grade C |
| E-134 | Passport Integration | `eval-passport.ts` — `buildPassportEvalBlock()` creates passport-compatible eval summary. `mergeEvalIntoPassport()` — non-destructive merge into existing passport JSON |
| E-135 | Evidence Chain Integration | `eval-evidence.ts` — converts EvalResult to evidence entries. Per-test + summary entries. `evalResultHash()` for chain verification. `summarizeTestResults()` for compact storage |
| E-136 | Report Generation | `eval-report.ts` — markdown report from EvalResult. Sections: summary, per-category breakdown, security analysis, failed tests detail, recommendations |
| E-137 | Specialized Security Rubrics | `security-rubrics.ts` — 11 per-OWASP rubrics (LLM01-LLM10 + ART5). Each has: systemPrompt with PASS/FAIL criteria, 2-3 few-shot examples. Injected via `EvalRunnerDeps.getSecurityRubric` (Clean Architecture) |
| E-138 | Eval Adapters (5 Providers) | `adapters/` — OpenAI, Anthropic, Ollama, HTTP (generic), Custom (request template + response path). `auto-detect.ts` — URL-based auto-detection. `TargetAdapter` port with `send()` + `healthCheck()` |
| E-139 | Expanded Conformity Tests | 176 deterministic tests across 11 CT categories + 212 LLM-judged tests. CT-6 robustness (injection patterns), CT-7 prohibited (copyright, graphic, profanity), CT-11 industry (specialized advice refusal). `deterministic-evaluator.ts` with 88 refusal patterns |
| C-29 | CLI `complior eval` | `headless/eval.rs` — `complior eval <url> [--model M] [--api-key K] [--tier det\|llm\|security\|full] [--json] [--ci --threshold N]`. Progress display with live category scores. Summary: conformity + security scores, grade, pass/fail counts. OWASP breakdown table |
| C-31 | CLI `complior audit` | `headless/eval.rs` — `complior audit` reads last eval result from `.complior/eval/latest.json`. Displays cached results without re-running eval |

**Key files:**
- `engine/core/src/domain/eval/` — eval-runner.ts, types.ts, conformity-score.ts, llm-judge.ts, eval-passport.ts, eval-evidence.ts, eval-report.ts, verdict-utils.ts
- `engine/core/src/domain/eval/adapters/` — adapter-port.ts, auto-detect.ts, openai-adapter.ts, anthropic-adapter.ts, ollama-adapter.ts, http-adapter.ts, custom-adapter.ts
- `engine/core/src/data/eval/` — 11 CT files (ct-1 through ct-11), deterministic-evaluator.ts, index.ts, security-rubrics.ts
- `engine/core/src/data/security/attack-probes.ts` — 300 security probes
- `engine/core/src/services/eval-service.ts` — application orchestration
- `engine/core/src/http/routes/eval.route.ts` — POST /eval, GET /eval/latest, GET /eval/list
- `cli/src/headless/eval.rs` — CLI eval + audit runners
- **Tests:** TS 1439->1626 (+187), Rust 489->505 (+16)

---

## F65: Eval Remediation (Knowledge Base + Fix Generator + CLI Output)

**Sprint:** S12-REM | **Status:** DONE

22 remediation playbooks (11 CT categories + 11 OWASP LLM Top 10), per-test mapping for 176 deterministic + 300 security probes, system prompt patch generator, API config patch generator, CLI inline recommendations with Fix/Why per failure.

| US | Title | Description |
|----|-------|-------------|
| US-REM-01 | CT Category Playbooks | 11 playbooks (`ct-1-transparency.ts` .. `ct-11-industry.ts`). Each: 3-5 `RemediationAction` items with `user_guidance` (why, what_to_do[], verification, resources[]). Types: `system_prompt`, `api_config`, `infrastructure`, `process`. Priority/effort/article_ref per action |
| US-REM-02 | OWASP Playbooks | 11 playbooks (`owasp-llm01.ts` .. `owasp-art5.ts`). Each extends `CategoryPlaybook` with `owasp_ref` + `cwe_ref`. Concrete actionable steps: regex patterns, code examples, verification procedures |
| US-REM-03 | Per-Test Mapping | `test-mapping.ts` — 176 deterministic tests explicitly mapped to 1-3 action IDs. 300 security probes: fallback by `owaspCategory`. CT fallback: top-3 actions by priority. `getRemediationForTest(testId, category, playbooks, owaspCategory)` |
| US-REM-05 | System Prompt Patch Generator | `eval-fix-generator.ts` — `generateSystemPromptPatch(failures, playbooks)`: groups by category, deduplicates, sorts by priority. Pure function, no LLM. Outputs markdown with numbered instruction blocks |
| US-REM-06 | API Config Patch Generator | `generateApiConfigPatch(failures, playbooks)`: headers (`x-ai-disclosure`, etc.), input validation (banned patterns), output validation (PII filter, prompt leak). Structured JSON output |
| US-REM-07 | CLI Inline Recommendations | `eval.rs` — `Fix:` and `Why:` lines per failure + `Prompt:` field showing request. COMPLIANCE GAPS section (all 11 categories with descriptions). `--no-remediation` flag. Text wrapping with column alignment via `wrap_aligned()` + `term_width()` |
| US-REM-08 | Remediation Report Export | `eval-remediation-report.ts` — `generateRemediationReport()` + `renderRemediationMarkdown()`. `--remediation` CLI flag → full report. Executive summary, prioritized action plan (top 10), system prompt patch, API config patch. JSON + markdown formats |

**Key files:**
- `engine/core/src/domain/eval/remediation-types.ts` — `RemediationAction`, `CategoryPlaybook`, `OwaspPlaybook`, `ApiConfigPatch`, `RemediationReport`
- `engine/core/src/data/eval/remediation/` — 22 playbook files + index.ts + test-mapping.ts
- `engine/core/src/domain/eval/eval-fix-generator.ts` — system prompt + API config generators
- `engine/core/src/domain/eval/eval-remediation-report.ts` — report generation + markdown rendering
- `engine/core/src/domain/eval/eval-constants.ts` — shared constants (PRIORITY_ORDER, CATEGORY_ARTICLES, CATEGORY_FINES, PRIORITY_TIMELINE, findPlaybook, groupFailuresByCategory)
- `engine/core/src/domain/eval/verdict-utils.ts` — shared `isFailedVerdict` predicate
- `cli/src/headless/eval.rs` — inline Fix/Why, Prompt field, COMPLIANCE GAPS, wrap_aligned()
- **Tests:** TS 1626→1876 (+250), Rust 505→524 (+19)

---

## F66: Eval → Passport Sync + Fix Pipeline Integration

**Sprint:** S12-REM | **Status:** DONE

Eval results auto-sync to Agent Passport, eval failures convert to Fix pipeline findings, `complior eval --fix` interactive mode.

| US | Title | Description |
|----|-------|-------------|
| US-REM-04 | Eval → Passport Auto-Sync | `eval-service.ts` calls `updatePassportEval` after eval. `eval-passport.ts` — `buildPassportEvalBlock()` creates compliance.eval block (conformity_score, security_score, grades, category_pass_rates, critical_gaps). `mergeEvalIntoPassport()` — non-destructive merge with Object.freeze. Wired via composition-root deps |
| US-REM-09 | Eval → Findings Pipeline | `eval-to-findings.ts` — `evalToFindings(result, playbooks)` converts eval failures to `Finding[]`. Type mapping: transparency/prohibited → Type A (system prompt), security → Type B (guardrails.json), bias → Type B (checklist). HTTP: `GET /eval/findings`. CLI: `complior fix --source eval` |
| US-REM-10 | `complior eval --fix` Interactive | `--fix` flag runs eval → shows results → lists available fixes → interactive apply/skip. `--fix --dry-run` for preview only. Reuses existing fix preview from `headless/fix.rs`. Applied fixes saved to `.complior/eval-fixes/` |

**Key files:**
- `engine/core/src/domain/eval/eval-passport.ts` — passport eval block builder + merger (Object.freeze)
- `engine/core/src/domain/eval/eval-to-findings.ts` — eval result → Finding converter
- `engine/core/src/services/eval-service.ts` — orchestration with passport sync + findings + remediation
- `engine/core/src/http/routes/eval.route.ts` — GET /eval/remediation, POST /eval/remediation-report, GET /eval/findings
- `engine/core/src/composition-root.ts` — wiring updatePassportEval dep
- `cli/src/cli.rs` — `--fix`, `--dry-run`, `--remediation`, `--no-remediation`, `--source` flags
- `cli/src/main.rs` — flag passthrough

---

## F67: Eval → Passport Binding + Passport Rename

**Sprint:** S12-REM | **Status:** DONE

Eval results are written only to the passport specified by `--agent`. New `complior agent rename` command for passport management.

| US | Title | Description |
|----|-------|-------------|
| US-REM-11 | Eval → Passport Binding via --agent | CLI validates passport existence before eval via `GET /agent/show`. If not found → interactive prompt to create. If no `--agent` → hint shown, eval runs without passport sync. Engine `updatePassportEval` filters by `result.agent` (writes only to named passport, not all). CI/JSON modes skip interactive prompts |
| US-REM-12 | Passport Rename | `complior agent rename <old> <new>`. Engine: `renamePassport()` in passport-service.ts — reads old passport, updates `name` field, re-signs ed25519, writes new file, deletes old. Validates target doesn't exist. Audit trail entry. HTTP: `POST /agent/rename` with Zod validation |

**Key files:**
- `cli/src/headless/eval.rs` — passport existence check, interactive create prompt, hint for missing --agent
- `engine/core/src/composition-root.ts` — `updatePassportEval` filters by `result.agent`
- `engine/core/src/services/passport-service.ts` — `renamePassport()` method
- `engine/core/src/http/routes/agent.route.ts` — `POST /agent/rename` route
- `cli/src/cli.rs` — `AgentAction::Rename` variant
- `cli/src/headless/agent.rs` — `run_agent_rename()` handler

---

## F68: CLI Onboarding Removal + Doc Sync

**Sprint:** S12-REM | **Status:** DONE

Removed CLI onboarding commands (`complior onboarding [start|status|step|reset]` and `complior agent onboard [--step N]`). TUI onboarding wizard and engine onboarding code remain untouched.

| US | Title | Description |
|----|-------|-------------|
| US-REM-13 | CLI Onboarding Removal | Deleted `headless/onboarding.rs`, removed `Command::Onboarding` + `OnboardingAction` enum + `AgentAction::Onboard` from cli.rs, removed 3 helper functions from common.rs (`ONBOARDING_STEP_NAMES`, `print_onboarding_status`, `print_onboarding_step_result`), removed dispatch from main.rs. 6 CLI tests removed. Docs synced: FEATURE-AGENT-PASSPORT.md pipeline updated to match README.md flow (init → scan → agent init → validate → fria → fix → scan → eval → export) |

**Key files deleted:**
- `cli/src/headless/onboarding.rs`

**Key files edited:**
- `cli/src/headless/mod.rs`, `cli/src/headless/common.rs`, `cli/src/headless/agent.rs`
- `cli/src/cli.rs`, `cli/src/main.rs`
- `docs/FEATURE-AGENT-PASSPORT.md`

---

## Sprint S05 — Remaining (NOT YET IMPLEMENTED)

4 US from S05 are planned but not yet started:

| Phase | US | Title | Priority |
|-------|-----|-------|----------|
| 5 | US-S05-21 | Supply Chain Audit + Model Compliance Cards | MEDIUM |
| 5 | US-S05-23 | Dependency Deep Scan | MEDIUM |
| 5 | US-S05-24 | Agent Test Suite Gen + Manifest Diff | MEDIUM |
| 5 | US-S05-28-32 | SaaS features (Unified Registry, Wizard, Badge) | CRITICAL (SaaS repo) |
