# Complior

**Daemon-Orchestrator for AI Compliance**

> Background compliance daemon for AI applications. Compliance gate on every file change.

---

> [!IMPORTANT]
> **Status: v8 Architecture**
>
> Complior v8 is a daemon-orchestrator: background daemon (file watcher + engine + MCP server + HTTP API) + Rust TUI dashboard + CLI commands. The v1 engine (scanner, fixer, 375+ tests) works. Agents connect independently via MCP. Contributions and feedback are welcome.

---

## What is Complior?

Complior is a background compliance daemon that monitors your AI project for EU AI Act compliance. It watches every file change and rescans in ~200ms. Agents (Claude Code, Cursor, VS Code, OpenCode, aider) work independently and connect via MCP.

**The problem:** Developers write AI code without compliance. Lawyers check compliance without code. No tool bridges this gap. EU AI Act enforcement: **August 2, 2026** (~5 months).

**The solution:** A daemon that monitors file changes and provides real-time compliance feedback. Agents work independently — Complior doesn't manage their processes.

```bash
$ complior                     # daemon + TUI dashboard (default)
$ complior daemon --watch      # headless daemon (CI/CD, server)
$ complior scan --ci           # standalone CLI (one-shot scan)
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                       COMPLIOR v8 SYSTEM                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DAEMON (background process)                             │  │
│  │                                                          │  │
│  │  File Watcher    TS Engine (Hono)    MCP Server          │  │
│  │  (chokidar)      Scanner, Fixer     (stdio, 8 tools)    │  │
│  │  inotify →       Passport, Gate                          │  │
│  │  rescan →        Reporter, Evidence  HTTP API             │  │
│  │  SSE notify      5-layer scanner     (localhost:PORT)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│       ▲ HTTP/SSE          ▲ MCP (stdio)         ▲ HTTP        │
│       │                   │                     │             │
│  ┌────┴───────┐   ┌──────┴──────────┐   ┌─────┴──────┐     │
│  │ TUI        │   │ Coding Agents    │   │ CLI        │     │
│  │ (Rust,     │   │ (Claude Code,    │   │ (standalone │     │
│  │  ratatui)  │   │  Cursor, VS Code,│   │  commands)  │     │
│  │ 7 pages    │   │  OpenCode, aider)│   │             │     │
│  │ 100+ themes│   │ Work             │   │ scan, fix,  │     │
│  └────────────┘   │ INDEPENDENTLY    │   │ report, ... │     │
│                   └──────────────────┘   └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

1. Agents write code independently (Claude Code, Cursor, VS Code, etc.)
2. Complior daemon watches every file change via inotify/FSEvents
3. Background rescan in ~200ms → score updates in real time
4. If score drops → SSE notification with exact article + auto-fix option

No other tool does this.

## Key Features

- **Daemon Architecture** — background process, agents connect via MCP independently
- **Real-time Compliance Gate** — every file change → rescan in 200ms → score update
- **5-Layer Scanner** — file presence → document structure → config/deps → AST patterns → LLM deep analysis
- **45 Banned Packages** — covers all 8 Art. 5 prohibitions
- **33 Pattern Rules** — across 8 categories + 5 cross-layer verification rules
- **6+ Auto-Fixers** — disclosure, marking, logging, docs, metadata, FRIA
- **Agent Passport** — central entity (36 fields, ed25519 signed, 3 creation modes)
- **7-Step Pipeline** — Discover → Classify → Scan → Fix → Document → Monitor → Certify
- **8 MCP Tools** — compliance tools for Claude Code, Cursor, Windsurf, any MCP client
- **Runtime Middleware** — `@complior/sdk` — proxy-based compliance wrapping for LLM API calls
- **5,011+ AI Tools** — detection patterns for OpenAI, Anthropic, LangChain, and more
- **100+ Themes** — Tokyo Night, Catppuccin, Gruvbox, Nord, and custom TOML themes
- **CI/CD** — `complior scan --ci --threshold 80 --json`
- **Zero Config** — auto-detects framework, AI SDK, risk level
- **Offline** — scanner works without any API key or network

## Architecture

Two processes: Rust TUI client connects to TypeScript daemon via HTTP/SSE.

```
┌─────────────────────────┐     HTTP / SSE      ┌─────────────────────────┐
│   RUST TUI (ratatui)    │ ◄────────────────► │   TS DAEMON (Hono)      │
│                         │   localhost:port    │                         │
│  Dashboard UI           │                    │  Scanner (AST, 5 layers)│
│  7 navigable pages      │  JSON req/resp     │  Fixer (6+ templates)   │
│  100+ themes            │  for scan/fix/etc  │  Regulation DB (JSON)   │
│  Vim + mouse nav        │                    │  AI Registry (5K+)      │
│  ~5MB binary            │  SSE stream        │  LLM (Vercel AI SDK)    │
│                         │  for events        │  MCP Server (stdio)     │
│                         │                    │  File Watcher           │
│                         │                    │  Reports (MD/PDF/badge) │
│                         │                    │  Agent Passport engine  │
└─────────────────────────┘                    └─────────────────────────┘
```

**Key principle:** Deterministic core, AI interface. Scanner uses AST-based rules — no LLM involved in compliance decisions. LLM helps you understand and fix issues.

## 7 TUI Pages

| Key | Page | Description |
|-----|------|-------------|
| **D** | Dashboard | Score gauge, activity log, deadlines, quick actions |
| **S** | Scan | Findings table, severity filter, file links |
| **F** | Fix | Fix preview with unified diff, one-click apply |
| **P** | Passport | Agent Passport viewer (36 fields, ed25519 signed) |
| **T** | Timeline | Obligation deadlines, EU AI Act milestones |
| **R** | Report | Compliance report generation (MD, PDF, badge) |
| **L** | Log | Activity log, engine events, SSE stream |

## Supported Regulations

| Regulation | Status |
|-----------|--------|
| EU AI Act (Transparency) — Art. 50, 12, 4, 11 | Implemented |
| EU AI Act (GPAI) — Art. 51-56 | Implemented |
| EU AI Act (High-Risk) — Art. 9, 14, 15, 27 | Planned |
| Colorado SB 205 — Disclosure + FRIA | Planned |
| ISO 42001, NIST AI RMF | Planned |

## Business Model: Free TUI → Paid Dashboard

| | Free TUI (open-source) | Paid Dashboard (SaaS) |
|---|---|---|
| Scan | Local project | All repos in org |
| Score | 0-100 + auto-fix | Cross-system map |
| Reports | COMPLIANCE.md, FRIA, badges | Audit PDF, Certificate |
| Registry | 200 tools (offline) | 5,011+ tools (API) |
| Jurisdictions | EU + 1 | All |
| Agents | MCP (8 tools) | + Agent Registry UI |
| Monitoring | Drift (session) | Continuous + SLA |
| CI/CD | Headless mode | Webhook management |
| **Price** | **Free** | **€49-399/mo** |

## Installation

```bash
# npm (recommended)
npx complior

# Install script
curl -fsSL https://complior.ai/install.sh | sh

# Homebrew
brew install complior

# Cargo
cargo install complior

# Docker
docker run -it -v $(pwd):/project complior/complior
```

## Quick Start

```bash
# Launch daemon + TUI dashboard
complior

# Scan current project (standalone)
complior scan

# CI/CD pipeline
complior scan --ci --threshold 80 --json

# Generate compliance badge
complior badge
```

## Project Structure

```
complior/
├── tui/           # Rust TUI — dashboard UI, connects to daemon via HTTP/SSE
├── engine/
│   ├── core/      # @complior/engine — TS daemon (Clean Architecture)
│   ├── sdk/       # @complior/sdk — runtime compliance middleware
│   └── npm/       # npm wrapper package (npx complior)
├── docs/          # Architecture, specs, contributing standards
├── .github/       # CI/CD workflows
├── Cargo.toml     # Rust workspace root
├── package.json   # TS workspace root
└── CLAUDE.md      # Claude Code instructions
```

## Contributing

Complior is in v8 daemon architecture. We welcome:

- **Feedback** on the daemon-orchestrator design
- **Regulation expertise** — help us model compliance requirements
- **AI tool data** — detection patterns for AI SDKs
- **Issues** for feature requests and ideas

See `docs/contributing/` for coding standards.

## License

[MIT](LICENSE)

---

Built by the [Complior](https://complior.ai) team. EU AI Act enforcement: August 2, 2026.
