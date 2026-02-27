# ARCHITECTURE.md — Complior v8: Техническая архитектура

**Версия:** 8.0.0
**Дата:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено

---

## 1. Wrapper → Daemon: почему

Complior v6 запускал coding agent как PTY subprocess внутри себя ("tmux для compliance"). Это привело к проблемам:

| Проблема | Описание |
|----------|----------|
| PTY rendering bugs | Агенты используют сложные terminal escape sequences, Complior ломал рендеринг |
| SPOF | Crash Complior = crash агента, потеря работы |
| Нет IDE | Cursor, VS Code, Windsurf — не CLI, не запустишь в PTY |
| Input routing | Сложная логика разделения input между Complior и агентом |
| Multi-agent | Каждый агент — отдельный PTY, сложно в управлении |

**Решение v8:** Daemon-архитектура. Complior — фоновый процесс, агенты работают независимо.

---

## 2. Три режима запуска

```bash
# Режим 1: Daemon + TUI (по умолчанию)
$ complior
# Запускает daemon (watcher + engine + MCP + HTTP), затем подключает TUI

# Режим 2: Daemon-only (headless)
$ complior daemon --watch
# Только daemon, без TUI. Для CI/CD, серверов, background monitoring.

# Режим 3: Standalone CLI
$ complior scan --ci
# Одноразовое выполнение без daemon. Запускает engine, сканирует, выводит результат, завершается.
```

---

## 3. Компоненты системы

```
┌─────────────────────────────────────────────────────────────────┐
│                       COMPLIOR v8 SYSTEM                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DAEMON (background process)                              │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ File Watcher │  │ TS Engine   │  │ MCP Server      │  │   │
│  │  │ (chokidar)   │  │ (Hono HTTP) │  │ (stdio, 8 tools)│  │   │
│  │  │              │  │             │  │                 │  │   │
│  │  │ inotify →    │  │ Scanner     │  │ complior_scan   │  │   │
│  │  │ rescan →     │  │ Fixer       │  │ complior_fix    │  │   │
│  │  │ SSE notify   │  │ Passport    │  │ complior_score  │  │   │
│  │  └─────────────┘  │ Reporter    │  │ complior_explain│  │   │
│  │                    │ Gate        │  │ complior_passport│  │   │
│  │                    │ Evidence    │  │ complior_validate│  │   │
│  │                    └─────────────┘  │ complior_deadline│  │   │
│  │                                     │ complior_suggest │  │   │
│  │  ┌──────────────────────────────┐   └─────────────────────┘  │
│  │  │ HTTP API (localhost:PORT)    │                             │
│  │  │ /scan, /fix, /status,       │                             │
│  │  │ /agent/*, /passport/*,      │                             │
│  │  │ /obligations/*, /report,    │                             │
│  │  │ /health, /sbom              │                             │
│  │  │ SSE: score_update, drift,   │                             │
│  │  │      fix_applied, passport  │                             │
│  │  └──────────────────────────────┘                             │
│  └──────────────────────────────────────────────────────────────┘│
│       ▲ HTTP/SSE          ▲ MCP (stdio)          ▲ HTTP         │
│       │                   │                      │              │
│  ┌────┴───────┐   ┌──────┴──────────┐   ┌──────┴───────┐      │
│  │ TUI        │   │ Coding Agents    │   │ CLI          │      │
│  │ (Rust,     │   │ (Claude Code,    │   │ (standalone  │      │
│  │  ratatui)  │   │  Cursor, VS Code,│   │  commands)   │      │
│  │ 8 pages    │   │  OpenCode, aider)│   │              │      │
│  │ 100+ themes│   │                  │   │ scan, fix,   │      │
│  │ ~5MB binary│   │ Работают         │   │ agent:init,  │      │
│  └────────────┘   │ НЕЗАВИСИМО       │   │ report, ...  │      │
│                   └──────────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Daemon
- **Роль:** Background process — compliance monitoring, API, MCP
- **Компоненты:** File watcher (chokidar/inotify), TS Engine (Hono HTTP), MCP Server (stdio)
- **Lifecycle:** Запускается при `complior` или `complior daemon`, работает фоново
- **Состояние:** Хранит scan results, passport cache, evidence chain в `.complior/`

### TUI (Rust, ratatui)
- **Роль:** Dashboard UI, подключается к daemon через HTTP/SSE
- **Технологии:** Rust 2024, ratatui, crossterm, tokio, reqwest
- **8 pages:** Dashboard, Scan, Fix, Passport, Obligations, Timeline, Report, Log
- **Не управляет daemon lifecycle** — TUI может подключаться/отключаться
- **Themes:** 100+ TOML themes, vim/standard navigation, mouse support

### CLI
- **Роль:** Одноразовые команды, ~25 команд
- **Два режима:** Standalone (запускает engine inline) или через daemon (HTTP call)
- **CI/CD:** `complior scan --ci --threshold 80 --json`

### Coding Agents (внешние)
- **Роль:** Пишут код. Complior НЕ управляет их процессами.
- **Подключение:** MCP (stdio) — 8 compliance tools
- **Поддерживаемые:** Любые MCP-совместимые (Claude Code, Cursor, Windsurf, OpenCode, etc.)

---

## 4. Engine — внутренняя архитектура (Clean Architecture)

```
TS ENGINE — CLEAN ARCHITECTURE (engine/src/):
──────────────────────────────────────────────────────────
LAYER / MODULE              ОПИСАНИЕ
──────────────────────────────────────────────────────────
ports/                      Контракты (zero implementation)
  ├── scanner.port.ts       Интерфейсы сканера
  ├── storage.port.ts       Файловое хранение
  ├── llm.port.ts           LLM интерфейс
  ├── events.port.ts        Шина событий
  ├── logger.port.ts        Логгирование
  └── browser.port.ts       Headless browser

domain/                     Чистая бизнес-логика
  ├── scanner/              5-layer scanner: checks, layers, rules, score-calculator
  ├── classifier/           Risk classification engine
  ├── fixer/                Fix templates + strategies
  ├── gate/                 Compliance gate (scan → score diff → notify)
  ├── whatif/               What-if analysis
  ├── metadata/             .well-known/ai-compliance.json
  ├── reporter/             Reports: MD, PDF, SARIF, badge SVG
  └── disclaimer.*          Legal disclaimer engine

services/                   Оркестрация
  ├── scan-service.ts       POST /scan orchestration
  ├── fix-service.ts        Fix preview + apply
  ├── undo-service.ts       Git revert для фиксов
  ├── file-service.ts       File operations
  ├── report-service.ts     Report generation
  ├── badge-service.ts      Badge API
  ├── status-service.ts     Health + status
  ├── share-service.ts      Share / export
  └── external-scan-service.ts  External URL scan

infra/                      Адаптеры инфраструктуры
  ├── fs-adapter.ts         File system operations
  ├── llm-adapter.ts        Vercel AI SDK (multi-model)
  ├── event-bus.ts          In-process event bus
  ├── logger.ts             Structured logging
  ├── file-watcher.ts       chokidar: file changes → rescan
  ├── shell-adapter.ts      Safe shell execution
  ├── git-adapter.ts        Git operations
  ├── regulation-loader.ts  Loads regulation JSON
  └── headless-browser.ts   PDF rendering

http/                       Thin route handlers (Hono)
  ├── create-router.ts      Hono router factory
  └── routes/               Route files (scan, fix, status, agent, passport, ...)

data/                       Статические данные (regulation JSON)
  ├── regulation-loader.ts  Загрузчик regulation schemas
  └── schemas*.ts           EU AI Act obligations (JSON)

mcp/                        MCP Server (stdio, 8 tools)
cli/                        CLI headless mode
output/                     Output formatting

composition-root.ts         Single DI wiring point
server.ts                   Hono HTTP server + SSE
index.ts                    Entry point (re-exports loadApplication)
──────────────────────────────────────────────────────────
```

**Принципы:**
- DI via closures — все factories return `Object.freeze({...})`
- Domain files NEVER import from infra/http/services
- No global state — `composition-root.ts` = single wiring point
- Ports → contracts (zero implementation)

---

## 5. Коммуникация

### TUI ↔ Daemon: HTTP + SSE

```
TUI (Rust)                              Daemon Engine (TS)
────────────                             ──────────────────
GET  /health       ──────────────►     Health check (TUI startup)
POST /scan         ──────────────►     Запуск сканирования
GET  /status       ──────────────►     Текущий score + findings
POST /fix/preview  ──────────────►     Preview фиксов (unified diff)
POST /fix/apply    ──────────────►     Применить фиксы
GET  /agent/list   ──────────────►     Список Agent Passports
POST /agent/init   ──────────────►     Обнаружить AI-системы
GET  /agent/:id    ──────────────►     Passport по ID
POST /agent/validate ────────────►     Проверить completeness
GET  /obligations  ──────────────►     108 obligations + coverage
GET  /passport/*   ──────────────►     Passport operations
POST /report       ──────────────►     Генерация отчёта
GET  /sbom         ──────────────►     SBOM (CycloneDX 1.5)

                   ◄──────────────     SSE: score_update (file changes)
                   ◄──────────────     SSE: scan.drift (drift detected)
                   ◄──────────────     SSE: fix_applied (auto-fix)
                   ◄──────────────     SSE: passport_updated
```

**Протокол:** HTTP/1.1 на localhost, JSON req/resp, SSE для streaming.
**Порт:** Динамический (daemon выбирает свободный порт, пишет в `.complior/daemon.pid`).

### Agents ↔ Daemon: MCP (stdio)

```
Agent (Claude Code, Cursor, etc.)       Complior MCP Server
─────────────────────────────────       ───────────────────
initialize                ──────►     Capabilities exchange
tools/list                ──────►     8 compliance tools
tools/call (complior_scan) ─────►     Engine API → scan result
tools/call (complior_fix)  ─────►     Engine API → fix applied
tools/call (complior_passport) ──►     Passport operations
```

**Транспорт:** stdio (JSON-RPC 2.0). Конфигурация в `~/.config/complior/mcp.json`.

### CLI ↔ Daemon: HTTP (или inline)

```
CLI command                             Daemon (if running)
───────────                             ──────────────────
complior scan                           → HTTP GET /scan → JSON result
complior agent:init                     → HTTP POST /agent/init → passports
complior scan --ci                      → Engine inline (no daemon needed)
```

---

## 6. Agent Passport в архитектуре

### Manifest Format (36 полей)
```json
{
  "agent_id": "uuid",
  "name": "customer-support-agent",
  "version": "1.0.0",
  "owner": { "team": "ML", "contact": "ml@company.com", "responsible_person": "..." },
  "type": "autonomous|assistive|hybrid",
  "autonomy_level": "L1|L2|L3|L4|L5",
  "autonomy_evidence": { "human_approval_gates": 3, "unsupervised_actions": 0 },
  "framework": "langchain|crewai|anthropic|vercel-ai|...",
  "model": { "provider": "anthropic", "model_id": "claude-sonnet-4-5", "deployment": "cloud" },
  "permissions": { "tools": [...], "data_access": "...", "denied": [...], "mcp_servers": [...] },
  "constraints": { "rate_limits": {...}, "budget": {...}, "human_approval_required": true },
  "compliance": {
    "eu_ai_act": {
      "risk_class": "limited",
      "applicable_articles": ["art-26", "art-50"],
      "deployer_obligations_met": [...],
      "deployer_obligations_pending": [...]
    },
    "complior_score": 78,
    "last_scan": "2026-02-27T12:00:00Z"
  },
  "disclosure": { "user_facing": true, "disclosure_text": "..." },
  "logging": { "actions_logged": true, "retention_days": 180 },
  "lifecycle": { "status": "active", "deployed_since": "...", "next_review": "..." },
  "signature": { "algorithm": "ed25519", "public_key": "...", "signed_at": "...", "hash": "..." },
  "source": { "mode": "auto|semi-auto|manual", "confidence": 0.92 }
}
```

### 3 Mode Discovery

```
Mode 1 (AUTO — CLI):
  AST analysis → detect framework, model, permissions, tools, human gates
  → auto-fill 85-95% → wizard for owner/disclosure → generate + sign

Mode 2 (SEMI-AUTO — MCP Proxy):
  Runtime observation → tool calls, API usage → enrich with AI Registry
  → auto-fill 40-60% → manual completion required

Mode 3 (MANUAL — SaaS):
  5-step wizard → search AI Registry (pre-fill) → manual entry
  → 100% completeness (no code verification)
```

### Autonomy L1-L5 (auto-rated from AST)
- **L1 Assistive:** proposes, human decides AND executes → minimal risk
- **L2 Suggestive:** prepares, human confirms → minimal-limited
- **L3 Supervised:** acts, human can veto → limited
- **L4 Autonomous:** acts independently, human gets logs → limited-high
- **L5 Fully Auto:** acts without notification → high

### Cryptographic Signing
Ed25519 signature on: `agent_id + permissions_hash + constraints_hash + compliance_hash + timestamp`. Enables tamper-proof evidence chain, history tracking, audit verification.

### Passport Visibility
Passport организации — **закрытый по умолчанию**. Только org members видят все passports. Auditor/regulator получают read-only Audit Package export. Opt-in публичность: deployer может показать badge "AI Compliance tracked by Complior" на своём сайте.

Подробнее: `docs/FEATURE-AGENT-PASSPORT.md`

---

## 7. Сканер: 5-layer архитектура

> Planned improvements (S04-S05): passport-awareness checks (L1/L2), domain/industry context detection (L3), severity-weighted scoring, context-aware banned packages, prioritized file scanning for monorepos. See `docs/SCANNER.md` Section "Planned Improvements".

```
Layer 1: File Presence (детерминистический)
  Проверяет наличие файлов: COMPLIANCE.md, privacy-policy, FRIA.md, etc.
  Скорость: <10ms

Layer 2: Document Structure (детерминистический)
  Парсит содержимое: секции, ключевые слова, completeness, depth analysis
  Скорость: <50ms

Layer 3: Config & Dependencies (детерминистический)
  package.json, .env, docker-compose: AI SDKs, API keys, logging config
  45 banned packages (Art. 5 prohibitions)
  Скорость: <100ms

Layer 4: Code Patterns (AST, детерминистический)
  Babel (JS/TS), tree-sitter (Python/Go/Rust)
  33 pattern rules across 8 categories
  Cross-layer verification (5 rules)
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
  0-39:  RED
  40-69: AMBER
  70-84: YELLOW
  85-100: GREEN
```

---

## 8. Хранение данных

### `.complior/` — project-level
```
.complior/
├── daemon.pid              # PID + port daemon'а
├── config.yaml             # compliance profile
├── agents/                 # Agent Passports
│   ├── customer-support-agent-manifest.json
│   └── data-pipeline-manifest.json
├── evidence/               # Evidence chain (signed hashes)
│   ├── scan-2026-02-27.json
│   └── chain.json
├── scans/                  # Scan history
│   └── latest.json
└── reports/                # Generated reports
    ├── compliance.md
    └── audit-package.zip
```

### `~/.config/complior/` — user-level
```
~/.config/complior/
├── tui.toml               # TUI config (theme, layout, keybindings)
├── credentials             # COMPLIOR_API_KEY=cpl_xxxxx
├── mcp.json                # MCP server configuration
└── keys/                   # Ed25519 keypair for passport signing
    ├── complior.pub
    └── complior.key        # Permission: 600
```

---

## 9. Безопасность

### Ed25519 Passport Signing
- Keypair хранится в `~/.config/complior/keys/` (permission 600)
- Каждый passport подписан при создании/обновлении
- Signature covers: `agent_id + permissions_hash + constraints_hash + compliance_hash + timestamp`
- Верификация: `complior agent:validate --verify-signature`

### Evidence Chain
- Каждый scan result → подписан → hash добавляется в chain
- Chain = append-only, ordered by timestamp
- Export: `complior cert:evidence` → JSON/ZIP для аудитора

### IPC Security
- HTTP API — только localhost, без внешнего сетевого доступа
- MCP — stdio transport, нет network exposure
- No eval(), no Function(), validated with Zod on every boundary

---

## 10. Performance Budget

| Операция | Бюджет | Реализация |
|----------|--------|------------|
| Incremental scan (1 файл) | <200ms | Кэш AST, diff-only scan |
| Full scan (500 файлов) | <10s | Параллельный AST parse |
| Score calculation | <10ms | In-memory weighted formula |
| Toast notification | <50ms | Async SSE, non-blocking |
| Daemon startup | <2s | Lazy module loading |
| TUI startup | <500ms | Pre-compiled binary |
| TUI connect to daemon | <100ms | HTTP /health check |
| Fix preview | <500ms | Cached diff generation |
| Passport generation (Mode 1) | <5s | AST analysis + wizard |
| MCP tool response | <1s | Direct engine call |

---

## 11. Структура репозитория

```
complior/
├── Cargo.toml                    # Rust workspace (members: ["tui"])
├── package.json                  # TS workspace (Bun/Node)
├── CLAUDE.md                     # Claude Code инструкции (v8)
├── README.md                     # Обзор проекта
│
├── tui/                          # Rust TUI
│   └── src/
│       ├── main.rs               # Entry point, CLI args, App state
│       ├── cli.rs                # CLI argument parsing
│       ├── config.rs             # Config management (TOML)
│       ├── credentials.rs        # API key loading
│       ├── engine_client.rs      # HTTP/SSE client к Daemon
│       ├── engine_process.rs     # Daemon process lifecycle
│       ├── input.rs              # Input handling (TUI hotkeys)
│       ├── types.rs              # Shared types
│       ├── app/                   # App state + DataProvider wiring
│       ├── data/                  # DataProvider: EngineDataProvider, MockDataProvider
│       ├── views/                 # UI views (8 pages)
│       ├── components/            # Reusable widgets (gauge, toast, statusbar, ...)
│       ├── widgets/               # Low-level ratatui widgets
│       └── bin/                   # Binary entry points
│
├── engine/                       # TypeScript Engine (Clean Architecture)
│   └── src/
│       ├── ports/                 # Contracts (6 ports)
│       ├── domain/                # Pure business logic (scanner, classifier, fixer, gate, ...)
│       ├── services/              # Application orchestration
│       ├── infra/                 # Infrastructure adapters
│       ├── http/                  # Thin route handlers (Hono)
│       ├── data/                  # Regulation schemas (local JSON)
│       ├── mcp/                   # MCP Server (stdio, 8 tools)
│       ├── cli/                   # CLI headless mode
│       ├── output/                # Output formatting
│       ├── composition-root.ts    # Single DI wiring point
│       ├── server.ts              # Hono HTTP server + SSE
│       └── index.ts               # Entry (re-exports loadApplication)
│
├── packages/                     # Packages
│   ├── sdk/                      # @complior/sdk — runtime compliance middleware
│   └── npm/                      # npm wrapper package (npx complior)
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # Этот документ
│   ├── PRODUCT-VISION.md         # Видение v8 (daemon + passport + pipeline)
│   ├── PRODUCT-BACKLOG.md        # v8 backlog (~167 фич, obligation-driven)
│   ├── UNIFIED-ARCHITECTURE.md   # CLI v8 + SaaS v6 integration
│   ├── DATA-FLOWS.md             # Потоки данных (12 потоков)
│   ├── TUI-DESIGN-SPEC.md        # 8 TUI pages + CLI commands + MCP tools
│   ├── FEATURE-AGENT-PASSPORT.md # Agent Passport spec (36 полей, 3 modes)
│   ├── EU-AI-ACT-PIPELINE.md     # 108 obligations → 7-step pipeline
│   ├── SCANNER.md                # Scanner rules + layers
│   ├── COMPLIANCE-STANDARD.md    # Metadata tech standard
│   ├── PACK-FORMAT.md            # Pack format spec
│   ├── contributing/             # Coding standards (CODING-STANDARDS*.md)
│   ├── adr/                      # Architecture Decision Records
│   └── sprints/                  # Sprint backlogs
│
├── tests/                        # E2E test fixtures
├── demos/                        # Demo scripts
├── landing/                      # Landing page
├── distribute/                   # Distribution: Dockerfile, install script, Homebrew
├── scripts/                      # Build scripts
└── .github/workflows/            # CI/CD (release pipeline, 5 platforms)
```

---

**Обновлено:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
