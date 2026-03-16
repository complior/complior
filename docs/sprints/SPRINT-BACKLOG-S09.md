# Sprint S09 — Scanner Intelligence + Deep Scan Revolution

**Версия:** 1.0.0
**Дата:** 2026-03-16
**Статус:** Planning

---

## Обзор

Девятый спринт. Фокус на **качество сканирования** — от regex к семантическому анализу. Спринт делает scanner production-grade: real AST parsing заменяет regex-угадывание, multi-language расширяет покрытие с 2 до 6 языков, git history ловит compliance-театр, targeted L5 превращает дорогой LLM-скан в точечный инструмент.

Спринт разбит на 2 направления:
- **Офлайн-сканер** — AST parsing, multi-language, git history forensics
- **Deep Scan (LLM)** — targeted L5, document content validation

**Цель:** Scanner accuracy 85% → 95%, deep scan cost $0.10 → $0.01, language coverage 2 → 6.

**Зависимости от предыдущих спринтов:**
- S08: E-109 (import-graph + 120 patterns) — hard dependency для E-110, E-113
- S08: E-12 (L2 semantic validation) — soft dependency для E-114

---

## User Stories

### US-S09-01: Real AST Parsing — семантический анализ вызовов
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-110
**Компонент:** `[Engine]`
**Обязательства:** OBL-006,008,010,015,016,020

Как разработчик, я хочу чтобы L4 scanner понимал **структуру кода** (вызовы функций, обёртки, conditional logic), а не только имена переменных, чтобы `fetch('/v1/chat/completions')` определялся как bare LLM call, а функция с pre/post логикой вокруг LLM call — как compliance wrapper.

**Проблема:**
E-109 поднимает L4 recall с 70% до 85% за счёт import-graph и 120+ regex. Но regex не понимает семантику: `client.chat.completions.create()` — строковое совпадение, generic HTTP wrapper (`fetch('/v1/chat')`) — miss. Функция-обёртка vs bare call неразличимы для regex.

**Acceptance Criteria:**

*Phase 1 — SWC Parser для TypeScript/JavaScript:*
- [ ] Интеграция `@swc/core` (WASM) — парсинг TS/JS файлов в AST
- [ ] Extraction: function signatures (name, params, return type), call expressions, import bindings
- [ ] Detect: bare LLM call — `*.create()`, `*.generate()`, `fetch('/v1/...')` без compliance wrapper
- [ ] Detect: compliance wrapper pattern — функция с pre-hook (logging/validation) + LLM call + post-hook
- [ ] Detect: safety config mutations — `config.safety = false`, `options.moderation = 'none'`
- [ ] Detect: error handling around LLM calls — `try/catch` presence, error propagation
- [ ] Performance: SWC парсинг < 2s для 1000 файлов (WASM)

*Phase 2 — tree-sitter для Python:*
- [ ] `tree-sitter-python` — парсинг Python файлов
- [ ] Аналогичные detections: bare `openai.chat.completions.create()`, wrapper functions, safety config
- [ ] Python-specific: decorator detection (`@require_approval`, `@log_ai_call`)

*Phase 3 — Интеграция с L4 pipeline:*
- [ ] AST результаты дополняют (не заменяют) regex findings
- [ ] Per-finding confidence: AST match → 92%, regex match → 75%, import-based → 70%
- [ ] AST parsing lazy-loaded: только если есть AI-relevant файлы (из import-graph E-109)
- [ ] Fallback: если AST парсинг fails → regex results используются как есть

**Технические детали:**
- `engine/core/src/domain/scanner/ast/` — новая директория
- `ast/swc-parser.ts` — TypeScript/JavaScript AST analysis
- `ast/tree-sitter-python.ts` — Python AST analysis
- `ast/call-graph.ts` — cross-function call graph from AST
- `layers/layer4-patterns.ts` — интеграция AST results в L4 pipeline
- Тесты: 40+ unit (AST extraction), 15+ integration (L4 pipeline with AST)

---

### US-S09-02: Multi-Language Scanner — Go, Rust, Java
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-111
**Компонент:** `[Engine]`
**Обязательства:** ALL (language-agnostic obligations)

Как разработчик Go/Rust/Java проекта, я хочу чтобы Complior scanner анализировал мой код и зависимости так же, как для JS/TS, чтобы compliance coverage не зависела от выбора языка.

**Проблема:**
Scanner покрывает JS/TS (полностью) и Python (частично). Go, Rust, Java, C# — **полностью игнорируются**. AI-системы пишут на разных языках. Go-сервис с OpenAI API, Rust CLI с Anthropic SDK — ни один не будет просканирован.

**Acceptance Criteria:**

*Phase 1 — Go support:*
- [ ] L3: парсинг `go.mod`, `go.sum` → AI SDK detection (openai-go, anthropic-go, langchaingo)
- [ ] L3: banned package detection в Go dependencies
- [ ] L4: Go-specific regex patterns для compliance mechanisms
- [ ] Import-graph: парсинг `import (...)` statements
- [ ] File scanning: `.go` файлы включены в L4 scan

*Phase 2 — Rust support:*
- [ ] L3: парсинг `Cargo.toml`, `Cargo.lock` → AI SDK detection (async-openai, anthropic-rs)
- [ ] L4: Rust-specific patterns (`use openai::`, trait implementations)
- [ ] Import-graph: парсинг `use`/`mod` statements

*Phase 3 — Java support:*
- [ ] L3: парсинг `pom.xml`, `build.gradle` → AI SDK detection (langchain4j, openai-java)
- [ ] L4: Java-specific patterns (annotations: `@AIDisclosure`, `@Audited`)
- [ ] Import-graph: парсинг `import` statements

*Architecture:*
- [ ] `LanguageAdapter` interface: `detectDeps()`, `buildImportGraph()`, `getPatterns()`, `getFileExtensions()`
- [ ] Auto-detection по наличию `go.mod`/`Cargo.toml`/`pom.xml` в project root
- [ ] Per-language adapter lazy-loaded (не загружать Go parser если проект на TS)

**Технические детали:**
- `engine/core/src/domain/scanner/languages/` — новая директория
- `languages/adapter.ts` — LanguageAdapter interface
- `languages/go-adapter.ts` — Go: go.mod, import graph, patterns
- `languages/rust-adapter.ts` — Rust: Cargo.toml, use statements, patterns
- `languages/java-adapter.ts` — Java: pom.xml/gradle, import statements, patterns
- `languages/ts-adapter.ts` — рефакторинг текущего TS/JS кода в adapter
- `layers/layer3-deps.ts` — расширение для multi-language deps
- `layers/layer4-patterns.ts` — расширение для multi-language patterns
- Тесты: 20+ per language adapter, 10+ integration

---

### US-S09-03: Git History Analysis — forensic freshness
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-112
**Компонент:** `[Engine]`
**Обязательства:** OBL-020 (record keeping), OBL-025 (monitoring)

Как аудитор, я хочу чтобы scanner проверял **историю** compliance-документов (когда создан, как часто обновляется, не bulk commit), чтобы отличать реальный compliance process от compliance-театра.

**Проблема:**
L1 проверяет наличие файла, L2 — содержимое. Никто не проверяет **историю**: FRIA.md создан 30 минут назад, скопирован из шаблона, single commit. EU AI Act Art. 9(2): risk management "throughout the lifetime" — это **процесс**, не одноразовый документ.

**Acceptance Criteria:**
- [ ] `git log` анализ для каждого compliance-документа: creation date, last modified, commit count
- [ ] **Freshness warning**: документ не обновлялся >90 дней → finding severity LOW "Stale document"
- [ ] **Freshness fail**: документ не обновлялся >180 дней → finding severity MEDIUM "Document may be outdated"
- [ ] **Bulk commit detection**: >3 compliance docs созданы в одном коммите → warning "Bulk compliance commit"
- [ ] **Author diversity**: Risk Assessment / FRIA с одним автором → info "Single-author assessment"
- [ ] **Code-doc drift**: код менялся 20+ раз с момента последнего обновления документа → warning "Documentation drift"
- [ ] Graceful degradation: не git repo или shallow clone → skip git analysis, no errors
- [ ] Результаты интегрированы в L1 findings (дополнительные findings, не замена)
- [ ] Performance: git log queries кэшируются, <100ms overhead для 20 документов

**Технические детали:**
- `engine/core/src/domain/scanner/checks/git-history.ts` — новый модуль
- `infra/git-adapter.ts` — расширить: `getFileHistory(path): { commits, authors, created, lastModified }`
- `layers/layer1-files.ts` — интеграция git history findings после file-presence checks
- `.complior/cache/git-history.json` — кэш git data (invalidate по HEAD commit)
- Тесты: 15+ unit (git parsing), 5+ integration (с real git repo в tmp)

---

### US-S09-04: Targeted L5 — LLM для uncertain findings
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-113
**Компонент:** `[Engine]`
**Обязательства:** OBL-006,008,010,015,016

Как разработчик, я хочу чтобы deep scan (`complior scan --deep`) отправлял в LLM только findings с низкой confidence (50-80%), с конкретными вопросами по конкретным статьям, чтобы получать точные ответы за $0.01 вместо generic анализа за $0.10.

**Проблема:**
Текущий L5: весь код → LLM → "найди проблемы". Дорого ($0.10), медленно (10s), неточно (hallucinations), не интегрировано с L1-L4. LLM тратит токены на то, что L4 уже определил с confidence 95%.

**Acceptance Criteria:**

*Input filtering:*
- [ ] L5 получает ТОЛЬКО findings с confidence < 80% из L4 results
- [ ] Каждый finding → structured prompt с конкретным вопросом по конкретной статье EU AI Act
- [ ] Context из import-graph: файл + его imports + call sites (не весь проект)
- [ ] Maximum 20 findings per deep scan (budget cap)

*Structured prompts:*
- [ ] Template per obligation type: kill switch (Art. 14), disclosure (Art. 50), oversight (Art. 14), etc.
- [ ] Prompt включает: найденный код, import context, конкретный вопрос, ожидаемый формат ответа
- [ ] LLM отвечает structured JSON: `{ confirmed: boolean, confidence: number, explanation: string }`

*Result integration:*
- [ ] L5 подтверждает L4 finding → confidence обновляется до 90%+
- [ ] L5 опровергает L4 finding → finding помечается как false positive (skip)
- [ ] L5 находит новый finding → добавляется с confidence 70% (L5 source)
- [ ] Результаты сохраняются в кэш (по SHA-256 файла + finding)

*Cost & Performance:*
- [ ] Cost per deep scan: < $0.02 (vs текущий $0.10)
- [ ] Latency: < 3s для 10 findings (параллельные запросы)
- [ ] `--deep-budget` flag: максимальный бюджет в $ (default: $0.05)
- [ ] Dry-run mode: `--deep-dry-run` показывает какие findings пойдут в LLM без реальных запросов

**Технические детали:**
- `engine/core/src/domain/scanner/layers/layer5-targeted.ts` — новый модуль (рядом с layer5-llm.ts)
- `engine/core/src/domain/scanner/prompts/` — structured prompt templates per obligation
- `create-scanner.ts` — интеграция targeted L5 после L4 (если `--deep` flag)
- `http/routes/scan.route.ts` — обновить `POST /scan/deep` для targeted mode
- Тесты: 20+ unit (prompt generation, result parsing), 5+ integration (mock LLM)

---

### US-S09-05: L5 Document Validation — LLM проверка содержимого
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-114
**Компонент:** `[Engine]`
**Обязательства:** OBL-013,013a (FRIA), OBL-011 (tech doc), OBL-009 (risk management)

Как compliance officer, я хочу чтобы deep scan проверял **содержимое** compliance-документов (FRIA, Model Card, Risk Assessment) на соответствие конкретным требованиям статей, чтобы отличать качественный документ от шаблонной отписки.

**Проблема:**
L2 проверяет структуру (секции, word count). "Мы соблюдаем все законы" — пройдёт L2. Art. 27(1) FRIA требует: конкретные права, количественную оценку рисков, конкретные меры — не generic текст.

**Acceptance Criteria:**

*Per-document checklists:*
- [ ] FRIA (Art. 27): 8 elements — affected rights, quantitative assessment, mitigation measures, population description, monitoring plan, proportionality, alternatives considered, consultation process
- [ ] Technical Documentation (Art. 11): 12 elements — system description, intended purpose, hardware requirements, training data, metrics, limitations, human oversight measures, etc.
- [ ] Transparency Notice (Art. 13): 6 elements — AI disclosure, capabilities, limitations, human contact, opt-out mechanism, data usage
- [ ] Risk Assessment (Art. 9): 8 elements — risk identification, probability assessment, impact assessment, mitigation measures, residual risks, monitoring plan, review schedule, responsible persons

*LLM validation:*
- [ ] LLM получает один документ + regulation checklist → per-element pass/fail
- [ ] Actionable feedback: "Section 'Risks' is generic. Add specific rights from EU Charter Art. 6-50"
- [ ] Document quality score: 0-100% (percentage of elements present and adequate)
- [ ] Severity mapping: <30% elements → HIGH, 30-60% → MEDIUM, 60-80% → LOW, >80% → pass

*Integration:*
- [ ] Результат обогащает L2 findings: L2 pass (structure ok) + L5 fail (content weak) → combined finding
- [ ] Caching по SHA-256 документа — re-validate только при изменении
- [ ] `complior scan --deep-docs` flag (отдельно от `--deep` для кода)
- [ ] JSON output: per-document validation results с per-element breakdown

**Технические детали:**
- `engine/core/src/domain/scanner/layers/layer5-docs.ts` — новый модуль
- `engine/core/src/data/checklists/` — regulation checklists per document type (JSON)
- `layers/layer2-docs.ts` — интеграция L5 doc results (если `--deep-docs`)
- `http/routes/scan.route.ts` — обновить для `--deep-docs` mode
- Тесты: 15+ unit (checklist matching, score calculation), 5+ integration (mock LLM)

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| AST parsing: SWC для TS/JS | bare call vs wrapper detection |
| AST parsing: tree-sitter для Python | decorator + call pattern detection |
| Multi-language: Go support | go.mod + import graph + patterns |
| Multi-language: Rust support | Cargo.toml + use statements + patterns |
| Multi-language: Java support | pom.xml + import statements + patterns |
| Git history: freshness detection | >90d warning, >180d fail |
| Git history: bulk commit detection | >3 docs in 1 commit → warning |
| Targeted L5: cost reduction | $0.10 → $0.01 per deep scan |
| Targeted L5: structured prompts | Per-obligation question templates |
| L5 doc validation: 4 doc types | FRIA + Tech Doc + Transparency + Risk |
| L4 accuracy overall | 85% → 95% |
| Language coverage | 2 → 6 languages |
| Тесты | cargo test + vitest passing |
| User Stories | 5 planned |
