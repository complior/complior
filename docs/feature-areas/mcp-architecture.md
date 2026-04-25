# Feature Area: MCP Architecture

> **Source:** `docs/MCP-UNIFIED-PLAN.md`
> **Version:** 1.0.0
> **Date:** 2026-03-17
> **Purpose:** MCP Server + Proxy — 8 tools, proxy infrastructure for Mode 2 passport
> **Status (v1.0.0):** 🟡 BASE VERSION — 8 tools shipped; полная доработка **POST-v1.0.0** (V2-M02)

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

### Implemented (60%)

| Component | File | LOC |
|-----------|------|-----|
| Proxy Types | `domain/proxy/proxy-types.ts` | — |
| Policy Engine | `domain/proxy/policy-engine.ts` | 138 |
| Proxy Interceptor | `domain/proxy/proxy-interceptor.ts` | 121 |
| Proxy Bridge | `domain/proxy/proxy-bridge.ts` | 126 |
| JSON-RPC | `domain/proxy/json-rpc.ts` | — |
| Proxy Service | `services/proxy-service.ts` | 82 |
| Proxy Routes | `http/routes/proxy.route.ts` | 43 |
| **8 MCP Tools** | `mcp/`, `llm/tool-definitions.ts` | — |

### Not Yet Implemented

| What | Complexity | User Story |
|------|------------|------------|
| Passport enrichment logic | Medium | US-S06-01 |
| Policy hot-reload (file watcher) | Low | US-S06-02 |
| `complior passport init --from-proxy` (Mode 2) | Medium | US-S06-01 |
| Analytics endpoint (`GET /analytics/proxy`) | Low | US-S07-09 |
| Guard tools (3 new MCP tools) | Medium | US-S08-12 |
| Builder workflow tools (3 new MCP tools) | Medium | US-S08-13 |

---

## 3. MCP Tools (Existing 8)

| Tool | Purpose |
|------|---------|
| `complior_scan` | Run scan, get findings |
| `complior_fix` | Apply fix to finding |
| `complior_score` | Get current score |
| `complior_passport` | Generate/read passport |
| `complior_explain` | Explain OBL-xxx in human language |
| `complior_validate` | Check passport completeness |
| `complior_guard_check` | Runtime safety check |
| `complior_guard_pii` | PII detection |

---

## 4. Planned MCP Tools

### Guard Tools (US-S08-12)

3 tools: `check`, `pii`, `bias`. **Recommended approach:** MCP tools call SDK hooks internally (DRY — same hooks for SDK direct and MCP tool call).

### Builder Workflow Tools (US-S08-13)

3 tools: pre-generate, post-generate, suggest.

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

## 6. Implementation Order

```
Phase 1 (1 day): Finish Proxy Core
  └── US-S06-01: Passport enrichment from call logs
  └── US-S06-02: Policy hot-reload + risk-class linking

Phase 2 (1 day): Guard + Builder Tools
  └── US-S08-12: 3 guard tools (call SDK hooks internally)
  └── US-S08-13: 3 builder workflow tools

Phase 3 (<1 day): Analytics
  └── US-S07-09: Proxy analytics endpoint + TUI sparkline

Phase 4 (SaaS): Dashboard
  └── D-46: SaaS proxy analytics (separate repo)
```

**Total: ~12 SP (5 US), estimated 2-3 days**

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
| Claude Desktop, Cursor, etc. | stdio transport MCP integration |

## 9. Test Coverage

MCP server tests: mcp-server.test.ts (integration covering 8 tools)
