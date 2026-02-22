# PRODUCT-BACKLOG.md — Complior v6 Open-Source

**Версия:** 6.0.0
**Дата:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Phase 0 — Утверждено

---

## 1. Обзор

Бэклог продукта для open-source части Complior v6 (TUI + Engine).

**Всего фич:** 134 (из 186 в Brainstorm v6.4)
**Проект:** Open-Source (MIT), репозиторий `complior`
**Стек:** Rust (TUI) + TypeScript (Engine)
**Агенты:** A = Engine (TS), B = TUI (Rust), C = Infra

### Что входит в Open-Source

| Область | Описание | Free/Paid |
|---------|----------|-----------|
| Wrapper-оркестратор | PTY subprocess, multi-agent tabs/splits | Free |
| Сканер + Gate | 19 checks, AST, real-time rescan (200мс) | Free |
| Auto-Fix | 6+ фиксеров + AI-фиксер через вложенного агента | Free |
| Матрица решений | 17 типов нарушений → конкретные решения | Free |
| Runtime Control | Генерация middleware (wrapper, logger, marker) | Free |
| База регуляций | EU AI Act JSON + мульти-юрисдикция (логика) | Free |
| AI Registry | 200 tools (offline бандл), детекция | Free |
| Отчёты | Dev report, COMPLIANCE.md, FRIA, tech docs | Free |
| Бейджи | Static SVG badge, dynamic GH Action badge | Free |
| Metadata | .well-known/ai-compliance.json стандарт | Free |
| Шаблоны | complior create (7 scaffolds) | Free |
| Интеграции | MCP, GH Action, VS Code, pre-commit | Free |
| Discovery (local) | Code scan, infra scan, agent configs | Free |
| Agent Governance (basic) | Registry, manifest, score, audit trail | Free |
| Remediation (local) | Single repo fix, policy gen, playbook | Free |
| Monitoring (basic) | Drift detection, pre-deploy gate | Free |

### Что НЕ входит (→ SaaS)

Org-wide scan, SaaS Discovery (IdP/CASB), Shadow AI, Dashboard, hosted Compliance Proxy, Audit PDF (clean), Certificate (QR), SSO, Enterprise API — всё в SaaS-проекте. См. `UNIFIED-ARCHITECTURE.md` §4.

---

## 2. Фичи по секциям

### A. Wrapper-ядро

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.001 | Wrapper-архитектура | Complior = хост-процесс, coding agent = гость (PTY subprocess). Наблюдение за файлами → compliance gate поверх любого агента. | B | S02 | B.1.01-08 (TUI каркас) |
| C.002 | Мульти-агент | Несколько agents одновременно в tabs или splits. Odelix + Claude Code рядом. Complior контролирует compliance ВСЕХ. | B | S03 | C.001 |
| C.003 | Agent registry | Список поддерживаемых агентов: odelix, claude-code, opencode, aider, goose, codex-cli, bash. Авто-определение установленных. | A+B | S02 | C.001 |
| C.004 | Agent auto-detect | При первом запуске Complior определяет какие agents установлены и предлагает. | A | S05 | C.003 |
| C.005 | Passthrough rendering | Agent рендерится 1:1 внутри панели Complior. Все горячие клавиши агента работают. Complior перехватывает только Ctrl+Shift+*. | B | S02 | C.001 |
| C.006 | Agent health monitoring | Если agent упал → restart. Если agent завис → timeout → kill + warning. | B | S03 | C.001 |
| C.007 | MCP server | Для GUI agents (Cursor, Windsurf, VS Code). 7+ compliance tools через MCP stdio. | C | S03 | C.012, C.021 |
| C.008 | Headless mode | CI/CD: `complior scan --ci` → exit 0/1, `--json` → JSON, `--sarif` → SARIF. Без TUI, без agent, только сканер. | C | S03 | C.012, C.015 |
| C.009 | Shared workspace | Все agents работают с одним проектом. Complior наблюдает за всеми изменениями из всех agents. | B | S02 | C.001 |
| C.010 | Agent-specific config | Разные правила для разных agents: строгий режим для Claude Code, мягкий для aider. | A+B | S05 | C.003 |

### B. Сканер + Compliance Gate

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.011 | Compliance Gate | Каждое изменение файла → фоновый ре-скан (200мс) → score update → toast notification при нарушении. | A | S02 | C.012, C.015, Watcher |
| C.012 | 19 проверок | disclosure, marking, logging, literacy, GPAI_basic, GPAI_full, metadata, documentation, risk_management, tech_safeguard, human_oversight, data_governance, accuracy, robustness, transparency, registration, post_market, incident_report, FRIA, cybersecurity. | A | S01 | C.030 (regulation DB) |
| C.013 | AST engine | Babel (JS/TS) + tree-sitter (Python/Go/Rust). Реальный анализ синтаксического дерева, не regex. | A | S01 | — |
| C.014 | Zero-config detection | Авто-определение фреймворка + AI SDK. Встроенные правила. Офлайн. Скан < 10 сек. | A | S01 | C.040 (AI registry) |
| C.015 | Scoring algorithm | Weighted formula: data sensitivity (40%) + severity (30%) + exposure (20%) + fix complexity (10%) → score 0-100. | A | S01 | C.012 |
| C.016 | Score 0-100 | Цветовая шкала: 0-39 RED, 40-69 AMBER, 70-84 YELLOW, 85-100 GREEN. | A+B | S01 | C.015 |
| C.017 | Sparkline тренд | История score за сессию/проект. | B | S04 | C.016 |
| C.018 | Инкрементальный скан | Только изменённые файлы (кэш AST). | A | S01 | C.013 |
| C.019 | Детерминистический результат | Один код → один score. LLM НИКОГДА не определяет compliance. | A | S01 | C.015 |
| C.020 | Dependency deep scan | Транзитивные AI зависимости: app → langchain → openai → model, вся цепочка. | A | S05 | C.042 |

### C. Auto-Fix

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.021 | 6+ авто-фиксеров | disclosure, marking, logging, documentation, metadata, FRIA. | A | S02 | C.012, C.030 |
| C.022 | AI-фиксер | Для сложных случаев: AI генерирует fix со ссылкой на конкретную статью закона. | A | S02 | C.021, LLM |
| C.023 | Diff preview | Preview перед фиксом — unified diff. | A | S02 | C.021 |
| C.024 | Batch fix | `/fix` → исправить ВСЕ одной командой. | A | S02 | C.021 |
| C.025 | Fix + git commit | Автоматический коммит: `fix: Art.50.1 disclosure — via Complior`. | A | S02 | C.021 |
| C.026 | Fix explanation | ПОЧЕМУ fix нужен, ЧТО говорит закон, КАКОЙ штраф. | A | S02 | C.021, C.030 |
| C.027 | Undo fix | Git revert для отмены фикса. | A | S05 | C.025 |
| C.028 | Custom fix templates | Компания задаёт свой стандарт disclosure/logging. | A | S05 | C.021 |
| C.029 | Progressive fix | Roadmap к score 100: "Неделя 1: disclosure. Неделя 2: logging. Неделя 3: docs". | A | S05 | C.015, C.021 |

### C+. Матрица решений — 17 нарушений

Для каждой проверки — конкретное решение. Complior НЕ пишет код сам — формирует промпт и передаёт вложенному агенту.

| # | Нарушение | Статья | Решение | Агент | Спринт |
|---|-----------|--------|---------|-------|--------|
| 1 | AI Disclosure (нет уведомления) | Art.50.1, CO §6-1702 | UI-компонент `<AiDisclosure>` + system prompt раскрытие | A | S02 |
| 2 | Content Marking (output не помечен) | Art.50.2 | Middleware wrapper: `{model, generated:true, timestamp}` + HTTP header + HTML attr | A | S02 |
| 3 | Interaction Logging (нет логов) | Art.12 | JSONL middleware: timestamp, userId (hash!), promptHash, model, responseLength | A | S02 |
| 4 | AI Literacy (нет обучения) | Art.4 | Training materials: docs/ai-literacy.md + checklist + запись тренинга | A | S03 |
| 5 | Documentation (нет техдокументации) | Art.11 | .complior/ структура: config.yaml, classification, COMPLIANCE.md | A | S02 |
| 6 | Compliance Metadata (нет метаданных) | Art.50.4 | Meta tags в `<head>` + HTTP header + .well-known/ai-compliance.json | A | S02 |
| 7 | GPAI Transparency (GPAI без документов) | Art.51-53 | Model cards, training data, capabilities & limitations | A | S03 |
| 8 | Risk Management (нет управления рисками) | Art.9 | risk-management-plan.md — 80% пре-заполнено из профиля проекта | A | S04 |
| 9 | Tech Safeguards (нет тех.гарантий) | Art.15 | Проверка: тесты, error handling, fallback, bias testing, drift monitoring | A | S04 |
| 10 | Human Oversight (нет контроля) | Art.14 | Проверка точек human approval, предложение паттернов | A | S05 |
| 11 | Data Governance (нет data gov) | Art.10 | data-governance.md + проверка .env на утечку API keys | A | S04 |
| 12 | Transparency (нет прозрачности) | Art.13 | transparency-notice.md + UI "About this AI" | A | S04 |
| 13 | EU DB Registration (нет регистрации) | Art.71 | Форма с пре-заполнением из профиля проекта | A | S04 |
| 14 | Post-Market Plan (нет плана) | Art.72 | post-market-plan.md: метрики, частота мониторинга | A | S04 |
| 15 | Incident Response (нет протокола) | Art.73 | incident-response.md: 72-часовое окно + шаблон уведомления | A | S04 |
| 16 | FRIA (нет оценки) | Art.27, CO SB205 | Fundamental Rights Impact Assessment — 80% из профиля, 20% пользователь | A | S04 |
| 17 | Opt-out Mechanism (нет opt-out) | CO §6-1703 | UI элемент opt-out + альтернативный flow (human decision) | A | S03 |

### C++. Runtime Control

Генерация middleware для production compliance. FREE = генерация кода, PAID = hosted proxy (SaaS).

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.R01 | AI Response Wrapper | `compliorWrap()` middleware: logging (Art.12) + metadata + header + watermark + content filter + cost tracking. | A | S05 | C.030 |
| C.R02 | Disclosure Injection | Авто-добавление к каждому AI response: "Этот ответ создан с помощью AI (GPT-4o)". Настраиваемый формат/позиция/стиль. | A | S05 | C.R01 |
| C.R03 | Content Marking Engine | Маркировка AI-контента: HTML attrs, C2PA metadata (изображения), Unicode zero-width watermark (текст), JSON API metadata. | A | S05 | C.R01 |
| C.R04 | Interaction Logger | JSONL (Art.12): timestamp, userId hash, promptHash, model, provider, responseLength, latency. Retention: 30/90/365 дней. | A | S05 | C.R01 |
| C.R05 | Deepfake Guard | Art.50.4: AI-голос (ElevenLabs, PlayHT) → маркировка. AI-изображение (DALL-E) → C2PA metadata. AI-видео → watermark. | A | S06 | C.R03 |
| C.R06 | Compliance Proxy (config) | Генерация конфигурации HTTP proxy: App → Proxy → AI API. Logging + Marking + Filtering. Без изменения кода — только base_url. | A | S05 | C.R01, C.R04 |
| C.R07 | Output Safety Filter | PII leakage (email/phone/SSN → block/mask), harmful content → block, bias detection → flag, hallucination flag. Режимы: block/warn/log. | A | S05 | C.R01 |
| C.R08 | Human-in-the-Loop Gate | Art.14 для HIGH-RISK: AI decision → queue → human review → approve/reject. Паттерн генерация. | A | S05 | C.030 |
| C.R09 | SDK Adapters | Drop-in wrappers: @complior/openai, @complior/anthropic, @complior/vercel-ai, @complior/langchain, @complior/llamaindex. | A | S05 | C.R01 |
| C.R11 | Compliance Audit Trail (local) | Immutable local log (SQLite WAL). Каждый AI call записан с hash. Невозможно удалить. Экспорт PDF/CSV. | A | S05 | C.R04 |

**Примечание:** C.R10 (Runtime Dashboard) — SaaS only (S09 SaaS).

### D. База регуляций

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.030 | EU AI Act JSON-база | Полная структурированная JSON-база: 108 обязательств, 34 статьи, 5 Annexes, штрафы, дедлайны, plain-English, code implications. | A | S01 | — |
| C.031 | Мульти-юрисдикция | Colorado SB 205 (S03), Texas TRAIGA + California AB 2885 + South Korea (S06), UK + Japan + Canada + Brazil (S10). | A | S03/S06/S10 | C.030 |
| C.032 | Regulation Timeline + countdown | Визуальный таймлайн дедлайнов в UI: дни до/после enforcement. | B | S04 | C.030 |
| C.033 | Regulation Diff | Что изменилось при обновлении закона — diff для разработчика. | A | S08 | C.030 |
| C.034 | Regulation Search | Поиск по статьям и ключевым словам. | A | S02 | C.030 |
| C.035 | AI Regulation Explainer | AI объясняет статью простым языком с примерами кода. | A | S02 | C.030, LLM |
| C.036 | Penalty Calculator | Оборот компании → максимальный штраф (до €35M или 7%). | A | S04 | C.030 |
| C.038 | Cross-reference | Связанные статьи: если нарушена Art.50.1, смотри также Art.50.2, Art.12. | A | S03 | C.030 |
| C.039 | Regulation Simulator | "Что если выйду на рынок Кореи?" — пересчёт score для новой юрисдикции. | A | S04 | C.031 |

**Примечание:** C.037 (Regulation API) — SaaS only (S07 SaaS).

### E. AI Registry

| ID | Фича | Описание | Агент | Спринт | Зависимости | Кросс-SaaS |
|----|-------|---------|-------|--------|-------------|------------|
| C.040 | 2000+ AI tools | Offline бандл ~530KB: provider, risk_level, detection patterns, compliance status. Top 200 при запуске, 2000+ к S10. | A | S01 | — | SaaS S7: расширение до 2477+ через API |
| C.041 | Risk classification engine | Авто-классификация Annex III по использованию: HR→high, content→limited и т.д. | A | S01 | C.030, C.040 |
| C.042 | Detection patterns | Паттерны для каждого SDK: npm imports, pip packages, env vars, API calls. | A | S01 | C.040 |
| C.043 | Dependency chain scan | Транзитивные AI зависимости: app → langchain → openai → model. | A | S05 | C.042 |

**Примечание:** C.044 (Compliant alternatives), C.045 (AI Tool Leaderboard), C.046 (Tool Watch) — SaaS only.

### F. Универсальный сканер

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.047 | Mode A: Local | Сканирование своего проекта (default mode). | A | S01 | C.012, C.013 |
| C.051 | Mode E: Supply Chain (partial) | Dependency tree scan — AI зависимости в node_modules/pip. | A | S05 | C.042, C.043 |
| C.052 | Mode F: Docker | Сканирование container image на AI-зависимости (local image only). | A | S07 | C.042 |

**Примечание:** C.048 (GitHub), C.049 (Website), C.050 (LLM Model), C.053 (API endpoint), C.054 (Scheduled scan) — SaaS only.

### G. Отчёты

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.055 | Dev report (терминал) | Отчёт в терминале: score, checks, findings, recommendations. | A | S03 | C.012, C.015 |
| C.056 | Audit PDF (watermark) | Профессиональный PDF (@react-pdf/renderer). Free = с watermark "Generated by Complior". | A | S03 | C.055 |
| C.057 | COMPLIANCE.md | Файл в репо: "Generated by Complior (complior.ai)". Авто-обновляется при скане. | A | S03 | C.012 |
| C.058 | FRIA Generator | 80% пре-заполнено из профиля проекта. Fundamental Rights Impact Assessment (Art.27). | A | S04 | C.030, C.012 |
| C.059 | Technical Documentation | Art.11: техническая документация AI-системы — архитектура, модели, данные, ограничения. | A | S04 | C.030 |
| C.060 | Data Practice Documentation | Art.10: источники данных, bias testing, preprocessing, quality. | A | S04 | C.030 |
| C.061 | Risk Management System Doc | Art.9: идентификация рисков, митигация, мониторинг, residual risk. | A | S04 | C.030 |
| C.062 | Human Oversight Plan | Art.14: план human oversight — review points, override, kill switch. | A | S05 | C.030 |
| C.064 | Post-Market Monitoring Plan | Art.72: план мониторинга после запуска — метрики, частота, ответственные. | A | S04 | C.030 |
| C.065 | Incident Response Protocol | Art.73: 72-часовое окно для уведомления регулятора + шаблон уведомления. | A | S04 | C.030 |

**Примечание:** C.063 (Conformity Assessment Helper), C.066 (EU DB Registration Helper), C.067 (Export to legal templates) — SaaS only.

### H. Бейджи

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.068 | Compliance Badge SVG | Верифицируемый static badge как Snyk. Score + статус + юрисдикция. | C | S03 | C.015 |
| C.072 | Dynamic badge (GH Action) | Обновляется при каждом push — GitHub Action генерирует badge. | C | S03 | C.068, C.083 |
| C.073 | Badge for npm/PyPI | Badge на странице пакета. | C | S05 | C.068 |

**Примечание:** C.069 (Badge API), C.070 (Certificate QR), C.071 (Verified Badge) — SaaS only.

### I. Metadata стандарт

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.074 | .well-known/ai-compliance.json | Открытый стандарт: машиночитаемая compliance декларация. | C | S03 | C.012 |
| C.075 | Meta tags | `<meta name="ai-compliance" content="...">` в HTML. | A | S03 | C.074 |
| C.076 | HTTP headers | `X-AI-Compliance` заголовок в ответах сервера. | A | S03 | C.074 |
| C.077 | Compliance Manifest в package.json | `"complior"` секция в package.json: score, status, jurisdictions. | A | S03 | C.074 |
| C.078 | Auto-inject | Сканер проверяет наличие metadata + auto-fix вставляет. | A | S03 | C.074, C.021 |

### J. Шаблоны

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.079 | complior create | 7 scaffolds (Next.js, Express, FastAPI, LangChain, CrewAI, Haystack, Django), score 85+ с первой строки. | A | S05 | C.012, C.021 |
| C.080 | Framework adapters | Адаптеры для интеграции compliance в существующие фреймворки. | A | S05 | C.079 |
| C.081 | Compliance-first starter kit | Полный starter project с compliance из коробки. | C | S05 | C.079 |

### K. Интеграции

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.082 | MCP Server | 7+ tools для Claude/Cursor/OpenCode/Windsurf через MCP stdio. | C | S03 | C.012, C.021 |
| C.083 | GitHub Action | PR → scan → comment с findings + score + badge. | C | S03 | C.008 |
| C.084 | VS Code Extension | Inline warnings, quick fix, sidebar score. | C | S06 | Server API |
| C.085 | JetBrains Plugin | IntelliJ/PyCharm — аналогично VS Code. | C | S06 | Server API |
| C.086 | Pre-commit hook | Блок коммита если score < threshold. | C | S03 | C.008 |
| C.087 | Vercel Plugin | Блок deploy при low compliance score. | C | S06 | C.008 |
| C.088 | npm/PyPI pre-publish | Проверка перед публикацией пакета. | C | S05 | C.008 |
| C.090 | Odelix native | Первый wrapper agent, тесная интеграция с PTY manager. | C | S02 | C.001 |

**Примечание:** C.089 (Slack/Discord bot) — SaaS only.

### M. Growth + контент (open-source часть)

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.107 | VulnerAI demo repo | Intentionally non-compliant Next.js app для демонстрации Complior. | C | S04 | C.012, C.021 |

**Примечание:** C.101-C.106 — SaaS only (marketing/content).

### N. Moonshots (open-source часть)

| ID | Фича | Описание | Агент | Спринт | Зависимости |
|----|-------|---------|-------|--------|-------------|
| C.108 | Compliance-as-Code | `.complior.yaml`: rules, threshold, auto-fix, юрисдикции. Декларативная конфигурация. | A | S09 | C.012, C.031 |
| C.110 | Regulation Simulator | "Что если выйду на рынок UK?" — пересчёт score, новые требования. Аналог C.039. | A | S04 | C.031 |
| C.111 | Compliance Diff between jurisdictions | Сравнение требований EU vs Colorado vs Korea — таблица различий. | A | S06 | C.031 |
| C.118 | Cross-product Bundle | Odelix + Complior: один install, единый experience. | C | S10 | C.090 |

**Примечание:** C.109, C.112-C.117, C.119, C.120 — SaaS/Future.

### O. Discovery (local часть)

| ID | Фича | Описание | Агент | Спринт | Зависимости | Кросс-SaaS |
|----|-------|---------|-------|--------|-------------|------------|
| C.F01 | AI System Inventory (local) | Реестр AI-систем текущего проекта: имя, тип, модель, risk level, score. TUI-команда `/register`. | A | S04 | C.012, C.042 | SaaS S8: org-wide Dashboard |
| C.F02 | Codebase Scan (расширение) | AST-scan текущего репо: AI SDK imports, API calls, model configs, system prompts, agent definitions. | A | S01 | C.013, C.042 | SaaS S8: all repos через GH/GL API |
| C.F03 | Infrastructure Scan (local) | Парсинг Dockerfile, docker-compose, k8s manifests, Terraform/Pulumi: обнаружение AI-сервисов в infra файлах. | A | S04 | C.042 | SaaS S8: remote cluster |
| C.F06 | Agent & Workflow Discovery (local) | Scan конфигов: crewai.yaml, autogen configs, langgraph, n8n workflow JSONs, Make/Zapier exports. Для каждого: модель, tools, scope, oversight, logging. | A | S04 | C.042, C.F01 | SaaS S8: org-wide |
| C.F10 | Embedded AI Detection (code) | Глубокий AST-scan + heuristics: рекомендательные системы, ML inference calls, feature stores, embedding lookups. | A | S05 | C.013 | SaaS S9: runtime мониторинг |
| C.F11 | Supply Chain AI Map (deps) | Dependency tree: мой продукт → Stripe (AI fraud) → AWS → OpenAI. Для каждого уровня: compliance status, DPA. | A | S05 | C.042, C.043 | SaaS S8: full map |

**Примечание:** C.F04 (SaaS Discovery via IdP), C.F05 (API Traffic), C.F07 (Bot Discovery), C.F08 (Shadow AI), C.F09 (ML Registry), C.F12 (Cross-System Map) — SaaS only.

### P. Agent Governance (basic — open-source часть)

| ID | Фича | Описание | Агент | Спринт | Зависимости | Кросс-SaaS |
|----|-------|---------|-------|--------|-------------|------------|
| C.F13 | Agent Registry | Центральный реестр AI agents: авто-discovery + ручная регистрация. TUI: `/agents list`. | A | S06 | C.F06 | SaaS S8: full Dashboard UI |
| C.F14 | Agent Compliance Score | Score 0-100 для каждого агента: disclosure (25) + logging (20) + oversight (20) + scope_control (15) + documentation (10) + data_governance (10). | A | S06 | C.F13, C.015 | SaaS S8: org-wide |
| C.F15 | Agent Permissions Matrix (yaml) | agent-compliance.yaml: RBAC-таблица для AI agents. HIGH-RISK agent НЕ МОЖЕТ принимать решение без human. Complior валидирует. | A | S06 | C.F13 | SaaS S9: Dashboard UI |
| C.F16 | Agent Audit Trail (local) | Immutable лог (SQLite WAL): who_triggered, agent_name, action, input_hash, output_hash, decision, human_approved, timestamp. | A | S06 | C.F13 | SaaS S9: centralized |
| C.F18 | Agent Compliance Manifest | Генерация + scan `agent-compliance.yaml`: name, purpose, model, risk_level, permissions[], restrictions[], disclosure_text, owner, data_handling. | A | S06 | C.F13 | — |
| C.F20 | Agent Kill Switch (CLI) | `complior agent kill <name>` → SIGTERM → graceful shutdown → SIGKILL → audit entry → notification. Quarantine: нельзя перезапустить без re-review. | A+B | S09 | C.F13 | SaaS S9: Dashboard button |
| C.F21 | Agent Sandbox (Docker) | Docker sandbox + synthetic data + compliance test suite. `complior agent test` → pass/fail + score + issues. | A+B | S09 | C.F13 | SaaS S09: management UI |
| C.F22 | Agent Policy Templates | Готовые политики по индустриям: Healthcare, FinTech, HR, Legal, General. `complior policy generate`. | A | S06 | C.F13, C.030 | — |

**Примечание:** C.F17 (Agent Lifecycle Management), C.F19 (Cross-Agent Compliance) — SaaS only (требуют workflow engine и org-wide visibility).

### Q. Remediation (local часть)

| ID | Фича | Описание | Агент | Спринт | Зависимости | Кросс-SaaS |
|----|-------|---------|-------|--------|-------------|------------|
| C.F23 | Code Fix (single repo) | Авто-fix текущего репо через вложенного агента: сформировать промпт → агент исправляет → перепроверка → commit/PR. | A | S02 | C.021 | SaaS S8: org-wide batch |
| C.F25 | Infrastructure Remediation | Генерация: Terraform modules с compliance controls, K8s admission webhooks, Docker policies, Helm overlays. | A | S07 | C.F03 | — |
| C.F27 | Agent Remediation | Приоритизированный план для non-compliant агента: 1. disclosure (2h), 2. logging (1h), 3. human gate (4h). Может передать агенту. | A | S06 | C.F13, C.F14 | — |
| C.F28 | Shadow AI Policy (doc gen) | Генерация: "Acceptable AI Use Policy" + training materials + правила (что можно, что нельзя). | A | S06 | C.030 | SaaS S9: CASB enforcement |
| C.F29 | ML Model Compliance Kit (gen) | Для каждой модели: model card generation, bias testing pipeline config, drift monitoring setup, documentation. | A | S07 | C.F01 | SaaS S9: monitoring |
| C.F30 | Compliance Playbook (single) | 90-дневный план для одного проекта: приоритизация по risk → timeline → effort estimate → milestones. MD/PDF. | A | S07 | C.012, C.015, C.F01 | SaaS S09: org-wide |

**Примечание:** C.F24 (SaaS Vendor Assessment), C.F26 (hosted Compliance Proxy) — SaaS only.

### R. Continuous Monitoring (basic — open-source часть)

| ID | Фича | Описание | Агент | Спринт | Зависимости | Кросс-SaaS |
|----|-------|---------|-------|--------|-------------|------------|
| C.F31 | Compliance Drift Detection | При каждом скане → сравнение с предыдущим → diff: какие файлы/агенты изменились, какие checks сменили статус. Alert если drop >10. | A+B | S08 | C.012, C.015 | SaaS S9: continuous |
| C.F32 | Regulation Change Monitoring | Notification при запуске: "Digital Omnibus принят. 3 проверки затронуты." | A | S08 | C.030, C.031 | SaaS S9: real-time alerts |
| C.F36 | Pre-deployment Gate | `complior scan --ci --threshold 80` → deploy blocked если score < threshold. | C | S03 | C.008 | SaaS S09: webhook management |

**Примечание:** C.F33 (Anomaly Detection), C.F34 (Scheduled Reporting), C.F35 (Compliance SLA), C.F37 (Incident Detection), C.F38 (Vendor Monitoring) — SaaS only.

---

## 3. Инфраструктурные задачи (без Feature ID)

Задачи из ROADMAP-v6 которые не имеют Feature ID в Brainstorm, но необходимы для реализации:

### TUI Framework (Агент B, S01)

| Task | Описание | Спринт |
|------|---------|--------|
| B.1.01 | Rust workspace: complior-tui crate | S01 |
| B.1.02 | Ratatui init: terminal setup, event loop, crossterm | S01 |
| B.1.03 | Layout engine: настраиваемые панели (split ratios) | S01 |
| B.1.04 | Chat widget: текстовый ввод, курсор, прокрутка, Markdown render | S01 |
| B.1.05 | HTTP client: reqwest → engine API (POST/GET/SSE) | S01 |
| B.1.06 | SSE parser: потоковый приём LLM токенов | S01 |
| B.1.07 | Statusbar widget: score, model, cost, mode, agent name | S01 |
| B.1.08 | Базовая Vim + Standard навигация | S01 |

### TUI Wrapper (Агент B, S02)

| Task | Описание | Спринт |
|------|---------|--------|
| B.2.01 | PTY manager: запуск guest agent как subprocess | S02 |
| B.2.02 | PTY rendering: passthrough agent output | S02 |
| B.2.03 | Input routing: клавиши → agent, Ctrl+Shift+* → Complior | S02 |
| B.2.04 | Agent registry widget | S02 |
| B.2.05 | Compliance Panel (sidebar) | S02 |
| B.2.06 | Score gauge widget: RED/AMBER/YELLOW/GREEN | S02 |
| B.2.07 | Checks list widget: ✓/✗/~ + [Fix] кнопки | S02 |
| B.2.08 | Deadline countdown widget | S02 |
| B.2.09 | Toast notifications | S02 |
| B.2.10 | Пресет «Dashboard» | S02 |
| B.2.11 | Пресет «Focus» | S02 |
| B.2.12 | Slash commands: /scan, /fix, /status, /explain, /report, /help | S02 |

### TUI Themes + Multi-agent (Агент B, S03)

| Task | Описание | Спринт |
|------|---------|--------|
| B.3.01 | Theme engine: TOML themes, hot reload | S03 |
| B.3.02 | 20+ встроенных тем | S03 |
| B.3.03 | Compliance-specific цвета | S03 |
| B.3.04 | Прозрачность, стили рамок, Nerd Font иконки | S03 |
| B.3.05 | Multi-agent tabs: Ctrl+1/2/3 | S03 |
| B.3.06 | Multi-agent splits: Ctrl+Shift+V/H | S03 |
| B.3.07 | [+Add Agent] widget | S03 |
| B.3.08 | Agent health: restart + warning | S03 |
| B.3.09 | Пресет «Multi» | S03 |
| B.3.10 | Пресет «Compliance Only» | S03 |
| B.3.11 | Полная config.toml | S03 |
| B.3.12 | Dashboard bottom panel: sparkline + activity log | S03 |

### TUI Polish (Агент B, S04)

| Task | Описание | Спринт |
|------|---------|--------|
| B.4.01 | Onboarding UI: wizard | S04 |
| B.4.02 | Анимированный score gauge | S04 |
| B.4.03 | Плавный streaming LLM output | S04 |
| B.4.04 | Score History sparkline (ratatui chart) | S04 |
| B.4.05 | Activity Log с цветными иконками | S04 |
| B.4.06 | Deadline timeline (visual) | S04 |
| B.4.07 | Splash screen: ASCII сова | S04 |
| B.4.08 | /screenshot → export PNG | S04 |

### Engine Server (Агент A, S02)

| Task | Описание | Спринт |
|------|---------|--------|
| A.2.01 | Hono HTTP server: /scan, /fix/preview, /fix/apply, /status, /classify | S02 |
| A.2.02 | SSE endpoint: POST /chat → LLM streaming | S02 |
| A.2.06 | LLM integration: Vercel AI SDK, multi-provider | S02 |
| A.2.07 | Multi-model routing | S02 |
| A.2.08 | 15 LLM tool definitions | S02 |
| A.2.09 | Deterministic core | S02 |
| A.2.10 | Legal disclaimer | S02 |
| A.2.11 | Memory Level 1: .complior/memory.json | S02 |
| A.2.12 | Memory Level 2: session context | S02 |
| A.2.13 | Memory Level 3: on-demand knowledge | S02 |
| A.2.14 | File watcher: chokidar → rescan | S02 |

### Infra (Агент C, S01-S04)

| Task | Описание | Спринт |
|------|---------|--------|
| C.1.01 | GitHub repo: complior (монорепо) | S01 |
| C.1.02 | CI/CD: GitHub Actions (Rust + TS) | S01 |
| C.1.03 | Кросс-компиляция Rust: Linux/macOS/Windows × x86_64/aarch64 | S01 |
| C.1.04 | TS Engine packaging: Bun bundle / Node | S01 |
| C.1.05 | Dev environment: docker-compose | S01 |
| C.1.06 | Shared types: TS interfaces → Rust structs (codegen) | S01 |
| C.2.01 | npm publish: npx complior | S02 |
| C.2.02 | Install script: curl \| sh | S02 |
| C.2.03 | Homebrew formula, Scoop manifest | S02 |
| C.2.04 | Landing page: complior.ai (basic) | S02 |
| C.2.05 | README: demo GIF, quickstart | S02 |
| C.4.01 | Landing page: полная | S04 |
| C.4.02 | "State of AI Compliance 2026" report | S04 |
| C.4.04 | Product Hunt + Hacker News prep | S04 |
| C.4.05 | Social media: demo GIFs | S04 |
| C.4.06 | Outreach: scan 50 public projects | S04 |

---

## 4. Распределение по спринтам

### S01 (неделя 1-2): Базы данных + Scanner core

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.030 (EU AI Act DB), C.040 (AI Registry), C.042 (Detection patterns), C.041 (Risk classification), C.012 (19 checks), C.013 (AST engine), C.015 (Scoring), C.014 (Zero-config), C.016 (Score), C.018 (Incremental), C.019 (Deterministic), C.047 (Local scan), C.F02 |
| **B (TUI)** | B.1.01-B.1.08 (Rust каркас, layout, chat, HTTP, SSE, statusbar, навигация) |
| **C (Infra)** | C.1.01-C.1.06 (монорепо, CI/CD, кросс-компиляция, packaging, dev env, shared types) |

### S02 (неделя 3-4): Wrapper + Fixer + LLM

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | A.2.01-A.2.14 (Hono server, SSE, LLM, memory, watcher), C.021-C.026 (6 fixers + AI fixer + diff + batch + commit + explanation), C.011 (Compliance Gate), C.034-C.035 (Regulation search + explainer), C.F23 |
| **B (TUI)** | C.001 (Wrapper), C.005 (Passthrough), C.003 (Agent registry), C.009 (Shared workspace), B.2.01-B.2.12 (PTY, panels, gauges, toasts, presets, commands) |
| **C (Infra)** | C.090 (Odelix native), C.2.01-C.2.05 (npm, install, Homebrew, landing, README) |

### S03 (неделя 5-6): Themes + Reports + Multi-jurisdiction

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.055-C.057 (Dev report, Audit PDF, COMPLIANCE.md), C.031 (Colorado SB 205), C.038 (Cross-reference), A.3.07-A.3.10 (Onboarding, profile, cost tracking, proactive) |
| **B (TUI)** | C.002 (Multi-agent), C.006 (Agent health), B.3.01-B.3.12 (Themes, multi-agent tabs/splits, presets Multi + Compliance Only, config.toml, dashboard panel) |
| **C (Infra)** | C.007 (MCP server), C.082 (MCP), C.008 (Headless), C.083 (GH Action), C.086 (Pre-commit), C.068 (Badge SVG), C.072 (Dynamic badge), C.074-C.078 (Metadata стандарт), C.F36 (Pre-deployment gate) |

### S04 (неделя 7-8): Полировка + Запуск

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.058-C.061 (FRIA, Tech docs, Data Practice, Risk Mgmt), C.064-C.065 (Post-Market, Incident Response), C.036 (Penalty Calculator), C.039/C.110 (Regulation Simulator), C.032 (Timeline), C.F01 (AI System Inventory), C.F03 (Infra scan), C.F06 (Agent discovery) |
| **B (TUI)** | C.017 (Sparkline), B.4.01-B.4.08 (Onboarding, animations, streaming, sparkline, activity log, deadline, splash, screenshot) |
| **C (Infra)** | C.107 (VulnerAI demo), C.4.01-C.4.06 (Landing, report, PH/HN, social, outreach) |

### S05 (месяц 1-2): Runtime Control + Templates

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.R01-C.R04 (Wrapper, Disclosure, Marking, Logger), C.R06-C.R09 (Proxy config, Safety filter, HITL gate, SDK adapters), C.R11 (Local audit trail), C.020 (Dependency deep scan), C.027-C.029 (Undo, Custom templates, Progressive fix), C.043 (Dependency chain), C.051 (Supply chain partial), C.F10 (Embedded AI), C.F11 (Supply chain map), C.004 (Agent auto-detect), C.010 (Agent-specific config) |
| **B (TUI)** | B.5.01-B.5.06 (Theme gallery, import, keybindings, auto-detect, findings detail, fix preview) |
| **C (Infra)** | C.079-C.081 (Templates, Framework adapters, Starter kit), C.073 (npm/PyPI badge), C.088 (npm/PyPI pre-publish), C.5.01-C.5.05 (Community rules, SDK packages, SEO) |

### S06 (месяц 2-3): Agent Governance + VS Code

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.F13-C.F16 (Agent Registry, Score, Permissions, Audit Trail), C.F18 (Manifest), C.F22 (Policy Templates), C.F27 (Agent Remediation), C.F28 (Shadow AI Policy), C.R05 (Deepfake Guard), C.111 (Compliance Diff), C.031 (TX+CA+KR jurisdictions), C.062 (Human Oversight Plan) |
| **B (TUI)** | B.6.01-B.6.05 (/agents command, agent detail view, playbook view, export, Emacs) |
| **C (Infra)** | C.084 (VS Code), C.085 (JetBrains), C.087 (Vercel Plugin), C.6.04-C.6.05 (SEO 500, countdown content) |

### S07 (месяц 3-4): Infrastructure + Remediation

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.052 (Docker scan), C.F25 (Infra Remediation), C.F29 (ML Model Compliance Kit), C.F30 (Compliance Playbook) |
| **B (TUI)** | Bug fixes, UX polish, performance optimization |
| **C (Infra)** | — |

### S08 (месяц 4-5): Monitoring + Drift

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.F31 (Drift Detection), C.F32 (Regulation Change Monitoring), C.033 (Regulation Diff) |
| **B (TUI)** | B.8.01-B.8.03 (Drift notif, /news, /vendor) |
| **C (Infra)** | — |

### S09 (месяц 5-6): Agent Sandbox + Kill Switch

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.F20 (Agent Kill Switch), C.F21 (Agent Sandbox), C.108 (Compliance-as-Code) |
| **B (TUI)** | B.9.01-B.9.03 (Sandbox UI, kill command, playbook generator) |
| **C (Infra)** | — |

### S10 (месяц 6+): International + Scale

| Агент | Задачи |
|-------|--------|
| **A (Engine)** | C.031 (UK+JP+CA+BR jurisdictions), C.040 (2000 tools complete) |
| **B (TUI)** | B.10.01-B.10.03 (Multi-lang UI, plugin system WASM, adaptive themes) |
| **C (Infra)** | C.118 (Odelix + Complior bundle) |

---

## 5. Кросс-проектные зависимости (Open-Source → SaaS)

| Фича OS | Спринт OS | Фича SaaS | Спринт SaaS | Тип | Описание |
|---------|-----------|-----------|-------------|-----|---------|
| C.040 (AI Registry) | S01 | F26 (Registry API) | S7 | **Жёсткая** | Shared types нужны ДО разработки API. Фиксируем Day 1 |
| C.012 (Scanner) | S01 | F26 (Registry API) | S7 | Мягкая | API обогащает данные сканера, но сканер работает offline |
| C.082 (MCP) | S03 | F26 (Registry API) | S7 | Мягкая | MCP tools могут тянуть данные из SaaS API, но работают и без |
| C.F13 (Agent Registry) | S06 | F29 (Agent Registry UI) | S8 | Средняя | Dashboard показывает данные из Engine. Dashboard может начать с mock data |
| C.F31 (Drift) | S08 | F31 (Monitoring) | S9 | Средняя | SaaS мониторинг использует drift engine из OS |
| C.F20 (Kill Switch CLI) | S09 | F32 (Enterprise) | S9 | Мягкая | SaaS добавляет Dashboard button поверх CLI |

---

## 6. Метрики

```
Всего фич в OS бэклоге:           134
  Секция A (Wrapper):                10
  Секция B (Сканер):                 10
  Секция C (Auto-Fix):               9
  Секция C+ (Матрица решений):       17
  Секция C++ (Runtime Control):      10 (C.R10 → SaaS)
  Секция D (Регуляции):              9 (C.037 → SaaS)
  Секция E (AI Registry):            4 (C.044-046 → SaaS)
  Секция F (Универсальный сканер):   3 (C.048-050,053,054 → SaaS)
  Секция G (Отчёты):                10 (C.063,066,067 → SaaS)
  Секция H (Бейджи):                 3 (C.069-071 → SaaS)
  Секция I (Metadata):               5
  Секция J (Шаблоны):                3
  Секция K (Интеграции):             8 (C.089 → SaaS)
  Секция M (Growth):                 1 (C.101-106 → SaaS)
  Секция N (Moonshots):              4 (9 → SaaS/Future)
  Секция O (Discovery):              6 (6 → SaaS)
  Секция P (Agent Governance):       8 (2 → SaaS)
  Секция Q (Remediation):            6 (2 → SaaS)
  Секция R (Monitoring):             3 (5 → SaaS)
  Инфраструктурные задачи:          ~55

Фич до запуска (S01-S04):          ~75
Фич после запуска (S05-S10):       ~59
Инфраструктурных задач:            ~55

Юрисдикций при запуске:             2 (EU + Colorado)
Юрисдикций к S10:                  10+
AI Tools при запуске:              200 (offline бандл)
AI Tools к S10:                    2000+
```

---

**Обновлено:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
