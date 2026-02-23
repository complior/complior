# Complior

**Wrapper-Оркестратор для AI Compliance**

> tmux для AI compliance. Запускает ЛЮБОГО coding agent внутри себя. Compliance gate поверх каждого изменения файла.

---

> [!IMPORTANT]
> **Status: v6 Architecture Phase (Phase 0)**
>
> Complior v6 is a complete rearchitecture. The v1 engine (scanner, fixer, 568 tests) works. We are now building the wrapper-orchestrator (Rust TUI + PTY manager) that runs any coding agent inside itself. Contributions and feedback are welcome.

---

## What is Complior?

Complior wraps your favorite coding agent (Claude Code, Odelix, OpenCode, aider) and adds real-time compliance monitoring. You keep working in your agent — Complior adds the compliance layer.

**The problem:** Developers write AI code without compliance. Lawyers check compliance without code. No tool bridges this gap. EU AI Act enforcement: **August 2, 2026** (5.5 months).

**The solution:** A wrapper that launches any coding agent as subprocess and monitors every file change for compliance.

```bash
$ complior                              # launch with default agent
$ complior --agent claude-code          # launch with Claude Code
$ complior --agent opencode             # launch with OpenCode
$ complior --agent "aider --model opus" # any CLI command as agent
$ complior --agent bash                 # even just a shell
$ complior --agents "odelix, claude-code"  # two agents side by side
$ complior --headless                   # CI/CD (no TUI)
```

### How It Works

```
┌── Agent: Claude Code ────────────────┐ ┌── Compliance ──────┐
│                                       │ │ Score: 72/100      │
│  (Claude Code works as usual —       │ │ ████████░░ 72%     │
│   all output rendered 1:1)           │ │                    │
│                                       │ │ ✓ disclosure       │
│                                       │ │ ✗ logging    [Fix] │
│                                       │ │ ✗ docs       [Fix] │
│                                       │ │ ✓ metadata         │
│                                       │ │                    │
│                                       │ │ 163d Art.6 ⚠       │
│                                       │ │ [Scan] [Report]    │
└───────────────────────────────────────┘ └────────────────────┘
```

1. You work in your agent (write code, ask questions, run commands)
2. Complior watches every file change via inotify/FSEvents
3. Background rescan in ~200ms → score updates in real time
4. If score drops → toast notification with exact article + auto-fix option

No other tool does this.

## Key Features

- **Wrapper-Orchestrator** — wraps ANY CLI coding agent via PTY subprocess
- **Real-time Compliance Gate** — every file change → rescan in 200ms → score update
- **Multi-Agent** — run multiple agents in tabs or splits, monitor compliance of ALL
- **19 Compliance Checks** — deterministic, AST-based, no LLM involved in decisions
- **6+ Auto-Fixers** — disclosure, marking, logging, docs, metadata, FRIA
- **Decision Matrix** — 17 violation types, each with specific fix + article reference
- **Runtime Middleware** — generates `compliorWrap()`, logger, marker for production
- **Multi-Jurisdiction** — EU AI Act + Colorado SB 205 + 8 more planned
- **2000+ AI Tools** — detection patterns for OpenAI, Anthropic, LangChain, and more
- **100+ Themes** — Tokyo Night, Catppuccin, Gruvbox, Nord, and custom TOML themes
- **MCP Server** — 7+ compliance tools for Claude Code, Cursor, Windsurf
- **CI/CD** — `complior scan --ci --threshold 80 --sarif`
- **Zero Config** — auto-detects framework, AI SDK, risk level
- **Offline** — scanner works without any API key or network

## Architecture

Three processes: thin Rust TUI client, TypeScript compliance engine, and guest agent.

```
┌─────────────────────────┐     HTTP / SSE      ┌─────────────────────────┐
│   RUST TUI (ratatui)    │ ◄────────────────► │   TS ENGINE (Hono)      │
│                         │   localhost:port    │                         │
│  Wrapper host           │                    │  Scanner (AST, 5 layers)│
│  PTY manager            │  JSON req/resp     │  Fixer (6+ templates)   │
│  UI rendering           │  for scan/fix/etc  │  Regulation DB (JSON)   │
│  Agent tabs/splits      │                    │  AI Registry (2K+)      │
│  100+ themes            │  SSE stream        │  LLM (Vercel AI SDK)    │
│  ~5MB binary            │  for events        │  Memory (3 levels)      │
└──────────┬──────────────┘                    │  MCP Server (stdio)     │
           │ PTY                               │  Reports (MD/PDF/SARIF) │
           ▼                                   │  Runtime Middleware Gen  │
┌─────────────────────────┐                    │  File Watcher           │
│   GUEST AGENT           │                    │  DataProvider port      │
│   (subprocess)          │                    └─────────────────────────┘
│   Odelix / Claude Code  │
│   OpenCode / aider      │
│   bash / any CLI        │
└─────────────────────────┘
```

**Key principle:** Deterministic core, AI interface. Scanner uses AST-based rules — no LLM involved in compliance decisions. LLM helps you understand and fix issues.

## 4 UI Presets

| Preset | Description |
|--------|-------------|
| **Dashboard** (default) | Agent panel + compliance sidebar + score history |
| **Focus** | Agent fullscreen, compliance in statusbar only |
| **Multi** | 2+ agents side by side + compliance panel |
| **Compliance Only** | Dashboard without agent (for DPO/CTO) |

## Supported Regulations

| Regulation | Checks | Sprint |
|-----------|--------|--------|
| EU AI Act (Transparency) | Art. 50, 12, 4, 11 | S01 — Launch |
| EU AI Act (GPAI) | Art. 51-56 | S01 — Launch |
| EU AI Act (High-Risk) | Art. 9, 14, 15, 27 | S04 — Launch |
| Colorado SB 205 | Disclosure + FRIA | S03 |
| Texas TRAIGA + California AB 2885 | Disclosure | S06 |
| South Korea AI Basic Act | Korean AI Act | S06 |
| UK AI Regulation Bill | UK requirements | S10 |
| Japan, Canada, Brazil | Additional jurisdictions | S10 |
| ISO 42001, NIST AI RMF | Framework mapping | S08 |

## Roadmap

| Sprint | Weeks | Focus |
|--------|-------|-------|
| **S01** | 1-2 | Regulation DB, AI Registry, Scanner (19 checks), AST engine |
| **S02** | 3-4 | PTY Wrapper, Auto-Fix (6 fixers), LLM, Memory, Compliance Gate |
| **S03** | 5-6 | Themes (20+), Multi-Agent, MCP, GitHub Action, Reports |
| **S04** | 7-8 | FRIA, Tech Docs, Discovery, Polish, **Launch** |
| **S05** | M 1-2 | Runtime Control (middleware gen), SDK Adapters, Templates |
| **S06** | M 2-3 | Agent Governance, VS Code Extension, 3 more jurisdictions |
| **S07** | M 3-4 | Docker scan, Infrastructure Remediation |
| **S08** | M 4-5 | Monitoring, Drift Detection, Regulation Changes |
| **S09** | M 5-6 | Agent Sandbox, Kill Switch, Compliance-as-Code |
| **S10** | M 6+ | 4 more jurisdictions, 2000 tools, Plugin system |

## Business Model: Free TUI → Paid Dashboard

| | Free TUI (open-source) | Paid Dashboard (SaaS) |
|---|---|---|
| Scan | Local project | All repos in org |
| Score | 0-100 + auto-fix | Cross-system map |
| Reports | COMPLIANCE.md, FRIA, badges | Audit PDF (clean), Certificate |
| Registry | 200 tools (offline) | 2,477+ tools (API) |
| Jurisdictions | EU + 1 | All |
| Agents | Wrapper + MCP | + Agent Registry UI |
| Monitoring | Drift (session) | Continuous + SLA |
| CI/CD | Headless mode | Webhook management |
| **Price** | **€0** | **€49-399/mo** |

## Cloud API Configuration (Optional)

Connect the TUI to the live AI Registry (4,983+ tools with EU AI Act assessments):

1. Sign up at [complior.ai](https://complior.ai) (free tier available)
2. Generate an API key: Dashboard → Settings → API Keys
3. Save to `~/.config/complior/credentials`:

```
# Complior credentials
COMPLIOR_API_KEY=cpl_live_...
```

4. Launch the TUI — the status bar shows `●` (online) when connected.

**Offline mode:** Without an API key, the TUI uses mock data (score 47, 12 demo findings).
Override API URL for local development: `export PROJECT_API_URL=http://localhost:8000`

---

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
# Scan current project
complior scan

# Launch with Claude Code
complior --agent claude-code

# CI/CD pipeline
complior scan --ci --threshold 80 --sarif report.sarif

# Generate compliance badge
complior badge
```

## Project Structure

```
complior/
├── tui/           # Rust TUI — wrapper host, PTY manager
├── engine/        # TypeScript Engine — scanner, fixer, LLM, databases
├── shared/        # Shared types (TS ↔ Rust codegen)
├── docs/          # Phase 0 architecture + sprint specs
├── data/          # Bundled regulation DB + AI registry
├── .github/       # CI/CD workflows
├── Cargo.toml     # Rust workspace root
├── package.json   # TS workspace root
└── CLAUDE.md      # Claude Code instructions
```

## Contributing

Complior is in v6 architecture phase. We welcome:

- **Feedback** on the wrapper-orchestrator design
- **Regulation expertise** — help us model compliance requirements
- **AI tool data** — detection patterns for AI SDKs
- **Issues** for feature requests and ideas

## License

[MIT](LICENSE)

---

Built by the [Complior](https://complior.ai) team. EU AI Act enforcement: August 2, 2026.
