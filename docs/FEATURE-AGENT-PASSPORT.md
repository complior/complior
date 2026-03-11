# FEATURE: Agent Passport (C.S01)

**Версия:** 1.1.0
**Дата:** 2026-02-26
**Статус:** Draft — требует утверждения PO
**Приоритет:** 🔴 CRITICAL
**Спринт:** S04 (CLI) + S09 (SaaS)
**Зависимости CLI:** C.012 (Scanner), C.042 (Detection patterns), C.F06 (Agent Discovery)
**Зависимости SaaS:** F39 (Agent Control Plane), F03 (AI Tool Inventory), F26 (Registry API)

---

## 1. ЗАЧЕМ

### Проблема

EU AI Act обязывает каждого deployer'а вести реестр AI систем. Это не рекомендация — это юридическое требование:

- **Art.26(1)** — deployer обязан использовать AI систему в соответствии с instructions of use, обеспечить мониторинг, вести логи
- **Art.26(5)** — deployer high-risk систем обязан провести Data Protection Impact Assessment
- **Art.27** — deployer обязан провести Fundamental Rights Impact Assessment (FRIA) ДО развёртывания
- **Art.49a** — deployer обязан зарегистрировать high-risk AI систему в EU Database
- **Штрафы:** до €15M или 3% глобального оборота за несоблюдение deployer obligations

Регулятор приходит и спрашивает: "Покажите реестр ваших AI систем. Для каждой — кто ответственный, какой уровень риска, какие данные обрабатывает, есть ли human oversight." Компания должна ответить.

При этом в типичной организации есть два типа AI систем:

**Свои агенты (код доступен).** Backend-команда написала order processor на LangChain, recruitment bot на CrewAI, support agent на Vercel AI SDK. Код в репозитории, разработчик знает что делает агент — но не знает, под какие статьи закона он попадает, и не документировал его для регулятора.

**Чужие агенты и AI-сервисы (код недоступен).** Компания использует Intercom Fin для поддержки, ElevenLabs для голосового бота, Stripe Radar для фрод-детекции, Notion AI для внутренних документов. Код закрыт. Но **deployer всё равно обязан их документировать** — закон не различает свои и чужие системы. Art.26 применяется ко ВСЕМ AI системам, которые deployer использует.

Сегодня компании решают это Excel-таблицей или страницей в Confluence. Это не работает:
- Нет стандартного формата → у каждого свой Excel
- Нет связи с кодом → данные устаревают на следующий день
- Нет compliance scoring → непонятно, что критично
- Нет evidence для аудитора → при проверке начинается паника
- Нет связи с runtime → manifest не отражает реальное поведение

Agent Passport решает это: единый формат, который генерируется автоматически (для своих агентов) или заполняется через Dashboard (для чужих), и обновляется при каждом сканировании.

### Рыночный контекст (февраль 2026)

**87%** AI агентов не имеют safety cards (MIT CSAIL AI Agent Index).

**78%** организаций не имеют AI identity policies (Gartner 2025).

**40%** enterprise apps будут включать агентов к концу 2026 (Gartner), при этом только **6%** организаций имеют стратегию управления агентами.

**NIST AI Agent Standards Initiative** (запущена 17 Feb 2026) — NIST/CAISI работает над стандартами identity, authorization, и interoperability для AI агентов. NCCoE concept paper по AI Agent Identity and Authorization открыт для комментариев до 2 Apr 2026. Область: идентификация, авторизация, делегирование доступа, логирование.

**AIUC-1** (первый стандарт сертификации AI агентов) — требует документирования 6 доменов: Data & Privacy, Security, Safety, Reliability, Accountability, Societal Impact. ElevenLabs и Intercom уже сертифицированы. Schellman — первый аудитор. Cisco, MITRE, Stanford — technical contributors.

**Google A2A Agent Card** — Agent2Agent protocol определяет Agent Card (JSON по адресу `/.well-known/agent.json`): identity, capabilities, skills, auth, endpoint. 50+ компаний участвуют. Google Cloud Marketplace уже требует Agent Card для листинга AI агентов.

**Open Agent Format (OAF)** — AGENTS.md + YAML frontmatter. Кросс-платформенный (Claude Code, Goose, Deep Agents, Letta).

**Никто** не объединяет agent identity + compliance в одном формате. A2A Agent Card — про interoperability. OAF — про instructions. NIST — пока только concept paper. Complior Agent Passport — про compliance identity.

### Наша позиция

Complior уже имеет ДВА продукта, которые покрывают оба сценария:

**CLI (для своих агентов с кодом):**
- AST scanner (C.013) — может анализировать код агентов
- Detection patterns (C.042) — знает SDK: LangChain, CrewAI, Anthropic, OpenAI, Vercel AI
- Agent Discovery (C.F06) — умеет находить агентов в проекте
- Compliance scoring (C.015) — может оценивать score
- Risk classification (C.041) — классификация по EU AI Act Annex III

**SaaS Dashboard (для всех AI систем, включая без кода):**
- AI Tool Inventory (F03, DONE) — каталог 225+ tools, 5-step wizard, CRUD
- Registry API (F26, DONE) — 4,983 tools с risk score, obligations, jurisdictions
- Agent Control Plane (F39, Sprint 9) — org-wide dashboard для всех агентов

**Что осталось:** создать единый формат `agent-manifest.json`, который (a) генерируется автоматически из кода в CLI, (b) заполняется через Dashboard в SaaS для систем без кода, (c) обогащается данными из AI Registry для vendor-систем, и (d) принимается аудиторами как evidence.

---

## 2. ЧТО

### 2.1. Определение

**Agent Passport** — это стандартизированная карточка AI системы в формате `agent-manifest.json`. Она однозначно идентифицирует AI агента или AI-сервис и описывает его identity, capabilities, constraints, и compliance status.

### 2.1.1. Три режима генерации

Passport — единый формат, но создаётся тремя разными способами в зависимости от того, есть ли доступ к коду:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ОДИН ФОРМАТ — ТРИ ИСТОЧНИКА                       │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌────────────┐  │
│  │  MODE 1: AUTO       │  │  MODE 2: SEMI-AUTO   │  │  MODE 3:   │  │
│  │  (CLI, код есть)    │  │  (Runtime + Registry)│  │  MANUAL    │  │
│  │                     │  │                      │  │  (SaaS)    │  │
│  │  AST-анализ кода    │  │  MCP Proxy наблюдает │  │            │  │
│  │  → permissions      │  │  tool calls runtime  │  │  Deployer  │  │
│  │  → autonomy L1-L5   │  │  → discovered perms  │  │  заполняет │  │
│  │  → tools/APIs       │  │                      │  │  форму в   │  │
│  │  → human gates      │  │  AI Registry (4,983) │  │  Dashboard │  │
│  │  → framework detect │  │  → vendor DPA        │  │            │  │
│  │  → model detect     │  │  → risk score        │  │  Complior  │  │
│  │                     │  │  → data residency    │  │  pre-fills │  │
│  │  ПОЛНОТА: 85-95%    │  │                      │  │  из AI     │  │
│  │  Wizard дозаполняет │  │  ПОЛНОТА: 40-60%     │  │  Registry  │  │
│  │  owner, disclosure  │  │  Wizard дозаполняет  │  │            │  │
│  │                     │  │  owner, constraints  │  │  ПОЛНОТА:  │  │
│  │  ПРОДУКТ: CLI FREE  │  │                      │  │  100%      │  │
│  │                     │  │  ПРОДУКТ: CLI + SaaS │  │  (manual)  │  │
│  │  ЦЕЛЕВОЙ ЮЗЕР:      │  │                      │  │            │  │
│  │  Разработчик        │  │  ЦЕЛЕВОЙ ЮЗЕР:       │  │  ПРОДУКТ:  │  │
│  │  своих агентов      │  │  DevOps / Platform   │  │  SaaS PAID │  │
│  │                     │  │  engineer            │  │            │  │
│  │  ПРИМЕРЫ:           │  │                      │  │  ЦЕЛЕВОЙ:  │  │
│  │  LangChain bot      │  │  ПРИМЕРЫ:            │  │  DPO/CTO/  │  │
│  │  CrewAI pipeline    │  │  Агент за MCP proxy  │  │  Compliance│  │
│  │  Custom Vercel AI   │  │  Агент с observable  │  │  Manager   │  │
│  │                     │  │  API traffic         │  │            │  │
│  │                     │  │                      │  │  ПРИМЕРЫ:  │  │
│  │                     │  │                      │  │  Intercom  │  │
│  │                     │  │                      │  │  ElevenLabs│  │
│  │                     │  │                      │  │  Stripe AI │  │
│  │                     │  │                      │  │  Notion AI │  │
│  └─────────────────────┘  └──────────────────────┘  └────────────┘  │
│           │                         │                      │         │
│           └─────────────┬───────────┘──────────────────────┘         │
│                         ▼                                            │
│              ┌─────────────────────┐                                 │
│              │  agent-manifest.json │  ← ОДИН И ТОТ ЖЕ ФОРМАТ       │
│              │  (Agent Passport)    │                                 │
│              └─────────────────────┘                                 │
│                         │                                            │
│                         ▼                                            │
│              ┌─────────────────────┐                                 │
│              │  F39: Agent Control  │  ← SaaS Dashboard: все агенты  │
│              │  Plane (org-wide)   │     организации в одном месте   │
│              └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Mode 1: AUTO (CLI, код доступен)** — `complior agent:init` сканирует код через AST. Автоматически определяет: framework, model, permissions, tools, human gates, logging, autonomy level, risk class. Разработчику остаётся только дозаполнить owner, disclosure text, review frequency через интерактивный wizard. Полнота автозаполнения: 85-95%. Это наш КЛЮЧЕВОЙ differentiator — никто больше не делает compliance identity из кода автоматически.

**Mode 2: SEMI-AUTO (Runtime наблюдение)** — для агентов, к коду которых нет прямого доступа, но которые проходят через нашу инфраструктуру. MCP Compliance Proxy (C.U01) перехватывает все tool calls → Complior видит какие tools вызываются, какие данные передаются, как часто, какие ошибки. AI Registry (C.040, 4,983 tools) обогащает данными: DPA status вендора, risk score, data residency. Полнота: 40-60%, остальное — wizard.

**Mode 3: MANUAL (SaaS Dashboard, код недоступен)** — Deployer заходит в SaaS Dashboard (F39 Agent Control Plane), нажимает "Add AI System", заполняет форму. Complior pre-fills что может из AI Registry: если deployer выбирает "Intercom Fin", Complior подтягивает из Registry: vendor info, risk score, DPA status, known capabilities, data residency. Deployer дозаполняет: owner, use case, autonomy level (по описанию), data access, constraints. Форма структурирована по Art.26 requirements — deployer проходит все обязательные поля. Полнота: 100% (manual), но без верификации через код.

### 2.1.2. Почему Mode 3 — это продаваемая ценность, а не костыль

Deployer по закону ОБЯЗАН документировать ВСЕ AI системы. Чужие в том числе. Сегодня он делает это в Excel. Complior SaaS Dashboard предлагает:

| Что сегодня (Excel) | Что даёт Complior |
|---------------------|-------------------|
| Свободная форма, у каждого своя | Стандартный формат, привязанный к Art.26/27 |
| Нет связи с реальными данными о вендоре | Pre-fill из AI Registry (4,983 tools) |
| Compliance status = "мы думаем что OK" | Risk Score по 5 категориям |
| Не знает требований закона | Форма покрывает все deployer obligations |
| Audit = паника и сбор документов | Audit Package (F42) = нажал кнопку |
| Статичная таблица | Живой Dashboard: alerts, drift, timeline |

**Целевой покупатель Mode 3:** DPO, Compliance Manager, CTO — человек, который отвечает за AI compliance организации. Ему нужен ПОЛНЫЙ реестр: и свои агенты (из CLI), и чужие AI-сервисы (из Dashboard). Одна картина.

### 2.1.3. Как Mode 1 + Mode 3 работают вместе

```
Организация: FinTech Startup (30 человек)

СВОИ АГЕНТЫ (Mode 1 — CLI):
  ├── loan-assessor        LangChain     L3  Score: 82  ← auto from code
  ├── fraud-detector       Custom Python L4  Score: 67  ← auto from code
  └── doc-generator        Vercel AI     L2  Score: 91  ← auto from code

ЧУЖИЕ AI-СЕРВИСЫ (Mode 3 — SaaS Dashboard):
  ├── Intercom Fin         Vendor SaaS   L4  Score: 78  ← manual + Registry
  ├── Stripe Radar         Vendor API    L5  Score: 85  ← manual + Registry
  ├── Notion AI            Vendor SaaS   L2  Score: 72  ← manual + Registry
  └── GitHub Copilot       Vendor IDE    L1  Score: 88  ← manual + Registry

ИТОГО: 7 AI систем, все в F39 Agent Control Plane
       → Audit Package (F42): 1 кнопка → полный пакет для регулятора
       → Регулятор: "Покажите реестр" → вот он
```

### 2.1.4. Что в формате меняется для разных modes

Формат `agent-manifest.json` **ОДИН И ТОТ ЖЕ** для всех трёх modes. Но добавляется поле `source`, которое показывает откуда данные:

```jsonc
{
  // ... identity, permissions, compliance — всё одинаковое ...

  "source": {
    "mode": "auto",                    // "auto" | "semi-auto" | "manual"
    "generated_by": "complior-cli",    // "complior-cli" | "complior-proxy" | "complior-saas"
    "code_analyzed": true,             // true только для Mode 1
    "runtime_observed": false,         // true для Mode 2
    "registry_enriched": true,         // true если данные из AI Registry
    "fields_auto_filled": [            // какие поля заполнены автоматически
      "permissions", "autonomy_level", "framework", "model"
    ],
    "fields_manual": [                 // какие поля заполнены вручную
      "owner", "disclosure", "constraints.budget"
    ],
    "confidence": 0.87,                // 0-1, насколько мы уверены в данных
    "source_files": [                  // пути к файлам агента (для file→agent mapping в TUI и compliance gate)
      "src/agents/order-agent.ts",
      "src/agents/order-tools.ts"
    ]
  }
}
```

`confidence` важен: Auto (0.85-0.95) > Semi-auto (0.40-0.60) > Manual (нет confidence — доверяем deployer'у, но помечаем что код не проверен). Аудитор видит разницу.

### 2.2. Формат agent-manifest.json

```jsonc
{
  // === IDENTITY ===
  "$schema": "https://complior.ai/schemas/agent-manifest/v1.json",
  "manifest_version": "1.0.0",
  "agent_id": "ag_7f3d8a2e-4b91-4c3f-a1e2-9d8f7c6b5e3a",  // UUID v4, crypto-random
  "name": "order-processor",
  "display_name": "Order Processing Agent",
  "description": "Processes customer orders, validates inventory, triggers shipping",
  "version": "2.1.0",                                        // semver
  "created": "2026-02-24T10:00:00Z",
  "updated": "2026-02-26T14:30:00Z",

  // === OWNERSHIP ===
  "owner": {
    "team": "backend-platform",
    "contact": "backend-team@company.com",
    "responsible_person": "Maria Schmidt"       // Art.26 EU AI Act: deployer accountability
  },

  // === TYPE & AUTONOMY ===
  "type": "autonomous",                         // autonomous | assistive | hybrid
  "autonomy_level": "L3",                       // L1-L5, see Section 2.3
  "autonomy_evidence": {
    "human_approval_gates": 2,
    "unsupervised_actions": 5,
    "no_logging_actions": 0,
    "auto_rated": true,
    "manual_override": null
  },

  // === TECH STACK ===
  "framework": "langchain",                     // langchain | crewai | anthropic | openai | vercel-ai | custom
  "model": {
    "provider": "anthropic",
    "model_id": "claude-sonnet-4-20250514",
    "deployment": "api",                         // api | self-hosted | edge
    "data_residency": "eu"                       // eu | us | global
  },

  // === PERMISSIONS (declared) ===
  "permissions": {
    "tools": [
      "db:read:orders",
      "db:read:customers",
      "db:read:inventory",
      "api:shipping:create",
      "email:send:order-confirmation"
    ],
    "data_access": {
      "read": ["orders", "customers", "inventory"],
      "write": ["orders", "shipments"],
      "delete": []
    },
    "denied": [
      "db:delete:*",
      "db:write:customers",
      "payments:refund_above_100",
      "access:hr_data",
      "modify:pricing"
    ],
    "mcp_servers": [
      {
        "name": "postgres",
        "tools_allowed": ["query"],
        "tools_denied": ["execute"]
      }
    ]
  },

  // === CONSTRAINTS ===
  "constraints": {
    "rate_limits": {
      "max_actions_per_minute": 100,
      "max_tool_calls_per_session": 500
    },
    "budget": {
      "max_cost_per_session_usd": 5.00,
      "max_cost_per_day_usd": 200.00,
      "max_cost_per_month_usd": 5000.00
    },
    "human_approval_required": [
      "refund",
      "delete_account",
      "escalation_to_manager"
    ],
    "prohibited_actions": [
      "access_hr_data",
      "modify_pricing",
      "send_marketing_email",
      "share_data_externally"
    ],
    "time_restrictions": null,                  // optional: { active_hours: "08:00-18:00 CET" }
    "geographic_restrictions": null              // optional: { regions: ["EU", "CH"] }
  },

  // === COMPLIANCE ===
  "compliance": {
    "eu_ai_act": {
      "risk_class": "limited",                  // prohibited | high | limited | minimal
      "applicable_articles": ["Art.50.1", "Art.50.2", "Art.12"],
      "deployer_obligations_met": ["Art.50.1", "Art.12"],
      "deployer_obligations_pending": ["Art.50.2"]
    },
    "jurisdictions": ["eu", "de"],
    "registered_in_inventory": true,
    "aiuc_1": {
      "status": "not_started",                 // not_started | in_progress | ready | certified
      "readiness_score": null,
      "last_assessment": null
    },
    "iso_42001": {
      "status": "not_applicable"
    },
    "complior_score": 74,
    "last_scan": "2026-02-26T14:30:00Z",
    "last_review": "2026-02-24T10:00:00Z"
  },

  // === DISCLOSURE ===
  "disclosure": {
    "user_facing": true,
    "disclosure_text": "This service uses AI to process your order. A human reviews refunds over €100.",
    "disclosure_location": "checkout_page_footer",
    "ai_marking": {
      "responses_marked": true,
      "method": "metadata_header"               // metadata_header | visible_label | c2pa | watermark
    }
  },

  // === LOGGING ===
  "logging": {
    "actions_logged": true,
    "log_destination": "complior_audit_trail",
    "retention_days": 365,
    "includes_input_hash": true,
    "includes_output_hash": true,
    "includes_decision_rationale": true
  },

  // === LIFECYCLE ===
  "lifecycle": {
    "status": "active",                         // draft | review | active | suspended | retired
    "deployed_since": "2026-01-15T00:00:00Z",
    "next_review": "2026-05-24T00:00:00Z",
    "review_frequency_days": 90,
    "change_history": [
      {
        "date": "2026-02-24T10:00:00Z",
        "change": "Added budget constraints",
        "by": "Marcus K."
      }
    ]
  },

  // === INTEROP (optional — bridges to other standards) ===
  "interop": {
    "a2a_agent_card_url": null,                 // link to A2A Agent Card if exists
    "oaf_agents_md": null,                      // link to AGENTS.md if exists
    "spiffe_id": null                           // SPIFFE identity if used
  },

  // === SOURCE FILES (optional — auto-filled from code analysis in Mode 1) ===
  // File paths belonging to this agent, used for file→agent mapping in TUI and compliance gate.
  "source_files": [
    "src/agents/order-agent.ts",
    "src/agents/order-tools.ts",
    "src/config/order-config.ts"
  ],

  // === UPSTREAM REGISTRY (optional — auto-filled from detected models in Mode 1) ===
  // Array of RegistryToolCard — карточки обнаруженных upstream AI-моделей/систем из реестра.
  // Тип: readonly RegistryToolCard[] | undefined
  // Структурно совместим с SaaS RegistryTool.
  "upstream_registry": [
    {
      "slug": "gpt-4o",
      "name": "GPT-4o",
      "provider": { "name": "OpenAI", "website": "https://openai.com/policies" },
      "riskLevel": "gpai_systemic",
      "assessments": { "eu-ai-act": { "training_cutoff": "2024-10", "license": "proprietary" } }
    }
  ],

  // === SIGNATURE ===
  "signature": {
    "algorithm": "ed25519",
    "public_key": "MCowBQYDK2VwAyEA...",
    "signed_at": "2026-02-26T14:30:00Z",
    "hash": "sha256:a1b2c3d4..."
  }
}
```

### 2.3. Шкала автономности L1-L5

| Level | Название | Поведение | EU AI Act Risk | Пример |
|-------|---------|-----------|---------------|---------|
| **L1** | Assistive | Предлагает. Человек решает И выполняет. | Minimal | Copilot autocomplete |
| **L2** | Suggestive | Готовит действие. Человек подтверждает. | Minimal-Limited | "Draft email ready. Send? [Y/n]" |
| **L3** | Supervised | Действует. Человек может отменить (veto window). | Limited | Order processor с 10-sec review |
| **L4** | Autonomous | Действует самостоятельно. Человек получает логи. | Limited-High | Customer support bot |
| **L5** | Fully Auto | Действует без уведомления. | High | Trading bot, autonomous recruiter |

**Авто-рейтинг** по AST-анализу кода:
- `human_approval_gates > 0` → L2-L3 signals
- `unsupervised_actions > 0 && logging == true` → L4 signals
- `unsupervised_actions > 0 && logging == false` → L5 risk signal
- Финальный рейтинг = weighted sum + conservative default (округляем вверх)

**Маппинг L → EU AI Act:**
- L1-L2 → Как правило, minimal/limited risk (но зависит от домена)
- L3 → Как правило, limited risk
- L4 → Limited/high (зависит от Annex III use case)
- L5 → Почти всегда high risk или prohibited (если в HR/legal/law enforcement)

### 2.4. Криптографическая подпись

Каждый manifest подписывается при генерации:

```
agent_id + permissions_hash + constraints_hash + compliance_hash + timestamp
→ ed25519 sign
→ signature.hash
```

Это позволяет:
- Верифицировать, что manifest не изменён: `complior agent:verify`
- Создать tamper-proof evidence chain для аудитора
- Отслеживать историю изменений (каждая новая подпись = новая версия)

---

## 3. КАК (User Experience)

### 3.1. Генерация

```bash
$ complior agent:init

🔍 Scanning project for AI agents...

Found 2 agents:
  1. ./agents/order-processor/   (LangChain, Python)
  2. ./agents/support-bot/       (Vercel AI SDK, TypeScript)

Generating passport for: order-processor

  Identity:       ag_7f3d8a2e... (order-processor)
  Framework:      LangChain 0.3.x
  Model:          claude-sonnet-4-20250514 (Anthropic API)
  Type:           autonomous
  Autonomy:       L3 (Supervised)
    ├── human_approval_gates: 2 (refund, delete_account)
    ├── unsupervised_actions: 5
    └── no_logging_actions: 0

  Permissions discovered:
    ✓ db:read (orders, customers, inventory)
    ✓ db:write (orders, shipments)
    ✓ api:shipping:create
    ✓ email:send
    ⚠ db:query (raw SQL — review recommended)

  EU AI Act:
    Risk class:    limited
    Articles:      Art.50.1, Art.50.2, Art.12
    Jurisdiction:  EU, DE

  Complior Score:  74/100

✅ Created ./agents/order-processor/agent-manifest.json
✅ Created ./agents/support-bot/agent-manifest.json

Next steps:
  complior agent:validate    ← check manifest completeness
  complior agent:diff        ← compare manifest vs actual code
  complior agent:test-gen    ← generate compliance tests
```

### 3.2. Интерактивный wizard (TUI)

Для полей, которые нельзя определить из кода (owner, disclosure_text, review_frequency), TUI показывает интерактивный wizard:

```
┌─────── Agent Passport: order-processor ───────┐
│                                                │
│  Owner team:     [backend-platform        ]    │
│  Contact:        [backend-team@company.com]    │
│  Responsible:    [Maria Schmidt           ]    │
│                                                │
│  Is this agent user-facing?  [●] Yes  [ ] No  │
│                                                │
│  Disclosure text:                              │
│  [This service uses AI to process your order.] │
│  [A human reviews refunds over €100.         ] │
│                                                │
│  Review frequency:                             │
│    [●] Every 90 days                           │
│    [ ] Every 180 days                          │
│    [ ] Custom: ___ days                        │
│                                                │
│        [ Generate Passport ]   [ Cancel ]      │
└────────────────────────────────────────────────┘
```

### 3.3. Headless (CI/CD)

```bash
# CI/CD: validate manifests exist and are complete
$ complior agent:validate --ci --strict
✅ 2/2 agents have valid passports
✅ All permissions declared
✅ All constraints enforced
⚠  support-bot: AIUC-1 readiness not started

# CI/CD: fail if manifest doesn't match code
$ complior agent:diff --ci --fail-on-drift
❌ EXIT 1: order-processor has 1 undeclared permission (db:query raw SQL)
```

### 3.4. Обновление при scan

Каждый `complior scan` обновляет `compliance` секцию manifests:

```
$ complior scan
...
📋 Updated agent passports:
  order-processor:  Score 74 → 78 (+4)
  support-bot:      Score 61 → 61 (no change)
```

### 3.5. SaaS Dashboard — Mode 3: Manual Passport (F39)

Для AI систем без доступа к коду. Deployer (DPO/CTO/Compliance Manager) заходит в Dashboard:

```
┌─────────────── Agent Control Plane ──────────────────────────────────┐
│                                                                       │
│  Your AI Systems (7)                            [+ Add AI System]     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Source │ Name             │ Type      │ L │ Score │ Status      │  │
│  │────────│──────────────────│───────────│───│───────│─────────────│  │
│  │ 🔧 CLI │ loan-assessor    │ LangChain │ L3│  82   │ ✅ Active  │  │
│  │ 🔧 CLI │ fraud-detector   │ Custom    │ L4│  67   │ ⚠ Review   │  │
│  │ 🔧 CLI │ doc-generator    │ Vercel AI │ L2│  91   │ ✅ Active  │  │
│  │ 🌐 SaaS│ Intercom Fin     │ Vendor    │ L4│  78   │ ✅ Active  │  │
│  │ 🌐 SaaS│ Stripe Radar     │ Vendor    │ L5│  85   │ ✅ Active  │  │
│  │ 🌐 SaaS│ Notion AI        │ Vendor    │ L2│  72   │ ✅ Active  │  │
│  │ 🌐 SaaS│ GitHub Copilot   │ Vendor    │ L1│  88   │ ✅ Active  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Org Compliance Score: 78/100    EU AI Act Readiness: 64%            │
│  High-risk systems: 2 (fraud-detector, Stripe Radar)                 │
│  Next review due: loan-assessor (Mar 15)                             │
│                                                                       │
│  [📦 Generate Audit Package]  [📊 Export Report]  [⚙ Settings]       │
└───────────────────────────────────────────────────────────────────────┘
```

При нажатии **[+ Add AI System]** — wizard в 5 шагов:

```
┌─────────── Add AI System (Step 1/5) ────────────┐
│                                                   │
│  What AI system are you adding?                   │
│                                                   │
│  Search: [Intercom           ]                    │
│                                                   │
│  Found in AI Registry:                            │
│  ┌───────────────────────────────────────────┐    │
│  │ 🟢 Intercom Fin                           │    │
│  │    AI customer support agent              │    │
│  │    Risk Score: 78  │  DPA: ✅  │  EU: ✅  │    │
│  │    Data residency: EU available           │    │
│  │    [Select]                               │    │
│  └───────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────┐    │
│  │ ⚪ Intercom (general platform)            │    │
│  │    Not AI-specific                        │    │
│  │    [Select]                               │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ☐ System not in registry — add manually          │
│                                                   │
│                          [Next →]                  │
└───────────────────────────────────────────────────┘
```

При выборе из Registry — auto-fill:

```
┌─────────── Add AI System (Step 2/5) ────────────┐
│                                                   │
│  Pre-filled from AI Registry: ✅                  │
│                                                   │
│  Name:           [Intercom Fin            ] 🔒    │
│  Vendor:         [Intercom, Inc.          ] 🔒    │
│  Type:           [● Vendor SaaS] [ ] API [ ] SDK  │
│  Category:       [Customer Support        ] 🔒    │
│                                                   │
│  Risk Score:     78/100 (from Complior Registry)  │
│  DPA available:  ✅ Yes                           │
│  Data residency: EU available                     │
│  AIUC-1:         Not certified                    │
│                                                   │
│  🔒 = from AI Registry, verified                  │
│                                                   │
│                     [← Back] [Next →]              │
└───────────────────────────────────────────────────┘
```

Шаги 3-5: Ownership (кто в вашей организации ответственный), Use Case (для чего используете, какие данные обрабатывает), Autonomy & Constraints (L1-L5, budget, human gates). Каждый шаг привязан к конкретным статьям EU AI Act — deployer видит "Art.26(1) requires..." рядом с каждым полем.

**Результат:** `agent-manifest.json` с `source.mode: "manual"`, сохранённый в SaaS, видимый в Agent Control Plane, включаемый в Audit Package.

#### Provider Documentation Received (Mode 3)

В Mode 3 wizard (Step 5) deployer отмечает какие документы получил от вендора:

```
Step 5/5: Provider Documentation Received

  From Intercom:
    ☑ DPA (Data Processing Agreement)
    ☑ Instructions for Use
    ☐ Model Card / System Card
    ☐ Bias Testing Report
    ☐ FRIA Input Data
    ☐ Third-party Audit Report
    ☐ ISO / AIUC-1 Certificate

  ℹ Community hint: 89% of deployers report receiving
    Instructions for Use from Intercom.
    [Request template email →]
```

Бинарный статус "received/not-received" анонимно агрегируется для **Community Evidence** (opt-out доступен). Агрегация отображается в AI Registry tool cards как дополнительный сигнал рядом с Public Documentation Grade. Community evidence НЕ влияет на Grade — Grade = только passive scan + vendor upload. Подробнее: `docs/UNIFIED-ARCHITECTURE.md` Section 10.

**Passport Visibility:** закрыт по умолчанию. Только org members видят passports. Opt-in публичность доступна (badge "AI Compliance tracked by Complior"). Подробнее: `docs/UNIFIED-ARCHITECTURE.md` Section 11.

### 3.6. Semi-Auto — Mode 2: MCP Proxy Observation

Когда MCP Compliance Proxy (C.U01) работает, он наблюдает tool calls агента в runtime:

```
$ complior proxy:start
🔌 MCP Compliance Proxy active. Observing 3 servers.

... (agent работает) ...

$ complior agent:init --from-proxy
🔍 Generating passport from runtime observations (last 7 days):

  Observed tool calls: 1,247
  Unique tools used: 8
  Data patterns: orders (read 847x), customers (read 312x), shipping (write 88x)
  Human gates triggered: 12 (refund, escalation)
  Errors: 3 (timeout on shipping API)
  Avg cost/session: $0.47

  Suggested autonomy: L3 (Supervised)
    evidence: 12 human gates in 1,247 calls = 1% human intervention rate

  ⚠ Cannot verify: source code not analyzed
  ⚠ Confidence: 0.55 (runtime-only, no code verification)

  Generating passport with source.mode = "semi-auto"...
✅ Created agent-manifest.json
```

---

## 4. ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### 4.1. Архитектура в системе Complior

```
                                    ┌─────────────────────┐
                                    │  TS Engine (Hono)    │
                                    │                      │
  complior agent:init ──HTTP──►     │  POST /agent/init    │
                                    │    │                  │
                                    │    ├─► AgentDiscovery │ ← C.F06: находит agents
                                    │    │     (AST scan)   │
                                    │    │                  │
                                    │    ├─► PermissionScanner │ ← C.S03: permissions
                                    │    │     (AST + heuristics)   │
                                    │    │                  │
                                    │    ├─► AutonomyRater  │ ← C.S02: L1-L5
                                    │    │     (gate analysis)      │
                                    │    │                  │
                                    │    ├─► RiskClassifier │ ← C.041: Annex III
                                    │    │                  │
                                    │    ├─► ManifestBuilder│ ← собирает JSON
                                    │    │                  │
                                    │    └─► CryptoSigner   │ ← ed25519
                                    │                      │
                                    │  → agent-manifest.json│
                                    └─────────────────────┘
```

### 4.2. Обнаружение агентов (опирается на C.F06)

Что ищем в AST и файловой системе:

| Signal | Что ищем | Framework |
|--------|---------|-----------|
| LangChain agent | `AgentExecutor`, `create_react_agent`, `langgraph` imports | LangChain |
| CrewAI agent | `Agent()`, `Crew()`, `crewai.yaml` | CrewAI |
| Anthropic agent | `anthropic.messages.create` с tool_use, `@anthropic/sdk` | Claude SDK |
| OpenAI agent | `openai.chat.completions.create` с functions/tools | OpenAI |
| Vercel AI agent | `generateText` с tools, `streamText` | Vercel AI SDK |
| AutoGen agent | `AssistantAgent`, `UserProxyAgent` | AutoGen |
| Custom | Heuristics: loop + LLM call + tool dispatch | Any |
| Config-based | `crewai.yaml`, `n8n workflow.json`, `langgraph` config | Various |

### 4.3. Обнаружение permissions

AST-анализ кода агента → `discovered-permissions.json`:

```typescript
// Что парсим:
// 1. Tool definitions
const tools = extractToolDefinitions(ast); // tool_call, function_call, @tool decorator
// 2. Data access
const dataAccess = extractDataAccess(ast); // db.query, model.findMany, fetch(url)
// 3. API calls
const apiCalls = extractAPICalls(ast);     // fetch, axios, httpClient
// 4. Human gates
const gates = extractHumanGates(ast);      // confirm(), approve(), require_approval
// 5. Logging
const logging = extractLogging(ast);       // console.log, logger, audit_trail
// 6. Error handling
const errors = extractErrorHandling(ast);  // try/catch, fallback, circuit_breaker
```

### 4.4. JSON Schema (для валидации)

Публикуемый JSON Schema позволяет IDE-автокомплит, CI-валидацию, и сторонним инструментам читать manifest:

```
https://complior.ai/schemas/agent-manifest/v1.json
```

Валидация: `ajv` (JSON Schema Draft 2020-12). Required fields: agent_id, name, type, autonomy_level, permissions, compliance.

### 4.5. Хранение

```
project-root/
├── .complior/
│   ├── config.toml              # existing Complior config
│   └── evidence/                # evidence chain (C.R20)
├── agents/
│   ├── order-processor/
│   │   ├── agent.py             # agent code
│   │   └── agent-manifest.json  # ← AGENT PASSPORT
│   └── support-bot/
│       ├── index.ts
│       └── agent-manifest.json  # ← AGENT PASSPORT
```

Альтернативная структура (monorepo): `.complior/agents/order-processor.manifest.json`

---

## 5. СВЯЗЬ С ДРУГИМИ ФИЧАМИ

### Прямые зависимости (Passport → X)

| Фича | Что берёт из Passport | Sprint |
|------|----------------------|--------|
| **C.S02** Autonomy Rating | `autonomy_level`, `autonomy_evidence` — Passport содержит L1-L5 | S04 |
| **C.S03** Permission Scanner | `permissions.discovered` vs `permissions.declared` — diff | S05 |
| **C.S04** Behavior Contract | Passport = identity, Contract = runtime enforcement policy | S05 |
| **C.S07** Manifest Validate | Проверяет полноту и корректность passport | S04 |
| **C.F14** Agent Compliance Score | Score per agent, хранится в `compliance.complior_score` | S05 |
| **C.R12** `compliorAgent()` SDK | SDK загружает passport → enforces permissions + budget runtime | S04 |
| **C.T01** AIUC-1 Readiness | `compliance.aiuc_1` секция → readiness per agent | S05 |

### Обратные зависимости (X → Passport)

| Фича | Что передаёт в Passport |
|------|------------------------|
| **C.012** Scanner | Compliance checks → updates `compliance.complior_score` |
| **C.041** Risk Classifier | → updates `compliance.eu_ai_act.risk_class` |
| **C.F06** Agent Discovery | Находит agents → triggers passport generation |
| **C.R20** Evidence Chain | Подписывает manifest → adds to tamper-proof chain |

### Кросс-проект (CLI ↔ SaaS)

| SaaS Feature | Как использует Passport | Direction |
|-------------|----------------------|-----------|
| **F03** AI Tool Inventory (DONE) | Pre-fill данных при Mode 3 manual passport | SaaS → Passport |
| **F26** Registry API (DONE) | 4,983 tools → vendor info, DPA, risk score для pre-fill | SaaS → Passport |
| **F39** Agent Control Plane | Визуализирует ВСЕ passports: и CLI (auto), и SaaS (manual). Единый реестр. | CLI → SaaS, SaaS хранит |
| **F40** Cert Readiness | Агрегирует `compliance.aiuc_1` из всех passports | Passport → SaaS |
| **F42** Audit Package | Включает все passports как evidence в audit ZIP | Passport → SaaS |
| **F38** Public Risk Registry | Vendor self-service → may provide data for Mode 3 pre-fill | SaaS → Passport |

**Data flow:**
```
CLI (Mode 1: auto) ──POST /v1/tui/agents──► SaaS DB ──► F39 Dashboard
                                                ▲
SaaS Dashboard (Mode 3: manual) ────────────────┘
                                                ▲
AI Registry (F26: 4,983 tools) ─── pre-fill ────┘
```

---

## 6. КОНКУРЕНТЫ И ОТЛИЧИЯ

| Подход | Что делает | Чего НЕ делает | Complior Passport |
|--------|-----------|---------------|-------------------|
| **A2A Agent Card** | Identity + capabilities + auth + endpoint | Compliance, risk class, budget, permissions enforcement, autonomy level | Включает всё + compliance layer + autonomy + constraints + signature |
| **OAF (AGENTS.md)** | Instructions для coding agents | Compliance, runtime identity, permissions, lifecycle | Другой use case — OAF = "как агент работает", Passport = "кто агент и что ему можно" |
| **NIST Concept Paper** | Identification + authorization + delegation + logging | Ещё нет формата. Concept paper. Due April 2. | Complior = implementation СЕЙЧАС. Можно submit как input к NIST. |
| **Microsoft Agent Manifest** | Tool metadata + skill definitions для Security Copilot | Только для Copilot ecosystem. Нет compliance. | Vendor-neutral, compliance-first |
| **Agent Skills Standard** | Behavioral contracts для coding agents | Нет identity, permissions, compliance | Complementary — Skills = behavior, Passport = identity |
| **Holistic AI / Credo AI** | Governance dashboards | Нет agent-level granularity, нет код-уровень | Complior = per-agent, from code |

**Ключевое отличие:** Все существующие форматы фокусируются на **interoperability** (как агенты общаются) или **instructions** (как агент работает). Никто не решает **compliance identity** (кто агент, что ему можно, и соответствует ли он законам).

**Реальный конкурент — Excel.** Большинство компаний ведут AI inventory в Excel/Confluence/Notion. Это не работает для аудита, не обновляется автоматически, не привязано к закону. Но это привычно. Complior должен быть проще Excel — а не сложнее.

---

## 7. СТРАТЕГИЧЕСКИЙ ВЕКТОР

### 7.1. Стать де-факто стандартом

Если Agent Passport станет тем, что разработчики генерируют для своих агентов:

1. **Открытый формат:** JSON Schema публикуется на complior.ai/schemas + GitHub. Любой может использовать без Complior.
2. **NIST submission:** Подать Agent Passport как input к NIST AI Agent Identity Concept Paper (deadline: 2 Apr 2026). 5 недель.
3. **AIUC-1 bridge:** Маппинг Agent Passport → AIUC-1 evidence. "Complior Passport → 40% of AIUC-1 evidence done."
4. **A2A interop:** Опциональное поле `interop.a2a_agent_card_url`. Passport — superset A2A Agent Card.
5. **npm package:** `@complior/agent-manifest` — standalone validator. Работает без Complior CLI. Viral distribution.
6. **GitHub Action:** `complior/validate-agent-passport` — PR check. Badge.

### 7.2. Два воронки → одна платформа

**Воронка 1: Bottom-up (Developer → CLI → SaaS)**
```
Developer uses complior agent:init (FREE, Mode 1)
  → Agent Passport for own agents
    → Sees compliance score, AIUC-1 readiness
      → Tells CTO: "We need org-wide view"
        → CTO buys SaaS Growth (€149/мес)
          → Adds vendor AI systems (Mode 3)
            → Full AI inventory → Audit Package → cert readiness
```

**Воронка 2: Top-down (DPO/CTO → SaaS → CLI)**
```
DPO/CTO needs to comply with EU AI Act Art.26 (deadline Aug 2, 2026)
  → Buys SaaS to create AI inventory (Mode 3 manual)
    → Registers vendor AI systems via Dashboard
      → Sees: "3 systems have code — install CLI for auto-scan"
        → Dev team installs CLI → Mode 1 auto passports
          → Full inventory: auto + manual → better scores → cert ready
```

Обе воронки конвергируют в F39 Agent Control Plane — единый реестр ВСЕХ AI систем организации.

### 7.3. Network effects

- Каждый manifest = 1 agent в нашей статистике → "State of AI Agent Compliance 2026" report
- Vendors видят passport → хотят "Complior Verified" badge (F38)
- Аудиторы видят format → требуют его от клиентов
- NIST picks up format → industry standard

---

## 8. ACCEPTANCE CRITERIA

### 8.1. Must Have — CLI (Sprint S04)

- [ ] `complior agent:init` генерирует `agent-manifest.json` из AST-анализа кода (Mode 1)
- [ ] Поддержка фреймворков: LangChain, CrewAI, Anthropic SDK, OpenAI SDK, Vercel AI SDK
- [ ] Авто-определение L1-L5 autonomy level из кода
- [ ] Авто-определение permissions из tool definitions и data access patterns
- [ ] Интерактивный wizard для полей, которые нельзя определить из кода (owner, disclosure, review)
- [ ] `complior agent:validate` проверяет полноту manifest (required fields)
- [ ] `complior agent:validate --ci` возвращает exit code 0/1 для CI/CD
- [ ] ed25519 подпись manifest при генерации
- [ ] `complior agent:verify` проверяет подпись
- [ ] JSON Schema опубликован и доступен для валидации
- [ ] Headless mode: `complior agent:init --non-interactive --owner "team" --contact "email"`
- [ ] Manifest обновляется автоматически при `complior scan` (score, risk_class, last_scan)
- [ ] Поле `source` в manifest: mode, generated_by, confidence, fields_auto/manual

### 8.2. Must Have — SaaS (Sprint S09, часть F39)

- [ ] Dashboard: "Add AI System" wizard — Mode 3 manual passport
- [ ] Pre-fill из AI Registry (F26) при выборе известного vendor tool
- [ ] Форма структурирована по EU AI Act Art.26 deployer obligations
- [ ] CLI passports (Mode 1) передаются через POST /v1/tui/agents → видны в Dashboard
- [ ] Единый Agent Control Plane: CLI passports + SaaS passports в одном реестре
- [ ] Export: все passports → Audit Package (F42)
- [ ] `source.mode` видим в Dashboard — пользователь понимает откуда данные

### 8.3. Should Have (Sprint S04-S05)

- [ ] Multi-agent: `complior agent:init` обнаруживает и генерирует passports для всех agents в проекте
- [ ] TUI sidebar: passport summary widget (identity, score, L-level, status)
- [ ] `complior agent:list` — таблица всех agents с passports
- [ ] `complior agent:export --format a2a` — экспорт в A2A Agent Card формат
- [ ] npm package `@complior/agent-manifest` — standalone validator
- [ ] Version history в manifest (change_history array)
- [ ] MCP server tool: `validate_agent_passport` — для использования из Cursor/Claude Code
- [ ] `complior agent:init --from-proxy` — Mode 2 semi-auto из MCP Proxy observations

### 8.3. Nice to Have (S05+)

- [ ] GitHub Action `complior/validate-agent-passport`
- [ ] Badge: "Agent Passport ✓" для README
- [ ] Import from A2A Agent Card → pre-fill passport
- [ ] Import from AGENTS.md / OAF → pre-fill passport
- [ ] QR code on passport (links to verification page)

---

## 9. МЕТРИКИ УСПЕХА

| Метрика | Target (3 мес) | Target (6 мес) |
|---------|---------------|----------------|
| **CLI Mode 1** passports generated | 500 | 5,000 |
| **SaaS Mode 3** passports created | 50 | 500 |
| Orgs with BOTH CLI + SaaS passports | 10 | 50 |
| % of Complior CLI users using passport | 30% | 60% |
| Average AI systems per org (CLI+SaaS) | 3 | 7 |
| npm downloads `@complior/agent-manifest` | 200/week | 1,000/week |
| NIST submission accepted as input | ✓ (Apr 2026) | — |
| AIUC-1 auditors referencing passport | — | 3+ auditors |
| GitHub stars on schema repo | 100 | 500 |
| **SaaS conversion from passport** (free→paid) | 5% | 12% |

---

## 10. РИСКИ

| Риск | Вероятность | Impact | Mitigation |
|------|-------------|--------|-----------|
| NIST выпустит свой формат, несовместимый | Средняя | Высокий | Submit рано. Быть contributor. Добавить `interop.nist` поле. |
| A2A Agent Card станет de facto standard для identity | Средняя | Средний | Passport = superset A2A. Export to A2A. Complementary, not competing. |
| Разработчики не хотят ещё один JSON | Высокая | Средний | Генерируется автоматически за 5 секунд. Не нужно писать вручную. Ценность = compliance score + L-level сразу. |
| AST-анализ не покрывает все frameworks | Средняя | Средний | Начать с top 5 + fallback на heuristics + manual override. |
| Формат будет меняться (v1 → v2) | Высокая | Низкий | Semver в manifest_version. Migration tool `complior agent:migrate`. |
| Mode 3 (manual) воспринимается как "просто форма" — нет wow | Высокая | Высокий | Pre-fill из Registry = magic. Привязка к Art.26 = юридическая ценность. Audit Package = 1 кнопка. Конкурент = Excel, а не другой SaaS. |
| Deployers не знают что обязаны вести AI inventory | Средняя | Высокий | Контент-маркетинг: "EU AI Act Deployer Obligations Checklist". Penalty Calculator (F23, DONE) как entry point. Дедлайн 2 Aug 2026 создаёт urgency. |
| CLI и SaaS passports рассинхронизируются | Средняя | Средний | CLI upload → SaaS = source of truth. Conflict resolution: CLI always wins для code-analyzed fields. |

---

## 11. TIMELINE

```
CLI (Sprint S04):
  Неделя 1:  Schema v1 + ManifestBuilder + CryptoSigner + source field
  Неделя 2:  AgentDiscovery integration + PermissionScanner (top 3 frameworks)
  Неделя 3:  AutonomyRater + TUI wizard + headless mode
  Неделя 4:  agent:validate + agent:verify + CI mode + tests
             JSON Schema publish + npm @complior/agent-manifest

SaaS (Sprint S09, часть F39 Agent Control Plane):
  Неделя 1:  POST /v1/tui/agents endpoint — CLI passports → SaaS DB
  Неделя 2:  "Add AI System" wizard — Mode 3, 5-step form, Art.26 mapping
  Неделя 3:  AI Registry pre-fill integration (F26 data → wizard auto-complete)
  Неделя 4:  Agent Control Plane unified view: CLI + SaaS passports
             Export to Audit Package (F42)
```

---

**Обновлено:** 2026-02-26 v1.1 — добавлена трёхмодельная архитектура (auto/semi-auto/manual), SaaS Mode 3 UX, EU AI Act Art.26 framing, SaaS acceptance criteria
