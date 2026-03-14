# Sprint S06 — Documents + Wizards + LLM + SaaS Regulatory

**Версия:** 1.1.0
**Дата:** 2026-03-07
**Статус:** In Progress — 5 US DONE: US-S06-03 (LLM Chat Service), US-S06-17 (TUI Chat Assistant), US-S06-18 (Chat UX), US-S06-19 (Onboarding Rework 10→8), US-S06-20 (`complior init` + Root Discovery)
**Cross-repo:** ~/complior (CLI + Engine + SDK) + ~/PROJECT (SaaS Dashboard)
**Длительность:** 2-3 недели

---

## Обзор

Единый спринт, объединяющий open-source (Engine, CLI/TUI) и SaaS Dashboard. Ключевая тема — LLM-powered дозаполнение документов, wizard-режим в TUI, ISO 42001 генерация, MCP Compliance Proxy (Passport Mode 2) и SaaS-стороны regulatory integration.

До этого спринта: Engine умеет генерировать FRIA из шаблона + паспорта (S04), но LLM не участвует в дозаполнении пустых секций. TUI не имеет chat assistant и wizard-режима. ISO 42001 документы не генерируются. MCP Proxy для semi-auto Passport Mode 2 не реализован. SaaS не имеет QMS/Risk/Monitoring wizards, EU Database Helper, справочника регуляторов, Eva Tool Calling.

**Цель:** LLM-powered дозаполнение документов, пошаговые wizards, ISO 42001 интеграция, MCP Compliance Proxy.

**Зависимости от предыдущих спринтов:**
- S04: FRIA Generator (E-17), Evidence Chain (E-36), Passport Service (E-25..28) -- все DONE
- S05: SDK Hardening, Agent Governance, Runtime Control -- предполагается DONE
- SaaS S8.5: CLI Sync, Obligation Mapping, Score Display -- все DONE

---

## Граф зависимостей

```
E-81 MCP Proxy Core ────────► E-82 Proxy Policy Engine
                                        │
                                        ▼
                               E-42 NHI Scanner

E-47 LLM Chat ──────┬──────► E-24 FRIA LLM-дозаполнение
                     │──────► E-46 LLM дозаполнение документов
                     │──────► C-23 TUI Chat Assistant
                     └──────► E-21/E-22/E-23 ISO 42001

E-46 LLM дозаполнение ─────► C-24 Wizard-заполнение документов

E-21/E-22/E-23 ISO 42001 ──► D-49 ISO 42001 Readiness (SaaS)

D-25 QMS Wizard ─────┐
D-26 Risk Plan ──────┼──────► (независимые, все SaaS)
D-27 Monitoring Plan ┘

D-35 Справочник регуляторов ──► D-34 EU Database Helper

D-41 Eva AI Assistant ────────► D-42 Eva Tool Calling
```

---

## User Stories

### US-S06-01: MCP Compliance Proxy Core (Passport Mode 2)
**Приоритет:** CRITICAL
**Продукт:** Engine
**Backlog ref:** E-81 (C.U01)
**Компонент:** `[Engine]`
**Обязательства:** OBL-006, OBL-011, OBL-020

Как разработчик, я хочу запустить MCP Compliance Proxy между агентом и LLM-провайдером, чтобы автоматически собирать данные для Passport Mode 2 (semi-auto) из перехваченных MCP-запросов.

**Acceptance Criteria:**
- [ ] MCP Proxy сервер запускается через `complior proxy start --port <port>`
- [ ] Proxy перехватывает MCP tool calls: tool name, arguments, результат
- [ ] Автоматическое обогащение Passport: `capabilities`, `tools_used`, `data_access`, `interaction_patterns`
- [ ] Логирование каждого вызова в evidence chain (event_type: `mcp_call`)
- [ ] Конфигурация: `.complior/proxy.toml` (upstream MCP server, allowed tools, log level)
- [ ] Health endpoint: `GET /proxy/health` возвращает статус и статистику вызовов
- [ ] Graceful shutdown: pending запросы завершаются, лог записывается

**Технические детали:**
- `engine/core/src/infra/mcp-proxy.ts` -- MCP protocol handler (JSON-RPC 2.0)
- `engine/core/src/domain/proxy/` -- бизнес-логика перехвата и обогащения
- `engine/core/src/http/routes/proxy.route.ts` -- HTTP API для управления proxy
- Proxy работает как отдельный процесс или в составе daemon
- Passport Mode 2 данные записываются в существующий `passport-service.ts`

---

### US-S06-02: Proxy Policy Engine
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-82 (C.U02)
**Компонент:** `[Engine]`
**Обязательства:** OBL-008, OBL-015, OBL-016

Как DPO, я хочу задать политики для MCP Proxy (блокировка tool calls, обязательные disclosure, лимиты), чтобы enforcement работал автоматически на уровне proxy.

**Acceptance Criteria:**
- [ ] Политики описываются в `.complior/proxy-policies.yaml` (YAML формат)
- [ ] Policy types: `deny_tool` (блокировка вызова), `require_disclosure` (добавление disclosure), `rate_limit` (лимит вызовов), `require_approval` (human-in-the-loop)
- [ ] При блокировке: proxy возвращает JSON-RPC error с объяснением (статья, штраф)
- [ ] Лог policy violations записывается в evidence chain
- [ ] Hot-reload: изменение policy-файла применяется без перезапуска proxy
- [ ] `GET /proxy/policies` -- текущие активные политики (JSON)

**Технические детали:**
- `engine/core/src/domain/proxy/policy-engine.ts` -- движок политик
- `engine/core/src/domain/proxy/policy-loader.ts` -- YAML парсер + Zod валидация
- Интеграция с file watcher (chokidar) для hot-reload
- Политики привязаны к passport `risk_class`: high-risk = строгий enforcement

---

### US-S06-03: LLM Chat Service (Engine-side) ✅ DONE
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-47
**Компонент:** `[Engine]`

Как разработчик, я хочу иметь LLM chat endpoint в Engine, чтобы TUI и CLI могли задавать контекстные вопросы по compliance.

**Acceptance Criteria:**
- [x] `POST /chat` -- отправить сообщение, получить ответ (streaming через SSE)
- [x] Контекст: текущий scan result, passport данные, найденные findings
- [x] System prompt включает: EU AI Act obligations, текущий score, deadline до 2 августа 2026
- [x] Поддержка Vercel AI SDK (generateText / streamText) + BYOK (OpenAI, Anthropic, Mistral)
- [x] Конфигурация модели: `.complior/config.toml` секция `[llm]` (model, api_key, base_url)
- [x] Rate limiting: максимум 50 запросов/час (настраиваемо)
- [x] История чата: хранится в `.complior/chat-history.json` (последние 100 сообщений)

**Технические детали:**
- `engine/core/src/services/chat-service.ts` -- ChatService с DI
- `engine/core/src/http/routes/chat.route.ts` -- Hono route handler
- Использует существующий LLM module (`engine/core/src/llm/`)
- Context injection: `buildChatContext()` собирает scan results + passport + obligations
- Composition root: wiring chat-service через factory function

---

### US-S06-04: FRIA LLM-дозаполнение
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-24 (F-V9-11)
**Компонент:** `[Engine]`
**Обязательства:** Art.27

Как deployer, я хочу чтобы LLM анализировал passport и автоматически генерировал черновики для пустых секций FRIA, чтобы ускорить заполнение с пометкой `[AI-DRAFT -- требует проверки человеком]`.

**Acceptance Criteria:**
- [ ] `POST /agent/fria` с флагом `llm: true` -- LLM дозаполняет пустые секции
- [ ] CLI: `complior agent fria <name> --llm` -- запускает LLM-assisted генерацию
- [ ] LLM генерирует таблицу рисков по 8 фундаментальным правам (Art.27 FRIA)
- [ ] Каждая AI-сгенерированная секция помечена: `[AI-DRAFT -- требует проверки человеком]`
- [ ] Модель настраивается: `--model gpt-4o` / `--model claude-sonnet` / `--model mistral-medium`
- [ ] Результат: обогащённый `.md` и `.json` файлы в `.complior/reports/`
- [ ] Без `--llm`: поведение не изменяется (backward compatible)

**Технические детали:**
- `engine/core/src/domain/fria/fria-llm-enricher.ts` -- LLM enrichment для FRIA
- Входные данные для LLM: passport manifest (36 полей), пустые секции шаблона, risk_class
- 8 фундаментальных прав: достоинство, свобода, демократия, равенство, верховенство закона, безопасность, конфиденциальность, недискриминация
- Prompt engineering: structured output (JSON mode) для таблицы рисков
- Максимальная стоимость за один вызов: ограничение через `max_tokens`

---

### US-S06-05: LLM дозаполнение документов (общий механизм)
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-46
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы любой compliance-документ (Policy, QMS, Worker Notification, Incident Report) мог быть дозаполнен LLM из контекста passport и scan results, чтобы сократить ручную работу.

**Acceptance Criteria:**
- [ ] Общий `LLMDocumentEnricher` интерфейс: принимает template + passport + scan context -> обогащённый документ
- [ ] Поддержка 5 типов документов: FRIA, Policy, QMS, Risk Plan, Worker Notification
- [ ] Каждый тип имеет свой system prompt с domain-specific контекстом
- [ ] AI-сгенерированный контент помечен: `[AI-DRAFT -- требует проверки человеком]`
- [ ] `POST /documents/generate` endpoint с параметром `type` и `llm: true`
- [ ] Стоимость вызова возвращается в ответе: `llm_cost: { tokens_in, tokens_out, estimated_usd }`
- [ ] Fallback: если LLM недоступен, генерируется шаблон без дозаполнения (как сейчас)

**Технические детали:**
- `engine/core/src/domain/documents/llm-document-enricher.ts` -- абстрактный enricher
- `engine/core/src/domain/documents/enrichers/` -- per-type enrichers (fria, policy, qms, risk, worker)
- Интеграция с существующим Vercel AI SDK (`generateText`)
- Port: `LLMDocumentPort` в `engine/core/src/ports/` для тестируемости

---

### US-S06-06: Шаблоны с встроенными подсказками (Inline Guidance)
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-95 (E-20, F-V9-13)
**Компонент:** `[Engine]`

Как deployer, я хочу чтобы каждая секция шаблона содержала подсказки ("Что включить", "Хороший пример", "Частые ошибки", "Ссылка на регуляцию"), чтобы заполнять документы правильно даже без LLM.

**Acceptance Criteria:**
- [ ] Каждая секция шаблона содержит metadata: `guidance`, `good_example`, `common_mistakes`, `regulation_ref`
- [ ] Индикатор критичности секции: `severity` (critical / important / optional)
- [ ] Guidance отображается в TUI wizard как подсказка перед вводом
- [ ] Версионирование шаблонов: `template_version` поле в каждом шаблоне
- [ ] Шаблоны: FRIA, AI Policy, QMS, Risk Plan, Worker Notification, Incident Report
- [ ] JSON-формат guidance: `engine/core/data/templates/eu-ai-act/guidance/`

**Технические детали:**
- Расширение существующего шаблона `engine/core/data/templates/eu-ai-act/fria.md`
- Новая структура: `TemplateSection { id, title, content, guidance: SectionGuidance }`
- `SectionGuidance { what_to_include, good_example, common_mistakes, regulation_ref, severity }`
- Zod-валидация структуры шаблонов при загрузке

---

### US-S06-07: ISO 42001 -- AI Policy Generator + SoA Generator + Risk Register
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-21 (F-V9-24), E-22 (F-V9-25), E-23 (F-V9-26)
**Компонент:** `[Engine]`

Как compliance officer, я хочу генерировать три ключевых документа ISO 42001 (AI Policy, Statement of Applicability, Risk Register) из данных passport и scan results, чтобы подготовиться к сертификации.

**Acceptance Criteria:**
- [ ] `complior doc generate --type ai-policy` -- генерирует AI Policy (ISO 42001, Annex A.2.2)
- [ ] `complior doc generate --type soa` -- генерирует Statement of Applicability (39 контролей Annex A)
- [ ] `complior doc generate --type risk-register` -- генерирует Risk Register из findings
- [ ] AI Policy: организация, scope, цели, роли, принципы -- pre-fill из passport + `--organization`
- [ ] SoA: 39 контролей ISO 42001 Annex A, per-control: applicable/not, justification, evidence, status
- [ ] Risk Register: findings маппятся в risk entries (likelihood x impact = risk level, mitigation, owner)
- [ ] Все три документа: `.md` + `.json` формат, сохраняются в `.complior/reports/`
- [ ] LLM-обогащение (при `--llm`): дозаполнение justification и mitigation мер

**Технические детали:**
- `engine/core/src/domain/documents/generators/ai-policy-generator.ts`
- `engine/core/src/domain/documents/generators/soa-generator.ts`
- `engine/core/src/domain/documents/generators/risk-register-generator.ts`
- ISO 42001 data: `engine/core/data/standards/iso-42001-controls.json` (39 контролей)
- Маппинг ISO 42001 -> EU AI Act: per-control cross-reference
- HTTP: `POST /documents/generate` с `type: "ai-policy" | "soa" | "risk-register"`

---

### ~~US-S06-08~~ УДАЛЁН — объединён в US-S05-27 (Compliance Cost Estimator)

---

### ~~US-S06-09~~ УДАЛЁН — дублирует US-S05-07 (Finding Explanations, DONE)

---

### US-S06-10: Incident Report Template
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-19 (C.D03)
**Компонент:** `[Engine]`
**Обязательства:** OBL-021

Как deployer, я хочу генерировать шаблон отчёта об инциденте (Art.73 EU AI Act), чтобы при серьёзном инциденте быстро заполнить и отправить регулятору в течение 2 дней.

**Acceptance Criteria:**
- [ ] `complior doc generate --type incident-report` -- генерирует шаблон
- [ ] Секции по Art.73: описание инцидента, затронутые лица, причина, принятые меры, корректирующие действия
- [ ] Pre-fill из passport: system name, provider, deployer, risk_class, contact
- [ ] Таймлайн: initial report (2 дня), full report (15 дней) -- оба шаблона
- [ ] Ссылка на регулятор: из справочника (27 EU + 3 EEA MSA)
- [ ] Формат: `.md` + `.json` в `.complior/reports/`

**Технические детали:**
- `engine/core/src/domain/documents/generators/incident-report-generator.ts`
- Шаблон: `engine/core/data/templates/eu-ai-act/incident-report.md`
- Данные по регуляторам: `engine/core/data/regulators/eu-msa.json` (27+3 записей)
- HTTP: `POST /documents/generate` с `type: "incident-report"`

---

### US-S06-11: Passport Import (A2A -> Pre-fill)
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-34 (C.S10)
**Компонент:** `[Engine]`

Как разработчик, я хочу импортировать Google A2A Agent Card JSON и автоматически заполнить Passport, чтобы не вводить данные вручную для уже описанных агентов.

**Acceptance Criteria:**
- [ ] `complior agent import --format a2a <file.json>` -- импорт A2A Agent Card
- [ ] Маппинг A2A полей -> Passport полей (name, description, capabilities, provider, version)
- [ ] Конфликт-резолюция: если поле уже заполнено, показать diff и запросить подтверждение
- [ ] `POST /agent/import` endpoint с body: `{ format: "a2a", data: {...} }`
- [ ] Поддержка форматов: A2A Agent Card (v1), в будущем: NIST, AIUC-1
- [ ] Signature: после импорта -- re-sign passport с локальным ed25519 ключом

**Технические детали:**
- `engine/core/src/domain/passport/importers/a2a-importer.ts` -- маппинг A2A -> Passport
- `engine/core/src/http/routes/agent.route.ts` -- добавить `POST /agent/import`
- A2A Agent Card spec: `name`, `description`, `url`, `provider`, `version`, `capabilities`, `authentication`
- CLI: `cli/src/headless/agent.rs` -- добавить `AgentAction::Import` вариант

---

### US-S06-12: Evidence Export для аудитора
**Приоритет:** HIGH
**Продукт:** Engine + CLI
**Backlog ref:** E-78 (C.T03)
**Компонент:** `[Engine]` `[CLI]`
**Обязательства:** OBL-025, OBL-035

Как compliance officer, я хочу экспортировать evidence chain в формате, пригодном для аудитора (ZIP с документами, JSON цепочкой, верификационным отчётом), чтобы предоставить доказательства регулятору или сертификатору.

**Acceptance Criteria:**
- [ ] `complior agent evidence --export` -- создаёт ZIP архив в `.complior/exports/`
- [ ] ZIP содержит: `evidence-chain.json`, `verification-report.md`, `summary.json`
- [ ] Verification report: результат `verify()` -- целостность цепочки, подписи, хэши
- [ ] Summary: количество entries, период, события по типам, последний scan score
- [ ] `GET /agent/evidence/export` -- HTTP endpoint, возвращает ZIP (application/zip)
- [ ] Формат JSON: каждый entry содержит `timestamp`, `event_type`, `hash`, `signature`, `chainPrev`
- [ ] Фильтрация по периоду: `--from 2026-01-01 --to 2026-03-07`

**Технические детали:**
- `engine/core/src/domain/scanner/evidence-export.ts` -- экспорт + верификация
- ZIP: использовать `archiver` или `fflate` (lightweight)
- CLI: `cli/src/headless/agent.rs` -- расширить `run_agent_evidence()` флагом `--export`
- HTTP: расширить `agent.route.ts` endpoint `GET /agent/evidence/export`

---

### US-S06-13: NHI Scanner (Non-Human Identity)
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-42 (C.E05)
**Компонент:** `[Engine]`
**Обязательства:** OBL-006a, OBL-011d

Как security officer, я хочу обнаруживать non-human identities (API ключи, service accounts, automated agents) в проекте, чтобы включить их в реестр и обеспечить логирование по Art.12/Art.26(6).

**Acceptance Criteria:**
- [ ] Сканирование: `.env`, `.env.*`, config файлы, `docker-compose.yml`, CI/CD конфиги
- [ ] Обнаружение: API keys (OpenAI, Anthropic, GCP, AWS), service accounts, bot tokens
- [ ] Результат: список NHI с типом (api_key / service_account / bot_token), location, risk level
- [ ] Интеграция со scanner: NHI findings как дополнительный check (`nhi-undocumented`)
- [ ] `GET /nhi` endpoint -- список обнаруженных NHI
- [ ] Маппинг NHI -> Passport: suggestion "Create passport for this automated agent"
- [ ] Не логировать значения ключей -- только факт наличия и тип

**Технические детали:**
- `engine/core/src/domain/scanner/checks/nhi-scanner.ts` -- NHI detection
- Паттерны: `sk-...` (OpenAI), `sk-ant-...` (Anthropic), `AKIA...` (AWS), `gcloud-...` (GCP)
- Entropy-based detection: строки с высокой энтропией в config файлах
- Интеграция с L3 (dependency/config layer) scanner
- Исключения: `.gitignore`-ed файлы, `.complior/nhi-exclude.yaml`

---

### US-S06-14: Multi-Jurisdiction
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-62 (C.P11)
**Компонент:** `[Engine]`
**Обязательства:** OBL-031

Как deployer в нескольких странах EU, я хочу указать юрисдикции в passport и видеть per-jurisdiction обязательства, чтобы учитывать национальные особенности (разные MSA, сроки, требования).

**Acceptance Criteria:**
- [ ] Passport поле: `jurisdictions: string[]` (e.g. `["DE", "FR", "NL"]`)
- [ ] Per-jurisdiction данные: MSA (national supervisory authority), национальные требования
- [ ] Scanner: если jurisdiction указана, добавляются jurisdiction-specific checks
- [ ] `GET /obligations?jurisdiction=DE` -- фильтрация обязательств по юрисдикции
- [ ] Данные: 27 EU + 3 EEA стран, MSA контакты, национальные особенности
- [ ] CLI: `complior agent init --jurisdiction DE,FR` при создании passport

**Технические детали:**
- `engine/core/data/regulators/eu-jurisdictions.json` -- 30 записей
- `engine/core/src/domain/passport/jurisdiction-mapper.ts` -- маппинг юрисдикций
- Расширение Passport types: `jurisdictions` поле в `passport.types.ts`
- Расширение obligation endpoint: query parameter `jurisdiction`

---

### US-S06-15: Agent Remediation
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-87 (C.F27)
**Компонент:** `[Engine]`

Как разработчик, я хочу получать конкретные рекомендации по исправлению проблем агента (недостающие permissions, отсутствие logging, нет human oversight), чтобы быстро привести агента в соответствие.

**Acceptance Criteria:**
- [ ] Per-finding: поле `remediation` с конкретными шагами исправления
- [ ] Remediation учитывает тип агента: LangChain, CrewAI, OpenAI Assistants, Vercel AI SDK
- [ ] Примеры кода: для каждого типа remediation -- code snippet на целевом фреймворке
- [ ] Приоритизация: remediation сортируется по impact (высокий штраф сначала)
- [ ] `GET /agent/remediation/<name>` -- план исправления для конкретного агента
- [ ] Интеграция с MCP: `complior_suggest` tool возвращает remediation steps

**Технические детали:**
- `engine/core/src/domain/remediation/agent-remediation.ts` -- генерация remediation
- Remediation templates per-framework в `engine/core/data/remediation/`
- Маппинг: check_id -> remediation template -> code snippet
- Учёт данных из passport: `framework`, `capabilities`, `autonomy_level`

---

### US-S06-16: Shadow AI Policy Generator
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-88 (C.F28)
**Компонент:** `[Engine]`
**Обязательства:** OBL-012

Как DPO, я хочу сгенерировать Shadow AI Policy (политику обнаружения и управления несанкционированным использованием AI), чтобы выполнить требования Art.26(7) по уведомлению работников.

**Acceptance Criteria:**
- [ ] `complior doc generate --type shadow-ai-policy` -- генерирует документ
- [ ] Секции: определение shadow AI, процедура обнаружения, порядок уведомления, санкции, исключения
- [ ] Pre-fill из passport: организация, существующие AI системы, approved tools
- [ ] Рекомендации по обнаружению: мониторинг DNS, анализ расходов, опрос сотрудников
- [ ] LLM-обогащение (--llm): дозаполнение специфичных для организации секций
- [ ] Формат: `.md` + `.json` в `.complior/reports/`

**Технические детали:**
- `engine/core/src/domain/documents/generators/shadow-ai-policy-generator.ts`
- Шаблон: `engine/core/data/templates/eu-ai-act/shadow-ai-policy.md`
- HTTP: `POST /documents/generate` с `type: "shadow-ai-policy"`

---

### US-S06-17: TUI Chat Assistant ✅ DONE
**Приоритет:** HIGH
**Продукт:** CLI
**Backlog ref:** C-23 (F-V9-TUI-01)
**Компонент:** `[CLI]`

Как разработчик, я хочу использовать chat assistant прямо в TUI, чтобы задавать вопросы по compliance в контексте текущего проекта без переключения в браузер.

**Acceptance Criteria:**
- [x] Hotkey `?` или `/` -- открывает chat overlay поверх текущей страницы
- [x] Ввод сообщения: текстовый input внизу overlay
- [x] Streaming ответ: отображается посимвольно (SSE от Engine `POST /chat`)
- [x] Контекст: автоматически прикрепляется текущая страница (Scan -> findings, Passport -> поля)
- [x] История: последние 20 сообщений сохраняются в сессии
- [x] Закрытие: Esc возвращает к текущей странице
- [x] Markdown rendering: ответ отображается с форматированием (bold, lists, code blocks)

**Технические детали:**
- `cli/src/views/chat/mod.rs` -- chat overlay view
- `cli/src/app/chat.rs` -- ChatState (messages, input, streaming)
- Подключение к `POST /chat` через `engine_client.rs`
- SSE parsing: `text/event-stream` -> streaming tokens
- Overlay rendering: поверх основного view с полупрозрачным фоном

---

### US-S06-18: Wizard-заполнение документов в TUI
**Приоритет:** HIGH
**Продукт:** CLI
**Backlog ref:** C-24 (F-V9-12)
**Компонент:** `[CLI]`

Как deployer, я хочу заполнять compliance-документы через пошаговый wizard в TUI, чтобы не редактировать markdown вручную.

**Acceptance Criteria:**
- [ ] `complior wizard fria <name>` или из TUI: Passport -> выбрать агента -> `w` (wizard)
- [ ] Пошаговый режим: по одному вопросу за раз, с контекстными подсказками
- [ ] Визуальный прогресс: `Step 3/12 ████████░░ 67%`
- [ ] Save/resume: промежуточное состояние сохраняется в `.complior/wizard-state.json`
- [ ] Интеграция с LLM: при нажатии `Tab` -- LLM предлагает ответ на текущий вопрос
- [ ] Завершение: генерирует `.md` + `.json` документ, удаляет wizard state
- [ ] Поддержка типов: FRIA, AI Policy, QMS, Risk Plan, Worker Notification

**Технические детали:**
- `cli/src/views/wizard/mod.rs` -- wizard view
- `cli/src/views/wizard/steps.rs` -- per-document type step definitions
- `cli/src/app/wizard.rs` -- WizardState (current_step, answers, document_type)
- Каждый шаг: `WizardStep { id, question, hint, field_path, input_type, guidance }`
- Input types: `Text`, `MultiLine`, `Select`, `MultiSelect`, `YesNo`
- HTTP: GET шаблон + guidance от Engine, POST заполненный документ

---

### US-S06-19: SaaS -- QMS Wizard
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-25 (F57)
**Компонент:** `[SaaS]`
**Обязательства:** Art.17, AESIA Guide #4

Как compliance officer в SaaS дашборде, я хочу заполнить QMS (Quality Management System) через пошаговый wizard, чтобы сгенерировать документ по Art.17 без привлечения консультанта.

**Acceptance Criteria:**
- [ ] Wizard: 5 шагов (Область применения, Политика качества, Ресурсы, Процессы, Аудит)
- [ ] Pre-fill из данных организации: название, отрасль, количество AI систем
- [ ] Per-step: текстовые поля + dropdown + чеклисты
- [ ] Preview: предпросмотр сгенерированного документа перед сохранением
- [ ] Сохранение: ComplianceDocument (type: qms) + DocumentSection (per-step)
- [ ] Экспорт: PDF + DOCX
- [ ] AESIA Guide #4 ссылки: per-step guidance из стандарта

**Технические детали:**
- Frontend: `app/(dashboard)/documents/qms/page.tsx` -- wizard компонент
- Backend: `POST /api/documents/generate` с type: `qms`, body: wizard answers
- Шаблон QMS: 8 секций по Art.17 (scope, policy, resources, processes, procedures, responsibility, audit, records)
- БД: ComplianceDocument + DocumentSection (существующие таблицы)

---

### US-S06-20: SaaS -- Risk Management Plan Wizard
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-26 (F58)
**Компонент:** `[SaaS]`

Как DPO в SaaS дашборде, я хочу создать Risk Management Plan per-system через wizard, чтобы документировать риски каждой AI системы по Art.9.

**Acceptance Criteria:**
- [ ] Wizard привязан к конкретной AI системе (AITool)
- [ ] Шаги: Идентификация рисков -> Вероятность x Последствия -> Меры -> Остаточный риск -> Мониторинг
- [ ] Risk matrix: 5x5 (probability x impact), визуальная heat map
- [ ] Pre-fill: findings из scan results -> предзаполненные risk entries
- [ ] Ответственный: выбор из Members организации
- [ ] Периодичность пересмотра: quarterly / semi-annual / annual
- [ ] Сохранение: ComplianceDocument (type: risk_plan) + связь с AITool

**Технические детали:**
- Frontend: `app/(dashboard)/documents/risk-plan/page.tsx`
- Backend: расширение `POST /api/documents/generate` type: `risk_plan`
- Risk matrix компонент: интерактивная 5x5 таблица с drag-and-drop рисков
- Связь с CLI: findings из `POST /api/sync/scan` маппятся на risk entries

---

### US-S06-21: SaaS -- Monitoring Plan Wizard
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-27 (F59)
**Компонент:** `[SaaS]`
**Обязательства:** Art.72, AESIA Guide #13

Как deployer в SaaS дашборде, я хочу создать Post-Market Monitoring Plan через wizard, чтобы выполнить требования Art.72 по мониторингу AI системы после развёртывания.

**Acceptance Criteria:**
- [ ] Wizard: привязан к конкретной AI системе
- [ ] Шаги: Метрики мониторинга -> Частота -> Пороги -> Эскалация -> Ответственные
- [ ] Метрики: accuracy, fairness, response time, error rate, user complaints (выбор из списка + кастомные)
- [ ] Пороги: per-metric threshold -> alert -> action plan
- [ ] Эскалация: 3 уровня (monitor -> investigate -> suspend)
- [ ] Pre-fill: если есть scan data -> предзаполнение текущих метрик
- [ ] Сохранение: ComplianceDocument (type: monitoring_plan)

**Технические детали:**
- Frontend: `app/(dashboard)/documents/monitoring-plan/page.tsx`
- Backend: расширение `POST /api/documents/generate` type: `monitoring_plan`
- AESIA Guide #13 reference: per-step ссылки на конкретные секции стандарта
- Metrics catalog: JSON с 20+ предопределённых метрик AI мониторинга

---

### US-S06-22: SaaS -- EU Database Helper
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-34 (F47)
**Компонент:** `[SaaS]`
**Обязательства:** Art.49

Как deployer в SaaS дашборде, я хочу использовать помощник регистрации в EU Database (Art.49, ~40 полей), чтобы подготовить данные и минимизировать ошибки при регистрации.

**Acceptance Criteria:**
- [ ] Wizard: ~40 полей формы, разбитых на 5 секций (General, Technical, Risk, Compliance, Contact)
- [ ] Pre-fill: 60-90% полей из Passport (name, provider, deployer, risk_class, description, capabilities)
- [ ] Чеклист: "Готово к регистрации" -- все обязательные поля заполнены
- [ ] Gap indicator: красные поля = не хватает для регистрации
- [ ] Ссылка на EU Database: прямой URL для каждой юрисдикции
- [ ] Экспорт: JSON для импорта в EU Database (если API станет доступен)
- [ ] Обновление Passport: после регистрации -> `eu_database_registered: true`

**Технические детали:**
- Frontend: `app/(dashboard)/eu-database/page.tsx` -- wizard + чеклист
- Backend: `POST /api/eu-database/prepare` -- pre-fill из AITool + SyncPassport
- EU Database field mapping: `data/eu-database-fields.json` (~40 полей)
- Валидация: per-field Zod validation с сообщениями на языке пользователя

---

### US-S06-23: SaaS -- Справочник регуляторов
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-35 (F53)
**Компонент:** `[SaaS]`

Как compliance officer в SaaS дашборде, я хочу видеть справочник всех 30 регуляторов EU/EEA (Market Surveillance Authorities), чтобы знать куда подавать документы и сообщать об инцидентах.

**Acceptance Criteria:**
- [ ] Таблица: 27 EU + 3 EEA стран
- [ ] Per-regulator: название, страна, контакт (email, сайт), способ подачи, национальные особенности
- [ ] Фильтрация: по стране, по языку коммуникации
- [ ] Deep link: из obligation "Report to MSA" -> прямая ссылка на нужного регулятора
- [ ] Обновление: seed data, в будущем -- из regulatory monitoring (D-45)
- [ ] Shared с Engine: данные доступны и в CLI (`engine/core/data/regulators/`)

**Технические детали:**
- Frontend: `app/(dashboard)/regulators/page.tsx` -- таблица + фильтры
- Backend: `GET /api/regulators` -- список из seed data
- Seed: `data/eu-msa-authorities.json` (30 записей)
- Связь с jurisdictions: passport `jurisdictions[]` -> relevant regulators

---

### US-S06-24: SaaS -- Запрос документации у вендора
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-36 (F51)
**Компонент:** `[SaaS]`
**Обязательства:** Art.13, Art.26

Как deployer в SaaS дашборде, я хочу отправить формализованный запрос на техническую документацию вендору AI системы (Art.13, Art.26), чтобы получить необходимую информацию для compliance.

**Acceptance Criteria:**
- [ ] Шаблон запроса: юридические ссылки на Art.13/Art.26, список запрашиваемых документов
- [ ] Per-system: запрос привязан к конкретной AI системе (AITool)
- [ ] Документы запрашиваются: tech docs, training data info, performance metrics, risk assessment
- [ ] Tracking: статус запроса (sent / reminded / received / overdue)
- [ ] Email preview: генерация email с юридическими формулировками
- [ ] Community evidence: если другие deployers уже запрашивали у этого вендора -> показать статус
- [ ] Дедлайн: 30 дней на ответ (configurable), автоматическое напоминание

**Технические детали:**
- Frontend: `app/(dashboard)/vendors/request/page.tsx`
- Backend: `POST /api/vendors/request` -- создание запроса, email шаблон
- БД: VendorRequest таблица (aiToolId, status, sentAt, dueDate, response)
- Email templates: `data/vendor-request-templates/` (EN, DE, FR)

---

### US-S06-25: SaaS -- Vendor Communication Templates
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-33 (F-V9-20)
**Компонент:** `[SaaS]`

Как deployer в SaaS дашборде, я хочу использовать готовые шаблоны коммуникации с вендорами на основании gap analysis, чтобы формулировать юридически корректные запросы.

**Acceptance Criteria:**
- [ ] 5+ шаблонов: запрос tech docs, запрос training data info, запрос bias report, запрос incident report, жалоба на несоответствие
- [ ] Per-template: юридические ссылки на конкретные статьи AI Act
- [ ] Auto-fill: из gap analysis -> конкретные вопросы по недостающим данным
- [ ] Форматы: email text + formal letter (PDF)
- [ ] Локализация: EN, DE (минимум)

**Технические детали:**
- Frontend: `app/(dashboard)/vendors/templates/page.tsx`
- Backend: `GET /api/vendors/templates`, `POST /api/vendors/templates/generate`
- Templates: `data/vendor-communication-templates/` (JSON + markdown)
- Связь с gap analysis: `gapAnalysisId` -> конкретные gaps -> конкретные вопросы

---

### US-S06-26: SaaS -- Eva AI Assistant (backend)
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-41 (F06)
**Компонент:** `[SaaS]`

Как пользователь SaaS дашборда, я хочу использовать Eva -- AI чат-ассистента, чтобы задавать вопросы по EU AI Act и получать ответы в контексте моей организации.

**Acceptance Criteria:**
- [ ] `POST /api/eva/chat` -- отправить сообщение, получить ответ (streaming)
- [ ] Контекст: организация, AI системы, текущий compliance score, gap analysis
- [ ] System prompt: EU AI Act эксперт, знает все 108 обязательств, дедлайны, штрафы
- [ ] Модель: Mistral Medium (hosted) или BYOK (Enterprise)
- [ ] История: Conversation + ChatMessage (существующие таблицы)
- [ ] Rate limiting: 50 сообщений/мес (Growth), 500/мес (Enterprise)
- [ ] Ответы со ссылками на конкретные статьи AI Act

**Технические детали:**
- Backend: `routes/eva.ts` -- Fastify route handler, streaming response
- LLM: Vercel AI SDK `streamText()` с Mistral provider
- Context injection: `buildEvaContext()` -- org data, AI systems, compliance state
- Conversation persistence: Conversation + ChatMessage таблицы (уже в схеме)

---

### US-S06-27: SaaS -- Eva Tool Calling
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-42 (F10)
**Компонент:** `[SaaS]`

Как пользователь SaaS дашборда, я хочу чтобы Eva могла вызывать функции платформы ("Сгенерируй FRIA для HireVue", "Какой у нас score?"), чтобы выполнять действия через чат.

**Acceptance Criteria:**
- [ ] Eva поддерживает 5+ инструментов: `get_score`, `generate_fria`, `list_ai_systems`, `get_obligations`, `get_gaps`
- [ ] Tool calling: Vercel AI SDK `tools` parameter с Zod schemas
- [ ] Результат инструмента: форматированный ответ в чате
- [ ] Подтверждение: мутирующие действия (generate_fria) требуют подтверждения пользователя
- [ ] Audit log: каждый tool call логируется
- [ ] Error handling: если tool call fail -> человекочитаемое сообщение

**Технические детали:**
- Backend: расширение `routes/eva.ts` -- tool definitions + executors
- Tools: `tools/eva-tools.ts` -- Zod schemas + executor functions
- Каждый tool: `{ name, description, parameters: ZodSchema, execute: async (args) => result }`
- Подтверждение: двухшаговый flow (Eva предлагает -> User подтверждает -> Eva выполняет)

---

### US-S06-28: SaaS -- ISO 42001 Readiness Dashboard
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-49 (F-V9-27)
**Компонент:** `[SaaS]`

Как compliance officer в SaaS дашборде, я хочу видеть readiness к ISO 42001 (Clauses 4-10 + 39 Annex A контролей), чтобы оценить готовность к сертификации.

**Acceptance Criteria:**
- [ ] Dashboard: per-clause score (Clauses 4-10: Context, Leadership, Planning, Support, Operation, Evaluation, Improvement)
- [ ] Annex A: 39 контролей с per-control статусом (implemented / partial / not started)
- [ ] Маппинг: ISO 42001 контроли -> EU AI Act obligations (cross-reference)
- [ ] Per-AI-system: readiness breakdown (разные системы -- разный уровень готовности)
- [ ] Evidence links: per-control ссылка на evidence (документы, scan results, passport данные)
- [ ] Overall readiness %: агрегированный score
- [ ] Зависимость от Engine: ISO 42001 docs (E-21/E-22/E-23) синхронизируются через CLI Sync

**Технические детали:**
- Frontend: `app/(dashboard)/iso-42001/page.tsx` -- readiness dashboard
- Backend: `GET /api/iso-42001/readiness` -- per-system readiness
- Data: `iso-42001-controls.json` (39 контролей из Annex A)
- Cross-mapping: `iso-42001-to-euaia.json` (ISO control -> OBL-xxx)
- Рассчёт score: implemented controls / total applicable controls * 100

---

### US-S06-29: SaaS -- Shadow AI Discovery
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-37 (F29)
**Компонент:** `[SaaS]`

Как DPO в SaaS дашборде, я хочу обнаруживать несанкционированное использование AI (shadow AI) через интеграцию с Google Workspace и Slack, чтобы включить все AI системы в реестр.

**Acceptance Criteria:**
- [ ] Интеграция: Google Workspace Admin API (installed apps, OAuth grants)
- [ ] Интеграция: Slack API (installed apps, bot users)
- [ ] Обнаружение: AI tools из каталога 5,011+ tools -> match с installed apps
- [ ] Результат: список shadow AI tools с: название, количество пользователей, дата установки
- [ ] Рекомендация: per-tool: "Add to registry" / "Block" / "Approve"
- [ ] Периодичность: ежедневный/еженедельный скан (pg-boss cron)
- [ ] Privacy: не собирать содержание сообщений, только metadata (app names, install dates)

**Технические детали:**
- Backend: `services/shadow-ai-discovery.ts`
- Google Workspace: Admin SDK API (Directory API, OAuth2 API)
- Slack: `GET /api/apps.list`, `GET /api/team.integrationLogs`
- Matching: fuzzy match app names vs AI tool catalog (5,011+ entries)
- pg-boss: `shadow-ai-scan` job, configurable schedule

---

### US-S06-30: SaaS -- Data Source Indicator
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-17 (F63)
**Компонент:** `[SaaS]`

Как DPO в SaaS дашборде, я хочу видеть рядом с каждым полем индикатор источника данных ("CLI scan, 5 мар" / "Введено вручную"), чтобы понимать надёжность каждого значения.

**Acceptance Criteria:**
- [ ] Per-field индикатор: `[CLI]` / `[Manual]` / `[Eva]` с датой последнего обновления
- [ ] Цветовая кодировка: CLI (синий) = высокая надёжность, Manual (серый) = низкая, Eva (оранжевый) = AI
- [ ] На страницах: AI System detail, Passport view, FRIA detail
- [ ] Tooltip: при наведении -> полная информация (sync date, CLI version, user name)
- [ ] API: `GET /api/data-provenance/<entityType>/<entityId>` -> per-field provenance
- [ ] SyncHistory: используется для определения CLI-полей (существующая таблица)

**Технические детали:**
- Frontend: `DataSourceBadge` компонент (reusable)
- Backend: `services/data-provenance.ts` -- определение источника per-field
- SyncHistory: `sync_type`, `synced_at`, `payload_fields[]` -> маппинг на entity fields
- ComplianceDocument + AITool: добавить `field_provenance: Record<string, DataSource>` (JSON blob)

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| MCP Proxy Core: proxy запускается и перехватывает вызовы | US-S06-01 |
| Proxy Policy Engine: 4 типа политик | US-S06-02 |
| LLM Chat: streaming ответы в Engine | US-S06-03 |
| FRIA LLM-дозаполнение: таблица 8 прав | US-S06-04 |
| LLM Document Enricher: 5 типов документов | US-S06-05 |
| Inline Guidance: 6 шаблонов с подсказками | US-S06-06 |
| ISO 42001: 3 документа (Policy, SoA, Risk Register) | US-S06-07 |
| Cost Estimator: per-finding + rollup | US-S06-08 |
| "Why This Matters": enriched findings | US-S06-09 |
| Incident Report Template: Art.73 | US-S06-10 |
| Passport Import: A2A format | US-S06-11 |
| Evidence Export: ZIP для аудитора | US-S06-12 |
| NHI Scanner: API keys, service accounts | US-S06-13 |
| Multi-Jurisdiction: 30 стран | US-S06-14 |
| Agent Remediation: per-framework | US-S06-15 |
| Shadow AI Policy: генерация документа | US-S06-16 |
| TUI Chat Assistant: overlay с streaming | US-S06-17 |
| TUI Wizard: пошаговое заполнение | US-S06-18 |
| SaaS QMS Wizard | US-S06-19 |
| SaaS Risk Management Plan Wizard | US-S06-20 |
| SaaS Monitoring Plan Wizard | US-S06-21 |
| SaaS EU Database Helper | US-S06-22 |
| SaaS Справочник регуляторов (30 MSA) | US-S06-23 |
| SaaS Запрос документации у вендора | US-S06-24 |
| SaaS Vendor Communication Templates | US-S06-25 |
| SaaS Eva AI backend | US-S06-26 |
| SaaS Eva Tool Calling (5+ tools) | US-S06-27 |
| SaaS ISO 42001 Readiness Dashboard | US-S06-28 |
| SaaS Shadow AI Discovery | US-S06-29 |
| SaaS Data Source Indicator | US-S06-30 |
| Тесты проходят | cargo test + npx vitest run |

---

## Сводка по компонентам

| Компонент | User Stories | Приоритет |
|-----------|-------------|-----------|
| `[Engine]` | US-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16 | 1 CRITICAL, 7 HIGH, 8 MEDIUM |
| `[CLI]` | US-08, 12, 17, 18 | 2 HIGH, 2 MEDIUM |
| `[SaaS]` | US-19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 | 8 HIGH, 4 MEDIUM |

---

## Зависимости от CLI -> SaaS

| CLI фича (этот спринт) | SaaS фича (этот спринт) | Тип |
|------------------------|------------------------|-----|
| E-21/E-22/E-23 ISO 42001 docs | D-49 ISO 42001 Readiness | ЖЁСТКАЯ |
| E-42 NHI Scanner | D-47 NHI Dashboard (S10) | МЯГКАЯ |
| E-81 MCP Proxy Core | D-46 Proxy Analytics (S10) | МЯГКАЯ |
| E-47 LLM Chat (Engine) | D-41 Eva AI Assistant (SaaS) | МЯГКАЯ (параллельная разработка) |
| `engine/core/data/regulators/` | D-35 Справочник регуляторов | СРЕДНЯЯ (shared data) |

---

## Ожидаемые тесты

| Компонент | Текущих | Новых (оценка) | Итого |
|-----------|---------|----------------|-------|
| Engine (TS) | 483 | ~80 | ~563 |
| SDK (TS) | 116 | ~10 | ~126 |
| CLI (Rust) | 345 | ~40 | ~385 |
| SaaS (TS) | 554 | ~50 | ~604 |
| **ИТОГО** | **1498** | **~180** | **~1678** |

---

**Обновлено:** 2026-03-13 v1.1.0 -- 30 US (16 Engine, 4 CLI, 12 SaaS), unified sprint, LLM + ISO 42001 + MCP Proxy + SaaS Regulatory. US-S06-03 (LLM Chat Service) and US-S06-17 (TUI Chat Assistant) DONE (commit e6809bd)
