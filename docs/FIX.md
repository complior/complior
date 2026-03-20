# Complior Fixer — Методология и Пайплайн

Complior fixer — **детерминистический движок авто-ремедиации на основе стратегий**. Генерирует и применяет compliance-фиксы для находок сканера. Каждый фикс: структурированный план → прогноз влияния на скор → type-aware diff → backup/undo → валидация → запись в evidence chain.

**Принцип:** Fixer НИКОГДА не изобретает compliance-логику. Все фиксы детерминистичны (шаблоны + стратегии). LLM только обогащает содержание документов при явном opt-in (`--ai`). Фиксы всегда: preview-first, обратимы, валидируются.

**Версия правил:** `1.0.0` — EU AI Act Regulation 2024/1689
**Категории фиксов:** 5 (A: Код, B: Документация, C: Конфиг, D: Зависимости, E: Паспорт)
**Стратегий:** 18 scaffold + 5 inline fix типов (splice)
**Обновлено:** 2026-03-19
**Тестов:** ~81 fixer-специфичных (43 fixer + 38 builder) из 1821 всего

---

## Обзор пайплайна

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          COMPLIOR FIX PIPELINE                                  │
│                                                                                 │
│  5 категорий · 18 стратегий · 14 шаблонов · backup/undo · evidence chain      │
└─────────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
 complior fix — AUTO-REMEDIATION (offline, modifies project files)
═══════════════════════════════════════════════════════════════════════════════════

PHASE 1: DISCOVERY                PHASE 2: PLANNING              PHASE 3: APPLY
│                                 │                               │
├─ Last ScanResult                ├─ For each fail finding:       ├─ Backup original
│  (from scan or cache)           │  findStrategy(finding, ctx)   │  .complior/backups/
│                                 │                               │
├─ Filter: type == 'fail'         ├─ Priority 1: fixDiff present? ├─ Apply actions:
│  (skip pass/skip findings)      │  → buildInlineFixPlan()       │  ├─ create: new file
│                                 │  → splice action              │  ├─ edit: string replace
├─ Build FixContext:              │                               │  ├─ splice: inline before/after
│  ├─ projectPath                 ├─ Priority 2: findStrategy()   │  │  + stale diff protection
│  ├─ framework (React/Node/…)    │  → scaffold action (create)   │  └─ import injection
│  └─ existingFiles[]             │                               │
│                                 ├─ Returns FixPlan:             ├─ Template resolution:
│                                 │  ├─ obligationId              │  [TEMPLATE:file] → content
│                                 │  ├─ actions[] (splice/create) │  + passport pre-fill
                                  │                               │  + optional LLM enrich
                                  ├─ Preview:                     │
                                  │  CLI: table + diff             ├─ Re-scan project
                                  │  TUI: type-aware panel         │  (full L1-L4)
                                  │  API: GET /fix/preview         │
                                                                  ├─ Validate:
                                                                  │  finding fail → pass?
                                                                  │  score delta
                                                                  │
                                                                  ├─ Record evidence
                                                                  │  .complior/evidence/
                                                                  │
                                                                  ├─ Record undo history
                                                                  │  .complior/fixes-history.json
                                                                  │
                                                                  └─ Emit events:
                                                                     score.updated
                                                                     fix.validated

═══════════════════════════════════════════════════════════════════════════════════
 COMMANDS & ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════════

CLI:
  complior fix                           Apply all available fixes
  complior fix --dry-run                 Preview fixes without applying
  complior fix --ai                      Apply with LLM-enriched documents
  complior fix --json                    JSON output for CI/CD
  complior docs generate --missing       Generate missing compliance documents

TUI (page 3 — Fix):
  Space    toggle fix selection
  a        select all
  n        deselect all
  d        toggle diff preview
  Enter    apply selected fixes

HTTP API:
  GET  /fix/preview                      List all available fix plans
  POST /fix/preview                      Preview single finding fix
  POST /fix/apply                        Apply single fix
  POST /fix/apply-and-validate           Apply + validate + evidence
  POST /fix/apply-all                    Batch apply all fixes
  POST /fix/undo                         Undo last fix or by ID
  GET  /fix/history                      Fix history log

═══════════════════════════════════════════════════════════════════════════════════
 ЧТО НАХОДИТ СКАНЕР → ЧТО ПРАВИТ FIXER
═══════════════════════════════════════════════════════════════════════════════════

Слой сканера          Находка (checkId)           Категория    Действие фикса                      Статус
─────────────────     ────────────────────────     ─────────    ─────────────────────────────────    ──────
L1 Наличие файлов     ai-disclosure                A (Код)      Создаёт компонент/middleware          ✅
L1 Наличие файлов     content-marking              C (Конфиг)   Создаёт C2PA/IPTC конфиг JSON        ✅
L1 Наличие файлов     interaction-logging           A (Код)      Создаёт логгер с типизированным API  ✅
L1 Наличие файлов     compliance-metadata           C (Конфиг)   Создаёт .well-known/ai-compliance    ✅
L1 Наличие файлов     документы (14 типов)          B (Док)      Генерирует из шаблона                ✅
L1 Наличие файлов     passport-presence             E (Паспорт)  complior agent init                  ✅

L2 Структура док.     l2-fria incomplete            B (Док)      Регенерирует с данными паспорта      ✅
L2 Структура док.     l2-tech-documentation         B (Док)      Генерирует из шаблона                ✅

L3 Зависимости        l3-banned-*                   A (Код)      Inline: удаляет строку из manifest   ✅
L3 Зависимости        l3-dep-vuln                   D (Зав.)     Создаёт план обновления зависимостей ✅
L3 Зависимости        l3-dep-license                D (Зав.)     Создаёт обзор лицензий               ✅
L3 Зависимости        l3-ci-compliance              C (Конфиг)   Создаёт GitHub Actions workflow      ✅
L3 Зависимости        l3-missing-bias-testing       C (Конфиг)   Создаёт bias-testing.config.json     ✅

L4 Паттерны кода      l4-bare-llm                   A (Код)      Inline: complior() SDK wrap          ✅
L4 Паттерны кода      l4-human-oversight             A (Код)      Scaffold: human approval gate        ✅
L4 Паттерны кода      l4-kill-switch                 A (Код)      Scaffold: kill switch (env var)      ✅
L4 Паттерны кода      l4-security-risk               A (Код)      Inline: паттерн-специфичная замена   ✅
L4 Паттерны кода      l4-ast-missing-error-handling   A (Код)      Inline: try/catch обёртка            ✅
L4 Паттерны кода      l4-conformity-assessment       A (Код)      Создаёт чек-лист конформити          ✅
L4 Паттерны кода      l4-data-governance             A (Код)      Создаёт middleware валидации данных   ✅
L4 Паттерны кода      l4-logging                     A (Код)      Создаёт interaction logger           ✅

NHI Секреты           l4-nhi-* (любой)               A (Код)      Inline: process.env / os.environ     ✅
NHI Секреты           l4-nhi-* (без file/line)       C (Конфиг)   Scaffold: .gitignore + .env.example  ✅
NHI Секреты           l4-nhi-clean                   —            Нет фикса (всё чисто)                —

Кросс-слой            cross-sdk-no-disclosure        A (Код)      Создаёт disclosure (как L1)          ✅
Кросс-слой            cross-doc-code-mismatch        B (Док)      Создаёт отчёт о рассинхронизации     ✅

Deep (ext-semgrep)    ext-semgrep-bare-call          A (Код)      SDK wrapper (та же стратегия)         ✅
Deep (ext-bandit)     ext-bandit-B301                A (Код)      Безопасная десериализация             ✅
Deep (ext-bandit)     ext-bandit-B603                A (Код)      subprocess без shell=True             ✅
Deep (ext-bandit)     ext-bandit-B608                A (Код)      Параметризованные SQL-запросы         ✅
Deep (ext-bandit)     ext-bandit-B105                A (Код)      Пароль в env var                     ✅
Deep (ext-bandit)     ext-bandit-* (любой)           A (Код)      Генерик remediation + checklist       ✅
Deep (ext-modelscan)  ext-modelscan-PickleUnsafe     —            ⚠ Ручное (convert to safetensors)    —
Deep (ext-detect-sec) ext-detect-secrets-AWS         C (Конфиг)   .gitignore + rotation (как NHI)      ✅

L5 LLM Анализ         l5-* findings                  varies       🔮 Планируется: LLM-suggested fix    —
```

---

## Inline Fix (приоритет 1) — splice

Когда сканер находит bare LLM call (e.g. `new OpenAI()`, `new Anthropic()`), `buildFixDiff()` генерирует структурированный diff с before/after строками. Этот diff хранится в `finding.fixDiff` и используется для **inline-модификации исходного файла** — без создания scaffold-файла.

**Приоритет:** Inline fix (splice) > Strategy-based scaffold. Если finding имеет `fixDiff`, fixer генерирует splice-план. Если нет — fallback на стратегию из реестра.

### Почему это важно

Scaffold-фиксы (создание `compliance-wrapper.ts`) не меняют исходный файл. Finding `l4-bare-llm` остаётся `fail` после scaffold-фикса, потому что сканер видит тот же `new OpenAI()` в `src/ai.ts`. Inline fix **сплайсит** строки прямо в исходном файле: `new OpenAI()` → `complior(new OpenAI())`. После re-scan finding становится `pass`.

### Тип действия: `splice`

```
FixAction {
  type: 'splice'
  path: string              // файл для модификации (e.g. "src/ai.ts")
  beforeLines: string[]     // ожидаемые строки (для stale diff protection)
  afterLines: string[]      // заменяющие строки
  startLine: number         // 1-based номер начальной строки
  importLine?: string       // import для инжекции (e.g. "import { complior } from '@complior/sdk'")
  description: string
}
```

### Поток применения

```
1. Читает файл целиком
2. Валидирует before-lines (trim-сравнение) — stale diff protection
3. Splice: заменяет before-lines на after-lines
4. Import injection: если importLine задан и ещё не в файле →
   вставляет после последнего import (или в начало)
5. Пишет обратно, сохраняя trailing newline
```

Stale diff protection реализована в ОБОИХ:
- **Rust CLI** (`cli/src/views/fix/apply.rs`) — `apply_fix_to_file()`
- **TS Engine** (`services/fix-service.ts`) — `applyAction()` splice branch

### Деdup

Splice-действия дедуплицируются по `${path}:${startLine}` (а не по output path как scaffold-действия). Два finding'а на один файл, разные строки → 2 плана. Один файл, та же строка → 1 план.

---

## Категории фиксов

Complior классифицирует каждый фикс в одну из 5 категорий. Каждая категория имеет свою механику применения, рендеринг diff, и логику валидации.

### Категория A — Код

Создаёт или модифицирует файлы исходного кода. Самая сложная категория — учитывает фреймворк, язык и систему импортов проекта.

```
Fix Type:         code_injection
Применение:       Структурированный diff (before/after lines) + import injection
Diff-рендеринг:   Red/green unified diff с номерами строк
Защита от stale:  Валидирует before-lines до splice
Откат:            File backup → restore on undo
```

**Реализованные стратегии (9):**

| Стратегия | Check ID | Статья | Что создаёт | Скор |
|-----------|----------|--------|-------------|------|
| Disclosure | `ai-disclosure` | Art. 50(1) | React-компонент ИЛИ server middleware | +7 |
| Interaction Logging | `interaction-logging` | Art. 12 | Логгер с типизированным API | +5 |
| SDK Wrapper | `l4-bare-llm` | Art. 50(1) | `complior(client, config)` обёртка через `@complior/sdk` | +6 |
| Permission Guard | `l4-human-oversight` | Art. 14 | Human approval gate с очередью, таймаутами, risk-level | +5 |
| Kill Switch | `l4-kill-switch` | Art. 14(4) | `AI_KILL_SWITCH` env var + `isAiEnabled()` + `emergencyShutdown()` | +5 |
| Error Handler | `l4-security-risk` / `l4-ast-missing-error-handling` | Art. 15(4) | try-catch обёртка + compliance-aware error log + fallback | +4 |
| HITL Gate | `l4-conformity-assessment` | Art. 19 | Чек-лист конформити (8 пунктов: Art.9-15 + sign-off) | +5 |
| Data Governance | `l4-data-governance` | Art. 10 | Middleware валидации + PII detection stub + audit log | +5 |
| Bandit Fix | `ext-bandit-*` | Art. 15(4) | Remediation план: B301→json, B603→subprocess.run(list), B608→parameterized, B105→env var | +4 |

**Framework-aware генерация (disclosure + SDK wrapper):**
- **React/Next.js:** TSX компонент (`AIDisclosure.tsx`) или React hook (`useCompliorAI.ts`)
- **Express/Fastify/Hono:** Middleware с типизированным request/response
- **Generic:** Standalone модуль с явными экспортами

### Категория B — Документация

Генерирует compliance-документы EU AI Act из шаблонов. Самая результативная категория — типичный проект получает +30-50 очков только от документации.

```
Fix Type:         template_generation
Применение:       Создание файла из шаблона → pre-fill из паспорта → опциональное LLM-обогащение
Diff-рендеринг:   CREATE header + preview содержимого
Защита от stale:  Пропускает если output файл уже существует
Откат:            Удаление созданного файла при undo
```

**Дополнительные стратегии категории B:**

| Стратегия | Check ID | Статья | Что создаёт | Скор |
|-----------|----------|--------|-------------|------|
| Doc-Code Sync | `cross-doc-code-mismatch` | Art. 11 | Отчёт о рассинхронизации документации и кода + чек-лист | +5 |

**Template Registry (14 типов документов, единый источник истины):**

| Doc Type | Article | Template File | Output File | Score Impact |
|----------|---------|---------------|-------------|--------------|
| `fria` | Art. 27 | `eu-ai-act/fria.md` | `.complior/docs/fria.md` | +8 |
| `technical-documentation` | Art. 11 | `eu-ai-act/tech-docs.md` | `.complior/docs/tech-docs.md` | +8 |
| `risk-management` | Art. 9 | `eu-ai-act/risk-management.md` | `.complior/docs/risk-management.md` | +8 |
| `data-governance` | Art. 10 | `eu-ai-act/data-governance.md` | `.complior/docs/data-governance.md` | +8 |
| `monitoring-policy` | Art. 72 | `eu-ai-act/monitoring.md` | `.complior/docs/monitoring.md` | +8 |
| `art5-screening` | Art. 5 | `eu-ai-act/art5-screening.md` | `.complior/docs/art5.md` | +8 |
| `incident-report` | Art. 73 | `eu-ai-act/incident-report.md` | `.complior/docs/incident-report.md` | +8 |
| `declaration-of-conformity` | Art. 47 | `eu-ai-act/declaration.md` | `.complior/docs/declaration.md` | +8 |
| `worker-notification` | Art. 26(7) | `eu-ai-act/worker-notification.md` | `.complior/docs/worker-notification.md` | +8 |
| `qms` | Art. 17 | `eu-ai-act/qms.md` | `.complior/docs/qms.md` | +8 |
| `instructions-for-use` | Art. 13 | `eu-ai-act/instructions-for-use.md` | `.complior/docs/instructions.md` | +8 |
| `ai-literacy` | Art. 4 | `eu-ai-act/ai-literacy.md` | `docs/ai-literacy.md` | +8 |
| `gpai-transparency` | Art. 53 | `eu-ai-act/model-card.md` | `MODEL_CARD.md` | +8 |
| `gpai-systemic-risk` | Art. 55 | `eu-ai-act/systemic-risk.md` | `.complior/docs/systemic-risk.md` | +8 |

**Three-stage document generation pipeline:**

```
Stage 1: Template Loading
  TEMPLATE_REGISTRY → file path → disk read

Stage 2: Passport Pre-fill (deterministic)
  22+ placeholders:
    [Company Name]     → passport.organization
    [AI System Name]   → passport.name
    [Provider]         → passport.provider
    [Risk Class]       → passport.risk_class
    [Model ID]         → passport.model_id
    [Date]             → today
    ... 16 more

  Tracking: prefilledFields[] vs manualFields[]
  Typical pre-fill: 25-70% (depends on passport completeness)

Stage 3: LLM Enrichment (opt-in, --ai flag)
  Input: base document + passport + manual fields list
  LLM: fills unfilled sections using project context
  Safety: [REVIEW REQUIRED] for legal assertions
  Fallback: deterministic result if LLM fails
  Tracking: aiEnriched flag, aiFieldsCount
```

### Категория C — Конфигурация

Создаёт или модифицирует конфигурационные файлы. Лёгкие фиксы, устанавливающие compliance-метаданные без изменения кода приложения.

```
Fix Type:         config_fix | metadata_generation
Применение:       Создание JSON/TOML/YAML файла или правка конфига
Diff-рендеринг:   MODIFY header + preview изменений
Защита от stale:  Стандартная валидация файла
Откат:            Восстановление из backup
```

**Реализованные стратегии (5):**

| Стратегия | Check ID | Статья | Что создаёт | Скор |
|-----------|----------|--------|-------------|------|
| Compliance Metadata | `compliance-metadata` | Art. 50 | `.well-known/ai-compliance.json` | +4 |
| Content Marking | `content-marking` | Art. 50(2) | C2PA/IPTC конфиг JSON | +5 |
| Secret Rotation | `l4-nhi-*` (кроме `l4-nhi-clean`) | Art. 15(4) | `.gitignore` (секреты) + `.env.example` с vault-ссылками. Извлекает имя переменной из checkId: `l4-nhi-openai-key` → `OPENAI_API_KEY` | +6 |
| CI Compliance | `l3-ci-compliance` | Art. 17 | `.github/workflows/compliance-check.yml` — checkout → setup-node → `npx complior scan --ci --threshold 70` → upload SARIF | +4 |
| Bias Testing | `l3-missing-bias-testing` | Art. 10 | `bias-testing.config.json` — protected attributes, fairness metrics (equalized_odds, demographic_parity), thresholds | +4 |

### Категория D — Зависимости

Создаёт планы обновления зависимостей. Учитывает экосистему (npm, pip, cargo).

```
Fix Type:         dependency_fix
Применение:       Создание markdown-плана обновления с командами для каждой экосистемы
Diff-рендеринг:   CREATE header + plan content
Защита от stale:  Стандартная
Откат:            Удаление созданного файла при undo
```

**Реализованные стратегии (2):**

| Стратегия | Check ID | Статья | Что создаёт | Скор |
|-----------|----------|--------|-------------|------|
| CVE Upgrade | `l3-dep-vuln` | Art. 15 | `complior-upgrade-plan.md` — vulnerability summary из finding.message, команды обновления для npm/pip/cargo, checklist верификации | +5 |
| License Fix | `l3-dep-license` | Art. 5 | `complior-license-review.md` — матрица совместимости лицензий (MIT/Apache/GPL/AGPL/SSPL), action items, команды аудита | +4 |

### Категория E — Паспорт

Обновляет поля Agent Passport. Работает через passport service, не напрямую с файлами.

```
Fix Type:         passport_update
Применение:       PassportService.updatePassport() → .complior/agents/{name}.json
Diff-рендеринг:   Field-level before/after
Защита от stale:  Passport version check
Откат:            Восстановление passport JSON из backup
```

**Реализовано:**
- `complior agent init` — auto-discovery (создаёт паспорт)
- `complior agent fria <name>` — генерирует FRIA отчёт, ставит `fria_completed: true`
- Обновление completeness паспорта после применения фикса

---

## Fix Diff Builder

Генерирует структурированные inline diff для 5 типов находок. Маршрутизирует по `checkId` к специализированному builder'у. Если builder не может сгенерировать diff, finding обрабатывается scaffold-стратегией (fallback).

**File:** `engine/core/src/domain/scanner/fix-diff-builder.ts` (~350 LOC)
**Tests:** `engine/core/src/domain/scanner/fix-diff-builder.test.ts` (38 тестов)

```
Input:  fileContent, line, filePath, checkId
Output: FixDiff { filePath, startLine, before[], after[], importLine? } | undefined

Dispatch:
  checkId contains 'bare'         → buildBareLlmDiff()     SDK wrapper
  checkId starts 'l4-nhi-'        → buildNhiDiff()         Secret externalization
  checkId == 'l4-security-risk'   → buildSecurityRiskDiff() → fallback → buildNhiDiff()
  checkId == 'l4-ast-missing-...' → buildErrorHandlingDiff() try/catch wrap
  checkId starts 'l3-banned-'     → buildBannedDepDiff()    Remove dep line
```

### Builder 1: Bare LLM (`buildBareLlmDiff`)

Оборачивает bare LLM calls с `complior()` из `@complior/sdk`.

**SDK Constructors:** `Anthropic | OpenAI | GoogleGenerativeAI | Groq | Ollama | BedrockRuntimeClient | Cohere | MistralClient`
**Call Patterns:** `messages.create | chat.completions.create | chat.complete | chat | generateContent | invoke | images.generate | embeddings.create | send`
**Standalone:** `generateText | streamText | generateObject` (Vercel AI SDK)

```diff
- const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
+ import { complior } from '@complior/sdk';
+ const client = complior(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
```

Handles: multi-line constructors (paren depth tracking), backward search from call-site to constructor, forward scan from import line, standalone function calls.

### Builder 2: NHI Secrets (`buildNhiDiff`)

Заменяет hardcoded секреты на env vars. Определяет язык по расширению файла.

**Patterns:** `const X = 'secret'` (TS_ASSIGN), `X = "secret"` (PY_ASSIGN), `key: 'secret'` (OBJ_PROP), connection strings (mongodb/postgres/mysql/redis)

```diff
- const API_KEY = 'sk-1234567890abcdef';
+ const API_KEY = process.env.API_KEY ?? '';
```
```diff
- API_KEY = "sk-1234567890abcdef"
+ API_KEY = os.environ.get('API_KEY', '')
+ import os
```

Skips: private keys (`-----BEGIN PRIVATE KEY-----`), lines already using `process.env` / `os.environ`.

### Builder 3: Security Risk (`buildSecurityRiskDiff`)

12 паттерн-специфичных замен с fallback на NHI builder для hardcoded secrets.

| Паттерн | Замена | Import |
|---------|--------|--------|
| `eval(expr)` | `/* COMPLIOR: eval() disabled */ undefined` | — |
| `new Function(...)` | `/* COMPLIOR: new Function() disabled */ undefined` | — |
| `vm.runInNewContext(...)` | `/* COMPLIOR: vm execution disabled */ undefined` | — |
| `pickle.load(f)` | `json.load(f)` | `import json` |
| `pickle.loads(d)` | `json.loads(d)` | `import json` |
| `hashlib.md5()` | `hashlib.sha256()` | — |
| `hashlib.sha1()` | `hashlib.sha256()` | — |
| `verify=False` | `verify=True` | — |
| `rejectUnauthorized: false` | `rejectUnauthorized: true` | — |
| `shell=True` | `shell=False` | — |
| `os.system(cmd)` | `subprocess.run(cmd.split(), check=True)` | `import subprocess` |
| `torch.load(x)` | `torch.load(x, weights_only=True)` | — |

### Builder 4: Error Handling (`buildErrorHandlingDiff`)

Оборачивает LLM-вызовы в try/catch (TS) или try/except (Python). Поддерживает multi-line statements через `findStatementEnd()`.

```diff
- const r = await client.messages.create({ model: "claude-3" });
+ try {
+   const r = await client.messages.create({ model: "claude-3" });
+ } catch (err) {
+   console.error('LLM call failed:', err);
+   throw err;
+ }
```

### Builder 5: Banned Dependencies (`buildBannedDepDiff`)

Удаляет запрещённые зависимости из package.json / requirements.txt. Обрабатывает trailing comma cleanup.

```diff
-     "emotion-recognition": "^1.0.0",
```

### Import Injection Logic

When `fix_diff.import_line` is set (implemented in both TS engine and Rust CLI):
1. Scan file for existing `import ` lines
2. If import already present → skip
3. Insert after last import line (or at line 1 if no imports)
4. Bottom-up splice sorting in `fix-service.ts` prevents line-shift corruption when multiple splices affect the same file

---

## Архитектура Fix Service

### Domain Layer (Чистая бизнес-логика)

```
engine/core/src/domain/fixer/
├── types.ts           FixPlan, FixResult, FixValidation, FixHistory, FixStrategy, FixType
├── create-fixer.ts    Factory: createFixer(deps) → { generateFix, generateFixes, previewFix }
├── strategies.ts      18 strategy functions + STRATEGIES registry
├── diff.ts            generateUnifiedDiff(), generateCreateDiff()
└── fix-history.ts     FixHistoryEntry helpers
```

**Strategy Registry:** Упорядоченный массив. Первая подходящая стратегия побеждает. `documentationStrategy` — catch-all для obligation-based шаблонов.

```typescript
const STRATEGIES: readonly FixStrategy[] = [
  // Группа A — L4 Code Fixes (6 стратегий)
  sdkWrapperStrategy,        // l4-bare-llm → @complior/sdk wrapper
  permissionGuardStrategy,   // l4-human-oversight → human approval gate
  killSwitchStrategy,        // l4-kill-switch → env var + emergency shutdown
  errorHandlerStrategy,      // l4-security-risk | l4-ast-missing-error-handling → error handler
  hitlGateStrategy,          // l4-conformity-assessment → conformity checklist
  dataGovernanceStrategy,    // l4-data-governance → validation + PII detection

  // Группа B — NHI + External (2 стратегии)
  secretRotationStrategy,    // l4-nhi-* → .gitignore + .env.example
  banditFixStrategy,         // ext-bandit-* → security remediation plan

  // Группа C — L3 Config & Dependencies (4 стратегии)
  cveUpgradeStrategy,        // l3-dep-vuln → upgrade plan (dependency_fix)
  licenseFixStrategy,        // l3-dep-license → license review (dependency_fix)
  ciComplianceStrategy,      // l3-ci-compliance → GitHub Actions workflow
  biasTestingStrategy,       // l3-missing-bias-testing → fairness config

  // Группа D — Cross-Layer (1 стратегия)
  docCodeSyncStrategy,       // cross-doc-code-mismatch → sync report

  // Оригинальные 5 стратегий
  disclosureStrategy,        // ai-disclosure → component/middleware
  contentMarkingStrategy,    // content-marking → C2PA config
  loggingStrategy,           // interaction-logging → logger module
  metadataStrategy,          // compliance-metadata → .well-known/
  documentationStrategy,     // catch-all: obligation → template (14 типов)
];
```

### Service Layer (Оркестрация)

```
engine/core/src/services/fix-service.ts
  FixServiceDeps:
    fixer           → domain fixer (strategy execution)
    scanService     → re-scan after apply
    events          → emit score.updated, fix.validated
    getProjectPath  → current project
    getLastScanResult → cached scan for preview
    loadTemplate    → disk template loader
    undoService?    → optional undo recording
    evidenceStore?  → optional evidence chain
    passportService? → optional passport for doc pre-fill
    llm?            → optional LLM for doc enrichment
```

### HTTP Layer (Тонкие маршруты)

```
engine/core/src/http/routes/fix.route.ts
  7 endpoints, all delegate to FixService
  Request validation via Zod schemas
  Error handling returns structured error JSON
```

### CLI Layer (Rust — Headless)

```
cli/src/headless/fix.rs
  run_headless_fix(dry_run, json, path, config, use_ai) → exit code
  - Dry-run: GET /fix/preview → display table
  - Apply: POST /fix/apply-all → display results + score delta
  - JSON mode: structured output for CI/CD
```

### TUI Layer (Rust — Interactive)

```
cli/src/views/fix/
├── mod.rs            FixViewState, FixableItem, FixItemStatus
├── render.rs         Multi-fix checklist + single-fix detail
├── diff_preview.rs   Type-aware diff rendering (A/B/C)
├── apply.rs          Real filesystem modification + stale protection
└── tests.rs          8 snapshot tests
```

---

## Поток применения фиксов

### Полный цикл (TUI)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCAN VIEW — user sees findings with fix indicators           │
│    "✖ CRITICAL Art.50 · AI Disclosure missing"                  │
│    User presses: f (fix this) or Tab → Fix page                │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 2. FIX VIEW — checklist of all fixable findings                 │
│                                                                 │
│    STAGED                                                       │
│    ☑ [A] ai-disclosure     Art. 50(1)   +7 pts                 │
│    ☑ [B] fria              Art. 27      +8 pts                 │
│                                                                 │
│    NOT STAGED                                                   │
│    ☐ [C] compliance-metadata Art. 50    +4 pts                 │
│                                                                 │
│    Score: 32 → 47 (+15) | 2/3 selected                        │
│                                                                 │
│    [Right panel: type-aware diff preview]                       │
│                                                                 │
│    User presses: Enter (apply selected)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │ AppCommand::ApplyFixes
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. APPLY — per-finding execution                                │
│                                                                 │
│    For each selected finding:                                   │
│    a. Backup original file → .complior/backups/{ts}-{name}     │
│    b. apply_fix_to_file():                                      │
│       ├─ Type A/C: read → validate before-lines → splice       │
│       │            after-lines → inject import → write          │
│       └─ Type B: infer_doc_path() → create dirs → write        │
│    c. Update FixItemStatus (Applied | Failed)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │ AppCommand::AutoScan (spawned)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. VALIDATE — automatic re-scan + score comparison              │
│                                                                 │
│    ScanService.scan(projectPath)                                │
│    Compare: pre_fix_score → post_fix_score                      │
│    Show toast: "Fix verified: 32 → 47 (+15)"                   │
│                                                                 │
│    Evidence chain: append fix.applied + fix.validated           │
│    Undo history: record in .complior/fixes-history.json         │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 5. RESULTS SCREEN — visual confirmation                         │
│                                                                 │
│    Before  [████░░░░░░░░░░░░] 32/100                           │
│    After   [██████████░░░░░░] 47/100  (+15 points)             │
│                                                                 │
│    Zone: YELLOW (partial compliance)                            │
│    Next: fix 2 remaining high-severity issues to reach 60+     │
└─────────────────────────────────────────────────────────────────┘
```

### Полный цикл (CLI — Headless)

```
$ complior fix --dry-run
  Scanning project...
  Found 5 fixable findings (9 total findings)

  CHECK ID              TYPE    ARTICLE    SCORE IMPACT
  ai-disclosure         [A]     Art. 50(1) +7
  fria                  [B]     Art. 27    +8
  risk-management       [B]     Art. 9     +8
  compliance-metadata   [C]     Art. 50    +4
  interaction-logging   [A]     Art. 12    +5

  Predicted: 32 → 64 (+32 points)

$ complior fix
  Applying 5 fixes...
  ✓ ai-disclosure         → src/components/AIDisclosure.tsx (created)
  ✓ fria                  → .complior/docs/fria.md (created)
  ✓ risk-management       → .complior/docs/risk-management.md (created)
  ✓ compliance-metadata   → .well-known/ai-compliance.json (created)
  ✓ interaction-logging   → src/logging/ai-interaction-logger.ts (created)

  Score: 32 → 61 (+29 actual)
  5/5 applied, 0 failed
```

### Полный цикл (HTTP API)

```
GET /fix/preview
→ { fixes: [...FixPlan], count: 5 }

POST /fix/apply { checkId: "ai-disclosure", useAi: false }
→ { plan: FixPlan, applied: true, scoreBefore: 32, scoreAfter: 39, backedUpFiles: [...] }

POST /fix/apply-all { useAi: true }
→ { results: [...FixResult], summary: { total: 5, applied: 5, failed: 0, scoreBefore: 32, scoreAfter: 61 } }

POST /fix/undo { id: 3 }
→ { validation: { checkId: "fria", before: "pass", after: "fail", scoreDelta: -8, totalScore: 53 } }
```

---

## Механизмы безопасности

### Защита от устаревших diff

Перед применением любого code fix, валидирует что файл не изменился с момента сканирования. Реализовано в **обоих** рантаймах:

**Rust CLI** (`cli/src/views/fix/apply.rs`):
```rust
let file_slice: Vec<&str> = lines[start..end].iter().map(|s| s.trim()).collect();
let expected: Vec<&str> = diff.before.iter().map(|s| s.trim()).collect();
if file_slice != expected {
    return ApplyResult { success: false, detail: "File content changed since scan — re-scan first" }
}
```

**TS Engine** (`services/fix-service.ts`, splice branch):
```typescript
for (let i = 0; i < beforeLines.length; i++) {
  if ((lines[startIdx + i] ?? '').trim() !== (beforeLines[i] ?? '').trim()) {
    throw new Error(`Stale diff at line ${(action.startLine ?? 1) + i} — re-scan first`);
  }
}
```

При ошибке валидации фикс отклоняется — нужен re-scan для свежих diff.

### Бэкап файлов

Каждый файл, затронутый фиксом, бэкапится перед модификацией:

```
.complior/backups/
  1710756234-src_components_AIDisclosure.tsx
  1710756234-well-known_ai-compliance.json
```

Бэкапы используются undo service для восстановления файлов в состояние до фикса.

### Валидация после применения

После каждого фикса запускается полный re-scan и сравнивает:
- **Статус finding:** `fail` → `pass` (ожидается), или всё ещё `fail` (фикс недостаточен)
- **Score delta:** `scoreAfter - scoreBefore` (должен быть положительным)
- **Side effects:** нет новых findings

Эмитируемые события:
- `score.updated` — { before, after }
- `fix.validated` — { checkId, passed: bool, scoreDelta }

### Стек отката (Undo)

Все фиксы записываются в `.complior/fixes-history.json`:

```json
{
  "fixes": [
    {
      "id": 1,
      "checkId": "ai-disclosure",
      "obligationId": "eu-ai-act-OBL-015",
      "fixType": "code_injection",
      "status": "applied",
      "timestamp": "2026-03-18T12:00:00Z",
      "files": [
        { "path": "src/components/AIDisclosure.tsx", "action": "create", "backupPath": "..." }
      ],
      "scoreBefore": 32,
      "scoreAfter": 39
    }
  ]
}
```

Логика undo:
- **Созданные файлы (`create`):** Удалить файл
- **Отредактированные файлы (`edit` / `splice`):** Восстановить из бэкапа
- Пометить запись как `"status": "undone"`
- Re-scan и emit events

### Интеграция Evidence Chain (C.R20)

После успешного фикса добавляется запись в evidence:

```json
{
  "event_type": "fix",
  "check_id": "ai-disclosure",
  "source": "fix",
  "detail": { "file": "src/components/AIDisclosure.tsx" },
  "timestamp": "2026-03-18T12:00:00.000Z",
  "hash": "sha256:...",
  "chain_prev": "sha256:...",
  "signature": "ed25519:..."
}
```

Это создаёт tamper-proof audit trail, который аудитор EU AI Act может верифицировать.

---

## Type-Aware Diff Рендеринг (TUI)

TUI Fix page рендерит diff preview по-разному в зависимости от типа finding:

### Type A — Code Fix

```
┌─ Current Code ───────────────────────────────────────────┐
│  Line 15:                                                │
│    const client = new OpenAI({                           │
│      apiKey: process.env.OPENAI_API_KEY                  │
│    });                                                   │
├─ Suggested Fix ──────────────────────────────────────────┤
│  - const client = new OpenAI({                           │
│  + const client = complior(new OpenAI({                  │
│      apiKey: process.env.OPENAI_API_KEY                  │
│  - });                                                   │
│  + }));                                                  │
├─ Add Import ─────────────────────────────────────────────┤
│  + import { complior } from '@complior/sdk';             │
└──────────────────────────────────────────────────────────┘
```

### Type B — New Document

```
┌─ CREATE docs/fria.md ────────────────────────────────────┐
│  (file does not exist yet)                               │
├─ Proposed Content ───────────────────────────────────────┤
│  # Fundamental Rights Impact Assessment                  │
│                                                          │
│  ## 1. AI System Description                             │
│  **System Name:** My AI Chatbot                          │
│  **Provider:** Acme Corp                                 │
│  **Risk Class:** High-Risk                               │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### Type C — Config Change

```
┌─ MODIFY .well-known/ai-compliance.json ──────────────────┐
├─ Proposed Changes ───────────────────────────────────────┤
│  {                                                       │
│    "version": "1.0",                                     │
│    "scanner": "complior/0.9.0",                          │
│    "ai_systems": [{                                      │
│      "name": "[TO BE SET]",                              │
│      "risk_level": "[TO BE SET]"                         │
│    }]                                                    │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Модель влияния на скор

### Влияние по стратегиям

| Стратегия | Скор | Типичная реальная дельта | Почему разница |
|-----------|------|-------------------------|----------------|
| Documentation (любой) | +8 прогноз | +6 до +10 факт | Зависит от L2 валидации |
| Disclosure | +7 прогноз | +5 до +9 факт | Может разрешить cross-layer findings |
| SDK Wrapper | +6 прогноз | +4 до +8 факт | Зависит от кол-ва bare LLM calls |
| Permission Guard / Kill Switch / HITL | +5 прогноз | +3 до +7 факт | Зависит от risk level проекта |
| Secret Rotation | +6 прогноз | +5 до +7 факт | Зависит от типа секрета |
| Error Handler | +4 прогноз | +3 до +5 факт | Стабильный |
| CVE Upgrade | +5 прогноз | +3 до +7 факт | Зависит от severity CVE |
| Content Marking | +5 прогноз | +3 до +7 факт | Variable based on AI SDK detection |
| Interaction Logging | +5 прогноз | +4 до +6 факт | Стабильный |
| Compliance Metadata | +4 прогноз | +3 до +5 факт | Low-weight check |
| CI Compliance / Bias / License | +4 прогноз | +3 до +5 факт | Стабильный |

### Кумулятивный сценарий

```
Starting Score:          ~15/100 (RED zone, critical cap active)

Fix all docs (8 templates): +48 to +64 predicted
  + disclosure:            +7
  + logging:               +5
  + metadata:              +4
  + inline fixes (NHI, security, error-handling, banned-dep): lifts critical cap

Realistic outcome:       80-85/100 (RED → GREEN)
E2E verified (acme-ai-support): 15 → 85 after `complior fix` + `complior scan`
```

### Расчёт скора после фикса

Скор НЕ просто `old + sum(impacts)`. После фикса запускается полный re-scan:
1. The fixed finding typically becomes `pass`
2. This changes the pass/fail ratio in its category
3. Category score is recalculated with weights
4. Cross-layer findings may also resolve
5. Critical cap may be lifted (if all criticals resolved)
   Note: cap excludes L2, cross-layer, ext-*, low/info severity, and passport-presence findings

Это означает что реальная дельта может быть выше или ниже предсказанного `scoreImpact`.

---

## Матрица стратегий по слоям сканера

```
                      РЕАЛИЗОВАНО                                          ПЛАНИРУЕТСЯ
                      ────────────                                         ───────────
L1 Наличие файлов ─── disclosure (A), content-marking (C),                ───
                      logging (A), documentation × 14 (B),
                      metadata (C)

L2 Структура док. ─── documentation regen (B)                             ─── LLM section enrichment (B)

L3 Зависимости   ─── Inline: banned dep removal (A),                     ───
                      CVE upgrade plan (D), license review (D),
                      CI compliance workflow (C),
                      bias testing config (C)

L4 Паттерны кода ─── Inline: SDK wrapper (A), security-risk (A),         ─── rate limiter template (A)
                      error-handling try/catch (A)                             cybersecurity hardening (A)
                      Scaffold: permission guard (A), kill switch (A),
                      HITL gate (A), data governance (A)

NHI Секреты      ─── Inline: process.env / os.environ (A)                ───
                      Scaffold fallback: .gitignore + .env.example (C)

Кросс-слой       ─── doc-code sync report (B)                            ─── passport field update (E)

Deep (Tier 2)    ─── bandit-specific fixes (A)                            ─── model format conversion (D)
                      (B301/B603/B608/B105 + generic fallback)

L5 LLM           ─── (нет)                                               ─── LLM-suggested custom fix (A)
```

### По статьям EU AI Act → Покрытие фиксами

| Статья | Обязательство | Статус фикса | Стратегия |
|--------|--------------|-------------|-----------|
| Art. 4 | AI Literacy | ✅ Шаблон | documentation (ai-literacy) |
| Art. 5 | Запрещённые практики | ✅ Inline + ✅ Лицензии | `l3-banned-*` → inline удаление из manifest. `l3-dep-license` → license review |
| Art. 9 | Управление рисками | ✅ Шаблон | documentation (risk-management) |
| Art. 10 | Data Governance | ✅ Шаблон + ✅ Код + ✅ Конфиг | documentation + dataGovernanceStrategy + biasTestingStrategy |
| Art. 11 | Техническая документация | ✅ Шаблон + ✅ Sync | documentation + docCodeSyncStrategy |
| Art. 12 | Логирование | ✅ Код + Шаблон | loggingStrategy + monitoring template |
| Art. 13 | Инструкции для пользователя | ✅ Шаблон | documentation (instructions-for-use) |
| Art. 14 | Человеческий надзор | ✅ Код | permissionGuardStrategy + killSwitchStrategy |
| Art. 15 | Точность/Устойчивость | ✅ Inline + ✅ Зависимости | Inline: security-risk (12 паттернов), error-handling (try/catch), NHI (env vars) + cveUpgradeStrategy |
| Art. 17 | Управление качеством | ✅ Шаблон + ✅ CI | documentation (qms) + ciComplianceStrategy |
| Art. 19 | Оценка конформити | ✅ Код | hitlGateStrategy (чек-лист 8 пунктов) |
| Art. 26 | Мониторинг развёртывания | ✅ Шаблон | documentation (monitoring-policy) |
| Art. 26(7) | Уведомление работников | ✅ Шаблон | documentation (worker-notification) |
| Art. 27 | FRIA | ✅ Шаблон + FRIA gen | documentation + agent fria command |
| Art. 47 | Декларация конформити | ✅ Шаблон | documentation (declaration) |
| Art. 49 | Agent Passport | ✅ Паспорт | complior agent init |
| Art. 50 | Прозрачность | ✅ Код + Конфиг | disclosure + metadata + sdkWrapperStrategy |
| Art. 51-53 | GPAI Прозрачность | ✅ Шаблон | documentation (model-card) |
| Art. 55 | GPAI Системный риск | ✅ Шаблон | documentation (systemic-risk) |
| Art. 72 | Пост-маркет мониторинг | ✅ Шаблон | documentation (monitoring) |
| Art. 73 | Отчёт об инцидентах | ✅ Шаблон | documentation (incident-report) |

---

## Пайплайн генерации документов (детали)

Генератор документов — трёхстадийный пайплайн, превращающий пустые шаблоны в проектно-специфичные compliance-документы.

### Stage 1: Template Loading

**Source:** `engine/core/data/templates/eu-ai-act/`

14 markdown templates with standardized placeholder format:

```markdown
# Fundamental Rights Impact Assessment

## 1. AI System Description
**System Name:** [AI System Name]
**Provider:** [Company Name]
**Risk Classification:** [Risk Class]
**Date:** [Date]

## 2. Impact Analysis
[MANUAL: Describe potential impacts on fundamental rights]

## 3. Mitigation Measures
[MANUAL: List specific mitigation measures]
```

### Stage 2: Passport Pre-fill (Deterministic)

**File:** `engine/core/src/domain/documents/document-generator.ts`

22+ placeholder-to-passport-field mappings:

| Placeholder | Passport Field | Example |
|-------------|---------------|---------|
| `[Company Name]` | `organization` | "Acme Corp" |
| `[AI System Name]` | `name` | "Customer Support Bot" |
| `[Provider]` | `provider` | "OpenAI GPT-4" |
| `[Risk Class]` | `risk_class` | "High-Risk" |
| `[Model ID]` | `model_id` | "gpt-4-turbo-2024-04-09" |
| `[Version]` | `version` | "2.1.0" |
| `[Description]` | `description` | "AI-powered customer support..." |
| `[Date]` | (computed) | "2026-03-18" |

**Tracking:**
- `prefilledFields[]` — successfully replaced from passport
- `manualFields[]` — require human input (e.g., risk assessment details)

### Stage 3: LLM Enrichment (opt-in)

**File:** `engine/core/src/domain/documents/ai-enricher.ts`

When `--ai` flag is set:
1. Identify remaining `[MANUAL: ...]` and unfilled `[TO BE SET]` sections
2. Build prompt with passport context + document type requirements
3. LLM generates substantive content for unfilled sections
4. Safety: legal assertions marked `[REVIEW REQUIRED]`
5. Fallback: base document returned if LLM fails

**Cost:** ~$0.02-0.05 per document (one LLM call per document)

---

## Реализованные улучшения (13 из 13 → DONE)

Все 13 запланированных стратегий реализованы в S10. Дата: 2026-03-19.

### Фаза 1 — Продвинутые фиксы кода ✅

| # | Стратегия | Кат. | Check ID | Что генерирует |
|---|-----------|------|----------|----------------|
| 1 | SDK Wrapper | A | `l4-bare-llm` | `complior(client)` обёртка через `@complior/sdk`. React → hook, Express → middleware, generic → wrapper |
| 2 | Permission Guard | A | `l4-human-oversight` | Approval gate: очередь, таймаут (5мин), risk-level thresholds, approve/reject |
| 3 | Kill Switch | A | `l4-kill-switch` | `AI_KILL_SWITCH` env var, `isAiEnabled()`, `emergencyShutdown()`, `withKillSwitch()` |
| 4 | Error Handler | A | `l4-security-risk` / `l4-ast-missing-error-handling` | Async try-catch обёртка, typed error log, safe fallback |
| 5 | HITL Gate | A | `l4-conformity-assessment` | Чек-лист: 8 пунктов (Art.9-15 + sign-off), `ConformityStatus`, `signOff()`, `isConformityComplete()` |
| 6 | Data Governance | A | `l4-data-governance` | Middleware: input validation, PII detection (email/SSN/CC), data quality report |

### Фаза 2 — Конфиг + Зависимости ✅

| # | Стратегия | Кат. | Check ID | Что генерирует |
|---|-----------|------|----------|----------------|
| 7 | Secret Rotation | C | `l4-nhi-*` | `.gitignore` (секреты) + `.env.example` с vault-ссылками. Авто-извлечение: `l4-nhi-openai-key` → `OPENAI_API_KEY` |
| 8 | CVE Upgrade | D | `l3-dep-vuln` | `complior-upgrade-plan.md` — summary + команды npm/pip/cargo + checklist |
| 9 | License Fix | D | `l3-dep-license` | `complior-license-review.md` — матрица лицензий + action items + audit команды |
| 10 | CI Compliance | C | `l3-ci-compliance` | `.github/workflows/compliance-check.yml` — checkout → setup-node → complior scan → SARIF upload |
| 11 | Bias Testing | C | `l3-missing-bias-testing` | `bias-testing.config.json` — protected attributes, fairness metrics, thresholds |

### Фаза 3 — Интеллектуальные фиксы ✅

| # | Стратегия | Кат. | Check ID | Что генерирует |
|---|-----------|------|----------|----------------|
| 12 | Bandit Fix | A | `ext-bandit-*` | Remediation план: B301→json, B603→subprocess.run(list), B608→parameterized, B105→env var + generic fallback |
| 13 | Doc-Code Sync | B | `cross-doc-code-mismatch` | `complior-doc-sync-report.md` — мисматчи + чек-лист + `complior docs generate --missing` |

### Оставшееся (Future)

| # | Стратегия | Кат. | Что будет генерировать |
|---|-----------|------|----------------------|
| 14 | LLM-Suggested | A | Кастомный фикс из LLM-анализа L5 finding |
| 15 | Rate Limiter | A | Rate limiter template для cybersecurity |
| 16 | Model Format | D | Конвертация pickle → safetensors manifest |
| 17 | Multi-File Refactoring | A | Split file + update imports |
| 18 | Test Generation | A | Compliance test для каждого фикса |

---

## Расположение файлов

### TypeScript Engine

| Файл | Роль | LOC |
|------|------|-----|
| `engine/core/src/domain/fixer/types.ts` | Типы (FixPlan, FixResult, FixType и др.) | ~83 |
| `engine/core/src/domain/fixer/create-fixer.ts` | Фабрика fixer | ~40 |
| `engine/core/src/domain/fixer/strategies.ts` | 18 стратегий + реестр STRATEGIES[] | ~1070 |
| `engine/core/src/domain/fixer/diff.ts` | Diff generation utilities | ~50 |
| `engine/core/src/domain/fixer/fix-history.ts` | Fix history helpers | ~20 |
| `engine/core/src/domain/scanner/fix-diff-builder.ts` | 5-type inline diff builder (bare-llm, NHI, security, error-handling, banned-dep) | ~655 |
| `engine/core/src/domain/documents/document-generator.ts` | Deterministic doc generation | ~200 |
| `engine/core/src/domain/documents/ai-enricher.ts` | LLM document enrichment | ~80 |
| `engine/core/src/data/template-registry.ts` | 14 template entries (SSoT) | ~100 |
| `engine/core/src/services/fix-service.ts` | Fix orchestration service | ~230 |
| `engine/core/src/services/undo-service.ts` | Fix undo with file restore | ~120 |
| `engine/core/src/http/routes/fix.route.ts` | 7 HTTP endpoints | ~100 |

### Rust CLI

| Файл | Роль | LOC |
|------|------|-----|
| `cli/src/headless/fix.rs` | Headless fix (dry-run + apply) | ~180 |
| `cli/src/views/fix/mod.rs` | Fix view state + logic | ~200 |
| `cli/src/views/fix/render.rs` | Multi/single-fix rendering | ~300 |
| `cli/src/views/fix/diff_preview.rs` | Type-aware diff rendering | ~250 |
| `cli/src/views/fix/apply.rs` | Real filesystem modification | ~150 |
| `cli/src/views/fix/tests.rs` | 8 snapshot тестов | ~200 |
| `cli/src/app/executor.rs` | AppCommand::ApplyFixes handler | ~50 |
| `cli/src/types/engine.rs` | FixDiff, FindingType types | ~30 |

---

## Тестирование

### Тесты Engine

| Файл | Тестов | Что покрывает |
|------|--------|--------------|
| `domain/fixer/fixer.test.ts` | 43 | Выбор стратегий (все 18), генерация планов, inline fix (NHI/security/error/banned), edge cases |
| `domain/scanner/fix-diff-builder.test.ts` | 38 | 5 builder-функций: bare-llm (8), NHI (7), security (12), error-handling (4), banned-dep (4), context (1) |
| `services/fix-service.test.ts` | ~15 | Apply, validate, undo, evidence recording |
| `domain/documents/document-generator.test.ts` | ~10 | Template pre-fill, manual field tracking |
| `services/undo-service.test.ts` | 3 | Undo history load/save, dependency_fix FixType |

### Тесты CLI (Rust)

| Файл | Тестов | Что покрывает |
|------|--------|--------------|
| `views/fix/tests.rs` | 8 | Snapshot тесты: checklist, single-fix, diff preview |
| `headless/tests.rs` | ~5 | Формат вывода headless fix |

### Недостающее покрытие (Планируется)

- Stale diff protection edge cases
- Multi-file fix atomicity
- Undo with concurrent scan
- LLM enrichment fallback paths
- Import injection with various import styles
