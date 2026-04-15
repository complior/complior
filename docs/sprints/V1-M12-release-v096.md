# V1-M12: Release v0.9.6

**Status:** 🔴 RED (specs written, awaiting implementation)
**Created:** 2026-04-15
**Target:** Ship v0.9.6 — feature-complete pre-release
**Agents:** rust-dev (T-1), nodejs-dev (T-2), architect (T-3..T-8)
**Feature Areas:** All (release milestone)
**Branch:** feature/V1-M12-release-v096

---

## Context

### Why now

All v1.0 scope commands and flags are implemented (M01..M11 merged into dev).
2498 tests GREEN. One code gap found: Rust CLI `VALID_DOC_TYPES` missing ISO 42001 types.
Documentation still references old `complior agent` commands (TD-28: 240 refs in 29 files).
Version 0.9.5 → 0.9.6 with all fixes.

### What remains

3 categories:
1. **Code fix** — Rust CLI doc types allowlist (3 missing types)
2. **Dead code removal** — `agent.route.ts` deprecated stub (TD-26), unused import (TD-12)
3. **Release ceremony** — docs update (TD-28), version bump, CHANGELOG, PR

---

## Предусловия среды (architect обеспечивает):

- [x] npm install в engine/core
- [x] cargo build компилируется
- [x] npm test запускается (0 failures)
- [x] cargo test запускается (174 GREEN)
- [x] Все feature branches merged в dev
- [x] RED тест закоммичен: `cli/src/headless/fix.rs` (Rust #[test])
- [ ] E2E тест: `iso42001-e2e.test.ts` уже GREEN (engine-side)

---

## Tasks

### T-1: Add ISO 42001 doc types to Rust CLI allowlist (rust-dev)

**Time:** 15 min | **Risk:** Low

**Problem:** `VALID_DOC_TYPES` in `cli/src/headless/fix.rs` and `cli/src/headless/doc.rs`
contains only 14 EU AI Act types. Missing 3 ISO 42001 types:
- `iso42001-ai-policy`
- `iso42001-soa`
- `iso42001-risk-register`

This means `complior fix --doc iso42001-soa` returns validation error even though
the engine routes (`/fix/doc/soa`, `/fix/doc/risk-register`, `/fix/doc/generate`) work fine.

**Files to change:**
- `cli/src/headless/fix.rs` line 1323-1338 — add 3 entries to `VALID_DOC_TYPES`
- `cli/src/headless/doc.rs` line 6-21 — add 3 entries to `VALID_DOC_TYPES`

**RED test:** `cli/src/headless/fix.rs` — `#[test] fn valid_doc_types_includes_iso42001()`

**Verification:** `cargo test valid_doc_types` → GREEN

---

### T-2: Remove deprecated agent.route.ts + unused import (nodejs-dev)

**Time:** 10 min | **Risk:** Low

**2a) Remove `agent.route.ts`** (TD-26):
- Delete `engine/core/src/http/routes/agent.route.ts` (31 lines, deprecated stub)
- Remove `createAgentRoute` from `composition-root.ts` (import + wiring)
- Remove `/agent/*` mount point from composition root

**2b) Remove unused import** (TD-12):
- `engine/core/src/http/routes/scan.route.ts` — remove unused `buildPriorityActions` import

**Verification:** `npx vitest run` — all GREEN, no import errors

---

### T-3: Docs update — replace `complior agent` → `complior passport` (architect)

**Time:** 1-2 hours | **Risk:** Low (docs only)

TD-28: 240 references across 29 docs still use old `complior agent` commands.

**Bulk replacements:**
- `complior agent init` → `complior passport init`
- `complior agent list` → `complior passport list`
- `complior agent show` → `complior passport show`
- `complior agent validate` → `complior passport validate`
- `complior agent completeness` → `complior passport completeness`
- `complior agent fria` → `complior fix --doc fria`
- `complior agent soa` → `complior fix --doc iso42001-soa`
- `complior agent risk-register` → `complior fix --doc iso42001-risk-register`
- `complior agent evidence` → `complior passport evidence`
- `complior agent export` → `complior passport export`
- `complior agent audit` → `complior passport audit`
- `complior agent policy` → `complior fix --doc policy`
- `complior agent notify` → `complior fix --doc notify`
- `/agent/init` → `/passport/init` (HTTP routes)
- `/agent/list` → `/passport/list`
- `/agent/show` → `/passport/show`
- `/agent/fria` → `/fix/doc/fria`
- `/agent/soa` → `/fix/doc/soa`
- `/agent/risk-register` → `/fix/doc/risk-register`
- `AgentAction` → `PassportAction` (where referring to CLI enum)

**Files:** All `docs/*.md` files containing old references.

**Verification:** `grep -rl "complior agent" docs/ | wc -l` → 0

---

### T-4: Close V1-M07 milestone (architect)

**Time:** 5 min

- Update `docs/sprints/V1-M07-iso42001-documents.md` status → ✅ DONE
- Note: T-7 (Rust CLI) covered by V1-M11 command restructuring + V1-M12 T-1

---

### T-5: Ratify tech debt items (architect)

**Time:** 10 min

Ratify (close) the following TD items where dev's changes were correct:
- TD-7: Programmer added conformity-score test — correct spec, ratify
- TD-8: Test fixture category string correction — correct, ratify
- TD-9: bare-llm severity change — policy correct, ratify
- TD-16: E2E test setup modification — infra fix, ratify

---

### T-6: Version bump 0.9.5 → 0.9.6 (architect)

**Time:** 5 min

3 files, atomic update:
- `Cargo.toml` — workspace version
- `engine/core/package.json` — version field
- `engine/npm/package.json` — version field

**Verification:** CI version-check job passes (all 3 match)

---

### T-7: CHANGELOG.md update (architect)

**Time:** 15 min

Update `[Unreleased]` → `[0.9.6] - 2026-04-15` with:

### Added
- ISO 42001 document generators: SoA, Risk Register, AI Policy (V1-M07)
- Context-aware scan with profile filters and risk-level filtering (V1-M08)
- Onboarding enrichment: 9 questions, dynamic obligations, GPAI auto-detect (V1-M09)
- Score transparency: disclaimer, category breakdown, profile-aware actions (V1-M10)
- `complior status` command with compliance posture overview (V1-M10)
- `complior passport` commands (renamed from `complior agent`) (V1-M11)
- Document generation via `complior fix --doc <type>` (V1-M11)
- `complior init --reconfigure` for profile updates (V1-M09)

### Changed
- **BREAKING:** `complior agent` renamed to `complior passport`
- **BREAKING:** Document generation moved from `/agent/*` to `/fix/doc/*`
- Score top-actions limit increased from 3 to 5

### Fixed
- Rust CLI doc types allowlist now includes ISO 42001 types (V1-M12)
- Agent discovery no longer parses non-path route strings (TD-14)
- Rust CLI routes corrected: `/passport/doc` → `/fix/doc/generate` (TD-27)

### Removed
- Deprecated `/agent/*` HTTP routes (return 404 since V1-M11, now removed)

---

### T-8: Final test gate + PR (architect)

**Time:** 15 min

```bash
cd engine/core && npx vitest run          # 2194+ GREEN
cd engine/core && npm run test:e2e        # 130+ GREEN
cd cli && cargo test                       # 174+ GREEN
cd cli && cargo clippy -- -D warnings     # 0 warnings
```

Create PR: `feature/V1-M12-release-v096` → `dev`

**Verification:** All 4 commands pass

---

## Dependency Graph

```
     ┌─────────────────────────────────────────────┐
     │          PHASE 1 (parallel)                   │
     │                                               │
     │  rust-dev           nodejs-dev                │
     │  ┌────────────┐    ┌─────────────────────┐   │
     │  │ T-1: Add   │    │ T-2: Remove agent  │   │
     │  │ ISO 42001  │    │ route + unused      │   │
     │  │ doc types  │    │ import              │   │
     │  │ 15 min     │    │ 10 min              │   │
     │  └────────────┘    └─────────────────────┘   │
     └──────────┬────────────────────┬──────────────┘
                │                    │
                ▼                    ▼
     ┌─────────────────────────────────────────────┐
     │          PHASE 2 (architect, sequential)      │
     │                                               │
     │  ┌────────────────────────────────────────┐  │
     │  │ T-3: Docs update (complior agent →     │  │
     │  │      complior passport) — 1-2 hours    │  │
     │  ├────────────────────────────────────────┤  │
     │  │ T-4: Close M07 milestone               │  │
     │  ├────────────────────────────────────────┤  │
     │  │ T-5: Ratify TD-7/8/9/16               │  │
     │  ├────────────────────────────────────────┤  │
     │  │ T-6: Version bump → 0.9.6             │  │
     │  ├────────────────────────────────────────┤  │
     │  │ T-7: CHANGELOG update                  │  │
     │  └────────────────────────────────────────┘  │
     └──────────────────┬──────────────────────────┘
                        │
                        ▼
     ┌─────────────────────────────────────────────┐
     │          PHASE 3 (gate + ship)                │
     │                                               │
     │  architect              user                  │
     │  ┌────────────────┐    ┌──────────────────┐  │
     │  │ T-8: Test gate │───▶│ Merge PR         │  │
     │  │ + create PR    │    │ Tag v0.9.6       │  │
     │  └────────────────┘    └──────────────────┘  │
     └─────────────────────────────────────────────┘
```

---

## NOT in scope (post v0.9.6)

- SDK (@complior/sdk) — separate release track
- TD-13: O(n²) performance in applyProfileFilters
- TD-22: Silent error swallowing in status-service
- TD-25: E2E test parallelism (works with split config)
- TD-29: doc.rs / fix.rs deduplication
- Guard API, Chat, Daemon features
- Version 1.0.0 (next milestone after 0.9.6 stabilization)

---

## Task Summary

| # | Task | Agent | Method | Key Files |
|---|------|-------|--------|-----------|
| T-1 | Add ISO 42001 doc types to Rust CLI | rust-dev | RED test: `valid_doc_types_includes_iso42001` GREEN | `fix.rs`, `doc.rs` |
| T-2 | Remove agent.route.ts + unused import | nodejs-dev | `npx vitest run` GREEN, no import errors | `agent.route.ts`, `composition-root.ts`, `scan.route.ts` |
| T-3 | Docs update (agent → passport) | architect | `grep -rl "complior agent" docs/` → 0 results | `docs/*.md` |
| T-4 | Close M07 milestone | architect | M07 status → DONE | `V1-M07-iso42001-documents.md` |
| T-5 | Ratify TD-7/8/9/16 | architect | project-state updated | `project-state.md` |
| T-6 | Version bump → 0.9.6 | architect | CI version-check PASS | `Cargo.toml`, `package.json` ×2 |
| T-7 | CHANGELOG update | architect | [0.9.6] section exists | `CHANGELOG.md` |
| T-8 | Final test gate + PR | architect | all suites GREEN | — |

## Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| `complior fix --doc iso42001-soa` accepted by CLI | T-1 |
| No `/agent/*` route in codebase | T-2 |
| `grep -rl "complior agent" docs/` → 0 | T-3 |
| V1-M07 status = DONE | T-4 |
| TD-7/8/9/16 = RATIFIED | T-5 |
| Version = 0.9.6 in all 3 files | T-6 |
| CHANGELOG has [0.9.6] section | T-7 |
| `npx vitest run` → 2194+ GREEN | T-8 |
| `npm run test:e2e` → 130+ GREEN | T-8 |
| `cargo test` → 174+ GREEN | T-8 |
| `cargo clippy -- -D warnings` → 0 | T-8 |
| PR created: feature/V1-M12-release-v096 → dev | T-8 |
