# Sprint S07 — Performance + Streaming + Domains + SaaS Enterprise Start

**Версия:** 1.0.0
**Дата:** 2026-03-07
**Статус:** Planning

---

## Обзор

Седьмой спринт. Фокус на production-ready performance: инкрементальный кэшированный скан (10-50x ускорение), SDK streaming для реального времени, domain enforcement для отраслевых проверок, начало SaaS Enterprise фич. Соответствует разделу 5.6 PRODUCT-BACKLOG v10.

Спринт разбит на 4 направления:
- **SDK** — streaming support, domain hooks enforcement, budget с реальными ценами, Guard integration
- **Engine** — инкрементальный скан, семантическая валидация документов, multi-agent interaction, новые стандарты
- **SaaS** — управление инцидентами, мониторинг реального времени, Conformity Assessment, предиктивная аналитика

**Цель:** Кэшированный скан за <1 сек, SDK streaming с chunk-level hooks, domain enforcement в production, старт SaaS Enterprise.

---

## User Stories

### US-S07-01: Инкрементальный скан с файловым кэшем
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-11, E-96
**Компонент:** `[Engine]`

Как разработчик в monorepo (1000+ файлов), я хочу чтобы повторный скан использовал кэш по SHA-256 хэшам файлов, чтобы скан завершался за <1 сек вместо 10-30 сек.

**Acceptance Criteria:**
- [ ] SHA-256 хэш вычисляется для каждого сканируемого файла
- [ ] mtime fast-check: если mtime не изменился — пропуск хэширования
- [ ] Кэш хранится в `.complior/cache/scan-cache.json` с TTL 24 часа для L5 результатов
- [ ] `complior scan --no-cache` принудительно игнорирует кэш
- [ ] L1-L4 результаты кэшируются бессрочно (до изменения файла)
- [ ] При изменении 1 файла пересканируется только он + cross-layer правила с зависимостями
- [ ] Замер: 10-50x ускорение на повторном скане без изменений

**Технические детали:**
- `engine/core/src/domain/scanner/scan-cache.ts` — новый модуль
- `ScanCache { fileHash: Record<string, {sha256, mtime, results, timestamp}> }`
- Интеграция в `scan-service.ts`: перед сканом файла — проверка кэша
- Cross-layer rules (B2) всегда пересчитываются (зависят от нескольких файлов)
- `composition-root.ts` — DI wiring кэша

---

### US-S07-02: SDK Streaming Support (SSE/WebSocket)
**Приоритет:** HIGH
**Продукт:** SDK
**Backlog ref:** S-02, S-38
**Компонент:** `[SDK]`

Как разработчик, использующий streaming API (OpenAI stream, Anthropic stream, Vercel AI SDK), я хочу чтобы `complior()` / `compliorAgent()` перехватывали streaming ответы, чтобы compliance hooks работали в реальном времени на каждом chunk.

**Acceptance Criteria:**
- [ ] `StreamInterceptor` — модуль, оборачивающий AsyncIterable/ReadableStream
- [ ] Accumulating buffer собирает chunks до вызова post-hooks
- [ ] Chunk-level hooks: `onChunk(chunk)` для disclosure-verify и content-marking
- [ ] Совместимость с OpenAI `stream: true` (SSE формат)
- [ ] Совместимость с Anthropic `stream: true` (SSE формат)
- [ ] Совместимость с Vercel AI SDK `streamText()` / `streamObject()`
- [ ] Pre-hooks выполняются ДО начала стрима (disclosure, permission, rate-limit)
- [ ] Post-hooks выполняются на аккумулированном полном ответе после завершения стрима

**Технические детали:**
- `engine/sdk/src/streaming.ts` — StreamInterceptor, AccumulatingBuffer
- `engine/sdk/src/adapters/` — per-provider stream handling
- Тесты: mock AsyncIterable, проверка порядка hooks, edge cases (abort, error mid-stream)

---

### US-S07-03: Domain hooks — реальный enforcement
**Приоритет:** HIGH
**Продукт:** SDK
**Backlog ref:** S-27, S-37
**Компонент:** `[SDK]`

Как разработчик HR/Finance/Healthcare AI-системы, я хочу чтобы domain hooks выполняли реальные проверки (а не заглушки), чтобы получить enforcement для отраслевых EU AI Act требований.

**Acceptance Criteria:**
- [ ] HR domain: проверка дискриминационных паттернов (age, gender, ethnicity в prompt/response), Art.5(1)(a)
- [ ] Finance domain: credit scoring detection, обязательное объяснение решения (Art.86), лимиты на automated decisions
- [ ] Healthcare domain: GDPR Art.9 sensitive data detection (health, genetic, biometric), consent verification
- [ ] Education domain: проверка паттернов grading/admissions bias
- [ ] Configurable severity per domain: `{ domain: 'hr', severity: 'block' | 'warn' | 'log' }`
- [ ] Domain auto-detection из passport `industry_context` поля
- [ ] Rule engine per domain с расширяемым набором правил

**Технические детали:**
- `engine/sdk/src/domains/hr.ts`, `finance.ts`, `healthcare.ts`, `education.ts` — уже существуют как скелеты
- Добавить: реальные regex/NLP паттерны, severity config, rule engine
- Интеграция с `compliorAgent()` — domain hooks активируются по passport industry_context

---

### US-S07-04: Budget — реальные цены провайдеров
**Приоритет:** MEDIUM
**Продукт:** SDK
**Backlog ref:** S-23, S-35
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы budget controller использовал реальные цены моделей (а не абстрактные единицы), чтобы получить точный контроль затрат в EUR/USD.

**Acceptance Criteria:**
- [ ] Таблица цен по моделям: GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude Opus 4, Gemini 2.0 и т.д.
- [ ] Auto-detect модели из request payload (model field)
- [ ] Streaming token accumulator: подсчёт input/output tokens в реальном времени
- [ ] Cost report: `{ total_cost: 12.45, currency: 'USD', breakdown: [{model, calls, tokens, cost}] }`
- [ ] Budget limit в passport `constraints.budget` теперь в валюте: `{ limit: 100, currency: 'USD', period: 'daily' }`
- [ ] Обновление таблицы цен без пересборки (JSON конфиг)

**Технические детали:**
- `engine/sdk/src/pricing.ts` — таблица цен, auto-detect, калькулятор
- `engine/sdk/data/model-prices.json` — обновляемая таблица
- Интеграция с BudgetController в `agent.ts`

---

### US-S07-05: Guard Integration (SDK-сторона)
**Приоритет:** HIGH
**Продукт:** SDK
**Backlog ref:** S-28
**Компонент:** `[SDK]`

Как разработчик, я хочу подключить external Guard API к SDK, чтобы получить двухуровневую защиту: быстрый regex (0ms) → Guard API (50ms) fallback.

**Acceptance Criteria:**
- [ ] `guard: { endpoint: 'https://guard.example.com/check' }` в конфиге SDK
- [ ] Двухуровневая цепочка: regex patterns (instant) → Guard API (remote, 50ms timeout)
- [ ] Circuit breaker для Guard API: после 3 failures — fallback на regex-only на 60 секунд
- [ ] Guard API contract: `POST /check { prompt, context } → { safe: boolean, reason?: string }`
- [ ] Configurable: `guard.mode: 'strict' | 'permissive'` (strict = block on Guard failure, permissive = pass-through)
- [ ] Guard результаты логируются в evidence chain

**Технические детали:**
- `engine/sdk/src/guard.ts` — GuardClient, CircuitBreaker, FallbackChain
- Интеграция как pre-hook в pipeline `complior()` / `compliorAgent()`
- Тесты: mock Guard API, circuit breaker transitions, timeout scenarios

---

### US-S07-06: L2 — семантическая валидация документов
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-100
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы L2 scanner проверял не только наличие документов, но и их содержательность, чтобы пустые шаблоны не давали 100% coverage.

**Acceptance Criteria:**
- [ ] Numeric metrics detection: документ должен содержать конкретные числовые показатели (accuracy %, response time, etc.)
- [ ] Specific references: ссылки на конкретные статьи закона, стандарты, внутренние процедуры
- [ ] Required sections checklist: FRIA должен иметь все 6 секций, Privacy Policy — 8 GDPR-required секций
- [ ] Severity: документ без конкретики → SHALLOW (confidence 65), без required sections → INCOMPLETE (confidence 80)
- [ ] Improved word count analysis: минимальные thresholds per document type
- [ ] Результаты в ScoreBreakdown с confidence_summary

**Технические детали:**
- `engine/core/src/domain/scanner/checks/layer2-docs.ts` — расширение существующего модуля
- Новые validators в `domain/scanner/validators/` (YAML конфиги per doc type)
- `measureSemanticDepth()` — новая функция вместо `measureSectionDepth()`

---

### US-S07-07: Multi-Agent Interaction Protocol
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-61, C.P10
**Компонент:** `[Engine]`

Как разработчик multi-agent системы (несколько AI агентов взаимодействуют), я хочу чтобы Complior отслеживал inter-agent data flows, чтобы выполнить OBL-011 (Art.26 мониторинг).

**Acceptance Criteria:**
- [ ] Inter-agent flow detection: анализ MCP tool calls между агентами
- [ ] Data flow map: какой агент передаёт данные какому (граф зависимостей)
- [ ] Permission inheritance: если Agent A вызывает Agent B — проверка, что B имеет права на данные A
- [ ] Cross-agent audit trail: события взаимодействия в evidence chain
- [ ] TUI визуализация: граф взаимодействий на Dashboard (ASCII art)
- [ ] Scanner check: `multi-agent-data-leak` — передача sensitive данных без consent

**Технические детали:**
- `engine/core/src/domain/multi-agent/` — новый домен
- `interaction-tracker.ts` — отслеживание MCP tool calls
- `flow-analyzer.ts` — построение графа, permission verification
- Интеграция с evidence-store для audit trail

---

### US-S07-08: ISO 27090 Security Rules
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-14
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы scanner проверял соответствие ISO 27090 (AI cybersecurity), чтобы покрыть OBL-009b (Art.15 robustness + cybersecurity).

**Acceptance Criteria:**
- [ ] 6 security rules из ISO 27090: input validation, output sanitization, model access control, data encryption, adversarial resilience, incident response
- [ ] L3 checks: наличие security-related зависимостей (helmet, rate-limiter, crypto libraries)
- [ ] L4 AST patterns: проверка кода на input validation, output sanitization
- [ ] Mapping ISO 27090 clauses → scanner checkIds
- [ ] Результаты в findings с `standard: 'ISO-27090'`

**Технические детали:**
- `engine/core/src/domain/scanner/checks/iso27090.ts` — новый модуль
- 6 новых pattern rules в `data/patterns/`
- Интеграция в composition-root через scanner config

---

### US-S07-09: Proxy Analytics
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-83, C.U03
**Компонент:** `[Engine]`

Как оператор AI-системы, я хочу видеть аналитику MCP proxy (количество вызовов, latency, ошибки per tool), чтобы выполнить OBL-020 (Art.72 post-market мониторинг).

**Acceptance Criteria:**
- [ ] Сбор метрик per MCP tool call: timestamp, tool name, duration_ms, success/error, agent_id
- [ ] Агрегация: calls per minute, p50/p95 latency, error rate, top tools
- [ ] HTTP endpoint: `GET /analytics/proxy` — JSON с агрегированными метриками
- [ ] Retention: in-memory sliding window 24 часа, persistent summary в `.complior/analytics/`
- [ ] TUI: базовая визуализация на Dashboard (sparkline вызовов за час)

**Технические детали:**
- `engine/core/src/domain/analytics/proxy-analytics.ts` — сбор и агрегация
- `engine/core/src/http/routes/analytics.route.ts` — HTTP endpoint
- Интеграция с MCP server (middleware на каждый tool call)

---

### US-S07-10: Auto-Wrap Discovery
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-84, C.U04
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы Complior автоматически обнаруживал LLM API calls без `complior()` wrapper, чтобы предложить их обернуть для compliance enforcement.

**Acceptance Criteria:**
- [ ] AST сканирование: OpenAI `chat.completions.create()`, Anthropic `messages.create()`, Vercel `generateText()`
- [ ] Детекция отсутствия complior wrapper: вызов API без proxy → finding
- [ ] Auto-fix suggestion: `complior(client)` wrap с import
- [ ] Исключение тестовых файлов и dev-only кода
- [ ] Finding type: `unwrapped-llm-call`, severity: MEDIUM

**Технические детали:**
- Расширение L4 AST scanner в `domain/scanner/checks/layer4-code.ts`
- Новые паттерны в scanner rules для unwrapped detection
- Fix diff generation для auto-wrap

---

### US-S07-11: ISO 42001 Readiness Score
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-79, C.T04
**Компонент:** `[Engine]`

Как организация, я хочу видеть readiness score для ISO 42001 (AI Management System), чтобы понимать gap до сертификации.

**Acceptance Criteria:**
- [ ] Mapping ISO 42001 clauses → Complior checks (scanner results + passport fields + documents)
- [ ] Readiness score 0-100: (covered clauses / total) с весами по критичности
- [ ] Gap report: какие clauses не покрыты, рекомендации
- [ ] HTTP endpoint: `GET /cert/iso42001` — readiness JSON
- [ ] CLI: `complior cert readiness --standard iso42001`

**Технические детали:**
- `engine/core/src/domain/certification/iso42001.ts` — mapping и scoring
- `engine/core/data/standards/iso42001-clauses.json` — структура clauses

---

### US-S07-12: Multi-Standard Gap Analysis
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-80, C.T05
**Компонент:** `[Engine]`

Как организация, сертифицирующаяся по нескольким стандартам, я хочу видеть unified gap analysis (EU AI Act + ISO 42001 + NIST AI RMF), чтобы не дублировать работу.

**Acceptance Criteria:**
- [ ] Cross-mapping: EU AI Act obligations ↔ ISO 42001 clauses ↔ NIST AI RMF categories
- [ ] Unified gap report: один документ покрывает требования 3+ стандартов
- [ ] Overlap detection: "Заполнив FRIA, вы покрываете: Art.27, ISO 42001 §7.2, NIST MAP-1.1"
- [ ] HTTP endpoint: `GET /cert/gap?standards=eu-ai-act,iso42001,nist`
- [ ] CLI: `complior cert gap --standards eu-ai-act,iso42001`

**Технические детали:**
- `engine/core/src/domain/certification/multi-standard-gap.ts` — cross-mapping engine
- `engine/core/data/standards/cross-mapping.json` — mapping таблицы

---

### US-S07-13: Infrastructure Remediation Recommendations
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-86, C.F25
**Компонент:** `[Engine]`

Как DevOps инженер, я хочу получить infrastructure-level рекомендации (logging, monitoring, backup, security), чтобы выполнить OBL-009b (Art.15(4) cybersecurity) на уровне инфраструктуры.

**Acceptance Criteria:**
- [ ] Анализ: docker-compose.yml, Dockerfile, CI/CD configs, terraform files
- [ ] Checks: log rotation настроен, monitoring endpoint существует, backup policy определена
- [ ] Recommendations: конкретные config snippets для исправления
- [ ] Severity: отсутствие logging → HIGH, отсутствие monitoring → MEDIUM
- [ ] Результаты в findings с category `infrastructure`

**Технические детали:**
- `engine/core/src/domain/scanner/checks/infrastructure.ts` — новый модуль
- Парсинг YAML/Dockerfile для извлечения конфигурации

---

### US-S07-14: ML Model Compliance Kit
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-89, C.F29
**Компонент:** `[Engine]`

Как ML-инженер, я хочу получить compliance kit для моей ML модели (data governance, bias testing, model card), чтобы выполнить OBL-004/004a/004b (Art.10 data + training).

**Acceptance Criteria:**
- [ ] Data governance check: наличие data catalog, data lineage documentation, consent tracking
- [ ] Bias testing framework: рекомендации по тестированию fairness per protected groups
- [ ] Model card template: auto-generated из passport + scan results
- [ ] Training data documentation: checklist per Art.10 требования
- [ ] HTTP endpoint: `GET /ml/compliance-kit?agent=<name>`
- [ ] CLI: `complior ml kit <agent-name>`

**Технические детали:**
- `engine/core/src/domain/ml-compliance/` — новый домен
- `model-card-generator.ts`, `data-governance-checker.ts`, `bias-test-recommender.ts`
- Template в `engine/core/data/templates/model-card.md`

---

### US-S07-15: Compliance Playbook Generator
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-90, C.F30
**Компонент:** `[Engine]`

Как CTO/DPO, я хочу получить персонализированный compliance playbook (roadmap действий до Aug 2, 2026), чтобы спланировать работу команды.

**Acceptance Criteria:**
- [ ] Генерация на основе: scan results, passport completeness, evidence chain status, obligations coverage
- [ ] Приоритизация задач по: deadline proximity, penalty size, effort estimate
- [ ] Timeline: визуальный roadmap с milestones и critical path
- [ ] Per-team actions: что должен сделать Dev, DPO, Legal, DevOps
- [ ] Output: `.complior/reports/playbook-{date}.md` + JSON
- [ ] CLI: `complior playbook generate`

**Технические детали:**
- `engine/core/src/domain/playbook/playbook-generator.ts` — новый модуль
- Использует данные из scan-service, passport-service, evidence-store
- Template в `engine/core/data/templates/compliance-playbook.md`

---

### US-S07-16: Управление инцидентами (Art.73)
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-43
**Компонент:** `[SaaS]`

Как DPO, я хочу регистрировать и отслеживать серьёзные инциденты AI-систем в SaaS Dashboard, чтобы выполнить OBL-021 (Art.73 — serious incident reporting).

**Acceptance Criteria:**
- [ ] Форма создания инцидента: система, тип (malfunction, misuse, rights violation), severity, описание
- [ ] Workflow: Draft → Under Review → Reported → Resolved
- [ ] Таймлайн: автоматический расчёт дедлайнов отчётности (72 часа после обнаружения)
- [ ] Шаблон отчёта для регулятора: pre-filled из данных инцидента + passport
- [ ] Dashboard: список инцидентов, фильтры по системе/severity/статусу
- [ ] Привязка инцидента к Agent Passport (per-system tracking)

**Технические детали:**
- SaaS: `app/incidents/` — страницы, API routes, DB schema
- Интеграция с F39 AI System Registry для per-system view
- Нотификации: email/Slack при новом инциденте и приближении дедлайна

---

### US-S07-17: Мониторинг реального времени
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-44
**Компонент:** `[SaaS]`

Как оператор AI-систем, я хочу видеть real-time dashboard с метриками всех AI-систем (score, incidents, drift), чтобы выполнить OBL-020 (Art.72 post-market monitoring).

**Acceptance Criteria:**
- [ ] Real-time score updates: SSE/WebSocket от daemon → SaaS → Dashboard
- [ ] Per-system metrics: compliance score trend (sparkline), last scan, active findings count
- [ ] Alert system: score drop >10 points → notification, new CRITICAL finding → alert
- [ ] Aggregated view: организация compliance score = weighted average per-system scores
- [ ] Health indicators: green/yellow/red per system
- [ ] Auto-refresh: каждые 30 секунд или push от daemon

**Технические детали:**
- SaaS: расширение F28 Dashboard v2
- WebSocket endpoint для real-time updates
- Daemon push: POST /api/sync/metrics с агрегированными данными

---

### US-S07-18: Conformity Assessment Wizard
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-28
**Компонент:** `[SaaS]`

Как DPO, я хочу пройти guided Conformity Assessment (Art.43) через wizard в SaaS, чтобы подготовить документы для нотифицированного органа.

**Acceptance Criteria:**
- [ ] 5-step wizard: (1) Выбор системы, (2) Applicable standards, (3) Evidence collection, (4) Gap review, (5) Assessment report
- [ ] Pre-fill из CLI данных: scan results, passport, evidence chain, FRIA
- [ ] Checklist per Art.43 requirements: Annex VII conformity assessment procedure
- [ ] Evidence linking: каждый requirement → attached evidence (document, scan result, test)
- [ ] Export: Assessment report PDF + evidence ZIP
- [ ] Progress tracking: сохранение незавершённого assessment

**Технические детали:**
- SaaS: `app/conformity/` — multi-step wizard component
- Интеграция с F42 Audit Package для evidence collection
- CLI dependency: C.T01 AIUC-1 Readiness Score данные

---

### US-S07-19: Remediation Cloud
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-52, F31
**Компонент:** `[SaaS]`

Как пользователь SaaS, я хочу видеть рекомендации по исправлению findings с приоритизацией и tracking, чтобы выполнить OBL-020a (Art.20 corrective actions).

**Acceptance Criteria:**
- [ ] Per-finding remediation card: описание проблемы, рекомендация, effort estimate, impact on score
- [ ] Приоритизация: Critical first, по penalty size, по effort (quick wins)
- [ ] Assignment: назначение ответственного per finding
- [ ] Tracking: статус (open → in progress → resolved), history
- [ ] Dashboard view: remediation backlog, burndown chart

**Технические детали:**
- SaaS: расширение F31 Remediation Cloud
- Данные из CLI sync: findings, fixes applied, scan deltas

---

### US-S07-20: Due Diligence отчёт
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-22
**Компонент:** `[SaaS]`

Как CTO при покупке/интеграции vendor AI-системы, я хочу сгенерировать Due Diligence отчёт, чтобы оценить compliance risk поставщика.

**Acceptance Criteria:**
- [ ] Ввод данных: vendor name, system name, documentation URLs, API access
- [ ] Automated checks: AI Registry lookup, public incidents, known vulnerabilities
- [ ] Risk scoring: vendor compliance maturity 0-100
- [ ] Report sections: Executive Summary, Vendor Profile, Risk Assessment, Recommendations, Appendices
- [ ] Export: PDF + JSON
- [ ] History: сохранение отчётов для tracking vendor improvements

**Технические детали:**
- SaaS: `app/due-diligence/` — wizard + report generator
- Интеграция с F38 Public AI Risk Registry для vendor data

---

### US-S07-21: Предиктивный анализ compliance
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-18, F44
**Компонент:** `[SaaS]`

Как DPO, я хочу видеть предиктивный анализ (прогноз score к Aug 2, risk trajectory), чтобы заранее спланировать ресурсы.

**Acceptance Criteria:**
- [ ] Trend analysis: линейная экстраполяция score trajectory на основе исторических данных
- [ ] Prediction: "При текущем темпе ваш score будет 78/100 к Aug 2, 2026"
- [ ] Risk forecast: какие obligations будут не покрыты к дедлайну
- [ ] Resource estimation: "Для достижения 90/100 нужно ≈40 человеко-часов"
- [ ] Visualization: prediction chart с confidence interval на Timeline SaaS page
- [ ] Alert: "При текущем темпе вы НЕ успеете к дедлайну" → notification

**Технические детали:**
- SaaS: расширение F48 Deployer Compliance Timeline
- ML: простая линейная регрессия на исторических scan results (без внешних ML зависимостей)

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| Инкрементальный скан: 10-50x ускорение | Замер на 100+ файлов |
| SDK streaming: 3 провайдера | OpenAI + Anthropic + Vercel AI |
| Domain hooks: 4 отрасли с реальными правилами | HR + Finance + Healthcare + Education |
| Budget: реальные цены 5+ моделей | GPT-4o, Claude, Gemini и т.д. |
| Guard integration: двухуровневая цепочка | regex → API fallback |
| L2 semantic validation: 3 типа документов | FRIA + Privacy Policy + Risk Assessment |
| Multi-agent interaction: граф зависимостей | Визуализация в TUI |
| ISO 27090: 6 security rules | Все в findings |
| ISO 42001: readiness score | Endpoint работает |
| SaaS: incidents workflow | Art.73 covered |
| SaaS: real-time monitoring | Score updates < 5 сек |
| SaaS: conformity wizard | 5-step complete |
| Тесты | cargo test + vitest passing |
| User Stories | 21 planned |
