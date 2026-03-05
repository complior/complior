# Sprint S04 — Agent Governance + Certification

**Версия:** 1.0.0
**Дата:** 2026-02-27
**Статус:** Planning

---

## Обзор

Второй спринт v8. Расширяет Agent Passport экосистему: governance tools, certification readiness, export/interop, industry-specific checks. Соответствует S05 из PRODUCT-BACKLOG.md.

**Цель:** Passport Export, AIUC-1 Readiness, Permission Scanner, Industry Checks, Worker Notification.

---

## User Stories

### US-S04-01: AIUC-1 Readiness Score
**Приоритет:** CRITICAL
**Backlog:** C.T01

Как разработчик, я хочу проверить готовность к AIUC-1 сертификации, чтобы знать gap до certification.

**Acceptance Criteria:**
- [ ] `complior cert:readiness` — computes readiness score
- [ ] Checks against AIUC-1 requirements
- [ ] Gap analysis: что нужно для certification
- [ ] Score display в TUI

---

### US-S04-02: Adversarial Test Runner
**Приоритет:** CRITICAL
**Backlog:** C.T02

Как разработчик, я хочу запустить adversarial tests против AI-системы, чтобы выполнить Art.9(6)-(8) testing requirements.

**Acceptance Criteria:**
- [ ] `complior cert:test --adversarial` — runs test suite
- [ ] Prompt injection tests
- [ ] Bias detection tests
- [ ] Safety boundary tests
- [ ] Results → evidence chain

---

### US-S04-03: Passport Export Hub
**Приоритет:** HIGH
**Backlog:** C.S08

Как разработчик, я хочу экспортировать passport в A2A/AIUC-1/NIST формат, чтобы интегрироваться с другими системами.

**Acceptance Criteria:**
- [ ] `complior agent:export --format a2a` → Google Agent Card JSON
- [ ] `complior agent:export --format aiuc-1` → AIUC-1 compliance profile
- [ ] `complior agent:export --format nist` → NIST AI RMF profile
- [ ] Mapping: 36 passport fields → target format fields

---

### US-S04-04: Agent Permission Scanner
**Приоритет:** HIGH
**Backlog:** C.S03

Как разработчик, я хочу сканировать фактические permissions агента из кода, чтобы сравнить с declared permissions в passport.

**Acceptance Criteria:**
- [ ] AST-based permission discovery: tool definitions, API calls, data access
- [ ] Comparison: discovered vs declared в passport
- [ ] Alert: undeclared permissions found
- [ ] Output: permission diff report

---

### US-S04-05: Industry-Specific Scanner Patterns
**Приоритет:** HIGH
**Backlog:** C.012+

Как разработчик в regulated industry (HR/Finance/Healthcare/Education), я хочу чтобы scanner обнаруживал отраслевые risk patterns, чтобы получить точную классификацию.

**Acceptance Criteria:**
- [ ] HR patterns: recruitment AI, employee monitoring, CV screening
- [ ] Finance patterns: credit scoring, insurance, fraud detection
- [ ] Healthcare patterns: medical device, health data processing
- [ ] Education patterns: admissions, grading, student monitoring
- [ ] Auto-update passport `industry_context` + `industry_specific_obligations`

---

### US-S04-06: Worker Notification Generator
**Приоритет:** HIGH
**Backlog:** C.D02

Как deployer, я хочу сгенерировать Worker Notification letter (Art.26(7)), чтобы уведомить работников об использовании AI.

**Acceptance Criteria:**
- [ ] `complior notify:generate` — generates notification template
- [ ] Pre-filled из passport: system name, data used, purpose, how to object
- [ ] Output: `.complior/reports/worker-notification-{agent-id}.md`
- [ ] Updates passport: `worker_notification_sent: true`

---

### US-S04-07: Agent Registry + Score
**Приоритет:** HIGH
**Backlog:** C.F13, C.F14

Как разработчик, я хочу видеть все AI-агенты в registry с per-agent compliance scores, чтобы управлять fleet.

**Acceptance Criteria:**
- [ ] `complior agent:list` — formatted registry output
- [ ] Per-agent: compliance score, autonomy level, last scan, completeness
- [ ] TUI: agent list in Passport page
- [ ] Filter/sort by risk, score, completeness

---

### US-S04-08: Runtime SDK Full Suite
**Приоритет:** HIGH
**Backlog:** C.R01-R09, C.R11

Как разработчик, я хочу полный набор runtime middleware, чтобы compliance enforcement работал в production.

**Acceptance Criteria:**
- [ ] AI Response Wrapper (C.R01)
- [ ] Disclosure Injection (C.R02)
- [ ] Content Marking Engine (C.R03)
- [ ] Interaction Logger (C.R04)
- [ ] Compliance Proxy config (C.R06)
- [ ] Output Safety Filter (C.R07)
- [ ] Human-in-the-Loop Gate (C.R08)
- [ ] SDK Adapters (C.R09): OpenAI, Anthropic, Google, Vercel AI, custom
- [ ] Audit Trail local (C.R11)

---

### US-S04-09: Supply Chain Audit + Model Cards
**Приоритет:** MEDIUM
**Backlog:** C.E06, C.E07

Как разработчик, я хочу аудировать supply chain зависимостей и получить model compliance cards.

**Acceptance Criteria:**
- [ ] Dependency chain analysis: AI SDK → model → provider
- [ ] Risk propagation: banned package in dependency = flag
- [ ] Model Compliance Cards: per-model transparency info

---

### US-S04-10: TUI Timeline Page
**Приоритет:** HIGH

Как разработчик, я хочу видеть visual timeline до Aug 2 с critical path, чтобы планировать compliance work.

**Acceptance Criteria:**
- [ ] Hotkey `T` → Timeline page
- [ ] Visual timeline: today → Aug 2, 2026
- [ ] Critical path: FRIA, EU DB registration, SDK integration, certification
- [ ] Effort estimates per milestone
- [ ] Warning при missed deadlines

---

### US-S04-11: Scanner — Context-Aware Banned Packages
**Приоритет:** HIGH
**Backlog:** Scanner Improvement #1

Как разработчик, я хочу чтобы banned packages учитывали domain context, чтобы не получать false positives на Art.5 в легитимных use cases.

**Acceptance Criteria:**
- [ ] Split banned packages: Category B (real, context-dependent → HIGH) vs Category C (preventive, CRITICAL)
- [ ] Domain context: emotion recognition in HR = CRITICAL, in medical = exception (Art.5(1)(f))
- [ ] Remove non-existent packages from "checked" count (no false coverage impression)

---

### US-S04-12: Scanner — Severity-Weighted Scoring
**Приоритет:** HIGH
**Backlog:** Scanner Improvement #3

Как разработчик, я хочу чтобы score учитывал severity findings, чтобы 3 HIGH fails не выглядели как 50%.

**Acceptance Criteria:**
- [ ] Penalty-based scoring: CRITICAL -25, HIGH -8, MEDIUM -4, LOW -1
- [ ] Critical cap at 40 preserved
- [ ] Recalibration testing

---

### US-S04-13: Scanner — Domain Detection
**Приоритет:** MEDIUM
**Backlog:** Scanner Improvement #5

Как разработчик в regulated industry, я хочу чтобы scanner определял domain из dependencies и кода.

**Acceptance Criteria:**
- [ ] Domain detection heuristic in L3: packages + code patterns → employment/finance/healthcare/education
- [ ] Impact on severity, required checks, banned package context
- [ ] Auto-update passport `industry_context`

---

### US-S04-14: Scanner — Prioritized File Scanning
**Приоритет:** LOW
**Backlog:** Scanner Improvement #6

Как разработчик в monorepo, я хочу чтобы AI-relevant файлы сканировались в первую очередь.

**Acceptance Criteria:**
- [ ] Two-pass scan: Pass 1 fast discovery (HOT/WARM/COLD), Pass 2 prioritized deep scan
- [ ] AI-relevant code always scanned, even in 10,000-file monorepo

---

### US-S04-15: TUI Obligations Page — Per-Agent + Categories + Actions
**Приоритет:** HIGH

Как разработчик, я хочу видеть obligations привязанные к конкретному паспорту, сгруппированные по категориям, с действиями, чтобы понимать что нужно сделать для каждой AI-системы.

**Acceptance Criteria:**
- [ ] Per-agent filtering: выбор паспорта → только его obligations (по risk_class + role)
- [ ] Category breakdown с progress bars (Technical, Organizational, Transparency, Assessment, Documentation, Reporting, Monitoring, Registration, Training)
- [ ] Summary bar: "38/108 done (35%)" с общим progress bar
- [ ] Penalty display в detail panel (€15M / 3% и т.д.)
- [ ] Action links: `[g]` Generate FRIA, `[w]` Worker Notification — прямо из obligation
- [ ] "Affected systems" в detail panel — какие паспорта затронуты

**Дизайн-референс:** `docs/TUI-DESIGN-SPEC.md` секция 2.6 (PAGE 5: Obligations)

---

### US-S04-16: FRIA Structured JSON + SaaS Sync
**Приоритет:** HIGH
**Backlog:** C.D01, Sync

Как разработчик, я хочу чтобы `complior agent fria` генерировал structured JSON рядом с markdown и `complior sync` отправлял его в SaaS, чтобы FRIA данные были доступны в дашборде.

**Acceptance Criteria:**
- [ ] `complior agent fria <name>` генерирует `.md` и `.json` в `.complior/reports/`
- [ ] JSON содержит 6 секций (general_info, affected_persons, specific_risks, human_oversight, mitigation_measures, monitoring_plan) с pre-filled полями из manifest
- [ ] `complior sync` отправляет FRIA JSON на SaaS endpoint `POST /api/sync/fria`
- [ ] Пустые (manual) поля = пустые строки / пустые массивы
- [ ] Document sync ищет в `.complior/reports/` (не `docs/compliance/`)
- [ ] Markdown генерация не сломана — backward compatible
- [ ] Существующие тесты проходят

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| Passport Export: 3 formats | ✅ |
| AIUC-1 Readiness score | ✅ |
| Adversarial tests: 3+ categories | ✅ |
| Industry patterns: 4 sectors | ✅ |
| Worker Notification generates | ✅ |
| Runtime SDK: 9 middleware | ✅ |
| TUI Timeline page | ✅ |
| Scanner: context-aware banned packages | ✅ |
| Scanner: severity-weighted scoring | ✅ |
| Obligations page: per-agent + categories | ✅ |
| FRIA structured JSON + SaaS sync | ✅ |
| Tests passing | cargo test + vitest |

---

## Bugs (из ручного тестирования S03)

### BUG-01: `complior agent autonomy` не показывает имя агента
**Источник:** Ручное тестирование S03 (US-S03-03)
**Приоритет:** MEDIUM

Команда выводит агрегированный autonomy анализ без указания, к какому агенту он относится. В проекте с 7 агентами непонятно чей результат.

**Ожидание:** Показывать per-agent breakdown (все 7), либо принимать аргумент `complior agent autonomy <name>`.
**Файлы:** `cli/src/headless/agent.rs` (run_agent_autonomy), `engine/core/src/http/routes/agent.route.ts`

### BUG-02: `complior agent validate --verbose` не распознаёт флаг
**Источник:** Ручное тестирование S03 (US-S03-04, AC#5)
**Приоритет:** LOW

`--verbose` не зарегистрирован в clap для `agent validate`. Ошибка: `unexpected argument '--verbose' found`.

**Ожидание:** Per-field breakdown (какие поля заполнены, какие пустые) при `--verbose`.
**Файлы:** `cli/src/cli.rs` (AgentAction::Validate — добавить `verbose: bool`), `cli/src/headless/agent.rs` (run_agent_validate — передать флаг в engine)

### BUG-03: `complior agent evidence` — connection error при headless запуске
**Источник:** Ручное тестирование S03 (US-S03-07)
**Приоритет:** HIGH

Engine auto-launch на случайном порту завершается ошибкой соединения. Вероятно race condition (CLI обращается до готовности engine) или evidenceStore не инициализируется для проекта без существующего `chain.json`.

**Ожидание:** Summary с количеством evidence entries (passport events от init).
**Файлы:** `cli/src/headless/agent.rs` (run_agent_evidence), engine startup/health check timing

### BUG-04: Headless команды спорадически получают "Engine not running" при работающем daemon
**Источник:** Ручное тестирование S03 (US-S03-08)
**Приоритет:** HIGH

`complior agent fria` выдал "Engine not running" при работающем daemon. Другие команды (init, list, validate) в той же сессии работали. После перезапуска daemon — fria заработал. Вероятно связано с BUG-03 — engine auto-launch race condition или потеря соединения без reconnect.

**Ожидание:** Headless команды должны надёжно подключаться к running daemon, retry при transient errors.
**Файлы:** `cli/src/headless/agent.rs`, `cli/src/engine_client.rs` (health check / retry logic)

### BUG-05: Evidence chain раздувается до сотен МБ → crash scan
**Источник:** Ручное тестирование S03 (US-S03-07)
**Приоритет:** CRITICAL

`chain.json` вырос до 513 МБ → `JSON.stringify` падает с `RangeError: Invalid string length` → scan перестаёт работать. Причина: каждый scan кладёт ВСЕ findings как evidence entries, нет лимита на размер chain. При 47 findings × N сканов файл растёт экспоненциально.

**Исправления:**
1. Evidence append: записывать summary (score, count, checkIds), а не все findings целиком
2. Max entries limit (e.g. 10,000) с rotation/archiving старых
3. Append-only write (JSONL) вместо полной перезаписи JSON
4. Graceful fallback: если chain corrupted/oversized → reset с warning

**Файлы:** `engine/core/src/domain/scanner/evidence-store.ts` (saveChain, append), `engine/core/src/services/scan-service.ts` (что кладётся в evidence)

### BUG-08: `complior login` пытается открыть браузер на headless сервере
**Источник:** Ручное тестирование S3.5 (US-U01)
**Приоритет:** HIGH

`open` crate бессмысленна на удалённом сервере без GUI. Нужна модель как у Claude Code: показать полную кликабельную URL в терминале, пользователь открывает на своём компе, поллинг в фоне.

**Ожидание:**
```
To login, visit this URL in your browser:
  https://app.complior.ai/device?code=A8FBA0
Waiting for confirmation... (Ctrl+C to cancel)
```

**Файлы:** `cli/src/headless/login.rs` (run_login — убрать `open::that()`, показать URL), `cli/src/saas_client.rs` (device flow URL construction)

### BUG-07: Scan layers L1-L5 не имеют расшифровки в TUI
**Источник:** Ручное тестирование S03
**Приоритет:** LOW

Пользователь видит `[X]L1 [X]L2 [X]L3 [X]L4 [-]L5` без объяснения. Нужна расшифровка: `L1:Files L2:Docs L3:Deps L4:Code L5:AI` в header и/или legend по `?`.

**Файлы:** `cli/src/views/scan/mod.rs` (render scan header)

### BUG-06: TUI Passport page загружается >60 секунд / "No passports loaded" при наличии паспортов
**Источник:** Ручное тестирование S03 (US-S03-09)
**Приоритет:** HIGH

Passport page пуста, хотя `complior agent list` (headless) корректно показывает 7 агентов. Команда `LoadPassports` (при переходе на вкладку) либо не триггерится, либо engine не отвечает TUI-клиенту. Вероятно связано с BUG-03/BUG-04 — TUI engine connection нестабильна.

**Обновление:** Паспорта загрузились, но с задержкой >60 секунд. Не connection bug, а performance — engine вероятно запускает scan при каждом `/agent/list` запросе для `complior_score`. Нужен кэш или ленивая загрузка score.

**Ожидание:** Загрузка <2 секунд. Таблица с 7 агентами, completeness bars, j/k навигация, Enter→drill-down.
**Файлы:** `cli/src/app/actions.rs` (LoadPassports trigger), `cli/src/app/executor.rs` (LoadPassports handler), `engine/core/src/services/passport-service.ts` (listPassports — убрать sync scan или кэшировать)
