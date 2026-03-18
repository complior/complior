# Sprint S08 — Polish + Integration + Onboarding + SaaS Enterprise Complete

**Версия:** 2.0.0
**Дата:** 2026-03-18
**Статус:** Scanner parts merged into S07-S08 Intelligence (✅ DONE). UX/Polish items → 📌 MONTH-1.

---

## Обзор

Восьмой спринт. Фокус на UX polish, platform integration, guided onboarding и завершение SaaS Enterprise функциональности. Спринт делает Complior готовым для production onboarding: новый пользователь за 15 минут проходит от первого запуска до первого FRIA. MCP Guard tools обеспечивают runtime безопасность агентов. SaaS получает мультиязычность, Enterprise features и AI Literacy модуль.

Спринт разбит на 5 направлений:
- **Engine** — post-apply validation, env vars discovery, per-finding evidence, advanced drift detection, regulation tracking
- **SDK** — content marking visible watermark
- **CLI** — guided onboarding TUI wizard (зависит от US-S05-33 Engine onboarding)
- **MCP** — Guard tools, builder workflow
- **SaaS** — мультиязычность, Enterprise, AI Literacy, AESIA экспорт, onboarding, мониторинг, analytics, NHI

**Цель:** TUI Onboarding wizard, MCP Guard для runtime безопасности, SaaS Enterprise complete. (Engine onboarding и PR compliance diff перенесены в S05)

---

## User Stories

### US-S08-01: Fix — post-apply validation с автоматическим rollback
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-97
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы после применения fix автоматически запускалась re-validation, и если score ухудшился — fix откатывался, чтобы не вносить регрессии.

**Acceptance Criteria:**
- [ ] После apply fix → re-scan ТОЛЬКО изменённого файла (не полный скан)
- [ ] Проверка: finding resolved? Если нет → warning "Fix did not resolve finding"
- [ ] Score comparison: если новый score < старый → автоматический rollback через undo
- [ ] Rollback notification в TUI: "Fix rolled back: score worsened 74→71"
- [ ] `--no-validate` флаг для skip validation (быстрый режим)
- [ ] Логирование в evidence chain: fix applied → validation result → rollback (если был)

**Технические детали:**
- `engine/core/src/services/fix-service.ts` — добавить post-apply validation flow
- `engine/core/src/services/scan-service.ts` — single-file re-scan method
- Интеграция с undo-service для rollback
- `cli/src/app/actions.rs` — обновить ApplyFixes flow

---

### US-S08-02: Passport — env vars discovery
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-98, E-35
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы passport auto-discovery сканировал env vars (`.env.example`, docker-compose, CI/CD), чтобы обнаружить AI-related конфигурацию и pre-fill passport.

**Acceptance Criteria:**
- [ ] Сканирование `.env.example`, `.env.sample` (НИКОГДА `.env` — может содержать секреты)
- [ ] Сканирование `docker-compose.yml`: environment section
- [ ] Сканирование CI/CD: `.github/workflows/*.yml`, `.gitlab-ci.yml`
- [ ] Pattern matching: `OPENAI_API_KEY`, `ANTHROPIC_*`, `HUGGINGFACE_*`, `MODEL_NAME`, `LLM_*`
- [ ] Результаты → passport fields: `detected_providers`, `detected_models`, `detected_api_endpoints`
- [ ] Security: НИКОГДА не сохранять значения env vars, только имена и паттерны

**Технические детали:**
- `engine/core/src/domain/passport/env-scanner.ts` — новый модуль
- Интеграция в `agent-discovery.ts` как дополнительный шаг discovery
- Pattern registry: `AI_ENV_PATTERNS` — расширяемый список паттернов

---

### US-S08-03: Evidence — per-finding entries с compact форматом
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-99
**Компонент:** `[Engine]`

Как аудитор, я хочу чтобы evidence chain содержал per-finding события (а не только scan summary), чтобы отследить lifecycle каждого finding.

**Acceptance Criteria:**
- [ ] Finding-level events: `finding.created`, `finding.resolved`, `finding.worsened`
- [ ] Compact format: только delta (новые/resolved findings), не полный дамп
- [ ] Max 100 finding events per scan (при 47 findings × 5 scan = 235 → только top 100 по severity)
- [ ] Chain rotation: при достижении 10,000 entries → archive old chain → start fresh
- [ ] Archive: `.complior/evidence/archive/chain-{date}.json.gz` (сжатый)
- [ ] `verify()` работает с текущим chain (не нужен доступ к архивам для daily verification)

**Технические детали:**
- `engine/core/src/domain/scanner/evidence-store.ts` — расширение, compact append
- Решает BUG-05 (chain раздувается до сотен МБ): delta-only + rotation
- `scan-service.ts` — изменить что кладётся в evidence (summary + top findings delta)

---

### ~~US-S08-04~~ ПЕРЕНЕСЁН → US-S05-33 (Sprint S05, Phase 3: Launch Priorities)

---

### US-S08-05: Advanced Drift Detection
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-91, C.F31
**Компонент:** `[Engine]`

Как оператор AI-системы в production, я хочу получать алерты при drift (изменение поведения/compliance), чтобы выполнить OBL-020 (Art.72 post-market monitoring).

**Acceptance Criteria:**
- [ ] Configuration drift: `.complior/config.toml` или passport changes → alert
- [ ] Dependency drift: package.json/lock file changes affecting AI SDKs → rescan trigger
- [ ] Score drift: track score over time, alert при стабильном снижении (3+ скана подряд)
- [ ] Semantic drift: L2 document changed → re-validate sections
- [ ] Drift severity classification: none/minor/major/critical (расширение C1 из S02)
- [ ] Drift report: `complior drift report` — summary of all detected drifts за период
- [ ] HTTP endpoint: `GET /drift/report?since=2026-03-01`
- [ ] Evidence chain: drift events записываются с severity

**Технические детали:**
- Расширение `engine/core/src/domain/scanner/drift-detection.ts` (C1 baseline)
- `drift-tracker.ts` — persistent tracking скоров и конфигурации
- Интеграция с file watcher: отдельный callback для config/dependency changes

---

### US-S08-06: Regulation Change Tracking
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-92, C.F32
**Компонент:** `[Engine]`

Как compliance officer, я хочу получать уведомления при изменениях в EU AI Act regulation data (новые guidelines, delegated acts), чтобы обновить compliance strategy.

**Acceptance Criteria:**
- [ ] Versioned regulation data: `REGULATION_VERSION` в engine, при обновлении — diff
- [ ] Change log: какие obligations изменились, новые guidance documents
- [ ] Impact analysis: какие из моих систем затронуты изменением
- [ ] Notification: при обновлении regulation data через `complior update` → summary of changes
- [ ] HTTP endpoint: `GET /regulation/changes?since=<version>`
- [ ] CLI: `complior regulation changes` — показать последние изменения

**Технические детали:**
- `engine/core/src/domain/regulation/change-tracker.ts` — новый модуль
- Расширение `engine/core/src/infra/regulation-loader.ts` — version tracking
- `engine/core/data/regulation-changelog.json` — история изменений

---

### ~~US-S08-07~~ УДАЛЁН — объединён в US-S07-06 (L2 семантическая валидация + конкретные рекомендации)

---

### US-S08-08: Fix Validation — проверка корректности сгенерированных fix-ов
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-16
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы сгенерированные fix-ы проверялись на синтаксическую корректность перед показом, чтобы не получать broken code.

**Acceptance Criteria:**
- [ ] Syntax check: сгенерированный diff не создаёт syntax errors (AST parse после применения)
- [ ] Import check: добавляемые import-ы не конфликтуют с существующими
- [ ] Scope check: новый код не дублирует существующие переменные/функции
- [ ] Confidence score per fix: HIGH (syntax verified) / MEDIUM (heuristic) / LOW (LLM-only)
- [ ] Invalid fix → не показывать в TUI, логировать для улучшения генерации

**Технические детали:**
- `engine/core/src/domain/fixer/fix-validator.ts` — новый модуль
- AST parsing через существующий L4 infrastructure
- Интеграция в fix pipeline перед возвратом fix-ов клиенту

---

### US-S08-09: Content Marking — visible marker
**Приоритет:** MEDIUM
**Продукт:** SDK
**Backlog ref:** S-22, S-34
**Компонент:** `[SDK]`

Как разработчик, я хочу чтобы AI-generated content был визуально помечен (Art.50(2)), чтобы пользователи знали что контент создан AI.

**Acceptance Criteria:**
- [ ] Configurable prefix: `[AI Generated] ` перед response
- [ ] Configurable suffix: `\n---\nGenerated by AI` после response
- [ ] Watermark mode: невидимый Unicode watermark (zero-width characters) в тексте
- [ ] Opt-in: disabled by default, enabled через `contentMarking: { mode: 'prefix' | 'suffix' | 'watermark' | 'all' }`
- [ ] Streaming compatible: prefix добавляется к первому chunk, suffix — к последнему
- [ ] Bypass для internal/debug responses: `contentMarking: { skipInternal: true }`

**Технические детали:**
- `engine/sdk/src/hooks/post/content-marking.ts` — расширение существующего hook
- Unicode watermark: zero-width joiner + encoded metadata
- Интеграция с streaming interceptor из US-S07-02

---

### ~~US-S08-10~~ ПЕРЕНЕСЁН → US-S05-34 (Sprint S05, Phase 3: Launch Priorities)

---

### US-S08-11: Guided Onboarding TUI Wizard
**Приоритет:** MEDIUM
**Продукт:** CLI
**Backlog ref:** C-25, C-28
**Компонент:** `[CLI]`

Как новый пользователь в TUI, я хочу видеть onboarding wizard overlay при первом запуске, чтобы получить guided experience.

**Acceptance Criteria:**
- [ ] Wizard overlay при первом запуске (нет `.complior/` директории)
- [ ] Progress bar: Step 1/5, Step 2/5, ...
- [ ] Hotkey `?` — показать/скрыть onboarding overlay в любой момент
- [ ] Каждый step отображает: описание, текущий прогресс, action button
- [ ] Skip option: "Press [s] to skip onboarding" (опытный пользователь)
- [ ] Completion: "Onboarding complete! Score: 62/100. Press [Enter] to start."
- [ ] Persistence: не показывать повторно после completion (`.complior/onboarding-done`)

**Технические детали:**
- `cli/src/views/onboarding/mod.rs` — overlay view
- `cli/src/app/overlays.rs` — добавить OnboardingOverlay state
- Использует engine onboarding endpoints из US-S05-33 (бывший US-S08-04, перенесён в S05)
- Render поверх текущего view как modal

---

### US-S08-12: MCP Guard Tools
**Приоритет:** HIGH
**Продукт:** MCP
**Backlog ref:** M-09
**Компонент:** `[MCP]`

Как AI-агент (Claude Code, Cursor), я хочу вызывать compliance guard tools через MCP, чтобы проверить безопасность prompt/response в реальном времени.

**Acceptance Criteria:**
- [ ] `complior_guard_check` — общая проверка prompt: prohibited content, PII, bias, safety
- [ ] `complior_guard_pii` — специализированная PII detection: email, phone, SSN, credit card, address, name patterns
- [ ] `complior_guard_bias` — bias detection: gender, race, age, disability, religion patterns в тексте
- [ ] Response format: `{ safe: boolean, issues: [{type, severity, detail, location}] }`
- [ ] Latency target: < 50ms для regex-based checks, < 200ms для full analysis
- [ ] Configurable: rules per domain (HR stricter, general permissive)

**Технические детали:**
- `engine/core/src/mcp/tools/guard-check.ts`, `guard-pii.ts`, `guard-bias.ts`
- Расширение MCP server: 8 → 11 tools
- Regex-based rules + optional Guard API fallback (из US-S07-05)
- `engine/core/data/guard-rules/` — правила per domain (JSON/YAML)

---

### US-S08-13: MCP Builder Workflow Integration
**Приоритет:** MEDIUM
**Продукт:** MCP
**Backlog ref:** M-10
**Компонент:** `[MCP]`

Как AI-агент в builder workflow (генерация кода), я хочу чтобы MCP tools интегрировались в мой workflow, чтобы compliance check происходил автоматически при генерации кода.

**Acceptance Criteria:**
- [ ] `complior_pre_generate` — pre-check перед генерацией: разрешён ли use case, нет ли prohibited patterns в spec
- [ ] `complior_post_generate` — post-check сгенерированного кода: banned packages, security issues
- [ ] `complior_suggest_imports` — рекомендация compliance imports для сгенерированного кода
- [ ] Workflow context: agent может указать `{ phase: 'planning' | 'coding' | 'review' }` для context-aware checks
- [ ] Response включает actionable suggestions (не только findings)

**Технические детали:**
- `engine/core/src/mcp/tools/builder-workflow.ts` — 3 новых MCP tools
- Расширение MCP server: 11 → 14 tools
- Интеграция с scanner для post-generate checks

---

### US-S08-14: Мультиязычность (EN/DE/FR/ES)
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-53, F14
**Компонент:** `[SaaS]`

Как пользователь из EU (Германия, Франция, Испания), я хочу использовать SaaS Dashboard на моём языке, чтобы работать в привычной среде.

**Acceptance Criteria:**
- [ ] 4 языка: English (default), Deutsch, Francais, Espanol
- [ ] Переключение языка: в header профиля, persistence в user settings
- [ ] Покрытие: все UI labels, form fields, error messages, tooltips
- [ ] Regulation terms: юридически корректные термины per language (из EU AI Act переводов)
- [ ] Generated documents (FRIA, reports): на выбранном языке
- [ ] Fallback: непереведённый текст → English

**Технические детали:**
- SaaS: `i18n/` — language files (JSON), middleware, context provider
- Библиотека: next-intl или react-i18next
- Regulation terms: из официальных EU AI Act переводов (EUR-Lex)

---

### US-S08-15: Enterprise Features
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-51, F33
**Компонент:** `[SaaS]`

Как Enterprise клиент, я хочу custom rules, полный audit log и SSO, чтобы интегрировать Complior в корпоративную инфраструктуру.

**Acceptance Criteria:**
- [ ] Custom rules: YAML-based правила, загрузка через UI, валидация schema
- [ ] Audit log: все действия пользователей (login, view, create, edit, delete, export) с timestamps
- [ ] SSO: SAML 2.0 + OIDC через WorkOS (уже интегрирован)
- [ ] Role-based access: Admin, DPO, Developer, Auditor (расширение F02 IAM)
- [ ] Tenant isolation: data isolation per organization
- [ ] Compliance report scheduling: ежедневный/еженедельный автоотчёт по email

**Технические детали:**
- SaaS: расширение F33 Enterprise
- Custom rules: upload UI + backend validation + engine integration
- Audit log: middleware на все API routes, persistent storage

---

### US-S08-16: AI Literacy модуль (Art.4)
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-54, F18
**Компонент:** `[SaaS]`

Как DPO/HR, я хочу обеспечить AI literacy обучение сотрудников (Art.4), чтобы выполнить OBL-001 (обеспечение AI literacy пропорционально позиции).

**Acceptance Criteria:**
- [ ] Курсы: 3 уровня (Basic AI Awareness, AI Act Essentials, Role-Specific Compliance)
- [ ] Per-role content: Developer, DPO, Manager, End-user — разные modules
- [ ] Тесты: quiz после каждого модуля, passing score 80%
- [ ] Tracking: per-employee completion status, certificates
- [ ] Evidence: completion records → evidence chain (доказательство для регулятора)
- [ ] Content: based on Art.4 requirements + AI Office guidelines

**Технические детали:**
- SaaS: `app/literacy/` — courses, modules, quizzes, tracking
- Content management: markdown-based course content
- Certificates: auto-generated PDF per completion

---

### US-S08-17: AESIA экспорт (12 Excel файлов)
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-21
**Компонент:** `[SaaS]`

Как DPO в немецкой компании, я хочу экспортировать compliance данные в AESIA формате (12 Excel files), чтобы подать отчётность в немецкий регулятор.

**Acceptance Criteria:**
- [ ] 12 Excel файлов по AESIA template: AI System Inventory, Risk Assessment, FRIA Summary, и т.д.
- [ ] Pre-filled из passport + scan results + evidence chain
- [ ] Deutsch localization: все headers и labels на немецком
- [ ] Validation: проверка completeness перед экспортом
- [ ] Download: one-click ZIP со всеми 12 файлами
- [ ] Format: `.xlsx` через server-side generation (ExcelJS или подобная библиотека)

**Технические детали:**
- SaaS: `app/exports/aesia/` — templates, generator, download endpoint
- AESIA format: по спецификации BfDI (немецкий DPA)

---

### US-S08-18: Onboarding + Notifications (SaaS)
**Приоритет:** HIGH
**Продукт:** SaaS
**Backlog ref:** D-55, F11
**Компонент:** `[SaaS]`

Как новый пользователь SaaS, я хочу получить guided onboarding и настроить notifications, чтобы быстро начать работу и не пропустить важные события.

**Acceptance Criteria:**
- [ ] Onboarding: 4-step wizard при первом login (Profile → Team → First System → First Scan)
- [ ] Checklist dashboard widget: "Get Started" с progress (0/5 steps done)
- [ ] Email notifications: scan complete, score change, new incident, deadline approaching
- [ ] Slack integration: webhook URL → compliance alerts в Slack канал
- [ ] Notification preferences: per-event toggle (email/slack/none)
- [ ] Weekly digest: summary email с score trends, open findings, upcoming deadlines

**Технические детали:**
- SaaS: расширение F11 Onboarding + Notifications
- Email: existing email infrastructure (Resend/SendGrid)
- Slack: incoming webhook integration

---

### US-S08-19: Мониторинг регуляторных изменений (SaaS)
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-45, F12
**Компонент:** `[SaaS]`

Как DPO, я хочу получать уведомления о регуляторных изменениях (новые guidelines, delegated acts, enforcement updates) в SaaS Dashboard, чтобы обновлять compliance strategy.

**Acceptance Criteria:**
- [ ] Feed: регуляторные изменения на timeline (Dashboard widget)
- [ ] Sources: EUR-Lex, AI Office, BfDI, CNIL, AEPD — curated feed
- [ ] Impact assessment: автоматическое определение, какие из моих систем затронуты
- [ ] Alert: notification при критических изменениях (новый delegated act, enforcement action)
- [ ] Archive: история всех регуляторных изменений с impact analysis

**Технические детали:**
- SaaS: `app/regulation-monitor/` — feed, impact analysis, notifications
- Curated content: редакционно поддерживаемый feed (не auto-scraping)

---

### US-S08-20: MCP Proxy Analytics (SaaS Dashboard)
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-46, F41
**Компонент:** `[SaaS]`

Как оператор, я хочу видеть analytics MCP proxy вызовов в SaaS Dashboard, чтобы мониторить usage patterns всех AI-агентов.

**Acceptance Criteria:**
- [ ] Dashboard: charts с MCP tool usage (calls/hour, top tools, error rate)
- [ ] Per-agent breakdown: какой агент вызывает какие tools, частота, latency
- [ ] Anomaly detection: alert при unusual patterns (spike в вызовах, новый tool usage)
- [ ] Historical data: retention 90 дней, aggregated по дням
- [ ] Export: CSV/JSON для external analysis

**Технические детали:**
- SaaS: расширение F41 MCP Proxy Analytics
- Data source: sync от CLI engine proxy analytics (US-S07-09)
- Charts: line, bar, pie — стандартный charting library

---

### US-S08-21: NHI Dashboard
**Приоритет:** MEDIUM
**Продукт:** SaaS
**Backlog ref:** D-47, F43
**Компонент:** `[SaaS]`

Как security officer, я хочу видеть все Non-Human Identities (API keys, service accounts, bot tokens) используемые AI-системами, чтобы управлять identity lifecycle.

**Acceptance Criteria:**
- [ ] NHI inventory: все обнаруженные non-human identities per AI system
- [ ] Lifecycle tracking: created, last used, expires, rotation needed
- [ ] Risk scoring: NHI без rotation > 90 дней → HIGH risk, без scope limiting → MEDIUM
- [ ] Dashboard: таблица NHI с filters (system, risk, type, status)
- [ ] Actions: mark as reviewed, schedule rotation, disable
- [ ] Evidence: NHI audit trail для OBL-006a (non-human identity logging)

**Технические детали:**
- SaaS: `app/nhi/` — dashboard, API routes
- Data source: CLI NHI Scanner (C.E05) results via sync
- DB schema: nhi_identities table с lifecycle fields

---

### US-S08-22: Discovery из env vars (расширенный)
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-35
**Компонент:** `[Engine]`

Как разработчик в Docker/Kubernetes среде, я хочу чтобы discovery обнаруживал AI-системы из Kubernetes manifests и Helm charts, чтобы passport покрывал cloud-native deployments.

**Acceptance Criteria:**
- [ ] Kubernetes manifests: `k8s/*.yaml`, `deploy/*.yaml` — поиск AI-related containers/env vars
- [ ] Helm charts: `charts/*/values.yaml` — AI model references, API endpoints
- [ ] Terraform: `*.tf` — AI service resources (AWS SageMaker, Azure AI, GCP Vertex)
- [ ] Результаты → passport: `deployment_context`, `infrastructure_providers`
- [ ] Cloud provider detection: AWS/Azure/GCP/self-hosted
- [ ] Security check: exposed API keys в manifests → CRITICAL finding

**Технические детали:**
- Расширение `engine/core/src/domain/passport/env-scanner.ts` из US-S08-02
- Kubernetes/Helm/Terraform parsers
- Новые паттерны в discovery pipeline

---

### US-S08-23: L4 Semantic Detection — import-graph analysis
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-109
**Компонент:** `[Engine]`
**Обязательства:** OBL-006,008,010,011b,015,016,020

Как разработчик с нестандартным naming convention, я хочу чтобы L4 scanner находил compliance mechanisms по import-графу и семантике вызовов (а не только по именам переменных), чтобы мой `disableAiFeature()` определялся как kill switch, а `logAiInteraction()` — как interaction logging.

**Проблема:**
Текущий L4 сканер использует 40 regex по naming convention (`killSwitch`, `AIDisclosure`, `auditLog`). Разработчики не обязаны следовать этим конвенциям. Recall для positive patterns: ~70%. Это единственный источник для секции "What's in Place" в `complior scan`.

**Acceptance Criteria:**

*Phase 1 — Import-Graph (блокирует Phase 2):*
- [ ] Парсинг `import`/`require`/`from` statements → граф зависимостей между файлами проекта
- [ ] AI-relevant file detection: файл импортирует `openai`, `@anthropic-ai/sdk`, `@ai-sdk/*`, `langchain` (прямо или транзитивно) → помечен как AI-relevant
- [ ] Транзитивность: `service.ts` → `llm-client.ts` → `openai` = `service.ts` тоже AI-relevant
- [ ] Любой вызов в AI-relevant файле без compliance wrapper → потенциальный bare LLM call (расширяет negative detection)
- [ ] Import-graph парсится один раз при старте скана, reused всеми L4 checks
- [ ] Кэш import-graph в `.complior/cache/` (интеграция с US-S07-01 если реализован)

*Phase 2 — Expanded Semantic Patterns (40→120+):*
- [ ] Kill switch: `config.*disable`, `feature.*toggle`, `process.exit`, `server.close`, `shutdown`, `circuit.*break`
- [ ] Logging: `winston`, `pino`, `bunyan`, `morgan`, `console.log.*model`, `structuredLog`, `fs.*log`
- [ ] Disclosure: `"powered by"`, `"generated by"`, `"AI-"`, `transparency`, `notice.*ai`, `disclaimer`
- [ ] Human oversight: `approve`, `review`, `confirm`, `escalat`, `manual`, `human.*loop`, `require.*auth`
- [ ] Data governance: `validate.*schema`, `sanitize`, `anonymize`, `pseudonymize`, `consent`, `gdpr`
- [ ] Monitoring: `prometheus`, `grafana`, `datadog`, `metrics.*model`, `health.*check`, `alert`
- [ ] Comment-aware: skip matches inside `//`, `/* */`, `#`, `"""`, `'''`
- [ ] String-literal-aware: skip matches inside строковых литералов (уменьшение false positives)
- [ ] Per-pattern confidence: exact naming match → 90%, semantic match → 75%, import-based → 70%

*Phase 3 — Lightweight AST (optional, можно отложить):*
- [ ] TypeScript/JavaScript: `@swc/core` WASM parser → function signatures + return types
- [ ] Detect: функция принимает LLM client и оборачивает его (compliance wrapper pattern)
- [ ] Detect: функция с `disable`/`shutdown` семантикой по body structure (не только по имени)
- [ ] Python: `tree-sitter-python` → аналогичный анализ

**Метрики:**
- [ ] Recall positive patterns (mechanisms found): 70% → 90%+ (замер на 5 test-projects)
- [ ] False positive rate negative patterns: снижение на 50%+
- [ ] L4 confidence: 70-80% → 85-92%
- [ ] Performance: import-graph парсинг < 500ms для проекта 1000 файлов

**Технические детали:**
- `engine/core/src/domain/scanner/import-graph.ts` — новый модуль: `buildImportGraph(files) → ImportGraph`
- `engine/core/src/domain/scanner/rules/pattern-rules.ts` — расширение паттернов 40→120+
- `engine/core/src/domain/scanner/rules/comment-filter.ts` — strip comments/strings перед matching
- `engine/core/src/domain/scanner/layers/layer4-patterns.ts` — интеграция import-graph в `runLayer4()`
- Phase 3 (AST): `engine/core/src/domain/scanner/ast/` — отдельная директория, lazy-loaded
- `composition-root.ts` — DI wiring import-graph builder
- Тесты: 30+ unit tests для import-graph + 20+ для new patterns + 10 integration

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| Post-apply validation: auto-rollback работает | Fix → rescan → rollback если хуже |
| Env vars discovery: 3+ sources | .env.example + docker-compose + CI/CD |
| Evidence per-finding: compact format | Не более 100 entries per scan |
| ~~Guided onboarding~~ | ~~ПЕРЕНЕСЁН → US-S05-33~~ |
| Advanced drift: 4 типа drift | config + dependency + score + semantic |
| Content marking: 3 режима | prefix + suffix + watermark |
| ~~Compliance diff~~ | ~~ПЕРЕНЕСЁН → US-S05-34~~ |
| MCP Guard: 3 tools | guard_check + guard_pii + guard_bias |
| MCP Builder: 3 tools | pre_generate + post_generate + suggest_imports |
| SaaS мультиязычность: 4 языка | EN + DE + FR + ES |
| SaaS Enterprise: SSO + custom rules | WorkOS SAML/OIDC + YAML rules |
| SaaS AI Literacy: 3 уровня курсов | Basic + Essentials + Role-Specific |
| SaaS AESIA: 12 Excel файлов | AESIA format export |
| SaaS Onboarding: 4-step wizard | Email + Slack notifications |
| SaaS NHI Dashboard | NHI inventory + lifecycle |
| L4 Semantic Detection: recall 90%+ | Import-graph + 120 patterns + comment-aware |
| Тесты | cargo test + vitest passing |
| User Stories | 21 planned (2 перенесены в S05) |
