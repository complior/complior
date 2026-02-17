# Complior

**Compliance-First AI Coding Assistant**

> A terminal-based AI coding assistant where every line of code is compliance-checked in real time. Like Cursor, but every change shows its compliance impact.

---

> [!IMPORTANT]
> **Status: Early Development (Phase 0 — Architecture & Planning)**
>
> Complior is in the earliest stage of development. There is no working code yet — only architecture documents, specifications, and design decisions. We are building in the open from day one. Contributions and feedback are welcome, but expect everything to change.

---

## What is Complior?

Complior is a **coding assistant with built-in compliance**. Instead of writing code first and checking compliance later, Complior makes compliance part of the coding process itself.

**The problem:** AI developers face growing regulatory requirements (EU AI Act, Colorado SB 205, and more) but have no tools that integrate compliance into their workflow. Existing solutions are scanners you run after the fact — by then, it's too late.

**The solution:** A terminal-based AI coding assistant (TUI) that scans every code change in real time, shows its compliance impact, and offers auto-fixes — all while you code.

### The Compliance Gate

What makes Complior unique: every code change passes through a compliance gate.

```
1. You write code in the TUI (or AI writes it for you)
2. Scanner re-runs in background (~200ms)
3. Score gauge updates in real time
4. If score drops → exact article violated + auto-fix option
```

```
┌──────────────────────────────────────────────┐
│ Compliance Impact:                           │
│ Score: 72 → 58 (↓ 14 points)                │
│                                              │
│ ❌ New: AI Disclosure required (Art. 50.1)   │
│ ❌ New: Content Marking required (Art. 50.2) │
│                                              │
│ ✅ Auto-fixable: Apply? (y/n)                │
└──────────────────────────────────────────────┘
```

No other coding assistant does this.

## Architecture

Complior is a two-process system: a thin **Rust TUI** client and a **TypeScript Engine** that handles all compliance logic.

```
┌─────────────────────────┐     HTTP / SSE      ┌─────────────────────────┐
│   RUST TUI (Ratatui)    │ ◄───────────────► │   TS ENGINE (Bun/Node)  │
│                         │   localhost:port   │                         │
│  Chat + Inline Editor   │                    │  Scanner (AST-based)    │
│  Score Dashboard        │  JSON req/resp     │  Fixer (auto-fixes)     │
│  Diff Split-View        │  for scan/fix/etc  │  Regulation DB          │
│  File Browser           │                    │  Tool Directory (2K+)   │
│                         │  SSE stream        │  LLM (Vercel AI SDK v6) │
│  ~5MB single binary     │  for LLM tokens    │  MCP Server (stdio)     │
└─────────────────────────┘                    └─────────────────────────┘
```

**Key principle:** Deterministic core, AI interface. The scanner uses AST-based rules — no LLM involved in compliance decisions. LLM helps you understand and fix issues, but never determines what's compliant.

## Planned Features

- **Real-time Compliance Gate** — every code change triggers re-scan (~200ms)
- **23 Tools** — 15 compliance + 8 coding (create/edit files, search, git, run commands)
- **Multi-Jurisdiction** — starting with EU AI Act, expanding to Colorado SB 205, Texas TRAIGA, ISO 42001, and more
- **4 Agent Modes** — `build` (default), `comply`, `audit`, `learn`
- **Inline Code Viewer** — syntax-highlighted file viewer with selection-to-AI handoff
- **Multi-Model** — bring your own API key (OpenAI, Anthropic, Google, Mistral, Ollama) or use Complior Cloud
- **MCP Server** — use Complior inside Claude Code, Cursor, or any MCP-compatible tool
- **3-Level Memory** — project (persistent), session (SQLite), knowledge (on-demand)
- **Zero Config** — auto-detects framework, AI SDK, and models
- **Offline Scanner** — deterministic checks work without any API key
- **Headless Mode** — `--json`, `--ci`, `--sarif` flags for CI/CD pipelines

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 0** | Architecture, specs, design decisions | **In Progress** |
| **Phase 1** | TypeScript Engine core — scanner, 7 EU AI Act checks, coding tools | Planned |
| **Phase 2** | Rust TUI — chat, score gauge, editor, diff view, compliance gate | Planned |
| **Phase 3** | MCP Server, headless mode, multi-model routing, memory system | Planned |
| **Phase 4** | Additional jurisdictions, Complior Cloud, VS Code extension | Planned |

### Phase 0 Deliverables (current)

- [x] Product vision and architecture documents
- [x] Database design (embedded + cloud)
- [x] Data flow specifications (16 flows)
- [x] Coding standards (Rust + TypeScript)
- [x] Architecture Decision Records (ADRs)
- [x] Agent system definitions
- [ ] Repository scaffolding and CI
- [ ] Sprint 1 backlog

## Supported Regulations (Planned)

Starting with **AI compliance** as the core domain:

| Regulation | Checks | Priority |
|-----------|--------|----------|
| EU AI Act (Transparency) | Art. 50.1, 50.2, 12, 4, 11 | P0 — Launch |
| EU AI Act (GPAI) | Art. 51-56 | P0 — Launch |
| Colorado SB 205 | Disclosure requirements | P1 |
| Texas TRAIGA | Disclosure requirements | P1 |
| ISO 42001 | AI Management System | P2 |

More jurisdictions will be added over time. Other compliance domains (accessibility, licenses, GDPR) will follow once AI compliance is stable.

## LLM Providers

Your key, your cost. Cost to Complior: **$0 per session**.

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, o1, o3 |
| Anthropic | Claude Sonnet 4.5, Opus 4.6 |
| Google | Gemini 2.0 Pro, Flash |
| Mistral | Mistral Large, Codestral |
| Ollama | Any local model (fully offline) |
| OpenRouter | 500+ models via single key |

Or use **Complior Cloud** — we handle the API keys, you get volume pricing.

## Project Structure

```
complior/
├── docs/          # Architecture & design documents
├── agents/        # Multi-agent system definitions (YAML)
├── tui/           # Rust TUI — Ratatui binary (planned)
├── engine/        # TypeScript Engine — compliance + coding (planned)
├── .github/       # CI/CD workflows
├── Cargo.toml     # Rust workspace root
├── package.json   # TS workspace root
└── CLAUDE.md      # Claude Code instructions
```

## Contributing

Complior is in early development. We are not yet accepting code contributions, but we welcome:

- **Feedback** on the architecture and design (see `docs/`)
- **Issues** for feature requests and ideas
- **Discussions** about compliance requirements and regulations

## License

[Apache License 2.0](LICENSE)

---

Built by the [Complior](https://github.com/complior) team.
