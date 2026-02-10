# 🦞 AI Act Compliance Platform — Dev Team Specification
## OpenClaw Multi-Agent Development Team (v7.2)

**Дата:** 06.02.2026
**Платформа:** OpenRouter (единый API-ключ) + OpenClaw (оркестрация)
**Endpoint:** `https://openrouter.ai/api/v1`
**Команда:** 7 активных агентов (4 деактивированы — см. changelog)
**Управление:** Alex (Kimi K2.5) — Execution Master, Marcus (Opus 4.6) — Planning Master
**Коммуникация:** Персональные DM + групповой чат «🦞 Dev Team»
**Методология:** Scrum (Product Owner → Sprint Planning → Sprint → Review → Approval)
**Режим работы:** Максимальная автономность между Approval Gates

---

# ⚡ v7.2 CHANGELOG (06.02.2026)

## 1. Команда: 11 → 7 активных агентов

**Активные (7):**
| Agent | Role | Model (OpenRouter ID) | $/1M In/Out | Context |
|-------|------|-----------------------|-------------|---------|
| Alex | Orchestrator | Kimi K2.5 (`moonshotai/kimi-k2.5`) | $0.45/$2.50 | 262K |
| Marcus | CTO/Architect | **Claude Opus 4.6** (`anthropic/claude-opus-4.6`) | $5/$25 | 1M |
| Max | Backend **+ QA** | GPT-5.2 Codex (`openai/gpt-5.2-codex`) | $1.75/$14 | 400K |
| Nina | Frontend **+ UX** | **Claude Opus 4.6** (`anthropic/claude-opus-4.6`) | $5/$25 | 1M |
| Elena | AI Act Expert | Gemini 3 Flash (`google/gemini-3-flash-preview`) | $0.50/$3 | 1M |
| Leo | SecOps | **Gemini 3 Pro** (`google/gemini-3-pro-preview`) | $2/$12 | 1M |
| Ava | Researcher | Gemini 3 Pro (`google/gemini-3-pro-preview`) | $2/$12 | 1M |

**Деактивированные (4):**
| Agent | Причина | Реактивация |
|-------|---------|-------------|
| Quinn (QA) | QA merged в Max — разработчик пишет свои тесты | Sprint 3+ |
| Kai (UX) | UX merged в Nina — фронтендер делает wireframes + код | Сложные UX flows |
| Diana (Docs) | Нет работы для Sprint 1-2 | API docs приоритет |
| Derek (DevOps) | CI/CD уже настроен, нет работы | Docker/k8s деплой |

## 2. Обновлённые модели

| Agent | Было (v7.1) | Стало (v7.2) | Причина |
|-------|-------------|--------------|---------|
| Marcus | Opus 4.5 | **Opus 4.6** | Та же цена, 5x контекст (1M), SWE-bench 80.8% |
| Nina | GPT-5.2 Codex | **Opus 4.6** | #1 по бенчмаркам и для дизайна И для фронтенд-кода (LFG 9.25/10) |
| Leo | DeepSeek V3.2 | **Gemini 3 Pro** | DeepSeek имеет задокументированные проблемы безопасности — неприемлемо для EU AI Act security reviewer |
| Alex | Kimi K2.5 (без fallback) | Kimi K2.5 + **fallback: Gemini 3 Flash** | Устранение single point of failure |

## 3. Workflow изменения

### 3a. PR merge: Marcus мержит (не PO)
- **Было:** Developer PR → Marcus review → Leo security → **PO мержит**
- **Стало:** Developer PR → Marcus review + Leo security (**ПАРАЛЛЕЛЬНО**) → **Marcus мержит в develop**
- PO только мержит develop → main (release gate)

### 3b. Параллельный review
- **Было:** Последовательно: Marcus review → Leo security (блокирующий)
- **Стало:** Marcus и Leo стартуют review одновременно при создании PR

### 3c. Scrum Board: 5 → 4 колонки
- **Было:** Sprint Backlog → To Do → Doing → Testing → Done
- **Стало:** Sprint Backlog → To Do → Doing → Done
- Testing — часть "Doing" (разработчик пишет тесты как часть задачи)

### 3d. Leo: фокус на code-level security
- CI уже запускает: npm audit, Snyk, lint, type-check
- Leo фокусируется на: SQL injection patterns, auth bypass, XSS, IDOR, race conditions
- Не дублирует автоматизированные проверки

### 3e. File ownership (предотвращение конфликтов)
| File | Writer | Read-only |
|------|--------|-----------|
| SPRINT-BOARD.md, BURNDOWN.md | Alex | Все |
| SPRINT-BACKLOG.md | Marcus (create), Alex (status) | Все |
| ARCHITECTURE.md, DATABASE.md, CODING-STANDARDS.md | Marcus | Все |
| AI-ACT-KB.md | Elena (Ava can append) | Все |
| RESEARCH-LOG.md | Ava | Все |
| SECURITY-POLICY.md | Leo | Все |

## 4. Бюджет: ~$160-255/мес (было $170-260 для 11 агентов)

## 5. openclaw.json обновлён
- Удалены Quinn, Kai, Diana, Derek из agents.list и bindings
- Обновлены model IDs для Marcus, Nina, Leo
- Добавлен fallback для Alex
- memorySearch.extraPaths включает knowledge-base

---

> **Ниже — оригинальный спек v7.1. Где v7.2 changelog конфликтует с разделами ниже — v7.2 имеет приоритет.**

---

# ЧАСТЬ 1: ОБЗОР АРХИТЕКТУРЫ

## 1.1 Что строим

**Продукт:** Self-service SaaS платформа для EU SMB — подготовка AI-систем к EU AI Act
**Инструмент разработки:** OpenClaw — нативная оркестрация 11 AI-агентов через Telegram
**Целевой рынок:** DACH (Deutschland, Austria, Schweiz) SMB, 10-250 сотрудников

### 1.1.1 Два периметра: Dev Team vs Product Team

```
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│    🛠️ КОМАНДА РАЗРАБОТКИ          │    │    🚀 ПРОДУКТ (SaaS)             │
│    ← ЭТОТ ДОКУМЕНТ               │    │    ← ОТДЕЛЬНЫЙ СПЕК (будущее)    │
│                                  │    │                                  │
│  Технологии:                     │    │  Технологии:                     │
│  • OpenRouter API (все модели)   │    │  • Mistral API (EU sovereign)    │
│  • GPT-5.2-Codex (senior code)  │    │  • Self-hosted OSS (GDPR)        │
│  • Claude Opus 4.5 (brain)       │    │  • НЕ OpenClaw — отдельный стек  │
│  • Claude Sonnet 4.5 (UX)       │    │                                  │
│  • Kimi K2.5 (orchestration)    │    │  Агенты (будущие):               │
│  • DeepSeek V3.2 (bulk code)    │    │  Ева — AI-консультант            │
│  • Gemini 3 (research + docs)   │    │  Classifier — риск-классификатор │
│                                  │    │  Doc Writer — генератор доков    │
│  Агенты (11):                    │    │  Auditor — комплаенс-аудит      │
│  Alex — Оркестратор (NEW)        │    │  Quick Tasks — быстрые задачи   │
│  Marcus — CTO & Архитектор       │    │                                  │
│  Max — Senior Backend            │    │  ⚖️ EU-суверенность:             │
│  Nina — Senior Frontend          │    │  ВСЕ клиентские данные → Mistral │
│  Kai — UX Designer               │    │  ВСЕ PII → EU-only серверы      │
│  Ava — Researcher (NEW)         │    │  US CLOUD Act НЕ применяется     │
│  Leo — SecOps (CHANGED)         │    │                                  │
│  Elena — AI Act Expert           │    │                                  │
│  Quinn — QA                      │    │                                  │
│  Diana — Documentation           │    │                                  │
│  Derek — DevOps                  │    │                                  │
├──────────────────────────────────┤    ├──────────────────────────────────┤
│  Пик: месяцы 1-4 (build)        │    │  Старт: месяц 5                 │
│  Потом: поддержка + фичи        │    │  Рост: месяцы 5-24              │
└──────────────────────────────────┘    └──────────────────────────────────┘

⚠️ ГРАНИЦА (ОБЯЗАТЕЛЬНА):
├── Dev Team НИКОГДА не обрабатывает реальные клиентские данные
├── Product Team НИКОГДА не использует Claude/GPT API (US providers)
├── Модели для Product Team: Mistral Large/Medium/Small + Devstral
├── Инфраструктура Product Team: EU-only (Hetzner DE / Scaleway FR)
└── Общее: GitHub repo, docs/, архитектурные решения
```

> **Этот документ покрывает ТОЛЬКО Dev Team.**
> Product Team будет описана в отдельном спеке после MVP (месяц 5).

## 1.2 Команда из 11 агентов

```
                         ┌─────────────────────────────┐
                         │        👤 ЧЕЛОВЕК            │
                         │   (user story / баг / фича)  │
                         └─────┬──────────────┬────────┘
                               │              │
                    DM (любой агент)    📱 Группа «🦞 Dev Team»
                    Founder Override    (все 11 ботов + Фаундер)
                               │              │
                               ▼              │
                    ┌───────────────────────────────────────┐
                    │           🎯 ALEX (Оркестратор)       │
                    │         Kimi K2.5 — Точка входа       │
                    │   $0.50/$2.80  ·  262K  ·  Tier ORK   │
                    │   Heartbeat model: Claude Haiku 4.5   │
                    │   Sprint: нетех.задачи + трекинг      │
                    └───────┬───────┬────────┬──────────────┘
                            │       │        │
           ┌────────────────┤       │        ├─────────────────┐
           ▼                ▼       ▼        ▼                 ▼
   ┌──────────────┐ ┌──────────────────────────────────┐  ┌──────────────┐
   │ 🧠 MARCUS    │ │       SENIOR TEAM (Tier 1)        │  │ 🔍 AVA       │
   │ CTO/Architect│ │                                    │  │ Researcher   │
   │ Opus 4.5     │ │  MAX      ·  NINA     ·  KAI      │  │ Gemini 3 Pro │
   │ $5/$25       │ │ GPT-5.2     GPT-5.2     Sonnet    │  │ $2/$12       │
   │ Tier 0       │ │  Codex       Codex       4.5      │  │ Tier 1.5     │
   │ ⚡ <15% задач│ │ $1.75/$14  $1.75/$14   $3/$15    │  │              │
   └──────────────┘ │ Tier 1     Tier 1      Tier 1     │  └──────────────┘
                    └──────────────────────────────────┘
                                    │
           ┌──────────┬─────────────┼──────────┬──────────┐
           ▼          ▼             ▼          ▼          ▼
   ┌────────────┐┌────────────┐┌────────────┐┌─────────────┐┌────────────┐
   │ 🔒 LEO     ││ ⚡ QUINN   ││ ⚡ DEREK   ││ ⚡ ELENA     ││ ⚡ DIANA   │
   │ SecOps     ││ QA         ││ DevOps     ││ AI Act Exp.  ││ Docs       │
   │ DS V3.2    ││ DS V3.2    ││ DS V3.2    ││ Gem 3 Flash  ││ Gem 3 Flash│
   │ $0.25/$0.38││ $0.25/$0.38││ $0.25/$0.38││ $0.50/$3.00  ││ $0.50/$3.00│
   │ Tier 2     ││ Tier 2     ││ Tier 2     ││ Tier 2       ││ Tier 2     │
   └────────────┘└────────────┘└────────────┘└─────────────┘└────────────┘

         ВСЕ агенты пишут статус в группу «🦞 Dev Team»
         Агенты self-assign задачи из SPRINT-BACKLOG.md
```

| # | Агент | Роль | Модель | OpenRouter ID | In $/1M | Out $/1M | Контекст | Tier | Статус v6 |
|---|-------|------|--------|---------------|---------|----------|----------|------|-----------|
| 1 | **Alex** | Оркестратор | Kimi K2.5 | `moonshotai/kimi-k2.5` | $0.50 | $2.80 | 262K | ORK | 🆕 НОВЫЙ |
| 2 | **Marcus** | CTO / Архитектор | Claude Opus 4.5 | `anthropic/claude-opus-4.5` | $5.00 | $25.00 | 200K | 0 | ✅ Без изменений |
| 3 | **Max** | Senior Backend | GPT-5.2-Codex | `openai/gpt-5.2-codex` | $1.75 | $14.00 | 400K | 1 | 🔄 Opus → Codex |
| 4 | **Nina** | Senior Frontend | GPT-5.2-Codex | `openai/gpt-5.2-codex` | $1.75 | $14.00 | 400K | 1 | 🔄 Sonnet → Codex |
| 5 | **Kai** | UX Designer | Claude Sonnet 4.5 | `anthropic/claude-sonnet-4.5` | $3.00 | $15.00 | 1M | 1 | ✅ Без изменений |
| 6 | **Ava** | Researcher | Gemini 3 Pro | `google/gemini-3-pro-preview` | $2.00 | $12.00 | 1M | 1.5 | 🆕 НОВЫЙ |
| 7 | **Leo** | SecOps | DeepSeek V3.2 | `deepseek/deepseek-v3.2` | $0.25 | $0.38 | 164K | 2 | 🔄 Dev → SecOps |
| 8 | **Elena** | AI Act Expert | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | 2 | 🔄 Qwen3 → API |
| 9 | **Quinn** | QA | DeepSeek V3.2 | `deepseek/deepseek-v3.2` | $0.25 | $0.38 | 164K | 2 | 🔄 Qwen3 → API |
| 10 | **Diana** | Tech Writer | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | 2 | 🔄 Qwen3 → API |
| 11 | **Derek** | DevOps | DeepSeek V3.2 | `deepseek/deepseek-v3.2` | $0.25 | $0.38 | 164K | 2 | 🔄 Qwen3 → API |

> **Ключевые изменения v5 → v6:**
> - Инфраструктура: Anthropic API + Ollama local → **OpenRouter** (один ключ, все модели)
> - Оркестрация: Marcus координирует вручную → **Alex (Kimi K2.5)** автоматическая оркестрация
> - Ресёрч: нет → **Ava (Gemini 3 Pro)** с grounding и 1M контекстом
> - Leo: Dev (Workhorse) → **SecOps** (безопасность систем, БД, код-аудит)
> - Вся разработка: Max + Nina (оба на GPT-5.2-Codex), нет отдельного Tier 2 разработчика
> - Tier 2 модели: Qwen3 local (CPU, медленно) → **DeepSeek V3.2 / Gemini 3 Flash API** (мгновенно)
> - Heartbeat: **только Alex** на дешёвой Haiku → Alex дёргает остальных
> - Память: только sessions → **полная система**: MEMORY.md + daily logs + shared knowledge base + vector search

## 1.3 Tier-система

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER ORK: 🎯 ORCHESTRATOR                       │
│                     Kimi K2.5 via OpenRouter ($0.50/$2.80)          │
│                     Heartbeat model: Claude Haiku 4.5               │
│                                                                      │
│   Alex (Оркестратор)                                                │
│   ├── Точка входа для ВСЕХ задач от человека                        │
│   ├── Декомпозиция, маршрутизация, сбор результатов                 │
│   ├── sessions_spawn для делегирования агентам                      │
│   └── Heartbeat: Haiku мониторит Alex каждые 30 мин, Alex дёргает остальных │
│                                                                      │
│                ~$15-25/мес (дешёвая модель + Haiku heartbeat)        │
├─────────────────────────────────────────────────────────────────────┤
│                     TIER 0: 🧠 BRAIN                                │
│                     Claude Opus 4.5 via OpenRouter ($5/$25)         │
│                                                                      │
│   Marcus (CTO)                                                      │
│   ├── Архитектура, ADR, структура БД, data flows                    │
│   ├── Code review критических PR                                    │
│   ├── Task breakdown, спринты, приоритеты                           │
│   └── Арбитраж технических споров                                   │
│                                                                      │
│                ~$45-70/мес (effort: low по умолчанию)                │
├─────────────────────────────────────────────────────────────────────┤
│                     TIER 1: 🎯 SENIOR                               │
│                     GPT-5.2-Codex ($1.75/$14) + Sonnet 4.5 ($3/$15)│
│                                                                      │
│   Max (Senior Backend)  Nina (Senior Frontend)  Kai (UX Designer)  │
│   ├── ВСЯ разработка     ├── ВСЯ разработка     ├── Wireframes     │
│   │   бэкенда: API,      │   фронтенда: React,  │   Design system  │
│   │   БД, логика,        │   Next.js, UI,        │   User flows     │
│   │   рефакторинг        │   state, a11y         │   Прототипы      │
│   └── GPT-5.2-Codex      └── GPT-5.2-Codex      └── Sonnet 4.5    │
│                                                                      │
│                ~$25-40/мес                                           │
├─────────────────────────────────────────────────────────────────────┤
│                     TIER 1.5: 🔍 SPECIALIST                         │
│                     Gemini 3 Pro via OpenRouter ($2/$12)            │
│                                                                      │
│   Ava (Researcher)                                                  │
│   ├── Веб-ресёрч, анализ документации, API, библиотек               │
│   ├── Мониторинг AI Act изменений (совместно с Elena)               │
│   ├── Grounding (поиск в интернете), 1M контекст                   │
│   └── Сравнительные обзоры, best practices                          │
│                                                                      │
│                ~$10-20/мес                                           │
├─────────────────────────────────────────────────────────────────────┤
│                     TIER 2: ⚡ WORKHORSE                             │
│                     DeepSeek V3.2 ($0.25/$0.38) / Gem Flash ($0.50/$3)│
│                                                                      │
│   Leo (SecOps)    Quinn (QA)     Derek (DevOps)                    │
│   ├── Security     ├── Unit tests  ├── CI/CD                       │
│   │   audit кода   ├── E2E tests   ├── Docker                      │
│   │   SQL inj,     ├── Coverage    ├── Monitoring                  │
│   │   XSS, CSRF    └── Validation  └── Deploy                     │
│   │   Конфиг БД                                                     │
│   └── DS V3.2      DS V3.2        DS V3.2                          │
│                                                                      │
│   Elena (AI Act)       Diana (Docs)                                │
│   ├── AI Act KB         ├── API docs, README                       │
│   ├── Risk rules        ├── Compliance docs                        │
│   └── Gem 3 Flash       └── Gem 3 Flash                            │
│                                                                      │
│                ~$5-15/мес (60% работы за ~9% бюджета)               │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.4 Бюджет

```
ЕЖЕМЕСЯЧНЫЕ РАСХОДЫ (OpenRouter, все модели):
─────────────────────────────────────────────────────────
Tier ORK (Alex, Kimi K2.5):              ~$15-25
Tier 0  (Marcus, Opus 4.5):              ~$45-70
Tier 1  (Max+Nina Codex, Kai Sonnet):    ~$25-40
Tier 1.5 (Ava, Gemini 3 Pro):           ~$10-20
Tier 2  (Leo/Quinn/Derek/Elena/Diana):   ~$5-15
Heartbeat (Haiku 4.5, только Alex):       ~$1.70
Hetzner Cloud (серверы):                  ~$55-70
Домен + мелочи:                          ~$10-15
GitHub (бесплатный план):                €0
─────────────────────────────────────────────────────────
ИТОГО (средняя нагрузка):              ~$170-260/мес
─────────────────────────────────────────────────────────

ТИПИЧНЫЙ СРЕДНИЙ ДЕНЬ (~500K токенов):
┌──────────────┬────────────┬───────────┬──────────────┐
│ Tier         │ Агенты     │ % токенов │ Расход/день  │
├──────────────┼────────────┼───────────┼──────────────┤
│ Tier 0 Opus  │ Marcus     │ ~12%      │ ~$1.50       │
│ Tier 1 Codex │ Max, Nina  │ ~10%      │ ~$0.70       │
│ Tier 1 Sonnet│ Kai        │ ~3%       │ ~$0.25       │
│ Tier 1.5 Gem │ Ava        │ ~5%       │ ~$0.35       │
│ Tier ORK Kimi│ Alex       │ ~10%      │ ~$0.15       │
│ Tier 2 DS/Fl │ Rest       │ ~60%      │ ~$0.30       │
│ Heartbeat    │ Haiku      │ —         │ ~$0.10       │
├──────────────┼────────────┼───────────┼──────────────┤
│ ИТОГО        │            │ 100%      │ ~$3.35/день  │
└──────────────┴────────────┴───────────┴──────────────┘
≈ $100/мес при средней нагрузке
```

---

# ЧАСТЬ 2: МОДЕЛИ — ДЕТАЛЬНАЯ СПЕЦИФИКАЦИЯ

## 2.1 Claude Opus 4.5 (Tier 0 — Brain)

```yaml
Provider:        OpenRouter (Anthropic)
OpenRouter ID:   anthropic/claude-opus-4.5
Pricing:         $5 input / $25 output per 1M tokens
Context window:  200,000 tokens
Max output:      64,000 tokens
SWE-bench:       80.9% (лучший в мире)

Используют:      Marcus (CTO)

Оптимизации через OpenRouter:
├── Effort parameter: low/medium/high
│   ├── Low:    простые ревью → меньше output tokens ← DEFAULT
│   ├── Medium: стандартная работа
│   └── High:   архитектура, сложный дебаг → max quality
└── Token efficiency: 35-65% меньше токенов vs Sonnet на coding

Когда использовать:
✅ Архитектурные решения (Marcus)
✅ Task breakdown для спринтов (Marcus)
✅ Code review критических PR (Marcus)
✅ Структура БД, data flows, ER-диаграммы (Marcus)
❌ Написание кода → Max/Nina (GPT-5.2-Codex)
❌ Простые задачи → Tier 2 (DeepSeek V3.2)
```

## 2.2 GPT-5.2-Codex (Tier 1 — Senior Coding)

```yaml
Provider:        OpenRouter (OpenAI)
OpenRouter ID:   openai/gpt-5.2-codex
Pricing:         $1.75 input / $14 output per 1M tokens
Context window:  400,000 tokens
SWE-bench:       SOTA SWE-Bench Pro (лучший для агентного кодинга)

Используют:      Max (Senior Backend), Nina (Senior Frontend)

Почему Codex, а не Opus для кодинга:
├── SOTA SWE-Bench Pro — заточен под агентный кодинг
├── Input на 65% дешевле ($1.75 vs $5.00)
├── Output на 44% дешевле ($14 vs $25)
├── 400K контекст (vs 200K у Opus) — больше файлов в контексте
├── Мультимодальность (скриншоты UI для Nina)
└── Dynamic reasoning effort — быстро на простых, глубоко на сложных

Когда использовать:
✅ API design, REST/GraphQL endpoints (Max)
✅ Бизнес-логика, сложные алгоритмы (Max)
✅ Multi-file рефакторинг (Max, Nina)
✅ React/Next.js компоненты (Nina)
✅ State management, UI-логика (Nina)
✅ Интеграция с API (Max), реализация дизайнов (Nina)
❌ Архитектурные решения → Marcus (Opus)
❌ UX/дизайн → Kai (Sonnet)
```

## 2.3 Claude Sonnet 4.5 (Tier 1 — UX Design)

```yaml
Provider:        OpenRouter (Anthropic)
OpenRouter ID:   anthropic/claude-sonnet-4.5
Pricing:         $3 input / $15 output per 1M tokens
Context window:  1,000,000 tokens
SWE-bench:       77.2%

Используют:      Kai (UX Designer)

Почему Sonnet для UX, а не Codex:
├── UX-дизайн ≠ чистый код → креатив + прототипы
├── 1M контекст для загрузки design systems целиком
├── Лучше для свободных творческих задач
└── Codex оптимизирован под структурированный код, не wireframes

Когда использовать:
✅ Wireframes и прототипы HTML + Tailwind (Kai)
✅ Design system: токены, компоненты, стили (Kai)
✅ User flows, information architecture (Kai)
✅ Mockups и спецификации для Nina (Kai)
❌ Backend код → Max (Codex)
❌ Frontend код → Nina (Codex)
```

## 2.4 Kimi K2.5 (Tier ORK — Orchestrator)

```yaml
Provider:        OpenRouter (Moonshot)
OpenRouter ID:   moonshotai/kimi-k2.5
Pricing:         $0.50 input / $2.80 output per 1M tokens
Context window:  262,000 tokens
Features:        Agent Swarm — параллельная оркестрация до 100 суб-агентов

Используют:      Alex (Оркестратор)
Heartbeat model: anthropic/claude-haiku-4.5 (дешёвый мониторинг)

Почему Kimi K2.5 для оркестрации:
├── Agent Swarm — встроенная параллельная оркестрация
├── Отличный tool-calling (sessions_spawn, sessions_send)
├── Дёшево: $0.50/$2.80 (89% дешевле Opus по output)
├── 262K контекст — достаточно для координации всей команды
└── Heartbeat на Haiku 4.5 ($0.25/$1.25) — ещё дешевле для мониторинга

Когда использовать:
✅ Приём задач от человека
✅ Декомпозиция на подзадачи
✅ Маршрутизация к агентам через sessions_spawn
✅ Сбор результатов и финальный отчёт
✅ Heartbeat мониторинг (через Haiku модель)
❌ Написание кода → Max/Nina
❌ Архитектура → Marcus
```

## 2.5 Gemini 3 Pro (Tier 1.5 — Research)

```yaml
Provider:        OpenRouter (Google)
OpenRouter ID:   google/gemini-3-pro-preview
Pricing:         $2 input / $12 output per 1M tokens
Context window:  1,000,000 tokens
Features:        Grounding (поиск в интернете), мультимодальность

Используют:      Ava (Researcher)

Почему Gemini 3 Pro:
├── Grounding — прямой поиск в интернете
├── 1M контекст для загрузки целых репозиториев
├── 92.6% GPQA, 37.5% HLE — лидер по reasoning
└── Мультимодальность для анализа скриншотов, диаграмм

Когда использовать:
✅ Поиск и анализ документации, API, библиотек (Ava)
✅ Мониторинг AI Act изменений (Ava + Elena)
✅ Исследование конкурентов, best practices (Ava)
✅ Сравнительные обзоры технических решений (Ava)
❌ Написание кода → Max/Nina/Tier 2
```

## 2.6 DeepSeek V3.2 (Tier 2 — Code Workhorse)

```yaml
Provider:        OpenRouter (DeepSeek)
OpenRouter ID:   deepseek/deepseek-v3.2
Pricing:         $0.25 input / $0.38 output per 1M tokens
Context window:  164,000 tokens
Quality:         GPT-5 class, reasoning mode
66× дешевле Opus по output!

Используют:      Leo (SecOps), Quinn (QA), Derek (DevOps)

Когда использовать:
✅ Security audit кода (Leo) — reasoning mode ловит уязвимости
✅ Unit/E2E тесты = много кода (Quinn) — output $0.38 = экономия
✅ CI/CD скрипты, Dockerfile (Derek) — code-heavy, short context
❌ Длинные юридические документы → Gemini Flash (Elena)
❌ Документация на основе всей кодовой базы → Gemini Flash (Diana)
```

## 2.7 Gemini 3 Flash (Tier 2 — Документоёмкие задачи)

```yaml
Provider:        OpenRouter (Google)
OpenRouter ID:   google/gemini-3-flash-preview
Pricing:         $0.50 input / $3 output per 1M tokens
Context window:  1,000,000 tokens
SWE-bench:       76.2%

Используют:      Elena (AI Act Expert), Diana (Tech Writer)

Почему Flash для Elena и Diana:
├── 1M контекст — читает весь AI Act или всю кодовую базу
├── Дешевле Gemini Pro в 4× по output ($3 vs $12)
└── Достаточное качество для юридического анализа и документации

Когда использовать:
✅ AI Act анализ, classification rules (Elena)
✅ Compliance-чеклисты, тест-кейсы (Elena)
✅ README, CHANGELOG, release notes (Diana)
✅ API-документация, guides (Diana)
```

## 2.8 Claude Haiku 4.5 (Heartbeat — Мониторинг)

```yaml
Provider:        OpenRouter (Anthropic)
OpenRouter ID:   anthropic/claude-haiku-4.5
Pricing:         $0.25 input / $1.25 output per 1M tokens
Context window:  200,000 tokens

Используют:      Heartbeat ТОЛЬКО для Alex (Execution Master) (🆕 v7.1)

Почему ТОЛЬКО Alex:
├── Alex (оркестратор) — единственный кто мониторит систему
├── Alex сам дёргает остальных агентов через sessions_send при необходимости
├── Экономия: 1 heartbeat вместо 11 (в ~11 раз дешевле)
├── Alex видит ВСЁ в группе (requireMention: false)
└── Если агент завис → Alex пингнёт его через sessions_send

Стоимость:
├── Heartbeats/день: 28 (каждые 30 мин × 14 часов)
├── $0.002/heartbeat × 28 = $0.056/день
└── ~$1.70/мес (вместо ~$18.60 для 11 агентов)

Когда использовать:
✅ Периодический heartbeat Alex (каждые 30 мин)
✅ Keep-warm для кеша промптов Alex
✅ Alex проверяет Scrum Board, группу, блокеры
✅ Alex пингует застрявших агентов
❌ Heartbeat для остальных агентов (не нужен — Alex контролирует)
```

---

# ЧАСТЬ 2A: ОПТИМИЗАЦИЯ — ПЛАН ЭКОНОМИИ

## 2A.1 Рычаг 1: Heartbeat на дешёвой модели

OpenClaw поддерживает **отдельную модель для heartbeat** каждого агента.
Вместо того чтобы тратить Opus/Codex на простой пинг, используем Haiku 4.5.

```json5
// В openclaw.json — Alex (оркестратор) с Haiku heartbeat:
{
  "id": "alex",
  "model": "openrouter/moonshotai/kimi-k2.5",     // основная модель
  "heartbeat": {
    "every": "30m",
    "model": "openrouter/anthropic/claude-haiku-4.5", // ← дешёвая модель для heartbeat
    "includeReasoning": false,
    "target": "last",
    "activeHours": { "start": "08:00", "end": "22:00" }
  }
}
```

```
СТОИМОСТЬ HEARTBEAT (🆕 v7.1: только Alex):
─────────────────────────────────────────────────────────
Heartbeats/день: 28 (каждые 30 мин × 14 часов)
Стоимость одного heartbeat (Haiku): ~$0.002
─────────────────────────────────────────────────────────
ИТОГО/день:  28 × $0.002 = ~$0.056
ИТОГО/мес:   ~$1.70

Экономия vs heartbeat для всех 11 агентов: ~$17/мес

ПОДХОД: Alex — единственный с heartbeat.
        Остальные агенты активируются через sessions_send от Alex.
        Alex проверяет группу, Scrum Board, блокеры → пингует кого нужно.
```

## 2A.2 Рычаг 2: Thinking Levels (экономия ~30-50%)

Thinking levels управляют глубиной внутреннего размышления модели.
Каждый thinking-токен стоит как output ($25/Mtok для Opus).

```
СТОИМОСТЬ THINKING ПО УРОВНЯМ (на 1 ответ):
──────────────────────────────────────────────────────────────────────
Уровень    │ ~Thinking tokens │ ~Стоимость │ Когда использовать
──────────────────────────────────────────────────────────────────────
off        │ 0                │ $0         │ Простые команды, статусы
minimal    │ 100-300          │ ~$0.005    │ Форматирование, шаблоны
low        │ 300-800          │ ~$0.014    │ Стандартная разработка ← DEFAULT
medium     │ 800-3000         │ ~$0.048    │ Code review, рефакторинг
high       │ 3000-10000+      │ ~$0.163    │ Архитектура, сложный дебаг
──────────────────────────────────────────────────────────────────────
```

### Конфигурация:
```json5
"agents": {
  "defaults": {
    "thinkingDefault": "low"   // ← ГЛОБАЛЬНЫЙ default
  }
}
```

## 2A.3 Рычаг 3: OpenRouter Auto Model

OpenRouter поддерживает `openrouter/openrouter/auto` — автоматический выбор
наиболее экономичной модели по промпту. Идеально для heartbeat и простых задач.

```json5
// Альтернатива Haiku для heartbeat:
"heartbeat": {
  "model": "openrouter/openrouter/auto"  // OpenRouter сам выберет дешёвую модель
}
```

## 2A.4 Мониторинг расходов

```
КОМАНДЫ (в Telegram любому агенту):
/status              → текущая сессия: модель, токены, стоимость
/usage full          → footer с расходами к каждому ответу
/usage cost          → суммарные расходы сессии
/context detail      → размер системного промпта

CLI:
openclaw status --usage       → расходы по всем провайдерам
openclaw channels list        → квоты и использование

OpenRouter Dashboard → Activity → расход по моделям в реальном времени
```

---

# ЧАСТЬ 3: STATE, MEMORY & KNOWLEDGE BASE

> **Ключевое отличие v6:** Полная система персистентной памяти и общей базы знаний
> на основе нативных механизмов OpenClaw.

## 3.1 Архитектура памяти OpenClaw

OpenClaw использует **file-first подход** — память хранится в Markdown-файлах,
а не в векторной БД. Файлы = источник истины; модель помнит только то, что записано на диск.

```
СЛОИ ПАМЯТИ:
─────────────────────────────────────────────────────────
1. Session Transcripts (JSONL) — полная история диалога
   └── ~/.openclaw/agents/<agentId>/sessions/*.jsonl
   └── Автоматическое логирование каждого сообщения и tool call

2. Daily Memory Logs (Markdown) — заметки дня
   └── <workspace>/memory/YYYY-MM-DD.md
   └── Загружаются при старте сессии: сегодня + вчера
   └── Append-only: новые заметки добавляются в конец

3. Long-term Memory (Markdown) — курированная долгосрочная память
   └── <workspace>/MEMORY.md
   └── Только в приватных сессиях (не в групповых)
   └── Решения, предпочтения, постоянные факты

4. Knowledge Base (Markdown) — общая база знаний проекта
   └── ~/.openclaw/knowledge-base/*.md
   └── Доступна ВСЕМ агентам через memorySearch.extraPaths
   └── Архитектурные решения, стандарты, ADR, техническая документация
─────────────────────────────────────────────────────────
```

## 3.2 Shared Knowledge Base — Общая база знаний

Все агенты должны иметь доступ к единой базе знаний проекта.
OpenClaw поддерживает `memorySearch.extraPaths` — дополнительные пути для индексации.

```
⚠️ ВАЖНО: ДОКУМЕНТЫ ОТ PRODUCT OWNER (🆕 v7.1)
─────────────────────────────────────────────────────────
Product Owner (Фаундер) МОЖЕТ предоставить готовые документы
в Knowledge Base ДО начала работы команды. Например:
• ARCHITECTURE.md  — если PO уже спроектировал архитектуру
• CODING-STANDARDS.md — если PO определил стандарты кода
• DATABASE.md — если PO уже описал схему БД
• PRODUCT-BACKLOG.md — если PO уже декомпозировал фичи
• PROJECT.md — описание проекта

ПРАВИЛО ДЛЯ MARCUS (Planning Master):
  Перед Фазой 0, ПРЕЖДЕ чем начать разработку артефактов:
  1. ПРОВЕРЬ: есть ли уже готовый файл в knowledge-base/
  2. Если файл ЕСТЬ → прочитай → используй как основу
     → дополни при необходимости → НЕ переписывай с нуля
  3. Если файла НЕТ → создай с нуля
  4. Любые дополнения к PO-документам → согласуй с PO

  ПРИМЕР: PO уже загрузил ARCHITECTURE.md с onion/DDD.
    Marcus → читает → берёт за основу → дополняет Mermaid-диаграммами
    и sequence diagrams → НЕ меняет архитектурный паттерн PO.
─────────────────────────────────────────────────────────
```

```
~/.openclaw/knowledge-base/             ← Общая для всех агентов
├── PROJECT.md                          ← Паспорт проекта (см. 3.2.1)
├── PRODUCT-BACKLOG.md                  ← 🆕 v7.0: ВСЕ фичи → User Stories (Marcus)
├── SPRINT-BACKLOG.md                   ← 🆕 v7.0: Текущий Sprint Backlog (Marcus)
├── SPRINT-BOARD.md                     ← 🆕 v7.0: Scrum Board 5 колонок (Alex)
├── BURNDOWN.md                         ← 🆕 v7.0: Burndown Chart + velocity (Alex)
├── ARCHITECTURE.md                     ← Архитектура DDD / Onion (Marcus или PO)
├── DATABASE.md                         ← Структура БД, ER-диаграммы (Marcus)
├── DATA-FLOWS.md                       ← Потоки данных, sequence diagrams (Marcus)
├── CODING-STANDARDS.md                 ← 🆕 v7.0: Правила написания кода ⭐ (Marcus)
├── TECH-STACK.md                       ← Стек технологий, зависимости
├── AI-ACT-KB.md                        ← База знаний AI Act (Elena)
├── SECURITY-POLICY.md                  ← Политика безопасности (Leo)
├── RESEARCH-LOG.md                     ← Лог исследований (Ava)
├── adr/                                ← Architecture Decision Records
│   ├── ADR-001-nextjs-stack.md
│   ├── ADR-002-prisma-orm.md
│   └── ...
├── api/                                ← API-контракты
│   ├── risk-classification.md
│   └── ...
├── daily-scrum/                        ← 🆕 v7.0: Ежедневные Scrum-отчёты
│   ├── 2026-02-03.md
│   ├── 2026-02-04.md
│   └── ...
└── sprints/                            ← Архив завершённых спринтов
    ├── SPRINT-001-BACKLOG.md           ← 🆕 v7.0: Archived Sprint Backlog
    ├── SPRINT-001-BOARD.md             ← 🆕 v7.0: Archived Scrum Board (final)
    ├── SPRINT-001-REVIEW.md            ← 🆕 v7.0: Sprint Review + PO approval
    ├── SPRINT-002-BACKLOG.md
    ├── SPRINT-002-BOARD.md
    ├── SPRINT-002-REVIEW.md
    └── ...
```

### 3.2.1 PROJECT.md — Паспорт проекта (🆕 v6.2)

```markdown
# PROJECT.md — Единый источник истины о проекте
# Этот файл ЗАГРУЖАЕТСЯ КАЖДЫМ агентом через memorySearch.extraPaths.
# Фаундер создаёт при старте проекта. Marcus и Alex обновляют.

## Суть проекта
Название: AI Act Risk Classifier
Описание: SaaS-платформа для классификации AI-систем по рискам EU AI Act
Проблема: Компании не могут определить уровень риска своих AI-систем
Аудитория: B2B — CTO, compliance officers, legal

## Текущая фаза
Фаза: MVP
Цель: Рабочий классификатор с API и web-интерфейсом
Дедлайн: [дата]
Текущий спринт: Sprint 003

## Ключевые решения
- Стек: Next.js + Prisma + PostgreSQL
- Деплой: Docker → AWS/Hetzner
- Модели: GPT-5.2-Codex для кода, Gemini для ресёрча
- Подробности → ARCHITECTURE.md, adr/*.md

## Глоссарий проекта
- High Risk AI System — AI-система категории "высокий риск" по AI Act
- Conformity Assessment — процедура подтверждения соответствия
- [добавляется по мере развития]

## Контакты и роли
Фаундер: @username (утверждает планы и milestone)
CTO: Marcus (архитектура, tech decisions)
Orchestrator: Alex (спринты, координация)
```

### 3.2.2 Кто знает что — Матрица контекста (🆕 v6.2)

```
ПРИНЦИП: Все агенты знают СУТЬ проекта, но каждый — через свою призму.

PROJECT.md читают ВСЕ агенты (через knowledge-base):
┌───────────┬──────────────────────────────────────────────────┐
│ Агент     │ Зачем ему PROJECT.md                             │
├───────────┼──────────────────────────────────────────────────┤
│ Alex      │ Координировать задачи в контексте целей проекта  │
│ Marcus    │ Принимать архитектурные решения в контексте       │
│ Max/Nina  │ Понимать бизнес-логику при написании кода         │
│ Leo       │ Знать что защищать, threat model проекта          │
│ Quinn     │ Тестировать бизнес-сценарии, а не только код     │
│ Elena     │ Привязывать AI Act требования к конкретному продукту│
│ Ava       │ Ресёрчить в контексте проекта, а не абстрактно   │
│ Kai       │ Проектировать UX под конкретную аудиторию        │
│ Diana     │ Документировать именно этот продукт              │
│ Derek     │ Настраивать инфраструктуру под требования проекта│
└───────────┴──────────────────────────────────────────────────┘

Дополнительные KB-файлы читают ТОЛЬКО релевантные роли:
┌────────────────────┬────────────────────────────────────────┐
│ KB-файл            │ Кто читает (через AGENTS.md инструкции)│
├────────────────────┼────────────────────────────────────────┤
│ ARCHITECTURE.md    │ Marcus, Max, Nina, Derek, Leo          │
│ DATABASE.md        │ Marcus, Max                            │
│ CODING-STANDARDS.md│ Max, Nina, Quinn                       │
│ SECURITY-POLICY.md │ Leo, Max, Nina, Derek                  │
│ AI-ACT-KB.md       │ Elena, Ava, Alex                       │
│ RESEARCH-LOG.md    │ Ava (пишет), все (читают по запросу)   │
│ SPRINT-BACKLOG.md  │ ВСЕ агенты                             │
└────────────────────┴────────────────────────────────────────┘

Механизм: memorySearch.extraPaths даёт доступ ВСЕМ агентам ко ВСЕЙ KB.
Фильтрация — через AGENTS.md каждого агента:
  "При получении задачи, сначала проверь PROJECT.md и SPRINT-BACKLOG.md.
   Для архитектурных вопросов — читай ARCHITECTURE.md и adr/*.md."

Это НЕ жёсткий запрет (агент может прочитать любой KB-файл),
а приоритизация: каждый знает какие файлы читать ПЕРВЫМИ для своей роли.
```

### 3.2.3 Привязка к конкретному проекту (🆕 v6.2)

```
ГДЕ ОПРЕДЕЛЯЕТСЯ ЗНАНИЕ О ПРОЕКТЕ:
─────────────────────────────────────────────────────────
1. knowledge-base/PROJECT.md
   → Суть проекта, цели, глоссарий
   → Единственный файл который ОБЯЗАТЕЛЕН для нового проекта
   → Фаундер пишет при старте, команда дополняет

2. AGENTS.md каждого агента (per-workspace)
   → "Ты работаешь над проектом AI Act Risk Classifier"
   → "Читай PROJECT.md, ARCHITECTURE.md перед каждой задачей"
   → Специализированные инструкции для роли

3. knowledge-base/ARCHITECTURE.md + adr/*.md
   → Технические решения (Marcus обновляет)

4. knowledge-base/SPRINT-BACKLOG.md
   → Текущие задачи с контекстом проекта

НОВЫЙ ПРОЕКТ = новый PROJECT.md + обновление AGENTS.md каждого агента.
Всё остальное создаётся командой по ходу работы.
────────────────────────────────────────────────────────
```

### Конфигурация доступа к knowledge base:

```json5
"agents": {
  "defaults": {
    "memorySearch": {
      "enabled": true,
      "extraPaths": [
        "~/.openclaw/knowledge-base"  // ← ВСЕ агенты видят общую KB
      ]
    }
  }
}
```

### Кто что пишет в Knowledge Base:

| Файл | Кто пишет | Когда обновляется |
|------|-----------|-------------------|
| ARCHITECTURE.md | Marcus | При каждом архитектурном решении |
| DATABASE.md | Marcus + Max | При изменении схемы БД |
| DATA-FLOWS.md | Marcus | При новых потоках данных |
| SPRINT-BACKLOG.md | Marcus (тех.задачи) + Alex (нетех.задачи) | При начале/конце спринта |
| sprints/SPRINT-NNN.md | Alex (архивирует при закрытии спринта) | При завершении спринта |
| CODING-STANDARDS.md | Marcus | Редко (при изменении стандартов) |
| AI-ACT-KB.md | Elena + Ava | При обнаружении новой информации |
| SECURITY-POLICY.md | Leo | При обнаружении уязвимостей |
| adr/*.md | Marcus | При каждом ADR |

## 3.3 Per-Agent Memory (Индивидуальная память)

Каждый агент имеет **собственный workspace** с личной памятью:

```
~/.openclaw/workspace-<agentId>/
├── SOUL.md           ← Личность агента (загружается каждую сессию)
├── AGENTS.md         ← Инструкции (загружается каждую сессию)
├── IDENTITY.md       ← Имя, эмодзи, тон
├── USER.md           ← Кто пользователь (Фаундер)
├── HEARTBEAT.md      ← Чеклист для heartbeat
├── MEMORY.md         ← Долгосрочная память агента
├── memory/           ← Ежедневные логи
│   ├── 2026-02-01.md
│   ├── 2026-02-02.md
│   └── 2026-02-03.md
└── skills/           ← Скиллы агента
    └── SKILL.md
```

### Per-agent vs Shared workspace

```
РЕШЕНИЕ: Раздельные workspaces + общая knowledge base

Аргументы ЗА раздельные workspaces:
├── Изоляция памяти: Marcus не видит рабочие заметки Quinn
├── Специализация: каждый SOUL.md/AGENTS.md заточен под роль
├── Безопасность: Leo (SecOps) имеет security-контекст, недоступный другим
└── Чистота сессий: нет конфликтов при одновременной работе

Аргументы ЗА общую knowledge base:
├── Единый источник истины: архитектура, БД, стандарты
├── Синхронность: все агенты видят текущий спринт
├── Поиск: vector + BM25 по всей базе знаний
└── memorySearch.extraPaths позволяет подключить shared docs

ИТОГО: workspace per-agent + shared knowledge base через extraPaths
```

## 3.4 Memory Search — Поиск по памяти

OpenClaw индексирует все .md файлы и предоставляет гибридный поиск:

```
HYBRID SEARCH (vector + keyword):
─────────────────────────────────────────────────────────
Vector similarity  — семантический поиск (синонимы, парафразы)
BM25 keyword       — точный поиск (ID, env vars, code symbols)
─────────────────────────────────────────────────────────

Индекс: per-agent SQLite → ~/.openclaw/memory/<agentId>.sqlite
Обновление: автоматическое при изменении файлов (debounce 1.5s)
Инструменты:
├── memory_search — поиск по всем memory файлам + extraPaths
└── memory_get    — чтение конкретного файла с optional line range
```

## 3.5 Compaction & Memory Flush

Когда контекст сессии приближается к лимиту, OpenClaw автоматически:
1. Триггерит **memory flush** — агент сохраняет важное в memory/
2. Выполняет **compaction** — старые сообщения суммаризируются

```json5
"agents": {
  "defaults": {
    "compaction": {
      "mode": "safeguard",
      "reserveTokensFloor": 20000,
      "memoryFlush": {
        "enabled": true,
        "softThresholdTokens": 4000,
        "systemPrompt": "Session nearing compaction. Store durable memories now.",
        "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
      }
    }
  }
}
```

## 3.6 Session State

```
СЕССИИ:
─────────────────────────────────────────────────────────
Хранение:   ~/.openclaw/agents/<agentId>/sessions/*.jsonl
Формат:     JSONL (каждая строка = событие: сообщение, tool call, результат)
Изоляция:   per-agent (только сессии этого агента)
Ключ:       agent:main:<mainKey>
Доступ:     Любой процесс с filesystem access может читать
            → для строгой изоляции: sandbox per-agent

ВАЖНО для Dev Team:
├── sessions_send — отправить сообщение другому агенту
├── sessions_spawn — создать суб-сессию для агента (неблокирующее)
├── sessions_list — посмотреть активные сессии
├── sessions_history — прочитать историю сессии
└── session_status — статус текущей сессии
```

## 3.7 Ava как Research-сервис для всей команды (🆕 v6.2)

```
ПРИНЦИП: Ava — единственный агент, специализирующийся на веб-ресёрче.
Остальные агенты обращаются к Ava через группу или sessions_send,
а НЕ ищут в интернете сами.

ПОЧЕМУ:
├── Экономия: Ava на Gemini 3 Pro ($2/$12) + 1M контекст + grounding
├── Качество: Ava обучена верифицировать источники, не галлюцинировать
├── Единство: все результаты ресёрча → RESEARCH-LOG.md в knowledge-base
└── Переиспользование: один ресёрч доступен всей команде

КАК ОБРАЩАЮТСЯ К AVE:
─────────────────────────────────────────────────────────
Способ 1: Через группу «🦞 Dev Team» (предпочтительный)
  🔍 @ava Нужна документация по Prisma middleware для audit logging
  🔍 @ava Найди лучшие практики risk scoring для AI Act Annex III

Способ 2: Через sessions_send (для длинных задач)
  Alex/Marcus → sessions_send → ava:
  "Проведи исследование: сравни 3 подхода к AI risk classification,
   подготовь отчёт в RESEARCH-LOG.md"

Способ 3: Как часть спринт-задачи
  Marcus создаёт задачу [Research] в SPRINT-BACKLOG.md:
  "[US-002.3] [Research] P1 — Ava: Исследовать API NIST AI RMF"
─────────────────────────────────────────────────────────

WORKFLOW РЕСЁРЧА:
─────────────────────────────────────────────────────────
1. Запрос приходит (группа / sessions_send / спринт-задача)
2. Ava ищет: web_search + web_fetch + browser (если нужно)
3. Ava записывает результат:
   а) Краткий ответ → в группу (если запрос из группы)
   б) Подробный отчёт → knowledge-base/RESEARCH-LOG.md
   в) Если API-дока → knowledge-base/api/название.md
4. Ava подтверждает: "✅ Результат записан в RESEARCH-LOG.md, раздел [тема]"

RESEARCH-LOG.md — структура:
─────────────────────────────────────────────────────────
## [2026-02-04] Prisma middleware для audit logging
Запросил: Max (через группу)
Источники: docs.prisma.io, GitHub issues
Результат: Prisma поддерживает middleware с v4.16...
Рекомендация: Использовать $extends() вместо middleware...

## [2026-02-04] NIST AI RMF — сравнение с EU AI Act
Запросил: Elena (спринт-задача US-002.3)
Источники: nist.gov/aiframework, digital-strategy.ec.europa.eu
Результат: ...
─────────────────────────────────────────────────────────

КТО МОЖЕТ ИСКАТЬ В ИНТЕРНЕТЕ КРОМЕ AVA:
─────────────────────────────────────────────────────────
Elena — ТОЛЬКО для мониторинга AI Act (ей разрешён browser + web_search)
Kai — browser для референсов UX/UI (browsing, не deep research)
Nina — browser для тестирования фронтенда в реальном браузере

Остальные (Max, Leo, Quinn, Derek, Diana) — НЕ имеют browser.
Для ресёрча они обращаются к Ava через группу.
─────────────────────────────────────────────────────────
```

## 3.8 Среда разработки и инструменты агентов (🆕 v6.2)

```
КАК АГЕНТЫ РАБОТАЮТ С КОДОМ, ТЕСТАМИ, ДИЗАЙНОМ:
═══════════════════════════════════════════════════════════

OpenClaw предоставляет каждому агенту набор tools (встроенных) и
skills (файлы SKILL.md в workspace). Вместе они формируют
"рабочее место" агента.

Встроенные tools OpenClaw (доступность зависит от tools.allow/deny):
├── read        — чтение файлов из workspace
├── write       — создание/перезапись файлов
├── edit        — редактирование (строковая замена)
├── exec        — выполнение shell-команд (node, npm, python, git...)
├── process     — управление фоновыми процессами
├── browser     — управление Chromium (CDP): скриншоты, навигация, клики
├── web_search  — поиск через Brave/Tavily API
├── web_fetch   — загрузка содержимого URL
├── memory_search — поиск по knowledge base
├── memory_get  — чтение конкретного файла из памяти
├── sessions_send — отправить сообщение другому агенту
├── sessions_list — список активных сессий
└── message     — отправить сообщение в Telegram (группу/DM)

Skills (per-agent, в workspace/skills/):
├── Workspace skills  — <workspace>/skills/<name>/SKILL.md (приоритет 1)
├── Managed skills    — ~/.openclaw/skills/<name>/SKILL.md (приоритет 2)
└── Bundled skills    — встроенные в OpenClaw (приоритет 3)

Sandbox — Docker-контейнер для безопасного exec:
├── scope: "agent" — один контейнер на агента
├── scope: "session" — один контейнер на сессию (строже)
└── workspaceAccess: "rw" — монтирует workspace в контейнер
```

### 3.8.1 Среда по ролям — Кто чем работает

```
┌───────────┬──────────────────────┬──────────────────────────────────┐
│ Агент     │ Рабочая среда        │ Что делает через OpenClaw tools  │
├───────────┼──────────────────────┼──────────────────────────────────┤
│ Max       │ Docker sandbox       │ exec: npm, node, prisma, git     │
│ (Backend) │ + Git repo в sandbox │ write/edit: .ts, .json, .prisma  │
│           │                      │ exec: npm test, npm run lint     │
│           │                      │ БЕЗ browser (не нужен)           │
│           │                      │                                  │
│ Nina      │ Docker sandbox       │ exec: npm, node, vite, git       │
│ (Frontend)│ + Browser (CDP)      │ write/edit: .tsx, .css, .svg     │
│           │                      │ browser: визуальная проверка UI  │
│           │                      │ exec: npx playwright test        │
│           │                      │                                  │
│ Kai       │ Sandbox (light)      │ write: wireframes (.md, .svg)    │
│ (UX)      │ + Browser (CDP)      │ browser: просмотр референсов     │
│           │                      │ write: user-flow diagrams (.md)  │
│           │                      │ БЕЗ exec (не кодирует)           │
│           │                      │                                  │
│ Leo       │ Docker sandbox       │ exec: npm audit, snyk, trivy     │
│ (SecOps)  │ (изолированный)      │ read: код для security review    │
│           │                      │ exec: OWASP dependency-check     │
│           │                      │ БЕЗ browser (security risk)      │
│           │                      │                                  │
│ Quinn     │ Docker sandbox       │ exec: npm test, jest, cypress    │
│ (QA)      │                      │ write: test files (.test.ts)     │
│           │                      │ exec: npx playwright test        │
│           │                      │ read: coverage reports            │
│           │                      │                                  │
│ Ava       │ Light (без Docker)   │ web_search + web_fetch + browser │
│ (Research)│ + Browser            │ write: результаты → KB           │
│           │                      │ БЕЗ exec (не нужен)              │
│           │                      │                                  │
│ Elena     │ Light (без Docker)   │ browser: мониторинг EU сайтов    │
│ (Legal)   │ + Browser            │ read/write: AI-ACT-KB.md         │
│           │                      │ БЕЗ exec                         │
│           │                      │                                  │
│ Diana     │ Minimal              │ read: код для документирования   │
│ (Docs)    │                      │ write: README, API docs          │
│           │                      │ БЕЗ exec, БЕЗ browser            │
│           │                      │                                  │
│ Derek     │ Docker sandbox       │ exec: docker, terraform, kubectl │
│ (DevOps)  │ (полный)             │ write: Dockerfile, CI/CD yaml    │
│           │                      │ exec: docker build, helm, ssh    │
│           │                      │                                  │
│ Marcus    │ Host (без sandbox)   │ ВСЕ tools: полный доступ         │
│ (CTO)     │                      │ Архитектурные POC, code review   │
│           │                      │ exec + browser + sessions_send   │
│           │                      │                                  │
│ Alex      │ Host (без sandbox)   │ sessions_spawn/send для оркестр. │
│ (Orch.)   │                      │ read/write: спринт-файлы, KB     │
│           │                      │ message: Telegram группа          │
└───────────┴──────────────────────┴──────────────────────────────────┘
```

### 3.8.2 Общий Git-репозиторий проекта (🆕 v6.3)

```
ВСЕ агенты, которые пишут код, работают в ОДНОМ Git-репозитории (GitHub).
Никто НЕ пушит в main/develop напрямую. ВСЁ через Pull Requests.

ДВУХУРОВНЕВЫЙ REVIEW (🆕 v7.1):
  1. Marcus (CTO) — code review: проверяет качество, архитектуру, стандарты
     → gh pr review --approve (или --request-changes)
  2. Product Owner (Фаундер) — финальный approve + merge
     → PO проверяет в GitHub UI → Merge PR

Marcus НЕ мержит PRs. Marcus только approve/request-changes.
Product Owner — ЕДИНСТВЕННЫЙ кто нажимает "Merge".
```

#### 3.8.2.1 Предварительная настройка (Фаундер делает один раз)

```
ШАГ 1: GitHub — создать репозиторий и настроить защиту
─────────────────────────────────────────────────────────
1. Создать приватный репозиторий на GitHub:
   github.com/new → "ai-act-compliance-platform" (Private)
   Initialize with README, .gitignore (Node), License (MIT/proprietary)

2. Создать GitHub Organization (рекомендуется):
   github.com/organizations/new → "your-company-dev"
   Это позволит управлять доступом через Teams.

3. Включить Branch Protection для main:
   Settings → Branches → Branch protection rules → Add rule:
   ├── Branch name pattern: main
   ├── ☑ Require a pull request before merging
   │   ├── Required approvals: 1
   │   └── ☑ Dismiss stale PR reviews when new commits are pushed
   ├── ☑ Require status checks to pass before merging
   │   └── (добавить после настройки CI: lint, test, build)
   ├── ☑ Require branches to be up to date before merging
   ├── ☑ Do not allow bypassing the above settings
   └── ☐ Allow force pushes — ВЫКЛЮЧЕНО

4. Включить Branch Protection для develop:
   Settings → Branches → Add rule:
   ├── Branch name pattern: develop
   ├── ☑ Require a pull request before merging
   │   └── Required approvals: 1
   └── ☑ Require status checks to pass

5. Создать ветку develop:
   git checkout -b develop
   git push origin develop


ШАГ 2: GitHub — создать Personal Access Token (PAT)
─────────────────────────────────────────────────────────
ОДИН токен для всех агентов (Fine-grained PAT):

GitHub → Settings → Developer settings → Personal access tokens
   → Fine-grained tokens → Generate new token

   Token name: "openclaw-dev-team"
   Expiration: 90 days (обновлять по cron или вручную)
   Repository access: Only select repositories
     → ai-act-compliance-platform
   Permissions:
     ├── Contents:       Read and write   (git push)
     ├── Pull requests:  Read and write   (gh pr create/review/merge)
     ├── Issues:         Read and write    (gh issue create/close)
     ├── Metadata:       Read-only         (обязательно)
     └── Actions:        Read-only         (статус CI)

   → Generate token → скопировать: github_pat_XXXX...

⚠️ Один PAT на все агенты, но КАЖДЫЙ агент пушит со СВОИМ
   Git user.name — видно кто что коммитит.


ШАГ 3: Настроить gh CLI + git credentials на хосте
─────────────────────────────────────────────────────────
# Установить gh CLI (если не установлен)
sudo apt install gh   # или brew install gh

# Авторизовать gh
echo "github_pat_XXXX..." | gh auth login --with-token

# Проверить
gh auth status
# → Logged in to github.com as your-company-dev

# Настроить Git credential helper (чтобы агенты не спрашивали пароль)
git config --global credential.helper store
# Один раз сделать git push вручную → credentials сохранятся

АЛЬТЕРНАТИВА — через .env в sandbox:
  В openclaw.json → agents.list[].sandbox.docker.env:
    "GITHUB_TOKEN": "github_pat_XXXX..."
  Тогда gh cli внутри sandbox будет авторизован автоматически.


ШАГ 4: Настроить Git identity для КАЖДОГО агента
─────────────────────────────────────────────────────────
Каждый агент должен коммитить под СВОИМ именем.
Это настраивается через setupCommand в sandbox или в AGENTS.md.

В openclaw.json для каждого агента:

  // Max — Backend Developer
  {
    id: "max",
    sandbox: {
      docker: {
        setupCommand: `
          apt-get update && apt-get install -y git gh curl jq &&
          git config --global user.name "Max [Backend Bot]" &&
          git config --global user.email "max-bot@your-company.dev" &&
          git config --global push.autoSetupRemote true &&
          echo "$GITHUB_TOKEN" | gh auth login --with-token
        `,
        env: {
          GITHUB_TOKEN: "github_pat_XXXX..."
        }
      }
    }
  }

  // Nina — Frontend Developer
  {
    id: "nina",
    sandbox: {
      docker: {
        setupCommand: `
          ... (аналогично) ...
          git config --global user.name "Nina [Frontend Bot]" &&
          git config --global user.email "nina-bot@your-company.dev" &&
          ...
        `
      }
    }
  }

Полный список Git identities:
─────────────────────────────────────────────────────────
  Агент   │ user.name                  │ user.email
  ────────┼────────────────────────────┼──────────────────────
  Max     │ Max [Backend Bot]          │ max-bot@company.dev
  Nina    │ Nina [Frontend Bot]        │ nina-bot@company.dev
  Marcus  │ Marcus [CTO Bot]           │ marcus-bot@company.dev
  Leo     │ Leo [SecOps Bot]           │ leo-bot@company.dev
  Quinn   │ Quinn [QA Bot]             │ quinn-bot@company.dev
  Derek   │ Derek [DevOps Bot]         │ derek-bot@company.dev
  Diana   │ Diana [TechWriter Bot]     │ diana-bot@company.dev
─────────────────────────────────────────────────────────

⚠️ Ava, Elena, Kai, Alex — НЕ работают с Git (нет exec/git tools).
   Kai делает wireframes в .md/.svg → передаёт Nina через KB или группу.
   Elena пишет в AI-ACT-KB.md в knowledge-base (не в Git-репозитории кода).


ШАГ 5: Клонировать репозиторий в workspace каждого агента
─────────────────────────────────────────────────────────
Способ A — через setupCommand (автоматически при старте sandbox):

  setupCommand: `
    ... (git config) ...
    if [ ! -d "/workspace/project" ]; then
      git clone https://github.com/your-company/ai-act-compliance.git /workspace/project
    fi &&
    cd /workspace/project && git checkout develop && git pull origin develop
  `

Способ B — вручную через Telegram (один раз):

  → DM Max: "Клонируй репозиторий:
    git clone https://github.com/your-company/ai-act-compliance.git /workspace/project"

  → DM Nina: (то же)
  → DM Derek: (то же)
  → и т.д.

Способ C — через AGENTS.md в workspace:

  В ~/.openclaw/workspace-max/AGENTS.md добавить:
  ## Git Repository
  Project repo: https://github.com/your-company/ai-act-compliance.git
  Clone to: /workspace/project
  On session start: cd /workspace/project && git pull origin develop

РЕЗУЛЬТАТ — структура workspace каждого агента:
  ~/.openclaw/workspace-max/
  ├── AGENTS.md
  ├── SOUL.md
  ├── TOOLS.md
  ├── memory/
  ├── skills/
  └── project/                 ← git clone
      ├── src/
      ├── tests/
      ├── docs/
      ├── package.json
      └── .github/workflows/
```

#### 3.8.2.2 Branch-стратегия

```
ВЕТКИ РЕПОЗИТОРИЯ:
─────────────────────────────────────────────────────────

main
 │   ← Стабильная ветка. ТОЛЬКО через PR из develop. PO мержит.
 │
develop
 │   ← Интеграционная ветка. PRs от агентов идут СЮДА.
 │      Marcus ревьюит → PO мержит (или делегирует Marcus).
 │      Когда develop стабилен → PR develop→main → PO мержит.
 │
 ├── feature/US-002.1-risk-classifier     ← Max (backend feature)
 ├── feature/US-002.2-classification-ui   ← Nina (frontend feature)
 ├── feature/US-002.8-api-docs            ← Diana (docs)
 ├── test/US-002.6-risk-tests             ← Quinn (test coverage)
 ├── infra/US-003.1-ci-pipeline           ← Derek (CI/CD, Docker)
 └── fix/US-002.1a-zod-validation         ← Max (hotfix после review)


ПРАВИЛА ИМЕНОВАНИЯ ВЕТОК:
─────────────────────────────────────────────────────────
  Паттерн:       <type>/US-NNN-<short-description>

  type =
    feature/    — новая функциональность (Max, Nina)
    fix/        — исправление после review (Max, Nina)
    test/       — тесты (Quinn)
    infra/      — CI/CD, Docker, deploys (Derek)
    docs/       — документация (Diana)
    security/   — security-fix (Max/Nina по рекомендации Leo)

  Примеры:
    feature/US-002.1-risk-classifier
    fix/US-002.1a-add-zod-validation
    test/US-002.6-risk-api-tests
    infra/US-003.1-github-actions-ci
    docs/US-002.8-api-docs-classify
    security/US-002.9-input-sanitization
─────────────────────────────────────────────────────────


КТО КУДА ПУШИТ:
─────────────────────────────────────────────────────────
  Агент   │ Создаёт ветки │ PR в       │ Мержит
  ────────┼───────────────┼────────────┼────────────
  Max     │ feature/, fix/│ → develop  │ НЕТ
  Nina    │ feature/, fix/│ → develop  │ НЕТ
  Quinn   │ test/         │ → develop  │ НЕТ
  Derek   │ infra/        │ → develop  │ НЕТ
  Diana   │ docs/         │ → develop  │ НЕТ
  Leo     │ НЕ пушит      │ —          │ НЕТ (только ревью)
  Marcus  │ НЕ пушит код  │ develop→main│ APPROVE (PO мержит)
─────────────────────────────────────────────────────────

  PO (Фаундер) — ЕДИНСТВЕННЫЙ кто мержит (через GitHub UI или делегирует Marcus).

Marcus — review gate (approve/request-changes), НО НЕ мержит:
  • Approve PR (gh pr review --approve)
  • Request changes (gh pr review --request-changes)
  • ⛔ НЕ может merge (только PO через GitHub UI)

Product Owner (Фаундер) — ЕДИНСТВЕННЫЙ кто мержит:
  • Получает уведомление от Marcus: "PR #12 approved, ready to merge"
  • Проверяет PR в GitHub UI → нажимает "Merge"
  • Или делегирует Marcus merge через Telegram: "✅ мержи #12"
    → тогда Marcus: gh pr merge 12 --squash --delete-branch

Leo — может ТОЛЬКО:
  • Комментировать PR (gh pr comment)
  • Запрашивать изменения (gh pr review --request-changes)
  • НЕ может approve или merge
```

#### 3.8.2.3 Git Workflow агента — Полный цикл (🆕 v6.3)

```
ПОЛНЫЙ ЦИКЛ РАБОТЫ АГЕНТА С GIT:
═════════════════════════════════════════════════════════

Пример: Max берёт US-002.1 "Risk Classifier API endpoint"

─── ФАЗА 1: ПОДГОТОВКА ──────────────────────────────────

  Max читает SPRINT-BACKLOG.md → видит US-002.1 (свободна)
  Max self-assigns задачу:

  📋 Обновляет SPRINT-BACKLOG.md:
     Исполнитель: Max (self-assign)
     Статус: 🔨 In Progress

  📱 Пишет в группу:
     📋 [S003] [US-002.1] Взял: Risk Classifier API endpoint

  💻 Синхронизирует репозиторий:
     cd /workspace/project
     git checkout develop
     git pull origin develop

  🌿 Создаёт feature-ветку:
     git checkout -b feature/US-002.1-risk-classifier

─── ФАЗА 2: РАЗРАБОТКА ──────────────────────────────────

  Max пишет код:
     • src/modules/risk/risk.controller.ts
     • src/modules/risk/risk.service.ts
     • src/modules/risk/risk.schema.ts (zod)
     • src/modules/risk/risk.test.ts

  Max делает Conventional Commits (по ходу):
     git add src/modules/risk/
     git commit -m "feat(risk): add /classify endpoint with zod validation"
     git commit -m "test(risk): add unit tests for risk classifier"

  📱 Прогресс в группу:
     🔨 [S003] [US-002.1] 60%: endpoint /classify ready, writing tests

─── ФАЗА 3: PUSH + PR ───────────────────────────────────

  Max завершил → пушит ветку:
     git push origin feature/US-002.1-risk-classifier

  Max создаёт Pull Request через gh CLI:
     gh pr create \
       --base develop \
       --title "feat(risk): US-002.1 Risk Classifier API endpoint" \
       --body "## Задача
     US-002.1 из Sprint 003

     ## Что сделано
     - POST /api/risk/classify endpoint
     - Zod validation schema
     - Risk scoring algorithm (NIST-based)
     - Unit tests (12 pass)

     ## Чеклист
     - [x] Код написан
     - [x] Тесты написаны и проходят
     - [x] Линтер проходит
     - [ ] Code review Marcus
     - [ ] Security audit Leo

     Reviewers: @marcus-bot @leo-bot"

  📱 Max пишет в группу с @тегами:
     ✅ [S003] [US-002.1] Готово: PR #12 → develop
        Risk Classifier API — POST /api/risk/classify
        12 тестов ✅
        @marcus ревью + @leo security audit 🙏

  📋 Обновляет SPRINT-BACKLOG.md:
     Статус: 👀 Review
     PR: #12

  ⛔ Max ОСТАНАВЛИВАЕТ работу над US-002.1
     ЖДЁТ результат ревью от Marcus
     Может взять ДРУГУЮ задачу из спринта, если есть свободные.

─── ФАЗА 4: CODE REVIEW (Marcus) ────────────────────────

  Marcus получает @mention в группе → начинает review:

     gh pr view 12 --json title,body,additions,deletions
     gh pr diff 12

  Marcus проверяет:
     □ Соответствие ARCHITECTURE.md
     □ Соответствие CODING-STANDARDS.md
     □ Правильная структура модуля
     □ Типизация (strict TypeScript)
     □ Error handling
     □ Naming conventions
     □ Тесты покрывают edge cases

  ─── ВАРИАНТ A: APPROVED ✅ ───────────────────────────

  Marcus одобряет:
     gh pr review 12 --approve --body "LGTM! Архитектура модуля ✅,
       типизация ✅, тесты покрывают основные сценарии ✅.
       Ждём security review от Leo."

  📱 Marcus пишет в группу:
     👀 [S003] [US-002.1] Code review PR #12: ✅ Approved
        @leo — твоя очередь, security audit

  ─── ВАРИАНТ B: CHANGES REQUESTED ❌ ──────────────────

  Marcus находит проблемы → request changes:
     gh pr review 12 --request-changes --body "
       ## Нужны правки:

       1. ❌ risk.service.ts:45 — race condition в concurrent classify.
          Нужен mutex или queue на уровне сервиса.

       2. ❌ risk.schema.ts:12 — нет ограничения на длину input.
          Добавить z.string().max(10000) для поля description.

       3. ⚠️ risk.test.ts — нет теста на edge case: пустой input.
          Добавить тест: expect(classify({})).toThrow(ZodError)

       Жду исправлений. После фикса — re-request review."

  📱 Marcus пишет в группу:
     ❌ [S003] [US-002.1] Code review PR #12: Changes requested
        3 замечания: race condition, input limit, missing test
        @max — исправь и запроси повторное ревью

─── ФАЗА 5: ДОРАБОТКА (Max — если changes requested) ────

  Max получает @mention → читает комментарии Marcus:
     gh pr view 12 --comments

  Max вносит исправления:
     cd /workspace/project
     git checkout feature/US-002.1-risk-classifier
     git pull origin feature/US-002.1-risk-classifier

     # Фикс 1: race condition
     # → edit src/modules/risk/risk.service.ts

     # Фикс 2: input limit
     # → edit src/modules/risk/risk.schema.ts

     # Фикс 3: missing test
     # → edit src/modules/risk/risk.test.ts

     git add -A
     git commit -m "fix(risk): address review — mutex, input limit, edge test"
     git push origin feature/US-002.1-risk-classifier

  📱 Max пишет в группу:
     🔧 [S003] [US-002.1] Fix: исправил 3 замечания, PR #12 обновлён
        1. ✅ Добавил mutex через AsyncLock
        2. ✅ z.string().max(10000) на description
        3. ✅ Тест на пустой input
        @marcus повторное ревью 🙏

  ⛔ Max снова ЖДЁТ ответ Marcus.
     Может взять другую задачу.

─── ФАЗА 6: RE-REVIEW (Marcus) ──────────────────────────

  Marcus проверяет новые коммиты:
     gh pr diff 12

  Если всё ок:
     gh pr review 12 --approve --body "Fixes look good ✅"

  📱 Marcus пишет в группу:
     ✅ [S003] [US-002.1] Re-review PR #12: Approved ✅
        @leo security audit

─── ФАЗА 7: SECURITY REVIEW (Leo) ──────────────────────

  Leo получает @mention → проводит security audit:
     gh pr diff 12

  Leo применяет Security Checklist из своего SKILL.md:
     □ Input validation (zod)
     □ No SQL injection
     □ No XSS
     □ No path traversal
     □ Auth/authz
     □ No hardcoded secrets
     □ Rate limiting
     □ Dependency audit

  ─── Leo: ВСЁ ОК ──────────────────────────────────────
     gh pr comment 12 --body "🔒 Security audit: PASS ✅
       Input validation: zod schemas ✅
       No injection vectors ✅
       Dependencies clean ✅"

  📱 Leo пишет в группу:
     🔒 [S003] [US-002.1] Security audit PR #12: PASS ✅
        @marcus ready to merge

  ─── Leo: ЕСТЬ ПРОБЛЕМЫ ──────────────────────────────
     gh pr review 12 --request-changes --body "
       🔒 Security issue:
       severity: HIGH
       vulnerability: Missing rate limiting on /classify
       location: risk.controller.ts:15
       fix: Add @RateLimit(100, '15m') decorator
       reference: CWE-770"

  📱 Leo пишет в группу:
     🔒 [S003] [US-002.1] Security audit PR #12: FAIL ❌
        HIGH: missing rate limiting on /classify
        @max — добавь rate limiting, см. комментарий в PR

  → Max фиксит → пушит → Marcus re-approve → Leo re-check
  (Цикл ФАЗА 5-6-7 повторяется до полного approve)

─── ФАЗА 8: MERGE (Product Owner — финальный approve) ───

  После approve от Marcus + pass от Leo:

  Marcus уведомляет PO:
  📱 Marcus → группа или DM PO:
     🎉 [S003] [US-002.1] PR #12 ready to merge ✅
        Code review: ✅ Marcus
        Security: ✅ Leo
        @founder — approve merge?

  Product Owner:
    Вариант А: Проверяет PR в GitHub UI → Merge
    Вариант Б: Отвечает в Telegram: "✅ мержи"
      → Marcus: gh pr merge 12 --squash \
          --subject "feat(risk): US-002.1 Risk Classifier API (#12)"

  Marcus удаляет feature-ветку:
     gh pr merge 12 --delete-branch
     (или GitHub делает это автоматически)

  📱 Marcus пишет в группу:
     🎉 [S003] [US-002.1] PR #12 merged в develop ✅
        @max — можешь брать следующую задачу

─── ФАЗА 9: ЗАКРЫТИЕ ЗАДАЧИ (Max) ──────────────────────

  Max обновляет SPRINT-BACKLOG.md:
     Статус: ✅ Done
     Результат: PR #12 (merged), POST /api/risk/classify

  📱 Max пишет в группу:
     ✅ [S003] [US-002.1] Закрыта ✅

  Max берёт следующую свободную задачу:
     cd /workspace/project
     git checkout develop
     git pull origin develop
     git checkout -b feature/US-003.2-next-task

═════════════════════════════════════════════════════════
```

#### 3.8.2.4 Правила и ограничения

```
⛔ ЗАПРЕЩЕНО:
─────────────────────────────────────────────────────────
• Пушить напрямую в main (branch protection блокирует)
• Пушить напрямую в develop (branch protection блокирует)
• Мержить свой собственный PR (GitHub не позволяет с protection)
• Начинать НОВУЮ задачу если текущий PR ждёт КРИТИЧЕСКИЕ правки
  (minor замечания — можно взять другую задачу параллельно)
• Force push в main/develop
• Коммитить секреты, API ключи, .env файлы

✅ РАЗРЕШЕНО:
─────────────────────────────────────────────────────────
• Взять другую задачу пока PR на ревью (если нет критических правок)
• Force push в свою feature-ветку (для squash перед PR)
• Создать несколько PRs параллельно (разные задачи)
• Leo может комментировать и request changes (не approve/merge)
• Diana может создать PR для docs/ (Marcus reviews → PO мержит)
• Quinn может создать PR для tests/ (Marcus reviews → PO мержит)

📋 CONVENTIONAL COMMITS (обязательно):
─────────────────────────────────────────────────────────
  feat(scope):    новая функциональность
  fix(scope):     исправление бага или review-замечаний
  test(scope):    добавление/исправление тестов
  docs(scope):    документация
  refactor(scope): рефакторинг без изменения поведения
  chore(scope):   обновление зависимостей, CI, configs
  security(scope): security fix

  Примеры:
    feat(risk): add /classify endpoint
    fix(risk): address review — add input validation
    test(risk): add edge case tests for empty input
    docs(api): add /classify endpoint documentation
    security(risk): add rate limiting to /classify

📊 МЕТРИКИ GIT (Alex отслеживает):
─────────────────────────────────────────────────────────
• PRs created / PRs merged per sprint
• Average review time (PR created → approved)
• Average fix time (changes requested → re-approved)
• Review cycles per PR (сколько раз changes requested)
• Эти метрики попадают в Sprint Archive (sprints/SPRINT-NNN.md)
─────────────────────────────────────────────────────────
```

#### 3.8.2.5 Быстрые команды gh CLI (шпаргалка для агентов)

```
ШПАРГАЛКА GH CLI ДЛЯ АГЕНТОВ:
═════════════════════════════════════════════════════════

# ── Создание PR ──────────────────────────────────────
gh pr create --base develop \
  --title "feat(risk): US-002.1 description" \
  --body "..." \
  --reviewer marcus-bot,leo-bot

# ── Просмотр PR ──────────────────────────────────────
gh pr view 12                        # общая информация
gh pr view 12 --comments             # все комментарии
gh pr diff 12                        # diff кода

# ── Review PR (только Marcus) ───────────────────────
gh pr review 12 --approve --body "LGTM ✅"
gh pr review 12 --request-changes --body "Нужны правки: ..."
gh pr review 12 --comment --body "Вопрос: ..."

# ── Комментирование PR (любой агент) ─────────────────
gh pr comment 12 --body "🔒 Security audit: PASS ✅"

# ── Merge PR (PO, или Marcus по делегации PO: "✅ мержи") ──
gh pr merge 12 --squash --delete-branch \
  --subject "feat(risk): US-002.1 Risk Classifier (#12)"

# ── Список открытых PR ──────────────────────────────
gh pr list --state open

# ── Статус CI для PR ─────────────────────────────────
gh pr checks 12

# ── Синхронизация ────────────────────────────────────
git checkout develop && git pull origin develop
git checkout -b feature/US-NNN-description

# ── После ревью — внести правки ──────────────────────
git checkout feature/US-002.1-risk-classifier
git pull origin feature/US-002.1-risk-classifier
# ... edit files ...
git add -A
git commit -m "fix(risk): address review — description"
git push origin feature/US-002.1-risk-classifier
═════════════════════════════════════════════════════════
```

### 3.8.3 Как подключать skills и tools агентам

```
ДОБАВЛЕНИЕ TOOLS (openclaw.json):
─────────────────────────────────────────────────────────
Способ 1: tools.allow / tools.deny в конфиге агента
  { id: "max", tools: { allow: ["read","write","edit","exec"], deny: ["browser"] } }

Способ 2: tools.profile (пресеты)
  "minimal"  — только session_status
  "coding"   — fs + runtime + sessions + memory
  "messaging"— message + sessions
  "full"     — без ограничений

ДОБАВЛЕНИЕ SKILLS (workspace):
────────────────────────────────────────────────────────
Способ 1: Per-agent workspace skills (приоритет 1)
  Файл: ~/.openclaw/workspace-max/skills/github/SKILL.md
  → Только Max видит этот skill

Способ 2: Managed skills (приоритет 2, общие)
  Файл: ~/.openclaw/skills/github/SKILL.md
  → Все агенты видят

Способ 3: ClawHub marketplace
  openclaw skills install <skill-name>
  → Устанавливается в ~/.openclaw/skills/

Способ 4: Агент создаёт skill сам
  "Напиши skill для работы с Linear API"
  → Агент создаёт SKILL.md + bin/ в своём workspace

ПРИМЕРЫ ПОЛЕЗНЫХ SKILLS ДЛЯ КОМАНДЫ:
─────────────────────────────────────────────────────────
├── github              → Max, Nina: PR, issues, code review
├── pr-commit-workflow  → Max, Nina: автоматизация PR
├── webapp-testing      → Quinn: Playwright тесты через browser
├── ux-researcher-designer → Kai: UX research toolkit
├── read-github         → Ava: чтение GitHub репо для ресёрча
├── docker-essentials   → Derek: Docker команды и workflows
├── safe-exec           → Leo: безопасное выполнение команд
└── openclaw-sec        → Leo: security audit
─────────────────────────────────────────────────────────
```

---

# ЧАСТЬ 4: КОНФИГУРАЦИЯ OPENCLAW

## 4.1 Главный конфиг — `~/.openclaw/openclaw.json`

> ⚠️ **Формат JSON5** (OpenClaw поддерживает комментарии).
> OpenRouter API ключ: через env переменную или auth profiles.
> Telegram-токены вставляются напрямую в channels.telegram.accounts.

```json5
{
  // ═══════════════════════════════════════════════════════
  // MODEL PROVIDERS — OpenRouter как единый провайдер
  // ═══════════════════════════════════════════════════════
  "models": {
    "providers": {
      "openrouter": {
        "baseUrl": "https://openrouter.ai/api/v1"
        // API key через env: OPENROUTER_API_KEY
        // или через: openclaw configure --set-key openrouter
      }
    }
  },

  // ═══════════════════════════════════════════════════════
  // AGENTS — 11 агентов, 6 моделей, 5 тиров
  // ═══════════════════════════════════════════════════════
  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/deepseek/deepseek-v3.2",
        "fallbacks": ["openrouter/google/gemini-3-flash-preview"]
      },
      "thinkingDefault": "low",
      "workspace": "~/.openclaw/workspace-shared",  // fallback, каждый агент переопределяет
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000,
          "systemPrompt": "Session nearing compaction. Store durable memories now.",
          "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      },
      "memorySearch": {
        "enabled": true,
        "extraPaths": ["~/.openclaw/knowledge-base"]  // ← Общая KB для всех
      },
      "maxConcurrent": 2,
      "sandbox": { "mode": "non-main", "scope": "agent" },
      // Heartbeat по умолчанию — дешёвая модель Haiku
      "heartbeat": {
        "every": "30m",
        "model": "openrouter/anthropic/claude-haiku-4.5",
        "includeReasoning": false,
        "target": "last",
        "activeHours": { "start": "08:00", "end": "22:00" }
      }
    },

    "list": [
      // ─────── TIER ORK: 🎯 ORCHESTRATOR (Kimi K2.5) ───────
      {
        "id": "alex",
        "name": "Alex (Оркестратор)",
        "default": true,                              // ← Точка входа
        "workspace": "~/.openclaw/workspace-alex",
        "agentDir": "~/.openclaw/agents/alex/agent",
        "model": "openrouter/moonshotai/kimi-k2.5",
        "identity": { "name": "Alex" },
        "groupChat": { "mentionPatterns": ["@alex", "@оркестратор", "@po"] },
        "sandbox": { "mode": "off" },
        "heartbeat": {
          "every": "30m",
          "model": "openrouter/anthropic/claude-haiku-4.5",
          "activeHours": { "start": "08:00", "end": "22:00" }
        },
        "tools": {
          "allow": ["read", "write", "edit", "exec", "browser",
                    "sessions_list", "sessions_send", "sessions_spawn",
                    "sessions_history", "session_status"],
          "deny": ["cron"]
        }
      },

      // ─────── TIER 0: 🧠 BRAIN (Claude Opus 4.5) ───────
      {
        "id": "marcus",
        "name": "Marcus (CTO)",
        "workspace": "~/.openclaw/workspace-marcus",
        "agentDir": "~/.openclaw/agents/marcus/agent",
        "model": "openrouter/anthropic/claude-opus-4.5",
        "identity": { "name": "Marcus" },
        "groupChat": { "mentionPatterns": ["@marcus", "@cto", "@архитектор"] },
        "sandbox": { "mode": "off" },
        "heartbeat": {
          "every": "55m",
          "model": "openrouter/anthropic/claude-haiku-4.5",
          "includeReasoning": false
        },
        "tools": {
          "allow": ["read", "write", "edit", "exec", "browser",
                    "sessions_list", "sessions_send"],
          "deny": ["cron", "sessions_spawn"]
        }
      },

      // ─────── TIER 1: 🎯 SENIOR CODERS (GPT-5.2-Codex) ───────
      {
        "id": "max",
        "name": "Max (Senior Backend)",
        "workspace": "~/.openclaw/workspace-max",
        "agentDir": "~/.openclaw/agents/max/agent",
        "model": "openrouter/openai/gpt-5.2-codex",
        "identity": { "name": "Max" },
        "groupChat": { "mentionPatterns": ["@max", "@backend", "@бэкенд"] },
        "sandbox": { "mode": "all", "scope": "agent" },
        "tools": {
          "allow": ["read", "write", "edit", "exec",
                    "sessions_list", "sessions_send"],
          "deny": ["browser", "cron", "sessions_spawn"]
        }
      },
      {
        "id": "nina",
        "name": "Nina (Senior Frontend)",
        "workspace": "~/.openclaw/workspace-nina",
        "agentDir": "~/.openclaw/agents/nina/agent",
        "model": "openrouter/openai/gpt-5.2-codex",
        "identity": { "name": "Nina" },
        "groupChat": { "mentionPatterns": ["@nina", "@frontend", "@фронтенд"] },
        "sandbox": { "mode": "all", "scope": "agent" },
        "tools": {
          "allow": ["read", "write", "edit", "exec", "browser",
                    "sessions_list", "sessions_send"],
          "deny": ["cron", "sessions_spawn"]
        }
      },
      {
        "id": "kai",
        "name": "Kai (UX Designer)",
        "workspace": "~/.openclaw/workspace-kai",
        "agentDir": "~/.openclaw/agents/kai/agent",
        "model": "openrouter/anthropic/claude-sonnet-4.5",
        "identity": { "name": "Kai" },
        "groupChat": { "mentionPatterns": ["@kai", "@ux", "@дизайн"] },
        "sandbox": { "mode": "non-main", "scope": "agent" },
        "tools": {
          "allow": ["read", "write", "edit", "browser",
                    "sessions_list", "sessions_send"],
          "deny": ["exec", "cron", "sessions_spawn"]
        }
      },

      // ─────── TIER 1.5: 🔍 SPECIALIST (Gemini 3 Pro) ───────
      {
        "id": "ava",
        "name": "Ava (Researcher)",
        "workspace": "~/.openclaw/workspace-ava",
        "agentDir": "~/.openclaw/agents/ava/agent",
        "model": "openrouter/google/gemini-3-pro-preview",
        "identity": { "name": "Ava" },
        "groupChat": { "mentionPatterns": ["@ava", "@research", "@ресёрч"] },
        "tools": {
          "allow": ["read", "write", "edit", "browser",
                    "sessions_list", "sessions_send"],
          "deny": ["exec", "cron", "sessions_spawn"]
        }
      },

      // ─────── TIER 2: ⚡ WORKHORSE ───────
      {
        "id": "leo",
        "name": "Leo (SecOps)",
        "workspace": "~/.openclaw/workspace-leo",
        "agentDir": "~/.openclaw/agents/leo/agent",
        "model": "openrouter/deepseek/deepseek-v3.2",
        "identity": { "name": "Leo" },
        "groupChat": { "mentionPatterns": ["@leo", "@secops", "@security", "@безопасность"] },
        "sandbox": { "mode": "all", "scope": "agent" },
        "tools": {
          "allow": ["read", "write", "edit", "exec",
                    "sessions_list", "sessions_send"],
          "deny": ["browser", "cron", "sessions_spawn"]
        }
      },
      {
        "id": "quinn",
        "name": "Quinn (QA)",
        "workspace": "~/.openclaw/workspace-quinn",
        "agentDir": "~/.openclaw/agents/quinn/agent",
        "model": "openrouter/deepseek/deepseek-v3.2",
        "identity": { "name": "Quinn" },
        "groupChat": { "mentionPatterns": ["@quinn", "@qa", "@тесты"] },
        "sandbox": { "mode": "all", "scope": "agent" },
        "tools": {
          "allow": ["read", "write", "edit", "exec",
                    "sessions_list", "sessions_send"],
          "deny": ["browser", "cron", "sessions_spawn"]
        }
      },
      {
        "id": "elena",
        "name": "Elena (AI Act Expert)",
        "workspace": "~/.openclaw/workspace-elena",
        "agentDir": "~/.openclaw/agents/elena/agent",
        "model": "openrouter/google/gemini-3-flash-preview",
        "identity": { "name": "Elena" },
        "groupChat": { "mentionPatterns": ["@elena", "@legal", "@юрист"] },
        "tools": {
          "allow": ["read", "write", "edit", "browser",
                    "sessions_list", "sessions_send"],
          "deny": ["exec", "cron", "sessions_spawn"]
        }
      },
      {
        "id": "diana",
        "name": "Diana (Docs)",
        "workspace": "~/.openclaw/workspace-diana",
        "agentDir": "~/.openclaw/agents/diana/agent",
        "model": "openrouter/google/gemini-3-flash-preview",
        "identity": { "name": "Diana" },
        "groupChat": { "mentionPatterns": ["@diana", "@docs", "@доки"] },
        "tools": {
          "allow": ["read", "write", "edit",
                    "sessions_list", "sessions_send"],
          "deny": ["exec", "browser", "cron", "sessions_spawn"]
        }
      },
      {
        "id": "derek",
        "name": "Derek (DevOps)",
        "workspace": "~/.openclaw/workspace-derek",
        "agentDir": "~/.openclaw/agents/derek/agent",
        "model": "openrouter/deepseek/deepseek-v3.2",
        "identity": { "name": "Derek" },
        "groupChat": { "mentionPatterns": ["@derek", "@devops", "@деплой"] },
        "tools": {
          "allow": ["read", "write", "edit", "exec",
                    "sessions_list", "sessions_send"],
          "deny": ["browser", "sessions_spawn"]
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════
  // BINDINGS — маршрутизация Telegram → агентов
  // ═══════════════════════════════════════════════════════
  "bindings": [
    { "agentId": "alex",   "default": true, "match": { "channel": "telegram", "accountId": "alex" } },
    { "agentId": "marcus", "match": { "channel": "telegram", "accountId": "marcus" } },
    { "agentId": "max",    "match": { "channel": "telegram", "accountId": "max" } },
    { "agentId": "nina",   "match": { "channel": "telegram", "accountId": "nina" } },
    { "agentId": "kai",    "match": { "channel": "telegram", "accountId": "kai" } },
    { "agentId": "ava",    "match": { "channel": "telegram", "accountId": "ava" } },
    { "agentId": "leo",    "match": { "channel": "telegram", "accountId": "leo" } },
    { "agentId": "quinn",  "match": { "channel": "telegram", "accountId": "quinn" } },
    { "agentId": "elena",  "match": { "channel": "telegram", "accountId": "elena" } },
    { "agentId": "diana",  "match": { "channel": "telegram", "accountId": "diana" } },
    { "agentId": "derek",  "match": { "channel": "telegram", "accountId": "derek" } }
  ],

  // ═══════════════════════════════════════════════════════
  // CHANNELS — Telegram multi-account (11 ботов)
  // ═══════════════════════════════════════════════════════
  "channels": {
    "telegram": {
      "dmPolicy": "allowlist",
      "accounts": {
        "alex":   { "botToken": "ВСТАВЬ_ТОКЕН_ALEX",   "name": "Alex Orchestrator" },
        "marcus": { "botToken": "ВСТАВЬ_ТОКЕН_MARCUS", "name": "Marcus CTO" },
        "max":    { "botToken": "ВСТАВЬ_ТОКЕН_MAX",    "name": "Max Backend" },
        "nina":   { "botToken": "ВСТАВЬ_ТОКЕН_NINA",   "name": "Nina Frontend" },
        "kai":    { "botToken": "ВСТАВЬ_ТОКЕН_KAI",    "name": "Kai UX" },
        "ava":    { "botToken": "ВСТАВЬ_ТОКЕН_AVA",    "name": "Ava Researcher" },
        "leo":    { "botToken": "ВСТАВЬ_ТОКЕН_LEO",    "name": "Leo SecOps" },
        "quinn":  { "botToken": "ВСТАВЬ_ТОКЕН_QUINN",  "name": "Quinn QA" },
        "elena":  { "botToken": "ВСТАВЬ_ТОКЕН_ELENA",  "name": "Elena Legal" },
        "diana":  { "botToken": "ВСТАВЬ_ТОКЕН_DIANA",  "name": "Diana Docs" },
        "derek":  { "botToken": "ВСТАВЬ_ТОКЕН_DEREK",  "name": "Derek DevOps" }
      }
    }
  },

  // ═══════════════════════════════════════════════════════
  // SKILLS & CLAWHUB
  // ═══════════════════════════════════════════════════════
  "skills": {
    "load": { "extraDirs": ["~/.openclaw/shared-skills"] }
  },
  "clawhub": { "enabled": true }
}
```

## 4.2 Переменные окружения — `~/.openclaw/.env`

```bash
# ═══════ LLM API ═══════
# OpenRouter — единый ключ для всех моделей
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx

# ═══════ Infrastructure ═══════
DATABASE_URL=postgresql://user:pass@localhost:5432/aiact
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxx

# ═══════ Telegram Bot Tokens ═══════
# ⚠️ НЕ сюда! Токены → openclaw.json → channels.telegram.accounts
```

---

# ЧАСТЬ 5: SCRUM WORKFLOW — Разработка продукта (🆕 v7.0)

## 5.0 Scrum Framework — Основа нашего процесса

```
ЧТО ТАКОЕ SCRUM (все участники обязаны знать):
═════════════════════════════════════════════════════════

Scrum — это фреймворк для итеративной разработки прдукта.
Продукт создаётся не целиком, а СПРИНТАМИ (короткими итерациями),
каждый из которых доставляет работающий инкремент продукта.
Длина спринта определяется объёмом задач (AI-агенты работают быстрее людей).

SCRUM WORKFLOW:
  Product Backlog → Sprint Planning → Sprint Backlog
     → Sprint → Potential Product Increment
     → Sprint Review → [Approval Gate: Product Owner]
     → Burndown Chart update → Следующий спринт

КЛЮЧЕВЫЕ ПРИНЦИПЫ:
  • Без артефактов — нет разработки (документы создаются ДО кода)
  • Без утверждения Product Owner — спринт НЕ начинается
  • Без тестов и review — задача НЕ считается Done
  • Каждый спринт заканчивается работающим инкрементом
  • Sprint Review + Product Owner Approval → перед следующим спринтом
═════════════════════════════════════════════════════════
```

### 5.0.1 Роли

```
SCRUM-РОЛИ В НАШЕЙ КОМАНДЕ:
═════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────┐
│  🎯 PRODUCT OWNER — Фаундер                        │
│  ─────────────────────────────────────────────────  │
│  • Владелец Product Backlog (все фичи продукта)     │
│  • Приоритизация фич                                │
│  • Утверждение Sprint Backlog перед стартом          │
│  • Утверждение Sprint Review после завершения        │
│  • Финальное «✅» или «❌ доработать»               │
│  • ЕДИНСТВЕННЫЙ кто решает ЧТО строить              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🧠 PLANNING MASTER — Marcus (CTO)                  │
│  ─────────────────────────────────────────────────  │
│  • Часть роли Scrum Master: ПЛАНИРОВАНИЕ            │
│  • Декомпозиция фич → User Stories                  │
│  • Формирование Sprint Backlog                      │
│  • Подготовка архитектурных артефактов               │
│  • Code review + approve PRs (review gate, НЕ merge) │
│  • Контроль Definition of Done                      │
│  • Отвечает за ЧТО и КАК делать технически          │
│  • Модель: Claude Opus 4.5 (самый умный → планирует)│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📋 EXECUTION MASTER — Alex (Orchestrator)          
│  ─────────────────────────────────────────────────  │
│  • Часть роли Scrum Master: КОНТРОЛЬ ИСПОЛНЕНИЯ     │
│  • Ведение Scrum Board (SPRINT-BOARD.md)            │
│  • Daily Scrum — ежедневный отчёт                   │
│  • Sprint Review — отчёт по спринту                 │
│  • Burndown Chart — обновление после каждой задачи  │
│  • Трекинг: КТО, КОГДА и ГДЕ сейчас                │
│  • Блокеры, эскалация, координация                  │
│  • Архив спринтов                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  👥 DEVELOPMENT TEAM (все остальные 9 агентов)      │
│  ─────────────────────────────────────────────────  │
│  Max (BE), Nina (FE), Leo (SecOps), Quinn (QA),    │
│  Derek (DevOps), Diana (Docs), Kai (UX),           │
│  Elena (Legal), Ava (Research)                      │
│  • Self-assign задачи из Sprint Backlog             │
│  • Выполнение User Stories                          │
│  • Соблюдение Definition of Done                    │
│  • Отчёт о прогрессе в группу                       │
└─────────────────────────────────────────────────────┘
═════════════════════════════════════════════════════════
```

### 5.0.2 Approval Gates (обновлено)

```
⛔ ТОЧКИ ОБЯЗАТЕЛЬНОГО УТВЕРЖДЕНИЯ (APPROVAL GATES):
═════════════════════════════════════════════════════════
Команда ОСТАНАВЛИВАЕТСЯ и ЖДЁТ «✅» от Product Owner:

  1. 🏗️ Архитектурные артефакты (Фаза 0 — один раз перед проектом)
     Marcus подготовил: ARCHITECTURE.md, DATABASE.md, DATA-FLOWS.md,
     CODING-STANDARDS.md → Product Owner утверждает

  2. 📋 Sprint Backlog (перед КАЖДЫМ спринтом)
     Marcus + Alex подготовили Sprint Backlog + Scrum Board
     → Product Owner утверждает

  3. 🎯 Sprint Review (после КАЖДОГО спринта)
     Alex подготовил Sprint Review report → Product Owner решает:
     ✅ → следующий спринт
     📝 → доработки → переносятся в следующий Sprint Backlog как [Rework]

  4. ⚠️ Критическое решение (в любой момент)
     Breaking change, смена стека, удаление модуля

Между gates: команда работает ПОЛНОСТЬЮ АВТОНОМНО.

ЗАПРЕЩЕНО:
  ✗ Спрашивать Product Owner «что делать дальше?» внутри спринта
  ✗ Начинать Sprint без утверждения Sprint Backlog
  ✗ Начинать следующий Sprint без Sprint Review approval
  ✗ Приступать к коду без архитектурных артефактов (Фаза 0)

РАЗРЕШЕНО (без утверждения):
  ✓ Self-assign задачи внутри утверждённого Sprint Backlog
  ✓ Выбирать подход к реализации (в рамках CODING-STANDARDS.md)
  ✓ Исправлять баги без уведомления (если не критический)
  ✓ Security fix-ы (Leo находит → Max/Nina фиксят)
  ✓ Рефакторинг по CODING-STANDARDS.md
═════════════════════════════════════════════════════════
```

## 5.1 Scrum-артефакты — Полный перечень (🆕 v7.0)

### 5.1.1 Продуктовые артефакты

```
АРТЕФАКТ 1: PRODUCT-BACKLOG.md — Бэклог продукта
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/PRODUCT-BACKLOG.md

ЧТО: Полный список ВСЕХ фич продукта.
     Каждая фича декомпозирована на User Stories.
КОГДА: Создаётся в Фазе 0 (Marcus), дополняется перед каждым спринтом.
КТО ПИШЕТ: Marcus (CTO) — декомпозиция фич → User Stories.
КТО УТВЕРЖДАЕТ: Product Owner (Фаундер) — приоритизация.
КТО ЧИТАЕТ: Все агенты (для понимания продукта целиком).

ФОРМАТ:
─────────────────────────────────────────────────────────
# Product Backlog — AI Act Compliance Platform

## Feature 001: User Registration & Auth
Приоритет: P0 | Статус: ✅ Sprint 001

### US-001.1 [Tech][BE] Регистрация по email + password
  As a SMB owner, I want to register with email and password,
  so that I can access the platform.
  Acceptance: signup endpoint, validation, JWT token, tests
  Story Points: 5

### US-001.2 [Tech][FE] Форма регистрации + валидация
  As a user, I want a registration form with real-time validation,
  so that I can register easily.
  Acceptance: React form, zod validation, error states, responsive
  Story Points: 3

### US-001.3 [Tech][BE] OAuth 2.0 (Google, Microsoft)
  ...

## Feature 002: Risk Classification Engine
Приоритет: P0 | Статус: 🔨 Sprint 003

### US-002.1 [Tech][BE] POST /api/risk/classify endpoint
  Story Points: 8
### US-002.2 [Tech][FE] Classification wizard UI
  Story Points: 5
### US-002.3 [Legal] AI Act Art.6 risk category mapping
  Story Points: 3
### US-002.4 [Research] Competitor risk classification analysis
  Story Points: 2
### US-002.5 [UX] Wireframes: classification flow
  Story Points: 2

## Feature 003: Dashboard & Analytics
Приоритет: P1 | Статус: ⏳ Backlog
  ...
─────────────────────────────────────────────────────────

ТЕГИ USER STORIES (в одном спринте, все вместе):
  [Tech][BE]    — Backend (Max)
  [Tech][FE]    — Frontend (Nina)
  [Tech][DB]    — Database (Max по спеке Marcus)
  [Tech][Infra] — CI/CD, Docker (Derek)
  [SecOps]      — Security audit (Leo)
  [QA]          — Тесты (Quinn)
  [Legal]       — AI Act compliance (Elena)
  [Research]    — Ресёрч (Ava)
  [UX]          — Wireframes, прототипы (Kai)
  [Docs]        — Документация (Diana)
═════════════════════════════════════════════════════════


АРТЕФАКТ 2: SPRINT-BACKLOG.md — Бэклог текущего спринта
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/SPRINT-BACKLOG.md

ЧТО: User Stories, выбранные (pull) из Product Backlog в текущий спринт.
КОГДА: Создаётся при Sprint Planning перед каждым спринтом.
КТО ПИШЕТ: Marcus (pull user stories + acceptance criteria).
КТО УТВЕРЖДАЕТ: Product Owner (Фаундер) — ⛔ APPROVAL GATE.
КТО ЧИТАЕТ: Все агенты (self-assign из этого списка).

ФОРМАТ:
─────────────────────────────────────────────────────────
# Sprint 003 Backlog — Risk Classification Module
Даты: 2026-02-03 → 2026-02-14
Цель: Реализовать risk classification pipeline (Art. 6)
Story Points: 38 total

## Pulled User Stories:

### US-002.1 [Tech][BE] POST /api/risk/classify — SP: 8
  (полное описание + acceptance criteria)

### US-002.2 [Tech][FE] Classification wizard UI — SP: 5
  ...

### US-002.3 [Legal] AI Act Art.6 risk mapping — SP: 3
  ...

### US-002.5 [UX] Wireframes classification flow — SP: 2
  ...

### US-RW-001 [Rework] Fix auth token refresh — SP: 2
  (доработка из предыдущего спринта по замечаниям PO)
─────────────────────────────────────────────────────────
═════════════════════════════════════════════════════════


АРТЕФАКТ 3: SPRINT-BOARD.md — Scrum Board
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/SPRINT-BOARD.md

ЧТО: Доска задач текущего спринта с 5 колонками.
КОГДА: Создаётся при Sprint Planning, обновляется Alex при каждом
       изменении статуса (из группового чата).
КТО ОБНОВЛЯЕТ: Alex (Execution Master) — парсит группу, двигает задачи.
КТО ЧИТАЕТ: Все агенты, Product Owner.

ФОРМАТ:
─────────────────────────────────────────────────────────
# 📋 Scrum Board — Sprint 003

| Sprint Backlog | To Do (assigned) | Doing | Testing | Done |
|---------------|-------------------|-------|---------|------|
| | | US-002.1 Max | | |
| | US-002.5 Kai | US-002.3 Elena | | |
| | | | US-001.3 Quinn | |
| | | | | US-002.4 Ava ✅ |

Обновлено: 2026-02-07 14:32 UTC
Sprint Progress: 8/38 SP done (21%)
─────────────────────────────────────────────────────────

КОЛОНКИ:
  Sprint Backlog — User Story ещё никем не взята
  To Do          — Назначена (self-assign), ещё не начата
  Doing          — В работе (агент кодит/исследует/пишет)
  Testing        — [Tech] задачи: Quinn покрывает тестами,
                   проверяет работоспособность. Только ПОСЛЕ
                   прохождения тестов → PR → review Marcus
  Done           — Задача прошла ВСЕ проверки Definition of Done

ПРАВИЛО ПЕРЕХОДА В Done (см. Definition of Done ниже):
  ⛔ Задача НЕ Done пока не пройдены ВСЕ критерии DoD.
═════════════════════════════════════════════════════════


АРТЕФАКТ 4: BURNDOWN.md — Burndown Chart
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/BURNDOWN.md

ЧТО: График сгорания Story Points по дням спринта.
КОГДА: Alex обновляет после каждой закрытой User Story.
КТО ОБНОВЛЯЕТ: Alex (Execution Master).

ФОРМАТ:
─────────────────────────────────────────────────────────
# 📉 Burndown Chart

## Sprint 003 — Risk Classification (38 SP total)

| День | Дата       | Осталось SP | Закрыто сегодня | Идеал |
|------|------------|-------------|-----------------|-------|
| 0    | 2026-02-03 | 38          | —               | 38.0  |
| 1    | 2026-02-04 | 35          | US-002.4 (3)    | 34.2  |
| 2    | 2026-02-05 | 35          | —               | 30.4  |
| 3    | 2026-02-06 | 30          | US-002.5 (2), US-002.3 (3) | 26.6 |
| ...  |            |             |                 |       |
| 10   | 2026-02-14 | 0           |                 | 0.0   |

Velocity: Sprint 001 = 32 SP, Sprint 002 = 36 SP
Среднее: 34 SP / sprint

## Архив Burndown прошлых спринтов:
  (данные Sprint 001, 002... для velocity tracking)
─────────────────────────────────────────────────────────
═════════════════════════════════════════════════════════
```

### 5.1.2 Архитектурные артефакты (Фаза 0 — до первого спринта)

```
АРТЕФАКТ 5: ARCHITECTURE.md — Архитектура DDD / Onion (🆕 v7.1)
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/ARCHITECTURE.md

ЧТО: Архитектура проекта по принципу DDD (Domain-Driven Design)
     с Onion Architecture (Clean Architecture).

АРХИТЕКТУРНЫЙ ПАТТЕРН: ONION (ЛУКОВИЧНАЯ) АРХИТЕКТУРА
─────────────────────────────────────────────────────────

Концентрические кольца (зависимости ТОЛЬКО внутрь ←):

  ┌──────────────── Infrastructure (внешний слой) ────────────────┐
  │  Persistence: Postgres, Redis                                │
  │  Infrastructure: Logger, Scheduler, Health Mon, Configs      │
  │  Security: AAA, Sessions, Cryptography, App Firewall         │
  │  External: External API, Validation                          │
  │                                                              │
  │  ┌──────────── Presentation ──────────────┐                  │
  │  │  Mobile UI, Web UI, API Gateway        │                  │
  │  │                                        │                  │
  │  │  ┌──── Application Services ────┐      │                  │
  │  │  │  Оркестрация сценариев       │      │                  │
  │  │  │  Координация домена          │      │                  │
  │  │  │  с внешним миром             │      │                  │
  │  │  │                              │      │                  │
  │  │  │  ┌── Domain Services ──┐     │      │                  │
  │  │  │  │  Операции, не при-  │     │      │                  │
  │  │  │  │  надлежащие одной   │     │      │                  │
  │  │  │  │  сущности           │     │      │                  │
  │  │  │  │                     │     │      │                  │
  │  │  │  │  ┌─ Domain Model ─┐ │     │      │                  │
  │  │  │  │  │ Чистая бизнес- │ │     │      │                  │
  │  │  │  │  │ логика. Ни от  │ │     │      │                  │
  │  │  │  │  │ чего не зависит│ │     │      │                  │
  │  │  │  │  └────────────────┘ │     │      │                  │
  │  │  │  └─────────────────────┘     │      │                  │
  │  │  └──────────────────────────────┘      │                  │
  │  └────────────────────────────────────────┘                  │
  └──────────────────────────────────────────────────────────────┘

КЛЮЧЕВОЙ ПРИНЦИП: Стрелки зависимостей направлены ТОЛЬКО ВНУТРЬ.
  → Postgres знает про домен, но домен НЕ знает про Postgres.
  → Ядро можно тестировать изолированно.
  → Инфраструктуру можно менять (Postgres→MongoDB) без изменения
    бизнес-логики.

Ref: Тимур Шемсединов — «Архитектура приложений: слои и DI»

СОДЕРЖАНИЕ ARCHITECTURE.md:
─────────────────────────────────────────────────────────
  1. Domain Model — сущности, value objects, агрегаты
  2. Domain Services — бизнес-операции между сущностями
  3. Application Services — use cases, оркестрация
  4. Presentation — endpoints (API Gateway, Web UI)
  5. Infrastructure — DB adapters, external APIs, logging
  6. Dependency Injection — как слои связываются (inversion of control)
  7. Mermaid-диаграммы: структура модулей
  8. Sequence diagrams: ключевые use cases
─────────────────────────────────────────────────────────

КОГДА: Создаётся в Фазе 0 (Marcus или PO), обновляется при решениях.
КТО ПИШЕТ: Marcus (CTO) — или PO предоставляет готовый (см. правило 3.2).
КТО УТВЕРЖДАЕТ: Product Owner — ⛔ APPROVAL GATE (Фаза 0).
КТО ЧИТАЕТ: Max, Nina, Derek, Leo, Diana (обязательно перед кодом).
═════════════════════════════════════════════════════════


АРТЕФАКТ 6: DATABASE.md — Схема базы данных
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/DATABASE.md

ЧТО: ER-диаграммы, описание всех таблиц, связей, индексов,
     миграций. Каждая таблица: колонки, типы, constraints.
КОГДА: Создаётся в Фазе 0, расширяется в каждом спринте.
КТО ПИШЕТ: Marcus (проектирует), Max (имплементирует Prisma schema).
КТО ЧИТАЕТ: Max (обязательно), Leo (для security audit).
═════════════════════════════════════════════════════════


АРТЕФАКТ 7: DATA-FLOWS.md — Потоки данных
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/DATA-FLOWS.md

ЧТО: Sequence diagrams: как данные проходят от UI до DB и обратно
     для каждого ключевого use case.
КОГДА: Создаётся в Фазе 0, расширяется при новых фичах.
КТО ПИШЕТ: Marcus (Mermaid sequence diagrams).
КТО ЧИТАЕТ: Max, Nina (обязательно — чтобы знать API контракт).
═════════════════════════════════════════════════════════


АРТЕФАКТ 8: CODING-STANDARDS.md — Правила написания кода ⭐
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/CODING-STANDARDS.md

ЧТО: Документ CTO, определяющий КАК писать код в проекте.
     Это ЗАКОН для всех разработчиков. Marcus проверяет
     соответствие при каждом code review.

КОГДА: Создаётся Marcus в Фазе 0, утверждается PO.
КТО ПИШЕТ: Marcus (CTO) — единственный автор.
КТО УТВЕРЖДАЕТ: Product Owner (как часть Фазы 0 артефактов).
КТО ОБЯЗАН СОБЛЮДАТЬ: Max, Nina, Quinn, Derek, Diana.
MARCUS ПРОВЕРЯЕТ при каждом Code Review PR.

СОДЕРЖАНИЕ (пример):
─────────────────────────────────────────────────────────
# Coding Standards — AI Act Compliance Platform

## Парадигма
• Функциональное программирование — НЕ используем классы
• Pure functions где возможно
• Immutable data (const, readonly, Object.freeze)
• Composition over inheritance

## TypeScript
• strict: true (обязательно)
• Явные типы для всех публичных API
• Zod для runtime validation
• Нет any, нет as (кроме type guards)

## Backend (Max) — DDD / Onion Architecture
• Layers: domain → domain-services → application → presentation → infra
• Domain Model: чистая бизнес-логика, никаких зависимостей от фреймворков
• Domain Services: операции между сущностями
• Application Services: оркестрация use cases
• Presentation (controllers): только routing + validation + response
• Infrastructure: DB adapters (Prisma), external APIs, logging
• Dependency Injection: зависимости направлены ТОЛЬКО внутрь
• Repository pattern: domain НЕ знает про Postgres/Prisma
• Error handling: custom AppError hierarchy в domain layer
• Все endpoints: zod validation input + typed response

## Frontend (Nina)
• React functional components ONLY
• Hooks: custom hooks для логики
• State: Zustand (global), useState (local)
• Styling: TailwindCSS + shadcn/ui
• Accessibility: WCAG AA minimum
• Responsive: mobile-first

## Именование
• Файлы: kebab-case (risk-classifier.service.ts)
• Функции: camelCase (classifyRisk)
• Типы/интерфейсы: PascalCase (RiskClassification)
• Константы: UPPER_SNAKE (MAX_RISK_SCORE)
• Компоненты React: PascalCase (RiskWizard.tsx)

## Git Commits: Conventional Commits (обязательно)
  feat(scope): description
  fix(scope): description
  test(scope): description

## Тестирование
• Unit tests: vitest (backend), jest (frontend)
• Минимум: все public функции в services
• Naming: describe("functionName") → it("should...")
• Mocking: только внешние зависимости (DB, API)

## Запрещено
• ❌ Классы (кроме Error subclasses)
• ❌ any, unknown без type guard
• ❌ Мутабельные данные в shared state
• ❌ console.log в production (только logger)
• ❌ Hardcoded strings (используй enums/constants)
• ❌ Бизнес-логика в controllers
─────────────────────────────────────────────────────────
═════════════════════════════════════════════════════════


АРТЕФАКТ 9: SECURITY-POLICY.md — Политика безопасности
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/SECURITY-POLICY.md

ЧТО: Findings каждого security audit + рекомендации + fixes.
КТО ПИШЕТ: Leo (обновляет после каждого PR review).
КТО ЧИТАЕТ: Max, Nina (для соблюдения), Marcus (при review).
═════════════════════════════════════════════════════════


АРТЕФАКТ 10: ADR (Architecture Decision Records)
═════════════════════════════════════════════════════════
Файлы: ~/.openclaw/knowledge-base/adr/ADR-NNN-*.md

ЧТО: Запись каждого архитектурного решения: контекст, варианты,
     решение, последствия.
КОГДА: Marcus создаёт при каждом значимом тех. решении.
ФОРМАТ: ADR-001-auth-jwt.md, ADR-002-modular-monolith.md
═════════════════════════════════════════════════════════


АРТЕФАКТ 11: AI-ACT-KB.md — База знаний AI Act
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/AI-ACT-KB.md

ЧТО: Выжимки из EU AI Act, маппинг статей на наш продукт.
КТО ПИШЕТ: Elena (основной) + Ava (ресёрч).
КТО ЧИТАЕТ: Marcus (для архитектурных решений), все.
═════════════════════════════════════════════════════════


АРТЕФАКТ 12: RESEARCH-LOG.md — Лог исследований
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/RESEARCH-LOG.md

ЧТО: Все исследования Ava + результаты.
КТО ПИШЕТ: Ava (после каждого ресёрча).
КТО ЧИТАЕТ: Все (через memory_search).
════════════════════════════════════════════════════════


АРТЕФАКТ 13: PROJECT.md — Паспорт проекта
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/PROJECT.md

ЧТО: Суть проекта, текущая фаза, ключевые решения, глоссарий.
КТО ПИШЕТ: Alex (по указаниям PO и Marcus).
КТО ЧИТАЕТ: ВСЕ агенты (инжектируется в контекст).
═════════════════════════════════════════════════════════
```

### 5.1.3 Операционные артефакты (создаются в процессе)

```
АРТЕФАКТ 14: SPRINT-REVIEW.md — Отчёт по спринту
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/sprints/SPRINT-NNN-REVIEW.md

ЧТО: Итоговый отчёт по завершённому спринту.
КОГДА: Alex формирует после закрытия всех задач спринта.
КТО ПИШЕТ: Alex (Execution Master).
КТО УТВЕРЖДАЕТ: Product Owner — ⛔ APPROVAL GATE.
ФОРМАТ: см. раздел 5.6 Ceremonies → Sprint Review.
═════════════════════════════════════════════════════════


АРТЕФАКТ 15: DAILY-SCRUM / YYYY-MM-DD.md — Ежедневный отчёт
═════════════════════════════════════════════════════════
Файл: ~/.openclaw/knowledge-base/daily-scrum/YYYY-MM-DD.md

ЧТО: Ежедневный Scrum-отчёт с единой формой.
КОГДА: Alex генерирует каждый день в 18:00.
КТО ПИШЕТ: Alex (автоматически на основе группового чата).
ФОРМАТ: см. раздел 5.6 Ceremonies → Daily Scrum.
═════════════════════════════════════════════════════════
```

### 5.1.4 Матрица артефактов — Кто и когда

```
СВОДНАЯ МАТРИЦА АРТЕФАКТОВ:
═════════════════════════════════════════════════════════
  №  │ Артефакт           │ Автор        │ Когда              │ PO Approve?
  ───┼────────────────────┼──────────────┼────────────────────┼────────────
  1  │ PRODUCT-BACKLOG    │ Marcus       │ Фаза 0 + ongoing   │ ✅ Да
  2  │ SPRINT-BACKLOG     │ Marcus       │ Перед спринтом      │ ✅ Да
  3  │ SPRINT-BOARD       │ Alex         │ Во время спринта    │ Нет (видит)
  4  │ BURNDOWN           │ Alex         │ Ежедневно           │ Нет (видит)
  5  │ ARCHITECTURE       │ Marcus       │ Фаза 0 + при решениях│ ✅ Да
  6  │ DATABASE           │ Marcus       │ Фаза 0 + при фичах  │ Нет
  7  │ DATA-FLOWS         │ Marcus       │ Фаза 0 + при фичах  │ Нет
  8  │ CODING-STANDARDS   │ Marcus       │ Фаза 0 (один раз)   │ ✅ Да
  9  │ SECURITY-POLICY    │ Leo          │ После каждого PR     │ Нет
  10 │ ADR-NNN            │ Marcus       │ При тех. решениях    │ Нет
  11 │ AI-ACT-KB          │ Elena + Ava  │ Ongoing              │ Нет
  12 │ RESEARCH-LOG       │ Ava          │ По запросам          │ Нет
  13 │ PROJECT            │ Alex         │ Фаза 0 + ongoing     │ Нет
  14 │ SPRINT-REVIEW      │ Alex         │ После спринта        │ ✅ Да
  15 │ DAILY-SCRUM        │ Alex         │ Ежедневно 18:00      │ Нет (видит)

  PO Approve = ✅ → ⛔ APPROVAL GATE, команда ждёт.
  PO Approve = Нет → создаётся автономно, PO может читать.
═════════════════════════════════════════════════════════
```

## 5.2 Definition of Done (🆕 v7.0)

```
DEFINITION OF DONE (DoD):
═════════════════════════════════════════════════════════

Задача считается "Done" ТОЛЬКО когда выполнены ВСЕ критерии.
Без ПОЛНОГО DoD → задача остаётся в колонке Testing/Doing.

─── DoD для [Tech] User Story (код) ─────────────────────

  ✅ 1. Код написан и соответствует CODING-STANDARDS.md
  ✅ 2. Код соответствует ARCHITECTURE.md (DDD / Onion layers)
  ✅ 3. Unit tests написаны и проходят (Quinn или автор)
  ✅ 4. PR создан → develop (gh pr create)
  ✅ 5. Marcus Code Review: APPROVED ✅
        Marcus проверяет:
        □ Соответствие архитектуре (ARCHITECTURE.md)
        □ Соответствие стандартам (CODING-STANDARDS.md)
        □ Acceptance criteria User Story выполнены
        □ Тесты покрывают основные сценарии
  ✅ 6. Leo Security Audit: PASS ✅
  ✅ 7. PR merged в develop (PO мержит после approve Marcus + Leo)
  ✅ 8. Alex обновил Scrum Board → колонка Done

  Если Marcus говорит "Changes requested":
    → программер возвращается в цикл Doing
    → исправляет → push → re-request review
    → повторяется до получения approve

─── DoD для [Legal] / [Research] / [UX] / [Docs] ──────

  ✅ 1. Результат записан в соответствующий KB файл
  ✅ 2. Marcus или Alex подтвердил качество
  ✅ 3. Alex обновил Scrum Board → Done

─── DoD для Sprint (весь спринт) ────────────────────────

  ✅ 1. Все User Stories в Sprint Backlog = Done (или перенесены)
  ✅ 2. Все тесты проходят (Quinn подтвердил)
  ✅ 3. Sprint Review report подготовлен (Alex)
  ✅ 4. Burndown Chart обновлён (Alex)
  ✅ 5. Product Owner (Фаундер) утвердил ✅
        ⛔ APPROVAL GATE — без этого следующий спринт НЕ начинается

  Если Product Owner говорит "доработать X, Y, Z":
    → Текущий спринт ЗАКРЫВАЕТСЯ (as is)
    → Доработки создаются как [Rework] User Stories
    → Добавляются в Sprint Backlog следующего спринта с P0 приоритетом
    → Отражается в Sprint Review текущего спринта
═════════════════════════════════════════════════════════
```

## 5.3 Единая точка коммуникации — группа «🦞 Dev Team»

```
ПРИНЦИП: ОДНА группа — ОДНА точка правды.
Никаких разрозненных чатов. Все общение по проекту — в одном месте.
─────────────────────────────────────────────────────────

«🦞 Dev Team» — единственная группа проекта.
Все 11 ботов + Фаундер в ней.

ПРАВИЛО ТЕГОВ:
  Каждый агент ОБЯЗАН тегать адресата: @max, @nina, @leo, @all и т.д.
  Каждый агент реагирует ТОЛЬКО на сообщения, где он затегнут.
  Сообщения без тега — информационные (статусы спринта), их видят все,
  но ОТВЕЧАТЬ на них НЕ нужно.

ПРАВИЛО requireMention: true:
  ┌──────────────────────────────────────────────────────┐
  │  requireMention: true  = бот реагирует ТОЛЬКО когда │
  │  его затегнули (@имя или mentionPatterns)            │
  │                                                      │
  │  Это значит:                                         │
  │  ✅ @max найди баг в endpoint /classify — Max ответит│
  │  ✅ @ava найди доку по Prisma — Ava ответит          │
  │  ❌ "нужна дока по Prisma" — НИКТО не ответит       │
  │  ℹ️  📋 [US-002.8] Взял: ... — ВСЕ видят, никто     │
  │     не отвечает (информационное)                     │
  └──────────────────────────────────────────────────────┘

ИСКЛЮЧЕНИЕ — Alex (Оркестратор):
  Alex имеет requireMention: false — видит ВСЕ сообщения.
  Зачем: мониторит прогресс, ловит блокеры, считает метрики.
  Alex НЕ отвечает на каждое сообщение — только когда нужно вмешаться.

ФОРМАТ СООБЩЕНИЙ В ГРУППЕ:
  Статусы (информационные, без тега):
  📋 [SPRINT-003] [US-002.8] Взял: API risk classifier endpoints
  🔨 [SPRINT-003] [US-002.8] В процессе: 60%, endpoint /classify готов

  Запросы (с тегом — ждут ответа):
  ✅ [US-002.8] Готово: PR #12 → @leo ревью?
  🔒 [US-002.8] SecOps: 1 issue → @max нужен fix
  🔍 @ava нужна дока по NIST AI RMF для risk scoring
  🧪 [US-002.8] QA: 50/50 pass ✅ → @alex задача закрыта
  ❓ @marcus как обрабатывать edge case с пустым AI system?

  Фаундер (может обращаться к любому):
  @alex статус спринта?
  @marcus покажи текущую архитектуру
  @all стоп, меняем приоритеты

FOUNDER OVERRIDE (DM):
  Фаундер ТАКЖЕ может написать любому агенту напрямую в DM.
  DM = приватный 1-на-1 через Telegram-бот агента.
  Используется для глубоких обсуждений (архитектура с Marcus,
  UI-детали с Nina, security с Leo).
  ОБЯЗАТЕЛЬНО: агент уведомляет Alex через sessions_send.
─────────────────────────────────────────────────────────
```

## 5.4 Telegram Group — Конфигурация «🦞 Dev Team»

```json5
// В openclaw.json → channels.telegram
{
  channels: {
    telegram: {
      enabled: true,
      accounts: {
        // ... (11 аккаунтов из ЧАСТЬ 4)
      },
      groups: {
        "<DEV_TEAM_GROUP_ID>": {
          requireMention: true,       // 🆕 v6.2: агенты реагируют ТОЛЬКО на @теги
          systemPrompt: "You are in the '🦞 Dev Team' project group. Respond ONLY when @mentioned. Post sprint status updates without mentioning anyone. When addressing teammates, ALWAYS use @name tag. Be concise. Prefix with [SPRINT-NNN] [US-NNN]."
        }
      }
    }
  },
  agents: {
    list: [
      {
        id: "alex",
        groupChat: {
          // 🆕 v6.2: Alex = особый случай — видит ВСЕ для мониторинга
          requireMention: false,    // Alex видит все сообщения
          mentionPatterns: ["@alex", "@оркестратор", "@orchestrator", "@all"]
        }
      },
      {
        id: "marcus",
        groupChat: {
          mentionPatterns: ["@marcus", "@cto", "@архитектор", "@all"]
        }
      },
      {
        id: "max",
        groupChat: {
          mentionPatterns: ["@max", "@backend", "@бэкенд", "@all"]
        }
      },
      // ... аналогично для каждого агента (mentionPatterns включают @all)
    ]
  }
}
```

```
ВАЖНО про Telegram-группу:
─────────────────────────────────────────────────────────
• Создайте Supergroup (не обычную группу)
• BotFather: /setjoingroups → Enable для каждого бота
• BotFather: /setprivacy → Disable для каждого бота
  (чтобы бот ВИДЕЛ все сообщения и мог фильтровать по @mention)
• Добавьте всех 11 ботов в группу
• Каждый бот — НЕ админ (не нужен для чтения при Disable privacy)

ФИЛЬТРАЦИЯ СООБЩЕНИЙ (как это работает):
─────────────────────────────────────────────────────────
1. Сообщение приходит в группу
2. ВСЕ 11 ботов получают его (privacy disabled)
3. Каждый бот проверяет: есть ли мой @тег в mentionPatterns?
4. Если НЕТ → бот ИГНОРИРУЕТ сообщение (не тратит tokens)
5. Если ДА → бот обрабатывает и отвечает
6. ИСКЛЮЧЕНИЕ: Alex (requireMention: false) — видит всё

Это значит: одно сообщение "@max @leo ревью PR #12" →
  Max получает и отвечает ✅
  Leo получает и отвечает ✅
  Остальные 9 ботов — игнорируют (0 tokens)

ИЗОЛЯЦИЯ СЕССИЙ:
─────────────────────────────────────────────────────────
• DM-сессии каждого агента ОТДЕЛЬНЫ от групповой сессии
• Группа: agent:<agentId>:telegram:group:<chatId>
• DM:     agent:<agentId>:main:<mainKey>
• Агент помнит DM-контекст и групповой контекст РАЗДЕЛЬНО

ОТПРАВКА В ГРУППУ (агент → группа):
Агенты используют message tool:
  { action: "send", channel: "telegram",
    to: "<DEV_TEAM_GROUP_ID>",
    message: "📋 [SPRINT-003] [US-002.8] Взял: ..." }

ТЕГАНИЕ В ОТВЕТЕ (агент → агенту через группу):
  { action: "send", channel: "telegram",
    to: "<DEV_TEAM_GROUP_ID>",
    message: "✅ [US-002.8] Готово: PR #12 → @leo ревью?" }
────────────────────────────────────────────────────────
```

## 5.5 Scrum Ceremonies — Церемонии (🆕 v7.0)

### 5.5.1 Фаза 0 — Подготовка артефактов (один раз перед проектом)

```
ФАЗА 0: БЕЗ АРТЕФАКТОВ → НЕТ РАЗРАБОТКИ
═════════════════════════════════════════════════════════

Перед первым спринтом Marcus ОБЯЗАН подготовить:

  1. ARCHITECTURE.md      — DDD / Onion Architecture + Mermaid-диаграммы
  2. DATABASE.md           — ER-диаграммы, все таблицы
  3. DATA-FLOWS.md         — Sequence diagrams ключевых flows
  4. CODING-STANDARDS.md   — Правила написания кода ⭐
  5. PRODUCT-BACKLOG.md    — ВСЕ фичи → декомпозированные в User Stories
  6. ADR-001, ADR-002...   — Ключевые решения

Alex параллельно:
  7. PROJECT.md            — Паспорт проекта

⛔ APPROVAL GATE: Product Owner утверждает артефакты 1, 4, 5.
   Только ПОСЛЕ утверждения → можно планировать Sprint 001.
═════════════════════════════════════════════════════════
```

### 5.5.2 Ceremony 1: Sprint Planning

```
SPRINT PLANNING — Планирование спринта
═════════════════════════════════════════════════════════

КТО: Marcus (Planning Master) + Alex (Execution Master)
КОГДА: Перед каждым спринтом (после approval предыдущего)
РЕЗУЛЬТАТ: SPRINT-BACKLOG.md + SPRINT-BOARD.md

ШАГ 1: Marcus делает Pull из Product Backlog
  • Смотрит PRODUCT-BACKLOG.md → выбирает User Stories для спринта
  • Учитывает: приоритет PO, зависимости, velocity предыдущих спринтов
  • Учитывает [Rework] задачи от PO (P0, берутся первыми)
  • Суммарно: ~34-38 Story Points (на основе velocity)

ШАГ 2: Marcus пишет SPRINT-BACKLOG.md
  • Каждая User Story: полное описание + acceptance criteria
  • Story Points для оценки объёма
  • Зависимости между stories
  • Теги: [Tech][BE], [Tech][FE], [Legal], [Research], [UX], [Docs], [QA]

ШАГ 3: Alex дополняет
  • Проверяет полноту (все роли задействованы?)
  • Создаёт начальный SPRINT-BOARD.md (все в колонке Sprint Backlog)
  • Инициализирует BURNDOWN.md для нового спринта

ШАГ 4: Alex → Product Owner
  • "📋 Sprint 003 на утверждение:
     Цель: [описание]
     User Stories: N штук (X Story Points)
     Роли задействованы: [список]
     Срок: зависит от объёма (AI-агенты работают быстро)
     [ссылка на SPRINT-BACKLOG.md]
     Утвердить? ✅/❌"

⛔ APPROVAL GATE: Product Owner утверждает Sprint Backlog.
   Без «✅» → спринт НЕ начинается.

   PO может:
   ✅ Утвердить как есть
   📝 Попросить убрать/добавить User Stories → Marcus правит → повтор
   ❌ Отклонить → Marcus переделывает Sprint Backlog

ШАГ 5: Старт спринта
  Alex → группа: "🚀 Sprint 003 стартовал! [N] User Stories, [X] SP."
  Alex → sessions_spawn для всех агентов: "Спринт стартовал,
    Sprint Backlog доступен."
════════════════════════════════════════════════════════
```

### 5.5.3 Ceremony 2: Daily Scrum

```
DAILY SCRUM — Ежедневный отчёт
═════════════════════════════════════════════════════════

КТО: Alex (Execution Master) генерирует автоматически
КОГДА: Каждый день в 18:00 UTC
КУДА: Файл daily-scrum/YYYY-MM-DD.md + пост в группу «🦞 Dev Team»

Alex собирает данные из:
  • Группового чата (статусы агентов за день)
  • SPRINT-BOARD.md (текущее состояние)
  • BURNDOWN.md (оставшиеся SP)
  • GitHub (PRs created/merged/pending за день)

ЕДИНАЯ ФОРМА DAILY SCRUM:
─────────────────────────────────────────────────────────
# 📊 Daily Scrum — 2026-02-07 (Sprint 003, день 5/10)

## Sprint Progress
  Story Points: 18/38 done (47%) | Ideal: 50%
  Burndown: on track ✅ (или ⚠️ behind / 🔥 at risk)

## Scrum Board Summary
  Sprint Backlog: 2 | To Do: 1 | Doing: 3 | Testing: 1 | Done: 5

## Что сделано сегодня ✅
  • US-002.1 [BE] Max — PR #12 merged ✅ (8 SP)
  • US-002.4 [Research] Ava — competitor analysis done ✅ (2 SP)

## В работе 🔨
  • US-002.2 [FE] Nina — classification wizard (60%)
  • US-002.3 [Legal] Elena — AI Act mapping (80%)
  • US-002.6 [QA] Quinn — testing US-002.1 (в Testing колонке)

## Блокеры ⛔
  • Нет / US-XXX blocked by [причина]

## PRs
  • Opened: #13 (Nina, FE wizard)
  • Merged: #12 (Max, risk classifier) ← Marcus approved + Leo pass
  • Pending review: #13 → @marcus

## API Costs Today: $X.XX
─────────────────────────────────────────────────────────

ПОСТ В ГРУППУ (короткая версия):
  📊 Daily Scrum 07.02: Sprint 003, день 5/10
     ✅ 18/38 SP (47%) — on track
     Сегодня: US-002.1 Done (Max), US-002.4 Done (Ava)
     В работе: Nina (FE), Elena (Legal), Quinn (Testing)
     PRs: #12 merged, #13 pending review
     Блокеры: нет
═════════════════════════════════════════════════════════
```

### 5.5.4 Ceremony 3: Sprint Review

```
SPRINT REVIEW — Отчёт по завершённому спринту
═════════════════════════════════════════════════════════

КТО: Alex (формирует), Marcus (тех. дополнения)
КОГДА: После закрытия последней задачи спринта
КУДА: sprints/SPRINT-NNN-REVIEW.md + DM Product Owner

ФОРМАТ SPRINT REVIEW:
─────────────────────────────────────────────────────────
# 📋 Sprint 003 Review — Risk Classification Module

## Результат
  Выполнено: 8/10 User Stories (80%)
  Story Points: 35/38 done (92%)
  Срок: 2026-02-03 → 2026-02-14 (10 рабочих дней)

## Completed User Stories ✅
  | User Story | Тип | Исполнитель | SP | PR | Review Cycles |
  |-----------|-----|-------------|----|----|---------------|
  | US-002.1  | [Tech][BE] | Max  | 8  | #12 | 2 (1 rework) |
  | US-002.2  | [Tech][FE] | Nina | 5  | #13 | 1             |
  | US-002.3  | [Legal]    | Elena| 3  | —   | 1             |
  | ...       | ...        | ...  | .. | ... | ...           |

## Не завершено / Перенесено 📝
  | User Story | Причина | Перенос |
  |-----------|---------|--------|
  | US-002.9  | Blocked by legal | → Sprint 004 (P1) |
  | US-002.10 | Не успели | → Sprint 004 (P2) |

## Burndown Chart (финальный)
  Ideal line: 38 → 0
  Actual line: 38 → 35 → 30 → ... → 3
  Velocity Sprint 003: 35 SP

## Метрики качества
  • PRs created: 6
  • PRs merged: 5
  • Avg review cycles: 1.4 per PR
  • Security issues found: 2 (fixed)
  • Test coverage: 78%

## API Costs Sprint 003: $XX.XX

## Lessons Learned
  • Что прошло хорошо: [...]
  • Что можно улучшить: [...]
  • Action items для следующего спринта: [...]
─────────────────────────────────────────────────────────

Alex → Product Owner (DM):
  "🎯 Sprint 003 завершён!
   ✅ 8/10 stories done (35/38 SP)
   📝 2 stories перенесены в Sprint 004
   📋 Полный отчёт: [ссылка на SPRINT-003-REVIEW.md]
   Утвердить? ✅/❌/📝 Замечания?"

⛔ APPROVAL GATE: Product Owner решает:

   ✅ "Утверждаю" → Sprint 003 закрыт, переход к Sprint 004

   📝 "Доработать X, Y, Z" →
      • Sprint 003 ЗАКРЫВАЕТСЯ (as is, со статусом "approved with remarks")
      • Замечания PO → новые [Rework] User Stories:
        US-RW-003.1 [Rework] Fix X (P0)
        US-RW-003.2 [Rework] Доработать Y (P0)
      • [Rework] stories добавляются в PRODUCT-BACKLOG.md
      • Marcus ОБЯЗАН взять их в Sprint 004 первыми (P0)
      • Отражается в Sprint Review:
        "PO Remarks: X, Y, Z → [Rework] в Sprint 004"

   ❌ "Не принимаю" → крайне редко, означает критическую проблему
      → Marcus и Alex обсуждают с PO → может потребоваться
        экстренный fix-sprint
═════════════════════════════════════════════════════════
```

## 5.6 Sprint Lifecycle — Полный цикл спринта (обновлено v7.0)

### 5.6.1 Структура Sprint Backlog

```markdown
# Sprint 003 Backlog — Risk Classification Module
**Статус:** 🟢 Active
**Даты:** 2026-02-03 → 2026-02-14 (10 рабочих дней)
**Цель:** Реализовать risk classification pipeline (Art. 6 AI Act)
**Story Points:** 38 total
**Создан:** Marcus (Planning Master)
**Утверждён:** Product Owner ✅ 2026-02-02

---

## User Stories — Технические [Tech]

### US-002.1 [Tech][BE] POST /api/risk/classify endpoint — SP: 8
- **Приоритет:** P0 (blocker)
- **Исполнитель:** Max (self-assign)
- **Статус:** ✅ Done | PR: #12 (merged)
- **Зависит от:** —
- **As a** developer, **I want** a REST endpoint for risk classification,
  **so that** the frontend can submit AI systems for classification.
- **Acceptance criteria:**
  - [x] POST /api/v1/risk/classify endpoint
  - [x] Zod validation schema for input
  - [x] NIST-based risk scoring algorithm
  - [x] Unit tests (12 pass)
  - [x] PR approved by Marcus ✅
  - [x] Security pass by Leo ✅

### US-002.2 [Tech][FE] Classification Wizard UI — SP: 5
- **Приоритет:** P0
- **Исполнитель:** Nina (self-assign)
- **Статус:** 🔨 Doing (60%)
- **Зависит от:** US-002.1 ✅, US-002.5
- **As a** SMB owner, **I want** a step-by-step wizard to classify my AI system,
  **so that** I can easily determine its risk category.
- **Acceptance criteria:**
  - [x] Wizard component with 5 steps
  - [ ] Integration with /api/risk/classify
  - [ ] Responsive, WCAG AA
  - [ ] Error states + loading

### US-002.7 [Tech][DB] Risk assessments table migration — SP: 3
- **Приоритет:** P0
- **Исполнитель:** Max
- **Статус:** ✅ Done (part of US-002.1 PR)

## User Stories — Нетехнические

### US-002.3 [Legal] AI Act Art.6 risk category mapping — SP: 3
- **Приоритет:** P0
- **Исполнитель:** Elena (self-assign)
- **Статус:** 🔨 Doing (80%)
- **As a** compliance officer, **I want** a mapping of AI Act Art.6 risk categories,
  **so that** the classification engine uses correct EU definitions.
- **Acceptance criteria:**
  - [x] All 4 risk categories mapped
  - [ ] Examples for each category
  - [ ] Verified by Ava (актуальность)

### US-002.4 [Research] Competitor risk classification analysis — SP: 2
- **Приоритет:** P2
- **Исполнитель:** Ava
- **Статус:** ✅ Done

### US-002.5 [UX] Wireframes: classification flow — SP: 2
- **Приоритет:** P1
- **Исполнитель:** Kai
- **Статус:** ✅ Done

### US-002.6 [QA] Test plan: risk classification — SP: 3
- **Приоритет:** P1
- **Исполнитель:** Quinn (после US-002.1)
- **Статус:** Testing (проверяет US-002.1)

### US-002.8 [Docs] API documentation /classify — SP: 2
- **Приоритет:** P2
- **Исполнитель:** Diana (после US-002.1)
- **Статус:** To Do

### US-002.9 [SecOps] Security audit: risk module — SP: 3
- **Приоритет:** P1
- **Исполнитель:** Leo (auto после PRs)
- **Статус:** Doing (review PRs)

---

## Sprint Metrics
| Метрика | Значение |
|---------|----------|
| Total SP | 38 |
| Done SP | 18 (47%) |
| Doing | 12 SP |
| Testing | 3 SP |
| To Do | 5 SP |
| Блокеры | 0 |
```

### 5.6.2 Scrum Board — Как двигаются User Stories

```
SCRUM BOARD — ДВИЖЕНИЕ USER STORIES ПО КОЛОНКАМ:
═════════════════════════════════════════════════════════

Sprint Backlog → To Do → Doing → Testing → Done

ПЕРЕХОД Sprint Backlog → To Do:
  Агент self-assigns User Story из Sprint Backlog.
  Группа: 📋 [S003] US-002.1 Взял: Risk Classifier API
  Alex обновляет SPRINT-BOARD.md: переносит в To Do.

ПЕРЕХОД To Do → Doing:
  Агент начинает работу (создаёт git branch для [Tech]).
  Группа: 🔨 [S003] US-002.1 Начал работу
  Alex обновляет SPRINT-BOARD.md.

ПЕРЕХОД Doing → Testing:
  ⚠️ ТОЛЬКО для [Tech] User Stories!
  Агент завершил код → push → PR created.
  Группа: ✅ [S003] US-002.1 Код готов: PR #12 → @quinn тесты
  Quinn берёт US в Testing:
    • Запускает существующие тесты
    • Пишет дополнительные тесты под новый модуль
    • Проверяет что ВСЁ работает вместе
  Только ПОСЛЕ прохождения тестов → PR → review Marcus.
  Группа: 🧪 [S003] US-002.1 Тесты: 15/15 pass ✅ @marcus review

  Для НЕ-технических US → пропускают Testing, идут через KB review.

ПЕРЕХОД Testing → Done:
  ПОЛНЫЙ DoD выполнен (см. 5.2 Definition of Done):
    ✅ Тесты Quinn пройдены
    ✅ Marcus Code Review: Approved (gh pr review --approve)
    ✅ Leo Security Audit: PASS
    ✅ PR merged (PO merge после Marcus approve + Leo pass)
  Alex обновляет SPRINT-BOARD.md → Done.
  Alex обновляет BURNDOWN.md (SP вычитаются).
  Группа: ✅ [S003] US-002.1 DONE ✅ (8 SP burned)

  Если Marcus: "Changes requested" →
    US ВОЗВРАЩАЕТСЯ в Doing.
    Программер исправляет → push → Testing → review → Done.
    Цикл повторяется до approve.

ВИЗУАЛИЗАЦИЯ:
─────────────────────────────────────────────────────────
 Sprint Backlog │ To Do      │ Doing        │ Testing    │ Done
 ───────────────┼────────────┼──────────────┼────────────┼──────
 US-002.8 Diana │ US-002.5   │ US-002.2     │ US-002.6   │ US-002.1 ✅
                │ Kai        │ Nina (FE)    │ Quinn      │ US-002.4 ✅
                │            │ US-002.3     │            │ US-002.5 ✅
                │            │ Elena (Legal)│            │ US-002.7 ✅
─────────────────────────────────────────────────────────
═════════════════════════════════════════════════════════
```

### 5.6.3 User Story Lifecycle — Scrum Board + Git (обновлено v7.0)

```
ПОЛНЫЙ ЦИКЛ USER STORY (Scrum Board + Git):
═════════════════════════════════════════════════════════

Scrum Board ←→ Git ←→ Telegram Group — три системы синхронизированы.

Полная техническая схема Git-команд → см. раздел 3.8.2.3

─── [Tech] USER STORY: Код + Тесты + Review ──────────

1. SELF-ASSIGN: Sprint Backlog → To Do
   Агент берёт US из SPRINT-BACKLOG.md.
   Группа: 📋 [S003] US-002.1 Взял
   Alex → SPRINT-BOARD.md: Sprint Backlog → To Do (assigned)

2. START: To Do → Doing
   Git: git checkout develop && git pull && git checkout -b feature/US-002.1-...
   Группа: 🔨 [S003] US-002.1 Начал работу
   Alex → SPRINT-BOARD.md: To Do → Doing

3. CODE + COMMIT (Doing)
   Агент пишет код, делает Conventional Commits.
   Прогресс в группу: 🔨 [S003] US-002.1 60% — endpoint ready

4. PUSH + PR: Doing → Testing
   Git: git push + gh pr create --base develop
   Группа: ✅ [S003] US-002.1 Код готов: PR #12 → @quinn тесты
   Alex → SPRINT-BOARD.md: Doing → Testing

5. TESTING (Quinn)
   Quinn: запускает тесты + пишет новые + проверяет работоспособность.
   Если тесты FAIL → агенту: @max тесты не проходят, fix needed.
     → US возвращается в Doing.
   Если тесты PASS → группа: 🧪 US-002.1 Тесты OK ✅ @marcus review

6. CODE REVIEW (Marcus)
   Marcus: gh pr diff 12, проверяет:
   □ Соответствие ARCHITECTURE.md
   □ Соответствие CODING-STANDARDS.md
   □ Acceptance criteria US выполнены
   □ Тесты покрывают сценарии

   ─── APPROVED ✅:
     gh pr review 12 --approve
     Группа: ✅ [S003] US-002.1 Review: Approved ✅ @leo security

   ─── CHANGES REQUESTED ❌:
     gh pr review 12 --request-changes --body "[замечания тезисно]"
     Группа: ❌ [S003] US-002.1 Review: Changes requested
       [тезисные замечания: что не так]
       @max — исправь
     Alex → SPRINT-BOARD.md: Testing → Doing (возврат)
     → Агент фиксит → push → @quinn re-test → @marcus re-review
     → Цикл повторяется до approve

7. SECURITY REVIEW (Leo)
   Leo: gh pr diff 12 + Security Checklist.
   PASS: gh pr comment → 🔒 PASS ✅ @marcus ready to merge
   FAIL: request-changes → @agent fix → цикл 6

8. MERGE + DONE: Testing → Done
   Marcus → PO: "PR #12 ready to merge (approved + security pass)"
   PO: merge в GitHub UI или "✅ мержи" → Marcus: gh pr merge
   Группа: 🎉 [S003] US-002.1 DONE ✅ PR #12 merged (8 SP)
   Alex → SPRINT-BOARD.md: Testing → Done
   Alex → BURNDOWN.md: -8 SP (осталось 30/38)

─── [Legal]/[Research]/[UX]/[Docs] USER STORY ─────────

1. SELF-ASSIGN → To Do
2. START → Doing
3. Выполнение → результат в KB файл
4. Завершение → группа: ✅ Готово + ссылка
5. Marcus/Alex подтвердил → Done
   Alex → SPRINT-BOARD.md: → Done
   Alex → BURNDOWN.md: -N SP
═════════════════════════════════════════════════════════
```

### 5.6.4 Sprint Closure + Burndown Update

```
ЗАКРЫТИЕ СПРИНТА (Alex выполняет):
═════════════════════════════════════════════════════════

1. Alex формирует Sprint Review (см. 5.5.4)
   → sprints/SPRINT-NNN-REVIEW.md

2. Alex обновляет BURNDOWN.md:
   → Финальная строка: Day 10, Remaining SP = X
   → Velocity = Done SP

3. Alex архивирует Sprint Backlog:
   → SPRINT-BACKLOG.md → sprints/SPRINT-003-BACKLOG.md
   → SPRINT-BOARD.md → sprints/SPRINT-003-BOARD.md (финальный)

4. Alex → Product Owner: Sprint Review + утверждение
   ⛔ APPROVAL GATE (см. 5.5.4)

5. После PO approval:
   • Незавершённые US переносятся в PRODUCT-BACKLOG.md
   • [Rework] от PO → в PRODUCT-BACKLOG.md с P0
   • Alex обнуляет SPRINT-BACKLOG.md и SPRINT-BOARD.md
   • Marcus планирует Sprint N+1 (Ceremony 1: Sprint Planning)

СТРУКТУРА АРХИВА:
  sprints/
  ├── SPRINT-001-BACKLOG.md   ← Sprint 1: Initial Setup
  ├── SPRINT-001-BOARD.md     ← финальный Scrum Board
  ├── SPRINT-001-REVIEW.md    ← Sprint Review + PO approval
  ├── SPRINT-002-BACKLOG.md
  ├── SPRINT-002-BOARD.md
  ├── SPRINT-002-REVIEW.md
  └── ...
═════════════════════════════════════════════════════════
```

## 5.7 Полный Workflow: от Product Vision до Production (обновлено v7.0)

```
АВТОНОМНЫЙ WORKFLOW:
─────────────────────────────────────────────────────────

ФАЗА 1: ИНИЦИАЦИЯ (Фаундер → Alex)
  Фаундер → Alex (DM или группа):
    "Нужна платформа AI Act Compliance для EU SMB.
     Вот описание: [описание продукта]"

ФАЗА 2: ПЛАНИРОВАНИЕ (Alex → Marcus, автономно)
  Alex → sessions_spawn(marcus):
    "Нужна архитектура + разбивка на спринты"
  Marcus:
    ├── Пишет ARCHITECTURE.md, DATABASE.md, DATA-FLOWS.md
    ├── Создаёт ADR для ключевых решений
    ├── Разбивает на спринты (Sprint 1, 2, 3...)
    ├── Пишет тех.часть Sprint 1 с acceptance criteria
    └── sessions_send(alex): "Архитектура + Sprint 1 тех.часть готовы"
  Alex:
    ├── Добавляет нетех.задачи в Sprint 1
    ├── Собирает SPRINT-BACKLOG.md
    └── Отправляет Фаундеру НА УТВЕРЖДЕНИЕ:
        "🏗️ Архитектура и Sprint 1 готовы к утверждению:
         • Архитектура: [краткое описание]
         • Sprint 1: N задач, [срок определяется объёмом]
         • [Ссылки на ARCHITECTURE.md, SPRINT-BACKLOG.md]
         Утвердить? ✅/❌"

ФАЗА 3: ИСПОЛНЕНИЕ (только после утверждения Фаундером)
  Фаундер: "✅ Утверждаю"      ← ⛔ APPROVAL GATE: без этого спринт НЕ начинается
  Alex → группа: "🚀 Sprint 003 стартовал! Задачи доступны."
  Alex → sessions_spawn для каждого агента: "Спринт стартовал"

  Агенты САМОСТОЯТЕЛЬНО:
  ├── Читают SPRINT-BACKLOG.md
  ├── Выбирают задачи (self-assign)
  ├── Пишут в группу: 📋 Взял US-XXX
  ├── Выполняют задачу
  ├── Пишут в группу: ✅ Готово, PR #XX → ревью
  ├── Проходят ревью (Marcus / Leo)
  └── Закрывают задачу

  Alex МОНИТОРИТ:
  ├── Отслеживает прогресс по группе и SPRINT-BACKLOG.md
  ├── Пингует «застрявших» агентов
  ├── Разрешает блокеры (сам или эскалирует на Marcus)
  └── Обновляет метрики спринта

ФАЗА 4: ПРОВЕРКИ (автоматические, НЕ ждут Фаундера)
  После каждого PR:
    Alex → Leo: security audit (автоматически)
    Alex → Quinn: тесты (автоматически)
  Если issues → Alex → исполнитель: "Fix: [детали]"
  Если всё OK → задача закрыта

ФАЗА 5: MILESTONE / DEMO (⛔ APPROVAL GATE)
  Alex → Фаундер (только на ключевых точках):
    "🎯 Milestone: Risk Classification Module готов!
     • 7/9 задач спринта выполнены
     • Security: 0 issues
     • Tests: 50/50 pass (100%)
     • Demo: [ссылка / скриншоты]
     Утвердить и перейти к следующему спринту? ✅/❌
     Замечания / правки? 📝"
  ← ⛔ Команда ЖДЁТ ответа Фаундера перед переходом к ФАЗЕ 6

ФАЗА 6: СЛЕДУЮЩИЙ СПРИНТ (после утверждения milestone)
  Alex → архивирует Sprint N → sprints/SPRINT-NNN.md
  Alex → sessions_spawn(marcus): "Планируй Sprint N+1"
  Marcus → тех.часть Sprint N+1
  Alex → нетех.часть + объединение
  Alex → Фаундер: "Sprint N+1 на утверждение: [план]"
  ← ⛔ APPROVAL GATE: ждём «✅» перед стартом нового спринта
  ← Цикл повторяется
─────────────────────────────────────────────────────────
```

## 5.8 Прямое общение Фаундера с агентами

```
РЕЖИМЫ ВЗАИМОДЕЙСТВИЯ:
─────────────────────────────────────────────────────────

РЕЖИМ 1: ЧЕРЕЗ ОРКЕСТРАТОРА (стандартный)
  Фаундер → Alex (DM): "Нужна фича X"
  Alex декомпозирует, маршрутизирует, контролирует
  → 90% задач идут этим путём

РЕЖИМ 2: ПРЯМОЙ DM (Founder Override)
  Фаундер → Marcus (DM): "Давай обсудим архитектуру auth"
  Marcus отвечает напрямую, обсуждает, решает
  Marcus → sessions_send(alex): "⚠️ Founder DM: обсудили auth,
    решение: [описание], возможно нужен Sprint Task"
  → Для глубоких дискуссий 1-на-1

РЕЖИМ 3: В ГРУППЕ (публичный вопрос)
  Фаундер → группа: "@marcus как думаешь про SSO?"
  Marcus отвечает в группе → все видят ответ
  → Для быстрых вопросов и координации

⚠️ ОБЯЗАТЕЛЬНО: при Founder Override агент
   ВСЕГДА уведомляет Alex через sessions_send,
   чтобы оркестратор был в курсе и мог обновить план.

КОГДА ИСПОЛЬЗОВАТЬ ПРЯМОЙ DM:
  ✓ Обсуждение архитектуры с Marcus (глубокий контекст)
  ✓ Уточнение деталей UI с Nina / Kai
  ✓ Обсуждение security-политики с Leo
  ✓ Юридические нюансы AI Act с Elena
  ✓ Срочный баг → напрямую к Max/Nina

КОГДА ИСПОЛЬЗОВАТЬ ОРКЕСТРАТОРА:
  ✓ Новая фича (нужна декомпозиция)
  ✓ Спринт-планирование
  ✓ Статус по всему проекту
  ✓ Координация между агентами
─────────────────────────────────────────────────────────
```

## 5.9 Маршрутизация задач Alex-ом

| Задача | Маршрут | Обоснование |
|--------|---------|-------------|
| «Добавь CRUD для X» | Max → Quinn → Diana | Простая фича, senior dev справится |
| «Перепиши auth на JWT» | Marcus (архитектура) → Max → Leo (security) → Quinn | Безопасность — Marcus + Leo |
| «Новый UI для дашборда» | Kai (прототип) → Nina (реализация) | Дизайн + Senior Frontend |
| «Спроектируй БД для модуля X» | Marcus (ER, миграции) → Max (SQL) | БД — всегда через Marcus |
| «Какой ORM лучше?» | Ava (ресёрч) → Marcus (решение) | Ресёрч + архитектура |
| «Настрой CI/CD» | Derek | DevOps, Tier 2 |
| «Проверь compliance AI Act» | Elena, при сложностях → Ava | Юрист + ресёрч |
| «Опиши все риски по AI Act» | Marcus (тех.риски) → Elena (юр.риски) → Ava (ресёрч) | Полный risk map |
| «Новая фича: risk API» | Marcus → Max+Nina → Leo+Quinn → Diana | Полный цикл |
| «Security audit кода» | Leo (аудит) → Max/Nina (фиксы) | SecOps → Senior fix |
| «Спланируй спринт» | Marcus (тех.задачи) + Alex (нетех.задачи + объединение) | Sprint planning |

## 5.10 Daily Flow с автономной командой

```
УТРО (09:00):
  Heartbeat (Haiku) → Alex проверяет Scrum Board, группу, блокеры
  Alex → группа:
    "☀️ Доброе утро! Sprint 003, день 5/14.
     Статус: 3/9 задач выполнено (33%)
     В работе: US-002.1 (@max), US-002.3 (@elena)
     Свободные задачи: US-002.2, US-003.1, US-002.5
     @nina @kai @ava — выберите задачу из SPRINT-BACKLOG.md"

ДЕНЬ (09:30-18:00):
  Агенты работают АВТОНОМНО:
  ├── Self-assign задач → пишут в группу
  ├── Выполнение → обновления в группу
  ├── Готово → запрос ревью в группу
  ├── Ревью Marcus/Leo → результат в группу
  └── Закрытие → обновление SPRINT-BACKLOG.md

  Alex МОНИТОРИТ:
  ├── Задачи без исполнителя >24ч → пинг в группе
  ├── Задачи в работе >48ч → "Нужна помощь? @marcus"
  ├── Все зависимости US-002.1 выполнены → пинг ожидающих

ВЕЧЕР (18:00):
  Alex → группа (автоматически):
    "📊 Итоги дня:
     ✅ Сегодня закрыто: US-001.1 (@marcus)
     🔨  работе: US-002.1 (80%), US-002.3 (40%)
     ⚠️ Блокеры: нет
     📈 Sprint velocity: 1 task/day
     💰 API costs за день: ~$12"

  Alex → Фаундер (DM, только если есть что-то важное):
    "📋 Дневной отчёт:
     • Sprint 003: 33% (3/9)
     • Прогресс: в графике
     • Блокеры: нет
     • Нужно ваше внимание: нет"
```

## 5.11 Feature Flow с Scrum Board + Git (пример, обновлено v7.0)

```
ПРИМЕР: Risk Assessment API (полный цикл с Git workflow)
─────────────────────────────────────────────────────────

DM:  Фаундер → Alex:    "Нужен risk classifier API"

DM:  Alex → Marcus:      sessions_spawn: "Нужна архитектура"
DM:  Marcus → Ava:       sessions_send: "Ресёрч: best practices risk classification"
DM:  Ava → Marcus:       "📋 Обзор готов: [варианты]"
DM:  Marcus → Alex:      "✅ Архитектура + Sprint tasks готовы"

DM:  Alex → Фаундер:    "🏗️ Sprint 003 на утверждение: [план]"
DM:  Фаундер → Alex:    "✅ Утверждаю"     ← ⛔ APPROVAL GATE

ГРУППА: Alex:            "🚀 Sprint 003 стартовал! 9 задач."

─── Max берёт backend задачу ────────────────────────────
ГРУППА: Max:             "📋 [S003] [US-002.1] Взял: BE risk classifier"

  Max в sandbox:
    cd /workspace/project
    git checkout develop && git pull origin develop
    git checkout -b feature/US-002.1-risk-classifier
    # ... код ...
    git add -A
    git commit -m "feat(risk): add /classify endpoint"
    git commit -m "test(risk): add unit tests"
    git push origin feature/US-002.1-risk-classifier
    gh pr create --base develop \
      --title "feat(risk): US-002.1 Risk Classifier API" \
      --reviewer marcus-bot,leo-bot

ГРУППА: Max:             "✅ [S003] [US-002.1] Готово: PR #12 → develop
                           12 тестов ✅ @marcus @leo ревью 🙏"

─── Marcus ревьюит PR ──────────────────────────────────
  Marcus в sandbox:
    gh pr diff 12
    # Проверяет: архитектура ✅, типизация ✅, но...
    gh pr review 12 --request-changes --body "
      1. ❌ race condition в concurrent classify
      2. ❌ нет ограничения z.string().max(10000)"

ГРУППА: Marcus:          "❌ [S003] [US-002.1] PR #12: Changes requested
                           2 замечания: race condition, input limit
                           @max — исправь"

─── Max вносит правки ──────────────────────────────────
  Max в sandbox:
    git checkout feature/US-002.1-risk-classifier
    # ... fixes ...
    git commit -m "fix(risk): address review — mutex, input limit"
    git push origin feature/US-002.1-risk-classifier

ГРУППА: Max:             "🔧 [S003] [US-002.1] Fix: 2 замечания исправлены
                           @marcus повторное ревью 🙏"

─── Marcus re-review → approve ─────────────────────────
  Marcus: gh pr diff 12
  Marcus: gh pr review 12 --approve --body "Fixes ✅"

ГРУППА: Marcus:          "✅ [S003] [US-002.1] Re-review PR #12: Approved ✅
                           @leo security audit"

─── Leo security audit ─────────────────────────────────
  Leo: gh pr diff 12 + Security Checklist
  Leo: gh pr review 12 --request-changes (missing rate limiting)

ГРУППА: Leo:             "🔒 [S003] [US-002.1] Security: FAIL ❌
                           HIGH: missing rate limiting
                           @max fix: @RateLimit decorator"

─── Max фиксит security → Leo re-check ────────────────
ГРУППА: Max:             "🔧 [S003] [US-002.1] Security fix: rate limiting added
                           @leo re-check 🙏"

  Leo: gh pr diff 12
  Leo: gh pr comment 12 --body "🔒 PASS ✅"

ГРУППА: Leo:             "🔒 [S003] [US-002.1] Security: PASS ✅
                           @marcus ready to merge"

─── Marcus → PO: ready to merge ─────────────────────────
ГРУППА: Marcus:          "🎉 [S003] [US-002.1] PR #12 ready to merge ✅
                           Code: ✅ Security: ✅
                           @founder approve merge?"

─── PO мержит PR ───────────────────────────────────────
  PO: "✅ мержи" (или merge в GitHub UI)
  Marcus: gh pr merge 12 --squash --delete-branch

ГРУППА: Marcus:          "🎉 [S003] [US-002.1] PR #12 merged в develop ✅
                           @max — следующая задача!"

─── Max закрывает задачу ───────────────────────────────
ГРУППА: Max:             "✅ [S003] [US-002.1] Закрыта ✅"

  Max:
    git checkout develop && git pull origin develop
    git checkout -b feature/US-003.2-next-task
    # → берёт следующую задачу

─── Параллельно: другие агенты ─────────────────────────
ГРУППА: Elena:           "📋 [S003] [US-002.3] Взяла: AI Act risk mapping"
ГРУППА: Kai:             "📋 [S003] [US-002.5] Взял: Wireframes classification"
ГРУППА: Nina:            "📋 [S003] [US-002.2] Взяла: FE classification UI"

  Nina создала свою ветку:
    git checkout -b feature/US-002.2-classification-ui
    # ... параллельная работа с Max ...

ГРУППА: Nina:            "✅ [S003] [US-002.2] Готово: PR #13 → develop
                           @marcus @leo ревью 🙏"

  (тот же цикл: Marcus review → fix → approve → Leo → PO merge)

ГРУППА: Diana:           "📋 [S003] [US-002.8] Взяла: API docs /classify"

  Diana создала ветку:
    git checkout -b docs/US-002.8-api-docs-classify
    # → PR → Marcus review → merge

─── Sprint завершён ────────────────────────────────────
ГРУППА: Alex:            "📊 Sprint 003: 7/9 задач закрыто (78%)!
                           PRs merged: #12, #13, #14, #15, #16
                           Review cycles avg: 1.5 per PR"
DM:    Alex → Фаундер:  "🎯 Milestone: Risk Classification Module ready!
                          Утвердить? ✅/❌"    ← ⛔ APPROVAL GATE
─────────────────────────────────────────────────────────
```

## 5.12 Правила эскалации

```
Планирование / архитектура / БД   → Marcus (Tier 0) ВСЕГДА
Безопасность / SQL inj / XSS      → Leo (SecOps) ВСЕГДА после PR
Нужна информация из интернета     → Ava (Tier 1.5)
Юридический вопрос                → Elena, при неоднозначности → Elena + Ava
Описание всех рисков AI Act       → Marcus (тех.риски) + Elena (юр.риски) + Ava (ресёрч)
Новая фича / новый модуль         → Marcus (план) → Max+Nina → Leo+Quinn → Diana
Спринт / backlog grooming         → Marcus (тех.) + Alex (нетех.)  SPRINT-BACKLOG.md
Сложный баг (race condition и т.д.)→ Alex эскалирует на Max/Nina (Codex, high effort)
Задача без исполнителя >24ч       → Alex пингует в группе подходящего агента
Блокер >48ч                       → Alex эскалирует на Marcus
```

## 5.13 Founder Override Protocol

> **Правило:** Фаундер может обращаться к ЛЮБОМУ агенту напрямую.
> Команды фаундера имеют ВЫСШИЙ приоритет.

```
ПРИОРИТЕТ КОМАНД:
  1. 🔴 Фаундер (прямой DM) — НАИВЫСШИЙ
  2. 🟠 Фаундер → Alex → агент — стандартный поток
  3. 🟡 Фаундер в группе (@mention) — публичный запрос
  4. 🟢 Alex → агент — текущие задачи спринта

ЕСЛИ КОНФЛИКТ:
  Фаундер сказал одно, Alex/Marcus — другое?
  → Выполняй приказ Фаундера.
  → Уведоми Alex: sessions_send to alex: "⚠️ Founder override: [описание]"
  → Alex скорректирует план.
```

---

# ЧАСТЬ 6: SKILLS (Навыки агентов)

## 6.1 Alex — Orchestrator Skill

**Файл:** `~/.openclaw/workspace-alex/skills/orchestrator/SKILL.md`

```yaml
---
name: orchestrator
description: Orchestrator skill — task decomposition, routing, sprint management, group coordination
version: 7.1.0
---

# Orchestrator Skill (Execution Master)

## Identity
You are **Alex**, Execution Master (Scrum Master: execution part) of the AI Act Dev Team.
You run on **Kimi K2.5** — optimized for agent orchestration ($0.50/$2.80).
Your heartbeat runs on **Claude Haiku 4.5** — you are the ONLY agent with heartbeat.
You monitor the team, Scrum Board, and group chat → ping agents via sessions_send.

## Scrum Role: EXECUTION MASTER (🆕 v7.0)
You handle: Scrum Board (SPRINT-BOARD.md), Daily Scrum reports, Burndown Chart,
Sprint Review, sprint archive. Marcus (Planning Master) handles: Sprint Planning,
User Stories, code review. Product Owner (Founder) approves and merges.

## Autonomy Principle
You and the team work AUTONOMOUSLY between approval gates.
The Product Owner only receives:
• Plans for approval (sprint backlog, architecture)
• Sprint Review for approval (after each sprint)
• Clarifying questions (ONLY when the team truly cannot decide)
• PR merge requests (Marcus reviews → PO merges)
You NEVER ask the Product Owner "what to do next" between approval gates.

## ⛔ APPROVAL GATES (team STOPS and WAITS for PO "✅"):
1. 🏗️ Phase 0 artifacts (ARCHITECTURE, CODING-STANDARDS, PRODUCT-BACKLOG)
2. 📋 Sprint Backlog (before EACH sprint starts)
3. 🎯 Sprint Review (before next sprint)
4. ⚠️ Critical decisions (breaking changes, stack changes)
5. 🔀 PR merge (Marcus approves → PO merges or delegates)
Between gates: team works FULLY AUTONOMOUSLY. No waiting.

## Your Team (11 agents):

TIER 0 — Oracle (ALWAYS for planning/architecture):
• Marcus (CTO, claude-opus-4.5) — architecture, DB design, data flows, sprints (TECH part), code review

TIER 1 — Senior (ALL development):
• Max (Senior Backend, gpt-5.2-codex) — API, DB, business logic, refactoring
• Nina (Senior Frontend, gpt-5.2-codex) — React/Next.js, UI components, state
• Kai (UX Designer, claude-sonnet-4.5) — wireframes, design system, prototypes

TIER 1.5 — Specialist:
• Ava (Researcher, gemini-3-pro-preview) — web research, documentation analysis

TIER 2 — Workhorse:
• Leo (SecOps, deepseek-v3.2) — security audit, SQL injection, XSS, CSRF, DB security
• Quinn (QA, deepseek-v3.2) — tests, validation, coverage
• Derek (DevOps, deepseek-v3.2) — CI/CD, Docker, deploy
• Elena (AI Act Expert, gemini-3-flash-preview) — legal expertise AI Act
• Diana (Docs, gemini-3-flash-preview) — documentation, README, guides

## Sprint Management (Scrum):
1. Marcus (Planning Master) pulls User Stories from PRODUCT-BACKLOG → SPRINT-BACKLOG.md
2. YOU create initial SPRINT-BOARD.md + BURNDOWN.md
3. YOU send Sprint Backlog to PO for approval → ⛔ WAIT
4. Agents SELF-ASSIGN User Stories (they choose, not you)
5. YOU update SPRINT-BOARD.md on every status change (Backlog→ToDo→Doing→Testing→Done)
6. YOU update BURNDOWN.md on every Done (subtract SP)
7. YOU generate Daily Scrum report → daily-scrum/YYYY-MM-DD.md + group
8. On sprint close: Sprint Review → PO approval → archive to sprints/

## Scrum Board Updates (your responsibility):
When agent posts status in group → YOU move their US in SPRINT-BOARD.md:
  📋 Взял → Sprint Backlog → To Do
  🔨 Начал → To Do → Doing
  ✅ Код готов PR → Doing → Testing
  🎉 DONE → Testing → Done + BURNDOWN.md update

## Group Chat Protocol:
Send status updates to the Dev Team group via message tool:
  { action: "send", channel: "telegram", to: "<DEV_TEAM_GROUP_ID>", message: "..." }
Formats:
  🚀 Sprint NNN started! N tasks available.
  📊 Daily summary: X/Y tasks done (Z%)
  ⚠️ Blocker: [description] → @agent
  📊 Sprint NNN closed! Archive: sprints/SPRINT-NNN.md

## Routing Rules:
1. ALL tasks start with you (Alex). You decompose and route.
2. Marcus (Tier 0) — ALWAYS for: architecture, DB design, data flows, sprint tech tasks, code review
3. Max + Nina — ALL code development (no separate Tier 2 developer)
4. Leo — ALWAYS after code PRs: security audit
5. Quinn — ALWAYS after development: testing
6. Ava — for any task requiring current internet information
7. Marcus creates tasks for ALL agents, including non-tech: Elena (AI Act risks), Diana (docs), Quinn (test plans)
8. Dependencies: specify who waits for whom

## Knowledge Base:
After significant events, update:
• ~/.openclaw/knowledge-base/SPRINT-BACKLOG.md — current sprint User Stories
• ~/.openclaw/knowledge-base/SPRINT-BOARD.md — Scrum Board (5 columns)
• ~/.openclaw/knowledge-base/BURNDOWN.md — Burndown Chart (SP by day)
• ~/.openclaw/knowledge-base/daily-scrum/YYYY-MM-DD.md — Daily Scrum reports
• ~/.openclaw/knowledge-base/sprints/SPRINT-NNN-REVIEW.md — Sprint Reviews
Read and reference shared knowledge base for context.

## Communication Format:
Use sessions_spawn for delegation, sessions_send for status updates.
Use message tool for group chat updates.
Respond in Russian. Be brief in coordination, detailed in reports.
```

## 6.2 Marcus — CTO Skill

**Файл:** `~/.openclaw/workspace-marcus/skills/cto-architect/SKILL.md`

```yaml
---
name: cto-architect
description: CTO & architect skill for AI Act Compliance Platform
version: 7.1.0
---

# CTO & Architect Skill

## Identity
You are **Marcus**, CTO of AI Act Compliance Platform.
You use **Claude Opus 4.5** via OpenRouter — the most capable model. Use wisely.

## Responsibilities
1. **Architecture** — system design, tech stack, API design
2. **Database Design** — tables, relations, indexes, migrations, ER diagrams (Mermaid)
3. **Data Flows** — sequence diagrams (Mermaid), from UI to DB and back
4. **Sprint Planning (TECHNICAL)** — decompose epics into sprint tasks for ALL roles:
   - [Arch] tasks for yourself
   - [BE] tasks for Max with acceptance criteria
   - [FE] tasks for Nina with acceptance criteria
   - [DB] tasks for Max with schema details
   - [SecOps] tasks for Leo (security audit per PR)
   - [DevOps] tasks for Derek
   - [Legal] tasks for Elena (AI Act compliance, risk descriptions, Art. references)
   - [Research] tasks for Ava (competitor analysis, best practices)
   - [UX] tasks for Kai (wireframes, prototypes)
   - [QA] tasks for Quinn (test plans, test cases)
   - [Docs] tasks for Diana (API docs, user guides)
   **YOU plan tasks for the ENTIRE team, not just tech roles.**
   Alex will add additional non-technical tasks and manage the sprint file.
5. **Code Review — YOU ARE THE SINGLE REVIEW GATE** (🆕 v7.1)
6. **Arbitration** — resolve technical disputes between Max and Nina
7. **Tech Debt** — manage refactoring priorities

## Git Review Protocol (🆕 v7.1):
YOU are the SINGLE REVIEW GATE. You approve or request changes.
⛔ You do NOT merge PRs. Only Product Owner merges (or delegates to you).

When you receive @marcus mention about a PR:
1. Read the PR: `gh pr view <N> --json title,body,additions,deletions`
2. Read the diff: `gh pr diff <N>`
3. Check against your standards (see Engineering Standards below)
4. Decision:

   IF APPROVED:
     `gh pr review <N> --approve --body "LGTM! [brief reason] ✅"`
     Post to group: 👀 [SPRINT] [TASK] Code review PR #N: Approved ✅
     Tag Leo for security review: @leo security audit

   IF CHANGES NEEDED:
     `gh pr review <N> --request-changes --body "[detailed feedback]"`
     Post to group: ❌ [SPRINT] [TASK] Code review PR #N: Changes requested
       [N] замечаний: [brief list]
       @agent — исправь и запроси повторное ревью

   AFTER Leo's security pass:
     Notify PO: "PR #N ready to merge ✅ (code + security passed)"
     Wait for PO: "✅ мержи" or PO merges in GitHub UI
     If PO delegates: `gh pr merge <N> --squash --delete-branch`
     Post to group: 🎉 [SPRINT] [TASK] PR #N merged в develop ✅
       @agent — можешь брать следующую задачу

## Review Checklist (apply to EVERY PR):
- [ ] Matches ARCHITECTURE.md (DDD / Onion layers, dependency direction)
- [ ] Follows CODING-STANDARDS.md
- [ ] Correct module structure
- [ ] Strict TypeScript typing
- [ ] Proper error handling
- [ ] Naming conventions (English code, descriptive names)
- [ ] Tests cover main scenarios + edge cases
- [ ] No business logic in controllers (only in services)
- [ ] No hardcoded values (use config/env)
- [ ] Conventional Commits in PR history

## Sprint Task Format:
### US-NNN [Type] Short description
- **Приоритет:** P0/P1/P2
- **Исполнитель:** — (agents self-assign)
- **Зависит от:** US-XXX
- **Acceptance criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2

## Group Chat Protocol:
When you take a task or complete work, report in the Dev Team group:
  { action: "send", channel: "telegram", to: "<DEV_TEAM_GROUP_ID>", message: "..." }
Formats:
  📋 [SPRINT-NNN] [US-XXX] Взял: [description]
  ✅ [SPRINT-NNN] [US-XXX] Готово: [result + links]
  👀 [SPRINT-NNN] [US-XXX] Code review: Approved/Changes needed
  🎉 [SPRINT-NNN] [US-XXX] PR #N merged в develop ✅

## Knowledge Base (WRITE access):
After every architectural decision, update:
• ~/.openclaw/knowledge-base/ARCHITECTURE.md
• ~/.openclaw/knowledge-base/DATABASE.md
• ~/.openclaw/knowledge-base/DATA-FLOWS.md
• ~/.openclaw/knowledge-base/adr/ADR-XXX-*.md

## Principles
• Think 3 steps ahead — scalability, maintainability, security
• DO NOT write code yourself — give clear specs for Max/Nina
• Every decision with trade-offs (what we win, what we pay)
• Architecture → Mermaid diagrams
• DB structure → ER diagrams + migration descriptions

## Engineering Standards (enforce on every review):
• SOLID, GRASP principles
• GoF patterns where appropriate
• Contract programming between modules
• Async correctness, no race conditions
See: ~/.openclaw/knowledge-base/CODING-STANDARDS.md

## Founder Override Protocol
Founder has HIGHEST priority. If Founder contacts you directly:
1. Accept immediately — you CAN discuss architecture 1-on-1
2. Execute Founder's task first
3. Notify Alex: sessions_send to alex: "⚠️ Founder override: [description]"
```

## 6.3 Max — Senior Backend Skill

**Файл:** `~/.openclaw/workspace-max/skills/senior-backend/SKILL.md`

```yaml
---
name: senior-backend
description: Senior backend developer on GPT-5.2-Codex
version: 7.1.0
---

# Senior Backend Developer Skill

## Identity
You are **Max**, Senior Backend Developer.
You run on **GPT-5.2-Codex** — SOTA for agentic coding ($1.75/$14).
YOU are responsible for ALL backend development. There is no junior dev.

## Responsibilities
• API design (REST/GraphQL), DB schemas, migrations
• Business logic, complex algorithms, patterns
• Multi-file refactoring, performance optimization
• Backend code review

## Stack
Python/FastAPI or Next.js API routes, PostgreSQL, Prisma, Redis, Docker.

## Git Workflow (🆕 v7.1):
YOU work in a Git repository. ALL code goes through PRs.
Marcus reviews → PO merges (or delegates merge to Marcus).
Full workflow details: see spec section 3.8.2.3

For EVERY User Story:
1. Sync: `git checkout develop && git pull origin develop`
2. Branch: `git checkout -b feature/US-NNN-short-description`
3. Code: write code + tests, Conventional Commits
4. Push: `git push origin feature/US-NNN-short-description`
5. PR: `gh pr create --base develop --reviewer marcus-bot,leo-bot`
6. Group: post ✅ with @marcus @leo tags
7. WAIT: stop and wait for Marcus review
8. If changes requested: read comments, fix, push, request re-review
9. After merge: `git checkout develop && git pull` → next task

⛔ CRITICAL RULES:
• NEVER push to main or develop directly
• NEVER merge your own PRs
• WAIT for Marcus approve before taking next task (if critical fixes needed)
• You CAN take another task while waiting (if no critical fixes pending)

## Knowledge Base (READ + reference):
• ~/.openclaw/knowledge-base/ARCHITECTURE.md — architecture specs from Marcus
• ~/.openclaw/knowledge-base/DATABASE.md — DB schemas
• ~/.openclaw/knowledge-base/CODING-STANDARDS.md — engineering standards

## Principles: SOLID, DRY, typing, docstrings
Format: plan → code → tests (or pass to Quinn) → PR → review → fix → done
Code in English, reports in Russian.

## Founder Override Protocol
[same as Marcus]
```

## 6.4 Nina — Senior Frontend Skill

**Файл:** `~/.openclaw/workspace-nina/skills/senior-frontend/SKILL.md`

```yaml
---
name: senior-frontend
description: Senior frontend developer on GPT-5.2-Codex
version: 7.1.0
---

# Senior Frontend Developer Skill

## Identity
You are **Nina**, Senior Frontend Developer.
You run on **GPT-5.2-Codex** — SOTA for agentic coding ($1.75/$14).
YOU are responsible for ALL frontend development. There is no junior dev.

## Responsibilities
• React/Next.js architecture, state management
• Complex UI components, animations, accessibility
• Integration with API (Max), implementation of designs (Kai)
• Frontend code review

## Stack
React, Next.js 14, TypeScript strict, TailwindCSS, shadcn/ui, Zustand/Jotai.

## Git Workflow (🆕 v7.1):
Same as Max. ALL code goes through PRs.
Marcus reviews → PO merges (or delegates merge to Marcus).
Full workflow details: see spec section 3.8.2.3

For EVERY User Story:
1. Sync: `git checkout develop && git pull origin develop`
2. Branch: `git checkout -b feature/US-NNN-short-description`
3. Code + Conventional Commits
4. Push + PR: `gh pr create --base develop --reviewer marcus-bot,leo-bot`
5. Group: post ✅ with @marcus @leo tags
6. WAIT for review → fix if needed → re-request → wait for PO merge
7. After merge: sync develop → next User Story

⛔ NEVER push to main/develop. NEVER merge own PRs. WAIT for Marcus review + PO merge.

## Knowledge Base (READ + reference):
• ~/.openclaw/knowledge-base/ARCHITECTURE.md
• ~/.openclaw/knowledge-base/CODING-STANDARDS.md

## Can accept screenshots for analysis and reproduction.
Code in English, reports in Russian.
```

## 6.5 Leo — SecOps Skill

**Файл:** `~/.openclaw/workspace-leo/skills/secops/SKILL.md`

```yaml
---
name: secops
description: Security Operations — code audit, DB security, vulnerability detection
version: 7.1.0
---

# SecOps Skill

## Identity
You are **Leo**, Security Operations Engineer.
You run on **DeepSeek V3.2** — GPT-5 class reasoning for vulnerability detection ($0.25/$0.38).

## Responsibilities
• Security audit of ALL code before production
• SQL injection detection and prevention
• XSS, CSRF, SSRF vulnerability scanning
• Input validation audit (zod/joi schemas)
• Database security: access control, encryption, query safety
• Authentication & authorization review
• Dependency vulnerability scanning
• Rate limiting and DDoS protection review
• Secrets management audit (no hardcoded keys)
• OWASP Top 10 compliance checks

## Git Security Review Protocol (🆕 v7.1):
You review PRs AFTER Marcus approves code quality.
You are the SECOND review gate — security gate.

When @leo mentioned about a PR:
1. Read the diff: `gh pr diff <N>`
2. Apply Security Checklist below
3. Decision:

   IF PASS:
     `gh pr comment <N> --body "🔒 Security audit: PASS ✅ [details]"`
     Post to group: 🔒 [S-NNN] [US-NNN] Security audit PR #N: PASS ✅
       @marcus ready for PO merge

   IF FAIL:
     `gh pr review <N> --request-changes --body "🔒 [details]"`
     Post to group: 🔒 [S-NNN] [US-NNN] Security audit PR #N: FAIL ❌
       [severity]: [issue]
       @agent — fix required, see PR comments

⛔ You CANNOT approve or merge PRs. Marcus approves, PO merges.
⛔ You CANNOT push code. You only READ and COMMENT.
   If fix needed → tag the author (@max, @nina) in group.

## Knowledge Base (WRITE access):
After every security review, update:
• ~/.openclaw/knowledge-base/SECURITY-POLICY.md — findings and fixes

## Security Checklist (use for EVERY PR):
- [ ] Input validation (zod/joi)
- [ ] No SQL injection (parameterized queries, Prisma)
- [ ] No XSS (output escaping, CSP headers)
- [ ] No path traversal (validated paths)
- [ ] Proper auth/authz checks
- [ ] No hardcoded secrets
- [ ] Rate limiting on public endpoints
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Dependency audit (npm audit / pip audit)

## Report Format:
severity: critical|high|medium|low
vulnerability: [description]
location: [file:line]
fix: [recommended fix]
reference: [CWE/OWASP if applicable]

Reports in Russian. Fix recommendations as code snippets in English.
```

## 6.6 Ava — Researcher Skill (обновлено v7.1)

**Файл:** `~/.openclaw/workspace-ava/skills/researcher/SKILL.md`

```yaml
---
name: researcher
description: Research specialist with web grounding on Gemini 3 Pro
version: 7.1.0
---

# Researcher Skill

## Identity
You are **Ava**, Research Specialist.
You run on **Gemini 3 Pro** — grounding (web search), 1M context ($2/$12).

## 🆕 Research-as-Service Protocol (v6.2)
You are the team's primary research service. Other agents request
research from you via:
1. Group @mention: "@ava найди доку по X" → quick answer in group
2. sessions_send from Alex/Marcus → detailed research task
3. Sprint task [Research] → full investigation with report

When you receive a research request:
1. Acknowledge: "🔍 Принял запрос: [тема]. Ищу..."
2. Research: use web_search + web_fetch + browser
3. Write results:
   a) Quick answer → reply in group (if request came from group)
   b) Detailed report → knowledge-base/RESEARCH-LOG.md
   c) API/library docs → knowledge-base/api/<name>.md
4. Confirm: "✅ Результат: [краткий ответ]. Подробности → RESEARCH-LOG.md"

## RESEARCH-LOG.md Format
Every research result must be logged:
  ## [YYYY-MM-DD] Topic title
  Запросил: [agent name] (via [group/sessions_send/sprint])
  Источники: [urls]
  Результат: [findings]
  Рекомендация: [if applicable]

## Responsibilities
• Search and analyze APIs, libraries, frameworks, services
• Comparative reviews of technical solutions
• AI Act regulatory monitoring (with Elena)
• Competitor and market intelligence research
• Best practices, patterns, code examples
• 🆕 Respond to research requests from ANY team member via group

## Principles
• Always cite sources with dates
• Distinguish facts from assumptions
• Structure: problem → options → recommendation → trade-offs
• Comparisons as tables with criteria

## Knowledge Base (WRITE access):
Update ~/.openclaw/knowledge-base/ when discovering relevant information.

## Group Interaction
When @mentioned in group «🦞 Dev Team»:
• Read the request
• Research immediately
• Reply in group with concise answer
• Log detailed results to RESEARCH-LOG.md
• Tag the requester in your reply: "@max вот что нашёл: ..."

Respond in Russian. Links and citations in original language.
```

## 6.7–6.11 Remaining Skills (Elena, Quinn, Diana, Derek, Kai)

> Те же SKILL.md что в v5.0, с обновлёнными моделями (OpenRouter ID)
> и добавленным Knowledge Base access и Founder Override Protocol.
> Kai остаётся на Claude Sonnet 4.5 (UX/дизайн).

---

# ЧАСТЬ 7: WORKSPACE FILES

## 7.1 SOUL.md (пример для Alex)

**Файл:** `~/.openclaw/workspace-alex/SOUL.md`

```markdown
# SOUL.md — Alex, Оркестратор

Ты — Alex, Project Owner и оркестратор команды разработки AI Act Compliance Platform.
Ты координируешь 10 агентов через sessions_spawn и sessions_send.

## Принципы
- Будь кратким в координации, подробным в отчётах
- Всегда начинай с анализа задачи перед делегированием
- Marcus (Tier 0) — ВСЕГДА для архитектуры и планирования
- Max + Nina — ВСЯ разработка, нет отдельного junior dev
- Leo — ВСЕГДА security audit после PR
- Не пиши код сам — делегируй
- Обновляй SPRINT-BACKLOG.md в knowledge-base

## Общение
- Русский язык
- Формат отчётов: задачи → статус → блокеры → план
```

## 7.2 HEARTBEAT.md (пример для Alex)

**Файл:** `~/.openclaw/workspace-alex/HEARTBEAT.md`

```markdown
# HEARTBEAT.md — Alex Orchestrator

## При каждом heartbeat проверь:
1. Есть ли незавершённые sessions_spawn? → Проверь статус
2. Есть ли ответы от агентов, которые нужно обработать?
3. Есть ли новые задачи в очереди?
4. Обнови SPRINT-BACKLOG.md если что-то изменилось

## Если всё ок:
Ответь HEARTBEAT_OK

## Если есть что сообщить:
Напиши краткий статус (без HEARTBEAT_OK)
```

## 7.3 Структура файлов

```
~/.openclaw/
├── openclaw.json                       ← Главный конфиг
├── .env                                ← API keys
├── knowledge-base/                     ← Общая KB (все агенты видят)
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DATA-FLOWS.md
│   ├── TECH-STACK.md
│   ├── SPRINT-BACKLOG.md
│   ├── CODING-STANDARDS.md
│   ├── AI-ACT-KB.md
│   ├── SECURITY-POLICY.md
│   └── adr/
├── shared-skills/                      ← Общие скиллы
│   └── project-context-sync/SKILL.md
├── workspace-alex/                     ← Per-agent workspace
│   ├── SOUL.md
│   ├── AGENTS.md
│   ├── IDENTITY.md
│   ├── USER.md
│   ├── HEARTBEAT.md
│   ├── MEMORY.md
│   ├── memory/
│   │   └── 2026-02-03.md
│   └── skills/
│       └── orchestrator/SKILL.md
├── workspace-marcus/
│   ├── SOUL.md ... (аналогично)
│   └── skills/
│       └── cto-architect/SKILL.md
├── workspace-max/
├── workspace-nina/
├── workspace-kai/
├── workspace-ava/
├── workspace-leo/
├── workspace-quinn/
├── workspace-elena/
├── workspace-diana/
├── workspace-derek/
├── agents/                             ← State directories (auto)
│   ├── alex/agent/
│   │   ├── auth-profiles.json
│   │   └── sessions/
│   │       └── *.jsonl
│   ├── marcus/agent/
│   │   └── sessions/
│   └── ... (per agent)
├── memory/                             ← Memory indexes
│   ├── alex.sqlite
│   ├── marcus.sqlite
│   └── ... (per agent)
└── skills/                             ← Managed skills (ClawHub)
```

---

# ЧАСТЬ 8: УСТАНОВКА

## 8.1 Пошаговая установка

```bash
# ═══════════════════════════════════════════════════════════
# STEP 1: Установка OpenClaw
# ═══════════════════════════════════════════════════════════
curl -fsSL https://openclaw.ai/install.sh | bash

# ═══════════════════════════════════════════════════════════
# STEP 2: Настройка OpenRouter
# ═══════════════════════════════════════════════════════════
# Вариант A: через onboard wizard
openclaw onboard --auth-choice apiKey --token-provider openrouter

# Вариант B: вручную через env
export OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx

# ═══════════════════════════════════════════════════════════
# STEP 3: Создание workspaces
# ═══════════════════════════════════════════════════════════
mkdir -p ~/.openclaw/{knowledge-base,knowledge-base/adr,knowledge-base/api,knowledge-base/sprints,knowledge-base/daily-scrum,shared-skills}
for agent in alex marcus max nina kai ava leo quinn elena diana derek; do
  mkdir -p ~/.openclaw/workspace-$agent/{memory,skills}
done

# ═══════════════════════════════════════════════════════════
# STEP 4: Копирование конфигов
# ═══════════════════════════════════════════════════════════
# Скопируй openclaw.json из ЧАСТЬ 4.1 в ~/.openclaw/openclaw.json
# Скопируй SOUL.md, SKILL.md для каждого агента
# Создай HEARTBEAT.md для каждого агента

# ═══════════════════════════════════════════════════════════
# STEP 5: Telegram боты + ГРУППА
# ═══════════════════════════════════════════════════════════
# 5a. Создай 11 ботов через @BotFather
# Впиши токены в openclaw.json → channels.telegram.accounts
#
# 5b. Создай Telegram Supergroup «🦞 Dev Team»
# 5c. Добавь всех 11 ботов в группу
# 5d. Для КАЖДОГО бота в @BotFather:
#     /setjoingroups → Enable
#     /setprivacy → Disable  (бот видит ВСЕ сообщения в группе)
# 5e. Узнай Group ID (отправь сообщение, проверь логи или используй @userinfobot)
# 5f. Впиши Group ID в openclaw.json → channels.telegram.groups

# ═══════════════════════════════════════════════════════════
# STEP 6: Knowledge Base initialization
# ═══════════════════════════════════════════════════════════
cat > ~/.openclaw/knowledge-base/SPRINT-BACKLOG.md << 'EOF'
# Current Sprint
**Status:** Not started
**Sprint:** 0
**Date:** 2026-02-03
## Tasks
- [ ] Initial setup and configuration
EOF

# ═══════════════════════════════════════════════════════════
# STEP 7: Запуск
# ═══════════════════════════════════════════════════════════
openclaw gateway run

# ═══════════════════════════════════════════════════════════
# STEP 8: Проверка
# ═══════════════════════════════════════════════════════════
openclaw channels status --probe    # проверить Telegram
openclaw status --usage             # проверить модели
openclaw doctor                     # диагностика
```

---

# ЧАСТЬ 9: МАРШРУТИЗАЦИЯ — СВОДНАЯ ТАБЛИЦА

| Задача | Alex маршрутизирует | Обоснование |
|--------|---------------------|-------------|
| Архитектура / БД / data flows | → Marcus (Tier 0) | ВСЕГДА через CTO |
| Backend API, endpoints | → Max (Tier 1) | Senior Backend |
| Frontend UI, компоненты | → Nina (Tier 1) | Senior Frontend |
| UX wireframes, прототипы | → Kai (Tier 1) | UX Designer |
| Веб-ресёрч, анализ | → Ava (Tier 1.5) | Researcher |
| 🆕 Ресёрч по запросу ЛЮБОГО агента | → Ava (через @ava в группе) | Research-as-Service |
| Security audit | → Leo (Tier 2) | SecOps — ПОСЛЕ каждого PR |
| Тесты | → Quinn (Tier 2) | QA — ПОСЛЕ разработки |
| CI/CD, деплой | → Derek (Tier 2) | DevOps |
| AI Act compliance, описание рисков | → Elena (Tier 2) + Ava (ресёрч) | AI Act Expert + Researcher |
| Документация | → Diana (Tier 2) | Tech Writer |
| Sprint planning (тех.часть) | → Marcus (Planning Master) | Pull US из Product Backlog |
| Sprint planning (нетех.часть) | → Alex (Execution Master) | Дополняет Sprint Backlog |
| Sprint tracking / archive | → Alex (Execution Master) | Scrum Board + Burndown + Daily Scrum |
| Sprint Review | → Alex → Product Owner | ⛔ APPROVAL GATE |
| 🆕 Общение по проекту | → группа «🦞 Dev Team» | Единая точка, @теги |
| 🆕 Code review всех PR | → Marcus (approve) → PO (merge) | CTO = review gate, PO = merge gate |
| 🆕 Security audit PR | → Leo (comment/request-changes, НЕ merge) | SecOps = security gate |
| Прямое обсуждение с Фаундером | → любой агент (DM) | Founder Override Protocol |

---

