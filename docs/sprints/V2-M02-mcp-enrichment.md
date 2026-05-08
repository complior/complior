# V2-M02 — MCP Enrichment

**Status:** RED (contracts + tests committed; awaiting nodejs-dev for GREEN)
**Created:** 2026-05-07
**Owner FA:** [FA-08 MCP Architecture](../feature-areas/mcp-architecture.md)
**Branch:** `feature/V2-M02-mcp-enrichment`
**Version target:** 1.0.1 → 1.1.0 (minor bump — additive feature, 0 breaking changes)
**Related:** [V2-ROADMAP §V2-M02](../V2-ROADMAP.md), [STRATEGY Phase 2](../STRATEGY.md)

---

## 1. Goal

Enrich Complior's MCP server from **7 → 13 tools**. Six new tools turn AI agents
(Claude Code, Cursor, Windsurf, Codex CLI) from "compliance advisors" into
"compliance executors" — they can build passports, generate EU AI Act documents,
run red-team probes, verify evidence chain integrity, detect drift between scans,
and inspect obligation coverage without leaving the dev workflow.

**0 breaking changes** to the existing 7 tools. Adding tools only.

---

## 2. Scope

### Phase 2.1 — Builder tools (3)

| Tool | What it does | Service used |
|------|--------------|--------------|
| `complior_passport_init` | Mode 1 Auto: AST scan → AgentPassport (36 fields, ed25519-signed) | `PassportService.initPassport()` |
| `complior_doc_generate` | Generate one of 14 EU AI Act documents (FRIA, RMS, Data Governance, etc.) | `PassportService.generateDocByType()` |
| `complior_redteam` | 300 OWASP/MITRE adversarial probes against an endpoint | `EvalService.runEval({security: true})` |

### Phase 2.2 — Analytics tools (3)

| Tool | What it does | Service used |
|------|--------------|--------------|
| `complior_evidence_verify` | Verify SHA-256 + ed25519 chain integrity | `EvidenceStore.verify()` + `getSummary()` |
| `complior_drift_detect` | Compare current scan vs previous, severity (none/minor/major/critical) | `detectDrift(current, previous)` (pure fn) |
| `complior_obligations_status` | Per-obligation coverage breakdown (108 × covered/uncovered) | `regulationData.obligations` + `getLastScanResult()` |

### Out of scope (explicit)

- ❌ Phase 4 SaaS Dashboard MCP — blocked on cloud deploy
- ❌ Guard tools (`complior_guard_check`, `complior_guard_pii`) — V2-M03 after Guard MVP
- ❌ Rust CLI / TUI changes — this milestone is TS-engine only
- ❌ HTTP API changes — MCP uses stdio transport, not HTTP
- ❌ Modifying any of the existing 7 tools (backward compat is non-negotiable)

---

## 3. Tasks

| # | Task | Owner | Verification | Architecture Requirements | Files |
|---|------|-------|--------------|---------------------------|-------|
| **T-0** | Extend `McpStackDeps` interface — accept PassportService, EvalService, EvidenceStore, getPreviousScanResult | architect | typecheck PASS | `readonly` fields, optional services, no globals | `engine/core/src/mcp/create-mcp-stack.ts` |
| **T-1** | Add 6 schemas to `MCP_TOOL_SCHEMAS` — Zod typed, descriptive | architect | typecheck PASS | `as const`, `.describe()` per param, no `any` | `engine/core/src/mcp/tools.ts` |
| **T-2** | Extend `McpHandlerDeps` — add optional 4 deps (passportService, evalService, evidenceStore, getPreviousScanResult) | architect | typecheck PASS | optional, readonly | `engine/core/src/mcp/handlers.ts` |
| **T-3** | Write 24+ RED tests for 6 new handlers + update legacy schema test (7→13) | architect | `vitest run mcp/` shows 29 RED | Real types, concrete numbers, deterministic, typed errors | `engine/core/src/mcp/mcp-server.test.ts` |
| **T-4** | Wire PassportService + EvalService + EvidenceStore + getPreviousScanResult into `createMcpStack` | nodejs-dev | typecheck + tests | Factory fn, `Object.freeze` return, DI via closure, no global state | `engine/core/src/mcp/create-mcp-stack.ts` |
| **T-5** | Implement `complior_passport_init` handler | nodejs-dev | 5 RED → GREEN | Pure fn, typed errors, graceful when service undefined | `engine/core/src/mcp/handlers.ts` |
| **T-6** | Implement `complior_doc_generate` handler | nodejs-dev | 5 RED → GREEN | Same + DocType enum validated by Zod schema | `engine/core/src/mcp/handlers.ts` |
| **T-7** | Implement `complior_redteam` handler | nodejs-dev | 5 RED → GREEN | Same + URL validated, threshold check returns isError when failed | `engine/core/src/mcp/handlers.ts` |
| **T-8** | Implement `complior_evidence_verify` handler | nodejs-dev | 4 RED → GREEN | Same + return both `valid` and `summary` fields | `engine/core/src/mcp/handlers.ts` |
| **T-9** | Implement `complior_drift_detect` handler | nodejs-dev | 5 RED → GREEN | Pure call to `detectDrift()`, severity enum exposed | `engine/core/src/mcp/handlers.ts` |
| **T-10** | Implement `complior_obligations_status` handler | nodejs-dev | 5 RED → GREEN | Profile-aware filter, deterministic | `engine/core/src/mcp/handlers.ts` |
| **T-11** | Register 6 new tools in `server.ts` | nodejs-dev | smoke test PASS | Same registration pattern as existing 7 | `engine/core/src/mcp/server.ts` |
| **T-12** | Wire MCP stack from composition-root (or wherever MCP is started) — pass all V2-M02 deps | nodejs-dev | E2E call from real MCP client works | DI via closure, services come from existing composition root | `engine/core/src/mcp/composition-root-or-equivalent.ts` (TBD by dev) |
| **T-13** | Update Mintlify `mcp/tools-reference.mdx` (7 → 13 tools) | architect (post-GREEN) | doc renders | Same MD structure as existing 7 entries | `~/complior_doc/mcp/tools-reference.mdx` |
| **T-14** | Update FA-08 status `🟡 BASE → ✅ ENRICHED (13 tools)` | architect (post-GREEN) | review | — | `docs/feature-areas/mcp-architecture.md` |
| **T-15** | Smoke test script: real-call each new tool | architect | script PASS | bash script, exits 0 on success | `scripts/verify_v2_m02_mcp.sh` |

---

## 4. RED test breakdown (T-3, committed)

29 new failing tests across 6 handler describe-blocks plus 4 schema-registry tests:

| Handler | Tests | Covers |
|---------|-------|--------|
| `complior_passport_init` | 5 | passport content, savedPaths, agentName forwarding, missing service, no agents |
| `complior_doc_generate` | 5 | markdown content, prefilled/manual fields, savedPath, missing service, passport not found |
| `complior_redteam` | 5 | score/totalTests, security score+grade, threshold pass, threshold fail (isError), missing service |
| `complior_evidence_verify` | 4 | valid+summary, brokenAt on tampered chain, firstEntry/lastEntry, missing service |
| `complior_drift_detect` | 5 | scoreChange+severity, hasDrift flag, no-history graceful, no-current isError, affected articles |
| `complior_obligations_status` | 5 | total count, role filter, riskLevel filter, per-obligation coverage, deterministic |
| **Schema registry** | 4 | 13 total tools, 7 legacy preserved, 6 new added, descriptions non-empty |

**Plus 4 legacy v1.0 handler tests preserved** (regression — must remain GREEN).

Total file: **37 tests** in `mcp-server.test.ts`. Baseline RED state: 29 failed / 8 passed.

---

## 5. Acceptance criteria

- [ ] 13 tools registered in `server.ts`
- [ ] All 29 V2-M02 RED tests → GREEN
- [ ] All 8 legacy tests stay GREEN (no regression)
- [ ] `npx vitest run` (full TS suite) GREEN — 0 failures
- [ ] `npx tsc --noEmit` clean
- [ ] `cargo test -p complior` GREEN (no regressions in Rust CLI)
- [ ] `cargo clippy --all-targets -D warnings` PASS
- [ ] Smoke test (`scripts/verify_v2_m02_mcp.sh`) PASS — each new tool returns valid response from real MCP server
- [ ] Mintlify `mcp/tools-reference.mdx` updated (13 tools documented)
- [ ] CHANGELOG.md entry under `[1.1.0]`
- [ ] 5 manifests bumped 1.0.1 → 1.1.0 (workspace `Cargo.toml` + `package.json` × 4)
- [ ] FA-08 status updated `🟡 BASE → ✅ ENRICHED (13 tools)`
- [ ] **0 breaking changes** verified — every v1.0 MCP client still works identically

---

## 6. Architecture requirements (non-negotiable)

Per `.claude/rules/code-style.md` + `architect-protocol.md` Phase 4.4:

### TypeScript handler patterns

- ✅ **Factory pattern only** — `createMcpHandlers(deps)` returns frozen object of handlers
- ✅ **DI via closure** — services captured from `deps`, no global state, no module-level mutable bindings
- ✅ **Optional service deps** — when undefined, return `{isError: true}` rather than throw
- ✅ **No data hardcoded** — DocType enum derived from `template-registry.ts` (single source of truth)
- ✅ **Zod-typed inputs** — every new schema has `.describe()` per param for AI-agent UX
- ✅ **Typed errors** — `result.isError = true` for failures, never silent swallow
- ✅ **Deterministic** — same input + same scan-result fixture → same output (T-3 enforces in tests)
- ✅ **Pure handlers where possible** — only `complior_passport_init`/`doc_generate`/`redteam` have side effects (file I/O, HTTP); analytics handlers are pure over inputs

### Forbidden

- ❌ No `any` casts in new handler code (existing handlers tolerated for now)
- ❌ No `console.log` — use the existing `createLogger('mcp')` from `infra/logger.js`
- ❌ No new external npm dependencies — everything reuses existing services
- ❌ No modification of existing 7 tools, schemas, or handler signatures

---

## 7. Environment preconditions (architect ensures BEFORE nodejs-dev starts)

- [x] `npm install` clean in `engine/core/`
- [x] `npx vitest run src/mcp/` baseline shows 29 RED (new V2-M02 tests) + 8 GREEN (legacy + schema)
- [x] `npx tsc --noEmit` clean
- [x] `cargo build` compiles
- [x] PassportService / EvalService / EvidenceStore exports verified accessible for DI
- [x] `feature/V2-M02-mcp-enrichment` branch pushed
- [ ] Mintlify `~/complior_doc/` repo accessible for T-13 (post-GREEN)

---

## 8. Risk register

| Risk | Mitigation |
|------|------------|
| `EvalService` requires `OPENROUTER_API_KEY` for LLM-judged probes | `complior_redteam` accepts optional `apiKey` arg + forwards to runEval; security probes are deterministic (no LLM judge needed by default) |
| `EvidenceStore.verify()` performs disk I/O — slow / can throw | Handler wraps in `try/catch`, returns `{isError: true, message: 'Chain not found or unreadable'}` |
| Breaking changes via accidental schema modification | Phase 2 schemas are append-only; CI test `preserves all 7 v1.0 tools` enforces |
| MCP SDK timeout on long ops (`scan --deep`, `redteam`) | Document in tools-reference.mdx that these may take 30s+; MCP client must use `requestTimeout: 300000` |
| `getPreviousScanResult` not yet wired in composition-root | T-12 explicitly includes this; if not yet stored on disk, return graceful "no previous scan" path |

---

## 9. Workflow

```
ФАЗА 1 (architect — DONE):
  ✅ Branch feature/V2-M02-mcp-enrichment created from dev
  ✅ T-0/T-1/T-2: Extended interfaces + 6 schemas added
  ✅ T-3: 24+ RED tests + schema-registry tests written
  ✅ Verified: vitest run → 29 RED / 8 GREEN
  ⏳ Commit + push: "feat(V2-M02): contracts + RED tests"

ФАЗА 2 (nodejs-dev):
  ⏳ T-4..T-12: Wire services, implement 6 handlers, register tools
  ⏳ Verify: vitest run → all GREEN

ФАЗА 3 (test-runner):
  ⏳ Full vitest suite, full cargo test, report

ФАЗА 4 (reviewer):
  ⏳ Scope check (only mcp/ touched), tests not modified
  ⏳ project-state.md update

ФАЗА 5 (architect post-GREEN):
  ⏳ T-13: Mintlify update
  ⏳ T-14: FA-08 status update
  ⏳ T-15: Smoke test script
  ⏳ Version bump 1.1.0 + CHANGELOG
  ⏳ PR feature → dev

ФАЗА 6 (user):
  ⏳ Merge feature → dev
  ⏳ CI GREEN check on dev
  ⏳ When ready: dev → main + tag v1.1.0
  ⏳ Release pipeline auto-publishes
```

---

## 10. Smoke test outline (T-15)

`scripts/verify_v2_m02_mcp.sh` will:

1. Start engine in background (`npm run start --prefix engine/core`)
2. Spawn MCP client over stdio (`node -e '<minimal MCP client snippet>'`)
3. For each of 6 new tools:
   - Call with valid args → expect `isError !== true`
   - Call with intentionally invalid args → expect `isError === true`
4. Tear down engine
5. Exit 0 on full success, exit 1 on any failure

Total expected duration: <30 seconds (no real LLM calls — `redteam` will be tested against a mock endpoint).

---

## 11. Post-merge follow-ups (NOT in this milestone)

Tracked separately for future milestones:

- **V2-M02.1** (potential): Phase 3 SaaS Dashboard MCP integration — blocked on cloud deploy
- **V2-M02.2** (potential): Additional Guard tools when V2-M03 unblocks
- **V2-M02.3** (potential): Per-tool rate limiting (some tools are expensive — `redteam` especially)

---

**References:**
- [FA-08 MCP Architecture](../feature-areas/mcp-architecture.md)
- [V2-ROADMAP V2-M02](../V2-ROADMAP.md)
- [STRATEGY Phase 2](../STRATEGY.md)
- [tools-reference.mdx (Mintlify)](https://docs.complior.dev/mcp/tools-reference) (target post-merge)
