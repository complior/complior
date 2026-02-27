# Complior SaaS — Feature Map

> Maps every feature from PRODUCT-BACKLOG.md to implementation status.
> Each feature lists its completed user stories with implementation details.

**Обновлено:** 2026-02-24
**Текущий статус:** Sprint 7 completed, Sprint 8 next
**Тесты:** 343 | **Схемы:** 41 | **Endpoints:** 48 | **App-сервисы:** 42

---

## Summary Dashboard

| # | Feature | Status | US Done | SP Done | Sprint |
|---|---------|--------|---------|---------|--------|
| F01 | Infrastructure & Project Setup | **DONE** | 8 | 47 | S0 |
| F02 | IAM + Team + Enforcement | **DONE** | 13 | 56 | S1, S2.5, S3.5, S7 |
| F03 | AI Tool Inventory + Wizard | **DONE** | 7 | 32 | S1–S2 |
| F04a | Rule Engine (deployer) | **DONE** | 3 | 18 | S2 |
| F04b | Classification History | **DONE** | 1 | 3 | S3 |
| F04c | Requirements Mapping | **DONE** | 3 | 9 | S3 |
| F05 | Deployer Dashboard | **PARTIAL** | 1 | 6 | S3 |
| F06 | Eva — Conversational AI | SCHEMA ONLY | 0 | 0 | S8 |
| F07 | Deployer Doc Generation | -- | 0 | 0 | S8 |
| F08 | Gap Analysis | -- | 0 | 0 | S8 |
| F09 | Billing (Stripe) | **DONE** | 4 | 14 | S3.5, S6 |
| F10 | Eva Tool Calling | -- | 0 | 0 | S8 |
| F11 | Onboarding + Notifications | -- | 0 | 0 | S8 |
| F12 | Regulatory Monitor | -- | 0 | 0 | S9 |
| F13 | Доп. deployer-документы | -- | 0 | 0 | S9 |
| F14 | Multi-language (DE, FR) | -- | 0 | 0 | S10 |
| F18 | AI Literacy Module | SCHEMA ONLY | 0 | 0 | S10 |
| F19 | FRIA Generator | SCHEMA ONLY | 0 | 0 | S8 |
| F20 | KI-Compliance Siegel | -- | 0 | 0 | S9 |
| F21 | Provider-Lite Wizard | -- | 0 | 0 | S9 |
| F22 | Compliance Checklist | -- | 0 | 0 | S9 |
| F23 | Free Lead Gen Tools | **DONE** | 3 | 6 | S3.5 |
| F24 | Platform Admin Panel | **DONE** | 2 | 10 | S6 |
| F25 | WorkOS Migration | **DONE** | 3 | 13 | S7 |
| F26 | Registry API | **DONE** | 5 | 18 | S7 |
| F27 | TUI Data Collection | -- | 0 | 0 | S8 |
| F28 | Dashboard v2 (Cross-System Map) | -- | 0 | 0 | S8 |
| F29 | SaaS Discovery Connectors | -- | 0 | 0 | S9 |
| F30 | Agent Governance Cloud | -- | 0 | 0 | S9 |
| F31 | Remediation Cloud | -- | 0 | 0 | S9 |
| F32 | Monitoring Cloud | -- | 0 | 0 | S9–S10 |
| F33 | Enterprise Features | -- | 0 | 0 | S9–S10 |
| F34 | Growth & Marketing | -- | 0 | 0 | S10+ |
| F35 | Marketplace | -- | 0 | 0 | Future |
| F36 | White-Label & Self-Hosted | -- | 0 | 0 | Future |
| F37 | AI Registry Public Pages (SEO) | **DONE** | 2 | 10 | S7 |
| Infra | Production Deploy + DevOps | **DONE** | 10 | 33 | S4, S6 |
| Frontend | Frontend Rebuild (S5) | **DONE** | — | — | S5 |
| **TOTAL** | | | **65** | **275** | |

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

**Priority:** P0 | **Sprint:** 3 (backend API) | **Status:** PARTIAL | **SP:** 6

Backend API for org-wide summary. Full frontend dashboard planned for S8.

| US | Title | SP | Dev | Description |
|----|-------|-----|-----|-------------|
| US-029 | Dashboard Summary API | 6 | Max | `GET /api/dashboard/summary` — org-wide: tool count by risk level, overall compliance score, AI Literacy progress (stub), "requires attention" list (prohibited tools, missing FRIAs, overdue requirements). Compliance timeline dates |

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
| **Total** | **296+** | **65** | |

---

**Источник данных:** PRODUCT-BACKLOG.md v4.1.0, SPRINT-BACKLOG-000 through 007
