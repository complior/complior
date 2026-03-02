# Complior v8 — Claude Code Instructions

## Project: Daemon-Оркестратор для AI Compliance

Complior v8 = background compliance daemon для AI compliance. Background daemon (file watcher, engine, MCP server, HTTP API) + TUI dashboard + CLI commands. Compliance gate поверх каждого изменения файла.

## Project Structure

- **Rust CLI**: `cli/` — Ratatui binary + daemon management, connects to daemon via HTTP/SSE, 8 pages, themes
- **TypeScript Engine**: `engine/core/` — Clean Architecture: ports, domain, services, infra, http, data, llm, mcp
- **TS Packages**: `engine/sdk/` (@complior/sdk), `engine/npm/` (npm wrapper). Shared types codegen planned, not yet implemented
- **Public docs**: `docs/` — architecture, backlog, sprint specs, contributing standards
- **Internal docs**: `.dev/` (gitignored) — legacy v1 docs, agent definitions, ADRs

## Architecture Rules

1. **Daemon architecture**: Background daemon (file watcher + engine + MCP server + HTTP API) ↔ TUI dashboard (Rust, connects via HTTP/SSE) ↔ CLI commands (standalone or via daemon)
2. **Deterministic core, AI interface** — LLM NEVER makes compliance determinations. All checks are deterministic (AST + rules). LLM helps understand and fix.
3. **Compliance Gate** — every file change → background rescan (200ms) → score update → SSE notification
4. **Daemon principle** — Complior does NOT write code. It monitors file changes and provides compliance feedback. Auto-fixes are delegated to any coding agent via MCP.
5. **Agent Passport** — central entity (identity card of an AI system). 36 fields, 3 creation modes, ed25519 signed.
6. **7-step pipeline** — Discover → Classify → Scan → Fix → Document → Monitor → Certify
7. **DataProvider port** — Engine retains regulation JSON locally (`engine/core/src/data/`). AI Registry data from PROJECT API (5,011+ tools online). TUI: EngineDataProvider (online) ↔ MockDataProvider (12 demo, offline fallback)

## Coding Standards

- **Rust**: edition 2024, `clippy` strict, `rustfmt`, async with tokio, ratatui for TUI
- **TypeScript**: strict mode, Bun (primary) / Node 22 (fallback), Zod validation, ESM only
- **HTTP Server**: Hono (typed routes, SSE support)
- **Tests**: Rust (`cargo test` + `insta` snapshots), TS (`vitest`)
- **Error handling**: Rust `Result<T, E>`, TS custom `AppError` hierarchy
- **Full standards**: `docs/contributing/CODING-STANDARDS.md` (+ TS and Rust variants)

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Feature branches from `develop`, PRs to `develop`
- Run `cargo test` and `bun test` before committing

## Key References

- `docs/ARCHITECTURE.md` — full system design (v8, daemon + TUI + CLI)
- `docs/PRODUCT-VISION.md` — daemon-orchestrator vision, Agent Passport, 7-step pipeline
- `docs/PRODUCT-BACKLOG.md` — v8 features, obligation-driven roadmap
- `docs/UNIFIED-ARCHITECTURE.md` — how open-source CLI + SaaS work together
- `docs/DATA-FLOWS.md` — 12 data flow diagrams (daemon architecture)
- `docs/TUI-DESIGN-SPEC.md` — 8 TUI pages, CLI commands, MCP tools
- `docs/FEATURE-AGENT-PASSPORT.md` — Agent Passport specification (36 fields, 3 modes)
- `docs/EU-AI-ACT-PIPELINE.md` — 108 obligations → 7-step compliance pipeline

## Important Context

- EU AI Act enforcement: August 2, 2026 (~5 months)
- Free daemon+TUI (open-source) → Paid Dashboard (SaaS, €49-399/мес) business model
- SaaS project is in separate repo (ai-act-compliance-platform), never modify it from here
- Engine stays TypeScript (JS-first LLM ecosystem, 15K LOC existing code)
- Scanner: 5-layer (file presence → document structure → config/deps → AST patterns → LLM analysis)
