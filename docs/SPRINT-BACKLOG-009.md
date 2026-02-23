# SPRINT-BACKLOG-009.md — Agent Governance Cloud + Remediation + Monitoring + Enterprise

**Версия:** 1.0.0
**Дата:** 2026-02-22
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Planned
**Зависимости:** Sprint 8 (Dashboard v2 + Cross-System Map) merged to develop

---

## Sprint Goal

Запустить Agent Governance Cloud (F30), Remediation Cloud (F31), первый этап Monitoring Cloud (F32), Enterprise Foundation (F33). Добавить Regulatory Monitor (F12), KI-Compliance Siegel trust badge (F20), и SaaS Discovery расширение — API Traffic + Bot connectors (F29). Выход на Enterprise-ready платформу.

**Capacity:** ~33 SP | **Duration:** 3 недели
**Developers:** Max (Backend — Governance + Remediation API), Nina (Frontend — Monitoring Dashboard + Enterprise UI), Leo (Infra — Regulatory Monitor + KI-Siegel + Discovery connectors)
**Baseline:** ~260 tests (Sprint 8) → **New: ~20 tests (total: ~280)**

> **Prerequisite:** Sprint 8 merged to develop. Cross-System Map live. Agent Governance UI (read-only) работает. CrossSystemSource таблица создана. SSE push работает.

---

## Граф зависимостей

```
F28 (Dashboard v2, S008) ──► US-091 (Agent Governance Cloud backend)
                                      │
                         US-092 (Remediation Cloud API)
                                      │
US-091 + US-092 ──► US-093 (Monitoring Dashboard — Screen 26)
                           │
                   US-094 (Enterprise: Team Dashboard + Custom Roles)

US-095 (Regulatory Monitor F12) — параллельно, зависит от pg-boss (F07)

US-096 (KI-Compliance Siegel F20) — параллельно, зависит от F05 (Dashboard compliance data)

US-097 (SaaS Discovery F29: API Traffic + Bot) — параллельно, зависит от F27 (TUI Data)
```

---

## User Stories

### US-091: Agent Governance Cloud — Backend API (6 SP)

- **Feature:** F30 | **Developer:** Max

#### Описание

Как CTO, я хочу управлять AI coding agents организации через Dashboard: задавать permissions matrix, отслеживать lifecycle (provision → approve → monitor → decommission) и видеть audit trail — не только читать данные из TUI, но и настраивать политику.

#### Permissions Matrix API

```javascript
// Новая таблица: AgentPolicy (MetaSQL)
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  agentName: { type: 'string' },        // 'hr-screening', 'customer-bot'
  agentType: { type: 'string' },        // 'decision', 'chatbot', 'dev-tool'
  riskLevel: { type: 'string' },        // 'high', 'limited', 'minimal'
  permissions: { type: 'json' },         // { canReadPII: false, canWriteFiles: true, ... }
  lifecycle: { type: 'string', default: "'active'" }, // draft|pending|active|suspended|decommissioned
  approvedBy: { type: 'User', nullable: true },
  approvedAt: { type: 'datetime', nullable: true },
  complianceScore: { type: 'integer', nullable: true },
});

// Новая таблица: AgentDependency (Cross-Agent map)
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  sourceAgent: { type: 'string' },
  targetAgent: { type: 'string' },
  dependencyType: { type: 'string' },   // 'calls', 'reads', 'triggers'
});

// Endpoints:
// GET  /api/governance/agents         — список всех AgentPolicy для org
// POST /api/governance/agents         — создать/обновить политику агента
// GET  /api/governance/agents/:name   — детали + permissions + lifecycle
// PATCH /api/governance/agents/:name/lifecycle — смена lifecycle статуса
// GET  /api/governance/dependency-map — граф зависимостей между агентами
// GET  /api/governance/audit-trail    — последние 200 событий по агентам
```

#### Permissions Matrix

```javascript
// Стандартные разрешения per agent:
const agentPermissions = {
  canReadPII:           false,  // может читать персональные данные?
  canWriteFiles:        true,   // может изменять файлы?
  canCallExternalAPIs:  true,   // может делать внешние API запросы?
  canMakeDecisions:     false,  // принимает автономные решения?
  requiresHITL:         true,   // human-in-the-loop required?
  maxConcurrentSessions: 1,     // ограничение параллельных сессий
  allowedDomains:       [],     // whitelist доменов для внешних вызовов
};
```

#### Cross-Agent Dependency Map

```javascript
// GET /api/governance/dependency-map
// Возвращает граф: nodes (агенты) + edges (зависимости)
{
  nodes: [
    { name: "hr-screening", type: "decision", risk: "high", score: 34 },
    { name: "customer-bot", type: "chatbot",  risk: "limited", score: 82 }
  ],
  edges: [
    { from: "hr-screening", to: "customer-bot", type: "calls" }
  ]
}
```

#### Реализация

**Новые файлы:**
- `schemas/AgentPolicy.js` — новая MetaSQL таблица
- `schemas/AgentDependency.js` — граф зависимостей
- `app/api/governance/agents.js` — CRUD handlers
- `app/api/governance/dependency-map.js` — граф endpoint
- `app/api/governance/audit-trail.js` — audit events
- `app/application/governance/buildDependencyMap.js` — граф агрегация
- `app/application/governance/validateAgentPolicy.js` — проверка политики

**Модифицированные файлы:**
- `server/routes/governance.js` — mount governance routes
- `app/api/v1/tui/scans.js` — сохранять agentData из TUI upload → AgentPolicy sync

#### Критерии приёмки

- [ ] `GET /api/governance/agents` → список агентов с lifecycle + score
- [ ] `POST /api/governance/agents` → создать/обновить permissions matrix
- [ ] Lifecycle transitions: draft → pending → active → suspended → decommissioned
- [ ] Approve: Admin/Owner approve agent policy → `approvedBy` + `approvedAt` filled
- [ ] Cross-Agent dependency map: граф nodes + edges
- [ ] Audit trail: каждое изменение политики логируется
- [ ] TUI sync: данные из TUI scan upload обновляют AgentPolicy (не перезаписывают ручные настройки)

- **Tests:** 4 (agent_policy_crud.test, lifecycle_transitions.test, dependency_map_build.test, agent_audit_trail.test)

---

### US-092: Remediation Cloud — Backend API (6 SP)

- **Feature:** F31 | **Developer:** Max

#### Описание

Как CTO, я хочу управлять compliance-remediation планами для всей организации через Dashboard: org-wide планы, автоматические vendor assessment questionnaires, и cloud-hosted Compliance Proxy для команд, которые не хотят разворачивать Engine локально.

#### Org-Wide Remediation Plans

```javascript
// Новая таблица: RemediationPlan
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  title: { type: 'string' },
  sourceType: { type: 'string' },  // 'tui_scan' | 'dashboard_manual' | 'auto_generated'
  targetScore: { type: 'integer', default: 85 },
  currentScore: { type: 'integer' },
  deadline: 'datetime',
  tasks: { type: 'json' },         // [{id, title, article, effort, status, assignee}]
  status: { type: 'string', default: "'active'" }, // active|completed|archived
  generatedAt: 'datetime',
});

// Endpoints:
// GET  /api/remediation/plans           — список планов для org
// POST /api/remediation/plans           — создать план вручную
// POST /api/remediation/plans/generate  — auto-generate из scan data
// GET  /api/remediation/plans/:id       — детали плана + прогресс
// PATCH /api/remediation/plans/:id/tasks/:taskId — update task status
```

#### Auto-Generated Plan

```javascript
// POST /api/remediation/plans/generate
// Input: { sourceType: 'cross_system_map' } | { tuiScanId: '...' }
// Алгоритм:
// 1. Загрузить все violations из CrossSystemSource + ScanResult для org
// 2. Приоритизировать: высокий impact (article criticality) + низкий effort
// 3. Сгруппировать по статьям (Art.50.1, Art.4, Art.12...)
// 4. Создать RemediationPlan с tasks + оценкой effort + deadline

// Output example:
{
  title: "Q2 2026 Compliance Sprint",
  currentScore: 52,
  targetScore: 85,
  deadline: "2026-08-01",
  tasks: [
    { id: 1, article: "Art.50.1", title: "Add AI disclosure", effort: "2h", points: 12 },
    { id: 2, article: "Art.12",   title: "Enable interaction logging", effort: "4h", points: 8 }
  ]
}
```

#### Vendor Assessment Automation

```javascript
// Новая таблица: VendorAssessment
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  vendorName: { type: 'string' },
  vendorEmail: { type: 'string', nullable: true },
  aiToolName: { type: 'string' },
  questionnaire: { type: 'json' },   // стандартный Art.26 questionnaire
  status: { type: 'string', default: "'pending'" }, // pending|sent|responded|reviewed
  sentAt: { type: 'datetime', nullable: true },
  respondedAt: { type: 'datetime', nullable: true },
  response: { type: 'json', nullable: true },
});

// POST /api/remediation/vendor-assessments — создать + отправить email (Brevo)
// GET  /api/remediation/vendor-assessments — список для org
// POST /api/remediation/vendor-assessments/:id/resend
// GET  /api/remediation/vendor-assessments/public/:token — публичная форма для вендора
```

#### Compliance Proxy Hosted

```javascript
// Cloud-hosted compliorWrap() — для команд без локального Engine
// POST /api/proxy/configure — настройка proxy config для org
// GET  /api/proxy/usage     — usage stats (requests proxied, violations blocked)
// POST /api/proxy/test      — тест config без деплоя

// Proxy Config:
{
  enabled: true,
  targetAPI: "https://api.openai.com",
  hooks: {
    preHooks: ["disclosure", "pii-filter", "prohibited"],
    postHooks: ["content-marking", "logger"]
  },
  orgWebhookUrl: "https://customer.example.com/webhook"
}
```

#### Реализация

**Новые файлы:**
- `schemas/RemediationPlan.js`
- `schemas/VendorAssessment.js`
- `app/api/remediation/plans.js` — CRUD + generate
- `app/api/remediation/vendor-assessments.js`
- `app/api/proxy/configure.js` — hosted proxy config
- `app/application/remediation/generateRemediationPlan.js` — auto-gen logic
- `app/application/remediation/sendVendorQuestionnaire.js` — Brevo email

**Модифицированные файлы:**
- `server/routes/remediation.js` — mount routes

#### Критерии приёмки

- [ ] `POST /api/remediation/plans/generate` → план с приоритизированными tasks
- [ ] Task management: статусы (todo → in_progress → done) + assignee
- [ ] Vendor Assessment: email отправляется через Brevo
- [ ] Vendor public form: вендор заполняет опросник без auth
- [ ] Compliance Proxy config: сохраняется + валидируется
- [ ] Org isolation: org A не видит планы org B

- **Tests:** 3 (remediation_plan_generation.test, vendor_assessment_email.test, proxy_config_validation.test)

---

### US-093: Monitoring Dashboard Cloud — Screen 26 (5 SP)

- **Feature:** F32 (partial) | **Developer:** Nina

#### Описание

Как DPO, я хочу видеть Monitoring Dashboard с drift alerts, anomaly detection и score heatmap — чтобы немедленно реагировать на ухудшение compliance в любой части организации.

#### Screen 26: Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Monitoring Dashboard                              2026-02-22 18:03 UTC   │
│                                                                           │
│ ┌─ Active Alerts (3) ───────────────────────────────────────────────┐   │
│ │ 🔴 DRIFT  hr-screening: score dropped 82→34 in 7 days             │   │
│ │ 🟠 ANOMALY customer-bot: 12x spike in off-topic queries (02:00 AM) │   │
│ │ 🟡 REVIEW  Regulation update: Art.50.1 guidance updated (EU)       │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│ Score Heatmap (org-wide, 30d)                                            │
│ ┌──────────────────────────────────────────────────────────────────┐    │
│ │ System          Feb01 Feb08 Feb15 Feb22                           │    │
│ │ hr-screening    ████  ████  ████  ████  (RED 34)                  │    │
│ │ customer-bot    ████  ████  ████  ████  (GREEN 82)                 │    │
│ │ LangChain API   ████  ████  ████  ████  (AMBER 61)                 │    │
│ └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│ Regulation Feed:                                              [+ Filter]  │
│ • Feb 20: BNetzA Q&A updated — Art.26 deployer oversight clarified      │
│ • Feb 15: EU AI Office published high-risk guidance update              │
│                                                                           │
│ [Configure Alerts]  [Scheduled Reports]  [Export Audit Trail]           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Drift Detection API

```javascript
// GET /api/monitoring/alerts
// Типы alertов:
// - score_drift: score change > 15 points in 7 days
// - anomaly: unusual activity pattern (spike, off-hours)
// - regulation_update: новое в EUR-Lex для deployer-relevant articles

// POST /api/monitoring/alerts/configure
// { threshold: 15, period: '7d', notify: ['email', 'in-app'] }

// GET /api/monitoring/heatmap?period=30d
// Matrix: { systems: [...], dates: [...], scores: [[...]] }

// GET /api/monitoring/regulation-feed?limit=10
// Источник: EUR-Lex scraping job (US-095)
```

#### Реализация

**Новые файлы (frontend/):**
- `app/(dashboard)/monitoring/page.tsx` — Screen 26
- `components/monitoring/AlertPanel.tsx` — active alerts list
- `components/monitoring/ScoreHeatmap.tsx` — heatmap component
- `components/monitoring/RegulationFeed.tsx` — regulation updates
- `hooks/useMonitoringAlerts.ts` — SSE for real-time alerts

**Новые файлы (backend/):**
- `app/api/monitoring/alerts.js` — GET + configure
- `app/api/monitoring/heatmap.js` — score matrix
- `app/application/monitoring/detectDrift.js` — drift detection logic
- `app/application/monitoring/detectAnomalies.js` — anomaly detection
- `app/jobs/drift-detection.js` — pg-boss daily job

**Модифицированные файлы:**
- `server/routes/monitoring.js` — mount routes
- `app/(dashboard)/layout.tsx` — добавить Monitoring в nav

#### Критерии приёмки

- [ ] Screen 26: активные alerts + heatmap + regulation feed
- [ ] Drift alert: score drop > 15 points → alert создаётся + in-app уведомление
- [ ] Anomaly: spike > 10x normal activity → flag
- [ ] Score heatmap: корректная матрица за 30 дней
- [ ] pg-boss job: drift detection запускается ежедневно
- [ ] Alert configuration: пользователь настраивает threshold + notification channels
- [ ] SSE: новый alert → Dashboard обновляется без reload

- **Tests:** 4 (drift_detection_logic.test, anomaly_detection.test, heatmap_aggregation.test, alert_sse_push.test)

---

### US-094: Enterprise Foundation — Team Dashboard + Custom Roles (5 SP)

- **Feature:** F33 (partial) | **Developer:** Nina

#### Описание

Как HR Director в enterprise компании, я хочу видеть compliance dashboard разбитый по departament'ам — и назначать custom roles пользователям с гранулярными правами.

#### Team Dashboard (per-department view)

```
Team Compliance Overview
───────────────────────────────────────────────────────
┌─────────────────┬──────────┬────────┬──────────────────┐
│ Department      │ AI Tools │  Score │ Status           │
├─────────────────┼──────────┼────────┼──────────────────┤
│ HR              │ 3 tools  │ 41/100 │ ⚠ 2 violations  │
│ Engineering     │ 7 tools  │ 79/100 │ ✓ On track       │
│ Marketing       │ 4 tools  │ 68/100 │ ⚠ 1 violation   │
│ Finance         │ 2 tools  │ 55/100 │ ⚠ FRIA missing  │
└─────────────────┴──────────┴────────┴──────────────────┘

Per-Department Detail:
  → AI tools list (filterable)
  → Responsible team member + contact
  → Outstanding violations + deadlines
  → Export department report
```

#### Custom Roles API

```javascript
// Новая таблица: CustomRole
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  name: { type: 'string' },          // 'compliance-auditor', 'dept-head'
  description: { type: 'string', nullable: true },
  permissions: { type: 'json' },      // { 'tools:read': true, 'agents:approve': true, ... }
  isSystem: { type: 'boolean', default: false }, // системные роли нельзя удалять
});

// Endpoints:
// GET  /api/enterprise/roles          — список custom roles
// POST /api/enterprise/roles          — создать роль
// PUT  /api/enterprise/roles/:id      — обновить permissions
// DELETE /api/enterprise/roles/:id    — удалить (не системные)
// POST /api/enterprise/roles/:id/assign — назначить роль пользователю

// GET  /api/enterprise/team-dashboard — per-dept compliance overview
// GET  /api/enterprise/team-dashboard/:dept — детали одного dept
```

#### Audit Trail Export

```javascript
// GET /api/enterprise/audit-trail?format=csv&from=2026-01-01&to=2026-02-22
// → CSV | JSON (для регуляторов)
// Колонки: timestamp, userId, action, resource, details, ipAddress

// GET /api/enterprise/audit-trail?format=json — machine-readable для SIEM
```

#### Реализация

**Новые файлы (frontend/):**
- `app/(dashboard)/enterprise/team/page.tsx` — Team Dashboard
- `app/(dashboard)/enterprise/roles/page.tsx` — Custom Roles management
- `components/enterprise/DepartmentTable.tsx`
- `components/enterprise/RolePermissionsMatrix.tsx`

**Новые файлы (backend/):**
- `schemas/CustomRole.js` — MetaSQL таблица
- `app/api/enterprise/roles.js` — CRUD
- `app/api/enterprise/team-dashboard.js` — dept aggregation
- `app/api/enterprise/audit-trail.js` — export endpoint
- `app/application/enterprise/buildTeamDashboard.js`

**Модифицированные файлы:**
- `app/application/auth/checkPermissions.js` — поддержка custom roles
- `server/routes/enterprise.js` — mount routes

#### Критерии приёмки

- [ ] Team Dashboard: per-department compliance score + AI tools count
- [ ] Custom role creation: имя + permissions granulary (JSON)
- [ ] Assign custom role to user (заменяет built-in роль или дополняет)
- [ ] Built-in roles (owner/admin/member/viewer) нельзя удалить
- [ ] Audit trail CSV export: datetime + user + action + resource
- [ ] Audit trail JSON export для регуляторов (SIEM-совместимый)
- [ ] Enterprise routes защищены: только scale/enterprise планы

- **Tests:** 3 (custom_roles_crud.test, team_dashboard_aggregation.test, audit_trail_export_formats.test)

---

### US-095: Regulatory Monitor (5 SP)

- **Feature:** F12 | **Developer:** Leo

#### Описание

Как DPO, я хочу получать уведомления об изменениях в EU AI Act и связанных нормативных документах — и сразу видеть, какие AI-инструменты нашей организации затронуты.

#### EUR-Lex Scraping

```javascript
// pg-boss job: scheduled еженедельно
// app/jobs/eur-lex-scraper.js

// Источники:
// 1. EUR-Lex OJ C series (official journal)
// 2. EU AI Office guidance: ai.ec.europa.eu/guidelines
// 3. BNetzA Q&A (Bundesnetzagentur) для немецкого рынка

// Фильтр deployer-relevant articles:
const DEPLOYER_ARTICLES = ['Art.4', 'Art.5', 'Art.26', 'Art.27', 'Art.50', 'Annex_III'];

// Новая таблица: RegulationUpdate
({
  Details: {},
  source: { type: 'string' },          // 'eur-lex' | 'eu-ai-office' | 'bnetza'
  articleRef: { type: 'string' },      // 'Art.26', 'Annex_III'
  title: { type: 'string' },
  summary: { type: 'string' },         // LLM-generated (Mistral Small)
  impactLevel: { type: 'string' },     // 'high' | 'medium' | 'low'
  publishedAt: 'datetime',
  url: { type: 'string', nullable: true },
  affectedTools: { type: 'json' },     // [{ toolName, reason }] — LLM analysis
});
```

#### Impact Assessment (LLM)

```javascript
// После scraping: Mistral Small анализирует impact
// Prompt: "Given this regulation update [text], which AI tools from [orgTools]
//          are affected and why? Return JSON: [{toolName, reason, severity}]"

// Результат: RegulationUpdate.affectedTools populated
// → Notification (email + in-app) для затронутых пользователей
```

#### Dashboard Integration

```javascript
// GET /api/regulatory/updates?limit=20&impactLevel=high
// GET /api/regulatory/updates?articleRef=Art.26
// GET /api/regulatory/updates/:id/impact — full impact assessment

// Regulation Feed (отображается в Monitoring Dashboard — US-093)
// и отдельная страница /regulation-monitor
```

#### Реализация

**Новые файлы:**
- `schemas/RegulationUpdate.js`
- `app/jobs/eur-lex-scraper.js` — pg-boss weekly job
- `app/application/regulatory/scrapeEurLex.js` — HTTP fetch + parse
- `app/application/regulatory/analyzeImpact.js` — Mistral Small call
- `app/application/regulatory/notifyAffectedUsers.js` — Brevo email
- `app/api/regulatory/updates.js` — GET endpoints
- `app/(dashboard)/regulation-monitor/page.tsx` — dedicated page

#### Критерии приёмки

- [ ] pg-boss job: еженедельный scraping EUR-Lex + BNetzA
- [ ] Фильтр: только deployer-relevant articles (Art.4, 26, 27, 50)
- [ ] Impact assessment: Mistral Small → affectedTools per org
- [ ] Email notification (Brevo): "Regulation update affects your tool X"
- [ ] In-app notification + Monitoring Dashboard feed
- [ ] Regulation Monitor page: список обновлений + impact
- [ ] Нет дублей: idempotent (HMAC-based деdup по source + publishedAt + articleRef)

- **Tests:** 3 (eur_lex_scraping.test, impact_assessment_llm.test, regulation_dedup.test)

---

### US-096: KI-Compliance Siegel — Trust Badge (3 SP)

- **Feature:** F20 | **Developer:** Leo

#### Описание

Как CEO, я хочу разместить на сайте компании официальный AI-compliance badge — "AI Act Compliant 2026" — чтобы клиенты и партнёры видели, что мы серьёзно относимся к compliance.

#### Badge Criteria

```javascript
// Автоматическая проверка при запросе badge:
const badgeCriteria = {
  aiLiteracy: employees100Percent,           // 100% сотрудников обучены (Art.4)
  toolsClassified: allToolsClassified,       // все инструменты классифицированы
  noOpenHighPriorityGaps: true,             // нет открытых high-priority gaps
  minimumScore: 85,                          // org-wide score >= 85
  lastVerifiedAt: Date.now(),               // проверяется при каждом показе
};

// Badge уровни:
// Bronze: 70+ score + classified tools
// Silver: 85+ score + no critical gaps  ← основной
// Gold: 95+ score + AI Literacy 100% + FRIA done (Scale/Enterprise)
```

#### Embeddable Widget

```javascript
// GET /api/badge/:orgSlug — публичный endpoint (no auth)
// Возвращает: { valid: true, level: 'silver', score: 87, verifiedAt: '...' }
// или { valid: false, reason: 'score_too_low' }

// HTML Widget:
// <script src="https://app.complior.io/badge.js" data-org="acme-gmbh"></script>
// Рендерит SVG badge с dynamic score + QR code → compliance page

// Shareable compliance page:
// /verify/:orgSlug → публичная страница с compliance summary
// (только публичные данные: score, level, verified date)
```

#### Viral Loop

```javascript
// Badge click → "Powered by Complior" → landing page
// Badge embed tracker: сколько просмотров, сколько кликов → conversion
// GET /api/badge/my/stats — stats for own badge (views, clicks, referrals)
```

#### Реализация

**Новые файлы:**
- `app/api/badge/[orgSlug].js` — публичный badge endpoint
- `app/api/badge/my/stats.js` — badge stats
- `app/(dashboard)/badge/page.tsx` — Badge management UI
- `app/(public)/verify/[orgSlug]/page.tsx` — публичная compliance page
- `public/badge.js` — embeddable script
- `app/application/badge/evaluateBadgeCriteria.js`

#### Критерии приёмки

- [ ] Badge criteria check: score + AI Literacy + gaps + classification
- [ ] 3 уровня: Bronze / Silver / Gold с разными criteria
- [ ] Embeddable script: работает на внешних сайтах (CORS)
- [ ] Публичная compliance page: `/verify/:orgSlug` без auth
- [ ] Badge stats: views + clicks tracked
- [ ] Badge invalid: если score падает ниже criteria → badge показывает "Under Review"
- [ ] Только Scale/Enterprise: Gold badge

- **Tests:** 2 (badge_criteria_evaluation.test, embeddable_badge_public.test)

---

### US-097: SaaS Discovery — API Traffic + Bot Connectors (3 SP)

- **Feature:** F29 (расширение, partial) | **Developer:** Leo

#### Описание

Как CTO, я хочу обнаруживать AI tools не только через IdP и GitHub — но и через анализ API Traffic logs (CloudTrail) и корпоративные Slack/Teams боты.

#### API Traffic Parser

```javascript
// POST /api/integrations/traffic-upload
// Принимает: AWS CloudTrail JSON / nginx access logs / proxy logs
// Парсит: AI API calls (*.openai.com, *.anthropic.com, *.mistral.ai, ...)
// Matcher: AI Registry domains (2477+ tools)
// Результат → CrossSystemSource (sourceType: 'api_traffic')

// Поддерживаемые форматы:
// - AWS CloudTrail JSON (outbound HTTPS calls)
// - nginx access.log (compressed .gz OK)
// - Squid proxy log format
```

#### Bot Discovery (Slack/Teams)

```javascript
// Slack: POST /api/integrations/slack-connect
// → OAuth: bot:read scope → list installed apps
// → Match against AI Registry (hugging face, ChatGPT for Teams, etc.)
// → CrossSystemSource (sourceType: 'slack_apps')

// Teams: POST /api/integrations/teams-connect
// → Azure AD OAuth → list installed Teams apps
// → Match against AI Registry
// → CrossSystemSource (sourceType: 'teams_apps')
```

#### Shadow AI Detection Dashboard

```javascript
// GET /api/discovery/shadow-ai
// Возвращает: обнаруженные AI tools НЕ зарегистрированные в AITool inventory
// Diff: (CrossSystemSource tools) - (AITool inventory)
// → "You have 3 shadow AI tools not in your inventory"
// Human-in-the-loop: предлагает добавить, не добавляет автоматически
```

#### Реализация

**Новые файлы:**
- `app/api/integrations/traffic-upload.js` — log upload + parse
- `app/api/integrations/slack-connect.js`
- `app/api/integrations/teams-connect.js`
- `app/api/discovery/shadow-ai.js` — shadow AI diff
- `app/application/discovery/parseAPITraffic.js`
- `app/application/discovery/detectSlackBots.js`
- `app/(dashboard)/discovery/shadow-ai/page.tsx` — Shadow AI UI

#### Критерии приёмки

- [ ] CloudTrail upload → AI API calls обнаружены → CrossSystemSource
- [ ] Slack OAuth → AI bots/apps в Slack workspace обнаружены
- [ ] Shadow AI diff: tools в CrossSystemSource но не в AITool inventory
- [ ] Human-in-the-loop: предложение добавить в реестр (не автоматически)
- [ ] Rate limits: log upload max 50MB per request

- **Tests:** 1 (shadow_ai_diff_detection.test)

---

---

### US-098: TX + CA + South Korea — Три новые юрисдикции (4 SP)

- **Feature:** F26 (Registry API расширение) | **Developer:** Max
- **Источник:** `~/complior/docs/PROJECT-AGENT-HANDOFF.md` Задача 2

#### Описание

Как compliance officer с US-клиентами и корейским офисом, я хочу видеть obligations по Texas TRAIGA, California AB 2885 и South Korea AI Basic Act — чтобы покрыть все ключевые рынки в одной платформе.

#### Три юрисдикции

**Texas TRAIGA** (`texas-traiga`, US-TX, effective: 2025-09-01) — 4 checks:
- `tx_risk_assessment` — Risk assessment before deployment
- `tx_human_oversight` — Human oversight for consequential decisions
- `tx_algorithmic_impact` — Annual algorithmic impact assessment
- `tx_right_to_explanation` — Right to explanation for adverse AI decisions

**California AB 2885** (`california-ab2885`, US-CA, effective: 2025-01-01) — 3 checks:
- `ca_ai_disclosure` — AI-generated content disclosure on online platforms
- `ca_deepfake_label` — AI-generated media labelling
- `ca_opt_out_synthetic` — Opt-out for synthetic media

**South Korea AI Basic Act** (`south-korea-ai`, KR, effective: 2024-01-01) — 3 checks:
- `kr_transparency` — Transparency (stronger than EU for some domains)
- `kr_high_risk_classification` — High-risk AI: same categories as EU Annex III
- `kr_data_localization` — Strict data localization requirements

#### Реализация

**Новые файлы:**
- `app/seeds/seed-us-jurisdictions.js` — TX + CA seed (2 RegulationMeta + 7 Obligations)
- `app/seeds/seed-south-korea.js` — KR seed (1 RegulationMeta + 3 Obligations)
- `scripts/run-us-jurisdictions-migration.js`
- `scripts/run-south-korea-migration.js`

**Модифицированные файлы:**
- `app/api/regulations/meta.js` — список всех юрисдикций: EU + CO + TX + CA + KR (5 итого)

#### Критерии приёмки

- [ ] `RegulationMeta` содержит 5 записей (eu-ai-act, colorado-sb205, texas-traiga, california-ab2885, south-korea-ai)
- [ ] 10 новых Obligations (4 TX + 3 CA + 3 KR) вставлены в `Obligation` таблицу
- [ ] `GET /v1/regulations/meta` → массив 5 юрисдикций
- [ ] `GET /v1/regulations/obligations?jurisdictionId=texas-traiga` → 4 records
- [ ] `GET /v1/regulations/obligations?jurisdictionId=california-ab2885` → 3 records
- [ ] `GET /v1/regulations/obligations?jurisdictionId=south-korea-ai` → 3 records
- [ ] EU ↔ TX CrossMappings: `tx_human_oversight` ↔ `art14-human-oversight` = `equivalent`
- [ ] EU ↔ CA CrossMappings: `ca_ai_disclosure` ↔ `art50-transparency` = `equivalent`

**npm scripts:** добавить `migrate:us-jurisdictions` и `migrate:south-korea` в package.json

- **Tests:** 2 (us_jurisdictions_query.test, multi_jurisdiction_obligations.test)

---

### US-099: Regulation Change Feed — Версионирование + Diff API (4 SP)

- **Feature:** F12 (расширение US-095) | **Developer:** Leo
- **Источник:** `~/complior/docs/PROJECT-AGENT-HANDOFF.md` Задача 3

#### Описание

Как DPO, я хочу отслеживать версионированную историю изменений Regulation DB и получать diff между версиями — чтобы `complior diff --regulation eu-ai-act --from X --to Y` показывал реальные изменения нормативной базы.

> **Расширение US-095:** US-095 добавляет EUR-Lex scraping + RegulationUpdate таблицу. US-099 добавляет версионирование самой Regulation DB и diff API поверх этой инфраструктуры.

#### Версионирование Regulation DB

```javascript
// Новая таблица: RegulationVersion (MetaSQL)
({
  Details: {},
  jurisdictionId: { type: 'string', length: { max: 50 }, index: true },
  version: { type: 'string', length: { max: 20 } },  // '2025-01-01', '2026-02-22'
  snapshotAt: 'datetime',
  obligationsSnapshot: { type: 'json' },  // полный снапшот Obligation[] на эту дату
  changesSummary: { type: 'json', nullable: true },  // { added: [...], changed: [...], removed: [...] }
  source: { type: 'string', nullable: true },  // 'eur-lex' | 'manual' | 'initial'
});
```

#### Feed + Diff API

```javascript
// GET /v1/regulations/changes?since=2025-01-01&regulation=eu-ai-act
// → {
//     changes: [{
//       id, date, regulation, changeType: "amendment"|"clarification"|"new_guidance"|"enforcement",
//       affectedArticles: string[], summary: string,
//       impact: "critical"|"high"|"medium"|"low",
//       affectedChecks: string[]
//     }],
//     total: number
//   }

// GET /v1/regulations/diff?regulation=eu-ai-act&from=2025-01-01&to=2026-02-22
// → { added: Change[], clarified: Change[], unchanged: string[] }
// Источник: diff RegulationVersion snapshots по датам
```

#### Интеграция с US-095

```javascript
// После EUR-Lex scraping (US-095 job):
//   1. RegulationUpdate создаётся (существующее из US-095)
//   2. Если изменение затрагивает Obligation → создать/обновить RegulationVersion snapshot
//   3. Feed endpoint отдаёт RegulationUpdate + RegulationVersion data
```

#### Реализация

**Новые файлы:**
- `app/schemas/RegulationVersion.js` — версионирование снапшотов
- `app/api/regulations/changes.js` — `GET /v1/regulations/changes`
- `app/api/regulations/diff.js` — `GET /v1/regulations/diff`
- `app/application/regulatory/createRegulationSnapshot.js` — создание снапшота
- `app/application/regulatory/computeRegulationDiff.js` — diff двух снапшотов

**Модифицированные файлы:**
- `app/jobs/eur-lex-scraper.js` (из US-095) — после scraping вызывать `createRegulationSnapshot`
- `app/seeds/seed-initial-snapshot.js` — создать первый снапшот из текущих данных БД

**Начальный снапшот:**
- При деплое US-099: `seed-initial-snapshot.js` создаёт `RegulationVersion` для eu-ai-act с `version: "2026-02-23"` из текущих 108 Obligations

#### Критерии приёмки

- [ ] `RegulationVersion` таблица создана
- [ ] Начальный снапшот: eu-ai-act v2026-02-23 создан (108 obligations)
- [ ] `GET /v1/regulations/changes?since=2026-01-01&regulation=eu-ai-act` → список изменений (из RegulationUpdate, US-095)
- [ ] `GET /v1/regulations/diff?regulation=eu-ai-act&from=2025-01-01&to=2026-02-22` → `{ added: [], clarified: [], unchanged: [...] }` (even if both empty initially)
- [ ] После EUR-Lex scraping job: новый RegulationVersion snapshot создаётся автоматически
- [ ] `changeType` корректно определяется: amendment vs clarification vs new_guidance
- [ ] complior TUI feed consumer (`engine/src/domain/monitoring/regulation-feed.ts`) может потреблять этот endpoint

**API Contract для ~/complior:**
```
GET /v1/regulations/changes?since={date}&regulation={id}
→ { changes: Change[], total: number }
```

- **Tests:** 2 (regulation_versioning_snapshot.test, regulation_diff_computation.test)

---

## Summary

| US | Feature | Developer | SP | Tests |
|----|---------|-----------|-----|-------|
| US-091 | F30: Agent Governance Cloud Backend | Max | 6 | 4 |
| US-092 | F31: Remediation Cloud API | Max | 6 | 3 |
| US-093 | F32: Monitoring Dashboard Screen 26 | Nina | 5 | 4 |
| US-094 | F33: Enterprise — Team Dashboard + Custom Roles | Nina | 5 | 3 |
| US-095 | F12: Regulatory Monitor | Leo | 5 | 3 |
| US-096 | F20: KI-Compliance Siegel | Leo | 3 | 2 |
| US-097 | F29: Discovery — API Traffic + Bot | Leo | 3 | 1 |
| US-098 | F26: TX + CA + South Korea Jurisdictions | Max | 4 | 2 |
| US-099 | F12: Regulation Change Feed + Diff API | Leo | 4 | 2 |
| **Итого** | | | **41** | **24** |

> Дополнительно ~3 integration tests (governance+remediation, monitoring+alerts, discovery pipeline). Total ≈ 20 новых тестов.

---

## Definition of Done

- [ ] **TX + CA + South Korea:** 10 obligations + 3 RegulationMeta + CrossMappings в PostgreSQL
- [ ] **Regulation Change Feed:** `/v1/regulations/changes` + `/v1/regulations/diff` endpoints live
- [ ] **RegulationVersion:** начальный снапшот eu-ai-act@2026-02-23 создан
- [ ] **Agent Governance Cloud:** Permissions Matrix CRUD + Lifecycle + Cross-Agent Map
- [ ] **Remediation Cloud:** Org-wide plans (auto-gen + manual) + Vendor Assessments
- [ ] **Monitoring Dashboard:** Screen 26 live — drift alerts + heatmap + regulation feed
- [ ] **Enterprise:** Team Dashboard per-dept + Custom Roles + Audit Trail CSV/JSON
- [ ] **Regulatory Monitor:** EUR-Lex weekly scraping + LLM impact assessment + notifications
- [ ] **KI-Compliance Siegel:** Badge criteria + embeddable widget + viral loop
- [ ] **Shadow AI Detection:** API Traffic parser + Slack/Teams bots + shadow diff
- [ ] **DB migrations:** AgentPolicy, AgentDependency, RemediationPlan, VendorAssessment, CustomRole, RegulationUpdate созданы
- [ ] `npm test` — ~280 total, все green
- [ ] `npm run typecheck` — 0 errors
- [ ] Deploy to staging: governance + monitoring ручная проверка
- [ ] Scale/Enterprise gates: проверить, что Enterprise-only features blocked для Starter

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| EUR-Lex API structure changes | Средняя | Средний | Defensive parsing, fallback to manual review, alert on parse failure |
| Mistral LLM impact assessment качество | Средняя | Средний | Prompt engineering, manual spot-check в staging, allow user correction |
| Slack/Teams OAuth scopes требуют admin | Высокая | Средний | Document required permissions, enterprise-only feature gate |
| Custom Roles complexity: permission conflicts | Средняя | Средний | Clear permission hierarchy, conflict resolver service, test matrix |
| CloudTrail upload: large file (50MB+) | Средняя | Низкий | Streaming parser, chunked upload, size limit 50MB с clear error |
| Compliance Proxy hosted: legal risk | Высокая | Высокий | Legal review перед launch, T&C, not-legal-advice disclaimer |
