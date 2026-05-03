# V2-ROADMAP.md — Post-v1.0 Milestone Plan

**Status:** Planning
**Created:** 2026-05-03 (post v1.0.1 release)
**Owner:** Architect (milestones), user (priority + go/no-go)
**Pairs with:** `docs/STRATEGY.md` (phases, big picture), `docs/feature-areas/*.md` (per-subsystem detail)

> **Purpose:** Consolidate all V2-M0X tracks referenced across Feature Areas (`POST-v1.0.0`, `V2-M01`, `V2-M02`, etc.) into a single milestone-level plan.

---

## Quick reference

| Milestone | Owner FA | Effort | Depends on | Priority | Status |
|-----------|----------|--------|------------|----------|--------|
| **V2-M01** | FA-06 SDK | 5–10 days | — | P1 | 📋 Planning |
| **V2-M02** | FA-08 MCP | 3–5 days | — | **P1 — recommended first** | 📋 Planning |
| **V2-M03** | FA-09 Guard | TBD (per Guard MVP) | Guard G-M01 ready | P2 | ⏸ Blocked |
| **V2-M04** | FA-07 TUI | TBD | ADR-007 user decision | P2 | 🟡 Decision pending |
| **V2-M05** | FA-10 Contracts | TBD | SaaS deploy | P2 | ⏸ Blocked |
| **V2-M06** | FA-11 Sync | TBD | V2-M05 done | P2 | ⏸ Blocked |
| **V2-M07** | (Cloud) | TBD | Hetzner GPU + Mistral provisioning | P2 | ⏸ Blocked (Phase 3) |

---

## V2-M01 — SDK Layer 2 Enrichment

**Owner FA:** FA-06 (`docs/feature-areas/sdk-architecture.md`)
**Status quo (v1.0.0/v1.0.1):** 🟡 BASE VERSION — 14 hooks shipped in S05.
**V2-M01 scope:** Full enrichment.

### Goals

- Enrich the existing 14 hooks with deeper functionality
- HTTP middleware enhancements (header propagation, retry/backoff)
- Hook composition improvements (priority ordering, conditional skip)
- Per-domain enrichment (HR, finance, healthcare, education, legal, content)
- Layer 2 prep — hook contracts ready for Guard API integration in V2-M03

### Subtasks (preliminary, refine in milestone spec)

- T-1: HTTP middleware (`engine/sdk/src/middleware/http.ts`) — header propagation through provider adapters
- T-2: Hook composition (`engine/sdk/src/hooks/compose.ts`) — priority + conditional + interleaving
- T-3: Domain hooks enrichment — extend HR/finance/healthcare/education/legal hooks with V1 SDK pattern lessons
- T-4: Layer 2 readiness — abstract Guard API interface (interface only, no implementation in V2-M01)
- T-5: Test coverage uplift — SDK tests 414 → target 500

### Acceptance criteria

- All 14 hooks have updated docs reflecting V2-M01 enrichment
- Hook composition supports priority ordering with deterministic execution
- Per-domain hooks add 3+ new patterns each
- 0 breaking changes to v1.0 SDK API (semver: minor bump 1.0.x → 1.1.0)

---

## V2-M02 — MCP Enrichment ⭐ RECOMMENDED FIRST

**Owner FA:** FA-08 (`docs/feature-areas/mcp-architecture.md`)
**Status quo (v1.0.0/v1.0.1):** 🟡 BASE VERSION — 7 tools shipped (note: charter docs say 8 — outdated; actual count from `engine/core/src/mcp/tools.ts` is 7).
**V2-M02 scope:** Phases 2-3 from FA-08; Phase 4 deferred to Cloud.

### Goals (per FA-08)

- **Phase 2 (1 day):** Add Guard tools + Builder tools → 7 → 10 tools
- **Phase 3 (<1 day):** Add Analytics tools → 10 → 12+ tools
- **Phase 4 (deferred):** SaaS Dashboard MCP — wait until SaaS deployed

### Why first

- Smallest scope, biggest visible win
- 0 external dependencies (no Guard API needed for Phase 2-3)
- MCP is differentiator vs SaaS-only competitors
- AI agents (Claude Code, Cursor, Windsurf) immediately benefit from richer tool surface

### Proposed new tools

Per FA-08 + post-launch user feedback:

| Tool | Purpose | Phase |
|------|---------|-------|
| `complior_passport_init` | Generate Agent Passport from current project | 2 (Builder) |
| `complior_doc_generate` | Generate FRIA / AI Policy / Risk Register / etc. | 2 (Builder) |
| `complior_redteam` | Trigger 300+ adversarial probes against an endpoint | 2 (Builder) |
| `complior_evidence_verify` | Verify evidence chain integrity | 3 (Analytics) |
| `complior_drift_detect` | Compare current scan vs previous, report drift | 3 (Analytics) |
| `complior_obligations_status` | Per-obligation coverage breakdown | 3 (Analytics) |

### Acceptance criteria

- 7 → 12 tools live
- Updated `mcp/tools-reference.mdx` (Mintlify) covers all 12
- Smoke test: agent calls each new tool from Claude Code conversation
- 0 breaking changes to v1.0 MCP API

---

## V2-M03 — Guard Service Integration

**Owner FA:** FA-09 (`docs/feature-areas/guard-integration.md`)
**Status quo (v1.0.0/v1.0.1):** 🔵 SEPARATE TRACK — Guard MVP in `~/guard/guard/` (separate repo, separate roadmap).
**V2-M03 scope:** Integration after Guard G-M01 ships.

### Blocked on

- Guard MVP G-M01 (Phase 1): severity, action, violation, risk_summary outputs
- Guard MVP G-M02 (Phase 2): REASK auto-remediation, fine-tuned sub-types

### Subtasks

- Add Guard API client to engine/core/src/infra/guard-adapter.ts
- Wire Guard hooks into SDK middleware (Layer 2 from V2-M01)
- Add Guard tools to MCP (depends on V2-M02 Phase 2 done)
- Add Guard config to project.toml + global settings.toml
- Free-tier rate limiting (500 calls/мес on Hetzner GPU)

### Acceptance criteria

- SDK can route prohibited/sanitize/bias hooks through Guard with fallback to local hooks if API down
- MCP exposes 2-3 Guard tools (e.g. `complior_guard_check`)
- TUI shows Guard call usage / quota in Dashboard
- 0 breaking changes if Guard API unreachable (graceful degradation)

---

## V2-M04 — TUI Architecture Decision

**Owner FA:** FA-07 (`docs/feature-areas/tui-architecture.md`)
**Status quo (v1.0.0/v1.0.1):** 🟡 OPEN QUESTION.
**V2-M04 scope:** Architectural decision before V2 work begins.

### Context

Per FA-07: "нужно решение: оставлять как отдельную сущность или схлопнуть с CLI/Daemon. Решение перед V2."

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A. Keep separate** (status quo) | TUI is independent feature, can be removed via cargo feature gate | Single binary already includes TUI; "separate" is more conceptual than physical |
| **B. Collapse into CLI binary** | Smaller mental model, TUI is just `complior` no-args command | Already the case in practice — flag changes nothing |
| **C. Hybrid** | Modular TUI as optional npm package (`@complior/tui`), CLI works without | Doubles distribution surface; npm package would need its own release pipeline |

### Decision required

See `docs/adr/ADR-007-tui-architecture-decision.md` for full context. **Requires user input.**

### After decision

- Update FA-07 with chosen status (DECIDED — Option X)
- Mark ADR-007 as ACCEPTED with rationale
- Plan execution milestone if architecture change needed (likely 1-2 days)

---

## V2-M05 — Contract Layer E2E Verification

**Owner FA:** FA-10 (`docs/feature-areas/contract-layer.md`)
**Status quo (v1.0.0/v1.0.1):** ✅ IMPLEMENTED — `@complior/contracts` shipped, CLI pre-send validation.
**V2-M05 scope:** Real-world end-to-end sync verification.

### Blocked on

- SaaS Dashboard deployed (separate repo `ai-act-compliance-platform`)
- Cloud Sync API endpoint live

### Subtasks

- Wire CLI sync command (`complior sync push/pull`) against live SaaS endpoint
- Round-trip test: passport created on CLI → synced to SaaS → modified on SaaS → pulled back
- Schema drift detection (CLI version N vs SaaS version M)
- Conflict resolution UX

### Acceptance criteria

- 100% round-trip fidelity for `passport`, `findings`, `documents`, `evidence` schemas
- Schema drift surfaces clear error message ("CLI v1.x cannot sync to SaaS v2.x — upgrade")
- E2E acceptance script `scripts/verify_sync_e2e.sh` PASS

---

## V2-M06 — Sync Architecture Hardening

**Owner FA:** FA-11 (`docs/feature-areas/sync-architecture.md`)
**Status quo (v1.0.0/v1.0.1):** 🔵 CONTRACT ONLY — schema + pre-send validation.
**V2-M06 scope:** Production-grade sync with retry, conflict resolution, offline queue.

### Subtasks

- Offline queue (sync requests stored locally when SaaS unreachable)
- Idempotency keys for all sync operations
- Optimistic concurrency control (passport version field)
- Background sync worker in daemon (every N minutes when daemon running)

---

## V2-M07 — Cloud Services (Phase 3 trigger)

**Owner:** Multiple (Guard + Hosted LLM + Cloud Scan + SaaS Dashboard)
**Status quo (v1.0.0/v1.0.1):** ⏳ PLANNED for Month 3-4.
**V2-M07 scope:** Free-tier launch.

### Blocked on

- Hetzner GPU provisioning (Germany)
- Mistral hosted endpoint (France, EU data residency)
- WorkOS auth integration
- Brevo email setup
- Plausible analytics

See `docs/STRATEGY.md` Phase 3 for full service inventory.

---

## Cross-cutting concerns (any milestone)

### Documentation

For every V2-M0X milestone:
- Update relevant Feature Area status `🟡 BASE → ✅ ENRICHED` (or similar)
- Add Mintlify docs page or extend existing
- Update CHANGELOG with full feature list
- Bump version per semver (minor for new features, patch for fixes)

### Tests

For every V2-M0X milestone:
- RED→GREEN unit test cycle (architect writes RED, dev makes GREEN)
- E2E acceptance script `scripts/verify_v2_mNN.sh`
- Update test count in PROJECT-STATE.md and CLAUDE.md
- /deep-e2e cycle if user-visible changes

### Release

For minor version bumps (V2-M01/V2-M02):
- Bump 5 manifests (workspace Cargo.toml + 4 package.json)
- Update CHANGELOG.md with new entry
- Cherry-pick (if hotfix) or merge dev → release branch
- PR `release/v1.x.0 → main`
- Tag `v1.x.0`, push → triggers `release.yml` (5 builds + crates.io + npm + GitHub Release + smoke)

See `docs/RELEASE-PROCESS.md` for detail.

---

## Decision log

| Date | Decision | Owner |
|------|----------|-------|
| 2026-05-03 | V2-M02 chosen as recommended first track (smallest scope, biggest UX win, no external deps) | Architect proposal |
| (pending) | V2-M04 TUI architecture decision | User |
| (pending) | V2-M01 vs V2-M03 priority after V2-M02 done | User (informed by post-launch feedback) |

---

**Updated by:** Architect
**Next review:** After Phase 1.5 (launch momentum) settles and first user feedback arrives
