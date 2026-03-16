# Scan Pipeline — Архитектура Сканера

> Полное описание 5-слойного пайплайна сканирования Complior.
> Оркестратор: `engine/core/src/domain/scanner/create-scanner.ts`

## Обзор

Complior использует **единый последовательный пайплайн** для оценки AI-compliance проекта. Пайплайн полностью **офлайн** (кроме опционального L5). Каждый слой добавляет findings в общий массив, который в конце обогащается контекстом, объяснениями и скорится.

```
scan(projectPath)
│
├─ 1.   L1: File Presence           ← Существуют ли обязательные файлы?
├─ 2.   L2: Document Structure      ← Качество содержимого документов
├─ 3.   L3: Dependencies/Config     ← AI SDK, запрещённые пакеты, конфиг
├─ 4.   L3-ext: Lockfile Scan       ← Глубокий анализ дерева зависимостей
├─ 4a.  Import Graph (E-109)        ← Граф импортов, AI-relevance файлов [S09]
├─ 4b.  Multi-Language (E-111)      ← Go/Rust/Java deps + AI SDK detection [S09]
├─ 5.   L4: Code Patterns           ← Паттерны compliance (comment-filtered, E-114b) [S09]
├─ 5a.  Structural Analysis (E-110) ← AST: bare calls, wrappers, safety mutations [S09]
├─ 6.   NHI: Secrets Scan           ← Утечки API-ключей и токенов
├─ 7.   Cross-Layer                 ← Корреляция результатов между слоями
│
├─ 8.   enrichFindings()            ← codeContext + fixDiff (top-20)
├─ 9.   applyAttestations()         ← Пользовательские аттестации
├─ 10.  explainFindings()           ← Статья, штраф, дедлайн
├─ 11.  calculateScore()            ← Взвешенный скор 0-100
│
├─ [E-11] Project-level Cache       ← SHA-256 hash → skip if unchanged [S08]
│
└─ return ScanResult

scanDeep(projectPath) — дополнительно:
│
├─ 12.  Targeted L5 (E-113)         ← LLM только для uncertain findings (50-80%) [S09]
├─ 13.  Doc Validation (E-114a)     ← LLM проверка содержимого документов [S09, planned]
│
└─ return ScanResult (enhanced)
```

---

## Слои сканирования

### L1: File Presence (Наличие файлов)

**Файл:** `domain/scanner/layers/layer1-files.ts`
**Что делает:** Проверяет существование обязательных compliance-документов в проекте.
**Метод:** `fs.existsSync()` по списку путей.

| Проверка | Файл | Статья EU AI Act |
|----------|------|-----------------|
| FRIA | `docs/fria.md`, `.complior/fria/` | Art. 27 |
| Model Card | `docs/model-card.md` | Art. 53 |
| Risk Assessment | `docs/risk-assessment.md` | Art. 9 |
| Data Governance | `docs/data-governance.md` | Art. 10 |
| Technical Documentation | `docs/technical-documentation.md` | Art. 11 |
| Human Oversight | `docs/human-oversight.md` | Art. 14 |
| Transparency Notice | `docs/transparency-notice.md` | Art. 13, 50 |
| Incident Response | `docs/incident-response.md` | Art. 62 |
| Monitoring Plan | `docs/monitoring-plan.md` | Art. 72 |
| Passport | `.complior/passports/` | Art. 49 |
| ... | (23 проверки всего) | |

**Точность:** ~98% — бинарная проверка, ложных срабатываний почти нет.
**Вес в скоре:** 1.0 (confidence 95-98%)
**Слабость:** Не проверяет содержимое. Пустой файл пройдёт.

---

### L2: Document Structure (Структура документов)

**Файл:** `domain/scanner/layers/layer2-docs.ts`
**Что делает:** Проверяет качество содержимого compliance-документов.
**Метод:** Парсинг markdown: подсчёт слов, глубина секций, наличие списков/таблиц.

**Текущая логика:**
- `measureSectionDepth()` — считает слова в секциях, наличие списков, таблиц, конкретных данных
- Если >50% секций "shallow" (мало слов, нет конкретики) → статус SHALLOW (confidence 65)
- 13 валидаторов для разных типов документов (FRIA, Model Card и т.д.)

**Точность:** ~65% — word count ≠ качество. Документ с 500 словами "lorem ipsum" пройдёт.
**Вес в скоре:** 0.95 (confidence 65-95% в зависимости от проверки)
**Слабость:** Нет семантического понимания содержимого.

**Планируемое улучшение (E-12):** Семантическая валидация — обязательные секции, проверка наличия числовых метрик, per-section feedback.

---

### L3: Dependencies & Config (Зависимости и конфигурация)

**Файл:** `domain/scanner/layers/layer3-deps.ts`
**Что делает:** Анализирует package.json / requirements.txt для обнаружения AI SDK и запрещённых пакетов.

**Два типа проверок:**

1. **AI SDK Detection** — обнаружение используемых AI-фреймворков:
   - OpenAI, Anthropic, Google AI, Vercel AI SDK, LangChain, HuggingFace, Cohere, Replicate, и др.
   - Результат: `l3-ai-sdk-detected` (pass) — используется для отображения "Your AI Stack"

2. **Banned Package Detection** — 45 запрещённых пакетов по 8 категориям Art. 5:
   - Emotion recognition, social scoring, biometric categorization, subliminal manipulation, и др.
   - Результат: `l3-prohibited-*` (fail, severity: critical)
   - Fallback: `PROHIBITED_PATTERNS` regex для вариаций имён

**Точность:** ~95% — package.json парсинг надёжен.
**Вес в скоре:** 0.90
**Слабость:** Только npm/pip. Не покрывает Go modules, Cargo.toml, Maven/Gradle.

---

### L3-ext: Lockfile Deep Scan (Глубокий анализ lockfile)

**Файл:** `domain/scanner/checks/dep-deep-scan.ts`
**Что делает:** Анализирует lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) для обнаружения запрещённых пакетов в транзитивных зависимостях.

**Метод:** Парсинг lockfile → построение дерева зависимостей → проверка каждого пакета против banned-list.

**Точность:** ~90%
**Слабость:** Транзитивные зависимости могут давать false positive (пакет с подозрительным именем, но легитимным назначением).

---

### L4: Code Patterns (Паттерны в коде)

**Файл:** `domain/scanner/layers/layer4-patterns.ts`
**Что делает:** Сканирует исходный код проекта на наличие compliance-механизмов.
**Метод:** Regex-паттерны по **comment-filtered** содержимому файлов (E-114b: `stripCommentsOnly()` убирает комментарии, сохраняя строковые литералы).

**Категории паттернов (40+):**

| Категория | Примеры паттернов | Что ищет |
|-----------|-------------------|----------|
| AI Disclosure | `AIDisclosure`, `ai-disclosure`, `transparency` | Уведомление об AI |
| Kill Switch | `killSwitch`, `kill-switch`, `emergencyStop` | Аварийное отключение |
| Human Oversight | `humanReview`, `human-oversight`, `manualApproval` | Контроль человеком |
| Content Watermarking | `watermark`, `content-marking` | Маркировка AI-контента |
| Interaction Logging | `interactionLog`, `auditLog`, `complianceLog` | Логирование |
| Data Governance | `dataGovernance`, `consent`, `dataRetention` | Управление данными |
| Accuracy & Robustness | `benchmark`, `accuracy`, `robustness` | Точность и надёжность |
| Record Keeping | `recordKeeping`, `auditTrail` | Ведение записей |
| Cybersecurity | `rateLimiter`, `inputValidation`, `encryption` | Кибербезопасность |
| Deployer Monitoring | `incidentReport`, `anomalyDetection` | Мониторинг |
| GPAI Documentation | `modelCard`, `systemCard` | Документация GPAI |
| Conformity Assessment | `conformityAssessment` | Оценка соответствия |

**Логика:** Паттерны L4 проверяются **только если L3 обнаружил AI SDK** (conditional execution). Если нет AI SDK → L4 пропускается.

**Сканируемые файлы:** Все `.ts`, `.js`, `.tsx`, `.jsx`, `.py` в проекте, кроме `node_modules/`, `dist/`, `.git/`, тестов.

**Точность:** ~70% — regex по именам переменных. Разработчик назвал `safetySwitch` вместо `killSwitch` → не найдено.
**Вес в скоре:** 0.75
**Слабость:** Нет понимания семантики кода. Ищет имена, а не поведение.

**Планируемое улучшение (E-109):** Import-graph + AST-aware matching — 120+ паттернов, анализ связей между файлами.

---

### NHI: Non-Human Identity Scan (Сканирование секретов)

**Файл:** `domain/scanner/checks/nhi-scanner.ts`
**Что делает:** Обнаруживает утечки API-ключей, токенов и секретов в коде.
**Метод:** 37 regex-паттернов для различных типов секретов.

**Типы секретов:**
- API ключи: OpenAI (`sk-...`), Anthropic (`sk-ant-...`), Google, AWS, Azure
- Токены: JWT, GitHub, GitLab, Slack, Discord
- Приватные ключи: RSA, SSH, PGP
- Строки подключения: PostgreSQL, MongoDB, Redis, MySQL

**Результат:** `l4-nhi-*` finding (fail для обнаруженных секретов, pass `l4-nhi-clean` если чисто).
**Точность:** ~85%
**Слабость:** Не детектирует Base64-закодированные ключи, переменные окружения с секретами.

---

### Cross-Layer: Корреляция между слоями

**Файл:** `domain/scanner/checks/cross-layer.ts`
**Что делает:** Проверяет согласованность результатов между слоями. Находит противоречия.
**Метод:** Логические правила, сопоставляющие результаты L1-L4.

**7 правил:**

| Правило | Описание |
|---------|----------|
| doc-code-mismatch | Документ есть (L1 pass), но код не реализует (L4 fail) |
| sdk-no-disclosure | AI SDK обнаружен (L3), но нет AI Disclosure (L4) |
| banned-with-wrapper | Запрещённый пакет (L3) обёрнут в SDK (L4) — всё равно fail |
| logging-no-retention | Логирование есть (L4), но нет политики хранения (L1) |
| kill-switch-no-test | Kill switch есть (L4), но нет тестов для него |
| passport-code-mismatch | Паспорт заявляет capability, код не реализует |

**Точность:** ~80% — зависит от качества L1-L4 на входе.
**Слабость:** "Garbage in, garbage out" — если L4 пропустил механизм, cross-layer тоже пропустит.

---

## Пост-обработка

### enrichFindings() — Обогащение контекстом

Для **top-20 findings** (по severity) добавляет:
- `codeContext` — 5 строк кода вокруг проблемного места
- `fixDiff` — before/after diff для автоматического исправления

### applyAttestations() — Пользовательские аттестации

Если в `project.toml` есть `attest_*` записи — соответствующие findings переводятся из fail в pass. Механизм для ручного подтверждения compliance.

### explainFindings() — Объяснения

Для каждого finding добавляет из `finding-explanations.json`:
- `article` — ссылка на статью EU AI Act
- `penalty` — размер штрафа
- `deadline` — дедлайн вступления в силу
- `business_impact` — бизнес-последствия

### calculateScore() — Расчёт скора

**Формула:** Взвешенное среднее по категориям.

Категории с весами:
- Prohibited Practices: 20%
- Risk Management: 15%
- Data Governance: 15%
- Human Oversight: 12%
- Transparency: 12%
- Technical Documentation: 10%
- Accuracy & Robustness: 8%
- Cybersecurity: 8%

**Critical cap:** Если есть хотя бы один critical finding → скор ограничен максимумом 49 (red zone).

**Зоны:** Green (80-100), Yellow (50-79), Red (0-49).

---

## L5: Deep Scan (LLM-анализ) — опциональный

**Файл:** `domain/scanner/layers/layer5-llm.ts`
**Endpoint:** `POST /scan/deep`
**Что делает:** Отправляет код в LLM для семантического анализа.
**Метод:** Vercel AI SDK `generateText()` с structured prompt.

**НЕ входит в стандартный `scan()`.** Вызывается отдельно через `complior scan --deep`.

**Текущее состояние:** Базовая реализация — отправляет файлы в LLM и просит найти compliance-проблемы. Не интегрирован с результатами L1-L4.

**Вес в скоре:** 0.70 (lowest confidence)
**Стоимость:** ~$0.01-0.10 за скан в зависимости от размера проекта.

---

## Реализованные улучшения (S08/S09)

### E-11: Project-Level Scan Cache — РЕАЛИЗОВАНО (S08)
**Файл:** `services/scan-service.ts` (service layer, project-level hash)
**Что:** SHA-256 хеш всех файлов проекта. При повторном скане с идентичным содержимым — возврат кешированного результата.
**Где в пайплайне:** Обёртка в `scan-service.ts` — до вызова `scanner.scan(ctx)`.
**Эффект:** Повторный скан: 120ms → 10ms (12x speedup). Cache invalidation при изменении любого файла.
**Файл-кеш:** `scan-cache.ts` (domain, per-file SHA-256 + mtime) — отдельный модуль для file-level кеширования с `CacheStorage` port.

### E-109: Import Graph — РЕАЛИЗОВАНО (S09)
**Файл:** `domain/scanner/import-graph.ts`
**Что:** Граф импортов проекта с BFS-пропагацией AI-relevance. Canonical `AI_PACKAGES` set (22 npm + PyPI пакета).
**Где в пайплайне:** Шаг 4a — после L3-ext, перед L4. `buildImportGraph(ctx.files)`.
**Эффект:** AI-relevance файлов определяется транзитивно. L4 AST анализ (E-110) применяется только к AI-relevant файлам. L5 targeted prompts (E-113) получают контекст из графа.

### E-110: Structural Analysis (regex-based) — РЕАЛИЗОВАНО (S09)
**Файл:** `domain/scanner/ast/swc-analyzer.ts`
**Что:** Regex-based структурный анализ TS/JS: bare LLM calls, wrapped calls, safety config mutations, missing error handling, decorator patterns.
**Где в пайплайне:** Шаг 5a — после L4 patterns, только для `importGraph.aiRelevantFiles`.
**Эффект:** 5 типов findings: `l4-ast-bare-call`, `l4-ast-wrapped-call`, `l4-ast-safety-mutation`, `l4-ast-missing-error-handling`, `l4-ast-decorator-pattern`. Confidence 70-85%.
**Зависимость:** E-109 (import-graph) — hard dependency.

### E-111: Multi-Language Scanner — РЕАЛИЗОВАНО (S09)
**Файл:** `domain/scanner/languages/adapter.ts`
**Что:** `LanguageAdapter` interface + Go/Rust/Java адаптеры. Deps detection из `go.mod`, `Cargo.toml`, `pom.xml`/`build.gradle`. AI SDK + banned package detection per language.
**Где в пайплайне:** Шаг 4b — после import-graph, перед L4. `detectProjectLanguages(ctx.files)`.
**Эффект:** Language coverage: JS/TS/Python + Go (5 AI SDKs), Rust (8), Java (6). Banned package detection per language.

### E-112: Git History Analysis — РЕАЛИЗОВАНО, не wired (S09)
**Файл:** `domain/scanner/checks/git-history.ts`
**Что:** `git log` анализ compliance-документов: freshness (90d/180d thresholds), bulk commits, author diversity.
**Где в пайплайне:** Планируется — расширение L1 через `GitHistoryPort` (Clean Architecture). Готов к интеграции.
**Эффект:** Compliance-театр detection: freshness, single-author warnings, bulk commit detection.
**Статус:** Модуль и тесты завершены, порт определён. Не подключён в `create-scanner.ts` (требует async + DI через composition-root).

### E-113: Targeted L5 — РЕАЛИЗОВАНО (S09)
**Файл:** `domain/scanner/layers/layer5-targeted.ts`
**Что:** LLM получает ТОЛЬКО findings с confidence 50-80%. Structured prompt per obligation. Context из import-graph.
**Где в пайплайне:** В `scanDeep()` — после base scan, перед L5 LLM. `selectUncertainFindings()` → `buildTargetedPrompts()` → `estimateTargetedCost()`.
**Эффект:** Cost reduction: $0.10 → $0.01. Только uncertain findings отправляются в LLM с контекстом из import-graph.

### E-114a: L5 Document Validation — РЕАЛИЗОВАНО, не wired (S09)
**Файл:** `domain/scanner/layers/layer5-docs.ts`
**Что:** LLM проверяет СОДЕРЖИМОЕ документов по regulation checklists (Art. 27 FRIA: 8 elements, Art. 11 Tech Doc: 12 elements, Art. 13, Art. 9).
**Где в пайплайне:** Планируется для `scanDeep()` path — после targeted L5. `buildDocValidationPrompt()` → `docValidationToFindings()`.
**Эффект:** Document quality detection: L2 65% → L2+L5 90%+.
**Статус:** Модуль и тесты завершены. Не подключён в `create-scanner.ts`.

### E-114b: Comment Filter — РЕАЛИЗОВАНО (S09)
**Файл:** `domain/scanner/rules/comment-filter.ts`
**Что:** Два режима: `stripCommentsAndStrings()` (для import-graph) и `stripCommentsOnly()` (для L4 — сохраняет строковые литералы). Поддержка C-style (TS/JS/Go/Rust/Java) и Python.
**Где в пайплайне:** Шаг 5 (L4) — pre-compute stripped content per file перед pattern matching.
**Эффект:** Elimination of false positives from comments. Compliance patterns в строковых литералах (`className="AIDisclosure"`) сохраняются.

---

## Планируемые улучшения

### E-12: L2 Semantic Validation
**Что:** Замена word-count на проверку обязательных секций, числовых метрик, per-section feedback.
**Где в пайплайне:** Замена внутренностей шага 2 (L2).
**Эффект:** Точность L2: 65% → 85%.

### Будущее: Runtime Analysis
**Что:** Мониторинг поведения AI-системы в runtime, а не только анализ кода.
**Эффект:** Compliance at rest → compliance at runtime.

---

## Roadmap точности сканера

```
До S08 (S07):
  L1: 98%  L2: 65%  L3: 95%  L4: 70%  → Общая: ~75%

Текущее состояние (S08+S09):
  L1: 98%  L2: 65%  L3: 95%  L4: 85%  → Общая: ~82%
  + Import graph → AI-relevance filtering
  + Structural analysis → bare call / wrapper detection
  + Comment filtering → false positive elimination
  + Multi-language → Go/Rust/Java deps
  + Project-level cache → 12x speedup
  + Targeted L5 → $0.01 deep scan cost

После E-12 + E-112 wiring + E-114a wiring:
  L1: 98%  L2: 85%  L3: 95%  L4: 95%  → Общая: ~92%
  + Git history forensics → compliance-театр detection
  + Document content validation (L2+L5 combo)
```
