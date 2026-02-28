# SPRINT-BACKLOG-009.md — Реестр + Выходные документы + Регулятор

**Версия:** 2.0.0
**Дата:** 2026-02-28
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Planned
**Зависимости:** Sprint 8 (Compliance Ready) merged to develop

---

## Sprint Goal

Единый реестр AI систем (CLI + manual), внешние compliance outputs (Badge, Vendor Requests), интеграция с регулятором (EU Database, Regulator Directory). Расширенные Wizard шаги 3-5. Полный набор документ-генераторов (QMS, Risk Plan, Monitoring Plan). Индикатор источника данных, Remediation playbooks, мониторинг регулирования. Пользователь может **доказать compliance третьим сторонам**.

**Capacity:** ~42 SP | **Duration:** 4 недели
**Developers:** Max (Backend — Wizard + Registry + Doc Generators + Remediation), Nina (Frontend — Registry + Badge + Vendor Request + Data Source Indicator), Leo (Infra — Regulator Directory + EU DB Helper + Discovery + Monitoring)
**Baseline:** ~373 tests (Sprint 8) → **New: ~35 tests (total: ~408)**

> **Prerequisite:** Sprint 8 merged to develop. FRIA generator works. Audit Package works. CLI sync works. Device Flow auth.

---

## Граф зависимостей

```
── Реестр + Wizard ──
US-091 (AI Systems Registry) ◄── US-092 (Wizard шаги 3-5)
                              ◄── US-093 (Extended Passport fields)

── Выходные документы ──
US-094 (QMS + Risk Plan + Monitoring Plan generators) — зависит от F07 (S8)

── Внешние выходы ──
US-095 (Compliance Badge) — параллельно
US-096 (Vendor Documentation Request) — параллельно
US-097 (EU Database Helper) — зависит от US-093 (Extended Passport)
US-098 (Regulator Directory) — параллельно
US-099 (Certification Dashboard — ISO 42001 readiness) — зависит от US-091

── Дополнительно ──
US-100 (Онбординг + Уведомления F11) — параллельно
US-101 (SaaS Discovery F29, partial) — параллельно
US-102 (Data Source Indicator F63) — параллельно
US-103 (Remediation Cloud F31) — зависит от US-091 (Gap Analysis data)
US-104 (Regulatory Monitoring F12) — параллельно
```

---

## User Stories

### US-091: Реестр AI систем — Unified View (5 SP)

- **Feature:** F39 🔴 | **Developer:** Nina (frontend) + Max (backend)

#### Описание

Как compliance officer, я хочу видеть единый реестр ВСЕХ AI систем организации: из CLI автоскана, из ручного wizard'а, из Discovery — с lifecycle management и kill switch.

#### Unified Registry

```
AI Systems Registry
───────────────────────────────────────────────────────────────
┌──────────────────┬────────┬────────┬───────┬────────┬────────────┐
│ System           │ Source │  Risk  │  L    │ Score  │ Lifecycle  │
├──────────────────┼────────┼────────┼───────┼────────┼────────────┤
│ ChatGPT          │ Manual │ GPAI   │ L2    │  72%   │ Active     │
│ Copilot          │ CLI    │ Limited│ L1    │  81%   │ Active     │
│ HR Screening AI │ Manual │ HIGH   │ L4    │  34%   │ Suspended  │
│ LangChain agent │ CLI    │ Limited│ L3    │  61%   │ Active     │
└──────────────────┴────────┴────────┴───────┴────────┴────────────┘

Per system: Passport completeness %, владелец, lifecycle
Kill switch: "Suspend" → removes from active registry, marks as suspended
```

#### Autonomy Levels

| Level | Name | Human Oversight |
|-------|------|----------------|
| L1 | Tool | Human makes all decisions |
| L2 | Advisor | AI suggests, human decides |
| L3 | Collaborator | AI acts, human monitors |
| L4 | Delegator | AI acts autonomously, human can override |
| L5 | Autonomous | AI acts fully autonomously |

#### API

```javascript
// GET  /api/registry/systems        — unified list (CLI + manual + discovery)
// GET  /api/registry/systems/:id    — full details + passport
// PATCH /api/registry/systems/:id/lifecycle — active|suspended|decommissioned
// GET  /api/registry/systems/stats  — aggregate: total, by risk, by source
```

#### Реализация

**Новые файлы:**
- `app/api/registry/systems.js` — unified list (aggregate AITool + ScanResult + CrossSystemSource)
- `app/application/registry/buildUnifiedRegistry.js` — merge sources
- `app/(dashboard)/registry/page.tsx` — AI Systems Registry UI
- `app/(dashboard)/registry/[id]/page.tsx` — system detail
- `components/registry/SystemsTable.tsx` — sortable/filterable
- `components/registry/LifecycleControl.tsx` — active/suspended/decommissioned toggle

#### Критерии приёмки

- [ ] Unified view: CLI + Manual + Discovery merged
- [ ] Per-system: name, vendor, risk, autonomy level (L1-L5), score, passport %, lifecycle
- [ ] Kill switch: Suspend → system marked, excluded from active compliance
- [ ] Source indicator: "CLI scan, Feb 27" or "Manual entry"
- [ ] Lifecycle: active → suspended → decommissioned
- [ ] Filterable: by risk, source, lifecycle, owner

- **Tests:** 3 (unified_registry_merge.test, lifecycle_transitions.test, source_aggregation.test)

---

### US-092: Wizard шаги 3-5 (4 SP)

- **Feature:** F46 🔴 | **Developer:** Nina

#### Описание

Как deployer, я хочу завершить полный 5-step wizard регистрации AI tool: шаг 3 (use case + данные), шаг 4 (автономность L1-L5 + human oversight), шаг 5 (review + save).

> Шаги 1-2 уже работают (Sprint 1-2): поиск из Registry + автозаполнение.

#### Шаги

```
Step 3: Use Case & Data
  — Intended purpose (free text)
  — Deployment domain: HR, Finance, Healthcare, Legal, Marketing, Engineering, Other
  — Data categories: personal, sensitive, public, anonymized
  — End users: employees, customers, public, minors
  — Geography: EU, specific countries, global

Step 4: Autonomy & Oversight
  — Autonomy Level: L1-L5 selector с описаниями
  — Human oversight: who, how often, override mechanism
  — Art. 14 compliance hints inline ("Art. 14 requires...")
  — Auto-escalation: if L4/L5 + high-risk domain → warning

Step 5: Review & Save
  — Summary of all 5 steps
  — Risk classification result (computed from steps 1-4)
  — "Save" → создаёт AITool + requirements mapping
  — "Save & Generate FRIA" → если high-risk → direct link to FRIA wizard
```

#### Реализация

**Модифицированные файлы:**
- `components/wizard/` — steps 3, 4, 5 (currently placeholder)
- `app/application/tool/createToolFromWizard.js` — save full wizard data

#### Критерии приёмки

- [ ] Step 3: use case, domain, data categories, end users, geography
- [ ] Step 4: L1-L5 autonomy selector + human oversight fields
- [ ] Step 4: inline Art. 14 guidance
- [ ] Step 5: review summary + risk classification result
- [ ] "Save & Generate FRIA" shortcut for high-risk tools
- [ ] Full 5-step wizard works end-to-end

- **Tests:** 2 (wizard_full_flow.test, risk_classification_from_wizard.test)

---

### US-093: Extended Passport Fields (3 SP)

- **Feature:** F56 🔴 | **Developer:** Max

#### Описание

Как compliance officer, я хочу чтобы Passport AI системы содержал все поля, нужные для Audit Package: regulatory context, incidents, post-market monitoring, conformity assessment records.

#### Новые блоки

```javascript
// AITool.passport (расширение JSON):
{
  // Existing fields...

  // NEW:
  regulatoryContext: {
    country: 'DE',
    sector: 'financial_services',
    msaName: 'BaFin',           // Market Surveillance Authority
    euDbNumber: null,            // Filled after EU DB registration (F47)
    nationalRequirements: []     // Additional country-specific reqs
  },
  incidents: [],                 // { date, description, severity, resolution, reportedToMSA }
  postMarketMonitoring: {
    frequency: 'monthly',
    metrics: ['accuracy', 'bias_score', 'user_complaints'],
    lastReviewDate: null,
    nextReviewDate: null
  },
  conformityAssessment: {
    type: null,                  // 'self' (Annex VI) | 'third_party' (Annex VII)
    status: 'not_started',       // not_started|in_progress|completed
    completedAt: null,
    certificateUrl: null
  },
  complianceRecords: [],         // { type, date, description, documentUrl }
  msaSubmissions: []             // { msaName, date, type, status, responseDate }
}
```

#### Реализация

**Модифицированные файлы:**
- `schemas/AITool.js` — extend passport JSON schema
- `app/api/tools/passport.js` — PATCH endpoint for new fields
- `app/application/tool/updatePassport.js` — validation for new blocks

#### Критерии приёмки

- [ ] 6 new Passport blocks added to schema
- [ ] PATCH endpoint: partial update of any block
- [ ] Validation: regulatoryContext requires country
- [ ] Backward compatible: existing tools don't break
- [ ] msaSubmissions tracked with status lifecycle

- **Tests:** 2 (passport_extended_fields.test, passport_backward_compat.test)

---

### US-094: QMS + Risk Plan + Monitoring Plan Generators (5 SP)

- **Feature:** F57, F58, F59 🟠 | **Developer:** Max

#### Описание

Как compliance officer, я хочу сгенерировать три дополнительных compliance документа: Quality Management System, Risk Management Plan, Monitoring Plan.

> Расширение US-082 (F07, Sprint 8). Те же section-by-section workflow, но более сложные документы.

#### QMS Wizard (Art. 17, AESIA #4)

```
Пошагово:
1. Organization info: название, размер, AI strategy
2. AI System inventory: из реестра (US-091)
3. Responsibilities: AI officer, DPO, quality manager
4. Processes: approval, change management, vendor management
5. Training: AI Literacy link, additional trainings
6. Audit: internal audit plan, frequency
→ PDF 20-40 стр.
```

#### Risk Management Plan (Art. 9, AESIA #5)

```
Per AI система:
1. Risk identification: из Scanner + Gap Analysis (US-085)
2. Risk assessment: likelihood × consequence matrix
3. Mitigation measures: technical + organizational
4. Residual risk: acceptable threshold
5. Review schedule: frequency, triggers
→ PDF + structured data в Passport
```

#### Monitoring Plan (Art. 72, AESIA #13)

```
Per AI система:
1. What to monitor: accuracy, bias, drift, errors, complaints
2. Frequency: real-time / daily / weekly / monthly
3. Thresholds: alert when metric crosses boundary
4. Escalation: who gets notified, response SLA
5. Feedback: user complaint processing
→ PDF 5-10 стр.
```

#### Реализация

**Новые файлы:**
- `app/domain/documents/QMSTemplate.js` — 6 QMS sections (pure)
- `app/domain/documents/RiskPlanTemplate.js` — 5 sections (pure)
- `app/domain/documents/MonitoringPlanTemplate.js` — 5 sections (pure)
- `app/(dashboard)/documents/qms/page.tsx` — QMS wizard UI
- `app/(dashboard)/documents/risk-plan/page.tsx` — Risk Plan UI
- `app/(dashboard)/documents/monitoring-plan/page.tsx` — Monitoring Plan UI

**Модифицированные файлы:**
- `app/domain/documents/DocumentTemplates.js` — add 3 new types
- `app/application/documents/generateDocumentDraft.js` — handle new types

#### Критерии приёмки

- [ ] QMS: 6-step wizard, предзаполнение из org data
- [ ] Risk Plan: per-tool, risks from Scanner + Gap Analysis
- [ ] Monitoring Plan: per-tool, monitoring targets + thresholds
- [ ] All three: LLM-assisted draft generation
- [ ] All three: section-by-section Tiptap edit → approve → PDF
- [ ] QMS links to AI Literacy module data
- [ ] Plan enforcement: Growth+ required

- **Tests:** 3 (qms_wizard_generation.test, risk_plan_prefill.test, monitoring_plan_generation.test)

---

### US-095: Compliance Badge (3 SP)

- **Feature:** F50 🟠 | **Developer:** Nina

#### Описание

Как CEO, я хочу разместить на сайте embeddable badge "AI Act Compliant" — чтобы клиенты видели нашу compliance.

#### Badge Levels

| Level | Score | Criteria | Plan |
|-------|-------|----------|------|
| Bronze | 70+ | Classified tools, no critical gaps | Growth+ |
| Silver | 85+ | + no high-priority gaps | Growth+ |
| Gold | 95+ | + AI Literacy 100% + FRIA done | Enterprise |

#### Embeddable Widget

```html
<!-- On customer's website: -->
<script src="https://app.complior.io/badge.js" data-org="acme-gmbh"></script>
<!-- Renders: SVG badge + QR code → public compliance verification page -->
```

```javascript
// GET /api/badge/:orgSlug — public, no auth
// → { valid: true, level: 'silver', score: 87, verifiedAt: '...' }
// Badge click → "Powered by Complior" → viral loop

// /verify/:orgSlug → public compliance summary page
```

#### Реализация

**Новые файлы:**
- `app/api/badge/[orgSlug].js` — public badge data
- `app/api/badge/my/stats.js` — badge views/clicks
- `app/(dashboard)/badge/page.tsx` — Badge management
- `app/(public)/verify/[orgSlug]/page.tsx` — public verification
- `public/badge.js` — embeddable script
- `app/application/badge/evaluateBadgeCriteria.js`

#### Критерии приёмки

- [ ] 3 levels: Bronze / Silver / Gold
- [ ] Embeddable script works on external sites (CORS)
- [ ] Public verification page without auth
- [ ] Badge stats: views + clicks tracked
- [ ] If score drops below criteria → badge shows "Under Review"
- [ ] Growth+ plan required

- **Tests:** 2 (badge_criteria.test, badge_public_endpoint.test)

---

### US-096: Vendor Documentation Request (4 SP)

- **Feature:** F51 🟠 | **Developer:** Nina (frontend) + Max (backend)

#### Описание

Как deployer, я хочу запросить у вендора недостающую документацию по Art. 13, 26 — с юридическими ссылками — и трекать статус ответа.

> **Уникальная фича — нет у конкурентов.**

#### Flow

```
1. Deployer selects AI tool (e.g., ChatGPT)
2. System shows: "Missing documentation: Model Card, Training Data Info, AI Disclosure"
3. "Request from Vendor" button
4. Email template generated:
   — Legal references (Art. 13 §1, Art. 26 §3)
   — Specific missing documents listed
   — Deployer's company info
   — Deadline suggestion (30 days)
5. Send via Brevo or copy-paste
6. Track: Sent → Waiting → Received → Attached to Passport
7. Received documents → feed Community Evidence in Registry
```

#### Реализация

**Новые файлы:**
- `schemas/VendorRequest.js` — MetaSQL (vendor, tool, status, documents requested)
- `app/api/vendor-requests/create.js` — create request + generate email
- `app/api/vendor-requests/list.js` — list per org
- `app/api/vendor-requests/update.js` — update status + attach docs
- `app/application/vendor/generateRequestEmail.js` — legal template
- `app/(dashboard)/vendor-requests/page.tsx` — request list + create
- `components/vendor/RequestEmailPreview.tsx` — email preview before send

#### Критерии приёмки

- [ ] Missing docs identified from Passport + Registry data
- [ ] Email template with Art. 13, 26 legal references
- [ ] Send via Brevo or copy-paste option
- [ ] Status tracking: sent → waiting → received
- [ ] Received docs attach to Passport
- [ ] Community Evidence: received docs improve Registry scoring

- **Tests:** 3 (vendor_request_email.test, request_status_tracking.test, document_attachment.test)

---

### US-097: EU Database Helper (3 SP)

- **Feature:** F47 🟠 | **Developer:** Leo

#### Описание

Как deployer high-risk AI, я хочу помощь с регистрацией в EU Database (Art. 49, ~40 полей) — предзаполнение 60-90% из Passport.

#### Flow

```
1. Select high-risk AI tool from registry
2. System generates pre-filled EU DB form (~40 fields)
3. Checklist: "Ready" / "Missing" per field
4. Export: copy-paste friendly format for EU Database
5. After registration: EU DB number stored in Passport
```

#### Реализация

**Новые файлы:**
- `app/api/eu-database/prefill.js` — generate pre-filled form from Passport
- `app/api/eu-database/checklist.js` — readiness check
- `app/(dashboard)/eu-database/[toolId]/page.tsx` — EU DB helper UI
- `app/domain/eu-database/EUDatabaseFields.js` — 40 field definitions (pure)

#### Критерии приёмки

- [ ] 40 EU DB fields with pre-fill from Passport (60-90%)
- [ ] Readiness checklist: ready/missing per field
- [ ] Copy-paste export for EU Database
- [ ] After registration: EU DB number → Passport.regulatoryContext.euDbNumber
- [ ] Only for high-risk AI tools

- **Tests:** 2 (eu_db_prefill.test, readiness_checklist.test)

---

### US-098: Regulator Directory (3 SP)

- **Feature:** F53 🟠 | **Developer:** Leo

#### Описание

Как deployer, я хочу знать, какой регулятор (MSA — Market Surveillance Authority) отвечает за мою страну и сектор — и какие документы они запросят.

#### Data

```javascript
// 27 EU + 3 EEA countries
// Per country: MSA name, contact, website, submission format, national requirements
// Sectors: financial (BaFin/AMF), telecom (BNetzA), health (BfArM), etc.

// GET /api/regulators?country=DE&sector=financial
// → { msa: "BaFin", contact: "...", website: "...",
//     requiredDocuments: ["AI registry entry", "FRIA", "Risk assessment"],
//     nationalRequirements: ["Additional BaFin guidelines for AI in banking"] }
```

#### Реализация

**Новые файлы:**
- `app/seeds/seed-regulators.js` — 30 MSA records (27 EU + 3 EEA)
- `schemas/Regulator.js` — MetaSQL (country, sector, msaName, contact, requirements)
- `app/api/regulators/directory.js` — GET with country/sector filter
- `app/(dashboard)/regulators/page.tsx` — directory UI with country/sector selectors
- `components/regulators/RegulatorCard.tsx` — per-MSA details

#### Критерии приёмки

- [ ] 30 MSA records (27 EU + 3 EEA)
- [ ] Filter by country + sector
- [ ] Per-MSA: contact, website, required documents, national requirements
- [ ] Auto-link to Passport.regulatoryContext.msaName

- **Tests:** 2 (regulator_directory_query.test, country_sector_filter.test)

---

### US-099: Certification Dashboard — ISO 42001 (3 SP)

- **Feature:** F40 🔴 | **Developer:** Nina

#### Описание

Как compliance officer, я хочу видеть готовность к ISO 42001 и AIUC-1 сертификации — per-system: сделано/осталось, управление evidence.

#### Dashboard

```
Certification Readiness
───────────────────────────────────────────────────────
ISO 42001 (AI Management System):  ███████░░░  68%
AIUC-1 (AI Use Case):              ██████░░░░  55%

Per-System Readiness:
┌──────────────────┬──────────┬──────────┐
│ System           │ ISO 42001│ AIUC-1   │
├──────────────────┼──────────┼──────────┤
│ ChatGPT          │  82% ✓   │  70% ⚠   │
│ HR Screening AI │  45% ✗   │  30% ✗   │
└──────────────────┴──────────┴──────────┘

Evidence Management: Upload evidence per criterion
Referral links: Partner certification bodies
```

#### Реализация

**Новые файлы:**
- `app/api/certification/readiness.js` — per-tool + org-wide readiness
- `app/domain/certification/ISO42001Criteria.js` — criteria definitions (pure)
- `app/(dashboard)/certification/page.tsx` — readiness dashboard
- `components/certification/ReadinessBar.tsx` — per-standard progress

#### Критерии приёмки

- [ ] ISO 42001 readiness: per-system + org-wide percentage
- [ ] AIUC-1 readiness: per-system + org-wide percentage
- [ ] Evidence upload: per criterion
- [ ] Partner referral links for certification bodies

- **Tests:** 2 (iso42001_readiness.test, evidence_upload.test)

---

### US-100: Онбординг + Уведомления (4 SP)

- **Feature:** F11 🟠 | **Developer:** Nina (frontend) + Leo (backend)

#### Описание

Как новый пользователь, я хочу onboarding wizard при первом входе. Как existing пользователь, я хочу уведомления: дедлайны, AI Literacy overdue, FRIA не создан.

#### Onboarding Wizard

```
Step 1: "What's your role?" → CTO / DPO / Developer / Other
Step 2: "How many AI tools does your org use?" → 1-5, 5-20, 20+
Step 3: "What's your biggest compliance concern?" → Deadlines / Classification / Documents
Step 4: → Personalized dashboard with role-based view + suggested actions
```

#### Notification System

```javascript
// Triggers (pg-boss cron jobs):
// - Deadline approaching: 180d / 90d / 30d / 14d / 7d before Aug 2, 2026
// - AI Literacy overdue: Art. 4 deadline passed, training not complete
// - FRIA missing: high-risk tool without FRIA
// - New tool discovered: CLI sync added new tool
// - Requirements not started: 0% compliance for critical obligations

// Channels:
// - In-app bell icon (notification center)
// - Email via Brevo (instant / daily digest / weekly digest — user preference)

// GET /api/notifications — list per user
// PATCH /api/notifications/:id/read — mark read
// PATCH /api/notifications/preferences — email frequency setting
```

#### Реализация

**Новые файлы:**
- `schemas/Notification.js` — MetaSQL
- `app/api/notifications/list.js` — GET paginated
- `app/api/notifications/preferences.js` — email settings
- `app/jobs/notification-checker.js` — pg-boss daily cron
- `app/application/notifications/checkDeadlines.js`
- `app/(dashboard)/onboarding/page.tsx` — 4-step wizard
- `components/notifications/NotificationBell.tsx` — bell icon + dropdown
- `components/notifications/NotificationCenter.tsx` — full list

#### Критерии приёмки

- [ ] Onboarding wizard: 4 steps → personalized dashboard
- [ ] Notifications: deadline, AI Literacy, FRIA, new tool, requirements
- [ ] In-app bell with count badge
- [ ] Email: instant / daily / weekly digest preference
- [ ] pg-boss cron: daily notification check

- **Tests:** 3 (deadline_notification.test, onboarding_flow.test, notification_preferences.test)

---

### US-101: SaaS Discovery — IdP + Shadow AI (2 SP)

- **Feature:** F29 🟡 | **Developer:** Leo

#### Описание

Как CTO, я хочу обнаруживать Shadow AI: AI tools, которые сотрудники используют через SSO (IdP), но которые не зарегистрированы в реестре.

#### IdP Discovery

```javascript
// WorkOS API: listConnections() → OAuth apps authorized by employees
// Match against AI Registry domains (openai.com, anthropic.com, etc.)
// Result: "3 employees use ChatGPT, 5 use Copilot — not in your registry"
// Human-in-the-loop: suggest adding, don't auto-add

// POST /api/discovery/idp-scan — trigger scan
// GET  /api/discovery/shadow-ai — tools in IdP but not in AITool registry
```

#### Реализация

**Новые файлы:**
- `app/api/discovery/idp-scan.js` — trigger WorkOS connected apps scan
- `app/api/discovery/shadow-ai.js` — diff: IdP apps vs registered tools
- `app/application/discovery/scanIdPApps.js` — WorkOS API + AI Registry match
- `app/(dashboard)/discovery/page.tsx` — Shadow AI UI

#### Критерии приёмки

- [ ] IdP scan: AI tools from SSO-authorized apps detected
- [ ] Shadow AI diff: tools in IdP but not in AITool registry
- [ ] Human-in-the-loop: suggest, don't auto-add
- [ ] Only AI-related apps matched (not all OAuth apps)

- **Tests:** 2 (idp_scan_pattern_match.test, shadow_ai_diff.test)

---

### US-102: Data Source Indicator (2 SP)

- **Feature:** F63 🟡 | **Developer:** Nina

#### Описание

Как DPO, я хочу видеть рядом с каждым полем Passport источник данных ("CLI scan, 27 фев" или "введено вручную"), чтобы отличать автоматические (надёжные) данные от ручных.

#### Реализация

```javascript
// Каждое поле Passport имеет metadata: { source: 'cli_scan' | 'manual' | 'wizard', updatedAt, updatedBy }
// При CLI Sync (F62) — source: 'cli_scan', updatedAt: scan timestamp
// При ручном вводе в wizard/edit — source: 'manual', updatedBy: userId
// При wizard auto-fill из Registry — source: 'registry_autofill'

// Frontend: DataSourceBadge component
// <DataSourceBadge source="cli_scan" updatedAt="2026-02-27T10:30:00Z" />
// Renders: "🔧 CLI scan, 27 Feb" (green dot) or "✍️ Manual, 25 Feb" (yellow dot)
```

**Новые файлы:**
- `frontend/components/shared/DataSourceBadge.tsx` — reusable badge
- `app/domain/inventory/services/FieldMetadata.js` — metadata helpers

**Модифицированные файлы:**
- `app/schemas/AITool.js` — add `fieldMetadata` JSON column
- `frontend/components/tools/PassportView.tsx` — render DataSourceBadge per field

#### Критерии приёмки

- [ ] DataSourceBadge renders source type + date for each Passport field
- [ ] CLI Sync writes source='cli_scan' with scan timestamp
- [ ] Manual edits write source='manual' with user ID
- [ ] Visual distinction: green dot (automated) vs yellow dot (manual)

- **Tests:** 2 (data_source_badge_render.test, field_metadata_merge.test)

---

### US-103: Remediation Cloud (3 SP)

- **Feature:** F31 🟡 | **Developer:** Max

#### Описание

Как compliance officer, после Gap Analysis я хочу получить пошаговые remediation playbooks: "У системы X нет human oversight → вот инструкция → нажмите → генерируем документ."

#### Реализация

```javascript
// Remediation playbook = structured JSON per AESIA category:
// { category: 'Human Oversight', steps: [...], documents: [...], effort: '~4h', priority }
//
// app/domain/compliance/services/RemediationEngine.js — pure domain:
// generatePlaybook(gapAnalysisResult) → RemediationPlaybook[]
// Each step: { title, description, action: 'generate_doc' | 'manual' | 'configure', docType? }
//
// POST /api/remediation/playbooks — generate from gap analysis
// GET  /api/remediation/playbooks/:toolId — get saved playbooks
// POST /api/remediation/playbooks/:id/steps/:stepId/complete — mark step done

// Frontend:
// RemediationPanel in Gap Analysis page
// Steps as checklist with action buttons ("Generate Document", "Mark Complete")
// Progress bar per category
```

**Новые файлы:**
- `app/domain/compliance/services/RemediationEngine.js` — playbook generator
- `app/api/remediation/playbooks.js` — CRUD handlers
- `app/application/compliance/generatePlaybooks.js` — use case
- `frontend/components/compliance/RemediationPanel.tsx` — UI panel
- `app/seeds/remediation-templates.js` — 12 AESIA playbook templates

**Модифицированные файлы:**
- `app/schemas/RemediationPlaybook.js` — new schema (MetaSQL)
- `frontend/app/(dashboard)/tools/[id]/gap-analysis/page.tsx` — embed RemediationPanel

#### Критерии приёмки

- [ ] Playbooks generated from Gap Analysis results (12 AESIA categories)
- [ ] Each step has action type: generate document, manual action, or configure
- [ ] Steps can be marked complete with progress tracking
- [ ] "Generate Document" action links to Doc Generators (F07)
- [ ] Priority ordering: critical gaps first
- [ ] Estimated effort per category

- **Tests:** 2 (playbook_generation.test, step_completion.test)

---

### US-104: Regulatory Monitoring (3 SP)

- **Feature:** F12 🟡 | **Developer:** Leo

#### Описание

Как compliance officer, я хочу получать уведомления об изменениях в законодательстве EU AI Act, чтобы вовремя обновлять compliance документы.

#### Реализация

```javascript
// pg-boss cron job: weekly EUR-Lex scraping
// Filter: deployer-relevant articles (Art. 4, 5, 6, 9, 26, 27, 49, 50, 72, 73)
// LLM impact analysis (Mistral Small): "How does this change affect deployer X?"
//
// app/domain/monitoring/services/RegulatoryScanner.js — pure domain:
// parseEurLexUpdate(html) → RegulatoryUpdate[]
// assessImpact(update, tools) → ImpactAssessment[]
//
// Schedule: pg-boss cron weekly
// POST /api/monitoring/regulatory/scan — manual trigger (admin only)
// GET  /api/monitoring/regulatory/updates — paginated list
// GET  /api/monitoring/regulatory/updates/:id/impact — per-tool impact

// Notification integration:
// New update → check per org → notify if relevant
// "AESIA обновила чеклист #5 — проверьте Risk Plan для HireVue"
```

**Новые файлы:**
- `app/domain/monitoring/services/RegulatoryScanner.js` — EUR-Lex parser
- `app/domain/monitoring/services/ImpactAnalyzer.js` — LLM impact assessment
- `app/application/monitoring/scanRegulatory.js` — use case
- `app/api/monitoring/regulatory.js` — API handlers
- `app/schemas/RegulatoryUpdate.js` — MetaSQL schema
- `app/schemas/ImpactAssessment.js` — MetaSQL schema
- `frontend/app/(dashboard)/monitoring/regulatory/page.tsx` — UI

**Модифицированные файлы:**
- `server/main.js` — register pg-boss cron for regulatory scanning
- `app/application/notification/sendNotification.js` — add regulatory update type

#### Критерии приёмки

- [ ] Weekly EUR-Lex scraping via pg-boss cron job
- [ ] Filter: only deployer-relevant AI Act articles
- [ ] LLM impact analysis per AI tool in organization
- [ ] Notifications: in-app + email when relevant changes detected
- [ ] Manual scan trigger for admins
- [ ] Historical log of all regulatory updates

- **Tests:** 2 (eurlex_parser.test, impact_analysis.test)

---

## Summary

| US | Feature | Developer | SP | Tests |
|----|---------|-----------|-----|-------|
| US-091 | F39: AI Systems Registry (unified) | Nina + Max | 5 | 3 |
| US-092 | F46: Wizard Steps 3-5 | Nina | 4 | 2 |
| US-093 | F56: Extended Passport Fields | Max | 3 | 2 |
| US-094 | F57/58/59: QMS + Risk + Monitoring Generators | Max | 5 | 3 |
| US-095 | F50: Compliance Badge | Nina | 3 | 2 |
| US-096 | F51: Vendor Documentation Request | Nina + Max | 4 | 3 |
| US-097 | F47: EU Database Helper | Leo | 3 | 2 |
| US-098 | F53: Regulator Directory | Leo | 3 | 2 |
| US-099 | F40: Certification Dashboard | Nina | 3 | 2 |
| US-100 | F11: Onboarding + Notifications | Nina + Leo | 4 | 3 |
| US-101 | F29: SaaS Discovery (IdP + Shadow AI) | Leo | 2 | 2 |
| US-102 | F63: Data Source Indicator | Nina | 2 | 2 |
| US-103 | F31: Remediation Cloud | Max | 3 | 2 |
| US-104 | F12: Regulatory Monitoring | Leo | 3 | 2 |
| **Итого** | | | **47** | **32** |

> Capacity: 47 SP (+5 над baseline 42 SP). Prioritization:
> - **Must (Sprint 9A):** US-091..094 (Registry+Wizard+Passport+Generators, 17 SP) + US-095..099 (Badge+Vendor+EU DB+Regulator+Cert, 16 SP) = 33 SP
> - **Should (Sprint 9B):** US-100..104 (Onboarding+Discovery+DataSource+Remediation+Monitoring, 14 SP)
> - **Could (defer to S10):** US-101 (Discovery, 2 SP)

---

## Definition of Done

- [ ] **AI Systems Registry:** Unified view (CLI + Manual + Discovery)
- [ ] **Wizard:** Full 5-step flow end-to-end
- [ ] **Extended Passport:** 6 new blocks (regulatory, incidents, monitoring, conformity, records, MSA)
- [ ] **Doc Generators:** QMS + Risk Plan + Monitoring Plan (section-by-section)
- [ ] **Compliance Badge:** 3 levels, embeddable widget, viral loop
- [ ] **Vendor Request:** Email template with legal refs, status tracking
- [ ] **EU Database Helper:** 40-field pre-fill from Passport
- [ ] **Regulator Directory:** 30 MSA records, country+sector filter
- [ ] **Certification Dashboard:** ISO 42001 + AIUC-1 readiness
- [ ] **Onboarding:** 4-step wizard, notification system
- [ ] **Data Source Indicator:** CLI/manual label on every field
- [ ] **Remediation Cloud:** Playbooks linked to Gap Analysis findings
- [ ] **Regulatory Monitoring:** EUR-Lex scraping, LLM impact analysis, notifications
- [ ] **DB migrations:** VendorRequest, Regulator, Notification, RegulatoryUpdate
- [ ] `npm test` — ~408 total, все green
- [ ] `npm run typecheck` — 0 errors
- [ ] Deploy to staging: Badge embed test, Vendor Request E2E

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| Sprint capacity (47 SP vs 42) | Средняя | Средний | Split into 9A/9B, defer US-101 |
| Vendor Request email deliverability | Средняя | Низкий | Brevo SPF/DKIM, copy-paste fallback |
| EU Database API format changes | Средняя | Средний | Manual field mapping, fallback to copy-paste |
| Badge CORS issues on external sites | Низкая | Средний | Proper CORS headers, CDN caching |
| EUR-Lex scraping stability (F12) | Средняя | Низкий | Fallback to manual updates, pg-boss retry logic |
| Remediation playbook accuracy | Средняя | Средний | Elena (AI Act expert) review, user-editable steps |
