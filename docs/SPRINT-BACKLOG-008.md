# SPRINT-BACKLOG-008.md — Compliance Ready

**Версия:** 2.0.0
**Дата:** 2026-02-28
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Planned
**Зависимости:** Sprint 7 (WorkOS + Registry API) merged to develop

---

## Sprint Goal

Пользователь может **сгенерировать FRIA, Audit Package и основные compliance документы**. Это то, что позволяет **ПРОДАВАТЬ Growth подписку (€149/мес)**. Dashboard v2 с Cross-System Map и Role-based views. Gap Analysis по 12 AESIA категориям. Compliance Timeline. CLI ↔ SaaS sync (Device Flow auth + Passport/Scan upload).

**Capacity:** ~42 SP | **Duration:** 4 недели
**Developers:** Max (Backend — FRIA + Audit Package + Documents + CLI Sync + Vendor Verification), Nina (Frontend — Dashboard v2 + Gap Analysis UI + Timeline + Procurement API), Leo (Infra — CLI Auth + TUI Data Push)
**Baseline:** ~343 tests (Sprint 7) → **New: ~34 tests (total: ~377)**

> **Prerequisite:** Sprint 7 merged to develop. WorkOS auth. Registry API live. Scoring Engine v4.1.

---

## Граф зависимостей

```
US-081 (FRIA Generator backend) ──► US-083 (Audit Package — needs FRIA)
US-082 (Document Generators) ──────► US-083 (Audit Package — needs docs)
                                            │
US-084 (Dashboard v2 frontend) ◄────────────┘ (Audit Package кнопка в Dashboard)

US-085 (Gap Analysis) — параллельно, зависит от F26 (Registry data)

US-086 (Timeline) — параллельно, зависит от F05 (Dashboard baseline)

US-087 (CLI Auth Device Flow) ──► US-088 (CLI Sync — Passport + Scan)
                                 US-089 (TUI Daemon Push)

US-090 (Vendor Verification + Procurement API) — параллельно, зависит от F26 (Registry API)
```

---

## User Stories

### US-081: Генератор FRIA — Fundamental Rights Impact Assessment (8 SP)

- **Feature:** F19 🔴 | **Developer:** Max

#### Описание

Как deployer high-risk AI системы, я хочу сгенерировать FRIA (Fundamental Rights Impact Assessment) по Art. 27 — обязательный документ для каждой high-risk AI системы — чтобы выполнить требование закона до дедлайна Aug 2, 2026.

> **Art. 27:** Deployers of high-risk AI systems shall carry out a fundamental rights impact assessment BEFORE putting the system into use.

#### FRIA Wizard (6 секций)

```
Секция 1: AI System Identification
  — Название системы, вендор, версия, дата начала использования
  — Предзаполнение из Passport (80%)

Секция 2: Intended Purpose & Context
  — Цель использования, домен (HR, finance, healthcare, law enforcement)
  — Категории затронутых лиц (employees, applicants, customers, public)
  — Масштаб: кол-во людей, география, частота решений

Секция 3: Fundamental Rights Assessment
  — Checklist: 8 прав (dignity, non-discrimination, privacy, data protection,
    freedom of expression, equality, right to remedy, fair trial)
  — Per право: risk level (none/low/medium/high) + mitigation measures
  — LLM draft: Mistral Medium 3 предзаполняет на основе домена

Секция 4: Human Oversight Measures
  — Как обеспечен human-in-the-loop
  — Кто контролирует, как часто, override mechanism
  — Предзаполнение из Passport.autonomyLevel

Секция 5: Risk Mitigation & Monitoring
  — Технические меры: accuracy, robustness, cybersecurity
  — Организационные меры: training, escalation procedures
  — Мониторинг: частота, метрики, пороги

Секция 6: Review & Approval
  — Рецензент (DPO / Legal / назначенный)
  — Статус: Draft → Review → Approved
  — При Approve → PDF генерация (Gotenberg) + хранение (S3)
```

#### GDPR DPIA Overlap

```javascript
// Если организация уже имеет DPIA (Data Protection Impact Assessment):
// → 60% предзаполнение FRIA из DPIA данных
// Общие поля: intended purpose, data categories, technical measures,
// consultation process, monitoring frequency
// POST /api/fria/prefill-from-dpia — { dpiaId } → partial FRIA draft
```

#### API Endpoints

```javascript
// POST /api/fria/draft                  — создать draft из Passport данных
// GET  /api/fria/:id                    — получить FRIA
// PUT  /api/fria/:id/section/:sectionId — обновить секцию
// POST /api/fria/:id/generate-section   — LLM генерация одной секции
// POST /api/fria/:id/submit-review      — отправить на ревью
// POST /api/fria/:id/approve            — утвердить → PDF
// GET  /api/fria/:id/pdf                — скачать PDF

// LLM-assisted:
// Для каждой секции: "Generate Draft" кнопка
// Mistral Medium 3 генерирует черновик из контекста
// Пользователь редактирует в Tiptap editor
// pg-boss queue: doc-generation (rate-limited, не блокирует UI)
```

#### Новые таблицы

```javascript
// schemas/FRIAAssessment.js (MetaSQL):
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  aiTool: { type: 'AITool', delete: 'cascade' },
  title: { type: 'string' },
  status: { type: 'string', default: "'draft'" }, // draft|review|approved|archived
  sections: { type: 'json' },         // [{id, title, content, generatedAt?, editedAt?}]
  reviewerId: { type: 'integer', nullable: true },
  approvedAt: { type: 'datetime', nullable: true },
  pdfUrl: { type: 'string', nullable: true },
  version: { type: 'integer', default: 1 },
});
```

#### Реализация

**Новые файлы (backend/):**
- `schemas/FRIAAssessment.js` — MetaSQL таблица
- `app/api/fria/draft.js` — create draft from Passport
- `app/api/fria/sections.js` — update/generate section
- `app/api/fria/review.js` — submit/approve workflow
- `app/api/fria/pdf.js` — PDF generation trigger
- `app/application/fria/createFRIADraft.js` — prefill from Passport
- `app/application/fria/generateFRIASection.js` — LLM generation (Mistral Medium 3)
- `app/application/fria/approveFRIA.js` — approve → Gotenberg PDF → S3
- `app/domain/fria/FRIATemplate.js` — 6 section templates (pure domain)
- `app/jobs/fria-generation.js` — pg-boss job for LLM generation

**Новые файлы (frontend/):**
- `app/(dashboard)/fria/page.tsx` — FRIA list per org
- `app/(dashboard)/fria/[id]/page.tsx` — FRIA wizard/editor
- `components/fria/FRIASectionEditor.tsx` — per-section Tiptap editor
- `components/fria/FRIAReviewPanel.tsx` — review/approve UI
- `components/fria/RightsChecklist.tsx` — 8 fundamental rights grid

#### Критерии приёмки

- [ ] Draft создаётся из Passport данных (80% предзаполнение для high-risk tools)
- [ ] 6 секций с Tiptap editor для каждой
- [ ] "Generate Draft" per секция → Mistral Medium 3 через pg-boss
- [ ] LLM generation через queue (не блокирует UI)
- [ ] Workflow: Draft → Review (DPO/Legal review) → Approved
- [ ] PDF генерация через Gotenberg при Approve
- [ ] PDF сохраняется в Hetzner Object Storage (S3)
- [ ] 8 fundamental rights checklist с risk levels
- [ ] DPIA prefill: если есть DPIA → 60% предзаполнение
- [ ] Version tracking: каждый Approve создаёт новую версию
- [ ] Plan enforcement: Growth+ required (Starter: 1 FRIA/мес)
- [ ] Multi-tenancy: org isolation

- **Tests:** 5 (fria_draft_prefill.test, fria_section_generation.test, fria_approval_workflow.test, fria_pdf_generation.test, fria_version_tracking.test)

---

### US-082: Генераторы Compliance-документов (7 SP)

- **Feature:** F07 🔴 | **Developer:** Max (backend) + Nina (frontend)

#### Описание

Как deployer, я хочу генерировать ключевые compliance-документы: AI Usage Policy, QMS Template, Risk Management Plan, Monitoring Plan, Worker Notification — чтобы покрыть основные обязательства EU AI Act.

#### 5 Генераторов

| Документ | Статья | Входные данные | Выход | ~Стр. |
|----------|--------|---------------|-------|-------|
| **AI Usage Policy** | Art. 26 | Org name, AI tools, usage rules | Policy PDF | 5-10 |
| **QMS Template** | Art. 17, AESIA #4 | Org structure, processes, tools | QMS PDF | 20-40 |
| **Risk Management Plan** | Art. 9, AESIA #5 | Per AI tool: risks from Scanner | Risk Plan PDF | 10-20 |
| **Monitoring Plan** | Art. 72, AESIA #13 | Monitoring targets, frequency | Monitoring Plan PDF | 5-10 |
| **Worker Notification** | Art. 26(7) | AI tools used by employees | Letter template PDF | 1-2 |

#### Section-by-Section Workflow

```
Для каждого документа:
1. "Generate" → pg-boss job → Mistral Medium 3 генерирует черновик
2. Секции загружаются по мере готовности (polling / SSE)
3. Пользователь редактирует каждую секцию в Tiptap editor
4. "Approve Section" → lock section
5. Когда все секции approved → "Generate PDF" → Gotenberg → S3
6. Документ привязан к AITool + Organization
```

#### API Endpoints

```javascript
// POST /api/documents/generate          — { type, aiToolId?, params }
// GET  /api/documents                   — список документов per org
// GET  /api/documents/:id               — документ + секции
// PUT  /api/documents/:id/section/:sid  — обновить секцию (Tiptap content)
// POST /api/documents/:id/approve       — approve → PDF
// GET  /api/documents/:id/pdf           — download PDF
```

#### Реализация

**Новые файлы (backend/):**
- `schemas/ComplianceDocument.js` — MetaSQL (type, status, sections JSON, pdfUrl)
- `app/api/documents/generate.js` — trigger generation
- `app/api/documents/sections.js` — CRUD per section
- `app/api/documents/approve.js` — approve + PDF
- `app/application/documents/generateDocumentDraft.js` — LLM prompt per doc type
- `app/application/documents/approveDocument.js` — Gotenberg PDF
- `app/domain/documents/DocumentTemplates.js` — section templates per doc type (pure)
- `app/jobs/document-generation.js` — pg-boss job

**Новые файлы (frontend/):**
- `app/(dashboard)/documents/page.tsx` — document list
- `app/(dashboard)/documents/[id]/page.tsx` — document editor
- `components/documents/DocumentSectionEditor.tsx` — Tiptap per section
- `components/documents/GenerateButton.tsx` — trigger + progress

#### Критерии приёмки

- [ ] 5 типов документов генерируются
- [ ] Section-by-section: Generate → Edit → Approve flow
- [ ] LLM генерация через pg-boss (не блокирует UI)
- [ ] Tiptap editor для каждой секции
- [ ] PDF generation (Gotenberg) при final approve
- [ ] PDF → S3 хранение + download
- [ ] Предзаполнение из Passport + Scanner данных
- [ ] Plan enforcement: Growth+ required
- [ ] Worker Notification: генерация per AI tool

- **Tests:** 4 (document_generation_5types.test, section_edit_approve.test, document_pdf.test, document_prefill.test)

---

### US-083: Audit Package — ZIP со всеми документами (6 SP)

- **Feature:** F42 🔴 | **Developer:** Max

#### Описание

Как deployer готовящийся к аудиту, я хочу нажать одну кнопку и получить ZIP-архив со ВСЕМИ compliance документами моей организации — чтобы предоставить регулятору полный пакет в нужном формате.

> **Ключевой платный feature** — ради него покупают Growth (€149/мес).

#### Содержимое ZIP

```
audit-package-{orgSlug}-{date}/
├── 00-executive-summary.pdf       — Org compliance overview
├── 01-ai-registry.pdf             — Реестр AI систем (все Passports)
├── 02-risk-classification.pdf     — Per-tool classification results
├── 03-fria/                       — FRIA per high-risk tool
│   ├── fria-hireview.pdf
│   └── fria-credit-scoring.pdf
├── 04-ai-usage-policy.pdf
├── 05-obligation-matrix.pdf       — Матрица обязательств (articles × tools)
├── 06-evidence-chain.pdf          — Evidence: scanner findings, manual entries
├── 07-incident-log.pdf            — Incident records (if any)
├── 08-training-records.pdf        — AI Literacy completion (if applicable)
├── 09-monitoring-plan.pdf         — Per-tool monitoring setup
├── metadata.json                  — Package metadata (generated at, version, tools, score)
└── verification.pdf               — QR-код → online verification page
```

#### API

```javascript
// POST /api/audit-package/generate   — trigger async ZIP generation
// GET  /api/audit-package/status/:id — progress (generating|ready|error)
// GET  /api/audit-package/download/:id — download ZIP
// GET  /api/audit-package/history    — previous packages

// Process:
// 1. POST trigger → pg-boss job
// 2. Job: collect all docs (PDFs from S3 + generate missing summaries)
// 3. Generate executive summary (LLM)
// 4. Generate obligation matrix (structured query)
// 5. Create verification PDF with QR code
// 6. ZIP all → S3 → notify user (SSE + email)
// 7. Expiry: package available for 30 days
```

#### Реализация

**Новые файлы:**
- `app/api/audit-package/generate.js` — trigger
- `app/api/audit-package/status.js` — progress
- `app/api/audit-package/download.js` — download
- `app/application/audit/generateAuditPackage.js` — orchestration
- `app/application/audit/generateExecutiveSummary.js` — LLM
- `app/application/audit/generateObligationMatrix.js` — structured query
- `app/application/audit/buildVerificationPage.js` — QR + page
- `app/jobs/audit-package.js` — pg-boss job
- `app/(dashboard)/audit-package/page.tsx` — UI: generate + history + download

#### Критерии приёмки

- [ ] One-click ZIP generation
- [ ] ZIP содержит 10+ файлов (PDFs + metadata.json)
- [ ] Executive Summary: LLM-генерация org-wide overview
- [ ] Obligation Matrix: articles × tools (structured)
- [ ] QR code verification: ссылка на публичную страницу
- [ ] Async: pg-boss job + SSE progress updates
- [ ] S3 storage + 30-day expiry
- [ ] Email notification when ready (Brevo)
- [ ] Plan enforcement: Growth+ only
- [ ] Includes all existing FRIA + documents

- **Tests:** 4 (audit_package_generation.test, audit_zip_contents.test, audit_package_progress.test, verification_qr.test)

---

### US-084: Dashboard v2 — Cross-System Map + Role Views + Score Trends (7 SP)

- **Feature:** F28 🔴 | **Developer:** Nina (frontend) + Max (backend)

#### Описание

Как CTO, я хочу видеть org-wide compliance dashboard: (1) карта связей между AI системами, (2) график score по времени, (3) role-based views — CTO / DPO / Developer видят разное.

> **Базовый дашборд уже 75% (Sprint 3-5).** Доработка.

#### Cross-System Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Cross-System Compliance Map                          Last sync: 2m ago   │
│                                                                           │
│ ┌─ Summary ──────────────────────────────────────────────────────────┐  │
│ │ AI Systems: 12  │  Org Score: 68/100  │  High-Risk: 2  │  €4.2M   │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ ┌──────────────────┬──────────────┬────────┬──────────┬─────────────┐  │
│ │ System           │ Source       │  Risk  │  Score   │ Status      │  │
│ ├──────────────────┼──────────────┼────────┼──────────┼─────────────┤  │
│ │ ChatGPT          │ Manual       │ GPAI   │  72 ████ │ ⚠ 2 issues  │  │
│ │ HR Screening AI │ Manual       │ HIGH   │  34 ██   │ ✗ 4 issues  │  │
│ │ Copilot         │ CLI scan     │ limited│  81 ████ │ ✓ OK        │  │
│ └──────────────────┴──────────────┴────────┴──────────┴─────────────┘  │
│                                                                           │
│ Dependencies: "A передаёт данные в B"                                    │
│ ChatGPT ──(data)──► HR Screening AI ──(output)──► Decision System       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Role-based Views

| Роль | Что видит |
|------|-----------|
| CTO | Score trend + risk distribution + penalty exposure + quick actions |
| DPO | Violations list + deadline countdown + FRIA status + regulatory updates |
| Developer | Per-tool compliance breakdown + CLI sync status + fix suggestions |

#### Score Trends (90-day graph)

```javascript
// GET /api/dashboard/score-trends?period=90d&groupBy=week
{
  dataPoints: [
    { date: "2026-01-01", avgScore: 47, totalSystems: 8 },
    { date: "2026-01-08", avgScore: 59, totalSystems: 9 },
  ],
  trend: { direction: "improving", delta: +21, percentChange: 44.7 },
  projectedCompliance: { date: "2026-04-15", projectedScore: 82 }
}
```

#### API Endpoints

```javascript
// GET /api/dashboard/cross-system-map — all AI tools + sources + dependencies
// GET /api/dashboard/score-trends     — score history (7d/30d/90d)
// GET /api/dashboard/role-view/:role  — role-specific data (cto/dpo/developer)
// GET /api/dashboard/penalty-exposure — aggregate penalty risk per org
```

#### Реализация

**Новые файлы (backend/):**
- `app/api/dashboard/cross-system-map.js` — aggregation
- `app/api/dashboard/score-trends.js` — score history
- `app/api/dashboard/role-view.js` — per-role data
- `app/application/dashboard/buildCrossSystemMap.js`
- `app/application/dashboard/buildScoreTrends.js`

**Новые файлы (frontend/):**
- `app/(dashboard)/compliance-map/page.tsx` — Cross-System Map
- `components/dashboard/CrossSystemMap.tsx`
- `components/dashboard/DependencyGraph.tsx` — tool→tool links
- `components/dashboard/ScoreTrendChart.tsx` — Recharts line chart
- `components/dashboard/RoleViewSwitcher.tsx` — CTO/DPO/Dev toggle

**Модифицированные файлы:**
- `app/(dashboard)/page.tsx` — integrate new widgets
- `components/dashboard/ComplianceSummary.tsx` — add trend indicator

#### Критерии приёмки

- [ ] Cross-System Map: все AI tools организации с dependencies
- [ ] Score trend chart: 7d / 30d / 90d switcher
- [ ] Projection line: "At current rate, reaching 85 by April 15"
- [ ] Role-based views: CTO / DPO / Developer toggle
- [ ] Penalty Exposure: €XX.XM aggregate
- [ ] Responsive: works on 1024px+

- **Tests:** 3 (cross_system_map_aggregation.test, score_trends_calculation.test, role_view_data.test)

---

### US-085: Gap Analysis — 12 AESIA категорий (5 SP)

- **Feature:** F08 🟠 | **Developer:** Max (backend) + Nina (frontend)

#### Описание

Как compliance officer, я хочу видеть per-AI-система Gap Analysis по 12 категориям AESIA — чтобы точно знать, что ещё нужно сделать и сколько это займёт.

#### 12 AESIA категорий

| # | Категория | AESIA Checklist | Что оценивается |
|---|-----------|-----------------|-----------------|
| 1 | QMS | #4 | Quality Management System |
| 2 | Risk Management | #5 | Risk assessment + mitigation |
| 3 | Human Oversight | #6 | HITL mechanisms |
| 4 | Data Governance | #7 | Training data quality |
| 5 | Transparency | #8 | Disclosures, documentation |
| 6 | Accuracy | #9 | Performance metrics |
| 7 | Robustness | #10 | Stress testing, edge cases |
| 8 | Cybersecurity | #11 | Security measures |
| 9 | Logging | #12 | Audit trail, monitoring |
| 10 | Technical Documentation | #3 | Art. 11 documentation |
| 11 | Post-Market Monitoring | #13 | Ongoing monitoring plan |
| 12 | Incident Management | #14 | Art. 73 incident process |

#### Per-category assessment

```javascript
// GET /api/gap-analysis/:aiToolId
{
  toolName: "HR Screening AI",
  overallScore: 42,
  categories: [
    {
      id: "qms", name: "Quality Management System",
      status: "red",           // green|yellow|red
      completeness: 20,        // percentage
      estimatedEffort: "24h",
      recommendations: [
        "Define AI approval process",
        "Assign quality manager role",
        "Document change management procedure"
      ],
      relatedArticles: ["Art. 17"],
      priority: 9.2            // urgency × impact score
    },
    // ... 11 more categories
  ],
  actionPlan: {
    criticalPath: ["FRIA (2 days)", "QMS (3 days)", "Risk Plan (2 days)"],
    totalEffort: "120h",
    suggestedDeadline: "2026-06-01"
  }
}
```

#### Реализация

**Новые файлы:**
- `app/api/gap-analysis/tool.js` — per-tool analysis
- `app/application/gap-analysis/analyzeGaps.js` — 12-category engine
- `app/domain/gap-analysis/AESIACategories.js` — category definitions + criteria (pure)
- `app/(dashboard)/gap-analysis/[toolId]/page.tsx` — UI
- `components/gap-analysis/CategoryCard.tsx` — per-category green/yellow/red card
- `components/gap-analysis/ActionPlan.tsx` — prioritized todo list

#### Критерии приёмки

- [ ] 12 AESIA categories evaluated per tool
- [ ] Status: green (≥80%) / yellow (40-80%) / red (<40%)
- [ ] Estimated effort per category
- [ ] Recommendations: 2-5 actionable items per category
- [ ] Priority scoring: urgency × impact
- [ ] Action Plan: critical path + total effort + suggested deadline
- [ ] Plan enforcement: Growth+ required

- **Tests:** 3 (gap_analysis_12_categories.test, priority_scoring.test, action_plan_generation.test)

---

### US-086: Compliance Timeline (3 SP)

- **Feature:** F48 🟠 | **Developer:** Nina

#### Описание

Как DPO, я хочу видеть визуальную шкалу: "До дедлайна 157 дней. 7 AI систем. 23 открытых обязательства. Критический путь: FRIA для 2 систем" — чтобы понимать общую картину.

> **UI timeline уже есть (Sprint 3), нужно подключить к реальным данным.**

#### Timeline Data

```javascript
// GET /api/timeline
{
  mainDeadline: "2026-08-02",
  daysRemaining: 155,
  totalSystems: 7,
  openObligations: 23,
  criticalPath: [
    { task: "FRIA for HR Screening AI", deadline: "2026-05-01", status: "not_started" },
    { task: "FRIA for Credit Scoring", deadline: "2026-05-01", status: "draft" },
    { task: "Art. 4 AI Literacy (all staff)", deadline: "2025-02-02", status: "overdue" },
  ],
  milestones: [
    { date: "2025-02-02", label: "Art. 4 AI Literacy", status: "overdue", article: "Art. 4" },
    { date: "2025-08-02", label: "Art. 50 Transparency", status: "overdue", article: "Art. 50" },
    { date: "2026-08-02", label: "Full High-Risk Compliance", status: "upcoming", article: "Art. 6-27" },
    { date: "2026-08-02", label: "Art. 52 Content Marking", status: "upcoming", article: "Art. 52" },
  ],
  progress: {
    completed: 12,
    inProgress: 8,
    notStarted: 15,
    overdue: 3
  }
}
```

#### Реализация

**Новые файлы:**
- `app/api/dashboard/timeline.js` — aggregation endpoint
- `app/application/dashboard/buildTimeline.js` — milestone + critical path calculation

**Модифицированные файлы:**
- `components/dashboard/Timeline.tsx` — connect to real data (was mock)
- `app/(dashboard)/page.tsx` — timeline widget integration

#### Критерии приёмки

- [ ] Timeline показывает реальные дедлайны из EU AI Act
- [ ] Days remaining countdown
- [ ] Critical path: топ задачи с ближайшими deadline
- [ ] Overdue items highlighted (red)
- [ ] Progress bar: completed / in-progress / not-started / overdue
- [ ] Milestone markers на визуальной шкале

- **Tests:** 2 (timeline_aggregation.test, critical_path_calculation.test)

---

### US-087: CLI Auth — OAuth 2.0 Device Flow (3 SP)

- **Feature:** F61 🟠 | **Developer:** Leo

#### Описание

Как разработчик, я хочу авторизовать CLI (`npx complior`) в SaaS Dashboard — чтобы данные локального сканирования синхронизировались с облаком.

#### OAuth 2.0 Device Flow

```
CLI:
1. POST /api/auth/device → { device_code, user_code: "ABCD-1234", verification_uri }
2. Показать: "Open https://app.complior.io/device and enter code: ABCD-1234"
3. Poll: POST /api/auth/token { device_code } → pending | { access_token, refresh_token }

Browser:
1. User opens /device → enters code ABCD-1234
2. WorkOS session required (already logged in or login flow)
3. Confirm: "Allow Complior CLI to access your account?"
4. Approve → device_code marked as authorized

Token:
- access_token: JWT, 1h expiry
- refresh_token: opaque, 30d expiry, single-use rotation
- Scope: sync:write (upload passport/scan), sync:read (download data)
```

#### Реализация

**Новые файлы:**
- `app/api/auth/device.js` — POST: generate device_code + user_code
- `app/api/auth/token.js` — POST: exchange device_code → tokens
- `app/api/auth/device-confirm.js` — POST: user confirms in browser
- `app/(auth)/device/page.tsx` — browser UI for code entry
- `app/application/auth/deviceFlow.js` — device flow logic
- `schemas/DeviceCode.js` — MetaSQL (code, userId, expiresAt, status)

#### Критерии приёмки

- [ ] `POST /api/auth/device` → device_code + user_code (6 chars)
- [ ] Device code expires in 15 minutes
- [ ] Browser: `/device` page for code entry
- [ ] WorkOS session required for confirmation
- [ ] `POST /api/auth/token` → access_token (JWT, 1h) + refresh_token (30d)
- [ ] Token refresh: single-use rotation
- [ ] Rate limiting: max 1 device code per minute per user

- **Tests:** 3 (device_flow_complete.test, device_code_expiry.test, token_refresh_rotation.test)

---

### US-088: CLI Sync — Passport + Scan Upload (4 SP)

- **Feature:** F62 🟠 | **Developer:** Max

#### Описание

Как разработчик, я хочу синхронизировать данные из CLI (Passport + Scan results) в SaaS Dashboard — чтобы Dashboard показывал реальное состояние моих проектов.

#### Sync Endpoints

```javascript
// POST /api/sync/passport — upload AI tool passport from CLI
// Auth: Bearer token from Device Flow (US-087)
// Body: {
//   toolSlug: 'openai-gpt4o',
//   passport: { ... },   // полный passport JSON
//   source: 'cli',
//   version: '1.2.0'
// }
// Merge strategy:
//   - Technical fields (от CLI): ПРИОРИТЕТ (detection, versions, imports)
//   - Organizational fields (от SaaS): ПРИОРИТЕТ (owner, department, notes)
//   - Conflict resolution: latest timestamp wins for same field

// POST /api/sync/scan — upload scan results
// Body: {
//   projectPath: '/Users/dev/my-app',
//   score: 72,
//   findings: [...],          // violations found
//   toolsDetected: [...],     // AI tools detected
//   scannedAt: '2026-02-28T10:00:00Z'
// }
// NOTE: Source code is NEVER transmitted — only metadata

// GET /api/sync/status — sync status per org
// { lastSyncAt, toolsSynced, scansSynced, conflicts: [] }
```

#### Merge Strategy

```javascript
// ТЕХНИЧЕСКОЕ (CLI приоритет):
// detectionPatterns, versions, imports, dependencies, env_vars,
// scanScore, findings, lastScannedAt

// ОРГАНИЗАЦИОННОЕ (SaaS приоритет):
// owner, department, notes, customTags, friaId, documents,
// complianceStatus, manualOverrides

// TIMESTAMP-BASED (latest wins):
// riskLevel, category (if manually overridden in SaaS → SaaS wins)
```

#### Реализация

**Новые файлы:**
- `app/api/sync/passport.js` — passport upload + merge
- `app/api/sync/scan.js` — scan results upload
- `app/api/sync/status.js` — sync status
- `app/application/sync/mergePassport.js` — merge strategy
- `app/application/sync/processScanUpload.js` — scan processing
- `schemas/SyncHistory.js` — MetaSQL (source, type, status, conflicts)

#### Критерии приёмки

- [ ] `POST /api/sync/passport` → merge CLI passport with SaaS data
- [ ] Technical fields: CLI takes priority
- [ ] Organizational fields: SaaS takes priority
- [ ] `POST /api/sync/scan` → ScanResult created with organizationId
- [ ] Source code never transmitted (metadata only)
- [ ] Conflict logging: conflicts stored for manual review
- [ ] Auth: Bearer token from Device Flow required
- [ ] `GET /api/sync/status` → last sync info
- [ ] Cross-System Map updated automatically after sync

- **Tests:** 4 (passport_merge_strategy.test, scan_upload_processing.test, sync_conflict_resolution.test, sync_auth_required.test)

---

### US-089: TUI Daemon Push (2 SP)

- **Feature:** F27 🟠 | **Developer:** Leo

#### Описание

Как разработчик, я хочу чтобы CLI daemon автоматически push'ил Passport + scan results в SaaS — без ручного запуска sync.

> Подмножество US-088 (F62) через daemon (background process), не user-initiated.

#### Daemon Push

```javascript
// CLI daemon (в Complior Engine) запускается как background process:
// complior daemon start → watches file changes → auto-sync
//
// При изменении:
//   1. Re-scan project
//   2. POST /api/sync/passport (if passport changed)
//   3. POST /api/sync/scan (if new findings)
//   4. Dashboard обновляется через SSE push
//
// SaaS side (этот US):
// - SSE endpoint для Dashboard real-time updates
// - After successful sync → emit event → connected Dashboard clients update

// GET /api/events/stream — SSE connection for Dashboard
// Events: { type: 'sync:completed', data: { toolSlug, score, findingsCount } }
```

#### Реализация

**Новые файлы:**
- `app/api/events/stream.js` — SSE connection endpoint
- `server/src/event-bus.js` — in-process EventEmitter for SSE

**Модифицированные файлы:**
- `app/api/sync/passport.js` — emit SSE event after successful sync
- `app/api/sync/scan.js` — emit SSE event after successful scan upload

#### Критерии приёмки

- [ ] SSE endpoint: `GET /api/events/stream` → `text/event-stream`
- [ ] After sync → SSE event pushed to connected Dashboard clients
- [ ] Dashboard updates without page reload
- [ ] Reconnect logic: client auto-reconnects on SSE drop
- [ ] Auth required for SSE connection

- **Tests:** 2 (sse_event_push.test, sync_triggers_sse.test)

---

### US-090: Public AI Risk Registry — Vendor Verification + Procurement API (4 SP)

- **Feature:** F38 🔴 | **Developer:** Max + Nina

#### Описание

Как вендор AI-инструмента, я хочу подать заявку на верификацию в Public AI Risk Registry, чтобы получить badge "Verified" и повысить доверие к моему продукту. Как procurement-менеджер, я хочу API для проверки AI-инструментов перед закупкой.

#### Vendor Verification

```javascript
// POST /api/registry/vendor-claim — submit claim for a tool
// Payload: { toolSlug, vendorEmail, domain, evidence: { website, linkedin, registrationDoc } }
//
// Verification flow:
// 1. Vendor submits claim → status: 'pending'
// 2. Auto-check: email domain matches tool.provider_url? → bump confidence
// 3. Manual review (admin) → approve/reject
// 4. Approved → tool.vendorVerified = true, badge on public page
//
// GET  /api/registry/vendor-claims — admin list
// PATCH /api/registry/vendor-claims/:id — admin approve/reject
// Schemas: VendorClaim { vendorClaimId, toolId, email, domain, status, evidence, reviewedBy }
```

#### Procurement API

```javascript
// GET /v1/registry/procurement/:slug — public API, API key auth
// Returns: {
//   tool, riskLevel, documentationGrade, obligationCount,
//   vendorVerified, lastAssessedAt,
//   complianceReadiness: 'ready' | 'partial' | 'not_assessed'
// }
//
// Batch: POST /v1/registry/procurement/batch — { slugs: ['chatgpt', 'copilot', ...] }
// Rate limit: 100 req/min per API key
// Use case: procurement teams checking AI tools before purchase
```

#### Passport Auto-Fill

```javascript
// When user adds AI tool from Registry → auto-fill Passport technical fields:
// name, provider, website, riskLevel, obligations, documentationGrade
// Registry data → Passport (read-only fields, source: 'registry_autofill')
// User still fills: use case, department, data categories, autonomy level
```

#### Реализация

**Новые файлы:**
- `app/api/registry/vendor-claim.js` — submit + admin CRUD
- `app/application/registry/submitVendorClaim.js` — use case
- `app/application/registry/reviewVendorClaim.js` — admin approve/reject
- `app/schemas/VendorClaim.js` — MetaSQL schema
- `app/api/v1/registry/procurement.js` — public procurement API
- `frontend/components/registry/VendorClaimForm.tsx` — public claim form
- `frontend/app/[locale]/(marketing)/registry/[id]/claim/page.tsx` — claim page

**Модифицированные файлы:**
- `app/api/v1/registry/tools.js` — add vendorVerified flag to responses
- `frontend/components/registry/ToolHero.tsx` — show "Verified" badge
- `app/application/inventory/addAITool.js` — auto-fill from Registry data

#### Критерии приёмки

- [ ] Vendor can submit verification claim with evidence
- [ ] Auto domain-match: email domain vs provider URL
- [ ] Admin can approve/reject claims
- [ ] Verified badge visible on public Registry page
- [ ] Procurement API: single + batch lookup
- [ ] API key auth + rate limiting on procurement endpoints
- [ ] Registry data auto-fills Passport on tool add

- **Tests:** 4 (vendor_claim_submit.test, vendor_claim_review.test, procurement_api.test, passport_autofill.test)

---

## Summary

| US | Feature | Developer | SP | Tests |
|----|---------|-----------|-----|-------|
| US-081 | F19: FRIA Generator | Max | 8 | 5 |
| US-082 | F07: Document Generators (5 types) | Max + Nina | 7 | 4 |
| US-083 | F42: Audit Package (ZIP) | Max | 6 | 4 |
| US-084 | F28: Dashboard v2 (Map + Trends + Roles) | Nina + Max | 7 | 3 |
| US-085 | F08: Gap Analysis (12 AESIA) | Max + Nina | 5 | 3 |
| US-086 | F48: Compliance Timeline | Nina | 3 | 2 |
| US-087 | F61: CLI Auth Device Flow | Leo | 3 | 3 |
| US-088 | F62: CLI Sync (Passport + Scan) | Max | 4 | 4 |
| US-089 | F27: TUI Daemon Push (SSE) | Leo | 2 | 2 |
| US-090 | F38: Vendor Verification + Procurement API | Max + Nina | 4 | 4 |
| **Итого** | | | **49** | **34** |

> Capacity stretched (+11 над baseline 38 SP). Если нужен trade-off: US-089 (TUI Daemon Push, 2 SP), US-086 (Timeline, 3 SP) и US-090 (Vendor Verification, 4 SP) могут начаться параллельно или частично перейти в S9.

---

## Definition of Done

- [ ] **FRIA Generator:** 6 sections, LLM-assisted, review/approve workflow, PDF generation
- [ ] **Document Generators:** 5 types, section-by-section, Tiptap editor, PDF via Gotenberg
- [ ] **Audit Package:** One-click ZIP, 10+ files, QR verification, async generation
- [ ] **Dashboard v2:** Cross-System Map, Score Trends (90d), Role views (CTO/DPO/Dev)
- [ ] **Gap Analysis:** 12 AESIA categories, priority scoring, action plan
- [ ] **Timeline:** Real data, deadline countdown, critical path
- [ ] **CLI Auth:** OAuth 2.0 Device Flow, JWT tokens, refresh rotation
- [ ] **CLI Sync:** Passport + Scan upload, merge strategy, conflict resolution
- [ ] **SSE:** Real-time Dashboard updates on sync
- [ ] **Vendor Verification:** Claim submission, admin review, Verified badge
- [ ] **Procurement API:** Single + batch lookup, API key auth, rate limiting
- [ ] **DB migrations:** FRIAAssessment, ComplianceDocument, DeviceCode, SyncHistory, VendorClaim
- [ ] `npm test` — ~377 total, все green
- [ ] `npm run typecheck` — 0 errors
- [ ] Deploy to staging: FRIA + Audit Package E2E проверка

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| LLM generation quality (FRIA/Docs) | Средняя | Средний | Prompt engineering, domain expert review, user editable drafts |
| Gotenberg PDF stability (concurrent) | Средняя | Средний | Queue serialization, max 3 concurrent PDF jobs, health check |
| CLI Sync: merge conflicts at scale | Средняя | Средний | Conflict logging, manual review UI, "latest wins" fallback |
| Audit Package ZIP generation time (large org) | Средняя | Низкий | Async job, progress tracking, 30-min timeout |
| Device Flow: user doesn't complete browser auth | Низкая | Низкий | Clear instructions in CLI, 15-min expiry, retry prompt |
