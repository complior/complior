# Changelog

All notable changes to Complior will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-05-03

**Patch release — fixes BUG-4 known limitation from v1.0.0.**

### Fixed

**V1-M30.12 BUG-4 — `complior fix --doc <type>` error message reads from correct JSON path**

V1-M30.11 fixed BUG-1 (fake "Document generated" + "Saved to: unknown" when engine returns 4xx) but the implementation read the engine error message from the WRONG JSON path:

```rust
// BROKEN
if let Some(err_obj) = result.get("error") {
    let msg = err_obj.get("message")  // ← engine returns flat JSON: error is a STRING, not object
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown engine error");
}
```

Engine returns `{"error": "VALIDATION_ERROR", "message": "Passport not found: default"}` (flat). `result.get("error")` returns the string `"VALIDATION_ERROR"`, then `.get("message")` on a string returns `None` → fallback to generic `"Unknown engine error"`.

**User-visible change**:
- Before v1.0.1: `Error: Unknown engine error` (clear failure but unhelpful)
- After v1.0.1: `Error: Passport not found: default` (correct, actionable message)

3 sites in `cli/src/headless/`:
- `fix.rs:1432` (`run_doc_generate_single`)
- `doc.rs:159` (`run_doc_generate`)
- `doc.rs:256` (`run_doc_generate_fix`)

### Verification

/deep-e2e v4 (post-merge) confirmed across all 3 profiles:
- ✅ `Error: Passport not found: default` shown (was "Unknown engine error")
- ✅ "Unknown engine error": **0 occurrences** (was 14 per profile)
- ✅ "Passport not found": 15 occurrences per profile (1 fria + 14 from `--doc all` loop)
- ✅ All prior fixes still clean — 0 regressions:
  - W-3 (V1-M30.10): predictedScore = 67/70/71 → ~99
  - W-1 (V1-M30.9): 0 mentions of `complior docs --article`
  - BUG-1 (V1-M30.11): 0 occurrences of `Saved to: unknown`
  - BUG-3 (V1-M30.11): scan --diff = 2 friendly lines

### Versions bumped

- `Cargo.toml` workspace: 1.0.0 → 1.0.1
- `cli/Cargo.toml`: inherits via `version.workspace = true` → 1.0.1
- root `package.json`: 1.0.0 → 1.0.1
- `engine/core/package.json` (`@complior/engine`): 1.0.0 → 1.0.1
- `engine/npm/package.json` (`complior` npm wrapper): 1.0.0 → 1.0.1
- `engine/contracts/package.json` (`@complior/contracts`): 1.0.0 → 1.0.1

## [1.0.0] - 2026-05-03

**🎉 First general-availability release.**

Complior is production-ready for EU AI Act compliance scanning, evaluation, fix automation, Agent Passports, and report generation. All v1.0 pipeline commands (`init`, `scan`, `eval`, `fix`, `report`, `agent`/`passport`, `doctor`) are stable with full flag coverage and exhaustive E2E verification across 3 profile contexts (deployer/limited/general, provider/high/healthcare, deployer/high/finance).

### Highlights since 0.9.9

**Profile-aware filtering (V1-M07 → V1-M19)**
- Context-aware scan: `role × riskLevel × domain → applicableObligations` (16 / 67 / 46 across 3 profiles)
- Context-aware eval: 319 / 335 / 327 of 388 tests applicable per profile
- Onboarding enrichment: 9 questions → dynamic obligations
- ISO 42001 document generators (SoA, Risk Register)
- Score transparency: disclaimer, category breakdown, `/status/posture` endpoint
- Domain filter + fix profile filter

**Command restructuring (V1-M11 + V1-M30.4)**
- `complior agent <verb>` is the primary form; `complior passport <verb>` retained as deprecated alias (removed in v2.0.0)
- `complior fix --doc <type>` replaces previous `complior docs` references in CLI output

**TUI UX polish (V1-M30.1 → V1-M30.7)**
- Tabs UX: humanized dates, double-`%`, field counts, manual-command rendering, skipped-fix badges
- Documents tab: `file://` links + emoji actions
- Eval auto-detect timeout fix
- 4 critical UI rendering bugs (V1-M30.7)
- 8 backend bugs (V1-M30.8a) + eval refusal heuristic + 4 UX polish (V1-M30.8b)

**Pipeline correctness (V1-M30.9 → V1-M30.11)**
- W-1: removed `complior docs --article` mentions from scan/eval/fix outputs
- W-2: documentation strategy emits `enrich` action.type for existing files (no overwrite of user-edited docs)
- W-3: predicted score capped at 99 (not 100) in BOTH `simulate-actions.ts` (engine whatif) and `engine_client::fix_dry_run` (CLI connected branch). 100 implies certainty; predicted scores are estimates.
- BUG-1: `fix --doc <type>` no longer swallows engine 4xx errors — exits with code 1 and routes message to stderr instead of fake "Document generated" + "Saved to: unknown".
- BUG-3: `scan --diff` on non-git project shows friendly 1-line message instead of dumping full ~70-line `git --help`.

**Tests, CI, release infrastructure**
- Rust CLI: 226 tests, clippy clean, fmt clean
- TS Engine: 2493 tests, 0 failures, 2 skipped (210 files)
- TS contract test + Rust contract test both validate against `engine/core/data/schemas/http-contract-sample.json`
- CI on `dev`: Rust Tests/Clippy/Fmt/Audit + Engine + npm Audit + Version Consistency — all GREEN
- 11 mini-hotfix milestones (V1-M30.1 → V1-M30.11) consecutively delivered, all merged to dev

### Versions bumped

- `Cargo.toml` workspace: 0.10.0 → 1.0.0
- `cli/Cargo.toml`: inherits via `version.workspace = true` → 1.0.0
- `engine/core/package.json` (`@complior/engine`): 0.10.0 → 1.0.0
- `engine/npm/package.json` (`complior` npm wrapper): 0.10.0 → 1.0.0

### Known limitations (deferred to v1.0.1)

- `fix --doc <type>` error message reads from wrong JSON path when engine returns 4xx — user sees `Error: Unknown engine error` instead of the actual engine message (e.g. `Error: Passport not found: default`). Functional behavior is correct (exit 1, no fake success); only message is generic. Affects only the error path when an invalid passport name is passed.
- `complior eval` against the bundled mock target server depends on OpenRouter credits for the LLM judge; eval scores will be 0 if credits run out.

### EU AI Act enforcement context

EU AI Act (Regulation (EU) 2024/1689) enforcement: **August 2, 2026** (~91 days from this release).

Complior v1.0 covers: scanner with profile-aware filtering, eval with security and remediation flags, fix automation with template-based document generation and AI-assisted enrichment, Agent Passports (36 fields, ed25519 signed, 3 creation modes), evidence chain with SHA-256 hashing + ed25519 signatures, multi-format reports (human/json/md/html/pdf), passport export to a2a/aiuc-1/nist formats, MCP server (8 tools), and HTTP API (Hono).

## [0.9.9] - 2026-04-17

### Added

**Pre-Release Polish Sprint (V1-M16)**
- `docs/project-state.md` — living project status document (all milestones, command status, metrics)
- `docs/tech-debt.md` — tech debt tracker with resolution history
- `scripts/verify_v1_pipeline_full.sh` — comprehensive v1.0 pipeline acceptance test (27 checks)
- E2E tests for `POST /fix/doc/test-gen` and `POST /fix/doc/all` endpoints
- E2E tests for 7 additional document types via `POST /fix/doc/generate` (art5-screening, technical-documentation, incident-report, data-governance, instructions-for-use, monitoring-policy, risk-management)

### Changed

- Version bump 0.9.8 to 0.9.9
- Archived stale M01-scanner-eval-core.md milestone (work completed in S01-S06)
- `verify_v1_release.sh` version check updated to 0.9.9

### Notes

- All v1.0 pipeline commands confirmed production-ready: init, scan, eval, fix, report, passport, status, daemon
- 2,382+ total tests: 2,194 TS + 188 Rust — all GREEN
- EU AI Act enforcement: August 2, 2026 (~107 days)

## [0.9.8] - 2026-04-17

### Changed

**Pre-Release Polish (V1-M15)**
- SARIF output now includes file locations (`locations` + `partialFingerprints`) for GitHub Code Scanning and IDE integration
- `--fail-on` flag validates severity at parse time (clap ValueEnum: critical, high, medium, low)
- "Starting Complior engine..." message shown during cold start instead of silent wait
- Hidden deprecated `--no-tui` flag (scans are always headless)
- Added `complior completions <shell>` for bash/zsh/fish/PowerShell tab completions
- Wrapped engine parse errors with user-friendly messages suggesting `complior doctor`
- Added "No AI components detected" hint when scan finds no L3/L4/L5 findings
- Improved `--cloud` stub message with actionable alternatives
- Version bump 0.9.7 → 0.9.8

## [0.9.7] - 2026-04-16

### Changed

**Release Polish (V1-M14)**
- Version bump 0.9.6 → 0.9.7
- README license corrected: MIT → AGPL-3.0
- README eval syntax: `--target` flag removed (positional argument)
- SDK references marked as "(planned)" in README
- GitHub URL corrected to `complior/complior` across CLI
- URL consistency: all CLI references now use `complior.ai`
- Help text cleanup: removed milestone prefixes and backtick artifacts from doc comments
- `--cloud` error now shows user-friendly message
- `--help` examples added to Scan, Eval, Fix, Report, Passport, and top-level commands
- `complior version` now shows git hash and target triple
- `complior doctor` returns exit code 1 if critical checks fail
- HTML report uses system fonts (offline-safe, no Google Fonts dependency)
- npm postinstall verifies SHA256 checksum of downloaded binary
- CI env vars printed one-per-line with consistent `COMPLIOR_SCORE` naming
- Passport error messages now include contextual hints (engine not running, not found, timeout)
- Engine connection errors show `complior daemon` hint instead of internal paths
- Config parse errors show warning and fall back to defaults
- Windows: daemon stop uses `taskkill` instead of "not supported" message
- Windows: `is_process_alive` uses `tasklist` instead of always returning true
- `libc` dependency conditional on Unix (not compiled on Windows)

## [0.9.6] - 2026-04-15

### Breaking

**Command Restructuring (V1-M11)**
- `complior agent` renamed to `complior passport` (16 subcommands)
- Document generation moved from `complior agent <type>` to `complior fix --doc <type>`
  - `complior passport fria` → `complior fix --doc fria <name>`
  - `complior passport notify` → `complior fix --doc notify <name>`
  - `complior passport policy` → `complior fix --doc policy <name>`
  - `complior fix --doc soa <name>` (ISO 42001 Statement of Applicability)
  - `complior fix --doc risk-register <name>` (ISO 42001 Risk Register)
  - `complior fix --doc test-gen <name>` (compliance test suite)
  - `complior fix --doc all <name>` (generate all documents)
- All `/agent/*` HTTP routes removed → `/passport/*` (passport CRUD) and `/fix/doc/*` (doc generation)

### Added

**ISO 42001 Document Generators (V1-M07)**
- Statement of Applicability (SoA): 39 ISO 42001 Annex A controls × applicability × evidence from scan
- Risk Register: scan findings → risk matrix (likelihood × impact × mitigation)
- AI Management Policy template (ISO 42001 Clause 5.2)
- 39 ISO 42001 controls data file (`iso-42001-controls.json`)
- New types: `Iso42001Control`, `SoAEntry`, `SoAResult`, `RiskRegisterEntry`, `RiskRegisterResult`

**Context-Aware Scan (V1-M08)**
- Profile-based finding filters: role (provider/deployer) and risk level (high/limited/minimal)
- `ScanFilterContext` in scan response: role, riskLevel, domain, obligationCounts, skipCounts
- Obligation coverage filtering by risk level
- Top-3 priority actions in scan response (profile-aware)

**Onboarding Enrichment (V1-M09)**
- 9-question onboarding wizard across 5 blocks (role, business, data, system, deployment)
- Dynamic obligation filtering: 108 obligations filtered by role + risk level + GPAI status
- GPAI auto-detection from package.json (openai, anthropic, google, mistral, cohere SDKs)
- `complior init --reconfigure` to update project profile without full re-init
- New profile fields: `gpaiModel`, `autonomousDecisions`, `biometricData`, `userFacing`

**Score Transparency (V1-M10)**
- Score disclaimer: explains coverage, limitations, category weights, critical-cap rule
- Category breakdown: per-category impact levels, top failures, explanations
- Profile-aware top-5 priority actions (deadline proximity × severity × category weakness)
- `complior status [--json]` command with full compliance posture overview
- `GET /status/posture` endpoint returning aggregate `CompliancePosture`

**Command Restructuring (V1-M11)**
- `complior passport` with 16 subcommands: init, list, show, validate, completeness, rename, autonomy, notify, registry, permissions, evidence, audit, export, import
- `complior fix --doc <type>` for document generation (fria, notify, policy, soa, risk-register, test-gen, all)
- 19 `/passport/*` HTTP routes for passport CRUD, validation, evidence, audit, export
- 8 `/fix/doc/*` HTTP routes for document generation
- E2E tests split to separate vitest config (`vitest.e2e.config.ts`)

### Fixed

- Rust CLI `VALID_DOC_TYPES` now includes 3 ISO 42001 types (V1-M12)
- Agent discovery no longer parses non-path route strings like `app.get('env')` (TD-14)
- Rust CLI routes corrected: `/passport/doc` → `/fix/doc/generate` (TD-27)
- Deprecated `/agent/*` route stub removed (TD-26)
- Unused `buildPriorityActions` import removed from scan.route.ts (TD-12)

### Notes

- 2502 total tests: 2194 TS unit + 130 E2E + 178 Rust — all GREEN
- EU AI Act enforcement: August 2, 2026 (~3.5 months)
- All v1.0 pipeline commands feature-complete: init, scan, eval, fix, report, passport, status

## [0.9.5] - 2026-04-12

### Added

**UX Quality Polish (V1-M06)**
- Fix preview renders full template content (not `[TEMPLATE:xxx]` markers)
- Action plan returns top-5 prioritized actions with `effort` + `projectedScore`
- Obligations endpoint filters by project role + risk level
- L4 findings grouped by checkId (aggregated: `count` + `affectedFiles`)
- Report builder populates `documentContents` from project docs
- Passport model detection strips comments, filters env var keys
- Fix preview includes `projectedScore` (what-if simulation)
- 29 new UX quality tests (11 unit + 18 E2E-gated)

**Full CLI Flag Coverage (v1.0 pipeline commands)**
- `complior scan` — all 12 flags wired and E2E tested: `--json`, `--sarif`, `--ci`, `--threshold`, `--fail-on`, `--diff`, `--fail-on-regression`, `--comment`, `--deep`, `--llm`, `--quiet`, `--agent`
- `complior eval` — all 22 flags wired and E2E tested: `--det`, `--llm`, `--security`, `--full`, `--json`, `--ci`, `--threshold`, `--categories`, `--last`, `--failures`, `--verbose`, `--remediation`, `--fix`, `--dry-run`, `--model`, `--api-key`, `--request-template`, `--response-path`, `--headers`, `--concurrency`, `--no-remediation`, `--agent`
- `complior fix` — all 5 flags: `--dry-run`, `--json`, `--ai`, `--source scan/eval/all`, `--check-id`
- `complior report` — all 4 flags: `--format human/json/md/html/pdf`, `--json`, `--share`, `--output`
- `complior passport` — all 14 subcommands: `init`, `list`, `show`, `validate`, `completeness`, `rename`, `autonomy`, `registry`, `permissions`, `evidence`, `export`, `import`, `audit` (renamed from `complior agent` in v0.9.6)

**E2E Test Suite**
- 46 engine-level E2E tests via Hono in-memory HTTP (scan, eval, fix, report, agent flags)
- 13 acceptance scripts (bash) covering full pipeline, report export, CLI flags, agent CLI, FRIA flow, score growth, self-scan, API key handling, CI validation

**Report HTML**
- 9-tab interactive HTML compliance report (`complior report --format html`)
- Eval conformity scoring with A-F grades per category
- Per-mode score tracking (deterministic / LLM / security / full)

**Sync Contract**
- `SyncPassportSchema`, `SyncScanSchema`, `SyncDocumentsSchema`, `SyncFriaSchema` — types for CLI ↔ SaaS data exchange

### Fixed

- 57 TypeScript type errors resolved across 29 files
- CI typecheck (`npx tsc --noEmit`) re-enabled in GitHub Actions
- npm security vulnerabilities fixed (hono, vite upgraded)
- Flaky E2E test failures eliminated (evidence chain reset, env loading, EACCES writes)
- `POST /report/status/markdown` now correctly forwards `outputPath`

### Changed

- `--cloud` flag hidden from `--help` (planned feature, not yet available)
- Acceptance scripts hardened: `set +e` around exit-code tests, `PAGER=cat` for non-interactive, `/tmp` log writes removed

### Notes

- 2389 total tests: 2194 TS (vitest, 157 files) + 195 Rust (cargo test) — all GREEN
- TypeScript typecheck clean: `tsc --noEmit` → 0 errors
- Reviewer approved: V1-M01..M06 complete
- EU AI Act enforcement: August 2, 2026 (~4 months)

## [0.9.0] - 2026-04-03

### Added

**Core Pipeline**
- `complior init` -- Initialize project with `.complior/` config and auto-discover AI agents
- `complior scan` -- 5-layer compliance scanner (file presence, document structure, config/deps, AST patterns, LLM analysis)
- `complior eval <url>` -- Dynamic AI system evaluation: 168 deterministic + 212 LLM-judged + 300 security probes
- `complior fix` -- Auto-fix Type A (SDK wrapping), Type B (document generation), Type C (config creation)
- `complior report` -- Generate compliance reports (Markdown, PDF)
- `complior doctor` -- System health diagnostics
- `complior version` / `complior update` -- Version info and self-update

**Agent Passport**
- `complior passport init` -- Auto-generate Agent Passport (36 fields) from codebase analysis
- `complior passport list/show/validate` -- Manage and inspect passports
- `complior fix --doc fria` -- Generate Fundamental Rights Impact Assessment (Art. 27)
- `complior fix --doc notify` -- Generate Worker Notification (Art. 26(7))
- `complior passport export` -- Export to A2A, AIUC-1, NIST formats
- `complior passport evidence` -- Tamper-evident evidence chain (ed25519 signed, hash-linked)
- `complior fix --doc policy` -- Generate industry-specific AI usage policies
- `complior passport permissions/registry/completeness` -- Cross-agent governance

**Scanner**
- 33 pattern rules across 8 categories
- 45 banned package patterns covering all Art. 5 prohibitions
- Cross-layer verification (5 rules: doc-code mismatch, SDK disclosure, etc.)
- Evidence collection on findings
- Drift detection between scans
- SBOM generation (CycloneDX 1.5)
- Passport-aware scanning (presence, completeness, cross-passport-code mismatch)

**Eval System**
- 680 total test probes (deterministic + LLM-judged + security)
- OWASP LLM Top 10 security testing
- Custom endpoint adapter (--request-template, --response-path, --headers)
- Auto-remediation with `--fix` flag
- CI mode with configurable thresholds

**SDK (@complior/sdk)**
- Runtime compliance middleware: `complior(client, config)`
- Agent-aware wrapper: `compliorAgent(client, config)`
- Pre-hooks: disclosure, prohibited patterns (138), PII sanitization (50+ types), permission, rate-limit
- Post-hooks: disclosure-verify, content-marking, bias-check, budget, action-log
- Provider adapters: OpenAI, Anthropic, Google, Vercel AI
- HTTP middleware for Express/Hono
- Domain-specific hooks: HR, finance, healthcare, education, legal, content

**Daemon**
- `complior daemon start/status/stop` -- Background compliance monitoring
- File watcher with 200ms rescan
- HTTP API + SSE for real-time updates
- PID file management for multi-instance discovery

**Infrastructure**
- Cross-platform builds: Linux (x86_64, aarch64), macOS (x86_64, arm64), Windows (x86_64)
- npm wrapper package (`complior`) for `npx complior` usage
- Cargo feature gates: `tui` (dashboard), `extras` (advanced commands)
- GitHub Actions CI/CD with release automation

### Notes

- This is the first public release (v0.9.0)
- EU AI Act enforcement deadline: August 2, 2026
- TUI dashboard available via `cargo install complior-cli --features tui`
