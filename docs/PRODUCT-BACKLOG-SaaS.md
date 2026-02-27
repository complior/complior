# PRODUCT-BACKLOG.md — Complior v6 SaaS Dashboard

**Версия:** 6.0.0
**Дата:** 2026-02-26
**Статус:** Draft — требует утверждения PO
**Основание:** EU AI Act 108 obligations mapping, Passport three-mode model, deployer user journey, Daemon architecture (CLI v8)

---

## 0. Философия приоритизации v6

### SaaS = платформа deployer compliance

CLI решает проблему разработчика: "мой код не compliant". SaaS решает проблему организации: "у нас 7 AI систем, регулятор придёт через 5 месяцев, и мы не можем показать реестр."

**Целевой покупатель:** DPO / CTO / Compliance Manager, который отвечает за EU AI Act compliance всей организации. Ему нужен полный реестр AI систем (и своих, и вендорских), FRIA, audit package, evidence — и всё это одной кнопкой.

**Дедлайн:** 2 August 2026 (high-risk enforcement) = 157 дней

### Что изменилось v5 → v6

**Переосмысления:**
- F39 Agent Control Plane = теперь **AI System Registry по Art.26/49** (не просто "agent dashboard")
- Включает Passport Mode 3: Manual — deployer регистрирует vendor AI systems через wizard
- Pre-fill из AI Registry (4,983 tools) = magic moment
- Passport Completeness per system = per-obligation tracking
- F42 Audit Package = центральный monetization feature
- Каждая SaaS фича привязана к конкретным OBL-xxx

**Новые фичи:**
- F46: Passport Mode 3 Wizard (part of F39, but critical enough to track separately)
- F47: EU Database Registration Helper
- F48: Deployer Compliance Timeline

**Убрано:**
- F30 Agent Governance Cloud (merged с F39 в v5, confirmed)

**Сдвинуты:**
- F19 FRIA Generator → S8 (было S9, Art.27 = must-have для high-risk deployers ДО Aug 2)
- F42 Audit Package → S8 (было S9, Art.21/23 = must-have for regulator interaction)

---

## 1. Полная таблица features

> ⚪ = из v5, 🆕 = новая в v6, ✏️ = изменена. **OBL-xxx** = EU AI Act obligations.

### Сделано (Sprint 0-7) — ⚪ всё без изменений

| # | Feature | Status | Obligations |
|---|---------|--------|-------------|
| F01 | Infrastructure | ✅ DONE | — |
| F02 | IAM + Team | ✅ DONE | — |
| F03 | AI Tool Inventory | ✅ DONE | OBL-026 (Art.16 inventory) |
| F04 | Rule Engine + Classification | ✅ DONE | OBL-002,033 (Art.5,6 risk class) |
| F05 | Deployer Dashboard | PARTIAL | OBL-011 (Art.26) |
| F09 | Billing (Stripe) | ✅ DONE | — |
| F23 | Free Lead Gen Tools | ✅ DONE | — |
| F24 | Platform Admin | ✅ DONE | — |
| F25 | WorkOS Migration | ✅ DONE | — |
| F26 | Registry API | ✅ DONE | OBL-026 (supports Passport pre-fill) |
| F37 | Public Pages | ✅ DONE | — |
| — | Production Deploy | ✅ DONE | — |
| — | Frontend Rebuild | ✅ DONE | — |

### Sprint 8 — DEPLOYER COMPLIANCE READY

> **Цель:** Deployer может зарегистрировать все AI системы, получить FRIA, и подготовить audit package. Покрывает Art.26, Art.27, Art.49.

| # | Feature | Size | Obligations | Приоритет |
|---|---------|------|------------|-----------|
| **F28** | **⚪ Dashboard v2** | L | OBL-011 (Art.26 monitoring), OBL-014 (Art.49 registry) | 🔴 |
| | Cross-System Map, GitHub/GitLab Scan, Score Trends, Role-based views (CTO/DPO/Dev) | | | |
| **F38** | **⚪ Public AI Risk Registry** | M | OBL-026 (Art.16 traceability). Complior Risk Score A+–F, vendor self-service, procurement API. Pre-fill for Passport Mode 3. | 🔴 |
| **F19** | **✏️ FRIA Generator** | M | **OBL-013,013a (Art.27 — FRIA mandatory for high-risk).** 80% pre-filled from Passport: system name, data access, risk class, owner, L-level. GDPR DPIA cross-reference. Deployer fills remaining 20% → legal review → approve → PDF. **Moved from S9 to S8.** | **🔴 CRITICAL** |
| **F42** | **✏️ Audit Package** | M | **OBL-025,035 (Art.21,23 — provide info to authorities). OBL-011,013,014 (all deployer docs).** One-click ZIP: Executive Summary, AI Inventory (all Passports), Risk Assessments, FRIA docs, Evidence Chain, Incident Log, Training Records, Monitoring Setup. PDF/SARIF/JSON. EN/DE/FR/ES. QR-verified. **Moved from S9 to S8.** | **🔴 CRITICAL** |
| **F27** | **⚪ TUI Data Collection** | S | OBL-011 (Art.26 monitoring). CLI Passports (Mode 1) → SaaS DB. | 🟠 |
| **F07** | **⚪ Deployer Doc Generation** | L | OBL-001,005,007,010,012 (Art.4,11,13,17,26(7)). AI Usage Policy, Monitoring Plan, Art.26 Documentation. | 🟠 |
| **F08** | **⚪ Gap Analysis** | M | OBL-003,011 (Art.9,26). Per-system gap: what's missing, priorities, effort. | 🟠 |
| **F48** | **🆕 Deployer Compliance Timeline** | S | **ALL deployer obligations. Visual timeline: "142 days to Aug 2. 7 systems. 23 open obligations. Critical path: FRIA (2 systems), EU DB registration (2 systems)."** | **🟠 HIGH** |

### Sprint 9 — AI SYSTEM REGISTRY + CERTIFICATION

> **Цель:** Полный реестр всех AI систем (CLI + manual), certification readiness, agent lifecycle.

| # | Feature | Size | Obligations | Приоритет |
|---|---------|------|------------|-----------|
| **F39** | **✏️ Agent Control Plane = AI System Registry** | L | **OBL-011,014,026 (Art.26 deployer obligations, Art.49 registration, Art.16 inventory). Unified view: CLI Passports (Mode 1) + SaaS Passports (Mode 3) в одном реестре. Per-system: identity, risk class, L-level, score, lifecycle, Passport Completeness %. Real-time monitoring. Kill switch. Cross-agent data flows.** | **🔴 CRITICAL** |
| **F46** | **🆕 Passport Mode 3 Wizard** | M | **OBL-011,014 (Art.26, Art.49). "Add AI System" → 5-step wizard: (1) Search AI Registry, pre-fill vendor data, (2) Identity + ownership, (3) Use case + data access, (4) Autonomy L1-L5 + constraints, (5) Review → save. Each step shows "Art.26(x) requires..." Fields structured per 108 obligations. Pre-fill from F26 Registry (4,983 tools).** | **🔴 CRITICAL** |
| **F40** | **⚪ Cert Readiness Dashboard** | M | OBL-003,009,019,023. AIUC-1 + ISO 42001 + EU AI Act per system. Evidence management. Partnership referral. | 🔴 |
| **F47** | **🆕 EU Database Registration Helper** | S | **OBL-014,014a (Art.49 — register high-risk before deploy). Pre-fill EU DB form fields from Passport. Checklist: what's needed, what's ready. Link to EU database. Passport updated when done.** | **🟠 HIGH** |
| **F06** | **✏️ Eva — Conversational AI** | L | OBL-001 (Art.4 AI literacy — discovery through dialogue). Moved from S8. | 🟠 |
| **F10** | **✏️ Eva Tool Calling** | S | — | 🟠 |
| **F11** | **✏️ Onboarding + Notifications** | M | — | 🟠 |
| **F29** | **✏️ SaaS Discovery** | M | OBL-011 (Art.26 — discover all AI systems). | 🟡 |
| **F31** | **⚪ Remediation Cloud** | M | OBL-020a (Art.20 corrective actions). | 🟡 |
| **F12** | **⚪ Regulatory Monitor** | M | OBL-032 (regulation changes). | 🟡 |
| **F20** | **⚪ KI-Compliance Siegel** | S | OBL-038 (Art.95 voluntary codes). | 🟡 |

### Sprint 10 — FULL PLATFORM

| # | Feature | Size | Obligations | Приоритет |
|---|---------|------|------------|-----------|
| **F32** | ⚪ Monitoring Cloud | L | OBL-020,020a,020b (Art.72). | 🟡 |
| **F33** | ✏️ Enterprise | L | OBL-010,010a,034 (Art.17 QMS). + cert management, custom rules YAML. | 🟡 |
| **F41** | ⚪ MCP Proxy Analytics | M | OBL-006,011,020. | 🟡 |
| **F43** | ⚪ NHI Dashboard | M | OBL-006a (NHI identity logging). | 🟡 |
| **F44** | ⚪ Predictive Intelligence | L | OBL-003 (Art.9 risk prediction). | 🟡 |
| **F45** | ⚪ Benchmarking | S | — | 🟢 |
| **F18** | ⚪ AI Literacy Module | L | OBL-001,001a (Art.4 training). | 🟡 |
| **F14** | ⚪ Multi-language | M | — | 🟠 |
| **F49** | **🆕 Community Evidence Pipeline** | M | **Replaces tier-bonuses with data-driven evidence. Nightly batch aggregation of binary "document received" flags from Passport Mode 3. Anonymized (k-anonymity N≥10). Displayed in Registry tool cards. Opt-out per deployer. Dependencies: F39 (Passport storage), F26 (Registry API).** | **🟡 MEDIUM** |

### Future

| # | Feature | Obligations | Приоритет |
|---|---------|------------|-----------|
| F34 | ✏️ Growth (Compliance Mesh, State of AI Agent Compliance Report) | — | 🟢 |
| F35 | ✏️ Marketplace (guardrails, test suites, industry templates) | — | 🟢 |
| F36 | ⚪ White-Label | — | 🟢 |

---

## 2. Obligation → SaaS Feature Matrix

### Deployer obligations (17 deployer-specific + 43 both = 60 total)

| Obligation | Article | SaaS Feature | Coverage |
|-----------|---------|-------------|----------|
| OBL-011: Use high-risk AI per instructions | Art.26(1)-(5) | F39 Registry, F28 Dashboard | 75% |
| OBL-011a: Named human oversight | Art.26(2) | F39 + F46 (owner field) | 90% |
| OBL-011b: Input data relevance | Art.26(4) | F39 (permissions view) | 60% |
| OBL-011c: Suspend on risk | Art.26(5) | F39 kill switch | 80% |
| OBL-011d: Log retention 6 months | Art.26(6) | F28 (monitoring) | 90% |
| OBL-011e: Follow provider instructions | Art.26(1) | F39 (instructions archived) | 70% |
| OBL-012: Inform workers | Art.26(7) | F07 Doc Gen (notification letter) | 50% |
| OBL-013: FRIA | Art.27 | **F19 FRIA Generator** | **70%** |
| OBL-013a: FRIA + DPIA | Art.27(4) | F19 (cross-reference) | 65% |
| OBL-014: EU Database registration | Art.49 | **F47 EU DB Helper** | **40%** |
| OBL-017: Emotion recognition notice | Art.50(3) | F07 Doc Gen | 40% |
| OBL-018: Deepfake labeling | Art.50(4) | F28 (monitoring) | 60% |
| OBL-024: Explain AI decisions | Art.26(11) | F39 (audit trail per decision) | 65% |
| OBL-025: Cooperate with regulator | Art.21 | **F42 Audit Package** | **80%** |
| OBL-029: Deployer-becomes-provider | Art.25(1) | F08 Gap Analysis | 50% |
| OBL-031: Inform provider of misuse | Art.26(9) | F39 (escalation) | 40% |

### General obligations (both roles)

| Obligation | SaaS Feature | Coverage |
|-----------|-------------|----------|
| OBL-001: AI Literacy | F18 AI Literacy Module | 60% |
| OBL-002: No prohibited systems | F04 Classification (DONE) + F28 Dashboard | 70% |
| OBL-006a: Log retention | F28 + F32 Monitoring | 90% |
| OBL-025: Cooperate with regulator | F42 Audit Package | 80% |
| OBL-030: Complaint mechanism | F07 Doc Gen (template) | 40% |
| OBL-035: Info to authorities | F42 Audit Package | 80% |
| Industry (HR/FIN/MED/EDU) | F08 Gap + F39 Registry + F40 Cert | 60% |

---

## 3. Тарифы (обновлённые)

| Тариф | Цена | Что включает | Key obligations covered |
|-------|------|-------------|----------------------|
| **Free** | €0 | CLI only. 200 tools offline. 1 user. EU only. | Scanner (OBL-015,016), basic Passport |
| **Starter** | €49/мес | Dashboard + Registry API. 5,011+ tools. 2 users. EU+1. | + Risk Registry, + basic Passport Mode 3 |
| **Growth** | €149/мес | + AI System Registry + FRIA + Audit Package. 10 users. All jurisdictions. | + OBL-011,013,014,025 (Art.26,27,49,21) |
| **Scale** | €399/мес | + Cert Readiness + Predictive + Benchmarks. Unlimited. | + OBL-003,009,019,023 (AIUC-1, ISO) |
| **Enterprise** | Custom | + Self-hosted + White-label + Custom rules. | + All obligations + custom |

**Revenue Streams:**
- Vendor Verified badges: €49-149/мес per vendor (F38)
- Certification referral: 10-15% of AIUC-1 fee, ~$3-6K (F40)
- Audit Package: $2-5K one-time (F42) ← **key monetization**
- Marketplace: 30% cut (F35)
- FRIA generation: included in Growth (converts Starter → Growth)

---

## 4. Roadmap

```
S0-S7   ████████████ DONE (65 US, 296+ SP, 15 features)              ✅

S8      ████ DEPLOYER COMPLIANCE READY                                📋
             F28: Dashboard v2 (Cross-System Map)
             F38: Public AI Risk Registry (pre-fill for Mode 3)
             🆕 F19: FRIA Generator (Art.27) ← moved up
             🆕 F42: Audit Package (Art.21,23) ← moved up
             F27: TUI Data Collection
             F07: Deployer Docs, F08: Gap
             🆕 F48: Deployer Compliance Timeline

S9      ████ AI SYSTEM REGISTRY + CERTIFICATION                       📋
             F39: AI System Registry (CLI + Mode 3 unified)
             🆕 F46: Passport Mode 3 Wizard
             F40: Certification Readiness Dashboard
             🆕 F47: EU Database Registration Helper
             F06+F10+F11: Eva + Onboarding
             F29: Discovery, F31: Remediation, F12: RegMonitor

S10     ████ FULL PLATFORM                                             📋
             F32: Monitoring, F33: Enterprise
             F41: MCP Proxy Analytics, F43: NHI Dashboard
             F44: Predictive, F45: Benchmarks, F18: AI Literacy
```

---

## 5. Deployer User Journey (через SaaS)

```
WEEK 1: DISCOVER + REGISTER
  Day 1: DPO/CTO opens SaaS, buys Growth (€149/мес)
  Day 2: CLI installed by dev team → 3 Passports auto-created (Mode 1)
  Day 3: DPO adds 4 vendor systems via Wizard (Mode 3, pre-filled)
  Day 5: Dashboard shows: 7 systems, 2 high-risk, Score 41/100
         Compliance Timeline: "142 days. Critical: FRIA, EU DB, worker notice"

WEEK 2-4: FIX + DOCUMENT
  FRIA Generator: 2 high-risk systems → FRIA 80% pre-filled → legal review
  Worker Notification: template generated → HR sends
  EU DB Registration: helper pre-fills form → DPO registers externally
  Score: 41 → 74

MONTH 2-3: SDK + RUNTIME + CERT
  Dev integrates compliorAgent() SDK → Score: 74 → 85
  Cert Readiness Dashboard: AIUC-1 67% → adversarial tests → 82%

MONTH 4: AUDIT READY
  [📦 Generate Audit Package] → ZIP with everything
  Score: 89/100 ✅
  Ready for Aug 2, 2026
```

---

## 6. Кросс-проектные зависимости (SaaS ↔ CLI)

| SaaS Feature | CLI Feature | Direction |
|-------------|------------|-----------|
| F39 AI System Registry | C.S01 Passport (Mode 1 → SaaS DB via daemon HTTP) | CLI → SaaS |
| F46 Mode 3 Wizard | C.040 AI Registry (pre-fill data) | SaaS reads CLI data |
| F19 FRIA Generator | C.D01 FRIA CLI + C.S01 Passport | CLI pre-computes, SaaS adds workflow |
| F42 Audit Package | C.R20 Evidence Chain + all Passports | CLI provides evidence, SaaS packages |
| F40 Cert Readiness | C.T01-T02 CLI cert checks | CLI computes, SaaS visualizes |
| F47 EU DB Helper | C.S01 Passport (registration fields) | Passport → SaaS form pre-fill |
| F38 Risk Registry | C.040 AI tools data | Shared data source |
| F41 MCP Analytics | C.U01 MCP Proxy | CLI = proxy, SaaS = dashboard |
| F27 TUI Data Collection | C.001 Daemon (HTTP API) | Daemon pushes to SaaS |

**Arch note:** CLI v8 переходит с Wrapper на Daemon. SaaS получает данные от daemon через HTTP API (POST /v1/tui/agents). Daemon отправляет scan results, passports, evidence chain. TUI Design Spec: TUI-DESIGN-SPEC-v8.md.

---

**Обновлено:** 2026-02-26 v6.0 — obligations-driven priorities, FRIA + Audit Package moved to S8, new AI System Registry framing, Passport Mode 3 wizard, deployer timeline
