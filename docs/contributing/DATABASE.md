# Complior — Базы данных

## Обзор

Двухуровневая архитектура хранения: встроенные БД в TUI для офлайн-работы + серверный PostgreSQL для Cloud (аккаунты, биллинг, дашборд).

### Встроенные (TUI, офлайн)
1. **БД регуляций** — структурированный JSON по каждой статье
2. **Каталог AI-инструментов** — 2,000+ инструментов с паттернами обнаружения
3. **SQLite** — история сессий, результаты сканирования, память

### Серверная (Cloud)
4. **PostgreSQL** — пользователи, подписки, usage-логи, биллинг, API-ключи, дашборд

---

## 1. База данных регуляций

Структурированный JSON для каждой статьи. Содержит: текст, пояснение, последствия для кода, правила сканера, шаблоны фиксов, серьезность, штрафы, дедлайны.

### Схема

```json
{
  "id": "eu-50-1",
  "regulation": "eu-ai-act",
  "article": "50",
  "paragraph": "1",
  "title": "Обязательства прозрачности для провайдеров и деплойеров",
  "text": "<официальный текст статьи>",
  "explanation": "AI-системы, взаимодействующие с людьми, обязаны раскрывать, что они являются AI",
  "codeImplications": [
    "Необходимо показывать раскрытие в UI до/во время взаимодействия",
    "Необходимо обновить системные промпты для включения идентификации AI"
  ],
  "scannerRules": ["check-disclosure-component", "check-system-prompt"],
  "fixTemplates": ["disclosure-component", "system-prompt-update"],
  "severity": "CRITICAL",
  "penalty": {
    "max": "€15M или 3% мирового оборота",
    "article": "Ст. 99.4"
  },
  "deadline": "2026-08-02",
  "status": "active",
  "relatedArticles": ["eu-12", "eu-4"]
}
```

### Покрытие

| Регуляция | Статьи | Приоритет | Статус |
|-----------|--------|-----------|--------|
| EU AI Act (прозрачность) | Ст. 50.1, 50.2, 12, 4, 11 | P0 | W-8 |
| EU AI Act (GPAI) | Ст. 51-56 | P0 | W-8 |
| Colorado SB 205 | §6-1-1702, §6-1-1703 | P1 | W4 |
| Texas TRAIGA | Требования раскрытия | P1 | W10 |
| ISO 42001 | Система управления AI | P2 | W17 |

### Расширение: Multi-Domain Rule Packs

БД регуляций расширяется за рамки AI Act. Каждый rule pack (домен) имеет свою JSON-структуру правил, совместимую с общей схемой сканера.

| Домен | Pack | Checks | Источник правил | Фаза |
|-------|------|--------|----------------|------|
| AI Compliance | `complior:eu-ai-act` | 7 | EU AI Act статьи → JSON | Launch |
| Accessibility | `complior:wcag-aa` | 10 | WCAG 2.2 AA критерии → JSON | Phase 2 |
| Licenses | `complior:licenses` | 6 | SPDX + dependency tree analysis | Phase 3 |
| Privacy/GDPR | `complior:privacy-gdpr` | 8 | GDPR статьи + ePrivacy → JSON | Phase 4 |

**Структура данных rule pack:**

```json
{
  "pack": "complior:wcag-aa",
  "version": "1.0.0",
  "domain": "accessibility",
  "legalBasis": ["EAA", "ADA", "Section 508", "EN 301 549"],
  "checks": [
    {
      "id": "wcag-img-alt",
      "title": "Images must have alt text",
      "severity": "HIGH",
      "astPattern": "JSXOpeningElement[name='img']:not(:has(JSXAttribute[name='alt']))",
      "autoFix": "add-alt-attribute",
      "reference": "WCAG 2.2 SC 1.1.1"
    }
  ]
}
```

Все rule packs хранятся в `engine/src/core/scanner/packs/`. Загрузка через `rule-pack-loader.ts` на основе `.compliorrc.json` extends.

---

## 2. Каталог AI-инструментов

2,000+ AI-инструментов с паттернами обнаружения и статусом комплаенса.

### Схема

```json
{
  "id": "openai-gpt4o",
  "name": "GPT-4o",
  "provider": "OpenAI",
  "category": "llm",
  "detectionPatterns": {
    "npm": ["openai"],
    "pip": ["openai"],
    "import": ["from openai", "import OpenAI", "import { OpenAI }"],
    "env": ["OPENAI_API_KEY"],
    "model": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
  },
  "riskClassification": {
    "eu": "limited",
    "colorado": "general"
  },
  "deployerObligations": ["eu-50.1", "eu-50.2", "eu-12"],
  "complianceScore": 42,
  "seoSlug": "openai-gpt-4o"
}
```

### Масштаб

| Метрика | Количество |
|---------|-----------|
| Каталогизировано инструментов | 2,000+ |
| Паттернов обнаружения | 5,000+ (npm, pip, import, env, model) |
| SEO-страницы (профили инструментов) | 2,000 |
| SEO-страницы (инструмент x регуляция) | 24,000 |
| SEO-страницы (сравнения) | 1,225 |
| Всего SEO-потенциал | ~27,500 |

---

## 3. SQLite — сессионная база данных

`better-sqlite3` — атомарные записи, один файл (паттерн Claude Code).

### Таблицы

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  model TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
  role TEXT NOT NULL,        -- 'user', 'assistant', 'tool'
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE scan_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
  score INTEGER NOT NULL,
  findings TEXT NOT NULL,    -- JSON-массив
  scanned_at TEXT NOT NULL
);

CREATE TABLE memory_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_path TEXT NOT NULL,
  snapshot TEXT NOT NULL,     -- JSON
  created_at TEXT NOT NULL
);
```

---

## 4. Cloud — PostgreSQL (серверная БД)

Для Complior Cloud (API-прокси + дашборд) используется PostgreSQL. Не embedded — серверная БД на Hetzner.

### Таблицы Cloud

```sql
-- Пользователи Cloud (связаны с WorkOS user ID)
CREATE TABLE cloud_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workos_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',    -- 'starter', 'pro', 'unlimited'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  workos_session_id TEXT,                  -- текущая сессия WorkOS
  token_limit BIGINT NOT NULL DEFAULT 5000000,  -- месячный лимит токенов
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Использование API (append-only log)
CREATE TABLE cloud_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES cloud_users(id),
  session_id TEXT,                         -- ID сессии в TUI
  provider TEXT NOT NULL,                  -- 'openai', 'anthropic', 'google', 'mistral', 'complior-ai'
  model TEXT NOT NULL,                     -- 'gpt-4o', 'claude-sonnet', etc.
  task_type TEXT,                          -- 'codegen', 'compliance-qa', 'report', 'scan-explain'
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  cost_retail NUMERIC(10,6),              -- стоимость по retail-ценам
  cost_wholesale NUMERIC(10,6),           -- наша оптовая стоимость
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрой агрегации usage по пользователю и месяцу
CREATE INDEX idx_cloud_usage_user_month
  ON cloud_usage (user_id, date_trunc('month', created_at));

-- Индекс для агрегации по модели
CREATE INDEX idx_cloud_usage_model
  ON cloud_usage (user_id, model, created_at);

-- Месячные агрегаты (материализованное представление, обновляется pg-boss job)
CREATE TABLE cloud_usage_monthly (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES cloud_users(id),
  month DATE NOT NULL,                    -- первый день месяца
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_cost_retail NUMERIC(10,4) DEFAULT 0,
  total_cost_wholesale NUMERIC(10,4) DEFAULT 0,
  by_model JSONB DEFAULT '{}',            -- {"gpt-4o": {tokens: 1000, cost: 0.03}, ...}
  by_task_type JSONB DEFAULT '{}',        -- {"codegen": {tokens: 500, cost: 0.02}, ...}
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Счета (связаны со Stripe)
CREATE TABLE cloud_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES cloud_users(id),
  stripe_invoice_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,                   -- 'draft', 'open', 'paid', 'void'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API-ключи (пользователь может иметь несколько)
CREATE TABLE cloud_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES cloud_users(id),
  name TEXT NOT NULL DEFAULT 'default',
  key_prefix TEXT NOT NULL,               -- первые 8 символов (для отображения: 'ck_live_abcd****')
  key_hash TEXT NOT NULL,                 -- bcrypt hash полного ключа
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Связь Cloud ↔ TUI

```
TUI (SQLite, embedded)     ←→     Cloud (PostgreSQL, серверная)
─────────────────────────         ─────────────────────────────
sessions (локальные)               cloud_usage (запросы через прокси)
messages (локальные)               cloud_usage_monthly (агрегаты)
scan_results (локальные)           cloud_users (подписка, тариф)
memory_snapshots (локальные)       cloud_invoices (счета)
                                   cloud_api_keys (ключи)
```

SQLite остаётся для локального TUI (память, сессии). PostgreSQL — только для Cloud-сервиса (billing, usage, ключи).

---

## 5. Память проекта

`.complior/memory.json` — автообновление после каждого сканирования, фикса и сессии.

```json
{
  "project": "my-chatbot",
  "firstScan": "2026-02-16T10:30:00Z",
  "profile": {
    "framework": "nextjs",
    "aiTools": [{"id": "openai-gpt4o", "sdk": "vercel-ai-sdk"}],
    "jurisdictions": ["eu-ai-act"],
    "riskLevel": "limited",
    "applicableArticles": ["eu-50.1", "eu-50.2", "eu-12", "eu-4"]
  },
  "scoreHistory": [
    {"date": "2026-02-16", "score": 18, "event": "первичное сканирование"},
    {"date": "2026-02-16", "score": 72, "event": "авто-фикс 3 проблем"}
  ],
  "appliedFixes": [
    {"type": "disclosure", "file": "app/chat/page.tsx", "date": "2026-02-16"}
  ],
  "lastSession": {
    "summary": "Исправлены 3 критических проблемы. Score 72/100.",
    "pendingActions": ["ai-literacy", "compliance-md"]
  }
}
```

---

## 6. Порядок сборки (критический путь)

```
W-8:  БД регуляций         ← Парсинг EU AI Act в JSON
W-8:  Каталог AI-инструм.  ← Скрейпинг + LLM-классификация 2,000+ инструментов
W-7:  Паттерны обнаружения ← Генерация для топ-200 инструментов
W-7:  Генерация правил     ← Из БД регуляций + каталога инструментов
W-6:  Движок сканера       ← Использует БД регуляций + правила
W-6:  Инструменты кода     ← Использует каталог для авто-детекции
```

Базы данных ДОЛЖНЫ существовать ДО сканера. Сканер слеп без знания того, какие инструменты существуют и что требуют законы.
