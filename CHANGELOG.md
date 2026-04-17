# Changelog

All notable changes to Complior will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
