# Complior -- Unified Burndown

> Объединённые метрики CLI/Engine (open-source) и SaaS Dashboard (проприетарный). Детали реализации -- см. соответствующие FEATURE-MAP.md.

**Дата:** 2026-03-20
**Дедлайн:** 2 августа 2026 (~135 дней)

---

## Обзор

| Метрика | CLI/Engine | SaaS | Итого |
|---------|-----------|------|-------|
| Спринты | v1 (19) + v8 (S01--S06-partial + S08--S10-partial, 18) = 37 | S000--S8.5 (14) | 51 |
| Story Points | 365 (v1) + ~205 (v8 est.) = ~570 | 424 | ~994 |
| Тесты | 2342 | 554 | **2896** |
| User Stories (DONE) | 84 (v1) + 93 (v8) = 177 | 84 | 261 |
| Velocity (SP/day) | ~20 (v1, 2 days) / ~6.8 (v8, 30 days) | 12.8 | -- |
| Разработчики | Claude Code | Max, Nina, Leo, Marcus | -- |

---

## Timeline к 2 августа 2026

### Текущее состояние (20 марта 2026)

```
FEB  2026  |====================| CLI v1 done (365 SP, 19 sprints, 2 days)
           |========|             CLI v8 S01-S3.5 done (950 tests)
           |===========================| SaaS S000-S8.5 done (424 SP, 14 sprints, 33 days)

MAR  2026  |==| CLI S04 done (FRIA JSON, bug fixes)
           |==============| CLI S05 Phase 1-5 done (30 US, 1691 tests)
           |====| CLI S06 partial (5 US + Passport Production Rewrite: LLM Chat, Chat UX, Onboarding, Init, 10 passport fixes)
           |====| CLI S08/S09 partial (Scanner Intelligence, CLI Scan Output, Code Quality)
           |====| CLI S10 partial (Tier-2 Scan, Multi-Framework, Fix Report, SRP)
           |========| SaaS S9 (planned: 51 SP, 18 features, 4 weeks)

APR  2026  |====| CLI S06 (planned: ISO 42001 docs, MCP Proxy, NHI Scanner)
           |====| SaaS S9 completion + S10 start

MAY  2026  |====| CLI S07 (planned: Guard API)
           |========| SaaS S10 (incidents, monitoring, i18n, enterprise)

JUN  2026  |====| CLI S08 (planned: TUI Onboarding, MCP Guard)
           |====| SaaS S10 completion

JUL  2026  |====| CLI polish + hardening
           |====| SaaS S11 (stretch: SMB wizard, multi-workspace)

AUG 2 2026 |##| EU AI ACT FULL ENFORCEMENT -- HIGH-RISK DEADLINE
```

### Оставшийся scope (оценка)

| Трек | Спринты осталось | SP (оценка) | Критические фичи |
|------|-----------------|-------------|-------------------|
| CLI/Engine | S06 (remaining 25 US) + S07--S09 (3 спринта) + S10 Phase B-C | ~90 SP | MCP Proxy, ISO 42001, Guard API, LLM Doc Fill, Wizards, Cloud Scan |
| SaaS | S9--S10 (2 спринта) | ~100 SP | Реестр, Badge, Vendor Request, EU DB, Incidents, Monitoring |
| **Итого до дедлайна** | **~5 спринтов** | **~220 SP** | |

---

## CLI/Engine Sprints

### v1: Foundation (19 sprints, 2 days)

| Sprint | Track | SP | US | Tests | Key Deliverables |
|--------|-------|----|----|-------|-----------------|
| E01 | Engine | 47 | 11 | 0->78 | HTTP, Scanner L1, Scoring, LLM, Gate |
| T02 | TUI | 38 | 7 | 78->131 | Dashboard, Chat, File Browser, Diff |
| T02.5 | TUI | 25 | ~3 | 131->156 | OpenRouter, 4-step wizard, sidebar polish |
| E03 | Engine | 20 | 4 | 156->193 | Scanner L2-L4, Confidence |
| E04 | Engine | 22 | 5 | 193->220 | Fixer, Templates, CI/CD |
| T03 | TUI | 16 | 4 | 220->238 | 6-View, Engine Launch |
| T04 | TUI | 20 | 4 | 238->255 | Scan/Fix/Timeline/Report |
| T05 | TUI | 18 | 5 | 255->275 | Widgets, Watch Mode |
| E05 | Engine | 20 | 5 | 275->295 | MCP, LLM Tools, Agent Modes |
| E06 | Engine | 22 | 5 | 295->315 | Onboarding, Memory, Scanner L5, What-If |
| E06.5 | Engine | 3 | 1 | 315->315 | Clean Architecture migration |
| T06 | TUI | 20 | 4 | 315->340 | Themes, Onboarding |
| T07 | TUI | 18 | 5 | 340->365 | Zen, Zoom, Split-View |
| E07 | Engine | 22 | 5 | 365->390 | SDK, Badge, Undo |
| E08 | Engine | 18 | 4 | 390->420 | External Scan, PDF, Sessions |
| T08 | TUI | 16 | 6 | 420->458 | Mouse, Animations, Undo UI |
| T09 | TUI | 17 | 5 | 458->505 | Headless CLI, Scan Viz, What-If |
| L09 | Launch | 20 | 5 | 505->568 | Distribution, E2E, npm |

**v1 Total:** 365 SP | 84 US | 568 tests | 100% velocity (zero carryover) | 2 days

### v8: Daemon Reboot

| Sprint | Duration | US | Tests | Key Deliverables |
|--------|----------|----|----|-----------------|
| Phase 0 (Docs) | 5 days | -- | -- | ARCHITECTURE.md, PRODUCT-VISION, DATA-FLOWS, TUI-DESIGN-SPEC, EU-AI-ACT-PIPELINE, PRODUCT-BACKLOG |
| S01 (TUI overhaul) | 3 days | 9 | 568->600 | ViewState rewrite, Dashboard overhaul, Scan+Fix pages, type-aware fix preview, real fix apply |
| S02 (Scanner) | 2 days | 9 | 600->680 | Banned 6->45, L2 shallow detection, L5 wired, patterns 13->33, cross-layer verification, evidence, drift, SBOM |
| S03 (Daemon) | 2 days | 4 | 680->680 | tui->cli rename, `complior daemon [start\|status\|stop]`, PID file, TUI discovery |
| S03-ref (Refactoring) | 2 days | -- | 680->756 | types.rs SRP split, CheckResultType enum, 11 new fields, dead code cleanup |
| S03-us (Sprint S03 US) | 2 days | 13 | 756->944 | Agent Passport (13 steps), Autonomy L1-L5, compliorAgent SDK, Evidence Chain, FRIA Generator, TUI Passport+Obligations, Scanner passport-aware |
| S03-qf (Quality fixes) | <1 day | -- | 944->950 | 6 bugs fixed post E2E testing |
| S3.5 (United Sprint 1) | 2 days | 8 | 950->950 | `complior login/logout/sync`, token storage, SaaS sync service, TUI Sync Panel, data bundle client |
| S04 (Fixes) | <1 day | 1 | 950->950 | FRIA structured JSON, evidence bloat fix, sync path fixes |
| S05 Phase 1 (SDK) | 1 day | 6 | 950->1323 | Prohibited (138 patterns), Sanitize (50+ PII), Permission (3 providers), Disclosure (4 langs), Bias (15 chars), HTTP Middleware (4 frameworks) |
| S05 Phase 2 (Engine) | 1 day | 8 | 1323->1323 | Finding Explanations, Worker Notification, Passport Export (A2A/AIUC-1/NIST), Behavior Contracts, Industry Patterns (4 domains), Agent Registry, Permissions Matrix, Policy Templates (5 industries) |
| S05 Phase 3 (Launch) | 1 day | 3 | 1323->1430 | AIUC-1 Readiness Score, Guided Onboarding Wizard (5-step), Compliance Diff in PR |
| S05-QF (Quality) | <1 day | — | 1430->1430 | 11 fixes: score.totalScore bug, scoped names crash, DRY/SRP/Zod validation, onboarding path, skipStep status |
| S05 Phase 4 (Runtime) | 1 day | 5 | 1430->1430 | Permission Scanner, Disclosure+Marking+Logger, Safety Filter+HITL, Compliance Proxy, Adversarial Test Runner |
| S05 Phase 5 (Multi-Agent) | 1 day | 5 | 1430->1430 | Compliance Debt, Simulation, Multi-Agent, Cost Estimator, RegistryToolCard |
| S05 Multi-Framework | <1 day | — | 1430->1430 | EU AI Act + AIUC-1 dual scoring, TUI metrics widgets (Cost/Debt/Readiness) |
| S05-S06-QF (Quality) | <1 day | — | 1430->1430 | Port discovery DRY, SDK strict compliance, code quality audit |
| S06 partial (LLM Chat) | 1 day | 2 | 1430->1691 | LLM Chat Service (rate limiter, SSE), TUI Chat Page (9th view, LLM settings) |
| S06 partial (UX+Onboarding) | 1 day | 3 | 1691->1709 | Chat UX (multiline, tool names, no timestamps), Onboarding Rework (10→8 steps, persistence, Esc block, requirements frameworks), `complior init` + project root discovery (9 markers) |
| S06 partial (Passport Rewrite) | 1 day | — | 2308->2342 | Passport Production Rewrite (10 fixes): resolveRiskClass, getApplicableArticles, inferDataResidency, generateDescription, buildOversight, computeDeployerObligations, computeNextReview, deep completeness, auto-update after scan, killSwitch export |
| S08/S09 partial (Scanner Intelligence) | 2 days | 5 | 1709->2135 | Import Graph (45 AI packages, 5 ecosystems), Multi-Language (Go/Rust/Java), Git History (21 doc types), Targeted L5 (8 prompts), L5 Doc Validation (4 doc types), GPAI systemic risk checks, AI enricher, unified constants (H1/H4/C1), enhanced CLI scan output (severity summary, fix roadmap, deadline, badges) |
| S10 partial (Tier-2 + Fix Report) | 3 days | 6 | 2135->2308 | Scanner Tier-2 (Semgrep/Bandit runners, finding mapper, dedup), multi-framework scoring, scan cache wiring, scan output SRP rewrite (format/ module: colors, labels, layers), fix report scaffold badges `[SCAFFOLD]`, code fix dedup, file dedup, upgrade CTA, FIX.md pipeline docs |

**v8 Total:** ~32 days | 93 US | +1774 tests (568->2342)

### CLI Test Count History

| Milestone | TS Engine | SDK | Rust CLI | Total |
|-----------|-----------|-----|----------|-------|
| v1 final (L09) | 315 | 9 | 253 | **568** |
| S02 scanner | 375 | 9 | 253 | **637** |
| S03 SRP restructuring | 375 | 95 | 286 | **756** |
| S03-us Sprint complete | 483 | 116 | 345 | **944** |
| S03-qf Quality fixes | 489 | 116 | 345 | **950** |
| S05 Phase 1 (SDK prod) | 489 | 373 | 345 | **1207** |
| S05 Phase 2 (Engine) | 589 | 373 | 361 | **1323** |
| S05 Phase 3 (Launch) | 685 | 373 | 372 | **1430** |
| S05 Phase 4-5 (Runtime+Multi) | 862 | 414 | 415 | **1691** |
| S06 partial (UX+Onboarding) | 862 | 414 | 433 | **1709** |
| S08/S09 partial (Scanner Intel) | 1255 | 414 | 466 | **2135** |
| S10 partial (Tier-2+Fix Report) | 1407 | 414 | 487 | **2308** |
| S06 partial (Passport Rewrite) | 1439 | 414 | 489 | **2342** |

---

## SaaS Sprints

| Sprint | SP Planned | SP Done | Duration | SP/day | Tests | Key Deliverables |
|--------|-----------|---------|----------|--------|-------|-----------------|
| S000 | 10 | 10 | 4 days | 2.5 | -- | Team setup, OpenClaw config, Phase 0 docs |
| S0 | 47 | 47 | 2 days | 23.5 | 0->22 | Monorepo, Fastify+VM, 29 schemas, Docker, Next.js skeleton |
| S1 | 50 | 50 | 2 days | 25.0 | 22->78 | Ory auth, RBAC, multi-tenancy, AuditLog, AI Tool Catalog (225+ tools) |
| S2 | 55 | 55 | 2 days | 27.5 | 78->129 | Tool CRUD, 5-step wizard, RuleEngine (Art.5+Annex III), classification |
| S2.5 | 17 | 17 | 2 days | 8.5 | 129->250 | Subscription limits, invite flow, team management |
| S3 | 21 | 21 | 1 day | 21.0 | 250->335 | Compliance score, requirements CRUD, classification history, dashboard API |
| S3.5 | 22 | 22 | 1 day | 22.0 | 335->362 | Stripe Checkout + webhook, pricing page, Quick Check, Penalty Calculator |
| S4 | 30 | 30 | 1 day | 30.0 | 362->369 | Production Docker, Caddy TLS, DB backups, hardening, CI/CD, GDPR |
| S5 | 55 | 50 | 2 days | 25.0 | 369->369 | Frontend rebuild: landing (15 sections), auth, pricing, public pages |
| S6 | 15 | 15 | 2 days | 7.5 | 369->377 | Admin Panel (6 endpoints + UI), Stripe test mode, frontend deploy |
| S7 | 39 | 39 | 8 days | 4.9 | 377->491 | WorkOS migration, Registry API (4,983 tools), data migration (6 tables), public pages |
| S8 | 40 | 40 | 4 days | 10.0 | 491->546 | FRIA (6 endpoints), Dashboard v2 (12 widgets), Members, Documents (9 endpoints, LLM draft, PDF), Gap Analysis (12 AESIA), Audit Package (ZIP), CLI Auth + Sync. Day 4: 12 P0 security fixes |
| S8.5 | 28 | 28 | 2 days | 14.0 | 546->554 | United Sprint 1: Document Sync, Obligation Cross-Mapping, Passport Schema +8 fields, CLI Score Display. Code audit: 9 fixes |
| **Total** | **429** | **424** | **33 days** | **12.8** | **554** | |

### SaaS Test Growth

| Sprint | Unit | E2E | Total |
|--------|------|-----|-------|
| S0 | 22 | 0 | 22 |
| S1 | 64 | 14 | 78 |
| S2 | 115 | 14 | 129 |
| S2.5 | 149 | 101 | 250 |
| S3 | 187 | 148 | 335 |
| S3.5 | 214 | 148 | 362 |
| S4 | 221 | 148 | 369 |
| S5 | 221 | 148 | 369 |
| S6 | 229 | 148 | 377 |
| S7 | 343 | 148 | 491 |
| S8 | 398 | 148 | 546 |
| S8.5 | 406 | 148 | 554 |

---

## Объединённая velocity

### SP Delivery Rate

| Период | CLI SP | SaaS SP | Total SP | Days | SP/day |
|--------|--------|---------|----------|------|--------|
| CLI v1 | 365 | -- | 365 | 2 | 182.5 |
| CLI v8 (S01-S10-partial) | ~205 est. | -- | ~205 | 31 | ~6.6 |
| SaaS S000-S4 | -- | 252 | 252 | 13 | 19.4 |
| SaaS S5-S7 | -- | 104 | 104 | 12 | 8.7 |
| SaaS S8-S8.5 | -- | 68 | 68 | 6 | 11.3 |
| **Cumulative** | **~570** | **424** | **~994** | **64** | **~15.5** |

### Test Growth (Combined)

| Date | CLI Tests | SaaS Tests | Total |
|------|-----------|------------|-------|
| 2026-02-08 | 0 | 0 | 0 |
| 2026-02-09 | 0 | 22 | 22 |
| 2026-02-11 | 0 | 129 | 129 |
| 2026-02-12 | 0 | 362 | 362 |
| 2026-02-15 | 0 | 369 | 369 |
| 2026-02-18 | 568 | 377 | 945 |
| 2026-02-24 | 568 | 491 | 1059 |
| 2026-02-28 | 637 | 491 | 1128 |
| 2026-03-01 | 680 | 491 | 1171 |
| 2026-03-02 | 756 | 491 | 1247 |
| 2026-03-03 | 811 | 491 | 1302 |
| 2026-03-04 | 950 | 546 | 1496 |
| 2026-03-05 | 950 | 554 | **1504** |
| 2026-03-07 | 1207 | 554 | **1761** |
| 2026-03-08 | 1323 | 554 | **1877** |
| 2026-03-09 | 1430 | 554 | **1984** |
| 2026-03-13 | 1709 | 554 | **2263** |
| 2026-03-17 | 2135 | 554 | **2689** |
| 2026-03-20 | 2342 | 554 | **2896** |

### Velocity Trend (per sprint, both tracks)

```
SP/day
  30 |                          *
     |                    *
  25 |              *  *
     |
  20 |  *
     |
  15 |                                            *
     |                                      *
  10 |                                *  *
     |                          *
   5 |                    *
     |        *
   0 +----+----+----+----+----+----+----+----+----+----
     S000 S0  S1  S2 S2.5 S3 S3.5 S4  S5  S6  S7  S8 S8.5
                         SaaS Sprints
```

---

## Risk Assessment

### Критический путь к 2 августа 2026

| Приоритет | Что нужно | Трек | Целевой спринт | Статус |
|-----------|----------|------|---------------|--------|
| P0 | Cert Readiness — AIUC-1 | CLI | S05-P3 | **DONE** |
| P0 | Guided Onboarding (8-step) | CLI | S05-P3+S06 | **DONE** |
| P0 | Compliance Diff (PR gate) | CLI | S05-P3 | **DONE** |
| P0 | Agent Registry + Permissions Matrix | CLI | S05-P2 | **DONE** |
| P0 | Policy Templates (5 industries) | CLI | S05-P2 | **DONE** |
| P0 | SDK Production (6 hooks) | SDK | S05-P1 | **DONE** |
| P0 | Реестр AI систем (unified CLI+SaaS) | SaaS | S9 | PLANNED |
| P0 | EU Database Helper (Art.49 registration) | SaaS | S9 | PLANNED |
| P0 | Compliance Badge (prove compliance to 3rd parties) | SaaS | S9 | PLANNED |
| P0 | Adversarial Test Runner | CLI | S05-P4 | **DONE** |
| P1 | Runtime Control (Disclosure + Safety + Proxy) | CLI+SDK | S05-P4 | **DONE** |
| P1 | Управление инцидентами (Art.73) | SaaS | S10 | PLANNED |
| P1 | Мониторинг реального времени (Art.72) | SaaS | S10 | PLANNED |
| P1 | Guard API (runtime compliance) | CLI | S07 | PLANNED |
| P1 | ISO 42001 documentation | CLI | S06 | PLANNED |
| P2 | Мультиязычность (DE/FR) | SaaS | S10 | PLANNED |
| P2 | Enterprise features (custom rules, audit log) | SaaS | S10 | PLANNED |
| P2 | MCP Proxy Analytics | Both | S06/S10 | PLANNED |

### Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| Не успеть S9+S10 SaaS до 2 августа | Средняя | Критический | S9 содержит все CRITICAL фичи. S10 -- nice-to-have для launch |
| CLI S05-S07 задержки (cert, ISO, Guard) | Средняя | Высокий | SaaS может работать без этих CLI-фич (MEDIUM dependency) |
| EUR-Lex scraper нестабилен | Средняя | Низкий | Fallback на manual, pg-boss retry |
| Regulatory changes до 2 августа | Низкая | Средний | Мониторинг (D-12), гибкая архитектура |
| LLM costs scaling (Mistral) | Низкая | Низкий | BYOK option, rate limits, Guard API (self-hosted) |
| Cross-repo sync issues (CLI<->SaaS) | Средняя | Средний | Contract tests, shared schemas, United Sprints |

### Оценка готовности к дедлайну

| Что | К 2 авг 2026 | Confidence |
|-----|-------------|------------|
| CLI Scanner (5 layers) | DONE | 100% |
| CLI Agent Passport (Mode 1 Auto) | DONE | 100% |
| CLI Passport Production Rewrite (10 fixes: risk class, articles, oversight, obligations) | DONE | 100% |
| CLI Evidence Chain | DONE | 100% |
| CLI FRIA Generator | DONE | 100% |
| CLI<->SaaS Sync | DONE | 100% |
| SDK Production (6 hooks, Art.5/9/26/50) | DONE | 100% |
| CLI AIUC-1 Cert Readiness | DONE | 100% |
| CLI Guided Onboarding (8-step, reworked) | DONE | 100% |
| CLI Compliance Diff (PR gate) | DONE | 100% |
| CLI Agent Registry + Permissions | DONE | 100% |
| CLI Policy Templates (5 industries) | DONE | 100% |
| CLI Industry Scanner Patterns (4 domains) | DONE | 100% |
| CLI Passport Export (A2A/AIUC-1/NIST) | DONE | 100% |
| CLI Worker Notification (Art.26(7)) | DONE | 100% |
| CLI Finding Explanations | DONE | 100% |
| CLI Behavioral Constraints | DONE | 100% |
| CLI Adversarial Test Runner | DONE (S05-P4) | 100% |
| CLI Runtime Control (4 US) | DONE (S05-P4) | 100% |
| CLI Multi-Agent Awareness | DONE (S05-P5) | 100% |
| CLI Cost/Debt/Simulation | DONE (S05-P5) | 100% |
| CLI LLM Chat Service | DONE (S06) | 100% |
| CLI TUI Chat Page (9th View) | DONE (S06) | 100% |
| CLI Chat UX (multiline, tool names, no timestamps) | DONE (S06) | 100% |
| CLI Onboarding Rework (10→8 steps, persistence, Esc block) | DONE (S06) | 100% |
| CLI `complior init` + Project Root Discovery | DONE (S06) | 100% |
| CLI Scanner Intelligence (Import Graph, Multi-Lang, Git History) | DONE (S08/S09) | 100% |
| CLI Targeted L5 + Doc Validation (LLM deep analysis) | DONE (S08/S09) | 100% |
| CLI GPAI Systemic Risk Checks | DONE (S08/S09) | 100% |
| CLI Enhanced Scan Output (severity, roadmap, deadline, badges) | DONE (S08/S09) | 100% |
| CLI Code Quality (H1 constants, H4 AI packages, C1 file-collector) | DONE (S08/S09) | 100% |
| CLI Scanner Tier-2 (Semgrep/Bandit external tool runners) | DONE (S10) | 100% |
| CLI Multi-Framework Scoring (OWASP/MITRE/NIST mapping) | DONE (S10) | 100% |
| CLI Scan Output SRP (format/ module, ANSI colors, layer grouping) | DONE (S10) | 100% |
| CLI Fix Report Scaffold Badges + Code Fix Dedup + Upgrade CTA | DONE (S10) | 100% |
| CLI FIX.md Pipeline Documentation (18 strategies, 5 categories) | DONE (S10) | 100% |
| SaaS Реестр + Wizard | PLANNED (S9) | 85% |
| SaaS EU Database Helper | PLANNED (S9) | 80% |
| SaaS Badge + Vendor Request | PLANNED (S9) | 80% |
| SaaS Incidents (Art.73) | PLANNED (S10) | 60% |
| SaaS Monitoring (Art.72) | PLANNED (S10) | 60% |
| CLI Guard API | PLANNED (S07) | 50% |
| CLI ISO 42001 docs | PLANNED (S06) | 50% |
| SaaS Enterprise features | PLANNED (S10) | 40% |
| SaaS Multi-language | PLANNED (S10) | 30% |

### Минимально жизнеспособный compliance kit к 2 августа

Для deployer'а high-risk AI системы **минимально необходимо:**

1. Реестр AI систем с lifecycle (D-39) -- **S9**
2. FRIA assessment (D-19) -- **DONE**
3. EU Database registration helper (D-47) -- **S9**
4. Compliance documentation (D-07) -- **DONE**
5. Audit Package (D-42) -- **DONE**
6. CLI Scanner + Passport (open-source) -- **DONE**
7. CLI<->SaaS Sync (D-62) -- **DONE**
8. SDK runtime compliance (6 hooks) -- **DONE** (S05)
9. AIUC-1 certification readiness -- **DONE** (S05)
10. Agent Registry + Governance -- **DONE** (S05)
11. Policy Templates (5 industries) -- **DONE** (S05)
12. Guided Onboarding (8-step wizard, 15 min to first report) -- **DONE** (S05+S06)
13. Compliance Diff for PRs (CI/CD gate) -- **DONE** (S05)
14. Adversarial Test Runner (Art.9/Art.15) -- **DONE** (S05)
15. Runtime Control (Disclosure + Safety + Proxy) -- **DONE** (S05)
16. LLM Chat Assistant (interactive compliance Q&A) -- **DONE** (S06)
17. Chat UX (multiline, tool names, clean timestamps) -- **DONE** (S06)
18. `complior init` + Project Root Discovery (9 markers) -- **DONE** (S06)
19. Scanner Intelligence (Import Graph 45 AI pkgs, Multi-Language, Git History) -- **DONE** (S08/S09)
20. L5 Deep Analysis (Targeted L5 + Doc Validation) -- **DONE** (S08/S09)
21. GPAI Systemic Risk Checks -- **DONE** (S08/S09)
22. Enhanced CLI Scan Output (severity, fix roadmap, deadline, badges) -- **DONE** (S08/S09)
23. Code Quality (unified constants, AI package registry, clean architecture) -- **DONE** (S08/S09)
24. Scanner Tier-2 (Semgrep/Bandit external tool runners, finding mapper) -- **DONE** (S10)
25. Multi-Framework Scoring (OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF) -- **DONE** (S10)
26. Fix Report Scaffold Badges + Code Fix Dedup + Upgrade CTA -- **DONE** (S10)
27. Scan Output SRP (format/ module, ANSI colors, layer grouping) -- **DONE** (S10)
28. FIX.md Pipeline Documentation (18 strategies, 5 fix categories) -- **DONE** (S10)
29. Passport Production Rewrite (10 fixes: resolveRiskClass, dynamic articles, oversight, obligations, deep completeness, auto-update after scan) -- **DONE** (S06)

Из 29 must-have, **27 уже DONE**. Осталось 2 -- обе в SaaS S9.

**Вывод:** При текущей velocity (12.8 SP/day SaaS) Sprint 9 (51 SP, 4 weeks) укладывается в дедлайн с запасом ~3 месяца на S10+ фичи. CLI/Engine обогнал план на ~3 спринта.

---

**Обновлено:** 2026-03-20 | **Источники:** `~/complior/docs/BURNDOWN.md` (CLI), `~/PROJECT/docs/BURNDOWN.md` (SaaS)
