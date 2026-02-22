# UNIFIED-ARCHITECTURE.md — Единая архитектура Complior v6

**Версия:** 1.0.0
**Дата:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Phase 0 — Архитектурный план

---

## 1. Обзор системы

Complior v6 — двухкомпонентная платформа AI compliance, состоящая из:

| Компонент | Репозиторий | Стек | Лицензия |
|-----------|------------|------|----------|
| **Open-Source TUI + Engine** | `complior` | Rust (TUI) + TypeScript (Engine) | MIT |
| **Closed SaaS Dashboard** | `ai-act-compliance-platform` | Node.js/Fastify + Next.js | Proprietary |

### Бизнес-модель: Free TUI → Paid Dashboard

```
ВОРОНКА КОНВЕРСИИ:

  Разработчик → npx complior → scan → score 72/100 → fix → 85/100 → badge
       │
       │  "Хочу видеть ВСЕ проекты организации на одном дашборде"
       │  "Нужен Agent Registry для всех AI-агентов компании"
       │  "Нужен мониторинг + drift detection + scheduled reports"
       ▼
  CTO/DPO → app.complior.eu → Dashboard → €49-399/мес
```

**Free TUI (open-source):**
- Сканирование кодовой базы (local project)
- Compliance score 0-100 + авто-фикс
- COMPLIANCE.md + badge + отчёты
- MCP server + CI/CD (headless)
- Wrapper-оркестратор для ЛЮБОГО coding agent
- Runtime middleware генерация
- Agent discovery + manifest генерация
- Drift detection (session-to-session)

**Paid Dashboard (SaaS, €49-399/мес):**
- Всё из Free +
- Cross-System Map: все TUI-ноды организации
- Agent Registry UI + Governance (lifecycle, kill switch)
- SaaS/Shadow AI Discovery (IdP, CASB, API traffic)
- Continuous Monitoring + Anomaly Detection
- Scheduled Reports + Compliance SLA
- Multi-jurisdiction (EU + CO + KR + UK + JP)
- Audit PDF (clean) + Compliance Certificate
- SSO (SAML/OIDC) + Team Management
- Registry API + API keys

---

## 2. Схема архитектуры

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPLIOR ECOSYSTEM                              │
│                                                                        │
│  ┌─ OPEN-SOURCE (complior repo) ────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  ┌──────────────────┐         ┌──────────────────────────────┐   │ │
│  │  │  RUST TUI        │  HTTP   │  TS ENGINE (Hono)            │   │ │
│  │  │  (ratatui)       │◄──────►│                              │   │ │
│  │  │                  │  SSE    │  Scanner (AST, 5 layers)     │   │ │
│  │  │  Wrapper host    │         │  Fixer (6+ templates)        │   │ │
│  │  │  PTY manager     │         │  Regulation DB (JSON)        │   │ │
│  │  │  UI rendering    │         │  AI Registry (2K+ tools)     │   │ │
│  │  │  Agent tabs      │         │  LLM (Vercel AI SDK)         │   │ │
│  │  │  Themes (100+)   │         │  Memory (3 levels)           │   │ │
│  │  │  ~5MB binary     │         │  MCP Server (stdio)          │   │ │
│  │  └──────┬───────────┘         │  Reports (MD/PDF/SARIF)      │   │ │
│  │         │ PTY                 │  Discovery (local)           │   │ │
│  │         ▼                     │  Agent Governance (basic)    │   │ │
│  │  ┌──────────────────┐        │  Runtime Middleware Gen       │   │ │
│  │  │  GUEST AGENT     │        │  Watcher (inotify/chokidar)  │   │ │
│  │  │  (subprocess)    │        │  DataProvider port            │   │ │
│  │  │  Odelix / Claude │        │    ├── LocalJSON (offline)    │   │ │
│  │  │  Code / OpenCode │        │    └── SaaSAPI (online)  ──────────┤
│  │  │  / aider / bash  │        └──────────────────────────────┘   │ │
│  │  └──────────────────┘                                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                          │                             │
│                                          │ Registry API (REST)         │
│                                          │ Telemetry API               │
│                                          │ License Validation          │
│                                          │ Bundle Download             │
│                                          ▼                             │
│  ┌─ SAAS (ai-act-compliance-platform repo) ─────────────────────────┐ │
│  │                                                                    │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │ │
│  │  │  FASTIFY BACKEND │  │  NEXT.JS 14      │  │  POSTGRESQL    │  │ │
│  │  │  (MetaSQL + VM)  │  │  (Dashboard)     │  │  (30+ tables)  │  │ │
│  │  │                  │  │                  │  │                │  │ │
│  │  │  IAM (WorkOS)    │  │  Landing Page    │  │  Users, Orgs   │  │ │
│  │  │  Inventory       │  │  Auth (AuthKit)  │  │  AI Tools      │  │ │
│  │  │  Classification  │  │  Dashboard       │  │  Registry      │  │ │
│  │  │  Billing (Stripe)│  │  Admin Panel     │  │  Scan Results  │  │ │
│  │  │  Eva (AI Chat)   │  │  Cross-System Map│  │  Agent Records │  │ │
│  │  │  Registry API    │  │  Agent Registry  │  │  API Keys      │  │ │
│  │  │  TUI Integration │  │  Monitoring      │  │  TUI Nodes     │  │ │
│  │  │  Admin API       │  │  Score Trends    │  │  Obligations   │  │ │
│  │  └──────────────────┘  └──────────────────┘  └────────────────┘  │ │
│  │                                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │  WorkOS   │  │  Stripe  │  │  Brevo   │  │  Gotenberg      │  │ │
│  │  │  (Auth)   │  │  (Pay)   │  │  (Email) │  │  (PDF)          │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Разделение ответственности

### Open-Source (TUI + Engine)

| Область | Что делает | Примеры |
|---------|-----------|---------|
| **Локальный анализ** | Сканирует код проекта на compliance | AST-scan JS/TS/Python/Rust, 19 checks |
| **Авто-фикс** | Генерирует/применяет фиксы через вложенного агента | Disclosure, logging, marking, docs, metadata |
| **Wrapper-оркестратор** | Запускает coding agents как subprocess (PTY) | Odelix, Claude Code, OpenCode, aider, bash |
| **LLM-агент** | Compliance chat, объяснения, what-if | Vercel AI SDK, multi-model routing |
| **Runtime middleware** | Генерирует middleware для production | compliorWrap(), logger, marker, filter |
| **Offline данные** | Regulation DB + AI Registry (JSON бандл) | ~530KB бандл, обновляется при `complior update` |
| **Отчёты** | Генерирует compliance отчёты | MD, SARIF, PDF (headless) |
| **CI/CD** | Headless mode для пайплайнов | `complior scan --ci --threshold 80` |
| **MCP** | Compliance tools для GUI-агентов | 7+ tools для Claude/Cursor/Windsurf |

### SaaS (Dashboard)

| Область | Что делает | Примеры |
|---------|-----------|---------|
| **Справочные данные** | Source of truth для реестра и обязательств | 2,477+ AI tools, 108 obligations, scoring rules |
| **Registry API** | Публичные эндпоинты для Engine DataProvider | `/v1/registry/tools`, `/v1/regulations/obligations` |
| **Пользователи + billing** | IAM, подписки, тарифы | WorkOS (AuthKit, SSO), Stripe, 5 тарифов |
| **AI Tool Inventory** | Веб-UI реестра use cases AI | 5-step wizard, classification, requirements |
| **Eva (AI Chat)** | Conversational onboarding + Q&A | Vercel AI SDK, Mistral, RAG по AI Act |
| **Dashboard** | Cross-System Map, Score Trends, Agent Registry | Визуализация всех TUI-нод организации |
| **TUI Integration** | Приём данных от TUI-инсталляций | Scan results, agent inventory, telemetry |
| **Discovery (cloud)** | SaaS/Shadow AI через IdP, CASB, API traffic | Okta, Azure AD, proxy logs |
| **Monitoring** | Drift, anomalies, regulation changes, SLA | Continuous, scheduled reports |
| **Enterprise** | SSO, audit trail, custom rules, multi-repo | SAML/OIDC, export, API v1.0 |

---

## 4. Матрица владения фичами

### Условные обозначения

- **OS** = Open-Source (complior repo)
- **SaaS** = Closed SaaS (ai-act-compliance-platform repo)
- **Shared** = Shared types/contracts между проектами
- **Агент A** = Engine (TS) / Backend (Node.js)
- **Агент B** = TUI (Rust) / Frontend (Next.js)
- **Агент C** = Infra

### A. Wrapper-ядро (Open-Source)

| ID | Фича | Проект | Агент OS | Спринт OS |
|----|-------|--------|----------|-----------|
| C.001 | Wrapper-архитектура (PTY subprocess) | OS | B | S02 |
| C.002 | Мульти-агент (tabs + splits) | OS | B | S03 |
| C.003 | Agent registry (список поддерживаемых) | OS | A+B | S02 |
| C.004 | Agent auto-detect | OS | A | S05 |
| C.005 | Passthrough rendering | OS | B | S02 |
| C.006 | Agent health monitoring | OS | B | S03 |
| C.007 | MCP server (7+ tools) | OS | C | S03 |
| C.008 | Headless mode (CI/CD) | OS | C | S03 |
| C.009 | Shared workspace | OS | B | S02 |
| C.010 | Agent-specific config | OS | A+B | S05 |

### B. Сканер + Gate (Open-Source)

| ID | Фича | Проект | Агент OS | Спринт OS |
|----|-------|--------|----------|-----------|
| C.011 | Compliance Gate (200мс rescan) | OS | A | S02 |
| C.012 | 19 проверок (disclosure...cybersecurity) | OS | A | S01 |
| C.013 | AST engine (Babel + tree-sitter) | OS | A | S01 |
| C.014 | Zero-config detection | OS | A | S01 |
| C.015 | Scoring algorithm (weighted formula) | OS | A | S01 |
| C.016 | Score 0-100 (RED/AMBER/YELLOW/GREEN) | OS | A+B | S01 |
| C.017 | Sparkline тренд | OS | B | S04 |
| C.018 | Инкрементальный скан (кэш AST) | OS | A | S01 |
| C.019 | Детерминистический результат | OS | A | S01 |
| C.020 | Dependency deep scan | OS | A | S05 |

### C. Auto-Fix (Open-Source)

| ID | Фича | Проект | Агент OS | Спринт OS |
|----|-------|--------|----------|-----------|
| C.021 | 6+ авто-фиксеров | OS | A | S02 |
| C.022 | AI-фиксер (сложные случаи) | OS | A | S02 |
| C.023 | Diff preview | OS | A | S02 |
| C.024 | Batch fix | OS | A | S02 |
| C.025 | Fix + git commit | OS | A | S02 |
| C.026 | Fix explanation (статья + штраф) | OS | A | S02 |
| C.027 | Undo fix | OS | A | S05 |
| C.028 | Custom fix templates | OS | A | S05 |
| C.029 | Progressive fix (roadmap к score 100) | OS | A | S05 |

### C+. Матрица решений — 17 нарушений (Open-Source)

| # | Нарушение | Статья | Проект | Спринт OS |
|---|-----------|--------|--------|-----------|
| 1 | AI Disclosure | Art.50.1 | OS | S02 |
| 2 | Content Marking | Art.50.2 | OS | S02 |
| 3 | Interaction Logging | Art.12 | OS | S02 |
| 4 | AI Literacy | Art.4 | OS | S03 |
| 5 | Documentation | Art.11 | OS | S02 |
| 6 | Compliance Metadata | Art.50.4 | OS | S02 |
| 7 | GPAI Transparency | Art.51-53 | OS | S03 |
| 8 | Risk Management | Art.9 | OS | S04 |
| 9 | Tech Safeguards | Art.15 | OS | S04 |
| 10 | Human Oversight | Art.14 | OS | S05 |
| 11 | Data Governance | Art.10 | OS | S04 |
| 12 | Transparency | Art.13 | OS | S04 |
| 13 | EU DB Registration | Art.71 | OS | S04 |
| 14 | Post-Market Plan | Art.72 | OS | S04 |
| 15 | Incident Response | Art.73 | OS | S04 |
| 16 | FRIA | Art.27 | OS | S04 |
| 17 | Opt-out Mechanism | CO §6-1703 | OS | S03 |

### C++. Runtime Control (Open-Source FREE + SaaS PAID)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт OS |
|----|-------|-----------|-------------|-----------|
| C.R01 | AI Response Wrapper | Генерация middleware | — | S05 |
| C.R02 | Disclosure Injection | Генерация | — | S05 |
| C.R03 | Content Marking Engine | Генерация | — | S05 |
| C.R04 | Interaction Logger | Генерация | — | S05 |
| C.R05 | Deepfake Guard | Детекция | — | S06 |
| C.R06 | Compliance Proxy | Config генерация | Hosted proxy | S05 (OS), S09 (SaaS) |
| C.R07 | Output Safety Filter | Генерация | Runtime мониторинг | S05 |
| C.R08 | Human-in-the-Loop Gate | Паттерн генерация | Dashboard workflow | S05 (OS), S09 (SaaS) |
| C.R09 | SDK Adapters | npm packages | — | S05 |
| C.R10 | Runtime Dashboard | — | Dashboard UI | S09 (SaaS) |
| C.R11 | Compliance Audit Trail | Local SQLite | Centralized | S05 (OS), S08 (SaaS) |

### D. База регуляций (Open-Source — логика, SaaS — данные)

| ID | Фича | Проект | Агент | Спринт |
|----|-------|--------|-------|--------|
| C.030 | EU AI Act JSON-база | OS | A | S01 |
| C.031 | Мульти-юрисдикция | OS | A | S03 (EU+CO), S06 (TX,CA,KR), S10 (UK,JP,CA,BR) |
| C.032 | Regulation Timeline + countdown | OS | B | S04 |
| C.033 | Regulation Diff | OS | A | S08 |
| C.034 | Regulation Search | OS | A | S02 |
| C.035 | AI Regulation Explainer | OS | A | S02 |
| C.036 | Penalty Calculator | OS | A | S04 |
| C.037 | Regulation API | SaaS | A | S07 (SaaS) |
| C.038 | Cross-reference | OS | A | S03 |
| C.039 | Regulation Simulator | OS | A | S04 |

### E. AI Registry (Shared — данные SaaS, детекция OS)

| ID | Фича | Проект | Агент | Спринт |
|----|-------|--------|-------|--------|
| C.040 | 2000+ AI tools | Shared | A (оба) | S01 (OS), S07 (SaaS расширение) |
| C.041 | Risk classification engine | OS | A | S01 |
| C.042 | Detection patterns | OS | A | S01 |
| C.043 | Dependency chain scan | OS | A | S05 |
| C.044 | Compliant alternatives | SaaS | A | S07 (SaaS) |
| C.045 | AI Tool Leaderboard | SaaS | C | S10 (SaaS) |
| C.046 | Tool Watch | SaaS | A | S08 (SaaS) |

### F. Универсальный сканер (Open-Source FREE + SaaS PAID)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.047 | Mode A: Local | ✓ | — | S01 |
| C.048 | Mode B: GitHub | — | ✓ | S07 (SaaS) |
| C.049 | Mode C: Website | — | ✓ | S08 (SaaS) |
| C.050 | Mode D: LLM Model | — | ✓ | S10 (SaaS) |
| C.051 | Mode E: Supply Chain | Partial (deps) | Full (API) | S05 (OS), S08 (SaaS) |
| C.052 | Mode F: Docker | ✓ (local image) | — | S07 |
| C.053 | Mode G: API endpoint | — | ✓ | S09 (SaaS) |
| C.054 | Scheduled scan | — | ✓ | S08 (SaaS) |

### G. Отчёты (Open-Source FREE + SaaS PAID)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.055 | Dev report (терминал) | ✓ | — | S03 |
| C.056 | Audit PDF | Watermark | Clean | S03 (OS), S07 (SaaS) |
| C.057 | COMPLIANCE.md | ✓ | — | S03 |
| C.058 | FRIA Generator | ✓ | Guided wizard | S04 (OS), S07-08 (SaaS) |
| C.059 | Technical Documentation | ✓ | — | S04 |
| C.060 | Data Practice Documentation | ✓ | — | S04 |
| C.061 | Risk Management System Doc | ✓ | — | S04 |
| C.062 | Human Oversight Plan | ✓ | — | S05 |
| C.063 | Conformity Assessment Helper | — | ✓ | S09 (SaaS) |
| C.064 | Post-Market Monitoring Plan | ✓ | — | S04 |
| C.065 | Incident Response Protocol | ✓ | — | S04 |
| C.066 | EU Database Registration Helper | — | ✓ | S09 (SaaS) |
| C.067 | Export to legal templates | — | ✓ | S10 (SaaS) |

### H. Бейджи (Open-Source FREE + SaaS PAID)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.068 | Compliance Badge SVG | Static | — | S03 (OS) |
| C.069 | Badge API | — | ✓ | S07 (SaaS) |
| C.070 | Compliance Certificate | — | QR-verified | S09 (SaaS) |
| C.071 | Verified Badge | — | ✓ | S09 (SaaS) |
| C.072 | Dynamic badge (GH Action) | ✓ | — | S03 (OS) |
| C.073 | Badge for npm/PyPI | ✓ | — | S05 (OS) |

### I. Metadata стандарт (Open-Source)

| ID | Фича | Проект | Агент | Спринт OS |
|----|-------|--------|-------|-----------|
| C.074 | .well-known/ai-compliance.json | OS | C | S03 |
| C.075 | Meta tags | OS | A | S03 |
| C.076 | HTTP headers | OS | A | S03 |
| C.077 | Compliance Manifest в package.json | OS | A | S03 |
| C.078 | Auto-inject | OS | A | S03 |

### J. Шаблоны (Open-Source)

| ID | Фича | Проект | Агент | Спринт OS |
|----|-------|--------|-------|-----------|
| C.079 | complior create (7 scaffolds) | OS | A | S05 |
| C.080 | Framework adapters | OS | A | S05 |
| C.081 | Compliance-first starter kit | OS | C | S05 |

### K. Интеграции (Open-Source + SaaS)

| ID | Фича | Проект | Агент | Спринт |
|----|-------|--------|-------|--------|
| C.082 | MCP Server | OS | C | S03 |
| C.083 | GitHub Action | OS | C | S03 |
| C.084 | VS Code Extension | OS | C | S06 |
| C.085 | JetBrains Plugin | OS | C | S06 |
| C.086 | Pre-commit hook | OS | C | S03 |
| C.087 | Vercel Plugin | OS | C | S06 |
| C.088 | npm/PyPI pre-publish | OS | C | S05 |
| C.089 | Slack/Discord bot | SaaS | C | S09 (SaaS) |
| C.090 | Odelix native | OS | C | S02 |

### L. Enterprise (SaaS)

| ID | Фича | Проект | Агент SaaS | Спринт SaaS |
|----|-------|--------|------------|-------------|
| C.091 | Team Dashboard | SaaS | B | S08 |
| C.092 | Org-wide scan | SaaS | A | S08 |
| C.093 | SSO (SAML/OIDC) | SaaS | A+C | S09 |
| C.094 | Audit trail | SaaS | A | S09 |
| C.095 | Role-based views | SaaS | B | S08 |
| C.096 | Custom rules | SaaS | A | S10 |
| C.097 | Policy templates | SaaS | A | S09 |
| C.098 | Multi-repo dashboard | SaaS | B | S08 |
| C.099 | Compliance SLA | SaaS | A+B | S09 |
| C.100 | Delegation (DPO → developer) | SaaS | A+B | S09 |

### M. Growth + контент (SaaS)

| ID | Фича | Проект | Агент SaaS | Спринт SaaS |
|----|-------|--------|------------|-------------|
| C.101 | "State of AI Compliance" Report | SaaS | C | S10 |
| C.102 | AI Tool Leaderboard | SaaS | C | S10 |
| C.103 | Pre-enforcement Countdown | SaaS | C | S08 |
| C.104 | Proactive Outreach | SaaS | C | S10 |
| C.105 | "Is [Company] AI Compliant?" SEO | SaaS | C | S10 |
| C.106 | Compliance Newsletter | SaaS | C | S08 |
| C.107 | VulnerAI demo repo | OS | C | S04 |

### N. Moonshots (SaaS / Будущее)

| ID | Фича | Проект | Спринт |
|----|-------|--------|--------|
| C.108 | Compliance-as-Code (.complior.yaml) | OS | S09 |
| C.109 | AI Compliance Copilot (чатбот на сайте) | SaaS | S10 |
| C.110 | Regulation Simulator | OS | S04 |
| C.111 | Compliance Diff between jurisdictions | OS | S06 |
| C.112 | AI Model Passport | SaaS | Post-S10 |
| C.113 | Compliance Time Machine | SaaS | Post-S10 |
| C.114 | Compliance Marketplace | SaaS | S10 |
| C.115 | AI Risk Insurance Integration | SaaS | Post-S10 |
| C.116 | Regulatory Sandbox Integration | SaaS | Post-S10 |
| C.117 | Compliance Agent (автономный) | SaaS | Post-S10 |
| C.118 | Cross-product Bundle (Odelix + Complior) | OS+SaaS | S10 |
| C.119 | White-label Engine | SaaS | S10 |
| C.120 | Compliance API Platform | SaaS | S10 |

### O. Discovery — обнаружение AI (Open-Source local + SaaS cloud)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.F01 | AI System Inventory | Local (TUI) | Org-wide (Dashboard) | S04 (OS), S08 (SaaS) |
| C.F02 | Codebase Scan (расширение) | Current repo | All repos (GH/GL API) | S01 (OS), S08 (SaaS) |
| C.F03 | Infrastructure Scan | Local files | Remote cluster | S04 (OS), S08 (SaaS) |
| C.F04 | SaaS AI Discovery (IdP) | — | ✓ | S08 (SaaS) |
| C.F05 | API Traffic Analysis | — | ✓ | S08 (SaaS) |
| C.F06 | Agent & Workflow Discovery | Local configs | Org-wide | S04 (OS), S08 (SaaS) |
| C.F07 | Internal Bot Discovery | — | ✓ (Slack/Teams) | S08 (SaaS) |
| C.F08 | Shadow AI Detection | — | ✓ (CASB/proxy) | S08 (SaaS) |
| C.F09 | ML Model Registry Scan | — | ✓ (MLflow, SM) | S08 (SaaS) |
| C.F10 | Embedded AI Detection | Code scan | Runtime monitoring | S05 (OS), S09 (SaaS) |
| C.F11 | Supply Chain AI Map | Dependency tree | Full map | S05 (OS), S08 (SaaS) |
| C.F12 | Cross-System Compliance Map | — | ✓ (Dashboard) | S08 (SaaS) |

### P. Agent Governance (Open-Source basic + SaaS full)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.F13 | Agent Registry | /agents list (TUI) | Full UI | S06 (OS), S08 (SaaS) |
| C.F14 | Agent Compliance Score | Per agent | Per agent + org | S06 (OS), S08 (SaaS) |
| C.F15 | Agent Permissions Matrix | agent-compliance.yaml | Dashboard UI | S06 (OS), S09 (SaaS) |
| C.F16 | Agent Audit Trail | Local SQLite | Centralized | S06 (OS), S09 (SaaS) |
| C.F17 | Agent Lifecycle Management | — | Dashboard workflow | S09 (SaaS) |
| C.F18 | Agent Compliance Manifest | Generate + scan | — | S06 (OS) |
| C.F19 | Cross-Agent Compliance | — | Org-wide graph | S09 (SaaS) |
| C.F20 | Agent Kill Switch | CLI command | Dashboard button | S09 (OS), S09 (SaaS) |
| C.F21 | Agent Sandbox | Docker test | Management UI | S09 (OS), S09 (SaaS) |
| C.F22 | Agent Policy Templates | CLI generation | — | S06 (OS) |

### Q. Remediation (Open-Source local + SaaS cloud)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.F23 | Code Fix (org-wide batch) | Single repo | Org-wide + PRs | S02 (OS), S08 (SaaS) |
| C.F24 | SaaS Vendor Assessment | — | ✓ | S09 (SaaS) |
| C.F25 | Infrastructure Remediation | File generation | — | S07 (OS) |
| C.F26 | API Compliance Proxy | Config gen | Hosted proxy | S05 (OS), S09 (SaaS) |
| C.F27 | Agent Remediation | Plan gen | — | S06 (OS) |
| C.F28 | Shadow AI Policy Enforcement | Policy doc gen | CASB enforcement | S06 (OS), S09 (SaaS) |
| C.F29 | ML Model Compliance Kit | Generation | Monitoring | S07 (OS), S09 (SaaS) |
| C.F30 | Compliance Playbook Generator | Single project | Org-wide | S07 (OS), S09 (SaaS) |

### R. Continuous Monitoring (Open-Source basic + SaaS full)

| ID | Фича | OS (FREE) | SaaS (PAID) | Спринт |
|----|-------|-----------|-------------|--------|
| C.F31 | Compliance Drift Detection | Session-to-session | Continuous | S08 (OS), S09 (SaaS) |
| C.F32 | Regulation Change Monitoring | Notification при запуске | Real-time alerts | S08 (OS), S09 (SaaS) |
| C.F33 | Anomaly Detection | — | ✓ | S09 (SaaS) |
| C.F34 | Scheduled Reporting | — | ✓ | S09 (SaaS) |
| C.F35 | Compliance SLA Monitoring | — | ✓ | S09 (SaaS) |
| C.F36 | Pre-deployment Gate | --ci --threshold | Webhook management | S03 (OS), S09 (SaaS) |
| C.F37 | Incident Detection + Response | — | ✓ | S09 (SaaS) |
| C.F38 | Vendor Compliance Monitoring | — | ✓ | S09 (SaaS) |

### Существующие фичи SaaS (F01-F24, S1-S6 done)

Эти фичи уже реализованы в SaaS-проекте и продолжают развиваться:

| ID | Фича | Статус | Спринт SaaS |
|----|-------|--------|-------------|
| F01 | Инфраструктура + настройка | ✅ Done | S0 |
| F02 | IAM (Ory → WorkOS) + Invite + Team | ✅ Done (Ory), Миграция S7 | S1+S2.5 → S7 |
| F03 | AI Tool Inventory + Wizard + Catalog (245→2477) | ✅ Done | S1-S3 |
| F04a | Rule Engine (deployer classification) | ✅ Done | S2 |
| F04b | Classification History + Reclassification | ✅ Done | S3 |
| F04c | Deployer Requirements Mapping | ✅ Done | S3 |
| F05 | Deployer Compliance Dashboard | ✅ Done (API), Frontend S5 | S3+S5 |
| F06 | Eva — Conversational Onboarding | 📋 Deferred | S7 (SaaS) |
| F07 | Deployer Document Generation | 📋 Planned | S7-S8 (SaaS) |
| F08 | Gap Analysis & Action Plan | 📋 Planned | S7-S8 (SaaS) |
| F09 | Billing (Stripe) | ✅ Done (Checkout+Webhook) | S3.5+S6 |
| F10 | Eva tool calling | 📋 Planned | S8 (SaaS) |
| F11 | Onboarding + Notifications | 📋 Planned | S8 (SaaS) |
| F12 | Regulatory Monitor | 📋 Planned | S9 (SaaS) |
| F13 | Доп. deployer-документы | 📋 Planned | S9 (SaaS) |
| F14 | Multi-language (DE, FR) | 📋 Planned | S10 (SaaS) |
| F15 | Compliance Copilot (multi-channel) | 📋 Future | Post-S10 |
| F16 | Shadow AI Auto-Discovery | 📋 Future → C.F08 | S08 (SaaS) |
| F17 | Autonomous Compliance Agent | 📋 Future | Post-S10 |
| F18 | AI Literacy Module | 📋 Planned | S10 (SaaS) |
| F19 | FRIA Generator (Art. 27) | 📋 Planned | S07-S08 (SaaS) |
| F20 | KI-Compliance Siegel | 📋 Planned | S09 (SaaS) |
| F21 | Provider-Lite Wizard | 📋 Planned | S09-S10 (SaaS) |
| F22 | Compliance Checklist Generator | 📋 Planned | S09 (SaaS) |
| F23 | Free Lead Gen Tools (Quick Check, Penalty Calc) | ✅ Done | S3.5+S5 |
| F24 | Platform Admin Panel | ✅ Done | S6 |

### Новые фичи SaaS (из Brainstorm v6.4, ранее не в бэклоге)

| ID | Фича | Спринт SaaS | Зависимость от OS |
|----|-------|-------------|-------------------|
| F25 | WorkOS миграция (Ory → WorkOS) | S7 | — |
| F26 | Registry API (публичные эндпоинты) | S7 | OS S1 (shared types) |
| F27 | TUI Integration (telemetry, nodes, license) | S7-S8 | OS S3+ (Engine API) |
| F28 | Dashboard v2 (Cross-System Map, Score Trends) | S8 | OS S6 (agent governance) |
| F29 | Agent Registry UI (Dashboard) | S8 | OS S6 (agent data) |
| F30 | SaaS Discovery connectors (IdP, CASB, API traffic) | S8 | — |
| F31 | Monitoring backend (drift, anomaly, SLA) | S9 | OS S8 (drift engine) |
| F32 | Enterprise features (SSO, audit, API v1.0) | S9 | — |
| F33 | ML Model Registry connectors | S10 | — |
| F34 | White-label engine | S10 | — |
| F35 | Multi-language dashboard (DE, FR, ES, KO) | S10 | — |
| F36 | Compliance Marketplace | S10 | — |

---

## 5. Shared Contracts

### Registry API (OpenAPI)

```yaml
# SaaS предоставляет, Engine потребляет через DataProvider port
/v1/registry/tools:
  GET: список AI tools (pagination, search)
  GET /:id: детали tool (evidence, assessment)

/v1/registry/search:
  GET: поиск по имени, provider, category

/v1/regulations/obligations:
  GET: список obligations по regulation + risk level

/v1/data/bundle:
  GET: offline bundle (JSON, ~530KB, ETag caching)
```

### Shared Types (TypeScript → Rust codegen)

```typescript
// packages/shared-types/
interface RegistryTool {
  id: string;
  name: string;
  provider: string;
  category: string;
  riskLevel: 'prohibited' | 'high' | 'limited' | 'minimal' | 'gpai';
  detectionPatterns: DetectionPattern[];
  complianceStatus: ComplianceStatus;
  jurisdictions: string[];
}

interface Obligation {
  id: string;           // "OBL-015"
  regulationId: string; // "eu-ai-act"
  articleRef: string;   // "Art.50.1"
  riskLevels: string[];
  title: string;
  description: string;
  checkType: string;    // "file_presence" | "ast_pattern" | "content_check"
}

interface ScanResult {
  projectId: string;
  nodeId: string;       // TUI installation ID
  score: number;        // 0-100
  findings: Finding[];
  toolsDetected: string[];
  timestamp: string;
}
```

### ID конвенции

| Сущность | Формат | Пример |
|----------|--------|--------|
| Obligation | `OBL-NNN` | OBL-015 (Art.50.1 Disclosure) |
| Feature (brainstorm) | `C.NNN` или `C.FNN` | C.001, C.F13 |
| Feature (SaaS existing) | `FNN` | F01, F24 |
| Sprint (OS) | `SNNos` | S01, S10 |
| Sprint (SaaS) | `SNNsaas` | S7, S10 |
| AI Tool | UUID | `550e8400-...` |
| TUI Node | `node-{hostname}-{hash}` | `node-dev1-a3f2` |

---

## 6. Кросс-проектные зависимости

```
                    ЖЁСТКИЕ (блокирующие)
                    ═══════════════════

OS S01 (Scanner + shared types)
    ═══════════════════════════► SaaS S7 (Registry API schema)
    API schema ДОЛЖНА соответствовать Engine types.
    Shared types фиксируются Day 1.

                    СРЕДНИЕ (mock-data допустим)
                    ═══════════════════════════

OS S06 (Agent Governance basic)
    ───────────────────────────► SaaS S8 (Dashboard v2 — Agent Registry UI)
    SaaS может начать с mock data, но real data нужен из Engine.

                    МЯГКИЕ (независимая работа)
                    ═══════════════════════════

OS S01 (Scanner core)
    - - - - - - - - - - - - - -► SaaS S7 (Registry API)
    Engine работает оффлайн с JSON бандлом. API — обогащение.

OS S03 (MCP + Reports)
    - - - - - - - - - - - - - -► SaaS S7 (Registry API)
    MCP tools работают и без API. API даёт доступ к 2,477 tools.

OS S08 (Monitoring/Drift)
    - - - - - - - - - - - - - -► SaaS S9 (Monitoring backend)
    Drift detection работает локально. SaaS агрегирует.
```

### Граф зависимостей (порядок разработки)

```
                         OS (Open-Source)                              SaaS
                    ═══════════════════════                    ═══════════════

  S01 ─────► S02 ─────► S03 ─────► S04                         S1-S6 ✅ Done
   │          │          │          │
   │          │          │          └── 🚀 OS LAUNCH              S7 ◄═══ S01 types
   │          │          │                                        │
   │          │          └──────────────────────────────────── S8 ◄─── S06
   │          │                                                │
   │          S05 ─────► S06 ─────► S07 ─────► S08              S9
   │                                            │               │
   │                      S09 ─────► S10                        S10
   │
   └── DataProvider port: Local JSON (offline) ↔ SaaS API (online)
```

---

## 7. Тирование данных

### Data Provider Pattern в Engine

```typescript
// engine/src/data/provider.ts
interface DataProvider {
  getTools(query: ToolQuery): Promise<RegistryTool[]>;
  getObligations(regulation: string, riskLevel: string): Promise<Obligation[]>;
  getBundle(): Promise<DataBundle>;
}

// Три реализации:
class LocalJSONProvider implements DataProvider {
  // Offline: ~530KB JSON бандл в .complior/data/
  // Обновляется при `complior update`
  // FREE — всегда доступен
}

class SaaSAPIProvider implements DataProvider {
  // Online: REST API к SaaS
  // ETag caching, rate limits per plan
  // Fallback → LocalJSON если нет сети
}

class HybridProvider implements DataProvider {
  // Local + API enrichment
  // Local для скорости, API для полных данных
  // Default mode
}
```

### Что включает каждый тир

| Данные | Local JSON (FREE) | Free API (FREE) | Paid API (PAID) |
|--------|-------------------|-----------------|-----------------|
| AI Tools | 200 top (с detection patterns) | 2,477 (basic info) | 2,477 + evidence + assessments |
| Obligations | 108 (все) | 108 (все) | 108 + recommendations |
| Regulations | EU AI Act + CO SB205 | Все доступные | Все + interpretive guidance |
| Detection Patterns | Top 200 tools | Top 200 tools | Все tools |
| Scoring Rules | Standard | Standard | Custom rules поддержка |
| Размер бандла | ~530KB | — | — |
| Обновления | При `complior update` | Real-time | Real-time + notifications |
| Rate Limit | — | 100 req/hour | 10,000 req/hour |

---

## 8. Таймлайн — параллельные спринты

```
Неделя  1   2   3   4   5   6   7   8   M1  M2  M3  M4  M5  M6  M6+
        ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤

OS:     ║ S01   ║ S02   ║ S03   ║ S04   ║ S05    ║ S06    ║ S07    ║
        ║ DB+   ║ Wrap+ ║ Theme+║ Polish║ Runtime║ Agent  ║ OrgScan║
        ║ Scan  ║ Fix   ║ Report║ Launch║ SDK    ║ Gov    ║ Discov ║
        ║       ║       ║       ║  🚀   ║        ║        ║        ║
        ║       ║       ║       ║       ║ S08    ║ S09    ║ S10    ║
        ║       ║       ║       ║       ║ Monitor║ Sandbox║ Intl   ║

SaaS:   ║                 S1-S6 ✅ Done                              ║
        ║                               ║ S7     ║ S8     ║ S9     ║
        ║                               ║ WorkOS ║ Dash v2║ Monitor║
        ║                               ║ RegAPI ║ Discov ║ Enterp ║
        ║                               ║        ║        ║ S10    ║
        ║                               ║        ║        ║ Scale  ║

Shared: ║ Types ║                       ║ API v1 ║        ║ API v2 ║
        ║ Day 1 ║                       ║ schema ║        ║ expand ║
```

---

## 9. Сводка по цифрам

| Метрика | Open-Source | SaaS | Всего |
|---------|-----------|------|-------|
| **Фичи из Brainstorm** | ~120 | ~66 | 186 |
| **Существующие фичи SaaS (F01-F24)** | — | 24 | 24 |
| **Новые фичи SaaS (F25-F36)** | — | 12 | 12 |
| **Спринты** | S01-S10 | S7-S10 (S1-S6 done) | 14 новых |
| **Агенты** | 3 (Engine, TUI, Infra) | 3 (Backend, Frontend, Infra) | 6 |
| **Юрисдикции к запуску** | 2 (EU + CO) | — | 2 |
| **Юрисдикции к S10** | 10+ | — | 10+ |
| **AI Tools при запуске** | 200 (offline) | 2,477 (API) | 2,477 |
| **AI Tools к S10** | 2,000+ | 2,000+ | 2,000+ |
| **Существующий код** | 568 тестов, 365 SP | 229 тестов, S1-S6 done | 797 тестов |

---

## 10. Ключевые решения

| Решение | Обоснование |
|---------|-------------|
| **Auth: Ory → WorkOS** (SaaS) | Managed auth, SSO бесплатно до 1M MAU, org management native. Supersedes ADR-006 |
| **Engine: TypeScript** (не Rust) | LLM-экосистема JS-first, 15K LOC зрелого кода, Vercel AI SDK |
| **Data: SaaS = source of truth** | PostgreSQL для реестра/обязательств, Engine = DataProvider port |
| **Pricing: 5 тиров** | Free €0 / Starter €49 / Growth €149 / Scale €399 / Enterprise |
| **Dashboard stack: Fastify + MetaSQL + Next.js** | Существующий SaaS, НЕ tRPC/Supabase |
| **Shared types: Day 1** | TS interfaces → Rust structs (codegen), API schema |
| **Offline-first Engine** | Работает без сети, API = enrichment |
| **Feature split: Free TUI / Paid Dashboard** | Граница = local vs network integrations |

---

**Обновлено:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
