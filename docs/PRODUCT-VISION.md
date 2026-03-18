# PRODUCT-VISION.md — Complior: Платформа управления AI Compliance

**Версия:** 11.0.0
**Дата:** 2026-03-18
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

### Два режима платформы: Open-Source + Cloud

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          COMPLIOR PLATFORM                                │
│                                                                           │
│ ═══ OPEN-SOURCE (AGPLv3, free forever, offline, zero dependencies) ═══  │
│ Один Rust binary ~25MB + TypeScript Engine (npm)                         │
│                                                                           │
│ ┌────────────────────── DEVELOPMENT-TIME ──────────────────────────┐     │
│ │                                                                   │     │
│ │ ┌─────────── 1. ENGINE (TS daemon) ──────────────────────────┐   │     │
│ │ │ Scanner L1-L4 (наш код + Rust-native secret detection)     │   │     │
│ │ │ + `--deep`: auto-download Semgrep/Bandit/ModelScan via uv  │   │     │
│ │ │ Fixer (6→18 strategies: A1-A9, B1-B6, C1-C3, D1-D3)      │   │     │
│ │ │ Document Generator (14 EU AI Act templates)                 │   │     │
│ │ │ Passport Service (36 fields, ed25519)                       │   │     │
│ │ │ Evidence Chain (SHA-256 + ed25519, tamper-proof)            │   │     │
│ │ │ Obligation Mapper (108 EU AI Act + 39 ISO 42001)           │   │     │
│ │ │ HTTP API (Hono) + SSE + Agent Registry                      │   │     │
│ │ └────────────────────────────────────────────────────────────┘   │     │
│ │                                                                   │     │
│ │ ┌──────────────────┐    ┌────────────────────────────────────┐   │     │
│ │ │ 2. CLI / TUI     │    │ 3. MCP SERVER (stdio)             │   │     │
│ │ │ Rust binary      │    │ 8 Code Tools                      │   │     │
│ │ │ ratatui, 9 pages │    │ 3 Guard Tools (с Guard Service)   │   │     │
│ │ │ 30+ commands     │    │ Claude Code, Cursor, Windsurf     │   │     │
│ │ └──────────────────┘    └────────────────────────────────────┘   │     │
│ └───────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│ ┌────────────────────── RUNTIME ───────────────────────────────────┐     │
│ │ ┌────────────────────────────────────────────────────────────┐   │     │
│ │ │ 4. SDK (@complior/sdk, npm)                                │   │     │
│ │ │ Layer 1: Regex hooks (in-process, 0ms, offline)            │   │     │
│ │ │ 14 hooks: prohibited(138), sanitize(50+PII), disclosure,   │   │     │
│ │ │   permission, rate-limit, bias, escalation, budget, etc.   │   │     │
│ │ │ Provider adapters: OpenAI, Anthropic, Google, Vercel AI    │   │     │
│ │ └────────────────────────────────────────────────────────────┘   │     │
│ └───────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│ Coverage: 60-70% │ Dependencies: ZERO │ Works offline: YES               │
│                                                                           │
│ ═══ PAID CLOUD SERVICES (SaaS, наш Hetzner сервер EU) ════════════════  │
│                                                                           │
│ ┌────────────────────── RUNTIME (cloud) ───────────────────────────┐     │
│ │ ┌────────────────────────────────────────────────────────────┐   │     │
│ │ │ 5. GUARD SERVICE (guard.complior.dev)                      │   │     │
│ │ │ Один HTTP call от SDK → 4 модели параллельно:             │   │     │
│ │ │   PromptGuard 2 (Meta) — injection/jailbreak, 30ms       │   │     │
│ │ │   LLM Guard (Protect AI) — toxicity, 20ms                │   │     │
│ │ │   Presidio (Microsoft) — PII detection, 10ms             │   │     │
│ │ │   Guard API model (Qwen 2.5 7B) — 6 compliance tasks    │   │     │
│ │ │ Free: 500/мес │ Growth: 10K │ Enterprise: 100K           │   │     │
│ │ └────────────────────────────────────────────────────────────┘   │     │
│ └───────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│ ┌────────────────────── DEVELOPMENT-TIME (cloud) ──────────────────┐     │
│ │ ┌────────────────────────────────────────────────────────────┐   │     │
│ │ │ CLOUD SCAN ENRICHMENT (scan.complior.dev)                  │   │     │
│ │ │ Дополняет offline scan. Получает: findings + deps + snippets│  │     │
│ │ │   AI SBOM — dependency inventory + licenses + CVE         │   │     │
│ │ │   LLM L5 deep analysis — implicit compliance issues       │   │     │
│ │ │   Presidio — contextual PII в code snippets               │   │     │
│ │ │   Multi-framework — OWASP + MITRE + NIST scoring          │   │     │
│ │ │   Vendor assessment — AI provider Art. 25 check           │   │     │
│ │ │   PDF/DOCX export — audit-ready documents                 │   │     │
│ │ └────────────────────────────────────────────────────────────┘   │     │
│ └───────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│ ┌────────────────────── MANAGEMENT ────────────────────────────────┐     │
│ │ ┌────────────────────────────────────────────────────────────┐   │     │
│ │ │ 6. SAAS DASHBOARD (app.complior.dev)                       │   │     │
│ │ │ Fleet │ Passport │ FRIA │ Audit │ ISO 42001 │ Monitoring  │   │     │
│ │ │ Starter (€0) → Growth (€149/мес) → Enterprise (€499/мес) │   │     │
│ │ └────────────────────────────────────────────────────────────┘   │     │
│ └───────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│ ┌────────── OPTIONAL: LOCAL DEEP SCAN (uv auto-download) ─────────┐     │
│ │ `complior scan --deep` → first run downloads tools to ~/.complior│     │
│ │ Semgrep (AST rules) + Bandit (Python) + ModelScan (model files) │     │
│ │ Free, open-source, ~150MB one-time download                      │     │
│ └───────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│ ┌────────── EU SOVEREIGN INFRA ────────────────────────────────────┐     │
│ │ Hetzner (DE) │ Mistral (FR) │ Brevo (FR) │ Plausible (EE)       │     │
│ └───────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Продукты по уровням

| Уровень | Продукт | Тип | Где | Статус | Назначение |
|---------|---------|-----|-----|--------|------------|
| **Development** | Engine | TS daemon | Open-source | Готов | Ядро: сканер, фиксы, документы, паспорта |
| **Development** | CLI/TUI | Rust binary | Open-source | Готов | Терминальный интерфейс + headless команды |
| **Development** | MCP Server | Protocol | Open-source | Готов | Интерфейс для ИИ-агентов |
| **Development** | Deep Scan Tools | uv auto-download | Open-source | Планируется | Semgrep + Bandit + ModelScan (~150MB) |
| **Development** | Cloud Scan | scan.complior.dev | Cloud (paid) | Планируется | LLM L5 + SBOM + multi-framework |
| **Runtime** | SDK | npm library | Open-source | Готов | Обёртка LLM-вызовов в production |
| **Runtime** | Guard Service | guard.complior.dev | Cloud (paid) | R&D Phase | 4 ML-модели: injection, PII, toxicity, compliance |
| **Management** | SaaS Dashboard | Web app | Cloud (paid) | Отдельный репо | Аудит, сертификация, fleet management |

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

### 4.7 Сканирование и тестирование (Scan + Eval)

**Три типа проверок:**

| Команда | Что делает | Когда |
|---------|-----------|-------|
| `complior scan` | Статический анализ кода (L1-L5) | Development-time |
| `complior eval` | Динамическое тестирование AI-системы (550 тестов) | Pre-deploy |
| `complior monitor` | Runtime мониторинг (drift, anomalies) | Production |

**Scan Tiers (комбинируемые флаги):**

```
Tier 1: OFFLINE SCAN (free, zero install, 2-5 сек)
  `complior scan` — наш код L1-L4, Rust-native secret detection
  Coverage: 60-70% │ Dependencies: НОЛЬ

Tier 1+: OFFLINE + LLM (BYOK, +5-15 сек)
  `complior scan --llm` — Tier 1 + L5 LLM deep analysis (BYOK key)
  Coverage: 70-80% │ Dependencies: только API key

Tier 2: DEEP LOCAL SCAN (free, auto-download ~150MB, 10-30 сек)
  `complior scan --deep` — Tier 1 + Semgrep + Bandit + ModelScan via uv
  Coverage: 80-85% │ Dependencies: auto-managed в ~/.complior/tools/

Tier 2+: DEEP + LLM (комбинация)
  `complior scan --deep --llm` — полный offline набор
  Coverage: 85-90%

Tier 3: CLOUD ENRICHMENT (Month 3-4+, cloud free: 5/мес)
  `complior scan --cloud` — Tier 2+ + AI SBOM + Presidio PII +
  Vendor assessment + PDF/DOCX export
  Coverage: 90-95% │ Sends: findings + deps + snippets (NOT full code)

Tier 3+: FULL CLOUD
  `complior scan --cloud --llm` — hosted LLM вместо BYOK
  Coverage: 95% │ Hosted Mistral (EU data residency)
```

**Eval (динамическое тестирование):**

```
complior eval --target <url>     # 550 тестов: 250 conformity + 300 security
complior eval --target <url> --basic  # только детерминистические (118 тестов)
complior eval --target <url> --llm    # + LLM-judged (132 теста, BYOK)
complior eval --target <url> --full   # full + red team (550 тестов)
```

### 4.8 Launch Strategy: три фазы

**Месяц 1 (pure open-source):** Всё бесплатно, всё offline. Никаких облаков, аккаунтов, лимитов. Установил → работает.
- Scan Tier 1-2+ (offline + BYOK LLM)
- Eval (basic + BYOK LLM)
- Fix, SDK Layer 1, CLI/TUI, MCP (8 tools)
- Documents (14 шаблонов), Passport, Evidence Chain
- Red Team (OWASP/MITRE, 300+ probes), Import (Promptfoo)
- Dual scoring (compliance + security), multi-framework

**Месяц 3-4 (cloud services):** Добавляются облачные сервисы с бесплатными лимитами. Аккаунт не обязателен для offline.
- Guard Service: 500 calls/мес free
- Hosted LLM: 50 calls/мес free (Mistral, EU data residency)
- Cloud Scan: 5 scans/мес free
- SaaS Dashboard: 3 AI-системы free
- SDK Layer 2 (Guard integration)

**Месяц 7+ (paid tiers):** Free tier без изменений. Платные тарифы для масштаба.
- Growth €149/мес: 10K Guard + 500 LLM + unlimited cloud scan + 10 users
- Enterprise €499/мес: 100K Guard + 5K LLM + self-hosted Guard Docker + SSO + API

**6 триггеров конверсии Cloud Free → Growth:**
1. Guard лимит (500/мес) → prompt: «Upgrade to Growth for 10K calls»
2. Hosted LLM лимит (50/мес) → prompt: «Upgrade or use BYOK»
3. Cloud Scan лимит (5/мес) → prompt: «Upgrade for unlimited cloud scans»
4. PDF для аудитора → prompt: «Upgrade for branded PDF/DOCX export»
5. Vendor assessment → prompt: «Upgrade for Art. 25 vendor scoring»
6. Dashboard team → prompt: «Upgrade for team access (10 users)»

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
| E-F1 | **Scanner** | 6 тиров (1/1+/2/2+/3/3+): Offline (L1-L4), +LLM (L5 BYOK), +Deep (Semgrep/Bandit/ModelScan via uv), +Cloud (SBOM/PII/vendor). Score 0-100. Industry patterns. Multi-framework scoring (EU AI Act + AIUC-1 + OWASP + MITRE). Security scoring (OWASP LLM Top 10 + MITRE ATLAS, 300+ probes) | Tier 1/1+ готов, Tier 2-3 планируется |
| E-F2 | **Fixer** | 18 стратегий: A (код, 9): SDK wrapper, validation, error handling, disclosure, logging, permission guard, HITL gate, config hardening, unsafe deser. B (документы, 6): FRIA, AI Policy, Risk Plan, Tech Docs, Worker Notif, Transparency. C (deps, 3): CVE upgrade, license, model format. D (config, 3): secret rotation, gitignore, Docker security. E (passport, 3): risk level, compliance fields, evidence chain. + Undo | Частично |
| E-F3 | **Document Generator** | 14 шаблонов EU AI Act. Автозаполнение из паспорта (25-70%). Worker Notification (Art.26(7)). Policy Templates (5 industries) | Готов |
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

# Security Testing
complior redteam run <agent>   # red team (300+ OWASP/MITRE probes)
complior import promptfoo      # import Promptfoo JSON results

# Eval (динамическое тестирование, планируется)
complior eval --target <url>   # 550 тестов: conformity + security
complior eval --basic          # только детерминистические (118)
complior eval --llm            # + LLM-judged (BYOK)
complior eval --full           # full + red team (550)

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

### 5.5 Guard Service

**Что это:** облачный сервис защиты AI-систем в runtime (guard.complior.dev). 4 ML-модели работают параллельно — один HTTP call от SDK, ответ за <100ms. Пользователь ничего не устанавливает.

**Статус:** R&D Phase (отдельный трек, не в спринтовом цикле)

```
┌──────────────────────── GUARD SERVICE ─────────────────────────────────┐
│                                                                        │
│  POST /guard/check { text, tasks: ["prohibited", "pii", "bias"] }      │
│                                                                        │
│  ┌─────────────── 4 МОДЕЛИ ПАРАЛЛЕЛЬНО ───────────────────────────┐   │
│  │                                                                 │   │
│  │  PromptGuard 2 (Meta, 86M params)           30ms               │   │
│  │    → Injection/jailbreak detection (SOTA)                      │   │
│  │    → Заменяет наш fine-tune для этих 2 задач                   │   │
│  │                                                                 │   │
│  │  LLM Guard (Protect AI)                     20ms               │   │
│  │    → Toxicity, ban topics, malicious URLs                      │   │
│  │                                                                 │   │
│  │  Presidio (Microsoft)                       10ms               │   │
│  │    → 50+ EU PII types, anonymization, multilingual             │   │
│  │    → IBAN, Steuernummer, BSN, NIR, PESEL                      │   │
│  │                                                                 │   │
│  │  Guard API model (Qwen 2.5 7B, fine-tuned)  100ms             │   │
│  │    → 6 задач: prohibited, PII context, bias,                  │   │
│  │      escalation, content_safety, exfiltration                  │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Training data: Promptfoo (~5K attacks) + Garak (~3K NVIDIA probes)    │
│  Cloud: Hetzner GPU (Германия, EU data residency)                      │
│  Enterprise: Docker image для self-hosted (GPU клиента)                │
│                                                                        │
│  Интеграция в SDK:                                                      │
│  SDK Layer 1: Regex (0ms, free, unlimited) →                           │
│  SDK Layer 2: Guard Service (<100ms, cloud, metered)                   │
│  80% отсекает regex, 20% обрабатывает Guard                            │
│                                                                        │
│  Тарифы:                                                                │
│  Free: 500 calls/мес │ Growth: 10K │ Enterprise: 100K                  │
│  Launch: beta, 500/мес free, «higher limits coming soon»               │
└────────────────────────────────────────────────────────────────────────┘
```

**R&D Timeline:** ~11 недель (параллельный трек с ML-инженером)
- Phase 1 (4 нед.): Data Collection — Promptfoo + Garak extraction → 40K+ examples
- Phase 2 (3 нед.): Fine-tune — LoRA training, evaluation, PromptGuard 2 integration
- Phase 3 (2 нед.): Deploy — Hetzner GPU, 4 models in Docker, API gateway
- Phase 4 (2 нед.): Integration — SDK + MCP + SaaS

---

### 5.6 SaaS Dashboard

**Что это:** веб-платформа для управления compliance на уровне организации.

**Расположение:** отдельный репозиторий (`ai-act-compliance-platform`)

| # | Фича | Тариф | Фаза | Статус |
|---|------|-------|------|--------|
| D-F1 | Fleet Dashboard (score, trends, cross-system map) | Cloud Free (3 systems) / Growth (unlimited) | Month 3-4 | Частично |
| D-F2 | Passport Mode 3 Wizard (5-шаговое создание) | Growth+ | Month 3-4 | Частично |
| D-F3 | FRIA Wizard (шаблон + LLM-дозаполнение + PDF) | Cloud Free / Growth | Month 3-4 | Частично |
| D-F4 | Document Templates (15+ EU AI Act + ISO 42001) | Cloud Free (3) / Growth (все) | Month 3-4 | Частично |
| D-F5 | Audit Package (ZIP: exec summary, passports, evidence) | Growth+ | Month 7+ | Планируется |
| D-F6 | ISO 42001 Readiness (39 контролей, cert. score) | Growth+ | Month 7+ | Планируется |
| D-F7 | Agent Registry (unified CLI + SaaS) | Cloud Free+ | Month 3-4 | Частично |
| D-F8 | Reports (MD Free / PDF branded Growth+) | Growth+ | Month 7+ | Частично |
| D-F9 | Monitoring (drift, anomalies, real-time) | Enterprise | Month 7+ | Планируется |
| D-F10 | Vendor Communication (Art. 25 шаблоны) | Growth+ | Month 7+ | Планируется |
| D-F11 | Incident Management (Art. 73) | Enterprise | Month 7+ | Планируется |
| D-F12 | EU Database Helper (Art. 49) | Enterprise | Month 7+ | Планируется |

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

### 7.3 Тарифы (три фазы)

**Месяц 1 — Pure Open-Source (€0 навсегда):**

| Продукт | Что включено |
|---------|-------------|
| CLI + TUI + Engine | Scan (L1-L5), Eval (basic+BYOK), Fix, Documents, Passport, Evidence |
| SDK Layer 1 | 14 hooks (prohibited, sanitize, disclosure, bias, etc.), 4 providers |
| MCP Server | 8 Code Tools |
| Red Team + Import | OWASP/MITRE scoring, 300+ probes, Promptfoo import |

**Месяц 3-4 — Cloud Services (free tier + paid):**

| Тариф | Guard | Hosted LLM | Cloud Scan | Dashboard | Цена |
|-------|-------|-----------|-----------|-----------|------|
| **Cloud Free** | 500/мес | 50/мес | 5/мес | 3 AI-системы | €0 |
| **Growth** | 10K/мес | 500/мес | Unlimited | Unlimited + 10 users | €149/мес |
| **Enterprise** | 100K/мес | 5K/мес | Unlimited | Unlimited + SSO + API | €499/мес |

**Месяц 7+ — дополнительно:**

| Продукт | Модель | Цена |
|---------|--------|------|
| Audit Package | One-time генерация + экспертиза | €2-5K |
| Guard API overage | При масштабе | $0.0001/call |
| Self-hosted Guard | Docker image (Enterprise) | Включено |

### 7.4 Воронка

```
Month 1:  CLI (free) → scan → score 45% → "нужно больше" →
Month 3-4: Cloud Free (500 Guard, 5 cloud scans) → лимиты →
Month 7+:  Growth €149 (10K Guard, unlimited) → Enterprise €499 (SSO, fleet)

Month 1:  SDK (free, BYOK) → regex hooks → production →
Month 3-4: Guard Service (500/мес) → semantic checks → лимит →
Month 7+:  Growth (10K/мес) → масштаб → Enterprise (100K + self-hosted)
```

**Unit economics (оценка):**
- Cloud Free user: ~$0.20/мес (Guard inference + storage)
- Growth margin: ~87% (€149 - ~€20 infra)
- Enterprise margin: ~87% (€499 - ~€65 infra)
- Break-even: 20 Growth customers

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

## 9. Внешние модули

17 open-source проектов интегрируются на 5 уровнях:

| # | Модуль | Метод | Где живёт | Зависимость пользователя | Фаза |
|---|--------|-------|-----------|--------------------------|------|
| | **EMBED (наш код, zero dependency)** | | | | |
| 1 | Promptfoo scoring (OWASP/MITRE/NIST) | Embed | Engine (static TS data) | НУЛЕВАЯ | Month 1 ✅ |
| 2 | Promptfoo + Garak attack probes | Embed | Engine (300+ probes) | НУЛЕВАЯ | Month 1 ✅ |
| 3 | Instructor | npm dep | Engine | Автоматически | Month 1 |
| 4 | CycloneDX JS | npm dep | Engine | Автоматически | Month 1 |
| | **UV AUTO-DOWNLOAD (`--deep`)** | | | | |
| 5 | Semgrep | uv wrap | ~/.complior/tools/ | auto-download | Month 1 |
| 6 | Bandit | uv wrap | ~/.complior/tools/ | auto-download | Month 1 |
| 7 | ModelScan | uv wrap | ~/.complior/tools/ | auto-download | Month 1 |
| | **GUARD SERVICE (наш сервер, Month 3-4)** | | | | |
| 8 | PromptGuard 2 (Meta) | Server | Guard Docker | НУЛЕВАЯ | Month 3-4 |
| 9 | LLM Guard (Protect AI) | Server | Guard Docker | НУЛЕВАЯ | Month 3-4 |
| 10 | Presidio (Microsoft) | Server | Guard Docker | НУЛЕВАЯ | Month 3-4 |
| 11 | Guard API model (Qwen 2.5 7B) | Server | Guard Docker | НУЛЕВАЯ | Month 3-4 |
| 12 | Mistral (Hosted LLM) | Server | Hetzner GPU | НУЛЕВАЯ | Month 3-4 |
| | **OPTIONAL SERVICES** | | | | |
| 13 | Langfuse | Call | SDK peer dep | `npm install langfuse` | Month 1 |
| 14 | WeasyPrint | Wrap | Cloud Scan | НУЛЕВАЯ | Month 3-4 |
| 15 | Evidently | Call | SaaS Dashboard | НУЛЕВАЯ | Month 7+ |

**Принцип:** если ВСЕ внешние модули отключены → всё работает (coverage 60-70%). С модулями → 90-95%.

---

## 10. Roadmap (по фазам запуска)

### Месяц 1: Pure Open-Source (всё offline, zero cloud)

**Цель:** Установил → работает. Никаких аккаунтов, облаков, лимитов.

**Уже готово (S01-S06 partial, S08/S09 partial, S10 Phase A):**
- SDK production: 14 hooks (prohibited 138, sanitize 50+ PII, disclosure, bias, etc.) — **DONE**
- Engine: Scanner L1-L5, Fixer (6 стратегий), 14 документов, Passport (36 полей, ed25519) — **DONE**
- CLI/TUI: 9 views, 30+ commands, daemon management — **DONE**
- MCP Server: 8 Code Tools — **DONE**
- AIUC-1 Readiness, Adversarial Test Runner, Compliance Diff — **DONE**
- Scanner Intelligence: import graph (45 AI pkgs), multi-lang, git history — **DONE**
- Security scoring: OWASP LLM Top 10 + MITRE ATLAS, `complior redteam`, `complior import promptfoo` — **DONE**
- Dual scoring (compliance + security), multi-framework (EU AI Act + AIUC-1 + OWASP + MITRE) — **DONE**
- LLM Chat Service + TUI Chat (9th view) — **DONE**
- Evidence Chain (SHA-256 + ed25519, tamper-proof) — **DONE**

**Осталось для Month 1 launch:**
- `complior scan --deep` — uv auto-download Semgrep/Bandit/ModelScan (S10 Phase B)
- `complior eval --target <url>` — динамическое тестирование AI-систем (S11-EVAL)
- ISO 42001 документы (AI Policy, SoA, Risk Register) — S06 remaining
- FRIA LLM-дозаполнение (BYOK) — S06 remaining
- Incremental scan (hash-cache, mtime, 10-50x speedup) — S07
- MCP Compliance Proxy (Passport Mode 2) — S06 remaining

### Месяц 3-4: Cloud Services (free tiers)

**Цель:** Облачные сервисы с бесплатными лимитами. Аккаунт не обязателен для offline.

- Guard Service beta: PromptGuard 2 + LLM Guard + Presidio + Guard API model (500/мес free) — GUARD R&D
- Hosted LLM: Mistral на Hetzner GPU (50/мес free) — инфра
- Cloud Scan: AI SBOM + Presidio PII + Vendor assessment + PDF export (5/мес free) — S10 Phase C
- SaaS Dashboard: Fleet, Passport Wizard, FRIA, Documents (3 AI-системы free) — SaaS S9
- SDK Layer 2: Guard API integration, two-level check (regex → Guard) — S07/GUARD

### Месяц 7+: Paid Tiers (масштаб)

**Цель:** Free tier без изменений. Платные для масштаба.

- Growth €149: 10K Guard + 500 LLM + unlimited cloud + 10 users
- Enterprise €499: 100K Guard + 5K LLM + self-hosted Guard Docker + SSO + API
- Advanced eval: `complior eval --full` (550 тестов, LLM-judged)
- `complior audit` (full compliance package, cloud)
- `complior monitor` (runtime мониторинг, drift, anomalies)
- Training data scan (`--data`, Art. 10)
- API endpoint check (`--endpoint`, Art. 15/50)

### Очерёдность спринтов

```
MONTH 1 — PURE OPEN-SOURCE
──────────────────────────────────────────────────────────────────
S05  ████████████████████  SDK+Agent+Cert+Runtime+Multi   ✅ DONE (30/34 US)
S06  ████░░░░░░░░░░░░░░░░  Chat+UX+Onboarding partial    🔵 5/30 DONE
S08/S09 ████░░░░░░░░░░░░░  Scanner Intelligence partial   🔵 5 US DONE
S10-A ██████████████████░░  OWASP/MITRE/Redteam/Import    🔵 Phase A DONE
─── remaining for Month 1: ───
S06  ░░░░░░░░░░░░░░░░░░░░  ISO 42001 docs, FRIA LLM, MCP Proxy (25 US)
S07  ░░░░░░░░░░░░░░░░░░░░  Incremental scan, streaming, domain hooks (21 US)
S10-B ░░░░░░░░░░░░░░░░░░░  uv tools (Semgrep/Bandit/ModelScan), scan tiers
S11-EVAL ░░░░░░░░░░░░░░░░  `complior eval` (conformity + security testing)

MONTH 3-4 — CLOUD SERVICES
──────────────────────────────────────────────────────────────────
GUARD ░░░░░░░░░░░░░░░░░░░  Guard API R&D (~11 weeks, parallel track)
S10-C ░░░░░░░░░░░░░░░░░░░  Cloud Scan API, vendor assessment, PDF
S08  ░░░░░░░░░░░░░░░░░░░░  Polish, MCP Guard, onboarding wizard
SaaS-S9 ░░░░░░░░░░░░░░░░░  Registry, Documents, EU DB Helper

MONTH 7+ — PAID
──────────────────────────────────────────────────────────────────
SaaS-S10 ░░░░░░░░░░░░░░░░  Incidents, Monitoring, Enterprise, i18n
```

### Guard Service — R&D Phase (параллельный трек)

> Guard Service не входит в спринтовый цикл. Это отдельный R&D-проект, ~11 недель. Запуск → Month 3-4.

---

## 11. Метрики успеха

### Выполнено (по состоянию на 18 марта 2026)

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
- [x] Scanner Intelligence: import graph (45 AI pkgs), multi-lang (Go/Rust/Java), git history
- [x] Security scoring: OWASP LLM Top 10 + MITRE ATLAS frameworks
- [x] `complior redteam` (300+ probes, OWASP/MITRE mapping)
- [x] `complior import promptfoo` (external red-team results)
- [x] Dual scoring output (compliance + security)
- [x] Multi-framework scoring (EU AI Act + AIUC-1 + OWASP + MITRE)

### Осталось для Month 1 launch

- [ ] `complior scan --deep` (uv auto-download Semgrep/Bandit/ModelScan)
- [ ] `complior eval --target <url>` (динамическое тестирование)
- [ ] ISO 42001 документы (AI Policy, SoA, Risk Register)
- [ ] LLM-дозаполнение FRIA и документов
- [ ] MCP Compliance Proxy (Passport Mode 2)
- [ ] Incremental scan (hash-cache, mtime)

### Осталось для Month 3-4

- [ ] Guard API MVP (5 классификаторов)
- [ ] Cloud Scan API (SBOM, Presidio, vendor assessment)
- [ ] SDK Layer 2 (Guard integration)
- [ ] SaaS Dashboard (Fleet, FRIA wizard, documents)

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

## 12. EU Sovereign AI Strategy

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

**Обновлено:** 2026-03-18
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
