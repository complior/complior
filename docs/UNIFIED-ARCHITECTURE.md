# UNIFIED-ARCHITECTURE.md — Единая архитектура Complior v8 CLI + SaaS

**Версия:** 2.0.0
**Дата:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено

---

## 1. Обзор

Complior — двухкомпонентная платформа AI compliance:

| Компонент | Репозиторий | Назначение | Стек | Лицензия |
|-----------|------------|-----------|------|----------|
| **CLI v8** (Daemon + TUI + CLI) | `complior` | Developer compliance tool | Rust (TUI) + TypeScript (Engine) | MIT |
| **SaaS v6** (Dashboard) | `ai-act-compliance-platform` | Deployer compliance platform | Node.js/Fastify + Next.js | Proprietary |

### Кто для кого

| Продукт | Пользователь | Проблема | Решение |
|---------|-------------|---------|---------|
| **CLI** | Разработчик | "Мой код не compliance-ready" | Daemon scan, auto-fix, passport auto-generation |
| **SaaS** | DPO/CTO | "У нас 7 AI-систем, регулятор через 5 мес, нет реестра" | Dashboard, registry всех AI-систем, FRIA, Audit Package |

### Воронка конверсии

```
Разработчик → npx complior → scan → score 72 → fix → 85 → passport generated
       │
       │  "Нужен реестр ВСЕХ AI-систем организации"
       │  "Нужен FRIA для high-risk систем"
       │  "Нужен Audit Package для регулятора"
       ▼
CTO/DPO → app.complior.eu → Dashboard → €49-399/мес
```

---

## 2. Схема архитектуры

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPLIOR ECOSYSTEM                              │
│                                                                        │
│  ┌─ CLI v8 (complior repo, MIT) ──────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  DAEMON (background process)                              │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │   │
│  │  │  │File      │  │TS Engine │  │MCP Server│  │HTTP API │ │   │   │
│  │  │  │Watcher   │  │(Hono)    │  │(stdio)   │  │(local)  │ │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │       ▲ HTTP/SSE       ▲ MCP           ▲ HTTP                   │   │
│  │  ┌────┴────┐   ┌──────┴──────┐   ┌────┴──────┐                 │   │
│  │  │TUI      │   │Agents       │   │CLI        │                 │   │
│  │  │(Rust)   │   │(independent)│   │(commands) │                 │   │
│  │  └─────────┘   └─────────────┘   └───────────┘                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│           │                                                             │
│           │ Passport sync (HTTP POST)                                   │
│           │ Telemetry (opt-in, paid)                                    │
│           ▼                                                             │
│  ┌─ SaaS v6 (ai-act-compliance-platform repo, Proprietary) ────────┐  │
│  │                                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │  │
│  │  │ FASTIFY API  │  │ NEXT.JS 14   │  │ POSTGRESQL       │       │  │
│  │  │              │  │ (Dashboard)  │  │ (30+ tables)     │       │  │
│  │  │ F39 Agent    │  │              │  │                  │       │  │
│  │  │   Registry   │  │ Passport     │  │ Users, Orgs      │       │  │
│  │  │ F19 FRIA     │  │   Views      │  │ AI Systems       │       │  │
│  │  │ F42 Audit    │  │ FRIA Wizard  │  │ Passports        │       │  │
│  │  │   Package    │  │ Timeline     │  │ Evidence         │       │  │
│  │  │ F38 AI       │  │ Audit View   │  │ FRIA docs        │       │  │
│  │  │   Registry   │  │              │  │ AI Registry      │       │  │
│  │  └──────────────┘  └──────────────┘  │  (5,011+ tools)  │       │  │
│  │                                       └──────────────────┘       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Agent Passport как мост между CLI и SaaS

Agent Passport — центральная сущность, соединяющая оба продукта:

| Аспект | CLI (Mode 1: Auto) | SaaS (Mode 3: Manual) |
|--------|--------------------|-----------------------|
| Создание | AST analysis → auto-fill 85-95% | 5-step wizard + AI Registry pre-fill |
| Код доступен | Да — анализирует source code | Нет — для vendor AI systems |
| Целевой пользователь | Разработчик | DPO/Compliance Officer |
| Результат | .complior/agents/*-manifest.json | DB record + JSON export |
| Верификация | Ed25519 signed + code evidence | Manual attestation |
| Пример | "Наш customer-support-agent на LangChain" | "Notion AI, используем для docs" |

### Passport Flow: CLI → SaaS

```
CLI (Mode 1):
  1. `complior agent:init` → discovers 3 agents in code
  2. AST → auto-fill → wizard → signed manifest
  3. Saved: .complior/agents/customer-support-manifest.json

Sync:
  4. CLI → POST /v1/agents → SaaS API (with API key)
  5. SaaS validates signature → stores in DB

SaaS (F39 Agent Control Plane):
  6. Dashboard shows unified view:
     ├─ 3 agents from CLI (auto-generated, code-verified)
     ├─ 4 agents from SaaS wizard (manually entered, vendor AI)
     └─ Total: 7 AI systems, 5 high-risk, completeness 72%
```

### Passport Flow: SaaS → CLI

```
SaaS (Mode 3):
  1. DPO adds vendor system via wizard (Intercom AI)
  2. Pre-filled from AI Registry (4,983 tools)
  3. Stored in SaaS DB

Sync (bidirectional):
  4. CLI → GET /v1/agents → downloads SaaS passports
  5. CLI validates and displays in TUI Passport page
  6. Unified view: own agents + vendor systems
```

---

## 4. Shared Components

### Regulation Data
| Компонент | CLI | SaaS | Формат |
|-----------|-----|------|--------|
| EU AI Act obligations (108) | Local JSON (`engine/core/src/data/`) | PostgreSQL (regulation_items table) | Shared schema |
| Scoring rules | Local JSON | DB-backed | Shared formula |
| AI Registry | API call (5,011+ tools) | PostgreSQL (ai_tools table) | REST API |

### Agent Passport Format
Единый JSON Schema: `https://complior.ai/schemas/agent-manifest/v1.json`
- CLI генерирует → SaaS принимает
- SaaS генерирует → CLI импортирует
- 36 полей, ed25519 signed, version-tracked

### Scoring Engine
- Одна и та же формула scoring (weighted checks) в обоих продуктах
- CLI: TypeScript `score-calculator.ts`
- SaaS: TypeScript (shared library planned, currently duplicated)

---

## 5. Кросс-проектные зависимости

| CLI Feature | SaaS Feature | Интеграция |
|-------------|-------------|-----------|
| **C.S01** Agent Passport (Mode 1: Auto) | **F39** Agent Control Plane | CLI passports → SaaS unified registry |
| **C.S01** Agent Passport (Mode 2: Semi-Auto) | — | Runtime observation (MCP Proxy) |
| — | **F46** Passport Mode 3 Wizard | SaaS-only, manual entry |
| **C.040** AI Registry (API client) | **F38** Public AI Risk Registry | SaaS provides API, CLI consumes |
| **C.D01** FRIA Generator | **F19** FRIA SaaS | Same template, different UI |
| **C.R20** Evidence Chain | **F42** Audit Package | CLI evidence → SaaS audit ZIP |
| **C.T01** Cert Readiness | **F40** Cert Readiness Dashboard | CLI checks → SaaS visualization |
| **C.S08** Passport Export Hub | **F47** EU Database Helper | Export formats: A2A, AIUC-1, NIST |
| Daemon HTTP API | SaaS Agent sync | `POST /v1/agents` (passport upload) |
| CLI scan results | SaaS Monitoring | Telemetry API (opt-in, paid) |

---

## 6. Data Flow: CLI → SaaS

### Passport Upload
```
CLI daemon                           SaaS API
──────────                           ──────────
POST /v1/agents                ────► Validate signature
  Body: {passport, signature}        Store in DB
                               ◄──── 201 Created {id}
```

### Telemetry (Paid, Opt-in)
```
CLI daemon                           SaaS API
──────────                           ──────────
POST /v1/telemetry/scan        ────► Aggregate → org-wide
  Body: {nodeId, projectHash,        Cross-System Map
         score, agentCount}          Dashboard visualization
```

### AI Registry (SaaS → CLI)
```
CLI daemon                           SaaS API
──────────                           ──────────
GET /v1/registry/tools         ◄──── 5,011+ AI tools
  Query: ?risk_level=high            Risk profiles
                                     Vendor data (pre-fill for passport)
```

**Privacy:** SHA-256 hashing, no PII, no file names, no code. Only: nodeId, projectHash, score, checksCount, agentCount, version.

---

## 7. Раздельный Development

| Аспект | CLI (complior) | SaaS (ai-act-compliance-platform) |
|--------|---------------|-----------------------------------|
| **Лицензия** | MIT (open-source) | Proprietary |
| **Репозиторий** | github.com/complior/complior | github.com/complior/ai-act-compliance-platform |
| **Стек** | Rust (TUI) + TypeScript (Engine) | Node.js/Fastify + Next.js 14 + PostgreSQL |
| **Деплой** | npm + binary (5 platforms) | Hetzner (EU sovereign) |
| **Тесты** | cargo test (307) + vitest (439) + sdk (9) | Vitest + Playwright |
| **CI/CD** | GitHub Actions (multi-platform release) | GitHub Actions → Hetzner |
| **API контракт** | Consumes SaaS API | Provides API for CLI |
| **Релиз цикл** | Независимый (semver) | Независимый (continuous) |

### Правила взаимодействия

1. **Никогда не модифицировать SaaS из CLI repo** — и наоборот
2. **API контракт** — любые изменения API SaaS обсуждаются в обоих repo
3. **Passport Schema** — единая версионированная JSON Schema, обновляется координированно
4. **Scoring** — дублирован (планируется shared library), изменения синхронизируются
5. **Регуляции** — CLI: local JSON snapshot; SaaS: DB (source of truth); периодическая синхронизация

---

## 8. Тарифная интеграция

| Тариф | CLI Features | SaaS Features | AI Registry |
|-------|-------------|---------------|------------|
| **Free** (€0) | Full daemon + TUI + CLI + MCP | — | 200 tools (offline) |
| **Starter** (€49) | Full | Basic Dashboard | 5,011+ (API) |
| **Growth** (€149) | Full | Full Dashboard + FRIA + F39 | 5,011+ |
| **Scale** (€399) | Full | Full + Audit Package (F42) | Unlimited |
| **Enterprise** | Full | Full + SSO + custom | Unlimited |

**Key monetization:** Audit Package (F42) = €2-5K one-time value. Packages all passports, evidence, FRIA into regulator-ready ZIP.

---

## 9. Open-Source Boundary

**Принцип:** Open-source = всё что deployer запускает локально и что кодифицирует публичный закон. Proprietary = данные, агрегация, SaaS workflows, revenue features.

| Компонент | Open/Prop | Обоснование |
|-----------|-----------|-------------|
| Scanner Engine (19+ checks) | Open | Доверие. Deployer видит что проверяется. |
| AST Analysis | Open | Техническая прозрачность. |
| Fixers (auto-fix code) | Open | Adoption driver. |
| Daemon (file watcher + HTTP + MCP) | Open | Инфраструктура. |
| TUI (all 8 pages) | Open | UX differentiator, но adoption важнее. |
| Passport Schema (agent-manifest.json) | Open | Стандарт должен быть открытым. |
| Passport Generation Mode 1 (from code) | Open | CLI feature, runs locally. |
| RuleEngine Classification (Art.5, Annex III, Art.50) | Open | Кодификация публичного закона. |
| Obligation Mapping (article → obligations) | Open | Закон публичный. |
| CLI Commands (scan, fix, agent:init, etc.) | Open | Core developer tool. |
| MCP Server + 8 Tools | Open | Integration point for agents. |
| SDK (compliorAgent() wrapper) | Open | Runs in deployer's code. |
| MCP Proxy Core (C.U01) | Open | Infrastructure. Trust. |
| ─── граница ─── | | |
| AI Registry Dataset (4,983+ tools) | Prop | Proprietary dataset. Competitive advantage. |
| Public Documentation Scoring Formula | Prop | Role-specific checklists, weights. |
| Community Evidence Aggregation | Prop | Algorithm + data. Network effect moat. |
| Vendor Self-Service Portal | Prop | Revenue feature. |
| Passport Storage Mode 3 (SaaS DB) | Prop | SaaS data layer. |
| Agent Control Plane (F39) | Prop | SaaS feature. Revenue. |
| FRIA Generator (F19) | Prop | SaaS feature. Revenue. |
| Audit Package Generator (F42) | Prop | Key monetization. |
| Cert Readiness Dashboard (F40) | Prop | SaaS feature. |
| Community Evidence Pipeline (F49) | Prop | Network effect. |

---

## 10. AI Registry — три источника данных

```
                    Registry Tool Card
                    ┌──────────────────┐
  Source 1 ────────►│  Public Docs     │ Passive scan (auto)
  (автоматический)  │  5/9 found       │
                    │                  │
  Source 2 ────────►│  Vendor Upload   │ Self-service portal
  (вендор сам)      │  +2 docs added   │
                    │                  │
  Source 3 ────────►│  Community       │ Агрегация из Passport'ов
  (deployer'ы)      │  Evidence        │ Анонимная статистика
                    │  247 deployers   │
                    └──────────────────┘
```

**Community Evidence** — третий источник данных. Deployer'ы отмечают в Passport (Mode 3) какие документы получили от вендора. Бинарные факты анонимно агрегируются (k-anonymity, N≥10). Отображается в Registry tool cards, НЕ влияет на Grade (Grade = только public scan + vendor upload). Влияет на Passport wizard (Mode 3 pre-fill hints).

**Privacy:** Deployer не видит кто ещё трекает тот же tool. Opt-out доступен. GDPR compliant (нет personal data в агрегации). Batch aggregation (nightly), не realtime.

**Network effect flywheel:** Больше deployer'ов → богаче community evidence → Registry полезнее → больше deployer'ов.

**SaaS feature:** F49 Community Evidence Pipeline (Sprint S10, 🟡 MEDIUM — requires N≥100 deployers).

---

## 11. Passport Visibility Model

Passport организации — **закрытый по умолчанию**.

| Кто | Что видит |
|-----|----------|
| **Org members** (CTO, DPO, Dev) | Всё: все Passports, все statuses, все documents |
| **Auditor** (по invite link) | Read-only: Audit Package export |
| **Regulator** (по formal request) | Audit Package PDF (Art.21, Art.23) |
| **Public** (Registry visitor) | Ничего из Passport. Только Registry data. |
| **Other deployer'ы** | Только анонимная агрегация в Community Evidence |
| **Vendor** | Агрегированное: "247 deployers track your tool" |

**Opt-in публичность:** Deployer может сделать passport (или часть) публичным — badge "AI Compliance tracked by Complior" на своём сайте.

---

**Обновлено:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
