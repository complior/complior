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

1. Create a feature branch from `dev` (`feature/<short-description>`)
2. Make your changes with clear, focused commits
3. Ensure all tests pass:
   - Rust: `cargo test --bin complior` (expect 226+ PASS)
   - TS Engine: `cd engine/core && npx vitest run` (expect 2,493+ PASS, 0 failures)
   - SDK: `cd engine/sdk && npx vitest run`
4. Run quality gates:
   - `cargo fmt -- --check`
   - `cargo clippy --all-targets -- -D warnings`
   - Version consistency: `cd engine/core && npx vitest run src/version.test.ts` (5/5 PASS)
5. Open a PR to `dev` with a clear description following the template below
6. Wait for CI green (Rust Tests/Clippy/Fmt/Audit + Engine + npm Audit + Version Consistency + Detect changes)
7. Address review feedback
8. Maintainer will merge

### PR description template

```markdown
## Summary

[What this PR does, 1-3 sentences]

## What changed

[Bullet list of concrete changes]

## Verification

- [ ] All tests pass locally
- [ ] cargo fmt + clippy clean
- [ ] No test files modified (tests are specs — see below)
- [ ] Documentation updated if behavior changed

## Test plan

- [ ] [How to verify the change]

## References

[Links to issues, RFCs, related PRs]
```

### Test discipline

Tests in this repo are **specifications**, not just verifications:
- Tests are written by the architect ahead of implementation (RED phase)
- Implementation makes them GREEN
- **Do not modify existing tests to make your code pass** — file an issue if a test seems wrong
- New tests should follow the same pattern: write RED first, then implement

This discipline is enforced in code review.

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

1. **Deterministic core**: LLM never makes compliance determinations. LLM is opt-in for L5 deep scan and document enrichment only (`--llm`, `--ai`, `--full`).
2. **Clean Architecture**: Domain never imports from infra/http. Closures-as-DI in TS Engine; trait-based in Rust CLI.
3. **Data externalization**: Reference data in JSON files (`engine/core/data/`), not hardcoded in TS. Imports use `import data from '...json' with { type: 'json' }`.
4. **Feature flags**: TUI and extras behind Cargo feature gates (`tui`, `extras`).
5. **Branch model**: `feature/* → dev → main`. Never push directly to `dev` or `main`. PRs only.
6. **Predicted score cap**: Predicted/projected scores are capped at 99 (never 100) — see [ADR-008](docs/adr/ADR-008-predicted-score-cap-invariant.md). Static-source tests enforce this invariant.
7. **No global state in Engine**: All services receive dependencies via closures. Composition root is `engine/core/src/composition-root.ts`.
8. **Object.freeze() on returned objects**: TS Engine domain functions return frozen objects to enforce immutability.

See `docs/feature-areas/*.md` for per-subsystem architecture detail and `docs/contributing/CODING-STANDARDS*.md` for style conventions (Rust + TypeScript).

## Roadmap & Charter

Before proposing large changes, please review:

- [`docs/PRODUCT-VISION.md`](docs/PRODUCT-VISION.md) — what we're building, why
- [`docs/STRATEGY.md`](docs/STRATEGY.md) — phased roadmap
- [`docs/V2-ROADMAP.md`](docs/V2-ROADMAP.md) — milestone-level V2 plan
- [`docs/feature-areas/*.md`](docs/feature-areas/) — per-subsystem architecture
- [`docs/adr/*.md`](docs/adr/) — architecture decision records

Open an [issue](https://github.com/complior/complior/issues) tagged `rfc` to discuss large changes before opening a PR.

## Release process

For maintainers cutting a new release: see [`docs/RELEASE-PROCESS.md`](docs/RELEASE-PROCESS.md) for the full operational runbook (manifest bumps, CHANGELOG, tag → release.yml flow).

## Getting Help

- **Bug reports / feature requests:** [open an issue](https://github.com/complior/complior/issues)
- **Security vulnerabilities:** see [SECURITY.md](SECURITY.md) — email security@complior.ai (do NOT open public issue)
- **Documentation:** [docs.complior.ai](https://docs.complior.ai)
- **Discussions:** [GitHub Discussions](https://github.com/complior/complior/discussions)
- **Existing issues:** Please search before creating new ones.
- **Issue templates:** Use the provided templates when available.

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0-only license.
