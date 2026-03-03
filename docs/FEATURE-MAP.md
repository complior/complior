# Complior CLI — Feature Map

> Maps every feature to implementation status.
> Each feature lists its completed user stories with implementation details.
> Sprint burndown numbers → see [BURNDOWN.md](./BURNDOWN.md)

**Updated:** 2026-03-03
**Current status:** Sprint S04 in progress (Agent Passport)
**Tests:** 811 | **TS Engine:** 410 | **Rust CLI:** 306 | **SDK:** 95

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
| F25 | Agent Passport Mode 1 (Auto) | **DONE** | 1 | S04 |
| **TOTAL** | | | **~116** | |

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

**Sprint:** S04 | **Status:** DONE | **Backlog:** C.S01, C.S02

`complior agent init` — auto-generates `agent-manifest.json` from codebase analysis.

| US | Title | Description |
|----|-------|-------------|
| US-S03-02 | Agent Passport Auto-Generation | Full pipeline: discover AI agents (57 SDKs) → rate autonomy L1-L5 → scan permissions → build 36-field manifest → ed25519 sign → save to `.complior/agents/`. TS: 6 domain modules + service + HTTP routes. Rust: `complior agent init\|list\|show` commands + TUI data binding. 35 TS + 8 Rust tests |

**Implementation details:**
- **Types:** `passport.types.ts` — 36-field `AgentManifest` + Zod, AutonomyLevel L1-L5, AgentType, PassportRiskClass
- **Discovery:** `agent-discovery.ts` — framework detection (LangChain, CrewAI, OpenAI, Anthropic, Vercel AI, LlamaIndex), model detection
- **Autonomy:** `autonomy-analyzer.ts` — L4 results → L1-L5 rating (human gates, unsupervised actions, logging, kill-switch)
- **Permissions:** `permission-scanner.ts` — tools, DB access (read/write/delete), MCP configs, human approval patterns
- **Manifest:** `manifest-builder.ts` — assembles 36 fields, risk class inference, confidence calculation
- **Crypto:** `crypto-signer.ts` — ed25519 via Node.js native crypto, `~/.config/complior/keys/`
- **Service:** `passport-service.ts` — orchestrator: collectFiles → discover → analyze → build → sign → save
- **HTTP:** `agent.route.ts` — POST /agent/init, GET /agent/list, GET /agent/show
- **CLI:** `agent.rs` — human-readable + JSON output for all 3 subcommands
- **Bug fixes:** `config.engine_url()` now respects `--engine-url` override; auto-discover daemon via PID file
