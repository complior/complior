# SPRINT-BOARD.md — Current Sprint Board

**Sprint:** 0 (Infrastructure & Project Setup)
**Status:** Done — Awaiting Review
**Start Date:** 2026-02-08
**End Date:** 2026-02-09
**Sprint Goal:** Полная инфраструктура для deployer-first MVP (backend + frontend + CI/CD + Docker)

## Scrum Board

### Sprint Backlog
(Empty — all stories moved to Done)

### To Do
(Empty)

### Doing
(Empty)

### Testing
- [ ] PR #3: Marcus (CTO review) + Leo (security audit) — параллельно

### Done

#### US-001: Monorepo + Fastify Backend (5 SP) — Max
- [x] Monorepo root с workspaces (src/, frontend/)
- [x] Core files: main.js, http.js, ws.js, loader.js
- [x] lib/db.js с CRUD builder
- [x] DDD структура: domain/, application/, schemas/, api/, infrastructure/, config/, lib/
- [x] GET /health → 200 с service checks (DB, Ory, Gotenberg)
- [x] ESLint + Prettier (aligned with CODING-STANDARDS §14)
- [x] tsconfig.json (strict mode)
- [x] .gitignore, .env.example
- [x] Pino structured logging

#### US-002: MetaSQL Schemas — 29 Tables (10 SP) — Max
- [x] 29 таблиц: IAM (5), Inventory (3), Classification (4), Literacy (4), Compliance (5), Consultation (2), Monitoring (3), Billing (2), AuditLog (1)
- [x] Seed data: 225 AI tools (catalog), 32 requirements, 5 plans, 4 courses, 4 roles + 42 permissions
- [x] setup.js с DDL generation (vm.runInThisContext)
- [x] TABLE_ORDER respects FK dependencies

#### US-003: Docker Compose (5 SP) — Max
- [x] PostgreSQL 16-alpine с healthcheck
- [x] Ory Kratos v1.3.1 (migrate + serve, webhook, magic link)
- [x] Gotenberg 8 (HTML→PDF)
- [x] Node.js app с hot reload
- [x] .env.example со всеми переменными

#### US-004: Infrastructure Clients (5 SP) — Max
- [x] Ory client (verifySession, getIdentity, listIdentities)
- [x] Brevo client (sendTransactional)
- [x] Gotenberg client (convertHtmlToPdf)
- [x] S3 client (upload, download, getSignedUrl)
- [x] Configs: config/ory.js, brevo.js, gotenberg.js, s3.js

#### US-005: Error Handling, Logging, CI/CD (5 SP) — Max
- [x] Error hierarchy: AppError, ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, RateLimitError
- [x] Fastify error handler → JSON responses + Sentry capture
- [x] X-Request-Id header generation
- [x] @fastify/rate-limit (100 req/min)
- [x] CI pipeline: lint → type-check → test → security → status-check
- [x] Config validation (validate.js)

#### US-006: Frontend Skeleton + Design System (8 SP) — Nina
- [x] Next.js 14 App Router + TypeScript strict
- [x] TailwindCSS 3 + shadcn/ui
- [x] Design tokens: primary, risk colors, Inter + JetBrains Mono, 4px grid
- [x] Layout: Header, Footer, Sidebar
- [x] UI components: Dialog, Table, Toast
- [x] Pages: /, /dashboard, /health, /404, error boundary
- [x] Responsive: desktop sidebar + mobile bottom nav

#### US-007: Monitoring + Analytics (3 SP) — Nina
- [x] Plausible analytics (production only, no cookies)
- [x] @sentry/nextjs + @sentry/node (conditional on SENTRY_DSN)
- [x] /health endpoint ready for Better Uptime

#### US-008: UX Wireframes Sprint 1-2 (6 SP) — Nina
- [x] 6 screens: Landing, Login, Register, Dashboard, AI Tool Inventory, AI Literacy
- [x] Design tokens aligned (risk colors, spacing, typography)
- [x] Responsive layouts (1280px desktop)

---

## Quality Metrics

| Metric | Result |
|--------|--------|
| ESLint errors | 0 |
| TypeScript errors | 0 |
| Unit tests | 22/22 pass |
| npm audit (critical) | 0 |
| Frontend build | OK |

---

**Updated by:** Claude Code (on behalf of Alex)
**Last update:** 2026-02-09
