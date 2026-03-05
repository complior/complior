# BURNDOWN.md — Sprint Burndown Charts

> Числа и метрики. Детали реализации US → см. [FEATURE-MAP.md](./FEATURE-MAP.md)

---

## Sprint 000 (Team Setup)

**SP:** 10 | **Duration:** 2026-02-04 — 2026-02-07 (4 days) | **Team:** Alex

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-04 | 10 | 10 | Sprint start |
| 1 | 2026-02-04 | 7 | 7.5 | OpenClaw config, workspace files |
| 2 | 2026-02-05 | 4 | 5 | Agent identity files |
| 3 | 2026-02-06 | 2 | 2.5 | Knowledge Base, subdirectory structure |
| 4 | 2026-02-07 | 0 | 0 | Phase 0 docs (deployer-first pivot) |

**Velocity:** 10/10 SP | **Carry-over:** 0

---

## Sprint 0 (Infrastructure & Project Setup)

**SP:** 47 | **Duration:** 2026-02-08 — 2026-02-09 (2 days) | **Team:** Max (30), Nina (17)

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-08 | 47 | 47 | Sprint start |
| 1 | 2026-02-08 | 15 | 23.5 | US-001..005 backend done (32 SP) |
| 2 | 2026-02-09 | 0 | 0 | US-006..008 frontend done (17 SP) |

**Velocity:** 47/47 SP | **Carry-over:** 0 | **Tests:** 0 → 22

---

## Sprint 1 (IAM + AI Tool Catalog)

**SP:** 50 | **Duration:** 2026-02-09 — 2026-02-10 (2 days) | **Team:** Max, Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-09 | 50 | 50 | Sprint start |
| 1 | 2026-02-09 | 15 | 25 | US-009..013 (35 SP): auth, RBAC, multi-tenancy |
| 2 | 2026-02-10 | 0 | 0 | US-014..015 (15 SP): AuditLog + Catalog |

**Velocity:** 50/50 SP | **Carry-over:** 0 | **Tests:** 22 → 78

---

## Sprint 2 (AI Tool Registration + Classification)

**SP:** 55 | **Duration:** 2026-02-10 — 2026-02-11 (2 days) | **Team:** Max, Nina, Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-10 | 55 | 55 | Sprint start |
| 1 | 2026-02-11 | 0 | 27.5 | All 10 US: RuleEngine, CRUD, Wizard, frontend |
| 2 | 2026-02-11 | 0 | 0 | Code audit vs standards, PR #9 merged |

**Velocity:** 55/55 SP | **Carry-over:** 0 | **Tests:** 78 → 129

---

## Sprint 2.5 (Invite Flow + Team Management)

**SP:** 17 | **Duration:** 2026-02-11 — 2026-02-12 (2 days) | **Team:** Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-11 | 17 | 17 | Sprint start |
| 1 | 2026-02-12 | 0 | 8.5 | All 6 US: Invite, Accept, Team CRUD, Plan Limits |
| 2 | 2026-02-12 | 0 | 0 | E2E verified |

**Velocity:** 17/17 SP | **Carry-over:** US-037 (7 SP frontend) deferred | **Tests:** 129 → 250

---

## Sprint 3 (Requirements + Dashboard API + Catalog)

**SP:** 21 | **Duration:** 2026-02-12 (1 day) | **Team:** Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-12 | 21 | 21 | Sprint start |
| 1 | 2026-02-12 | 0 | 0 | All 6 US: Score, Requirements, Dashboard API, History, Alternatives |

**Velocity:** 21/21 SP | **Carry-over:** 0 | **Tests:** 250 → 335

---

## Sprint 3.5 (Stripe + Registration + Lead Gen)

**SP:** 22 | **Duration:** 2026-02-12 (1 day) | **Team:** Claude Code + 4 parallel agents

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-12 | 22 | 22 | Sprint start (4 agents parallel) |
| 1 | 2026-02-12 | 0 | 0 | All 7 US: Stripe, Registration, Pricing, Quick Check, Penalty Calc |

**Velocity:** 22/22 SP | **Carry-over:** 0 | **Tests:** 335 → 362

---

## Sprint 4 (Production Deployment)

**SP:** 30 | **Duration:** 2026-02-13 (1 day) | **Team:** Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-13 | 30 | 30 | Sprint start |
| 1 | 2026-02-13 | 0 | 0 | All 8 US: Docker, Caddy, Kratos, DB, Hardening, CI/CD, Monitoring, GDPR |

**Velocity:** 30/30 SP | **Carry-over:** 0 | **Tests:** 362 → 369

---

## Sprint 5 (Landing Page, Auth & Public Pages)

**SP:** 55 → 50 | **Duration:** 2026-02-14 — 2026-02-15 (2 days) | **Team:** Nina, Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-14 | 55 | 55 | Sprint start |
| 1 | 2026-02-15 | 5 | 27.5 | US-053..062: Design System, i18n, Landing (15 sections), Auth, Public pages |
| 2 | 2026-02-15 | 5 | 0 | Ory Kratos dev integration fixes |

**Velocity:** 50/55 SP | **Carry-over:** US-063 (3 SP) + US-064 (2 SP) → S6 | **Tests:** 369 → 369 (visual sprint)

---

## Sprint 6 (Admin Panel + Stripe + Deploy)

**SP:** 15 | **Duration:** 2026-02-15 — 2026-02-16 (2 days) | **Team:** Nina, Marcus, Claude Code

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-15 | 15 | 15 | Sprint start |
| 1 | 2026-02-15 | 5 | 7.5 | US-065+066: Admin backend + frontend |
| 2 | 2026-02-16 | 0 | 0 | US-063+064: Stripe pipeline fixed, build verified |

**Velocity:** 15/15 SP | **Carry-over:** 0 | **Tests:** 369 → 377

---

## Sprint 7 (WorkOS Migration + Registry API)

**SP:** 39 | **Duration:** 2026-02-17 — 2026-02-24 (8 days) | **Team:** Max, Nina, Leo

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-17 | 39 | 39 | Sprint start |
| 4 | 2026-02-21 | 18 | 19.5 | WorkOS done (US-071..073), Registry core (US-074..075) |
| 8 | 2026-02-24 | 0 | 0 | Data migration (US-076..078), public pages (US-079) |

**Velocity:** 39/39 SP | **Carry-over:** 0 | **Tests:** 377 → 491

---

## Sprint 8 (FRIA + Dashboard v2 + Members + Documents + CLI)

**SP:** 49 planned → 40 (9 SP moved to S9) | **Duration:** 2026-03-01 — 2026-03-04 (4 days) | **Team:** Max, Nina, Marcus

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-03-01 | 49 | 49 | Sprint start |
| 1 | 2026-03-01 | 31 | 39 | US-081 FRIA (8), US-084 Dashboard v2 (7), US-084b Members (3) |
| 2 | 2026-03-02 | 22 | 29 | Scope adjusted: -9 SP → S9 (US-086/089/090) |
| 3 | 2026-03-03 | 4 | 19 | US-085 Gap Analysis (5), US-083 Audit Package (6), US-087 CLI Auth (3), US-088 CLI Sync (4) |
| 3 | 2026-03-03 | 0 | 19 | US-082 Documents (4): plan gate, async LLM, section/document approval |
| 4 | 2026-03-04 | 0 | 0 | Full audit (4 agents) + E2E testing + 12 P0 security fixes |

**Moved to Sprint 9:** US-086 Timeline (3 SP), US-089 SSE Push (2 SP), US-090 Vendor Verification (4 SP)

**Day 4 Audit Results (12 P0 fixes):**
- 5 CRITICAL: Org PK mismatch (2 files), ComplianceDocument missing org field, TOCTOU UPDATEs (4 files), XSS in htmlRenderer
- 3 HIGH: sectionCode not Zod-validated (4 API files), device endpoint no rate limit, DeviceCode RBAC missing
- 4 MEDIUM: schemas missing createdAt (2), audit log gaps, API-layer db.query fallback, JWT duplication documented

**Velocity:** 40/40 SP | **Carry-over:** 0

---

## Sprint 8.5 (United Sprint 1 — CLI ↔ SaaS Integration Bridge)

**SP:** 28 (10 SaaS + 18 CLI) | **Duration:** 2026-03-04 — 2026-03-05 (2 days) | **Team:** Marcus (Claude Code)
**Cross-repo:** ~/PROJECT (SaaS) + ~/complior (CLI)

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-03-04 | 28 | 28 | Sprint start — plan approved (12 US across 2 repos) |
| 1 | 2026-03-04 | 10 | 14 | CLI: US-U01..U06 (login, tokens, logout, sync service, passport push, scan push) |
| 1 | 2026-03-04 | 4 | 14 | SaaS: US-U07..U09 (document sync, obligation map, field mapping) |
| 2 | 2026-03-05 | 0 | 0 | US-U10..U12 (data bundle, TUI panel, score display) + full audit (9 fixes) |

**SaaS-side deliverables (10 SP):**
- US-U07 (4 SP): POST /api/sync/documents endpoint + processDocuments.js
- US-U08 (3 SP): Obligation cross-mapping (resolveObligations.js — 28 OBL→ART mappings)
- US-U09 (1 SP): Extended SyncPassportSchema (+8 fields) + enhanced mergePassport.js
- US-U12 (2 SP): CLI Score display on Dashboard (getDashboardSummary + DocumentStatus + i18n)

**Code audit (9 violations fixed):**
- 2 CRITICAL: Missing organizationId in ComplianceDocument INSERT, missing NOT NULL cols in AITool INSERT
- 4 HIGH: z.any() → typed schemas, DRY mergePassport (3x duplication), orphan seed deleted, SQL allowlist
- 3 MEDIUM: FP-first (this→closure, for→reduce), DISTINCT ON + LIMIT on dashboard query, i18n hardcoded text

**Velocity:** 28/28 SP | **Carry-over:** 0

---

## Cumulative Velocity

| Sprint | SP Planned | SP Done | Duration | SP/day |
|--------|-----------|---------|----------|--------|
| 000 | 10 | 10 | 4 days | 2.5 |
| 0 | 47 | 47 | 2 days | 23.5 |
| 1 | 50 | 50 | 2 days | 25.0 |
| 2 | 55 | 55 | 2 days | 27.5 |
| 2.5 | 17 | 17 | 2 days | 8.5 |
| 3 | 21 | 21 | 1 day | 21.0 |
| 3.5 | 22 | 22 | 1 day | 22.0 |
| 4 | 30 | 30 | 1 day | 30.0 |
| 5 | 55 | 50 | 2 days | 25.0 |
| 6 | 15 | 15 | 2 days | 7.5 |
| 7 | 39 | 39 | 8 days | 4.9 |
| 8 | 40 | 40 | 4 days | 10.0 |
| 8.5 | 28 | 28 | 2 days | 14.0 |
| **Total** | **429** | **424** | **33 days** | **12.8** |

---

## Test Growth

| Sprint | Unit | E2E | Total |
|--------|------|-----|-------|
| 0 | 22 | 0 | 22 |
| 1 | 64 | 14 | 78 |
| 2 | 115 | 14 | 129 |
| 2.5 | 149 | 101 | 250 |
| 3 | 187 | 148 | 335 |
| 3.5 | 214 | 148 | 362 |
| 4 | 221 | 148 | 369 |
| 5 | 221 | 148 | 369 |
| 6 | 229 | 148 | 377 |
| 7 | 343 | 148 | 491 |
| 8 | 398 | 148 | 546 |
| 8.5 | 406 | 148 | 554 |

---

**Updated by:** Claude Code (on behalf of Marcus)
**Last update:** 2026-03-05
