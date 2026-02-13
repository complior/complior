# BURNDOWN.md — Sprint Burndown Charts

---

## Sprint 000 (Team Setup)

**Total Story Points:** 10
**Duration:** 2026-02-04 — 2026-02-07 (4 days)
**Team:** Alex (Orchestrator)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-04 | 10 | 10 | Sprint start |
| 1 | 2026-02-04 | 7 | 7.5 | OpenClaw config, workspace files created |
| 2 | 2026-02-05 | 4 | 5 | SKILL.md, IDENTITY.md, SOUL.md for all agents |
| 3 | 2026-02-06 | 2 | 2.5 | Knowledge Base files, subdirectory structure |
| 4 | 2026-02-07 | 0 | 0 | Phase 0 docs (deployer-first pivot), Telegram bots |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 10 |
| Completed SP | 10 |
| Velocity | 10 SP / 4 days |
| Carry-over | 0 |

### Progress Notes
- 2026-02-04: OpenClaw configuration created (11 agents), workspace files for all agents
- 2026-02-05: SKILL.md, IDENTITY.md, SOUL.md, AGENTS.md for all 11 agents
- 2026-02-06: Knowledge Base files created, subdirectory structure
- 2026-02-07: Deployer-first pivot — all Phase 0 docs rewritten (v2.0.0), Telegram bots added

---

## Sprint 0 (Infrastructure & Project Setup)

**Total Story Points:** 47
**Duration:** 2026-02-08 — 2026-02-09 (2 days)
**Team:** Max (30 SP backend), Nina (17 SP frontend)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-08 | 47 | 47 | Sprint start |
| 1 | 2026-02-08 | 15 | 23.5 | US-001..005 backend done (32 SP), 442 ESLint errors fixed |
| 2 | 2026-02-09 | 0 | 0 | US-006..008 frontend done (17 SP), CI blockers fixed, security audit passed |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 47 |
| Completed SP | 47 |
| Velocity | 47 SP / 2 days |
| Carry-over | 0 |

### Sprint 0 Completion Summary

**Backend (Max — 30 SP)**
- **US-001** (5 SP): Monorepo + Fastify 5 backend — done
- **US-002** (10 SP): 29 MetaSQL schemas + seeds (225 catalog, 32 requirements, 5 plans, 4 courses) — done
- **US-003** (5 SP): Docker Compose (PostgreSQL 16, Ory Kratos, Gotenberg, app) — done
- **US-004** (5 SP): Infrastructure clients (Ory, Brevo, Gotenberg, S3) — done
- **US-005** (5 SP): Error handling, logging, CI/CD, rate limiting — done

**Frontend (Nina — 17 SP)**
- **US-006** (8 SP): Next.js 14 skeleton + design system (Tailwind, shadcn/ui) — done
- **US-007** (3 SP): Monitoring + analytics (Plausible, Sentry, Better Uptime) — done
- **US-008** (6 SP): UX wireframes for Sprint 1-2 (6 screens) — done

### Reviews
- **Marcus (CTO):** APPROVED (9.8/10) — 0 critical issues
- **Leo (SecOps):** CONDITIONAL PASS → 3 critical + 2 high fixed → APPROVED

### Progress Notes
- 2026-02-08: Sprint 0 started. Backend infrastructure built — monorepo, 29 schemas, Docker, 4 clients, error handling, CI/CD. 442 ESLint errors fixed.
- 2026-02-09: Frontend completed. CI blockers fixed (type-check + npm audit). Fastify upgraded 4→5.7.4. 22 unit tests added. CODING-STANDARDS §14 aligned. Security fixes (timing-safe webhook, CORS, rate-limit IP). PR #3 merged to develop.

---

## Sprint 1 (IAM + AI Tool Catalog)

**Total Story Points:** 50
**Duration:** 2026-02-09 — 2026-02-10 (2 days)
**Team:** Max (Backend+QA), Claude Code (bug fixes + E2E)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-09 | 50 | 50 | Sprint start |
| 1 | 2026-02-09 | 15 | 25 | US-009..013 (35 SP): Ory webhook, login, register, RBAC, multi-tenancy |
| 2 | 2026-02-10 | 0 | 0 | US-014..015 (15 SP): AuditLog + Catalog. Zod validation, E2E, bug fixes |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 50 |
| Completed SP | 50 |
| Velocity | 50 SP / 2 days |
| Carry-over | 0 |

### Sprint 1 Completion Summary

**Backend (Max → Claude Code fixes — 50 SP)**
- **US-009** (8 SP): Ory webhook → User+Org sync — done
- **US-010** (5 SP): Login page (Ory sessions) — done
- **US-011** (8 SP): 2-step registration (profile + password) — done
- **US-012** (8 SP): RBAC permissions (owner/member/viewer) — done
- **US-013** (5 SP): Multi-tenancy isolation (organizationId filter) — done
- **US-014** (5 SP): AuditLog for auth events — done
- **US-015** (11 SP): AI Tool Catalog (search, filter, detail) — done

### Bug Fixes During E2E Verification
- Fix Entity PK naming (RoleId→roleId) in setup.js + 6 app files
- Fix Fastify v5 logger config, Dockerfile workspace install
- Fix Ory kratos.yml (locale, cipher, argon2, SMTP)
- Fix bigint type mismatch in org update comparison
- Fix ambiguous column in audit log JOIN query
- Add Zod validation on all 6 API endpoints (CODING-STANDARDS §2)
- Add initDatabase(pool) — auto DB setup on startup

### Reviews
- **E2E:** 14/14 smoke tests pass (live Docker)
- **Unit:** 64/64 tests pass
- **PR #6** → develop → main

---

## Sprint 2 (AI Tool Registration + Rule-Based Classification)

**Total Story Points:** 55
**Duration:** 2026-02-10 — 2026-02-11 (2 days)
**Team:** Max (Backend+QA), Nina (Frontend), Claude Code (E2E + audit)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-10 | 55 | 55 | Sprint start (after Sprint 1 merged to main) |
| 1 | 2026-02-11 | 0 | 27.5 | All 10 US done: RuleEngine, CRUD, Wizard, frontend pages |
| 2 | 2026-02-11 | 0 | 0 | Code audit Sprint 1+2 vs standards, PR #9 merged |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 55 |
| Completed SP | 55 |
| Velocity | 55 SP / 2 days |
| Carry-over | 0 |

### Sprint 2 Completion Summary

**Phase 0 — Specification (5 SP)**
- **US-015** (5 SP): EU AI Act Classification Rules Reference doc — done

**Backend (Max — 28 SP)**
- **US-016** (5 SP): AI Tool CRUD API (register, update, list, detail, delete) — done
- **US-017** (5 SP): Wizard backend — step validation + auto-save — done
- **US-018** (10 SP): RuleEngine domain service (Art. 5, Annex III, Art. 50, modifiers) — done
- **US-019** (5 SP): Classification endpoint + persistence (RiskClassification) — done
- **US-020** (3 SP): Auto-generate deployer requirements (mapRequirements) — done

**Frontend (Nina — 22 SP)**
- **US-021** (8 SP): AI Tool Inventory page + filters — done
- **US-022** (8 SP): 5-step wizard UI — done
- **US-023** (3 SP): Classification result display — done
- **US-024** (3 SP): AI Tool detail page — done

### Reviews
- **Unit:** 115/115 tests pass (64 Sprint 1 + 51 new)
- **Code audit:** Sprint 1+2 audited vs ARCHITECTURE.md, CODING-STANDARDS.md — 0 violations
- **PR #9** → develop → main

---

## Sprint 2.5 (Invite Flow + Team Management + Enforcement)

**Total Story Points:** 17
**Duration:** 2026-02-11 — 2026-02-12 (2 days)
**Team:** Claude Code (Backend+QA)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-11 | 17 | 17 | Sprint start (Phase 0 docs + Design Brief) |
| 1 | 2026-02-12 | 0 | 8.5 | All 6 US done: Invite, Accept, Team CRUD, Plan Limits |
| 2 | 2026-02-12 | 0 | 0 | E2E verified, committed to develop |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 17 |
| Completed SP | 17 |
| Velocity | 17 SP / 2 days |
| Carry-over | US-037 (7 SP frontend) deferred |

### Sprint 2.5 Completion Summary

**Domain (2 SP)**
- **US-031** (2 SP): SubscriptionLimitChecker (checkUserLimit, checkToolLimit) — done

**Backend (15 SP)**
- **US-032** (5 SP): Create Invitation (plan limits, Brevo email, token) — done
- **US-033** (3 SP): Accept Invitation (existing user transfer, syncFromOry update) — done
- **US-034** (2 SP): List Team Members (roles, status, invite date) — done
- **US-035** (3 SP): Change Role + Remove Member (audit log, owner protection) — done
- **US-036** (2 SP): maxTools enforcement on tool registration — done

### Reviews
- **Unit:** ~149/149 tests pass (115 Sprint 2 + 34 new)
- **E2E:** 35/35 sprint2-2.5-flow.test.js (real DB)
- **PR #12** → develop (bundled with Sprint 3)

---

## Sprint 3 (Requirements + Dashboard + Catalog APIs)

**Total Story Points:** 21
**Duration:** 2026-02-12 (1 day)
**Team:** Claude Code (Backend+QA)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-12 | 21 | 21 | Sprint start (Phase 0 docs+pricing done earlier same day) |
| 1 | 2026-02-12 | 0 | 0 | All 6 US done: Score, Requirements, Dashboard, History, Catalog |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 21 |
| Completed SP | 21 |
| Velocity | 21 SP / 1 day |
| Carry-over | 0 |

### Sprint 3 Completion Summary

**Phase 0 — Docs+Config (same day, before code)**
- Pricing v3.0 in `app/config/plans.js` (5 tiers, annual discount, Eva caps)
- 20 API platform tools in `app/seeds/catalog.js` (245 total)
- Eva Guard 3-level protection spec
- Lead Gen tools spec (Quick Check, Penalty Calculator)
- Provider-Lite segment definition
- 7 docs updated (PRODUCT-VISION, PRODUCT-BACKLOG, DESIGN-BRIEF, DATA-FLOWS, TECH-STACK, COMPETITOR-ANALYSIS, DATABASE)

**Domain (3 SP)**
- **US-025** (3 SP): ComplianceScoreCalculator (calculateToolScore, calculateOrgScore, groupByArticle) — done

**Backend (18 SP)**
- **US-026** (3 SP): GET /api/tools/:id/requirements (grouped by article) — done
- **US-027** (3 SP): PATCH /api/tools/:id/requirements/:id (status, progress, notes, dueDate) — done
- **US-028** (3 SP): GET /api/tools/:id/classification-history (versioned, sorted DESC) — done
- **US-029** (6 SP): GET /api/dashboard/summary (scores, risk distribution, timeline, planLimits, requiresAttention) — done
- **US-030** (3 SP): Catalog Alternatives (domain + maxRisk filters, api_platform category) — done

### Audit
- All code verified vs ARCHITECTURE.md, CODING-STANDARDS.md, DATABASE.md, DATA-FLOWS.md — 0 violations
- 2 minor fixes during audit: consolidated double `tq.update()` in updateRequirement.js, `|| 0` → `?? 0` in getDashboardSummary.js
- Added `api_platform` to AIToolCatalog schema enum

### Reviews
- **Unit:** 187/187 tests pass (149 Sprint 2.5 + 38 new)
- **E2E:** 47/47 sprint3-flow.test.js (real PostgreSQL + Fastify)
- **Total tests:** 335 (187 unit + 148 E2E integration)
- **PR #12** → develop → main (merged 2026-02-12)

---

## Sprint 3.5 (Stripe Checkout + Registration + Lead Gen Pages)

**Total Story Points:** 22
**Duration:** 2026-02-12 (1 day)
**Team:** Claude Code (Team Lead), 4 parallel agents (backend-infra, backend-quickcheck, frontend-pages, docs-updater)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-12 | 22 | 22 | Sprint start (parallel team of 4 agents) |
| 1 | 2026-02-12 | 0 | 0 | All 7 US done: Stripe, Registration, Pricing, Quick Check, Penalty Calc |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 22 |
| Completed SP | 22 |
| Velocity | 22 SP / 1 day |
| Carry-over | 0 |

### Sprint 3.5 Completion Summary

**Backend — Stripe (US-038, US-039 — 8 SP)**
- **US-038** (5 SP): Stripe Checkout Session API — POST /api/billing/checkout + GET /api/billing/checkout-status. Stripe SDK integration (server/infrastructure/billing/stripe-client.js), config (app/config/stripe.js), DB schema (Stripe columns on Subscription) — done
- **US-039** (3 SP): Stripe Webhook Handler — POST /api/webhooks/stripe (4 events: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted). Idempotent, audit-logged — done

**Backend — Quick Check (US-040 — 2 SP)**
- **US-040** (2 SP): QuickCheckAssessor domain service (Art. 2, 4, 6, 50) + POST /api/public/quick-check (public, rate-limited) + Brevo lead capture — done

**Frontend (US-041..044 — 12 SP)**
- **US-041** (5 SP): Plan-aware registration (2-step free, 3-step paid → Stripe redirect), TrialConfirmation component, checkout success/cancel pages, German→English translation — done
- **US-042** (3 SP): Pricing page (/pricing) — 5 tiers, monthly/annual toggle, feature comparison, FAQ — done
- **US-043** (2 SP): Quick Check page (/check) — 5-step wizard + result display — done
- **US-044** (2 SP): Penalty Calculator (/penalty-calculator) — Art. 99 client-side calc, shareable URL — done

**Docs**
- DESIGN-BRIEF v2.8.0 (Screen 03 rewritten, Screen 22 added, Screens 01/19 updated)
- DATA-FLOWS v2.3.0 (Flow 1 updated, Flow 21 added — Stripe Checkout)
- PRODUCT-BACKLOG v3.5.0 (Features 02, 09, 23 updated)
- PRODUCT-VISION v2.2.0 (UC-1 updated)
- NEW: SPRINT-BACKLOG-003.5.md

### Reviews
- **Lint:** 0 errors (24 lint errors fixed during integration: eslint globals, camelcase, indentation)
- **Unit:** 214/214 tests pass (187 Sprint 3 + 15 new Stripe + 12 new Quick Check)
- **PR #13** → develop → main (merged 2026-02-12)

---

## Sprint 4 (Production Deployment)

**Total Story Points:** 30
**Duration:** 2026-02-13 (1 day)
**Team:** Claude Code (Infra+Backend+QA)

### Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-13 | 30 | 30 | Sprint start (plan approved by PO) |
| 1 | 2026-02-13 | 0 | 0 | All 8 US done: Docker, Caddy, Kratos, DB Security, Hardening, CI/CD, Monitoring, GDPR |

### Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 30 |
| Completed SP | 30 |
| Velocity | 30 SP / 1 day |
| Carry-over | 0 |

### Sprint 4 Completion Summary

**Infrastructure (US-045..US-048 — 18 SP)**
- **US-045** (5 SP): Production Docker — `Dockerfile.production` (multi-stage, non-root), `frontend/Dockerfile.production` (standalone), `docker-compose.production.yml` (5 services: postgres, kratos, gotenberg, backend, caddy), `next.config.js` fix (`output: 'standalone'`, env-based `BACKEND_URL`) — done
- **US-046** (3 SP): Caddy Reverse Proxy + Auto-TLS — `caddy/Caddyfile` (path-based routing, security headers, auto-TLS, HTTP/3), single domain `app.complior.ai` — done
- **US-047** (5 SP): Ory Kratos Production Config — `ory/kratos.production.yml` (env-based secrets, Brevo SMTP courier, production URLs, argon2 hardened, no `--dev` flag) — done
- **US-048** (5 SP): Database Security + Automated Backups — PostgreSQL Docker secrets, no external ports, `scripts/backup-db.sh` (S3 upload, 14-day retention), `scripts/restore-db.sh` — done

**Security (US-049 — 3 SP)**
- **US-049** (3 SP): Server Hardening — `initSecurityHeaders()` in `server/src/http.js` (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy), Sentry PII filtering (strip cookies/auth headers), UFW/SSH/fail2ban config documented — done

**Operations (US-050..US-051 — 6 SP)**
- **US-050** (3 SP): CI/CD Pipeline Fix — `deploy.yml` rewritten (MetaSQL instead of Prisma, correct paths, `node app/setup.js`, health checks, rollback support) — done
- **US-051** (3 SP): Monitoring + Alerting — Sentry `beforeSend` PII filter, Plausible/UptimeRobot docs, disk monitoring cron documented — done

**Compliance (US-052 — 3 SP)**
- **US-052** (3 SP): EU Compliance Pack — GDPR data export (`app/application/iam/exportUserData.js`, `app/api/user/exportData.js`), account deletion (`app/application/iam/deleteAccount.js`, `app/api/user/deleteAccount.js`), `AccountDeleteSchema` Zod validation, `docs/RUNBOOK.md` — done

### Reviews
- **Lint:** 0 errors
- **Unit:** 221/221 tests pass (214 Sprint 3.5 + 7 new GDPR)
- **PR #14** → develop → main

---

## Cumulative Velocity

| Sprint | SP Planned | SP Done | Duration | Velocity (SP/day) |
|--------|-----------|---------|----------|-------------------|
| 000 | 10 | 10 | 4 days | 2.5 |
| 0 | 47 | 47 | 2 days | 23.5 |
| 1 | 50 | 50 | 2 days | 25.0 |
| 2 | 55 | 55 | 2 days | 27.5 |
| 2.5 | 17 | 17 | 2 days | 8.5 |
| 3 | 21 | 21 | 1 day | 21.0 |
| 3.5 | 22 | 22 | 1 day | 22.0 |
| 4 | 30 | 30 | 1 day | 30.0 |
| **Total** | **252** | **252** | **15 days** | **16.8 avg** |

### Test Growth

| Sprint | Unit Tests | E2E Tests | Total |
|--------|-----------|-----------|-------|
| 0 | 22 | 0 | 22 |
| 1 | 64 | 14 | 78 |
| 2 | 115 | 14 | 129 |
| 2.5 | 149 | 101 | 250 |
| 3 | 187 | 148 | 335 |
| 3.5 | 214 | 148 | 362 |
| 4 | 221 | 148 | 369 |

---

**Updated by:** Claude Code (on behalf of Alex)
**Last update:** 2026-02-13
