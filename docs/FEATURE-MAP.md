# Complior SaaS — Feature Map

> Maps every feature from PRODUCT-BACKLOG.md to implementation status.
> Each feature lists its completed user stories with implementation details.

**Обновлено:** 2026-03-05
**Текущий статус:** Sprint 8.5 DONE (United Sprint 1 — CLI↔SaaS Bridge + audit 9 fixes)
**Тесты:** 554 | **Схемы:** 49 | **Endpoints:** 80 | **App-сервисы:** 75

---

## Summary Dashboard

| # | Feature | Status | US Done | SP Done | Sprint |
|---|---------|--------|---------|---------|--------|
| F01 | Infrastructure & Project Setup | **DONE** | 8 | 47 | S0 |
| F02 | IAM + Team + Enforcement | **DONE** | 14 | 59 | S1, S2.5, S3.5, S7, S8 |
| F03 | AI Tool Inventory + Wizard | **DONE** | 7 | 32 | S1–S2 |
| F04a | Rule Engine (deployer) | **DONE** | 3 | 18 | S2 |
| F04b | Classification History | **DONE** | 1 | 3 | S3 |
| F04c | Requirements Mapping | **DONE** | 3 | 9 | S3 |
| F05 | Deployer Dashboard | **DONE** | 3 | 20 | S3, S8 |
| F06 | Eva — Conversational AI | SCHEMA ONLY | 0 | 0 | S9+ |
| F07 | Deployer Doc Generation | **DONE** | 1 | 4 | S8 |
| F08 | Gap Analysis | **DONE** | 1 | 5 | S8 |
| F09 | Billing (Stripe) | **DONE** | 4 | 14 | S3.5, S6 |
| F10 | Eva Tool Calling | -- | 0 | 0 | S9+ |
| F11 | Onboarding + Notifications | -- | 0 | 0 | S9+ |
| F12 | Regulatory Monitor | -- | 0 | 0 | S9 |
| F13 | Доп. deployer-документы | -- | 0 | 0 | S9 |
| F14 | Multi-language (DE, FR) | -- | 0 | 0 | S10 |
| F18 | AI Literacy Module | SCHEMA ONLY | 0 | 0 | S10 |
| F19 | FRIA Generator | **DONE** | 1 | 8 | S8 |
| F20 | KI-Compliance Siegel | -- | 0 | 0 | S9 |
| F21 | Provider-Lite Wizard | -- | 0 | 0 | S9 |
| F22 | Compliance Checklist | -- | 0 | 0 | S9 |
| F23 | Free Lead Gen Tools | **DONE** | 3 | 6 | S3.5 |
| F24 | Platform Admin Panel | **DONE** | 2 | 10 | S6 |
| F25 | WorkOS Migration | **DONE** | 3 | 13 | S7 |
| F26 | Registry API | **DONE** | 5 | 18 | S7 |
| F27 | TUI Data Collection | -- | 0 | 0 | S9 |
| F28 | Dashboard v2 (Cross-System Map) | **PARTIAL** | 1 | 7 | S8 |
| F29 | SaaS Discovery Connectors | -- | 0 | 0 | S9 |
| F30 | Agent Governance Cloud | -- | 0 | 0 | S9 |
| F31 | Remediation Cloud | -- | 0 | 0 | S9 |
| F32 | Monitoring Cloud | -- | 0 | 0 | S9–S10 |
| F33 | Enterprise Features | -- | 0 | 0 | S9–S10 |
| F34 | Growth & Marketing | -- | 0 | 0 | S10+ |
| F35 | Marketplace | -- | 0 | 0 | Future |
| F36 | White-Label & Self-Hosted | -- | 0 | 0 | Future |
| F37 | AI Registry Public Pages (SEO) | **DONE** | 2 | 10 | S7 |
| F42 | Audit Package (ZIP) | **DONE** | 1 | 6 | S8 |
| F61 | CLI Auth (Device Flow) | **DONE** | 1 | 3 | S8 |
| F62 | CLI Sync (Passport + Scan) | **DONE** | 1 | 4 | S8 |
| F63 | Document Sync (CLI→SaaS) | **DONE** | 1 | 4 | S8.5 |
| F64 | Obligation Cross-Mapping (OBL↔ART) | **DONE** | 1 | 3 | S8.5 |
| F65 | CLI Score Display (Dual Score) | **DONE** | 1 | 2 | S8.5 |
| F66 | Extended Passport Field Mapping | **DONE** | 1 | 1 | S8.5 |
| Infra | Production Deploy + DevOps | **DONE** | 10 | 33 | S4, S6 |
| Frontend | Frontend Rebuild (S5) | **DONE** | — | — | S5 |
| **TOTAL** | | | **84** | **347** | |

---

## Status Legend

- **DONE** — Feature fully implemented and tested
- **PARTIAL** — Core implemented but not all aspects complete
- **SCHEMA ONLY** — MetaSQL schema exists, no API/application code
- **--** — Not started

---

## F01: Infrastructure & Project Setup

**Priority:** P0 | **Sprint:** 0 | **Status:** DONE | **SP:** 47

Monorepo structure, Fastify backend с VM sandbox, MetaSQL schemas, Docker Compose, infrastructure clients, CI/CD, monitoring.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-001 | Monorepo structure + Fastify backend | 5 | Max | `server/` (Fastify HTTP runtime) + `app/` (VM-sandboxed business logic) + `frontend/` (Next.js 14). Entry point `server/main.js` с `loadApplication()` pattern, `vm.Script` isolation, frozen sandbox context |
| US-002 | MetaSQL schemas — all 29 tables + deployer seeds | 10 | Max | 29 MetaSQL schema files (→ grew to 41 by S7). Seed data: AI Tool Catalog (225+ tools), training courses, pricing plans, requirements, RBAC roles. `app/setup.js` generates DDL + runs seeds |
| US-003 | Docker Compose dev environment | 5 | Max | `docker-compose.yml`: app + PostgreSQL + Ory Kratos + Gotenberg. Dev env с hot reload (`--watch`). Health checks на все сервисы |
| US-004 | Infrastructure clients | 5 | Max | 4 lazy-loaded clients: `auth/ory-client.js` (→ `workos-client.js` в S7), `email/brevo-client.js` (Франция, transactional), `pdf/gotenberg-client.js` (HTML→PDF), `storage/s3-client.js` (Hetzner S3) |
| US-005 | Error handling, logging, CI/CD, rate limiting | 5 | Max | `AppError` hierarchy (400/401/403/404/409/500), pino structured logging, GitHub Actions CI (lint + type-check + test + audit), `@fastify/rate-limit` plugin |
| US-006 | Frontend Next.js skeleton + design system | 8 | Nina | Next.js 14 App Router + TypeScript strict + TailwindCSS + shadcn/ui. App/marketing route groups, `next-intl` i18n (EN base), dark/light themes |
| US-007 | Monitoring + Analytics | 3 | Nina | Plausible analytics (Эстония, cookie-free), Better Uptime monitoring (Литва). Sentry placeholder (not yet deployed) |
| US-008 | UX wireframes | 6 | Nina | DESIGN-BRIEF.md: 29 screens, UI patterns, WCAG AA requirements. ASCII wireframes для Sprint 1-2 pages |

---

## F02: IAM — Authentication + Team Management

**Priority:** P0 | **Sprint:** 1, 2.5, 3.5, 7 | **Status:** DONE | **SP:** 56

Identity & auth (Ory → WorkOS), RBAC, multi-tenancy, invite flow, team management, subscription enforcement, plan-aware registration.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-009 | Ory Webhook → User + Org Sync | 8 | Max | S1: Ory identity webhook → `syncUserFromOry()` creates/updates User + Organization + Role(owner) + Subscription(free). AuditLog entry per auth event. Заменён на WorkOS в S7 |
| US-010 | Login Page (magic link + password) | 5 | Nina | S1: Login page с email/password + magic link (Ory code method). Session management через Ory tokens. Заменён на WorkOS AuthKit в S7 |
| US-011 | Register Page — 2-Step Onboarding | 8 | Nina | S1: Account (email/name) → Company (org name, AI Act role, size). Post-registration: auto-create Organization + default dashboard redirect |
| US-012 | RBAC — Permission Checks | 8 | Max | S1: `Permission(role, resource, action)` table. `checkPermission()` с wildcard `manage`. 5 system roles: owner, admin, member, viewer, platform_admin |
| US-013 | Multi-tenancy Isolation | 5 | Max | S1: `organizationId` filter на каждом запросе к данным клиента. `createTenantQuery()` helper в `app/lib/tenant.js`. SQL-level WHERE clause enforcement |
| US-014 | AuditLog — Auth Events | 5 | Max | S1: `AuditLog` schema. `createAuditEntry()` records: login, logout, register, password_change, role_change, tool_register, classification. 7-year retention |
| US-031 | Subscription Limit Checker | 2 | Max | S2.5: Pure domain service `SubscriptionLimitChecker` (no I/O). Checks `maxUsers`, `maxTools` against plan limits. `-1` = unlimited, `0` = blocked. `PlanLimitError` (403 PLAN_LIMIT_EXCEEDED) |
| US-032 | Create Invitation API | 3 | Max | S2.5: `POST /api/team/invite` → creates Invitation (UUID token, 7-day expiry, role assignment). Brevo transactional email to invitee. Owner/Admin only, enforces `maxUsers` |
| US-033 | Accept Invitation | 5 | Max | S2.5: Invitee registers/logs in → webhook checks pending invitation → joins EXISTING org (not new). Existing user: transfer to invited org. Token validation + expiry check |
| US-034 | List Team Members | 2 | Max | S2.5: `GET /api/team/list` — all org members + pending invitations + plan limits display |
| US-035 | Change Role + Remove Member | 3 | Max | S2.5: `PATCH /api/team/manage` — role change (admin/member/viewer). Cannot change own role, cannot change owner. `DELETE` — deactivate member (active: false) |
| US-041 | Plan-Aware Registration | 5 | Nina | S3.5: URL params `?plan=` `?period=` determine flow. Free → 2-step → dashboard. Paid → 3-step → Stripe Checkout → `/checkout/success` |
| US-071 | WorkOS Backend Integration | 8 | Max | S7: Replace Ory Kratos with WorkOS. AuthKit callback → `syncUserFromWorkOS()`. `User.workosUserId` (UNIQUE). `resolveSession` via WorkOS SDK. Session token in httpOnly cookie |

---

## F03: AI Tool Inventory + 5-Step Wizard

**Priority:** P0 | **Sprint:** 1–2 | **Status:** DONE | **SP:** 32

Central AI tool registry for deployers, 225+ tool catalog, 5-step registration wizard, CRUD, filters, detail pages.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-015 | AI Tool Catalog API + Frontend | 11 | Max+Nina | S1: `GET /api/tools/catalog/search` — ILIKE search across 225+ pre-populated AI tools (ChatGPT, Copilot, HireVue, etc.). Category/risk filters. Frontend: browse + search + select для wizard Step 1 |
| US-016 | AI Tool CRUD API | 5 | Max | S2: `POST /api/tools`, `GET /api/tools`, `GET /api/tools/:id`, `PATCH /api/tools/:id`, `DELETE /api/tools/:id`. Multi-tenancy (orgId filter). Pagination + risk/status filters |
| US-017 | Wizard Backend — Step Validation + Auto-Save | 5 | Max | S2: 5-step validation via Zod. Each step saved independently (PATCH). Draft → Registered lifecycle. Pre-fill from catalog selection |
| US-021 | AI Tool Inventory Page + Filters | 8 | Nina | S2: Main registry page — table/card view. Filters: risk level, status, domain. Search by name/vendor. Risk level badges (🔴🟠🟡🟢). Pagination |
| US-022 | 5-Step Wizard UI | 8 | Nina | S2: XState-driven wizard. Step 1: catalog select/manual. Step 2: use case + domain. Step 3: data + vulnerable groups. Step 4: autonomy + oversight. Step 5: review + classify |
| US-024 | AI Tool Detail Page | 3 | Nina | S2: Full tool detail — classification result, risk badge, requirements checklist, audit trail. Tabs for different sections |
| US-036 | Enforce maxTools on Registration | 2 | Max | S2.5: `currentTools >= maxTools` → 403 PlanLimitError. Checked before tool INSERT in wizard Step 5 |

---

## F04a: Rule Engine — Rule-Based Classification

**Priority:** P0 | **Sprint:** 2 | **Status:** DONE | **SP:** 18

Pure domain service for deployer risk classification: Art. 5 prohibited, Annex III high-risk, Art. 50 limited, deployer context.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-018 | RuleEngine Domain Service | 10 | Max | 8 Art. 5 prohibited checks (social scoring, biometrics, etc.) + 8 Annex III domain checks (HR, healthcare, education, law enforcement, etc.) + Art. 50 transparency + safety component check. Pure functions, 100% testable, no I/O |
| US-019 | Classification Endpoint + Persistence | 5 | Max | `POST /api/tools/:id/classify` → RuleEngine → persist `RiskClassification` (riskLevel, confidence, matchedRules, articleReferences). Versioned records for history |
| US-020 | Auto-Generate Deployer Requirements | 3 | Max | Post-classification: auto-create `ToolRequirement` records based on riskLevel → deployer articles mapping. High-risk: 17 Art. 26 obligations + FRIA + AI Literacy |

---

## F04b: Classification History + Reclassification

**Priority:** P0 | **Sprint:** 3 | **Status:** DONE | **SP:** 3

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-028 | Classification History API | 3 | Max | `GET /api/tools/:id/classification-history` — all versions sorted DESC. Each entry: version, date, riskLevel, confidence, method, reasoning, article references. Re-classification via existing `POST /api/tools/:id/classify` |

---

## F04c: Deployer Requirements Mapping

**Priority:** P0 | **Sprint:** 3 | **Status:** DONE | **SP:** 9

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-025 | Compliance Score Calculation | 3 | Max | Per-tool score 0-100% based on `ToolRequirement` completion status. Aggregate org-wide compliance score. Weighted by risk level (high-risk requirements weighted 2x) |
| US-026 | View Deployer Requirements | 3 | Max | `GET /api/tools/:id/requirements` — all applicable deployer requirements per tool. Grouped by article (Art. 4, 26, 27, 50). Status: fulfilled / in_progress / gap / not_applicable |
| US-027 | Update Requirement Status | 3 | Max | `PATCH /api/tools/:id/requirements/:reqId` — update status + evidence. Auto-recalculates compliance score. AuditLog entry |

---

## F05: Deployer Compliance Dashboard

**Priority:** P0 | **Sprint:** 3, 8 | **Status:** DONE | **SP:** 20

Backend API for org-wide summary (S3). Frontend dashboard with 12 widgets + FRIA surface (S8). Members page (S8). Cross-System Map + Score Trends deferred to S9.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-029 | Dashboard Summary API | 6 | Max | S3: `GET /api/dashboard/summary` — org-wide: tool count by risk level, overall compliance score, AI Literacy progress (stub), "requires attention" list (prohibited tools, missing FRIAs, overdue requirements). Compliance timeline dates |
| US-084 | Dashboard v2 Frontend + FRIA Surface | 7 | Nina | S8: 12 dashboard widgets (WelcomeBar, QuickActions, SummaryCards, RiskDonutChart, AttentionAlerts, ComplianceBreakdown, PenaltyExposure, DocumentStatus, TimelineWidget, ToolsTable, TeamRolesWidget, RecentActivityWidget). Live plan limits query replaces stub. FRIA surface in 3 locations: AttentionAlerts "FRIA →" link for high/critical tools, DocumentStatus live FRIA row (fetches `api.fria.getByTool`), ToolDetailHeader "Complete FRIA" teal CTA for high/prohibited risk tools. LockedOverlay on future widgets. EN/DE i18n |
| US-084b | Members Page Frontend | 3 | Nina | S8: `/members` page with MembersTable, MemberStats (4 KPI cards), InviteDialog (modal with role selection), TrainingUsers placeholder. Connects to `GET /api/team/list`, `POST /api/team/invite`. Search + role filter. EN/DE i18n |

---

## F09: Billing & Subscriptions (Stripe)

**Priority:** P1 | **Sprint:** 3.5, 6 | **Status:** DONE | **SP:** 14

Stripe Checkout, webhook handling, pricing page, plan-aware registration, test mode setup.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-038 | Stripe Checkout Session API | 5 | Max | S3.5: `POST /api/billing/checkout` creates Stripe Checkout Session (monthly/annual). `GET /api/billing/checkout-status` polls session status. Price IDs from `app/config/plans.js`. 14-day trial с card required |
| US-039 | Stripe Webhook Handler | 3 | Max | S3.5: `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`. Idempotent (event ID dedup). Updates Subscription record |
| US-042 | Pricing Page | 3 | Nina | S3.5: `/pricing` — 5-plan comparison table. Monthly/Annual toggle (20% discount). Feature matrix. CTA → `/register?plan=starter&period=monthly`. EN/DE translations |
| US-063 | Stripe Test Mode Setup | 3 | Max | S6: Stripe API keys in production env. Webhook endpoint verified. Test transactions working. Price IDs configured for all 4 paid plans |

---

## F19: FRIA Generator

**Priority:** P0 | **Sprint:** 8 | **Status:** DONE | **SP:** 8

Fundamental Rights Impact Assessment (Art. 27 EU AI Act) — full-stack CRUD with 6-section wizard.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-081 | FRIA Full-Stack | 8 | Max+Nina | **Backend:** FRIAAssessment schema with `organization` relation + `status` enum (draft/in_progress/review/completed). 6 API endpoints: `POST /api/fria` (create), `GET /api/fria/:id` (detail), `GET /api/fria/by-tool/:toolId` (by tool), `PUT /api/fria/:id/sections/:sectionType` (update section), `PUT /api/fria/:id/status` (update status), `GET /api/fria` (list). 6 application services + `preFill` domain service. RBAC permissions (member: create+read, admin: +update+delete). **Frontend:** FRIA wizard page (`/tools/[id]/fria/[friaId]`) with FRIAProgress + FRIASectionForm components. DocumentsTab on tool detail integrates FRIA start/continue. 6 sections: General Info, Affected Persons, Specific Risks, Human Oversight, Mitigation Measures, Monitoring Plan. ~140 i18n keys EN/DE |

---

## F07: Deployer Compliance Document Generation

**Priority:** P0 | **Sprint:** 8 | **Status:** DONE | **SP:** 4

Section-by-section compliance document generation with LLM drafting, manual editing, section/document approval workflow, and PDF export via Gotenberg.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-082 | Compliance Documents Full-Stack | 4 | Max+Nina | **Backend:** ComplianceDocument + DocumentSection schemas (Entity + organization relation). 9 API endpoints: `POST /api/documents` (create), `GET /api/documents` (list with filters), `GET /api/documents/:id` (detail + sections), `PUT /api/documents/:id/sections/:sectionCode` (edit section content), `POST .../approve` (approve section), `POST .../revoke` (revoke section approval), `POST .../generate` (queue LLM draft via pg-boss), `POST /api/documents/:id/approve` (approve entire document — requires all sections approved), `POST /api/documents/:id/export-pdf` (Gotenberg HTML→PDF → S3). 8 application services: createDocument, listDocuments, getDocument, updateSection, approveSection (approve+revoke), approveDocument, generateDraft (generate+processGeneration), exportPdf. Domain: htmlRenderer (HTML templates with escapeHtml), documentTemplates (5 types × section definitions), prompts (LLM prompt builder per doc type). Plan gate: Growth+ required. 5 document types: usage_policy, qms_template, risk_assessment, monitoring_plan, employee_notification. **Frontend:** `/documents` page with DocumentsTab (list + status badges + create), document detail page with section-by-section editing. EN/DE i18n (~80 keys). Zod validation: DocumentCreateSchema, DocumentSectionParamsSchema, DocumentSectionUpdateSchema, DocumentListSchema. **Security audit (S8 Day 4):** +organizationId on all UPDATE queries (TOCTOU fix), escapeHtml on htmlRenderer, sectionCode regex validation |

---

## F08: Gap Analysis — 12 AESIA Categories

**Priority:** P0 | **Sprint:** 8 | **Status:** DONE | **SP:** 5

Per-tool gap analysis across 12 AESIA (AI Act Standards) categories with completeness scoring, effort estimation, and prioritized action plan.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-085 | Gap Analysis Full-Stack | 5 | Max+Nina | **Backend:** GapAnalysis schema (Entity + organization + aiTool + overallScore + categories JSON + actionPlan JSON). 1 API endpoint: `GET /api/gap-analysis/:toolId`. Application service: analyzeGaps (fetches tool + requirements, evaluates 12 AESIA categories). Domain: AESIACategories.js — 12 pure-function evaluators mapping requirement codes to AESIA checklist items (#3–#14): technical_documentation, qms, risk_management, human_oversight, data_governance, transparency, accuracy, robustness, cybersecurity, logging, post_market_monitoring, incident_management. Per category: status (green ≥80% / yellow 40–80% / red <40%), completeness %, estimatedEffort, 2–5 recommendations. Action plan: criticalPath sorted by urgency × impact, totalEffort, suggestedDeadline. Plan gate: Growth+ required. RBAC: GapAnalysis resource (owner/admin manage, member/viewer read). **Frontend:** `/gap-analysis/[toolId]` page with CategoryCard (12 cards in responsive grid — status badge, progress bar, effort, recommendations) and ActionPlan component (prioritized todo list with deadlines). EN/DE i18n (~60 keys). Zod: GapAnalysisToolIdSchema |

---

## F42: Audit Package (ZIP)

**Priority:** P0 | **Sprint:** 8 | **Status:** DONE | **SP:** 6

One-click ZIP generation containing all compliance artifacts for regulatory audits. Async generation via pg-boss, LLM-generated executive summary, S3 storage with 30-day expiry.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-083 | Audit Package Full-Stack | 6 | Max+Nina | **Backend:** AuditPackage schema (Entity + organization + status enum [queued/generating/ready/error/expired] + createdAt + fileUrl + fileSize + metadata). 4 API endpoints: `POST /api/audit-package/generate` (trigger → pg-boss job), `GET /api/audit-package/:id/status` (poll status), `GET /api/audit-package/:id/download` (signed S3 URL), `GET /api/audit-package/history` (paginated list). Application: generateAuditPackage.js (generate + processPackage — orchestrates ZIP creation). Infrastructure: zip-builder.js (archiver wrapper: addBuffer, addJson, finalize). Domain: executiveSummaryPrompt.js (LLM prompt builder), obligationMatrix.js (articles × tools HTML table), htmlRenderer.js (3 HTML templates with XSS protection). **ZIP contents:** 01-executive-summary.pdf (LLM-generated), 02-obligation-matrix.pdf (structured), 03-ai-registry.pdf (all tools), documents/*.pdf (existing compliance docs from S3), fria/assessments.json, metadata.json. pg-boss job: `audit-package-generate` queue + worker. Email notification via Brevo when ready. Plan gate: Growth+ required. RBAC: AuditPackage resource. **Frontend:** `/audit-package` page with generate button, status card (queued→generating→ready), download button, history table. EN/DE i18n. **Security audit (S8 Day 4):** Organization PK fix ("id" not "organizationId"), audit log entries added to generate() and processPackage(), createdAt field added to schema |

---

## F61: CLI Auth — OAuth 2.0 Device Flow

**Priority:** P1 | **Sprint:** 8 | **Status:** DONE | **SP:** 3

OAuth 2.0 Device Authorization Grant for CLI (`npx complior`) authentication. JWT access/refresh tokens. Browser-based confirmation with WorkOS session.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-087 | CLI Auth Device Flow | 3 | Max | **Backend:** DeviceCode schema (Entity + deviceCode unique + userCode 6-char + user + organization + status enum [pending/authorized/expired/used] + scope + expiresAt). JWT helper: `app/lib/jwt.js` (HMAC-SHA256 HS256 sign/verify). API auth: `app/lib/apiAuth.js` (Bearer token resolver for sync endpoints). 3 API endpoints: `POST /api/auth/device` (public, rate-limited — max 10 pending codes, generates device_code + user_code), `POST /api/auth/token` (public, polls: authorization_pending / access_token+refresh_token / expired), `POST /api/auth/device-confirm` (authenticated, RBAC-checked, confirms user_code in browser). Application: deviceFlow.js (createDeviceCode, pollToken, confirmDevice). Config: jwtSecret in config/server.js. Zod: DeviceTokenSchema, DeviceConfirmSchema. RBAC: DeviceCode resource (owner/admin manage, member create). **Frontend:** `/device` page — 6-character code input, approve button, success/error/expired states. WorkOS session required. EN/DE i18n |

---

## F62: CLI Sync — Passport + Scan Upload

**Priority:** P1 | **Sprint:** 8 | **Status:** DONE | **SP:** 4

CLI-to-SaaS data synchronization. Passport merge with priority-based conflict resolution. Scan result processing with auto tool detection.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-088 | CLI Sync Full-Stack | 4 | Max | **Backend:** SyncHistory schema (Entity + organization + user + source enum [cli/api] + syncType enum [passport/scan] + status enum [success/conflict/error] + toolSlug + conflicts JSON + metadata + createdAt). 3 API endpoints (all Bearer JWT auth): `POST /api/sync/passport` (upload + merge passport), `POST /api/sync/scan` (upload scan results), `GET /api/sync/status` (sync status per org). Application: mergePassport.js (3-tier merge strategy — technical fields CLI priority, organizational fields SaaS priority, timestamp-based for risk/category), processScanUpload.js (validate scan data, find/create AITool per detected tool, update scan metadata), syncStatus.js (last sync, tool count, conflict count). Zod: SyncPassportSchema (name + vendor + slug + domain + riskLevel + detectionPatterns), SyncScanSchema (projectPath + score + findings[] + toolsDetected[]). RBAC: SyncHistory resource (owner/admin manage, member create+read). Source code never transmitted — metadata only |

---

## F23: Free Lead Generation Tools

**Priority:** P1 | **Sprint:** 3.5 | **Status:** DONE | **SP:** 6

Public tools (no auth) for organic lead acquisition.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-040 | Quick Check API + Domain Service | 2 | Max | `POST /api/public/quickCheck` — 5-question micro-wizard. Rule-based assessment: "X obligations apply, Y potential high-risk areas". Rate limited 10 req/IP/hour. No account required |
| US-043 | Quick Check Page | 2 | Nina | `/check` — 5-step wizard UI. Instant result with CTA: "Create free account for full assessment". Email capture → Brevo lead list |
| US-044 | Penalty Calculator Page | 2 | Nina | `/penalty-calculator` — revenue input → Art. 99 formula: max(7% turnover, €35M) prohibited, max(3%, €15M) high-risk. Animated counter. Shareable OG card |

---

## F24: Platform Admin Panel

**Priority:** P1 | **Sprint:** 6 | **Status:** DONE | **SP:** 10

Cross-org admin dashboard for SaaS owner. Read-only access to all users, organizations, subscriptions, MRR.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-065 | Admin Backend API | 5 | Nina | 6 read-only endpoints: `GET /api/admin/overview` (totals + MRR), `/users` (ILIKE search + pagination), `/organizations`, `/subscriptions`, `/analytics`, `/trigger-registry-refresh`. Double gate: RBAC `PlatformAdmin:manage` + env whitelist `PLATFORM_ADMIN_EMAILS` |
| US-066 | Admin Frontend UI | 5 | Nina | Route group `(admin)/`. Overview dashboard (users, orgs, MRR, plan distribution), users table, orgs table, subscriptions table. Search + pagination. EN/DE i18n |

---

## F25: WorkOS Migration

**Priority:** P0 | **Sprint:** 7 | **Status:** DONE | **SP:** 13

Replace self-hosted Ory Kratos with managed WorkOS. Enterprise SSO free до 1M MAU, AuthKit hosted login, no Docker service.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-071 | WorkOS Backend Integration | 8 | Max | `@workos-inc/node` SDK. `app/api/auth/callback.js` — AuthKit code → `verifyAccessToken` → `syncUserFromWorkOS` → session cookie. `resolveSession` via WorkOS SDK. `User.workosUserId` (UNIQUE INDEX). Headless auth: email+password login/register, email verification, forgot/reset password, magic link |
| US-072 | WorkOS Frontend | 3 | Nina | Login/register/callback pages redirect to WorkOS AuthKit hosted UI. Settings → SSO tab. Magic link flow via WorkOS |
| US-073 | Remove Kratos from Infrastructure | 2 | Leo | Removed Kratos Docker service + volumes + networks. Removed Caddy `.ory/*` proxy routes. Updated `.env.example` (KRATOS_* → WORKOS_*) |

---

## F26: Registry API

**Priority:** P0 | **Sprint:** 7 | **Status:** DONE | **SP:** 18

Public REST API for TUI Engine DataProvider. 4,983 AI tools, 108 obligations, API Key auth, rate limits, ETag caching.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-074 | Core Endpoints | 5 | Max | `GET /v1/registry/tools` (search + filters: q, risk, category, jurisdiction, page, limit), `GET /v1/registry/stats`, `GET /v1/regulations/obligations`, `GET /v1/regulations/meta`, `GET /v1/regulations/timeline`, `GET /v1/regulations/scoring`, `GET /v1/data/bundle` (offline JSON, ETag + 304). API Key auth via `X-API-Key` header (HMAC-SHA256) |
| US-075 | API Key Management | 2 | Max | `POST/GET /api/settings/apiKeys` — create + list. `POST /api/settings/apiKeyRevoke` — revoke. Key shown ONCE after creation (`ck_live_...`). Only prefix stored. HMAC-SHA256 hash for verification. `APIUsage` daily tracking |
| US-076 | Data Migration to PostgreSQL | 7 | Max | 6 new tables: RegulationMeta, TechnicalRequirement, TimelineEvent, CrossMapping, LocalizationTerm, ApplicabilityNode. Migrated 4,983 tools + 108 obligations + 89 tech requirements + 18 timeline events from Engine JSON → PostgreSQL. Export scripts: `npm run export:all` |
| US-077 | Data Quality Fixes | 2 | Max | Fixed OBL-CS-001 → OBL-CSR-001 in 150 tool assessments. Populated `riskLevel` column for all 4,983 tools from assessments JSON. Extended riskLevel enum: +`unacceptable`, +`gpai_systemic` |
| US-078 | findBySlug + Level Filter + Sort | 2 | Max | `GET /v1/registry/tools/by-slug/:slug` public endpoint. `findBySlug` in searchTools.js. Level filter (`?level=verified`). Sort param (`?sort=name|score|risk`). Extended Zod schemas |

---

## F37: AI Registry Public Pages (SEO)

**Priority:** P1 | **Sprint:** 7 | **Status:** DONE | **SP:** 10

Public-facing tool pages for organic search. ISR, 5-tab detail view, search/filter/sort, EN+DE translations. 27 files total.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-079 | Index + Detail Pages | 8 | Nina | **Index** `/tools`: ISR (1h), stats bar, featured row (5 tools), search bar (`/` shortcut), risk pill filters, level filter, sort (name/score/risk), URL-synced pagination. **Detail** `/tools/[slug]`: ISR (daily), `generateStaticParams` for top 100, hero + risk card + score sidebar, 5-tab switcher (Overview, Obligations, Detection, Documents, History), similar tools, CTA banner. 5 shared components: ToolLogo, ScoreBar, LevelBadge, RiskBadge, Pagination. `frontend/lib/registry.ts` — types + fetch layer. Header nav link added. ~45 i18n keys EN+DE |
| US-078 | Backend API Extensions | 2 | Max | See F26 US-078 above |

---

## F63: Document Sync — CLI-Generated Docs → SaaS

**Priority:** P1 | **Sprint:** 8.5 | **Status:** DONE | **SP:** 4

CLI Fixer generates 8 types of compliance documents. This feature syncs them into the SaaS ComplianceDocument table with version bumping and tool association.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-U07 | Document Sync Full-Stack | 4 | Marcus | **Backend:** `POST /api/sync/documents` endpoint (Bearer JWT auth). Zod schema: `SyncDocumentsSchema` (documents array with type enum, title, content, obligationId, toolSlug). `processDocuments.js` application service: find AITool by slug/name → find existing ComplianceDocument by (aiTool, documentType) → create or update (bump version, status→draft, content in metadata). SyncHistory logging. 8 CLI document types mapped to SaaS types: ai-literacy-policy→usage_policy, art5-screening-report→risk_assessment, technical-documentation→qms_template, monitoring-policy→monitoring_plan, worker-notification→employee_notification, fria→fria, declaration-of-conformity→transparency_notice, incident-report→incident_report. **Engine:** `syncDocuments()` in saas-client.ts, `POST /sync/documents` route reads `docs/compliance/*.md` and maps to SaaS types |

---

## F64: Obligation Cross-Mapping (OBL ↔ ART)

**Priority:** P1 | **Sprint:** 8.5 | **Status:** DONE | **SP:** 3

Explicit mapping between 108 CLI obligations (eu-ai-act-OBL-xxx) and 32 SaaS deployer requirements (ART_xx_KEYWORD).

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-U08 | Obligation Cross-Mapping | 3 | Marcus | **Domain:** `app/domain/sync/resolveObligations.js` — single source of truth. 28 OBL→ART forward mappings (deployer-relevant only, 76 of 108 are provider-only). Reverse map computed automatically via `Object.entries().reduce()`. IIFE closure pattern (no `this`). Two pure functions: `resolveRequirements(obligationId) → requirementCode[]`, `resolveObligations(requirementCode) → obligationId[]`. Used by sync/documents and sync/passport for correct tool↔requirement linking |

---

## F65: CLI Score Display (Dual Score Dashboard)

**Priority:** P1 | **Sprint:** 8.5 | **Status:** DONE | **SP:** 2

Dashboard shows both CLI scanner score (code-level, 0-100) and SaaS deployer score (organizational, 0-100%) side by side for each tool.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-U12 | Scoring Reconciliation Display | 2 | Marcus | **Backend:** `getDashboardSummary.js` extended with `DISTINCT ON (sh."toolSlug")` query on SyncHistory (scan type) → `cliScores` map in response. **Frontend:** `DocumentStatus.tsx` renders CLI Scanner Scores section with color-coded score (green ≥70, amber ≥40, red <40) and last sync date. i18n keys: `cliScore`, `saasScore`, `lastCliSync`, `viewDoc` (EN/DE) |

---

## F66: Extended Passport Field Mapping

**Priority:** P2 | **Sprint:** 8.5 | **Status:** DONE | **SP:** 1

Extended SyncPassportSchema from 10 to 18 accepted fields, preserving all 36 Agent Manifest fields via extendedFields JSON blob.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-U09 | Passport Field Mapping Extension | 1 | Marcus | **Zod:** SyncPassportSchema extended with `autonomyLevel` (L1-L5 enum), `framework`, `modelProvider`, `modelId`, `lifecycleStatus` (draft/review/active/suspended/retired), `compliorScore` (0-100), `manifestVersion`, `signature`, `extendedFields`. All typed (no z.any). **Application:** `mergePassport.js` rewritten: single AUTONOMY_MAP/STATUS_MAP definitions, ALLOWED_UPDATE_FIELDS Set for SQL safety, all fields in single INSERT (no redundant UPDATE), slug dash-trimming |

---

## Infrastructure: Production Deploy + DevOps

**Sprint:** 4, 6 | **Status:** DONE | **SP:** 33

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-045 | Production Docker Configuration | 5 | Max | S4: `docker-compose.production.yml` — optimized images, health checks, restart policies, resource limits. Non-root containers |
| US-046 | Caddy Reverse Proxy + Auto-TLS | 3 | Max | S4: Caddyfile с auto-TLS (Let's Encrypt), HTTP/3, HSTS, security headers. Reverse proxy → backend:8000 + frontend:3000 |
| US-047 | Ory Kratos Production Config | 5 | Max | S4: Production kratos.yml — SMTP via Brevo, secure sessions, proper URLs. (Replaced by WorkOS in S7) |
| US-048 | Database Security + Automated Backups | 5 | Max | S4: PostgreSQL hardened (no external access, Docker network only). `scripts/backup-db.sh` (daily cron), `scripts/restore-db.sh`. Encrypted backup to Hetzner S3 |
| US-049 | Server Hardening | 3 | Max | S4: UFW firewall (80/443 only), SSH key-only, Fail2Ban, non-root Docker |
| US-050 | CI/CD Pipeline Fix | 3 | Max | S4: GitHub Actions: lint + type-check + test + npm audit. Branch protection rules |
| US-051 | Monitoring + Alerting | 3 | Max | S4: Better Uptime monitors (HTTP + keyword). Sentry project created (deploy pending) |
| US-052 | EU Compliance Pack | 3 | Max | S4: Privacy Policy + Terms of Service pages. `DELETE /api/user/deleteAccount` (GDPR Art. 17 Right to Erasure — WorkOS + DB + Stripe). `GET /api/user/exportData` (GDPR Art. 20 Data Portability — JSON) |
| US-064 | Build & Deploy Frontend | 2 | Max | S6: Next.js production build + deploy. Optimized bundle, env vars configured |
| US-063 | Stripe Test Mode | 3 | Max | S6: Stripe API keys in production. Webhook endpoint active. Test transactions verified |

---

## Frontend: Rebuild (Sprint 5)

**Sprint:** 5 | **Status:** DONE | **Developer:** Nina

Full frontend rewrite: landing page (15 секций), auth pages (login/register/forgot-password), pricing page, quick check, penalty calculator, checkout success. i18n EN/DE, dark/light themes. TailwindCSS + shadcn/ui. All pages responsive (WCAG AA).

---

## Sprint Cross-Reference

| Sprint | SP | US | Key Deliverables |
|--------|-----|-----|-----------------|
| **S0** | 47 | 8 | Monorepo, Fastify+VM sandbox, 29 schemas, Docker, infra clients, Next.js skeleton, monitoring |
| **S1** | 50 | 7 | Ory auth, RBAC, multi-tenancy, AuditLog, AI Tool Catalog (225+ tools) |
| **S2** | 55 | 10 | Tool CRUD, 5-step wizard, RuleEngine (Art.5+Annex III), classification, inventory UI |
| **S2.5** | 17 | 6 | Subscription limits, invite flow, team management, role changes |
| **S3** | 21 | 6 | Compliance score, requirements CRUD, classification history, dashboard API, alternatives |
| **S3.5** | 22 | 7 | Stripe Checkout + webhook, plan-aware registration, pricing page, Quick Check, Penalty Calculator |
| **S4** | 30 | 8 | Production Docker, Caddy TLS, Kratos prod, DB backups, hardening, CI/CD, GDPR (delete+export) |
| **S5** | — | — | Frontend rebuild: landing, auth, pricing, quick check, penalty calc (Nina solo) |
| **S6** | 15 | 4 | Admin Panel (6 endpoints + UI), Stripe test mode, frontend deploy |
| **S7** | 39 | 9 | WorkOS migration (Ory→WorkOS), Registry API (4,983 tools), data migration (6 tables), public pages (27 files), headless auth, pg-boss jobs |
| **S8** | 40 | 8 | FRIA full-stack (6 endpoints, 6-section wizard), Dashboard v2 (12 widgets, FRIA surface), Members page, Compliance Documents (9 endpoints, section workflow, LLM draft, PDF export), Gap Analysis (12 AESIA categories), Audit Package (ZIP + LLM exec summary + pg-boss), CLI Auth (Device Flow + JWT), CLI Sync (passport merge + scan upload). Day 4: full audit (4 agents) + 12 P0 security fixes |
| **S8.5** | 28 | 12 | **United Sprint 1 — CLI↔SaaS Bridge.** Cross-repo (SaaS + CLI). SaaS-side: Document Sync endpoint (8 doc types), Obligation Cross-Mapping (28 OBL→ART), Extended Passport Schema (+8 fields), CLI Score Display (dual score dashboard). CLI-side: `complior login/logout` (Device Flow), token storage (0o600), SaaS sync service, `complior sync` (passport+scan+docs push), data bundle client (ETag), TUI Sync Panel (live status). Code audit: 9 violations fixed (2 CRITICAL + 4 HIGH + 3 MEDIUM), 3 improvements |
| **Total** | **347** | **84** | |

---

**Источник данных:** PRODUCT-BACKLOG.md v4.1.0, SPRINT-BACKLOG-000 through 008, United Sprint 1 plan
**Sprint 8 audited:** 2026-03-04 — 4-agent parallel audit (FP-first, multi-tenancy, MetaSQL, acceptance criteria) + 12 P0 fixes
**Sprint 8.5 audited:** 2026-03-05 — full code audit vs CODING-STANDARDS.md (9 violations fixed: organizationId, NOT NULL, z.any, DRY, SQL allowlist, FP-first, credentials permissions)
