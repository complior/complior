# Contributing to Complior

Thank you for considering contributing to Complior! This guide will help you get started.

## Development Setup

### Prerequisites

- **Rust** (edition 2024, latest stable)
- **Node.js** >= 22 (or Bun)
- **Git**

### Getting Started

```bash
git clone https://github.com/complior/complior.git
cd complior

# Install TS dependencies
npm install

# Build CLI (core only)
cargo build

# Build CLI (with TUI dashboard)
cargo build --features tui

# Run tests
cargo test --all-features
cd engine/core && npx vitest run
cd engine/sdk && npx vitest run
```

## Branch Naming

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Test additions/fixes |
| `chore/` | Maintenance tasks |

All branches should be created from `dev` and PRs submitted to `dev`.

## Commit Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new scanner rule for Art. 10 data governance
fix: correct score calculation for L2 findings
docs: update passport field descriptions
refactor: extract evidence chain into separate module
test: add contract tests for HTTP API
chore: update dependencies
```

## Pull Request Process

1. Create a feature branch from `dev`
2. Make your changes with clear, focused commits
3. Ensure all tests pass: `cargo test --all-features` and `npx vitest run`
4. Run clippy: `cargo clippy --all-features -- -D warnings`
5. Open a PR to `dev` with a clear description

## What We Accept

- Bug fixes with tests
- Scanner rule improvements (new patterns, better detection)
- Documentation improvements
- Performance optimizations with benchmarks
- New eval test probes

## What We Don't Accept (Yet)

- Changes to the compliance determination logic (deterministic core principle)
- New LLM integrations without discussion
- Breaking changes to the CLI interface
- Changes to the Agent Passport schema without an RFC

## Code Style

### Rust
- `cargo clippy` strict (pedantic + nursery)
- `rustfmt` default config
- `Result<T, E>` for error handling (no unwrap in production code)

### TypeScript
- Strict mode, ESM only
- Zod for validation
- No `any` types

## Architecture Rules

1. **Deterministic core**: LLM never makes compliance determinations
2. **Clean Architecture**: Domain never imports from infra/http
3. **Data externalization**: Reference data in JSON files, not hardcoded in TS
4. **Feature flags**: TUI and extras behind Cargo feature gates

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Use the issue templates provided

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0-only license.
