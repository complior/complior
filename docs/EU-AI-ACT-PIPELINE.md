# EU AI Act × Complior: Полный пайплайн compliance

**Версия:** 1.0.0
**Дата:** 2026-02-26
**Источник:** 108 обязательств (obligations.json v2.0) × Complior CLI v7 + SaaS v5

---

## 1. КЛЮЧЕВАЯ ИДЕЯ

Каждое обязательство EU AI Act проходит через конкретный **пайплайн** в Complior — набор фич, которые ведут от "я не знаю что делать" до "у меня есть evidence для аудитора".

**Agent Passport = Регистрационная карта AI системы.** Это не отдельная фича — это центральный артефакт, в который стекаются данные от всех остальных фич. Паспорт одного агента (или AI-сервиса) содержит ответы на вопросы, которые задаёт EU AI Act для каждой конкретной системы.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    COMPLIOR COMPLIANCE PIPELINE                          │
│                                                                          │
│  STEP 1: DISCOVER        STEP 2: CLASSIFY       STEP 3: SCAN            │
│  ┌─────────────────┐     ┌──────────────────┐   ┌────────────────────┐  │
│  │ Что у нас есть? │     │ Под что попадает?│   │ Что не так?        │  │
│  │                 │     │                  │   │                    │  │
│  │ CLI: AST scan   │ ──► │ Risk classifier  │──►│ 19+ checks         │  │
│  │ SaaS: Manual +  │     │ (Annex III)      │   │ Scoring 0-100      │  │
│  │       Registry  │     │ Autonomy L1-L5   │   │ Per-article gaps   │  │
│  └─────────────────┘     └──────────────────┘   └────────────────────┘  │
│          │                        │                       │              │
│          ▼                        ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    AGENT PASSPORT                                │    │
│  │            (= Регистрационная карта AI системы)                  │    │
│  │                                                                  │    │
│  │  Identity + Permissions + Constraints + Compliance Status        │    │
│  │  → Центральный артефакт, куда стекаются все данные               │    │
│  └──────────────────────────────────┬──────────────────────────────┘    │
│                                     │                                    │
│  STEP 4: FIX             STEP 5: DOCUMENT        STEP 6: MONITOR       │
│  ┌─────────────────┐     ┌──────────────────┐   ┌────────────────────┐  │
│  │ Исправить       │     │ Задокументировать│   │ Следить            │  │
│  │                 │     │                  │   │                    │  │
│  │ Auto-fix code   │     │ FRIA generator   │   │ Drift detection    │  │
│  │ SDK middleware   │     │ Policy generator │   │ Regulation changes │  │
│  │ Templates       │     │ Audit Package    │   │ Evidence chain     │  │
│  └─────────────────┘     └──────────────────┘   └────────────────────┘  │
│                                     │                                    │
│                                     ▼                                    │
│  STEP 7: CERTIFY                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ AIUC-1 Readiness + EU Database Registration + Audit Package      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. AGENT PASSPORT = РЕГИСТРАЦИОННАЯ КАРТА AI СИСТЕМЫ

EU AI Act требует от deployer'а вести **реестр AI систем** (Art.26) и **регистрировать high-risk системы в EU Database** (Art.49). Agent Passport — это формат этой карточки.

### Маппинг: что EU AI Act требует vs что содержит Passport

| EU AI Act требует | Статья | Поле в Agent Passport | Откуда данные |
|---|---|---|---|
| Идентификация AI системы | Art.49 | `agent_id`, `name`, `description` | Auto (CLI) / Manual (SaaS) |
| Назначение (intended purpose) | Art.26(1) | `description`, `disclosure.disclosure_text` | Auto + Manual |
| Провайдер системы | Art.49 | `model.provider` | Auto (CLI) / Registry (SaaS) |
| Ответственное лицо | Art.26(2) | `owner.responsible_person`, `owner.team` | Manual (wizard) |
| Классификация риска | Art.6, Annex III | `compliance.eu_ai_act.risk_class` | Auto (Risk Classifier C.041) |
| Применимые статьи | All | `compliance.eu_ai_act.applicable_articles` | Auto (Scanner C.012) |
| Уровень автономности | Art.14 (human oversight) | `autonomy_level` (L1-L5) | Auto (AST) / Manual |
| Permissions / доступ к данным | Art.26(4) | `permissions.data_access`, `permissions.tools` | Auto (AST) / Manual |
| Ограничения | Art.14, Art.9 | `constraints.budget`, `constraints.human_approval_required` | Auto + Manual |
| AI Disclosure | Art.50(1) | `disclosure.user_facing`, `disclosure.disclosure_text` | Auto (Scanner) + Manual |
| AI Marking | Art.50(2) | `disclosure.ai_marking.method` | Auto (Scanner) |
| Logging | Art.12, Art.26(6) | `logging.actions_logged`, `logging.retention_days` | Auto (Scanner) |
| Lifecycle | Art.26(1) | `lifecycle.status`, `lifecycle.next_review` | Manual |
| FRIA проведена | Art.27 | `compliance.fria_completed` (new field) | Manual + Generator |
| AIUC-1 status | — (voluntary) | `compliance.aiuc_1.status` | Auto (Cert Readiness C.T01) |
| Дата регистрации в EU DB | Art.49 | `compliance.eu_database_registered` (new field) | Manual |

**Вывод:** Agent Passport УЖЕ покрывает 80% того, что EU AI Act требует для карточки AI системы. Нужно добавить 2-3 поля (FRIA status, EU DB registration, worker notification status).

---

## 3. ВСЕ 108 ОБЯЗАТЕЛЬСТВ → COMPLIOR PIPELINE

### Как читать таблицу

- **Пайплайн** = последовательность Complior фич для выполнения обязательства
- **CLI** = бесплатные фичи, работают на коде
- **SaaS** = платные фичи, работают для всех AI систем (включая без кода)
- **Passport** = данные записываются в Agent Passport / регистрационную карту
- **Покрытие** = % обязательства, который Complior автоматизирует

---

### 3.1. ОБЩИЕ ОБЯЗАТЕЛЬСТВА (both: deployer + provider)

#### OBL-001 | Art.4 | AI Literacy — Обучение персонала

```
ОБЯЗАТЕЛЬСТВО: Обучить сотрудников AI рискам. Тренинги по ролям. Ежегодное обновление.
ШТРАФ: €15M / 3% оборота
ДЕДЛАЙН: 2 Feb 2025 (уже в силе!)

COMPLIOR PIPELINE:
  1. SCAN (C.012)     → Проверяет наличие AI-LITERACY.md / ai-training-policy.*
  2. FIX (C.021)      → Генерирует шаблон AI Literacy Policy
  3. PASSPORT          → compliance.ai_literacy_policy: true/false
  4. SaaS (F18)        → AI Literacy Module: курсы, квизы, tracking
  5. AUDIT (F42)       → Training records в Audit Package

ПОКРЫТИЕ: 60% (scan + template + tracking, но сам тренинг = offline)
```

#### OBL-002 | Art.5 | Запрет запрещённых AI систем

```
ОБЯЗАТЕЛЬСТВО: Не использовать: subliminal manipulation, social scoring,
               emotion recognition (work/education), untargeted facial scraping,
               criminal profiling, biometric categorization по sensitive attributes.
ШТРАФ: €35M / 7% оборота (МАКСИМАЛЬНЫЙ)

COMPLIOR PIPELINE:
  1. DISCOVER (C.F06)  → Обнаружение AI систем в проекте
  2. CLASSIFY (C.041)  → Risk classification: "unacceptable" → BLOCK
  3. SCAN (C.012)      → Check: emotion_recognition, biometric, social_scoring patterns
  4. PASSPORT          → compliance.eu_ai_act.risk_class: "prohibited" → ALERT
  5. SaaS (F28)        → Dashboard: красный бейдж "PROHIBITED SYSTEM DETECTED"

SUB-OBLIGATIONS (OBL-002a through 002g):
  Каждый тип запрещённой системы → отдельный AST-pattern в Scanner.
  OBL-002f (emotion recognition at work) → cli_check: emotion_* imports + workplace context

ПОКРЫТИЕ: 70% (detection + classification, но решение о прекращении = организационное)
```

#### OBL-006a | Art.19 + Art.26(6) | Хранение логов min 6 месяцев

```
ОБЯЗАТЕЛЬСТВО: Логи AI системы хранить минимум 6 месяцев.
ШТРАФ: €15M / 3%

COMPLIOR PIPELINE:
  1. SCAN (C.012)       → Check: logging configuration exists, retention policy
  2. FIX (C.R04)        → Interaction Logger: JSONL с retention config
  3. SDK (C.R12)        → compliorAgent() SDK: auto-logging built-in
  4. PASSPORT           → logging.retention_days: 365 (must be ≥180)
  5. EVIDENCE (C.R20)   → Cryptographic evidence chain for audit

ПОКРЫТИЕ: 90% (fully automatable through SDK)
```

#### OBL-014 | Art.49 | Регистрация high-risk AI в EU Database

```
ОБЯЗАТЕЛЬСТВО: Зарегистрировать high-risk AI системы в EU Database ДО deployment.
ШТРАФ: €15M / 3%

COMPLIOR PIPELINE:
  1. CLASSIFY (C.041)     → Определить: system is high-risk?
  2. PASSPORT             → compliance.eu_ai_act.risk_class: "high"
  3. PASSPORT             → compliance.eu_database_registered: false → ALERT
  4. SaaS (F39)           → Dashboard reminder: "3 systems pending EU DB registration"
  5. SaaS (F42)           → Audit Package: pre-filled registration data from Passport
  6. MANUAL               → Deployer registers in EU Database (external system)
  7. PASSPORT             → compliance.eu_database_registered: true, registration_date

ПОКРЫТИЕ: 40% (classification + data prep, но registration = external EU system)
```

#### OBL-025 | Art.26(10) + Art.21 | Сотрудничество с регулятором

```
ОБЯЗАТЕЛЬСТВО: Предоставить регулятору информацию по запросу.

COMPLIOR PIPELINE:
  1. SaaS (F42)    → Audit Package = готовый пакет для регулятора
  2. PASSPORT      → Все passports = AI system inventory
  3. EVIDENCE      → Cryptographic evidence chain = tamper-proof
  4. SaaS (F39)    → Agent Control Plane = org-wide visibility

ПОКРЫТИЕ: 80% (всё готово кнопкой, но процесс взаимодействия = organizational)
```

---

### 3.2. DEPLOYER-SPECIFIC ОБЯЗАТЕЛЬСТВА

> Это КЛЮЧЕВОЙ сегмент для Complior: deployers — наша основная аудитория.

#### OBL-011 | Art.26(1)-(5) | Использование high-risk AI по инструкциям + мониторинг

```
ОБЯЗАТЕЛЬСТВО: Deployer обязан (a) использовать AI по инструкциям провайдера,
               (b) мониторить работу, (c) назначить ответственных,
               (d) обеспечить relevant input data, (e) хранить логи.
ШТРАФ: €15M / 3%

COMPLIOR PIPELINE:
  1. DISCOVER               → Найти все AI системы (Mode 1/2/3)
  2. PASSPORT               → Для каждой системы:
     └── owner.responsible_person  → Art.26(2): named human oversight
     └── permissions.data_access   → Art.26(4): input data relevance
     └── logging.retention_days    → Art.26(6): log retention ≥6 months
     └── lifecycle.status          → Art.26(1): operational status
  3. SDK (C.R12)            → compliorAgent() для own agents: built-in monitoring
  4. PROXY (C.U01)          → MCP Proxy для MCP-based agents: runtime observation
  5. SaaS (F39)             → Agent Control Plane: org-wide dashboard
  6. MONITOR (C.F31)        → Drift detection: score drops → alert
  7. AUDIT (F42)            → Audit Package: evidence of compliance

SUB-OBLIGATIONS:
  OBL-011a (Art.26(2)): Named persons → PASSPORT: owner.responsible_person
  OBL-011b (Art.26(4)): Input data    → SCAN: data validation checks
  OBL-011c (Art.26(5)): Suspend risk  → SDK: circuit breaker (C.R14) + kill switch (C.F20)
  OBL-011d (Art.26(6)): Log retention → SCAN + SDK: auto-check retention config
  OBL-011e (Art.26(1)): Follow instructions → PASSPORT: provider instructions archived

ПОКРЫТИЕ: 75% (scanning + SDK + monitoring + audit. Assignment of people = manual)
```

#### OBL-013 | Art.27 | Фундаментальная оценка воздействия на права (FRIA)

```
ОБЯЗАТЕЛЬСТВО: Провести Fundamental Rights Impact Assessment ДО deployment
               high-risk системы. Уведомить market surveillance authority.
ШТРАФ: €15M / 3%

COMPLIOR PIPELINE:
  1. CLASSIFY (C.041)       → System is high-risk? → FRIA required
  2. PASSPORT               → compliance.fria_required: true
  3. SaaS (F19)             → FRIA Generator: 80% pre-filled из Passport данных
     ├── Какая система? → из passport.name, passport.description
     ├── Какие данные? → из passport.permissions.data_access
     ├── Какие риски? → из passport.compliance.eu_ai_act.risk_class
     ├── Кто ответственный? → из passport.owner
     └── Human oversight? → из passport.autonomy_level, passport.constraints
  4. FIX (C.F23)            → Генерация FRIA-doc.md / FRIA-doc.pdf
  5. PASSPORT               → compliance.fria_completed: true, fria_date
  6. SaaS (F42)             → FRIA в Audit Package

  OBL-013a (Art.27(4)): FRIA + GDPR DPIA alignment
  → SaaS: FRIA Generator cross-references existing DPIA

ПОКРЫТИЕ: 70% (template pre-filled, but legal review = manual)
```

#### OBL-012 + 012a | Art.26(7) | Уведомление работников о high-risk AI

```
ОБЯЗАТЕЛЬСТВО: Deployer обязан уведомить работников И представителей (works council)
               о использовании high-risk AI. Включая: что за система, как работает,
               какие данные, какие решения, как оспорить.
ШТРАФ: €15M / 3%

COMPLIOR PIPELINE:
  1. PASSPORT               → Данные для notification: system name, purpose, data
  2. FIX (C.F28)            → Генерация: Worker Notification Letter (шаблон)
  3. SaaS (F07)             → Document Generation: AI Usage Policy
  4. PASSPORT               → compliance.worker_notification: { sent: true, date, acknowledged }
  5. SaaS (F42)             → Acknowledgment records в Audit Package

ПОКРЫТИЕ: 50% (template + tracking, but delivery and acknowledgment = offline process)
```

#### OBL-024 | Art.26(11) + Art.86 | Объяснение AI-решений пострадавшим

```
ОБЯЗАТЕЛЬСТВО: Предоставить осмысленное объяснение AI-решения лицу,
               на которое решение повлияло (reject loan, deny visa, etc).
ШТРАФ: €15M / 3%

COMPLIOR PIPELINE:
  1. SDK (C.R12)            → compliorAgent(): log decision rationale per action
  2. SDK (C.R08)            → Human-in-the-Loop Gate: AI decision → human review → explain
  3. SCAN (C.012)           → Check: explanation mechanism exists in code
  4. PASSPORT               → constraints.requires_explanation: true for high-impact
  5. RUNTIME (C.R04)        → Interaction Logger: stores decision + rationale + input
  6. SaaS (F39)             → Dashboard: per-decision audit trail

ПОКРЫТИЕ: 65% (SDK + logging, but explanation text quality = human judgment)
```

#### OBL-018 | Art.50(4) | Маркировка deepfakes

```
ОБЯЗАТЕЛЬСТВО: Deployer обязан явно маркировать deep fakes и AI-generated content.

COMPLIOR PIPELINE:
  1. SCAN (C.012)           → Check: AI generation detected (image/video/audio APIs)
  2. FIX (C.R03)            → Content Marking Engine: C2PA, watermark, metadata
  3. SDK (C.R12)            → compliorAgent(): auto-mark all generated content
  4. PASSPORT               → disclosure.ai_marking: { method: "c2pa", active: true }

ПОКРЫТИЕ: 85% (technical marking is fully automatable)
```

---

### 3.3. PROVIDER-SPECIFIC ОБЯЗАТЕЛЬСТВА

> Complior's secondary audience: AI startups building agents/models.

#### OBL-003 | Art.9 | Risk Management System

```
COMPLIOR PIPELINE:
  1. SCAN (C.012)           → 19+ checks = automated risk identification
  2. CLASSIFY (C.041)       → Risk classification per Annex III
  3. CERT (C.T02)           → Adversarial Test Runner = risk testing
  4. SaaS (F08)             → Gap Analysis per system
  5. PASSPORT               → Full risk profile per agent
  6. SaaS (F42)             → RMS documentation in Audit Package

ПОКРЫТИЕ: 65%
```

#### OBL-005 | Art.11 + Annex IV | Техническая документация

```
COMPLIOR PIPELINE:
  1. PASSPORT               → Identity, tech stack, permissions → pre-fills Annex IV
  2. SCAN                   → Capabilities, limitations, performance → auto-detected
  3. FIX (C.021)            → Technical Documentation template generator
  4. SaaS (F07)             → Full doc generation with review workflow
  5. SaaS (F42)             → Export as part of Audit Package

ПОКРЫТИЕ: 55% (structure + pre-fill, but content depth = manual)
```

#### OBL-006 | Art.12 | Автоматическое логирование

```
COMPLIOR PIPELINE:
  1. SCAN (C.012)           → Check: logging exists in code
  2. FIX (C.R04)            → Auto-fix: add Interaction Logger
  3. SDK (C.R12)            → compliorAgent() = logging built-in
  4. SDK (C.R11)            → Audit Trail: immutable, hash chain
  5. PASSPORT               → logging: { actions_logged: true, retention: 365 }

ПОКРЫТИЕ: 95% (SDK handles everything)
```

#### OBL-008 | Art.14 | Human Oversight

```
COMPLIOR PIPELINE:
  1. SCAN                   → Check: human approval gates exist in code
  2. PASSPORT               → autonomy_level: L1-L5 (indicates oversight level)
  3. SDK (C.R08)            → Human-in-the-Loop Gate middleware
  4. SDK (C.R14)            → Circuit Breaker: emergency stop
  5. CLI (C.F20)            → Kill Switch: complior agent kill <n>

  OBL-008a (Art.14(4)(b)): Emergency stop → C.R14 Circuit Breaker + C.F20 Kill Switch

ПОКРЫТИЕ: 80% (SDK + kill switch + monitoring)
```

#### OBL-015 | Art.50(1) | AI Disclosure — Chatbot/Assistant

```
COMPLIOR PIPELINE:
  1. SCAN (C.012)           → Check: disclosure text exists
  2. FIX (C.021)            → Auto-fix: inject disclosure component/header
  3. SDK (C.R02)            → Disclosure Injection middleware
  4. PASSPORT               → disclosure.user_facing: true, disclosure_text: "..."

  Sub-types:
  OBL-015a: Voice/Phone → check audio disclaimer
  OBL-015b: Email/Messaging → check email footer
  OBL-015c: API Responses → check header/metadata

ПОКРЫТИЕ: 90% (fully automatable via SDK + scanner)
```

#### OBL-016 | Art.50(2) | AI Content Marking

```
COMPLIOR PIPELINE:
  1. SCAN (C.012)           → Check: AI-generated content marking
  2. FIX (C.R03)            → Content Marking Engine
  3. SDK                    → Auto-mark: C2PA, watermark, metadata

  OBL-016a: Images → C2PA/Watermark
  OBL-016b: Text → Provenance metadata

ПОКРЫТИЕ: 90%
```

#### OBL-020 | Art.72 | Post-Market Monitoring

```
COMPLIOR PIPELINE:
  1. MONITOR (C.F31)        → Compliance Drift Detection
  2. MONITOR (C.F32)        → Regulation Change Monitoring
  3. SDK (C.R12)            → Runtime monitoring via compliorAgent()
  4. PROXY (C.U01)          → MCP Proxy: all tool calls observed
  5. SaaS (F32)             → Monitoring Cloud: alerts, anomalies, trends
  6. EVIDENCE (C.R20)       → Evidence chain for audit
  7. PASSPORT               → compliance.last_scan updated continuously

ПОКРЫТИЕ: 75%
```

#### OBL-022-023 | Art.53-55 | GPAI Obligations

```
COMPLIOR PIPELINE:
  1. SCAN (C.012)           → GPAI detection (model size, capabilities)
  2. FIX                    → Technical documentation per Annex XI/XII
  3. CERT (C.T02)           → Adversarial testing (for systemic risk models)
  4. SCAN                   → Copyright compliance check (OBL-022b)
  5. SCAN                   → Training data summary (OBL-022c)
  6. SaaS (F42)             → Documentation package

ПОКРЫТИЕ: 50% (detection + testing, but GPAI docs = deep manual work)
```

---

### 3.4. ОТРАСЛЕВЫЕ ОБЯЗАТЕЛЬСТВА (HIGH-RISK ПО ANNEX III)

Для каждой отрасли Complior предлагает **отраслевой policy template** (C.F22) + **специализированные checks** в Scanner.

| Отрасль | Obligations | Complior Pipeline |
|---------|------------|-------------------|
| **HR** (OBL-HR-001/002/003) | AI в рекрутинге, управлении, мониторинге = high-risk | CLASSIFY → high-risk. PASSPORT → permissions + data. SCAN → bias checks. FIX → FRIA template (HR). Policy Template → "HR AI Compliance Kit" |
| **Finance** (OBL-FIN-001/002/003/004) | Credit scoring, insurance, benefits, robo-advisory = high-risk | CLASSIFY → high-risk. SCAN → fairness checks. SDK → explainability middleware. Policy Template → "FinTech AI Compliance Kit" |
| **Healthcare** (OBL-MED-001/002/003) | Medical devices, health advice, health data = high-risk | CLASSIFY → high-risk. SCAN → GDPR Art.9 (special category). SDK → disclosure for health advice. Policy Template → "Healthcare AI Compliance Kit" |
| **Education** (OBL-EDU-001/002/003) | Admissions, grading, proctoring = high-risk | CLASSIFY → high-risk. SCAN → bias + fairness. SDK → transparency for students. Policy Template → "EdTech AI Compliance Kit" |
| **Law Enforcement** (OBL-LAW-001/002) | Policing AI = high-risk + prohibitions | CLASSIFY → high-risk/prohibited. SCAN → biometric checks. PASSPORT → restricted. Policy Template → specialized |
| **Justice** (OBL-JUS-001/002) | Judicial decisions, legal practice = high-risk | CLASSIFY → high-risk. SDK → explainability. Policy Template → "Legal AI Compliance Kit" |
| **Infrastructure** (OBL-INF-001) | Critical infra management = high-risk | CLASSIFY → high-risk. SCAN → safety checks. Policy Template → "Critical Infra Kit" |
| **Transport** (OBL-AV-001) | Autonomous vehicles, traffic = high-risk | CLASSIFY → high-risk. Integration with sectoral regulation (MDR, etc) |

---

## 4. СВОДНАЯ МАТРИЦА: OBLIGATION → FEATURE

### 4.1. По типу обязательства

| Тип (кол-во) | Ключевые фичи CLI | Ключевые фичи SaaS | Passport field |
|---|---|---|---|
| **Technical (23)** | Scanner C.012, SDK C.R01-R14, Proxy C.U01 | F32 Monitoring | permissions, logging, disclosure |
| **Organizational (28)** | Policy Templates C.F22, Agent Registry C.F13 | F39 Control Plane, F28 Dashboard | owner, lifecycle, constraints |
| **Transparency (20)** | Scanner C.012, Fixers C.021, SDK C.R02-R03 | F07 Doc Generation | disclosure, ai_marking |
| **Assessment (17)** | Risk Classifier C.041, Cert C.T01-T05 | F08 Gap, F40 Cert Readiness | compliance.risk_class, compliance.aiuc_1 |
| **Documentation (10)** | Report Generator, Fix Templates | F07 Doc Gen, F42 Audit Package | (all fields contribute) |
| **Reporting (4)** | — (organizational) | F42 Audit Package | — |
| **Monitoring (3)** | Drift C.F31, SDK C.R12 | F32 Monitoring Cloud | compliance.last_scan |
| **Registration (2)** | — (external EU DB) | F39 Dashboard reminder | compliance.eu_database_registered |
| **Training (1)** | Scanner (check policy exists) | F18 AI Literacy | compliance.ai_literacy |

### 4.2. По степени автоматизации

| Уровень | Кол-во | Примеры | Complior coverage |
|---|---|---|---|
| **Full auto (20)** | Art.12 logging, Art.50(1) disclosure, Art.50(2) marking, Art.26(6) log retention | **90-95%** — SDK + Scanner делают всё |
| **Partial auto (85)** | Art.9 RMS, Art.14 human oversight, Art.26 deployer obligations, Art.27 FRIA | **50-75%** — automation + templates + tracking, но review = human |
| **Manual (3)** | Art.22 EU representative, Art.28 GPAI representative, Art.85 complaint mechanism | **10-20%** — reminders + templates only |

### 4.3. Feature → Obligations covered

| Complior Feature | Obligations covered | % of 108 |
|---|---|---|
| **Scanner (C.012)** | OBL-001, 002, 006, 008, 011b, 015, 016, 018, 020, all industry | **~60%** (65/108) |
| **Agent Passport (C.S01)** | ALL — central data store | **100%** (data layer) |
| **compliorAgent() SDK (C.R12)** | OBL-006, 008, 011, 015, 016, 018, 020, 024 | **~30%** (32/108) |
| **MCP Proxy (C.U01)** | OBL-006, 011, 020 | **~10%** (11/108) |
| **Risk Classifier (C.041)** | OBL-002, 003, 006, 011, 013, 014, 033, all industry | **~40%** (43/108) |
| **FRIA Generator (F19)** | OBL-013, 013a | **~2%** but CRITICAL for high-risk |
| **Audit Package (F42)** | ALL — evidence export | **100%** (output layer) |
| **Cert Readiness (C.T01)** | OBL-003, 009, 019, 023 | **~15%** (16/108) |
| **Agent Control Plane (F39)** | OBL-011, 014, 025, all deployer | **~25%** (27/108) |
| **Document Generation (F07)** | OBL-001, 005, 007, 010, 012, 013, 021, 034 | **~20%** (22/108) |

---

## 5. AGENT PASSPORT КАК ЦЕНТРАЛЬНЫЙ АРТЕФАКТ

### 5.1. Passport = data layer для ВСЕХ obligations

```
┌─────────────────── Agent Passport ────────────────────┐
│                                                        │
│  IDENTITY          ← Art.49 (registration)             │
│  OWNERSHIP         ← Art.26(2) (named persons)         │
│  AUTONOMY L1-L5   ← Art.14 (human oversight level)     │
│  PERMISSIONS       ← Art.26(4) (input data relevance)   │
│  CONSTRAINTS       ← Art.9 (risk mgmt), Art.14          │
│  DISCLOSURE        ← Art.50(1)(2) (transparency)        │
│  LOGGING           ← Art.12, Art.26(6) (6-month logs)   │
│  COMPLIANCE        ← Art.6 (risk class), Art.27 (FRIA)  │
│  LIFECYCLE         ← Art.26(1) (operational monitoring)  │
│                                                        │
│  → Каждое поле = ответ на конкретное требование закона │
│  → Пустое поле = gap = non-compliance                   │
│  → Все поля заполнены = ready for audit                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5.2. Новые поля для Passport (из анализа obligations)

На основе маппинга 108 обязательств, в Agent Passport нужно добавить:

```jsonc
{
  // ... existing fields ...

  "compliance": {
    // existing...
    "eu_ai_act": {
      // existing: risk_class, applicable_articles, ...

      // NEW: Art.49 — регистрация в EU Database
      "eu_database_registered": false,
      "eu_database_registration_date": null,
      "eu_database_id": null,

      // NEW: Art.27 — FRIA
      "fria_required": true,        // auto from risk_class == "high"
      "fria_completed": false,
      "fria_date": null,
      "fria_document_id": null,     // link to generated FRIA doc

      // NEW: Art.26(7) — Worker notification
      "worker_notification_required": true,  // auto from risk_class == "high"
      "worker_notification_sent": false,
      "worker_notification_date": null,

      // NEW: Art.19 — Conformity assessment
      "conformity_assessment_required": true,
      "conformity_assessment_completed": false,
      "ce_marking_applied": false
    },

    // NEW: AI Literacy (Art.4)
    "ai_literacy_policy_exists": true,

    // NEW: Industry-specific flags
    "industry_context": "fintech",          // null | hr | fintech | healthcare | education | law | infrastructure
    "industry_specific_obligations": [       // auto-populated from Annex III
      "OBL-FIN-001", "OBL-FIN-002"
    ]
  }
}
```

### 5.3. Passport Completeness Score

Новая метрика: **Passport Completeness** — процент заполненных обязательных полей.

```
$ complior agent:validate --verbose

Agent: loan-assessor

Passport Completeness: 72% (26/36 required fields)

  ✅ Identity (5/5):      agent_id, name, description, version, type
  ✅ Ownership (3/3):     team, contact, responsible_person
  ✅ Autonomy (2/2):      level, evidence
  ✅ Permissions (4/4):   tools, data_access, denied, mcp_servers
  ⚠️ Constraints (2/4):  budget ✅, human_approval ✅, prohibited ✗, time ✗
  ✅ Disclosure (3/3):    user_facing, text, marking
  ✅ Logging (3/3):       logged, destination, retention
  ⚠️ Compliance (4/8):   risk_class ✅, articles ✅, score ✅, last_scan ✅,
                          fria ✗, eu_database ✗, worker_notification ✗, conformity ✗
  ✅ Lifecycle (2/2):     status, next_review

  GAPS (non-compliant fields):
    ❌ compliance.fria_completed = false       ← Art.27: FRIA required for high-risk
    ❌ compliance.eu_database_registered = false ← Art.49: must register before deploy
    ❌ compliance.worker_notification = false   ← Art.26(7): must notify workers
    ❌ constraints.prohibited_actions = empty   ← Art.9: define risk boundaries

  NEXT ACTIONS:
    1. complior fria:generate loan-assessor    ← 80% pre-filled from passport
    2. Register in EU Database (external)      ← use passport data for form
    3. complior notify:generate loan-assessor  ← worker notification letter
```

---

## 6. ПОЛНЫЙ ЮЗЕР-JOURNEY DEPLOYER'А

Типичный deployer: FinTech startup, 30 человек, 7 AI систем, дедлайн Aug 2, 2026.

```
МЕСЯЦ 1: DISCOVER + REGISTER
─────────────────────────────
Day 1:  CTO installs Complior CLI
        $ complior scan
        → Found 3 own agents (LangChain, Custom, Vercel AI)
        → Score: 34/100 😱

Day 2:  $ complior agent:init
        → 3 Agent Passports generated (Mode 1: Auto)
        → Each passport: identity, permissions, L-level, risk class, gaps

Day 3:  CTO opens SaaS Dashboard
        → [+ Add AI System] × 4 (Intercom, Stripe, Notion, Copilot)
        → 4 Agent Passports generated (Mode 3: Manual, pre-filled from Registry)
        → Total: 7 AI systems registered ✅

Day 5:  Dashboard shows:
        → 2 HIGH-RISK systems (loan-assessor, Stripe Radar)
        → 5 LIMITED-RISK systems
        → Org Compliance Score: 41/100
        → Blockers: FRIA not done, EU DB not registered, no worker notification
        → Timeline: 142 days to Aug 2

МЕСЯЦ 2: FIX + DOCUMENT
────────────────────────
Week 1: $ complior fix --batch
        → Auto-fix: disclosure injected, logging added, marking configured
        → Score: 34 → 58 (+24)

Week 2: $ complior fria:generate loan-assessor
        → FRIA generated (80% pre-filled from Passport)
        → Legal review: 2 days
        → FRIA approved → Passport updated: fria_completed: true

Week 3: $ complior notify:generate
        → Worker Notification Letters generated
        → HR sends to all employees + works council
        → Passport updated: worker_notification_sent: true

Week 4: Register high-risk systems in EU Database
        → Use Passport data to fill EU DB form
        → Passport updated: eu_database_registered: true

        Score: 58 → 74 (+16)

МЕСЯЦ 3: SDK + RUNTIME
───────────────────────
Week 1: Dev team integrates compliorAgent() SDK into own agents
        → Logging, disclosure, human gates, budget control = built-in
        → Score: 74 → 85 (+11)

Week 2: MCP Proxy deployed for MCP-based agents
        → Runtime observation starts
        → Semi-auto passport enrichment

Week 3: $ complior cert:readiness --standard aiuc-1
        → AIUC-1 Readiness: 67%
        → 28/45 controls met
        → Blockers: adversarial testing not done

Week 4: $ complior cert:test --adversarial
        → 119/139 tests passed
        → Fix 20 failures
        → AIUC-1 Readiness: 82%

МЕСЯЦ 4: AUDIT READY
─────────────────────
        SaaS: [📦 Generate Audit Package]
        → ZIP: Executive Summary, AI Inventory (7 Passports),
               Risk Assessments, FRIA docs, Evidence Chain,
               Training Records, Monitoring Setup
        → PDF: clean, QR-verified, multi-language (EN+DE)

        Org Compliance Score: 89/100 ✅
        High-risk systems: registered, FRIA'd, monitored
        All 7 AI systems: passported, scored, tracked

        Ready for Aug 2, 2026 ✅
```

---

## 7. ЧТО ЕЩЁ НУЖНО ДОБАВИТЬ В ПРОДУКТ

На основе маппинга 108 обязательств → текущие фичи, **gaps**:

| Gap | Obligation | Что нужно | Где | Sprint |
|-----|-----------|-----------|-----|--------|
| FRIA Generator | OBL-013 | Pre-filled FRIA из Passport | SaaS F19 | S8 |
| Worker Notification Generator | OBL-012 | Template letter + tracking | CLI C.F28 + SaaS | S05 |
| EU Database Registration Helper | OBL-014 | Pre-fill EU DB form из Passport | SaaS F39 | S09 |
| Conformity Assessment Checklist | OBL-019 | Guided checklist per CE marking | SaaS F40 | S09 |
| Complaint Mechanism Template | OBL-030 | Template + process doc | CLI Fix | S06 |
| Incident Report Template | OBL-021 | Serious incident report for authority | SaaS F42 | S09 |
| Industry-Specific Checks | OBL-HR/FIN/MED/EDU/LAW | Scanner patterns per Annex III sector | CLI C.012 expansion | S05-S06 |
| AI Literacy Module | OBL-001 | Training content + tracking | SaaS F18 | S10 |
| Passport Completeness Score | ALL | Per-obligation field tracking | CLI C.S01 | S04 |

---

**Обновлено:** 2026-02-26
