# SPRINT-BACKLOG-010.md — AI Literacy + Multi-language + Monitoring Phase 2 + Enterprise Scale + Growth

**Версия:** 1.0.0
**Дата:** 2026-02-22
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Planned
**Зависимости:** Sprint 9 (Governance + Remediation + Monitoring v1) merged to develop

---

## Sprint Goal

Завершить Full Scope платформы перед Aug 2, 2026 дедлайном EU AI Act. AI Literacy Module (F18) как wedge product. Multi-language DE + FR (F14). Monitoring Cloud Phase 2 — scheduled reports, SLA tracking, incident response (F32). Enterprise Completion — org-wide scan, API v1.0, white-label reports (F33). Growth & Marketing — SEO 27.5K pages, State of AI Report (F34). Milestone: **FULL SCOPE**.

**Capacity:** ~35 SP | **Duration:** 3.5 недели
**Developers:** Max (Backend — AI Literacy API + Enterprise API v1.0), Nina (Frontend — AI Literacy UI + Multi-language + Growth pages), Leo (Infra — Monitoring Phase 2 + Scheduled Reports + SEO)
**Baseline:** ~280 tests (Sprint 9) → **New: ~22 tests (total: ~302)**

> **Prerequisite:** Sprint 9 merged to develop. Monitoring Dashboard (Screen 26) live. Enterprise roles работают. Regulatory Monitor active. KI-Compliance Siegel deployed.

---

## Граф зависимостей

```
F28 (Dashboard, S008) ──► US-101 (AI Literacy — зависит от IAM + notifications)
F02 (IAM — users/employees) ──┘

US-101 (AI Literacy) ──► US-102 (Multi-language DE/FR — добавить к AI Literacy контенту)

F32 (Monitoring v1, S009) ──► US-103 (Monitoring Phase 2: reports + SLA + incidents)

F33 (Enterprise v1, S009) ──► US-104 (Enterprise Completion: org-wide scan + API v1.0)

US-101 + US-104 ──► US-105 (Growth & Marketing: SEO + AI Literacy report)
```

---

## User Stories

### US-101: AI Literacy Module — Wedge Product (8 SP)

- **Feature:** F18 | **Developer:** Max (backend) + Nina (frontend)

#### Описание

Как HR Director, я хочу обеспечить соответствие Art. 4 AI Act — ВСЕ сотрудники должны пройти AI Literacy обучение (обязательно с Feb 2, 2025). Хочу импортировать список сотрудников, назначить курсы по роли, отслеживать прогресс и получить сертификаты.

> **Wedge Product:** AI Literacy standalone за €49/мес. Art. 4 уже обязателен (Feb 2025). Отдельный CTA: `/ai-literacy` доступен даже без full compliance subscription.

#### 4 Курса (собственный контент)

| Курс | Для кого | Модулей | Длительность | Язык |
|------|----------|---------|-------------|------|
| **Executive** | CEO, CTO, руководство | 3 | ~20 мин | EN (+ DE/FR в US-102) |
| **HR Manager** | HR, рекрутеры | 4 | ~30 мин | EN |
| **Developer** | Разработчики, IT | 5 | ~40 мин | EN |
| **General** | Все сотрудники | 3 | ~15 мин | EN |

#### Модуль структура

```javascript
// Новая таблица: LiteracyCourse
({
  Details: {},
  slug: { type: 'string', unique: true },   // 'executive', 'hr-manager', 'developer', 'general'
  title: { type: 'string' },
  targetRole: { type: 'string' },
  modules: { type: 'json' },                 // [{id, title, content, quiz: [{q, options, answer}]}]
  durationMinutes: { type: 'integer' },
  isActive: { type: 'boolean', default: true },
});

// Новая таблица: Employee
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  name: { type: 'string' },
  email: { type: 'string' },
  department: { type: 'string', nullable: true },
  role: { type: 'string', nullable: true },   // для курс-assignment
  importedAt: 'datetime',
  invitedAt: { type: 'datetime', nullable: true },
});

// Новая таблица: CourseEnrollment
({
  Details: {},
  employee: { type: 'Employee', delete: 'cascade' },
  course: { type: 'LiteracyCourse', delete: 'cascade' },
  organization: { type: 'Organization', delete: 'cascade' },
  status: { type: 'string', default: "'not_started'" }, // not_started|in_progress|completed|overdue
  progress: { type: 'integer', default: 0 },             // 0-100
  score: { type: 'integer', nullable: true },            // quiz score 0-100
  completedAt: { type: 'datetime', nullable: true },
  certificateUrl: { type: 'string', nullable: true },    // Hetzner Object Storage
});
```

#### Employee Import + Invitations

```javascript
// POST /api/literacy/employees/import
// Accepts: CSV (name, email, department, role)
// Creates: Employee records + CourseEnrollment per assigned course
// pg-boss job: send invitation emails (batch, rate-limited)

// CSV format:
// name,email,department,role
// Anna Schmidt,anna@acme.de,HR,hr-manager
// Klaus Meyer,klaus@acme.de,Engineering,developer

// POST /api/literacy/courses/assign
// { employeeIds: [...], courseSlug: 'general', deadline: '2026-08-01' }
// → bulk enrollment + email invitation (Brevo)
```

#### Compliance Certificates (PDF)

```javascript
// POST /api/literacy/certificates/generate/:enrollmentId
// → Mistral не используется (template-based, deterministic)
// → Gotenberg → PDF → Hetzner Object Storage

// Employee certificate: "Anna Schmidt completed Executive AI Literacy Course"
// Org certificate: "Acme GmbH — 100% of employees completed Art. 4 training"

// GET /api/literacy/certificates/org — organization-level certificate
// (доступен только при 100% completion rate)
```

#### Dashboard Widget

```javascript
// GET /api/literacy/stats
// {
//   totalEmployees: 45,
//   completedCount: 32,
//   completionRate: 71.1,
//   overdueCount: 5,
//   byDepartment: { HR: 100, Engineering: 60, Marketing: 50 },
//   avgScore: 87.3
// }
```

#### Frontend Screens

```
AI Literacy Dashboard:
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Literacy Compliance (Art. 4)                     Due: Aug 2, 2026    │
│                                                                           │
│ 🎓 71% Complete  ████████████████░░░░░░  32/45 employees                │
│                                                                           │
│ ⚠ 5 employees overdue → Send reminder                                   │
│                                                                           │
│ By Department:                                                            │
│   HR:          ████████████████████ 100% (4/4)  ✓                        │
│   Engineering: ████████████░░░░░░░░  60% (15/25) ⚠                      │
│   Marketing:   ██████████░░░░░░░░░░  50% (8/16)  ⚠                      │
│                                                                           │
│ [Import Employees]  [Assign Courses]  [Send Reminder]  [Download Cert]  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Реализация

**Новые файлы (backend/):**
- `schemas/LiteracyCourse.js`
- `schemas/Employee.js`
- `schemas/CourseEnrollment.js`
- `app/api/literacy/employees.js` — import + list
- `app/api/literacy/courses.js` — assign + list
- `app/api/literacy/enrollments.js` — progress + completion
- `app/api/literacy/certificates.js` — generate + download
- `app/api/literacy/stats.js` — dashboard widget
- `app/application/literacy/importEmployeesCSV.js`
- `app/application/literacy/generateCertificate.js` — Gotenberg
- `app/jobs/literacy-invitations.js` — pg-boss batch email
- `data/courses/` — course content JSON (4 курса × modules + quizzes)

**Новые файлы (frontend/):**
- `app/(dashboard)/ai-literacy/page.tsx` — AI Literacy Dashboard
- `app/(dashboard)/ai-literacy/employees/page.tsx` — Employee list + import
- `app/(dashboard)/ai-literacy/courses/page.tsx` — Course management
- `app/(dashboard)/ai-literacy/[enrollmentId]/course.tsx` — Course player (quiz)
- `components/literacy/ProgressBar.tsx`
- `components/literacy/CourseCard.tsx`
- `components/literacy/CertificateDownload.tsx`
- `hooks/useLiteracyStats.ts`

**Модифицированные файлы:**
- `app/(dashboard)/layout.tsx` — добавить AI Literacy в nav
- `components/dashboard/ComplianceWidget.tsx` — добавить AI Literacy widget

#### Критерии приёмки

- [ ] CSV import: 100+ сотрудников за раз
- [ ] 4 курса + quizzes (5-10 вопросов per модуль)
- [ ] Course assignment: по роли (автоматический) + ручной
- [ ] Invitation email (Brevo) с персональной ссылкой на курс
- [ ] Course player: модули → quiz → completion
- [ ] Employee certificate PDF (Gotenberg)
- [ ] Org-level certificate: доступен при 100% completion
- [ ] Dashboard widget: completion rate + overdue count
- [ ] Per-department breakdown
- [ ] Deadline tracking: overdue статус после deadline
- [ ] Plan enforcement: AI Literacy доступен Starter+

- **Tests:** 5 (employee_csv_import.test, course_completion_flow.test, employee_certificate_pdf.test, org_certificate_criteria.test, literacy_stats_aggregation.test)

---

### US-102: Multi-language — DE + FR (6 SP)

- **Feature:** F14 | **Developer:** Nina

#### Описание

Как немецкий или французский пользователь, я хочу использовать платформу на своём языке — интерфейс, AI Literacy курсы, Eva responses, и compliance documents — чтобы onboarding был как можно проще.

#### i18n Architecture

```javascript
// next-intl: уже установлен (EN - default)
// Добавляем: DE + FR локали

// Структура:
// messages/
//   en.json  — 1,200 ключей (base, существует)
//   de.json  — перевод всего EN
//   fr.json  — перевод всего EN

// Locale detection:
// 1. User profile (Organization.locale)
// 2. Accept-Language header
// 3. URL prefix: /de/dashboard, /fr/dashboard (опционально)
```

#### AI Literacy Courses DE + FR

```javascript
// data/courses/executive.de.json — немецкая версия
// data/courses/executive.fr.json — французская версия
// (4 курса × 2 языка = 8 дополнительных файлов)

// Course player: загружает контент по locale пользователя
// Quiz questions: переведены + validated by Elena (AI Act expert)
```

#### Eva Multi-language

```javascript
// Eva отвечает на языке пользователя:
// Prompt prefix: "You are Eva, an AI Act compliance assistant.
//                Respond in {locale} ({localeName})."
// Locale из Organization.locale (устанавливается при регистрации)
// Mistral Large 3 отлично владеет DE + FR

// POST /api/settings/locale — обновить locale организации
// { locale: 'de' | 'fr' | 'en' }
```

#### Compliance Documents Locale

```javascript
// FRIA, AI Usage Policy, Monitoring Plan — генерируются в locale пользователя
// Prompt: "Generate the following section in {locale}: ..."
// PDF: Gotenberg → encoding правильный для DE/FR (UTF-8 already)
```

#### Locale Settings UI

```
Organization Settings → Language:
  [English ▼] | [Deutsch] | [Français]

Profile Settings → Language (overrides org):
  [Personal language preference]
```

#### Реализация

**Новые файлы:**
- `messages/de.json` — ~1,200 ключей немецкий перевод
- `messages/fr.json` — ~1,200 ключей французский перевод
- `data/courses/*.de.json` — 4 курса на немецком
- `data/courses/*.fr.json` — 4 курса на французском
- `app/api/settings/locale.js` — locale update endpoint

**Модифицированные файлы:**
- `middleware.ts` — locale detection + routing
- `app/i18n.ts` — добавить de + fr к supported locales
- `app/(dashboard)/settings/page.tsx` — language switcher UI
- `app/application/eva/chatService.js` — locale-aware prompt
- `app/application/documents/generateDocument.js` — locale-aware generation

#### Критерии приёмки

- [ ] Весь UI доступен на DE + FR (все ~1,200 ключей переведены)
- [ ] Locale переключатель в Settings: EN/DE/FR
- [ ] Eva отвечает на DE/FR если locale установлен
- [ ] AI Literacy курсы на DE + FR (все 4 курса)
- [ ] Compliance documents генерируются на locale пользователя
- [ ] Locale persists per Organization (не сбрасывается при обновлении)
- [ ] EN остаётся default если locale не выбран

- **Tests:** 2 (locale_switching.test, eva_locale_response.test)

---

### US-103: Monitoring Cloud Phase 2 — Scheduled Reports + SLA + Incidents (5 SP)

- **Feature:** F32 (завершение) | **Developer:** Leo

#### Описание

Как DPO, я хочу получать регулярные compliance digest отчёты по email, видеть SLA гарантии нашего тарифа, и управлять incident response workflow — от обнаружения нарушения до подтверждения исправления.

#### Scheduled Reports

```javascript
// Новая таблица: ScheduledReport
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  frequency: { type: 'string' },  // 'weekly' | 'monthly'
  recipients: { type: 'json' },   // [{ email, name }]
  format: { type: 'string', default: "'pdf'" },  // 'pdf' | 'csv' | 'both'
  lastSentAt: { type: 'datetime', nullable: true },
  nextSendAt: 'datetime',
  isActive: { type: 'boolean', default: true },
});

// pg-boss job: check_scheduled_reports — runs daily 08:00 UTC
// При nextSendAt <= now():
//   1. Генерация compliance digest (Mistral Small summary + табличные данные)
//   2. PDF через Gotenberg (если format=pdf)
//   3. Email через Brevo с attachment
//   4. Обновить lastSentAt + nextSendAt

// POST /api/monitoring/reports/schedule — создать расписание
// GET  /api/monitoring/reports/schedule — список расписаний
// POST /api/monitoring/reports/send-now  — immediate send (test)
```

#### Compliance Digest Content

```javascript
// Weekly digest включает:
// - Org-wide score change за неделю (+ или -)
// - Top 3 improvements
// - Top 3 deteriorations (с приоритетом)
// - Active alerts (drift, anomalies)
// - Upcoming deadlines (30 дней)
// - Regulatory updates (за неделю)
```

#### SLA Tracking

```javascript
// SLA per plan:
const planSLA = {
  starter:    { targetScore: null, responseTime: null },  // no SLA
  growth:     { targetScore: 75, responseTime: '48h' },   // soft SLA
  scale:      { targetScore: 85, responseTime: '24h' },   // SLA
  enterprise: { targetScore: 95, responseTime: '4h', dedicated: true }, // SLA + dedicated
};

// GET /api/monitoring/sla — текущий SLA status для org
// {
//   plan: 'scale', targetScore: 85, currentScore: 87, slamet: true,
//   scoreGuarantee: 'Complior guarantees score visibility, not compliance outcome'
// }
```

#### Incident Response Workflow

```javascript
// Новая таблица: ComplianceIncident
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  title: { type: 'string' },
  severity: { type: 'string' },    // 'critical' | 'high' | 'medium'
  articleRef: { type: 'string' },  // 'Art.26', 'Art.50'
  affectedTool: { type: 'string', nullable: true },
  status: { type: 'string', default: "'open'" }, // open|investigating|fixing|resolved|closed
  assignedTo: { type: 'User', nullable: true },
  detectedAt: 'datetime',
  resolvedAt: { type: 'datetime', nullable: true },
  timeline: { type: 'json' },       // [{timestamp, action, author, note}]
});

// POST /api/monitoring/incidents — создать инцидент (auto или manual)
// GET  /api/monitoring/incidents — список (open/resolved)
// PATCH /api/monitoring/incidents/:id/status — update status + timeline
// POST /api/monitoring/incidents/:id/assign — назначить ответственного
```

#### Vendor Monitoring

```javascript
// GET /api/monitoring/vendors — vendor compliance status
// Проверяет: AI vendor's own compliance declarations
// Sources: vendor public compliance pages + CrossSystemSource scan data
// Alert если: vendor compliance status изменился (new disclosure issue, etc.)
```

#### Реализация

**Новые файлы:**
- `schemas/ScheduledReport.js`
- `schemas/ComplianceIncident.js`
- `app/api/monitoring/reports.js` — schedule CRUD + send-now
- `app/api/monitoring/sla.js` — SLA status
- `app/api/monitoring/incidents.js` — incident workflow
- `app/api/monitoring/vendors.js` — vendor monitoring
- `app/jobs/scheduled-reports.js` — pg-boss daily job
- `app/application/monitoring/generateComplianceDigest.js`
- `app/(dashboard)/monitoring/incidents/page.tsx` — incident list
- `app/(dashboard)/monitoring/reports/page.tsx` — report scheduling UI

**Модифицированные файлы:**
- `app/(dashboard)/monitoring/page.tsx` — добавить SLA widget + incidents preview
- `app/jobs/drift-detection.js` — auto-create incident on critical drift

#### Критерии приёмки

- [ ] Scheduled Reports: weekly + monthly email с PDF attachment
- [ ] pg-boss job: отправка в 08:00 UTC, не пропускает
- [ ] Compliance Digest: score delta + top improvements/deteriorations + alerts
- [ ] SLA page: plan SLA + current score + SLA met/not met
- [ ] Incident creation: auto (из drift alert) + manual
- [ ] Incident lifecycle: open → investigating → fixing → resolved
- [ ] Incident timeline: каждое действие залоговано с автором + timestamp
- [ ] Vendor monitoring: флаг если vendor compliance status изменился

- **Tests:** 4 (scheduled_report_delivery.test, sla_calculation.test, incident_lifecycle.test, vendor_monitoring.test)

---

### US-104: Enterprise Completion — Org-Wide Scan + API v1.0 + White-Label (5 SP)

- **Feature:** F33 (завершение) | **Developer:** Max

#### Описание

Как CTO enterprise компании, я хочу запустить org-wide scan сразу по всем источникам — и предоставить регуляторам stable, versioned API v1.0 для автоматического аудита. Брендировать отчёты нашим логотипом.

#### Org-Wide Scan

```javascript
// POST /api/enterprise/scan/org-wide
// Запускает параллельно:
//   1. CrossSystemSource refresh (GitHub/GitLab rescan)
//   2. IdP rescan (WorkOS connected apps)
//   3. ScanResult latest (TUI data fresh)
//   4. Shadow AI check (diff inventory vs discovered)
// pg-boss jobs с progress tracking
// SSE push: progress updates + final result

// GET /api/enterprise/scan/org-wide/status/:jobId — progress
// {
//   status: 'running',
//   progress: { github: 'done', idp: 'running', shadow: 'pending' },
//   completedAt: null
// }
```

#### White-Label Reports

```javascript
// POST /api/enterprise/branding
// {
//   logoUrl: 'https://...',     // uploaded to Hetzner Object Storage
//   primaryColor: '#1A2B3C',
//   reportFooter: 'Acme GmbH Compliance Report',
//   hidePoweredBy: true          // enterprise only
// }

// Применяется к:
// - PDF compliance reports (Gotenberg template)
// - FRIA documents
// - AI Literacy certificates
// - Compliance digest emails
```

#### API v1.0 — Stable, Documented

```javascript
// Versioned API: /api/v1/ prefix (stable, breaking changes → v2)
// Swagger/OpenAPI 3.0 documentation: GET /api/v1/docs
// Machine-readable для SIEM / regulator tools

// Key stable endpoints:
// GET  /api/v1/compliance/summary     — org compliance score + breakdown
// GET  /api/v1/compliance/tools       — all AI tools + risk levels
// GET  /api/v1/compliance/violations  — open violations + articles
// GET  /api/v1/compliance/audit-trail — audit events (paginated)
// GET  /api/v1/agents                 — agent governance data
// GET  /api/v1/literacy/stats         — AI Literacy completion

// Auth: API Key (существующая инфраструктура из F26 Registry API)
// Rate limits: 1000 req/hr (enterprise), 100 req/hr (scale)
// Response format: stable JSON Schema (semver 1.0.0)
```

#### Custom Compliance Rules

```javascript
// Новая таблица: CustomComplianceRule
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  name: { type: 'string' },
  description: { type: 'string', nullable: true },
  condition: { type: 'json' },      // { field: 'riskLevel', op: 'eq', value: 'high' }
  action: { type: 'string' },       // 'require_fria' | 'block' | 'warn' | 'notify'
  isActive: { type: 'boolean', default: true },
  createdBy: { type: 'User' },
});

// POST /api/enterprise/rules — создать custom rule
// GET  /api/enterprise/rules — список rules для org
// PATCH /api/enterprise/rules/:id/toggle — enable/disable

// Пример: "Если AI tool в домене HR → автоматически требовать FRIA"
// Пример: "Если score < 70 → уведомить CTO"
```

#### Реализация

**Новые файлы:**
- `schemas/CustomComplianceRule.js`
- `app/api/enterprise/scan/org-wide.js` — org-wide scan trigger
- `app/api/enterprise/branding.js` — white-label config
- `app/api/enterprise/rules.js` — custom rules CRUD
- `app/api/v1/compliance.js` — stable v1 endpoints
- `app/api/v1/docs.js` — OpenAPI spec generation
- `app/jobs/org-wide-scan.js` — pg-boss orchestration
- `app/(dashboard)/enterprise/branding/page.tsx` — Branding UI
- `app/(dashboard)/enterprise/rules/page.tsx` — Custom Rules UI
- `app/(dashboard)/enterprise/api-v1/page.tsx` — API docs link + key management

**Модифицированные файлы:**
- `app/application/documents/generateDocument.js` — поддержка white-label брендинга
- `server/routes/api-v1.js` — mount stable v1 routes
- `app/application/monitoring/detectDrift.js` — применять custom rules

#### Критерии приёмки

- [ ] Org-Wide Scan: запускает все 4 источника параллельно + SSE progress
- [ ] Org-Wide Scan: завершается за < 5 минут (batch jobs)
- [ ] White-Label: PDF + certificates с кастомным логотипом/цветами
- [ ] `hidePoweredBy: true`: убрать "Powered by Complior" из PDF (enterprise only)
- [ ] API v1.0: стабильные endpoints + OpenAPI docs
- [ ] API v1.0: rate limiting per plan
- [ ] Custom Rules: CRUD + активация/деактивация
- [ ] Custom Rule execution: применяется при scan results обработке

- **Tests:** 3 (org_wide_scan_orchestration.test, white_label_pdf_branding.test, custom_rules_execution.test)

---

### US-105: Growth & Marketing — SEO + State of AI Report (5 SP)

- **Feature:** F34 | **Developer:** Nina (frontend) + Leo (data)

#### Описание

Как Marketing Manager Complior, я хочу запустить SEO-оптимизированные страницы для 27.5K AI tools, и опубликовать ежегодный "State of AI Compliance Report" — чтобы органически привлекать enterprise покупателей и генерировать PR.

#### SEO Pages Architecture

```javascript
// 27,500 pages = 2,477 AI tools × ~11 jurisdictions (DE, FR, AT, CH, US, UK, ...)
// Next.js generateStaticParams → ISR (revalidate: 86400 = daily)

// URL structure:
// /tools/[slug]                  — tool overview page
// /tools/[slug]/[jurisdiction]   — tool × jurisdiction compliance guide

// Страница /tools/openai-gpt4o:
//   - Что это: описание tool
//   - Risk classification (EU AI Act, Colorado SB 205, UK AI Act)
//   - Deployer obligations (Art.26, 27, 50)
//   - "Check your compliance →" CTA → registration
//   - Related tools

// Data source: RegistryTool table (2,477 tools) × JurisdictionObligation table
// Generation: Next.js build-time + ISR
```

#### SEO Technical

```javascript
// app/sitemap.ts → dynamic sitemap generation (27.5K URLs)
// app/robots.ts → crawl permissions
// Per-page metadata: OpenGraph + Twitter card + JSON-LD schema
// Core Web Vitals: LCP < 2.5s, CLS < 0.1 (static pages)

// JSON-LD для tool pages:
{
  "@type": "SoftwareApplication",
  "name": "OpenAI GPT-4o",
  "applicationCategory": "AI Assistant",
  "about": {
    "@type": "AIActCompliance",
    "riskLevel": "limited",
    "applicableArticles": ["Art.50"]
  }
}
```

#### State of AI Compliance Report

```javascript
// Ежегодный отчёт (lead gen) — анонимизированная агрегированная статистика:
// - % организаций compliant по risk level
// - Топ AI tools по использованию в EU
// - Avg compliance score по индустриям
// - Compliance trend 2025 → 2026
// - Top violations (без org-specific данных)

// Генерация: SQL агрегация → Mistral Medium 3 → markdown → PDF (Gotenberg)
// Landing: /report → email gate → download PDF → Brevo lead

// GET /api/growth/report/generate — (admin-only) регенерировать отчёт
// GET /api/growth/report/download?token=... — публичный download (после email)
// POST /api/growth/report/request — email gate → Brevo lead → download link
```

#### Compliance Leaderboard

```javascript
// /leaderboard — публичная страница
// Анонимизированный рейтинг организаций (только те, кто дал consent):
// #1. [Anonym] Manufacturing • Score: 94/100 • 45 employees trained
// #2. [Anonym] FinTech • Score: 91/100 • 200 employees trained

// Organization opt-in: Settings → "Show org on compliance leaderboard"
// Viral: "We're #12 on the EU AI Compliance Leaderboard! → link"

// GET /api/growth/leaderboard?limit=50 — публичный
// PATCH /api/settings/leaderboard-opt-in — { enabled: true }
```

#### Knowledge Base / Blog

```javascript
// /blog — статические MDX страницы (Next.js)
// /blog/[slug] — ISR articles

// Стартовый контент (10 статей):
// - "EU AI Act Guide for Deployers"
// - "Art. 4 AI Literacy: Everything SMBs Need to Know"
// - "FRIA Step-by-Step"
// - "High-Risk AI: Complete Checklist"
// - "ChatGPT in the Workplace: EU AI Act Compliance Guide"
// (+ 5 дополнительных)

// CTA на каждой странице: "Check your AI tools →" → /check (Quick Check)
```

#### Реализация

**Новые файлы (frontend/):**
- `app/tools/[slug]/page.tsx` — tool overview (ISR)
- `app/tools/[slug]/[jurisdiction]/page.tsx` — tool × jurisdiction (ISR)
- `app/sitemap.ts` — dynamic sitemap (27.5K URLs)
- `app/robots.ts`
- `app/leaderboard/page.tsx`
- `app/report/page.tsx` — email gate
- `app/blog/[slug]/page.tsx` — blog articles (MDX)
- `content/blog/` — 10 стартовых MDX статей

**Новые файлы (backend/):**
- `app/api/growth/report.js` — generate + download
- `app/api/growth/leaderboard.js` — public leaderboard
- `app/application/growth/generateStateReport.js` — SQL aggr + LLM

**Модифицированные файлы:**
- `app/api/settings/index.js` — leaderboard opt-in setting
- `app/(dashboard)/settings/page.tsx` — leaderboard toggle

#### Критерии приёмки

- [ ] `/tools/[slug]` — статическая страница для каждого из 2,477 tools (ISR)
- [ ] `/tools/[slug]/[jurisdiction]` — страница tool × jurisdiction (11 jurisdictions)
- [ ] sitemap.xml: 27.5K URLs, доступен для Googlebot
- [ ] JSON-LD schema: валидный (Google Rich Results Test)
- [ ] Core Web Vitals: LCP < 2.5s для tool pages
- [ ] State of AI Report: email gate → PDF download (Gotenberg)
- [ ] Report: анонимизированные данные (no org-specific)
- [ ] Leaderboard: только opt-in organizations, без PII
- [ ] Blog: 10 статей, `/blog/[slug]` работает + CTA
- [ ] Viral loop: KI-Compliance Siegel badge → landing

- **Tests:** 2 (tool_page_generation.test, state_report_anonymization.test)

---

### US-106: Org-Wide API v1.0 Documentation Site (2 SP)

- **Feature:** F33 (documentation) | **Developer:** Max

#### Описание

Как enterprise разработчик, я хочу полную, интерактивную документацию для Complior API v1.0 — чтобы интегрировать данные compliance в наши внутренние дашборды и SIEM системы.

#### API Docs Site

```
/developer — Developer portal
  /developer/api-v1 — API v1.0 reference (Swagger UI)
  /developer/api-v1/auth — Authentication guide (API Keys)
  /developer/api-v1/examples — Code examples (curl, Python, JS)
  /developer/webhooks — Webhook events reference
```

#### Swagger/OpenAPI 3.0

```javascript
// GET /api/v1/openapi.json — machine-readable spec
// GET /developer/api-v1 → Swagger UI (или Redoc)

// Endpoints documented:
// /api/v1/compliance/summary
// /api/v1/compliance/tools
// /api/v1/compliance/violations
// /api/v1/compliance/audit-trail
// /api/v1/agents
// /api/v1/literacy/stats

// Auth header examples:
// Authorization: Bearer {apiKey}
```

#### Webhook Events Reference

```javascript
// Webhooks: org может настроить URL для real-time events
// POST /api/enterprise/webhooks — configure webhook URL
// Events:
// scan.uploaded     — новый TUI scan
// score.changed     — org score изменился
// alert.created     — новый monitoring alert
// incident.created  — новый compliance incident
// report.sent       — scheduled report отправлен

// Payload format: { event, orgId, timestamp, data: {...} }
// Security: HMAC-SHA256 signature в header X-Complior-Signature
```

#### Реализация

**Новые файлы:**
- `app/developer/page.tsx` — developer portal home
- `app/developer/api-v1/page.tsx` — Swagger UI
- `app/developer/webhooks/page.tsx` — webhook docs
- `app/api/enterprise/webhooks.js` — webhook config CRUD
- `app/application/webhooks/dispatchWebhook.js` — HMAC-signed dispatch

**Модифицированные файлы:**
- `app/api/v1/compliance.js` — добавить OpenAPI annotations
- `server/routes/enterprise.js` — mount webhook routes

#### Критерии приёмки

- [ ] `/developer/api-v1` — Swagger UI доступен
- [ ] OpenAPI spec: валидный JSON, все v1 endpoints документированы
- [ ] Webhook config: сохранить URL + secret
- [ ] Webhook delivery: HMAC-SHA256 signature верифицируется
- [ ] Code examples: curl + Python + JavaScript working examples

- **Tests:** 2 (webhook_hmac_signature.test, api_v1_openapi_valid.test)

---

---

### US-107: UK + Japan + Canada + Brazil + EU AI Act Omnibus (5 SP)

- **Feature:** F26 (Registry API расширение) | **Developer:** Max
- **Источник:** `~/complior/docs/PROJECT-AGENT-HANDOFF.md` Задача 4

#### Описание

Как compliance officer в международной организации, я хочу видеть compliance obligations по UK AI Governance, Japan AI Governance, Canada AIDA и Brazil AI Act — чтобы покрыть все 9 ключевых юрисдикций в одной платформе.

**После US-107:** итого 9 юрисдикций = EU + CO + TX + CA(US) + KR + UK + JP + CA(Canada) + BR

#### Четыре юрисдикции + Omnibus

**UK AI Governance Framework** (`uk-ai-regulation`, UK) — 5 checks:
- `uk_safety`, `uk_transparency`, `uk_contestability` (**нет в EU**), `uk_accountability`, `uk_fairness`

**Japan AI Governance Act** (`japan-ai-governance`, JP) — 5 checks:
- `jp_transparency`, `jp_ai_safety`, `jp_data_localization` (**строже EU**), `jp_healthcare_controls`, `jp_human_centric`

**Canada AIDA Bill C-27** (`canada-aida`, CA) — 5 checks:
- `ca_impact_assessment`, `ca_mitigation_measures`, `ca_explainability`, `ca_incident_reporting` (72h), `ca_bias_mitigation`

**Brazil AI Act 2025** (`brazil-ai-act`, BR) — 5 checks:
- `br_disclosure`, `br_risk_classification`, `br_high_risk_domains`, `br_lgpd_integration`, `br_dpa_reporting`

**EU AI Act Omnibus** (`eu-ai-act-omnibus`, EU, conditional) — 1 check:
- `omnibus_high_risk_extended` — условная активация при принятии Digital Omnibus Act
- Флаг `conditional: true` в RegulationMeta + `activation: "Digital Omnibus Act passed"`

#### Реализация

**Новые файлы:**
- `app/seeds/seed-international-jurisdictions.js` — UK + JP + CA + BR seed
- `app/seeds/seed-eu-omnibus.js` — EU AI Act Omnibus (conditional)
- `scripts/run-international-migration.js`

**Модифицированные файлы:**
- `app/schemas/RegulationMeta.js` — добавить поле `conditional: { type: 'boolean', default: false }` и `activationCondition: { type: 'text', required: false }`
- `app/api/regulations/meta.js` — возвращать `conditional` поле; по умолчанию `conditional` записи не включаются в список (query param `includeConditional=true` для явного включения)

#### CrossMappings (ключевые)
- `uk_contestability` → нет в EU (relationship: `stricter`)
- `jp_data_localization` → нет в EU (relationship: `stricter`)
- `ca_incident_reporting` → похоже Art.73 EU (relationship: `equivalent`)
- `br_lgpd_integration` → GDPR + EU AI Act совместная применимость

#### Критерии приёмки

- [ ] 9 юрисдикций в `RegulationMeta` (5 существующих + 4 новых + 1 conditional EU Omnibus)
- [ ] 20 новых Obligations (5 × 4 jurisdictions) вставлены
- [ ] `GET /v1/regulations/meta` → 9 записей (8 обычных + Omnibus при `includeConditional=true`)
- [ ] `conditional: true` для Omnibus — не включается в стандартный список
- [ ] CrossMappings для уникальных требований (`uk_contestability`, `jp_data_localization`)
- [ ] `RegulationMeta.conditional` + `activationCondition` поля работают

- **Tests:** 2 (international_jurisdictions_query.test, conditional_jurisdiction_filter.test)

---

### US-108: AI Registry Expansion — Категории + Detection Patterns (5 SP) ✅ COMPLETED 2026-02-23

- **Feature:** F26 (Registry API) | **Developer:** Max + Leo
- **Источник:** `~/complior/docs/PROJECT-AGENT-HANDOFF.md` Задача 5

#### Описание

Как пользователь `complior` (TUI), я хочу, чтобы детектор находил AI tools через detection patterns — npm пакеты, pip зависимости, env vars, import statements, API call patterns — чтобы сканирование было точным и полным.

> **Текущий статус:** 4,983 инструментов в БД. Нужно: верифицировать данные и заполнить `detectionPatterns` для ≥ 860 ключевых инструментов.

#### Категории для расширения/верификации

| Категория | Целевое кол-во | Описание |
|-----------|---------------|----------|
| `enterprise_llm` | 50 | Azure OpenAI, AWS Bedrock, GCP Vertex, IBM WatsonX |
| `specialized_models` | 100 | медицина, право, финансы |
| `embedding_models` | 80 | Cohere, Voyage, Jina, etc. |
| `autonomous_agents` | 60 | мелкие agent frameworks |
| `ml_platforms` | 100 | MLflow, Kubeflow, SageMaker, Vertex AI |
| `data_annotation` | 50 | Scale AI, Labelbox, Roboflow |
| `ai_testing` | 30 | Arize, WhyLabs, Evidently |
| `ai_governance` | 40 | конкуренты (informational) |
| `country_specific` | 200 | Baidu, Alibaba, Samsung AI, Naver, etc. |
| `research_models` | 150 | Llama, Mistral variants, academic models |

#### Detection Pattern структура (в `RegistryTool.detectionPatterns`)

```json
{
  "npm": ["openai", "@anthropic-ai/sdk"],
  "pip": ["openai", "anthropic"],
  "imports": ["from openai", "import openai", "require('openai')"],
  "env_vars": ["OPENAI_API_KEY", "OPENAI_ORG_ID"],
  "api_calls": ["openai.chat.completions.create", "client.chat.completions.create"],
  "domains": ["api.openai.com", "openai.com"]
}
```

#### Refresh Pipeline задача

```javascript
// pg-boss job: enrich-detection-patterns (новый)
// Запускается еженедельно в среду 03:00 UTC
// Для инструментов с level='verified' у которых detectionPatterns пустой:
//   1. Passive scan website + npm registry + PyPI + GitHub
//   2. Mistral Small: extract patterns из README + docs
//   3. UPDATE RegistryTool SET detectionPatterns = $1 WHERE slug = $2
```

#### Реализация

**Новые файлы:**
- `app/seeds/seed-detection-patterns.js` — seed для топ-100 инструментов (OpenAI, Anthropic, Mistral, LangChain, Hugging Face, Cohere, Azure AI и др.)
- `scripts/run-detection-patterns-seed.js`
- `app/application/jobs/schedule-detection-enrichment.js` — pg-boss weekly job

**Модифицированные файлы:**
- `app/domain/registry/refresh-service.js` — добавить `enrichDetectionPatterns()` метод
- `app/api/registry/tools.js` — добавить фильтр `hasDetectionPatterns=true`

**npm script:** добавить `"seed:detection-patterns": "node scripts/run-detection-patterns-seed.js"` в package.json

#### Критерии приёмки

- [x] Топ-74 инструментов имеют заполненный `detectionPatterns` (npm + pip + imports + env_vars) — все крупные категории покрыты
- [x] `GET /v1/registry/tools?hasDetectionPatterns=true` → фильтрация работает
- [x] pg-boss job `enrich-detection-patterns` зарегистрирован (среда 03:00 UTC)
- [x] `RegistryTool.detectionPatterns` JSON schema задокументирована (в US-108 + inline в seed)
- [x] 10+ категорий верифицированы: chatbot, coding, marketing, recruitment, image_generation, enterprise_llm, embedding, agents, ml_platform, annotation

- **Tests:** 2 ✅ (detection-patterns-query.test.js — 13 tests, enrichment-job-registration.test.js — 14 tests)

---

### US-109: Public Regulation API — Revenue Stream (4 SP)

- **Feature:** F26 (Registry API Public) | **Developer:** Max
- **Источник:** `~/complior/docs/PROJECT-AGENT-HANDOFF.md` Задача 6

#### Описание

Как enterprise разработчик или legaltech провайдер, я хочу доступ к публичному REST API с данными Regulation DB — чтобы интегрировать compliance данные в свои продукты, платя за доступ на Scale+ плане.

> **Это revenue stream:** публичный API за деньги. Использует существующую APIKey инфраструктуру (из F26, Sprint 7). Rate limiting по плану.

#### Endpoints

```
GET /api/v1/regulations                             → список всех юрисдикций (9 итого)
GET /api/v1/regulations/eu-ai-act                  → full EU AI Act data
GET /api/v1/regulations/eu-ai-act/articles/50      → конкретная статья (из articleReference)
GET /api/v1/regulations/eu-ai-act/checks           → все obligations/checks с правилами
GET /api/v1/tools                                   → AI tool registry (с pagination, filters)
GET /api/v1/tools/openai-gpt4                      → конкретный инструмент + detectionPatterns
GET /api/v1/diff?from=eu-ai-act&to=uk-ai-regulation → diff двух юрисдикций (cross-mapping)
POST /api/v1/score                                  → calculate compliance score (batch)
```

#### Rate Limits по плану

| Plan | Requests/day | Access |
|------|-------------|--------|
| Free | 100 | только /regulations (read-only) |
| Growth | 1,000 | + /tools |
| Scale | 10,000 | + /diff + /score |
| Enterprise | unlimited | + SLA + webhook + dedicated |

#### Auth

Использует существующую `APIKey` таблицу + middleware из F26 (Sprint 7). Новый `scope: "regulation_api"` для ключей, выданных через Public API.

#### OpenAPI / Swagger

```javascript
// GET /api/v1/openapi-regulation.json — spec только для Regulation API
// Отдельный от Enterprise API v1.0 (US-104/US-106) — разные аудитории
```

#### Реализация

**Новые файлы:**
- `app/api/v1/regulations-public.js` — все public regulation endpoints
- `app/api/v1/tools-public.js` — public tools endpoints
- `app/api/v1/diff-public.js` — jurisdiction diff endpoint
- `app/api/v1/score-public.js` — score calculator
- `app/application/regulations/calculateComplianceScore.js` — batch score logic
- `app/application/regulations/buildJurisdictionDiff.js` — diff из CrossMapping

**Модифицированные файлы:**
- `server/routes/api-v1.js` — mount public regulation routes
- `app/application/iam/resolveSession.js` — поддержка `scope: "regulation_api"` для API keys
- `app/(dashboard)/settings/apiKeys.js` — UI для генерации Regulation API ключей

#### Критерии приёмки

- [ ] `GET /api/v1/regulations` → 9 юрисдикций (без conditional по умолчанию)
- [ ] `GET /api/v1/regulations/eu-ai-act` → полный объект с 108 obligations
- [ ] `GET /api/v1/regulations/eu-ai-act/articles/50` → obligations с `articleReference` содержащим "Art. 50"
- [ ] `GET /api/v1/tools?limit=20&category=chatbot` → пагинированный список
- [ ] `GET /api/v1/tools/chatgpt` → полный объект с detectionPatterns
- [ ] `GET /api/v1/diff?from=eu-ai-act&to=uk-ai-regulation` → `{ unique_to_source, unique_to_target, equivalent, stricter }` из CrossMapping
- [ ] `POST /api/v1/score` → `{ obligations: [...], score: number, breakdown: {...} }`
- [ ] Rate limiting: Free = 100 req/day, реджект 429 при превышении
- [ ] `GET /api/v1/openapi-regulation.json` → валидный OpenAPI 3.0 spec
- [ ] Billing: Scale+ required для `/diff` и `/score`

- **Tests:** 3 (public_regulation_api_endpoints.test, jurisdiction_diff_calculation.test, regulation_api_rate_limiting.test)

---

## Summary

| US | Feature | Developer | SP | Tests |
|----|---------|-----------|-----|-------|
| US-101 | F18: AI Literacy Module | Max + Nina | 8 | 5 |
| US-102 | F14: Multi-language DE + FR | Nina | 6 | 2 |
| US-103 | F32: Monitoring Phase 2 — Reports + SLA + Incidents | Leo | 5 | 4 |
| US-104 | F33: Enterprise — Org Scan + API v1.0 + White-Label | Max | 5 | 3 |
| US-105 | F34: Growth — SEO + State of AI Report + Blog | Nina + Leo | 5 | 2 |
| US-106 | F33: API v1.0 Docs + Webhooks | Max | 2 | 2 |
| US-107 | F26: UK + JP + CA + BR + EU Omnibus Jurisdictions | Max | 5 | 2 |
| US-108 | F26: AI Registry Expansion + Detection Patterns | Max + Leo | 5 | 27 ✅ |
| US-109 | F26: Public Regulation API (Revenue Stream) | Max | 4 | 3 |
| **Итого** | | | **45** | **25** |

> Дополнительно ~4 integration tests (AI Literacy end-to-end, org-wide scan, SEO build). Total ≈ 22 новых тестов.

---

## Definition of Done

- [ ] **9 юрисдикций:** UK + JP + CA + BR + EU Omnibus в PostgreSQL (20 новых Obligations + 5 RegulationMeta)
- [x] **AI Registry:** топ-74 инструментов с заполненным `detectionPatterns` (74/74 seeded ✅), enrich job `enrich-detection-patterns` зарегистрирован (среда 03:00 UTC ✅)
- [ ] **Public Regulation API:** 8 endpoints live + OpenAPI spec + rate limiting по плану
- [ ] **AI Literacy Module:** 4 курса + quizzes + PDF certificates + employee import + dashboard widget
- [ ] **Multi-language:** DE + FR UI + курсы + Eva + compliance documents
- [ ] **Monitoring Phase 2:** Scheduled reports email + SLA tracking + Incident workflow + Vendor monitoring
- [ ] **Enterprise Completion:** Org-Wide Scan + White-Label PDF + Custom Compliance Rules + API v1.0
- [ ] **Growth:** 27.5K SEO tool pages (ISR) + sitemap + State of AI Report + Leaderboard + Blog
- [ ] **API v1.0 Docs:** Swagger UI live + Webhook reference + HMAC dispatch
- [ ] **DB migrations:** LiteracyCourse, Employee, CourseEnrollment, ScheduledReport, ComplianceIncident, CustomComplianceRule созданы
- [ ] `npm test` — ~302 total, все green
- [ ] `npm run typecheck` — 0 errors
- [ ] Lighthouse score: tool pages LCP < 2.5s, CLS < 0.1
- [ ] Google Search Console: sitemap submitted
- [ ] Deploy to production: **FULL SCOPE milestone** ✅

---

## Product Milestone: FULL SCOPE ✅

```
Sprint 0     ██ Infrastructure                                              ✅
Sprint 1     ████ IAM + AI Tool Inventory (start)                          ✅
Sprint 2     ████ Rules + Classification + Inventory (end)                 ✅
Sprint 2.5   ████ Invite Flow + Team + Enforcement                         ✅
Sprint 3     ████ Dashboard API + History + Requirements                   ✅
Sprint 3.5   ████ Stripe Checkout + Quick Check + Penalty Calculator       ✅
Sprint 4     ████ Production Deploy: Docker + Caddy + Kratos               ✅
Sprint 5     ████ Frontend Rebuild: Landing + Auth + Pricing + Tools       ✅
Sprint 6     ████ Admin Panel + Stripe Test + Production Deploy            ✅
             ── MVP FRONTEND READY ──
Sprint 7     ████ WorkOS + Registry API + TUI Data + Eva                   ✅
             + AI Regulation DB Migration (4,983 tools, 108 obligations)
             + Detection Patterns (US-108: 74 tools seeded)
             ── TUI+SaaS CORE READY ──
Sprint 8     ████ Dashboard v2 + Cross-System Map + Discovery + Provider   ✅
             ── PRODUCT READY ──
Sprint 9     ████ Governance Cloud + Remediation + Monitoring v1           ✅
             + Enterprise Foundation + Regulatory Monitor + KI-Siegel
Sprint 10    ████ AI Literacy + Multi-language + Monitoring v2             ✅
             + Enterprise Completion + Growth & Marketing
             ── FULL SCOPE ── ← WE ARE HERE
Future       ████ F35: Marketplace + F36: White-Label + Agent Features
```

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| DE/FR перевод качество (1,200 ключей) | Средняя | Средний | Professional translator review для key user flows, i18n QA checklist |
| AI Literacy курс контент валидация | Средняя | Высокий | Elena expert review перед публикацией, user feedback loop |
| SEO: 27.5K страниц → build time | Высокая | Средний | ISR (не SSG), generateStaticParams только для top-100 tools, остальное on-demand |
| State of AI Report: anonymization leak risk | Средняя | Высокий | k-anonymity (min 5 orgs per bucket), legal review, no org-specific data |
| API v1.0 backward compatibility | Средняя | Высокий | Strict semver, deprecation policy, `/api/v1/` locked — breaking changes → v2 |
| Aug 2, 2026 EU deadline — customer pressure | Высокая | Средний | Prioritize AI Literacy (уже обязателен) + FRIA + basic compliance — всё в Sprint 8-10 |
| Webhook security (HMAC bypass) | Низкая | Высокий | Test HMAC signing, rotate secrets UI, rate limit webhook config changes |
