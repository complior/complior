# Complior v10 — Стратегия платформы

> От инструмента для разработчика к платформе управления ИИ-агентами

---

## 1. Что мы строим

Complior — платформа, которая решает одну проблему: **ИИ-системы в ЕС должны соответствовать закону, а у команд нет ни времени, ни экспертизы это обеспечить.**

2 августа 2026 года вступает в полную силу EU AI Act. 108 обязательств. Штрафы до 35 млн EUR. Через 5 месяцев каждая компания, использующая ИИ в ЕС, должна доказать compliance. Параллельно растёт спрос на ISO 42001 (система управления ИИ) и ISO 27090 (безопасность ИИ).

---

## 2. Три уровня платформы

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
│  │  │ Scanner  │   │ 8 pages  │   │ Code Tools:  │                │    │
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

## 4. Продукт: Engine

**Что это:** фоновый daemon (TypeScript/Node.js), ядро платформы. Сканирует код, генерирует фиксы, создаёт документы, управляет паспортами, ведёт evidence chain. Предоставляет HTTP API + SSE + MCP для всех клиентов.

**Уровень:** Development-time

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
│  │  │ /sbom    │  │           │  │          │  │              │  │   │
│  │  └──────────┘  └───────────┘  └──────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Фичи Engine

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| E-F1 | **Scanner** | 5-уровневое сканирование: файлы → документы → зависимости → AST → LLM. Score 0-100. Каждый finding привязан к статье EU AI Act | Готов |
| E-F2 | **Fixer** | 6 стратегий автофикса. Type A (код): обёртка LLM-вызовов. Type B (документы): генерация из шаблонов. Type C (конфиг): правка зависимостей. Cross-layer rules. Undo | Готов |
| E-F3 | **Document Generator** | 8 шаблонов EU AI Act/ISO 42001. Автозаполнение из паспорта (25-70%). LLM-дозаполнение (планируется). L2-валидация глубины | Частично |
| E-F4 | **Passport Service** | 36-полевой паспорт ИИ-агента. 3 режима создания: Auto (AST), MCP Proxy, SaaS Wizard. ed25519 подпись | Готов |
| E-F5 | **Evidence Chain** | Криптографическая цепочка: scan → SHA-256 hash → ed25519 подпись → chain. Tamper-proof доказательство для аудитора | Готов |
| E-F6 | **FRIA Generator** | Fundamental Rights Impact Assessment. Шаблон + подстановка из паспорта. Планируется: LLM-дозаполнение таблицы рисков | Частично |
| E-F7 | **Obligation Mapper** | 108 обязательств EU AI Act + 39 контролей ISO 42001. Маппинг finding → обязательство. Scoring rules | Готов |
| E-F8 | **LLM Module** | Vercel AI SDK. L5 deep analysis, дозаполнение документов, FRIA, Chat Assistant | Частично |
| E-F9 | **File Watcher** | chokidar, 200ms debounce. Каждое изменение файла → rescan → score update → SSE event | Готов |
| E-F10 | **HTTP API + SSE** | Hono server. REST endpoints для всех операций. SSE для real-time updates. Динамический порт | Готов |

### Бэклог фич — Engine

**E-F1: Scanner**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-96 (formerly F-V9-14) | **Инкрементальное сканирование.** Повторный скан проверяет только изменённые файлы (hash-cache, mtime). 1000+ файлов → секунды, не минуты | Medium |
| E-100 (formerly F-V9-18) | **L2 — конкретика вместо word count.** Валидатор проверяет наличие чисел, дат, имён, метрик, а не только количество слов | Low |
| F-V9-22 | **Finding explanations.** Для каждого finding — человеческое объяснение: что нарушено, последствия, штраф, как починить | Medium |
| F-V9-29 | **Scanner rules ISO 27090.** 6 новых правил безопасности: input validation, rate limiting, output validation, model access control, data validation, logging security | Medium |

**E-F2: Fixer**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-97 (formerly F-V9-15) | **Валидация фиксов.** После apply fix — проверка: score улучшился? Если нет — предложить undo. Dry-run preview, stale diff detection | Medium |

**E-F3: Document Generator**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-95 (formerly F-V9-13) | **Inline guidance в шаблонах.** Каждый placeholder → подсказка: пример, критерии, ссылка на статью. Пользователь заполняет без юриста | Medium |
| F-V9-24 | **AI Policy Generator (ISO 42001 A.2.2).** Шаблон организационной политики ИИ: fairness, transparency, accountability, human oversight, privacy, safety. Wizard + LLM-дозаполнение | High |
| F-V9-25 | **SoA Generator (ISO 42001 Clause 6.1.3).** Statement of Applicability: 39 контролей Annex A × применимость × обоснование. Auto-fill из scan results | High |
| F-V9-26 | **Risk Register (ISO 42001 Clause 6.1.2).** Трансформация scan findings → risk entries: likelihood, impact, treatment (mitigate/transfer/avoid/accept) | High |

**E-F4: Passport Service**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-98 (formerly F-V9-16) | **Discovery из env vars и конфигов.** Поиск моделей в .env, docker-compose.yml, config.yaml, а не только в коде | Medium |

**E-F5: Evidence Chain**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-99 (formerly F-V9-17) | **Per-finding evidence.** Forensic trail для каждого finding: hash кода → fix applied → file changed → re-scan confirmed. Before/after hashes | Medium |

**E-F6: FRIA Generator**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-94 (formerly F-V9-11) | **FRIA LLM-дозаполнение.** LLM заполняет таблицу рисков по 8 правам (на основании типа системы, автономии, permissions из паспорта). Пользователь ревьюит, а не пишет с нуля | High |

---

## 5. Продукт: CLI / TUI

**Что это:** единый Rust binary (`complior`). Два режима: TUI dashboard (ratatui, интерактивный) и headless CLI (команды для CI/CD, скрипты). Управляет daemon'ом Engine.

**Уровень:** Development-time

**Расположение:** `cli/` (пакет `complior-cli`, binary `complior`)

```
┌─────────────────────────────── CLI / TUI ─────────────────────────────────┐
│                                                                           │
│  ┌────────────────────────────── TUI MODE ─────────────────────────────┐  │
│  │                                                                     │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐   │  │
│  │  │ Dashboard │ │   Scan    │ │    Fix    │ │    Passport       │   │  │
│  │  │    (D)    │ │    (S)    │ │    (F)    │ │      (P)          │   │  │
│  │  │           │ │           │ │           │ │                   │   │  │
│  │  │ Score     │ │ Findings  │ │ Preview   │ │ 36 полей          │   │  │
│  │  │ Activity  │ │ Layers    │ │ Apply     │ │ Detail panel      │   │  │
│  │  │ Status    │ │ Filter    │ │ Undo      │ │ Completeness      │   │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘   │  │
│  │                                                                     │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐   │  │
│  │  │Obligations│ │ Timeline  │ │  Report   │ │   Log / Chat      │   │  │
│  │  │    (O)    │ │    (T)    │ │    (R)    │ │      (L)          │   │  │
│  │  │           │ │           │ │           │ │                   │   │  │
│  │  │ 108 oblgs │ │ Deadlines │ │ MD / PDF  │ │ System log        │   │  │
│  │  │ 8 filters │ │ Critical  │ │ Export    │ │ Chat assistant    │   │  │
│  │  │ Coverage  │ │ Progress  │ │ Summary   │ │ [ПЛАНИРУЕТСЯ]     │   │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────── HEADLESS MODE ────────────────────────────┐  │
│  │                                                                     │  │
│  │  complior scan [--ci] [--json] [--sarif]    Сканирование            │  │
│  │  complior fix [--dry-run] [--json]          Автофикс                │  │
│  │  complior agent init|list|show|fria|evidence  Паспорт + FRIA       │  │
│  │  complior report [--format md|pdf]          Отчёт                   │  │
│  │  complior sync [--passport] [--scan] [--docs]  Синхронизация SaaS  │  │
│  │  complior login | logout                    Авторизация SaaS        │  │
│  │  complior init                              Инициализация проекта   │  │
│  │  complior doctor                            Диагностика             │  │
│  │  complior update                            Обновление              │  │
│  │  complior version                           Версия                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────── DAEMON MGMT ─────────────────────────────┐  │
│  │                                                                     │  │
│  │  complior daemon [start|status|stop]   Управление background engine │  │
│  │  complior daemon --watch               Daemon с file watcher        │  │
│  │  Auto-discovery: PID file + port detection                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Фичи CLI/TUI

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| C-F1 | **TUI Dashboard** | 8 страниц: Dashboard, Scan, Fix, Passport, Obligations, Timeline, Report, Log. Mouse + keyboard. Themes | Готов |
| C-F2 | **Headless CLI** | Все команды в non-interactive режиме. CI/CD интеграция. JSON/SARIF output | Готов |
| C-F3 | **Daemon Management** | start/stop/status. PID file. Auto-discovery. Auto-launch из TUI | Готов |
| C-F4 | **Chat Assistant** | Контекстный LLM-помощник, привязанный к текущей странице. Объяснения findings, помощь с документами, advice | Планируется |
| C-F5 | **Wizard Mode** | Пошаговое заполнение документов через вопросы в TUI. Прогресс-бар, промежуточное сохранение | Планируется |
| C-F6 | **Onboarding** | Пошаговый onboarding для новых пользователей: «5 шагов до 80% score», приоритизация по impact/effort | Частично |

### Бэклог фич — CLI/TUI

**C-F4: Chat Assistant**

| ID | Описание | Приоритет |
|----|----------|-----------|
| F-V9-TUI-01 | **TUI Chat Assistant.** На каждой странице — контекстный помощник. Dashboard: «Что делать первым?» → план. Scan: «Объясни finding» → объяснение. Fix: «Что изменится?» → preview. Passport: «Заполни поле» → wizard. Log/Chat: два режима (Tab переключение) | High |

**C-F5: Wizard Mode**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-101 (formerly F-V9-12) | **Wizard-заполнение документов.** TUI спрашивает «Кто DPO?» → ввод → «Какой уровень риска?» → выбор → документ заполнен. Для всех 8+ шаблонов | High |

**C-F2: Headless CLI**

| ID | Описание | Приоритет |
|----|----------|-----------|
| C-27 (formerly F-V9-21) | **Compliance Diff в PR.** `complior scan --ci --diff=main` → GitHub/GitLab comment с delta score. Блокировка merge при регрессии | Medium |

**C-F6: Onboarding**

| ID | Описание | Приоритет |
|----|----------|-----------|
| C-28 (formerly F-V9-23) | **Guided Onboarding.** «5 шагов до 80%»: приоритизированных по impact/effort. Прогресс-бар. Работает в TUI и headless | Medium |

**C-F1: TUI Dashboard**

| ID | Описание | Приоритет |
|----|----------|-----------|
| E-102 (formerly F-V9-19) | **Compliance Cost Estimator.** Для каждого finding — оценка трудозатрат (0мин/30мин/4ч/8ч). Общий estimate до 80% и 100% score | Medium |

---

## 6. Продукт: SDK

**Что это:** npm-библиотека (`@complior/sdk`). Proxy-обёртка для LLM-клиентов в production. Каждый API-вызов проходит через pipeline: pre-hooks → вызов LLM → post-hooks. Все проверки детерминистические (regex, правила), без собственной модели. Опциональное подключение Guard API для семантики.

**Уровень:** Runtime

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
│  │   │  2. prohibited    → блокировка ст. 5 (regex/Guard)  │           │  │
│  │   │  3. sanitize      → редакция PII до отправки        │           │  │
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
│  │   │  1. disclosure-verify → проверка disclosure         │           │  │
│  │   │  2. content-marking   → metadata AI-generated       │           │  │
│  │   │  3. escalation        → детекция эскалации          │           │  │
│  │   │  4. bias-check        → детекция предвзятости       │           │  │
│  │   │  5. headers           → compliance HTTP headers     │           │  │
│  │   │  6. budget*           → учёт расходов               │           │  │
│  │   │  7. action-log*       → callback аудита             │           │  │
│  │   │  8. circuit-breaker   → каскадная защита            │           │  │
│  │   │                                                     │           │  │
│  │   │  * = только compliorAgent()                         │           │  │
│  │   └──────────────────────┬──────────────────────────────┘           │  │
│  │                          │                                          │  │
│  │                          ▼                                          │  │
│  │                   Ответ пользователю                                │  │
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
│  ┌──────────────── GUARD INTEGRATION (opt-in) ────────────────────────┐  │
│  │  guard: { endpoint: 'https://guard.complior.dev' }                 │  │
│  │  guard: { local: true }  // Ollama / Docker                        │  │
│  │                                                                     │  │
│  │  Regex (0ms, free) → не уверен? → Guard API (50ms, $0.0001)       │  │
│  │  [ПЛАНИРУЕТСЯ]                                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Фичи SDK

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| S-F1 | **Proxy Wrapper** | `complior(client)` / `compliorAgent(client, passport)`. JavaScript Proxy, перехватывает методы LLM-клиента. Работает без модификации кода пользователя | Готов |
| S-F2 | **Pre-hooks** | 6 хуков до вызова LLM: logger, prohibited (ст. 5), sanitize (PII), disclosure (system message), permission (tools), rate-limit (window) | Готов (базовый) |
| S-F3 | **Post-hooks** | 8 хуков после ответа LLM: disclosure-verify, content-marking, escalation, bias-check, headers, budget, action-log, circuit-breaker | Готов (базовый) |
| S-F4 | **Provider Adapters** | 4 провайдера: OpenAI, Anthropic, Google, Vercel AI. Автоопределение типа клиента | Готов |
| S-F5 | **Domain Hooks** | 6 доменов: HR, Finance, Healthcare, Education, Legal, Content. Специализированные правила для каждой отрасли | Готов (декоративно) |
| S-F6 | **Guard Integration** | Opt-in подключение Guard API. Двухуровневая проверка: быстрый regex → семантика Guard для edge cases | Планируется |

### Бэклог фич — SDK

**S-F2: Pre-hooks**

| ID | Описание | Приоритет |
|----|----------|-----------|
| S-29 (formerly F-V9-01) | **Prohibited: 50+ паттернов.** Расширение с 5 до 50+ regex. Синонимы, парафразы, англ./нем./фр./нл. Двухуровневая проверка: regex + Guard API для edge cases | Critical |
| S-30 (formerly F-V9-02) | **Sanitize: 50+ типов PII.** Телефоны, IBAN, паспорта, ИНН, IP, даты рождения. Региональные форматы (DE, FR, NL, PL, IT, ES) | Critical |
| S-31 (formerly F-V9-03) | **Permission: проверка tool_calls.** Парсинг params.tools, params.functions, перехват tool_calls в ответе. Реальная блокировка запрещённых инструментов | Critical |

**S-F3: Post-hooks**

| ID | Описание | Приоритет |
|----|----------|-----------|
| S-32 (formerly F-V9-04) | **Disclosure verify: проверка текста.** Проверять текст ответа LLM (regex), а не только флаг pre-hook. Prepend disclosure если не найден (опционально) | High |
| S-33 (formerly F-V9-05) | **Bias: 15 protected characteristics.** Возраст, инвалидность, религия, ориентация, национальность, беременность, генетика и др. Severity levels | High |
| S-34 (formerly F-V9-07) | **Content marking: видимый маркер.** Настраиваемый маркер в текст ответа (footer/prefix/none), а не только metadata | Medium |
| S-35 (formerly F-V9-08) | **Budget: актуальные цены.** Config file для цен моделей. Pre-estimation для streaming. Корректный подсчёт бюджета | Medium |
| S-36 (formerly F-V9-10) | **Headers: HTTP integration.** Compliance headers реально попадают в HTTP-ответ. Helper для Express/Hono/Fastify + документация | Medium |

**S-F1: Proxy Wrapper**

| ID | Описание | Приоритет |
|----|----------|-----------|
| S-38 (formerly F-V9-06) | **Streaming support.** Post-hooks работают со streaming-ответами: chunk collection + post-hook после stream end. Streaming не обходит проверки | High |

**S-F5: Domain Hooks**

| ID | Описание | Приоритет |
|----|----------|-----------|
| S-37 (formerly F-V9-09) | **Domain hooks: реальное enforcement.** Healthcare: de-identification. Legal: disclaimer prepend. Content: AI-GENERATED marker в текст. Education: content safety проверка. Вместо декоративных флагов | High |

---

## 7. Продукт: MCP Server

**Что это:** Model Context Protocol server. Предоставляет compliance-инструменты для ИИ-агентов через stdio protocol. Строители подключают MCP и получают compliance checks прямо в IDE/agent.

**Уровень:** Development-time (для строителей)

**Расположение:** `engine/core/src/mcp/` (embedded в Engine)

```
┌──────────────────────── MCP SERVER ────────────────────────────────────┐
│                                                                        │
│  Протокол: stdio (JSON-RPC)                                            │
│  Подключение: claude_desktop_config.json / .cursor/mcp.json            │
│                                                                        │
│  ┌─────────────────── CODE TOOLS (для строителей) ────────────────┐   │
│  │                                                                 │   │
│  │  complior_scan       → запуск сканирования проекта              │   │
│  │  complior_fix        → применение автофикса к finding           │   │
│  │  complior_passport   → генерация/показ Agent Passport          │   │
│  │  complior_suggest    → предложение следующего действия          │   │
│  │  complior_explain    → объяснение finding на понятном языке     │   │
│  │  complior_validate   → валидация документа по структуре         │   │
│  │  complior_deadline   → показ дедлайнов EU AI Act               │   │
│  │  complior_score      → текущий compliance score                │   │
│  │                                                                 │   │
│  │  Статус: ГОТОВ (8 инструментов)                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────── GUARD TOOLS (для самоконтроля) ─────────────┐   │
│  │                                                                 │   │
│  │  complior_guard_check  → проверка текста на prohibited/safe     │   │
│  │  complior_guard_pii    → детекция PII в тексте                  │   │
│  │  complior_guard_bias   → проверка ответа на bias               │   │
│  │                                                                 │   │
│  │  Статус: ПЛАНИРУЕТСЯ (требует Guard API)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Совместимые агенты:                                                    │
│  Claude Code, Cursor, Windsurf, OpenCode, Codex, Devin, aider          │
└────────────────────────────────────────────────────────────────────────┘
```

### Фичи MCP Server

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| M-F1 | **Code Tools** | 8 инструментов для compliance workflow: scan, fix, passport, suggest, explain, validate, deadline, score | Готов |
| M-F2 | **Guard Tools** | 3 инструмента для self-governance: guard_check (prohibited/safe), guard_pii (PII detection), guard_bias (bias check). Агент проверяет себя перед действием | Планируется |

### Бэклог фич — MCP Server

| ID | Описание | Приоритет |
|----|----------|-----------|
| F-V9-MCP-01 | **Guard Tools.** 3 MCP-инструмента для самоконтроля агентов: `guard_check` (prohibited), `guard_pii` (PII), `guard_bias` (bias). Интеграция с Guard API. Строители могут встраивать self-governance в создаваемых агентов | High |
| F-V9-MCP-02 | **Builder workflow integration.** Когда агент пишет `new OpenAI()` без обёртки → `complior_suggest` подсказывает добавить `complior()`. Создаёт агента → suggest генерирует паспорт. Compliance по умолчанию | Medium |

---

## 8. Продукт: Guard API

**Что это:** специализированная лёгкая ML-модель, обученная на задачах compliance/security. Замена regex на семантическое понимание. 50-100ms на проверку, $0.0001 за вызов. Питает SDK, MCP и Engine.

**Уровень:** Runtime

**Статус:** R&D Phase (отдельный трек, не в спринтовом цикле)

> Guard API — это отдельный R&D-проект, идущий параллельно основным спринтам. Не привязан к конкретному спринту. Разработка ведётся независимо ML-инженером (оценка: 2-3 месяца).

```
┌──────────────────────── GUARD API ─────────────────────────────────────┐
│                                                                        │
│  POST /guard/check { text, tasks: ["prohibited", "pii", "bias"] }      │
│                                                                        │
│  ┌─────────────── 5 ЗАДАЧ КЛАССИФИКАЦИИ ──────────────────────────┐   │
│  │                                                                 │   │
│  │  ┌────────────────┐  Input: промпт                              │   │
│  │  │  PROHIBITED    │  Output: BLOCKED / SAFE + article           │   │
│  │  │  (ст. 5)       │  Latency: 50ms                              │   │
│  │  └────────────────┘                                             │   │
│  │                                                                 │   │
│  │  ┌────────────────┐  Input: промпт                              │   │
│  │  │  PII           │  Output: список PII + типы                  │   │
│  │  │  (GDPR)        │  Latency: 50ms                              │   │
│  │  └────────────────┘                                             │   │
│  │                                                                 │   │
│  │  ┌────────────────┐  Input: ответ LLM                           │   │
│  │  │  BIAS          │  Output: BIAS / SAFE + category             │   │
│  │  │  (15 характ.)  │  Latency: 50ms                              │   │
│  │  └────────────────┘                                             │   │
│  │                                                                 │   │
│  │  ┌────────────────┐  Input: промпт                              │   │
│  │  │  INJECTION     │  Output: INJECTION / SAFE + type            │   │
│  │  │  (ISO 27090)   │  Latency: 50ms                              │   │
│  │  └────────────────┘                                             │   │
│  │                                                                 │   │
│  │  ┌────────────────┐  Input: ответ LLM                           │   │
│  │  │  ESCALATION    │  Output: ESCALATION / SAFE                  │   │
│  │  │  (ст. 14)      │  Latency: 30ms                              │   │
│  │  └────────────────┘                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────── МОДЕЛЬ ─────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Base: Mistral 7B или Llama 3 8B (open-weight, commercial OK)  │   │
│  │  Fine-tuning: LoRA/QLoRA, multi-task head (1 encoder, 5 heads) │   │
│  │  Inference: INT4 quantization (2-3 GB RAM)                     │   │
│  │  Training: 1-2 GPU-дня на A100                                 │   │
│  │                                                                 │   │
│  │  Данные:                                                        │   │
│  │  • EU AI Act полный текст (180 стр.)                            │   │
│  │  • Prohibited practices: ~5,000 пар (positive/negative)        │   │
│  │  • PII patterns (EU): ~10,000 примеров                         │   │
│  │  • Bias (BBQ, WinoBias, CrowS-Pairs): ~15,000 примеров        │   │
│  │  • Prompt injection (OWASP, Garak, HackAPrompt): ~8,000       │   │
│  │  • Escalation (multilingual): ~2,000 примеров                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────── DEPLOYMENT ─────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Cloud (primary):                                               │   │
│  │  • Hetzner GPU (Германия) — data residency EU                  │   │
│  │  • REST API: POST /guard/check                                  │   │
│  │  • Pricing: $0.0001/call (1000/мес free)                       │   │
│  │  • SLA: 99.9%, <100ms p95                                      │   │
│  │                                                                 │   │
│  │  Local (enterprise):                                            │   │
│  │  • Docker image с quantized моделью                            │   │
│  │  • Ollama: ollama run complior-guard                           │   │
│  │  • Offline, 4GB RAM minimum                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Интеграция в SDK:                                                      │
│  Regex (0ms, free) → не уверен → Guard (50ms, $0.0001)                 │
│  80% отсекает regex, 20% обрабатывает Guard                            │
│  Средняя стоимость: ~$0.00002 на вызов                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Фичи Guard API

| # | Фича | Описание | Статус |
|---|------|----------|--------|
| G-F1 | **Prohibited Detection** | Семантическая детекция запрещённых практик (ст. 5). Синонимы, парафразы, implicit формулировки. Привязка к конкретной статье | R&D |
| G-F2 | **PII Detection** | Детекция EU-специфичных PII: IBAN, BSN, паспорта, налоговые номера. Многоязычный | R&D |
| G-F3 | **Bias Detection** | 15 protected characteristics (EU Charter). Severity levels. Объяснение типа bias | R&D |
| G-F4 | **Prompt Injection** | Direct + indirect injection. Обученная на OWASP LLM Top 10, Garak, HackAPrompt | R&D |
| G-F5 | **Escalation Detection** | Детекция ситуаций, требующих human oversight (ст. 14). Многоязычный | R&D |
| G-F6 | **Cloud Deployment** | Hetzner GPU (EU). REST API. $0.0001/call. SLA 99.9% | R&D |
| G-F7 | **Local Deployment** | Docker image + Ollama. Self-hosted для enterprise. Offline, 4GB RAM | R&D |

### Бэклог фич — Guard API

| ID | Описание | Приоритет |
|----|----------|-----------|
| F-V9-28 | **Prompt Injection Detection.** Guard API детектирует direct и indirect injection до отправки в LLM. Detection rate >90% на HackAPrompt dataset | High |
| F-V9-30 | **Fine-tune Complior Guard.** Обучить Mistral 7B LoRA на 5 задачах классификации. <100ms latency, >90% accuracy на тестовых датасетах | High |
| F-V9-31 | **Deploy Guard API.** Hosted endpoint (Hetzner GPU, EU) + Docker image для enterprise. REST API, <100ms p95, 99.9% SLA | High |

### R&D Timeline

```
Phase 1 (4 нед.): Data Collection — 40K+ examples для 5 задач
Phase 2 (3 нед.): Fine-tune — LoRA training, evaluation pipeline
Phase 3 (2 нед.): Deploy — Hetzner GPU, API gateway, monitoring
Phase 4 (2 нед.): Integration — SDK + MCP + SaaS подключение
                   ─────────────────────────────────────────
                   Итого: ~11 недель (с буфером ~3 месяца)
```

Зависимости от Guard API:
- M-09 MCP Guard Tools — после G-06
- S-28 SDK Guard Integration — после G-06
- SaaS Guard calls — после G-06

---

## 9. Продукт: SaaS Dashboard

**Что это:** веб-платформа для управления compliance на уровне организации. Паспорта, FRIA, документы, аудит-пакеты, ISO 42001 readiness, fleet management. 3 тарифа: Starter (€0), Growth (€149/мес), Enterprise (€499/мес). CLI-Scanner -- бесплатно, независимо от тарифа, навсегда.

**Уровень:** Management

**Расположение:** отдельный репозиторий (`ai-act-compliance-platform`)

```
┌──────────────────────── SAAS DASHBOARD ────────────────────────────────┐
│                                                                        │
│  ┌──── STARTER ───┐  ┌──── GROWTH ────┐  ┌── ENTERPRISE ──┐           │
│  │      €0         │  │   €149/мес     │  │   €499/мес     │           │
│  │                 │  │                │  │                │           │
│  │ До 3 KI-систем  │  │ Unlimited      │  │ Все Growth +   │           │
│  │ Базовый обзор   │  │ систем         │  │ SSO            │           │
│  │ комплаенса      │  │ FRIA, Risk Mgt │  │ Multi-Workspace│           │
│  │ 1 отчёт/мес     │  │ QMS, Monitoring│  │ API-доступ     │           │
│  │                 │  │ Conformity     │  │ Unlimited      │           │
│  │ ЦА: инд. разр., │  │ Assessment     │  │ юзеров         │           │
│  │ маленькие       │  │ Уведомл. влас. │  │                │           │
│  │ стартапы        │  │ 10 юзеров      │  │ ЦА: средние    │           │
│  │                 │  │                │  │ предприятия    │           │
│  │                 │  │ ЦА: софтверные │  │ 500-5000 сотр. │           │
│  │                 │  │ компании       │  │ и консалтинг.  │           │
│  │                 │  │ 50-500 сотр.   │  │ компании       │           │
│  └───────┬─────────┘  └───────┬────────┘  └───────┬────────┘           │
│          │                    │                    │                    │
│          └────────────────────┼────────────────────┘                    │
│                               │                                        │
│              CLI-Scanner — бесплатно, независимо от тарифа, навсегда   │
│                                                                        │
│  ┌─────────────────── ФИЧИ ──────────────────────────────────────┐    │
│  │                                                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │    │
│  │  │  DASHBOARD   │  │  PASSPORT    │  │  FRIA WIZARD       │   │    │
│  │  │              │  │  WIZARD      │  │                    │   │    │
│  │  │ Fleet score  │  │              │  │ 5-step guided      │   │    │
│  │  │ Trends       │  │ Mode 3:      │  │ LLM-дозаполнение  │   │    │
│  │  │ Role-based   │  │ 5-step UI    │  │ PDF export         │   │    │
│  │  │ Cross-system │  │ creation     │  │ Legal review       │   │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘   │    │
│  │                                                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │    │
│  │  │ AUDIT PKG    │  │ ISO 42001    │  │ AGENT REGISTRY     │   │    │
│  │  │              │  │ READINESS    │  │                    │   │    │
│  │  │ One-click    │  │              │  │ All AI systems     │   │    │
│  │  │ ZIP: exec    │  │ Clauses 4-10 │  │ CLI + SaaS         │   │    │
│  │  │ summary,     │  │ 39 Annex A   │  │ created            │   │    │
│  │  │ passports,   │  │ EU Act map   │  │ Unified view       │   │    │
│  │  │ evidence     │  │ Cert. score  │  │                    │   │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘   │    │
│  │                                                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │    │
│  │  │ REPORTS      │  │ MONITORING   │  │ VENDOR COMM.       │   │    │
│  │  │              │  │              │  │                    │   │    │
│  │  │ MD / PDF     │  │ Drift        │  │ Шаблоны запросов   │   │    │
│  │  │ Branded      │  │ Anomalies    │  │ к вендорам ИИ      │   │    │
│  │  │ Executive    │  │ Real-time    │  │ (Art. 25)          │   │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘   │    │
│  │                                                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │    │
│  │  │ EU DATABASE  │  │  INCIDENT    │  │ COMPLIANCE DIFF    │   │    │
│  │  │ HELPER       │  │  MANAGEMENT  │  │                    │   │    │
│  │  │              │  │              │  │ PR comment         │   │    │
│  │  │ Art. 49      │  │ Log →        │  │ Delta score        │   │    │
│  │  │ Registration │  │ Classify →   │  │ CI integration     │   │    │
│  │  │ assistant    │  │ Escalate →   │  │                    │   │    │
│  │  │              │  │ Report       │  │                    │   │    │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘   │    │
│  └────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

### Фичи SaaS Dashboard

| # | Фича | Описание | Тариф | Статус |
|---|------|----------|-------|--------|
| D-F1 | **Fleet Dashboard** | Общий score, список AI-систем, тренды, role-based views, cross-system map | Starter (базов.) / Growth (полный) | Частично |
| D-F2 | **Passport Mode 3 Wizard** | 5-шаговое создание паспорта через UI. Guided, с подсказками | Growth+ | Частично |
| D-F3 | **FRIA Wizard** | Guided FRIA: шаблон + подстановка + LLM-дозаполнение + PDF export + legal review workflow | Starter (базов.) / Growth (полный) | Частично |
| D-F4 | **Document Templates** | 15+ шаблонов EU AI Act + ISO 42001. Wizard-заполнение. LLM-дозаполнение | Starter (3 шт.) / Growth (все) | Частично |
| D-F5 | **Audit Package** | One-click ZIP: exec summary, паспорта, FRIA, evidence, monitoring, training | Growth+ | Планируется |
| D-F6 | **ISO 42001 Readiness** | Прогресс Clauses 4-10, статус 39 контролей, маппинг на EU AI Act, certification score | Growth+ | Планируется |
| D-F7 | **Agent Registry** | Единый реестр всех AI-систем (CLI + SaaS). Паспорта + сканы + история | Starter+ | Частично |
| D-F8 | **Reports** | Compliance reports: MD (Starter) / PDF branded (Growth+). Executive summary | Growth+ | Частично |
| D-F9 | **Monitoring** | Drift detection, anomalies, accuracy tracking в реальном времени | Enterprise | Планируется |
| D-F10 | **Vendor Communication** | Шаблоны запросов к провайдерам ИИ (Art. 25): тех. документация, DPA, Model Card | Growth+ | Планируется |
| D-F11 | **Incident Management** | Полный цикл: лог → классификация → эскалация → отчёт (Art. 73) | Enterprise | Планируется |
| D-F12 | **EU Database Helper** | Помощник регистрации в EU Database (Art. 49) | Enterprise | Планируется |

### Бэклог фич — SaaS Dashboard

| ID | Описание | Приоритет |
|----|----------|-----------|
| F-V9-20 | **Vendor Communication Templates.** Генерация шаблона запроса к вендору на основании gaps в паспорте. Art. 25 compliance | Medium |
| F-V9-27 | **ISO 42001 Readiness Dashboard.** Прогресс по Clauses 4-10, статус 39 контролей, маппинг на EU AI Act, certification readiness score | High |

---

## 10. Стандарты: покрытие

### 10.1. EU AI Act (108 обязательств)

Текущее покрытие: ~50% автоматически, ~35% с шаблонами, ~15% manual.

```
┌────────────────── EU AI ACT → ПРОДУКТЫ ──────────────────────────────┐
│                                                                       │
│  Статья       Обязательство            Продукт         Статус        │
│  ─────────────────────────────────────────────────────────────────    │
│  Ст. 4        AI Literacy              Engine (L1)     Готово        │
│  Ст. 5        Запрещённые практики     Engine + SDK    Готово        │
│  Ст. 9        Управление рисками       Engine (Doc)    Планируется  │
│  Ст. 10       Данные и governance      Engine + SDK    Готово        │
│  Ст. 11-12    Тех. документация, логи  Engine (Doc)    Готово        │
│  Ст. 14       Human oversight          SDK (escalation) Готово       │
│  Ст. 26       Обязанности deployer'а   Engine (Passport) Готово     │
│  Ст. 27       FRIA                     Engine + SaaS   Готово        │
│  Ст. 49       Регистрация EU DB        SaaS (D-F12)    Планируется  │
│  Ст. 50       Прозрачность            SDK (disclosure) Готово        │
│  Ст. 72       Post-market monitoring   Engine (drift)  Готово        │
│  Ст. 73       Инциденты               SaaS (D-F11)    Планируется   │
└───────────────────────────────────────────────────────────────────────┘
```

### 10.2. ISO/IEC 42001 — Система управления ИИ (AIMS)

Первый сертифицируемый стандарт для управления ИИ. 10 разделов (Clauses 4-10) + 39 контролей (Annex A) + 15 обязательных документов.

**Текущее покрытие: ~45-50%**

```
┌────────────────── ISO 42001 → ПРОДУКТЫ ──────────────────────────────┐
│                                                                       │
│  Контроль       Требование               Продукт         Статус     │
│  ─────────────────────────────────────────────────────────────────    │
│  A.5.2-5.4      Risk/Impact Assessment   Engine (FRIA)    Готово     │
│  A.6.2.3-6      V&V, деплой, мониторинг  Engine (Scanner) Готово     │
│  A.6.2.9        Документация AI-систем   Engine (Passport) Готово    │
│  A.6.2.10       Запрещённое использование Engine + SDK     Готово     │
│  A.6.2.11       Third-party компоненты   Engine (SBOM)    Готово     │
│  A.7.6          Происхождение данных     Engine (Evidence) Готово    │
│  A.8.2          Disclosure               SDK              Готово     │
│  A.9.5          Human oversight          SDK (escalation)  Готово    │
│  Clause 7.2-3   Компетенции             Engine (L1)      Готово     │
│  ─────────────────────────────────────────────────────────────────    │
│  Clause 6.1.3   Statement of Applicability Engine (Doc)   Планир.    │
│  A.2.2-2.3      AI Policy               Engine (Doc)     Планир.    │
│  Clause 6.1.2   Risk Register            Engine (Doc)     Планир.    │
│  A.5.3-5.4      AIIA (расширенный FRIA)  Engine (Doc)     Планир.    │
│  Clause 9.2     Internal Audit Checklist SaaS             Планир.    │
│  Clause 9.3     Management Review        SaaS             Планир.    │
│  Clause 6.3     Change Management        Engine (Doc)     Планир.    │
│  Clause 10.1    Continual Improvement    Engine (Evidence) Планир.   │
│  Clause 7.2     Competence Matrix        Engine (Doc)     Планир.    │
└───────────────────────────────────────────────────────────────────────┘
```

### 10.3. ISO/IEC 27090 — Безопасность ИИ

Guidance стандарт (не сертифицируемый). 13 категорий угроз.

**Текущее покрытие: ~15-20%**

```
┌────────────────── ISO 27090 → ПРОДУКТЫ ──────────────────────────────┐
│                                                                       │
│  Угроза                  Продукт            Статус                   │
│  ─────────────────────────────────────────────────────────────────    │
│  Prompt Injection        Guard API (G-F4)    R&D                      │
│  Evasion Attacks         Guard API           R&D                      │
│  Data Extraction         Guard API           R&D                      │
│  Supply Chain            Engine (SBOM)       Частично                 │
│  Model Extraction        SDK (rate-limit)    Частично                 │
│  AI-specific DoS         SDK (circuit-br.)   Частично                 │
│  Data Poisoning          Engine (Doc)        Планируется              │
│  Inference Attacks       Guard API           R&D                      │
└───────────────────────────────────────────────────────────────────────┘
```

### 10.4. NIST AI RMF

Добровольный фреймворк. 4 функции, 19 категорий, 72 подкатегории.

**Текущее покрытие: ~35-40%**

Сильные стороны: MEASURE (сканер, метрики). Слабые: GOVERN (политики), MAP (контекст).

ISO 42001 + NIST AI RMF + EU AI Act = тройка, которая покрывает всё. Complior строит мост между ними.

---

## 11. Сводная таблица фич

### По продуктам

```
┌──────────────────── ФИЧИ ПО ПРОДУКТАМ ────────────────────────┐
│                                                                        │
│  ENGINE (12 фич)                                                        │
│  ├── Scanner:   E-96, E-100, F-V9-22, F-V9-29                    │
│  ├── Fixer:     E-97                                                │
│  ├── Documents: E-95, F-V9-24, F-V9-25, F-V9-26                  │
│  ├── Passport:  E-98                                                │
│  ├── Evidence:  E-99                                                │
│  └── FRIA:      E-94                                                │
│                                                                        │
│  CLI/TUI (5 фич)                                                        │
│  ├── Chat:      F-V9-TUI-01                                          │
│  ├── Wizard:    E-101                                               │
│  ├── Headless:  C-27                                                │
│  ├── Onboarding: C-28                                               │
│  └── Dashboard: E-102                                               │
│                                                                        │
│  SDK (10 фич)                                                           │
│  ├── Pre-hooks: S-29, S-30, S-31                                  │
│  ├── Post-hooks: S-32, S-33, S-34, S-35, S-36                    │
│  ├── Wrapper:   S-38                                                │
│  └── Domain:    S-37                                                │
│                                                                        │
│  MCP SERVER (2 фичи)                                                     │
│  ├── Guard:     F-V9-MCP-01                                          │
│  └── Workflow:  F-V9-MCP-02                                          │
│                                                                        │
│  GUARD API (3 фичи — R&D Phase)                                         │
│  ├── Injection: F-V9-28                                              │
│  ├── Fine-tune: F-V9-30                                              │
│  └── Deploy:    F-V9-31                                              │
│                                                                        │
│  SAAS DASHBOARD (2 фичи)                                                 │
│  ├── Vendor:    F-V9-20                                              │
│  └── ISO 42001: F-V9-27                                              │
│                                                                        │
│  ИТОГО: 34 фичи                                                │
└────────────────────────────────────────────────────────────────────────┘
```

### По приоритету

| Приоритет | Фичи | Кол-во |
|-----------|-----|--------|
| **Critical** | S-29, S-30, S-31 | 3 |
| **High** | S-32, S-33, S-38, S-37, E-94, E-101, F-V9-24, F-V9-25, F-V9-26, F-V9-27, F-V9-28, F-V9-30, F-V9-31, F-V9-TUI-01, F-V9-MCP-01 | 15 |
| **Medium** | S-34, S-35, S-36, E-95, E-96, E-97, E-98, E-99, E-102, F-V9-20, C-27, F-V9-22, C-28, F-V9-29, F-V9-MCP-02 | 15 |
| **Low** | E-100 | 1 |

---

## 12. Roadmap

### Фаза 1: SDK Hardening + Engine Quick Wins (S05, 2 недели) ✅ DONE

```
┌─── S05: SDK HARDENING ───────────────────────────────────────────────┐
│                                                                        │
│  SDK (6 фич):                          Engine (3 фичи):               │
│  * S-29  prohibited 50+              * E-95  inline guidance          │
│  * S-30  sanitize 50+ PII           * F-V9-22  finding explanations  │
│  * S-31  permission tool_calls      * E-102  cost estimator          │
│  * S-32  disclosure verify text                                       │
│  * S-33  bias 15 characteristics                                      │
│  * S-36  headers HTTP integration                                     │
│                                                                        │
│  Результат: SDK из «базового» → «production-ready»                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Фаза 1.5: UX Quality (V1-M06, 1 неделя) ✅ DONE

```
┌─── V1-M06: UX QUALITY ─────────────────────────────────────────────┐
│                                                                      │
│  Engine Output Polish (8 задач):                                     │
│  * T-1   Fix preview renders templates (not markers)          ✅     │
│  * T-2   Action plan top-5 with priority + projectedScore     ✅     │
│  * T-3   Obligations filtered by project role + risk_class    ✅     │
│  * T-4   L4 findings grouped by checkId (aggregation)         ✅     │
│  * T-5   Report builder populates documentContents            ✅     │
│  * T-6   Passport discovery: fix model detection regex        ✅     │
│  * T-7   Passport discovery: fix endpoint URL construction    ✅     │
│  * T-8   Fix preview includes projectedScore (what-if)        ✅     │
│                                                                      │
│  Результат: scan → fix → report дают actionable, prioritized output  │
│  Branch: feature/V1-M06-ux-quality                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Фаза 1.7: ISO 42001 Document Generators (V1-M07, 1 неделя) ✅ DONE

```
┌─── V1-M07: ISO 42001 DOCUMENT GENERATORS ──────────────────────────┐
│                                                                      │
│  2 generators + data layer (F-V9-24 AI Policy уже готов):            │
│  * T-1   ISO 42001 controls data (39 entries JSON)            ✅     │
│  * T-2   Types + template registry (Iso42001Control, SoA..)  ✅     │
│  * T-3   Templates (3 .md files: policy, SoA, risk-reg)      ✅     │
│  * T-4   SoA Generator (39 controls × evidence from scan)    ✅     │
│  * T-5   Risk Register (findings → ISO risk matrix)           ✅     │
│  * T-6   Service + HTTP routes (POST /agent/soa|risk-reg)     ✅     │
│  * T-7   Rust CLI commands (agent soa|risk-register)          ⏳     │
│                                                                      │
│  MERGED to dev 2026-04-13. PR #10.                                   │
│  23 tests GREEN + rebased onto dev (resolved 5 file conflicts).      │
│  T-7 (Rust CLI) deferred — will be covered by V1-M11.               │
└──────────────────────────────────────────────────────────────────────┘
```

### Фаза 1.8: Context-Aware Scan (V1-M08, 1 неделя) ✅ DONE

```
┌─── V1-M08: CONTEXT-AWARE SCAN ─────────────────────────────────────┐
│                                                                      │
│  Связка init → scan → fix → report (8 задач):                       │
│  * T-1   ScanFilterContext type + Zod schema                  ✅     │
│  * T-2   risk-level-filter.ts (mirror of role-filter)         ✅     │
│  * T-3   Integrate filter + context in scan-service           ✅     │
│  * T-4   Wire getProjectProfile in composition-root           ✅     │
│  * T-5   topActions in scan response                          ✅     │
│  * T-6   Rust CLI renders filterContext + topActions           ✅     │
│  * T-7   Report obligation coverage filters by risk_level     ✅     │
│  * T-8   Fix apply-all includes filterContext                 ✅     │
│                                                                      │
│  Проблема: complior scan → 100+ findings, 80% inapplicable.         │
│  Score 45/100 пугает, реальный ~75/100.                             │
│  Решение: profile (role + riskLevel) → фильтрация → topActions.     │
│  Branch: feature/V1-M08-context-scan                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Фаза 1.9: Onboarding Enrichment (V1-M09, 1 неделя) ✅ DONE

```
┌─── V1-M09: ONBOARDING ENRICHMENT ──────────────────────────────────┐
│                                                                      │
│  4 вопроса → 9 вопросов, dynamic obligation filtering (6 задач):    │
│  * T-1   5 new QuestionBlocks in questions.ts             ✅        │
│  * T-2   New computeApplicableObligations() dynamic       ✅        │
│  * T-3   ProfileSchema: new fields (gpai, biometric)      ✅        │
│  * T-4   complior init --reconfigure                      ✅        │
│  * T-5   Auto-detect GPAI from dependencies               ✅        │
│  * T-6   RED тесты (unit + E2E)                           ✅        │
│                                                                      │
│  Результат: 2460 tests GREEN, 6/6 tasks DONE.                      │
│  Branch: feature/V1-M09-onboarding-enrichment                       │
│  Reviewer: APPROVED 2026-04-13. PR → dev awaiting merge.            │
└──────────────────────────────────────────────────────────────────────┘
```

### Фаза 2.0: Score Transparency (V1-M10, 1 неделя) ✅ DONE

```
┌─── V1-M10: SCORE TRANSPARENCY ─────────────────────────────────────┐
│                                                                      │
│  Score 80/100 ≠ 80% compliant. Transparency sprint (5 задач):       │
│  * T-1   Score disclaimer (automated checks vs obligations)  ✅     │
│  * T-2   Per-category breakdown (transparency, data-gov..)   ✅     │
│  * T-3   topActions: profile-aware prioritization            ✅     │
│  * T-4   GET /status/posture + complior status CLI           ✅     │
│  * T-5   RED test specs (20 tests + acceptance script)       ✅     │
│                                                                      │
│  DONE: 2480 tests GREEN (2281 TS + 199 Rust). Reviewer APPROVED.    │
│  Branch: feature/V1-M10-score-transparency                           │
└──────────────────────────────────────────────────────────────────────┘
```

### Фаза 2.1: Command Restructuring (V1-M11, 1 неделя) 🔴 RED TESTS READY

```
┌─── V1-M11: COMMAND RESTRUCTURING ────────────────────────────────────┐
│                                                                      │
│  `complior agent` → split into passport + fix --doc (8 задач):       │
│  * T-1   RED E2E tests for /passport/* + /fix/doc/*          ✅     │
│  * T-2   Acceptance script verify_passport_cli.sh            ✅     │
│  * T-3   Rename /agent/* → /passport/* routes (nodejs-dev)    ⏳     │
│  * T-4   Create /fix/doc/* routes (nodejs-dev)                ⏳     │
│  * T-5   Rename Agent → Passport in Rust CLI (rust-dev)       ⏳     │
│  * T-6   Add fix --doc flag in Rust CLI (rust-dev)            ⏳     │
│  * T-7   Update Rust types if needed (architect)              ⏳     │
│  * T-8   Update all documentation (architect)                 ⏳     │
│                                                                      │
│  Tests: 14 RED E2E + 10 acceptance checks                           │
│  Depends on: V1-M07 ✅ + V1-M09 ✅ — both merged to dev.             │
│  Branch: feature/V1-M11-command-restructuring                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Фаза 2: FRIA + Templates (S06, 2 недели)

```
┌─── S06: FRIA + TEMPLATES ────────────────────────────────────────────┐
│                                                                        │
│  Engine Documents (4 фичи):             CLI/TUI (2 фичи):             │
│  * E-94  FRIA LLM-дозаполнение        * E-101  Wizard mode           │
│  * E-95  Template guidance            * F-V9-TUI-01  Chat Assistant  │
│  * E-102  Cost Estimator                                              │
│  * E-103  Why-this-matters            SaaS (1 фича):                  │
│                                         * F-V9-27  ISO 42001 Readiness│
│  Engine ISO 42001 (3 фичи):                                           │
│  * F-V9-24  AI Policy Generator                                       │
│  * F-V9-25  SoA Generator                                            │
│  * F-V9-26  Risk Register                                             │
│                                                                        │
│  Результат: документы из «шаблонов» → «готовых к аудиту»              │
└────────────────────────────────────────────────────────────────────────┘
```

### Фаза 3: Performance + Streaming (S07, 2 недели)

```
┌─── S07: PERFORMANCE + STREAMING ─────────────────────────────────────┐
│                                                                        │
│  Engine Scanner (2 фичи):              SDK (3 фичи):                   │
│  * E-96   Incremental scan            * S-35  Budget actual prices    │
│  * E-100  L2 semantic                 * S-37  Domain enforcement      │
│                                         * S-38  Streaming support     │
│  Engine (2 фичи):                                                      │
│  * F-V9-29  ISO 27090 rules                                           │
│  * F-V9-14  Incremental scan                                          │
│                                                                        │
│  Результат: сканер быстрее, SDK полностью streaming-capable           │
└────────────────────────────────────────────────────────────────────────┘
```

### Фаза 4: Polish + Integration (S08, 2 недели)

```
┌─── S08: POLISH + INTEGRATION ────────────────────────────────────────┐
│                                                                        │
│  Engine (3 фичи):                      CLI/TUI (2 фичи):              │
│  * E-97   Fix validation              * C-27   Compliance Diff PR    │
│  * E-98   Passport env vars           * C-28   Onboarding TUI       │
│  * E-99   Per-finding evidence                                        │
│                                         Engine (1 фича):              │
│  SDK (1 фича):                          * E-104  Onboarding engine   │
│  * S-34   Content marking                                             │
│                                                                        │
│  MCP (2 фичи):                          SaaS (1 фича):                │
│  * F-V9-MCP-01  Guard Tools           * F-V9-20  Vendor Templates    │
│  * F-V9-MCP-02  Builder workflow                                      │
│                                                                        │
│  Результат: MCP + Guard = платформа для AI-агентов                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Guard API — R&D Phase (параллельный трек)

> Guard API НЕ входит в спринтовый цикл S05-S08. Это отдельный R&D-проект, ведущийся параллельно ML-инженером. Оценка: 2-3 месяца.

```
┌─── GUARD API R&D (параллельный трек, ML-инженер) ────────────────────┐
│                                                                        │
│  Phase 1 (4 нед.): Data Collection — 40K+ examples для 5 задач        │
│  Phase 2 (3 нед.): Fine-tune — LoRA training, evaluation pipeline     │
│  Phase 3 (2 нед.): Deploy — Hetzner GPU, API gateway, monitoring      │
│  Phase 4 (2 нед.): Integration — SDK + MCP + SaaS подключение         │
│                                                                        │
│  Guard API (3 фичи):                                                   │
│  * F-V9-30  Fine-tune Guard Model                                      │
│  * F-V9-31  Deploy Guard API                                           │
│  * F-V9-28  Prompt Injection Detection                                 │
│                                                                        │
│  Результат: regex → семантика. Покрытие 60% → 95%+                    │
│  Зависимости: M-09 MCP Guard, S-28 SDK Guard — после Guard deploy     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Бизнес-модель

### 13.1. Доступ к LLM

Complior использует LLM для: L5 deep analysis, дозаполнение FRIA и документов, Chat Assistant, Guard API. Три варианта доступа:

```
┌────────────────── LLM ACCESS MODEL ───────────────────────────────────┐
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  1. BYOK — Bring Your Own Key (бесплатно)                     │   │
│  │                                                                │   │
│  │  Пользователь подключает свой API-ключ:                       │   │
│  │  • OpenAI (GPT-4o, GPT-4o-mini)                               │   │
│  │  • Anthropic (Claude Sonnet, Haiku)                            │   │
│  │  • OpenRouter (200+ моделей)                                   │   │
│  │  • Локальные модели (Ollama, vLLM, LM Studio)                 │   │
│  │                                                                │   │
│  │  Стоимость LLM = стоимость провайдера. Complior = €0.         │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  2. COMPLIOR HOSTED LLM (freemium)                             │   │
│  │                                                                │   │
│  │  Mistral на Hetzner GPU (Германия, EU data residency)          │   │
│  │  • Starter: 50 LLM-запросов/мес (достаточно для знакомства)   │   │
│  │  • Growth: 500 LLM-запросов/мес включено                      │   │
│  │  • Enterprise: 2000 LLM-запросов/мес включено                 │   │
│  │  • Overage: €0.05/запрос                                       │   │
│  │                                                                │   │
│  │  Плюшки hosted: EU data residency, без своего API-ключа,       │   │
│  │  оптимизированные промпты, consistency гарантии.               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  3. GUARD API (специализированная модель, отдельно)            │   │
│  │                                                                │   │
│  │  Complior Guard = fine-tuned модель для compliance/security.   │   │
│  │  НЕ general LLM. 5 задач классификации, 50ms latency.        │   │
│  │                                                                │   │
│  │  • Starter: 1000 Guard calls/мес                               │   │
│  │  • Growth: 50K calls/мес включено                              │   │
│  │  • Enterprise: 500K calls/мес включено                         │   │
│  │  • Overage: $0.0001/call                                       │   │
│  │  • Self-hosted: Docker image (Enterprise)                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 13.2. Guard API: реалистичные объёмы

```
┌────────────────── GUARD API CALL VOLUMES ─────────────────────────────┐
│                                                                        │
│  1 агент в production:                                                 │
│  • 500-2000 LLM API calls/день                                        │
│  • Каждый call → 1-3 Guard checks (prohibited + PII + bias)           │
│  • = 1.5K-6K Guard calls/день = 45K-180K/мес на агента               │
│                                                                        │
│  Сценарии:                                                             │
│  ┌──────────────┬───────────┬────────────────┬──────────────────────┐  │
│  │ Размер       │ Агентов   │ Guard calls/мес │ Overage revenue     │  │
│  ├──────────────┼───────────┼────────────────┼──────────────────────┤  │
│  │ Стартап      │ 1-3       │ 45K-540K       │ €0 (в рамках тарифа)│  │
│  │ Средний      │ 5-15      │ 225K-2.7M      │ €17-220/мес         │  │
│  │ Enterprise   │ 25-100    │ 1.1M-18M       │ €60-1,700/мес       │  │
│  └──────────────┴───────────┴────────────────┴──────────────────────┘  │
│                                                                        │
│  Конкуренты (для сравнения):                                          │
│  • Lakera Guard: ~€500/мес enterprise baseline                        │
│  • Arthur AI: custom pricing, $10K-50K/год enterprise                 │
│  • Protect AI: per-request, custom quote                              │
│                                                                        │
│  Вывод: Guard API — не основной revenue stream,                       │
│  а дифференциатор и lock-in для SaaS тарифов.                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 13.3. SaaS тарифы

```
┌────────────────── REVENUE STREAMS ────────────────────────────────────┐
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  OPEN-SOURCE (бесплатно, воронка)                              │   │
│  │                                                                │   │
│  │  CLI + TUI + Engine + Scanner + Fixer + Passport + Evidence    │   │
│  │  SDK (@complior/sdk) — все хуки, все провайдеры               │   │
│  │  MCP Server — 8 Code Tools                                     │   │
│  │  BYOK LLM — бесплатно с любым провайдером                    │   │
│  │  Guard API — 1000 calls/мес                                    │   │
│  │  Hosted LLM — 50 запросов/мес                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│         │                                                              │
│         ▼                                                              │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  SAAS SUBSCRIPTIONS (€0 / €149 / €499)                        │   │
│  │                                                                │   │
│  │  Starter (€0) → Growth (€149/мес) → Enterprise (€499/мес)    │   │
│  │                                                                │   │
│  │  Starter: до 3 KI-систем, базовый обзор, 1 отчёт/мес         │   │
│  │                                                                │   │
│  │  Growth: unlimited систем, полный аудит (FRIA, Risk Mgt,      │   │
│  │    QMS, Monitoring, Conformity Assessment), 10 юзеров          │   │
│  │                                                                │   │
│  │  Enterprise: все Growth + SSO, Multi-Workspace, API-доступ,   │   │
│  │    unlimited юзеров                                            │   │
│  │                                                                │   │
│  │  CLI-Scanner — бесплатно, независимо от тарифа, навсегда      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│         │                                                              │
│         ▼                                                              │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  HIGH-MARGIN SERVICES                                          │   │
│  │                                                                │   │
│  │  Audit Package: €2-5K one-time (генерация + экспертиза)       │   │
│  │  Certification referral: 10-15% от AIUC-1 fee                 │   │
│  │  Guard API overage: $0.0001/call при масштабе                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ВОРОНКА:                                                              │
│                                                                        │
│  CLI (free) → score → SaaS Starter → gaps →                          │
│    Growth (FRIA, Audit, ISO) → Enterprise (SSO, API, fleet)          │
│                                                                        │
│  SDK (free, BYOK) → MCP подключает строителей →                     │
│    агенты в production → Guard calls → SaaS для fleet management     │
└────────────────────────────────────────────────────────────────────────┘
```

| Продукт | Модель | Цена |
|---------|--------|------|
| CLI-Scanner | Open-source, бесплатно навсегда | €0 |
| CLI + TUI + Engine | Open-source | €0 |
| SDK | Open-source | €0 |
| MCP Server | Open-source | €0 |
| LLM (BYOK) | Бесплатно, свой API-ключ | €0 |
| LLM (Hosted) | Freemium: 50/мес free | €0.05/запрос |
| Guard API | Freemium: 1000/мес free | $0.0001/call |
| SaaS Starter | До 3 KI-систем, базовый обзор комплаенса, 1 отчёт/мес | €0 |
| SaaS Growth | Unlimited систем, полный аудит (FRIA, Risk Mgt, QMS, Monitoring, Conformity Assessment), уведомления властям, до 10 юзеров | €149/мес |
| SaaS Enterprise | Все Growth + SSO, Multi-Workspace, API-доступ, unlimited юзеров | €499/мес |
