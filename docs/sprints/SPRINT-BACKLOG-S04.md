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
| Tests passing | cargo test + vitest |
