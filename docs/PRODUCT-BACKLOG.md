# PRODUCT-BACKLOG — Complior SaaS Dashboard

**Версия:** 7.2.0
**Дата:** 2026-02-28
**Статус:** Draft — требует утверждения PO

---

## Как читать этот документ

**Product Backlog** — это ЧТО делает продукт (фичи, бизнес-уровень).

| | Product Backlog (этот документ) | Sprint Backlog (отдельный) |
|--|--------------------------------|---------------------------|
| **Уровень** | Фичи / Эпики | User Stories |
| **Вопрос** | ЧТО делает продукт? | КАК это реализовать? |
| **Когда** | Phase 0, дополняется | Sprint Planning |
| **Кем** | Marcus → PO approval | Marcus декомпозирует фичи → US |
| **Связь** | 1 фича → 5-10 user stories | US-NNN → Feature-NNN |

### Приоритеты

| При | Значение |
|-----|----------|
| **🔴** | Must Have — блокирует продажи |
| **🟠** | Should Have — значительно повышает ценность |
| **🟡** | Could Have — расширение, nice to have |
| **🟢** | Future — post-launch |

---

## 1. ЧТО УЖЕ СДЕЛАНО (Sprint 0-7)

| # | Фича | Описание | Спринт | Статус |
|---|------|----------|--------|--------|
| F01 | **Инфраструктура** | Monorepo (server/ + app/ + frontend/), Fastify + VM Sandbox, MetaSQL schemas, Docker Compose, CI/CD, Hetzner hosting, Plausible analytics, Better Uptime monitoring. | S0 | ✅ |
| F02 | **IAM + Team Management** | WorkOS (managed SSO/SAML/OIDC, бесплатно до 1M MAU). Регистрация, логин, invite flow, team management. Роли: Admin, Officer, Viewer. Members page с фильтрами, Risk Exposure на человека. Subscription enforcement (maxUsers, maxTools). | S1+2.5+7 | ✅ |
| F03 | **AI Tool Inventory** | Таблица AI tools организации: название, вендор, владелец, риск, статус, % compliance. 5-step XState wizard для регистрации use case. AI Tool Catalog (200+ seed). CSV import. EU-Compliant Alternatives для high-risk tools. | S1-2 | ✅ |
| F04 | **Классификация рисков** | Rule Engine (deployer-focused): Art. 5 prohibited → Annex III high-risk → safety component → context check. Classification History + Reclassification. Deployer Requirements Mapping (17 обязанностей Art. 26). | S2-3 | ✅ |
| F05 | **Дашборд (базовый)** | Summary карточки, donut-диаграмма рисков, Compliance Breakdown (5 полосок), Penalty Exposure, Document Status, Timeline, Quick Actions, персональный дашборд member'а. | S3+5 | 75% |
| F09 | **Биллинг** | Stripe Checkout, 5 тарифов, 14-day trial, annual toggle (20% discount). Enforcement через SubscriptionLimitChecker. | S3.5+6 | ✅ |
| F23 | **Лид-магниты** | Quick Check (/check), Penalty Calculator (/penalty-calculator) — публичные, без авторизации. Email capture → Brevo. | S3.5 | ✅ |
| F24 | **Админ-панель** | Cross-org read-only admin API + frontend UI. Overview, users, orgs, subscriptions, MRR. Role `platform_admin` + env whitelist. | S6 | ✅ |
| F25 | **WorkOS миграция** | Ory Kratos → WorkOS managed. AuthKit, SSO (SAML/OIDC). ADR-007. | S7 | ✅ |
| F26 | **Registry API** | API к базе 4,983 AI tools. Search/filter, obligations, data bundle. API Key auth, rate limits, ETag caching. Scoring Engine v4.1 (weighted documentation grade). | S7 | ✅ |
| F37 | **Публичные страницы** | Landing, pricing, AI Registry public pages (SEO: 5000+ indexable pages), 6-tab tool detail, JSON-LD, FAQ. | S5+7 | ✅ |

**Также есть в UI, но без полного backend:**
- **Wizard добавления AI tool** (шаги 1-2 из 5): поиск, выбор из Registry, автозаполнение — 40%
- **Eva (AI-ассистент)**: чат-интерфейс, история чатов, SVG-аватар — 15%, только UI (отложено на S11+)
- **AI Literacy**: кольцо прогресса (60%), сертификат — 20%, только UI
- **Уведомления**: 3 new, список — UI есть, логика нет

---

## 2. SPRINT 8 — COMPLIANCE READY

> **Цель:** Пользователь может сгенерировать FRIA, Audit Package и основные compliance документы. Это то, что позволяет ПРОДАВАТЬ Growth подписку (€149/мес).

| # | Фича | Что делаем | При |
|---|------|-----------|-----|
| **F28** | **Дашборд v2** | Доработка существующего дашборда. (1) Карта связей между AI системами ("A передаёт данные в B"). (2) График Score по времени (тренд). (3) Role-based views: CTO / DPO / Developer видят разное. Базовый дашборд уже 75%. | 🔴 |
| **F38** | **Публичный AI Risk Registry** | Открытая база AI инструментов с оценкой риска (A+–F). Вендоры могут подать заявку на верификацию (платно). API для procurement-команд. Данные заполняют Passport при добавлении tool. | 🔴 |
| **F19** | **Генератор FRIA** | Fundamental Rights Impact Assessment (Art. 27). Обязателен для каждой high-risk AI системы. Wizard: 6 секций, 80% предзаполнено из Passport. Рецензент проверяет → Approve → PDF. GDPR DPIA overlap: если есть DPIA → 60% pre-fill. LLM-assisted drafting (Mistral Medium 3). | 🔴 |
| **F42** | **Audit Package** | Одна кнопка → ZIP со ВСЕМИ compliance документами: Executive Summary, Реестр AI систем (Passports), FRIA, AI Usage Policy, Матрица обязательств, Evidence Chain, Incident Log, Training Records. PDF + JSON + SARIF. QR-код верификации. **Ключевой платный feature** — ради него покупают Growth. | 🔴 |
| **F07** | **Генерация документов** | Набор генераторов: (1) AI Usage Policy, (2) QMS шаблон (Art.17, AESIA #4), (3) Risk Management Plan (Art.9, AESIA #5), (4) Monitoring Plan (Art.72, AESIA #13), (5) Worker Notification (Art.26(7)). Предзаполнение из Passport + Scanner. LLM-генерация черновиков (Mistral Medium 3) через pg-boss queue. Section-by-section: Generate → Edit (Tiptap) → Approve → PDF (Gotenberg). | 🔴 |
| **F48** | **Таймлайн compliance** | Визуальная шкала: "До дедлайна 157 дней. 7 AI систем. 23 открытых обязательства. Критический путь: FRIA для 2 систем." UI timeline уже есть, нужно подключить к данным. | 🟠 |
| **F61** | **Эндпоинт авторизации CLI** | `POST /api/auth/device` (выдаёт код) + `POST /api/auth/token` (обмен на токен). OAuth 2.0 Device Flow. Нужно для CLI → SaaS sync. | 🟠 |
| **F62** | **Приём данных из CLI** | `POST /api/sync/passport` + `POST /api/sync/scan`. Backend мержит: технические поля из CLI приоритет, организационные из SaaS приоритет. Исходный код НЕ передаётся — только метаданные. | 🟠 |
| **F08** | **Gap Analysis** | Per AI-система: 12 категорий AESIA (QMS, Risk, Human Oversight, Data, Transparency, Accuracy, Robustness, Cybersecurity, Logging, Tech Docs, Monitoring, Incidents). Каждая: зелёная/жёлтая/красная. Рекомендации. Estimated effort. Приоритет: urgency × impact. Action Plan (LLM). | 🟠 |
| **F27** | **Приём данных из TUI** | CLI daemon push Passport + scan results в SaaS. Подмножество F62 через daemon (не user-initiated). | 🟠 |

---

## 3. SPRINT 9 — РЕЕСТР + ВЫХОДНЫЕ ДОКУМЕНТЫ + РЕГУЛЯТОР

> **Цель:** Единый реестр AI систем, внешние compliance outputs (Badge, Vendor Requests), интеграция с регулятором. Пользователь может доказать compliance третьим сторонам.

| # | Фича | Что делаем | При |
|---|------|-----------|-----|
| **F39** | **Реестр AI систем** | Центральная страница: ВСЕ AI системы организации. Системы из CLI (auto-detect) + вручную через wizard. Per система: название, вендор, risk class, L-level (1-5), compliance score, Passport completeness %, lifecycle (active/suspended/decommissioned), владелец. Kill switch. | 🔴 |
| **F46** | **Wizard шаги 3-5** | Шаг 3: use case + данные + end users. Шаг 4: автономность L1-L5 + human oversight. Шаг 5: Review → save. Подсказки "Art.26(x) требует..." | 🔴 |
| **F56** | **Расширенные поля Passport** | Новые блоки: regulatoryContext (страна, сектор, MSA, EU DB номер), incidents[], postMarketMonitoring, conformityAssessment, complianceRecords, msaSubmissions[]. Нужны для Audit Package. | 🔴 |
| **F47** | **EU Database помощник** | Art. 49: регистрация high-risk AI в EU Database (~40 полей). Предзаполнение 60-90% из Passport. Чеклист "готово/не хватает". Ссылка на EU DB. После регистрации → номер в Passport. | 🟠 |
| **F50** | **Compliance Badge** | Embeddable бейдж "AI Act Compliant". L1 (self-assessed, бесплатно): `<script src="complior.ai/badge/xxx">`. L2 (verified, Enterprise): после аудита. Публичная страница верификации. Viral loop: badge → link → новые регистрации. | 🟠 |
| **F51** | **Запрос документации у вендора** | Deployer запрашивает документацию по Art. 13, 26. Генерация email-шаблона с юридическими ссылками. Трекинг: отправлено → ожидание → получено. Полученное прикрепляется к Passport. Фидит Community Evidence. **Уникальная фича — нет у конкурентов.** | 🟠 |
| **F53** | **Справочник регуляторов** | 27 EU + 3 EEA стран. Пользователь: страна + сектор → MSA name, контакт, как отправлять, какие документы запросят, национальные требования. Автопривязка к Passport через country + sector. | 🟠 |
| **F57** | **Генератор QMS (wizard)** | Art. 17, AESIA #4. Пошагово: организация, AI системы, ответственные, процессы (одобрение AI, change management, vendor management, обучение, аудит). Предзаполнение из данных. PDF 20-40 стр. | 🟠 |
| **F58** | **Генератор Risk Management Plan** | Art. 9, AESIA #5. Per AI система: риски (из Scanner), вероятность × последствия, меры, остаточный риск, график пересмотра. PDF + structured data в Passport. | 🟠 |
| **F59** | **Генератор Monitoring Plan** | Art. 72, AESIA #13. Что мониторим, как часто, пороги, эскалация, ответственный, обратная связь. Предзаполнение из Passport. 5-10 стр. | 🟠 |
| **F40** | **Дашборд готовности к сертификации** | Готовность к ISO 42001 и AIUC-1. Per-system: сделано/осталось. Управление evidence. Реферальные ссылки на партнёров-сертификаторов. | 🔴 |
| **F63** | **Индикатор источника данных** | Рядом с каждым полем: "CLI scan, 27 фев" или "введено вручную". Помогает DPO отличать автоматические (надёжные) данные от ручных. | 🟡 |
| **F11** | **Онбординг и уведомления** | Wizard первого входа. Уведомления: дедлайны (180d/90d/30d/14d/7d), AI Literacy overdue, FRIA не создан, новый инструмент, requirements не начаты. In-app bell + Brevo email (instant/daily/weekly). | 🟠 |
| **F29** | **Обнаружение AI в SaaS** | Discovery через интеграции (Google Workspace, Slack, SSO logs): "3 сотрудника используют ChatGPT, 5 используют Copilot." Shadow AI detection. | 🟡 |
| **F31** | **Remediation Cloud** | После Gap Analysis: пошаговые remediation playbook'и. "У системы X нет human oversight → вот инструкция, нажмите → генерируем документ." | 🟡 |
| **F12** | **Мониторинг регулирования** | EUR-Lex scraping (pg-boss cron). Фильтр: deployer-relevant articles. LLM impact-анализ per AI tool. "AESIA обновила чеклист #5 — проверьте Risk Plan." | 🟡 |

---

## 4. SPRINT 10 — ПОЛНАЯ ПЛАТФОРМА

> **Цель:** Enterprise-фичи, управление инцидентами, экспорт, мониторинг в реальном времени.

| # | Фича | Что делаем | При |
|---|------|-----------|-----|
| **F55** | **Управление инцидентами** | Полный цикл: логирование → классификация (serious?) → эскалация → отчёт регулятору (Art. 73: 2 дня при смерти, 15 дней иначе) → расследование → corrective actions → закрытие. Привязано к AI системе в реестре. | 🟠 |
| **F60** | **Wizard оценки соответствия** | Самооценка по Annex VI (internal control). Предзаполнение из Passport + Scanner + FRIA. Результат: Conformity Assessment Report + Declaration of Conformity. Для high-risk AI перед размещением на рынке. | 🟠 |
| **F54** | **Экспорт в формате AESIA** | 12 Excel-файлов в формате испанского регулятора AESIA. Каждый = один AESIA чеклист. Заполнен из наших данных. Можно использовать в любой стране EU как baseline. | 🟡 |
| **F52** | **Отчёт для Due Diligence** | PDF для совета директоров / инвестора / страховой. Executive summary бизнес-языком. Агрегация по всей организации. Отличается от Audit Package (для регулятора). | 🟡 |
| **F32** | **Мониторинг в реальном времени** | Accuracy drift, error rate, anomalies. Данные из CLI daemon. Алерты: "Accuracy X упала ниже 90%." Исторические тренды. Связан с Monitoring Plan (F59). | 🟠 |
| **F33** | **Enterprise-фичи** | Кастомные правила (YAML), расширенный SSO, audit-log всех действий, API v1.0 (stable, versioned, documented), custom roles, white-label reports. | 🟡 |
| **F41** | **Аналитика MCP Proxy** | Дашборд для данных MCP Proxy (CLI runtime). AI запросы: прошедшие/заблокированные, объёмы, паттерны. | 🟡 |
| **F43** | **NHI Dashboard** | Non-Human Identities: API ключи, service accounts, automated agents. Кто, когда, сколько, какие разрешения. | 🟡 |
| **F44** | **Предиктивный анализ** | "Через 30 дней система X нарушит порог accuracy." "Score падает — вот почему." | 🟡 |
| **F45** | **Бенчмаркинг** | Сравнение с анонимными данными: "Ваш score 72% — выше среднего в fintech (64%)." | 🟢 |
| **F18** | **AI Literacy** | Обучение по Art. 4 (обязательно с Feb 2025). 4 role-based курса (Executive ~20мин, HR ~30мин, Developer ~40мин, General ~15мин). Employee import (CSV), course assignment, email invitation, quiz scoring, PDF certificates, dashboard widget. **Wedge product** — standalone за €49/мес. | 🟡 |
| **F14** | **Мультиязычность** | EN/DE/FR/ES. Приоритет: документы > UI (регулятор в Германии хочет документы на немецком). | 🟠 |

---

## 5. SPRINT 11+ — РАСШИРЕНИЕ

| # | Фича | Что делаем | При |
|---|------|-----------|-----|
| **F64** | **Онлайн-wizard для малого бизнеса** | Без установки/регистрации: "Проверьте compliance за 5 минут". Выбор AI tools из Registry → instant результат → чеклист → CTA "Upgrade to Growth". | 🟠 |
| **F65** | **Мультиворкспейс для консультантов** | Один аккаунт → несколько workspaces (по клиенту). Свои AI системы, score, документы. Переключение. Отчёты с логотипом консалтинговой. Для сегмента R3 (юрфирмы, Big4). | 🟠 |
| F34 | **Growth-фичи** | Compliance Mesh (связи между организациями), State of AI Agent Compliance Report (ежегодный). SEO pages (27.5K = 5K tools × jurisdictions). | 🟢 |
| F35 | **Маркетплейс** | Guardrails, test suites, industry-specific шаблоны. Разработчики публикуют — 30% комиссия. | 🟢 |
| F36 | **White-Label** | Для партнёров: Complior под их брендом. Self-hosted enterprise (Docker, air-gapped). | 🟢 |
| **F06** | **Eva — AI-ассистент** | Чат-бот: вопросы по AI Act, помощь заполнить Passport, объяснение обязательств. Vercel AI SDK 6 (streamText + useChat). Mistral Large 3 (EU). RAG по AI Act knowledge base (pgvector). Контекст: AI tools + compliance status. | 🟠 |
| **F10** | **Eva Tool Calling** | Eva вызывает функции: "сгенерируй FRIA для HireVue", "какой у нас score?". Vercel AI SDK Zod-typed tools с `needsApproval` для compliance-critical actions. `maxSteps: 5`. | 🟠 |

### Provider Features (P3 Future)

> Полные provider features (Art. 43, 51-56) — для foundation model companies. Только после product-market fit с deployer-сегментом.

| Feature | Статья | Описание |
|---------|--------|----------|
| Technical Documentation | Art. 11, Annex IV | 12 секций tech docs для AI providers |
| Conformity Assessment | Art. 43 | Self-assessment workflow для high-risk AI |
| GPAI Model Cards | Art. 51-56 | Transparency sheets для GPAI model providers |
| CE Declaration | Art. 47 | EU Declaration of Conformity |
| EU DB Registration | Art. 49, Annex VIII | Pre-fill + submission help |

---

## 6. ТАРИФЫ

| Тариф | Цена | Для кого | Что включено |
|-------|------|----------|-------------|
| **Free** | €0 | Разработчики | CLI без ограничений. TUI локально. Без SaaS sync. |
| **Starter** | €0 | Стартапы | SaaS дашборд (до 3 AI систем). Registry. Badge L1. Score history. 1 FRIA/мес. CLI sync. |
| **Growth** | €149/мес | B2B SaaS | Без лимита AI систем. Audit Package. FRIA. EU DB Helper. Vendor Request. Генераторы (QMS, Risk, Monitoring). AESIA export. Regulator Directory. Timeline. До 10 пользователей. |
| **Enterprise** | €499/мес | Mid-market, консультанты | Всё из Growth + Badge L2. DD Report. Conformity Assessment. Incident Management. SSO. Unlimited users + RBAC. Custom rules. API. Multi-workspace. |

> **Source of truth:** `app/config/plans.js`

---

## 7. ROADMAP

```
ГОТОВО    ████████████ S0-S7: Infrastructure, IAM, AI Tools, Classification,
                      Members, Wizard (1-2), Eva UI, Billing, WorkOS,
                      Registry API, Public Pages (SEO), Scoring v4.1

S8        ████ COMPLIANCE READY
               F28 Дашборд v2 (Cross-System Map, Role views)
               F38 AI Risk Registry (публичный, vendor verification)
               F19 Генератор FRIA ← кнопка есть, нужен backend
               F42 Audit Package ← кнопка есть, нужен backend
               F07 Генерация документов (Usage Policy, QMS, Risk, Monitoring, Worker)
               F48 Таймлайн compliance
               F61 CLI Auth endpoint (Device Flow)
               F62 CLI Sync endpoint (Passport + Scan)
               F08 Gap Analysis (12 AESIA categories)
               F27 Приём данных из TUI (daemon push)

S9        ████ РЕЕСТР + ВЫХОДНЫЕ ДОКУМЕНТЫ + РЕГУЛЯТОР
               F39 Реестр AI систем (unified: CLI + manual)
               F46 Wizard шаги 3-5
               F56 Расширенные поля Passport
               F47 EU Database помощник
               F50 Compliance Badge (L1/L2)
               F51 Запрос документации у вендора (unique feature)
               F53 Справочник регуляторов (27 EU + 3 EEA)
               F57+F58+F59 Генераторы (QMS wizard, Risk Plan, Monitoring Plan)
               F40 Готовность к сертификации (ISO 42001)
               F11 Онбординг + Уведомления

S10       ████ ПОЛНАЯ ПЛАТФОРМА
               F55 Управление инцидентами (Art. 73)
               F60 Оценка соответствия (Annex VI)
               F54 AESIA экспорт (12 Excel)
               F52 DD отчёт (board/investor)
               F32 Мониторинг реального времени
               F33 Enterprise (custom rules, API v1, audit log)
               F18 AI Literacy (wedge product, 4 курса)
               F14 Мультиязычность (EN/DE/FR/ES)

S11+      ████ РАСШИРЕНИЕ
               F06+F10 Eva — AI-ассистент + Tool Calling
               F64 Онлайн-wizard для малого бизнеса
               F65 Мультиворкспейс для консультантов
               F35 Маркетплейс
               F36 White-Label + Self-Hosted
```

---

## 8. АРХИТЕКТУРНЫЕ РЕШЕНИЯ

| Решение | Обоснование |
|---------|-------------|
| **Deployer-first** | 125K+ deployers vs 1.1K providers в Германии. Рынок 120x больше, не обслужен |
| **WorkOS (managed)** | SSO бесплатно до 1M MAU, AuthKit, нет ops burden (ADR-007) |
| **Registry API** | Монетизация данных: Free bundle → Paid API. TUI DataProvider port |
| **Weighted Documentation Grade (v4.1)** | Required items = 90% weight, best practice = 10% bonus. Нельзя получить A без legally required docs |
| **TUI → SaaS sync** | Конверсия: Free CLI → upgrade → данные скана в Dashboard |
| **Mistral EU-only** | Sovereign AI: данные клиентов только в EU |
| **pg-boss** | PostgreSQL-only queue на MVP (→ BullMQ при масштабировании) |
| **Brevo** | EU (Франция), 300/day free, transactional email |
| **Gotenberg** | Self-hosted PDF: certificates, FRIA, docs |
| **Hetzner Object Storage** | S3-compatible, EU, €5.27/TB |
| **ISR (Next.js)** | SEO + performance: SSR с revalidation вместо full SSR |
| **Vercel AI SDK 6** | streamText + useChat, model-agnostic (Mistral → Claude → GPT без изменений) |

---

## 9. КРОСС-ПРОЕКТНЫЕ ЗАВИСИМОСТИ (Engine ↔ SaaS)

| SaaS Feature | Engine Feature | Тип |
|-------------|---------------|-----|
| F26: Registry API | C.040-C.046: AI Registry DataProvider | ЖЁСТКАЯ (shared types) ✅ |
| F37: Public Pages | — (SaaS only) | Нет |
| F27: TUI Data Collection | C.F02: codebase scan → ScanResult | СРЕДНЯЯ (Dashboard может начать с mock) |
| F28: Dashboard v2 | C.F13-F22: Agent Governance | МЯГКАЯ (mock data до готовности Engine) |
| F29: SaaS Discovery | C.F01-F12: Local Discovery | МЯГКАЯ (разные источники) |
| F32: Monitoring Cloud | C.F31-F38: Local Monitoring | МЯГКАЯ (aggregation layer) |

---

**Обновлено:** 2026-02-28 v7.2.0
