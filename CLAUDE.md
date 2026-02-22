# Complior v6 — Claude Code Instructions

## Project: Wrapper-Оркестратор для AI Compliance

Complior v6 = "tmux для AI compliance". Запускает ЛЮБОГО coding agent (Odelix, Claude Code, OpenCode, aider) как PTY subprocess. Compliance gate поверх каждого изменения файла.

## Project Structure

- **Rust TUI**: `tui/` — Ratatui binary, wrapper host, PTY manager, UI rendering, themes
- **TypeScript Engine**: `engine/` — scanner, fixer, LLM, memory, databases, discovery, runtime middleware, MCP
- **Public docs**: `docs/` — Phase 0 architecture, backlog, sprint specs
- **Internal docs**: `.dev/` (gitignored) — legacy v1 docs, agent definitions, ADRs
- **Shared types**: `shared/` — TypeScript interfaces ↔ Rust structs (codegen)

## Architecture Rules

1. **3 процесса**: Rust TUI ↔ TS Engine (HTTP/SSE) ↔ Guest Agent (PTY subprocess)
2. **Deterministic core, AI interface** — LLM NEVER makes compliance determinations. All 19 checks are deterministic (AST + rules). LLM helps understand and fix.
3. **Compliance Gate** — every file change → background rescan (200ms) → score update → toast notification
4. **Wrapper principle** — Complior does NOT write code. It wraps coding agents and monitors compliance. Auto-fixes are delegated to the guest agent.
5. **DataProvider port** — LocalJSON (offline ~530KB) ↔ SaaSAPI (online 2,477+ tools) ↔ Hybrid (auto-fallback)

## Coding Standards

- **Rust**: edition 2024, `clippy` strict, `rustfmt`, async with tokio, ratatui for TUI
- **TypeScript**: strict mode, Bun (primary) / Node 22 (fallback), Zod validation, ESM only
- **HTTP Server**: Hono (typed routes, SSE support)
- **Tests**: Rust (`cargo test` + `insta` snapshots), TS (`vitest`)
- **Error handling**: Rust `Result<T, E>`, TS custom `AppError` hierarchy

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Feature branches from `develop`, PRs to `develop`
- Run `cargo test` and `bun test` before committing

## Key References

- `docs/ARCHITECTURE.md` — full system design (v6, 3 processes)
- `docs/PRODUCT-VISION.md` — wrapper-orchestrator vision
- `docs/PRODUCT-BACKLOG.md` — 134 features, 10 sprints
- `docs/UNIFIED-ARCHITECTURE.md` — how open-source + SaaS work together
- `docs/DATA-FLOWS.md` — 10 data flow diagrams

## Important Context

- EU AI Act enforcement: August 2, 2026 (5.5 months)
- Free TUI (open-source) → Paid Dashboard (SaaS) business model
- SaaS project is in separate repo (ai-act-compliance-platform), never modify it from here
- Engine stays TypeScript (JS-first LLM ecosystem, 15K LOC existing code)
- Scanner: 5-layer (file presence → document structure → config/deps → AST patterns → LLM analysis)
