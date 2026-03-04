# Sprint S03 — Daemon Foundation + Agent Passport MVP

**Версия:** 1.1.0
**Дата:** 2026-02-27 (planned) → 2026-03-04 (completed)
**Статус:** DONE (13/13 US)

---

## Обзор

Первый спринт v8 архитектуры. Закладывает фундамент daemon-модели и реализует MVP Agent Passport (Mode 1: Auto). Соответствует S04 из PRODUCT-BACKLOG.md (S03 в нумерации спринтов repo, т.к. S00-S02 — выполненные v6 спринты).

**Цель:** Daemon запускается, TUI подключается, Agent Passport генерируется автоматически.

---

## User Stories

### US-S03-01: Daemon Foundation ✅
**Приоритет:** CRITICAL
**Коммит:** `b3d4e85`

Как разработчик, я хочу запустить `complior` и получить background daemon с file watcher, чтобы compliance monitoring работал в фоне.

**Acceptance Criteria:**
- [x] `complior` запускает daemon (watcher + engine + HTTP) и подключает TUI
- [x] `complior daemon --watch` запускает headless daemon
- [x] Daemon записывает PID + port в `.complior/daemon.pid`
- [x] Graceful shutdown при SIGTERM (cleanup PID file)
- [x] TUI подключается к daemon через HTTP `/health`
- [x] File watcher (chokidar) детектирует изменения → rescan

**Фичи:** Daemon lifecycle, PID management, engine-as-daemon mode

---

### US-S03-02: Agent Passport Mode 1 (Auto) ✅
**Приоритет:** CRITICAL
**Backlog:** C.S01
**Коммит:** `79d3f6d`

Как разработчик, я хочу запустить `complior agent:init` и автоматически обнаружить AI-системы в коде, чтобы получить `agent-manifest.json` с 85-95% заполненных полей.

**Acceptance Criteria:**
- [x] AST discovery для 5+ frameworks (LangChain, CrewAI, Anthropic, OpenAI, Vercel AI SDK)
- [x] Auto-fill: framework, model, permissions, tools, human gates
- [x] Interactive CLI wizard для: owner, disclosure text, review frequency
- [x] Generates `.complior/agents/{name}-manifest.json`
- [x] 36 полей passport format per JSON Schema
- [x] Ed25519 signing при первом создании
- [x] Keypair generation при первом использовании (`~/.config/complior/keys/`)

---

### US-S03-03: Autonomy Rating L1-L5 ✅
**Приоритет:** CRITICAL
**Backlog:** C.S02
**Коммит:** `79d3f6d` + `ceca305`

Как разработчик, я хочу чтобы autonomy level автоматически определялся из кода, чтобы risk assessment был объективным.

**Acceptance Criteria:**
- [x] Auto-rate L1-L5 из AST: human_gates, unsupervised_actions, logging presence
- [x] L1: human decides + executes → L5: fully autonomous
- [x] `autonomy_evidence` field в passport: `{human_approval_gates, unsupervised_actions, ...}`
- [x] Override via CLI wizard (если auto-detection неверный)

---

### US-S03-04: Passport Validate ✅
**Приоритет:** HIGH
**Backlog:** C.S07
**Коммит:** `ceca305`

Как разработчик, я хочу проверить completeness моего passport, чтобы знать какие поля не заполнены.

**Acceptance Criteria:**
- [x] `complior agent:validate` — проверяет все passports
- [x] Per-category completeness: Identity, Ownership, Autonomy, Constraints, Compliance
- [x] Completeness %: (filled required fields / total required) × 100
- [x] Gap list: какие obligations не покрыты
- [x] `--verbose` флаг для per-field detail

---

### US-S03-05: Passport Completeness Score ✅
**Приоритет:** HIGH
**Backlog:** C.S09
**Коммит:** `6466fea`

Как разработчик, я хочу видеть completeness score в TUI Passport page, чтобы отслеживать прогресс.

**Acceptance Criteria:**
- [x] Completeness score отображается в TUI Passport page
- [x] Per-agent completeness bar
- [x] Color coding: <50% Red, 50-79% Amber, 80-99% Yellow, 100% Green

---

### US-S03-06: compliorAgent() SDK ✅
**Приоритет:** CRITICAL
**Backlog:** C.R12
**Коммит:** `adad912`

Как разработчик, я хочу обернуть LLM API call в `compliorAgent()`, чтобы runtime compliance enforcement работал автоматически.

**Acceptance Criteria:**
- [x] `compliorAgent(client, config)` — proxy-based wrapping
- [x] Loads passport → enforces permissions + budget + constraints
- [x] Budget Controller (C.R13): rate limits, cost limits
- [x] Circuit Breaker (C.R14): suspend on anomaly, Art.14(4)(b)
- [x] 5 provider adapters: OpenAI, Anthropic, Google, Vercel AI, custom

---

### US-S03-07: Evidence Chain ✅
**Приоритет:** CRITICAL
**Backlog:** C.R20
**Коммит:** `adad912`

Как разработчик, я хочу чтобы каждый scan/fix/passport event записывался в evidence chain, чтобы иметь audit trail для регулятора.

**Acceptance Criteria:**
- [x] Signed events: scan, fix, passport create/update, FRIA generation
- [x] Hash chain: SHA-256(previous_hash + event_hash)
- [x] Storage: `.complior/evidence/chain.json`
- [x] `complior cert:evidence` → export for auditor
- [x] Ed25519 signature per event

---

### US-S03-08: FRIA Generator ✅
**Приоритет:** CRITICAL
**Backlog:** C.D01
**Коммит:** `adad912` + `6466fea`

Как разработчик high-risk AI-системы, я хочу сгенерировать FRIA (Art.27), чтобы выполнить обязательное требование.

**Acceptance Criteria:**
- [x] `complior fria:generate` — generates FRIA document
- [x] 80% pre-filled из passport: system identity, risk class, data access, autonomy, oversight
- [x] Manual fields prompted: specific impact, mitigation, approval
- [x] Output: `.complior/reports/fria-{agent-id}.md`
- [x] Updates passport: `fria_completed: true, fria_date: ...`

---

### US-S03-09: TUI Passport Page ✅
**Приоритет:** HIGH
**Коммит:** `6466fea`

Как разработчик, я хочу видеть все Agent Passports в TUI, чтобы управлять compliance моих AI-систем.

**Acceptance Criteria:**
- [x] Hotkey `P` → Passport page
- [x] List всех passports (CLI + SaaS)
- [x] Per-agent: name, L-level, completeness %, last scan
- [x] Detail panel: per-obligation checklist
- [x] Actions: generate FRIA, export, validate

---

### US-S03-10: TUI Obligations Page ✅
**Приоритет:** HIGH
**Коммит:** `6466fea`

Как разработчик, я хочу видеть 108 obligations и их coverage, чтобы понимать что нужно сделать.

**Acceptance Criteria:**
- [x] Hotkey `O` → Obligations page
- [x] 108 obligations с filter by role/risk/status
- [x] Per-obligation: coverage status, linked features, action links
- [x] Critical path highlighting

---

### US-S03-11: Scanner — Passport Awareness ✅
**Приоритет:** HIGH
**Backlog:** Scanner Improvement #4
**Коммит:** `6466fea`

Как разработчик, я хочу чтобы scanner проверял наличие и completeness Agent Passport, чтобы compliance score отражал passport status.

**Acceptance Criteria:**
- [x] L1 check: `passport-presence` — agent-manifest.json exists (HIGH for projects with AI SDK)
- [x] L2 validator: `passport-completeness` — validate required fields per risk_class
- [x] Cross-layer: `passport-code-mismatch` — declared vs actual permissions
- [x] Completeness output: "Passport Completeness: 72% (26/36 fields)"

---

### US-S03-12: Scanner — Quick Fixes ✅
**Приоритет:** MEDIUM
**Backlog:** Scanner Improvements #2, #7
**Коммит:** `6466fea`

Два quick-win улучшения сканера.

**Acceptance Criteria:**
- [x] Exclude `*.test.ts`, `*.spec.ts`, `__tests__/` from L4 bare-llm checks (reduces noise ~15%)
- [x] Fix layer weights: L1=1.00, L2=0.95, L3=0.90, L4=0.75, L5=0.70 (deterministic > probabilistic)
- [x] Recalibration testing after weight change

---

### US-S03-13: Safe Passport Re-Init ✅
**Приоритет:** MEDIUM
**Backlog:** C.S01 (hardening)
**Коммит:** `adad912`

Как разработчик, я хочу чтобы повторный `complior agent init` не затирал существующие паспорта (с `fria_completed`, ручными правками), чтобы не терять накопленные данные.

**Acceptance Criteria:**
- [x] `complior agent init` пропускает агента, если `{name}-manifest.json` уже существует
- [x] Выводит предупреждение: "Passport for {name} already exists, skipping (use --force to overwrite)"
- [x] `--force` флаг: перезаписывает существующие паспорта
- [x] Новые агенты (без существующего манифеста) создаются как раньше
- [x] HTTP API `POST /agent/init` принимает `force?: boolean` в body

---

## Метрики спринта

| Метрика | Цель | Результат |
|---------|------|-----------|
| Daemon запускается | ✅ | `b3d4e85` |
| TUI подключается к daemon | ✅ | `b3d4e85` |
| Agent:init обнаруживает 3+ frameworks | ✅ | `79d3f6d` |
| Passport generated + signed | ✅ | `79d3f6d` |
| Autonomy L1-L5 auto-rated | ✅ | `79d3f6d` |
| Evidence chain functional | ✅ | `adad912` |
| FRIA generates from passport | ✅ | `adad912` |
| Scanner knows passport | ✅ | `6466fea` |
| Tests passing | cargo test + vitest | 944 (345 Rust + 483 TS + 116 SDK) |
| US completed | 13/13 | 100% |

## Коммиты спринта

| Коммит | Дата | US | Описание |
|--------|------|----|----------|
| `b3d4e85` | 2026-03-01 | US-S03-01 | Daemon foundation: tui→cli rename, daemon lifecycle, PID management |
| `79d3f6d` | 2026-03-03 | US-S03-02, US-S03-03 (partial) | Agent Passport Mode 1 (Auto): discovery, autonomy, manifest, signing |
| `ceca305` | 2026-03-03 | US-S03-03 (CLI), US-S03-04 | Autonomy CLI, Passport Validate, Completeness Score |
| `adad912` | 2026-03-04 | US-S03-06, US-S03-07, US-S03-08, US-S03-13 | compliorAgent SDK, Evidence Chain, FRIA Generator, Safe Re-Init |
| `6466fea` | 2026-03-04 | US-S03-05, US-S03-08 (AC#3), US-S03-09, US-S03-10, US-S03-11, US-S03-12 | TUI Passport/Obligations, Scanner passport awareness, Quick fixes |
