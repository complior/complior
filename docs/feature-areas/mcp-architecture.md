# Feature Area: MCP Architecture

> **Source:** `docs/MCP-UNIFIED-PLAN.md`
> **Version:** 2.0.0
> **Date:** 2026-05-07
> **Purpose:** MCP Server + Proxy — 13 tools, proxy infrastructure for Mode 2 passport
> **Status (v1.1.0):** ✅ ENRICHED — **13 tools shipped** in V2-M02 (Phase 2.1 Builder + Phase 2.2 Analytics).
> Legacy v1.0 (7 tools): scan, fix, status, explain, search_tool, classify, report.
> V2-M02 additions (6 tools): passport_init, doc_generate, redteam, evidence_verify, drift_detect, obligations_status.
> Phase 4 (deferred): SaaS Dashboard MCP — blocked on cloud deploy (V2-M07).

---

## 1. Purpose

**MCP Server** provides tools for external AI agents (Claude Code, Codex CLI) to interact with Complior.

**MCP Proxy** enables **Passport Mode 2 (Runtime)** for black-box AI agents where source code is unavailable:
```
Agent ──MCP──> Complior Proxy ──MCP──> Upstream MCP Server
                    │
               Records every tool call:
               - tool name, args, timing
               - success/error rates
               - data access patterns
                    │
               Enriches Passport:
               - tools_used: ["fetch_order", "query_db"]
               - data_access: {orders: {read: 847, write: 88}}
               - autonomy_level: L3 (inferred)
               - confidence: 0.55 (runtime-only)
```

---

## 2. Current State

### Implemented (v1.1.0)

| Component | File | LOC |
|-----------|------|-----|
| Proxy Types | `domain/proxy/proxy-types.ts` | — |
| Policy Engine | `domain/proxy/policy-engine.ts` | 138 |
| Proxy Interceptor | `domain/proxy/proxy-interceptor.ts` | 121 |
| Proxy Bridge | `domain/proxy/proxy-bridge.ts` | 126 |
| JSON-RPC | `domain/proxy/json-rpc.ts` | — |
| Proxy Service | `services/proxy-service.ts` | 82 |
| Proxy Routes | `http/routes/proxy.route.ts` | 43 |
| **13 MCP Tools** | `mcp/tools.ts`, `mcp/handlers.ts`, `mcp/server.ts` | 200 + 564 + 130 |
| MCP test suite | `mcp/mcp-server.test.ts` | 37 tests |

### V2-M02 Builder + Analytics tools (NEW in v1.1.0)

| Tool | Service used | Use case |
|------|--------------|----------|
| `complior_passport_init` | `PassportService.initPassport` | AI agent generates Mode-1 Auto Passport from inside Claude Code |
| `complior_doc_generate` | `PassportService.generateDocByType` | Generate one of 14 EU AI Act docs (FRIA, RMS, etc.) without leaving chat |
| `complior_redteam` | `EvalService.runEval({security: true})` | 300 OWASP/MITRE probes against endpoint, threshold gate |
| `complior_evidence_verify` | `EvidenceStore.verify + getSummary` | Audit-prep: verify chain integrity (SHA-256 + ed25519) |
| `complior_drift_detect` | `detectDrift(current, previous)` | "What changed since last scan?" with severity classification |
| `complior_obligations_status` | `regulationData.obligations` + `getLastScanResult` | Per-obligation coverage breakdown, role/risk filters |

### Not Yet Implemented

| What | Complexity | Track |
|------|------------|-------|
| Passport enrichment logic from MCP proxy logs | Medium | US-S06-01 (post-V2) |
| Policy hot-reload (file watcher) | Low | US-S06-02 (post-V2) |
| `complior passport init --from-proxy` (Mode 2) | Medium | US-S06-01 (post-V2) |
| Analytics endpoint (`GET /analytics/proxy`) | Low | US-S07-09 (post-V2) |
| Guard tools (3 new MCP tools) | Medium | V2-M03 — blocked on Guard MVP |
| SaaS Dashboard MCP integration | High | V2-M07 — blocked on cloud deploy |

---

## 3. MCP Tools (13 total)

### Legacy v1.0 (7 tools)

| Tool | Purpose |
|------|---------|
| `complior_scan` | Run scan, get findings + score |
| `complior_fix` | Apply fix to a specific finding |
| `complior_status` | Last-scan score + category breakdown |
| `complior_explain` | Explain OBL-xxx / Art. xx in plain language |
| `complior_search_tool` | Search AI tool catalog (OpenAI / Anthropic / LangChain / etc.) |
| `complior_classify` | Risk classification from description + domain |
| `complior_report` | Generate compliance report (JSON / Markdown) |

### V2-M02 additions (6 tools, v1.1.0)

| Tool | Purpose | Long-running |
|------|---------|--------------|
| `complior_passport_init` | Mode 1 Auto: AST scan → AgentPassport (36 fields, ed25519-signed) | 1-3s |
| `complior_doc_generate` | Generate one of 14 EU AI Act documents (FRIA, RMS, Data Governance, ...) | <1s |
| `complior_redteam` | 300+ OWASP/MITRE adversarial probes against an endpoint | 30s–5min |
| `complior_evidence_verify` | Verify SHA-256 + ed25519 evidence chain integrity | <1s |
| `complior_drift_detect` | Compare current vs previous scan, severity classification | <1s |
| `complior_obligations_status` | 108-obligation coverage with role / risk-level / coverage filters | <1s |

---

## 4. Future MCP Tools (post-v1.1.0)

### Guard Tools (V2-M03 — blocked on Guard MVP G-M01)

3 tools: `complior_guard_check`, `complior_guard_pii`, `complior_guard_bias`. **Recommended approach:** MCP tools call SDK hooks internally (DRY — same hooks for SDK direct and MCP tool call).

### SaaS Dashboard tools (V2-M07 — blocked on cloud deploy)

Tools that require online state from Complior Cloud (sync status, fleet view, etc.). Deferred until SaaS Dashboard ships.

---

## 5. Passport Mode 2 vs Mode 1

| | Mode 1 (Auto) | Mode 2 (Semi-Auto) | Mode 3 (Manual) |
|---|---|---|---|
| Input | Source code (AST) | Runtime MCP calls | User form |
| Confidence | 0.85-0.95 | 0.55 | N/A |
| Completeness | 85-95% | 40-60% | 100% |
| Verification | Code-verified | Behavior-observed | Unverified |
| Use case | Own code | Vendor black-box | Any |

---

## 6. Implementation History

### Phase 1 — Proxy Core (S06, partial)
- US-S06-01: Passport enrichment from call logs (deferred post-V2)
- US-S06-02: Policy hot-reload + risk-class linking (deferred post-V2)

### Phase 2 — Builder Tools ✅ (V2-M02, v1.1.0, 2026-05-07)
- `complior_passport_init` — Mode 1 Auto passport generation
- `complior_doc_generate` — 14 doc types (FRIA, RMS, Data Governance, ...)
- `complior_redteam` — 300 OWASP/MITRE security probes

### Phase 3 — Analytics Tools ✅ (V2-M02, v1.1.0, 2026-05-07)
- `complior_evidence_verify` — chain integrity verification
- `complior_drift_detect` — between-scan delta + severity
- `complior_obligations_status` — per-obligation coverage breakdown

### Phase 4 — Guard Tools ⏳ (V2-M03 — blocked on Guard MVP)
- `complior_guard_check` / `_pii` / `_bias` — call SDK hooks internally

### Phase 5 — SaaS Dashboard tools ⏳ (V2-M07 — blocked on cloud deploy)
- D-46: SaaS proxy analytics (separate repo)

## 8. Cross-Dependencies

| Depends on | How |
|---|---|
| **Scanner** | `complior_scan` tool calls ScanService |
| **Fix** | `complior_fix` tool calls FixService |
| **Passport** | `complior_passport` calls PassportService |
| **SDK** | `guard_check`, `guard_pii` call SDK hooks |
| **Report** | Score aggregation from all services |

| Used by | How |
|---|---|
| Claude Code / Claude Desktop / Cursor / Windsurf / Codex CLI | stdio transport MCP integration |

## 9. Test Coverage

MCP server tests: `engine/core/src/mcp/mcp-server.test.ts` — **37 tests** total:

- 4 schema-registry tests (count = 13, legacy preservation, V2-M02 additions, description completeness)
- 4 legacy v1.0 handler tests (regression fence — must stay GREEN)
- 29 V2-M02 handler tests across 6 describe-blocks:
  - `complior_passport_init` (5)
  - `complior_doc_generate` (5)
  - `complior_redteam` (5)
  - `complior_evidence_verify` (4)
  - `complior_drift_detect` (5)
  - `complior_obligations_status` (5)

All tests use real types from `types/`, concrete number assertions, deterministic checks, typed-error coverage, and missing-service graceful-fallback coverage.
