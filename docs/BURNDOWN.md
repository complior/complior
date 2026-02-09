# BURNDOWN.md — Sprint Burndown Chart

**Sprint:** 0 (Infrastructure & Project Setup)
**Total Story Points:** 47
**Duration:** 2026-02-08 — 2026-02-09 (2 days)
**Team:** Max (30 SP backend), Nina (17 SP frontend)

## Burndown Data

| Day | Date | SP Remaining | Ideal | Notes |
|-----|------|-------------|-------|-------|
| 0 | 2026-02-08 | 47 | 47 | Sprint start |
| 1 | 2026-02-08 | 15 | 23.5 | US-001..005 backend done (32 SP), 442 ESLint errors fixed |
| 2 | 2026-02-09 | 0 | 0 | US-006..008 frontend done (17 SP), CI blockers fixed |

## Velocity

| Metric | Value |
|--------|-------|
| Planned SP | 47 |
| Completed SP | 47 |
| Velocity | 47 SP / 2 days |
| Carry-over | 0 |

## Sprint 0 Completion Summary

### Backend (Max — 30 SP)
- **US-001** (5 SP): Monorepo + Fastify backend — done
- **US-002** (10 SP): 29 MetaSQL schemas + seeds (225 catalog, 32 requirements, 5 plans, 4 courses) — done
- **US-003** (5 SP): Docker Compose (PostgreSQL, Ory Kratos, Gotenberg, app) — done
- **US-004** (5 SP): Infrastructure clients (Ory, Brevo, Gotenberg, S3) — done
- **US-005** (5 SP): Error handling, logging, CI/CD, rate limiting — done

### Frontend (Nina — 17 SP)
- **US-006** (8 SP): Next.js skeleton + design system (Tailwind, shadcn/ui) — done
- **US-007** (3 SP): Monitoring + analytics (Plausible, Sentry, Better Uptime) — done
- **US-008** (6 SP): UX wireframes for Sprint 1-2 (6 screens) — done

## Progress Notes
- 2026-02-08: Sprint 0 started. Backend infrastructure built in one day — monorepo, schemas, Docker, clients, error handling, CI/CD. 442 ESLint errors fixed.
- 2026-02-09: Frontend completed. CI blockers fixed (type-check + npm audit). Fastify upgraded 4→5.7.4. 22 unit tests added, all green. UI components (Dialog, Table, Toast, Sidebar) created. CODING-STANDARDS alignment verified. PR #3 created.

---

**Updated by:** Claude Code (on behalf of Alex)
**Last update:** 2026-02-09
