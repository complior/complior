# SPRINT-BACKLOG-001 — IAM + AI Tool Catalog

**Версия:** 1.0.0
**Дата планирования:** 2026-02-10
**Статус:** ✅ Done (merged to main, PR #4)
**Фичи:** Feature 02 (IAM) + Feature 03 (AI Tool Inventory, start)
**Цель спринта:** Authenticated deployers can register, log in (magic link), browse 225+ AI tools in the catalog, with full RBAC, multi-tenancy isolation, and audit trail.

---

## Context

Sprint 0 done (47 SP, merged to main). All infrastructure ready: Fastify 5, Next.js 14, 29 schemas, Ory Kratos, Docker, CI/CD, 22 tests. Now we build the first user-facing features: authentication, authorization, multi-tenancy, audit logging, and the AI Tool Catalog browse/search.

## Capacity

| Developer | Capacity | Planned | Load |
|-----------|----------|---------|------|
| Max | 30 SP | 31 SP | 103% |
| Nina | 17 SP | 19 SP | 112% |
| **Total** | **47 SP** | **50 SP** | **106%** |

Overflow buffer: US-015 frontend (Nina 6 SP) can shift to Sprint 2 day 1 if needed.

---

## Wave 1 — Auth (Days 1-4, parallel)

### US-009: Ory Webhook → User + Organization Sync

**Feature:** 02 | **SP:** 8 | **Разработчик:** Max

#### Описание
As the system, I need to sync Ory registration events into our DB, so that every new Ory identity has a corresponding Organization, User, Role(owner), and Subscription(free).

#### Acceptance Criteria
- [x] POST `/api/auth/webhook` — verify secret (timing-safe comparison)
- [x] Create Org + User + Role(owner) + Subscription(free) in single transaction
- [x] Fallback sync-on-login via `GET /api/auth/me`
- [x] Idempotent: duplicate oryId → 200 OK, no duplicates

#### Реализованные файлы
- `src/api/auth/webhook.js` — Fastify route handler
- `src/api/auth/me.js` — session → user lookup with sync fallback
- `src/application/iam/syncUserFromOry.js` — business logic (144 lines)
- `src/application/iam/resolveSession.js` — Ory session → User record
- `tests/webhook.test.js` — 4 tests (valid payload, idempotent, ignore non-registration, missing identity_id)
- `tests/sync-user.test.js` — 4 tests (create new, idempotent, sync-on-login, missing identity)

---

### US-010: Login Page

**Feature:** 02 | **SP:** 5 | **Разработчик:** Nina

#### Описание
As a deployer, I want to log in via email magic link or password, so that I can access the compliance platform.

#### Acceptance Criteria
- [x] `/auth/login` — email magic link + password toggle
- [x] Ory self-service login flow → callback → `/api/auth/me` → redirect to `/dashboard`
- [x] Auto-redirect if session exists

#### Реализованные файлы
- `frontend/app/auth/login/page.tsx` — login page (115 lines)
- `frontend/app/auth/callback/page.tsx` — Ory callback handler (43 lines)
- `frontend/lib/ory.ts` — Ory client + helpers (68 lines)
- `frontend/lib/api.ts` — API client + types (85 lines)
- `frontend/components/auth/LoginForm.tsx` — form component (75 lines)
- `frontend/components/auth/MagicLinkSent.tsx` — confirmation UI (31 lines)

---

### US-011: Register Page — 2-Step Onboarding

**Feature:** 02 | **SP:** 8 | **Разработчик:** Nina

#### Описание
As a new deployer, I want to register with my email and then set up my company profile, so that my organization is ready for AI Act compliance.

#### Acceptance Criteria
- [x] Step 1: Name, Email, Password → Ory registration
- [x] Step 2: Company name, Industry, Size, Country → PATCH `/api/organizations/:id`
- [x] Webhook fires between steps, creates Org with placeholder → Step 2 updates

#### Реализованные файлы
- `frontend/app/auth/register/page.tsx` — 2-step registration (156 lines)
- `frontend/components/auth/RegisterStep1.tsx` — account creation form (84 lines)
- `frontend/components/auth/RegisterStep2.tsx` — company onboarding form (127 lines)
- `src/api/auth/updateOrganization.js` — PATCH handler (86 lines)

---

## Wave 2 — Backend Core (Days 4-7)

### US-012: RBAC — Permission Checks

**Feature:** 02 | **SP:** 8 | **Разработчик:** Max

#### Описание
As the platform, I need role-based access control, so that users can only perform actions they are authorized for.

#### Acceptance Criteria
- [x] `checkPermission(user, resource, action)` in `src/lib/permissions.js`
- [x] 'manage' action = wildcard for all CRUD actions
- [x] `resolveUser(session)` — oryId → User record
- [x] Seed roles: owner=manage all, admin=manage tools+compliance, member=limited, viewer=read-only

#### Реализованные файлы
- `src/lib/permissions.js` — checkPermission with wildcard 'manage' (65 lines)
- `src/application/iam/resolveSession.js` — shared with US-009 (31 lines)
- `tests/permissions.test.js` — 8 tests (owner manage, admin scope, member limited, viewer read-only, deny, wildcard)

---

### US-013: Multi-tenancy Isolation

**Feature:** 02 | **SP:** 5 | **Разработчик:** Max

#### Описание
As the platform, I need tenant isolation on every data query, so that Organization A cannot see Organization B's data.

#### Acceptance Criteria
- [x] `createTenantQuery(db, table, organizationId)` in `src/lib/tenant.js`
- [x] Auto-injects `WHERE "organizationId" = $N` on reads
- [x] Validates organizationId match on create/update
- [x] Tenant tables: AITool, AuditLog, Subscription, Conversation, Notification, AIToolDiscovery, ComplianceDocument, FRIAAssessment, LiteracyCompletion
- [x] Global tables: AIToolCatalog, Requirement, TrainingCourse, Plan, Role, Permission

#### Реализованные файлы
- `src/lib/tenant.js` — createTenantQuery + CRUD helpers (124 lines)
- `tests/tenant.test.js` — 8 tests (read filter, create validate, update validate, cross-org deny, global tables)

---

## Wave 3 — Audit + Catalog (Days 7-10)

### US-014: AuditLog — Auth Events

**Feature:** 02 | **SP:** 5 | **Разработчик:** Max

#### Описание
As an admin, I want to see a log of all authentication events, so that I have an audit trail for compliance.

#### Acceptance Criteria
- [x] `createAuditEntry(db, {...})` in `src/lib/audit.js`
- [x] Logs: login, registration, permission failures
- [x] `GET /api/auth/audit` — paginated, tenant-scoped, requires AuditLog+read permission

#### Реализованные файлы
- `src/lib/audit.js` — createAuditEntry + query helpers (75 lines)
- `src/api/auth/audit.js` — paginated GET handler (31 lines)
- `tests/audit.test.js` — 6 tests (create entry, pagination, tenant isolation, permission check)

---

### US-015: AI Tool Catalog API + Frontend

**Feature:** 03 | **SP:** 11 (Max 5 + Nina 6) | **Разработчики:** Max, Nina

#### Описание
As a deployer, I want to browse and search a catalog of 225+ AI tools with risk level indicators, so that I can find and add tools my company uses.

#### Acceptance Criteria
- [x] Backend: `GET /api/tools/catalog/search?q=&category=&riskLevel=&page=&pageSize=` — ILIKE search, filters, pagination
- [x] Backend: `GET /api/tools/catalog/:id` — single entry
- [x] Frontend: `/tools/catalog` page — search input (debounced 300ms), category + risk filters, card grid (responsive 1/2/3 cols), detail dialog
- [x] Risk badges: color-coded (prohibited=red, high=orange, gpai=blue, limited=yellow, minimal=green)

#### Реализованные файлы
- `src/api/tools/catalog.js` — search + detail routes (41 lines)
- `src/application/inventory/searchCatalog.js` — ILIKE search, filters, pagination (68 lines)
- `tests/catalog.test.js` — 12 tests (search, filter by category, filter by risk, pagination, detail, not found)
- `frontend/app/tools/catalog/page.tsx` — catalog page (129 lines)
- `frontend/components/tools/CatalogSearch.tsx` — debounced search + filters (77 lines)
- `frontend/components/tools/CatalogCard.tsx` — tool card component (67 lines)
- `frontend/components/tools/CatalogDetailDialog.tsx` — detail dialog (93 lines)
- `frontend/components/tools/RiskBadge.tsx` — color-coded badge (27 lines)

---

## Architecture Decisions (Sprint 1)

1. **Session hook** (not middleware): `initSessionHook` in `http.js` calls `oryClient.verifySession()` on all `/api/*` requests except webhook and health. Sets `request.session`. Business logic (resolveUser, checkPermission) stays explicit in handlers per CODING-STANDARDS §6.

2. **GET route support**: `initRoutes` extended to support GET/PATCH (was POST-only). CQS: queries are GET.

3. **Frontend Ory integration**: Raw fetch to Ory's self-service API at localhost:4433. Ory config points login/register UI URLs to localhost:3001/auth/*.

---

## Sprint 1 Summary

### Story Map

```
Feature 02: IAM + Feature 03: AI Tool Inventory (start)
│
├── Wave 1 — Auth (parallel, Days 1-4)
│   ├── US-009: Ory Webhook sync (8 SP, Max)
│   ├── US-010: Login page (5 SP, Nina)
│   └── US-011: Register 2-step (8 SP, Nina)
│
├── Wave 2 — Backend Core (Days 4-7)
│   ├── US-012: RBAC permissions (8 SP, Max)
│   └── US-013: Multi-tenancy (5 SP, Max)
│
└── Wave 3 — Audit + Catalog (Days 7-10)
    ├── US-014: AuditLog (5 SP, Max)
    └── US-015: Catalog API + Frontend (11 SP, Max+Nina)
```

### Sprint Totals

| Developer | Stories | SP | Фокус |
|-----------|---------|-----|-------|
| Max | US-009, 012-015 | 31 | Webhook, RBAC, tenancy, audit, catalog API |
| Nina | US-010, 011, 015 | 19 | Login, register, catalog frontend |
| **Total** | **7 US** | **50 SP** | |

### Commit
- `b7bec9d` — `feat: implement Sprint 1 — IAM + AI Tool Catalog (7 US, 50 SP)`
- 34 files changed, +2,737 / -21 lines
- 42 new tests (64 total), 0 failures

### Definition of Done ✅

- [x] All AC pass for each US
- [x] Tests: 64 total, 0 failures
- [x] Multi-tenancy: every data query filters by organizationId
- [x] No middleware: every handler explicitly resolves session, user, permission
- [x] CI green: lint + type-check + tests + audit
- [x] PR #4 reviewed and merged to main
- [x] Conventional Commits
- [x] Zod validation on all API endpoints (CODING-STANDARDS §2)
- [x] E2E tested against real Docker services (14/14 pass)

### Verification (updated 2026-02-10)

1. ✅ `docker compose up` → all 4 services healthy (postgres, kratos, gotenberg, app)
2. ✅ `npm test` → 64 tests pass, 0 failures
3. ✅ E2E: Ory registration (2-step) → webhook → User+Org+Role+Subscription in DB
4. ✅ E2E: `/api/auth/me` returns user with roles after session auth
5. ✅ E2E: Catalog search (ChatGPT), category filter (recruitment), detail by id, 404
6. ✅ E2E: PATCH `/api/organizations/:id` — org update with auth
7. ✅ E2E: GET `/api/auth/audit` — paginated audit log with auth
8. ✅ E2E: RBAC enforcement — cross-org access denied (403)
9. ✅ E2E: Zod validation errors returned as 400 with field details
