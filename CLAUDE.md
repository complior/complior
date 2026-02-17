# Complior — Claude Code Instructions

## Project Structure
- **Rust TUI**: `tui/` — Ratatui binary, thin client (rendering + input only)
- **TypeScript Engine**: `engine/` — all logic (scanner, fixer, LLM tools, memory, MCP)
- **Public docs**: `docs/` — compliance standard specs
- **Internal docs**: `.dev/` (gitignored) — architecture, backlog, agents, ADRs

## Architecture Rules
- **Deterministic core, AI interface** — LLM NEVER makes compliance determinations. All compliance checks are deterministic (AST + rules). LLM formats results for humans.
- **Compliance Gate** — every coding tool (createFile, editFile, etc.) MUST trigger a background re-scan after execution. Score gauge updates in real time.
- **Client/Server IPC** — Rust TUI communicates with TS Engine via HTTP (JSON) + SSE (LLM streaming) on localhost.

## Coding Standards
- **Rust**: edition 2024, `clippy` strict, `rustfmt`, async with tokio
- **TypeScript**: strict mode, Bun (primary) / Node 22 (fallback), Zod validation, ESM only
- **HTTP Server**: Hono (typed routes, SSE support)
- **Tests**: Rust (`cargo test` + `insta` snapshots), TS (`vitest`)
- **Error handling**: Rust `Result<T, E>`, TS custom `AppError` hierarchy

## Git Conventions
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Feature branches from `develop`, PRs to `develop`
- Run `cargo test` and `bun test` before committing

## Key References
- `.dev/docs/ARCHITECTURE.md` — full system design
- `.dev/docs/CODING-STANDARDS.md` — detailed coding rules
- `.dev/docs/PRODUCT-BACKLOG.md` — feature list and schedule
- `.dev/agents/*.yml` — multi-agent team definitions
