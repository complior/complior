# PRODUCT-BACKLOG-SaaS.md -- Complior v9 SaaS Dashboard

**Версия:** 9.0.0
**Дата:** 2026-03-06
**Статус:** Draft -- требует утверждения PO
**Основание:** EU AI Act 108 obligations, ISO 42001, SaaS v7.1 бэклог (66 фич), unified PRODUCT-BACKLOG v9 (202 фичи)
**Репозиторий:** `ai-act-compliance-platform` (отдельный от CLI)

> **Этот документ** -- SaaS-часть единого бэклога Complior v9. Описывает только проприетарный SaaS Dashboard (Next.js 14 + Fastify 5 + PostgreSQL 16). Open-source фичи (Engine, CLI/TUI, SDK, MCP Server, Guard API) описаны в `PRODUCT-BACKLOG.md`.

---

## 1. Статус проекта SaaS

### 1.1 Что сделано

| Метрика | Значение |
|---------|----------|
| Спринтов завершено | 13 (S0--S8.5) |
| Story Points (выполнено / всего) | 424 / 429 SP |
| Фич реализовано | ~15 из ~65 |
| Таблиц в БД | 39 |
| Тестов (backend + frontend) | 554 |
| API эндпоинтов | 80+ |
| Bounded Contexts | 10 |

### 1.2 Что планируется

| Спринт | Цель | Фич | Приоритет |
|--------|------|-----|-----------|
| S9 | Реестр + Выходные документы + Регулятор | ~17 | CRITICAL / HIGH |
| S10 | Полная платформа (инциденты, мониторинг, i18n) | ~14 | HIGH / MEDIUM |
| S11+ | Расширение (wizard для SMB, мультиворкспейс, маркетплейс) | ~6 | HIGH / LOW |

### 1.3 Дедлайн

**2 августа 2026** -- полное применение EU AI Act для high-risk AI систем. Осталось **~149 дней**.

Штрафы:
- Запрещённые системы (ст. 5): до **35 млн EUR** или 7% мирового оборота
- High-risk нарушения (ст. 6-49): до **15 млн EUR** или 3%
- Прочие нарушения: до **7.5 млн EUR** или 1.5%

---

## 2. Тарифы и фичи

### 2.1 Тарифная сетка

> **Изменение в v9:** 3-тарифная модель. CLI-Scanner — бесплатно навсегда. Scale (EUR 399) убран — Enterprise теперь с фиксированной ценой.

| Тариф | Цена | Для кого | AI-систем | Пользователей | LLM |
|-------|------|----------|-----------|---------------|-----|
| **Starter (€0)** | EUR 0 | Разработчики, стартапы | до 3 | 1 | -- |
| **Growth (€149/мес)** | EUR 149/мес | B2B SaaS, средний бизнес | Неограниченные | до 10 | Hosted Mistral (50 запросов/мес) |
| **Enterprise (€499/мес)** | EUR 499/мес | Крупный бизнес, консультанты, регуляторы | Неограниченные | Неограниченные + SSO | Self-hosted LLM, SLA, Multi-Workspace, API |
| **CLI-Scanner** | EUR 0 (навсегда) | Все разработчики | -- | -- | -- (локально) |

### 2.2 Матрица фич по тарифам

| Фича | Starter (€0) | Growth (€149/мес) | Enterprise (€499/мес) |
|------|--------------|-------------------|----------------------|
| **Dashboard** базовый (score, donut, penalties) | V | V | V |
| **Dashboard v2** (карта связей, тренды, role-based) | -- | V | V |
| **AI Tool Inventory** (12 demo / 5011+ каталог) | 12 demo | 5011+ | 5011+ |
| **Реестр AI систем** (CLI + SaaS unified) | до 3 KI-систем | Неограниченные | Неограниченные |
| **Классификация рисков** (Prohibited/High/Limited/Minimal) | Базовый обзор комплаенса | Полный аудит | Полный аудит |
| **Gap Analysis** (12 категорий AESIA) | Базовый | Полный | Полный |
| **FRIA генератор** (wizard, 80% из Passport) | 1 отчёт/мес | Unlimited | Unlimited |
| **Compliance документы** (5 типов: Policy, QMS, Risk, Monitoring, Worker) | 1 отчёт/мес | Все типы | Все типы |
| **Audit Package** (one-click ZIP) | -- | V | V |
| **AESIA экспорт** (12 Excel) | -- | V | V |
| **Таймлайн compliance** (критический путь) | -- | V | V |
| **CLI Sync** (Passport + Scan + Doc) | -- | V | V |
| **Compliance Badge** (L1 self-assessed / L2 verified) | L1 | L1 | L1+L2 |
| **EU Database Helper** (Art.49, ~40 полей) | -- | V | V |
| **Wizard регистрации AI** (шаги 3-5) | -- | V | V |
| **QMS / Risk Plan / Monitoring Plan wizards** | -- | V | V |
| **Запрос документации у вендора** (Art.13/26) | -- | V | V |
| **Справочник регуляторов** (27 EU + 3 EEA) | -- | V | V |
| **Eva AI-ассистент** (чат-бот, tool calling) | -- | V | V |
| **ISO 42001 Readiness Dashboard** | -- | V | V |
| **Cert Readiness Dashboard** (AIUC-1 + ISO 42001) | -- | V | V |
| **Управление инцидентами** (полный цикл, Art.73) | -- | V | V |
| **Мониторинг реального времени** (drift, anomalies) | -- | V | V |
| **Предиктивный анализ** | -- | V | V |
| **Due Diligence отчёт** | -- | V | V |
| **Shadow AI Discovery** | -- | -- | V |
| **Уведомления** | -- | V | V |
| **Мультиязычность** (EN/DE/FR/ES) | EN | EN/DE | Все |
| **SSO** (WorkOS) | -- | -- | V |
| **Кастомные правила сканирования** (YAML) | -- | -- | V |
| **Аудит-лог всех действий** | -- | -- | V |
| **Мультиворкспейс** | -- | -- | V |
| **White-Label** | -- | -- | V |
| **API доступ** | -- | -- | V |

### 2.3 Потоки выручки

| Поток | Цена | Источник |
|-------|------|----------|
| SaaS подписки (Growth/Enterprise) | EUR 149--499/мес | Основной |
| Audit Package (ad hoc) | EUR 2--5K | F42 |
| Vendor Verified badges | EUR 49--149/мес per vendor | F38 |
| Certification referral | 10--15% от AIUC-1 fee (~EUR 3--6K) | F40 |
| Guard API (pay-per-call сверх лимита) | $0.0001/вызов | G-F6 |
| Маркетплейс (будущее) | 30% commission | F35 |

---

## 3. Фичи по группам

### 3.1 Инфраструктура

| ID | Фича | Описание | Спринт | Статус |
|----|-------|----------|--------|--------|
| F01 | Инфраструктура | Деплой (Hetzner EU), CI/CD (GitHub Actions), PostgreSQL 16, Docker, MetaSQL | S0--S3 | DONE |
| F04 | Rule Engine + Classification | Движок классификации рисков по EU AI Act. 4 уровня: Prohibited, High, Limited, Minimal. Confidence %, метод, список обязательств | S3--S4 | DONE |
| F37 | Публичные страницы | Landing, pricing, документация. SEO-оптимизация | S5 | DONE |
| F24 | Панель администратора | Platform admin: кросс-организационные запросы, env whitelist (`PLATFORM_ADMIN_EMAILS`), RBAC | S6 | DONE |

### 3.2 IAM и безопасность

| ID | Фича | Описание | Спринт | Статус |
|----|-------|----------|--------|--------|
| F02 | Пользователи и роли | Регистрация, логин, приглашение в команду. Роли: Admin, Officer, Viewer. Страница Members с фильтрами. Risk Exposure на человека | S1--S2 | DONE |
| F25 | WorkOS миграция | SSO через WorkOS AuthKit. `User.workosUserId`, `Organization.workosOrgId`. Enterprise SSO | S5 | DONE |
| F61 | CLI Auth endpoint | OAuth 2.0 Device Flow: `POST /api/auth/device` (выдаёт код) + `POST /api/auth/token` (обмен кода на JWT). Для `complior login` | S8 | DONE |

### 3.3 AI Tool Inventory

| ID | Фича | Описание | Спринт | Статус |
|----|-------|----------|--------|--------|
| F03 | AI Tool Inventory | Таблица AI tools организации: название, вендор, владелец, риск, compliance %. Демо 12 tools | S2 | DONE |
| F26 | Registry API | API к базе 5,011+ AI tools. Автозаполнение при добавлении через wizard. Таблицы `RegistryTool`, `Obligation`, `ScoringRule`, `APIKey`, `APIUsage` | S5 | DONE |
| F23 | Бесплатные лид-магниты | Публичный инструмент проверки AI tool. Точка входа в воронку | S4 | DONE |
| F38 | Публичный AI Risk Registry | Открытая база AI tools с оценкой A+--F. Любой может проверить. Вендоры: платная верификация (EUR 49--149/мес). API для procurement-команд. Pre-fill для Passport Mode 3 | S8 | DONE |

### 3.4 Compliance Engine

| ID | Фича | Описание | Спринт | Статус |
|----|-------|----------|--------|--------|
| F04a | Классификация рисков | Prohibited/High/Limited/Minimal по EU AI Act. Confidence %, метод | S3 | DONE |
| F04b | AESIA категории | 12 категорий чеклистов AESIA (QMS, Risk, Human Oversight, Data, Transparency, Accuracy, Robustness, Cybersecurity, Logging, Tech Docs, Monitoring, Incidents) | S4 | DONE |
| F04c | Обязательства | Маппинг 108 обязательств EU AI Act на конкретные requirements | S4 | DONE |
| F08 | Gap Analysis | Per-system gap: 12 категорий AESIA, цветовая индикация (зелёная/жёлтая/красная), рекомендации, приоритизация | S8 | DONE |

### 3.5 Dashboard

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F05 | Дашборд базовый | Score карточки, donut рисков, compliance breakdown, penalty exposure, timeline, quick actions. Персональный дашборд для участника | Starter+ | S2 | DONE (75%) |
| F28 | Дашборд v2 | Карта связей AI систем, график Score по времени, role-based views (CTO/DPO/Dev), 12 виджетов, страница Members | Growth+ | S8 | DONE |
| F48 | Таймлайн compliance | Визуальная шкала: "149 дней. 7 систем. 23 открытых обязательства. Критический путь: FRIA (2), EU DB (2), worker notice (3)" | Growth+ | S8 | DONE |
| F63 | Индикатор источника данных | Рядом с каждым полем: "Источник: CLI scan, 27 фев" или "Введено вручную". Для DPO -- понимание надёжности данных | Growth+ | S9 | PLANNED |

### 3.6 Документы

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F07 | Генерация compliance-документов | 5 типов: AI Usage Policy, QMS шаблон, Risk Management Plan, Monitoring Plan, Worker Notification. LLM-дозаполнение из Passport. Версионирование | Growth+ (Starter: 1 отчёт/мес) | S8 | DONE |
| F19 | FRIA генератор | Wizard 6 секций. 80% полей из Passport: название, данные, риск, владелец. Пользователь: бизнес-контекст, затронутые группы. Рецензент -> Approve -> PDF export | Growth+ (Starter: 1/мес) | S8 | DONE |
| F42 | Audit Package | One-click ZIP: Executive Summary (PDF), реестр AI систем (все Passport), FRIA, Policy, Evidence Chain, Incident Log, Training Records. PDF + JSON + SARIF. QR-код верификации | Growth+ | S8 | DONE |
| F57 | QMS Wizard | Генератор документа "Система управления качеством" (Art.17, AESIA Guide #4). Wizard: организация -> AI системы -> ответственные -> процессы. Результат: PDF 20--40 стр. | Growth+ | S9 | PLANNED |
| F58 | Risk Management Plan Wizard | Per-system wizard: AI система -> риски (из Scanner findings) -> вероятность x последствия -> меры -> остаточный риск -> график. Результат: PDF + structured data | Growth+ | S9 | PLANNED |
| F59 | Monitoring Plan Wizard | Post-Market Monitoring Plan (Art.72, AESIA Guide #13): метрики, частота, пороги, эскалация, ответственный, обратная связь. 5--10 стр. | Growth+ | S9 | PLANNED |
| F54 | AESIA экспорт | 12 Excel-файлов в формате испанского регулятора AESIA. Каждый файл = 1 чеклист. Можно использовать в любой стране EU как baseline формат | Growth+ | S10 | PLANNED |

### 3.7 CLI интеграция

| ID | Фича | Описание | Спринт | Статус |
|----|-------|----------|--------|--------|
| F61 | CLI Auth endpoint | OAuth 2.0 Device Flow. `POST /api/auth/device`, `POST /api/auth/token`. Для `complior login` | S8 | DONE |
| F62 | CLI Sync endpoint | `POST /api/sync/passport` + `POST /api/sync/scan`. Правило мержа: технические поля из CLI имеют приоритет, организационные -- из SaaS. Исходный код НЕ передаётся | S8 | DONE |
| F27 | Приём данных из TUI | Daemon push через HTTP. Автоматическая отправка scan results, passports, evidence. Подмножество F62 | S8 | DONE |

### 3.8 Реестр AI систем [PLANNED]

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F39 | Реестр AI систем | Единая таблица: CLI Passports (Mode 1, авто) + SaaS Passports (Mode 3, вручную). Per-system: название, вендор, risk class, L-level, score, completeness %, lifecycle, владелец. Kill switch. Cross-agent data flows | Starter+ (лимит по тарифу) | S9 | PLANNED |
| F46 | Wizard шаги 3--5 | Продолжение wizard'а (шаги 1--2 готовы). Шаг 3: use case + данные + end users. Шаг 4: автономность L1--L5 + ограничения + human oversight. Шаг 5: review -> сохранить. Подсказки "Art.26(x) требует..." | Growth+ | S9 | PLANNED |
| F56 | Расширенные поля Passport | 6 новых блоков: `regulatoryContext` (страна, MSA, EU DB номер), `incidents[]`, `postMarketMonitoring`, `conformityAssessment`, `complianceRecords`, `msaSubmissions[]` | Enterprise | S9 | PLANNED |

### 3.9 EU Database [PLANNED]

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F47 | Помощник регистрации в EU Database | Art.49: ~40 полей формы. Предзаполнение 60--90% из Passport. Чеклист "готово / не хватает". Ссылка на EU Database. Обновление Passport после регистрации | Enterprise | S9 | PLANNED |

### 3.10 Мониторинг [PLANNED]

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F32 | Мониторинг реального времени | Accuracy drift, error rate, user complaints, anomalies. Данные из CLI daemon (runtime metrics). Исторические тренды. Алерты: "Accuracy < 90% -> проверить". Связан с Monitoring Plan (F59) | Growth+ | S10 | PLANNED |
| F44 | Предиктивный анализ | AI-прогнозирование: "Через 30 дней система X нарушит порог accuracy" или "Score падает -- вот почему" | Growth+ | S10 | PLANNED |
| F12 | Мониторинг регуляторных изменений | Отслеживание обновлений AI Act, гармонизированных стандартов, guideline'ов EC/AESIA. Уведомления: "AESIA обновила чеклист #5" | Growth+ | S10 | PLANNED |

### 3.11 Инциденты [PLANNED]

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F55 | Управление инцидентами | Полный цикл: (1) Логирование, (2) Классификация (serious/нет), (3) Эскалация, (4) Отчёт регулятору (Art.73, 2 дня для смерти / 15 дней прочее), (5) Расследование (root cause), (6) Corrective actions, (7) Закрытие. Привязка к AI системе в реестре | Growth+ | S10 | PLANNED |

### 3.12 ISO 42001 [PLANNED]

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F40 | Cert Readiness Dashboard | Готовность к ISO 42001 и AIUC-1 per-system. Evidence management (загрузка доказательств). Partnership referral на сертификаторов | Growth+ | S9 | PLANNED |
| F-V9-27 | ISO 42001 Readiness | Clauses 4--10 (обязательные) + 39 контролей Annex A. Маппинг на EU AI Act obligations. Score per clause. Визуализация gaps | Growth+ | S9 | PLANNED |

### 3.13 Биллинг

| ID | Фича | Описание | Спринт | Статус |
|----|-------|----------|--------|--------|
| F09 | Биллинг (Stripe) | Stripe интеграция, подписки, 3 плана (Starter/Growth/Enterprise). Таблицы `Subscription`, `Plan`. Webhook обработка | S3 | DONE |

### 3.14 AI Literacy (Eva) [PLANNED]

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F06 | Eva AI-ассистент | Чат-бот: ответы по AI Act, помощь заполнения Passport, объяснение обязательств. Интерфейс чата готов (SVG-аватар, история). Нужен backend: LLM, контекст из Passport и обязательств | Growth+ | S9 | PLANNED |
| F10 | Eva Tool Calling | Eva вызывает функции: "Сгенерируй FRIA для HireVue", "Какой у нас score?" | Growth+ | S9 | PLANNED |
| F18 | AI Literacy модуль | Обучение сотрудников (Art.4 -- обязательно). Курсы, тесты, сертификаты. Трекинг. 4 курса в seed. UI частично готов (кольцо 60%, сертификат) | Growth+ | S10 | PLANNED |
| F11 | Онбординг и уведомления | Wizard: "Добавьте AI систему -> Классифицируйте -> Заполните Passport". Уведомления: deadlines, vendor ответы, новые обязательства | Starter+ | S9 | PLANNED |

### 3.15 Дополнительные фичи

| ID | Фича | Описание | Тариф | Спринт | Статус |
|----|-------|----------|-------|--------|--------|
| F50 | Compliance Badge | Embeddable бейдж "AI Act Compliant". L1 (self-assessed, Starter): самопроверка. L2 (verified, Enterprise): после аудита. `<script src="complior.ai/badge/xxx">`. Публичная страница верификации | Starter (L1) / Enterprise (L2) | S9 | PLANNED |
| F51 | Запрос документации у вендора | Art.13, Art.26: email-шаблон с юридическими ссылками. Трекинг: отправлено -> ожидание -> получено. Документация прикрепляется к Passport. Community Evidence. Уникальная фича без аналогов | Growth+ | S9 | PLANNED |
| F53 | Справочник регуляторов | 27 EU + 3 EEA: MSA, контакт, способ подачи, документы, национальные особенности. Привязка к Passport (country + sector) | Growth+ | S9 | PLANNED |
| F-V9-20 | Vendor Communication Templates | Шаблоны коммуникации с вендорами на основании gap analysis: что запросить, какие статьи AI Act, юридические формулировки | Growth+ | S9 | PLANNED |
| F29 | Shadow AI Discovery | Автоматический поиск AI tools через Google Workspace, Slack, SSO logs. "3 сотрудника используют ChatGPT, 5 -- Copilot" | Enterprise | S9 | PLANNED |
| F52 | Due Diligence отчёт | PDF для совета директоров / инвестора / страховщика. Executive summary, бизнес-язык, агрегация по организации | Growth+ | S10 | PLANNED |
| F60 | Wizard оценки соответствия | Самооценка по Annex VI AI Act (internal control). Чеклист: все ли требования выполнены? Предзаполнение из Passport + Scanner + FRIA. Результат: Conformity Assessment Report + Declaration of Conformity | Growth+ | S10 | PLANNED |
| F33 | Enterprise-фичи | Custom rules (YAML), расширенный SSO, audit log всех действий, управление сертификациями | Enterprise | S10 | PLANNED |
| F14 | Мультиязычность | EN/DE/FR/ES. Приоритет: документы > UI. Генерация документов на языке регулятора | Growth+ (EN/DE) / Enterprise (все) | S10 | PLANNED |
| F64 | Онлайн-wizard для SMB | Без установки, без регистрации: "Проверьте AI compliance за 5 минут". Выбор tools из Registry -> мгновенный результат -> чеклист -> CTA "Upgrade to Growth" | Starter | S11+ | PLANNED |
| F65 | Мультиворкспейс | Один аккаунт -> несколько рабочих пространств (по клиенту). Для консалтинга, Big4, юридических фирм. Переключение. Отчёты с логотипом | Enterprise | S11+ | PLANNED |
| F35 | Маркетплейс | Каталог: guardrails, test suites, industry-specific шаблоны. Разработчики публикуют -- 30% комиссия | -- | S11+ | PLANNED |
| F36 | White-Label | Complior под брендом партнёра | Enterprise | S11+ | PLANNED |
| F31 | Remediation Cloud | После Gap Analysis -- пошаговые playbook'и. "Нет human oversight -> инструкция -> генерация документа" | Growth+ | S10 | PLANNED |
| F41 | Аналитика MCP Proxy | Дашборд данных MCP Proxy: AI запросы (прошли/заблокированы), объёмы, паттерны | Enterprise | S10 | PLANNED |
| F43 | NHI Dashboard | Non-Human Identities: API ключи, service accounts, automated agents. Кто, когда, сколько, какие разрешения | Enterprise | S10 | PLANNED |
| F45 | Бенчмаркинг | Сравнение с анонимизированными данными рынка: "Ваш score 72% -- выше среднего в fintech (64%)" | Enterprise | S11+ | PLANNED |
| F34 | Compliance Mesh | Связи между организациями. State of AI Agent Compliance Report (ежегодный) | Enterprise | S11+ | PLANNED |

---

## 4. Зависимости от open-source (CLI/Engine)

SaaS Dashboard не содержит Scanner, Fixer, Passport Engine, Evidence Chain -- всё это работает в open-source CLI. SaaS получает данные через sync-протокол.

### 4.1 Форматы данных (контракт CLI <-> SaaS)

| Формат | Описание | Поля (ключевые) | Файл контракта |
|--------|----------|-----------------|----------------|
| **Passport** | Agent Passport (36 полей, из них 21 синхронизируется в SaaS) | `name`, `version`, `risk_class`, `autonomy_level`, `owner`, `description`, `capabilities`, `data_access`, `permissions`, `constraints`, `created_at`, `signature`, `completeness`, `fria_completed` ... | `engine/core/data/schemas/http-contract.json` |
| **ScanResult** | Результат сканирования (score + findings) | `score`, `findings[]`, `layers_summary`, `total_checks`, `regulation_version`, `scanned_at` | `engine/core/data/schemas/http-contract.json` |
| **Finding** | Единичная находка сканера | `id`, `check_id`, `type` (pass/fail/skip), `severity`, `message`, `file`, `line`, `layer`, `obligation_id`, `fix_diff`, `evidence`, `priority`, `confidence` | `http-contract-sample.json` |
| **Document** | Сгенерированный compliance-документ | `type` (fria/policy/qms/risk/monitoring/worker), `content` (markdown), `passport_name`, `generated_at` | Формат в разработке |
| **Evidence Chain** | Криптографическая цепочка доказательств | `entries[]` с `hash` (SHA-256), `signature` (ed25519), `chainPrev`, `timestamp`, `event_type`, `scan_id` | `.complior/evidence/chain.json` |
| **Obligation Mapping** | Маппинг 108 обязательств на check_id сканера | `obligation_id` (OBL-xxx), `article`, `requirement`, `check_ids[]`, `coverage` (%) | `engine/core/src/data/regulations/` |

### 4.2 Таблица зависимостей CLI -> SaaS

| CLI фича | CLI спринт | SaaS фича | SaaS спринт | Тип | Статус CLI |
|----------|-----------|-----------|-------------|-----|------------|
| C.S01 Passport (Mode 1: Auto, ed25519) | S03--S04 | F39 Реестр AI систем | S9 | ЖЁСТКАЯ | DONE |
| C.040 AI Registry (5011+ tools) | S01 | F38 AI Risk Registry | S8 | ЖЁСТКАЯ | DONE |
| C.D01 FRIA Generator | S04 | F19 FRIA Wizard (SaaS) | S8 | СРЕДНЯЯ | DONE |
| C.R20 Evidence Chain (SHA-256 + ed25519) | S04 | F42 Audit Package | S8 | СРЕДНЯЯ | DONE |
| `complior login` (Device Flow) | S04 | F61 CLI Auth endpoint | S8 | ЖЁСТКАЯ | DONE |
| `complior sync` (passport + scan + doc) | S04 | F62 CLI Sync endpoint | S8 | ЖЁСТКАЯ | DONE |
| C.T01--T02 Cert Readiness | S05 | F40 Cert Readiness Dashboard | S9 | СРЕДНЯЯ | PLANNED |
| C.S08 Passport Export Hub (A2A/NIST/AIUC-1) | S05 | F40 AIUC-1 evidence | S9 | СРЕДНЯЯ | PLANNED |
| F-V9-24/25/26 ISO 42001 docs (Engine) | S06 | F-V9-27 ISO 42001 Readiness | S9 | ЖЁСТКАЯ | PLANNED |
| C.U01 MCP Proxy Core | S06 | F41 Proxy Analytics | S10 | МЯГКАЯ | PLANNED |
| C.E05 NHI Scanner | S06 | F43 NHI Dashboard | S10 | МЯГКАЯ | PLANNED |
| Guard API (G-F1..G-F7) | S07 | SaaS Guard Integration | S10 | ЖЁСТКАЯ | PLANNED |
| F-V9-21 Compliance Diff (PR) | S08 | SaaS PR integration | S10+ | МЯГКАЯ | PLANNED |

### 4.3 Правила мержа данных (sync protocol)

```
MERGE RULES (CLI -> SaaS):
  Технические поля (CLI приоритет):
    - score, findings, layers, scan_date
    - capabilities, data_access, permissions
    - evidence_chain, signature

  Организационные поля (SaaS приоритет):
    - owner (назначенный DPO/CTO)
    - department, business_context
    - lifecycle_status (active/suspended/decommissioned)
    - fria_approval, conformity_assessment

  Источник код: НИКОГДА не передаётся через sync
  Передаются: только метаданные (файл, строка, check_id, message)
```

---

## 5. Roadmap SaaS

### 5.1 Обзор

```
ГОТОВО    ===========================  S0--S8.5: Dashboard, AI Tools, Classification,
                                        Members, Wizard (частично), Eva UI, Billing,
                                        FRIA, Audit Package, CLI Sync, Gap Analysis,
                                        Dashboard v2, Timeline, Documents
                                        424/429 SP, 15 фич

S9        ========  РЕЕСТР + ДОКУМЕНТЫ + РЕГУЛЯТОР
               F39  Реестр AI систем (CLI + SaaS unified)
               F46  Wizard шаги 3-5
               F56  Расширенные поля Passport
               F40  Cert Readiness Dashboard
               F-V9-27  ISO 42001 Readiness
               F47  EU Database Helper
               F50  Compliance Badge
               F51  Запрос документации у вендора
               F53  Справочник регуляторов
               F57  QMS Wizard
               F58  Risk Management Plan Wizard
               F59  Monitoring Plan Wizard
               F06+F10  Eva AI-ассистент + Tool Calling
               F11  Онбординг и уведомления
               F63  Индикатор источника данных
               F-V9-20  Vendor Communication Templates
               F29  Shadow AI Discovery

S10       ========  ПОЛНАЯ ПЛАТФОРМА
               F55  Управление инцидентами (Art.73)
               F32  Мониторинг реального времени
               F60  Wizard оценки соответствия (Annex VI)
               F14  Мультиязычность (EN/DE/FR/ES)
               F54  AESIA экспорт (12 Excel)
               F52  Due Diligence отчёт
               F33  Enterprise-фичи (€499/мес: SSO, Multi-Workspace, API, custom rules, audit log)
               F31  Remediation Cloud
               F18  AI Literacy модуль (Art.4)
               F12  Мониторинг регуляторных изменений
               F44  Предиктивный анализ
               F41  MCP Proxy Analytics
               F43  NHI Dashboard

S11+      ========  РАСШИРЕНИЕ
               F64  Онлайн-wizard для SMB (без установки)
               F65  Мультиворкспейс для консультантов
               F35  Маркетплейс
               F36  White-Label
               F45  Бенчмаркинг
               F34  Compliance Mesh
```

### 5.2 Sprint 9 -- Детали

> **Цель:** Единый реестр всех AI систем, внешние compliance outputs (Badge, Vendor Requests), интеграция с регулятором. Пользователь может доказать compliance третьим сторонам.

| # | Фича | Размер | Обязательства EU AI Act | Приоритет |
|---|-------|--------|------------------------|-----------|
| F39 | Реестр AI систем | L | OBL-011,014,026 (Art.26, Art.49, Art.16) | CRITICAL |
| F46 | Wizard шаги 3--5 | M | OBL-011,014 (Art.26, Art.49) | CRITICAL |
| F56 | Расширенные поля Passport | M | OBL-011,013,014,025 (multiple) | CRITICAL |
| F40 | Cert Readiness Dashboard | M | OBL-003,009,019,023 | CRITICAL |
| F-V9-27 | ISO 42001 Readiness | M | ISO 42001 Clauses 4--10, Annex A (39 контролей) | HIGH |
| F47 | EU Database Helper | S | OBL-014,014a (Art.49) | HIGH |
| F50 | Compliance Badge | S | OBL-038 (Art.95) | HIGH |
| F51 | Запрос документации у вендора | M | OBL-011e (Art.13, Art.26) | HIGH |
| F53 | Справочник регуляторов | S | OBL-025 (Art.21) | HIGH |
| F57 | QMS Wizard | M | OBL-010,010a (Art.17) | HIGH |
| F58 | Risk Management Plan Wizard | M | OBL-003 (Art.9) | HIGH |
| F59 | Monitoring Plan Wizard | M | OBL-020 (Art.72) | HIGH |
| F06 | Eva AI-ассистент | L | OBL-001 (Art.4) | HIGH |
| F10 | Eva Tool Calling | S | -- | HIGH |
| F11 | Онбординг и уведомления | M | -- | HIGH |
| F63 | Индикатор источника данных | S | -- | MEDIUM |
| F-V9-20 | Vendor Communication Templates | S | OBL-011e | MEDIUM |
| F29 | Shadow AI Discovery | M | OBL-011 (Art.26) | MEDIUM |

### 5.3 Sprint 10 -- Детали

> **Цель:** Enterprise-фичи, полное управление инцидентами, мониторинг, мультиязычность. Масштабирование для крупных организаций.

| # | Фича | Размер | Обязательства EU AI Act | Приоритет |
|---|-------|--------|------------------------|-----------|
| F55 | Управление инцидентами | L | OBL-021,021a (Art.73) | HIGH |
| F32 | Мониторинг реального времени | L | OBL-020,020a,020b (Art.72) | HIGH |
| F60 | Wizard оценки соответствия | M | OBL-003,009,019 (Annex VI) | HIGH |
| F14 | Мультиязычность | M | -- (бизнес-требование) | HIGH |
| F54 | AESIA экспорт | M | -- (стандарт де-факто) | MEDIUM |
| F52 | Due Diligence отчёт | S | OBL-025 (Art.21) | MEDIUM |
| F33 | Enterprise-фичи | L | OBL-010 (Art.17 QMS) | MEDIUM |
| F31 | Remediation Cloud | M | OBL-020a (Art.20) | MEDIUM |
| F18 | AI Literacy модуль | L | OBL-001,001a (Art.4) | MEDIUM |
| F12 | Мониторинг регуляторных изменений | M | OBL-032 | MEDIUM |
| F44 | Предиктивный анализ | M | OBL-003 (Art.9) | MEDIUM |
| F41 | MCP Proxy Analytics | M | OBL-006,011,020 | MEDIUM |
| F43 | NHI Dashboard | M | OBL-006a | MEDIUM |

### 5.4 Sprint 11+ -- Детали

> **Цель:** Расширение рынка: SMB (онлайн-wizard), консультанты (мультиворкспейс), экосистема (маркетплейс).

| # | Фича | Размер | Приоритет |
|---|-------|--------|-----------|
| F64 | Онлайн-wizard для SMB | M | HIGH |
| F65 | Мультиворкспейс для консультантов | L | HIGH |
| F35 | Маркетплейс | L | LOW |
| F36 | White-Label | M | LOW |
| F45 | Бенчмаркинг | S | LOW |
| F34 | Compliance Mesh | M | LOW |

---

## 6. Метрики SaaS

### 6.1 Техническая статистика

| Метрика | Значение |
|---------|----------|
| Тестов (backend + frontend) | 554 |
| Таблиц в PostgreSQL | 39 |
| API эндпоинтов (Fastify) | 80+ |
| Bounded Contexts | 10 |
| Seed data: AI tools в каталоге | 5,011+ |
| Seed data: Obligations | 108 |
| Seed data: AI Literacy курсов | 4 |
| Seed data: AI tools в демо | 220+ |
| Sprint velocity (средняя S0--S8.5) | ~33 SP/спринт |
| Story Points (выполнено) | 424 |
| Story Points (всего запланировано) | 429 |

### 6.2 Покрытие обязательств (SaaS-specific)

| Категория обязательств | Кол-во | Покрыто SaaS | Покрытие |
|------------------------|--------|-------------|----------|
| Deployer-specific (Art.26, Art.27, Art.49) | 17 | 12 | 71% |
| Both roles (Art.4, Art.5, Art.21, Art.73) | 43 | 18 | 42% |
| Provider (Art.6--Art.25) | 48 | -- | 0% (CLI-only) |
| **ИТОГО (для deployer)** | **60** | **30** | **50%** |

> После S9 целевое покрытие deployer obligations: **85%**.

### 6.3 Фронтенд-стек

| Компонент | Технология |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Стили | TailwindCSS |
| UI-библиотека | shadcn/ui |
| LLM интеграция | Vercel AI SDK |
| Графики | Recharts |
| Формы | React Hook Form + Zod |
| Состояние | React Server Components + Zustand |

### 6.4 Бэкенд-стек

| Компонент | Технология |
|-----------|-----------|
| API-сервер | Fastify 5 |
| База данных | PostgreSQL 16 (Hetzner Managed, EU) |
| Очереди | pg-boss |
| Schema management | MetaSQL |
| Авторизация | WorkOS AuthKit |
| Биллинг | Stripe |
| Валидация | Zod |
| Деплой | Docker, Hetzner |

---

## 7. LLM модель в SaaS

### 7.1 Текущее использование (Mistral)

SaaS использует Mistral для 3 задач через 3 модели:

| Задача | Модель | Назначение | Endpoint |
|--------|--------|-----------|----------|
| Классификация рисков | `mistral-small` | Определение risk class (Prohibited/High/Limited/Minimal) по описанию AI системы | `POST /api/classify` |
| Генерация документов | `mistral-medium` | Дозаполнение compliance-документов (FRIA, Policy, QMS, Risk Plan) из данных Passport | `POST /api/documents/generate` |
| Eva (чат-ассистент) | `mistral-medium` | Ответы на вопросы по AI Act, контекст из Passport и обязательств | `POST /api/eva/chat` |

### 7.2 Guard API интеграция (планируется)

Guard API (G-F6) -- ML-модель Complior для runtime-проверок. В SaaS будет использоваться для:

| Сценарий | Описание | Тариф |
|----------|----------|-------|
| Eva safety | Проверка промптов и ответов Eva на prohibited content, PII, bias | Growth+ |
| Document validation | Проверка сгенерированных документов на compliance | Growth+ |
| Risk scoring | Семантическая валидация risk classification | Growth+ |

### 7.3 BYOK vs Hosted

| Режим | Описание | Тариф |
|-------|----------|-------|
| **Hosted Mistral** (default) | Complior предоставляет доступ к Mistral через свой API-ключ. Лимиты по тарифу | Starter: нет / Growth: 50 запросов/мес / Enterprise: Unlimited |
| **BYOK** (Bring Your Own Key) | Пользователь указывает свой API-ключ (Mistral, OpenAI, Anthropic). Без лимитов. Данные не проходят через серверы Complior | Enterprise |

### 7.4 Стоимость LLM (для Complior)

| Модель | Input | Output | Средний запрос | Стоимость |
|--------|-------|--------|---------------|-----------|
| mistral-small | $0.2/1M tok | $0.6/1M tok | ~500 tok in / ~200 tok out | ~$0.0002 |
| mistral-medium | $2.7/1M tok | $8.1/1M tok | ~1K tok in / ~2K tok out | ~$0.019 |
| Guard Model (self-hosted) | -- | -- | ~200 tok | ~$0.0001 (GPU amortized) |

---

## 8. База данных

> Полная документация: `docs/DATABASE.md` (v4.0.0, 2026-03-05)

### 8.1 Обзор: 10 Bounded Contexts, 39 таблиц

| # | Bounded Context | Таблицы | Описание |
|---|----------------|---------|----------|
| 1 | **IAM** | Organization, User, Role, Permission, UserRole, Invitation | Пользователи, роли (Admin/Officer/Viewer), WorkOS SSO |
| 2 | **AI Tool Inventory** | AITool, AIToolCatalog, AIToolDiscovery | Реестр AI систем организации, каталог 5011+ tools, discovery |
| 3 | **Classification** | RiskClassification, Requirement, ToolRequirement, ClassificationLog | Классификация рисков, обязательства, история |
| 4 | **Deployer Compliance** | ComplianceDocument, DocumentSection, ChecklistItem, FRIAAssessment, FRIASection, GapAnalysis, AuditPackage | Документы, FRIA, gap analysis, audit package |
| 5 | **AI Literacy** | TrainingCourse, TrainingModule, LiteracyCompletion, LiteracyRequirement | Обучение AI Act (Art.4) |
| 6 | **Consultation** | Conversation, ChatMessage | Eva чат-бот |
| 7 | **Monitoring** | RegulatoryUpdate, ImpactAssessment | Мониторинг изменений |
| 8 | **Billing** | Subscription, Plan | Stripe подписки |
| 9 | **Registry API** | RegistryTool, Obligation, ScoringRule, APIKey, APIUsage | API для внешнего доступа к каталогу |
| 10 | **CLI Sync & Data Collection** | ScanResult, SyncHistory | Данные из CLI daemon |

### 8.2 Ключевые характеристики

| Параметр | Значение |
|----------|----------|
| RDBMS | PostgreSQL 16 |
| Хостинг | Hetzner Managed (EU, Германия) |
| Data residency | EU only (GDPR + AI Act) |
| Schema management | MetaSQL (JS -> SQL DDL + TS types) |
| Driver | `pg` (node-postgres) pool |
| Очереди (jobs) | pg-boss |
| PK pattern | `{camelName}Id` (bigint) |
| Кастомные типы | `riskLevel`, `complianceStatus`, `datetime`, `json`, `ip` |

### 8.3 Таблицы Sprint 8 (новые)

| Таблица | BC | Описание |
|---------|----|----------|
| `SyncHistory` | CLI Sync | История синхронизаций CLI -> SaaS: timestamp, тип (passport/scan/doc), статус |
| `GapAnalysis` | Deployer Compliance | Результат gap analysis per AI system: 12 категорий, score, рекомендации |
| `AuditPackage` | Deployer Compliance | Сгенерированный audit package: ZIP URL, документы, timestamp, версия |

### 8.4 Модифицированные таблицы Sprint 8

| Таблица | Новые поля |
|---------|-----------|
| `AITool` | `+framework`, `+modelProvider`, `+modelId`, `+syncMetadata` |
| `ComplianceDocument` | `+organization FK`, `+approvedBy`, `+approvedAt`, `+fileUrl`, `+metadata` |
| `RiskClassification` | `+articleReferences`, `+crossValidation`, `+version`, `+isCurrent`, `+classifiedBy`, `+cli_import method` |
| `Requirement` | `+estimatedEffortHours`, `+guidance`, `+translations`, `+obligationIds` |

---

## 9. Новые фичи v9 для SaaS

Фичи, которые появились в v9 unified стратегии и затрагивают SaaS:

| ID | Фича | Описание | Тариф | Зависимость от CLI |
|----|-------|----------|-------|-------------------|
| F-V9-20 | Vendor Communication Templates | Шаблоны коммуникации с вендорами на основании gap analysis. Юридические ссылки, формулировки по AI Act. Расширение F51 | Growth+ | F08 Gap Analysis (DONE) |
| F-V9-27 | ISO 42001 Readiness Dashboard | Clauses 4--10 (обязательные) + 39 контролей Annex A. Маппинг на EU AI Act obligations. Score per clause. Визуализация gaps и прогресса | Growth+ | F-V9-24/25/26 ISO docs (CLI, S06) |
| G-F6 | Guard API Cloud Deploy | Hetzner GPU (EU), REST API, $0.0001/вызов, SLA 99.9%. Используется SaaS для Eva safety, document validation, risk scoring | Growth+ | Guard Model (CLI, S07) |

---

**Обновлено:** 2026-03-06 v9.0 -- SaaS-часть единого бэклога (66 фич из SaaS v7.1 + 3 новых v9 фичи, 3 тарифа (Starter €0 / Growth €149 / Enterprise €499) + CLI-Scanner бесплатно, S9--S11+ roadmap, 10 BC, 39 таблиц)
