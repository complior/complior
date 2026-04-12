# Milestone V1-M04: Full E2E Coverage for All v1.0 CLI Flags

> **Status:** ⏳ IN PROGRESS
> **Feature Areas:** All (FA-01..FA-08) — full flag coverage proof
> **Created:** 2026-04-11
> **Target:** Every v1.0 CLI flag has at least one E2E test (engine-level OR CLI binary)
> **Blocked by:** V1-M01 ✅, V1-M02 ✅, V1-M03 ✅
> **Blocks:** v1.0 merge to main

---

## 1. Context

### 1.1 What's proven (V1-M01..M03)

- **V1-M01:** Happy path pipeline (init → scan → fix → report) works end-to-end
- **V1-M02:** 36 E2E tests covering advanced flag variants via Hono in-memory HTTP
- **V1-M03:** Docs, CI, version bump — release polish

### 1.2 Gap: CLI-side logic untested

Many flags are **CLI-side only** (Rust formatting, exit codes, file I/O):
- SARIF output formatting happens in `cli/src/headless/format/mod.rs`
- `--ci --threshold` exit code logic happens in `cli/src/headless/scan.rs`
- `--quiet` mode filtering happens in `cli/src/headless/format/human.rs`
- `--output` file write happens in `cli/src/headless/report.rs`
- `--source eval/all` routing happens in `cli/src/headless/fix.rs`
- `--fail-on-regression` logic uses scan diff data from engine

These CANNOT be tested via `application.app.request()`. They need the **real binary**.

### 1.3 Untested flags (gap analysis)

| Command | Flag | Where logic lives | Tested? |
|---------|------|-------------------|---------|
| scan | `--sarif` | Rust `format_sarif()` | ❌ CLI binary |
| scan | `--ci --threshold` | Rust exit code logic | ❌ CLI binary |
| scan | `--quiet` | Rust human formatter | ❌ CLI binary |
| scan | `--fail-on-regression` | Rust + engine diff | ❌ CLI binary |
| scan | `--comment` | Rust `gh pr comment` | ❌ partial (needs gh) |
| eval | `--full` | Engine eval/run {full:true} | ❌ engine |
| eval | `--failures` | Rust display filter | ❌ CLI binary |
| eval | `--verbose` | Rust display verbosity | ❌ CLI binary |
| eval | `--fix --dry-run` | Engine apply-fixes | ❌ engine |
| eval | `--model/--api-key/--headers` | Engine config passthrough | ❌ engine |
| eval | `--request-template/--response-path` | Engine adapter config | ❌ engine |
| eval | `--agent` | Engine passport attribution | ❌ engine |
| fix | `--source eval/all` | Rust routing logic | ❌ CLI binary |
| report | `--output` | Rust file I/O | ❌ CLI binary |
| agent | rename | CLI → engine | ❌ CLI binary |
| agent | notify | CLI → engine | ❌ CLI binary |
| agent | registry | CLI → engine | ❌ CLI binary |
| agent | permissions | CLI → engine | ❌ CLI binary |

---

## 2. Test Specifications (RED → GREEN)

### 2.1 Stream 1: Engine-level E2E tests (vitest, Hono in-memory)

**File:** `engine/core/src/e2e/ci-flags-e2e.test.ts`

| # | Test | Endpoint | Proves |
|---|------|----------|--------|
| 1 | scan response has all SARIF-required fields | POST /scan | findings[].severity, checkId, message — SARIF needs these |
| 2 | scan response supports threshold comparison | POST /scan | score.totalScore is numeric 0-100 |
| 3 | scan/diff has hasRegression for --fail-on-regression | POST /scan/diff | hasRegression boolean present |
| 4 | scan/diff has markdown for --comment | POST /scan/diff {markdown:true} | markdown string present |
| 5 | eval --full runs combined det+security | POST /eval/run {full:true} | Results include both det and security |
| 6 | eval accepts custom adapter config | POST /eval/run {model,apiKey,...} | Config not rejected (validation pass) |
| 7 | eval apply-fixes endpoint works | POST /eval/apply-fixes | Applied count returned |
| 8 | eval categories + concurrency params | POST /eval/run {categories,concurrency} | Params accepted |
| 9 | report/share accepts outputPath | POST /report/share {outputPath} | File written at custom path |
| 10 | report/markdown accepts outputPath | POST /report/status/markdown {outputPath} | File at custom path |

**Tests 5-8 require COMPLIOR_EVAL_TARGET** → guarded with `skipIf(!hasTarget)`.

### 2.2 Stream 2: CLI binary acceptance script

**File:** `scripts/verify_cli_flags.sh`

| # | Command | Verifies |
|---|---------|----------|
| 1 | `complior scan --json $PROJECT` | JSON output with score |
| 2 | `complior scan --sarif $PROJECT` | Valid SARIF v2.1.0 JSON |
| 3 | `complior scan --ci --threshold 0 $PROJECT` | Exit code 0 |
| 4 | `complior scan --ci --threshold 999 $PROJECT` | Exit code 2 |
| 5 | `complior scan --quiet $PROJECT` | Output shorter than non-quiet |
| 6 | `complior scan --fail-on critical $PROJECT` | Exit code depends on findings |
| 7 | `complior fix --dry-run $PROJECT` | Preview output, no files changed |
| 8 | `complior fix --source scan $PROJECT` | Source filter accepted |
| 9 | `complior report --json $PROJECT` | JSON report output |
| 10 | `complior report --output /tmp/test.json --json $PROJECT` | File created |
| 11 | `complior report --format markdown $PROJECT` | Markdown output |
| 12 | `complior agent rename` via CLI | Rename works E2E |
| 13 | `complior agent notify` via CLI | Notification document generated |
| 14 | `complior agent registry` via CLI | Registry returns agents |
| 15 | `complior agent permissions` via CLI | Permissions matrix returned |

### 2.3 Stream 3: Eval CLI flags (env-gated)

**File:** `scripts/verify_eval_flags.sh`

Requires `COMPLIOR_EVAL_TARGET` env var.

| # | Command | Verifies |
|---|---------|----------|
| 1 | `complior eval --det --target $TARGET $PROJECT` | Deterministic eval |
| 2 | `complior eval --det --ci --threshold 0 --target $TARGET $PROJECT` | Exit 0 |
| 3 | `complior eval --det --ci --threshold 999 --target $TARGET $PROJECT` | Exit 2 |
| 4 | `complior eval --det --json --target $TARGET $PROJECT` | JSON output |
| 5 | `complior eval --last $PROJECT` | Shows previous result |
| 6 | `complior eval --last --failures $PROJECT` | Shows only failures |
| 7 | `complior eval --det --verbose --target $TARGET $PROJECT` | Verbose output (longer) |
| 8 | `complior eval --det --categories transparency --target $TARGET $PROJECT` | Filtered categories |

---

## 3. Implementation Tasks

| # | Задача | Агент | Метод верификации | Файлы |
|---|--------|-------|-------------------|-------|
| 1 | CI-flags E2E (10 тестов) | nodejs-dev | ci-flags-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 2 | CLI flags acceptance (15 проверок) | rust-dev | scripts/verify_cli_flags.sh PASS | cli/, scripts/ |
| 3 | Eval flags acceptance (8 проверок) | rust-dev | scripts/verify_eval_flags.sh PASS | cli/, scripts/ |
| 4 | Add outputPath to markdown endpoint (if missing) | nodejs-dev | Test #10 GREEN | engine/core/src/http/routes/ |

---

## 4. Предусловия среды

- [x] V1-M01 ✅ DONE
- [x] V1-M02 ✅ DONE
- [x] V1-M03 ✅ DONE
- [ ] `cargo build --release` — binary for acceptance scripts
- [ ] Test project available (eval-target or acme-ai-support)
- [ ] COMPLIOR_EVAL_TARGET for eval-specific tests (optional)

---

## 5. Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| ci-flags-e2e.test.ts: 10 GREEN (offline always, target-gated with env) | `npx vitest run` |
| verify_cli_flags.sh: 15/15 PASS | `bash scripts/verify_cli_flags.sh` |
| verify_eval_flags.sh: 8/8 PASS (with COMPLIOR_EVAL_TARGET) | `bash scripts/verify_eval_flags.sh` |
| All existing tests still GREEN | `npx vitest run && cargo test` |
| Total v1.0 flag E2E coverage: ≥90% | Gap analysis table |
