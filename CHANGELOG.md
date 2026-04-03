# Changelog

All notable changes to Complior will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
