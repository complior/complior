# V1-M11: Command Restructuring (agent→passport, docs→fix)

**Status:** ✅ DONE (2498 tests GREEN, reviewer APPROVED 2026-04-14)
**Created:** 2026-04-13
**Deadline:** 2026-04-27 (2 weeks)
**Agents:** nodejs-dev (routes), rust-dev (CLI), architect (tests, docs)
**Feature Areas:** FA-04 (Passport), FA-03 (Fix)
**Branch:** feature/V1-M11-command-restructuring (create from dev after M07+M09 merged)
**Depends on:** V1-M07 merged, V1-M09 merged (both add `/agent/*` routes that need renaming)

---

## Context

### Problem

`complior agent` conflates two unrelated concerns:
1. **Passport management** — CRUD, validation, analysis, audit, export
2. **Document generation** — FRIA, Worker Notification, AI Policy, SoA, Risk Register

Document generation also lives in `complior fix` (Type B findings → auto-generate docs).
Two paths to the same result confuses users.

### Solution

Split `complior agent` into:
- **`complior passport`** — passport CRUD + analysis + audit + export
- **`complior fix --doc <type>`** — ALL document generation (proactive + reactive)

### Design Principles

1. **One command per concern.** Passport manages identity. Fix remediates gaps.
2. **Fix = all remediation.** Code fixes + document generation = one pipeline.
3. **`--doc` flag.** `complior fix` without `--doc` = auto-fix from scan. With `--doc <type>` = generate specific document.
4. **No breaking change to fix behavior.** `complior fix` alone still works as before.

---

## New Command Structure

### `complior passport` (renamed from `agent`)

```
complior passport init [path] [--force] [--json]
complior passport list [path] [--verbose] [--json]
complior passport show <name> [path] [--json]
complior passport rename <old> <new> [path] [--json]
complior passport validate [name] [path] [--ci] [--strict] [--verbose] [--json]
complior passport completeness <name> [path] [--json]
complior passport diff <name> [path] [--json]
complior passport import --from <format> <file> [path]
complior passport export <name> --format <a2a|aiuc-1|nist> [path] [--json]
complior passport autonomy [path] [--json]
complior passport readiness <name> [path] [--json]
complior passport registry [path] [--json]
complior passport permissions [path] [--json]
complior passport evidence [path] [--verify] [--json]
complior passport audit [--agent <name>] [--since] [--until] [--type] [--limit] [--json]
complior passport audit-package [path] [-o file]
```

16 subcommands. Pure passport management + governance.

### `complior fix --doc` (new flag, absorbs doc generation)

```
complior fix                                          # auto-fix from scan (unchanged)
complior fix --doc fria <name> [--organization "Acme"]
complior fix --doc notify <name> [--company "Acme"]
complior fix --doc policy <name> --industry <hr|finance|healthcare|...>
complior fix --doc soa <name> [--organization "Acme"]
complior fix --doc risk-register <name> [--organization "Acme"]
complior fix --doc test-gen <name>
complior fix --doc all <name> [--organization "Acme"]
complior fix --doc <any-type> <name>                  # generic doc by type
```

`--doc` triggers proactive document generation (requires passport name).
Without `--doc` = reactive fix from scan findings (existing behavior).

### HTTP Route Changes

| Before | After |
|--------|-------|
| `/agent/init` | `/passport/init` |
| `/agent/list` | `/passport/list` |
| `/agent/show` | `/passport/show` |
| `/agent/rename` | `/passport/rename` |
| `/agent/validate` | `/passport/validate` |
| `/agent/completeness` | `/passport/completeness` |
| `/agent/autonomy` | `/passport/autonomy` |
| `/agent/readiness` | `/passport/readiness` |
| `/agent/registry` | `/passport/registry` |
| `/agent/permissions` | `/passport/permissions` |
| `/agent/evidence` | `/passport/evidence` |
| `/agent/evidence/verify` | `/passport/evidence/verify` |
| `/agent/audit` | `/passport/audit` |
| `/agent/audit/summary` | `/passport/audit/summary` |
| `/agent/audit-package` | `/passport/audit-package` |
| `/agent/audit-package/meta` | `/passport/audit-package/meta` |
| `/agent/export` | `/passport/export` |
| `/agent/import` | `/passport/import` |
| `/agent/diff` | `/passport/diff` |
| `/agent/fria` | `/fix/doc/fria` |
| `/agent/notify` | `/fix/doc/notify` |
| `/agent/policy` | `/fix/doc/policy` |
| `/agent/soa` | `/fix/doc/soa` |
| `/agent/risk-register` | `/fix/doc/risk-register` |
| `/agent/test-gen` | `/fix/doc/test-gen` |
| `/agent/doc` | `/fix/doc/generate` |
| `/agent/doc/all` | `/fix/doc/all` |

Total: 19 → `/passport/*`, 8 → `/fix/doc/*`

---

## Предусловия среды (architect обеспечивает):

- [ ] V1-M07 merged to dev (ISO 42001 generators exist)
- [ ] V1-M09 merged to dev (onboarding enrichment exists)
- [ ] npm install + npm test запускается
- [ ] cargo build компилируется
- [ ] RED тесты закоммичены

---

## Tasks

### T-1: Architect — Update E2E test URLs + RED specs (architect)

Update all E2E test files to use new route paths:
- `agent-flags-e2e.test.ts` → all `/agent/*` URLs → `/passport/*` or `/fix/doc/*`
- `passport-pipeline-e2e.test.ts` → `/agent/*` → `/passport/*`
- `gaps-e2e.test.ts` → any `/agent/*` refs
- `ux-quality.test.ts` → any `/agent/*` refs
- `iso42001-e2e.test.ts` → `/agent/soa` → `/fix/doc/soa`, `/agent/risk-register` → `/fix/doc/risk-register`

Tests become RED (old URLs still in implementation).

**Files:** `engine/core/src/e2e/*.test.ts`
**Verification:** Tests FAIL with "404 Not Found" (routes not renamed yet)

### T-2: Architect — Update acceptance scripts (architect)

- `scripts/verify_agent_cli.sh` → rename to `verify_passport_cli.sh`
- Update all `complior agent` → `complior passport`
- Update doc-gen tests to use `complior fix --doc`
- `scripts/verify_fria_flow.sh` → update to `complior fix --doc fria`

**Files:** `scripts/verify_*.sh`
**Verification:** Scripts FAIL (CLI commands not renamed yet)

### T-3: TS — Rename agent routes → passport routes (nodejs-dev)

1. Rename `agent.route.ts` → `passport.route.ts`
2. Rename `createAgentRoute()` → `createPassportRoute()`
3. Change all 19 route paths: `/agent/*` → `/passport/*`
4. Update `create-router.ts` wiring
5. Update composition-root.ts import

**Files:**
- `engine/core/src/http/routes/agent.route.ts` → `passport.route.ts`
- `engine/core/src/http/create-router.ts`
- `engine/core/src/composition-root.ts`

**Verification:** Unit tests `passport.route.ts` GREEN, E2E `/passport/*` routes respond 200

### T-4: TS — Create fix doc routes (nodejs-dev)

1. Add 8 doc routes to `fix.route.ts` (or new `fix-doc.route.ts`)
2. Routes: `/fix/doc/fria`, `/fix/doc/notify`, `/fix/doc/policy`, `/fix/doc/soa`, `/fix/doc/risk-register`, `/fix/doc/test-gen`, `/fix/doc/generate`, `/fix/doc/all`
3. All routes call same PassportService methods as before
4. Wire in create-router.ts

**Files:**
- `engine/core/src/http/routes/fix.route.ts` (or new `fix-doc.route.ts`)
- `engine/core/src/http/create-router.ts`

**Verification:** E2E `/fix/doc/*` routes respond 200, old `/agent/fria` etc return 404

### T-5: Rust CLI — Rename Agent → Passport (rust-dev)

1. `cli.rs`: `Agent { action: AgentAction }` → `Passport { action: PassportAction }`
2. `AgentAction` enum → `PassportAction` (remove doc-gen variants: Fria, Notify, Policy, TestGen)
3. `headless/agent.rs` → `headless/passport.rs`
4. Rename all handlers: `run_agent_init()` → `run_passport_init()` etc
5. Update all HTTP client URLs: `/agent/*` → `/passport/*`
6. `main.rs`: match `Command::Agent` → `Command::Passport`

**Files:**
- `cli/src/cli.rs`
- `cli/src/headless/agent.rs` → `passport.rs`
- `cli/src/headless/mod.rs`
- `cli/src/main.rs`

**Verification:** `cargo test` GREEN, `complior passport --help` shows subcommands

### T-6: Rust CLI — Add `fix --doc` flag (rust-dev)

1. Add `--doc <type>` flag to Fix command in cli.rs
2. Add `--name <passport-name>` required when `--doc` is used
3. Add `--organization`, `--industry` optional flags for doc generation
4. Implement in `headless/fix.rs`:
   - If `--doc` present → call `/fix/doc/<type>` endpoint
   - If `--doc` absent → existing fix behavior (unchanged)

**Files:**
- `cli/src/cli.rs` (Fix command flags)
- `cli/src/headless/fix.rs` (add doc generation handler)

**Verification:** `complior fix --doc fria my-bot --help` works, `cargo test` GREEN

### T-7: Rust types — Update engine.rs structs (architect)

If any Rust types reference "agent" in struct/field names that should be "passport":
- Check `cli/src/types/engine.rs` for `Agent*` → `Passport*` renames (only if needed)

**Files:** `cli/src/types/engine.rs`
**Verification:** `cargo test` GREEN

### T-8: Docs + CLAUDE.md update (architect)

Update all documentation:
- `CLAUDE.md` — command table
- `README.md` — CLI examples
- `CHANGELOG.md` — note the restructuring
- `docs/TUI-DESIGN-SPEC.md` — CLI section
- `docs/FEATURE-AGENT-PASSPORT.md` — command references
- `docs/feature-areas/passport-architecture.md`
- `docs/FILE-MAP.md`

**Files:** All docs referencing `complior agent`
**Verification:** No `complior agent` in any doc (except historical notes)

---

## Blast Radius

| Category | Files | Impact |
|----------|-------|--------|
| Rust CLI (cli.rs, agent.rs, main.rs) | 4 files, ~3000 lines | rename + restructure |
| TS routes (agent.route.ts, fix.route.ts) | 3 files, ~600 lines | split + rename |
| TS wiring (create-router.ts, composition-root.ts) | 2 files | import updates |
| E2E tests | 5 files | URL pattern updates |
| Acceptance scripts | 3 files | command name updates |
| Documentation | 40+ files | `complior agent` → `complior passport` |
| Rust CLI unit tests | ~15 tests in cli.rs | command parsing updates |

---

## Verification Plan

1. **Unit tests:**
   - `npx vitest run src/http/routes/passport.route.test.ts` — all GREEN (if unit tests exist)
   - `cargo test` — all GREEN
2. **E2E tests:**
   - `npx vitest run src/e2e/agent-flags-e2e.test.ts` — all GREEN with `/passport/*` URLs
   - `npx vitest run src/e2e/iso42001-e2e.test.ts` — all GREEN with `/fix/doc/*` URLs
3. **Acceptance:**
   - `bash scripts/verify_passport_cli.sh` — PASS
4. **Regression:**
   - `npx vitest run` — all existing tests pass (only new RED intentionally)
   - `cargo test` — all pass
5. **Manual:**
   - `grep -r "complior agent" docs/` — returns 0 results (except historical notes)
   - `grep -r "/agent/" engine/core/src/http/` — returns 0 results

---

## Task Summary

| # | Task | Agent | Method | Key Files |
|---|------|-------|--------|-----------|
| T-1 | Update E2E test URLs | architect | RED tests (404 on old URLs) | `e2e/*.test.ts` |
| T-2 | Update acceptance scripts | architect | scripts FAIL | `scripts/verify_*.sh` |
| T-3 | Rename `/agent/*` → `/passport/*` routes | nodejs-dev | E2E GREEN | `passport.route.ts` |
| T-4 | Create `/fix/doc/*` routes | nodejs-dev | E2E GREEN | `fix.route.ts` |
| T-5 | Rename Agent → Passport in CLI | rust-dev | `cargo test` GREEN | `cli.rs`, `passport.rs` |
| T-6 | Add `fix --doc` flag | rust-dev | `cargo test` GREEN | `cli.rs`, `fix.rs` |
| T-7 | Update Rust types if needed | architect | `cargo test` GREEN | `engine.rs` |
| T-8 | Update all documentation | architect | grep returns 0 | docs/*.md |
