# SPRINT-BACKLOG-010.md — Полная платформа

**Версия:** 2.0.0
**Дата:** 2026-02-28
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Planned
**Зависимости:** Sprint 9 (Реестр + Документы + Регулятор) merged to develop

---

## Sprint Goal

**Финальный спринт перед Aug 2, 2026 дедлайном EU AI Act.** Incident Management (Art. 73), Conformity Assessment (Annex VI), AESIA Export, Due Diligence Report, Real-time Monitoring, Enterprise Features (custom rules, API v1.0, audit log), AI Literacy Module (wedge product), Multi-language (DE/FR). Milestone: **FULL SCOPE**.

**Capacity:** ~42 SP | **Duration:** 4 недели
**Developers:** Max (Backend — Incident Mgmt + Conformity Assessment + Enterprise API + NHI + Predictions), Nina (Frontend — AI Literacy + Multi-language + AESIA Export UI + Benchmarking), Leo (Infra — Monitoring v2 + DD Report + MCP Analytics)
**Baseline:** ~408 tests (Sprint 9) → **New: ~35 tests (total: ~443)**

> **Prerequisite:** Sprint 9 merged to develop. AI Systems Registry live. Wizard 5-step complete. Doc Generators operational. Badge deployed. Vendor Request works.

---

## Граф зависимостей

```
US-111 (Incident Management) — параллельно, зависит от F39 (AI Systems Registry)

US-112 (Conformity Assessment) — зависит от US-081 (FRIA) + US-082 (Doc Generators)

US-113 (AESIA Export) — зависит от US-085 (Gap Analysis) + US-082 (Doc Generators)

US-114 (DD Report) — зависит от US-083 (Audit Package) + US-084 (Dashboard v2)

US-115 (Monitoring v2) — зависит от US-086 (Timeline) + US-104 (Notifications)

US-116 (Enterprise Features) — зависит от US-084 (Dashboard v2)

US-117 (AI Literacy) — параллельно, зависит от F02 (IAM)

US-117 ──► US-118 (Multi-language DE/FR — includes AI Literacy content)

US-119 (MCP Proxy Analytics) — зависит от F62 (CLI Sync)
US-120 (NHI Dashboard) — параллельно
US-121 (Predictive Analysis) — зависит от US-115 (Monitoring v2 data)
US-122 (Benchmarking) — параллельно, min 5 orgs per sector
```

---

## User Stories

### US-111: Incident Management — Art. 73 (5 SP)

- **Feature:** F55 🟠 | **Developer:** Max

#### Описание

Как compliance officer, я хочу полный incident management lifecycle: от обнаружения нарушения AI системы до отчёта регулятору — с соблюдением Art. 73 (2 дня при смерти/серьёзном ущербе, 15 дней иначе).

#### Incident Lifecycle

```
Detection → Classification → Escalation → Investigation →
  → Corrective Actions → Regulator Report → Resolution → Closure

Timeline requirements (Art. 73):
— Серьёзный инцидент (смерть, здоровье): 2 рабочих дня → MSA
— Другой инцидент: 15 рабочих дней → MSA
— Follow-up report: после расследования
```

#### API Endpoints

```javascript
// POST /api/incidents                    — create incident (auto or manual)
// GET  /api/incidents                    — list (filterable: status, severity, tool)
// GET  /api/incidents/:id               — full details + timeline
// PATCH /api/incidents/:id/status       — update status
// POST /api/incidents/:id/escalate      — escalate to MSA
// POST /api/incidents/:id/report        — generate MSA report
// POST /api/incidents/:id/corrective    — add corrective action
// GET  /api/incidents/stats             — aggregate stats for dashboard

// Auto-detection triggers (from Monitoring):
// - Score drop > 30 points in 24h → auto-create incident (severity: high)
// - User complaint count spike → auto-create (severity: medium)
// - Scanner finds new critical violation → auto-create (severity: medium)
```

#### Новые таблицы

```javascript
// schemas/ComplianceIncident.js:
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  aiTool: { type: 'AITool', nullable: true, delete: 'set null' },
  title: { type: 'string' },
  description: { type: 'text' },
  severity: { type: 'string' },       // critical|high|medium|low
  category: { type: 'string' },       // accuracy|bias|security|privacy|transparency|other
  articleRef: { type: 'string', nullable: true },
  status: { type: 'string', default: "'open'" },
  // open|investigating|corrective_action|reported|resolved|closed
  assignedTo: { type: 'integer', nullable: true },
  detectedAt: 'datetime',
  reportDeadline: { type: 'datetime', nullable: true }, // 2 or 15 business days
  reportedToMSA: { type: 'boolean', default: false },
  reportedAt: { type: 'datetime', nullable: true },
  resolvedAt: { type: 'datetime', nullable: true },
  timeline: { type: 'json', default: "'[]'" },  // [{timestamp, action, author, note}]
  correctiveActions: { type: 'json', default: "'[]'" },
});
```

#### MSA Report Generation

```javascript
// POST /api/incidents/:id/report → generates PDF:
// — Incident summary (date, system, description)
// — Classification (Art. 73 severity + category)
// — Immediate measures taken
// — Root cause analysis (if completed)
// — Corrective actions planned/completed
// — Timeline of events
// → Gotenberg PDF → S3 → attached to Passport.msaSubmissions
```

#### Реализация

**Новые файлы (backend/):**
- `schemas/ComplianceIncident.js`
- `app/api/incidents/crud.js` — create, list, get, update status
- `app/api/incidents/escalate.js` — escalation + deadline calculation
- `app/api/incidents/report.js` — MSA report PDF
- `app/api/incidents/stats.js` — aggregate for dashboard
- `app/application/incidents/createIncident.js`
- `app/application/incidents/calculateReportDeadline.js` — 2 or 15 business days
- `app/application/incidents/generateMSAReport.js` — LLM + Gotenberg
- `app/domain/incidents/IncidentClassifier.js` — severity + deadline rules (pure)
- `app/jobs/incident-deadline-checker.js` — pg-boss: alert on approaching deadlines

**Новые файлы (frontend/):**
- `app/(dashboard)/incidents/page.tsx` — incident list
- `app/(dashboard)/incidents/[id]/page.tsx` — incident detail + timeline
- `app/(dashboard)/incidents/create/page.tsx` — manual create form
- `components/incidents/IncidentTimeline.tsx` — visual timeline
- `components/incidents/SeverityBadge.tsx` — severity indicator
- `components/incidents/DeadlineCountdown.tsx` — days until MSA report due

#### Критерии приёмки

- [ ] Full lifecycle: open → investigating → corrective_action → reported → resolved → closed
- [ ] Art. 73 deadlines: 2 business days (серьёзный), 15 business days (иной)
- [ ] Report deadline auto-calculated based on severity
- [ ] MSA Report PDF generation (Gotenberg)
- [ ] Timeline: every status change logged with author + timestamp
- [ ] Corrective actions: add, track, close
- [ ] Auto-detection: score drop, complaint spike, critical violation
- [ ] Dashboard widget: open incidents count + deadline countdown
- [ ] pg-boss: daily check for approaching deadlines → notification
- [ ] Linked to AI tool in registry
- [ ] Plan enforcement: Growth+ required

- **Tests:** 5 (incident_lifecycle.test, deadline_calculation.test, msa_report_pdf.test, auto_detection_triggers.test, incident_stats.test)

---

### US-112: Conformity Assessment Wizard — Annex VI (4 SP)

- **Feature:** F60 🟠 | **Developer:** Max

#### Описание

Как deployer high-risk AI, я хочу пройти самооценку по Annex VI (internal control) — предзаполненную из Passport + Scanner + FRIA — и получить Conformity Assessment Report + Declaration of Conformity.

> Для high-risk AI перед размещением на рынке (Art. 43).

#### Wizard

```
Step 1: System identification (from Passport)
Step 2: QMS compliance check (from QMS document)
Step 3: Risk Management compliance (from Risk Plan)
Step 4: Technical Documentation check (from Passport + docs)
Step 5: Data Governance verification
Step 6: Human Oversight verification (from Passport.autonomyLevel)
Step 7: Accuracy, Robustness, Cybersecurity (from Scanner)
Step 8: Review → Generate Report

Pre-fill: 60-90% from existing Passport + Scanner + FRIA data
Output: Conformity Assessment Report PDF + Declaration of Conformity PDF
```

#### API

```javascript
// POST /api/conformity/start/:aiToolId     — start assessment (pre-fill from data)
// GET  /api/conformity/:id                 — assessment status + sections
// PUT  /api/conformity/:id/section/:sid    — update section
// POST /api/conformity/:id/complete        — generate reports
// GET  /api/conformity/:id/report          — download report PDF
// GET  /api/conformity/:id/declaration     — download declaration PDF
```

#### Реализация

**Новые файлы:**
- `schemas/ConformityAssessment.js` — MetaSQL
- `app/api/conformity/assessment.js` — wizard endpoints
- `app/application/conformity/prefillFromPassport.js` — pre-fill logic
- `app/application/conformity/generateReport.js` — Gotenberg PDF
- `app/domain/conformity/AnnexVICriteria.js` — 8 Annex VI criteria (pure)
- `app/(dashboard)/conformity/[toolId]/page.tsx` — wizard UI
- `components/conformity/CriterionCard.tsx` — per-criterion status

#### Критерии приёмки

- [ ] 8-step wizard matching Annex VI sections
- [ ] Pre-fill 60-90% from Passport + Scanner + FRIA
- [ ] Conformity Assessment Report PDF
- [ ] Declaration of Conformity PDF
- [ ] Results stored in Passport.conformityAssessment
- [ ] Only for high-risk AI tools
- [ ] Plan enforcement: Growth+ required

- **Tests:** 3 (conformity_prefill.test, annex_vi_criteria.test, conformity_report_pdf.test)

---

### US-113: AESIA Export — 12 Excel Files (3 SP)

- **Feature:** F54 🟡 | **Developer:** Nina

#### Описание

Как deployer в Испании (или любой EU стране), я хочу экспортировать 12 Excel-файлов в формате испанского регулятора AESIA — чтобы использовать их как baseline для compliance.

#### 12 AESIA Checklists

| # | Checklist | AESIA # |
|---|-----------|---------|
| 1 | Organization profile | #1 |
| 2 | AI System inventory | #2 |
| 3 | Technical documentation | #3 |
| 4 | Quality Management System | #4 |
| 5 | Risk Management | #5 |
| 6 | Human Oversight | #6 |
| 7 | Data Governance | #7 |
| 8 | Transparency | #8 |
| 9 | Accuracy | #9 |
| 10 | Robustness | #10 |
| 11 | Cybersecurity | #11 |
| 12 | Logging | #12 |

```javascript
// POST /api/export/aesia — trigger Excel generation
// GET  /api/export/aesia/download/:id — download ZIP with 12 xlsx files
// Each Excel: pre-filled from org data, per AESIA template structure
```

#### Реализация

**Новые файлы:**
- `app/api/export/aesia.js` — trigger + download
- `app/application/export/generateAESIAExcel.js` — Excel generation (xlsx library)
- `app/domain/export/AESIATemplates.js` — 12 template structures (pure)
- `app/(dashboard)/export/aesia/page.tsx` — UI: trigger + download

**Новые deps:** `xlsx` (SheetJS) для Excel generation

#### Критерии приёмки

- [ ] 12 Excel files matching AESIA template structure
- [ ] Pre-filled from org data (AI tools, passport, gap analysis)
- [ ] ZIP download with all 12 files
- [ ] Usable in any EU country as compliance baseline
- [ ] Plan enforcement: Growth+ required

- **Tests:** 2 (aesia_excel_generation.test, aesia_12_templates.test)

---

### US-114: Due Diligence Report (3 SP)

- **Feature:** F52 🟡 | **Developer:** Leo

#### Описание

Как CTO, я хочу PDF отчёт для совета директоров / инвестора / страховой — на бизнес-языке, без технических деталей — с агрегированной compliance картиной организации.

> Отличается от Audit Package (для регулятора): DD Report — для C-level/board, бизнес-фокус.

#### Report Contents

```
Due Diligence AI Compliance Report — {OrgName}
═══════════════════════════════════════════════

1. Executive Summary
   — Overall AI compliance posture: [Good/Fair/Needs Attention]
   — Regulatory deadline: Aug 2, 2026 (X days remaining)
   — Financial exposure: €XX.XM (potential penalties)

2. AI Portfolio Overview
   — Total AI systems: X
   — Risk distribution: X high, X limited, X minimal
   — Compliance score: X/100 (trend: ↑/↓/→)

3. Key Risks
   — Top 3 compliance gaps
   — Recommended actions (business language)
   — Estimated effort to close gaps

4. Compliance Timeline
   — Milestones completed
   — Upcoming deadlines
   — Critical path items

5. Certification Readiness
   — ISO 42001: X% ready
   — AIUC-1: X% ready

6. Recommendation
   — Board-level recommendation
   — Budget estimate for full compliance
```

#### API

```javascript
// POST /api/reports/due-diligence — generate (async, LLM for executive summary)
// GET  /api/reports/due-diligence/download/:id — PDF
```

#### Реализация

**Новые файлы:**
- `app/api/reports/due-diligence.js` — trigger + download
- `app/application/reports/generateDDReport.js` — data aggregation + LLM summary
- `app/(dashboard)/reports/due-diligence/page.tsx` — UI

#### Критерии приёмки

- [ ] PDF report: 5-10 pages, business language
- [ ] Executive summary: LLM-generated (Mistral Medium 3)
- [ ] Financial exposure calculation (penalties)
- [ ] Compliance score trend
- [ ] Certification readiness included
- [ ] Plan enforcement: Growth+ required

- **Tests:** 2 (dd_report_generation.test, dd_report_contents.test)

---

### US-115: Monitoring v2 — Scheduled Reports + Drift + SLA (5 SP)

- **Feature:** F32 🟠 | **Developer:** Leo

#### Описание

Как DPO, я хочу: (1) scheduled compliance digest по email, (2) drift detection alerts, (3) SLA tracking per plan, (4) score heatmap.

#### Scheduled Reports

```javascript
// POST /api/monitoring/reports/schedule
// { frequency: 'weekly'|'monthly', recipients: [...], format: 'pdf'|'csv' }

// pg-boss job: check_scheduled_reports — daily 08:00 UTC
// Weekly digest:
// — Org-wide score change (+/- delta)
// — Top 3 improvements + top 3 deteriorations
// — Active alerts (drift, anomalies)
// — Upcoming deadlines (30 days)
// → PDF (Gotenberg) + email (Brevo)
```

#### Drift Detection

```javascript
// pg-boss job: drift_detection — daily
// Alert if: score drop > 15 points in 7 days
// Alert if: unusual activity spike (> 10x normal)
// Alert if: regulatory update affects org's tools

// GET /api/monitoring/alerts — active alerts
// POST /api/monitoring/alerts/configure — threshold + channels
```

#### Score Heatmap

```
Score Heatmap (org-wide, 30d)
┌──────────────────────────────────────────────────────────────────┐
│ System          Feb01 Feb08 Feb15 Feb22                           │
│ hr-screening    ████  ████  ████  ████  (RED 34)                  │
│ customer-bot    ████  ████  ████  ████  (GREEN 82)                │
│ LangChain API   ████  ████  ████  ████  (AMBER 61)               │
└──────────────────────────────────────────────────────────────────┘
```

#### SLA Tracking

```javascript
// SLA per plan:
// Starter: no SLA
// Growth: target score visibility, 48h response
// Enterprise: 95% target, 4h response, dedicated support

// GET /api/monitoring/sla — current SLA status
```

#### Реализация

**Новые файлы:**
- `schemas/ScheduledReport.js` — MetaSQL
- `app/api/monitoring/reports.js` — schedule CRUD
- `app/api/monitoring/alerts.js` — GET + configure
- `app/api/monitoring/heatmap.js` — score matrix
- `app/api/monitoring/sla.js` — SLA status
- `app/application/monitoring/generateComplianceDigest.js` — weekly/monthly content
- `app/application/monitoring/detectDrift.js` — drift logic
- `app/application/monitoring/detectAnomalies.js` — anomaly detection
- `app/jobs/scheduled-reports.js` — pg-boss daily
- `app/jobs/drift-detection.js` — pg-boss daily
- `app/(dashboard)/monitoring/page.tsx` — monitoring dashboard
- `components/monitoring/AlertPanel.tsx`
- `components/monitoring/ScoreHeatmap.tsx`
- `components/monitoring/RegulationFeed.tsx`

#### Критерии приёмки

- [ ] Scheduled reports: weekly/monthly email with PDF attachment
- [ ] pg-boss job: sends at 08:00 UTC
- [ ] Drift alert: score drop > 15 points → alert created
- [ ] Anomaly: spike > 10x → flag
- [ ] Score heatmap: matrix for 30 days
- [ ] Alert configuration: threshold + notification channels
- [ ] SLA page: plan SLA + current status

- **Tests:** 4 (scheduled_report.test, drift_detection.test, anomaly_detection.test, heatmap_aggregation.test)

---

### US-116: Enterprise Features — Custom Rules + API v1.0 + Audit Log (5 SP)

- **Feature:** F33 🟡 | **Developer:** Max

#### Описание

Как enterprise CTO, я хочу: (1) custom compliance rules (YAML), (2) stable API v1.0 для SIEM, (3) полный audit log для регулятора, (4) custom roles.

#### Custom Compliance Rules

```javascript
// POST /api/enterprise/rules
// {
//   name: "Auto-require FRIA for HR tools",
//   condition: { field: "category", op: "contains", value: "hr" },
//   action: "require_fria",
//   isActive: true
// }
// Actions: require_fria | block_deployment | warn | notify_cto | escalate
```

#### API v1.0 — Stable

```javascript
// Versioned: /api/v1/ prefix (stable, breaking changes → v2)
// Key endpoints:
// GET /api/v1/compliance/summary    — org score + breakdown
// GET /api/v1/compliance/tools      — all AI tools + risk
// GET /api/v1/compliance/violations — open violations
// GET /api/v1/compliance/audit-trail — audit events (paginated)

// Auth: API Key (existing from F26)
// Rate: Enterprise 1000/hr, Growth 100/hr
// OpenAPI 3.0 spec: GET /api/v1/openapi.json
```

#### Audit Log Export

```javascript
// GET /api/enterprise/audit-trail?format=csv&from=2026-01-01&to=2026-08-01
// → CSV | JSON for regulators/SIEM
// Columns: timestamp, userId, action, resource, details, ipAddress
```

#### Custom Roles

```javascript
// POST /api/enterprise/roles — create custom role
// { name: "compliance-auditor", permissions: { "tools:read": true, "fria:approve": true } }
// Built-in roles (owner/admin/member/viewer) cannot be deleted
```

#### Реализация

**Новые файлы:**
- `schemas/CustomComplianceRule.js` — MetaSQL
- `schemas/CustomRole.js` — MetaSQL
- `app/api/enterprise/rules.js` — CRUD
- `app/api/enterprise/roles.js` — CRUD + assign
- `app/api/enterprise/audit-trail.js` — export CSV/JSON
- `app/api/v1/compliance.js` — stable endpoints
- `app/api/v1/openapi.js` — OpenAPI spec
- `app/(dashboard)/enterprise/rules/page.tsx` — custom rules UI
- `app/(dashboard)/enterprise/roles/page.tsx` — custom roles UI
- `app/(dashboard)/enterprise/audit/page.tsx` — audit trail viewer

**Модифицированные файлы:**
- `app/application/auth/checkPermissions.js` — support custom roles
- `server/routes/api-v1.js` — mount stable v1 routes

#### Критерии приёмки

- [ ] Custom rules: CRUD + condition/action engine
- [ ] API v1.0: stable endpoints + OpenAPI docs
- [ ] API rate limiting per plan
- [ ] Audit trail: CSV + JSON export for regulators
- [ ] Custom roles: create + assign + permission check
- [ ] Built-in roles protected from deletion
- [ ] Enterprise routes: plan enforcement (Enterprise only for rules/roles, Growth for API)

- **Tests:** 4 (custom_rules_engine.test, api_v1_endpoints.test, audit_trail_export.test, custom_roles_permissions.test)

---

### US-117: AI Literacy Module — Art. 4 Wedge Product (8 SP)

- **Feature:** F18 🟡 | **Developer:** Max (backend) + Nina (frontend)

#### Описание

Как HR Director, я хочу обеспечить Art. 4 AI Act — все сотрудники прошли AI Literacy обучение. Import CSV, назначить курсы по роли, quiz, PDF сертификаты.

> **Wedge Product:** AI Literacy standalone. Art. 4 уже обязателен (Feb 2025). Отдельный CTA.

#### 4 Курса

| Курс | Для кого | Модулей | Длит. |
|------|----------|---------|-------|
| Executive | CEO, CTO, руководство | 3 | ~20 мин |
| HR Manager | HR, рекрутеры | 4 | ~30 мин |
| Developer | Разработчики, IT | 5 | ~40 мин |
| General | Все сотрудники | 3 | ~15 мин |

#### Employee Import + Enrollment

```javascript
// POST /api/literacy/employees/import
// CSV: name, email, department, role
// → Employee records + CourseEnrollment per assigned course
// → pg-boss job: send invitation emails (Brevo, batch)

// POST /api/literacy/courses/assign
// { employeeIds: [...], courseSlug: 'general', deadline: '2026-08-01' }
```

#### Course Player

```
Module 1: "What is AI?" → content → quiz (5 questions) → score
Module 2: "EU AI Act Basics" → content → quiz → score
Module 3: "Your Role in AI Compliance" → content → quiz → score

Completion: avg quiz score ≥ 70% → certificate generated
```

#### Certificates

```javascript
// PDF via Gotenberg:
// Employee: "Anna Schmidt completed Executive AI Literacy Course (Score: 92%)"
// Org: "Acme GmbH — 100% of employees completed Art. 4 training"
// (Org cert only at 100% completion)
```

#### Dashboard Widget

```
AI Literacy Compliance (Art. 4)                     Due: Feb 2, 2025 (OVERDUE)

🎓 71% Complete  ████████████████░░░░░░  32/45 employees

⚠ 5 employees overdue → Send reminder

By Department:
  HR:          ████████████████████ 100% (4/4)  ✓
  Engineering: ████████████░░░░░░░░  60% (15/25) ⚠
  Marketing:   ██████████░░░░░░░░░░  50% (8/16)  ⚠

[Import Employees]  [Assign Courses]  [Send Reminder]  [Download Cert]
```

#### Новые таблицы

```javascript
// schemas/LiteracyCourse.js
({
  Details: {},
  slug: { type: 'string', unique: true },
  title: { type: 'string' },
  targetRole: { type: 'string' },
  modules: { type: 'json' },       // [{id, title, content, quiz: [{q, options, answer}]}]
  durationMinutes: { type: 'integer' },
  isActive: { type: 'boolean', default: true },
});

// schemas/Employee.js
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  name: { type: 'string' },
  email: { type: 'string' },
  department: { type: 'string', nullable: true },
  role: { type: 'string', nullable: true },
  importedAt: 'datetime',
  invitedAt: { type: 'datetime', nullable: true },
});

// schemas/CourseEnrollment.js
({
  Details: {},
  employee: { type: 'Employee', delete: 'cascade' },
  course: { type: 'LiteracyCourse', delete: 'cascade' },
  organization: { type: 'Organization', delete: 'cascade' },
  status: { type: 'string', default: "'not_started'" },
  progress: { type: 'integer', default: 0 },
  score: { type: 'integer', nullable: true },
  completedAt: { type: 'datetime', nullable: true },
  certificateUrl: { type: 'string', nullable: true },
});
```

#### Реализация

**Новые файлы (backend/):**
- `schemas/LiteracyCourse.js`, `schemas/Employee.js`, `schemas/CourseEnrollment.js`
- `app/api/literacy/employees.js` — import + list
- `app/api/literacy/courses.js` — assign + list
- `app/api/literacy/enrollments.js` — progress + completion
- `app/api/literacy/certificates.js` — generate + download
- `app/api/literacy/stats.js` — dashboard widget data
- `app/application/literacy/importEmployeesCSV.js`
- `app/application/literacy/generateCertificate.js` — Gotenberg
- `app/jobs/literacy-invitations.js` — pg-boss batch email
- `data/courses/executive.json`, `hr-manager.json`, `developer.json`, `general.json`

**Новые файлы (frontend/):**
- `app/(dashboard)/ai-literacy/page.tsx` — dashboard
- `app/(dashboard)/ai-literacy/employees/page.tsx` — employee list + import
- `app/(dashboard)/ai-literacy/courses/page.tsx` — course management
- `app/(dashboard)/ai-literacy/[enrollmentId]/course.tsx` — course player
- `components/literacy/ProgressBar.tsx`
- `components/literacy/CourseCard.tsx`
- `components/literacy/QuizPlayer.tsx`
- `components/literacy/CertificateDownload.tsx`

#### Критерии приёмки

- [ ] CSV import: 100+ employees at once
- [ ] 4 courses with quizzes (5-10 questions per module)
- [ ] Course assignment: by role (auto) + manual
- [ ] Invitation email via Brevo with personal link
- [ ] Course player: modules → quiz → completion
- [ ] Certificate PDF (Gotenberg) for employee + org-level
- [ ] Dashboard widget: completion rate + overdue count
- [ ] Per-department breakdown
- [ ] Deadline tracking: overdue status
- [ ] Plan enforcement: Starter+ (was Starter, now included in Growth pricing)

- **Tests:** 5 (employee_csv_import.test, course_completion.test, certificate_pdf.test, org_certificate_100pct.test, literacy_stats.test)

---

### US-118: Multi-language — DE + FR (5 SP)

- **Feature:** F14 🟠 | **Developer:** Nina

#### Описание

Как немецкий или французский пользователь, я хочу использовать платформу на своём языке — UI, AI Literacy курсы, compliance documents.

#### i18n Architecture

```javascript
// next-intl: уже установлен (EN - default)
// Добавляем: DE + FR
// messages/en.json — ~1,200 keys (base)
// messages/de.json — full translation
// messages/fr.json — full translation

// Locale detection:
// 1. User profile (Organization.locale)
// 2. Accept-Language header
// 3. EN default
```

#### Multi-language Scope

| Component | Languages | Notes |
|-----------|-----------|-------|
| Dashboard UI | EN/DE/FR | ~1,200 i18n keys |
| AI Literacy courses | EN/DE/FR | 4 courses × 3 languages |
| Notifications | EN/DE/FR | Email + in-app locale-aware |
| Compliance documents | EN/DE/FR | LLM generates in user locale |
| PDF certificates | EN/DE/FR | Template-based |

#### Реализация

**Новые файлы:**
- `messages/de.json` — ~1,200 keys German
- `messages/fr.json` — ~1,200 keys French
- `data/courses/executive.de.json`, `hr-manager.de.json`, `developer.de.json`, `general.de.json`
- `data/courses/executive.fr.json`, `hr-manager.fr.json`, `developer.fr.json`, `general.fr.json`
- `app/api/settings/locale.js` — locale update endpoint

**Модифицированные файлы:**
- `middleware.ts` — locale detection + routing
- `app/i18n.ts` — add de + fr to supported locales
- `app/(dashboard)/settings/page.tsx` — language switcher
- `app/application/documents/generateDocumentDraft.js` — locale-aware generation

#### Критерии приёмки

- [ ] Full UI available in DE + FR (~1,200 keys translated)
- [ ] Language switcher in Settings: EN/DE/FR
- [ ] AI Literacy courses available in DE + FR
- [ ] Compliance documents generated in user locale
- [ ] PDF certificates in correct locale
- [ ] EN remains default if locale not set
- [ ] Locale persists per Organization

- **Tests:** 2 (locale_switching.test, locale_document_generation.test)

---

### US-119: MCP Proxy Analytics (3 SP)

- **Feature:** F41 🟡 | **Developer:** Leo

#### Описание

Как CTO, я хочу видеть аналитику по AI запросам через MCP Proxy (CLI runtime): прошедшие/заблокированные, объёмы, паттерны — чтобы понимать, как AI используется в организации.

#### Реализация

```javascript
// MCP Proxy в CLI собирает telemetry: request_count, blocked_count, model, latency, tokens
// CLI Sync (F62) отправляет агрегированные данные в SaaS: POST /api/sync/mcp-telemetry
//
// Dashboard widget:
// - Total AI requests (24h / 7d / 30d)
// - Blocked requests (by policy)
// - Top models used (pie chart)
// - Average latency
// - Token usage by tool
//
// GET /api/analytics/mcp — aggregated data for dashboard
// GET /api/analytics/mcp/tools/:toolId — per-tool breakdown

// Schema: MCPTelemetry { telemetryId, organizationId, toolId, period, requestCount,
//   blockedCount, tokenCount, models[], avgLatency, createdAt }
```

**Новые файлы:**
- `app/api/analytics/mcp.js` — aggregation endpoints
- `app/api/sync/mcp-telemetry.js` — receive telemetry from CLI
- `app/schemas/MCPTelemetry.js` — MetaSQL schema
- `frontend/components/analytics/MCPAnalyticsWidget.tsx` — dashboard widget
- `frontend/app/(dashboard)/analytics/mcp/page.tsx` — full analytics page

**Модифицированные файлы:**
- `frontend/app/(dashboard)/page.tsx` — add MCP Analytics widget to dashboard

#### Критерии приёмки

- [ ] CLI sync sends aggregated MCP telemetry data
- [ ] Dashboard widget: request/blocked counts, top models, token usage
- [ ] Per-tool breakdown view
- [ ] Time range filter (24h / 7d / 30d)
- [ ] Multi-tenancy: only org's own telemetry

- **Tests:** 2 (mcp_telemetry_sync.test, mcp_analytics_aggregation.test)

---

### US-120: NHI Dashboard — Non-Human Identities (3 SP)

- **Feature:** F43 🟡 | **Developer:** Max

#### Описание

Как security officer, я хочу видеть все Non-Human Identities (API ключи, service accounts, automated agents) в организации — кто, когда, сколько, какие разрешения.

#### Реализация

```javascript
// NHI = API keys, service accounts, CI/CD tokens, automated agents
// Data sources:
// - WorkOS API: service accounts, API tokens
// - CLI scan results: detected AI API keys in codebase
// - Manual registry: user-added NHIs
//
// GET  /api/nhi — list all NHIs for org
// POST /api/nhi — register NHI manually
// GET  /api/nhi/:id — NHI details (permissions, usage, last active)
//
// Dashboard:
// - Total NHI count + active/inactive
// - NHIs by type (API key, service account, agent)
// - Last activity per NHI
// - Permissions summary (what can each NHI access?)
// - Alerts: inactive NHIs (>90d), overprivileged NHIs

// Schema: NonHumanIdentity { nhiId, organizationId, name, type, permissions[],
//   lastActiveAt, createdBy, status, metadata }
```

**Новые файлы:**
- `app/api/nhi/index.js` — CRUD endpoints
- `app/schemas/NonHumanIdentity.js` — MetaSQL schema
- `app/application/security/listNHIs.js` — use case
- `frontend/app/(dashboard)/security/nhi/page.tsx` — NHI dashboard
- `frontend/components/security/NHITable.tsx` — NHI list with filters

**Модифицированные файлы:**
- `frontend/app/(dashboard)/page.tsx` — add NHI summary widget

#### Критерии приёмки

- [ ] CRUD for Non-Human Identities
- [ ] Auto-detection from CLI scan results (AI API keys)
- [ ] Dashboard: NHI count, types, activity, permissions
- [ ] Alert: inactive NHIs (>90d), overprivileged
- [ ] Multi-tenancy: only org's own NHIs

- **Tests:** 2 (nhi_crud.test, nhi_alerts.test)

---

### US-121: Predictive Analysis (3 SP)

- **Feature:** F44 🟡 | **Developer:** Max

#### Описание

Как compliance officer, я хочу видеть предсказания: "Через 30 дней система X нарушит порог accuracy", "Score падает — вот почему" — чтобы превентивно реагировать.

#### Реализация

```javascript
// Predictive model: linear regression on historical compliance scores
// Data: ComplianceScore history (from F48 Timeline + Monitoring data)
//
// app/domain/analytics/services/PredictiveEngine.js — pure domain:
// predictScoreTrend(history[]) → { trend: 'rising'|'falling'|'stable', predictedScore30d, confidence }
// predictThresholdBreach(history[], threshold) → { willBreach, daysUntilBreach, metric }
// explainScoreDrop(currentScore, previousScore, changes[]) → string[]
//
// GET /api/analytics/predictions/:toolId — predictions for tool
// GET /api/analytics/predictions/org — org-wide predictions

// Dashboard widget: "Attention needed" — tools with predicted score drop
// Notification: when predicted breach < 30 days
```

**Новые файлы:**
- `app/domain/analytics/services/PredictiveEngine.js` — trend + breach prediction
- `app/api/analytics/predictions.js` — API endpoints
- `app/application/analytics/generatePredictions.js` — use case (pg-boss daily cron)
- `frontend/components/analytics/PredictionWidget.tsx` — dashboard widget
- `frontend/components/analytics/ScoreTrendChart.tsx` — trend visualization

**Модифицированные файлы:**
- `frontend/app/(dashboard)/page.tsx` — add Prediction widget
- `server/main.js` — register daily prediction cron job

#### Критерии приёмки

- [ ] Score trend prediction (30-day horizon)
- [ ] Threshold breach prediction with days-until-breach
- [ ] Score drop explanation (root cause analysis)
- [ ] Dashboard widget: tools needing attention
- [ ] Notification on predicted breach < 30d
- [ ] Minimum 30 days of data required for predictions

- **Tests:** 2 (score_trend_prediction.test, breach_detection.test)

---

### US-122: Benchmarking (2 SP)

- **Feature:** F45 🟢 | **Developer:** Nina

#### Описание

Как CTO, я хочу сравнить compliance score своей организации с анонимными данными по отрасли: "Ваш score 72% — выше среднего в fintech (64%)" — чтобы понимать позицию.

#### Реализация

```javascript
// Anonymous aggregation: per sector (fintech, healthtech, edtech, etc.)
// Data source: all orgs with sector set + opt-in (default: opted in)
//
// pg-boss weekly cron: aggregate anonymous stats per sector
// { sector, avgScore, medianScore, p25, p75, toolCount, orgCount }
//
// GET /api/analytics/benchmark — org's position vs sector
// Response: { orgScore, sectorAvg, sectorMedian, percentile, sectorOrgCount }
//
// Privacy: no org-identifiable data, minimum 5 orgs per sector to show stats
// Opt-out: Organization.benchmarkOptIn (boolean, default true)

// Dashboard widget: "Your compliance: 72% — top 30% in fintech"
// Visual: gauge chart with sector distribution
```

**Новые файлы:**
- `app/api/analytics/benchmark.js` — benchmark endpoint
- `app/application/analytics/aggregateBenchmarks.js` — weekly cron job
- `app/schemas/SectorBenchmark.js` — MetaSQL schema
- `frontend/components/analytics/BenchmarkWidget.tsx` — gauge chart widget

**Модифицированные файлы:**
- `app/schemas/Organization.js` — add benchmarkOptIn field
- `frontend/app/(dashboard)/page.tsx` — add Benchmark widget
- `server/main.js` — register weekly benchmark cron job

#### Критерии приёмки

- [ ] Anonymous sector benchmarks (minimum 5 orgs per sector)
- [ ] Percentile calculation: "top X% in your sector"
- [ ] Opt-out: Organization can disable benchmarking
- [ ] Dashboard widget: score vs sector average
- [ ] Weekly aggregation via pg-boss cron
- [ ] Privacy: no org-identifiable data exposed

- **Tests:** 2 (benchmark_aggregation.test, benchmark_privacy.test)

---

## Summary

| US | Feature | Developer | SP | Tests |
|----|---------|-----------|-----|-------|
| US-111 | F55: Incident Management (Art. 73) | Max | 5 | 5 |
| US-112 | F60: Conformity Assessment (Annex VI) | Max | 4 | 3 |
| US-113 | F54: AESIA Export (12 Excel) | Nina | 3 | 2 |
| US-114 | F52: Due Diligence Report | Leo | 3 | 2 |
| US-115 | F32: Monitoring v2 (Reports + Drift + SLA) | Leo | 5 | 4 |
| US-116 | F33: Enterprise (Rules + API v1.0 + Audit + Roles) | Max | 5 | 4 |
| US-117 | F18: AI Literacy Module | Max + Nina | 8 | 5 |
| US-118 | F14: Multi-language DE + FR | Nina | 5 | 2 |
| US-119 | F41: MCP Proxy Analytics | Leo | 3 | 2 |
| US-120 | F43: NHI Dashboard | Max | 3 | 2 |
| US-121 | F44: Predictive Analysis | Max | 3 | 2 |
| US-122 | F45: Benchmarking | Nina | 2 | 2 |
| **Итого** | | | **49** | **35** |

> Capacity: 49 SP (+7 над baseline 42 SP). US-119..122 (11 SP) — "Could Have" (🟡/🟢), можно перенести на S11+ при нехватке времени перед Aug 2, 2026.

---

## Definition of Done

- [ ] **Incident Management:** Full Art. 73 lifecycle, MSA report PDF, deadline tracking
- [ ] **Conformity Assessment:** Annex VI wizard, 60-90% pre-fill, report + declaration PDFs
- [ ] **AESIA Export:** 12 Excel files, pre-filled, ZIP download
- [ ] **DD Report:** Business-language PDF for board/investors
- [ ] **Monitoring v2:** Scheduled reports, drift detection, heatmap, SLA tracking
- [ ] **Enterprise:** Custom rules, API v1.0 (OpenAPI), audit trail CSV/JSON, custom roles
- [ ] **AI Literacy:** 4 courses, CSV import, quizzes, PDF certificates, dashboard widget
- [ ] **Multi-language:** DE + FR UI + courses + documents
- [ ] **MCP Analytics:** Telemetry ingestion, dashboard widget, per-tool breakdown
- [ ] **NHI Dashboard:** CRUD, auto-detection, activity alerts
- [ ] **Predictive Analysis:** Score trend, breach prediction, dashboard widget
- [ ] **Benchmarking:** Anonymous sector comparison, opt-out, weekly aggregation
- [ ] **DB migrations:** ComplianceIncident, ConformityAssessment, ScheduledReport, CustomComplianceRule, CustomRole, LiteracyCourse, Employee, CourseEnrollment, MCPTelemetry, NonHumanIdentity, SectorBenchmark
- [ ] `npm test` — ~443 total, все green
- [ ] `npm run typecheck` — 0 errors
- [ ] Deploy to production: **FULL SCOPE milestone** before Aug 2, 2026

---

## Product Milestone: FULL SCOPE

```
Sprint 0-7   ████████████████████ Infrastructure → WorkOS → Registry API    ✅
Sprint 8     ████ COMPLIANCE READY (FRIA, Audit Package, Docs, Gap, CLI)    ✅
Sprint 9     ████ РЕЕСТР + ДОКУМЕНТЫ + РЕГУЛЯТОР (Registry, Badge, Remediation) ✅
Sprint 10    ████ ПОЛНАЯ ПЛАТФОРМА (Incidents, Literacy, Monitoring, i18n)   ✅
             ── FULL SCOPE ──
```

**Aug 2, 2026:** EU AI Act high-risk requirements in force. Complior platform fully operational.

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| Aug 2 deadline pressure | Высокая | Средний | S10 has buffer (38/42 SP), prioritize Art. 73 + Literacy first |
| DE/FR translation quality (1,200 keys) | Средняя | Средний | Professional review for key flows, community feedback |
| AI Literacy course content validation | Средняя | Высокий | Elena (AI Act expert) review before publish |
| Excel generation library compatibility | Низкая | Низкий | SheetJS well-tested, fallback to CSV |
| Custom rules: unexpected interactions | Средняя | Средний | Rule validation, conflict detection, admin-only |
| API v1.0 backward compatibility | Средняя | Высокий | Strict semver, deprecation policy, no breaking changes in v1 |
| Incident auto-detection false positives | Средняя | Средний | Conservative thresholds, human review step |
