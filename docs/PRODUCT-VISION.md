# PRODUCT-VISION.md — Complior: Платформа управления AI Compliance

**Версия:** 10.0.0
**Дата:** 2026-03-13
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено

---

## 1. Проблема

2 августа 2026 — enforcement EU AI Act для high-risk систем. **~5 месяцев.**

- 108 обязательств deployer'а (Art. 4, 5, 6, 9, 12, 14, 19, 21, 26, 27, 49, 50)
- 144 страницы регуляции, без единого инструмента для разработчиков
- Каждая организация использует 5-15 AI-систем (собственные + вендорские), и ни одна не зарегистрирована
- Compliance = ручной процесс юристов в Excel, оторванный от кода
- Штрафы: до €35M или 7% оборота (Art. 99)
- Параллельно растёт спрос на ISO 42001 (система управления ИИ) и ISO 27090 (безопасность ИИ)

**Разработчики пишут AI-код без compliance. DPO не знает какие AI-системы используются. Юристы проверяют compliance без кода.**

---

## 2. Решение: Complior Platform

> **Complior — платформа, которая решает одну проблему: ИИ-системы в ЕС должны соответствовать закону, а у команд нет ни времени, ни экспертизы это обеспечить.**

### Три уровня платформы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPLIOR PLATFORM                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  DEVELOPMENT-TIME                                               │    │
│  │  Когда: разработка, CI/CD                                       │    │
│  │  Кто: разработчики, DevOps, AI-строители                       │    │
│  │                                                                 │    │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────────┐                │    │
│  │  │  ENGINE   │   │ CLI/TUI  │   │  MCP SERVER  │                │    │
│  │  │  (daemon) │◄──│ (binary) │   │  (protocol)  │                │    │
│  │  │          │   │          │   │              │                │    │
│  │  │ Scanner  │   │ 9 pages  │   │ Code Tools:  │                │    │
│  │  │ Fixer    │   │ Chat     │   │ scan, fix,   │                │    │
│  │  │ Passport │   │ Wizard   │   │ passport,    │                │    │
│  │  │ Docs     │   │ Headless │   │ suggest      │                │    │
│  │  │ FRIA     │   │ Daemon   │   │              │                │    │
│  │  │ Evidence │   │ CI mode  │   │ Guard Tools: │                │    │
│  │  └──────────┘   └──────────┘   │ check, pii,  │                │    │
│  │       ▲              ▲          │ bias         │                │    │
│  │       │              │          └──────┬───────┘                │    │
│  │       │         HTTP/SSE              │                         │    │
│  │       └──────────────┘       stdio    │                         │    │
│  │              ▲                         │                         │    │
│  └──────────────┼─────────────────────────┼─────────────────────────┘   │
│                 │                         │                              │
│  ┌──────────────┼─────────────────────────┼─────────────────────────┐   │
│  │  RUNTIME     │                         │                         │   │
│  │  Когда: production, каждый API-вызов   │                         │   │
│  │  Кто: ИИ-агенты, production-системы    │                         │   │
│  │              │                         │                         │   │
│  │  ┌───────────┴──┐   ┌─────────────────┴──┐                      │   │
│  │  │     SDK      │   │    GUARD API        │                      │   │
│  │  │   (npm lib)  │──▶│  (ML-модель)        │                      │   │
│  │  │              │   │                     │                      │   │
│  │  │ Pre-hooks:   │   │ 5 задач:            │                      │   │
│  │  │ prohibited,  │   │ prohibited,         │                      │   │
│  │  │ sanitize,    │   │ PII, bias,          │                      │   │
│  │  │ disclosure,  │   │ injection,          │                      │   │
│  │  │ permission,  │   │ escalation          │                      │   │
│  │  │ rate-limit   │   │                     │                      │   │
│  │  │              │   │ 50ms, $0.0001/call  │                      │   │
│  │  │ Post-hooks:  │   │                     │                      │   │
│  │  │ bias, escal.,│   │ [ПЛАНИРУЕТСЯ]       │                      │   │
│  │  │ budget,      │   │                     │                      │   │
│  │  │ circuit-br.  │   │                     │                      │   │
│  │  └──────────────┘   └─────────────────────┘                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  MANAGEMENT                                                      │   │
│  │  Когда: аудит, сертификация, fleet management                    │   │
│  │  Кто: CTO, DPO, аудиторы, юристы                                │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │              SAAS DASHBOARD (web app)                      │  │   │
│  │  │                                                            │  │   │
│  │  │  Fleet Dashboard    Passport Wizard    FRIA Wizard         │  │   │
│  │  │  Audit Package      ISO 42001 Readiness    Reports        │  │   │
│  │  │  Agent Registry     Monitoring    Incident Management     │  │   │
│  │  │                                                            │  │   │
│  │  │  Starter (€0) → Growth (€149/мес) → Enterprise (€499/мес) │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Продукты по уровням

| Уровень | Продукт | Тип | Статус | Назначение |
|---------|---------|-----|--------|------------|
| **Development** | Engine | TS daemon | Готов | Ядро: сканер, фиксы, документы, паспорта |
| **Development** | CLI/TUI | Rust binary | Готов | Терминальный интерфейс + headless команды |
| **Development** | MCP Server | Protocol | Готов | Интерфейс для ИИ-агентов (Code Tools) |
| **Runtime** | SDK | npm library | Готов | Обёртка LLM-вызовов в production |
| **Runtime** | Guard API | ML-модель | R&D Phase | Семантические проверки (замена regex) |
| **Management** | SaaS Dashboard | Web app | Отдельный репо | Аудит, сертификация, fleet management |

### Эволюция: v6 → v8 → v10

| Аспект | v6 (Wrapper) | v8 (Daemon) | v10 (Platform) |
|--------|-------------|-------------|----------------|
| Модель | PTY subprocess хост | Background daemon | 3-level platform |
| Агенты | Запускаются ВНУТРИ | Работают НЕЗАВИСИМО | Два типа: builders + operational |
| Отказ | Crash = crash агента | Daemon отдельно | Каждый компонент независим |
| IDE | Только CLI-агенты | Любые: Cursor, VS Code | + SaaS для менеджеров |
| Центр | Score + Findings | Agent Passport | Passport + Evidence + Standards |
| Runtime | — | — | SDK + Guard API |
| Стандарты | EU AI Act (implicit) | 108 obligations | EU AI Act + ISO 42001 + ISO 27090 + NIST |
| TUI | 8 views (Agent/Orch) | 8 pages | **9 pages** (+ Chat) |

---

## 3. Два типа агентов

```
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│       СТРОИТЕЛИ (Builders)       │    │     ИСПОЛНИТЕЛИ (Operational)    │
│                                  │    │                                  │
│  Claude Code, Codex, Cursor,     │    │  Production agents:              │
│  Windsurf, Devin, aider          │    │  чат-боты, HR-скоринг,           │
│                                  │    │  рекомендации, модерация         │
│                                  │    │                                  │
│  Задача: пишут код,              │    │  Задача: работают с людьми,      │
│  создают других агентов          │    │  принимают решения               │
│                                  │    │                                  │
│  Наша цель: заставить            │    │  Наша цель: не дать              │
│  писать compliant код            │    │  нарушить закон в runtime        │
│                                  │    │                                  │
│  Используют:                     │    │  Используют:                     │
│  ┌────────────────────────┐      │    │  ┌────────────────────────┐      │
│  │ MCP Server             │      │    │  │ SDK (@complior/sdk)    │      │
│  │ + Code Tools           │      │    │  │ + Guard API            │      │
│  │ + Guard Tools          │      │    │  │ + Evidence Chain       │      │
│  └────────────────────────┘      │    │  └────────────────────────┘      │
│                                  │    │                                  │
│  Результат: каждый агент         │    │  Результат: каждый вызов         │
│  рождается с паспортом,          │    │  LLM проверен, залогирован,      │
│  SDK-обёрткой и документами      │    │  и защищён от нарушений          │
└──────────────────────────────────┘    └──────────────────────────────────┘
```

---

## 4. Ключевые ценности

### 4.1 Daemon — без SPOF
Background процесс, не привязанный к агенту. Daemon может работать headless (CI/CD, сервер). TUI подключается/отключается без потери состояния. Агент падает — daemon продолжает наблюдение.

### 4.2 Real-time Compliance Gate
Каждое изменение файла → фоновый ре-скан за 200мс → score update → SSE уведомление. Разработчик видит compliance impact в реальном времени — неважно какой инструмент изменил файл.

### 4.3 Agent Passport — центральная сущность
Каждая AI-система получает `agent-manifest.json` — 36 полей, формализующих identity, permissions, constraints, compliance status. Три режима создания:
- **Mode 1 (Auto)**: CLI анализирует AST → auto-fill 85-95% полей
- **Mode 2 (Semi-Auto)**: MCP Compliance Proxy наблюдает runtime → 40-60%
- **Mode 3 (Manual)**: SaaS wizard + AI Registry pre-fill → 100%

### 4.4 Deterministic Core, AI Interface
LLM НИКОГДА не принимает compliance-решений. Все проверки детерминистические (AST + rules). LLM помогает понять и исправить. Guard API = ML-классификатор для edge cases, не decision maker.

### 4.5 7-Step Pipeline
```
DISCOVER → CLASSIFY → SCAN → FIX → DOCUMENT → MONITOR → CERTIFY
```
Каждое из 108 обязательств проходит через этот pipeline. Agent Passport — центральный data layer, в который стекаются результаты каждого шага.

### 4.6 Developer-First + Free
Free daemon + TUI = полный функционал для разработчика. Монетизация через SaaS Dashboard для CTO/DPO. CLI-Scanner — бесплатно, независимо от тарифа, навсегда.

---

## 5. Продукты

### 5.1 Engine

**Что это:** фоновый daemon (TypeScript/Node.js), ядро платформы. Сканирует код, генерирует фиксы, создаёт документы, управляет паспортами, ведёт evidence chain. Предоставляет HTTP API + SSE + MCP для всех клиентов.

**Расположение:** `engine/core/` (пакет `@complior/engine`)

```
┌────────────────────────────── ENGINE ──────────────────────────────────┐
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         DOMAIN                                  │   │
│  │                                                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│  │  │  SCANNER     │  │   FIXER     │  │  DOCUMENT GENERATOR     │ │   │
│  │  │  (5 layers)  │  │ (6 стратег.)│  │  (шаблоны + LLM)       │ │   │
│  │  │             │  │             │  │                         │ │   │
│  │  │ L1: Files   │  │ A: Code    │  │ FRIA, AI Policy, SoA,  │ │   │
│  │  │ L2: Docs    │  │ B: Docs    │  │ Risk Register, QMS,    │ │   │
│  │  │ L3: Deps    │  │ C: Config  │  │ Worker Notification,   │ │   │
│  │  │ L4: AST     │  │ Cross-layer│  │ Tech Docs, Monitoring  │ │   │
│  │  │ L5: LLM     │  │ Undo       │  │                         │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │   │
│  │         │                │                      │              │   │
│  │  ┌──────┴──────┐  ┌──────┴──────┐  ┌────────────┴────────────┐ │   │
│  │  │  PASSPORT    │  │  EVIDENCE   │  │  OBLIGATION MAPPER      │ │   │
│  │  │  SERVICE     │  │  CHAIN      │  │                         │ │   │
│  │  │             │  │             │  │ 108 EU AI Act           │ │   │
│  │  │ Mode 1: Auto│  │ SHA-256     │  │ 39 ISO 42001 Annex A   │ │   │
│  │  │ Mode 2: MCP │  │ ed25519     │  │ Маппинг: finding→oblg. │ │   │
│  │  │ Mode 3: SaaS│  │ Tamper-proof│  │                         │ │   │
│  │  │ 36 полей    │  │ Per-scan    │  │                         │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      INFRASTRUCTURE                             │   │
│  │                                                                 │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ HTTP API │  │    SSE    │  │   LLM    │  │ FILE WATCHER │  │   │
│  │  │ (Hono)   │  │ (events)  │  │ (Vercel) │  │ (chokidar)   │  │   │
│  │  │          │  │           │  │          │  │              │  │   │
│  │  │ /scan    │  │ score_upd │  │ L5 deep  │  │ 200ms gate   │  │   │
│  │  │ /fix     │  │ scan.drift│  │ Doc fill │  │ Auto-rescan  │  │   │
│  │  │ /agent/* │  │ fix_apply │  │ FRIA fill│  │ Drift detect │  │   │
│  │  │ /report  │  │ passport  │  │ Chat     │  │              │  │   │
│  │  │ /chat    │  │           │  │          │  │              │  │   │
│  │  └──────────┘  └───────────┘  └──────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| E-F1 | **Scanner** | 5-уровневое сканирование: файлы → документы → зависимости → AST → LLM. Score 0-100. Industry patterns (HR, Finance, Healthcare, Education). Multi-framework scoring (EU AI Act + AIUC-1) | Готов |
| E-F2 | **Fixer** | 6 стратегий автофикса. Type A (код): обёртка LLM-вызовов. Type B (документы): генерация из шаблонов. Type C (конфиг): правка зависимостей. Cross-layer rules. Undo | Готов |
| E-F3 | **Document Generator** | 8 шаблонов EU AI Act. Автозаполнение из паспорта (25-70%). Worker Notification (Art.26(7)). Policy Templates (5 industries) | Готов |
| E-F4 | **Passport Service** | 36-полевой паспорт ИИ-агента. 3 режима создания: Auto (AST), MCP Proxy, SaaS Wizard. ed25519 подпись. Export: A2A, AIUC-1, NIST | Готов |
| E-F5 | **Evidence Chain** | SHA-256 hash → ed25519 подпись → chain. Events: scan, fix, passport, FRIA. Tamper-proof доказательство для аудитора | Готов |
| E-F6 | **FRIA Generator** | Fundamental Rights Impact Assessment. Шаблон + подстановка из паспорта (80% pre-fill). Планируется: LLM-дозаполнение таблицы рисков | Частично |
| E-F7 | **Obligation Mapper** | 108 обязательств EU AI Act + 39 контролей ISO 42001. Маппинг finding → обязательство. Scoring rules | Готов |
| E-F8 | **LLM Module** | Vercel AI SDK. L5 deep analysis, Chat Service (SSE streaming), rate limiter. Планируется: дозаполнение FRIA и документов | Частично |
| E-F9 | **File Watcher** | chokidar, 200ms debounce. Каждое изменение файла → rescan → score update → SSE event | Готов |
| E-F10 | **HTTP API + SSE** | Hono server. REST endpoints для всех операций. SSE для real-time updates. Динамический порт | Готов |
| E-F11 | **Agent Registry** | Per-agent compliance score (weighted), permissions matrix, unified audit trail, multi-agent awareness | Готов |
| E-F12 | **Certification** | AIUC-1 readiness score (6 categories), adversarial test runner (5 categories), compliance cost estimator | Готов |

---

### 5.2 CLI / TUI

**Что это:** единый Rust binary (`complior`). Два режима: TUI dashboard (ratatui, интерактивный) и headless CLI (команды для CI/CD, скрипты). Управляет daemon'ом Engine.

**Расположение:** `cli/` (пакет `complior-cli`, binary `complior`)

#### TUI — 9 страниц

| Hotkey | Страница | Назначение |
|--------|---------|-----------|
| `D` | **Dashboard** | Score, deadlines, AI systems, compliance status, activity log, trend sparkline, metrics widgets |
| `S` | **Scan** | Layer status (L1-5), findings by severity, per-OBL detail panel, explanation (x) |
| `F` | **Fix** | Fixable items list + diff preview, batch apply, predicted score |
| `P` | **Passport** | Все AI-системы (CLI + SaaS), L-level, Completeness %, per-obligation checklist |
| `O` | **Obligations** | 108 obligations, filter by role/risk/status, critical path, action links |
| `T` | **Timeline** | Visual timeline до Aug 2, critical path, effort estimates |
| `R` | **Report** | Compliance report с export (PDF/MD/JSON/SARIF) |
| `L` | **Log** | Readonly activity log — daemon events, system messages |
| `C` | **Chat** | Interactive LLM chat — all roles (SYS/YOU/AI), input area, streaming, /cost /mode |

#### CLI Commands (~30)

```bash
# Core
complior init [path]           # создать .complior/ (как git init)
complior scan [path]           # сканирование проекта
complior fix [--all]           # применить авто-фиксы
complior daemon [--watch]      # запустить daemon (headless)
complior tui                   # подключить TUI к daemon
complior mcp                   # запустить MCP server (stdio)

# Agent Passport
complior agent init            # обнаружить AI-системы → сгенерировать passports
complior agent list            # список всех passports
complior agent show <name>     # показать конкретный passport
complior agent validate        # проверить completeness
complior agent export --format a2a|aiuc-1|nist
complior agent fria <name>     # генерация FRIA (80% pre-filled из passport)
complior agent evidence        # export evidence chain
complior agent registry        # per-agent compliance dashboard
complior agent permissions     # permissions matrix
complior agent audit           # unified audit trail
complior agent policy <name>   # AI usage policy (5 industries)

# Certification
complior cert readiness <name> # AIUC-1 readiness check
complior cert test <name>      # adversarial testing

# SaaS Sync
complior login                 # device flow auth
complior logout                # clear tokens
complior sync                  # push passport + scan + docs to SaaS

# Utility
complior init [path]           # инициализация .complior/ (project.toml + profile.json)
complior doctor                # diagnostics
complior version               # version info
```

> **Project root discovery:** TUI и CLI автоматически находят корень проекта, поднимаясь вверх по каталогам (до 10 уровней, стоп на `$HOME`). Маркеры: `.complior/`, `.git/`, `Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`, `pom.xml`, `build.gradle`, `.project`. Если `complior init` не запускался вручную — `.complior/` автоматически создаётся при завершении onboarding wizard.

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| C-F1 | **TUI Dashboard** | 9 страниц: Dashboard, Scan, Fix, Passport, Obligations, Timeline, Report, Log, Chat. Mouse + keyboard. 8 themes | Готов |
| C-F2 | **Headless CLI** | Все команды в non-interactive режиме. CI/CD интеграция. JSON/SARIF output | Готов |
| C-F3 | **Daemon Management** | start/stop/status. PID file. Auto-discovery. Auto-launch из TUI | Готов |
| C-F4 | **Chat Assistant** | Контекстный LLM-помощник на странице Chat. SSE streaming, LLM settings overlay, /cost /mode /model | Готов |
| C-F5 | **Wizard Mode** | Пошаговое заполнение документов через вопросы в TUI. Прогресс-бар, промежуточное сохранение | Планируется |
| C-F6 | **Onboarding** | Guided Onboarding (8 шагов: Theme → Project → Trust → Frameworks → Role → Industry → AI → Summary). `complior init` для ручной инициализации, auto-root-discovery для существующих проектов | Готов |

---

### 5.3 SDK

**Что это:** npm-библиотека (`@complior/sdk`). Proxy-обёртка для LLM-клиентов в production. Каждый API-вызов проходит через pipeline: pre-hooks → вызов LLM → post-hooks. Все проверки детерминистические (regex, правила). Опциональное подключение Guard API для семантики.

**Расположение:** `engine/sdk/` (пакет `@complior/sdk`)

```
┌──────────────────────────────── SDK ──────────────────────────────────────┐
│                                                                           │
│   const client = complior(openai, config)                                 │
│   const agent  = compliorAgent(openai, { passport, config })              │
│                                                                           │
│  ┌─────────────────────────── PIPELINE ────────────────────────────────┐  │
│  │                                                                     │  │
│  │   Запрос пользователя                                               │  │
│  │         │                                                           │  │
│  │         ▼                                                           │  │
│  │   ┌─────────────────── PRE-HOOKS ──────────────────────┐           │  │
│  │   │                                                     │           │  │
│  │   │  1. logger        → логирование запроса             │           │  │
│  │   │  2. prohibited    → блокировка ст. 5 (138 patterns) │           │  │
│  │   │  3. sanitize      → редакция PII (50+ типов)        │           │  │
│  │   │  4. disclosure    → добавление system message        │           │  │
│  │   │  5. permission*   → проверка tools allowlist/deny   │           │  │
│  │   │  6. rate-limit*   → скользящее окно (window/max)    │           │  │
│  │   │                                                     │           │  │
│  │   │  * = только compliorAgent()                         │           │  │
│  │   └──────────────────────┬──────────────────────────────┘           │  │
│  │                          │                                          │  │
│  │                          ▼                                          │  │
│  │                   ┌──────────────┐                                  │  │
│  │                   │  LLM API     │  OpenAI / Anthropic /            │  │
│  │                   │  (вызов)     │  Google / Vercel AI              │  │
│  │                   └──────┬───────┘                                  │  │
│  │                          │                                          │  │
│  │                          ▼                                          │  │
│  │   ┌─────────────────── POST-HOOKS ─────────────────────┐           │  │
│  │   │                                                     │           │  │
│  │   │  1. disclosure-verify → проверка disclosure (4 яз.) │           │  │
│  │   │  2. content-marking   → metadata AI-generated       │           │  │
│  │   │  3. escalation        → детекция эскалации          │           │  │
│  │   │  4. bias-check        → 15 protected characteristics│           │  │
│  │   │  5. headers           → compliance HTTP headers     │           │  │
│  │   │  6. budget*           → учёт расходов               │           │  │
│  │   │  7. action-log*       → callback аудита             │           │  │
│  │   │  8. circuit-breaker   → каскадная защита            │           │  │
│  │   │                                                     │           │  │
│  │   │  * = только compliorAgent()                         │           │  │
│  │   └─────────────────────────────────────────────────────┘           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────── PROVIDER ADAPTERS ─────────────────────────────────┐  │
│  │  OpenAI (chat.completions)  │  Anthropic (messages)               │  │
│  │  Google (generateContent)   │  Vercel AI (generateText)           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────── DOMAIN HOOKS (opt-in) ─────────────────────────────┐  │
│  │  HR: anonymization     │  Finance: audit logging                  │  │
│  │  Healthcare: de-ident. │  Education: content safety               │  │
│  │  Legal: disclaimers    │  Content: AI-GENERATED marker            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────── RUNTIME CONTROL (opt-in) ──────────────────────────┐  │
│  │  Safety Filter + HITL Gate    │  Compliance Proxy                 │  │
│  │  Disclosure Injector          │  Content Marker                   │  │
│  │  Interaction Logger           │  Permission Scanner               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| S-F1 | **Proxy Wrapper** | `complior(client)` / `compliorAgent(client, passport)`. JavaScript Proxy, перехватывает методы LLM-клиента | Готов |
| S-F2 | **Pre-hooks** | 6 production-ready хуков: logger, prohibited (138 patterns, 8 Art.5 categories, 6 languages), sanitize (50+ PII types, checksum validators), disclosure, permission, rate-limit | Готов |
| S-F3 | **Post-hooks** | 8 хуков: disclosure-verify (4 языка), content-marking, escalation, bias-check (15 EU Charter characteristics), headers (4 frameworks), budget, action-log, circuit-breaker | Готов |
| S-F4 | **Provider Adapters** | 4 провайдера: OpenAI, Anthropic, Google, Vercel AI. Автоопределение типа клиента | Готов |
| S-F5 | **Domain Hooks** | 6 доменов: HR, Finance, Healthcare, Education, Legal, Content | Готов |
| S-F6 | **Runtime Control** | Safety Filter + HITL Gate, Disclosure Injector, Content Marker, Interaction Logger, Compliance Proxy, Permission Scanner | Готов |
| S-F7 | **Guard Integration** | Opt-in подключение Guard API. Двухуровневая проверка: быстрый regex → семантика Guard | Планируется |

---

### 5.4 MCP Server

**Что это:** Model Context Protocol server. Compliance-инструменты для ИИ-агентов через stdio protocol.

**Расположение:** `engine/core/src/mcp/` (embedded в Engine)

| Tool | Тип | Назначение | Статус |
|------|-----|-----------|--------|
| `complior_scan` | Code | Сканирование проекта → score + findings | Готов |
| `complior_fix` | Code | Авто-фикс нарушения | Готов |
| `complior_score` | Code | Текущий compliance score | Готов |
| `complior_explain` | Code | Объяснение статьи/обязательства | Готов |
| `complior_passport` | Code | Получить/обновить Agent Passport | Готов |
| `complior_validate` | Code | Проверить passport completeness | Готов |
| `complior_deadline` | Code | Дедлайны и critical path | Готов |
| `complior_suggest` | Code | Рекомендация следующего действия | Готов |
| `complior_guard_check` | Guard | Проверка текста на prohibited/safe | Планируется |
| `complior_guard_pii` | Guard | Детекция PII в тексте | Планируется |
| `complior_guard_bias` | Guard | Проверка ответа на bias | Планируется |

Совместимые агенты: Claude Code, Cursor, Windsurf, OpenCode, Codex, Devin, aider.

---

### 5.5 Guard API

**Что это:** специализированная ML-модель, обученная на задачах compliance/security. Замена regex на семантическое понимание. 50-100ms на проверку, $0.0001 за вызов.

**Статус:** R&D Phase (отдельный трек, не в спринтовом цикле)

```
┌──────────────────────── GUARD API ─────────────────────────────────────┐
│                                                                        │
│  POST /guard/check { text, tasks: ["prohibited", "pii", "bias"] }      │
│                                                                        │
│  ┌─────────────── 5 ЗАДАЧ КЛАССИФИКАЦИИ ──────────────────────────┐   │
│  │  PROHIBITED (ст. 5)   → BLOCKED / SAFE + article    50ms      │   │
│  │  PII (GDPR)           → список PII + типы           50ms      │   │
│  │  BIAS (15 характ.)    → BIAS / SAFE + category      50ms      │   │
│  │  INJECTION (ISO 27090) → INJECTION / SAFE + type     50ms      │   │
│  │  ESCALATION (ст. 14)  → ESCALATION / SAFE           30ms      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Модель: Mistral 7B / Llama 3 8B, LoRA/QLoRA, INT4 quantization       │
│  Данные: ~40K examples (prohibited, PII, bias, injection, escalation)  │
│  Cloud: Hetzner GPU (Германия, EU data residency)                      │
│  Local: Docker image + Ollama (enterprise, 4GB RAM)                    │
│                                                                        │
│  Интеграция в SDK:                                                      │
│  Regex (0ms, free) → не уверен → Guard (50ms, $0.0001)                 │
│  80% отсекает regex, 20% обрабатывает Guard                            │
└────────────────────────────────────────────────────────────────────────┘
```

**R&D Timeline:** ~11 недель (параллельный трек с ML-инженером)
- Phase 1 (4 нед.): Data Collection — 40K+ examples
- Phase 2 (3 нед.): Fine-tune — LoRA training, evaluation
- Phase 3 (2 нед.): Deploy — Hetzner GPU, API gateway
- Phase 4 (2 нед.): Integration — SDK + MCP + SaaS

---

### 5.6 SaaS Dashboard

**Что это:** веб-платформа для управления compliance на уровне организации.

**Расположение:** отдельный репозиторий (`ai-act-compliance-platform`)

| # | Фича | Тариф | Статус |
|---|------|-------|--------|
| D-F1 | Fleet Dashboard (score, trends, cross-system map) | Starter+ | Частично |
| D-F2 | Passport Mode 3 Wizard (5-шаговое создание) | Growth+ | Частично |
| D-F3 | FRIA Wizard (шаблон + LLM-дозаполнение + PDF) | Starter+/Growth | Частично |
| D-F4 | Document Templates (15+ EU AI Act + ISO 42001) | Starter (3) / Growth (все) | Частично |
| D-F5 | Audit Package (ZIP: exec summary, passports, evidence) | Growth+ | Планируется |
| D-F6 | ISO 42001 Readiness (39 контролей, cert. score) | Growth+ | Планируется |
| D-F7 | Agent Registry (unified CLI + SaaS) | Starter+ | Частично |
| D-F8 | Reports (MD Starter / PDF branded Growth+) | Growth+ | Частично |
| D-F9 | Monitoring (drift, anomalies, real-time) | Enterprise | Планируется |
| D-F10 | Vendor Communication (Art. 25 шаблоны) | Growth+ | Планируется |
| D-F11 | Incident Management (Art. 73) | Enterprise | Планируется |
| D-F12 | EU Database Helper (Art. 49) | Enterprise | Планируется |

---

## 6. Стандарты: покрытие

### 6.1 EU AI Act (108 обязательств)

Текущее покрытие: ~50% автоматически, ~35% с шаблонами, ~15% manual.

| Статья | Обязательство | Продукт | Статус |
|--------|--------------|---------|--------|
| Ст. 4 | AI Literacy | Engine (L1) | Готово |
| Ст. 5 | Запрещённые практики | Engine + SDK (138 patterns) | Готово |
| Ст. 9 | Управление рисками | Engine (Doc) | Планируется |
| Ст. 10 | Данные и governance | Engine + SDK | Готово |
| Ст. 11-12 | Тех. документация, логи | Engine (Doc) | Готово |
| Ст. 14 | Human oversight | SDK (escalation, HITL Gate) | Готово |
| Ст. 26 | Обязанности deployer'а | Engine (Passport) | Готово |
| Ст. 27 | FRIA | Engine + SaaS | Готово |
| Ст. 49 | Регистрация EU DB | SaaS (D-F12) | Планируется |
| Ст. 50 | Прозрачность | SDK (disclosure, content marking) | Готово |
| Ст. 72 | Post-market monitoring | Engine (drift) | Готово |
| Ст. 73 | Инциденты | SaaS (D-F11) | Планируется |

### 6.2 ISO/IEC 42001 — Система управления ИИ

Первый сертифицируемый стандарт для управления ИИ. 10 разделов (Clauses 4-10) + 39 контролей (Annex A).

**Текущее покрытие: ~45-50%**

| Контроль | Требование | Продукт | Статус |
|----------|-----------|---------|--------|
| A.5.2-5.4 | Risk/Impact Assessment | Engine (FRIA) | Готово |
| A.6.2.3-6 | V&V, деплой, мониторинг | Engine (Scanner) | Готово |
| A.6.2.9 | Документация AI-систем | Engine (Passport) | Готово |
| A.6.2.10 | Запрещённое использование | Engine + SDK | Готово |
| A.6.2.11 | Third-party компоненты | Engine (SBOM) | Готово |
| A.7.6 | Происхождение данных | Engine (Evidence) | Готово |
| A.8.2 | Disclosure | SDK | Готово |
| A.9.5 | Human oversight | SDK (escalation) | Готово |
| Clause 6.1.3 | Statement of Applicability | Engine (Doc) | Планируется |
| A.2.2-2.3 | AI Policy | Engine (Doc) | Планируется |
| Clause 6.1.2 | Risk Register | Engine (Doc) | Планируется |

### 6.3 ISO/IEC 27090 — Безопасность ИИ

Guidance стандарт. 13 категорий угроз. **Текущее покрытие: ~15-20%**

| Угроза | Продукт | Статус |
|--------|---------|--------|
| Prompt Injection | Guard API (G-F4) | R&D |
| Supply Chain | Engine (SBOM) | Частично |
| Model Extraction | SDK (rate-limit) | Частично |
| AI-specific DoS | SDK (circuit-breaker) | Частично |

### 6.4 NIST AI RMF

Добровольный фреймворк. 4 функции, 19 категорий. **Текущее покрытие: ~35-40%**. Сильные: MEASURE (сканер, метрики). Слабые: GOVERN (политики), MAP (контекст).

> ISO 42001 + NIST AI RMF + EU AI Act = тройка, которая покрывает всё. Complior строит мост между ними.

---

## 7. Бизнес-модель

### 7.1 Доступ к LLM

| Вариант | Описание | Стоимость |
|---------|----------|-----------|
| **BYOK** | Свой API-ключ (OpenAI, Anthropic, OpenRouter, Ollama) | €0 (стоимость провайдера) |
| **Hosted LLM** | Mistral на Hetzner GPU (EU data residency) | Freemium: 50/мес free, €0.05/запрос |
| **Guard API** | Fine-tuned ML-модель для compliance/security | Freemium: 1000/мес free, $0.0001/call |

### 7.2 Open-source (бесплатно, воронка)

CLI + TUI + Engine + Scanner + Fixer + Passport + Evidence + SDK (все хуки, все провайдеры) + MCP Server (8 Code Tools) + BYOK LLM.

**CLI-Scanner — бесплатно, независимо от тарифа, навсегда.**

**Open-source boundary:** всё что deployer запускает локально и что кодифицирует публичный закон = open. Proprietary data, агрегация, SaaS workflows = closed.

### 7.3 SaaS тарифы

| Продукт | Модель | Цена |
|---------|--------|------|
| CLI + TUI + Engine | Open-source | €0 |
| SDK | Open-source | €0 |
| MCP Server | Open-source | €0 |
| SaaS **Starter** | До 3 KI-систем, базовый обзор, 1 отчёт/мес | €0 |
| SaaS **Growth** | Unlimited систем, полный аудит (FRIA, QMS, Conformity), 10 юзеров | €149/мес |
| SaaS **Enterprise** | Все Growth + SSO, Multi-Workspace, API-доступ, unlimited юзеров | €499/мес |
| Audit Package | One-time генерация + экспертиза | €2-5K |
| Guard API overage | При масштабе | $0.0001/call |

### 7.4 Воронка

```
CLI (free) → score → SaaS Starter → gaps →
  Growth (FRIA, Audit, ISO) → Enterprise (SSO, API, fleet)

SDK (free, BYOK) → MCP подключает строителей →
  агенты в production → Guard calls → SaaS для fleet management
```

---

## 8. Конкурентный анализ

| Конкурент | Тип | Для кого | Слабость |
|-----------|-----|----------|----------|
| Holistic AI | Enterprise SaaS | Юристы, GRC | Не для разработчиков, нет сканера кода |
| Credo AI | Enterprise SaaS | Risk/Compliance | Нет CLI, нет real-time |
| IBM OpenPages | Enterprise Suite | Large enterprise | Дорого, сложно, не для SMB |
| Lakera Guard | ML API | Security teams | Только runtime, нет compliance workflow |
| Arthur AI | MLOps SaaS | ML engineers | Нет EU AI Act specialization |
| A2A Agent Card | Google spec | Agent interop | Только identity, нет compliance |
| AGENTS.md | Community | Agent description | Нет compliance, нет scoring |
| NIST AI RMF | US government | Risk management | Framework, не tool |
| Excel/Google Sheets | Manual | Compliance officers | Устаревает мгновенно, нет связи с кодом |

### Уникальные differentiators

1. **Platform (3 levels)** — единственный tool с Development + Runtime + Management
2. **Daemon** — background file watching + real-time compliance (200ms gate)
3. **Agent Passport** — стандартизированный формат identity card AI-системы (36 полей, ed25519 signed)
4. **108 obligations** — полное покрытие EU AI Act, привязанное к конкретным фичам
5. **Multi-standard** — EU AI Act + ISO 42001 + ISO 27090 + NIST в одном инструменте
6. **Developer-first** — CLI/TUI/MCP, не web form для юристов
7. **Free tier** — полноценный daemon + TUI + CLI + SDK (не trial)
8. **7-step pipeline** — от discovery до certification
9. **Dual-product** — Free daemon (разработчик) + Paid dashboard (CTO/DPO)
10. **Guard API** — ML-модель для семантических проверок (regex → AI)
11. **Timing** — ~5 месяцев до enforcement, ноль конкурентов для разработчиков

---

## 9. Roadmap

### Фаза 1: SDK Hardening + Engine Core (S05) — **DONE**

SDK из «базового» → «production-ready». 30/34 US. 1691 тестов.

- SDK: Prohibited (138 patterns), Sanitize (50+ PII), Permission, Disclosure, Bias, HTTP Middleware
- Engine: Finding Explanations, Worker Notification, Passport Export, Agent Registry, Policy Templates
- Cert: AIUC-1 Readiness, Adversarial Test Runner, Compliance Cost Estimator
- Runtime: Permission Scanner, Safety Filter + HITL, Compliance Proxy, Disclosure Injector
- Multi: Multi-Agent Awareness, Compliance Debt/Simulation, Multi-Framework Scoring

### Фаза 2: FRIA + Templates + LLM (S06) — **IN PROGRESS**

Документы из «шаблонов» → «готовых к аудиту». LLM-powered дозаполнение.

- LLM Chat Service + TUI Chat (9th view) — **DONE**
- FRIA LLM-дозаполнение — планируется
- ISO 42001 документы (AI Policy, SoA, Risk Register) — планируется
- Wizard-заполнение документов в TUI — планируется
- MCP Compliance Proxy (Passport Mode 2) — планируется

### Фаза 3: Performance + Streaming (S07)

Сканер быстрее, SDK полностью streaming-capable.

- Incremental scan (hash-cache, mtime)
- SDK streaming support (post-hooks после stream end)
- ISO 27090 scanner rules (6 security checks)
- Guard API integration (SDK + MCP)

### Фаза 4: Polish + Integration (S08)

MCP Guard Tools + final polish.

- MCP Guard Tools (3 инструмента для самоконтроля агентов)
- Fix validation (post-apply score check)
- Compliance Diff в PR (CI/CD gate)
- TUI Onboarding refresh

### Guard API — R&D Phase (параллельный трек)

> Guard API не входит в спринтовый цикл. Это отдельный R&D-проект, ~11 недель.

---

## 10. Метрики успеха

### Выполнено (по состоянию на 13 марта 2026)

- [x] Daemon запускается (watcher + engine + MCP + HTTP)
- [x] TUI 9 pages подключается к daemon через HTTP/SSE
- [x] Agent Passport Mode 1 (auto): 57+ frameworks detected
- [x] Autonomy Level L1-L5 auto-rating
- [x] `agent init` → `agent-manifest.json` generated + ed25519 signed
- [x] MCP Server: 8 tools functional
- [x] FRIA Generator (80% pre-filled)
- [x] Worker Notification template
- [x] Passport Export (A2A, AIUC-1, NIST)
- [x] Adversarial Test Runner (5 categories)
- [x] Industry-Specific Scanner (4 domains)
- [x] SDK: 14 production-ready hooks
- [x] AIUC-1 Certification Readiness Score
- [x] LLM Chat Service + TUI Chat Page

### Осталось

- [ ] LLM-дозаполнение FRIA и документов
- [ ] ISO 42001 документы (AI Policy, SoA, Risk Register)
- [ ] MCP Compliance Proxy (Passport Mode 2)
- [ ] Guard API MVP (5 классификаторов)
- [ ] SDK streaming support

### 3-month targets

- 500 CLI Mode 1 passports generated
- 50 SaaS Mode 3 passports
- 1,000/week npm downloads

### 6-month targets

- 5,000 CLI passports
- 500 SaaS passports
- 50 organizations with both CLI + SaaS
- NIST AI Profile submission

---

## 11. EU Sovereign AI Strategy

Все данные и инфраструктура — EU:

| Компонент | Провайдер | Страна |
|-----------|----------|--------|
| Hosting | Hetzner | Германия |
| Auth (SaaS) | WorkOS | Managed (SCC) |
| LLM | Mistral | Франция |
| Email | Brevo | Франция |
| PDF | Gotenberg | Self-hosted (Hetzner) |
| Storage | Hetzner Object Storage | Германия |
| Analytics | Plausible | Эстония |
| Monitoring | Better Uptime | Литва |
| Guard API | Hetzner GPU | Германия |

---

**Обновлено:** 2026-03-13
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
