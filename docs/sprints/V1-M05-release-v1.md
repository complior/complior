# Milestone V1-M05: Release v0.9.5

> **Status:** ⏳ IN PROGRESS
> **Created:** 2026-04-11
> **Target:** Ship v0.9.5 to production (merge to main → auto-deploy)
> **Blocked by:** V1-M04 ✅ (engine E2E done, acceptance pending binary run)
> **Blocks:** v0.9.5 tag + publish (crates.io, npm, GitHub Release)

---

## 1. Context

### 1.1 What's proven (V1-M01..M04)

- **V1-M01:** Full pipeline happy path (init → scan → fix → report)
- **V1-M02:** 36 E2E tests, all CLI flags wired in Rust headless
- **V1-M03:** CI/CD pipeline, docs, version bump 0.9.4
- **V1-M04:** 10 engine-level E2E tests GREEN, acceptance scripts written

### 1.2 What remains

4 categories of work before `git tag v0.9.5`:

1. **Security** — npm vulnerabilities (hono + vite)
2. **Type safety** — 57 TypeScript type errors (CI typecheck disabled)
3. **Acceptance validation** — 10 bash scripts need real binary run
4. **Release polish** — version bump, changelog, hardcoded path fix

### 1.3 CI/CD auto-deploy

After merge to `main`, GitHub Actions automatically:
- Builds 5 binary targets (Linux x86/arm, macOS Intel/ARM, Windows)
- Publishes to crates.io (`CARGO_TOKEN`), npm (`NPM_TOKEN`), GitHub Release
- Optional Docker push (`DOCKERHUB_ENABLED`)
- Runs smoke tests post-publish

Secrets (`CARGO_TOKEN`, `NPM_TOKEN`, `DOCKERHUB_*`) already configured.

---

## 2. Dependency Graph

```
                    ┌──────────────────────────────────────────────┐
                    │              PHASE 1 (parallel)               │
                    │                                              │
                    │  nodejs-dev          rust-dev                │
                    │  ┌────────────┐     ┌─────────────────────┐  │
                    │  │ T-1 npm    │     │ T-4 hide --cloud    │  │
                    │  │ audit fix  │     │ stub (cosmetic)     │  │
                    │  │ 15 min     │     │ 15 min              │  │
                    │  ├────────────┤     └─────────────────────┘  │
                    │  │ T-2 fix    │                              │
                    │  │ test path  │                              │
                    │  │ 10 min     │                              │
                    │  └────────────┘                              │
                    └───────┬──────────────────────┬───────────────┘
                            │                      │
                            ▼                      ▼
                    ┌──────────────────────────────────────────────┐
                    │              PHASE 2 (parallel)               │
                    │                                              │
                    │  nodejs-dev               user               │
                    │  ┌─────────────────┐     ┌────────────────┐  │
                    │  │ T-3 fix 57 TS   │     │ T-5 cargo      │  │
                    │  │ type errors +   │     │ build --release │  │
                    │  │ re-enable tsc   │     │ + run 10 accep- │  │
                    │  │ in CI           │     │ tance scripts   │  │
                    │  │ 2-4 hours       │     │ 30 min          │  │
                    │  └─────────────────┘     └────────────────┘  │
                    └───────┬──────────────────────┬───────────────┘
                            │                      │
                            ▼                      ▼
                    ┌──────────────────────────────────────────────┐
                    │              PHASE 3 (sequential)             │
                    │                                              │
                    │  architect                                   │
                    │  ┌─────────────────────────────────────────┐ │
                    │  │ T-6 version bump 0.9.4 → 0.9.5         │ │
                    │  │ T-7 CHANGELOG.md v0.9.5 section         │ │
                    │  │ T-8 final tests run (vitest + cargo)    │ │
                    │  │ T-9 create PR feature/reporter → main   │ │
                    │  │ 30 min                                  │ │
                    │  └─────────────────────────────────────────┘ │
                    └───────────────────┬──────────────────────────┘
                                        │
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │              PHASE 4 (user)                   │
                    │                                              │
                    │  ┌─────────────────────────────────────────┐ │
                    │  │ T-10 review PR, merge to main           │ │
                    │  │ T-11 verify release pipeline GREEN      │ │
                    │  │ 15 min                                  │ │
                    │  └─────────────────────────────────────────┘ │
                    └──────────────────────────────────────────────┘
```

---

## 3. Tasks

### Phase 1: Quick Fixes (parallel — nodejs-dev + rust-dev)

#### T-1: npm audit fix (nodejs-dev)
**Time:** 15 min | **Risk:** Low

```bash
cd engine/core && npm audit fix
npx vitest run   # verify no regressions
```

- Hono moderate vulnerabilities (cookie validation, IP bypass, serveStatic)
- Vite high vulnerability (path traversal, .map handling, WebSocket)
- All fixable via `npm audit fix` (no breaking changes expected)

**Verification:** `npm audit` returns 0 vulnerabilities

---

#### T-2: Fix hardcoded test path (nodejs-dev)
**Time:** 10 min | **Risk:** Low

File: `engine/core/package.json` line 53
```json
// BEFORE:
"test": "COMPLIOR_TEST_PROJECT=/home/openclaw/test-projects/eval-target vitest run"

// AFTER:
"test": "vitest run"
```

Test project path should come from environment or vitest config, not hardcoded in npm script. `vitest.config.ts` already sets `COMPLIOR_TEST_PROJECT` via env loading.

**Verification:** `npx vitest run` still passes (2165 GREEN)

---

#### T-4: Hide --cloud stub (rust-dev)
**Time:** 15 min | **Risk:** Low

File: `cli/src/cli.rs` line 100-102

```rust
// BEFORE:
/// [planned] Cloud scan via `SaaS` API (Tier 3, planned for Month 3-4)
#[arg(long)]
cloud: bool,

// AFTER:
/// [planned] Cloud scan via `SaaS` API
#[arg(long, hide = true)]
cloud: bool,
```

Add `hide = true` so `--cloud` doesn't appear in `--help` but still parses (backward-compatible). The stub handler in headless already returns "not yet available".

**Verification:** `cargo test` passes, `complior scan --help` does NOT show `--cloud`

---

### Phase 2: Heavy Lift (parallel — nodejs-dev + user)

#### T-3: Fix 57 TypeScript type errors + re-enable typecheck in CI (nodejs-dev)
**Time:** 2-4 hours | **Risk:** Medium

57 errors across 29 files. Major categories:

| Category | Files | Typical error |
|----------|-------|---------------|
| Vercel AI SDK types | eval-service, eval-runner | `maxTokens` not in `CallSettings` |
| FixAction missing `description` | eval-service | Property missing in object literal |
| Framework scoring types | 4 framework files | Missing properties on score objects |
| Route handler types | agent.route, audit.route | Body schema mismatches |
| Misc (proxy, cost, whatif) | 8 files | Various structural mismatches |

Steps:
1. Run `npx tsc --noEmit 2>&1 > /tmp/tsc-errors.txt`
2. Fix each file — most are missing optional properties or type narrowing
3. After all fixed: `npx tsc --noEmit` → 0 errors
4. Uncomment CI typecheck: `.github/workflows/ci.yml` line 94-95
5. Run full test suite: `npx vitest run` → 2165 GREEN

**Verification:**
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 2165 GREEN
- ci.yml typecheck uncommented

---

#### T-5: Build binary + run acceptance scripts (user)
**Time:** 30 min | **Risk:** Low (scripts already validated as well-formed)

```bash
# Build
cargo build --release

# Run 10 acceptance scripts (no API key needed)
bash scripts/verify_ci.sh
bash scripts/verify_pipeline.sh
bash scripts/verify_report_export.sh
bash scripts/verify_cli_flags.sh
bash scripts/verify_agent_cli.sh
bash scripts/verify_fria_flow.sh
bash scripts/verify_manual_edit_score.sh
bash scripts/verify_pipeline_no_key.sh
bash scripts/verify_score_growth.sh
bash scripts/verify_self_scan.sh

# Optional (needs OPENROUTER_API_KEY):
OPENROUTER_API_KEY=sk-or-... bash scripts/verify_pipeline_llm.sh

# Optional (needs eval target):
COMPLIOR_EVAL_TARGET=http://localhost:PORT bash scripts/verify_eval_flags.sh
```

**Verification:** 10/10 scripts PASS (GREEN). Optional: 12/12 with env vars.

---

### Phase 3: Release Polish (sequential — architect, after Phase 1+2 complete)

#### T-6: Version bump 0.9.4 → 0.9.5 (architect)
**Time:** 5 min

3 files, atomic update:
- `Cargo.toml` — workspace version
- `engine/core/package.json` — version field
- `engine/npm/package.json` — version field

**Verification:** CI version-check job passes (all 3 match)

---

#### T-7: CHANGELOG.md v0.9.5 section (architect)
**Time:** 15 min

Add `## [0.9.5] - 2026-04-XX` section above `[0.9.0]` with:
- Full pipeline commands (scan, eval, fix, report, agent)
- All v1.0 flags
- 2360+ tests
- CI/CD pipeline
- 5-target binary release

---

#### T-8: Final test gate (architect)
**Time:** 5 min

```bash
npx tsc --noEmit          # 0 errors (T-3 done)
npx vitest run            # 2165+ GREEN
cargo test                # 195 GREEN
npm audit                 # 0 vulnerabilities (T-1 done)
cargo clippy -- -D warnings  # 0 warnings
```

**Verification:** All 5 commands pass

---

#### T-9: Create PR feature/reporter → main (architect)
**Time:** 10 min

```bash
gh pr create --title "feat: release v0.9.5 — EU AI Act compliance toolkit" \
  --body "..."
```

---

### Phase 4: Ship (user)

#### T-10: Review + merge PR (user)
#### T-11: Verify release pipeline (user)

After merge to main, GitHub Actions runs:
- ci.yml → all checks GREEN
- release.yml (on tag) → build 5 targets → publish crates.io + npm + GitHub Release

```bash
git tag v0.9.5
git push origin v0.9.5
# Monitor: https://github.com/.../actions
```

---

## 4. Agent Assignment Summary

| Agent | Tasks | Estimated Time | Phase |
|-------|-------|---------------|-------|
| **nodejs-dev** | T-1 (npm audit), T-2 (test path), T-3 (57 TS errors + CI) | 3-5 hours | 1 + 2 |
| **rust-dev** | T-4 (hide --cloud) | 15 min | 1 |
| **architect** | T-6 (version bump), T-7 (changelog), T-8 (test gate), T-9 (PR) | 30 min | 3 |
| **user** | T-5 (acceptance scripts), T-10 (merge), T-11 (verify) | 45 min | 2 + 4 |

**Critical path:** nodejs-dev (T-3: TS type errors) — это самый долгий блок (2-4 часа).

Всё остальное ≤30 мин каждое.

---

## 5. Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| `npm audit` → 0 vulnerabilities | T-1 |
| `npx tsc --noEmit` → 0 errors | T-3 |
| `npx vitest run` → 2165+ GREEN | T-8 |
| `cargo test` → 195 GREEN | T-8 |
| `cargo clippy -- -D warnings` → 0 warnings | T-8 |
| 10/10 acceptance scripts PASS | T-5 |
| Version = 0.9.5 in all 3 files | T-6 |
| CHANGELOG.md has [0.9.5] section | T-7 |
| CI typecheck uncommented in ci.yml | T-3 |
| PR to main created | T-9 |
| Release pipeline GREEN after tag | T-11 |

---

## 6. Предусловия среды

- [x] All engine E2E tests GREEN (V1-M04)
- [x] Acceptance scripts written and executable
- [x] CI/CD pipeline configured (ci.yml + release.yml)
- [x] GitHub secrets configured (CARGO_TOKEN, NPM_TOKEN, DOCKERHUB_*)
- [x] Test project available (eval-target)
- [ ] cargo build --release — user runs before acceptance
- [ ] OPENROUTER_API_KEY — optional for LLM acceptance tests
- [ ] COMPLIOR_EVAL_TARGET — optional for eval acceptance tests
