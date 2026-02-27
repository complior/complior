# PRODUCT-BACKLOG.md — Complior v8 Open-Source (CLI + Engine)

**Версия:** 8.0.0
**Дата:** 2026-02-26
**Статус:** Draft — требует утверждения PO
**Основание:** EU AI Act 108 obligations mapping, Agent Passport three-mode model, NIST/AIUC-1/A2A hub model, Daemon architecture (TUI-DESIGN-SPEC-v8)

---

## 0. Философия приоритизации v8

### Дедлайн: 2 August 2026 (high-risk enforcement) = 157 дней

Приоритеты определяются тремя факторами:

1. **Закон.** Какие obligations покрывает фича? Сколько из 108? Какой штраф?
2. **Зависимости.** Блокирует ли фича другие фичи? Нужна ли для SaaS?
3. **Монетизация.** Ведёт ли к SaaS конверсии или revenue?

```
🔴 CRITICAL  = Покрывает obligations с штрафом €15-35M + блокирует другие фичи
🟠 HIGH      = Покрывает 5+ obligations ИЛИ сильный differentiator
🟡 MEDIUM    = Покрывает 1-4 obligations, не блокер
🟢 LOW       = Nice to have, 0 obligations
⚪ UNCHANGED = Из v6/v7 без изменений
```

### Что изменилось v7 → v8

**Переосмысления:**
- **Wrapper → Daemon.** PTY wrapper над агентами убран. Complior = daemon (фоновый процесс с file watcher, MCP server, HTTP API) + TUI (dashboard, подключается к daemon) + CLI (standalone commands). Агенты (Claude Code, Codex, Cursor) работают отдельно и подключаются через MCP. TUI Design Spec: TUI-DESIGN-SPEC-v8.md.
- Agent Passport (C.S01) = теперь **регистрационная карта AI системы по Art.26/49**, не просто dev tool
- Три режима генерации: Auto (CLI/AST) + Semi-auto (Proxy) + Manual (SaaS)
- Hub model: Passport → export в A2A Agent Card / NIST / AIUC-1 evidence
- Passport Completeness Score: % заполненных полей по 108 obligations
- Новые поля в Passport: `fria_completed`, `eu_database_registered`, `worker_notification_sent`, `industry_context`

**Новые фичи (из gaps в EU AI Act pipeline):**
- C.S08: Passport Export Hub (A2A, NIST, AIUC-1)
- C.S09: Passport Completeness Score
- C.D01: FRIA Generator (CLI part)
- C.D02: Worker Notification Generator
- C.D03: Industry-Specific Scanner Patterns (HR/Finance/Healthcare/Education)

**Убрано/изменено:**
- C.107 VulnerAI demo (не strategic, из v7)
- C.118 Odelix bundle (не strategic, из v7)
- C.110 Regulation Simulator (merged с C.039, из v7)
- **PTY Wrapper (C.001-C.010 частично)** → архитектура Wrapper убрана. Complior больше не помещает агентов внутрь PTY. Вместо этого:
  - C.001 Agent Launch → **C.001 Daemon Launch** (запуск фонового процесса)
  - C.003 PTY Host → **УБРАНО** (не нужен)
  - C.004 Passthrough → **УБРАНО** (агенты работают отдельно)
  - C.006 MCP Server → **сохранён** (ключевой integration point)
  - C.007 Headless → **C.007 Daemon Mode** (daemon без TUI)
  - C.010 Agent Config → **сохранён** (config для MCP + Passport)

**Сдвинуты приоритеты:**
- FRIA Generator → S04 (было SaaS-only, теперь CLI тоже, Art.27 = critical для high-risk)
- Industry Checks → S04-S05 (Annex III определяет high-risk, нужно ДО Aug 2)
- Evidence Chain → S04 (без evidence = audit fail)

---

## 1. Все фичи по секциям

> 🆕 = новая в v8, ✏️ = изменена в v8, ⚪ = без изменений.
> **OBL-xxx** = привязка к конкретным EU AI Act obligations.

### A. Daemon-ядро (✏️ было Wrapper, 7 фич)

| ID | Фича | Статус | Описание |
|----|-------|--------|----------|
| C.001 | ✏️ Daemon Launch | Переделать | `complior daemon` — фоновый процесс с file watcher, engine, MCP server, HTTP API |
| C.002 | ✏️ Multi-agent awareness | Сохранён | Daemon знает о нескольких AI системах в проекте (из Passport) |
| ~~C.003~~ | ~~PTY Host~~ | **УБРАНО** | ~~PTY subprocess management~~ → агенты работают отдельно |
| ~~C.004~~ | ~~Passthrough~~ | **УБРАНО** | ~~Input/output passthrough~~ → не нужен без PTY |
| C.005 | ⚪ Health monitoring | Сохранён | Daemon health check endpoint |
| C.006 | ✏️ MCP Server | Расширен | 8 tools для агентов: scan, fix, score, explain, passport, validate, deadline, suggest |
| C.007 | ✏️ Daemon Mode | Переделать | `complior daemon --watch` без TUI. Для CI/CD и фонового мониторинга |
| C.008 | ⚪ Shared workspace | Сохранён | State store: score, findings, passports |
| C.010 | ⚪ Agent config | Сохранён | `.complior/config.toml` для daemon + passport defaults |

### B. Сканер + Compliance Gate (10 фич, ⚪ + ✏️)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| C.012 | ⚪ 19+ проверок | OBL-001,002,006,008,011b,015,016,018,020 + all industry | S01 | 🔴 |
| C.013 | ⚪ AST engine | (infrastructure for all scans) | S01 | 🔴 |
| C.014 | ⚪ Zero-config detection | — | S01 | 🔴 |
| C.015 | ⚪ Scoring 0-100 | ALL (aggregate metric) | S01 | 🔴 |
| C.016 | ⚪ Score display | — | S01 | 🔴 |
| C.017 | ⚪ Sparkline тренд | — | S04 | 🟡 |
| C.018 | ⚪ Инкрементальный скан | — | S01 | 🟠 |
| C.019 | ⚪ Детерминистический | — | S01 | 🔴 |
| C.020 | ⚪ Dependency deep scan | OBL-026 (traceability) | S05 | 🟡 |
| **C.012+** | **✏️ Industry-Specific Patterns** | **OBL-HR-001/002/003, OBL-FIN-001/002/003, OBL-MED-001/002, OBL-EDU-001/002** | **S05** | **🟠 HIGH** |

**C.012+ (✏️):** Расширение Scanner'а AST-паттернами для отраслевых high-risk use cases из Annex III. Обнаруживает: HR AI (recruitment, employee monitoring), Finance AI (credit scoring, insurance), Healthcare AI (medical device, health data), Education AI (admissions, grading). Влияет на автоматическую классификацию risk_class в Passport.

### C. Auto-Fix (9 фич, все ⚪)

Без изменений: C.021-C.029.

### C+. Матрица решений 17 нарушений (все ⚪)

Без изменений.

### C++. Runtime Control (11 ⚪ + 3 🆕v7 = 14 фич)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| C.R01 | ⚪ AI Response Wrapper | OBL-015,016 (disclosure + marking) | S05 | 🟠 |
| C.R02 | ⚪ Disclosure Injection | OBL-015,015a-c (Art.50(1)) | S05 | 🟠 |
| C.R03 | ⚪ Content Marking Engine | OBL-016,016a-b,018 (Art.50(2)(4)) | S05 | 🟠 |
| C.R04 | ⚪ Interaction Logger | OBL-006,006a,011d (Art.12, Art.26(6)) | S05 | 🟠 |
| C.R05 | ⚪ Deepfake Guard | OBL-018,GEN-001,GEN-002 (Art.50(4)) | S06 | 🟡 |
| C.R06 | ⚪ Compliance Proxy config | OBL-006,011 | S05 | 🟡 |
| C.R07 | ⚪ Output Safety Filter | OBL-009 (Art.15 accuracy) | S05 | 🟠 |
| C.R08 | ⚪ Human-in-the-Loop Gate | OBL-008,008a,011a,024 (Art.14, Art.26(2)(11)) | S05 | 🟠 |
| C.R09 | ⚪ SDK Adapters | — | S05 | 🟠 |
| C.R11 | ⚪ Audit Trail (local) | OBL-006,006a,006b,011d (Art.12, Art.19) | S05 | 🟠 |
| **C.R12** | **🆕v7 `compliorAgent()` SDK** | **OBL-006,008,011,015,016,018,020,024 (~32 obligations)** | **S04** | **🔴 CRITICAL** |
| **C.R13** | **🆕v7 Budget Controller** | **OBL-009 (Art.15 robustness)** | **S04** | **🟠** |
| **C.R14** | **🆕v7 Circuit Breaker** | **OBL-008a,011c (Art.14(4)(b), Art.26(5) suspend)** | **S04** | **🟠** |

### D. База регуляций (9 фич, все ⚪)

Без изменений: C.030-C.039.

### E. AI Registry (4 ⚪ + 3 🆕v7 = 7 фич)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| C.040 | ⚪ 2000+ AI tools | OBL-026 (inventory), supports Passport Mode 3 pre-fill | S01 | 🔴 |
| C.041 | ⚪ Risk classification | OBL-002,003,033 (Art.5,6,9 — risk class) | S01 | 🔴 |
| C.042 | ⚪ Detection patterns | (infrastructure for Agent Discovery) | S01 | 🔴 |
| C.043 | ⚪ Dependency chain | OBL-026 (traceability) | S05 | 🟡 |
| **C.E05** | **🆕v7 NHI Scanner** | **OBL-006a,011d (non-human identity logging)** | **S06** | **🟠** |
| **C.E06** | **🆕v7 Supply Chain Audit** | **OBL-026,004b (traceability, data governance)** | **S05** | **🟠** |
| **C.E07** | **🆕v7 Model Compliance Cards** | **OBL-005,007 (tech doc, transparency)** | **S05** | **🟡** |

### F-K. Сканеры, Отчёты, Бейджи, Metadata, Шаблоны, Интеграции (все ⚪)

Без изменений из v6.

### L. TUI Pages (✏️ переработано в v8 — 8 страниц)

> См. TUI-DESIGN-SPEC-v8.md для полных wireframes.

| # | Страница | Статус | Hotkey | Features |
|---|---------|--------|--------|----------|
| 1 | Dashboard | ✏️ Переработан | D | Score, Deadlines, AI Systems, Quick Actions, Auto-rescan |
| 2 | Scan | ✏️ Detail panel | S | Findings по OBL-xxx, explain, severity groups |
| 3 | Fix | ⚪ Без изменений | F | Fixable items, diff preview, batch apply |
| 4 | **Passport** | 🆕 | P | All AI Systems, L-level, Completeness %, per-obligation checklist |
| 5 | **Obligations** | 🆕 | O | 108 obligations status, by category, deadlines, penalties |
| 6 | **Timeline** | 🆕 | T | Visual timeline to Aug 2, critical path, effort estimate |
| 7 | Report | ⚪ + export | R | Compliance Report, export PDF/MD/JSON |
| 8 | Log | ⚪ + daemon log | L | Activity log, daemon events, file watcher events |

Убрано: Agents page (PTY wrapper), Orchestrator page.

### O. Discovery — local (6 фич, все ⚪)

Без изменений: C.F01-C.F11.

### P. Agent Governance (8 ⚪ + 3 🆕v7 = 11 фич, ✏️ спринты)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| C.F13 | ✏️ Agent Registry | OBL-011,014,026 (Art.26, Art.49) | **S05** (было S06) | 🟠 |
| C.F14 | ✏️ Agent Compliance Score | ALL (per-agent aggregate) | **S05** | 🟠 |
| C.F15 | ✏️ Permissions Matrix | OBL-011b (Art.26(4) input data) | **S05** | 🟠 |
| C.F16 | ✏️ Agent Audit Trail | OBL-006,006a,006b,011d (Art.12, Art.19, Art.26(6)) | **S05** | 🟠 |
| C.F18 | ✏️ Agent Manifest | (now = Agent Passport, see Section S) | **S04** | 🔴 |
| C.F20 | ⚪ Kill Switch | OBL-008a,011c (Art.14(4)(b), Art.26(5)) | S09 | 🟡 |
| C.F21 | ⚪ Agent Sandbox | OBL-003c (Art.9(6)-(8) testing) | S09 | 🟡 |
| C.F22 | ✏️ Policy Templates | OBL-HR,FIN,MED,EDU,LAW (Annex III industries) | **S05** | 🟠 |
| **C.P09** | **🆕v7 Compliance Simulation** | **OBL-003 (Art.9 risk mgmt)** | **S05** | **🟡** |
| **C.P10** | **🆕v7 Multi-Agent Interaction** | **OBL-011 (Art.26 monitoring)** | **S07** | **🟠** |
| **C.P11** | **🆕v7 Multi-Jurisdiction** | **OBL-031 (different jurisdictions)** | **S06** | **🟡** |

### Q. Remediation (6 фич, ⚪ + 🆕)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| C.F23 | ⚪ Code Fix | ALL (remediation layer) | S02 | 🔴 |
| C.F25 | ⚪ Infrastructure Remediation | OBL-009b (Art.15(4) cybersecurity) | S07 | 🟡 |
| C.F27 | ⚪ Agent Remediation | — | S06 | 🟡 |
| C.F28 | ⚪ Shadow AI Policy | OBL-012 (Art.26(7) worker notification) | S06 | 🟡 |
| C.F29 | ⚪ ML Model Compliance Kit | OBL-004,004a,004b (Art.10 data) | S07 | 🟡 |
| C.F30 | ⚪ Compliance Playbook | ALL (roadmap generator) | S07 | 🟡 |

### R. Monitoring (3 ⚪ + 3 🆕v7 = 6 фич, ✏️ приоритеты)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| C.F31 | ⚪ Drift Detection | OBL-020,020a,020b (Art.72 post-market) | S08 | 🟠 |
| C.F32 | ⚪ Regulation Change | ALL (new laws affect all) | S08 | 🟡 |
| C.F36 | ⚪ Pre-deployment Gate | OBL-003c (Art.9(6) test before market) | S03 | 🔴 |
| **C.R20** | **✏️ Evidence Chain** | **OBL-025,035 (Art.21,23 — provide info to authorities)** | **S04** (было S05) | **🔴 CRITICAL** |
| **C.R21** | **🆕v7 Compliance Changelog** | **OBL-020 (Art.72 monitoring)** | **S04** | **🟡** |
| **C.R22** | **🆕v7 Compliance Debt Score** | **—** | **S05** | **🟡** |

### S. Agent Identity & Compliance (✏️ переосмыслено в v8 — 10 фич)

> **Passport = Регистрационная карта AI системы.** Каждое поле = ответ на конкретное требование EU AI Act. Три режима: Auto (CLI/AST), Semi-auto (Proxy), Manual (SaaS).

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| **C.S01** | **✏️ Agent Passport** | **ALL 108 — central data layer. Art.26, Art.49, Art.27, Art.50** | **S04** | **🔴 CRITICAL** |
| **C.S02** | **✏️ Autonomy Rating L1-L5** | **OBL-008 (Art.14 human oversight level)** | **S04** | **🔴 CRITICAL** |
| **C.S03** | **⚪ Agent Permission Scanner** | **OBL-011b (Art.26(4) input data relevance)** | **S05** | **🟠** |
| **C.S04** | **⚪ Agent Behavior Contract** | **OBL-003 (Art.9 risk management)** | **S05** | **🟠** |
| **C.S05** | **⚪ Agent Test Suite Gen** | **OBL-003c (Art.9(6)-(8) test before market)** | **S05** | **🟡** |
| **C.S06** | **⚪ Agent Manifest Diff** | **OBL-011 (Art.26(1) follow instructions)** | **S05** | **🟡** |
| **C.S07** | **✏️ Passport Validate** | **ALL — completeness check per 108 obligations** | **S04** | **🟠** |
| **C.S08** | **🆕v8 Passport Export Hub** | **— (interop with A2A, NIST, AIUC-1)** | **S05** | **🟠 HIGH** |
| **C.S09** | **🆕v8 Passport Completeness Score** | **ALL — % of obligation-required fields filled** | **S04** | **🟠 HIGH** |
| **C.S10** | **🆕v8 Passport Import** | **— (import A2A Agent Card → pre-fill Passport)** | **S06** | **🟡** |

**C.S01 v8 details:** `agent-manifest.json` теперь содержит: `source` (mode: auto/semi-auto/manual, confidence), `compliance.fria_completed`, `compliance.eu_database_registered`, `compliance.worker_notification_sent`, `compliance.industry_context`, `compliance.industry_specific_obligations[]`. Каждое пустое обязательное поле = gap = non-compliance.

**C.S08 (🆕):** `complior agent:export --format a2a|nist|aiuc-1`. Passport = hub, форматы экосистем = exports. A2A Agent Card JSON, AIUC-1 evidence package, NIST format (когда будет опубликован).

**C.S09 (🆕):** `complior agent:validate --verbose` показывает: "Passport Completeness: 72% (26/36 required fields). GAPS: fria_completed, eu_database_registered, worker_notification_sent."

### T. Certification Readiness (5 фич, ⚪ из v7)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| **C.T01** | AIUC-1 Readiness Score | OBL-003,009,019,023 | S05 | 🔴 CRITICAL |
| **C.T02** | Adversarial Test Runner | OBL-003c,009b,023 (Art.9,15,55 — testing + cybersecurity) | S05 | 🔴 CRITICAL |
| **C.T03** | Evidence Export | OBL-025,035 (Art.21,23 — info to authorities) | S06 | 🟠 |
| **C.T04** | ISO 42001 Readiness | — | S07 | 🟡 |
| **C.T05** | Multi-Standard Gap | — | S07 | 🟡 |

### U. MCP Compliance Proxy (4 фичи, ⚪ из v7)

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| **C.U01** | MCP Proxy Core | OBL-006,011,020 (Art.12,26,72 — log + monitor + post-market). Enables Passport Mode 2 (semi-auto). | S06 | 🔴 CRITICAL |
| **C.U02** | Proxy Policy Engine | OBL-008,015,016 (Art.14,50 — oversight + transparency) | S06 | 🟠 |
| **C.U03** | Proxy Analytics | OBL-020,020b (Art.72 monitoring) | S07 | 🟡 |
| **C.U04** | Auto-Wrap Discovery | — | S07 | 🟡 |

### V. Document Generation (🆕 НОВАЯ СЕКЦИЯ v8 — 3 фичи)

> Из EU AI Act pipeline gaps. Deployer obligations требуют конкретные документы.

| ID | Фича | Obligations | Спринт | Приоритет |
|----|-------|------------|--------|-----------|
| **C.D01** | **🆕 FRIA Generator (CLI)** | **OBL-013,013a (Art.27 — fundamental rights impact assessment). 80% pre-filled из Passport: system name, data access, risk class, owner, autonomy level. Deployer high-risk = mandatory.** | **S04** | **🔴 CRITICAL** |
| **C.D02** | **🆕 Worker Notification Gen** | **OBL-012,012a (Art.26(7) — inform workers). Template letter pre-filled из Passport. Includes: what system, what data, how to object.** | **S05** | **🟠 HIGH** |
| **C.D03** | **🆕 Incident Report Template** | **OBL-021 (Art.73 — serious incident report). Structure per authority requirements.** | **S06** | **🟡** |

---

## 2. Roadmap по спринтам

```
S01  ██ Scanner core + AI Registry + TUI framework + Daemon          ✏️ v8
S02  ██ Wrapper + Fixers + LLM + Gate                              ⚪
S03  ██ Themes + Reports + Multi-agent + MCP + Headless            ⚪

S04  ██ 🔴 COMPLIANCE CORE                                         ✏️ v8
     │  C.S01: Agent Passport (3 modes, new fields, Art.26/49)
     │  C.S02: Autonomy Rating L1-L5 (Art.14)
     │  C.S07: Passport Validate (completeness per obligations)
     │  C.S09: Passport Completeness Score
     │  C.R12: compliorAgent() SDK (covers ~32 obligations)
     │  C.R13: Budget Controller
     │  C.R14: Circuit Breaker (Art.14(4)(b), Art.26(5))
     │  C.R20: Evidence Chain (Art.21, Art.23)
     │  C.R21: Compliance Changelog
     │  C.D01: FRIA Generator (Art.27) ← 🆕 v8
     │
S05  ██ 🟠 AGENT GOVERNANCE + CERTIFICATION                        ✏️ v8
     │  C.T01: AIUC-1 Readiness Score
     │  C.T02: Adversarial Test Runner
     │  C.S03: Permission Scanner
     │  C.S04: Behavior Contract
     │  C.S08: Passport Export Hub (A2A/NIST/AIUC-1) ← 🆕 v8
     │  C.F13-F18: Agent Registry, Score, Permissions, Audit Trail, Templates
     │  C.E06: Supply Chain Audit
     │  C.D02: Worker Notification Generator ← 🆕 v8
     │  C.012+: Industry-Specific Scanner Patterns ← 🆕 v8
     │  C.R22: Compliance Debt Score
     │
S06  ██ MCP PROXY + NHI + EVIDENCE                                ✏️ v8
     │  C.U01-U02: MCP Proxy Core + Policy Engine (Passport Mode 2)
     │  C.T03: Evidence Export
     │  C.E05: NHI Compliance Scanner
     │  C.S10: Passport Import (from A2A) ← 🆕 v8
     │  C.D03: Incident Report Template ← 🆕 v8
     │  C.P11: Multi-Jurisdiction
     │
S07  ██ Analytics + Multi-Agent + Standards
     │  C.U03-U04: Proxy Analytics, Auto-Wrap
     │  C.T04-T05: ISO 42001, Multi-Standard Gap
     │  C.P10: Multi-Agent Interaction
     │
S08  ██ Monitoring + Drift
S09  ██ Kill Switch + Sandbox + Compliance-as-Code
S10  ██ International + Scale
```

---

## 3. Метрики

```
Всего фич:             ~167 (было ~170 в v7, минус PTY/Passthrough/Orch)
  Новые в v8:            6 (C.S08, C.S09, C.S10, C.D01, C.D02, C.D03)
  Переработано:          5 (C.001 Daemon, C.006 MCP, C.007 Headless, TUI pages)
  Убрано:                3 (C.003 PTY Host, C.004 Passthrough, Orchestrator page)
  Новые TUI pages:       3 (Passport, Obligations, Timeline)

Architecture:
  БЫЛО:   Wrapper (PTY host) + TUI + Engine + MCP
  СТАЛО:  Daemon (file watcher + engine + MCP + HTTP) + TUI (connects to daemon) + CLI

Obligations covered:     108/108 (100% через Passport + Scanner + SDK + Docs)
  Full auto:             20 obligations (90-95% coverage)
  Partial auto:          85 obligations (50-75% coverage)
  Manual + templates:    3 obligations (10-20% coverage)

TUI Pages:               8 (Dashboard, Scan, Fix, Passport, Obligations, Timeline, Report, Log)
CLI Commands:            ~25 (scan, fix, daemon, agent:*, fria:*, cert:*, mcp)
MCP Tools:                8 (scan, fix, score, explain, passport, validate, deadline, suggest)

Фич 🔴 CRITICAL:        10 (S01-S05: определяют compliance readiness)
Фич 🟠 HIGH:           ~28
Фич 🟡 MEDIUM:         ~30
```

---

## 4. Кросс-проектные зависимости (CLI → SaaS)

| CLI Feature | Sprint | SaaS Feature | Sprint | Тип |
|-------------|--------|-------------|--------|-----|
| C.S01 Passport (Mode 1: Auto) | S04 | F39 Agent Control Plane (unified registry) | S9 | ЖЁСТКАЯ |
| C.S01 Passport (Mode 3: Manual) | — | F39 "Add AI System" wizard | S9 | SaaS-only |
| C.040 AI Registry | S01 | F38 Public Risk Registry + Mode 3 pre-fill | S8 | ЖЁСТКАЯ ✅ |
| C.D01 FRIA Generator | S04 | F19 FRIA (SaaS workflow) | S8 | СРЕДНЯЯ |
| C.T01-T02 Cert Readiness | S05 | F40 Cert Readiness Dashboard | S9 | СРЕДНЯЯ |
| C.U01 MCP Proxy | S06 | F41 Proxy Analytics Cloud | S10 | МЯГКАЯ |
| C.R20 Evidence Chain | S04 | F42 Audit Package | S9 | СРЕДНЯЯ |
| C.E05 NHI Scanner | S06 | F43 NHI Dashboard | S10 | МЯГКАЯ |
| C.S08 Export Hub | S05 | F40 (AIUC-1 evidence export) | S9 | СРЕДНЯЯ |

---

## 5. Инфраструктурные задачи

Все задачи из v6 (B.1.01-B.4.08, A.2.01-A.2.14, C.1.01-C.4.06) сохранены без изменений. Полные описания в v6.0.0 §3.

---

**Обновлено:** 2026-02-26 v8.0 — obligations-driven prioritization, Passport = регистрационная карта, hub model, new doc generation section
