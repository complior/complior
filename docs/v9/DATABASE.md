# DATABASE.md -- Справочник по схемам хранения данных Complior

> Версия: v9 | Дата: 2026-03-06
> Покрывает ВСЕ хранилища данных платформы Complior: локальная файловая система (open-source) + PostgreSQL 16 (SaaS).

---

## Содержание

1. [Обзор хранилищ данных](#1-обзор-хранилищ-данных)
2. [Локальное хранилище (файловая система)](#2-локальное-хранилище-файловая-система)
3. [SaaS БД: ER-диаграмма](#3-saas-бд-er-диаграмма)
4. [SaaS БД: таблицы по контекстам](#4-saas-бд-таблицы-по-контекстам)
5. [Синхронизация данных (CLI <-> SaaS)](#5-синхронизация-данных-cli--saas)
6. [Миграции и MetaSQL](#6-миграции-и-metasql)
7. [Безопасность данных](#7-безопасность-данных)
8. [Бэкапы и disaster recovery](#8-бэкапы-и-disaster-recovery)

---

## 1. Обзор хранилищ данных

Complior использует две независимые системы хранения: локальную файловую систему
(open-source CLI/daemon) и облачную PostgreSQL базу (SaaS-платформа).

```
+========================================================================+
|                    COMPLIOR -- ОБЗОР ХРАНИЛИЩ                          |
+========================================================================+
|                                                                        |
|  +------------------------------+    +-------------------------------+ |
|  |   ЛОКАЛЬНОЕ ХРАНИЛИЩЕ        |    |   ОБЛАЧНОЕ ХРАНИЛИЩЕ (SaaS)   | |
|  |   (файловая система)         |    |   PostgreSQL 16 @ Hetzner     | |
|  |                              |    |                               | |
|  |  {project}/.complior/        |    |   10 Bounded Contexts         | |
|  |    daemon.pid                |    |   39 таблиц                   | |
|  |    passports/*.json          |    |                               | |
|  |    evidence/chain.json     --|--sync-->  ScanResult              | |
|  |    fria/*.md                 |    |      SyncHistory              | |
|  |    cache/                    |    |      AITool.passport_data     | |
|  |                              |    |      AITool.scan_data         | |
|  |  ~/.config/complior/         |    |      FRIAAssessment           | |
|  |    tui.toml                  |    |                               | |
|  |    credentials               |    |   IAM (WorkOS SSO)            | |
|  |    keys/                     |    |   Billing (Stripe)            | |
|  |    mcp.json                  |    |   Registry API (5,000+ tools) | |
|  |                              |    |   AI Literacy (LMS)           | |
|  |  ~/.local/share/complior/    |    |   Audit (пакеты + PDF)        | |
|  |    sessions/*.json           |    |                               | |
|  |                              |    |                               | |
|  |  engine/core/data/           |    |                               | |
|  |    regulations/ (JSON)       |    |                               | |
|  |    templates/ (MD)           |    |                               | |
|  |    schemas/ (JSON Schema)    |    |                               | |
|  +------------------------------+    +-------------------------------+ |
|                                                                        |
|        CLI/TUI <--- HTTP/SSE ---> TS Engine (daemon)                   |
|                                                                        |
+========================================================================+
```

**Принцип разделения**: локальное хранилище работает полностью офлайн, без зависимости
от SaaS. Синхронизация с SaaS -- опциональная, запускается через `complior sync`.

---

## 2. Локальное хранилище (файловая система)

### 2.1 Директория проекта: `{project}/.complior/`

Создается при первом запуске `complior` в корне проекта.

```
{project}/
  .complior/
    daemon.pid                  # PID-файл работающего daemon
    passports/
      {agent-name}.json         # Agent Passport (36 полей, ed25519)
    evidence/
      chain.json                # Append-only hash-цепочка
    fria/
      {name}-fria-{timestamp}.md  # FRIA-отчеты
    cache/
      scan-cache.json           # Кэш результатов сканирования
```

#### 2.1.1 `daemon.pid` -- PID-файл демона

Создается TypeScript-движком при запуске (через `COMPLIOR_PID_FILE` env). Rust CLI
только читает и удаляет stale PID-файлы.

```json
{
  "pid": 12345,
  "port": 3099,
  "started_at": "2026-03-01T10:00:00Z"
}
```

| Поле         | Тип    | Описание                              |
|--------------|--------|---------------------------------------|
| `pid`        | u32    | PID процесса TS-движка                |
| `port`       | u16    | HTTP-порт движка (по умолчанию 3099)  |
| `started_at` | string | ISO 8601 timestamp запуска            |

**Жизненный цикл**: создается TS engine -> читается Rust CLI -> удаляется при stop/stale.

#### 2.1.2 `passports/{agent-name}.json` -- Agent Passport

Центральная сущность Complior. Удостоверение AI-системы. 36 полей, подписанное ed25519.

```json
{
  "$schema": "https://complior.dev/schemas/agent-passport-v1.json",
  "manifest_version": "1.0.0",
  "agent_id": "uuid-v4",
  "name": "my-agent",
  "display_name": "My AI Agent",
  "description": "...",
  "version": "1.0.0",
  "created": "2026-03-01T10:00:00Z",
  "updated": "2026-03-01T10:00:00Z",
  "owner": { "team": "...", "contact": "...", "responsible_person": "..." },
  "type": "autonomous | assistive | hybrid",
  "autonomy_level": "L1 | L2 | L3 | L4 | L5",
  "autonomy_evidence": { ... },
  "framework": "langchain",
  "model": { "provider": "...", "model_id": "...", "deployment": "...", "data_residency": "..." },
  "permissions": { "tools": [...], "data_access": { "read": [...], "write": [...], "delete": [...] }, "denied": [...] },
  "constraints": { "rate_limits": { ... }, "budget": { ... }, "human_approval_required": [...], "prohibited_actions": [...] },
  "compliance": { "eu_ai_act": { ... }, "complior_score": 0, "last_scan": "...", "fria_completed": false },
  "disclosure": { "user_facing": true, "disclosure_text": "...", "ai_marking": { ... } },
  "logging": { "actions_logged": true, "retention_days": 90, "includes_decision_rationale": true },
  "lifecycle": { "status": "draft | review | active | suspended | retired", ... },
  "interop": { "mcp_servers": [...] },
  "source": { "mode": "auto | semi-auto | manual", ... },
  "signature": { "algorithm": "ed25519", "public_key": "...", "signed_at": "...", "hash": "sha256:...", "value": "..." }
}
```

**Полная схема полей Agent Passport (36 полей):**

| #  | Поле                 | Тип           | Описание                                       |
|----|----------------------|---------------|-------------------------------------------------|
| 1  | `$schema`            | string        | URI JSON-схемы                                  |
| 2  | `manifest_version`   | string        | Версия формата (semver)                         |
| 3  | `agent_id`           | string (UUID) | Уникальный идентификатор агента                 |
| 4  | `name`               | string        | Техническое имя (slug)                          |
| 5  | `display_name`       | string        | Человекочитаемое имя                            |
| 6  | `description`        | string        | Описание назначения агента                      |
| 7  | `version`            | string        | Версия агента (semver)                          |
| 8  | `created`            | string (ISO)  | Дата создания паспорта                          |
| 9  | `updated`            | string (ISO)  | Дата последнего обновления                      |
| 10 | `owner.team`         | string        | Ответственная команда                           |
| 11 | `owner.contact`      | string        | Контактный email                                |
| 12 | `owner.responsible_person` | string | Ответственное лицо (ст. 26 AI Act)             |
| 13 | `type`               | enum          | `autonomous` / `assistive` / `hybrid`           |
| 14 | `autonomy_level`     | enum          | `L1`..`L5` (уровень автономности)               |
| 15 | `autonomy_evidence`  | object        | Доказательства автономности (gates, actions)    |
| 16 | `framework`          | string        | AI-фреймворк (langchain, crewai и т.д.)         |
| 17 | `model`              | object        | Провайдер, модель, деплоймент, резидентность    |
| 18 | `permissions.tools`  | string[]      | Разрешённые инструменты                         |
| 19 | `permissions.data_access` | object   | Уровни доступа (read/write/delete)              |
| 20 | `permissions.denied` | string[]      | Запрещённые инструменты                         |
| 21 | `constraints.rate_limits` | object   | `max_actions_per_minute`                        |
| 22 | `constraints.budget` | object        | `max_cost_per_session_usd`                      |
| 23 | `constraints.human_approval_required` | string[] | Действия, требующие одобрения    |
| 24 | `constraints.prohibited_actions` | string[] | Запрещённые действия                |
| 25 | `compliance.eu_ai_act` | object      | Класс риска, статьи, обязательства              |
| 26 | `compliance.complior_score` | number  | Текущий compliance score (0-100)                |
| 27 | `compliance.last_scan` | string (ISO) | Дата последнего сканирования                   |
| 28 | `compliance.fria_completed` | boolean | FRIA отчёт завершён                            |
| 29 | `compliance.fria_date` | string (ISO) | Дата FRIA                                       |
| 30 | `disclosure`         | object        | Маркировка AI-контента, текст раскрытия         |
| 31 | `logging`            | object        | Логирование действий, ротация, rationale        |
| 32 | `lifecycle`          | object        | Статус, дата деплоя, ревью                      |
| 33 | `interop`            | object        | Список MCP-серверов и разрешённых инструментов  |
| 34 | `source`             | object        | Режим создания (auto/semi/manual), confidence   |
| 35 | `signature`          | object        | ed25519 подпись (algorithm, key, hash, value)   |
| 36 | `source.confidence`  | number (0-1)  | Уверенность автоматического заполнения          |

**3 режима создания**:
- `auto` -- полностью автоматическое обнаружение (agent-discovery, autonomy-analyzer, permission-scanner, manifest-builder)
- `semi-auto` -- автоматическое заполнение + ручная доработка
- `manual` -- полностью ручное заполнение

**Подпись**: каноническая сериализация полей `{agent_id, compliance, constraints, permissions, timestamp}` с сортировкой ключей -> SHA-256 хэш -> ed25519 подпись.

#### 2.1.3 `evidence/chain.json` -- Цепочка доказательств

Append-only хэш-цепочка для иммутабельного аудита. Каждая запись ссылается на предыдущую
через `chainPrev` (аналогия с blockchain, но без консенсуса).

```json
{
  "version": "1.0.0",
  "projectPath": "/home/user/my-project",
  "entries": [
    {
      "evidence": {
        "findingId": "l4-bare-api-call",
        "layer": "L4",
        "timestamp": "2026-03-01T10:00:00Z",
        "source": "pattern-match",
        "snippet": "new OpenAI()",
        "file": "src/agent.ts",
        "line": 42
      },
      "scanId": "scan-uuid-1",
      "chainPrev": null,
      "hash": "a1b2c3...",
      "signature": "base64..."
    },
    {
      "evidence": { ... },
      "scanId": "scan-uuid-2",
      "chainPrev": "a1b2c3...",
      "hash": "d4e5f6...",
      "signature": "base64..."
    }
  ],
  "lastHash": "d4e5f6..."
}
```

**Структура EvidenceChain:**

| Поле          | Тип             | Описание                           |
|---------------|-----------------|-------------------------------------|
| `version`     | string          | Версия формата (`1.0.0`)           |
| `projectPath` | string          | Абсолютный путь к проекту          |
| `entries`     | EvidenceEntry[] | Массив записей цепочки             |
| `lastHash`    | string          | SHA-256 хэш последней записи       |

**Структура EvidenceEntry:**

| Поле        | Тип              | Описание                                |
|-------------|------------------|-----------------------------------------|
| `evidence`  | Evidence         | Объект доказательства                   |
| `scanId`    | string (UUID)    | ID сканирования, создавшего запись      |
| `chainPrev` | string \| null   | Хэш предыдущей записи (null для первой) |
| `hash`      | string           | SHA-256 хэш `{evidence, scanId, chainPrev}` |
| `signature` | string (base64)  | ed25519 подпись хэша                    |

**Структура Evidence:**

| Поле        | Тип            | Описание                              |
|-------------|----------------|---------------------------------------|
| `findingId` | string         | ID находки (`l4-bare-api-call` и т.д.) |
| `layer`     | string         | Слой сканера (`L1`..`L5`)             |
| `timestamp` | string (ISO)   | Время обнаружения                     |
| `source`    | EvidenceSource | Источник (enum, 10 значений)          |
| `snippet`   | string?        | Фрагмент кода/документа              |
| `file`      | string?        | Путь к файлу                          |
| `line`      | number?        | Номер строки                          |

**Значения EvidenceSource**: `file-presence`, `heading-match`, `content-analysis`,
`dependency`, `pattern-match`, `llm-analysis`, `cross-layer`, `fix`, `passport`, `fria`.

**Лимиты**: максимум 1000 записей (ротация старых), максимальный размер файла 50 МБ (сброс).

**Верификация**: `verify()` обходит цепочку, перевычисляя хэши и проверяя ed25519-подписи.
Если хэш или подпись не совпадает -- цепочка считается нарушенной (`brokenAt: index`).

#### 2.1.4 `fria/*.md` -- FRIA-отчёты

FRIA (Fundamental Rights Impact Assessment) генерируется на основе Agent Passport
и шаблона `engine/core/data/templates/eu-ai-act/fria.md`.

Формат имени файла: `{agent-name}-fria-{timestamp}.md`

Содержание -- markdown-документ с заполненными секциями:
- Информация о системе (из passport: name, description, type, model)
- Анализ рисков (из passport: risk_class, autonomy_level)
- Воздействие на основные права (вручную: `--impact`, `--mitigation`, `--approval`)
- Меры по смягчению рисков
- План мониторинга

### 2.2 Директория пользователя: `~/.config/complior/`

Пользовательские настройки, ключи и учётные данные. Общие для всех проектов.

```
~/.config/complior/
  tui.toml                    # Конфигурация CLI/TUI
  credentials                 # API-ключи и JWT-токены (chmod 0600)
  keys/
    complior-ed25519.key      # Приватный ключ (chmod 0600)
    complior-ed25519.pub      # Публичный ключ
  mcp.json                    # Конфигурация MCP-серверов
```

#### 2.2.1 `tui.toml` -- Конфигурация

```toml
engine_port = 3099
engine_host = "127.0.0.1"
tick_rate_ms = 250
theme = "dark"
sidebar_visible = true
watch_on_start = false
onboarding_completed = true
animations_enabled = true
scroll_acceleration = 1.5

# Onboarding-derived
navigation = "standard"
project_type = "existing"
jurisdiction = "eu"
role = "deployer"
industry = "general"
scan_scope = ["deps", "env", "source"]

# SaaS API
project_api_url = "https://api.complior.dev"
offline_mode = false

[confirmations]
batch_fix = true
undo_multiple = true
overwrite_docs = false
```

| Поле                  | Тип      | По умолчанию      | Описание                                    |
|-----------------------|----------|--------------------|----------------------------------------------|
| `engine_port`         | u16      | 3099               | HTTP-порт TS-движка                          |
| `engine_host`         | string   | "127.0.0.1"        | Хост TS-движка                               |
| `tick_rate_ms`        | u64      | 250                | Частота обновления TUI (мс)                  |
| `project_path`        | string?  | null               | Путь к проекту (опционально)                 |
| `theme`               | string   | "dark"             | Тема оформления                              |
| `sidebar_visible`     | bool     | true               | Показывать сайдбар                           |
| `watch_on_start`      | bool     | false              | Авто-watch при запуске                       |
| `onboarding_completed`| bool     | false              | Онбординг пройден                            |
| `animations_enabled`  | bool     | true               | Включить анимации                            |
| `scroll_acceleration` | f32      | 1.5                | Ускорение скролла                            |
| `navigation`          | string   | "standard"         | Стиль навигации                              |
| `project_type`        | string   | "existing"         | Тип проекта                                  |
| `jurisdiction`        | string   | "eu"               | Юрисдикция                                   |
| `role`                | string   | "deployer"         | Роль пользователя                            |
| `industry`            | string   | "general"          | Индустрия                                    |
| `scan_scope`          | string[] | ["deps","env","source"] | Области сканирования                    |
| `onboarding_last_step`| usize?   | null               | Последний пройденный шаг онбординга          |
| `project_api_url`     | string   | ""                 | URL API SaaS-платформы                       |
| `offline_mode`        | bool     | false              | Полный офлайн-режим                          |
| `confirmations.batch_fix` | bool | true               | Подтверждение batch-фиксов (>3 файлов)       |
| `confirmations.undo_multiple` | bool | true           | Подтверждение множественного undo             |
| `confirmations.overwrite_docs` | bool | false          | Подтверждение перезаписи документов           |

**Переопределение через env**: `PROJECT_API_URL`, `OFFLINE_MODE=1`.

#### 2.2.2 `credentials` -- Учётные данные

Текстовый файл формата `KEY=value` (не TOML, не JSON). Права: `0600` (только владелец).

```
# Complior credentials
COMPLIOR_API_KEY=sk-abc123...

# SaaS auth tokens (set by `complior login`)
COMPLIOR_ACCESS_TOKEN=eyJhbG...
COMPLIOR_REFRESH_TOKEN=dGhpcy...
COMPLIOR_TOKEN_EXPIRES_AT=1741089600
COMPLIOR_USER_EMAIL=user@company.com
COMPLIOR_ORG_NAME=My Organization
```

| Ключ                         | Описание                           | Источник              |
|------------------------------|------------------------------------|-----------------------|
| `COMPLIOR_API_KEY`           | API-ключ для Registry API          | Ручная установка      |
| `COMPLIOR_ACCESS_TOKEN`      | JWT access token (SaaS)            | `complior login`      |
| `COMPLIOR_REFRESH_TOKEN`     | JWT refresh token (SaaS)           | `complior login`      |
| `COMPLIOR_TOKEN_EXPIRES_AT`  | Unix timestamp истечения            | `complior login`      |
| `COMPLIOR_USER_EMAIL`        | Email пользователя                 | `complior login`      |
| `COMPLIOR_ORG_NAME`          | Имя организации                    | `complior login`      |

#### 2.2.3 `keys/` -- Криптографические ключи

ed25519 пара ключей в PEM-формате. Генерируется автоматически при первом использовании
(`loadOrCreateKeyPair()`).

| Файл                     | Формат     | Права  | Описание                    |
|--------------------------|------------|--------|-----------------------------|
| `complior-ed25519.key`   | PKCS#8 PEM | 0600   | Приватный ключ              |
| `complior-ed25519.pub`   | SPKI PEM   | 0644   | Публичный ключ              |

**Использование**: подпись Agent Passport, подпись записей EvidenceChain.

#### 2.2.4 `mcp.json` -- Конфигурация MCP

Конфигурация MCP-серверов для подключения агентов.

```json
{
  "servers": [
    {
      "name": "complior",
      "command": "complior",
      "args": ["mcp"],
      "env": {}
    }
  ]
}
```

### 2.3 Директория данных: `~/.local/share/complior/sessions/`

Данные сессий TUI. Сохраняются при закрытии, восстанавливаются при запуске.

#### 2.3.1 `{name}.json` -- Данные сессии

```json
{
  "messages": [
    {
      "role": "system | user | assistant",
      "content": "текст сообщения",
      "timestamp": "2026-03-01T10:00:00Z"
    }
  ],
  "score_history": [42.0, 65.0, 78.5],
  "open_file_path": "src/main.rs",
  "terminal_output": ["$ complior scan", "Score: 78/100"],
  "last_scan": { ... }
}
```

**Структура SessionData:**

| Поле              | Тип            | Описание                              |
|-------------------|----------------|---------------------------------------|
| `messages`        | ChatMessage[]  | История чата (role + content)         |
| `score_history`   | f64[]          | История compliance-score              |
| `open_file_path`  | string?        | Последний открытый файл               |
| `terminal_output` | string[]       | Буфер вывода терминала                |
| `last_scan`       | ScanResult?    | Последний результат сканирования      |

**Маркер первого запуска**: `.first_run_done` -- пустой файл, создаётся после первого запуска.

### 2.4 Engine data: `engine/core/data/`

Статические данные регуляторики, загружаемые в compile time (import с `{ type: 'json' }`).

```
engine/core/data/
  regulations/eu-ai-act/
    obligations.json            # 108 обязательств EU AI Act
    technical-requirements.json # Технические требования
    scoring.json                # Правила скоринга (веса, пороги)
    regulation-meta.json        # Мета-информация регуляции
    applicability-tree.json     # Дерево применимости по ролям/рискам
    cross-mapping.json          # Маппинг обязательств <-> сканер
    localization.json           # Локализация (EN)
    timeline.json               # Дедлайны вступления в силу
  templates/eu-ai-act/
    fria.md                     # Шаблон FRIA
    ai-literacy.md              # Шаблон AI Literacy Policy
    art5-screening.md           # Шаблон Art. 5 Screening
    worker-notification.md      # Шаблон уведомления работников
    technical-documentation.md  # Шаблон технической документации
    incident-report.md          # Шаблон инцидент-репорта
    declaration-of-conformity.md # Шаблон декларации соответствия
    monitoring-policy.md        # Шаблон политики мониторинга
  schemas/
    http-contract.json          # JSON Schema HTTP API
    http-contract-sample.json   # Фикстура для contract-тестов
```

**Структура Obligation (из obligations.json):**

| Поле                        | Тип       | Описание                                    |
|-----------------------------|-----------|---------------------------------------------|
| `obligation_id`             | string    | ID (`eu-ai-act-OBL-001`)                    |
| `article_reference`         | string    | Статья AI Act (`Article 4`)                 |
| `title`                     | string    | Название обязательства                      |
| `description`               | string    | Полное описание                             |
| `applies_to_role`           | string    | `provider` / `deployer` / `both`            |
| `applies_to_risk_level`     | string[]  | Уровни риска                                |
| `obligation_type`           | string    | Тип (training, documentation, technical...) |
| `what_to_do`                | string[]  | Конкретные шаги                             |
| `evidence_required`         | string    | Требуемые доказательства                    |
| `deadline`                  | string    | Дедлайн вступления в силу                   |
| `frequency`                 | string    | Частота проверки                             |
| `penalty_for_non_compliance`| string    | Штраф за несоблюдение                       |
| `severity`                  | string    | `critical` / `high` / `medium` / `low`      |
| `automatable`               | string    | `full` / `partial` / `manual`               |
| `automation_approach`       | string    | Описание подхода автоматизации              |
| `document_template_needed`  | boolean   | Нужен ли шаблон документа                   |
| `sdk_feature_needed`        | boolean   | Нужна ли SDK-фича                           |
| `cli_check_possible`        | boolean   | Возможна ли CLI-проверка                    |

### 2.5 Результат сканирования: ScanResult

Ключевая структура, возвращаемая TS-движком и сохраняемая в сессии/синхронизируемая в SaaS.

**Структура ScanResult:**

| Поле                | Тип             | Описание                              |
|---------------------|-----------------|---------------------------------------|
| `score`             | ScoreBreakdown  | Разбивка по категориям                |
| `findings`          | Finding[]       | Массив находок                        |
| `project_path`      | string          | Путь к проекту                        |
| `scanned_at`        | string (ISO)    | Время сканирования                    |
| `duration`          | u64             | Длительность (мс)                     |
| `files_scanned`     | u32             | Количество просканированных файлов    |
| `deep_analysis`     | boolean?        | Использовался ли L5 (LLM)            |
| `l5_cost`           | f64?            | Стоимость LLM-анализа (USD)           |
| `regulation_version`| object?         | Версия правил регуляции               |

**Структура Finding:**

| Поле               | Тип              | Описание                              |
|--------------------|------------------|---------------------------------------|
| `check_id`         | string           | ID проверки (`l4-bare-api-call`)      |
| `type`             | enum             | `pass` / `fail` / `skip`             |
| `message`          | string           | Описание находки                      |
| `severity`         | enum             | `critical`/`high`/`medium`/`low`/`info` |
| `obligation_id`    | string?          | Связанное обязательство               |
| `article_reference`| string?          | Статья AI Act                         |
| `fix`              | string?          | Рекомендация по исправлению           |
| `file`             | string?          | Путь к файлу                          |
| `line`             | u32?             | Номер строки                          |
| `code_context`     | CodeContext?     | Контекст кода (строки вокруг)         |
| `fix_diff`         | FixDiff?         | Предложенный diff для автоисправления |
| `priority`         | i32?             | Приоритет исправления                 |
| `confidence`       | f64?             | Уверенность сканера (0-1)             |
| `confidence_level` | string?          | Текстовый уровень уверенности         |
| `evidence`         | object[]?        | Массив доказательств                  |

**Классификация Finding по типу (A/B/C):**

| Тип | Префикс check_id       | Значение                    |
|-----|-------------------------|-----------------------------|
| A   | `l4-`, `l5-`, `cross-`  | Code Fix (код)              |
| B   | `l1-`, `l2-`, `missing` | Missing File (документы)    |
| C   | `l3-`                   | Config Change (конфигурация)|

**Структура ScoreBreakdown:**

| Поле                  | Тип             | Описание                              |
|-----------------------|-----------------|---------------------------------------|
| `total_score`         | f64             | Общий score (0-100)                   |
| `zone`                | enum            | `green` / `yellow` / `red`            |
| `category_scores`     | CategoryScore[] | Score по категориям                   |
| `critical_cap_applied`| bool            | Применён ли cap за критические нарушения |
| `total_checks`        | u32             | Всего проверок                        |
| `passed_checks`       | u32             | Пройденных                            |
| `failed_checks`       | u32             | Проваленных                           |
| `skipped_checks`      | u32             | Пропущенных                           |
| `confidence_summary`  | object?         | Сводка по уверенности                 |

---

## 3. SaaS БД: ER-диаграмма

PostgreSQL 16 на Hetzner (EU). 39 таблиц в 10 Bounded Contexts.

```
+==========================================================================+
|                    COMPLIOR SaaS -- ER-диаграмма                         |
+==========================================================================+

  +----------------+       +---------------------+       +-----------------+
  |     User       |1----*>| OrganizationMember  |<*----1| Organization    |
  |----------------|       |---------------------|       |-----------------|
  | id (PK)        |       | user_id (FK)        |       | id (PK)         |
  | workos_id (UQ) |       | organization_id (FK)|       | workos_org_id   |
  | email          |       | role                |       | name            |
  | name           |       +---------------------+       | plan            |
  | avatar_url     |                                     | stripe_customer |
  | created_at     |       +---------------------+       | created_at      |
  +------+---------+       |    Invitation        |       +-------+---------+
         |                 |---------------------|               |
         |            +---<| email               |               |
         |            |    | organization_id (FK)|>--------------+
         |            |    | role, token         |               |
         |            |    | expires_at, status  |               |
         |            |    +---------------------+               |
         |            |                                          |
         v            |                                          v
  +----------------+  |    +---------------------+     +-----------------+
  |   AuditLog     |  |    |      AITool         |<----|  Subscription   |
  |----------------|  |    |---------------------|     |-----------------|
  | id (PK)        |  |    | id (PK)             |     | id (PK)         |
  | user_id (FK)   |  |    | organization_id (FK)|     | org_id (FK)     |
  | action         |  |    | name                |     | plan_id (FK)    |
  | resource_type  |  |    | description         |     | stripe_sub_id   |
  | resource_id    |  |    | provider, model     |     | status          |
  | metadata (J)   |  |    | risk_level          |     | current_period  |
  | ip_address     |  |    | status              |     +-----------------+
  | created_at     |  |    | passport_data (J)   |            |
  +----------------+  |    | scan_data (J)       |     +-----------------+
                       |    | cli_passport_id     |     |      Plan       |
                       |    +-------+------+------+     |-----------------|
                       |            |      |            | id (PK)         |
                       |            |      |            | name            |
                       |            v      v            | stripe_price_id |
                       |    +----------+ +----------+   | limits (J)      |
                       |    |FRIAAssmt | |ScanResult|   +-----------------+
                       |    |----------| |----------|
                       |    | id (PK)  | | id (PK)  |
                       |    | tool_id  | | tool_id  |
                       |    | sections | | findings |
                       |    | status   | | score    |
                       |    | pdf_url  | | layers   |
                       |    +----------+ | synced_at|
                       |                 +----------+
                       |
  +-------------------+|   +---------------------+     +-----------------+
  | DeviceCode        ||   | ComplianceDocument   |     | GapAnalysis     |
  |-------------------||   |---------------------|     |-----------------|
  | device_code (PK)  ||   | id (PK)             |     | id (PK)         |
  | user_code         ||   | tool_id (FK)        |     | tool_id (FK)    |
  | expires_at        ||   | type                |     | categories (J)  |
  | interval          ||   | content             |     | coverage_pct    |
  | status            ||   | sections (J)        |     | effort_estimate |
  +-------------------+|   | status              |     +-----------------+
                       |    | approval_workflow   |
                       |    +---------------------+
                       |
  +-------------------+|   +---------------------+     +-----------------+
  | TrainingCourse    ||   | RegistryTool         |     | Obligation      |
  |-------------------||   |---------------------|     |-----------------|
  | id (PK)           ||   | id (PK)             |     | id (PK)         |
  | title, desc       ||   | name                |     | article_ref     |
  +----+--------------+|   | provider            |     | title           |
       |               |   | risk_rating (A+-F)  |     | risk_level      |
       v               |   | metadata (J)        |     | deadline        |
  +-------------------+|   +---------------------+     +-----------------+
  | TrainingModule    ||
  |-------------------||   +---------------------+     +-----------------+
  | id (PK)           ||   | ScoringRule          |     | SyncHistory     |
  | course_id (FK)    ||   |---------------------|     |-----------------|
  | title, content    ||   | id (PK)             |     | id (PK)         |
  +----+--------------+|   | name, weight        |     | tool_id (FK)    |
       |               |   | threshold           |     | type            |
       v               |   +---------------------+     | payload_hash    |
  +-------------------+|                                | status          |
  |LiteracyCompletion||   +---------------------+     | synced_at       |
  |-------------------||   | APIKey               |     +-----------------+
  | id (PK)           ||   |---------------------|
  | user_id (FK)      ||   | id (PK)             |     +-----------------+
  | module_id (FK)    ||   | org_id (FK)         |     | AuditPackage    |
  | completed_at      ||   | key_hash            |     |-----------------|
  +-------------------+|   | last_used_at        |     | id (PK)         |
                       |   +---------------------+     | tool_id (FK)    |
  +-------------------+|                                | contents (J)    |
  |LiteracyRequiremnt||   +---------------------+     | generated_at    |
  |-------------------||   | APIUsage             |     | pdf_url         |
  | id (PK)           ||   |---------------------|     +-----------------+
  | org_id (FK)       ||   | id (PK)             |
  | role_pattern      ||   | api_key_id (FK)     |
  | required_courses  ||   | endpoint            |
  +-------------------+    | timestamp           |
                           | response_time       |
  Легенда:                 +---------------------+
  (PK) = Primary Key
  (FK) = Foreign Key          +---------------------+
  (UQ) = Unique               | AIToolCatalog       |
  (J)  = JSONB                |---------------------|
  1--* = One-to-Many          | id (PK)             |
  *--1 = Many-to-One          | name                |
                              | provider            |
                              | risk_rating (A+-F)  |
                              | category            |
                              | 5,000+ записей      |
                              +---------------------+
```

---

## 4. SaaS БД: таблицы по контекстам

### 4.1 IAM (Identity & Access Management)

Аутентификация через WorkOS SSO. Мультитенантность на уровне Organization.

#### Таблица: `User`

| Столбец      | Тип          | Ограничения       | Описание                    |
|--------------|--------------|--------------------|-----------------------------|
| `id`         | UUID         | PK, DEFAULT gen   | Внутренний идентификатор    |
| `workos_id`  | VARCHAR(255) | UNIQUE, NOT NULL   | ID пользователя в WorkOS    |
| `email`      | VARCHAR(255) | UNIQUE, NOT NULL   | Email                       |
| `name`       | VARCHAR(255) | NOT NULL           | Полное имя                  |
| `avatar_url` | TEXT         | NULL               | URL аватара                 |
| `created_at` | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания               |

#### Таблица: `Organization`

| Столбец             | Тип          | Ограничения       | Описание                        |
|---------------------|--------------|--------------------|---------------------------------|
| `id`                | UUID         | PK, DEFAULT gen   | Внутренний ID                   |
| `workos_org_id`     | VARCHAR(255) | UNIQUE, NOT NULL   | ID организации в WorkOS         |
| `name`              | VARCHAR(255) | NOT NULL           | Название организации            |
| `plan`              | VARCHAR(50)  | DEFAULT 'starter'  | Текущий план (starter/growth/enterprise) |
| `stripe_customer_id`| VARCHAR(255) | NULL               | ID клиента в Stripe             |
| `created_at`        | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания                   |

#### Таблица: `OrganizationMember`

| Столбец           | Тип          | Ограничения       | Описание                    |
|-------------------|--------------|--------------------|-----------------------------|
| `user_id`         | UUID         | FK -> User.id      | Ссылка на пользователя      |
| `organization_id` | UUID         | FK -> Organization.id | Ссылка на организацию    |
| `role`            | VARCHAR(50)  | NOT NULL           | Роль: `admin` / `member` / `viewer` |

Составной PK: `(user_id, organization_id)`.

#### Таблица: `Invitation`

| Столбец           | Тип          | Ограничения       | Описание                         |
|-------------------|--------------|--------------------|---------------------------------|
| `id`              | UUID         | PK, DEFAULT gen   | ID приглашения                  |
| `email`           | VARCHAR(255) | NOT NULL           | Email приглашённого             |
| `organization_id` | UUID         | FK -> Organization.id | Организация                 |
| `role`            | VARCHAR(50)  | NOT NULL           | Предложенная роль               |
| `token`           | VARCHAR(255) | UNIQUE, NOT NULL   | Одноразовый токен               |
| `expires_at`      | TIMESTAMPTZ  | NOT NULL           | Срок действия                   |
| `status`          | VARCHAR(20)  | DEFAULT 'pending'  | `pending` / `accepted` / `expired` |

#### Таблица: `AuditLog`

| Столбец         | Тип          | Ограничения       | Описание                         |
|-----------------|--------------|--------------------|---------------------------------|
| `id`            | UUID         | PK, DEFAULT gen   | ID записи                       |
| `user_id`       | UUID         | FK -> User.id      | Кто выполнил действие           |
| `action`        | VARCHAR(100) | NOT NULL           | Действие (`scan`, `fix`, `export`...) |
| `resource_type` | VARCHAR(50)  | NOT NULL           | Тип ресурса (`tool`, `passport`...) |
| `resource_id`   | UUID         | NULL               | ID ресурса                       |
| `metadata`      | JSONB        | DEFAULT '{}'       | Дополнительные данные           |
| `ip_address`    | INET         | NULL               | IP-адрес клиента                |
| `created_at`    | TIMESTAMPTZ  | DEFAULT NOW()      | Время действия                  |

### 4.2 AI Tool Inventory

Центральный реестр AI-инструментов организации. Связан с Agent Passport (CLI) через
`cli_passport_id`.

#### Таблица: `AITool`

| Столбец           | Тип          | Ограничения            | Описание                         |
|-------------------|--------------|------------------------|---------------------------------|
| `id`              | UUID         | PK, DEFAULT gen        | ID инструмента                  |
| `organization_id` | UUID         | FK -> Organization.id   | Организация-владелец            |
| `name`            | VARCHAR(255) | NOT NULL               | Название                        |
| `description`     | TEXT         | NULL                   | Описание                        |
| `provider`        | VARCHAR(100) | NULL                   | Провайдер (OpenAI, Anthropic...) |
| `model`           | VARCHAR(100) | NULL                   | Модель (gpt-4, claude-3...)     |
| `risk_level`      | VARCHAR(20)  | NOT NULL               | `prohibited`/`high`/`limited`/`minimal` |
| `status`          | VARCHAR(20)  | DEFAULT 'active'       | `active`/`archived`/`under_review` |
| `passport_data`   | JSONB        | DEFAULT '{}'           | Данные Agent Passport (36 полей) |
| `scan_data`       | JSONB        | DEFAULT '{}'           | Последний ScanResult            |
| `cli_passport_id` | VARCHAR(255) | NULL                   | Связь с локальным passport JSON  |
| `created_at`      | TIMESTAMPTZ  | DEFAULT NOW()          | Дата добавления                 |
| `updated_at`      | TIMESTAMPTZ  | DEFAULT NOW()          | Дата обновления                 |

#### Таблица: `AIToolCatalog`

Предварительно проиндексированный каталог 5,000+ AI-инструментов с рейтингами рисков.

| Столбец       | Тип          | Ограничения       | Описание                         |
|---------------|--------------|--------------------|---------------------------------|
| `id`          | UUID         | PK, DEFAULT gen   | ID записи                       |
| `name`        | VARCHAR(255) | NOT NULL           | Название инструмента            |
| `provider`    | VARCHAR(100) | NOT NULL           | Провайдер                        |
| `category`    | VARCHAR(100) | NOT NULL           | Категория                        |
| `risk_rating` | CHAR(2)      | NOT NULL           | Рейтинг: `A+`, `A`, `B`, `C`, `D`, `F` |
| `description` | TEXT         | NULL               | Описание                        |
| `metadata`    | JSONB        | DEFAULT '{}'       | Дополнительные данные           |
| `indexed_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | Дата индексации                 |

### 4.3 Deployer Compliance

Документы соответствия, FRIA-оценки и gap-анализ для разворачивателей AI-систем.

#### Таблица: `Requirement`

| Столбец       | Тип          | Ограничения       | Описание                         |
|---------------|--------------|--------------------|---------------------------------|
| `id`          | UUID         | PK, DEFAULT gen   | ID требования                   |
| `article`     | VARCHAR(50)  | NOT NULL           | Статья AI Act                   |
| `description` | TEXT         | NOT NULL           | Описание требования             |
| `category`    | VARCHAR(50)  | NOT NULL           | Категория                        |
| `risk_level`  | VARCHAR(20)  | NOT NULL           | Уровень риска                   |
| `deadline`    | DATE         | NOT NULL           | Дедлайн вступления в силу       |

#### Таблица: `FRIAAssessment`

| Столбец       | Тип          | Ограничения       | Описание                         |
|---------------|--------------|--------------------|---------------------------------|
| `id`          | UUID         | PK, DEFAULT gen   | ID оценки                       |
| `tool_id`     | UUID         | FK -> AITool.id    | AI-инструмент                   |
| `sections`    | JSONB        | NOT NULL           | Секции FRIA (структурированные) |
| `status`      | VARCHAR(20)  | DEFAULT 'draft'    | `draft`/`in_review`/`approved`/`rejected` |
| `pdf_url`     | TEXT         | NULL               | URL сгенерированного PDF        |
| `created_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания                   |
| `updated_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | Дата обновления                 |

#### Таблица: `FRIASection`

| Столбец         | Тип          | Ограничения        | Описание                   |
|-----------------|--------------|--------------------|-----------------------------|
| `id`            | UUID         | PK, DEFAULT gen   | ID секции                   |
| `fria_id`       | UUID         | FK -> FRIAAssessment.id | FRIA-оценка            |
| `section_number`| INTEGER      | NOT NULL           | Номер секции                |
| `content`       | TEXT         | NOT NULL           | Содержание секции           |
| `status`        | VARCHAR(20)  | DEFAULT 'draft'    | Статус секции               |

#### Таблица: `ComplianceDocument`

8 типов документов соответствия EU AI Act.

| Столбец             | Тип          | Ограничения       | Описание                         |
|---------------------|--------------|--------------------|---------------------------------|
| `id`                | UUID         | PK, DEFAULT gen   | ID документа                    |
| `tool_id`           | UUID         | FK -> AITool.id    | AI-инструмент                   |
| `type`              | VARCHAR(50)  | NOT NULL           | Тип документа (см. ниже)        |
| `content`           | TEXT         | NOT NULL           | Содержание (markdown)           |
| `sections`          | JSONB        | DEFAULT '[]'       | Структурированные секции        |
| `status`            | VARCHAR(20)  | DEFAULT 'draft'    | `draft`/`review`/`approved`     |
| `approval_workflow` | JSONB        | DEFAULT '{}'       | Workflow одобрения              |
| `created_at`        | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания                   |
| `updated_at`        | TIMESTAMPTZ  | DEFAULT NOW()      | Дата обновления                 |

**8 типов ComplianceDocument.type:**

| Тип                    | Описание                                   |
|------------------------|--------------------------------------------|
| `FRIA`                 | Fundamental Rights Impact Assessment       |
| `AI_POLICY`            | AI Policy документ                         |
| `QMS`                  | Quality Management System                  |
| `RISK_PLAN`            | Risk Management Plan                       |
| `WORKER_NOTIFICATION`  | Worker Notification (ст. 26(7))            |
| `TECH_DOCS`            | Technical Documentation                    |
| `MONITORING`           | Post-Market Monitoring Policy              |
| `DECLARATION`          | Declaration of Conformity                  |

#### Таблица: `GapAnalysis`

| Столбец          | Тип          | Ограничения       | Описание                         |
|------------------|--------------|--------------------|---------------------------------|
| `id`             | UUID         | PK, DEFAULT gen   | ID анализа                      |
| `tool_id`        | UUID         | FK -> AITool.id    | AI-инструмент                   |
| `categories`     | JSONB        | NOT NULL           | 12 категорий (compliance areas) |
| `coverage_pct`   | DECIMAL(5,2) | NOT NULL           | Процент покрытия                |
| `effort_estimate`| VARCHAR(20)  | NOT NULL           | Оценка трудозатрат (weeks)      |
| `created_at`     | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания                   |

### 4.4 AI Literacy (LMS)

Система обучения AI-грамотности (ст. 4 EU AI Act). 4 ролевых курса.

#### Таблица: `TrainingCourse`

| Столбец       | Тип          | Ограничения       | Описание                   |
|---------------|--------------|--------------------|-----------------------------|
| `id`          | UUID         | PK, DEFAULT gen   | ID курса                   |
| `title`       | VARCHAR(255) | NOT NULL           | Название курса              |
| `description` | TEXT         | NOT NULL           | Описание                   |
| `role`        | VARCHAR(50)  | NOT NULL           | Целевая роль               |
| `duration_min`| INTEGER      | NOT NULL           | Длительность (мин)         |
| `created_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания              |

**4 ролевых курса**: Executive, Developer, Deployer, End User.

#### Таблица: `TrainingModule`

| Столбец      | Тип          | Ограничения          | Описание                   |
|--------------|--------------|----------------------|-----------------------------|
| `id`         | UUID         | PK, DEFAULT gen     | ID модуля                  |
| `course_id`  | UUID         | FK -> TrainingCourse.id | Курс                  |
| `title`      | VARCHAR(255) | NOT NULL             | Название модуля            |
| `content`    | TEXT         | NOT NULL             | Контент (markdown/HTML)    |
| `order`      | INTEGER      | NOT NULL             | Порядок в курсе            |

#### Таблица: `LiteracyCompletion`

| Столбец        | Тип          | Ограничения            | Описание                   |
|----------------|--------------|------------------------|-----------------------------|
| `id`           | UUID         | PK, DEFAULT gen       | ID записи                  |
| `user_id`      | UUID         | FK -> User.id          | Пользователь               |
| `module_id`    | UUID         | FK -> TrainingModule.id | Модуль                   |
| `completed_at` | TIMESTAMPTZ  | DEFAULT NOW()          | Дата завершения            |
| `score`        | DECIMAL(5,2) | NULL                   | Балл теста                 |

#### Таблица: `LiteracyRequirement`

| Столбец           | Тип          | Ограничения            | Описание                        |
|-------------------|--------------|------------------------|---------------------------------|
| `id`              | UUID         | PK, DEFAULT gen       | ID требования                   |
| `organization_id` | UUID         | FK -> Organization.id  | Организация                     |
| `role_pattern`    | VARCHAR(100) | NOT NULL               | Паттерн ролей (regex/glob)      |
| `required_courses`| UUID[]       | NOT NULL               | Массив обязательных курсов      |
| `deadline`        | DATE         | NULL                   | Дедлайн прохождения             |

### 4.5 Billing

Интеграция с Stripe для подписок. 3 плана: Starter (€0), Growth (€149/мес), Enterprise (€499/мес).

#### Таблица: `Plan`

| Столбец          | Тип          | Ограничения       | Описание                         |
|------------------|--------------|--------------------|---------------------------------|
| `id`             | UUID         | PK, DEFAULT gen   | ID плана                        |
| `name`           | VARCHAR(50)  | UNIQUE, NOT NULL   | `starter` / `growth` / `enterprise` |
| `stripe_price_id`| VARCHAR(255) | NULL               | ID цены в Stripe                |
| `limits`         | JSONB        | NOT NULL           | Лимиты (tools, scans, users)    |
| `created_at`     | TIMESTAMPTZ  | DEFAULT NOW()      | Дата создания                   |

**Структура Plan.limits (JSONB):**

| Лимит                  | Starter (€0) | Growth (€149/мес) | Enterprise (€499/мес) |
|------------------------|--------------|--------------------|-----------------------|
| `max_tools`            | 3            | unlimited          | unlimited             |
| `max_scans_per_month`  | 1            | unlimited          | unlimited             |
| `max_users`            | 1            | 10                 | unlimited             |
| `deep_analysis`        | false        | true               | true                  |
| `api_access`           | false        | false              | true                  |
| `audit_packages`       | false        | true               | true                  |
| `sso`                  | false        | false              | true                  |
| `multi_workspace`      | false        | false              | true                  |

Пример для Starter:
```json
{
  "max_tools": 3,
  "max_scans_per_month": 1,
  "max_users": 1,
  "deep_analysis": false,
  "api_access": false,
  "audit_packages": false,
  "sso": false,
  "multi_workspace": false
}
```

#### Таблица: `Subscription`

| Столбец            | Тип          | Ограничения            | Описание                    |
|--------------------|--------------|------------------------|-----------------------------|
| `id`               | UUID         | PK, DEFAULT gen       | ID подписки                 |
| `organization_id`  | UUID         | FK -> Organization.id  | Организация                 |
| `plan_id`          | UUID         | FK -> Plan.id          | План                        |
| `stripe_sub_id`    | VARCHAR(255) | UNIQUE, NULL           | ID подписки в Stripe        |
| `status`           | VARCHAR(20)  | NOT NULL               | `active`/`past_due`/`canceled` |
| `current_period_end`| TIMESTAMPTZ | NOT NULL               | Конец текущего периода      |
| `created_at`       | TIMESTAMPTZ  | DEFAULT NOW()          | Дата создания               |

### 4.6 Registry API

Публичный API реестра AI-инструментов. 4,983+ проиндексированных инструмента.

#### Таблица: `RegistryTool`

| Столбец       | Тип          | Ограничения       | Описание                         |
|---------------|--------------|--------------------|---------------------------------|
| `id`          | UUID         | PK, DEFAULT gen   | ID инструмента                  |
| `name`        | VARCHAR(255) | NOT NULL           | Название                        |
| `provider`    | VARCHAR(100) | NOT NULL           | Провайдер                        |
| `category`    | VARCHAR(100) | NOT NULL           | Категория                        |
| `risk_rating` | CHAR(2)      | NOT NULL           | `A+`..`F`                       |
| `description` | TEXT         | NULL               | Описание                        |
| `url`         | TEXT         | NULL               | Ссылка на инструмент            |
| `metadata`    | JSONB        | DEFAULT '{}'       | Доп. данные (pricing, features) |
| `indexed_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | Дата индексации                 |

#### Таблица: `Obligation`

108 обязательств EU AI Act (зеркало `obligations.json` из engine).

| Столбец           | Тип          | Ограничения       | Описание                         |
|-------------------|--------------|--------------------|---------------------------------|
| `id`              | UUID         | PK, DEFAULT gen   | ID                              |
| `obligation_id`   | VARCHAR(50)  | UNIQUE, NOT NULL   | `eu-ai-act-OBL-001`            |
| `article_reference`| VARCHAR(50) | NOT NULL           | Статья AI Act                   |
| `title`           | VARCHAR(255) | NOT NULL           | Название                        |
| `description`     | TEXT         | NOT NULL           | Описание                        |
| `risk_level`      | VARCHAR(20)  | NOT NULL           | Уровень риска                   |
| `deadline`        | DATE         | NOT NULL           | Дедлайн                        |
| `severity`        | VARCHAR(20)  | NOT NULL           | Серьёзность                     |
| `penalty`         | VARCHAR(100) | NOT NULL           | Штраф за нарушение              |

#### Таблица: `ScoringRule`

| Столбец     | Тип          | Ограничения       | Описание                         |
|-------------|--------------|--------------------|---------------------------------|
| `id`        | UUID         | PK, DEFAULT gen   | ID правила                      |
| `name`      | VARCHAR(100) | UNIQUE, NOT NULL   | Имя правила                     |
| `weight`    | DECIMAL(5,4) | NOT NULL           | Вес в общем скоринге            |
| `threshold` | DECIMAL(5,2) | NOT NULL           | Пороговое значение              |
| `category`  | VARCHAR(50)  | NOT NULL           | Категория скоринга              |

#### Таблица: `APIKey`

| Столбец           | Тип          | Ограничения            | Описание                    |
|-------------------|--------------|------------------------|-----------------------------|
| `id`              | UUID         | PK, DEFAULT gen       | ID ключа                   |
| `organization_id` | UUID         | FK -> Organization.id  | Организация                 |
| `key_hash`        | VARCHAR(255) | UNIQUE, NOT NULL       | SHA-256 хэш ключа          |
| `name`            | VARCHAR(100) | NOT NULL               | Название ключа              |
| `permissions`     | JSONB        | DEFAULT '[]'           | Разрешения                  |
| `last_used_at`    | TIMESTAMPTZ  | NULL                   | Последнее использование     |
| `created_at`      | TIMESTAMPTZ  | DEFAULT NOW()          | Дата создания               |

#### Таблица: `APIUsage`

| Столбец         | Тип          | Ограничения       | Описание                         |
|-----------------|--------------|--------------------|---------------------------------|
| `id`            | UUID         | PK, DEFAULT gen   | ID записи                       |
| `api_key_id`    | UUID         | FK -> APIKey.id    | Ключ API                        |
| `endpoint`      | VARCHAR(255) | NOT NULL           | Вызванный эндпоинт              |
| `method`        | VARCHAR(10)  | NOT NULL           | HTTP-метод                      |
| `status_code`   | INTEGER      | NOT NULL           | Код ответа                      |
| `response_time` | INTEGER      | NOT NULL           | Время ответа (мс)               |
| `timestamp`     | TIMESTAMPTZ  | DEFAULT NOW()      | Время вызова                    |

### 4.7 TUI Data Collection (CLI Sync)

Данные, синхронизированные из локального CLI в SaaS.

#### Таблица: `ScanResult`

| Столбец     | Тип          | Ограничения       | Описание                         |
|-------------|--------------|--------------------|---------------------------------|
| `id`        | UUID         | PK, DEFAULT gen   | ID результата                   |
| `tool_id`   | UUID         | FK -> AITool.id    | AI-инструмент                   |
| `findings`  | JSONB        | NOT NULL           | Массив Finding (из CLI)         |
| `score`     | DECIMAL(5,2) | NOT NULL           | Общий compliance score          |
| `layers`    | JSONB        | DEFAULT '{}'       | Score по слоям (L1..L5)         |
| `synced_at` | TIMESTAMPTZ  | DEFAULT NOW()      | Время синхронизации             |

#### Таблица: `SyncHistory`

| Столбец        | Тип          | Ограничения       | Описание                         |
|----------------|--------------|--------------------|---------------------------------|
| `id`           | UUID         | PK, DEFAULT gen   | ID записи                       |
| `tool_id`      | UUID         | FK -> AITool.id    | AI-инструмент                   |
| `type`         | VARCHAR(50)  | NOT NULL           | Тип синхронизации (`scan`/`passport`/`fria`) |
| `payload_hash` | VARCHAR(64)  | NOT NULL           | SHA-256 хэш payload             |
| `status`       | VARCHAR(20)  | NOT NULL           | `success` / `failed` / `conflict` |
| `synced_at`    | TIMESTAMPTZ  | DEFAULT NOW()      | Время синхронизации             |

### 4.8 Authentication

Device Code Flow для авторизации CLI с SaaS (аналогично `gh auth login`).

#### Таблица: `DeviceCode`

| Столбец       | Тип          | Ограничения       | Описание                         |
|---------------|--------------|--------------------|---------------------------------|
| `device_code` | VARCHAR(255) | PK                 | Код устройства (генерируется)   |
| `user_code`   | VARCHAR(10)  | UNIQUE, NOT NULL   | Код для пользователя (8 символов) |
| `user_id`     | UUID         | FK -> User.id, NULL | Пользователь (после авторизации)|
| `expires_at`  | TIMESTAMPTZ  | NOT NULL           | Срок действия (15 мин)          |
| `interval`    | INTEGER      | DEFAULT 5          | Интервал polling (сек)          |
| `status`      | VARCHAR(20)  | DEFAULT 'pending'  | `pending`/`authorized`/`expired` |

### 4.9 Audit

Аудиторские пакеты для экспорта и регулятору.

#### Таблица: `AuditPackage`

| Столбец        | Тип          | Ограничения       | Описание                         |
|----------------|--------------|--------------------|---------------------------------|
| `id`           | UUID         | PK, DEFAULT gen   | ID пакета                       |
| `tool_id`      | UUID         | FK -> AITool.id    | AI-инструмент                   |
| `contents`     | JSONB        | NOT NULL           | Состав пакета (документы, скан) |
| `generated_at` | TIMESTAMPTZ  | DEFAULT NOW()      | Дата генерации                  |
| `pdf_url`      | TEXT         | NULL               | URL PDF-версии                  |

**Структура AuditPackage.contents (JSONB):**

```json
{
  "passport": { ... },
  "latest_scan": { ... },
  "fria": { ... },
  "compliance_documents": [...],
  "evidence_chain_summary": { ... },
  "gap_analysis": { ... }
}
```

---

## 5. Синхронизация данных (CLI <-> SaaS)

### 5.1 Маппинг локальных данных на SaaS-таблицы

```
+----------------------------------+     +---------------------------+
|  ЛОКАЛЬНЫЕ ДАННЫЕ (CLI)          |     |  SaaS (PostgreSQL)        |
+----------------------------------+     +---------------------------+
|                                  |     |                           |
|  .complior/passports/*.json  ----|---->|  AITool.passport_data     |
|    (AgentManifest, 36 полей)     |     |  AITool.cli_passport_id   |
|                                  |     |                           |
|  ScanResult (из engine)      ----|---->|  ScanResult (таблица)     |
|    (score, findings, layers)     |     |  AITool.scan_data         |
|                                  |     |                           |
|  .complior/fria/*.md         ----|---->|  FRIAAssessment           |
|    (FRIA markdown)               |     |  ComplianceDocument(FRIA) |
|                                  |     |                           |
|  .complior/evidence/chain.json --|---->|  AuditPackage.contents    |
|    (EvidenceChain summary)       |     |    .evidence_chain_summary|
|                                  |     |                           |
|  ~/.config/complior/credentials -|---->|  DeviceCode (auth flow)   |
|    (tokens)                      |     |  User (identity)          |
+----------------------------------+     +---------------------------+
```

### 5.2 Процесс синхронизации

```
CLI                                     SaaS API
 |                                        |
 |-- 1. complior login ------------------>|
 |     Device Code Flow                   |-- DeviceCode.status = authorized
 |<-- JWT tokens -----------------------  |
 |     -> credentials file                |
 |                                        |
 |-- 2. complior sync ------------------->|
 |     POST /api/sync                     |
 |     {                                  |
 |       passport: AgentManifest,         |-- UPSERT AITool
 |       scan: ScanResult,               |-- INSERT ScanResult
 |       fria: string (md),              |-- UPSERT FRIAAssessment
 |       evidence_summary: {...}          |-- INSERT SyncHistory
 |     }                                  |
 |<-- { sync_id, status } -------------- |
 |                                        |
 |-- 3. complior sync --status ---------->|
 |     GET /api/sync/history              |
 |<-- SyncHistory[] -------------------- |
```

### 5.3 Дедупликация

- `SyncHistory.payload_hash` (SHA-256) предотвращает повторную синхронизацию идентичных данных
- Если `payload_hash` уже существует для данного `tool_id` + `type` -- синхронизация пропускается

### 5.4 Разрешение конфликтов

- **CLI wins** (last-write-wins): локальные данные имеют приоритет при конфликте
- `SyncHistory.status = 'conflict'` записывается, если SaaS-версия новее
- Ручное разрешение через Dashboard (SaaS)

---

## 6. Миграции и MetaSQL

### 6.1 Управление схемой

SaaS использует миграции для управления схемой PostgreSQL:

- **Инструмент**: Drizzle ORM (TypeScript, type-safe migrations)
- **Директория**: `saas/drizzle/migrations/` (в SaaS-репозитории `ai-act-compliance-platform`)
- **Формат**: SQL-файлы с timestamp-именами

### 6.2 Соглашения

```
migrations/
  0001_create_users.sql
  0002_create_organizations.sql
  0003_create_ai_tools.sql
  ...
```

### 6.3 Правила миграций

1. **Только additive** -- удаление столбцов запрещено в production
2. **Обратная совместимость** -- новые столбцы всегда `NULL` или имеют `DEFAULT`
3. **JSONB эволюция** -- JSONB-поля расширяются, но не ломают существующие ключи
4. **Индексы** -- `CREATE INDEX CONCURRENTLY` для production (без блокировки)
5. **Ревью** -- каждая миграция проходит code review

### 6.4 Индексы (ключевые)

```sql
-- IAM
CREATE INDEX idx_user_email ON "User" (email);
CREATE INDEX idx_org_member_org ON "OrganizationMember" (organization_id);
CREATE INDEX idx_audit_log_user ON "AuditLog" (user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON "AuditLog" (resource_type, resource_id);

-- AI Tools
CREATE INDEX idx_ai_tool_org ON "AITool" (organization_id);
CREATE INDEX idx_ai_tool_risk ON "AITool" (risk_level);
CREATE INDEX idx_ai_tool_passport ON "AITool" USING GIN (passport_data);

-- Scans
CREATE INDEX idx_scan_result_tool ON "ScanResult" (tool_id, synced_at DESC);
CREATE INDEX idx_sync_history_tool ON "SyncHistory" (tool_id, synced_at DESC);

-- Registry
CREATE INDEX idx_registry_tool_name ON "RegistryTool" USING GIN (to_tsvector('english', name));
CREATE INDEX idx_registry_tool_risk ON "RegistryTool" (risk_rating);

-- API
CREATE INDEX idx_api_usage_key ON "APIUsage" (api_key_id, timestamp DESC);
```

---

## 7. Безопасность данных

### 7.1 Шифрование

| Слой              | Метод                             | Описание                          |
|-------------------|-----------------------------------|-----------------------------------|
| В покое (at rest) | AES-256 (Hetzner disk encryption) | Полное шифрование диска           |
| В движении        | TLS 1.3 (HTTPS)                   | Все API-вызовы через HTTPS        |
| Ключи (CLI)       | Файловые права 0600               | Приватные ключи доступны только владельцу |
| Credentials       | Файловые права 0600               | Токены доступны только владельцу  |
| API-ключи (SaaS)  | SHA-256 хэш                       | Ключи хранятся только как хэши   |
| Подписи           | ed25519                           | Паспорта и evidence chain подписаны |

### 7.2 Резидентность данных (EU)

| Требование              | Реализация                          |
|--------------------------|-------------------------------------|
| Хранение в EU            | Hetzner, Falkenstein/Helsinki       |
| Нет трансфера за пределы EU | Все данные остаются в EU-регионах |
| GDPR compliance          | Data Processing Agreement с Hetzner |
| Право на удаление        | `DELETE /api/account` — полная очистка |
| Экспорт данных           | `GET /api/export` — JSON/ZIP       |

### 7.3 Мультитенантность

- **Row-Level Security (RLS)**: Каждый запрос фильтруется по `organization_id`
- **JWT claims**: `org_id` в JWT-токене определяет видимость данных
- **Нет cross-tenant доступа**: даже admin SaaS не видит данные других организаций без audit trail

### 7.4 Чувствительные данные

| Данные                  | Хранение                           | Доступ                       |
|-------------------------|-------------------------------------|------------------------------|
| Исходный код            | НЕ хранится в SaaS                 | Только локально              |
| Findings (scan results) | `findings` JSONB (без кода)         | Organization members         |
| Passport                | `passport_data` JSONB               | Organization members         |
| API-ключи               | Только хэш                         | Owner (create), system (verify) |
| Пароли                  | Не хранятся (WorkOS SSO)           | Делегировано WorkOS          |
| LLM-промпты             | НЕ хранятся в SaaS                 | Только локальный движок      |

**Принцип**: исходный код пользователя НИКОГДА не покидает локальную машину.
В SaaS передаются только метаданные (score, findings без snippets, passport).

---

## 8. Бэкапы и disaster recovery

### 8.1 Локальное хранилище

| Аспект         | Подход                                     |
|----------------|---------------------------------------------|
| Бэкап          | Ответственность пользователя (git, rsync)   |
| Evidence chain | Иммутабельная цепочка, верифицируемая       |
| Passport       | Подписан ed25519, целостность проверяема     |
| Config         | Текстовые файлы, легко восстановимы         |
| Ротация        | Evidence chain: макс. 1000 записей, 50 МБ   |

### 8.2 SaaS PostgreSQL

| Аспект            | Подход                                       |
|-------------------|-----------------------------------------------|
| Автоматические бэкапы | Hetzner managed PostgreSQL, ежедневно      |
| Point-in-time recovery | WAL-G, до 7 дней назад                    |
| Реплика           | Read replica в другом EU-дата-центре         |
| Мониторинг        | pg_stat_statements, Grafana alerts           |
| RTO               | < 1 час (восстановление из бэкапа)           |
| RPO               | < 5 минут (WAL streaming)                    |
| Тестирование      | Ежемесячный DR-drill (восстановление в staging) |

### 8.3 Retention policy

| Данные                | Срок хранения     | Основание                        |
|-----------------------|-------------------|----------------------------------|
| Scan results          | 5 лет             | EU AI Act record-keeping         |
| Audit logs            | 5 лет             | EU AI Act compliance audit       |
| Evidence chain        | 5 лет             | Доказательная база               |
| FRIA assessments      | 10 лет            | Fundamental rights documentation |
| User data             | До удаления + 30д | GDPR right to erasure            |
| API usage logs        | 90 дней           | Rate limiting, debugging         |
| Session data (local)  | До удаления       | Convenience, user-controlled     |

---

## Приложение: Глоссарий

| Термин            | Определение                                                    |
|-------------------|----------------------------------------------------------------|
| Agent Passport    | Удостоверение AI-системы (36 полей, ed25519 подпись)           |
| Evidence Chain    | Append-only хэш-цепочка аудита сканирований                   |
| FRIA              | Fundamental Rights Impact Assessment (ст. 27 EU AI Act)       |
| Finding           | Результат проверки сканера (check_id, type, severity)          |
| ScanResult        | Агрегированный результат сканирования (score + findings)       |
| Bounded Context   | Логическая граница ответственности в SaaS-БД (DDD)             |
| RLS               | Row-Level Security — изоляция данных по организациям           |
| WAL               | Write-Ahead Log — механизм PostgreSQL для point-in-time recovery |
| Device Code Flow  | OAuth-flow для CLI-авторизации (RFC 8628)                      |
