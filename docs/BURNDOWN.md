# BURNDOWN.md — Sprint Burndown Charts

---

## Sprint 1 (TS Engine + Scanner Foundation)

**Total Story Points:** 47
**Duration:** 2026-02-18 (1 day)
**Team:** Claude Code (Team Lead), 3 parallel agents (scanner-agent, score-agent, modules-agent)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-18 | 47 | 47 | Sprint start (plan approved, 10 phases) |
| 1 | 2026-02-18 | 0 | 0 | All 11 US done: Types, Data Layer, Scanner (7 checks), Score Engine, LLM, Coding Tools, HTTP Server, Compliance Gate |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 47 |
| Completed SP | 47 |
| Velocity | 47 SP / 1 day |
| Carry-over | 0 |

### Sprint 1 Completion Summary

**Phase 0–1: Setup + Types (3 SP)**
- Vitest config, directory structure, npm deps (@hono/node-server, tsx, @ai-sdk/openai, @ai-sdk/anthropic)
- `types/common.types.ts` — 18 shared types (RiskLevel, Severity, CheckResult, Finding, ScanResult, ScoreBreakdown, ProjectProfile, GateResult, etc.)
- `types/errors.ts` — AppError hierarchy (6 error classes: Validation, NotFound, Config, Scan, LLM, Tool)

**US-002 — Data Layer (5 SP)**
- `data/schemas.ts` — Zod schemas for all 8 regulation JSONs (nullable/optional fields matching real data)
- `data/regulation-loader.ts` — Parallel load + validate 108 obligations, lazy singleton cache, <500ms

**US-003 — Scanner (10 SP)**
- `core/scanner/file-collector.ts` — Recursive file walking, exclusions, 500 file / 1MB limits
- 7 pure check functions: ai-disclosure, content-marking, interaction-logging, ai-literacy, gpai-transparency, compliance-metadata, documentation
- `core/scanner/index.ts` — Scanner orchestrator, runs all checks, converts to Findings

**US-004 — Score Engine (5 SP)**
- `core/scanner/score-calculator.ts` — Weighted scoring (8 categories from scoring.json), critical obligation cap (→ max 40%), red/yellow/green zones, score diff tracking

**US-005 — LLM Provider (5 SP)**
- `llm/provider-registry.ts` — Multi-provider detection (OpenAI, Anthropic) from env vars
- `llm/model-router.ts` — Task type → model routing (qa→cheap, code→balanced, report→powerful)
- `llm/tool-definitions.ts` — 8 Vercel AI SDK tool() definitions with Zod params

**US-006 — File Operations (3 SP)**
- `coding/file-ops.ts` — createFile, editFile, readFile, listFiles with path traversal protection

**US-007 — Shell + Git (3 SP)**
- `coding/shell.ts` — Sandboxed runCommand (blocked commands list, 30s timeout)
- `coding/git.ts` — simple-git wrapper (status, diff, log, add, commit, branch)
- `coding/search.ts` — ripgrep wrapper with native Node.js fallback

**US-008 — Compliance Gate (3 SP)**
- `coding/compliance-gate.ts` — Re-scan after tool execution, score diff + warnings for regressions

**US-009 — Framework Detector (3 SP)**
- `core/detector/framework-detector.ts` — detectFramework(), detectAiTools(), detectModelsInSource()

**US-010 — Project Detector (2 SP)**
- `core/detector/project-detector.ts` — Orchestrator with I/O, reads package.json + source files

**US-011 — Risk Prioritizer + Memory + Config (5 SP)**
- `core/classifier/risk-prioritizer.ts` — scoreFinding(), prioritizeFindings() (sensitivity 40% + severity 30% + exposure 20% + fixComplexity 10%)
- `memory/project-memory.ts` — createProjectMemoryManager() factory (load, save, recordScan, recordFix)
- `config/config-loader.ts` — cosmiconfig + Zod validation for .compliorrc.json

**US-001 — HTTP Server + Routes (5 SP)**
- `server.ts` — Hono app, mounts all routes, global error handler, graceful shutdown
- `context.ts` — EngineContext singleton (regulationData, scanner, memory)
- 7 route modules: scan, status, memory, chat (SSE), file, shell, git

### Bug Fixes During Implementation
- Zod schema mismatch: obligations.json had null values → made fields `.optional()` + `.nullable()`, added `.passthrough()`
- technical-requirements.json: SdkImplementation fields null → all fields `.nullable().optional()`
- TypeScript: 8 type errors fixed (unused imports, createScanner() argument count, c.json() status typing, getModel return type)
- Score calculator wiring: replaced fallback scoring with real weighted calculator using scoring.json data

### File Stats
- 51 files changed, ~7,000 lines added
- ~49 new source files, 10 test files
- 4 new npm deps: @hono/node-server, tsx, @ai-sdk/openai, @ai-sdk/anthropic

### Reviews
- **TypeScript:** `tsc --noEmit` — 0 errors
- **Tests:** 94/94 pass (10 test files, 408ms)
- **Server:** Starts on port 3099, loads 108 obligations, /status + /scan verified
- **Scan result:** 103 files scanned, 7 checks (6 pass, 1 fail), score 40% (critical cap applied), red zone

---

## Cumulative Velocity

| Sprint | SP Planned | SP Done | Duration | Velocity (SP/day) |
|--------|-----------|---------|----------|-------------------|
| 1 | 47 | 47 | 1 day | 47.0 |
| **Total** | **47** | **47** | **1 day** | **47.0 avg** |

### Test Growth

| Sprint | Unit Tests | Total |
|--------|-----------|-------|
| 1 | 94 | 94 |

---

**Updated by:** Claude Code (Team Lead)
**Last update:** 2026-02-18
