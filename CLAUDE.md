# Complior v8 — Claude Code Instructions

## Project: Daemon-Оркестратор для AI Compliance

Complior v8 = background compliance daemon для AI compliance. Background daemon (file watcher, engine, MCP server, HTTP API) + TUI dashboard + CLI commands. Compliance gate поверх каждого изменения файла.

## Workflow: Vision → Feature Area → Milestone → Test Specs → Code

```
docs/PRODUCT-VISION.md           → Product Vision (ЧТО строим, ЗАЧЕМ, приоритеты)
docs/STRATEGY.md                 → Roadmap (КАКИЕ фичи, В КАКОМ порядке, фазы)
docs/feature-areas/*.md          → Feature Area (КАК УСТРОЕНА подсистема)  ← ПРОМЕЖУТОЧНЫЙ СЛОЙ
docs/sprints/M0X-*.md           → Milestones (ЧТО делаем, test specs, acceptance)
engine/core/src/types/           → КОНТРАКТ (типы + Zod schemas — source of truth)
engine/core/src/types/sync.types.ts → SYNC CONTRACT (API между complior CLI ↔ PROJECT SaaS)
engine/core/src/interfaces/      → Интерфейсы компонентов
tests/*.test.ts                  → Тесты-спецификации (RED — architect пишет ДО реализации)
cli/, engine/                    → Код (GREEN — dev-агенты реализуют)
docs/project-state.md           → Живой статус (результаты, tech debt)
```

**Промежуточный слой Feature Area нужен для:**
- Architect глубоко понимает подсистему перед созданием milestone
- Dev-агенты читают Feature Area чтобы понимать контекст своего кода
- Если меняется архитектура подсистемы — Feature Area обновляется, milestone пересматривается

## Project Structure

- **Rust CLI**: `cli/` — Ratatui binary + daemon management, connects to daemon via HTTP/SSE, 8 pages, themes
- **TypeScript Engine**: `engine/core/` — Clean Architecture: ports, domain, services, infra, http, data, llm, mcp. Static JSON data in `engine/core/data/` (regulations, scanner params, LLM pricing/routing, eval mappings, onboarding)
- **TS Packages**: `engine/sdk/` (@complior/sdk), `engine/npm/` (npm wrapper). Shared types codegen planned, not yet implemented
- **Public docs**: `docs/` — architecture, backlog, sprint specs, contributing standards
- **Internal docs**: `.dev/` (gitignored) — legacy v1 docs, agent definitions, ADRs

## Architecture Rules

1. **Daemon architecture**: Background daemon (file watcher + engine + MCP server + HTTP API) ↔ TUI dashboard (Rust, connects via HTTP/SSE) ↔ CLI commands (standalone or via daemon)
2. **Deterministic core, AI-assisted fix** — LLM NEVER makes compliance determinations. All checks are deterministic (AST + rules). Fix pipeline applies deterministic fixes (splice, template, config). LLM assists with complex refactoring when `--ai` flag is used (`complior eval`, `complior fix --ai`). Roadmap: `eval` (with all flags) → `fix --ai`.
3. **Compliance Gate** — every file change → background rescan (200ms) → score update → SSE notification
4. **Fix principle** — Deterministic fixes run automatically (wrap SDK calls, generate templates, create configs). Complex fixes (raw HTTP→SDK refactor, multi-file changes) require LLM via `fix --ai` or delegation to coding agent via MCP.
5. **Agent Passport** — central entity (identity card of an AI system). 36 fields, 3 creation modes, ed25519 signed.
6. **7-step pipeline** — Discover → Classify → Scan → Fix → Document → Monitor → Certify
7. **DataProvider port** — Engine retains regulation JSON locally (`engine/core/src/data/`). AI Registry data from PROJECT API (5,011+ tools online). TUI: EngineDataProvider (online) ↔ MockDataProvider (12 demo, offline fallback)
8. **Config split** — Global `~/.config/complior/settings.toml` (UX, infra) + Project `.complior/project.toml` (jurisdiction, role, industry, scan scope). Project overrides global for `llm_provider`, `llm_model`, `project_api_url`, `offline_mode`. Details: `docs/TUI-DESIGN-SPEC.md` §7
9. **Data externalization** — Все справочные данные (цены моделей, маппинги, пороги, лимиты) хранятся в JSON-файлах в `engine/core/data/` и импортируются через `import ... from '...json' with { type: 'json' }`. Хардкод данных в TS-файлах запрещён. Типы и функции остаются в TS, данные — в JSON.

## Coding Standards

- **Rust**: edition 2024, `clippy` strict, `rustfmt`, async with tokio, ratatui for TUI
- **TypeScript**: strict mode, Bun (primary) / Node 22 (fallback), Zod validation, ESM only
- **Full standards** (читать ОБЯЗАТЕЛЬНО):
  - `docs/contributing/CODING-STANDARDS.md` — общие правила (HTTP/SSE, Agent Passport, Security, Git)
  - `docs/contributing/CODING-STANDARDS-TS.md` — TypeScript Engine (FP-first, V8 optimization, Hono routes, Zod)
  - `docs/contributing/CODING-STANDARDS-RUST.md` — Rust CLI/TUI (cargo, thiserror, tokio)

## Rules (auto-loaded)

Железные правила в `.claude/rules/` загружаются автоматически при каждом сеансе:

| Файл | Назначение |
|------|------------|
| `architect-protocol.md` | Scan protocol, milestone creation, Feature Area |
| `code-style.md` | Naming conventions (Rust + TS), error handling, data externalization |
| `safety.md` | Input validation (Zod/custom), no secrets, async/concurrency safety |
| `architecture.md` | Layer separation (types → interfaces → components) |
| `scope-guard.md` | File ownership per agent — ЗАПРЕТ чужих файлов |
| `startup-protocol.md` | Startup checklist для каждого агента |
| `testing.md` | TEST-FIRST workflow: RED → GREEN → review |

**metaskills** в `.claude/skills/metaskills` содержат базовые конвенции:
- Rust: `rust-async`, `rust-conventions`, `rust-patterns`, `rust-error-handling`
- JS/TS: `error-handling`, `js-conventions`, `js-gof`, `js-data-structures`, `typescript-patterns`

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Feature branches from `develop`, PRs to `main`
- **Merge в main — ТОЛЬКО user.** Ни один агент не мержит. PR создаёт architect, мержит user.
- Run `cargo test` and `npx vitest run` before committing
- CI: `.github/workflows/ci.yml` (fmt, clippy, test, audit) + `release.yml` (build, publish)

## Key References

- `docs/ARCHITECTURE.md` — full system design (v8, daemon + TUI + CLI)
- `docs/PRODUCT-VISION.md` — daemon-orchestrator vision, Agent Passport, 7-step pipeline
- `docs/PRODUCT-BACKLOG.md` — v8 features, obligation-driven roadmap
- `docs/UNIFIED-ARCHITECTURE.md` — how open-source CLI + SaaS work together
- `docs/DATA-FLOWS.md` — 12 data flow diagrams (daemon architecture)
- `docs/TUI-DESIGN-SPEC.md` — 9 TUI pages, CLI commands, MCP tools, config split (§7)
- `docs/FEATURE-AGENT-PASSPORT.md` — Agent Passport specification (36 fields, 3 modes)
- `docs/EU-AI-ACT-PIPELINE.md` — 108 obligations → 7-step compliance pipeline

## v1.0.0 Scope (ОБЯЗАТЕЛЬНО к прочтению)

v1.0 = ТОЛЬКО pipeline команды со ВСЕМИ их флагами + Agent Passport:

| Команда | Ключевые флаги |
|---------|---------------|
| `complior init` | `--yes`, `--force` |
| `complior scan` | `--json`, `--sarif`, `--ci`, `--threshold`, `--fail-on`, `--diff`, `--fail-on-regression`, `--comment`, `--deep`, `--llm`, `--quiet`, `--agent` |
| `complior eval` | `--det`, `--llm`, `--security`, `--full`, `--json`, `--ci`, `--threshold`, `--categories`, `--last`, `--failures`, `--verbose`, `--remediation`, `--fix`, `--dry-run`, `--model`, `--api-key`, `--request-template`, `--response-path`, `--headers`, `--concurrency`, `--agent` |
| `complior fix` | `--dry-run`, `--json`, `--ai`, `--source scan/eval/all`, `--check-id` |
| `complior report` | `--format human/json/md/html/pdf`, `--json`, `--share`, `--output` |
| `complior agent` | `init`, `list`, `show`, `validate`, `completeness`, `fria`, `evidence`, `export`, `rename`, `autonomy`, `notify`, `registry`, `permissions` |

**НЕ входит в v1.0:** daemon, chat, supply-chain, cost, debt, simulate, jurisdiction, proxy, doc, import, redteam, tools, login/logout, sync. Это `#[cfg(feature = "extras")]` или post-v1.0.

**Текущие milestones:**
- V1-M01 ✅ DONE — pipeline acceptance (happy path)
- V1-M02 ⏳ — ВСЕ флаги каждой команды покрыты E2E тестами
- V1-M03 ⏳ — docs, CI, version bump, PR → main

## Important Context

- EU AI Act enforcement: August 2, 2026 (~4 months)
- Free daemon+TUI (open-source) → Paid Dashboard (SaaS, €49-399/мес) business model
- SaaS project is in separate repo (ai-act-compliance-platform), never modify it from here
- Engine stays TypeScript (JS-first LLM ecosystem, 15K LOC existing code)
- Scanner: 5-layer (file presence → document structure → config/deps → AST patterns → LLM analysis)
