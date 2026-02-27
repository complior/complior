# Sprint S03 — Daemon Foundation + Agent Passport MVP

**Версия:** 1.0.0
**Дата:** 2026-02-27
**Статус:** Planning

---

## Обзор

Первый спринт v8 архитектуры. Закладывает фундамент daemon-модели и реализует MVP Agent Passport (Mode 1: Auto). Соответствует S04 из PRODUCT-BACKLOG.md (S03 в нумерации спринтов repo, т.к. S00-S02 — выполненные v6 спринты).

**Цель:** Daemon запускается, TUI подключается, Agent Passport генерируется автоматически.

---

## User Stories

### US-S03-01: Daemon Foundation
**Приоритет:** CRITICAL

Как разработчик, я хочу запустить `complior` и получить background daemon с file watcher, чтобы compliance monitoring работал в фоне.

**Acceptance Criteria:**
- [ ] `complior` запускает daemon (watcher + engine + HTTP) и подключает TUI
- [ ] `complior daemon --watch` запускает headless daemon
- [ ] Daemon записывает PID + port в `.complior/daemon.pid`
- [ ] Graceful shutdown при SIGTERM (cleanup PID file)
- [ ] TUI подключается к daemon через HTTP `/health`
- [ ] File watcher (chokidar) детектирует изменения → rescan

**Фичи:** Daemon lifecycle, PID management, engine-as-daemon mode

---

### US-S03-02: Agent Passport Mode 1 (Auto)
**Приоритет:** CRITICAL
**Backlog:** C.S01

Как разработчик, я хочу запустить `complior agent:init` и автоматически обнаружить AI-системы в коде, чтобы получить `agent-manifest.json` с 85-95% заполненных полей.

**Acceptance Criteria:**
- [ ] AST discovery для 5+ frameworks (LangChain, CrewAI, Anthropic, OpenAI, Vercel AI SDK)
- [ ] Auto-fill: framework, model, permissions, tools, human gates
- [ ] Interactive CLI wizard для: owner, disclosure text, review frequency
- [ ] Generates `.complior/agents/{name}-manifest.json`
- [ ] 36 полей passport format per JSON Schema
- [ ] Ed25519 signing при первом создании
- [ ] Keypair generation при первом использовании (`~/.config/complior/keys/`)

---

### US-S03-03: Autonomy Rating L1-L5
**Приоритет:** CRITICAL
**Backlog:** C.S02

Как разработчик, я хочу чтобы autonomy level автоматически определялся из кода, чтобы risk assessment был объективным.

**Acceptance Criteria:**
- [ ] Auto-rate L1-L5 из AST: human_gates, unsupervised_actions, logging presence
- [ ] L1: human decides + executes → L5: fully autonomous
- [ ] `autonomy_evidence` field в passport: `{human_approval_gates, unsupervised_actions, ...}`
- [ ] Override via CLI wizard (если auto-detection неверный)

---

### US-S03-04: Passport Validate
**Приоритет:** HIGH
**Backlog:** C.S07

Как разработчик, я хочу проверить completeness моего passport, чтобы знать какие поля не заполнены.

**Acceptance Criteria:**
- [ ] `complior agent:validate` — проверяет все passports
- [ ] Per-category completeness: Identity, Ownership, Autonomy, Constraints, Compliance
- [ ] Completeness %: (filled required fields / total required) × 100
- [ ] Gap list: какие obligations не покрыты
- [ ] `--verbose` флаг для per-field detail

---

### US-S03-05: Passport Completeness Score
**Приоритет:** HIGH
**Backlog:** C.S09

Как разработчик, я хочу видеть completeness score в TUI Passport page, чтобы отслеживать прогресс.

**Acceptance Criteria:**
- [ ] Completeness score отображается в TUI Passport page
- [ ] Per-agent completeness bar
- [ ] Color coding: <50% Red, 50-79% Amber, 80-99% Yellow, 100% Green

---

### US-S03-06: compliorAgent() SDK
**Приоритет:** CRITICAL
**Backlog:** C.R12

Как разработчик, я хочу обернуть LLM API call в `compliorAgent()`, чтобы runtime compliance enforcement работал автоматически.

**Acceptance Criteria:**
- [ ] `compliorAgent(client, config)` — proxy-based wrapping
- [ ] Loads passport → enforces permissions + budget + constraints
- [ ] Budget Controller (C.R13): rate limits, cost limits
- [ ] Circuit Breaker (C.R14): suspend on anomaly, Art.14(4)(b)
- [ ] 5 provider adapters: OpenAI, Anthropic, Google, Vercel AI, custom

---

### US-S03-07: Evidence Chain
**Приоритет:** CRITICAL
**Backlog:** C.R20

Как разработчик, я хочу чтобы каждый scan/fix/passport event записывался в evidence chain, чтобы иметь audit trail для регулятора.

**Acceptance Criteria:**
- [ ] Signed events: scan, fix, passport create/update, FRIA generation
- [ ] Hash chain: SHA-256(previous_hash + event_hash)
- [ ] Storage: `.complior/evidence/chain.json`
- [ ] `complior cert:evidence` → export for auditor
- [ ] Ed25519 signature per event

---

### US-S03-08: FRIA Generator
**Приоритет:** CRITICAL
**Backlog:** C.D01

Как разработчик high-risk AI-системы, я хочу сгенерировать FRIA (Art.27), чтобы выполнить обязательное требование.

**Acceptance Criteria:**
- [ ] `complior fria:generate` — generates FRIA document
- [ ] 80% pre-filled из passport: system identity, risk class, data access, autonomy, oversight
- [ ] Manual fields prompted: specific impact, mitigation, approval
- [ ] Output: `.complior/reports/fria-{agent-id}.md`
- [ ] Updates passport: `fria_completed: true, fria_date: ...`

---

### US-S03-09: TUI Passport Page
**Приоритет:** HIGH

Как разработчик, я хочу видеть все Agent Passports в TUI, чтобы управлять compliance моих AI-систем.

**Acceptance Criteria:**
- [ ] Hotkey `P` → Passport page
- [ ] List всех passports (CLI + SaaS)
- [ ] Per-agent: name, L-level, completeness %, last scan
- [ ] Detail panel: per-obligation checklist
- [ ] Actions: generate FRIA, export, validate

---

### US-S03-10: TUI Obligations Page
**Приоритет:** HIGH

Как разработчик, я хочу видеть 108 obligations и их coverage, чтобы понимать что нужно сделать.

**Acceptance Criteria:**
- [ ] Hotkey `O` → Obligations page
- [ ] 108 obligations с filter by role/risk/status
- [ ] Per-obligation: coverage status, linked features, action links
- [ ] Critical path highlighting

---

### US-S03-11: Scanner — Passport Awareness
**Приоритет:** HIGH
**Backlog:** Scanner Improvement #4

Как разработчик, я хочу чтобы scanner проверял наличие и completeness Agent Passport, чтобы compliance score отражал passport status.

**Acceptance Criteria:**
- [ ] L1 check: `passport-presence` — agent-manifest.json exists (HIGH for projects with AI SDK)
- [ ] L2 validator: `passport-completeness` — validate required fields per risk_class
- [ ] Cross-layer: `passport-code-mismatch` — declared vs actual permissions
- [ ] Completeness output: "Passport Completeness: 72% (26/36 fields)"

---

### US-S03-12: Scanner — Quick Fixes
**Приоритет:** MEDIUM
**Backlog:** Scanner Improvements #2, #7

Два quick-win улучшения сканера.

**Acceptance Criteria:**
- [ ] Exclude `*.test.ts`, `*.spec.ts`, `__tests__/` from L4 bare-llm checks (reduces noise ~15%)
- [ ] Fix layer weights: L1=1.00, L2=0.95, L3=0.90, L4=0.75, L5=0.70 (deterministic > probabilistic)
- [ ] Recalibration testing after weight change

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| Daemon запускается | ✅ |
| TUI подключается к daemon | ✅ |
| Agent:init обнаруживает 3+ frameworks | ✅ |
| Passport generated + signed | ✅ |
| Autonomy L1-L5 auto-rated | ✅ |
| Evidence chain functional | ✅ |
| FRIA generates from passport | ✅ |
| Scanner knows passport | ✅ |
| Tests passing | cargo test + vitest |
