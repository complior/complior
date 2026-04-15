# V1-M13: Rust CLI Route Cleanup (`/agent/` → `/passport/` + `/fix/doc/`)

**Status:** DONE
**Branch:** `feature/V1-M13-route-cleanup`
**Tests:** 10 new route_cleanup tests GREEN, 188 total GREEN, 0 clippy warnings

## Context

V1-M11 renamed engine routes: `/agent/*` → `/passport/*` and `/fix/doc/*`.
V1-M12 deleted `agent.route.ts` from the engine (0 routes on `/agent/*`).
But the Rust CLI still called `/agent/*` in 12 reachable locations → all returned 404.
Additionally, `agent.rs` (2557 lines) was dead code and `passport.rs` had 4 dead functions.

**Impact fixed:** `complior init` agent discovery, TUI passport view, `eval --agent` — all now call correct routes.

## Completed Tasks

### T-1: Delete dead `agent.rs`
- Deleted `cli/src/headless/agent.rs` (2557 lines, not in mod.rs, unreachable)

### T-2: Delete 4 dead functions from `passport.rs`
- `run_passport_fria()` — called `/passport/fria` (doesn't exist)
- `run_passport_notify()` — called `/passport/notify` (doesn't exist)
- `run_passport_policy()` — called `/passport/policy` (doesn't exist)
- `run_passport_test_gen()` — called `/passport/test-gen` (doesn't exist)

### T-3: Fix 11 `/agent/` route strings in reachable code

| File | Route | Replacement |
|------|-------|-------------|
| `commands.rs` | `POST /agent/init` | `/passport/init` |
| `executor.rs` | `/agent/list?path={}` | `/passport/list?path={}` |
| `executor.rs` | `/agent/completeness?path={}` | `/passport/completeness?path={}` |
| `executor.rs` | `/agent/validate?path={}` | `/passport/validate?path={}` |
| `executor.rs` | `/agent/fria` | **`/fix/doc/fria`** |
| `executor.rs` | `/agent/show?path={}` | `/passport/show?path={}` |
| `executor.rs` | `/agent/registry?path={}` | `/passport/registry?path={}` |
| `executor.rs` | `/agent/audit?path={}` | `/passport/audit?path={}` |
| `eval.rs` | `/agent/show?path={}` | `/passport/show?path={}` |
| `eval.rs` | `/agent/init` | `/passport/init` |
| `scan.rs` | `/agent/list?path={}` | `/passport/list?path={}` |

### T-4: Fix 18 `"complior agent"` user messages → `"complior passport"`

| File | Count |
|------|-------|
| `passport.rs` | 9 |
| `executor.rs` | 3 |
| `commands.rs` | 2 |
| `format/report.rs` | 2 |
| `scan.rs` | 1 |
| `views/passport/mod.rs` | 1 |

### T-5: Unit tests (10 tests)
- 5 no-agent-routes tests (executor, commands, eval, scan, passport)
- 1 FRIA route test (executor → `/fix/doc/fria`)
- 4 dead-function-deleted tests (fria, notify, policy, test_gen)

### T-6: Acceptance script
- `scripts/verify_no_agent_routes.sh` — 3 checks, all PASS

## Verification

| Check | Result |
|-------|--------|
| `cargo test route_cleanup` — 10 tests | GREEN |
| `cargo test` — 188 tests | GREEN |
| `cargo clippy -- -D warnings` | 0 warnings |
| `bash scripts/verify_no_agent_routes.sh` | PASS |
| `grep -r '"/agent/' cli/src/ --include='*.rs' \| grep -v test` | 0 production hits |

## Lines of code removed

- `agent.rs`: **2557 lines** deleted (dead code)
- `passport.rs`: **~290 lines** deleted (4 dead functions)
- **Total: ~2847 lines removed**
