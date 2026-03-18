# Sprint S10 — Embedded Integrations + External Tools + Scan Tiers

**Версия:** 3.0.0
**Дата:** 2026-03-18
**Статус:** Phase A DONE, Phase B-C Planning

---

## Обзор

Десятый спринт. Фокус на **встраивание open-source данных и логики** (Promptfoo, Garak) в нативный код Complior (zero dependency), затем **интеграция внешних инструментов** через uv (Semgrep, Bandit, ModelScan, detect-secrets), и наконец **Cloud Scan** и **Guard Service** (отдельный репозиторий `~/guard`).

**Стратегия: Extract & Embed** — мы НЕ устанавливаем Promptfoo/Garak как dependency. Извлекаем конкретные данные и логику из архивированных MIT/Apache 2.0 репозиториев, адаптируем и встраиваем как нативный код. После извлечения — нулевая зависимость. Если завтра repo удалён — наш код продолжает работать.

Спринт разбит на 3 фазы:
- **Фаза A: Embed (zero dependency)** — scoring logic → Obligation Mapper, attack datasets → `complior redteam`, import adapter, dual scoring — **✅ DONE (2026-03-18)**
- **Фаза B: External Tools via uv (Tier 2)** — Semgrep, Bandit, ModelScan, detect-secrets через uv auto-download — 📌 MONTH-1
- **Фаза C: Cloud + Guard** — Cloud Scan API client + Guard Service (4 ML-модели, `~/guard`) — ☁️ MONTH-3

**Цель:** Multi-framework scoring (OWASP+MITRE+NIST), `complior redteam` command, scanner accuracy 85%→92%, scan tier architecture, dual scoring.

**Зависимости от предыдущих спринтов:**
- S08/S09: Scanner intelligence (import-graph, targeted L5, git history) — hard dependency
- S05: SDK hooks (prohibited, sanitize) — Guard Service supplements these
- S06: Multi-framework scoring (E-105..E-108) — Dual scoring extends this
- E-77: Adversarial Test Runner (S05) — `complior redteam` расширяет его

---

## Фаза A: Embedded Integrations (zero dependency) — ✅ DONE

> Извлекаем scoring logic и attack datasets из архивированных Promptfoo (MIT) и Garak (Apache 2.0).
> Результат: нативный код Complior, нулевая внешняя зависимость.
>
> **Выполнено:** 2026-03-18. 6 US, ~20 новых файлов (TS engine + Rust CLI). Тесты: 1311 TS + 466 Rust.

### US-S10-01: Promptfoo Obligation Mapper — OWASP/MITRE/NIST scoring logic
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-120
**Компонент:** `[Engine]`
**Обязательства:** Art. 15, Art. 9, ISO 27090

Как compliance-инженер, я хочу чтобы Engine содержал маппинг категорий атак на security frameworks (OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF), чтобы findings из сканера автоматически маппились на эти фреймворки и формировали multi-framework scoring.

**Проблема:**
Сейчас findings маппятся только на EU AI Act obligations. CISO и security-команды работают с OWASP LLM Top 10 и MITRE ATLAS. Нужен маппинг: scanner finding → OWASP category + MITRE technique + NIST subcategory. Логику маппинга берём из Promptfoo `src/redteam/constants.ts` (MIT), адаптируем и расширяем: добавляем EU AI Act + ISO 42001 поверх OWASP/MITRE/NIST.

**Что извлекаем из Promptfoo:**
```typescript
// Из ~/promptfoo-archive/src/redteam/constants.ts:
// injection → OWASP LLM01, MITRE AML.T0051
// jailbreak → MITRE AML.T0054
// bias → NIST MG-2.4
// ... (50+ mappings)
```

**Acceptance Criteria:**

*OWASP LLM Top 10 mapping table (10 категорий):*
- [ ] LLM01 Prompt Injection → severity: critical
- [ ] LLM02 Insecure Output Handling → severity: high
- [ ] LLM03 Training Data Poisoning → severity: high
- [ ] LLM04 Model Denial of Service → severity: medium
- [ ] LLM05 Supply Chain Vulnerabilities → severity: high
- [ ] LLM06 Sensitive Information Disclosure → severity: high
- [ ] LLM07 Insecure Plugin Design → severity: medium
- [ ] LLM08 Excessive Agency → severity: high
- [ ] LLM09 Overreliance → severity: medium
- [ ] LLM10 Model Theft → severity: medium

*MITRE ATLAS mapping (5+ techniques):*
- [ ] AML.T0051 (Initial Access: prompt injection)
- [ ] AML.T0054 (Defense Evasion: jailbreak)
- [ ] AML.T0024 (Exfiltration: model extraction)
- [ ] AML.T0020 (Persistence: data poisoning)
- [ ] AML.T0048 (Impact: manipulation)

*NIST AI RMF mapping:*
- [ ] MAP-1.1, MG-2.4, MG-3.1, MS-2.6, GV-1.1

*Integration:*
- [ ] Cross-framework mapping: scanner findings → EU AI Act + OWASP + MITRE + NIST simultaneously
- [ ] `findingToFrameworks(finding)` → `{ euAiAct, owasp, mitre, nist }` in Obligation Mapper
- [ ] Data file: `engine/core/data/regulations/owasp-llm/categories.json`
- [ ] Data file: `engine/core/data/regulations/mitre-atlas/techniques.json`
- [ ] THIRD-PARTY-LICENSES: Promptfoo copyright notice (MIT)

*User-visible (в `complior scan --cloud`):*
```
  MULTI-FRAMEWORK MAPPING
  FRAMEWORK            FINDINGS    COVERAGE
  EU AI Act            19/108      Art. 5,9,10,11,12,13,14,15,26,27,50
  ISO 42001            12/39       A.2.2, A.5.2, A.6.2, A.7.6, A.8.2, A.9.5
  OWASP LLM Top 10     6/10       LLM01,02,06,07,08,09
  MITRE ATLAS           4          AML.T0048, T0051, T0054, T0043
  ISO 27090             3/13       5.3, 5.7, 5.12
  NIST AI RMF           5/19       MAP-1.1, MG-2.4, MG-3.1, MS-2.6, GV-1.1
```

**Технические детали:**
- Источник: `~/promptfoo-archive/src/redteam/constants.ts` — архивированный MIT repo
- `engine/core/data/regulations/owasp-llm/categories.json` — 10 categories + severity + mapping
- `engine/core/data/regulations/mitre-atlas/techniques.json` — techniques + tactics
- `engine/core/src/domain/frameworks/owasp-llm-framework.ts` — OWASP framework adapter
- `engine/core/src/domain/frameworks/mitre-atlas-framework.ts` — MITRE framework adapter
- `engine/core/src/services/obligation-mapper.ts` — расширение для multi-framework output
- Тесты: 20+ unit (mapping tables, cross-framework), 5+ integration

---

### US-S10-02: Garak Attack Probes — LLM vulnerability probes embed
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-121
**Компонент:** `[Engine]`
**Обязательства:** Art. 15, ISO 27090

Как security-исследователь, я хочу чтобы в Engine были встроены vulnerability probes из Garak (NVIDIA, Apache 2.0), чтобы использовать их как attack library для `complior redteam` и как training data для Guard Service.

**Проблема:**
Adversarial Test Runner (E-77) имеет ограниченный набор тестов. Garak содержит 160+ probe types с encoding tricks, multi-turn escalation, и language-specific attacks. Эти данные нужны как attack library для `complior redteam` (E-128) и как training data для Guard Service (отдельный repo).

**Acceptance Criteria:**
- [ ] Извлечь probes из `~/garak-archive/garak/probes/` (Apache 2.0)
- [ ] Данные в `engine/core/data/adversarial/garak-probes.json`
- [ ] Формат: `{ probe, category, technique, source: "garak", severity }`
- [ ] Категории: prompt-injection, data-exfiltration, output-manipulation, encoding-attacks, multi-turn-escalation
- [ ] 300+ probe примеров (160+ probe types × variants)
- [ ] Dedup с Promptfoo attack datasets: уникальные probes only
- [ ] Данные используются в: `complior redteam` (E-128) + Guard Service training (`~/guard`)
- [ ] THIRD-PARTY-LICENSES: Garak copyright notice (Apache 2.0)

**Технические детали:**
- Источник: `~/garak-archive/garak/probes/` — архивированный Apache 2.0
- `engine/core/data/adversarial/garak-probes.json` — extracted probes
- `engine/core/src/domain/scanner/data/adversarial-loader.ts` — unified loader
- Тесты: 8+ unit (data loading, dedup, validation)

---

### US-S10-03: Security Score — OWASP LLM Top 10 + MITRE ATLAS scoring
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-126
**Компонент:** `[Engine]`
**Обязательства:** Art. 15, ISO 27090

Как CISO, я хочу видеть отдельный Security Score (0-100) с маппингом на OWASP LLM Top 10 и MITRE ATLAS, чтобы понимать security posture AI-системы отдельно от compliance.

**Проблема:**
Compliance Score смешивает документацию (Art. 11), transparency (Art. 50), и security (Art. 15). CISO нужен чистый security view. OWASP LLM Top 10 и MITRE ATLAS — стандартные security frameworks для AI. Маппинг-таблицы из E-120 (Obligation Mapper) используются здесь для расчёта Security Score.

**Acceptance Criteria:**

*OWASP LLM Top 10 mapping:*
- [ ] LLM01 Prompt Injection → L4 injection patterns + Semgrep + NHI
- [ ] LLM02 Insecure Output → L4 output sanitization checks
- [ ] LLM03 Training Data Poisoning → ModelScan findings + L3 deps
- [ ] LLM04 Model DoS → L4 rate limiting patterns
- [ ] LLM05 Supply Chain → L3 banned + dep scan + SBOM
- [ ] LLM06 Sensitive Data → NHI + detect-secrets + Bandit
- [ ] LLM07 Insecure Plugin → L4 tool permission patterns
- [ ] LLM08 Excessive Agency → L4 autonomy patterns + kill switch
- [ ] LLM09 Overreliance → L4 human oversight patterns
- [ ] LLM10 Model Theft → L4 model access control patterns

*Scoring:*
- [ ] Per-category score (0-100): weighted by OWASP severity
- [ ] Aggregate Security Score (0-100, grade A-F)
- [ ] Security Score independent of Compliance Score
- [ ] Critical security finding → Security Score capped at 49

**Технические детали:**
- `engine/core/src/domain/frameworks/owasp-llm-framework.ts` — OWASP scoring adapter
- `engine/core/src/domain/frameworks/mitre-atlas-framework.ts` — MITRE scoring adapter
- `engine/core/src/domain/scanner/score-calculator.ts` — dual score output
- `engine/core/data/regulations/owasp-llm/categories.json` — 10 categories + mappings (from E-120)
- Тесты: 20+ unit (mapping, scoring), 5+ integration

---

### US-S10-04: `complior redteam` — adversarial test runner
**Приоритет:** HIGH
**Продукт:** Engine + CLI
**Backlog ref:** E-128, C-26
**Компонент:** `[Engine]` `[CLI]`
**Обязательства:** Art. 15, Art. 9, Art. 5

Как security-инженер, я хочу запустить `complior redteam` для автоматизированного adversarial тестирования моей AI-системы, чтобы обнаружить уязвимости (prompt injection, jailbreak, bias, PII leak, exfiltration) и получить рекомендации по защите.

**Проблема:**
Adversarial Test Runner (E-77) выполняет базовые тесты. `complior redteam` — полноценный red-teaming runner: 3000+ атак из Promptfoo (MIT) и Garak (Apache 2.0), маппинг результатов на 6 frameworks, автоматическая генерация Guard конфигурации. Данные встроены в binary (zero dependency на Promptfoo/Garak).

Red Team — не отдельный модуль. Это функциональность, распределённая по:
- **Engine** → attack library + runner + mapper
- **CLI** → `complior redteam` command
- **Guard Service** → training data (отдельный repo)
- **SaaS** → Security Posture tab (визуализация)

**Что извлекаем из Promptfoo (MIT):**
- 50+ типов атак из `src/redteam/plugins/`:
  - Injection variants, jailbreaks, social engineering
  - PII extraction, system prompt leak, data exfiltration
  - Bias probes, content safety violations, escalation triggers
- Mutation strategies из `src/redteam/strategies/`

**Что извлекаем из Garak (Apache 2.0):**
- 160+ probe types: encoding tricks, multi-turn escalation, language-specific attacks

**Acceptance Criteria:**

*CLI command:*
- [ ] `complior redteam [--target <endpoint>] [--attacks all|injection|jailbreak|bias|pii|exfiltration]`
- [ ] `--target`: HTTP endpoint AI-системы (default: proxy через SDK)
- [ ] `--attacks`: фильтр по типу атак (default: all)
- [ ] `--dry-run`: показать список атак без выполнения
- [ ] `--json`: structured JSON output

*Attack library:*
- [ ] Promptfoo attack datasets встроены: 50+ attack types → `engine/core/data/adversarial/promptfoo-attacks.json`
- [ ] Garak probes встроены: 160+ probe types (из E-121)
- [ ] Общий объём: 3000+ атак одной командой
- [ ] Mutation strategies: rotate/rephrase/encode attacks

*Runner pipeline:*
```
complior redteam --target https://api.example.com/chat
  1. Загрузить attack datasets (встроенные)
  2. Атаковать AI-систему через HTTP POST
  3. Анализировать response → classify (safe/unsafe/error)
  4. Маппинг на EU AI Act + OWASP + MITRE + NIST + ISO 27090 + ISO 42001
  5. Рассчитать Attack Success Rate (ASR)
  6. Обновить Security Score
  7. Предложить Guard конфигурацию
  8. Включить результаты в Evidence Chain
```

*Output:*
- [ ] CLI table: attack types, count, ASR%, framework mapping
- [ ] Guard config auto-generate: на основе ASR → рекомендация SDK config
- [ ] Evidence Chain: результаты как `evidence_type: "security_testing"`

**Технические детали:**
- `engine/core/data/adversarial/promptfoo-attacks.json` — extracted Promptfoo attack datasets
- `engine/core/src/domain/redteam/attack-runner.ts` — runner logic (HTTP POST → classify response)
- `engine/core/src/domain/redteam/attack-classifier.ts` — response classification (safe/unsafe/error)
- `engine/core/src/domain/redteam/guard-recommender.ts` — auto-generate Guard/SDK config
- `engine/core/src/http/routes/redteam.route.ts` — HTTP endpoint `POST /redteam`
- `cli/src/headless/redteam.rs` — CLI command
- Тесты: 25+ unit (attacks, classification, mapping), 10+ integration

---

### US-S10-05: `complior import promptfoo` — import red-team results
**Приоритет:** MEDIUM
**Продукт:** Engine + CLI
**Backlog ref:** E-129, C-27
**Компонент:** `[Engine]` `[CLI]`
**Обязательства:** Art. 15, Art. 9

Как разработчик, который уже использует Promptfoo для red-teaming, я хочу импортировать результаты в Complior, чтобы автоматически получить маппинг на EU AI Act и рекомендации по Guard конфигурации.

**Проблема:**
Пользователь уже провёл red-teaming через Promptfoo. Результаты в JSON-отчёте. Нужно импортировать без повторного тестирования: маппинг категорий → EU AI Act, обновление compliance/security scores, генерация Guard конфигурации, включение в Evidence Chain.

**Что извлекаем из Promptfoo:**
- Report format из `src/types.ts` — schema для import adapter

**Acceptance Criteria:**

*CLI commands:*
- [ ] `complior import promptfoo <path-to-report.json>`
- [ ] `complior import promptfoo --url <dashboard-url>` (optional)
- [ ] MCP tool: `complior_import_security_report { source: "promptfoo", path: "..." }`

*Маппинг 11 категорий → EU AI Act:*

| Promptfoo категория | EU AI Act | Guard Service action |
|---------------------|-----------|---------------------|
| Prompt Injection | Art. 15(4) | PromptGuard 2: injection ON |
| Jailbreak | Art. 9(2)(b) | PromptGuard 2: jailbreak ON |
| PII Leak | Art. 10(5) + GDPR 32 | Presidio: PII anonymize ON |
| Bias (все типы) | Art. 10(2)(f) | Guard model: bias ON |
| Hate Speech | Art. 5(1)(a) | Guard model: content_safety ON |
| Self-Harm | Art. 9(2)(a) | Guard model: content_safety ON |
| WMD Content | Art. 5(1)(a) | Guard model: prohibited ON |
| Data Exfiltration | Art. 15(4) | Guard model: exfiltration ON |
| System Prompt Leak | Art. 15(3) | Guard model: exfiltration ON |
| Escalation needed | Art. 14 | SDK: escalation hook ON |
| Unauthorized Advice | Art. 14(4)(a) | SDK: disclosure hook ON |

*Auto-configuration:*
- [ ] Генерация SDK config на основе imported results:
```typescript
const client = complior(new OpenAI(), {
  guard: true,  // → guard.complior.dev
  hooks: {
    pre: ['prohibited', 'sanitize', 'disclosure', 'permission'],
    post: ['bias', 'escalation', 'action-log'],
  }
});
```

*Evidence Chain:*
- [ ] Imported results → evidence entry:
```json
{
  "evidence_type": "security_testing",
  "tool": "promptfoo",
  "results_hash": "sha256:...",
  "summary": { "total_tests": 3236, "failed": 1118, "attack_success_rate": "34.5%" },
  "eu_ai_act_mapping": { "art_9": "addressed", "art_14": "addressed", "art_15": "addressed" }
}
```

- [ ] Security Score update: imported findings → recalculate security score
- [ ] CLI output: summary table (imported findings, mapping, recommended actions)

**Технические детали:**
- `engine/core/src/domain/import/promptfoo-adapter.ts` — parse Promptfoo JSON report
- `engine/core/src/domain/import/security-report-mapper.ts` — category → framework mapping
- `engine/core/src/http/routes/import.route.ts` — HTTP endpoint `POST /import/promptfoo`
- `cli/src/headless/import.rs` — CLI command
- Report format reference: `~/promptfoo-archive/src/types.ts` (archived)
- Тесты: 15+ unit (parsing, mapping, auto-config), 5+ integration

---

### US-S10-06: Dual Scoring Output — Compliance + Security
**Приоритет:** MEDIUM
**Продукт:** Engine + CLI
**Backlog ref:** E-127
**Компонент:** `[Engine]` `[CLI]`

Как пользователь, я хочу видеть два отдельных score (Compliance и Security) в TUI, CLI output, и HTTP API, чтобы понимать оба аспекта compliance моей AI-системы.

**Acceptance Criteria:**
- [ ] `ScanResult` extended: `securityScore?: number`, `securityGrade?: string`
- [ ] CLI output: `Compliance: 78/100 (B) | Security: 65/100 (C)`
- [ ] TUI Dashboard: два score indicator (donuts или bars)
- [ ] HTTP API: `POST /scan` returns both scores
- [ ] JSON output (`--json`): оба scores в output
- [ ] Security Score = 0 если Tier 1 (no external tools → insufficient data)
- [ ] SSE event: `scan.completed` includes both scores

**Технические детали:**
- `engine/core/src/types/scan.types.ts` — extend ScanResult
- `cli/src/types/engine.rs` — extend Rust ScanResult
- `cli/src/headless/format.rs` — dual score display
- Тесты: 10+ unit, 3+ integration

---

## Фаза B: External Tools via uv (Tier 2)

> Внешние инструменты загружаются через uv (Astral, Rust-based Python tool manager).
> Tier 2 сканирование: Tier 1 + Semgrep/Bandit/ModelScan/detect-secrets.

### US-S10-07: uv Tool Manager — автоматическая загрузка внешних инструментов
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-115
**Компонент:** `[Engine]`

Как разработчик, я хочу чтобы Complior автоматически загружал внешние инструменты (Semgrep, Bandit, ModelScan, detect-secrets) при первом использовании `--deep-local`, чтобы мне не нужно было устанавливать Python или эти пакеты вручную.

**Проблема:**
External tools (Semgrep, Bandit, ModelScan) — Python-пакеты. Пользователи JS/TS/Rust проектов не имеют Python. Ручная установка создаёт friction и снижает adoption. Нужна zero-config установка.

**Acceptance Criteria:**
- [ ] Интеграция [uv](https://github.com/astral-sh/uv) — standalone Python tool manager (Rust-based, 10-100x быстрее pip)
- [ ] При первом `complior scan --deep-local` → проверка `~/.complior/tools/`
- [ ] Если пусто: `uv tool install semgrep bandit modelscan detect-secrets` (~150MB, one-time)
- [ ] Кэширование: последующие запуски используют кэш (<1s startup)
- [ ] Progress bar при загрузке: "Installing deep scan tools... (150MB, one-time)"
- [ ] Graceful degradation: если uv недоступен → warning "Install uv for deep local scan", продолжить с Tier 1
- [ ] `complior tools status` — показать установленные инструменты и их версии
- [ ] `complior tools update` — обновить инструменты до последних версий
- [ ] Версии инструментов закреплены в `engine/core/src/data/tool-versions.json`

**Технические детали:**
- `engine/core/src/infra/tool-manager.ts` — uv wrapper (spawn subprocess)
- `engine/core/src/data/tool-versions.json` — pinned versions: `{ "semgrep": "1.x", "bandit": "1.x", ... }`
- `cli/src/headless/tools.rs` — `complior tools status|update` commands
- Тесты: 10+ unit (tool detection, version check), 5+ integration (mock uv)

---

### US-S10-08: Semgrep Integration — SAST-расширение L4 scanner
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-116
**Компонент:** `[Engine]`
**Обязательства:** Art. 15(4), ISO 27090

Как security-инженер, я хочу чтобы Complior использовал Semgrep для SAST-анализа, чтобы обнаруживать паттерны безопасности, которые regex не может поймать (taint analysis, control flow, data flow).

**Проблема:**
L4 regex-rules ловят имена (`eval`, `pickle.load`), но не понимают data flow. `user_input → eval()` — опасно, `"hello" → eval()` — нет. Semgrep с правилами taint analysis различает эти случаи. Также Semgrep поддерживает custom rules для compliance-паттернов.

**Acceptance Criteria:**
- [ ] Semgrep запускается как subprocess из Engine (через uv tool, E-115)
- [ ] Custom Semgrep rules в `engine/core/data/semgrep-rules/`:
  - `ai-bare-call.yaml` — bare LLM API calls без wrapper
  - `unsafe-deserialization.yaml` — pickle, torch.load без safe mode
  - `injection-patterns.yaml` — command/SQL/prompt injection
  - `missing-error-handling.yaml` — LLM calls без try/catch
  - `hardcoded-secrets.yaml` — API keys in source code
- [ ] Semgrep findings маппятся на EU AI Act articles (Art. 15, Art. 12, Art. 50)
- [ ] Confidence: Semgrep findings → 90% (vs regex 75%)
- [ ] Performance: Semgrep scan < 10s для 1000 файлов
- [ ] Output: Semgrep findings интегрируются в `allResults` как L4 findings с `source: "semgrep"`
- [ ] Graceful fallback: Semgrep не установлен → skip, use regex-only

**Технические детали:**
- `engine/core/src/domain/scanner/external/semgrep-runner.ts` — subprocess wrapper
- `engine/core/data/semgrep-rules/` — 5+ YAML rule files
- `domain/scanner/layers/layer4-patterns.ts` — интеграция Semgrep results
- Тесты: 15+ unit (rule parsing, finding mapping), 5+ integration (real Semgrep)

---

### US-S10-09: Bandit Integration — Python SAST
**Приоритет:** HIGH
**Продукт:** Engine
**Backlog ref:** E-117
**Компонент:** `[Engine]`
**Обязательства:** Art. 15(4)

Как разработчик Python AI-приложения, я хочу чтобы Complior использовал Bandit для анализа безопасности Python-кода, чтобы находить уязвимости, которые regex-сканер не может обнаружить.

**Acceptance Criteria:**
- [ ] Bandit запускается как subprocess через uv (E-115)
- [ ] Scan только Python файлов (`.py`) в project scope
- [ ] Bandit findings маппятся на EU AI Act: unsafe deserialization (Art. 15), hardcoded secrets (Art. 12), command injection (Art. 15)
- [ ] Severity mapping: Bandit HIGH → Complior HIGH, Bandit MEDIUM → Complior MEDIUM
- [ ] Confidence: Bandit findings → 88% (Bandit has AST-based analysis)
- [ ] JSON output parsing (`bandit -f json`)
- [ ] Integration в L4 findings с `source: "bandit"`
- [ ] Dedup: если Bandit и regex нашли одно и то же → Bandit finding wins (higher confidence)

**Технические детали:**
- `engine/core/src/domain/scanner/external/bandit-runner.ts` — subprocess wrapper
- `domain/scanner/layers/layer4-patterns.ts` — dedup + merge
- Тесты: 10+ unit, 3+ integration

---

### US-S10-10: ModelScan Integration — сканирование ML-моделей
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-118
**Компонент:** `[Engine]`
**Обязательства:** Art. 15

Как ML-инженер, я хочу чтобы Complior сканировал ML-модели (pickle, safetensors, ONNX) на вредоносный код, чтобы обнаруживать supply chain атаки через модели.

**Acceptance Criteria:**
- [ ] ModelScan (Protect AI) запускается через uv (E-115)
- [ ] Scan файлов: `.pkl`, `.pickle`, `.pt`, `.pth`, `.onnx`, `.safetensors`, `.h5`, `.joblib`
- [ ] Findings: unsafe operator в pickle, malicious code injection, code execution risk
- [ ] Severity: всегда HIGH (model-level compromise = full system compromise)
- [ ] Integration в L3 findings с `source: "modelscan"`
- [ ] Mapping: Art. 15 (accuracy/robustness/cybersecurity)
- [ ] Performance: ModelScan < 5s per model file

**Технические детали:**
- `engine/core/src/domain/scanner/external/modelscan-runner.ts` — subprocess wrapper
- `domain/scanner/layers/layer2-parsing.ts` — integration after dep scan
- Тесты: 8+ unit, 3+ integration (with test pickle files)

---

### US-S10-11: detect-secrets Integration — расширенный поиск секретов
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-119
**Компонент:** `[Engine]`
**Обязательства:** Art. 12

Как DevSecOps-инженер, я хочу чтобы Complior использовал detect-secrets (Yelp) для расширенного обнаружения секретов, чтобы дополнить встроенный NHI-сканер (37 patterns) продвинутыми heuristics.

**Acceptance Criteria:**
- [ ] detect-secrets запускается через uv (E-115)
- [ ] Scan всех source files в project scope
- [ ] Findings интегрируются в NHI results с `source: "detect-secrets"`
- [ ] Dedup: если NHI и detect-secrets нашли одно и то же → keep one (higher confidence)
- [ ] detect-secrets имеет entropy-based detection (ловит custom tokens, не только known patterns)
- [ ] Confidence: detect-secrets findings → 85%
- [ ] Graceful degradation: skip если не установлен

**Технические детали:**
- `engine/core/src/domain/scanner/external/detect-secrets-runner.ts`
- `domain/scanner/checks/nhi-scanner.ts` — merge results
- Тесты: 8+ unit, 3+ integration

---

### US-S10-12: Scan Tier CLI Flags — выбор тиера сканирования
**Приоритет:** HIGH
**Продукт:** Engine + CLI
**Backlog ref:** E-122
**Компонент:** `[Engine]` `[CLI]`

Как разработчик, я хочу выбирать тиер сканирования через CLI-флаги (`--deep-local`, `--cloud`), чтобы контролировать глубину и стоимость сканирования.

**Acceptance Criteria:**
- [ ] `complior scan` — Tier 1 (default, offline, free)
- [ ] `complior scan --deep-local` — Tier 2 (+ Semgrep/Bandit/ModelScan/detect-secrets)
- [ ] `complior scan --cloud` — Tier 3 (+ cloud enrichment, requires account)
- [ ] `complior scan --deep` — legacy flag, mapped to Tier 1 + L5 LLM (BYOK)
- [ ] Tier indicator в output: `[Tier 1: Offline] Score: 72/100` vs `[Tier 2: Deep Local] Score: 78/100`
- [ ] `ScanResult` extended: `tier: 1 | 2 | 3`, `externalToolResults?: ExternalToolResult[]`
- [ ] TUI shows scan tier badge в Dashboard page
- [ ] HTTP API: `POST /scan { tier: 1 | 2 | 3 }`

**Технические детали:**
- `cli/src/cli.rs` — new flags `--deep-local`, `--cloud`
- `engine/core/src/types/scan.types.ts` — `ScanTier` enum
- `engine/core/src/domain/scanner/create-scanner.ts` — tier-based pipeline orchestration
- `cli/src/headless/scan.rs` — pass tier to engine
- Тесты: 10+ unit (tier selection), 5+ integration (tier-based scan)

---

## Фаза C: Cloud + Guard Service

### US-S10-13: Cloud Scan API Client — интеграция с scan.complior.dev
**Приоритет:** MEDIUM
**Продукт:** Engine
**Backlog ref:** E-123
**Компонент:** `[Engine]`

Как пользователь Growth/Enterprise тарифа, я хочу чтобы `complior scan --cloud` отправлял offline scan results на scan.complior.dev для cloud enrichment (L5 LLM, SBOM CVE, multi-framework scoring).

**Acceptance Criteria:**
- [ ] `POST https://scan.complior.dev/api/enrich { scanResult, projectFiles[] }`
- [ ] Auth: Bearer token из `~/.config/complior/credentials`
- [ ] Request: offline scan result + file hashes (не file content по умолчанию)
- [ ] Response: enriched findings, security score, framework scores, vendor report
- [ ] Merge: cloud results merged into local ScanResult
- [ ] Error handling: cloud unavailable → return local result with warning
- [ ] Privacy: no source code sent by default (only hashes + metadata). `--cloud-send-code` opt-in.
- [ ] Cost indicator: "Cloud scan enrichment: estimated $0.05"

**Технические детали:**
- `engine/core/src/infra/cloud-scan-client.ts` — HTTP client
- `engine/core/src/services/scan-service.ts` — cloud enrichment integration
- `engine/core/src/types/scan.types.ts` — `CloudEnrichmentResult` type
- Тесты: 10+ unit (client, merge logic), 5+ integration (mock cloud API)

---

### Guard Service (реализуется в `~/guard`, отдельный репозиторий)

> Guard Service — 4 ML-модели в Docker containers, deployment на Hetzner GPU (EU).
> Реализация ведётся отдельно в `~/guard`. Перечислены для учёта в sprint velocity и зависимостях.
> Подробности: `docs/ARCHITECTURE.md` § 11, `complior-guard-api-supplement-v1.2.md`.

**US-S10-14: PromptGuard 2 Integration (G-08)** — prompt injection + jailbreak detection (Meta, Apache 2.0). Docker container с FastAPI + transformers. Latency < 30ms GPU. *Реализация: `~/guard/guard-promptguard/`*

**US-S10-15: LLM Guard Integration (G-09)** — toxicity, bias, PII detection (Protect AI, Apache 2.0). Configurable scanners. Latency < 20ms per scanner. *Реализация: `~/guard/guard-llmguard/`*

**US-S10-16: Presidio Integration (G-10)** — 50+ EU PII types, custom recognizers (Microsoft, MIT). Multilingual (7 languages). Latency < 10ms. *Реализация: `~/guard/guard-presidio/`*

**US-S10-17: Guard Service Orchestrator (G-11)** — unified `POST /guard/check`, 4 модели параллельно, latency < 150ms. Docker Compose. *Реализация: `~/guard/guard-orchestrator/`*

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| **Фаза A: Embed** | |
| Obligation Mapper: OWASP+MITRE+NIST | 10+5+5 mapping entries, multi-framework output |
| Garak probes embedded | 300+ probes, deduped |
| Security Score working | 0-100, OWASP severity-weighted |
| `complior redteam` | 3000+ attacks, ASR calculation, Evidence Chain |
| `complior import promptfoo` | 11 categories → EU AI Act mapping, auto-config |
| Dual scoring output | Compliance + Security in CLI/TUI/API |
| **Фаза B: External Tools** | |
| uv Tool Manager: auto-download | Semgrep + Bandit + ModelScan + detect-secrets |
| Semgrep: custom compliance rules | 5+ YAML rules, EU AI Act mapped |
| Bandit: Python SAST | JSON output → L4 findings |
| ModelScan: ML model scan | pickle/safetensors vulnerability detection |
| detect-secrets: expanded NHI | entropy-based detection |
| Scan tier architecture | `--deep-local` / `--cloud` flags working |
| **Фаза C: Cloud + Guard** | |
| Cloud Scan API Client | scan.complior.dev enrichment integration |
| Guard Service: 4 models parallel | < 150ms unified response (~/guard) |
| **Общие** | |
| Scanner accuracy (Tier 2) | 85% → 92% |
| THIRD-PARTY-LICENSES | Promptfoo (MIT) + Garak (Apache 2.0) |
| Тесты | vitest + cargo test passing |
| User Stories | 17 planned (13 Complior + 4 Guard) |
