# SPRINT-BACKLOG-008.md — Dashboard v2 + Cross-System Map + Discovery

**Версия:** 1.0.0
**Дата:** 2026-02-22
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Planned
**Зависимости:** Sprint 7 (WorkOS + Registry API) merged to develop

---

## Sprint Goal

Запустить Dashboard v2 с Cross-System Map — ключевой экран конверсии Free TUI → Paid Dashboard. Org-wide compliance view: TUI scan данные (F27) + GitHub/GitLab репозитории + ручная регистрация AI tools. Agent Governance UI. Score Trends. Первые SaaS Discovery коннекторы (IdP). Provider-Lite Wizard для AI стартапов.

**Capacity:** ~30 SP | **Duration:** 3 недели
**Developers:** Max (Backend — Dashboard API + Discovery), Nina (Frontend — Dashboard v2 + Agent Governance UI), Leo (Infra — GitHub/GitLab OAuth, score trends)
**Baseline:** ~242 tests (Sprint 7) → **New: ~18 tests (total: ~260)**

> **Prerequisite:** Sprint 7 merged to develop. WorkOS auth работает. Registry API live (F26). TUI Data Collection endpoint live (F27). API Key management работает.

---

## Граф зависимостей

```
F27 (TUI Data Collection, S007) ──► US-081 (Cross-System Map backend)
                                           │
F25 (WorkOS, S007) ──► US-082 (GitHub/GitLab OAuth scan)
                                           │
US-081 + US-082 ──► US-083 (Dashboard v2 frontend)
                           │
                   US-084 (Agent Governance UI)
                   US-085 (Score Trends + Analytics)

US-086 (SaaS Discovery — IdP) — параллельно, зависит от F25 (WorkOS)

US-087 (Provider-Lite Wizard) — независим от dashboard (F01, F02 только)
```

---

## User Stories

### US-081: Cross-System Map — Backend API (8 SP)

- **Feature:** F28 | **Developer:** Max

#### Описание

Как CTO, я хочу видеть org-wide compliance map — все AI tools нашей организации из всех источников: TUI сканы, GitHub/GitLab репо, ручная регистрация — с compliance score для каждого и топологией связей.

#### Источники данных Cross-System Map

```
SaaS Cross-System Map агрегирует из трёх источников:

1. TUI scan uploads (POST /v1/tui/scans)
   → ScanResult таблица → projectPath, score, findings, toolsDetected

2. GitHub/GitLab org scan (новый коннектор в US-082)
   → обнаружение AI patterns в репозиториях организации

3. Manual registration (существующий Feature 03)
   → AITool таблица из онбординга deployer'а
```

#### API эндпоинты

```javascript
// GET /api/dashboard/cross-system-map
// Возвращает:
{
  totalSystems: 12,
  overallScore: 68,
  sources: {
    tui_scans: {
      count: 5,
      latestScans: [...],    // из ScanResult таблицы
      avgScore: 72
    },
    github_gitlab: {
      count: 4,
      repos: [...],          // из GitHub/GitLab scan
      avgScore: 61
    },
    manual: {
      count: 3,
      tools: [...],          // из AITool таблица
      avgScore: 75
    }
  },
  riskDistribution: { high: 2, limited: 8, minimal: 2 },
  criticalViolations: [...],
  lastUpdated: "2026-02-22T18:03:00Z"
}

// GET /api/dashboard/cross-system-map/topology
// Граф связей: tool → dependencies → risks

// GET /api/dashboard/tui-scans
// Список последних TUI scan uploads с деталями
// (ScanResult таблица, organizationId filter)

// GET /api/dashboard/registry-api-usage
// API Key usage stats для Registry API (Screen 27)
```

#### SSE push при новом TUI scan upload

```javascript
// При POST /v1/tui/scans → eventBus.emit('scan:uploaded', {...})
// → SSE push к подключённым Dashboard клиентам:
// GET /api/events/stream → SSE connection
// event: scan_uploaded { projectPath, score, toolsDetected }
// Dashboard обновляет Cross-System Map в реальном времени
```

#### Реализация

**Новые файлы:**
- `app/api/dashboard/cross-system-map.js` — GET handler + data aggregation
- `app/api/dashboard/tui-scans.js` — list scan results per org
- `app/api/dashboard/registry-usage.js` — API key usage stats
- `app/api/events/stream.js` — SSE connection для real-time push
- `app/application/dashboard/buildCrossSystemMap.js` — aggregation logic

**Модифицированные файлы:**
- `app/api/v1/tui/scans.js` — добавить SSE push после successful upload
- `server/routes/dashboard.js` — mount new endpoints

#### Критерии приёмки

- [ ] `GET /api/dashboard/cross-system-map` → JSON с тремя источниками данных
- [ ] TUI scan uploads отображаются в cross-system map (из ScanResult таблицы)
- [ ] SSE push: при новом TUI scan → Dashboard обновляется без reload
- [ ] Фильтр по organizationId: org видит только свои данные
- [ ] `GET /api/dashboard/registry-api-usage` → usage stats по API Key
- [ ] Тест на multi-tenant изоляцию (org A не видит данные org B)

- **Tests:** 4 (cross_system_map_aggregation.test, sse_push_on_scan.test, tenant_isolation.test, registry_usage_stats.test)

---

### US-082: GitHub/GitLab Org Scan (5 SP)

- **Feature:** F28 | **Developer:** Max

#### Описание

Как CTO с платным планом, я хочу подключить GitHub/GitLab организацию — и Complior автоматически просканирует все репозитории на AI tools — чтобы Cross-System Map показывала реальный AI footprint без ручного ввода.

#### Архитектура GitHub/GitLab Scan

```javascript
// Flow:
// 1. Пользователь нажимает "Connect GitHub" → OAuth flow (WorkOS)
// 2. После OAuth → GitHub API: list all repos in org
// 3. pg-boss job: scan repos (batch, не блокирующий)
// 4. Для каждого репо: fetch package.json, requirements.txt,
//    Dockerfile, .env.example → match против AI Registry patterns
// 5. Результат → сохранить в CrossSystemSource таблицу
// 6. SSE push → Dashboard обновляется

// Rate limiting: GitHub 5000 req/hr → оценить repos постепенно
```

#### Новые таблицы

```javascript
// schemas/CrossSystemSource.js (MetaSQL):
({
  Details: {},
  organization: { type: 'Organization', delete: 'cascade' },
  sourceType: { type: 'string' },  // 'github' | 'gitlab' | 'manual'
  externalId: { type: 'string' },  // repo full_name или tool ID
  name: { type: 'string' },
  url: { type: 'string', nullable: true },
  aiToolsDetected: { type: 'json' },  // [{name, provider, riskLevel}]
  lastScannedAt: 'datetime',
  scanStatus: { type: 'string', default: "'pending'" }, // pending | done | error
});
```

#### Реализация

**Новые файлы:**
- `app/api/integrations/github-connect.js` — OAuth initiate + callback
- `app/api/integrations/gitlab-connect.js` — GitLab OAuth flow
- `app/application/discovery/scanGitHubOrg.js` — repo scan job
- `app/application/discovery/detectAIPatterns.js` — pattern matching (AI Registry)
- `schemas/CrossSystemSource.js` — новая таблица
- `app/jobs/github-scan.js` — pg-boss job definition

**Модифицированные файлы:**
- `server/routes/integrations.js` — mount OAuth routes
- `app/config/oauth.js` — GitHub + GitLab OAuth credentials

#### Критерии приёмки

- [ ] "Connect GitHub" → OAuth → GitHub репозитории организации просканированы
- [ ] GitLab OAuth работает аналогично GitHub
- [ ] AI tools обнаружены в репо (npm deps + pip deps + env vars)
- [ ] pg-boss job: сканирование в background, не блокирует UI
- [ ] Cross-System Map: GitHub/GitLab источник отображается
- [ ] Повторный скан (по расписанию раз в 24ч): обновляет CrossSystemSource
- [ ] Rate limiting: не превышает GitHub API limits

- **Tests:** 3 (github_oauth_flow.test, ai_pattern_detection_in_repos.test, cross_system_source_persistence.test)

---

### US-083: Dashboard v2 Frontend — Cross-System Map UI (7 SP)

- **Feature:** F28 | **Developer:** Nina

#### Описание

Как пользователь платного плана, я хочу видеть Dashboard v2 с Cross-System Map — интерактивную визуализацию всех AI систем организации — чтобы получить org-wide compliance overview за один взгляд.

#### Экраны (по DESIGN-BRIEF)

**Screen 24: Cross-System Map**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Cross-System Compliance Map                          Last sync: 2m ago   │
│                                                                           │
│ ┌─ Summary ──────────────────────────────────────────────────────────┐  │
│ │ Total AI Systems: 12  │  Org Score: 68/100  │  High-Risk: 2       │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ Sources:                                                                  │
│ [TUI Scans: 5 projects ▼]  [GitHub: 4 repos ▼]  [Manual: 3 tools ▼]   │
│                                                                           │
│ AI Systems:                                                               │
│ ┌──────────────────┬──────────────┬────────┬──────────┬─────────────┐  │
│ │ System           │ Source       │  Risk  │  Score   │ Status      │  │
│ ├──────────────────┼──────────────┼────────┼──────────┼─────────────┤  │
│ │ OpenAI GPT-4o   │ TUI: my-app  │ limited│  72 ████ │ ⚠ 2 issues  │  │
│ │ HR Screening AI │ Manual       │ HIGH   │  34 ██   │ ✗ 4 issues  │  │
│ │ LangChain agent │ GitHub: api  │ limited│  61 ███  │ ⚠ 3 issues  │  │
│ └──────────────────┴──────────────┴────────┴──────────┴─────────────┘  │
│                                                                           │
│ [Connect GitHub] [Connect GitLab] [+ Add Manual]    [Export Report]     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Screen 27: Registry API Settings**
```
API Key Management:
- Active keys list + created/last_used
- Usage this month: 1,234 / 10,000 requests
- Rate limit status
- [Generate New Key] [Revoke]
```

#### Role-based views

| Роль | Что видит |
|------|-----------|
| CTO | High-level score + risk distribution + cost |
| DPO | Violations list + deadline countdown |
| Developer | Per-project findings + fix suggestions |
| Auditor | Full audit trail + export |

#### Реализация

**Новые файлы (frontend/):**
- `app/(dashboard)/cross-system-map/page.tsx` — Screen 24
- `app/(dashboard)/cross-system-map/CrossSystemMap.tsx` — main component
- `app/(dashboard)/cross-system-map/SourcePanel.tsx` — collapsible source panels
- `app/(dashboard)/registry-api/page.tsx` — Screen 27 (API Key management)
- `components/dashboard/AISystemsTable.tsx` — sortable/filterable table
- `components/dashboard/RiskBadge.tsx` — risk level badge
- `components/dashboard/ScoreBar.tsx` — compact score visualization
- `hooks/useCrossSystemMap.ts` — data fetching + SSE subscription

**Модифицированные файлы:**
- `app/(dashboard)/layout.tsx` — добавить Cross-System Map в navigation
- `components/layout/DashboardNav.tsx` — новые nav items

#### Критерии приёмки

- [ ] Cross-System Map: таблица со всеми AI systems из всех источников
- [ ] Source панели: TUI / GitHub / Manual с collapse/expand
- [ ] Score bar для каждого system
- [ ] Risk level badge (HIGH красный, limited жёлтый, minimal зелёный)
- [ ] Role-based view: CTO/DPO/Developer/Auditor переключение
- [ ] SSE real-time update: при новом TUI scan → строка появляется без reload
- [ ] "Connect GitHub" кнопка → OAuth flow
- [ ] "Export Report" → PDF с org-wide compliance summary
- [ ] Responsive: работает на 1024px (tablet)

- **Tests:** 2 (cross_system_map_renders.test, sse_update_integration.test)

---

### US-084: Agent Governance UI (Screen 25) (4 SP)

- **Feature:** F28, F30 (partial) | **Developer:** Nina

#### Описание

Как CTO, я хочу видеть в Dashboard таблицу всех AI coding agents организации — с compliance score, permissions matrix и audit trail — полученных из Engine (open-source) через TUI scan uploads.

#### Screen 25: Agent Governance Dashboard

```
Agent Governance
───────────────────────────────────────────────────────────────
Source: TUI scan data (synced from Complior Engine)

┌─────────────────┬──────────┬────────┬───────────┬──────────┐
│ Agent           │ Type     │  Risk  │ Compliance│ Actions  │
├─────────────────┼──────────┼────────┼───────────┼──────────┤
│ hr-screening    │ decision │ HIGH   │  34/100 ✗ │ Details  │
│ customer-bot    │ chatbot  │limited │  82/100 ✓ │ Details  │
│ code-assistant  │ dev-tool │limited │  90/100 ✓ │ Details  │
└─────────────────┴──────────┴────────┴───────────┴──────────┘

Agent Detail (click):
  → Compliance breakdown (disclosure/logging/oversight/scope)
  → agent-compliance.yaml viewer
  → Audit trail (last 50 events from TUI)
  → Remediation Plan button → links to Complior TUI
```

**Важно:** Dashboard показывает данные из TUI (read-only view). Все изменения агентов — в Complior TUI (`complior agents`). Dashboard не управляет агентами напрямую.

#### Реализация

**Новые файлы (frontend/):**
- `app/(dashboard)/agents/page.tsx` — Screen 25
- `app/(dashboard)/agents/[agentName]/page.tsx` — Agent detail
- `components/agents/AgentTable.tsx`
- `components/agents/AgentComplianceBreakdown.tsx`
- `components/agents/AgentAuditTrail.tsx`
- `app/api/dashboard/agents.js` — GET handler (из TUI scan toolsDetected + agentData)

#### Критерии приёмки

- [ ] Agent table: список AI agents из TUI scan data
- [ ] Per-agent: compliance score, risk level, type
- [ ] Agent detail: score breakdown + agent-compliance.yaml viewer
- [ ] Audit trail: последние события (если загружены из TUI)
- [ ] "Open in Complior" link для управления агентом
- [ ] HIGH-RISK agents выделены (красная строка)

- **Tests:** 1 (agent_governance_table.test)

---

### US-085: Score Trends + Analytics (Screen 29) (3 SP)

- **Feature:** F28 | **Developer:** Leo

#### Описание

Как CTO, я хочу видеть график изменения compliance score организации за последние 90 дней — чтобы понимать тренд и подготовить отчёт для совета директоров.

#### Score Trends

```javascript
// GET /api/dashboard/score-trends?period=90d&groupBy=week
// Возвращает:
{
  period: "90d",
  dataPoints: [
    { date: "2026-01-01", avgScore: 47, totalSystems: 8 },
    { date: "2026-01-08", avgScore: 59, totalSystems: 9 },
    // ...
  ],
  trend: { direction: "improving", delta: +21, percentChange: 44.7 },
  projectedCompliance: { date: "2026-04-15", projectedScore: 82 }
}

// Данные из:
// - AITool compliance history (существующие таблицы)
// - ScanResult history (TUI uploads)
// Aggregated по organizationId
```

#### Frontend (Screen 29)

- Line chart (Recharts): score trend 90d
- Per-source breakdown: TUI vs GitHub vs Manual
- Projection line: "At current rate, reaching 85 by April 15"
- Export: CSV + PDF для отчётности

#### Реализация

**Новые файлы:**
- `app/api/dashboard/score-trends.js` — GET handler с period param
- `app/(dashboard)/score-trends/page.tsx` — Screen 29
- `components/charts/ScoreTrendChart.tsx` — Recharts line chart
- `app/application/dashboard/buildScoreTrends.js` — aggregation query

#### Критерии приёмки

- [ ] Score trend chart за 90 дней
- [ ] Период: 7d / 30d / 90d switcher
- [ ] Per-source breakdown в chart
- [ ] Projection: estimated date to reach 85+ score
- [ ] CSV export работает

- **Tests:** 2 (score_trends_api.test, trend_projection_calculation.test)

---

### US-086: SaaS Discovery — IdP Connector (2 SP)

- **Feature:** F29 (partial) | **Developer:** Max

#### Описание

Как CTO, я хочу подключить наш корпоративный IdP (через WorkOS) и получить список AI SaaS tools, которые сотрудники авторизовали через SSO — автоматически.

#### IdP-based Discovery

```javascript
// WorkOS Organizations → Connected Apps → фильтр AI tools
// WorkOS API: listConnections() → список OAuth apps
// Матч против AI Registry patterns (openai.com, anthropic.com, etc.)
// Результат → CrossSystemSource (sourceType: 'idp')

// Endpoint:
// POST /api/integrations/idp-scan
// → запускает pg-boss job: fetch WorkOS connected apps → match AI patterns
// → callback: update CrossSystemSource → SSE push
```

#### Критерии приёмки

- [ ] "Scan via IdP" кнопка → запускает job
- [ ] AI tools из SSO-авторизованных apps появляются в Cross-System Map
- [ ] Только tools matching AI Registry patterns (не все OAuth apps)
- [ ] Human-in-the-loop: авто-discovery только предлагает, не добавляет автоматически

- **Tests:** 1 (idp_discovery_pattern_match.test)

---

### US-087: Provider-Lite Wizard (3 SP)

- **Feature:** F21, F22 | **Developer:** Nina

#### Описание

Как AI стартап (< 50 сотрудников), я хочу пройти Provider-Lite Wizard и получить персонализированный compliance checklist + EU Market Readiness Score.

#### Provider-Lite Wizard (5 шагов)

```
Step 1: "Are you building an AI product for end users?" → Yes/No
Step 2: "What does your AI do?" (domain picker)
Step 3: "Who are your end users? Where are they?"
Step 4: "Do you have EU clients?" → extraterritorial scope (Art.2)
Step 5: "Your risk level as provider" → obligations summary (Art.6/9/11/16)
```

#### Output

- **EU Market Readiness Score:** 0-100% с breakdown по категориям
- **Compliance Checklist:** персонализированный список → PDF via Gotenberg
- **Provider Starter Kit:** simplified Art.11 templates (не full Annex IV)

#### Реализация

**Новые файлы:**
- `app/(dashboard)/provider-lite/page.tsx` — 5-step wizard
- `app/api/provider-lite/assessment.js` — POST handler
- `app/application/providerLite/calculateReadinessScore.js`
- `app/application/providerLite/generateChecklist.js`

#### Критерии приёмки

- [ ] 5-step wizard работает
- [ ] EU Market Readiness Score: 0-100% с breakdown
- [ ] Checklist PDF генерируется через Gotenberg
- [ ] Art.2 extraterritorial check: если EU clients → EU AI Act applies
- [ ] Доступно всем планам (Free included)

- **Tests:** 2 (readiness_score_calculation.test, checklist_pdf_generation.test)

---

---

### US-088: Colorado SB 205 — Вторая юрисдикция в Regulation DB (3 SP)

- **Feature:** F26 (Registry API расширение) | **Developer:** Max
- **Источник:** `~/complior/docs/PROJECT-AGENT-HANDOFF.md` Задача 1

#### Описание

Как deployer, работающий в штате Colorado, я хочу видеть compliance obligations по Colorado SB 205 — чтобы покрыть US-рынок параллельно с EU AI Act.

#### Данные

5 обязательств Colorado SB 205:

| Check ID | Статья | Severity | Строже EU AI Act? |
|----------|--------|----------|-------------------|
| `co_ai_notice` | §6-1-1703(1) | high | Аналогично Art.50.1 |
| `co_opt_out` | §6-1-1703(2) | high | **Строже** — явный opt-out |
| `co_human_review` | §6-1-1703(3) | medium | Аналогично Art.14 |
| `co_data_management` | §6-1-1703(4) | medium | Аналогично Art.10 |
| `co_annual_report` | §6-1-1703(5) | low | **Новое** — нет в EU AI Act |

#### Реализация

**Новые файлы:**
- `app/seeds/seed-colorado-sb205.js` — seed script (8 записей: 1 RegulationMeta + 5 Obligations + 1 CrossMapping + 1 TimelineEvent)
- `scripts/run-colorado-migration.js` — runner script

**Модифицированные файлы:**
- `app/api/regulations/obligations.js` — поддержка `jurisdictionId=colorado-sb205` параметра
- `app/api/regulations/meta.js` — возвращает список всех юрисдикций (array) без параметра

#### CrossMapping (EU AI Act → Colorado)

```json
[
  { "sourceObligationId": "art50-transparency", "targetObligationId": "co_ai_notice", "relationship": "equivalent" },
  { "sourceObligationId": "art14-human-oversight", "targetObligationId": "co_human_review", "relationship": "equivalent" },
  { "sourceObligationId": null, "targetObligationId": "co_opt_out", "relationship": "stricter" },
  { "sourceObligationId": null, "targetObligationId": "co_annual_report", "relationship": "stricter" }
]
```

#### Критерии приёмки

- [ ] `RegulationMeta` содержит запись `jurisdiction_id: "colorado-sb205"`, `jurisdiction: "US-CO"`, `status: "in-force"`, `effective_date: "2026-02-01"`
- [ ] 5 Obligations вставлены с `appliesToRole: "deployer"` для всех
- [ ] `GET /v1/regulations/meta` без параметра → массив из 2 юрисдикций (eu-ai-act + colorado-sb205)
- [ ] `GET /v1/regulations/obligations?jurisdictionId=colorado-sb205` → 5 records
- [ ] `GET /v1/regulations/meta?jurisdictionId=colorado-sb205` → данные Colorado
- [ ] CrossMapping: 4 маппинга EU → CO в `CrossMapping` таблице
- [ ] `npm run migrate:colorado` работает без ошибок

**npm script:** добавить `"migrate:colorado": "node scripts/run-colorado-migration.js"` в package.json

- **Tests:** 2 (colorado_jurisdiction_query.test, cross_jurisdiction_mapping.test)

---

## Summary

| US | Feature | Developer | SP | Tests |
|----|---------|-----------|-----|-------|
| US-081 | F28: Cross-System Map API | Max | 8 | 4 |
| US-082 | F28: GitHub/GitLab Scan | Max | 5 | 3 |
| US-083 | F28: Dashboard v2 Frontend | Nina | 7 | 2 |
| US-084 | F28/30: Agent Governance UI | Nina | 4 | 1 |
| US-085 | F28: Score Trends | Leo | 3 | 2 |
| US-086 | F29: IdP Discovery (partial) | Max | 2 | 1 |
| US-087 | F21/22: Provider-Lite Wizard | Nina | 3 | 2 |
| US-088 | F26: Colorado SB 205 — Jurisdiction #2 | Max | 3 | 2 |
| **Итого** | | | **35** | **17** |

> Дополнительно 3 integration tests. Total ≈ 18 новых тестов.

---

## Definition of Done

- [ ] **Colorado SB 205:** 5 obligations + RegulationMeta + CrossMappings в PostgreSQL
- [ ] **Cross-System Map:** 3 источника (TUI + GitHub + Manual) в одном view
- [ ] **GitHub/GitLab OAuth:** подключение + автосканирование репо
- [ ] **Dashboard v2:** Screen 24 (Cross-System Map) + Screen 25 (Agents) + Screen 27 (Registry API) + Screen 29 (Score Trends)
- [ ] **SSE real-time:** TUI scan upload → Dashboard обновляется мгновенно
- [ ] **Role views:** CTO/DPO/Developer/Auditor переключение
- [ ] **Provider-Lite Wizard:** checklist PDF + readiness score
- [ ] **DB migrations:** CrossSystemSource таблица создана
- [ ] `npm test` — ~260 total, все green
- [ ] `npm run typecheck` — 0 errors
- [ ] Deploy to staging: ручная проверка Cross-System Map с реальными TUI данными

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| GitHub OAuth scope permissions | Средняя | Средний | Read-only: `read:org` + `read:repo` scope, объяснить пользователям |
| CrossSystemSource: большие организации (1000+ repos) | Средняя | Средний | Pagination, background jobs, cap at 100 repos/scan initially |
| SSE connection drops в production | Средняя | Средний | Reconnect logic в frontend, heartbeat ping |
| Score Trends: большие date ranges медленные | Средняя | Низкий | Index on scannedAt + organizationId, cache aggregates |
| Gotenberg доступность в staging | Низкая | Средний | Проверить docker-compose staging config |
