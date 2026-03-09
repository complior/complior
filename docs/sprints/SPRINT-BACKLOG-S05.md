# Sprint S05 — SDK Production + Agent Governance + SaaS Registry

**Версия:** 1.0.0
**Дата:** 2026-03-07
**Статус:** Planning

---

## Обзор

Самый крупный и критический спринт v8. Три стратегических направления:

1. **SDK Production** — переход pre/post хуков из «декоративных» в production-ready: Prohibited (50+ паттернов, 35M EUR штраф), Sanitize (50+ PII типов, GDPR Art.9), Permission verify (tool_calls parsing), Disclosure verify (мультиязычная), Bias detection (15 защищённых характеристик EU Charter), HTTP middleware.
2. **Agent Governance** — фреймворк управления AI-агентами: реестр, per-agent compliance score, матрица разрешений, audit trail, policy templates, behavior contracts, permission scanner.
3. **SaaS Registry + Certification** — единый реестр AI систем (CLI + SaaS), wizard расширение, расширенные поля Passport, Cert Readiness Dashboard, Compliance Badge.

Unified спринт: CLI/TUI (open-source) + SaaS Dashboard. Runtime Control (E-63..E-72) сгруппирован в 3 US. Сертификация (AIUC-1 + Adversarial) — блокирующие зависимости для SaaS D-40.

**Цель:** SDK хуки — production-ready (8 Art.5 категорий, 50+ PII, tool_call parsing), agent governance framework, SaaS unified registry, AIUC-1 readiness score.

---

## User Stories

### US-S05-01: Prohibited Hook — 50+ паттернов, 8 категорий Art.5
**Приоритет:** CRITICAL
**Продукт:** SDK
**Backlog ref:** S-09, S-29
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы prohibited hook покрывал все 8 категорий Art.5 с 50+ паттернами, синонимами и мультиязычной поддержкой, чтобы гарантировать блокировку запрещённых AI-практик (штраф до 35M EUR).

**Acceptance Criteria:**
- [ ] 50+ паттернов по 8 категориям Art.5: subliminal manipulation, exploitation of vulnerabilities, social scoring, predictive policing, untargeted facial scraping, emotion inference in workplace/education, biometric categorization, real-time remote biometric identification
- [ ] Синонимы для каждого паттерна (минимум 3 на категорию)
- [ ] Мультиязычная поддержка: DE, FR, NL (ключевые EU языки)
- [ ] LLM fallback через Guard API opt-in: `{ guardApi: true }` в конфиге
- [ ] Configurable strictness: `strict` (default, все категории) vs `standard` (без grey-area)
- [ ] Возвращает `ProhibitedContentError` с `category`, `matched_pattern`, `article_reference`
- [ ] Unit-тесты: 50+ test cases (по 1 на паттерн минимум)

**Технические детали:**
- `engine/sdk/src/hooks/pre/prohibited.ts` — основная логика
- `engine/sdk/src/data/prohibited-patterns.ts` — база паттернов с категоризацией
- `engine/sdk/src/data/prohibited-i18n/` — мультиязычные паттерны (de.ts, fr.ts, nl.ts)
- Guard API fallback: POST `/guard/prohibited` с текстом промпта

---

### US-S05-02: Sanitize Hook — 50+ PII типов, чексуммы, GDPR Art.9
**Приоритет:** CRITICAL
**Продукт:** SDK
**Backlog ref:** S-10, S-30
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы sanitize hook распознавал 50+ типов PII включая EU-специфичные идентификаторы с валидацией чексумм, чтобы соблюдать GDPR Art.9 (специальные категории данных).

**Acceptance Criteria:**
- [ ] IBAN — все 34 страны с валидацией по ISO 13616 (checksum mod 97)
- [ ] Национальные ID: BSN (Нидерланды, 11-check), Personalausweis (Германия), NIR (Франция, 13+2 digits), PESEL (Польша, 11 digits), Codice Fiscale (Италия)
- [ ] Медицинские ID: EHIC (European Health Insurance Card), national health IDs
- [ ] EU паспорта: формат по стране (буква + цифры)
- [ ] GDPR Art.9 специальные категории: расовое/этническое происхождение, политические взгляды, религия, профсоюзное членство, генетические данные, биометрические данные, здоровье, сексуальная ориентация
- [ ] Configurable: `replace` (default, маскировка `[PII:IBAN]`) vs `block` (отклонение) vs `warn` (логирование)
- [ ] Checksum validation: только подтверждённые PII маскируются, ложные срабатывания < 1%
- [ ] 50+ unit-тестов с реальными (анонимизированными) форматами

**Технические детали:**
- `engine/sdk/src/hooks/pre/sanitize.ts` — основная логика
- `engine/sdk/src/data/pii-patterns.ts` — регулярные выражения + валидаторы
- `engine/sdk/src/data/pii-validators/` — checksum-валидаторы по странам (iban.ts, bsn.ts, nir.ts, pesel.ts)
- GDPR Art.9 паттерны: контекстно-зависимые (ищут рядом стоящие ключевые слова)

---

### US-S05-03: Permission Hook — парсинг tool_calls из ответа
**Приоритет:** CRITICAL
**Продукт:** SDK
**Backlog ref:** S-11, S-31
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы permission hook парсил tool_calls из ответов OpenAI/Anthropic/Google и блокировал вызовы инструментов вне allowlist, чтобы контролировать действия AI-агента в runtime.

**Acceptance Criteria:**
- [ ] Post-hook: парсит `tool_calls` из OpenAI response format (`choices[].message.tool_calls[]`)
- [ ] Парсинг Anthropic format (`content[].type === 'tool_use'`)
- [ ] Парсинг Google Gemini format (`candidates[].content.parts[].functionCall`)
- [ ] Блокировка если tool name не в `allowlist` или в `denylist`
- [ ] Логирование denied tool_calls: tool name, agent ID, timestamp, reason
- [ ] Configurable action: `block` (default), `warn`, `log-only`
- [ ] Интеграция с Agent Passport: permissions.tools как allowlist по умолчанию
- [ ] 15+ тестов: по 3 на каждый провайдер + edge cases

**Технические детали:**
- `engine/sdk/src/hooks/post/permission-tool-calls.ts` — post-hook логика
- `engine/sdk/src/parsers/tool-call-parser.ts` — unified parser для 3 форматов
- Обновить `engine/sdk/src/agent.ts` — `compliorAgent()` wires passport permissions в hook

---

### US-S05-04: Disclosure Verify Hook — мультиязычная проверка
**Приоритет:** HIGH
**Продукт:** SDK
**Backlog ref:** S-20, S-32
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы disclosure verify hook проверял наличие disclosure-фраз в ответах AI на 4 языках, чтобы выполнить Art.50(1) — пользователь должен знать что взаимодействует с AI.

**Acceptance Criteria:**
- [ ] Regex-based проверка response text на disclosure phrases
- [ ] 4 языка: EN ("AI-generated", "artificial intelligence"), DE ("KI-generiert", "künstliche Intelligenz"), FR ("généré par l'IA", "intelligence artificielle"), ES ("generado por IA", "inteligencia artificial")
- [ ] Configurable: `warn-only` (логирует отсутствие) vs `block` (отклоняет response без disclosure)
- [ ] Custom phrases: пользователь может добавить свои паттерны через config
- [ ] Возвращает `DisclosureMissingError` с `language`, `expected_patterns`
- [ ] Post-hook: не модифицирует response, только проверяет

**Технические детали:**
- `engine/sdk/src/hooks/post/disclosure-verify.ts` — основная логика
- `engine/sdk/src/data/disclosure-phrases.ts` — фразы по языкам
- OBL-015, Art.50(1): "persons interacting with an AI system shall be informed"

---

### US-S05-05: Bias Detection Hook — 15 защищённых характеристик
**Приоритет:** HIGH
**Продукт:** SDK
**Backlog ref:** S-21, S-33
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы bias hook проверял response на предвзятость по 15 защищённым характеристикам EU Charter, чтобы обеспечить fairness AI-системы.

**Acceptance Criteria:**
- [ ] 15 характеристик: sex, race, colour, ethnic/social origin, genetic features, language, religion, political opinion, national minority, property, birth, disability, age, sexual orientation, nationality
- [ ] Weighted scoring: каждое обнаружение = weight × severity
- [ ] Severity levels: LOW (stereotyping language), MEDIUM (differential treatment), HIGH (discriminatory outcome), CRITICAL (explicit slur/hate)
- [ ] Context-aware: HR контекст → stricter thresholds (настраивается через `domain` в config)
- [ ] Domain profiles: `general` (default), `hr` (stricter), `finance`, `healthcare`, `education`
- [ ] Configurable threshold: `biasThreshold: 0.3` (default) — ниже = строже
- [ ] Возвращает `BiasDetectedError` с массивом `{ characteristic, severity, evidence, score }`

**Технические детали:**
- `engine/sdk/src/hooks/post/bias-check.ts` — основная логика (расширение существующего файла)
- `engine/sdk/src/data/bias-patterns.ts` — паттерны по характеристикам
- `engine/sdk/src/data/bias-profiles.ts` — domain-specific конфигурации
- EU Charter of Fundamental Rights: Art.21 non-discrimination

---

### US-S05-06: HTTP Middleware — SDK адаптеры для фреймворков
**Приоритет:** HIGH
**Продукт:** SDK
**Backlog ref:** S-24, S-36
**Компонент:** `[SDK]`

Как разработчик, я хочу подключить compliance middleware к моему HTTP-серверу одной строкой, чтобы автоматически инжектить compliance headers во все AI-ответы.

**Acceptance Criteria:**
- [ ] `compliorMiddleware(framework)` — фабрика для Express/Fastify/Hono/Next.js
- [ ] Auto-inject headers: `X-AI-Disclosure: true/false`, `X-AI-Provider: openai|anthropic|...`, `X-AI-Model: gpt-4|claude-3|...`, `X-Compliance-Score: 0-100`
- [ ] Express adapter: `app.use(compliorMiddleware('express'))`
- [ ] Fastify adapter: `fastify.register(compliorMiddleware('fastify'))`
- [ ] Hono adapter: `app.use(compliorMiddleware('hono'))`
- [ ] Next.js adapter: middleware.ts export
- [ ] Headers configurable: whitelist/blacklist каких headers инжектить
- [ ] 12+ тестов: по 3 на фреймворк

**Технические детали:**
- `engine/sdk/src/middleware/` — новая директория
- `engine/sdk/src/middleware/express.ts`, `fastify.ts`, `hono.ts`, `nextjs.ts`
- `engine/sdk/src/middleware/index.ts` — фабрика `compliorMiddleware()`
- Headers основаны на OBL-015 (disclosure), OBL-016 (content marking)

---

### US-S05-07: Finding Explanations — статический маппинг
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-13
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы каждый finding содержал ссылку на статью, размер штрафа, дедлайн и бизнес-импакт, чтобы понимать критичность и приоритет исправления.

**Acceptance Criteria:**
- [ ] Статический маппинг `check_id → explanation` в JSON
- [ ] Каждый explanation содержит: `article` (например "Art.9(1)"), `penalty` (например "€15M or 3%"), `deadline` ("2 Aug 2026"), `business_impact` (1-3 предложения)
- [ ] Маппинг покрывает все существующие check_ids (19+ проверок сканера)
- [ ] Finding объект расширен полем `explanation?: FindingExplanation`
- [ ] TUI Scan page: в detail panel — секция "Why it matters" с explanation
- [ ] HTTP API: `/scan` response включает explanations
- [ ] Rust-тип `FindingExplanation` с `#[serde(default)]`

**Технические детали:**
- `engine/core/src/data/finding-explanations.json` — статический маппинг
- `engine/core/src/domain/scanner/finding-explainer.ts` — функция `explainFinding(checkId)`
- `cli/src/types/engine.rs` — `FindingExplanation { article, penalty, deadline, business_impact }`
- `cli/src/views/scan/detail.rs` — рендер explanation

---

### US-S05-08: Worker Notification Generator
**Приоритет:** HIGH
**Продукт:** Engine + CLI
**Backlog ref:** E-18, C.D02
**Компонент:** `[Engine]` `[CLI]`

Как deployer AI-системы, я хочу сгенерировать уведомление для работников (Art.26(7)), чтобы выполнить обязательное требование информирования.

**Acceptance Criteria:**
- [ ] `complior agent notify <name>` — генерация из passport
- [ ] HTTP: `POST /agent/notify` с `{ name: string }`
- [ ] Pre-filled из passport: system name, purpose, data used, capabilities, how to object, human oversight level
- [ ] Output: `.complior/reports/worker-notification-{agent-id}.md`
- [ ] Шаблон на основе Art.26(7) requirements: что за система, какие данные обрабатывает, цели, права работника
- [ ] Updates passport: `worker_notification_sent: true, worker_notification_date: ISO-8601`
- [ ] Тесты: 5+ (генерация, pre-fill, passport update, edge cases)

**Технические детали:**
- `engine/core/data/templates/eu-ai-act/worker-notification.md` — шаблон
- `engine/core/src/domain/documents/worker-notification-generator.ts` — генератор
- `engine/core/src/services/passport-service.ts` — метод `generateWorkerNotification()`
- `engine/core/src/http/routes/agent.route.ts` — `POST /agent/notify`
- `cli/src/cli.rs` — `AgentAction::Notify`
- `cli/src/headless/agent.rs` — `run_agent_notify()`

---

### US-S05-09: Passport Export Hub — A2A, AIUC-1, NIST
**Приоритет:** HIGH
**Продукт:** Engine + CLI
**Backlog ref:** E-33, C.S08
**Компонент:** `[Engine]` `[CLI]`

Как разработчик, я хочу экспортировать Agent Passport в форматы A2A (Google Agent Card), AIUC-1 и NIST AI RMF, чтобы интегрироваться с другими compliance-экосистемами.

**Acceptance Criteria:**
- [ ] `complior agent export <name> --format a2a` → Google Agent Card JSON
- [ ] `complior agent export <name> --format aiuc-1` → AIUC-1 compliance profile
- [ ] `complior agent export <name> --format nist` → NIST AI RMF Playbook profile
- [ ] Маппинг 36 полей passport → target format fields (документирован в коде)
- [ ] Output: `.complior/exports/{name}-{format}-{timestamp}.json`
- [ ] HTTP: `GET /agent/export?name=X&format=a2a|aiuc-1|nist`
- [ ] Валидация output: каждый формат проверяется Zod-схемой
- [ ] 9+ тестов: по 3 на формат (маппинг, полный passport, incomplete passport)

**Технические детали:**
- `engine/core/src/domain/passport/export/` — новая директория
- `engine/core/src/domain/passport/export/a2a-mapper.ts` — Google Agent Card маппинг
- `engine/core/src/domain/passport/export/aiuc1-mapper.ts` — AIUC-1 маппинг
- `engine/core/src/domain/passport/export/nist-mapper.ts` — NIST AI RMF маппинг
- `engine/core/src/http/routes/agent.route.ts` — `GET /agent/export`
- `cli/src/cli.rs` — `AgentAction::Export { name, format }`

---

### US-S05-10: Agent Permission Scanner — AST-based discovery
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-29, C.S03
**Компонент:** `[Engine]`
**Статус:** DONE

Как разработчик, я хочу чтобы scanner обнаруживал фактические permissions агента из кода и сравнивал с декларированными в passport, чтобы находить undeclared permissions.

**Acceptance Criteria:**
- [x] AST-based discovery: tool definitions, API calls, data access, file operations
- [x] Парсинг: LangChain tools, CrewAI tools, OpenAI function definitions, MCP tool registrations
- [x] Сравнение discovered vs declared в passport `permissions.tools[]`
- [x] Alert: `undeclared-permission` finding (severity HIGH) с указанием tool name и file:line
- [x] Report: permission diff (declared but unused, used but undeclared)
- [x] Integration: cross-layer rule #7 `permission-passport-mismatch`
- [x] 10+ тестов: discovery для каждого framework + comparison

**Технические детали:**
- `engine/core/src/domain/scanner/checks/permission-scanner.ts` — discovery логика
- `engine/core/src/domain/scanner/checks/cross-layer.ts` — rule #7 добавить
- Расширить `engine/core/src/domain/passport/permission-scanner.ts` (переиспользование AST)
- OBL-011b: Art.26(4) — input data relevance

---

### US-S05-11: Agent Behavior Contract — Passport Extension
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-30, C.S04
**Компонент:** `[Engine]`
**Статус:** DONE (реализовано как расширение passport, а не отдельный файл)

Как разработчик, я хочу определить формальный контракт поведения агента (эскалация, PII-границы), чтобы иметь верифицируемую спецификацию для Art.9/Art.14.

**Acceptance Criteria:**
- [x] Расширение passport: `constraints.escalation_rules[]` (Art.14(4) structured human oversight)
- [x] Расширение passport: `permissions.data_boundaries{}` (Art.9(2) PII handling, geographic restrictions)
- [x] Auto-fill при `complior agent init`: `pii_handling: 'redact'` (default), `escalation_rules` из `human_approval_required`
- [x] Типы: `EscalationRule`, `DataBoundaries`, `PiiHandlingMode`, `EscalationAction` в `passport.types.ts` + Zod
- [x] Scanner check: `checkBehavioralConstraints()` — L1, risk-class-aware (high=strict, limited/minimal=medium)
- [x] SDK type sync: `AgentPassport` в `agent.ts` расширен named types
- [x] Finding explanation: `behavioral-constraints` в `finding-explanations.json`
- [x] 10+ тестов

**Технические детали:**
- `engine/core/src/types/passport.types.ts` — types + Zod schemas
- `engine/core/src/domain/passport/manifest-builder.ts` — auto-fill logic
- `engine/core/src/domain/scanner/checks/behavioral-constraints.ts` — новый L1 check
- `engine/core/src/domain/passport/manifest-files.ts` — shared helpers (extractRiskClass)
- `engine/sdk/src/agent.ts` — SDK type extension
- OBL-003: Art.9 risk management, OBL-014: Art.14(4) human oversight

---

### US-S05-12: Industry-Specific Scanner Patterns
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-10, C.012+
**Компонент:** `[Engine]`

Как разработчик в regulated industry, я хочу чтобы scanner обнаруживал отраслевые risk patterns и автоматически обновлял passport, чтобы получить точную классификацию по Annex III.

**Acceptance Criteria:**
- [ ] HR patterns (5+): recruitment AI, CV screening, employee monitoring, interview analysis, performance scoring
- [ ] Finance patterns (5+): credit scoring, insurance underwriting, fraud detection, trading AI, AML/KYC
- [ ] Healthcare patterns (5+): medical device, diagnosis AI, health data processing, drug discovery, patient monitoring
- [ ] Education patterns (4+): admissions AI, grading, student monitoring, learning analytics
- [ ] Auto-update passport `industry_context` и `industry_specific_obligations[]`
- [ ] Severity escalation: обнаружение HR recruitment → risk_class → HIGH (Annex III)
- [ ] 20+ тестов: по 5 на отрасль

**Технические детали:**
- `engine/core/src/domain/scanner/checks/industry/` — новая директория
- `engine/core/src/domain/scanner/checks/industry/hr.ts`, `finance.ts`, `healthcare.ts`, `education.ts`
- `engine/core/src/domain/scanner/checks/industry/index.ts` — агрегатор
- Расширить L4 (AST): industry pattern matching
- OBL: OBL-HR-001..003, OBL-FIN-001..003, OBL-MED-001..002, OBL-EDU-001..002

---

### US-S05-13: Agent Registry + Per-Agent Compliance Score
**Приоритет:** HIGH
**Продукт:** Engine + CLI
**Backlog ref:** E-52, E-53, C.F13, C.F14
**Компонент:** `[Engine]` `[CLI]`

Как разработчик, я хочу видеть все AI-агенты в локальном реестре с per-agent compliance scores, чтобы управлять fleet'ом AI-систем.

**Acceptance Criteria:**
- [ ] `complior agent registry` — форматированный вывод реестра всех агентов
- [ ] Per-agent: compliance score (0-100), autonomy level, last scan date, completeness %, risk class
- [ ] Compliance score = weighted sum: passport completeness (30%), scanner score (40%), evidence completeness (15%), documentation (15%)
- [ ] TUI: Passport page показывает registry data (уже частично реализовано, расширить)
- [ ] Filter/sort: `--sort score`, `--sort risk`, `--filter high-risk`
- [ ] HTTP: `GET /agent/registry` с query params
- [ ] JSON output: `--json` флаг
- [ ] 8+ тестов

**Технические детали:**
- `engine/core/src/services/registry-service.ts` — новый сервис
- `engine/core/src/domain/registry/` — score calculation logic
- `engine/core/src/http/routes/agent.route.ts` — `GET /agent/registry`
- `cli/src/cli.rs` — `AgentAction::Registry`
- `cli/src/headless/agent.rs` — `run_agent_registry()`
- Зависит от passport-service, scan-service, evidence-store

---

### US-S05-14: Permissions Matrix + Unified Audit Trail
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-54, E-55, E-68, C.F15, C.F16
**Компонент:** `[Engine]` `[CLI]`

Как разработчик, я хочу видеть матрицу разрешений всех агентов и вести единый аудит-лог (passport events + compliance events), чтобы выполнить OBL-006 и OBL-011.

**Acceptance Criteria:**
- [ ] Permissions Matrix: таблица agent × permission (tools, data, actions)
- [ ] `complior agent permissions` — CLI вывод матрицы
- [ ] Cross-agent conflicts: alert если 2 агента имеют конфликтующие permissions
- [ ] Unified Audit Trail: passport events (create/update/export/fria) + compliance events (scan, fix, gate, disclosure, blocked actions)
- [ ] Audit storage: `.complior/audit/trail.jsonl` (signed append-only JSONL, каждая запись с ed25519 подписью)
- [ ] `complior agent audit [--agent <name>] [--since <date>] [--type <event_type>]` — просмотр trail
- [ ] HTTP: `GET /agent/permissions`, `GET /agent/audit`
- [ ] 12+ тестов

**Технические детали:**
- `engine/core/src/domain/registry/permissions-matrix.ts` — матрица
- `engine/core/src/domain/registry/audit-trail.ts` — signed JSONL append-only логгер
- `engine/core/src/http/routes/agent.route.ts` — новые маршруты
- `cli/src/cli.rs` — `AgentAction::Permissions`, `AgentAction::Audit`
- OBL-006: Art.12 logging, OBL-011: Art.26 deployment obligations

---

### US-S05-15: Policy Templates — отраслевые шаблоны
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-59, C.F22
**Компонент:** `[Engine]`

Как deployer, я хочу использовать готовые policy templates для моей отрасли, чтобы быстро создать compliance-документацию.

**Acceptance Criteria:**
- [ ] 5 отраслевых шаблонов: HR AI Usage Policy, Finance AI Risk Policy, Healthcare AI Governance, Education AI Ethics, Legal AI Policy
- [ ] Каждый шаблон: 10+ секций, pre-filled с industry-specific требованиями
- [ ] `complior policy generate --industry hr|finance|healthcare|education|legal`
- [ ] Pre-fill из passport: system name, owner, risk class, capabilities
- [ ] Output: `.complior/policies/{industry}-ai-policy-{timestamp}.md`
- [ ] HTTP: `POST /policy/generate` с `{ industry, passport_name }`
- [ ] 5+ тестов (по одному на шаблон)

**Технические детали:**
- `engine/core/data/templates/policies/` — шаблоны по отраслям
- `engine/core/src/domain/documents/policy-generator.ts` — генератор
- `engine/core/src/services/document-service.ts` — метод `generatePolicy()`
- OBL: OBL-HR, OBL-FIN, OBL-MED, OBL-EDU, OBL-LAW (Annex III)

---

### US-S05-16: Runtime Control — Disclosure + Content Marking + Interaction Logger ✅ DONE
**Приоритет:** HIGH
**Продукт:** Engine + SDK
**Backlog ref:** E-63, E-64, E-65, E-66
**Компонент:** `[Engine]` `[SDK]`

Как разработчик, я хочу чтобы AI Response Wrapper автоматически инжектировал disclosure, маркировал AI-контент и логировал все взаимодействия, чтобы выполнить OBL-015/016/006.

**Acceptance Criteria:**
- [x] AI Response Wrapper: обёртка вокруг LLM response с metadata (provider, model, timestamp, compliance score)
- [x] Disclosure Injection (OBL-015): автоматическая вставка "This content was generated by AI" (configurable text + позиция: prepend/append/header)
- [x] Content Marking Engine (OBL-016/018): метаданные в response body или headers, C2PA-compatible watermark metadata
- [x] Interaction Logger (OBL-006): структурированный лог каждого LLM call (prompt hash, response hash, model, latency, tokens, compliance checks passed/failed)
- [x] Log storage: `.complior/logs/interactions.jsonl` (append-only, auto-rotate при 100MB)
- [x] SDK integration: auto-enabled через `complior()` wrapper
- [x] Configurable: каждый компонент включается/выключается отдельно
- [x] 15+ тестов (19 tests)

**Технические детали:**
- `engine/sdk/src/runtime/response-wrapper.ts` — AI Response Wrapper
- `engine/sdk/src/runtime/disclosure-injector.ts` — Disclosure Injection
- `engine/sdk/src/runtime/content-marker.ts` — Content Marking
- `engine/sdk/src/runtime/interaction-logger.ts` — Interaction Logger
- OBL-015: Art.50(1), OBL-016: Art.50(2)(4), OBL-006: Art.12

---

### US-S05-17: Runtime Control — Safety Filter + Human-in-the-Loop Gate
**Приоритет:** HIGH
**Продукт:** Engine + SDK
**Backlog ref:** E-69, E-70
**Компонент:** `[Engine]` `[SDK]`

Как разработчик, я хочу чтобы output safety filter блокировал опасный контент и human-in-the-loop gate требовал подтверждение для critical actions, чтобы выполнить OBL-009 и OBL-008/024.

**Acceptance Criteria:**
- [x] Output Safety Filter (OBL-009): проверка LLM output на harmful content, PII leakage, hallucination indicators
- [x] Safety patterns: violence/self-harm/illegal instructions/PII in output
- [x] Configurable severity threshold: `block`, `warn`, `log`
- [x] Human-in-the-Loop Gate (OBL-008/024): callback mechanism для critical decisions
- [x] Gate triggers: configurable rules (e.g., actions with financial impact > threshold, data deletion, permission changes)
- [x] Gate API: `onGateTriggered(action, context) => Promise<boolean>` callback
- [x] Timeout: configurable, default 5 minutes, auto-deny on timeout
- [x] 14 тестов (8 safety + 6 HITL)

**Технические детали:**
- `engine/sdk/src/runtime/safety-filter.ts` — output safety filter
- `engine/sdk/src/runtime/hitl-gate.ts` — human-in-the-loop gate
- `engine/sdk/src/data/safety-patterns.ts` — harmful content patterns
- OBL-009: Art.15 accuracy/robustness, OBL-008: Art.14 human oversight, OBL-024: Art.26(2)(11)

---

### US-S05-18: Runtime Control — Compliance Proxy + SDK Adapters ✅ DONE
**Приоритет:** HIGH
**Продукт:** Engine + SDK
**Backlog ref:** E-72, E-71
**Компонент:** `[Engine]` `[SDK]`

Как разработчик, я хочу настроить compliance proxy и использовать улучшенные SDK адаптеры, чтобы иметь полный runtime compliance стек.

> **Note:** Audit Trail объединён в US-S05-14 (Unified Audit Trail).

**Acceptance Criteria:**
- [x] Compliance Proxy config (OBL-006/011): единый конфиг `.complior/proxy.toml` для всех runtime hooks (какие включены, thresholds, logging level)
- [x] Config hot-reload: изменение `.complior/proxy.toml` → обновление runtime без перезапуска
- [x] SDK Adapters (C.R09): улучшенные адаптеры — auto-detect provider, streaming support, retry logic
- [x] 23 тестов (requirement: 8+)

**Технические детали:**
- `engine/sdk/src/runtime/proxy-config.ts` — загрузка и hot-reload `.complior/proxy.toml`
- `engine/sdk/src/adapters/` — улучшенные адаптеры (расширение существующих)
- OBL-006: Art.12 logging, OBL-011: Art.26 deployment

---

### US-S05-19: AIUC-1 Readiness Score
**Приоритет:** CRITICAL
**Продукт:** Engine + CLI
**Backlog ref:** E-76, C.T01
**Компонент:** `[Engine]` `[CLI]`

Как разработчик, я хочу проверить готовность к AIUC-1 сертификации, чтобы знать gap до certification и планировать работу.

**Acceptance Criteria:**
- [ ] `complior cert readiness` — вычисляет readiness score per AIUC-1 requirements
- [ ] AIUC-1 requirements маппинг: documentation, testing, risk management, monitoring, transparency, human oversight
- [ ] Per-requirement: status (met/partial/unmet), evidence (scan results, passport fields, documents)
- [ ] Gap analysis: список что нужно для certification
- [ ] Overall readiness %: weighted по критичности requirements
- [ ] TUI: score в Dashboard page (новая секция "Certification Readiness")
- [ ] JSON output: `--json` для интеграции с SaaS D-40
- [ ] HTTP: `GET /cert/readiness`
- [ ] 10+ тестов

**Технические детали:**
- `engine/core/src/domain/certification/` — новая директория
- `engine/core/src/domain/certification/aiuc1-readiness.ts` — score calculation
- `engine/core/src/data/certification/aiuc1-requirements.json` — маппинг требований
- `engine/core/src/services/certification-service.ts` — новый сервис
- `engine/core/src/http/routes/cert.route.ts` — `GET /cert/readiness`
- `cli/src/cli.rs` — `CertAction::Readiness`
- `cli/src/headless/cert.rs` — `run_cert_readiness()`
- Зависимость SaaS: D-40 Cert Readiness Dashboard получает данные через CLI sync

---

### US-S05-20: Adversarial Test Runner
**Приоритет:** CRITICAL
**Продукт:** Engine + CLI
**Backlog ref:** E-77, C.T02
**Компонент:** `[Engine]` `[CLI]`

Как разработчик, я хочу запустить adversarial тесты против AI-системы, чтобы выполнить Art.9(6)-(8) testing requirements и подтвердить robustness.

**Acceptance Criteria:**
- [x] `complior cert test --adversarial` — запуск тестового набора
- [x] Prompt injection tests (5+): DAN, system prompt extraction, instruction override, role-play escape, delimiter injection
- [x] Bias detection tests (5+): по защищённым характеристикам (сценарии с hire/reject, approve/deny)
- [x] Safety boundary tests (5+): violence, self-harm, illegal instructions, PII extraction, copyright violation
- [x] Results → evidence chain: каждый тест создаёт evidence entry
- [x] Report: `.complior/reports/adversarial-{agent}-{timestamp}.json` с per-test pass/fail + details
- [ ] TUI: результаты в Scan page (отдельная категория "Adversarial Tests")
- [x] HTTP: `POST /cert/test/adversarial` с `{ agent_name, test_categories? }`
- [x] 15+ тестов

**Технические детали:**
- `engine/core/src/domain/certification/adversarial/` — тестовые сценарии
- `engine/core/src/domain/certification/adversarial/prompt-injection.ts`
- `engine/core/src/domain/certification/adversarial/bias-tests.ts`
- `engine/core/src/domain/certification/adversarial/safety-boundary.ts`
- `engine/core/src/domain/certification/test-runner.ts` — оркестратор
- `engine/core/src/http/routes/cert.route.ts` — `POST /cert/test/adversarial`
- `cli/src/cli.rs` — `CertAction::Test { adversarial: bool }`
- OBL-003c: Art.9(6)-(8), OBL-009b: Art.15(4) cybersecurity

---

### US-S05-21: Supply Chain Audit + Model Compliance Cards
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-43, E-44, C.E06, C.E07
**Компонент:** `[Engine]`

Как разработчик, я хочу аудировать supply chain AI-зависимостей и получить compliance cards для используемых моделей, чтобы выполнить OBL-026 traceability.

**Acceptance Criteria:**
- [ ] Dependency chain analysis: AI SDK → model → provider → training data (где доступно)
- [ ] Risk propagation: banned package в зависимости = flag, vulnerability в AI SDK = propagated risk
- [ ] `complior supply-chain` — CLI command для аудита
- [ ] Model Compliance Cards: per-model transparency info (provider, training cutoff, GPAI compliance status, known limitations)
- [ ] Предзаполненные cards для top-10 моделей: GPT-4/4o, Claude 3/3.5, Gemini 1.5, Mistral, Llama 3
- [ ] Output: `.complior/reports/supply-chain-{timestamp}.json`
- [ ] HTTP: `GET /supply-chain`
- [ ] 8+ тестов

**Технические детали:**
- `engine/core/src/domain/supply-chain/` — новая директория
- `engine/core/src/domain/supply-chain/dependency-analyzer.ts` — анализ цепочки
- `engine/core/src/domain/supply-chain/model-cards.ts` — compliance cards
- `engine/core/src/data/model-cards/` — предзаполненные данные моделей
- OBL-026: traceability, OBL-005/007: tech doc + transparency

---

### US-S05-22: Compliance Debt Score
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-38, C.R22
**Компонент:** `[Engine]`

Как разработчик, я хочу видеть technical debt score для compliance, чтобы понимать накопленный риск и приоритизировать remediation.

**Acceptance Criteria:**
- [ ] Compliance Debt Score (0-100): чем выше, тем больше долг
- [ ] Факторы: количество unfixed findings × severity × days open, missing documentation, incomplete passport fields, stale evidence
- [ ] Тренд: сравнение с предыдущим scan (debt growing/shrinking)
- [ ] `complior debt` — CLI вывод
- [ ] TUI: debt indicator в Dashboard (цвет: green < 20, yellow 20-50, red > 50)
- [ ] HTTP: `GET /debt`
- [ ] 6+ тестов

**Технические детали:**
- `engine/core/src/domain/scanner/debt-calculator.ts` — расчёт
- `engine/core/src/services/scan-service.ts` — интеграция
- `engine/core/src/http/routes/scan.route.ts` — `GET /debt`
- `cli/src/cli.rs` — `Command::Debt`

---

### US-S05-23: Dependency Deep Scan
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-09, C.020
**Компонент:** `[Engine]`

Как разработчик, я хочу глубокий анализ зависимостей на compliance risks, чтобы обнаруживать banned packages в transitive dependencies.

**Acceptance Criteria:**
- [ ] Transitive dependency scan: не только прямые, но и вложенные зависимости
- [ ] Banned package detection в transitive deps (все 45+ banned packages)
- [ ] License analysis: GPL/AGPL в AI SDK = warning (open-source obligation)
- [ ] Vulnerability cross-reference: CVE для AI-related packages
- [ ] Output: расширение существующего SBOM (CycloneDX) с compliance annotations
- [ ] 6+ тестов

**Технические детали:**
- `engine/core/src/domain/scanner/checks/layer3-deps.ts` — расширение
- Расширить SBOM generation в `engine/core/src/domain/scanner/sbom-generator.ts`
- OBL-026: traceability

---

### US-S05-24: Agent Test Suite Gen + Manifest Diff
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-31, E-32, C.S05, C.S06
**Компонент:** `[Engine]`

Как разработчик, я хочу автоматически генерировать тестовый набор для агента из passport + contract и видеть diff между версиями manifest, чтобы отслеживать изменения.

**Acceptance Criteria:**
- [ ] `complior agent test-gen <name>` — генерация тестового набора из passport + behavior contract
- [ ] Тесты покрывают: permissions (allowed/denied), rate limits, prohibited actions, escalation rules
- [ ] Output: `.complior/tests/{name}-compliance-tests.ts` (vitest-compatible)
- [ ] `complior agent diff <name>` — diff между текущим и предыдущим manifest
- [ ] Diff показывает: added/removed/changed fields, severity impact
- [ ] HTTP: `POST /agent/test-gen`, `GET /agent/diff`
- [ ] 8+ тестов

**Технические детали:**
- `engine/core/src/domain/passport/test-generator.ts` — генерация тестов
- `engine/core/src/domain/passport/manifest-diff.ts` — diff логика
- `engine/core/src/services/passport-service.ts` — методы `generateTests()`, `diffManifest()`
- OBL-003c: Art.9(6)-(8) testing, OBL-011: Art.26

---

### US-S05-25: Compliance Simulation
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-60, C.P09
**Компонент:** `[Engine]`

Как разработчик, я хочу симулировать compliance score при изменениях (what-if analysis), чтобы планировать remediation эффективно.

**Acceptance Criteria:**
- [ ] `complior simulate --fix <check_id>` — показать score если fix будет применён
- [ ] `complior simulate --add-doc <doc_type>` — показать score если документ будет создан
- [ ] `complior simulate --complete-passport <fields>` — показать score при заполнении полей
- [ ] Output: current score → projected score, delta, % improvement
- [ ] HTTP: `POST /simulate` с массивом actions
- [ ] 6+ тестов

**Технические детали:**
- `engine/core/src/domain/scanner/compliance-simulator.ts` — расширение существующего whatif
- `engine/core/src/http/routes/scan.route.ts` — `POST /simulate`
- OBL-003: Art.9 risk management

---

### US-S05-26: Multi-Agent Awareness — daemon знает о нескольких агентах
**Приоритет:** HIGH
**Продукт:** CLI
**Backlog ref:** C-22, C.002
**Компонент:** `[CLI]` `[Engine]`

Как разработчик, я хочу чтобы daemon знал о всех AI-агентах в проекте и давал per-agent compliance feedback, чтобы управлять несколькими AI-системами из одного TUI.

**Acceptance Criteria:**
- [ ] Daemon при старте обнаруживает все passports в `.complior/agents/`
- [ ] Per-agent scan: file watcher триггерит rescan для конкретного агента (по file → agent mapping)
- [ ] SSE events: `agent.scan.complete`, `agent.score.updated` с agent name
- [ ] TUI Dashboard: сводка по всем агентам (name, score, last scan)
- [ ] TUI Passport page: переключение между агентами (j/k), per-agent detail
- [ ] Scan results в TUI группированы по agent
- [ ] 8+ тестов (Rust + TS)

**Технические детали:**
- `engine/core/src/services/registry-service.ts` — multi-agent awareness
- `engine/core/src/server.ts` — SSE per-agent events
- `cli/src/app/mod.rs` — multi-agent state
- `cli/src/views/dashboard/mod.rs` — agent summary section
- `cli/src/views/passport/mod.rs` — per-agent navigation

---

### US-S05-27: Compliance Cost Estimator — Engine + TUI
**Приоритет:** MEDIUM
**Продукт:** Engine + CLI
**Backlog ref:** C-09, E-102
**Компонент:** `[Engine]` `[CLI]`

Как CTO/разработчик, я хочу видеть оценку стоимости compliance (время + деньги + ROI), чтобы обосновать бюджет перед руководством.

> **Note:** Объединяет бывший US-S06-08 (Engine + CLI) — единая US для engine расчёта + TUI визуализации.

**Acceptance Criteria:**
- [ ] Per-finding оценка трудозатрат: severity → effort (CRITICAL: 16h, HIGH: 8h, MEDIUM: 4h, LOW: 1h)
- [ ] Общий rollup: `total_effort_hours`, `total_cost` (effort × hourly_rate)
- [ ] Настраиваемый hourly rate: `--hourly-rate 120` (по умолчанию EUR 100/час)
- [ ] Сравнение: `cost_to_fix` vs `potential_penalty` (из obligation penalties)
- [ ] ROI калькулятор: стоимость исправления vs штраф
- [ ] `GET /cost-estimate` endpoint возвращает JSON с breakdown
- [ ] TUI: виджет на Dashboard "Estimated remediation cost: EUR X / Penalty risk: EUR Y"
- [ ] 8+ тестов

**Технические детали:**
- `engine/core/src/domain/cost/cost-estimator.ts` — чистая функция расчёта
- Penalty data из `engine/core/src/data/regulations/` (существующие obligation penalties)
- `engine/core/src/http/routes/cost.route.ts` — HTTP endpoint
- `cli/src/views/dashboard/cost_widget.rs` — виджет в TUI Dashboard

---

### US-S05-28: SaaS — Реестр AI систем (unified)
**Приоритет:** CRITICAL
**Продукт:** SaaS
**Backlog ref:** D-11, D-39
**Компонент:** `[SaaS]`

Как deployer, я хочу видеть единый реестр всех AI систем (из CLI Passports + SaaS manual), чтобы управлять compliance всей организации из одного интерфейса.

**Acceptance Criteria:**
- [ ] Единая таблица: CLI Passports (Mode 1, auto) + SaaS Passports (Mode 3, manual)
- [ ] Per-system: название, вендор, risk class, L-level, score, completeness %, lifecycle status, владелец
- [ ] Kill switch: кнопка "Suspend" → меняет lifecycle_status → SSE событие в CLI daemon
- [ ] Cross-agent data flows: визуализация какие агенты обмениваются данными
- [ ] Filter: by risk class, by owner, by department, by lifecycle status
- [ ] Sort: by score, by risk, by last scan date
- [ ] Source indicator: "CLI scan" vs "Manual entry" для каждого поля
- [ ] Зависимость: D-62 CLI Sync endpoint (DONE)

**Технические детали:**
- SaaS repo: `ai-act-compliance-platform`
- Расширение `AITool` модели: merge CLI passport data
- Endpoint: `GET /api/registry`, `PATCH /api/registry/:id/suspend`
- Frontend: новая страница Registry с таблицей + фильтрами
- Контракт: passport sync через `POST /api/sync/passport` (уже существует)

---

### US-S05-29: SaaS — Wizard шаги 3-5
**Приоритет:** CRITICAL
**Продукт:** SaaS
**Backlog ref:** D-12, D-46
**Компонент:** `[SaaS]`

Как deployer, я хочу пройти расширенный wizard регистрации AI-системы (шаги 3-5), чтобы полностью заполнить passport через SaaS интерфейс.

**Acceptance Criteria:**
- [ ] Шаг 3: Geography (юрисдикция) + Use Case (описание, sector, Annex III)
- [ ] Шаг 4: Autonomy Level L1-L5 с Art.14 guidance (примеры на каждый уровень) + escalation rules
- [ ] Шаг 5: Review (все заполненные поля) + "Save & Generate FRIA" shortcut для high-risk
- [ ] Навигация назад: изменение шагов 1-2 без потери данных
- [ ] Auto-classify: use case → risk class (на основе Rule Engine)
- [ ] Validation: обязательные поля подсвечены, нельзя сохранить с пустыми required
- [ ] Зависимость: D-39 Реестр AI систем

**Технические детали:**
- SaaS repo: `ai-act-compliance-platform`
- Frontend: `WizardStep3.tsx`, `WizardStep4.tsx`, `WizardStep5.tsx`
- Backend: расширение `POST /api/ai-tools` с полями geography, use_case, autonomy_level, escalation
- Validation: Zod schemas per step

---

### US-S05-30: SaaS — Расширенные поля Passport
**Приоритет:** CRITICAL
**Продукт:** SaaS
**Backlog ref:** D-13, D-56
**Компонент:** `[SaaS]`

Как DPO, я хочу заполнить расширенные regulatory поля passport (conformity assessment, incidents, post-market monitoring), чтобы подготовиться к аудиту.

**Acceptance Criteria:**
- [ ] 6 новых блоков: `regulatoryContext`, `incidents[]`, `postMarketMonitoring`, `conformityAssessment`, `complianceRecords`, `msaSubmissions[]`
- [ ] `regulatoryContext`: notified body, conformity procedure (internal control / third-party), certificate number
- [ ] `incidents[]`: date, description, severity, reported_to, resolution
- [ ] `postMarketMonitoring`: plan reference, frequency, last review, metrics
- [ ] `conformityAssessment`: type (Annex VI / Annex VII), date, result, assessor
- [ ] UI: expandable sections в AI system detail page
- [ ] Export: включены в CLI sync и AIUC-1 export
- [ ] Зависимость: D-39 Реестр AI систем

**Технические детали:**
- SaaS repo: MetaSQL schema расширение `AITool`
- 6 новых JSON-полей или отдельных таблиц
- Frontend: `PassportExtendedFields.tsx` компонент
- Sync protocol: расширить `SyncPassportSchema` для двусторонней синхронизации

---

### US-S05-31: SaaS — Cert Readiness Dashboard
**Приоритет:** CRITICAL
**Продукт:** SaaS
**Backlog ref:** D-48, D-40
**Компонент:** `[SaaS]`

Как DPO, я хочу видеть dashboard готовности к сертификации (ISO 42001 + AIUC-1), чтобы отслеживать прогресс и управлять evidence.

**Acceptance Criteria:**
- [ ] ISO 42001 readiness: Clauses 4-10 (обязательные) + 39 контролей Annex A
- [ ] AIUC-1 readiness: данные из CLI `GET /cert/readiness` (US-S05-19)
- [ ] Per-system readiness score с breakdown по категориям
- [ ] Evidence management: привязка документов к requirements
- [ ] Gap visualization: цветовая индикация (green/yellow/red) per category
- [ ] Partnership referral: ссылка на AIUC-1 сертификаторов
- [ ] Зависимость: CLI US-S05-19 (AIUC-1 Readiness Score)

**Технические детали:**
- SaaS repo: `ai-act-compliance-platform`
- Frontend: новая страница CertReadiness
- Backend: `GET /api/cert/readiness` агрегирует CLI + SaaS данные
- Данные: CLI sync `GET /cert/readiness` + SaaS-specific fields

---

### US-S05-32: SaaS — Compliance Badge
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-32, D-50
**Компонент:** `[SaaS]`

Как deployer, я хочу получить embeddable compliance badge (L1 self-assessed / L2 verified), чтобы продемонстрировать compliance третьим сторонам.

**Acceptance Criteria:**
- [ ] L1 badge (self-assessed): доступен всем тарифам, генерируется при score > 70%
- [ ] L2 badge (verified): после прохождения AIUC-1 или внешнего аудита, Enterprise тариф
- [ ] Embeddable: HTML snippet, Markdown, SVG для README
- [ ] Публичная страница верификации: `complior.ai/badge/{org}/{system}` с QR-кодом
- [ ] Dynamic: badge обновляется при изменении score (кэш 1 час)
- [ ] Revoke: если score упал ниже порога → badge показывает "Under Review"
- [ ] API: `GET /api/badge/:systemId` → SVG/PNG

**Технические детали:**
- SaaS repo: `ai-act-compliance-platform`
- Backend: badge generation service, public verification page
- Frontend: badge embed page с копируемыми сниппетами
- CDN: SVG бейджи на Hetzner CDN

---

### US-S05-33: Guided Onboarding Wizard (Engine)
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-104 (перенесён из US-S08-04)
**Компонент:** `[Engine]`

Как новый пользователь Complior, я хочу чтобы при первом запуске меня провели через 5-step onboarding, чтобы за 15 минут получить первый compliance report.

**Acceptance Criteria:**
- [ ] Step 1: Detect project — auto-detect language, framework, AI SDKs, package manager
- [ ] Step 2: First scan — запуск полного скана, показ score и top-5 findings
- [ ] Step 3: Generate passport — `agent init` для обнаруженных AI-систем
- [ ] Step 4: Fix top-3 — предложить и применить 3 самых impactful fix-а
- [ ] Step 5: Generate document — FRIA (если high-risk) или compliance report
- [ ] HTTP endpoint: `POST /onboarding/start`, `GET /onboarding/status`, `POST /onboarding/step/:n`
- [ ] Onboarding state persistence: `.complior/onboarding-progress.json`
- [ ] Можно прервать и продолжить позже

**Технические детали:**
- `engine/core/src/domain/onboarding/onboarding-wizard.ts` — state machine
- `engine/core/src/http/routes/onboarding.route.ts` — HTTP endpoints
- `engine/core/src/services/onboarding-service.ts` — orchestration
- Использует существующие services: scan, passport, fix, fria

---

### US-S05-34: Compliance Diff в PR
**Приоритет:** HIGH
**Продукт:** CLI
**Backlog ref:** C-16, C-27 (перенесён из US-S08-10)
**Компонент:** `[CLI]`

Как разработчик, я хочу запустить `complior scan --diff=main` и получить compliance delta (новые/resolved findings), чтобы использовать как PR gate.

**Acceptance Criteria:**
- [ ] `complior scan --diff=main` — сканирует только изменённые файлы (git diff)
- [ ] Output: score delta (+3/-2), new findings, resolved findings
- [ ] `--fail-on-regression` — exit code 1 если score ухудшился или new CRITICAL findings
- [ ] GitHub Actions compatible: `--json` output для machine parsing
- [ ] PR comment format: markdown table с delta, новые findings, recommendations
- [ ] `--comment` — автоматически добавляет comment в GitHub PR (requires `gh` CLI)
- [ ] Сканирует только diff файлы, не весь проект (быстрый для больших PR)

**Технические детали:**
- `cli/src/headless/scan.rs` — расширение scan command с `--diff` flag
- `engine/core/src/services/scan-service.ts` — diff-based file list
- Git integration: `git diff --name-only main...HEAD`
- PR comment: `gh pr comment` с markdown table

---

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| SDK: Prohibited patterns | 50+ по 8 категориям Art.5 |
| SDK: PII types (Sanitize) | 50+ с checksum validation |
| SDK: Permission tool_call parsing | 3 провайдера (OpenAI, Anthropic, Google) |
| SDK: Disclosure verify | 4 языка (EN/DE/FR/ES) |
| SDK: Bias characteristics | 15 по EU Charter |
| SDK: HTTP middleware | 4 фреймворка (Express/Fastify/Hono/Next.js) |
| Engine: Finding explanations | 100% check_ids покрыты |
| Engine: Worker Notification | генерируется из passport |
| Engine: Passport Export | 3 формата (A2A/AIUC-1/NIST) |
| Engine: Industry patterns | 4 сектора (HR/Finance/Healthcare/Education) |
| Engine: Agent Registry | per-agent compliance score |
| Engine: Permissions Matrix | cross-agent conflict detection |
| Engine: Policy Templates | 5 отраслевых шаблонов |
| Runtime Control | 10 компонентов (3 US) |
| Certification: AIUC-1 readiness | score + gap analysis |
| Certification: Adversarial tests | 3 категории (injection/bias/safety) |
| CLI: Multi-agent awareness | per-agent scan + SSE |
| **Onboarding Wizard: 5 steps** | **15 мин до первого отчёта (из S08-04)** |
| **Compliance Diff: PR gate** | **--diff=main --fail-on-regression (из S08-10)** |
| SaaS: Unified Registry | CLI + SaaS passports |
| SaaS: Wizard шаги 3-5 | полный onboarding flow |
| SaaS: Cert Readiness Dashboard | ISO 42001 + AIUC-1 |
| SaaS: Compliance Badge | L1/L2, embeddable |
| Тесты (новые) | 300+ (TS + SDK + Rust) |
| Тесты (всего) | ~1250 target |
| Длительность | 2-3 недели |

---

## Зависимости между US

```
Phase 1+2 (DONE):
US-S05-01..06 (SDK) ──────> US-S05-16..18 (Runtime Control)
US-S05-07..15 (Engine Core) ──> DONE

Phase 3 (Launch — NO BLOCKERS, все зависимости выполнены):
US-S05-19 (AIUC-1 Readiness) ──> US-S05-31 (SaaS Cert Dashboard)
US-S05-33 (Onboarding Wizard) ──> US-S08-11 (TUI Onboarding, S08)
US-S05-34 (Compliance Diff)   ──> (нет downstream зависимостей)

Phase 4+5 (Post-Launch):
US-S05-10 (Permission Scanner) ──> US-S05-14 (Permissions Matrix) [DONE]
US-S05-11 (Behavior Contract) ──> US-S05-24 (Test Suite Gen)
US-S05-13 (Agent Registry) ──> US-S05-26 (Multi-agent)
US-S05-13 (Agent Registry) ──> US-S05-28 (SaaS Registry)
US-S05-09 (Passport Export) ──> US-S05-31 (SaaS Cert Dashboard)
US-S05-28 (SaaS Registry) ──> US-S05-29 (Wizard)
US-S05-28 (SaaS Registry) ──> US-S05-30 (Extended Fields)
```

---

## Фазы выполнения

| Фаза | US | Фокус | Статус |
|------|----|----|--------|
| 1: SDK Production | US-01..06 | SDK хуки production-ready | **DONE** |
| 2: Engine Core | US-07..15 | Finding explanations, documents, registry, permissions | **DONE** |
| 3: Launch Priorities | US-19, US-33, US-34 | AIUC-1 readiness, Onboarding, CI/CD Diff | **DONE** |
| 4: Runtime + Cert | US-10, 16..18, 20 | Runtime Control, Permission Scanner, Adversarial | **DONE** |
| 5: Остальное + SaaS | US-21..32 | Supply chain, debt, simulation, SaaS features | Planned |

---

**Обновлено:** 2026-03-09 v1.2.0 — 34 user stories (US-01..32 + US-33 Onboarding из S08, US-34 Compliance Diff из S08). Phase 1+2+3 DONE (17 US). Phase 4: Runtime + Cert (US-10, US-16..18, US-20). Phase 5: Остальное + SaaS (US-21..32)

### Sprint S05 Done Summary
- **Phase 1 (SDK, 6 US):** Prohibited 138 patterns, Sanitize 50+ PII, Permission 3 providers, Disclosure 4 langs, Bias 15 chars, HTTP Middleware 4 frameworks. SDK tests: 116→373.
- **Phase 2 (Engine, 8 US):** Finding Explanations, Worker Notification, Passport Export (A2A/AIUC-1/NIST), Behavioral Constraints, Industry Patterns (4 domains), Agent Registry, Permissions Matrix + Audit Trail, Policy Templates (5 industries). TS tests: 489→589, Rust: 345→361.
- **Phase 3 (Launch, 3 US):** AIUC-1 Readiness Score, Guided Onboarding Wizard (5-step state machine), Compliance Diff in PR. TS tests: 589→685, Rust: 361→372.
- **Quality (QF):** 2 rounds E2E + code audit. 11 fixes: score.totalScore bug, scoped npm names crash, onboarding path, DRY/SRP/Zod, skipStep status.
- **Phase 4 (Runtime + Cert, DONE):** US-S05-10 (Permission Scanner) DONE, US-S05-16 (Disclosure/Marking/Logger) DONE, US-S05-17 (Safety/HITL) DONE, US-S05-18 (Proxy + Adapters) DONE, US-S05-20 (Adversarial Test Runner) DONE. SDK tests: 407→430.
- **Totals:** 21/34 US done, tests 1453→1470+ (+17), 21/21 E2E pass
