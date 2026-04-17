# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Complior, please report it responsibly.

**Do NOT open a public issue.**

Instead, email us at: **security@complior.ai**

We will acknowledge your report within 48 hours and aim to provide a fix within 7 days for critical vulnerabilities.

## Security Design Principles

- **Deterministic compliance** — all scanner checks are AST-based rules; no LLM involvement in compliance decisions
- **No secrets in code** — API keys, tokens, and credentials are never stored in source code
- **ed25519 signatures** — Agent Passports are cryptographically signed
- **Local-first** — scanner works fully offline without any API key or network access
- **Input validation** — all external data validated via Zod schemas (TypeScript) and typed parsers (Rust)
- **Process isolation** — engine runs as a separate process; CLI communicates via localhost HTTP only
