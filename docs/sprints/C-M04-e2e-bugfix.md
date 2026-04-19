# C-M04: E2E Bug Fix Sprint

**Status:** ✅ DONE (34/34 PASS — all unit + E2E GREEN)
**Created:** 2026-04-19
**Depends on:** C-M03 ✅ DONE
**Feature Areas:** FA-02 (Eval), FA-04 (Passport), FA-01 (Scanner), FA-07 (TUI)
**Goal:** Fix all 19 issues found in E2E test report (3 critical + 7 bugs + 5 UX + 4 inconsistencies)
**Source:** `docs/E2E-TEST-REPORT-2026-04-19.md`

---

## Context

Full E2E test against `eval-target` project revealed the core scan/fix/report pipeline is solid, but eval, passport, and UX have critical issues. This sprint resolves ALL of them before v1.0 release.

## Scope Split by Agent

### nodejs-dev (Engine): 3 tasks
- T-1: Fix eval auto-detect adapter (B-01)
- T-2: Fix `fix --doc all` doc-type handling (B-04)
- T-3: Fix passport autonomy 500 error (B-08)

### rust-dev (CLI): 10 tasks
- T-4: Fix `--fail-on` gate outside `--ci` block (B-02)
- T-5: Fix score consistency — COMPLIANCE SCORE = Framework score (B-03 + I-01)
- T-6: Fix passport validate completeness display (B-07)
- T-7: Fix passport permissions "No agents found" (B-09)
- T-8: Fix passport registry "No agents found" (B-10)
- T-9: Fix Quick Actions — remove nonexistent commands (U-02)
- T-10: Fix weight display 900% → 9% (U-01)
- T-11: Fix `fix --dry-run` estimated score (U-03)
- T-12: Allow `openai://` protocol hints in CLI URL validation (U-05)
- T-13: Fix passport init name handling (B-06)

---

## Task Details

### T-1: Eval Auto-Detect — URL Path Heuristic (B-01) — CRITICAL

**File:** `engine/core/src/domain/eval/adapters/auto-detect.ts`
**Root cause:** Auto-detect probes `/v1/models` → 404 → falls back to HTTP adapter (sends `{message}` instead of OpenAI `{messages}`). 176/176 eval tests fail.

**Fix:**
1. Before fallback, add URL path heuristic: if URL contains `/v1/chat/completions` → use OpenAI adapter directly
2. As secondary detection: try POST to `/v1/chat/completions` with minimal OpenAI payload → if 200 → use OpenAI adapter

**Test spec:** `engine/core/src/domain/eval/adapters/adapters.test.ts` — 3 new tests
**Agent:** nodejs-dev

### T-2: Fix `--doc all` (B-04)

**File:** `engine/core/src/http/routes/fix.route.ts` (or Rust CLI validation)
**Root cause:** `VALID_DOC_TYPES` array in CLI doesn't include `"all"`. Help says `--doc all` works.

**Fix:** Add `"all"` to validation OR handle it as special case that loops through all types.

**Test spec:** acceptance script + Rust unit test
**Agent:** rust-dev (CLI validation is in `cli/src/headless/fix.rs`) + nodejs-dev (engine route)

### T-3: Fix Passport Autonomy 500 (B-08)

**File:** `engine/core/src/http/routes/agent.route.ts` or `passport-service.ts`
**Root cause:** Internal server error when calling autonomy analysis endpoint.

**Test spec:** `engine/core/src/domain/passport/discovery/autonomy-analyzer.test.ts` — new test
**Agent:** nodejs-dev

### T-4: Fix `--fail-on` Gate (B-02) — CRITICAL

**File:** `cli/src/headless/scan.rs` lines 396-430
**Root cause:** `--fail-on` check is INSIDE `if ci { }` block. Without `--ci`, `--fail-on` is silently ignored.

**Fix:** Move `--fail-on` check OUTSIDE the `if ci { }` block, so it works independently:
```rust
// AFTER ci block
if let Some(level) = fail_on {
    let has_severity = result.findings.iter().any(|f| { ... });
    if has_severity {
        eprintln!("FAIL: Found findings at severity '{}' or above", level.as_str());
        return 2;
    }
}
```

**Test spec:** `cli/src/headless/scan.rs` — `#[test]` in module tests
**Agent:** rust-dev

### T-5: Fix Score Consistency (B-03 + I-01)

**File:** `cli/src/headless/format/human.rs` lines 140-255
**Root cause:** `COMPLIANCE SCORE` uses `result.score.total_score` (84.57) rounded to 85. Framework Breakdown shows `fw.score` = 82. Two different scoring pipelines produce different numbers.

**Fix:** Either:
- Use the SAME value for both displays, OR
- Label clearly: "COMPLIANCE SCORE 85" (weighted average) vs "EU AI Act 82" (category score)

**Test spec:** Rust unit test
**Agent:** rust-dev

### T-6: Fix Passport Validate Completeness (B-07)

**File:** `cli/src/headless/passport.rs` ~line 1226
**Root cause:** Shows "Completeness: 0%" then "Completeness score 74% below 80%". The parsing path for completeness is wrong (nested object lookup instead of direct f64).

**Fix:** Fix JSON path for completeness field.
**Agent:** rust-dev

### T-7: Fix Passport Permissions (B-09)

**File:** `cli/src/headless/passport.rs`
**Root cause:** "No agents found" despite passports existing. Engine endpoint likely expects different query format.

**Fix:** Fix endpoint URL or response parsing.
**Agent:** rust-dev

### T-8: Fix Passport Registry (B-10)

**File:** `cli/src/headless/passport.rs`
**Root cause:** Same as B-09 — wrong endpoint or parsing.

**Fix:** Fix endpoint URL or response parsing.
**Agent:** rust-dev

### T-9: Fix Quick Actions (U-02)

**File:** `cli/src/headless/format/human.rs` lines 693-711
**Root cause:** References `complior docs generate --missing` (removed command) and `complior tui` (not a command).

**Fix:**
```rust
// BEFORE:
"Generate docs"           → "complior docs generate --missing"
"Full interactive view"   → "complior tui"

// AFTER:
"Generate docs"           → "complior fix --doc <type> --agent <name>"
"Full interactive view"   → "complior" (no args = TUI)
```

**Agent:** rust-dev

### T-10: Fix Weight Display (U-01)

**File:** `cli/src/headless/status.rs` line 188
**Root cause:** `cat.weight * 100.0` produces 900% if weight is 9.0 (already a percentage). Should be just `cat.weight` if already percentage, or `/100.0` normalization.

**Fix:** Check engine data format and normalize correctly.
**Agent:** rust-dev

### T-11: Fix Estimated Score (U-03)

**File:** `cli/src/headless/fix.rs` lines 495-524
**Root cause:** `--dry-run` shows "SCORE 0 → ~30" when actual score is 85. The `before` value comes from engine prediction which apparently returns 0.

**Fix:** Use actual current score from scan result as `before`, not engine prediction.
**Agent:** rust-dev

### T-12: Allow Protocol Hints (U-05)

**File:** `cli/src/cli.rs` or `cli/src/headless/eval.rs`
**Root cause:** CLI URL validation rejects `openai://` prefix with "must be HTTP(S) URL". Engine supports it.

**Fix:** Either:
- Accept `openai://`, `anthropic://`, `ollama://` in CLI validation
- Or strip protocol hint and prepend `http://` before validation, pass original to engine

**Agent:** rust-dev

### T-13: Fix Passport Init Name (B-06)

**File:** `cli/src/headless/passport.rs` ~line 264
**Root cause:** `passport init <name>` treats argument as subdirectory. Should use name for agent discovery or passport creation.

**Fix:** If argument contains `/` → treat as path. Otherwise → search existing passports by name or use as passport name.
**Agent:** rust-dev

---

## Prerequisites

- [x] E2E test report written (`docs/E2E-TEST-REPORT-2026-04-19.md`)
- [ ] npm install in engine/core
- [ ] cargo build compiles
- [ ] npm test runs (RED tests OK, env errors NO)
- [ ] cargo test runs
- [ ] Engine running on port 3099 (for E2E verification)
- [ ] eval-target running on port 4000 (for eval verification)

---

## RED Test Specs

### TS Tests (engine/core) — `engine/core/src/domain/eval/adapters/adapters.test.ts`

**T-1 Tests (3 new):**
1. `autoDetect uses OpenAI adapter when URL contains /v1/chat/completions` — URL path heuristic
2. `autoDetect uses OpenAI adapter when /v1/chat/completions POST succeeds` — active probe
3. `autoDetect with custom template bypasses auto-detection` — custom template regression

### Rust Tests (cli/) — scattered across modules

**T-4 Test:**
- `scan --fail-on medium exits 2 without --ci` — fail-on works standalone

**T-5 Test:**
- `compliance score matches framework breakdown score` — consistency

**T-9 Test:**
- `quick actions contain only valid commands` — no stale commands

**T-10 Test:**
- `weight display is percentage 0-100` — correct range

---

## Acceptance Script

**File:** `scripts/verify_e2e_bugfix.sh`

Reproduces EXACT same E2E test plan from the report. Every command tested, every output verified. Comparable before/after.

---

## Verification Table

| # | Task | Agent | Verification | Files |
|---|------|-------|-------------|-------|
| T-1 | Eval auto-detect URL heuristic | nodejs-dev | unit: adapters.test.ts 3 new tests GREEN | engine/core/src/domain/eval/adapters/auto-detect.ts |
| T-2 | fix --doc all | nodejs-dev + rust-dev | acceptance: verify_e2e_bugfix.sh §fix | cli/src/headless/fix.rs, engine route |
| T-3 | Passport autonomy 500 | nodejs-dev | unit: autonomy test GREEN | engine/core/src/ |
| T-4 | --fail-on without --ci | rust-dev | unit: scan.rs test GREEN | cli/src/headless/scan.rs |
| T-5 | Score consistency | rust-dev | unit: human.rs test GREEN | cli/src/headless/format/human.rs |
| T-6 | Validate completeness | rust-dev | acceptance: verify_e2e_bugfix.sh §passport | cli/src/headless/passport.rs |
| T-7 | Permissions output | rust-dev | acceptance: verify_e2e_bugfix.sh §passport | cli/src/headless/passport.rs |
| T-8 | Registry output | rust-dev | acceptance: verify_e2e_bugfix.sh §passport | cli/src/headless/passport.rs |
| T-9 | Quick Actions | rust-dev | unit: human.rs test GREEN | cli/src/headless/format/human.rs |
| T-10 | Weight display | rust-dev | unit: status.rs test GREEN | cli/src/headless/status.rs |
| T-11 | Estimated score | rust-dev | acceptance: verify_e2e_bugfix.sh §fix | cli/src/headless/fix.rs |
| T-12 | Protocol hints | rust-dev | unit: cli.rs test GREEN | cli/src/cli.rs |
| T-13 | Passport init name | rust-dev | acceptance: verify_e2e_bugfix.sh §passport | cli/src/headless/passport.rs |
| **E2E** | **Full acceptance** | **test-runner** | `bash scripts/verify_e2e_bugfix.sh` → **34/34 PASS** | all |

## Execution Order

1. **User** запускает **nodejs-dev** → T-1, T-2 (engine), T-3
2. **User** запускает **rust-dev** → T-4..T-13 (CLI)
3. **User** запускает **test-runner** → `bash scripts/verify_e2e_bugfix.sh` (34/34 PASS)
4. **User** запускает **reviewer** → project-state, tech-debt

## Verification Commands

```bash
# TS unit tests (after T-1, T-3):
cd engine/core && npx vitest run src/domain/eval/adapters/adapters.test.ts

# Rust unit tests (after T-4, T-5, T-9, T-10, T-12):
cargo test -p complior-cli

# Full E2E acceptance (test-runner запускает ПОСЛЕ реализации):
bash scripts/verify_e2e_bugfix.sh
# BASELINE:  18 PASS / 16 FAIL
# ROUND 1:  28 PASS /  6 FAIL  (+10 fixes, test script + rustfmt fixed)
# ROUND 2:  33 PASS /  1 FAIL  (R2-2 score path, R2-3 name args)
# ROUND 3:  34 PASS /  0 FAIL  (R2-1 health check — fd0ed6f)  ✅ DONE
```

## Round 2: Remaining 6 Fixes (after first dev pass)

**Progress:** 28/34 PASS (was 18/34 baseline → +10 improvement)

### R2-1: eval --det health check (B-01) — nodejs-dev — ✅ DONE (fd0ed6f)

**Status:** POST probe (R2-1 from Round 2) is IMPLEMENTED and WORKS — auto-detect correctly selects OpenAI adapter.
But OpenAI adapter's `checkHealth()` fails because it GETs `/v1/models` (returns 404 on eval-target).

**Root cause chain (verified via engine logs):**
1. ✅ `tryOpenAIPost(baseUrl)` → POST `/v1/chat/completions` → 200 → OpenAI adapter created
2. ❌ `adapter.checkHealth()` → GET `/v1/models` → 404 → `isHealthy(404) = false` → throws "Target not reachable"

**File:** `engine/core/src/domain/eval/adapters/openai-adapter.ts` line 55
**Fix (1 line):**
```typescript
// BEFORE:
isHealthy: (status) => status === 200,
// AFTER:
isHealthy: (status) => status < 500,
```

This matches the HTTP adapter's health check behavior (`res.status < 500`) and allows
OpenAI-compatible endpoints that don't expose `/v1/models` to pass health checks.

### R2-2: fix --dry-run score path (U-03) — rust-dev

**File:** `cli/src/headless/fix.rs` (around line 56)
**Root cause:** Reads `status.score` but `/status` returns `{"lastScan": {"score": 84.57}}`.
**Fix:** Change JSON path from `.get("score")` to `.get("lastScan").and_then(|v| v.get("score"))`.

### R2-3: passport subcommands name arg (B-08/B-09/B-10) — rust-dev

**Files:** `cli/src/cli.rs`, `cli/src/headless/passport.rs`
**Root cause:** `PassportAction::Autonomy`, `::Permissions`, `::Registry` have no `name` positional arg. When user passes `eval-target-openai`, clap treats it as `path`, creating nonexistent directory path.

**Fix pattern (same for all 3):**
1. In `cli.rs`, add `name: Option<String>` positional BEFORE `path` in each variant
2. In `passport.rs`, when `name` is Some, use current directory as project path and pass `?name=...` to engine
3. Analogous to the T-13 fix already done for `PassportAction::Init`

**Example for Autonomy:**
```rust
// cli.rs
Autonomy {
    /// Agent name (e.g., eval-target-openai)
    name: Option<String>,
    #[arg(long)]
    json: bool,
    /// Project path (default: current directory)
    path: Option<String>,
},
```

```rust
// passport.rs run_passport_autonomy
// If name provided, send as query param, use cwd as path
let url = match name {
    Some(n) => format!("/passport/autonomy?path={}&name={}", encode(&project_path), encode(n)),
    None => format!("/passport/autonomy?path={}", encode(&project_path)),
};
```

### R2-4: B-06 test script — FIXED (architect)

Test grep pattern was too broad. Fixed in `scripts/verify_e2e_bugfix.sh`.

---

## Out of Scope
- I-02 (obligation vs check count) — conceptual distinction, needs product decision
- I-03 (version mismatch 0.9.9 vs 0.10.0) — needs coordinated version bump at release
- I-04 (agent-scoped scan) — design decision: project vs agent scope
- U-04 (scan --quiet too verbose) — already tracked as TD-38 with V1-M17
