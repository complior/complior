# STRATEGY.md — Complior Roadmap

**Status:** Phase 1 ✅ COMPLETE (v1.0.0 released 2026-05-03, v1.0.1 patch 2026-05-03)
**Updated:** 2026-05-03
**Owner:** Architect

> **Purpose:** Source of truth for "what we're building, in what order, in which phases".
> Architect-protocol Phase 1.2 reads this file before any milestone planning.
> Pairs with `PRODUCT-VISION.md` (what we're building, why) and `feature-areas/*.md` (how each subsystem works).

---

## North Star

EU AI Act enforcement begins **August 2, 2026** (~91 days from this update).

Complior's job: get development teams compliant before that deadline through:
1. **Open-source CLI** that scans, evaluates, fixes, and documents AI compliance
2. **SaaS Dashboard** for ongoing fleet management (separate repo)
3. **Guard Service** for runtime safety (separate repo, R&D track)

Three product modes: `complior` (daemon+TUI), `complior daemon --watch` (headless), `complior scan --ci` (standalone).

---

## Phase Status Overview

| Phase | Window | Status | Goal |
|-------|--------|--------|------|
| **Phase 1** | Month 1 (Mar–May 2026) | ✅ **DONE** | Pure open-source GA. Everything offline, zero cloud. |
| **Phase 1.5** | Post-launch (May 2026) | 🟡 IN PROGRESS | Launch momentum + V1 polish |
| **Phase 2** | Month 1.5–3 | ⏳ PLANNED | V2-M0X enrichment (SDK Layer 2, MCP enrichment) |
| **Phase 3** | Month 3–4 | ⏳ PLANNED | Cloud Services (Guard API, Hosted LLM, SaaS Dashboard) |
| **Phase 4** | Month 7+ | ⏳ PLANNED | Paid tiers (Growth €149, Enterprise €499) |

---

## Phase 1 — Pure Open-Source ✅ DONE

**Released:** v1.0.0 (2026-05-03), v1.0.1 (2026-05-03 — BUG-4 patch)

**Distribution:**
- npm: `complior@1.0.1`, `@complior/engine@1.0.1`, `@complior/contracts@1.0.1`
- crates.io: `complior-cli@1.0.1`
- GitHub Release: 5 platform binaries (Linux x86/arm, macOS Intel/ARM, Windows)

**Shipped:**
- Scanner L1-L5 with profile-aware filtering
- Eval (680 probes, 11 categories, 300 OWASP/MITRE security)
- Fix (18 strategies, 14 document templates, ENRICH semantics)
- Agent Passport (36 fields, 3 modes, ed25519, A2A/AIUC-1/NIST exports)
- Evidence chain (SHA-256 + ed25519)
- 14 SDK hooks (PII checksum validators, 138 Art. 5 patterns)
- 7 MCP tools
- Multi-framework scoring (EU AI Act + AIUC-1 + OWASP + MITRE)
- ISO 42001 (~65–70%): SoA, Risk Register, AI Policy
- TUI (9 pages including Chat)
- Tests: 226 Rust + 2,493 TS = 2,719 total, 0 failures

**Hotfix journey:** 12 mini-milestones consecutively delivered (V1-M30.1 → V1-M30.12) with 4-cycle exhaustive E2E verification before each tag.

---

## Phase 1.5 — Launch Momentum + Polish 🟡 IN PROGRESS

**Goal:** Capitalize on v1.0.1 release, gather user feedback before V2 work begins.

| Track | Effort | Status |
|-------|--------|--------|
| Mintlify docs site sync (v1.0.1, what's new, MCP tools-reference) | 3-4 h | ✅ DONE (3 sprints, 3 commits) |
| Charter docs sync (this file, Feature Areas, ADRs) | 6-10 h | 🟡 IN PROGRESS |
| Show HN / Twitter / LinkedIn announcement | 2-3 h | ⏳ PENDING |
| README badges + GitHub topics + social preview | 1 h | ⏳ PENDING |
| `docs/CONTRIBUTING.md` (for external contributors) | 1-2 h | ⏳ PENDING |
| `docs/SECURITY.md` (vuln disclosure, ed25519 key mgmt) | 30 min | ⏳ PENDING |
| `docs/UPGRADE-GUIDE.md` (v1.0.0 → v1.0.1) | 30 min | ⏳ PENDING |

**Why this phase before V2:** Without users, we don't know which V2-M0X track matters most. Real feedback drives prioritization.

---

## Phase 2 — V2-M0X Enrichment ⏳ PLANNED

**Goal:** Expand existing v1.0 surfaces (SDK, MCP) before adding new product surfaces (Guard, SaaS).

See `docs/V2-ROADMAP.md` for milestone-level detail.

| Milestone | Owner FA | Effort estimate | Depends on | Priority |
|-----------|----------|-----------------|------------|----------|
| **V2-M01** | FA-06 SDK | 5-10 days | — | P1 |
| **V2-M02** | FA-08 MCP | 3-5 days | — | **P1 — recommended first** |
| **V2-M03** | FA-09 Guard | TBD | Guard MVP (G-M01) ready | P2 (blocked) |
| **V2-M04** | FA-07 TUI | TBD | Architectural decision (ADR-007) | P2 (decision needed) |

### V2-M01 — SDK Layer 2 Enrichment

Per FA-06 (`> Status (v1.0.0): 🟡 BASE VERSION — 14 hooks shipped in S05; full enrichment is POST-v1.0.0`):
- HTTP middleware enhancements
- Hook composition improvements
- Per-domain enrichment (HR, finance, healthcare, etc.)
- Layer 2 prep (for future Guard integration)

### V2-M02 — MCP Enrichment

Per FA-08 (`> Status (v1.0.0): 🟡 BASE — 7 tools shipped; full = POST-v1.0.0`):
- Phase 2 (1 day): + Guard tools, Builder tools (7 → 10)
- Phase 3 (<1 day): + Analytics tools (10 → 12+)
- Phase 4 (postpone): SaaS Dashboard MCP integration

**Why P1 first:** Smallest scope, biggest visible win, no external dependencies (Guard API not needed).

### V2-M03 — Guard Integration

Per FA-09 (`> Status (v1.0.0): 🔵 SEPARATE TRACK`). Blocked on Guard MVP in `~/guard/guard/`:
- Phase 1 (G-M01): severity, action, violation, risk_summary
- Phase 2 (G-M02): REASK auto-remediation, fine-tuned sub-types
- After G-M01: integrate via SDK + MCP

### V2-M04 — TUI Architecture Decision

Per FA-07 (`> Status (v1.0.0): 🟡 OPEN QUESTION — нужно решение перед V2`):
- Option A: Keep TUI as separate entity
- Option B: Collapse TUI into single CLI binary
- Option C: Hybrid

See `docs/adr/ADR-007-tui-architecture-decision.md` for context. **Requires user input.**

---

## Phase 3 — Cloud Services ⏳ PLANNED (Month 3–4)

**Goal:** Add cloud services with free-tier limits. Account NOT required for offline.

| Service | Free tier | Source |
|---------|-----------|--------|
| Guard Service | 500 calls/мес | Hetzner GPU (Germany) |
| Hosted LLM | 50 calls/мес | Mistral (France), EU data residency |
| Cloud Scan | 5 scans/мес | Hetzner |
| SaaS Dashboard | 3 AI-systems | Separate repo `ai-act-compliance-platform` |
| SDK Layer 2 (Guard integration) | included | — |

Triggers:
- Guard MVP ready (G-M01 from `~/guard/guard/`)
- SaaS Dashboard MVP ready
- Hosted LLM infrastructure deployed

---

## Phase 4 — Paid Tiers ⏳ PLANNED (Month 7+)

Free tier remains unchanged. Paid for scale:

| Tier | Guard | Hosted LLM | Cloud Scan | Dashboard | Price |
|------|-------|-----------|-----------|-----------|-------|
| **Cloud Free** | 500/мес | 50/мес | 5/мес | 3 systems | €0 |
| **Growth** | 10K/мес | 500/мес | Unlimited | Unlimited + 10 users | €149/мес |
| **Enterprise** | 100K/мес | 5K/мес | Unlimited | + SSO + API | €499/мес |
| **Audit Package** | one-time | — | — | — | €2-5K |

Conversion triggers (per PRODUCT-VISION §4.8):
1. Guard limit (500/мес)
2. Hosted LLM limit (50/мес)
3. Cloud Scan limit (5/мес)
4. PDF for auditor
5. Vendor assessment (Art. 25)
6. Dashboard team access

---

## EU AI Act Coverage (current)

Per PRODUCT-VISION §6.1:

| Statute | Obligation | Product | Status |
|---------|-----------|---------|--------|
| Art. 4 | AI Literacy | Engine (L1) | ✅ |
| Art. 5 | Prohibited practices | Engine + SDK (138 patterns) | ✅ |
| Art. 9 | Risk management | Engine (Doc: Risk Register) | ✅ |
| Art. 10 | Data + governance | Engine + SDK | ✅ |
| Art. 11-12 | Tech docs, logs | Engine (Doc) | ✅ |
| Art. 14 | Human oversight | SDK (escalation, HITL Gate) | ✅ |
| Art. 26 | Deployer obligations | Engine (Passport) | ✅ |
| Art. 27 | FRIA | Engine + SaaS | ✅ |
| Art. 49 | EU DB registration | SaaS (D-F12) | ⏳ Phase 3 |
| Art. 50 | Transparency | SDK (disclosure, content marking) | ✅ |
| Art. 72 | Post-market monitoring | Engine (drift) | ✅ |
| Art. 73 | Incident reporting | SaaS (D-F11) | ⏳ Phase 3 |

**Coverage: ~65% automatic + ~25% template-assisted + ~10% manual via SaaS**

---

## Current Phase Decision Tree

```
v1.0.1 released ✅
       │
       ├── Track A: Launch momentum (1-3 days) ← RECOMMENDED FIRST
       │   ├── Mintlify docs sync ✅ DONE
       │   ├── Charter docs sync 🟡 IN PROGRESS (this file)
       │   ├── Show HN / Twitter / LinkedIn
       │   ├── README badges + GitHub polish
       │   └── CONTRIBUTING.md / SECURITY.md / UPGRADE-GUIDE.md
       │
       ├── Track B: V2-M02 MCP Enrichment (3-5 days) ← RECOMMENDED SECOND
       │   ├── Phase 2: Guard tools, Builder tools
       │   └── Phase 3: Analytics tools
       │
       ├── Track C: V2-M01 SDK Enrichment (5-10 days)
       │
       ├── Track D: TUI Architecture Decision (ADR-007)
       │   └── User input required
       │
       └── Background:
           ├── Guard MVP in ~/guard/guard/ (separate repo)
           ├── SaaS Dashboard in ai-act-compliance-platform (separate repo)
           └── Mintlify docs site (~/complior_doc/, separate repo)
```

---

## References

- `docs/PRODUCT-VISION.md` — what we're building, why
- `docs/PRODUCT-BACKLOG.md` — feature inventory (DEPRECATED — moved to feature-areas)
- `docs/V2-ROADMAP.md` — milestone-level V2 plan
- `docs/feature-areas/*.md` — per-subsystem architecture
- `docs/sprints/V1-M*.md` — V1 milestone history (V1-M01 → V1-M30.12)
- `docs/adr/ADR-*.md` — architecture decision records
- `docs/project-state.md` — living status (current snapshot)
- `docs/tech-debt.md` — open tech debt
- `CHANGELOG.md` — release notes (v0.8 → v1.0.1)

---

**Updated by:** Architect
**Next review:** When Phase 2 starts (after launch momentum + first user feedback)
