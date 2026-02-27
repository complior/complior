# Sprint Backlog S01 — Regulation DB + Scanner Core + AI Registry

> **Post-migration note (2026-02-24):** AI Registry data and Regulation DB migrated to PROJECT (PostgreSQL). Paths like `engine/src/data/regulation-db/` and `engine/src/data/ai-registry/` in this document reflect the original S01 design. Actual implementation uses `engine/src/data/` (schemas only) + PROJECT API. `shared/` was never created; `packages/` contains `sdk/` and `npm/`.

> **Спринт:** S01 | **Трек:** Все три агента (A=Engine, B=TUI, C=Infra)
> **Длительность:** Неделя 1-2 (2 недели)
> **Фаза:** Phase 0 — Фундамент
> **Источники:** COMPLIOR-ROADMAP-v6.md (Sprint 1), PRODUCT-BACKLOG.md (C.030, C.040, C.012, C.013, B.1.01-08, C.1.01-06)

## Обязательно к прочтению перед началом спринта

> Разработчик ОБЯЗАН прочитать следующие артефакты Phase 0 перед написанием кода.
> Код, не соответствующий этим документам, будет отклонён на code review.

| # | Документ | Зачем |
|---|----------|-------|
| 1 | **PRODUCT-VISION.md** | Wrapper-оркестратор: Complior = хост, agent = гость. Детерминистический core. |
| 2 | **ARCHITECTURE.md** | 3-процессная архитектура (TUI ↔ Engine ↔ Guest Agent), модули Engine |
| 3 | **PRODUCT-BACKLOG.md** | Секции A (Wrapper), B (Scanner), D (Regulation DB), E (AI Registry) |
| 4 | **CODING-STANDARDS-TS.md** | Стиль TS: strict mode, Zod, Vitest, ESM only, Bun primary |
| 5 | **CODING-STANDARDS-RUST.md** | Стиль Rust: edition 2024, clippy strict, tokio async, insta snapshots |
| 6 | **UNIFIED-ARCHITECTURE.md** | §3 Open-Source scope, §4 SaaS scope, разграничение |

**Sprint Goal:** Заложить фундамент системы: Regulation DB (EU AI Act JSON), AI Registry (200 tools с паттернами) *(migrated to PROJECT, see S1.5)*, Scanner core (19 проверок + AST + scoring), монорепо + CI/CD. TUI работа перенесена в S00. После спринта: `complior scan .` работает из CLI.

**Статус:** Запланирован
**Capacity:** ~28 SP | **Duration:** 2 недели
**Developer:** A: TBD | B: TBD | C: TBD
**Baseline:** 0 tests → **New: ~40 tests (total: ~40)**

> **Prerequisite:** Нет. S01 — старт с нуля. Монорепо создаётся в первый день.

**Контекст разработки:**
- Engine: `engine/src/` — новые модули `data/`, `domain/`, `infra/`, `http/`
- Shared: `shared/` — TypeScript interfaces + Rust structs (codegen) *(not created — shared types codegen planned)*
- Tests Engine: vitest в `engine/src/**/*.test.ts`
- Tests TUI: `cargo test --workspace`

---

## Граф зависимостей

```
C.1.01-C.1.06 (монорепо + CI/CD + shared types) [первый день — блокирует всё]
          │
          └──► A: C.030 (Regulation DB)  ──► C.041 (Risk classification) ──► C.015 (Scoring)
                        │                                                            │
                        └──► C.040 (AI Registry) ──► C.042 (Detection patterns)    │
                                                                │                    │
                                        C.013 (AST engine) ◄───┴────────────────────┘
                                               │
                                        C.012 (19 checks) ──► C.014 (Zero-config) ──► C.047 (Local scan)
                                                                     │
                                                               C.018 (Incremental) ──► C.019 (Deterministic)
```

> **Примечание:** TUI (B track: B.1.01-B.1.08) перенесён в S00 и реализован там.

**День 1 приоритет:** C.1.01-C.1.06 (монорепо, CI/CD, shared types) + A.1.02 (Regulation DB) должны начаться одновременно.

---

## User Stories

### Phase 1 — Infra (Агент C) [День 1-2]

#### US-S0101: Монорепо + CI/CD + Shared Types (5 SP)

- **Tasks:** C.1.01-C.1.06 | **Developer:** C

##### Описание

Как команда, мы хотим иметь настроенный монорепо с правильной структурой, CI/CD, кросс-компиляцией Rust и codegen shared types — чтобы все три агента могли работать параллельно с первого дня.

##### Структура монорепо

```
complior/
├── tui/                    # Rust: ratatui TUI (крейт complior-tui)
│   ├── Cargo.toml
│   └── src/
├── engine/                 # TypeScript: Bun/Node + Hono
│   ├── package.json
│   └── src/
├── shared/                 # Shared types: TS ↔ Rust codegen
│   ├── types/
│   │   ├── common.types.ts       # TypeScript definitions
│   │   └── generated/            # Rust structs (auto-generated)
│   └── codegen.ts
├── packages/               # npm публикуемые пакеты
│   └── sdk/                # @complior/sdk (Runtime middleware)
├── Cargo.toml              # Workspace (members: ["tui"])
├── package.json            # Workspaces (["engine", "shared", "packages/*"])
├── .github/workflows/
│   ├── ci.yml              # Lint + Test на каждый PR
│   └── release.yml         # Кросс-компиляция + GitHub Release
└── docker-compose.yml      # Dev environment
```

##### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml — каждый PR:
jobs:
  rust:
    - cargo fmt --check
    - cargo clippy -- -D warnings
    - cargo test --workspace

  typescript:
    - bun lint (eslint strict)
    - bun typecheck (tsc --noEmit)
    - bun test (vitest run)

  shared-types:
    - bun run codegen (TS → Rust structs)
    - cargo check (после codegen)
```

##### Кросс-компиляция

| Target | OS | Arch |
|--------|----|------|
| x86_64-unknown-linux-gnu | Linux | x64 |
| aarch64-unknown-linux-gnu | Linux | ARM64 |
| x86_64-apple-darwin | macOS | x64 |
| aarch64-apple-darwin | macOS | M1/M2 |
| x86_64-pc-windows-msvc | Windows | x64 |

##### Shared Types (codegen)

```typescript
// shared/types/common.types.ts — TS source of truth:
export interface ScanResult {
  score: number;           // 0-100
  findings: Finding[];
  checks: CheckResult[];
  scanDuration: number;    // ms
  projectPath: string;
}

export interface Finding {
  id: string;
  check: CheckType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  message: string;
  articleRef: string;      // "Art.50.1"
  fixable: boolean;
}

export type CheckType =
  | 'disclosure' | 'marking' | 'logging' | 'literacy'
  | 'documentation' | 'metadata' | 'risk_management'
  | 'tech_safeguard' | 'human_oversight' | 'data_governance'
  | 'accuracy' | 'robustness' | 'transparency' | 'registration'
  | 'post_market' | 'incident_report' | 'fria' | 'cybersecurity'
  | 'gpai_basic' | 'gpai_full';
```

```rust
// shared/types/generated/scan_result.rs — авто-сгенерированный Rust:
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct ScanResult {
    pub score: u8,
    pub findings: Vec<Finding>,
    pub checks: Vec<CheckResult>,
    pub scan_duration: u64,
    pub project_path: String,
}
```

##### Реализация

- Новый: `Cargo.toml` (workspace), `tui/Cargo.toml` (complior-tui crate)
- Новый: `engine/package.json`, `shared/package.json`
- Новый: `shared/codegen.ts` — TypeScript AST → Rust serde structs
- Новый: `.github/workflows/ci.yml` + `release.yml`
- Новый: `docker-compose.yml` — services: engine (Bun), dev tools
- Новый: `cross.toml` — cross-compilation config

##### Критерии приёмки

- [ ] `cargo build` и `bun install` работают из корня монорепо
- [ ] CI: зелёный pipeline на PR (Rust fmt + clippy + test, TS lint + typecheck + test)
- [ ] `bun run codegen` генерирует Rust structs из TS interfaces без ошибок
- [ ] `cargo check` проходит после codegen
- [ ] `docker-compose up` поднимает engine на port 3000
- [ ] Кросс-компиляция: `cargo build --target aarch64-unknown-linux-gnu` работает локально

- **Tests:** 2 (codegen_output.test.ts — сгенерированные Rust типы корректны; ci_smoke — `bun test` + `cargo test` проходят)

---

### Phase 2 — Engine: Базы данных (Агент A) [День 1-5]

#### US-S0102: Regulation DB — EU AI Act JSON-база (8 SP)

- **Feature:** C.030 | **Developer:** A

##### Описание

Как сканер, я хочу иметь полную структурированную JSON-базу EU AI Act — статьи, обязательства, штрафы, дедлайны, plain-English описания, code implications — чтобы все 19 проверок работали на детерминистическом правиле, а не на LLM.

##### Структура Regulation DB

```typescript
// engine/src/data/regulation-db/eu-ai-act.json (структура):
{
  "regulation": "EU AI Act",
  "version": "2024/1689",
  "enforcementDate": "2026-08-02",
  "articles": [
    {
      "id": "Art.50.1",
      "title": "Transparency obligations — AI disclosure",
      "text": "...",        // полный текст
      "plainEnglish": "...", // простое объяснение
      "obligations": [
        {
          "id": "OBL-001",
          "check": "disclosure",
          "severity": "high",
          "description": "AI system must disclose its AI nature to users",
          "codeImplication": "Add disclosure notice before/during AI interaction",
          "penalty": { "max": "€15M or 3% of annual turnover" },
          "fixTemplate": "disclosure",
          "domains": ["all"]
        }
      ]
    }
  ],
  "scoring": {
    "disclosure": { "weight": 40, "critical": true },
    "marking": { "weight": 35, "critical": true },
    "logging": { "weight": 30 }
    // ... все 19 checks с весами
  }
}
```

##### 19 Проверок (полный список)

| # | Check | Статья | Severity | Вес |
|---|-------|--------|----------|-----|
| 1 | disclosure | Art.50.1 | high | 40 |
| 2 | marking | Art.50.2 | high | 35 |
| 3 | logging | Art.12 | high | 30 |
| 4 | literacy | Art.4 | medium | 25 |
| 5 | documentation | Art.11 | high | 30 |
| 6 | metadata | Art.50.4 | medium | 20 |
| 7 | gpai_basic | Art.51-53 | high | 35 |
| 8 | gpai_full | Art.52+ | critical | 40 |
| 9 | risk_management | Art.9 | high | 35 |
| 10 | tech_safeguard | Art.15 | high | 35 |
| 11 | human_oversight | Art.14 | critical | 40 |
| 12 | data_governance | Art.10 | high | 30 |
| 13 | accuracy | Art.15.1 | medium | 25 |
| 14 | robustness | Art.15.2 | medium | 25 |
| 15 | transparency | Art.13 | high | 30 |
| 16 | registration | Art.71 | medium | 25 |
| 17 | post_market | Art.72 | medium | 20 |
| 18 | incident_report | Art.73 | high | 30 |
| 19 | fria | Art.27 | medium | 25 |

##### Реализация

- Новый: `engine/src/data/regulation-db/eu-ai-act.json` — полная JSON-база
- Новый: `engine/src/data/regulation-db/scoring.json` — формула весов + пороги
- Новый: `engine/src/domain/regulation/regulation-loader.ts` — Zod-validated loader
- Новый: `engine/src/domain/regulation/scoring-engine.ts` — weighted formula 0-100

```typescript
// Scoring formula:
score = Σ(check_weight * check_passed) / Σ(check_weight) * 100

// Threshold colors:
// 0-39: RED    | 40-69: AMBER | 70-84: YELLOW | 85-100: GREEN
```

##### Критерии приёмки

- [ ] `engine/src/data/regulation-db/eu-ai-act.json` содержит все 19 checks с Zod-validated структурой
- [ ] Все 108 обязательств из EU AI Act 2024/1689 покрыты (не только 19 checks)
- [ ] `regulation-loader.ts` бросает типизированный `AppError` при невалидных данных
- [ ] `scoring-engine.ts` возвращает score 0-100 с детализацией по каждому check
- [ ] Пороги: ≤39 RED, 40-69 AMBER, 70-84 YELLOW, 85-100 GREEN
- [ ] Penalty data для каждого check (€15M/3% или €30M/6% или €7.5M/1.5%)

- **Tests:** 5 (regulation_loader.test — Zod validation, invalid data rejection; scoring_formula.test — weighted calculation; threshold_colors.test — boundary values 39/40/69/70/84/85; penalty_lookup.test — correct article → penalty; compliance_obligations.test — 108 obligations coverage)

---

#### US-S0103: AI Registry + Detection Patterns (5 SP)

- **Feature:** C.040, C.041, C.042 | **Developer:** A

##### Описание

Как сканер, я хочу иметь offline бандл из 200+ AI tools с detection patterns, risk levels и compliance status — чтобы при скане автоматически определять какие AI системы используются и их risk profile, без интернета.

##### Структура AI Registry

```json
// engine/src/data/ai-registry/tools.json (структура одной записи):
{
  "id": "openai-gpt4",
  "name": "GPT-4",
  "provider": "OpenAI",
  "category": "llm",
  "riskLevel": "limited",     // minimal | limited | high | unacceptable
  "annexIII": false,           // Annex III HIGH-RISK classification
  "complianceStatus": "needs_disclosure",
  "detection": {
    "npm": ["openai", "@ai-sdk/openai"],
    "pip": ["openai"],
    "imports": ["from openai import", "require('openai')"],
    "envVars": ["OPENAI_API_KEY", "OPENAI_ORG_ID"],
    "apiCalls": ["api.openai.com", "chat/completions"]
  },
  "obligations": ["disclosure", "marking", "logging"],
  "alternatives": ["anthropic-claude", "google-gemini"],
  "documentation": "https://platform.openai.com/docs"
}
```

##### Top 200 AI Tools (категории)

| Категория | Инструменты | Количество |
|-----------|------------|-----------|
| LLM providers | OpenAI, Anthropic, Google, Mistral, Cohere, DeepSeek | 15 |
| LLM frameworks | LangChain, LlamaIndex, Vercel AI SDK, Haystack | 10 |
| AI agents | CrewAI, AutoGen, LangGraph, n8n, Zapier AI | 8 |
| Embedding / Vector | Pinecone, Weaviate, Chroma, Qdrant, Milvus | 10 |
| Image generation | DALL-E, Stable Diffusion, Midjourney (API) | 8 |
| Voice AI | ElevenLabs, OpenAI Whisper, Deepgram, AssemblyAI | 8 |
| Code AI | GitHub Copilot, Tabnine, Codeium, Cursor | 6 |
| CV/ML | TensorFlow, PyTorch, Hugging Face, ONNX | 12 |
| AI infrastructure | Replicate, Hugging Face Inference, Groq, Together AI | 10 |
| Domain-specific | ... | ~113 |

##### Реализация

- Новый: `engine/src/data/ai-registry/tools.json` — 200 tools, Zod-validated
- Новый: `engine/src/domain/registry/registry-loader.ts` — типизированный loader
- Новый: `engine/src/domain/registry/risk-classifier.ts` — Annex III классификация
- Новый: `engine/src/domain/registry/pattern-matcher.ts` — поиск паттернов в файлах

```typescript
// engine/src/domain/registry/risk-classifier.ts
// Annex III HIGH-RISK categories:
const HIGH_RISK_CATEGORIES = [
  'biometric_identification',  // Art.6, Annex III §1
  'critical_infrastructure',   // §2
  'education',                 // §3
  'employment',                // §4
  'essential_services',        // §5
  'law_enforcement',           // §6
  'migration_asylum',          // §7
  'justice_democracy',         // §8
];
```

##### Критерии приёмки

- [ ] `tools.json` содержит 200+ AI tools с полными detection patterns
- [ ] Для каждого tool: npm/pip/imports/envVars/apiCalls patterns
- [ ] `risk-classifier.ts` корректно классифицирует по Annex III (HIGH-RISK/LIMITED/MINIMAL)
- [ ] `pattern-matcher.ts` находит инструменты по npm deps, imports, env vars
- [ ] `registry-loader.ts` с Zod validation — не crashing на плохих данных
- [ ] Покрытие: OpenAI, Anthropic, Google AI, Mistral, LangChain, LlamaIndex, CrewAI, Vercel AI SDK

- **Tests:** 4 (registry_load.test — 200+ tools loaded; pattern_matching.test — npm/pip/env patterns; risk_classification.test — Annex III classifier; registry_search.test — find tool by pattern)

---

#### US-S0104: Scanner Core — 19 checks + AST + Scoring (10 SP)

- **Feature:** C.012, C.013, C.015, C.014, C.016, C.018, C.019, C.047, C.F02 | **Developer:** A

##### Описание

Как разработчик, я хочу запустить `complior scan .` и получить score 0-100 с конкретными findings по 19 EU AI Act checks — детерминистически, без интернета, быстро (< 10 сек на средний проект) — чтобы сразу видеть compliance статус своего кода.

##### CLI Usage

```bash
$ complior scan .
Scanning project: /home/user/my-ai-app
Using regulation: EU AI Act 2024/1689
Using registry: 200 AI tools

Scanning 156 files... ████████████████████ 100% (3.2s)

Score: 47/100 (AMBER)

Findings (8 violations):
  ✗ disclosure    [HIGH]  src/chat.ts:12 — No AI disclosure notice
                          → Art.50.1 | €15M penalty
  ✗ logging       [HIGH]  src/api/handler.ts — No interaction logging
                          → Art.12 | €15M penalty
  ✗ documentation [HIGH]  — Missing .complior/config.yaml
                          → Art.11 | €30M penalty
  ✗ marking       [HIGH]  src/components/ChatMessage.tsx:45 — AI output not marked
                          → Art.50.2 | €15M penalty
  ...4 more

AI Systems detected:
  • OpenAI GPT-4 (openai@4.x)  risk: limited  compliance: needs_disclosure
  • LangChain (langchain@0.2)   risk: limited  compliance: partial

Run `complior fix` to auto-fix 6/8 violations.
```

##### 5-Layer Scanner Architecture

```
Layer 1: File Presence (структура проекта)
  → .complior/config.yaml exists? → documentation check PASS/FAIL
  → COMPLIANCE.md exists?
  → agent-compliance.yaml exists?

Layer 2: Document Structure (структура документов)
  → config.yaml содержит обязательные поля?
  → COMPLIANCE.md верной структуры?

Layer 3: Config & Dependencies (конфиги)
  → package.json/requirements.txt → AI packages → registry lookup
  → .env → OPENAI_API_KEY → pattern match → обнаружен OpenAI
  → docker-compose.yml → AI сервисы?

Layer 4: AST Pattern Matching (код)
  → Babel (JS/TS): disclosure в JSX, logging в API handlers
  → tree-sitter (Python/Go/Rust): аналогичные паттерны
  → Regex fallback для файлов без парсера

Layer 5: LLM Analysis (сложные случаи, ТОЛЬКО для объяснений)
  → LLM НЕ делает compliance determination
  → LLM ТОЛЬКО объясняет что найдено детерминистически
```

##### Scoring Algorithm

```typescript
// engine/src/domain/scanner/scoring.ts
function calculateScore(checks: CheckResult[]): ScoreResult {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const passedWeight = checks
    .filter(c => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);

  const rawScore = Math.round((passedWeight / totalWeight) * 100);

  // Penalty for critical failures
  const criticalFailed = checks.filter(c => c.critical && !c.passed);
  const penalty = criticalFailed.length * 5; // -5 per critical failure

  return {
    score: Math.max(0, rawScore - penalty),
    color: scoreToColor(rawScore - penalty),
    breakdown: checks.map(c => ({ check: c.id, passed: c.passed, weight: c.weight }))
  };
}
```

##### Реализация

- Новый: `engine/src/domain/scanner/` — слои L1-L4
  - `layers/layer1-presence.ts` — проверка структуры файлов
  - `layers/layer2-docs.ts` — структура документов (YAML validators)
  - `layers/layer3-deps.ts` — deps + .env scan
  - `layers/layer4-ast.ts` — AST паттерны через Babel + tree-sitter
- Новый: `engine/src/domain/scanner/scoring.ts` — weighted formula
- Новый: `engine/src/domain/scanner/incremental-cache.ts` — AST cache (hash → result)
- Новый: `engine/src/domain/scanner/zero-config.ts` — авто-определение фреймворка
- Новый: `engine/src/http/routes/scan.route.ts` — POST /scan endpoint
- Новый: `engine/src/infra/shell/cli-runner.ts` — `complior scan .` CLI entry

##### Критерии приёмки

- [ ] `complior scan .` работает из CLI, возвращает score 0-100
- [ ] Все 19 checks реализованы детерминистически (без LLM)
- [ ] AST: Babel парсит JS/TS файлы, tree-sitter парсит Python
- [ ] Zero-config: авто-определяет Next.js, Express, FastAPI, LangChain
- [ ] Incremental: повторный скан только изменённых файлов (хэш AST)
- [ ] OpenAI, Anthropic, LangChain detection patterns работают
- [ ] Score 0-100 с цветом: RED/AMBER/YELLOW/GREEN
- [ ] `--json` флаг: вывод в JSON (для CI)
- [ ] Скан < 10 сек на проект 500 файлов
- [ ] Детерминизм: один код → один score (тест с fixture)

- **Tests:** 12 (layer1_presence.test, layer2_docs.test, layer3_deps.test, layer4_ast_js.test, layer4_ast_py.test, scoring_formula.test, incremental_cache.test, zero_config_detection.test, cli_json_output.test, determinism.test, scan_performance.test, findings_format.test)

---

## Summary

| Phase | Agent | Stories | SP | Tests |
|-------|-------|---------|-----|-------|
| Infra | C | US-S0101 | 5 | 2 |
| Engine: Regulation DB | A | US-S0102 | 8 | 5 |
| Engine: AI Registry | A | US-S0103 | 5 | 4 |
| Engine: Scanner Core | A | US-S0104 | 10 | 12 |
| **Итого** | | **4 US** | **28** | **~23** |

> Дополнительно: vitest unit тесты для scoring (12 total engine), cargo tests (5). Total ≈ 28-30 новых тестов к концу S01.

---

## Definition of Done

- [ ] **Монорепо:** `cargo build` + `bun install` + `bun run codegen` — всё работает
- [ ] **CI/CD:** Green pipeline на PR (Rust + TS)
- [ ] **Regulation DB:** 19 checks с Zod-validated JSON, Scoring 0-100
- [ ] **AI Registry:** 200 tools, detection patterns, Annex III classifier
- [ ] **Scanner:** `complior scan .` → score + findings, детерминистично, < 10s
- [ ] **Tests:** ~23 новых тестов (vitest + cargo test) — все green
- [ ] **`cargo clippy`** — 0 warnings
- [ ] **`bun typecheck`** — 0 errors
- [ ] **Shared types:** TS ↔ Rust codegen работает

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| tree-sitter bindings для Rust сложны | Средняя | Высокий | Начать с Babel (JS/TS) + regex fallback для Python на S01, tree-sitter в S02 |
| Кросс-компиляция Windows MSVC | Средняя | Средний | cross tool + GitHub Actions matrix, проверить заранее |
| AI Registry 200 tools — ручная работа | Высокая | Средний | Приоритет: 50 самых популярных tool с полными паттернами, остальные basic |
| Shared types codegen сложность | Средняя | Низкий | Ограниченный набор типов для S01, расширять постепенно |

---

## Integration Gate (S01 → S02)

После S01: `complior scan .` работает CLI, подключён к Engine API. S02 может начать с Hono server improvements (A) зная что фундамент готов. TUI каркас и PTY wrapper реализованы в S00.
