# ARCHITECTURE.md — Complior v6: Техническая архитектура

**Версия:** 6.0.0
**Дата:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Phase 0 — Утверждено

---

## 1. Три процесса

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPLIOR SYSTEM                          │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │  RUST TUI        │  HTTP   │  TS ENGINE               │  │
│  │  (ratatui)       │◄──────►│  (Bun/Node + Hono)       │  │
│  │                  │  SSE    │                          │  │
│  │  • Wrapper host  │         │  • Scanner (AST)         │  │
│  │  • PTY manager   │         │  • Fixer (templates)     │  │
│  │  • UI rendering  │         │  • Regulation DB         │  │
│  │  • Agent tabs    │         │  • AI Registry 2K+       │  │
│  │  • Input routing │         │  • LLM (Vercel AI SDK)   │  │
│  │  • Compliance    │         │  • Memory system         │  │
│  │    panel/dash    │         │  • Model routing         │  │
│  │  • Themes (100+) │         │  • MCP Server (stdio)    │  │
│  │  • Toast notif   │         │  • Report generator      │  │
│  │  ~5MB binary     │         │  • File watcher          │  │
│  └──────────────────┘         │  • Agent discovery       │  │
│          │                    │  • Runtime middleware gen │  │
│          │ PTY                └──────────────────────────┘  │
│          ▼                                                   │
│  ┌──────────────────┐                                       │
│  │  GUEST AGENT     │                                       │
│  │  (subprocess)    │                                       │
│  │  Odelix / Claude │                                       │
│  │  Code / OpenCode │                                       │
│  │  / aider / bash  │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Rust TUI (ratatui)
- **Роль:** Хост-процесс, UI, PTY management
- **Технологии:** Rust 2024, ratatui, crossterm, tokio, reqwest
- **Размер:** ~5MB binary (кросс-компиляция Linux/macOS/Windows × x86_64/aarch64)
- **Ответственность:**
  - Запуск guest agents как PTY subprocess
  - Passthrough rendering agent output
  - Input routing (agent ↔ Complior)
  - Compliance panel, dashboard, statusbar
  - Themes (100+ TOML), layouts, toast notifications
  - Score gauge, sparkline, deadline countdown

### TS Engine (Hono)
- **Роль:** Backend — вся compliance логика
- **Технологии:** TypeScript strict, Bun/Node 22, Hono HTTP, ESM
- **Ответственность:**
  - Scanner (5 layers: file presence → document structure → config → AST → LLM)
  - Fixer (6+ templates + AI-fix)
  - Regulation DB (JSON)
  - AI Registry (2,000+ tools)
  - LLM integration (Vercel AI SDK, multi-model)
  - Memory system (3 levels)
  - MCP Server (stdio)
  - Reports (MD, PDF, SARIF)
  - File watcher (chokidar)
  - DataProvider port (offline JSON ↔ SaaS API)

### Guest Agent (PTY subprocess)
- **Роль:** Coding agent, работает как обычно
- **Запуск:** `complior --agent <command>`
- **Поддерживаемые:** Odelix, Claude Code, OpenCode, aider, goose, codex-cli, bash, любая CLI-команда
- **Взаимодействие:** Complior получает stdout через PTY, рендерит в панель TUI

---

## 2. Коммуникация между процессами

### TUI ↔ Engine: HTTP + SSE

```
TUI (Rust)                              Engine (TS)
────────────                             ──────────
POST /scan         ──────────────►     Запуск сканирования
GET  /status       ──────────────►     Текущий score + findings
POST /fix/preview  ──────────────►     Preview фиксов (unified diff)
POST /fix/apply    ──────────────►     Применить фиксы
POST /chat         ──────────────►     LLM чат (SSE streaming)
GET  /classify     ──────────────►     Классификация AI tools
POST /report       ──────────────►     Генерация отчёта
GET  /health       ──────────────►     Health check

                   ◄──────────────     SSE: LLM tokens (streaming)
                   ◄──────────────     SSE: Scan events (score changes)
                   ◄──────────────     SSE: Watcher events (file changes)
```

**Протокол:** HTTP/1.1 на localhost, JSON req/resp, SSE для streaming.
**Порт:** Динамический (TUI находит свободный порт при старте Engine).

### TUI ↔ Guest Agent: PTY

```
TUI                                     Guest Agent
───                                     ───────────
stdin  ──── PTY master fd ──────►      Пользовательский ввод
stdout ◄─── PTY master fd ──────       Вывод агента (терминальные escape codes)
```

**Input routing:**
- Все клавиши → agent (по умолчанию)
- `Ctrl+Shift+*` → Complior (перехват для compliance команд)
- Configurable в `config.toml [keys]`

---

## 3. Shared Core — модули Engine

Ключевой принцип: **TS Engine — единый backend**. TUI, MCP, CI/CD, Dashboard — все используют один API.

```
TS ENGINE MODULES:
──────────────────────────────────────────────────────────
MODULE                    ИСПОЛЬЗУЕТСЯ В
──────────────────────────────────────────────────────────
scanner/                  TUI, MCP, CI/CD, Dashboard, VS Code, GH Action
  ├── ast-scanner.ts      AST-анализ: Babel (JS/TS), tree-sitter (Python/Go/Rust)
  ├── checks/             19 checks: disclosure, logging, marking...
  ├── scoring.ts          Формула score 0-100 (weighted)
  └── incremental.ts      Кэш AST для быстрого rescan (<200мс)

fixer/                    TUI, MCP, Dashboard
  ├── templates/           6+ fix templates (disclosure, logging, marking, docs, metadata, FRIA)
  ├── prompt-builder.ts   Промпт для передачи вложенному агенту
  └── diff-preview.ts     Preview перед фиксом (unified diff)

databases/                Все модули
  ├── regulation-db/      JSON: статьи, правила, штрафы, дедлайны (EU AI Act, CO SB205, ...)
  ├── ai-registry/        2000+ AI tools: detection patterns, risk, compliance status
  └── jurisdiction.ts     Multi-jurisdiction logic + "strictest wins"

memory/                   TUI, Dashboard
  ├── project-memory.ts   Level 1: .complior/memory.json (auto-updated after scan/fix)
  ├── session-context.ts  Level 2: sliding window + summarization
  └── knowledge-tools.ts  Level 3: on-demand LLM tool calls

llm/                      TUI, MCP, Dashboard
  ├── router.ts           Multi-model routing по типу задачи (cheap→expensive)
  ├── tools.ts            15 compliance tool definitions для LLM
  ├── disclaimer.ts       Legal disclaimer в каждый output
  └── deterministic.ts    Правило: LLM НЕ делает compliance determinations

reports/                  TUI, Dashboard, CI/CD
  ├── dev-report.ts       Терминальный отчёт
  ├── audit-pdf.ts        PDF для DPO/CTO
  ├── compliance-md.ts    COMPLIANCE.md генерация
  ├── fria.ts             FRIA generator
  └── tech-docs.ts        Technical documentation (Art.11)

discovery/                TUI, Dashboard
  ├── code-scanner.ts     AI в коде (AST + imports + configs)
  ├── infra-scanner.ts    AI в Docker/K8s/Terraform (local files)
  ├── agent-scanner.ts    AI agents в конфигах (CrewAI, AutoGen, LangGraph...)
  ├── dependency-chain.ts Supply chain: transitive AI deps
  └── saas-scanner.ts     SaaS через IdP (PAID, Dashboard only)

agent-governance/         TUI (basic), Dashboard (full)
  ├── registry.ts         Agent Registry CRUD
  ├── manifest.ts         agent-compliance.yaml parse/generate
  ├── score.ts            Agent compliance score (adapted formula)
  ├── permissions.ts      RBAC matrix validation
  ├── lifecycle.ts        State machine: draft→deploy→retire
  └── audit-trail.ts      Immutable action log

runtime/                  SDK packages, Proxy
  ├── wrapper.ts          compliorWrap() — AI response middleware
  ├── logger.ts           JSONL interaction logger (Art.12)
  ├── marker.ts           Content marking engine (Art.50.2)
  ├── disclosure.ts       Disclosure injection
  ├── filter.ts           PII/safety/bias filter
  └── deepfake-guard.ts   Audio/image/video marking (Art.50.4)

monitoring/               Dashboard (PAID)
  ├── drift.ts            Score drift detection
  ├── anomaly.ts          Unusual AI pattern detection
  ├── regulation-feed.ts  Law change monitoring
  └── vendor-watch.ts     SaaS vendor status monitoring

watcher/                  TUI (core), Dashboard
  ├── file-watcher.ts     inotify/chokidar: file change → rescan
  └── compliance-gate.ts  Change → scan → score diff → notification

server/                   Единая точка входа
  ├── http.ts             Hono server: REST API для TUI
  ├── sse.ts              SSE streaming для LLM tokens + events
  ├── mcp.ts              MCP stdio server для Claude/Cursor
  └── headless.ts         CI/CD: --json, --ci, --sarif
──────────────────────────────────────────────────────────
```

---

## 4. Граф зависимостей (Level 0-5)

```
УРОВЕНЬ 0 — ФУНДАМЕНТ (ничего не зависит, всё зависит от них):
  regulation-db          ← нужен scanner, fixer, reports, llm tools
  ai-registry            ← нужен scanner, discovery, llm tools
  scoring                ← нужен scanner, UI, reports, monitoring

УРОВЕНЬ 1 — ЯДРО (зависит от L0):
  scanner/checks         ← зависит от regulation-db, ai-registry
  watcher                ← зависит от scanner
  memory                 ← зависит от scanner (project memory)

УРОВЕНЬ 2 — ИНТЕРФЕЙС (зависит от L0+L1):
  server/http+sse        ← зависит от scanner, memory, llm
  fixer                  ← зависит от scanner, regulation-db
  llm/router+tools       ← зависит от scanner, regulation-db, ai-registry
  Rust TUI basic         ← зависит от server

УРОВЕНЬ 3 — WRAPPER + UI (зависит от L0+L1+L2):
  PTY manager            ← зависит от Rust TUI
  Compliance panel       ← зависит от scanner, scoring
  Dashboard panel        ← зависит от scoring, watcher
  Themes                 ← зависит от Rust TUI

УРОВЕНЬ 4 — РАСШИРЕНИЯ (зависит от L0-L3):
  MCP server             ← зависит от server, scanner, fixer
  reports                ← зависит от scanner, regulation-db, scoring
  discovery              ← зависит от scanner, ai-registry
  agent-governance       ← зависит от discovery, scanner, scoring
  runtime middleware     ← зависит от regulation-db (knows what to enforce)

УРОВЕНЬ 5 — ПЛАТФОРМА (зависит от L0-L4):
  CI/CD integrations     ← зависит от scanner, headless
  VS Code extension      ← зависит от server API
  Monitoring             ← зависит от scanner, discovery, watcher
```

### Визуальный граф

```
L0:  [regulation-db] [ai-registry] [scoring]
          │               │            │
          ▼               ▼            ▼
L1:  [scanner/checks] ─────► [watcher] [memory]
          │                      │        │
          ▼                      ▼        ▼
L2:  [server/http+sse] [fixer] [llm] [Rust TUI]
          │               │      │        │
          ▼               ▼      ▼        ▼
L3:  [PTY manager] [Compliance panel] [Dashboard] [Themes]
          │               │              │
          ▼               ▼              ▼
L4:  [MCP] [reports] [discovery] [agent-gov] [runtime]
          │       │         │          │
          ▼       ▼         ▼          ▼
L5:  [CI/CD] [VS Code] [Monitoring]
```

---

## 5. DataProvider Port

Engine получает данные двумя способами: offline (JSON бандл) и online (SaaS API).

```typescript
// engine/src/data/provider.ts
interface DataProvider {
  getTools(query: ToolQuery): Promise<RegistryTool[]>;
  getObligations(regulation: string, riskLevel: string): Promise<Obligation[]>;
  getBundle(): Promise<DataBundle>;
}

// Реализации:
class LocalJSONProvider implements DataProvider {
  // Offline: ~530KB JSON бандл в .complior/data/
  // 200 top AI tools + 108 obligations + EU AI Act + CO SB205
  // Обновляется при `complior update`
  // Всегда доступен, даже без сети
}

class SaaSAPIProvider implements DataProvider {
  // Online: REST API к app.complior.eu
  // 2,477+ AI tools, evidence, assessments
  // ETag caching, rate limits per plan
  // API key в .complior/credentials
}

class HybridProvider implements DataProvider {
  // Default: Local + API enrichment
  // Local для скорости, API для полных данных
  // Graceful fallback → Local если нет сети
}
```

### Data Tiering

| Данные | Local (FREE) | Free API | Paid API |
|--------|-------------|----------|----------|
| AI Tools | 200 | 2,477 | 2,477 + evidence |
| Obligations | 108 | 108 | 108 + guidance |
| Regulations | EU+CO | All | All + updates |
| Detection Patterns | 200 | 200 | All |
| Размер бандла | ~530KB | — | — |
| Rate Limit | — | 100/hour | 10,000/hour |

---

## 6. PTY Management

### Архитектура PTY

```
Complior (Rust TUI)
├── PTY Master ──── fd ──── PTY Slave ──── Guest Agent Process
│   ├── Read: agent stdout → parse ANSI → render in panel
│   ├── Write: user keystrokes → forward to agent
│   └── Resize: terminal resize → SIGWINCH → agent
│
├── Agent Registry
│   ├── odelix: { command: "odelix", detect: "which odelix" }
│   ├── claude-code: { command: "claude", detect: "which claude" }
│   ├── opencode: { command: "opencode", detect: "which opencode" }
│   ├── aider: { command: "aider", detect: "which aider" }
│   └── bash: { command: "bash", detect: "true" }
│
└── Multi-Agent Manager
    ├── Tab 1: Agent A (PTY fd1) ◄── active
    ├── Tab 2: Agent B (PTY fd2)
    └── Split: Agent A | Agent B (оба видимы)
```

### Input Routing

```
User Keystroke
    │
    ├── Ctrl+Shift+* ──► Complior command
    │   ├── Ctrl+Shift+D: toggle dashboard
    │   ├── Ctrl+Shift+P: toggle compliance panel
    │   ├── Ctrl+Shift+S: trigger scan
    │   ├── Ctrl+Shift+F: fix all
    │   ├── Ctrl+Shift+N: add agent
    │   ├── Ctrl+Shift+W: close agent tab
    │   ├── Ctrl+Shift+V: vertical split
    │   └── Ctrl+Shift+H: horizontal split
    │
    ├── Ctrl+1/2/3 ──► Switch agent tab
    │
    └── All other keys ──► Forward to active agent via PTY
```

### Agent Health

```
Engine monitors guest agent process:
  1. Process alive? → check every 1s
  2. Process crashed → restart + toast "Agent restarted"
  3. Process hung (no output 30s) → warning toast
  4. Process kill requested → SIGTERM → 5s → SIGKILL
```

---

## 7. Сканер: 5-layer архитектура

```
Layer 1: File Presence (детерминистический)
  Проверяет наличие файлов: COMPLIANCE.md, privacy-policy, FRIA.md, etc.
  Скорость: <10ms

Layer 2: Document Structure (детерминистический)
  Парсит содержимое: секции, ключевые слова, completeness
  Скорость: <50ms

Layer 3: Config & Dependencies (детерминистический)
  package.json, .env, docker-compose: AI SDKs, API keys, logging config
  Скорость: <100ms

Layer 4: Code Patterns (AST, детерминистический)
  Babel (JS/TS), tree-sitter (Python/Go/Rust)
  Паттерны: AI SDK imports, API calls, system prompts, agent configs
  Скорость: <500ms

Layer 5: LLM Deep Analysis (недетерминистический, Pro only)
  Semantic analysis: edge cases, implicit AI usage, quality of docs
  Скорость: 2-5s
  ПРИНЦИП: LLM НЕ делает compliance determinations — только insights
```

### Scoring Formula

```
Score = Σ (check_weight × check_result) / Σ check_weight × 100

Weights:
  data_sensitivity:  40%   (personal data, vulnerable groups)
  severity:          30%   (article importance, fine level)
  exposure:          20%   (public-facing, number of users)
  fix_complexity:    10%   (how hard to fix)

Color Scale:
  0-39:  RED    🔴
  40-69: AMBER  🟡
  70-84: YELLOW 🟡
  85-100: GREEN 🟢
```

---

## 8. Performance Budget

| Операция | Бюджет | Реализация |
|----------|--------|------------|
| Incremental scan (1 файл) | <200ms | Кэш AST, diff-only scan |
| Full scan (500 файлов) | <10s | Параллельный AST parse |
| Score calculation | <10ms | In-memory weighted formula |
| Toast notification | <50ms | Async render, non-blocking |
| PTY passthrough | <1ms | Direct fd read/write |
| Engine startup | <2s | Lazy module loading |
| TUI startup | <500ms | Pre-compiled binary |
| Fix preview | <500ms | Cached diff generation |

---

## 9. Структура репозитория

```
complior/
├── Cargo.toml                    # Rust workspace
├── package.json                  # TS workspace (Bun/Node)
├── CLAUDE.md                     # Claude Code инструкции
├── README.md                     # Обзор проекта
│
├── src/                          # Rust TUI
│   ├── main.rs                   # Entry point, CLI args
│   ├── app.rs                    # App state machine
│   ├── engine_client.rs          # HTTP/SSE client к Engine
│   ├── pty/                      # PTY management
│   │   ├── manager.rs            # Multi-agent PTY lifecycle
│   │   ├── renderer.rs           # Passthrough ANSI rendering
│   │   └── input.rs              # Input routing
│   ├── views/                    # UI views
│   │   ├── dashboard.rs          # Dashboard preset
│   │   ├── scan.rs               # Scan results view
│   │   ├── fix.rs                # Fix selection view
│   │   ├── chat.rs               # LLM chat view
│   │   ├── timeline.rs           # EU AI Act timeline
│   │   └── report.rs             # Report view
│   ├── components/               # Reusable widgets
│   │   ├── score_gauge.rs        # Score gauge (animated)
│   │   ├── compliance_panel.rs   # Right sidebar
│   │   ├── toast.rs              # Toast notifications
│   │   ├── statusbar.rs          # Bottom status bar
│   │   └── agent_tabs.rs         # Agent tab bar
│   ├── themes/                   # Theme engine (TOML)
│   ├── config.rs                 # Config management
│   └── types.rs                  # Shared types
│
├── engine/                       # TypeScript Engine
│   ├── src/
│   │   ├── server/               # Hono HTTP server
│   │   ├── scanner/              # 5-layer scanner
│   │   ├── fixer/                # Auto-fix templates
│   │   ├── databases/            # Regulation DB + AI Registry
│   │   ├── memory/               # 3-level memory
│   │   ├── llm/                  # LLM integration
│   │   ├── reports/              # Report generators
│   │   ├── discovery/            # AI system discovery
│   │   ├── agent-governance/     # Agent governance
│   │   ├── runtime/              # Runtime middleware gen
│   │   ├── monitoring/           # Drift, anomaly detection
│   │   ├── watcher/              # File watcher
│   │   └── data/                 # DataProvider port
│   ├── package.json
│   └── tsconfig.json
│
├── packages/                     # Shared packages
│   ├── sdk/                      # @complior/sdk
│   ├── shared-types/             # Shared TypeScript types
│   └── adapters/                 # SDK adapters (@complior/openai, etc.)
│
├── tests/                        # Tests
│   ├── e2e/                      # E2E shell scripts
│   └── fixtures/                 # Test fixtures
│
├── docs/                         # Documentation
│   ├── UNIFIED-ARCHITECTURE.md   # Единый план двух проектов
│   ├── PRODUCT-VISION.md         # Видение продукта v6
│   ├── ARCHITECTURE.md           # Этот документ
│   ├── PRODUCT-BACKLOG.md        # Бэклог (все фичи)
│   ├── DATA-FLOWS.md             # Потоки данных
│   ├── BURNDOWN.md               # Burndown chart
│   ├── WALKTHROUGH.md            # Demo walkthrough
│   ├── CODING-STANDARDS.md       # Стандарты кода
│   └── SPRINT-BACKLOG-S01..S10/  # Sprint backlogs
│
├── landing/                      # Landing page (Next.js)
├── npm/                          # npm wrapper package
├── homebrew/                     # Homebrew formula
├── .github/workflows/            # CI/CD
└── scripts/                      # Build, install, demo scripts
```

---

## 10. Существующий код (v1.0.0)

Проект уже имеет работающий v1.0.0 (19 спринтов, 568 тестов):

### Engine (TypeScript)
- **315 тестов** (Vitest)
- Scanner: 5 layers, 19 checks, AST (Babel), scoring
- Fixer: 6 templates + AI-fix
- Regulation DB: EU AI Act + CO SB205, 108 obligations
- AI Registry: 2,477 tools, detection patterns
- LLM: Vercel AI SDK, multi-model, 23 tools, 4 agent modes
- Memory: 3 levels, sessions, knowledge tools
- MCP Server: stdio, 23 tools
- Reports: MD, PDF (@react-pdf), SARIF
- Onboarding wizard
- SDK + middleware (badge, undo)

### TUI (Rust)
- **253 теста** (cargo test)
- 6 views: Dashboard, Scan, Fix, Chat, Timeline, Report
- 8 themes + theme picker
- Vim/Standard navigation
- File browser, code viewer, diff overlay
- Score gauge (animated), sparkline, deadlines
- Toast notifications, command palette
- Watch mode, model selector
- Undo history, suggestions
- Responsive layout, animations, mouse support

### SDK (TypeScript)
- **9 тестов**
- Middleware: compliorWrap()
- Badge API

### E2E
- 7 shell-based scenarios
- 46 manual E2E tests (93% pass)

### Инфраструктура
- GitHub Actions: release pipeline (5 platforms)
- npm wrapper: `npx complior`
- Install script: `curl | sh`
- Homebrew formula
- Docker: multi-stage build (~50MB)

---

## 11. Что нового в v6 (относительно v1.0.0)

| Компонент | v1.0.0 | v6 (план) |
|-----------|--------|-----------|
| TUI | Standalone compliance app | **Wrapper-оркестратор** (PTY) |
| Agent support | Нет | **Любой CLI agent** (subprocess) |
| Multi-agent | Нет | **Tabs + splits** |
| UI | Fixed 6-view layout | **4 пресета** + custom layout |
| Compliance Gate | Manual scan | **Real-time** (200мс, file watcher) |
| Data source | Built-in only | **DataProvider port** (offline + API) |
| Runtime | Нет | **Middleware генерация** (wrapper, logger, marker) |
| Agent Governance | Нет | **Registry, manifest, score, kill switch** |
| Monitoring | Нет | **Drift detection, anomaly, regulation feed** |
| Discovery | Нет | **Code, infra, agent, dependency chain** |
| Integrations | MCP only | **MCP + GH Action + VS Code + pre-commit** |

---

**Обновлено:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
