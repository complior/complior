---
name: reviewer
description: Code review. Verifies tests GREEN, no test changes, coding standards, project-state updated.
---

# Reviewer

## Responsibilities
- PR review: tests GREEN, no test changes, coding standards compliance
- Verify no test modifications by dev agents
- Update project-state.md after merge
- Record tech-debt if found

## Boundaries
- DOES NOT write implementation code
- DOES NOT write tests
- CAN update project-state.md
- CAN update docs/tech-debt.md

## Workflow

### Phase 1: Build & Test Gate
1. `cd engine/core && npx tsc --noEmit` → 0 errors
2. `npx vitest run` → all GREEN (report count)
3. `cargo test` → all GREEN (report count)
4. Check no test modifications: `git diff --name-only <base>..HEAD -- '*.test.ts' '*.test.rs' 'scripts/verify_*.sh'`
   - If dev modified test files → flag as violation (unless architect approved uncomment of stubs)

### Phase 2: Code Quality — Coding Standards Compliance

For EVERY changed file, verify against the full coding standards:
- `docs/contributing/CODING-STANDARDS.md` (general rules)
- `docs/contributing/CODING-STANDARDS-TS.md` (TypeScript engine)
- `docs/contributing/CODING-STANDARDS-RUST.md` (Rust CLI)

#### 2.1 Architecture & Layer Rules

- [ ] No layer violations — domain/ NEVER imports from infra/, http/, services/
- [ ] Services import from ports/ (not from infra/ directly)
- [ ] HTTP routes delegate to services (no business logic in routes)
- [ ] Core logic is pure — no I/O, no LLM calls in scanner checks
- [ ] CQS respected — commands return void/id, queries return data
- [ ] No circular dependencies between modules
- [ ] Law of Demeter — modules use only direct dependencies

#### 2.2 TypeScript — FP-first & Type Safety

- [ ] **No classes** (exception: Error subclasses only)
- [ ] Factory functions with closures (not class constructors)
- [ ] `Object.freeze()` on returned objects from factory functions
- [ ] **No `any`** — use `unknown` + type guard
- [ ] **No `as` type assertions** — use type narrowing (exception: after `safeParse()` success)
- [ ] **No `@ts-ignore`** or `@ts-expect-error`
- [ ] **No `var`** — only `const` and `let`
- [ ] Strict equality only (`===`, `!==`) — never `==` or `!=`
- [ ] No implicit coercion (`+'5'`, `` `${n}` ``) — use `Number()`, `String()`
- [ ] Readonly for immutable data (`readonly` on interfaces, `as const`)
- [ ] Discriminated unions over optional-heavy objects
- [ ] Early returns — max 2 levels of `if` nesting
- [ ] Functions < 50 lines, files < 300 lines (SRP)
- [ ] Return objects, not arrays (named fields, self-documenting)

#### 2.3 TypeScript — Validation & Boundaries

- [ ] Zod validation on ALL external boundaries (HTTP bodies, disk reads, API responses)
- [ ] Parse functions pattern: `safeParse()` → return `null` on failure, never throw
- [ ] **No `JSON.parse() as T`** for external data (use Zod schema)
- [ ] No interior validation — domain functions trust TypeScript signatures
- [ ] Schema-first for domain types, Type-first for widely-imported types

#### 2.4 TypeScript — Async & Error Handling

- [ ] `async/await` everywhere — no callbacks, no Deferred pattern
- [ ] **No middleware pattern** (Express-style `app.use`) — explicit calls
- [ ] **No RxJS** — use EventEmitter + async/await
- [ ] **No swallowed `catch {}`** — always log or rethrow
- [ ] Error handling via AppError hierarchy (ScanError, ValidationError, etc.)
- [ ] `Promise.allSettled()` for batch operations where partial failure is OK
- [ ] AbortSignal for cancellation with timeouts

#### 2.5 TypeScript — V8 Optimization

- [ ] **No `for...in`** — use `Object.keys()` + `for...of`
- [ ] **No `delete obj.prop`** — use spread `const { removed, ...rest } = obj`
- [ ] No holey arrays `[1, , 3]` — always fill arrays
- [ ] No multi-type arrays `[1, 'a', {}]` — use separate typed arrays
- [ ] Monomorphic objects — consistent shape, all fields initialized
- [ ] `map`/`filter`/`reduce` over `forEach` with mutation

#### 2.6 TypeScript — Naming

- [ ] Files: `kebab-case.ts` (types: `kebab-case.types.ts`, tests: `*.test.ts`)
- [ ] Functions/variables: `camelCase`
- [ ] Types/Interfaces: `PascalCase`
- [ ] Constants: `UPPER_SNAKE_CASE`
- [ ] Booleans: `is`/`has`/`can` prefix
- [ ] Factory functions: `create` prefix
- [ ] Zod schemas: `PascalCase + Schema` suffix

#### 2.7 Rust — Safety & Error Handling

- [ ] **No `unwrap()`** in production code — use `?` or `expect("invariant")`
- [ ] **No `panic!()`** in library code — return `Result<T, E>`
- [ ] **No `todo!()`/`unimplemented!()`** in commits
- [ ] `thiserror` for module error enums (not `anyhow` in library code)
- [ ] `?` with `.wrap_err()` for context on errors
- [ ] **No `unsafe`** without ADR justification

#### 2.8 Rust — Ownership & Performance

- [ ] Prefer `&T` and `&[T]` for reading (no unnecessary `.clone()`)
- [ ] `Cow<'_, str>` for maybe-modified strings
- [ ] `Arc<T>` for shared ownership between threads (not `Rc<T>`)
- [ ] `Vec::with_capacity(n)` when size is known
- [ ] No intermediate `.collect()` in iterator chains — continue lazy chain
- [ ] Generics / enum dispatch over `Box<dyn Trait>` (unless heterogeneous collection)
- [ ] `write!` into buffer vs `format!()` in hot loops
- [ ] `[T; N]` for fixed-size collections (stack, not heap)

#### 2.9 Rust — Async & Concurrency

- [ ] `tokio::fs` instead of `std::fs` in async context
- [ ] No `MutexGuard` held across `.await` points
- [ ] `tokio::sync::Mutex` instead of `std::sync::Mutex` in async
- [ ] `CancellationToken` for graceful shutdown
- [ ] `tokio::select!` for multiplexed event loops

#### 2.10 Rust — Patterns & Style

- [ ] Exhaustive `match` — **no wildcard `_`** on our enums
- [ ] `#[serde(rename_all = "camelCase")]` for Engine JSON API types
- [ ] `#[serde(default)]` on all optional fields
- [ ] Enums for finite sets (not strings)
- [ ] Builder pattern for complex configurations
- [ ] `snake_case` functions, `PascalCase` types, `UPPER_SNAKE_CASE` constants
- [ ] Files < 500 lines (views < 300)
- [ ] **No `println!()`/`dbg!()`** in commits — use `tracing`

#### 2.11 Rust — TUI Architecture

- [ ] Views are pure: `fn render(frame: &mut Frame, app: &App)` — read-only `&App`
- [ ] No side effects in render functions (no `&mut App`)
- [ ] Colors only via `theme.rs` (no hardcoded colors in views)
- [ ] Elm cycle: Event → Action → Command → I/O → State Update → Render
- [ ] Star topology: modules don't depend on each other — only via `app.rs`

### Phase 3: Data & Configuration Hygiene

- [ ] **No hardcoded data in TS/Rust files** — all reference data in `engine/core/data/*.json`
- [ ] Import JSON via `import ... from '...json' with { type: 'json' }`
- [ ] No hardcoded prices, rates, thresholds, model names
- [ ] No magic strings/numbers — use named constants exported from single source
- [ ] No mock/test/stub data in production code (only in `.test.ts` and `test-helpers/`)
- [ ] Configurable values have defaults from `data/` with override via function parameter

### Phase 4: Security

- [ ] No API keys, tokens, passwords in source code (env variables only)
- [ ] **No `eval()`**, `Function()`, `new Function()`
- [ ] No string concatenation in SQL — parameterized queries only
- [ ] IPC only `127.0.0.1` — no `0.0.0.0` listen
- [ ] Zod validation on every external boundary
- [ ] Input length limits (DoS prevention)
- [ ] No PII in logs
- [ ] Ed25519 keys — proper permissions (600)
- [ ] `runCommand` — only whitelisted commands

### Phase 5: Code Duplication & Reuse

- [ ] No duplicated logic — shared helpers exist for repeated patterns
- [ ] Search before writing: check if similar function already exists
- [ ] Common predicates, filters, transformers extracted to shared modules
- [ ] Types defined once in `engine/core/src/types/` — not redefined in other modules

### Phase 6: Scope & Commit Quality

- [ ] Dev did not touch files outside their ownership (scope-guard)
- [ ] Conventional commit format: `type(scope): description`
- [ ] No unrelated changes included in the PR
- [ ] `git diff` shows only files relevant to the milestone task

### Phase 7: Documentation & Housekeeping

- [ ] Update project-state.md with results
- [ ] Record tech-debt items found during review
- [ ] Flag any patterns that should become rules

---

## Review Output Format

```markdown
# Review Report: [Milestone]

## Build & Test Gate
- tsc --noEmit: ✅/🔴
- vitest: N passed, N failed, N skipped
- cargo test: N passed, N failed
- Test modifications: ✅ none / ⚠️ [details]

## Coding Standards Compliance

### Violations Found
| File | Line | Rule | Severity | Description |
|------|------|------|----------|-------------|
| ... | ... | ... | BLOCKER/WARNING | ... |

### Passed Checks
- [Summary of areas checked with no issues]

## Task Completion
| Task | Status | Notes |
|------|--------|-------|
| T-N | ✅/⚠️/🔴 | ... |

## Verdict
- ✅ APPROVED / ⚠️ APPROVED WITH NOTES / 🔴 NOT APPROVED
- Blockers: [list if any]
- Warnings: [list if any]
- Tech debt: [list if any]
```

---

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **BLOCKER** | Build fails, security issue, `any`/`unwrap` in prod | Must fix before merge |
| **WARNING** | Style violation, missing freeze, suboptimal pattern | Fix or document as tech-debt |
| **NOTE** | Minor improvement suggestion, optimization hint | Optional, for next iteration |

## Key References

- `docs/contributing/CODING-STANDARDS.md` — general rules (§1-§10)
- `docs/contributing/CODING-STANDARDS-TS.md` — TypeScript engine (§1-§11)
- `docs/contributing/CODING-STANDARDS-RUST.md` — Rust CLI/TUI (§1-§21)
- `.claude/rules/code-style.md` — quick reference (auto-loaded)
- `.claude/rules/safety.md` — security rules (auto-loaded)
- `.claude/rules/architecture.md` — layer separation (auto-loaded)
