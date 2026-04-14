# Changelog

All notable changes to Complior will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking

**Command Restructuring (V1-M11)**
- `complior agent` renamed to `complior passport` (16 subcommands)
- Document generation moved from `complior agent <type>` to `complior fix --doc <type>`
  - `complior agent fria` → `complior fix --doc fria <name>`
  - `complior agent notify` → `complior fix --doc notify <name>`
  - `complior agent policy` → `complior fix --doc policy <name>`
  - `complior agent soa` → `complior fix --doc soa <name>`
  - `complior agent risk-register` → `complior fix --doc risk-register <name>`
  - `complior agent test-gen` → `complior fix --doc test-gen <name>`
  - `complior agent doc all` → `complior fix --doc all <name>`
- All `/agent/*` HTTP routes deprecated → `/passport/*` (passport CRUD)
- All doc-gen HTTP routes moved to `/fix/doc/*`

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
- `complior agent` — all 14 subcommands: `init`, `list`, `show`, `validate`, `completeness`, `fria`, `evidence`, `export`, `rename`, `autonomy`, `notify`, `registry`, `permissions`

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
- `complior agent init` -- Auto-generate Agent Passport (36 fields) from codebase analysis
- `complior agent list/show/validate` -- Manage and inspect passports
- `complior agent fria` -- Generate Fundamental Rights Impact Assessment (Art. 27)
- `complior agent notify` -- Generate Worker Notification (Art. 26(7))
- `complior agent export` -- Export to A2A, AIUC-1, NIST formats
- `complior agent evidence` -- Tamper-evident evidence chain (ed25519 signed, hash-linked)
- `complior agent policy` -- Generate industry-specific AI usage policies
- `complior agent permissions/registry/completeness` -- Cross-agent governance

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
